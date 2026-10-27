// Service Worker for TaskFlow FIFO Background Alarms & Mobile Lock-Screen Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Map of active scheduled timer IDs to cancel if needed
const scheduledTimeouts = new Map();

// Build standardized high-impact alarm notification options
function buildAlarmOptions(taskId, title, body, deadline, alarmSound) {
  return {
    body: body || 'Срок выполнения задачи наступил! Нажмите для выбора действия.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: `fifo-alarm-${taskId || 'default'}`,
    requireInteraction: true,
    renotify: true,
    silent: false,
    // Intense repeating vibration pulse for phone lock screen
    vibrate: [800, 200, 800, 200, 1000, 300, 1200, 300, 1500],
    data: {
      taskId: taskId || 'general',
      title: title || 'Будильник задачи',
      deadline: deadline || new Date().toISOString(),
      alarmSound: alarmSound || 'siren',
      timestamp: Date.now(),
    },
    actions: [
      {
        action: 'stop_alarm',
        title: '🛑 Выключить сигнал',
      },
      {
        action: 'snooze_30',
        title: '⏰ Отложить (+30 мин)',
      },
      {
        action: 'open_task',
        title: '🟢 Открыть задачу',
      },
    ],
  };
}

// Fire an alarm notification and notify all open tabs
async function fireAlarmNotification(taskId, title, body, deadline, alarmSound) {
  const options = buildAlarmOptions(taskId, title, body, deadline, alarmSound);
  try {
    await self.registration.showNotification(title || '⏰ Будильник задачи!', options);
  } catch (err) {
    console.warn('showNotification failed:', err);
  }

  // Wake up client tabs so they can trigger sound and vibration
  try {
    const allClients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    for (const client of allClients) {
      try {
        client.postMessage({
          type: 'SW_TRIGGER_ALARM',
          taskId: taskId || 'general',
          title: title || 'Будильник задачи',
          deadline: deadline || new Date().toISOString(),
          alarmSound: alarmSound || 'siren',
        });
      } catch (_) {}
    }
  } catch (_) {}
}

// Handle incoming alarm messages from the application
self.addEventListener('message', (event) => {
  if (!event.data) return;

  // Immediate alarm display
  if (event.data.type === 'SHOW_ALARM') {
    const { title, body, taskId, deadline, alarmSound } = event.data;
    event.waitUntil(fireAlarmNotification(taskId, title, body, deadline, alarmSound));
  }

  // Schedule an alarm for a specific timestamp (e.g. 5-sec pocket test or task deadline)
  else if (event.data.type === 'SCHEDULE_ALARM') {
    const { title, body, taskId, triggerAt, deadline, alarmSound } = event.data;
    const now = Date.now();
    const delay = Math.max(0, triggerAt - now);

    // 1. If browser supports Notification Triggers (Chrome on Android / PWA)
    if ('showTrigger' in Notification.prototype && typeof self.TimestampTrigger !== 'undefined') {
      try {
        const options = buildAlarmOptions(taskId, title, body, deadline, alarmSound);
        event.waitUntil(
          self.registration.showNotification(title || '⏰ Будильник задачи!', {
            ...options,
            showTrigger: new self.TimestampTrigger(triggerAt),
          })
        );
      } catch (err) {
        console.warn('TimestampTrigger scheduling error:', err);
      }
    }

    // 2. Reliable waitUntil timer for near-term alarms (<= 5 minutes)
    // Keeps the Service Worker process alive in the background while delay counts down
    if (delay <= 300000) {
      // Clear any prior timer for this task
      if (scheduledTimeouts.has(taskId)) {
        clearTimeout(scheduledTimeouts.get(taskId));
        scheduledTimeouts.delete(taskId);
      }

      event.waitUntil(
        new Promise((resolve) => {
          const timeoutId = setTimeout(async () => {
            scheduledTimeouts.delete(taskId);
            await fireAlarmNotification(taskId, title, body, deadline, alarmSound);
            resolve();
          }, delay);
          scheduledTimeouts.set(taskId, timeoutId);
        })
      );
    }
  }

  // Synchronize scheduled task alarms list from client
  else if (event.data.type === 'SYNC_SCHEDULED_ALARMS') {
    const alarms = event.data.alarms || [];
    const now = Date.now();

    for (const alarm of alarms) {
      const delay = alarm.triggerAt - now;
      if (delay > 0) {
        // Schedule via TimestampTrigger if supported
        if ('showTrigger' in Notification.prototype && typeof self.TimestampTrigger !== 'undefined') {
          try {
            const options = buildAlarmOptions(alarm.id, `⏰ ${alarm.title}`, `Срок выполнения задачи наступил!`, alarm.deadline, alarm.alarmSound);
            self.registration.showNotification(`⏰ ${alarm.title}`, {
              ...options,
              showTrigger: new self.TimestampTrigger(alarm.triggerAt),
            });
          } catch (_) {}
        }

        // Arm near-term countdown if within 5 minutes
        if (delay <= 300000 && !scheduledTimeouts.has(alarm.id)) {
          event.waitUntil(
            new Promise((resolve) => {
              const timeoutId = setTimeout(async () => {
                scheduledTimeouts.delete(alarm.id);
                await fireAlarmNotification(
                  alarm.id,
                  `⏰ Будильник: ${alarm.title}`,
                  `Срок выполнения задачи наступил!`,
                  alarm.deadline,
                  alarm.alarmSound
                );
                resolve();
              }, delay);
              scheduledTimeouts.set(alarm.id, timeoutId);
            })
          );
        }
      }
    }
  }
});

// Handle clicks and actions directly on the lock screen or notification drawer
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      if (action === 'stop_alarm') {
        // Broadcast stop alarm to all open tabs
        for (const client of allClients) {
          try {
            client.postMessage({
              type: 'SW_STOP_ALARM',
              taskId: data.taskId,
            });
          } catch (e) {
            console.warn('Error sending SW_STOP_ALARM to client:', e);
          }
        }
      } else if (action === 'snooze_30') {
        // Broadcast snooze to all open tabs
        for (const client of allClients) {
          try {
            client.postMessage({
              type: 'SW_SNOOZE_TASK',
              taskId: data.taskId,
              minutes: 30,
            });
          } catch (e) {
            console.warn('Error sending SW_SNOOZE_TASK to client:', e);
          }
        }
      } else {
        // Default click or 'open_task': Focus or open the application
        let matchingClient = null;
        for (const client of allClients) {
          if ('focus' in client) {
            matchingClient = client;
            break;
          }
        }

        if (matchingClient) {
          await matchingClient.focus();
          try {
            matchingClient.postMessage({
              type: 'SW_OPEN_TASK',
              taskId: data.taskId,
            });
          } catch (e) {
            console.warn('Error sending SW_OPEN_TASK to client:', e);
          }
        } else if (self.clients.openWindow) {
          await self.clients.openWindow('/');
        }
      }
    })()
  );
});
