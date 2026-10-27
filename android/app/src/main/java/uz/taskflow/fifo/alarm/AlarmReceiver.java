package uz.taskflow.fifo.alarm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import org.json.JSONObject;

/** Fires a scheduled alarm, and re-arms all stored alarms after a reboot. */
public class AlarmReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        AlarmStore store = new AlarmStore(context);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            for (JSONObject alarm : store.getAlarms()) {
                AlarmScheduler.schedule(context, alarm);
            }
            return;
        }

        if (!AlarmScheduler.ACTION_FIRE.equals(action)) return;

        String taskId = intent.getStringExtra("taskId");
        if (taskId == null) return;
        JSONObject alarm = store.getAlarm(taskId);
        // Ignore stale triggers whose alarm was removed or moved to another time
        if (alarm == null || alarm.optLong("at") != intent.getLongExtra("at", -1)) return;

        AlarmNotifier.show(context, alarm);
    }
}
