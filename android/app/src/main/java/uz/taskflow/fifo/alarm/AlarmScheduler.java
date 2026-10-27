package uz.taskflow.fifo.alarm;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import org.json.JSONObject;
import uz.taskflow.fifo.MainActivity;

/** Wraps AlarmManager so alarms fire on time even in Doze / with the app killed. */
public class AlarmScheduler {

    public static final String ACTION_FIRE = "uz.taskflow.fifo.ALARM_FIRE";

    private static PendingIntent firePendingIntent(Context context, String taskId, long at) {
        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.setAction(ACTION_FIRE);
        intent.putExtra("taskId", taskId);
        intent.putExtra("at", at);
        return PendingIntent.getBroadcast(
            context,
            AlarmStore.notificationId(taskId),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    public static void schedule(Context context, JSONObject alarm) {
        String taskId = alarm.optString("taskId");
        long at = alarm.optLong("at");
        if (taskId.isEmpty() || at <= System.currentTimeMillis()) return;

        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return;
        PendingIntent pi = firePendingIntent(context, taskId, at);

        boolean canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || manager.canScheduleExactAlarms();
        if (canExact) {
            // setAlarmClock is the most reliable path on aggressive OEM ROMs (MIUI etc.)
            Intent show = new Intent(context, MainActivity.class);
            PendingIntent showPi = PendingIntent.getActivity(
                context,
                0,
                show,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            manager.setAlarmClock(new AlarmManager.AlarmClockInfo(at, showPi), pi);
        } else {
            manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    public static void cancel(Context context, String taskId) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return;
        manager.cancel(firePendingIntent(context, taskId, 0));
    }
}
