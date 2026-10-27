import { TaskCard, ColumnId } from '../types';

/**
 * Returns tasks sorted specifically according to column logic:
 * 1. Urgent/Pinned -> sorted by fifoOrder
 * 2. FIFO Queue -> strictly sorted by fifoOrder ascending (First In, First Out)
 * 3. In Progress -> active task(s)
 * 4. Paused -> paused tasks
 * 5. Done -> finished tasks
 */
export function getColumnTasks(tasks: TaskCard[], windowId: string, columnId: ColumnId): TaskCard[] {
  const windowTasks = tasks.filter((t) => t.windowId === windowId);

  if (columnId === 'urgent') {
    return windowTasks
      .filter((t) => t.isUrgentPinned && t.columnId !== 'done')
      .sort((a, b) => a.fifoOrder - b.fifoOrder);
  }

  if (columnId === 'fifo_queue') {
    // 1. Pinned urgent tasks (top priority, placed above normal queue)
    const pinned = windowTasks
      .filter((t) => (t.columnId === 'fifo_queue' || t.columnId === 'urgent') && t.isUrgentPinned)
      .sort((a, b) => a.fifoOrder - b.fifoOrder);
    // 2. Normal FIFO queue tasks (sorted strictly by fifoOrder ascending)
    const unpinned = windowTasks
      .filter((t) => t.columnId === 'fifo_queue' && !t.isUrgentPinned)
      .sort((a, b) => a.fifoOrder - b.fifoOrder);

    return [...pinned, ...unpinned];
  }

  if (columnId === 'in_progress') {
    return windowTasks
      .filter((t) => t.columnId === 'in_progress')
      .sort((a, b) => (a.isUrgentPinned === b.isUrgentPinned ? a.fifoOrder - b.fifoOrder : a.isUrgentPinned ? -1 : 1));
  }

  if (columnId === 'paused') {
    return windowTasks
      .filter((t) => t.columnId === 'paused')
      .sort((a, b) => (a.isUrgentPinned === b.isUrgentPinned ? a.fifoOrder - b.fifoOrder : a.isUrgentPinned ? -1 : 1));
  }

  if (columnId === 'done') {
    return windowTasks
      .filter((t) => t.columnId === 'done')
      .sort((a, b) => new Date(b.completedAt || b.updatedAt).getTime() - new Date(a.completedAt || a.updatedAt).getTime());
  }

  return [];
}

/**
 * Reorders tasks within a column or moves a task to a specific position relative to targetTask
 */
export function reorderTasks(
  tasks: TaskCard[],
  windowId: string,
  draggedTaskId: string,
  targetTaskId: string,
  position: 'before' | 'after'
): TaskCard[] {
  const draggedTask = tasks.find((t) => t.id === draggedTaskId);
  const targetTask = tasks.find((t) => t.id === targetTaskId);
  if (!draggedTask || !targetTask) return tasks;

  const targetColumnId = targetTask.columnId;
  const now = new Date().toISOString();

  // Get current list of tasks in target column
  const currentColumnTasks = getColumnTasks(tasks, windowId, targetColumnId);

  // Remove dragged task from this list if already present
  const listWithoutDragged = currentColumnTasks.filter((t) => t.id !== draggedTaskId);

  // Find index of target task in filtered list
  const targetIndex = listWithoutDragged.findIndex((t) => t.id === targetTaskId);
  if (targetIndex === -1) return tasks;

  const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;

  const updatedDraggedTask: TaskCard = {
    ...draggedTask,
    columnId: targetColumnId,
    windowId: windowId,
    updatedAt: now,
    completedAt: targetColumnId === 'done' ? now : draggedTask.completedAt,
    // If moved manually in queue, adjust urgent pin status if dropping among normal items
    isUrgentPinned: draggedTask.isUrgentPinned && targetTask.isUrgentPinned,
    historyLog: [
      ...draggedTask.historyLog,
      {
        id: `h-${Date.now()}`,
        timestamp: now,
        action: `Изменен порядок/позиция задачи в колонке: ${targetColumnId}`,
      },
    ],
  };

  const reorderedColumnTasks = [...listWithoutDragged];
  reorderedColumnTasks.splice(insertIndex, 0, updatedDraggedTask);

  // Re-index fifoOrder sequentially for all items in this column
  const taskOrderMap = new Map<string, number>();
  reorderedColumnTasks.forEach((t, idx) => {
    taskOrderMap.set(t.id, idx + 1);
  });

  return tasks.map((t) => {
    if (t.id === draggedTaskId) {
      return {
        ...updatedDraggedTask,
        fifoOrder: taskOrderMap.get(t.id) ?? t.fifoOrder,
      };
    }
    if (t.windowId === windowId && t.columnId === targetColumnId && taskOrderMap.has(t.id)) {
      return {
        ...t,
        fifoOrder: taskOrderMap.get(t.id)!,
      };
    }
    return t;
  });
}

/**
 * Moves a task 1 step up or down in its column
 */
export function moveTaskStep(
  tasks: TaskCard[],
  windowId: string,
  taskId: string,
  direction: 'up' | 'down'
): TaskCard[] {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return tasks;

  const columnTasks = getColumnTasks(tasks, windowId, task.columnId);
  const currentIndex = columnTasks.findIndex((t) => t.id === taskId);
  if (currentIndex === -1) return tasks;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= columnTasks.length) return tasks;

  const targetTask = columnTasks[targetIndex];
  return reorderTasks(tasks, windowId, taskId, targetTask.id, direction === 'up' ? 'before' : 'after');
}

/**
 * Automatically advances the first FIFO task in queue to "Начал (В работе)"
 */
export function advanceNextFifoTask(
  tasks: TaskCard[],
  windowId: string
): { updatedTasks: TaskCard[]; movedTask: TaskCard | null } {
  // First check if there is an urgent pinned card or top FIFO card in queue
  const queueCards = getColumnTasks(tasks, windowId, 'fifo_queue');
  const targetTask = queueCards[0];

  if (!targetTask) {
    return { updatedTasks: tasks, movedTask: null };
  }

  const now = new Date().toISOString();
  const updatedTasks = tasks.map((t) => {
    if (t.id === targetTask.id) {
      return {
        ...t,
        columnId: 'in_progress' as ColumnId,
        isUrgentPinned: false,
        updatedAt: now,
        historyLog: [
          ...t.historyLog,
          {
            id: `h-${Date.now()}`,
            timestamp: now,
            action: 'Автоматически переведена в "🟢 Начал (В работе)" по алгоритму FIFO',
          },
        ],
      };
    }
    return t;
  });

  const movedTask = updatedTasks.find((t) => t.id === targetTask.id) || null;
  return { updatedTasks, movedTask };
}

/**
 * Sound effect generator using Web Audio API (no external sound files required)
 */
export function playSoundEffect(type: 'fifo' | 'urgent' | 'success' | 'pause' | 'drag_pickup' | 'drag_drop') {
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'fifo') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'urgent') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1100, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'pause') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'drag_pickup') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'drag_drop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.1);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch {
    // Ignore audio errors if blocked by browser autoplay policy
  }
}

export type ParsedCommandResult =
  | { type: 'CREATE_WINDOW'; windowName: string }
  | { type: 'OPEN_WINDOW'; windowName: string }
  | { type: 'ADD_TASK'; taskTitle: string }
  | { type: 'PIN_TOP'; taskTitle: string }
  | { type: 'OPEN_CARD'; taskTitle: string }
  | { type: 'START_TASK'; taskTitle: string }
  | { type: 'PAUSE_TASK'; taskTitle: string; reason?: string }
  | { type: 'DONE_TASK'; taskTitle: string }
  | { type: 'NEXT_FIFO' }
  | { type: 'UNKNOWN'; query: string };

/**
 * Natural language command parser in Russian for voice & command bar input
 */
export function parseSystemCommand(text: string): ParsedCommandResult {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // "Создай окно [Наименование]" / "Создать окно X" / "Новое окно X"
  if (lower.startsWith('создай окно') || lower.startsWith('создать окно') || lower.startsWith('новое окно')) {
    const windowName = trimmed.replace(/^(создай окно|создать окно|новое окно)\s*/i, '').replace(/[\[\]]/g, '');
    return { type: 'CREATE_WINDOW', windowName: windowName || 'Новое Окно' };
  }

  // "Открой окно [Наименование]" / "Перейди в окно X"
  if (lower.startsWith('открой окно') || lower.startsWith('открыть окно') || lower.startsWith('перейди в окно') || lower.startsWith('окно')) {
    const windowName = trimmed.replace(/^(открой окно|открыть окно|перейди в окно|окно)\s*/i, '').replace(/[\[\]]/g, '');
    return { type: 'OPEN_WINDOW', windowName: windowName };
  }

  // "Добавь задачу [Наименование]" / "Создай задачу X" / "Новая задача X"
  if (lower.startsWith('добавь задачу') || lower.startsWith('добавить задачу') || lower.startsWith('создай задачу') || lower.startsWith('новая задача')) {
    const taskTitle = trimmed.replace(/^(добавь задачу|добавить задачу|создай задачу|новая задача)\s*/i, '').replace(/[\[\]]/g, '');
    return { type: 'ADD_TASK', taskTitle: taskTitle || 'Новая задача' };
  }

  // "Подними наверх [Наименование]" / "Срочно [Наименование]" / "Поднять наверх X"
  if (lower.startsWith('подними наверх') || lower.startsWith('поднять наверх') || lower.startsWith('срочно') || lower.startsWith('вверху')) {
    const taskTitle = trimmed.replace(/^(подними наверх|поднять наверх|срочно|вверху)\s*/i, '').replace(/[\[\]]/g, '');
    return { type: 'PIN_TOP', taskTitle };
  }

  // "Открой карточку [Наименование]" / "Покажи карточку X" / "Карточка X"
  if (lower.startsWith('открой карточку') || lower.startsWith('открыть карточку') || lower.startsWith('карточка')) {
    const taskTitle = trimmed.replace(/^(открой карточку|открыть карточку|карточка)\s*/i, '').replace(/[\[\]]/g, '');
    return { type: 'OPEN_CARD', taskTitle };
  }

  // "Начни [Наименование]" / "В работу [Наименование]"
  if (lower.startsWith('начни') || lower.startsWith('начать') || lower.startsWith('в работу')) {
    const taskTitle = trimmed.replace(/^(начни|начать|в работу)\s*/i, '').replace(/[\[\]]/g, '');
    return { type: 'START_TASK', taskTitle };
  }

  // "Поставь на паузу [Наименование]" / "Отложи [Наименование]" / "Пауза [Наименование]"
  if (lower.startsWith('поставь на паузу') || lower.startsWith('пауза') || lower.startsWith('отложи') || lower.startsWith('отложить')) {
    const rest = trimmed.replace(/^(поставь на паузу|пауза|отложи|отложить)\s*/i, '').replace(/[\[\]]/g, '');
    const parts = rest.split(/\s+(?:причина|из-за|по причине)\s+/i);
    return {
      type: 'PAUSE_TASK',
      taskTitle: parts[0] || rest,
      reason: parts[1] || 'Причина не указана',
    };
  }

  // "Заверши [Наименование]" / "Сделано [Наименование]"
  if (lower.startsWith('заверши') || lower.startsWith('сделано') || lower.startsWith('готово')) {
    const taskTitle = trimmed.replace(/^(заверши|сделано|готово)\s*/i, '').replace(/[\[\]]/g, '');
    return { type: 'DONE_TASK', taskTitle };
  }

  // "Следующая задача" / "Дальше по очереди"
  if (lower.includes('следующая') || lower.includes('дальше') || lower.includes('по очереди') || lower.includes('fifo')) {
    return { type: 'NEXT_FIFO' };
  }

  return { type: 'UNKNOWN', query: trimmed };
}
