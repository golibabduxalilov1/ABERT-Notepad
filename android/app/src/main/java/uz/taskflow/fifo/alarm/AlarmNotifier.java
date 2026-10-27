package uz.taskflow.fifo.alarm;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.view.View;
import android.widget.RemoteViews;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONObject;
import uz.taskflow.fifo.MainActivity;
import uz.taskflow.fifo.R;

/** Builds the custom alarm notification with the four action buttons. */
public class AlarmNotifier {

    public static final String CHANNEL_ID = "fifo-alarms";

    // Button id -> [action, minutes]; order matches the layout
    private static final int[] BUTTON_IDS = { R.id.btn_snooze_30, R.id.btn_snooze_10, R.id.btn_snooze_15, R.id.btn_pause };
    private static final String[] BUTTON_ACTIONS = { "snooze", "snooze", "snooze", "pause" };
    private static final int[] BUTTON_MINUTES = { 30, 10, 15, 0 };

    public static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Будильники задач", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Сигналы по срокам задач");
        channel.enableVibration(true);
        channel.enableLights(true);
        channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        Uri sound = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + context.getPackageName() + "/" + R.raw.alarm);
        channel.setSound(
            sound,
            new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
        );
        manager.createNotificationChannel(channel);
    }

    public static void show(Context context, JSONObject alarm) {
        ensureChannel(context);

        String taskId = alarm.optString("taskId");
        int notifId = AlarmStore.notificationId(taskId);
        String title = alarm.optString("title");
        String body = alarm.optString("body");
        String largeBody = alarm.optString("largeBody", "");
        String windowName = alarm.optString("windowName", "");

        RemoteViews collapsed = new RemoteViews(context.getPackageName(), R.layout.notif_alarm_collapsed);
        collapsed.setTextViewText(R.id.notif_title, title);
        collapsed.setTextViewText(R.id.notif_text, body);

        RemoteViews headsUp = new RemoteViews(context.getPackageName(), R.layout.notif_alarm_headsup);
        headsUp.setTextViewText(R.id.notif_title, title);
        bindButtons(context, headsUp, taskId, notifId);

        RemoteViews expanded = new RemoteViews(context.getPackageName(), R.layout.notif_alarm_expanded);
        expanded.setTextViewText(R.id.notif_title, title);
        expanded.setTextViewText(R.id.notif_text, largeBody.isEmpty() ? body : largeBody);
        bindButtons(context, expanded, taskId, notifId);

        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPi = PendingIntent.getActivity(
            context,
            notifId,
            open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_alarm)
            .setColor(0xFFF97316)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(collapsed)
            .setCustomHeadsUpContentView(headsUp)
            .setCustomBigContentView(expanded)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(openPi)
            // Locked / screen off: Android launches AlarmActivity over the lock screen.
            // Phone in use: shown as a regular heads-up notification instead.
            .setFullScreenIntent(alarmScreenIntent(context, alarm, notifId), true)
            .setAutoCancel(true);
        if (!windowName.isEmpty()) builder.setSubText(windowName);

        wakeScreen(context);
        try {
            NotificationManagerCompat.from(context).notify(notifId, builder.build());
        } catch (SecurityException ignored) {
            // POST_NOTIFICATIONS not granted
        }
    }

    private static PendingIntent alarmScreenIntent(Context context, JSONObject alarm, int notifId) {
        Intent intent = new Intent(context, AlarmActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        intent.putExtra(AlarmActivity.EXTRA_TASK_ID, alarm.optString("taskId"));
        intent.putExtra(AlarmActivity.EXTRA_TITLE, alarm.optString("title"));
        String largeBody = alarm.optString("largeBody", "");
        intent.putExtra(AlarmActivity.EXTRA_BODY, largeBody.isEmpty() ? alarm.optString("body") : largeBody);
        intent.putExtra(AlarmActivity.EXTRA_WINDOW, alarm.optString("windowName", ""));
        return PendingIntent.getActivity(
            context,
            notifId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    /**
     * Fallback that lights the screen even if the full-screen intent is not allowed
     * (Android 14+ settings toggle) or the OEM ROM ignores it.
     */
    @SuppressWarnings("deprecation")
    private static void wakeScreen(Context context) {
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        if (pm == null || pm.isInteractive()) return;
        PowerManager.WakeLock lock = pm.newWakeLock(
            PowerManager.FULL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
            "fifo:alarm"
        );
        lock.acquire(10_000L);
    }

    /** Android 14+ lets the user revoke full-screen alarms per app. */
    public static boolean canUseFullScreenIntent(Context context) {
        if (Build.VERSION.SDK_INT < 34) return true;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        return manager == null || manager.canUseFullScreenIntent();
    }

    private static void bindButtons(Context context, RemoteViews views, String taskId, int notifId) {
        for (int i = 0; i < BUTTON_IDS.length; i++) {
            Intent intent = new Intent(context, AlarmActionReceiver.class);
            intent.setAction("uz.taskflow.fifo.ALARM_ACTION_" + i);
            intent.putExtra("taskId", taskId);
            intent.putExtra("action", BUTTON_ACTIONS[i]);
            intent.putExtra("minutes", BUTTON_MINUTES[i]);
            PendingIntent pi = PendingIntent.getBroadcast(
                context,
                notifId * 4 + i,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(BUTTON_IDS[i], pi);
            views.setViewVisibility(BUTTON_IDS[i], View.VISIBLE);
        }
    }

    public static void cancel(Context context, String taskId) {
        NotificationManagerCompat.from(context).cancel(AlarmStore.notificationId(taskId));
        AlarmActivity.dismiss(taskId);
    }
}
