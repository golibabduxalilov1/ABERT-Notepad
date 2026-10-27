import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  Play,
  Pause,
  CheckCircle2,
  Plus,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  PlusCircle,
  HelpCircle,
  Layers,
  ArrowRight,
  BarChart3,
  LayoutDashboard,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { ProjectWindow, TaskCard, ColumnId, PriorityLevel } from '../types';
import { TaskCardItem } from './TaskCardItem';
import { getColumnTasks, playSoundEffect, reorderTasks, moveTaskStep } from '../utils/fifo';

interface BoardViewProps {
  activeWindow: ProjectWindow;
  tasks: TaskCard[];
  onBackToMain: () => void;
  onUpdateTasks: (newTasks: TaskCard[]) => void;
  onOpenDetailModal: (task: TaskCard) => void;
  onDeleteTask: (taskId: string) => void;
}

export const BoardView: React.FC<BoardViewProps> = ({
  activeWindow,
  tasks,
  onBackToMain,
  onUpdateTasks,
  onOpenDetailModal,
  onDeleteTask,
}) => {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<PriorityLevel>('medium');

  const [taskToPause, setTaskToPause] = useState<TaskCard | null>(null);
  const [pauseReasonInput, setPauseReasonInput] = useState('Ожидание ответа / материалов');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Drag and drop states
  const [draggedTask, setDraggedTask] = useState<TaskCard | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<ColumnId | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const windowTasks = useMemo(() => tasks.filter((t) => t.windowId === activeWindow.id), [tasks, activeWindow.id]);
  const completedCount = useMemo(() => windowTasks.filter((t) => t.columnId === 'done').length, [windowTasks]);
  const completionRate = windowTasks.length > 0 ? Math.round((completedCount / windowTasks.length) * 100) : 0;

  const urgentTasks = getColumnTasks(tasks, activeWindow.id, 'urgent');
  const fifoTasks = getColumnTasks(tasks, activeWindow.id, 'fifo_queue');
  const inProgressTasks = getColumnTasks(tasks, activeWindow.id, 'in_progress');
  const pausedTasks = getColumnTasks(tasks, activeWindow.id, 'paused');
  const doneTasks = getColumnTasks(tasks, activeWindow.id, 'done');

  // Drag and drop event handlers
  const handleCardDragStart = (e: React.DragEvent, task: TaskCard) => {
    setDraggedTask(task);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    playSoundEffect('drag_pickup');
  };

  const handleCardDragEnd = () => {
    setDraggedTask(null);
    setActiveDropColumn(null);
  };

  const handleDragOverColumn = (e: React.DragEvent, colId: ColumnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropColumn !== colId) {
      setActiveDropColumn(colId);
    }
  };

  const handleDragLeaveColumn = (e: React.DragEvent, colId: ColumnId) => {
    // Only clear if leaving the column wrapper
    const related = e.relatedTarget as HTMLElement | null;
    const current = e.currentTarget as HTMLElement;
    if (!related || !current.contains(related)) {
      if (activeDropColumn === colId) {
        setActiveDropColumn(null);
      }
    }
  };

  // Dropping directly onto another card to place before or after it
  const handleCardDropOnCard = (draggedTaskId: string, targetTask: TaskCard, position: 'before' | 'after') => {
    if (!draggedTaskId || draggedTaskId === targetTask.id) return;
    const dragged = tasks.find((t) => t.id === draggedTaskId);
    if (!dragged) return;

    const reordered = reorderTasks(tasks, activeWindow.id, draggedTaskId, targetTask.id, position);
    playSoundEffect('drag_drop');
    onUpdateTasks(reordered);
    showToast(`Порядок обновлен: "${dragged.title}" перемещена ${position === 'before' ? 'выше' : 'ниже'}`);
  };

  // Moving step up or down (1 tap for touch / arrows)
  const handleMoveStep = (task: TaskCard, direction: 'up' | 'down') => {
    const updated = moveTaskStep(tasks, activeWindow.id, task.id, direction);
    playSoundEffect('drag_drop');
    onUpdateTasks(updated);
    showToast(`Позиция изменена: "${task.title}" перемещена ${direction === 'up' ? 'выше ▲' : 'ниже ▼'}`);
  };

  const handleDropOnColumn = (e: React.DragEvent, targetCol: ColumnId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTask?.id;
    setActiveDropColumn(null);
    setDraggedTask(null);

    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (task.columnId === targetCol) {
      // If dropped onto column empty space while in the same column, move to end
      const colTasks = getColumnTasks(tasks, activeWindow.id, targetCol);
      if (colTasks.length > 0 && colTasks[colTasks.length - 1].id !== task.id) {
        const lastTask = colTasks[colTasks.length - 1];
        const reordered = reorderTasks(tasks, activeWindow.id, task.id, lastTask.id, 'after');
        playSoundEffect('drag_drop');
        onUpdateTasks(reordered);
        showToast(`"${task.title}" перемещена в конец колонки`);
      }
      return;
    }

    const now = new Date().toISOString();

    if (targetCol === 'paused') {
      // If dropped to paused, show the pause prompt modal
      setTaskToPause(task);
      setPauseReasonInput('Ожидание ответа / материалов');
      return;
    }

    let actionLabel = `Перемещена в колонку: ${targetCol}`;
    if (targetCol === 'in_progress') actionLabel = '🟢 Переведена в работу (Drag & Drop)';
    else if (targetCol === 'done') actionLabel = '🔵 Задача выполнена (Drag & Drop)';
    else if (targetCol === 'fifo_queue') actionLabel = '⏳ Возвращена в очередь FIFO (Drag & Drop)';

    const updated = tasks.map((t) => {
      if (t.id === task.id) {
        return {
          ...t,
          columnId: targetCol,
          isUrgentPinned: false,
          completedAt: targetCol === 'done' ? now : t.completedAt,
          updatedAt: now,
          historyLog: [
            ...t.historyLog,
            {
              id: `h-${Date.now()}`,
              timestamp: now,
              action: actionLabel,
            },
          ],
        };
      }
      return t;
    });

    if (targetCol === 'done') {
      playSoundEffect('success');
      showToast(`🔵 Задача "${task.title}" переведена в "Сделано"!`);
    } else if (targetCol === 'in_progress') {
      playSoundEffect('fifo');
      showToast(`🟢 Задача "${task.title}" взята в работу!`);
    } else {
      playSoundEffect('drag_drop');
      showToast(`Перемещено: "${task.title}"`);
    }

    onUpdateTasks(updated);
  };

  // Add Task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const windowTasks = tasks.filter((t) => t.windowId === activeWindow.id);
    const maxFifoOrder = windowTasks.reduce((max, t) => Math.max(max, t.fifoOrder || 0), 0);

    const now = new Date().toISOString();
    const newTask: TaskCard = {
      id: `task-${Date.now()}`,
      windowId: activeWindow.id,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim(),
      columnId: 'fifo_queue',
      priority: newTaskPriority,
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
          action: 'Задача добавлена в FIFO очередь (В порядке поступления)',
        },
      ],
    };

    onUpdateTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setShowQuickAdd(false);
    playSoundEffect('success');
  };

  // Quick Action Handlers
  const handleMoveToTop = (task: TaskCard) => {
    const windowTasks = tasks.filter((t) => t.windowId === activeWindow.id);
    const minFifoOrder = windowTasks.reduce((min, t) => Math.min(min, t.fifoOrder ?? 1), 1);
    const now = new Date().toISOString();

    const isCurrentlyPinned = task.isUrgentPinned;

    const updated = tasks.map((t) => {
      if (t.id === task.id) {
        if (isCurrentlyPinned) {
          // If already pinned, unpin it
          return {
            ...t,
            isUrgentPinned: false,
            columnId: (t.columnId === 'urgent' ? 'fifo_queue' : t.columnId) as ColumnId,
            updatedAt: now,
            historyLog: [
              ...t.historyLog,
              {
                id: `h-${Date.now()}`,
                timestamp: now,
                action: 'Снята отметка закрепления вверху',
              },
            ],
          };
        } else {
          // Pin to top and place at minimum fifoOrder so it's #1 in the queue
          return {
            ...t,
            isUrgentPinned: true,
            columnId: (t.columnId === 'done' || t.columnId === 'paused' ? 'fifo_queue' : t.columnId) as ColumnId,
            fifoOrder: minFifoOrder - 1,
            updatedAt: now,
            historyLog: [
              ...t.historyLog,
              {
                id: `h-${Date.now()}`,
                timestamp: now,
                action: 'Поднята карточка на самый верх (🔥 Вверху / Вне очереди)',
              },
            ],
          };
        }
      }
      return t;
    });

    if (!isCurrentlyPinned) {
      playSoundEffect('urgent');
      showToast(`🔥 Карточка "${task.title}" поднята на самый верх!`);
    } else {
      showToast(`Карточка "${task.title}" возвращена в общий порядок`);
    }
    onUpdateTasks(updated);
  };

  const handleStartTask = (task: TaskCard) => {
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
              {
                id: `h-${Date.now()}`,
                timestamp: now,
                action: 'Переведена в очередь 🟢 Начал (В работе)',
              },
            ],
          }
        : t
    );
    playSoundEffect('fifo');
    onUpdateTasks(updated);
  };

  const handlePauseTask = (task: TaskCard) => {
    setTaskToPause(task);
    setPauseReasonInput('Ожидание ответа / материалов');
  };

  const confirmPauseTask = () => {
    if (!taskToPause) return;
    const reason = pauseReasonInput.trim() || 'Пауза без причины';
    const now = new Date().toISOString();

    const updated = tasks.map((t) =>
      t.id === taskToPause.id
        ? {
            ...t,
            columnId: 'paused' as ColumnId,
            pauseReason: reason,
            updatedAt: now,
            historyLog: [
              ...t.historyLog,
              {
                id: `h-${Date.now()}`,
                timestamp: now,
                action: `Поставлена на паузу: ${reason}`,
              },
            ],
          }
        : t
    );

    playSoundEffect('pause');
    onUpdateTasks(updated);
    setTaskToPause(null);
  };

  const handleDoneTask = (task: TaskCard) => {
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
              {
                id: `h-${Date.now()}`,
                timestamp: now,
                action: 'Задача успешно завершена 🔵 Сделано',
              },
            ],
          }
        : t
    );
    playSoundEffect('success');
    onUpdateTasks(updated);
  };

  const handleSnoozeTask = (task: TaskCard, minutes: number = 30) => {
    const now = new Date();
    const newDeadlineDate = new Date(now.getTime() + minutes * 60 * 1000);
    const newDeadlineIso = newDeadlineDate.toISOString();
    const timeFormatted = newDeadlineDate.toLocaleTimeString('ru-RU', {
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
                action: `Будильник перенесен на ${minutes} мин. Новый срок: ${timeFormatted}`,
              },
            ],
          }
        : t
    );

    playSoundEffect('pause');
    onUpdateTasks(updated);
    showToast(`⏰ Будильник задачи "${task.title}" отложен на ${minutes} мин. (до ${timeFormatted})`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Workspace Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 rounded-2xl shadow-md max-w-full overflow-hidden">
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-2.5 min-w-0 max-w-full">
          <button
            id="board-back-button"
            type="button"
            onClick={onBackToMain}
            className="hidden sm:flex px-4 py-2.5 sm:px-5 sm:py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-sm items-center gap-2.5 text-sm sm:text-base font-bold shrink-0 active:scale-95"
            title="Вернуться в Главное окно"
          >
            <ArrowLeft className="w-5 h-5 shrink-0" /> <span>Назад</span>
          </button>

          <div className="flex items-center gap-1.5 min-w-0">
            <h2 className="text-sm sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">
              [{activeWindow.name}]
            </h2>
            {/* Quick Completion Rate Pill */}
            <div
              className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 shrink-0 flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>{completionRate}% Выполнено</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="w-full xs:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 whitespace-nowrap text-center shrink-0 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Добавить задачу
          </button>
        </div>
      </div>

      {/* Quick Add Form Drawer */}
          <AnimatePresence>
            {showQuickAdd && (
              <motion.form
                initial={{ opacity: 0, height: 0, scale: 0.98 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.98 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                onSubmit={handleCreateTask}
                className="bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-500/50 p-4 sm:p-5 rounded-2xl shadow-xl space-y-4 overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                  <h4 className="font-bold text-sm text-indigo-600 dark:text-indigo-300 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Добавить новую задачу в FIFO очередь
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowQuickAdd(false)}
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 transition"
                  >
                    Отмена
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      required
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Наименование задачи..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      autoFocus
                    />
                  </div>

                  <div>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as PriorityLevel)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    >
                      <option value="high">⚡ Высокий приоритет</option>
                      <option value="medium">🔷 Средний приоритет</option>
                      <option value="low">⚪ Низкий приоритет</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <textarea
                      rows={2}
                      value={newTaskDesc}
                      onChange={(e) => setNewTaskDesc(e.target.value)}
                      placeholder="Дополнительное описание, примечания или требования..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Поместить в очередь (FIFO)
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* 4 Strictly Ordered Columns with Smooth Fluid Motion */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {/* Column 1: ⏳ 1. В очереди (FIFO) */}
            <div
              onDragOver={(e) => handleDragOverColumn(e, 'fifo_queue')}
              onDragLeave={(e) => handleDragLeaveColumn(e, 'fifo_queue')}
              onDrop={(e) => handleDropOnColumn(e, 'fifo_queue')}
              className={`border rounded-2xl p-3.5 space-y-3 min-h-[450px] shadow-sm flex flex-col transition-all duration-200 ${
                activeDropColumn === 'fifo_queue'
                  ? 'bg-sky-50 dark:bg-sky-950/70 border-sky-500 ring-2 ring-sky-400/50 scale-[1.01]'
                  : 'bg-white/90 dark:bg-slate-900/80 border-sky-300 dark:border-sky-500/40'
              }`}
            >
              <div className="flex items-center justify-between bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-500/30 p-2.5 rounded-xl text-sky-800 dark:text-sky-300">
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
                  <span>⏳ 1. В очереди (FIFO)</span>
                </div>
                <span className="font-mono text-xs font-bold bg-sky-100 dark:bg-sky-500/20 text-sky-900 dark:text-sky-300 px-2 py-0.5 rounded-full">
                  {fifoTasks.length}
                </span>
              </div>

              {/* Drop Target Indicator */}
              {activeDropColumn === 'fifo_queue' && draggedTask?.columnId !== 'fifo_queue' && (
                <div className="border-2 border-dashed border-sky-400 bg-sky-100/50 dark:bg-sky-900/30 rounded-xl p-3 text-center text-xs font-bold text-sky-600 dark:text-sky-300 animate-pulse">
                  ⬇️ Отпустите для возврата в очередь FIFO
                </div>
              )}

              <div className="space-y-3 flex-1">
                <AnimatePresence mode="popLayout" initial={false}>
                  {fifoTasks.length === 0 ? (
                    <motion.p
                      key="empty-fifo"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-slate-400 italic text-center py-8"
                    >
                      Очередь FIFO пуста. Добавьте задачу кнопкой выше или перетащите сюда.
                    </motion.p>
                  ) : (
                    fifoTasks.map((t, idx) => (
                      <TaskCardItem
                        key={t.id}
                        task={t}
                        fifoRank={idx + 1}
                        isDragging={draggedTask?.id === t.id}
                        onDragStart={handleCardDragStart}
                        onDragEnd={handleCardDragEnd}
                        onCardDropOnCard={handleCardDropOnCard}
                        onMoveStep={handleMoveStep}
                        onOpenDetail={onOpenDetailModal}
                        onMoveToTop={handleMoveToTop}
                        onStartTask={handleStartTask}
                        onPauseTask={handlePauseTask}
                        onDoneTask={handleDoneTask}
                        onDeleteTask={(t) => onDeleteTask(t.id)}
                        onSnoozeTask={handleSnoozeTask}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Column 2: 🟢 2. Начал (В работе) */}
            <div
              onDragOver={(e) => handleDragOverColumn(e, 'in_progress')}
              onDragLeave={(e) => handleDragLeaveColumn(e, 'in_progress')}
              onDrop={(e) => handleDropOnColumn(e, 'in_progress')}
              className={`border rounded-2xl p-3.5 space-y-3 min-h-[450px] shadow-sm flex flex-col transition-all duration-200 ${
                activeDropColumn === 'in_progress'
                  ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 ring-2 ring-emerald-400/50 scale-[1.01]'
                  : 'bg-white/90 dark:bg-slate-900/80 border-emerald-300 dark:border-emerald-500/40'
              }`}
            >
              <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 p-2.5 rounded-xl text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
                  <span>🟢 2. Начал (В работе)</span>
                </div>
                <span className="font-mono text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  {inProgressTasks.length}
                </span>
              </div>

              {/* Drop Target Indicator */}
              {activeDropColumn === 'in_progress' && draggedTask?.columnId !== 'in_progress' && (
                <div className="border-2 border-dashed border-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-xl p-3 text-center text-xs font-bold text-emerald-700 dark:text-emerald-300 animate-pulse">
                  🟢 Отпустите, чтобы начать выполнение
                </div>
              )}

              <div className="space-y-3 flex-1">
                <AnimatePresence mode="popLayout" initial={false}>
                  {inProgressTasks.length === 0 ? (
                    <motion.p
                      key="empty-inprogress"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-slate-400 italic text-center py-8"
                    >
                      Прямо сейчас нет выполняемых задач. Нажмите «Взять по FIFO» или перетащите задачу сюда.
                    </motion.p>
                  ) : (
                    inProgressTasks.map((t) => (
                      <TaskCardItem
                        key={t.id}
                        task={t}
                        isDragging={draggedTask?.id === t.id}
                        onDragStart={handleCardDragStart}
                        onDragEnd={handleCardDragEnd}
                        onCardDropOnCard={handleCardDropOnCard}
                        onMoveStep={handleMoveStep}
                        onOpenDetail={onOpenDetailModal}
                        onMoveToTop={handleMoveToTop}
                        onStartTask={handleStartTask}
                        onPauseTask={handlePauseTask}
                        onDoneTask={handleDoneTask}
                        onDeleteTask={(t) => onDeleteTask(t.id)}
                        onSnoozeTask={handleSnoozeTask}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Column 3: 🟡 3. Пауза (Отложено) */}
            <div
              onDragOver={(e) => handleDragOverColumn(e, 'paused')}
              onDragLeave={(e) => handleDragLeaveColumn(e, 'paused')}
              onDrop={(e) => handleDropOnColumn(e, 'paused')}
              className={`border rounded-2xl p-3.5 space-y-3 min-h-[450px] shadow-sm flex flex-col transition-all duration-200 ${
                activeDropColumn === 'paused'
                  ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-500 ring-2 ring-amber-400/50 scale-[1.01]'
                  : 'bg-white/90 dark:bg-slate-900/80 border-amber-300 dark:border-amber-600/30'
              }`}
            >
              <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-600/30 p-2.5 rounded-xl text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
                  <span>🟡 3. Пауза (Отложено)</span>
                </div>
                <span className="font-mono text-xs font-bold bg-amber-100 dark:bg-amber-600/20 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full">
                  {pausedTasks.length}
                </span>
              </div>

              {/* Drop Target Indicator */}
              {activeDropColumn === 'paused' && draggedTask?.columnId !== 'paused' && (
                <div className="border-2 border-dashed border-amber-400 bg-amber-100/50 dark:bg-amber-900/30 rounded-xl p-3 text-center text-xs font-bold text-amber-800 dark:text-amber-300 animate-pulse">
                  🟡 Отпустите, чтобы поставить на паузу
                </div>
              )}

              <div className="space-y-3 flex-1">
                <AnimatePresence mode="popLayout" initial={false}>
                  {pausedTasks.length === 0 ? (
                    <motion.p
                      key="empty-paused"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-slate-400 italic text-center py-8"
                    >
                      Нет задач на паузе. Перетащите сюда для временной остановки.
                    </motion.p>
                  ) : (
                    pausedTasks.map((t) => (
                      <TaskCardItem
                        key={t.id}
                        task={t}
                        isDragging={draggedTask?.id === t.id}
                        onDragStart={handleCardDragStart}
                        onDragEnd={handleCardDragEnd}
                        onCardDropOnCard={handleCardDropOnCard}
                        onMoveStep={handleMoveStep}
                        onOpenDetail={onOpenDetailModal}
                        onMoveToTop={handleMoveToTop}
                        onStartTask={handleStartTask}
                        onPauseTask={handlePauseTask}
                        onDoneTask={handleDoneTask}
                        onDeleteTask={(t) => onDeleteTask(t.id)}
                        onSnoozeTask={handleSnoozeTask}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Column 4: 🔵 4. Сделано */}
            <div
              onDragOver={(e) => handleDragOverColumn(e, 'done')}
              onDragLeave={(e) => handleDragLeaveColumn(e, 'done')}
              onDrop={(e) => handleDropOnColumn(e, 'done')}
              className={`border rounded-2xl p-3.5 space-y-3 min-h-[450px] shadow-sm flex flex-col transition-all duration-200 ${
                activeDropColumn === 'done'
                  ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-500 ring-2 ring-indigo-400/50 scale-[1.01]'
                  : 'bg-white/90 dark:bg-slate-900/80 border-slate-300 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-slate-800 dark:text-slate-300">
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
                  <span>🔵 4. Сделано</span>
                </div>
                <span className="font-mono text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-300 px-2 py-0.5 rounded-full">
                  {doneTasks.length}
                </span>
              </div>

              {/* Drop Target Indicator */}
              {activeDropColumn === 'done' && draggedTask?.columnId !== 'done' && (
                <div className="border-2 border-dashed border-indigo-400 bg-indigo-100/50 dark:bg-indigo-900/30 rounded-xl p-3 text-center text-xs font-bold text-indigo-700 dark:text-indigo-300 animate-pulse">
                  🎉 Отпустите для успешного завершения задачи
                </div>
              )}

              <div className="space-y-3 flex-1">
                <AnimatePresence mode="popLayout" initial={false}>
                  {doneTasks.length === 0 ? (
                    <motion.p
                      key="empty-done"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-slate-400 italic text-center py-8"
                    >
                      Нет завершенных задач. Перетащите выполненную задачу сюда.
                    </motion.p>
                  ) : (
                    doneTasks.map((t) => (
                      <TaskCardItem
                        key={t.id}
                        task={t}
                        isDragging={draggedTask?.id === t.id}
                        onDragStart={handleCardDragStart}
                        onDragEnd={handleCardDragEnd}
                        onCardDropOnCard={handleCardDropOnCard}
                        onMoveStep={handleMoveStep}
                        onOpenDetail={onOpenDetailModal}
                        onMoveToTop={handleMoveToTop}
                        onStartTask={handleStartTask}
                        onPauseTask={handlePauseTask}
                        onDoneTask={handleDoneTask}
                        onDeleteTask={(t) => onDeleteTask(t.id)}
                        onSnoozeTask={handleSnoozeTask}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

      {/* Toast Banner with AnimatePresence */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-indigo-500 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause Reason Modal with AnimatePresence */}
      <AnimatePresence>
        {taskToPause && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/40 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl text-slate-900 dark:text-slate-100"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-amber-600 dark:text-amber-300 flex items-center gap-2">
                  <Pause className="w-4 h-4" /> Поставить задачу на паузу
                </h3>
                <button
                  type="button"
                  onClick={() => setTaskToPause(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300">
                Задача: <strong className="text-slate-900 dark:text-white">"{taskToPause.title}"</strong>
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Укажите причину паузы / откладывания:
                </label>
                <input
                  type="text"
                  value={pauseReasonInput}
                  onChange={(e) => setPauseReasonInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmPauseTask()}
                  placeholder="Например: Ожидание согласования / Задержка материалов..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none transition"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTaskToPause(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={confirmPauseTask}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow transition"
                >
                  Отправить на паузу
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
