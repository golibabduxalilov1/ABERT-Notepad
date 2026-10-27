package uz.taskflow.fifo.alarm;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** JS bridge: window.Capacitor.Plugins.FifoAlarm */
@CapacitorPlugin(name = "FifoAlarm")
public class FifoAlarmPlugin extends Plugin {

    private static FifoAlarmPlugin instance;

    @Override
    public void load() {
        instance = this;
        AlarmNotifier.ensureChannel(getContext());
    }

    /** Called by the action receiver so a running app applies the press immediately. */
    static void notifyActionsAvailable() {
        FifoAlarmPlugin plugin = instance;
        if (plugin != null) {
            plugin.notifyListeners("actionsAvailable", new JSObject());
        }
    }

    /** Replaces all scheduled alarms with the given list. */
    @PluginMethod
    public void sync(PluginCall call) {
        JSArray input = call.getArray("alarms", new JSArray());
        AlarmStore store = new AlarmStore(getContext());

        for (JSONObject old : store.getAlarms()) {
            AlarmScheduler.cancel(getContext(), old.optString("taskId"));
        }

        List<JSONObject> alarms = new ArrayList<>();
        List<String> ids = new ArrayList<>();
        try {
            for (int i = 0; i < input.length(); i++) {
                JSONObject alarm = input.getJSONObject(i);
                alarms.add(alarm);
                ids.add(alarm.optString("taskId"));
            }
        } catch (JSONException e) {
            call.reject("Invalid alarms", e);
            return;
        }

        // Keep alarms that already fired (their notification may still be on screen,
        // and its snooze buttons need the content), but forget them after a day
        long now = System.currentTimeMillis();
        for (JSONObject old : store.getAlarms()) {
            long at = old.optLong("at");
            if (at <= now && now - at < 24 * 60 * 60 * 1000L && !ids.contains(old.optString("taskId"))) {
                alarms.add(old);
            }
        }

        store.replaceAlarms(alarms);
        for (JSONObject alarm : alarms) {
            AlarmScheduler.schedule(getContext(), alarm);
        }
        call.resolve();
    }

    /** Shows an alarm notification right now (deadline already passed while the app is open). */
    @PluginMethod
    public void showNow(PluginCall call) {
        JSObject alarm = call.getObject("alarm");
        if (alarm == null) {
            call.reject("alarm is required");
            return;
        }
        try {
            alarm.put("at", System.currentTimeMillis());
        } catch (Exception ignored) {}
        // Keep it in the store so the snooze buttons can re-arm it
        new AlarmStore(getContext()).putAlarm(alarm);
        AlarmNotifier.show(getContext(), alarm);
        call.resolve();
    }

    /** Returns and clears the queued notification button presses. */
    @PluginMethod
    public void takeActions(PluginCall call) {
        JSONArray actions = new AlarmStore(getContext()).takeActions();
        JSObject result = new JSObject();
        try {
            result.put("actions", new JSArray(actions.toString()));
        } catch (JSONException e) {
            result.put("actions", new JSArray());
        }
        call.resolve(result);
    }

    /** Whether alarms may wake the screen with the full-screen alarm (Android 14+ can revoke it). */
    @PluginMethod
    public void checkFullScreen(PluginCall call) {
        JSObject result = new JSObject();
        result.put("allowed", AlarmNotifier.canUseFullScreenIntent(getContext()));
        call.resolve(result);
    }

    /** Opens the system page where the user allows full-screen alarms for this app. */
    @PluginMethod
    public void openFullScreenSettings(PluginCall call) {
        Intent intent;
        if (Build.VERSION.SDK_INT >= 34) {
            intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        } else {
            intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
        } catch (Exception e) {
            call.reject("Settings unavailable", e);
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void cancelNotification(PluginCall call) {
        String taskId = call.getString("taskId");
        if (taskId != null) AlarmNotifier.cancel(getContext(), taskId);
        call.resolve();
    }
}
