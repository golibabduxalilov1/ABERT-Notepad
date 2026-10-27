package uz.taskflow.fifo.alarm;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;
import java.lang.ref.WeakReference;
import uz.taskflow.fifo.MainActivity;
import uz.taskflow.fifo.R;

/**
 * Full-screen alarm shown over the lock screen (launched by the notification's
 * full-screen intent). It turns the screen on and offers the same buttons as the
 * notification, so the alarm can be handled without unlocking the phone.
 */
public class AlarmActivity extends Activity {

    static final String EXTRA_TASK_ID = "taskId";
    static final String EXTRA_TITLE = "title";
    static final String EXTRA_BODY = "body";
    static final String EXTRA_WINDOW = "windowName";

    // Let the screen go dark again if nobody reacts; the notification stays in the shade
    private static final long AUTO_CLOSE_MS = 2 * 60_000L;

    private static WeakReference<AlarmActivity> current = new WeakReference<>(null);

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable autoClose = this::finish;
    private String taskId;

    /** Closes the alarm screen when its alarm was handled elsewhere (notification button, app). */
    static void dismiss(String taskId) {
        AlarmActivity activity = current.get();
        if (activity != null && taskId != null && taskId.equals(activity.taskId)) {
            activity.runOnUiThread(activity::finish);
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        showOverLockScreen();
        setContentView(R.layout.activity_alarm);
        current = new WeakReference<>(this);

        bindButton(R.id.alarm_snooze_10, "snooze", 10);
        bindButton(R.id.alarm_snooze_15, "snooze", 15);
        bindButton(R.id.alarm_snooze_30, "snooze", 30);
        bindButton(R.id.alarm_pause, "pause", 0);
        findViewById(R.id.alarm_open).setOnClickListener(v -> openApp());

        bind(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        bind(intent);
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(autoClose);
        if (current.get() == this) current = new WeakReference<>(null);
        super.onDestroy();
    }

    @SuppressWarnings("deprecation")
    private void showOverLockScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    private void bind(Intent intent) {
        taskId = intent.getStringExtra(EXTRA_TASK_ID);
        ((TextView) findViewById(R.id.alarm_title)).setText(intent.getStringExtra(EXTRA_TITLE));
        setOptionalText(R.id.alarm_window, intent.getStringExtra(EXTRA_WINDOW));
        setOptionalText(R.id.alarm_body, intent.getStringExtra(EXTRA_BODY));

        handler.removeCallbacks(autoClose);
        handler.postDelayed(autoClose, AUTO_CLOSE_MS);
    }

    private void setOptionalText(int viewId, String text) {
        TextView view = findViewById(viewId);
        boolean empty = text == null || text.isEmpty();
        view.setText(empty ? "" : text);
        view.setVisibility(empty ? View.GONE : View.VISIBLE);
    }

    private void bindButton(int viewId, String action, int minutes) {
        findViewById(viewId).setOnClickListener(v -> {
            if (taskId != null) AlarmActionReceiver.apply(this, taskId, action, minutes);
            finish();
        });
    }

    private void openApp() {
        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        KeyguardManager keyguard = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && keyguard != null && keyguard.isKeyguardLocked()) {
            // Ask for PIN / fingerprint first, then open the app
            keyguard.requestDismissKeyguard(this, new KeyguardManager.KeyguardDismissCallback() {
                @Override
                public void onDismissSucceeded() {
                    startActivity(open);
                    finish();
                }
            });
        } else {
            startActivity(open);
            finish();
        }
    }
}
