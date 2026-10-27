import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Flame,
  Clock,
  CheckSquare,
  Image as ImageIcon,
  Video as VideoIcon,
  Mic,
  Play,
  Pause,
  ArrowUpRight,
  MoreHorizontal,
  AlertTriangle,
  PauseCircle,
  CheckCircle2,
  PlayCircle,
  Trash2,
  AlarmClock,
  BellRing,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { TaskCard, ColumnId } from '../types';
import { ALARM_SOUND_OPTIONS } from '../utils/alarmPresets';

interface TaskCardItemProps {
  task: TaskCard;
  fifoRank?: number; // 1, 2, 3...
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, task: TaskCard) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onCardDropOnCard?: (draggedTaskId: string, targetTask: TaskCard, position: 'before' | 'after') => void;
  onMoveStep?: (task: TaskCard, direction: 'up' | 'down') => void;
  onOpenDetail: (task: TaskCard) => void;
  onMoveToTop: (task: TaskCard) => void;
  onStartTask: (task: TaskCard) => void;
  onPauseTask: (task: TaskCard) => void;
  onDoneTask: (task: TaskCard) => void;
  onDeleteTask?: (task: TaskCard) => void;
  onSnoozeTask?: (task: TaskCard, minutes: number) => void;
}

export const TaskCardItem: React.FC<TaskCardItemProps> = ({
  task,
  fifoRank,
  isDragging = false,
  onDragStart,
  onDragEnd,
  onCardDropOnCard,
  onMoveStep,
  onOpenDetail,
  onMoveToTop,
  onStartTask,
  onPauseTask,
  onDoneTask,
  onDeleteTask,
  onSnoozeTask,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  const photoCount = task.attachments.filter((a) => a.type === 'photo').length;
  const videoCount = task.attachments.filter((a) => a.type === 'video').length;
  const voiceCount = task.attachments.filter((a) => a.type === 'voice').length;

  const totalChecklist = task.checklist.length;
  const doneChecklist = task.checklist.filter((c) => c.completed).length;

  // Deadline calculation
  const isDeadlinePast = task.deadline && new Date(task.deadline).getTime() < Date.now();
  const isDeadlineSoon =
    task.deadline &&
    new Date(task.deadline).getTime() >= Date.now() &&
    new Date(task.deadline).getTime() - Date.now() < 86400000; // within 24 hours

  const getPriorityStyle = () => {
    switch (task.priority) {
      case 'urgent':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'medium':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const handleCardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'before' : 'after';
    if (dropPosition !== pos) {
      setDropPosition(pos);
    }
  };

  const handleCardDragLeave = (e: React.DragEvent) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !e.currentTarget.contains(related)) {
      setDropPosition(null);
    }
  };

  const handleCardDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = dropPosition || 'before';
    setDropPosition(null);
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId && draggedId !== task.id && onCardDropOnCard) {
      onCardDropOnCard(draggedId, task, pos);
    }
  };

  return (
    <motion.div
      layout="position"
      layoutId={task.id}
      draggable={true}
      onDragStart={(e) => {
        if (onDragStart) {
          onDragStart(e as unknown as React.DragEvent, task);
        }
      }}
      onDragEnd={(e) => {
        if (onDragEnd) {
          onDragEnd(e as unknown as React.DragEvent);
        }
      }}
      onDragOver={handleCardDragOver}
      onDragLeave={handleCardDragLeave}
      onDrop={handleCardDrop}
      initial={{ opacity: 0, scale: 0.94, y: 14 }}
      animate={{ opacity: isDragging ? 0.45 : 1, scale: isDragging ? 0.98 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -12, transition: { duration: 0.18, ease: 'easeInOut' } }}
      transition={{
        type: 'spring',
        stiffness: 380,
        damping: 28,
        mass: 0.6,
      }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onOpenDetail(task)}
      className={`group relative bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900 dark:hover:bg-slate-850 border rounded-xl p-3 sm:p-3.5 transition-all shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing select-none space-y-2.5 max-w-full overflow-hidden text-slate-900 dark:text-slate-100 ${
        isDragging
          ? 'opacity-40 ring-2 ring-indigo-500 border-indigo-400 scale-[0.98] rotate-1'
          : task.isUrgentPinned
          ? 'border-amber-400 dark:border-amber-500/60 ring-1 ring-amber-400/40 bg-amber-100/80 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900'
          : task.columnId === 'in_progress'
          ? 'border-emerald-400 dark:border-emerald-500/60 ring-1 ring-emerald-400/40 bg-emerald-100/70 dark:bg-slate-900'
          : task.columnId === 'paused'
          ? 'border-amber-300 dark:border-amber-600/40 opacity-95 bg-amber-100/50 dark:bg-slate-900'
          : task.columnId === 'done'
          ? 'border-slate-300 dark:border-slate-800 bg-slate-200/80 dark:bg-slate-950/60 opacity-85'
          : 'border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
      }`}
    >
      {/* Drop Insertion Line Above Card */}
      {dropPosition === 'before' && (
        <div className="absolute -top-1 inset-x-2 h-1.5 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/50 z-30 animate-pulse pointer-events-none" />
      )}
      {/* Drop Insertion Line Below Card */}
      {dropPosition === 'after' && (
        <div className="absolute -bottom-1 inset-x-2 h-1.5 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/50 z-30 animate-pulse pointer-events-none" />
      )}

      {/* Top Header info */}
      <div className="flex items-start justify-between gap-1.5 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap min-w-0">
          {/* Drag Handle Grip Icon */}
          <div
            className="text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 p-0.5 cursor-grab active:cursor-grabbing shrink-0"
            title="Зажмите и перетащите выше, ниже или в другую колонку"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          {/* FIFO Rank Badge & Quick Step Buttons */}
          {fifoRank !== undefined && (
            <div className="flex items-center gap-0.5">
              <span className="px-1.5 py-0.5 bg-sky-100 dark:bg-sky-950 border border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-300 font-mono text-[10px] font-bold rounded">
                #{fifoRank}
              </span>
              {onMoveStep && (
                <div className="flex items-center -space-x-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveStep(task, 'up');
                    }}
                    className="p-0.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                    title="Переместить на 1 позицию выше"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveStep(task, 'down');
                    }}
                    className="p-0.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                    title="Переместить на 1 позицию ниже"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Urgent / Up button in header */}
          {task.columnId !== 'done' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveToTop(task);
              }}
              className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md border transition shrink-0 shadow-sm ${
                task.isUrgentPinned
                  ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400 ring-1 ring-amber-300 animate-pulse'
                  : 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/25'
              }`}
              title={
                task.isUrgentPinned
                  ? 'Карточка закреплена на самом верху. Нажмите, чтобы вернуть в обычный порядок'
                  : 'Нажмите кнопку «Вверх», чтобы поднять карточку на самый верх очереди'
              }
            >
              <Flame
                className={`w-3 h-3 shrink-0 ${
                  task.isUrgentPinned
                    ? 'fill-slate-950 text-slate-950'
                    : 'fill-amber-600 text-amber-600 dark:fill-amber-400 dark:text-amber-400'
                }`}
              />
              <span>{task.isUrgentPinned ? '🔥 ВВЕРХУ' : 'Вверх'}</span>
            </button>
          )}

          {/* FIFO Queue position rank */}
          {task.columnId === 'fifo_queue' && !task.isUrgentPinned && (
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-sky-700 dark:text-sky-400 bg-sky-100 dark:bg-sky-500/15 border border-sky-300 dark:border-sky-500/30 px-1.5 py-0.5 rounded-md shrink-0">
              ⏳ FIFO #{fifoRank || task.fifoOrder}
            </span>
          )}

          {/* Column active state tag */}
          {task.columnId === 'in_progress' && (
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 px-1.5 py-0.5 rounded-md shrink-0">
              <PlayCircle className="w-3 h-3" /> В работе
            </span>
          )}

          {task.columnId === 'paused' && (
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 px-1.5 py-0.5 rounded-md shrink-0">
              <PauseCircle className="w-3 h-3" /> На паузе
            </span>
          )}

          {task.columnId === 'done' && (
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-md shrink-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Сделано
            </span>
          )}

          <span
            className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${getPriorityStyle()}`}
          >
            {task.priority === 'urgent'
              ? 'СРОЧНО'
              : task.priority === 'high'
              ? 'ВЫСОКИЙ'
              : task.priority === 'medium'
              ? 'СРЕДНИЙ'
              : 'НИЗКИЙ'}
          </span>
        </div>

        <div className="flex items-center gap-1 ml-auto shrink-0">
          {onDeleteTask && (
            confirmDelete ? (
              <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950 border border-red-300 dark:border-red-500/80 rounded px-1.5 py-0.5 text-[10px] animate-fadeIn">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTask(task);
                    setConfirmDelete(false);
                  }}
                  className="text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-white font-bold"
                >
                  Удалить?
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white ml-0.5"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Удалить карточку"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(task);
            }}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Открыть детали"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task Title */}
      <div>
        <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition line-clamp-2 leading-snug">
          {task.title}
        </h4>
        {task.description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Pause Reason Box if Paused */}
      {task.columnId === 'paused' && task.pauseReason && (
        <div className="text-[11px] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 p-2 rounded-lg">
          <span className="font-semibold">Причина паузы: </span>
          {task.pauseReason}
        </div>
      )}

      {/* Attachment Indicators & Checklist Progress */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
          {photoCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700/60">
              <ImageIcon className="w-3 h-3 text-sky-600 dark:text-sky-400" /> {photoCount}
            </span>
          )}
          {videoCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700/60">
              <VideoIcon className="w-3 h-3 text-purple-600 dark:text-purple-400" /> {videoCount}
            </span>
          )}
          {voiceCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/30">
              <Mic className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> {voiceCount}
            </span>
          )}

          {totalChecklist > 0 && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border ${
                doneChecklist === totalChecklist
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/60'
              }`}
            >
              <CheckSquare className="w-3 h-3" />
              {doneChecklist}/{totalChecklist}
            </span>
          )}
        </div>

        {/* Deadline & Alarm indicator */}
        {task.deadline && (
          <div className="flex items-center gap-1">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border ${
                isDeadlinePast
                  ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-500/40 animate-pulse'
                  : isDeadlineSoon
                  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/60'
              }`}
              title={`Срок: ${new Date(task.deadline).toLocaleString('ru-RU')}${
                task.reminderSet
                  ? ` • Мелодия: ${
                      ALARM_SOUND_OPTIONS.find((s) => s.id === task.alarmSound)?.name || 'Громкая сирена'
                    }`
                  : ''
              }`}
            >
              {task.reminderSet ? (
                <AlarmClock className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
              {new Date(task.deadline).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>

            {onSnoozeTask && task.columnId !== 'done' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSnoozeTask(task, 30);
                }}
                className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded transition"
                title="Отложить будильник на 30 минут"
              >
                +30м ⏰
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons row */}
      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/60 opacity-90 group-hover:opacity-100 transition flex-wrap">
        {task.columnId !== 'done' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveToTop(task);
            }}
            className={`px-2 py-1 text-[11px] font-bold rounded border flex items-center gap-1 transition ${
              task.isUrgentPinned
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm hover:bg-amber-400'
                : 'bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
            }`}
            title={
              task.isUrgentPinned
                ? 'Закреплена на самом верху'
                : 'Поднять карточку на самый верх очереди (минуя FIFO)'
            }
          >
            <Flame
              className={`w-3 h-3 shrink-0 ${
                task.isUrgentPinned
                  ? 'fill-slate-950 text-slate-950'
                  : 'fill-amber-600 text-amber-600 dark:fill-amber-400 dark:text-amber-400'
              }`}
            />
            {task.isUrgentPinned ? 'Вверху' : 'Вверх'}
          </button>
        )}

        {task.columnId !== 'in_progress' && task.columnId !== 'done' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartTask(task);
            }}
            className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold rounded border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1 transition"
            title="Перевести в работу"
          >
            <Play className="w-3 h-3 fill-emerald-600 dark:fill-emerald-400 text-emerald-600 dark:text-emerald-400 shrink-0" />
            Начал
          </button>
        )}

        {task.columnId === 'in_progress' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPauseTask(task);
            }}
            className="px-2 py-1 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-semibold rounded border border-amber-200 dark:border-amber-500/30 flex items-center gap-1 transition"
            title="Отложить / Поставить на паузу"
          >
            <Pause className="w-3 h-3 shrink-0" />
            Пауза
          </button>
        )}

        {task.columnId !== 'done' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDoneTask(task);
            }}
            className="px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold rounded border border-indigo-200 dark:border-indigo-500/30 flex items-center gap-1 transition ml-auto"
            title="Завершить задачу"
          >
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            Сделано
          </button>
        )}
      </div>
    </motion.div>
  );
};
