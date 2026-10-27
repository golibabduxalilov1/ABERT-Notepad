import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { MainWindowGrid } from './components/MainWindowGrid';
import { BoardView } from './components/BoardView';
import { TaskDetailModal } from './components/TaskDetailModal';
import { CreateWindowModal } from './components/CreateWindowModal';
import { TaskAlarmModal } from './components/TaskAlarmModal';
import { PhoneAlarmSettingsModal } from './components/PhoneAlarmSettingsModal';
import { ProjectWindow, TaskCard, SystemNotification, ColumnId } from './types';
import {
  getStoredWindows,
  saveStoredWindows,
  getStoredTasks,
  saveStoredTasks,
  getStoredNotifications,
  saveStoredNotifications,
} from './utils/storage';
import { ParsedCommandResult, advanceNextFifoTask, playSoundEffect } from './utils/fifo';
import {
  startAlarmRinging,
  stopAlarmRinging,
  sendSystemAlarmNotification,
  requestNotificationPermission,
  initServiceWorker,
  startBackgroundTimer,
  unlockMobileAudio,
  armBackgroundAlarmKeepAlive,
  syncTaskAlarmsWithServiceWorker,
  requestWakeLock,
  registerAlarmStopListener,
  registerAlarmSnoozeListener,
} from './utils/alarmAudio';
import {
  NATIVE_ALARM_EVENT,
  applyNativeAlarmActions,
  isNativeApp,
  takeNativeAlarmActions,
} from './utils/nativeAlarms';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('fifo_app_theme') as 'light' | 'dark') || 'light';
  });

  const [windows, setWindows] = useState<ProjectWindow[]>([]);
  const [tasks, setTasks] = useState<TaskCard[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);

  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskCard | null>(null);
  const [showCreateWindowModal, setShowCreateWindowModal] = useState(false);
  const [showPhoneAlarmModal, setShowPhoneAlarmModal] = useState(false);

  // Active Alarm State
  const [activeAlarmTask, setActiveAlarmTask] = useState<TaskCard | null>(null);
  // Map of taskId -> string (deadline timestamp that was dismissed/handled)
  const [dismissedAlarms, setDismissedAlarms] = useState<Record<string, string>>({});
  const activeAlarmTaskRef = useRef<TaskCard | null>(null);
  activeAlarmTaskRef.current = activeAlarmTask;

  const tasksRef = useRef<TaskCard[]>(tasks);
  tasksRef.current = tasks;

  const windowsRef = useRef<ProjectWindow[]>(windows);
  windowsRef.current = windows;

  const dismissedAlarmsRef = useRef<Record<string, string>>(dismissedAlarms);
  dismissedAlarmsRef.current = dismissedAlarms;

  const handleAlarmSnoozeRef = useRef<((task: TaskCard, minutes: number) => void) | null>(null);
  const handleAlarmDismissRef = useRef<((task: TaskCard) => void) | null>(null);

  // Initialize Service Worker on mount & hook lock-screen / notification events
  useEffect(() => {
    initServiceWorker();

    // Listen for Service Worker messages (e.g. actions clicked on lock screen or notification)
    const handleSwMessage = (event: MessageEvent) => {
      if (!event.data) return;
      if (event.data.type === 'SW_STOP_ALARM') {
        const currentTask =
          activeAlarmTaskRef.current || tasksRef.current.find((t) => t.id === event.data.taskId);
        stopAlarmRinging();
        if (currentTask) {
          setDismissedAlarms((prev) => ({ ...prev, [currentTask.id]: currentTask.deadline || '' }));
          setActiveAlarmTask(null);
        }
      } else if (event.data.type === 'SW_SNOOZE_TASK') {
        const { taskId, minutes } = event.data;
        const currentTask =
          activeAlarmTaskRef.current || tasksRef.current.find((t) => t.id === taskId);
        if (currentTask && handleAlarmSnoozeRef.current) {
          handleAlarmSnoozeRef.current(currentTask, minutes || 30);
        }
      } else if (event.data.type === 'SW_TRIGGER_ALARM') {
        const { taskId, title, alarmSound } = event.data;
        const currentTask =
          tasksRef.current.find((t) => t.id === taskId) || activeAlarmTaskRef.current;
        const soundToPlay = alarmSound || currentTask?.alarmSound;
        startAlarmRinging(title || (currentTask ? currentTask.title : 'Будильник'), soundToPlay);
        if (currentTask) {
          setActiveAlarmTask(currentTask);
        }
      } else if (event.data.type === 'SW_OPEN_TASK') {
        const { taskId } = event.data;
        const currentTask = tasksRef.current.find((t) => t.id === taskId);
        if (currentTask) {
          setActiveWindowId(currentTask.windowId);
          setSelectedTaskDetail(currentTask);
        }
      }
    };

    // Listen for lock-screen MediaSession player "Pause" or "Stop" buttons
    const unregisterStop = registerAlarmStopListener(() => {
      const currentTask = activeAlarmTaskRef.current;
      if (currentTask) {
        setDismissedAlarms((prev) => ({ ...prev, [currentTask.id]: currentTask.deadline || '' }));
        setActiveAlarmTask(null);
      }
    });

    // Listen for lock-screen MediaSession player "Next" (+30 min snooze)
    const unregisterSnooze = registerAlarmSnoozeListener((minutes) => {
      const currentTask = activeAlarmTaskRef.current;
      if (currentTask && handleAlarmSnoozeRef.current) {
        handleAlarmSnoozeRef.current(currentTask, minutes || 30);
      }
    });

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    // Android app: apply notification button presses (snooze / pause) made while running
    const handleNativeAlarmActions = async () => {
      const actions = await takeNativeAlarmActions();
      if (actions.length === 0) return;
      const touched = new Set(actions.map((a) => a.taskId));

      const updated = applyNativeAlarmActions(tasksRef.current, actions);
      setTasks(updated);
      saveStoredTasks(updated);

      setDismissedAlarms((prev) => {
        const next = { ...prev };
        touched.forEach((id) => delete next[id]);
        return next;
      });
      if (activeAlarmTaskRef.current && touched.has(activeAlarmTaskRef.current.id)) {
        stopAlarmRinging();
        setActiveAlarmTask(null);
      }
    };
    const handleNativeVisibility = () => {
      if (!document.hidden) handleNativeAlarmActions();
    };
    window.addEventListener(NATIVE_ALARM_EVENT, handleNativeAlarmActions);
    if (isNativeApp()) document.addEventListener('visibilitychange', handleNativeVisibility);

    return () => {
      window.removeEventListener(NATIVE_ALARM_EVENT, handleNativeAlarmActions);
      document.removeEventListener('visibilitychange', handleNativeVisibility);
      unregisterStop();
      unregisterSnooze();
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, []);

  // Unlock mobile audio / background keepalive on any user interactions
  useEffect(() => {
    const handleUserInteraction = () => {
      unlockMobileAudio();
      const hasActiveReminders = tasksRef.current.some(
        (t) => t.columnId !== 'done' && t.reminderSet && t.deadline
      );
      if (hasActiveReminders) {
        armBackgroundAlarmKeepAlive();
      }
    };

    window.addEventListener('click', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });
    window.addEventListener('pointerdown', handleUserInteraction, { passive: true });
    window.addEventListener('keydown', handleUserInteraction, { passive: true });

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('pointerdown', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  // When tasks change, ensure background keep-alive is armed & sync scheduled alarms with Service Worker
  useEffect(() => {
    const activeTasksWithReminders = tasks.filter(
      (t) => t.columnId !== 'done' && t.reminderSet && t.deadline
    );
    if (activeTasksWithReminders.length > 0) {
      armBackgroundAlarmKeepAlive();
    }
    // Sync even an empty list so alarms of deleted/completed tasks get cancelled
    syncTaskAlarmsWithServiceWorker(
      activeTasksWithReminders.map((t) => ({
        id: t.id,
        title: t.title,
        deadline: t.deadline!,
        alarmSound: t.alarmSound,
        description: t.description,
        windowName: windows.find((w) => w.id === t.windowId)?.name,
      }))
    );
  }, [tasks, windows]);

  // Core Alarm Check Logic
  const checkAlarms = useCallback(() => {
    if (activeAlarmTaskRef.current) {
      // Alarm is already ringing
      return;
    }

    const now = Date.now();
    const currentTasks = tasksRef.current;
    const currentDismissed = dismissedAlarmsRef.current;

    for (const t of currentTasks) {
      // Trigger alarm only for uncompleted tasks with reminder set and past/reached deadline
      if (t.columnId !== 'done' && t.reminderSet && t.deadline) {
        const deadlineTime = new Date(t.deadline).getTime();
        const isDismissedForThisDeadline = currentDismissed[t.id] === t.deadline;

        if (deadlineTime <= now && !isDismissedForThisDeadline) {
          // Trigger Phone Alarm (Sound + Vibration + Modal + Service Worker Push Notification)
          startAlarmRinging(t.title, t.alarmSound);
          setActiveAlarmTask(t);
          sendSystemAlarmNotification(
            `⏰ Будильник: ${t.title}`,
            `Срок выполнения задачи наступил! Нажмите для выбора действия.`,
            t.id,
            t.deadline,
            {
              taskTitle: t.title,
              description: t.description,
              windowName: windowsRef.current.find((w) => w.id === t.windowId)?.name,
            }
          );

          // Add to system notifications log
          const notif: SystemNotification = {
            id: `notif-alarm-${Date.now()}`,
            taskId: t.id,
            windowId: t.windowId,
            title: `⏰ Будильник: ${t.title}`,
            message: `Наступил срок дедлайна! Будильник сработал на устройстве.`,
            type: 'deadline',
            createdAt: new Date().toISOString(),
            read: false,
          };
          setNotifications((prev) => {
            const updated = [notif, ...prev];
            saveStoredNotifications(updated);
            return updated;
          });
          break;
        }
      }
    }
  }, []);

  // Check immediately upon unlocking phone or returning from pocket/background
  useEffect(() => {
    const handleResumeFromBackground = () => {
      if (!document.hidden) {
        unlockMobileAudio();
        checkAlarms();
        if (activeAlarmTaskRef.current) {
          requestWakeLock();
        }
      }
    };

    document.addEventListener('visibilitychange', handleResumeFromBackground);
    window.addEventListener('focus', handleResumeFromBackground);

    return () => {
      document.removeEventListener('visibilitychange', handleResumeFromBackground);
      window.removeEventListener('focus', handleResumeFromBackground);
    };
  }, [checkAlarms]);

  // Real-time Alarm Monitor via Background Web Worker (runs even when screen is locked/pocket)
  useEffect(() => {
    const stopWorker = startBackgroundTimer(checkAlarms);
    return () => stopWorker();
  }, [checkAlarms]);

  // Sync theme with document class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('fifo_app_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Initial load
  useEffect(() => {
    const loadedWindows = getStoredWindows();
    const loadedTasks = getStoredTasks();
    const loadedNotifs = getStoredNotifications();

    setWindows(loadedWindows);
    setTasks(loadedTasks);
    setNotifications(loadedNotifs);
  }, []);

  // Save changes
  const updateWindowsState = (newWins: ProjectWindow[]) => {
    setWindows(newWins);
    saveStoredWindows(newWins);
  };

  const updateTasksState = (newTasks: TaskCard[]) => {
    setTasks(newTasks);
    saveStoredTasks(newTasks);
  };

  const updateNotificationsState = (newNotifs: SystemNotification[]) => {
    setNotifications(newNotifs);
    saveStoredNotifications(newNotifs);
  };

  // Window actions
  const handleCreateWindow = (newWin: ProjectWindow) => {
    const updated = [...windows, newWin];
    updateWindowsState(updated);
    setActiveWindowId(newWin.id);
  };

  const handleDeleteWindow = (windowId: string) => {
    const updatedWins = windows.filter((w) => w.id !== windowId);
    const updatedTasks = tasks.filter((t) => t.windowId !== windowId);
    updateWindowsState(updatedWins);
    updateTasksState(updatedTasks);
    if (activeWindowId === windowId) {
      setActiveWindowId(null);
    }
  };

  // Task Card actions
  const handleUpdateTaskDetail = (updatedTask: TaskCard) => {
    const updated = tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    updateTasksState(updated);
    setSelectedTaskDetail(updatedTask);
  };

  const handleDeleteTaskDetail = (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    updateTasksState(updated);
    setSelectedTaskDetail(null);
  };

  // Command Assistant execution handler
  const handleExecuteCommand = (result: ParsedCommandResult) => {
    if (result.type === 'CREATE_WINDOW') {
      const newWin: ProjectWindow = {
        id: `win-${Date.now()}`,
        name: result.windowName,
        colorTheme: 'blue',
        createdAt: new Date().toISOString(),
      };
      handleCreateWindow(newWin);
    } else if (result.type === 'OPEN_WINDOW') {
      const found = windows.find(
        (w) => w.name.toLowerCase() === result.windowName.toLowerCase()
      );
      if (found) {
        setActiveWindowId(found.id);
      } else {
        // Create if not found
        const newWin: ProjectWindow = {
          id: `win-${Date.now()}`,
          name: result.windowName,
          colorTheme: 'indigo',
          createdAt: new Date().toISOString(),
        };
        handleCreateWindow(newWin);
      }
    } else if (result.type === 'ADD_TASK') {
      let targetWindowId = activeWindowId || windows[0]?.id;
      if (!targetWindowId) {
        // Fresh install has no windows yet: create one so the task is not orphaned
        const defaultWin: ProjectWindow = {
          id: `win-${Date.now()}`,
          name: 'Мои задачи',
          colorTheme: 'blue',
          createdAt: new Date().toISOString(),
        };
        handleCreateWindow(defaultWin);
        targetWindowId = defaultWin.id;
      }
      const windowTasks = tasks.filter((t) => t.windowId === targetWindowId);
      const maxFifoOrder = windowTasks.reduce((max, t) => Math.max(max, t.fifoOrder || 0), 0);
      const now = new Date().toISOString();

      const newTask: TaskCard = {
        id: `task-${Date.now()}`,
        windowId: targetWindowId,
        title: result.taskTitle,
        description: 'Добавлено через Командный ИИ-Ассистент',
        columnId: 'fifo_queue',
        priority: 'medium',
        fifoOrder: maxFifoOrder + 1,
        isUrgentPinned: false,
        attachments: [],
        checklist: [],
        createdAt: now,
        updatedAt: now,
        historyLog: [
          {
            id: `h-${Date.now()}`,
            timestamp: now,
            action: 'Создана через голосовую/текстовую команду',
          },
        ],
      };

      updateTasksState([...tasks, newTask]);
      playSoundEffect('success');
    } else if (result.type === 'PIN_TOP') {
      const foundTask = tasks.find((t) =>
        t.title.toLowerCase().includes(result.taskTitle.toLowerCase())
      );
      if (foundTask) {
        const windowTasks = tasks.filter((t) => t.windowId === foundTask.windowId);
        const minFifoOrder = windowTasks.reduce((min, t) => Math.min(min, t.fifoOrder ?? 1), 1);
        const now = new Date().toISOString();
        const updated = tasks.map((t) =>
          t.id === foundTask.id
            ? {
                ...t,
                isUrgentPinned: true,
                columnId: (t.columnId === 'done' || t.columnId === 'paused' ? 'fifo_queue' : t.columnId) as ColumnId,
                fifoOrder: minFifoOrder - 1,
                updatedAt: now,
                historyLog: [
                  ...t.historyLog,
                  { id: `h-${Date.now()}`, timestamp: now, action: 'Поднята на самый верх 🔥 Вверху (Вне очереди)' },
                ],
              }
            : t
        );
        updateTasksState(updated);
        playSoundEffect('urgent');
      } else {
        alert(`Задача с названием "${result.taskTitle}" не найдена`);
      }
    } else if (result.type === 'OPEN_CARD') {
      const foundTask = tasks.find((t) =>
        t.title.toLowerCase().includes(result.taskTitle.toLowerCase())
      );
      if (foundTask) {
        setSelectedTaskDetail(foundTask);
      } else {
        alert(`Задача "${result.taskTitle}" не найдена`);
      }
    } else if (result.type === 'START_TASK') {
      const foundTask = tasks.find((t) =>
        t.title.toLowerCase().includes(result.taskTitle.toLowerCase())
      );
      if (foundTask) {
        const now = new Date().toISOString();
        const updated = tasks.map((t) =>
          t.id === foundTask.id
            ? { ...t, columnId: 'in_progress' as ColumnId, isUrgentPinned: false, updatedAt: now }
            : t
        );
        updateTasksState(updated);
        playSoundEffect('fifo');
      }
    } else if (result.type === 'PAUSE_TASK') {
      const foundTask = tasks.find((t) =>
        t.title.toLowerCase().includes(result.taskTitle.toLowerCase())
      );
      if (foundTask) {
        const now = new Date().toISOString();
        const updated = tasks.map((t) =>
          t.id === foundTask.id
            ? {
                ...t,
                columnId: 'paused' as ColumnId,
                pauseReason: result.reason || 'Причина откладывания',
                updatedAt: now,
              }
            : t
        );
        updateTasksState(updated);
        playSoundEffect('pause');
      }
    } else if (result.type === 'DONE_TASK') {
      const foundTask = tasks.find((t) =>
        t.title.toLowerCase().includes(result.taskTitle.toLowerCase())
      );
      if (foundTask) {
        const now = new Date().toISOString();
        const updated = tasks.map((t) =>
          t.id === foundTask.id
            ? { ...t, columnId: 'done' as ColumnId, completedAt: now, updatedAt: now }
            : t
        );
        updateTasksState(updated);
        playSoundEffect('success');
      }
    } else if (result.type === 'NEXT_FIFO') {
      const targetWindowId = activeWindowId || windows[0]?.id;
      if (targetWindowId) {
        const { updatedTasks, movedTask } = advanceNextFifoTask(tasks, targetWindowId);
        if (movedTask) {
          updateTasksState(updatedTasks);
          playSoundEffect('fifo');
        } else {
          alert('В очереди FIFO нет невыполненных задач!');
        }
      }
    }
  };

  const handleMarkNotificationRead = (notifId: string) => {
    const updated = notifications.map((n) => (n.id === notifId ? { ...n, read: true } : n));
    updateNotificationsState(updated);
  };

  // Alarm action handlers (Phone Alarm Modal actions: Start / Pause / Done / Snooze / Dismiss)
  const handleAlarmStartTask = (task: TaskCard) => {
    stopAlarmRinging();
    const now = new Date().toISOString();
    const updated = tasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            columnId: 'in_progress' as ColumnId,
            isUrgentPinned: false,
            updatedAt: now,
            historyLog: [
              ...t.historyLog,
              { id: `h-${Date.now()}`, timestamp: now, action: 'Будильник сработал -> Начато выполнение' },
            ],
          }
        : t
    );
    updateTasksState(updated);
    setDismissedAlarms((prev) => ({ ...prev, [task.id]: task.deadline || '' }));
    setActiveAlarmTask(null);
    setActiveWindowId(task.windowId); // Navigate straight to this task's workspace
    playSoundEffect('fifo');
  };

  const handleAlarmPauseTask = (task: TaskCard, reason: string) => {
    stopAlarmRinging();
    const now = new Date().toISOString();
    const updated = tasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            columnId: 'paused' as ColumnId,
            pauseReason: reason,
            updatedAt: now,
            historyLog: [
              ...t.historyLog,
              { id: `h-${Date.now()}`, timestamp: now, action: `Будильник сработал -> Поставлено на паузу: ${reason}` },
            ],
          }
        : t
    );
    updateTasksState(updated);
    setDismissedAlarms((prev) => ({ ...prev, [task.id]: task.deadline || '' }));
    setActiveAlarmTask(null);
    playSoundEffect('pause');
  };

  const handleAlarmDoneTask = (task: TaskCard) => {
    stopAlarmRinging();
    const now = new Date().toISOString();
    const updated = tasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            columnId: 'done' as ColumnId,
            isUrgentPinned: false,
            completedAt: now,
            updatedAt: now,
            historyLog: [
              ...t.historyLog,
              { id: `h-${Date.now()}`, timestamp: now, action: 'Будильник сработал -> Задача выполнена 🔵 Сделано' },
            ],
          }
        : t
    );
    updateTasksState(updated);
    setDismissedAlarms((prev) => ({ ...prev, [task.id]: task.deadline || '' }));
    setActiveAlarmTask(null);
    playSoundEffect('success');
  };

  const handleAlarmSnooze = (task: TaskCard, minutes: number) => {
    stopAlarmRinging();
    const now = new Date();
    const newDeadlineDate = new Date(now.getTime() + minutes * 60 * 1000);
    const newDeadlineIso = newDeadlineDate.toISOString();
    const formatted = newDeadlineDate.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const updated = tasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            deadline: newDeadlineIso,
            reminderSet: true,
            updatedAt: now.toISOString(),
            historyLog: [
              ...t.historyLog,
              {
                id: `h-${Date.now()}`,
                timestamp: now.toISOString(),
                action: `Будильник отложен на ${minutes} мин. Новый срок звонка: ${formatted}`,
              },
            ],
          }
        : t
    );

    // Remove from dismissed alarms so it will fire anew when the new deadline arrives
    setDismissedAlarms((prev) => {
      const next = { ...prev };
      delete next[task.id];
      return next;
    });

    updateTasksState(updated);
    setActiveAlarmTask(null);
    playSoundEffect('pause');
  };

  const handleAlarmDismiss = (task: TaskCard) => {
    stopAlarmRinging();
    setDismissedAlarms((prev) => ({ ...prev, [task.id]: task.deadline || '' }));
    setActiveAlarmTask(null);
  };

  handleAlarmSnoozeRef.current = handleAlarmSnooze;
  handleAlarmDismissRef.current = handleAlarmDismiss;

  const handleAlarmOpenDetail = (task: TaskCard) => {
    stopAlarmRinging();
    setActiveAlarmTask(null);
    setActiveWindowId(task.windowId);
    setSelectedTaskDetail(task);
  };

  const activeWindowObj = windows.find((w) => w.id === activeWindowId);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        windows={windows}
        activeWindowId={activeWindowId}
        onSelectWindow={setActiveWindowId}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenPhoneAlarmSettings={() => setShowPhoneAlarmModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6 overflow-x-hidden pt-[calc(4rem+env(safe-area-inset-top))] sm:pt-[calc(5rem+env(safe-area-inset-top))]">
        {/* View switching */}
        {!activeWindowObj ? (
          <MainWindowGrid
            windows={windows}
            tasks={tasks}
            onOpenWindow={(winId) => setActiveWindowId(winId)}
            onNewWindowClick={() => setShowCreateWindowModal(true)}
            onDeleteWindow={handleDeleteWindow}
            onOpenDetailModal={(task) => setSelectedTaskDetail(task)}
          />
        ) : (
          <BoardView
            activeWindow={activeWindowObj}
            tasks={tasks}
            onBackToMain={() => setActiveWindowId(null)}
            onUpdateTasks={updateTasksState}
            onOpenDetailModal={(task) => setSelectedTaskDetail(task)}
            onDeleteTask={handleDeleteTaskDetail}
          />
        )}
      </main>

      {/* Phone Alarm Settings Modal */}
      <AnimatePresence>
        {showPhoneAlarmModal && (
          <PhoneAlarmSettingsModal onClose={() => setShowPhoneAlarmModal(false)} />
        )}
      </AnimatePresence>

      {/* Task Alarm Modal (Full-screen Mobile & Desktop Alarm Prompt) */}
      <AnimatePresence>
        {activeAlarmTask && (
          <TaskAlarmModal
            task={activeAlarmTask}
            windowInfo={windows.find((w) => w.id === activeAlarmTask.windowId)}
            onStartTask={handleAlarmStartTask}
            onPauseTask={handleAlarmPauseTask}
            onDoneTask={handleAlarmDoneTask}
            onSnoozeAlarm={handleAlarmSnooze}
            onDismissAlarm={handleAlarmDismiss}
            onOpenTaskDetail={handleAlarmOpenDetail}
          />
        )}
      </AnimatePresence>

      {/* Modals with AnimatePresence */}
      <AnimatePresence>
        {selectedTaskDetail && (
          <TaskDetailModal
            task={selectedTaskDetail}
            onClose={() => setSelectedTaskDetail(null)}
            onUpdateTask={handleUpdateTaskDetail}
            onDeleteTask={handleDeleteTaskDetail}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateWindowModal && (
          <CreateWindowModal
            onClose={() => setShowCreateWindowModal(false)}
            onCreateWindow={handleCreateWindow}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
