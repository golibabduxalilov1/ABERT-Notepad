package uz.taskflow.fifo.alarm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Handles the notification buttons without opening the app: the alarm is moved
 * (or removed) natively right away, and the press is queued for the web app,
 * which applies it to the task the next time it runs.
 */
public class AlarmActionReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String taskId = intent.getStringExtra("taskId");
        String action = intent.getStringExtra("action");
        int minutes = intent.getIntExtra("minutes", 0);
        if (taskId == null || action == null) return;
        apply(context, taskId, action, minutes);
    }

    /** Shared by the notification buttons and the full-screen AlarmActivity. */
    static void apply(Context context, String taskId, String action, int minutes) {
        long now = System.currentTimeMillis();
        AlarmStore store = new AlarmStore(context);
        AlarmNotifier.cancel(context, taskId);

        if ("snooze".equals(action)) {
            JSONObject alarm = store.getAlarm(taskId);
            if (alarm != null) {
                try {
                    alarm.put("at", now + minutes * 60_000L);
                } catch (JSONException ignored) {}
                store.putAlarm(alarm);
                AlarmScheduler.schedule(context, alarm);
            }
        } else {
            store.removeAlarm(taskId);
            AlarmScheduler.cancel(context, taskId);
        }

        JSONObject queued = new JSONObject();
        try {
            queued.put("taskId", taskId);
            queued.put("type", action);
            queued.put("minutes", minutes);
            queued.put("at", now);
        } catch (JSONException ignored) {}
        store.addAction(queued);

        FifoAlarmPlugin.notifyActionsAvailable();
    }
}
