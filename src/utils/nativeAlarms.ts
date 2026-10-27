/**
 * Native Android alarm notifications (Capacitor build only).
 * Android WebView has no Web Notification API, so in the mobile app alarms are
 * scheduled by the native FifoAlarm plugin (AlarmManager + a custom notification
 * with four buttons) and fire even when the app is closed.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ColumnId, TaskCard } from '../types';

export interface NativeAlarmAction {
  taskId: string;
  type: 'snooze' | 'pause';
  minutes: number;
  at: number; // when the button was pressed (ms)
}

interface NativeAlarmPayload {
  taskId: string;
  title: string;
  body: string;
  largeBody?: string;
  windowName?: string;
  at: number;
}

interface FifoAlarmPlugin {
  sync(options: { alarms: NativeAlarmPayload[] }): Promise<void>;
  showNow(options: { alarm: NativeAlarmPayload }): Promise<void>;
  takeActions(): Promise<{ actions: NativeAlarmAction[] }>;
  checkFullScreen(): Promise<{ allowed: boolean }>;
  openFullScreenSettings(): Promise<void>;
  addListener(eventName: 'actionsAvailable', listener: () => void): Promise<{ remove: () => Promise<void> }>;
}

const FifoAlarm = registerPlugin<FifoAlarmPlugin>('FifoAlarm');

const TEST_ALARM_TASK_ID = 'pocket-test-alarm';

/** Fired on window when notification buttons were pressed and actions are waiting. */
export const NATIVE_ALARM_EVENT = 'fifo-native-alarm';

let nativePermission: 'granted' | 'denied' | 'default' = 'default';
let initPromise: Promise<void> | null = null;

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function getNativePermission() {
  return nativePermission;
}

function mapPermission(state: string): 'granted' | 'denied' | 'default' {
  if (state === 'granted') return 'granted';
  if (state === 'denied') return 'denied';
  return 'default';
}

export function initNativeAlarms(): Promise<void> {
  if (!isNativeApp()) return Promise.resolve();
  if (!initPromise) initPromise = setupNativeAlarms();
  return initPromise;
}

async function setupNativeAlarms() {
  try {
    const { display } = await LocalNotifications.checkPermissions();
    nativePermission = mapPermission(display);
    // An alarm app is useless without notifications, so ask on first launch
    if (display === 'prompt' || display === 'prompt-with-rationale') {
      nativePermission = mapPermission((await LocalNotifications.requestPermissions()).display);
    }

    // Alarms from older builds were scheduled through LocalNotifications; drop them
    const legacy = await LocalNotifications.getPending();
    if (legacy.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: legacy.notifications.map((n) => ({ id: n.id })) });
    }

    await FifoAlarm.addListener('actionsAvailable', () => {
      window.dispatchEvent(new CustomEvent(NATIVE_ALARM_EVENT));
    });

    // Without this Android 14+ permission a locked phone only gets a silent shade entry:
    // the screen does not light up. Send the user to the toggle once.
    if (nativePermission === 'granted' && !(await FifoAlarm.checkFullScreen()).allowed) {
      const asked = 'fifo-fullscreen-asked';
      if (!readFlag(asked)) {
        writeFlag(asked);
        await FifoAlarm.openFullScreenSettings();
      }
    }
  } catch (err) {
    console.warn('Native alarm init failed:', err);
  }
}

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string) {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // storage unavailable: we may ask again next launch
  }
}

export async function requestNativePermission(): Promise<boolean> {
  try {
    const result = await LocalNotifications.requestPermissions();
    nativePermission = mapPermission(result.display);
  } catch (err) {
    console.warn('Native notification permission request failed:', err);
  }
  return nativePermission === 'granted';
}

/** Returns (and clears) button presses made on notifications since the last call. */
export async function takeNativeAlarmActions(): Promise<NativeAlarmAction[]> {
  if (!isNativeApp()) return [];
  try {
    return (await FifoAlarm.takeActions()).actions || [];
  } catch (err) {
    console.warn('Native alarm actions read failed:', err);
    return [];
  }
}

/**
 * Applies notification button presses to the task list: snooze moves the
 * deadline to press time + N minutes, pause moves the task to "paused".
 */
export function applyNativeAlarmActions(tasks: TaskCard[], actions: NativeAlarmAction[]): TaskCard[] {
  if (actions.length === 0) return tasks;
  const byTask = new Map(tasks.map((t) => [t.id, t]));

  for (const action of actions) {
    const task = byTask.get(action.taskId);
    if (!task) continue;
    const pressedAt = new Date(action.at);
    const stamp = pressedAt.toISOString();

    if (action.type === 'snooze') {
      const deadline = new Date(action.at + action.minutes * 60 * 1000);
      const formatted = deadline.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      byTask.set(task.id, {
        ...task,
        deadline: deadline.toISOString(),
        reminderSet: true,
        updatedAt: stamp,
        historyLog: [
          ...task.historyLog,
          {
            id: `h-${action.at}-${task.id}`,
            timestamp: stamp,
            action: `Будильник отложен из уведомления на ${action.minutes} мин. Новый срок звонка: ${formatted}`,
          },
        ],
      });
    } else {
      byTask.set(task.id, {
        ...task,
        columnId: 'paused' as ColumnId,
        pauseReason: task.pauseReason || 'Поставлено на паузу из уведомления',
        // Paused from the notification: stop ringing for this task until re-armed
        reminderSet: false,
        updatedAt: stamp,
        historyLog: [
          ...task.historyLog,
          { id: `h-${action.at}-${task.id}`, timestamp: stamp, action: 'Будильник сработал -> Поставлено на паузу из уведомления' },
        ],
      });
    }
  }

  return tasks.map((t) => byTask.get(t.id) || t);
}

export interface NativeAlarmContent {
  id?: string;
  title: string;
  deadline?: string;
  description?: string;
  windowName?: string;
  body?: string;
}

async function canNotify(): Promise<boolean> {
  await initNativeAlarms();
  return nativePermission === 'granted';
}

function formatDeadline(deadline: string): string {
  const d = new Date(deadline);
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const day = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  return `${time}, ${day}`;
}

function truncate(text: string, max: number): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function buildPayload(content: NativeAlarmContent, at: number): NativeAlarmPayload {
  const when = content.deadline ? formatDeadline(content.deadline) : '';
  const body = content.body ?? (when ? `Срок наступил · ${when}` : 'Срок наступил');
  // Expanded view: task description plus the deadline line
  const largeBody = content.description
    ? `${truncate(content.description, 220)}\n${when ? `Срок: ${when}` : body}`
    : undefined;

  return {
    taskId: content.id || TEST_ALARM_TASK_ID,
    title: content.title,
    body,
    largeBody,
    windowName: content.windowName || 'Будильник задачи',
    at,
  };
}

/**
 * Replaces all scheduled task alarms with the given list (past deadlines are skipped).
 */
export async function syncNativeAlarms(alarms: NativeAlarmContent[]) {
  if (!isNativeApp()) return;
  await initNativeAlarms();
  try {
    const now = Date.now();
    const upcoming = alarms
      .filter((a) => a.id && a.deadline && new Date(a.deadline).getTime() > now)
      .map((a) => buildPayload(a, new Date(a.deadline!).getTime()));
    await FifoAlarm.sync({ alarms: upcoming });
  } catch (err) {
    console.warn('Native alarm sync failed:', err);
  }
}

/** Shows an alarm notification right now (deadline reached while the app is open). */
export async function showNativeAlarmNow(content: NativeAlarmContent) {
  if (!isNativeApp() || !(await canNotify())) return;
  try {
    await FifoAlarm.showNow({ alarm: buildPayload(content, Date.now()) });
  } catch (err) {
    console.warn('Native alarm notification failed:', err);
  }
}
