package uz.taskflow.fifo.alarm;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Persists scheduled alarms (so they survive app kill and reboot) and the
 * queue of notification button presses the web app has not applied yet.
 */
public class AlarmStore {

    private static final String PREFS = "fifo_alarms";
    private static final String KEY_ALARMS = "alarms";
    private static final String KEY_ACTIONS = "actions";

    private final SharedPreferences prefs;

    public AlarmStore(Context context) {
        prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private JSONObject readAlarms() {
        try {
            return new JSONObject(prefs.getString(KEY_ALARMS, "{}"));
        } catch (JSONException e) {
            return new JSONObject();
        }
    }

    public synchronized List<JSONObject> getAlarms() {
        JSONObject all = readAlarms();
        List<JSONObject> list = new ArrayList<>();
        Iterator<String> keys = all.keys();
        while (keys.hasNext()) {
            JSONObject alarm = all.optJSONObject(keys.next());
            if (alarm != null) list.add(alarm);
        }
        return list;
    }

    public synchronized JSONObject getAlarm(String taskId) {
        return readAlarms().optJSONObject(taskId);
    }

    public synchronized void putAlarm(JSONObject alarm) {
        JSONObject all = readAlarms();
        try {
            all.put(alarm.optString("taskId"), alarm);
        } catch (JSONException ignored) {}
        prefs.edit().putString(KEY_ALARMS, all.toString()).apply();
    }

    public synchronized void removeAlarm(String taskId) {
        JSONObject all = readAlarms();
        all.remove(taskId);
        prefs.edit().putString(KEY_ALARMS, all.toString()).apply();
    }

    public synchronized void replaceAlarms(List<JSONObject> alarms) {
        JSONObject all = new JSONObject();
        for (JSONObject alarm : alarms) {
            try {
                all.put(alarm.optString("taskId"), alarm);
            } catch (JSONException ignored) {}
        }
        prefs.edit().putString(KEY_ALARMS, all.toString()).apply();
    }

    public synchronized void addAction(JSONObject action) {
        JSONArray actions;
        try {
            actions = new JSONArray(prefs.getString(KEY_ACTIONS, "[]"));
        } catch (JSONException e) {
            actions = new JSONArray();
        }
        actions.put(action);
        prefs.edit().putString(KEY_ACTIONS, actions.toString()).apply();
    }

    public synchronized JSONArray takeActions() {
        JSONArray actions;
        try {
            actions = new JSONArray(prefs.getString(KEY_ACTIONS, "[]"));
        } catch (JSONException e) {
            actions = new JSONArray();
        }
        prefs.edit().putString(KEY_ACTIONS, "[]").apply();
        return actions;
    }

    /** Stable positive notification id for a task. */
    public static int notificationId(String taskId) {
        return (taskId.hashCode() & 0x7fffffff) % 2000000000 + 10;
    }
}
