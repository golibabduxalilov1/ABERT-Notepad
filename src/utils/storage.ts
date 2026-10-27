import { ProjectWindow, TaskCard, SystemNotification } from '../types';

const WINDOWS_KEY = 'fifo_app_windows_v1';
const TASKS_KEY = 'fifo_app_tasks_v1';
const NOTIFICATIONS_KEY = 'fifo_app_notifications_v1';

// New installs start empty: no demo windows, tasks or notifications
export const DEFAULT_WINDOWS: ProjectWindow[] = [];

export const DEFAULT_TASKS: TaskCard[] = [];

export const DEFAULT_NOTIFICATIONS: SystemNotification[] = [];

export function getStoredWindows(): ProjectWindow[] {
  try {
    const data = localStorage.getItem(WINDOWS_KEY);
    if (!data) {
      localStorage.setItem(WINDOWS_KEY, JSON.stringify(DEFAULT_WINDOWS));
      return DEFAULT_WINDOWS;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_WINDOWS;
  }
}

export function saveStoredWindows(windows: ProjectWindow[]): void {
  try {
    localStorage.setItem(WINDOWS_KEY, JSON.stringify(windows));
  } catch (err) {
    console.error('Failed to save windows:', err);
  }
}

export function getStoredTasks(): TaskCard[] {
  try {
    const data = localStorage.getItem(TASKS_KEY);
    if (!data) {
      localStorage.setItem(TASKS_KEY, JSON.stringify(DEFAULT_TASKS));
      return DEFAULT_TASKS;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_TASKS;
  }
}

export function saveStoredTasks(tasks: TaskCard[]): void {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error('Failed to save tasks:', err);
  }
}

export function getStoredNotifications(): SystemNotification[] {
  try {
    const data = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!data) {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(DEFAULT_NOTIFICATIONS));
      return DEFAULT_NOTIFICATIONS;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
}

export function saveStoredNotifications(notifs: SystemNotification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifs));
  } catch (err) {
    console.error('Failed to save notifications:', err);
  }
}
