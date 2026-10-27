import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlarmClock,
  BellRing,
  Volume2,
  VolumeX,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  ArrowRight,
  Folder,
  Flame,
  RotateCcw,
  Sparkles,
  Calendar,
  X,
  AlertTriangle
} from 'lucide-react';
import { TaskCard, ProjectWindow } from '../types';
import { isAlarmPlaying, stopAlarmRinging, startAlarmRinging } from '../utils/alarmAudio';
import { ALARM_SOUND_OPTIONS } from '../utils/alarmPresets';

interface TaskAlarmModalProps {
  task: TaskCard;
  windowInfo?: ProjectWindow;
  onStartTask: (task: TaskCard) => void;
  onPauseTask: (task: TaskCard, reason: string) => void;
  onDoneTask: (task: TaskCard) => void;
  onSnoozeAlarm: (task: TaskCard, additionalMinutes: number) => void;
  onDismissAlarm: (task: TaskCard) => void;
  onOpenTaskDetail?: (task: TaskCard) => void;
}

export const TaskAlarmModal: React.FC<TaskAlarmModalProps> = ({
  task,
  windowInfo,
  onStartTask,
  onPauseTask,
  onDoneTask,
  onSnoozeAlarm,
  onDismissAlarm,
  onOpenTaskDetail,
}) => {
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [showCustomPauseInput, setShowCustomPauseInput] = useState(false);
  const [pauseReasonText, setPauseReasonText] = useState('Отложено по будильнику');
  const [customSnoozeMinutes, setCustomSnoozeMinutes] = useState('30');
  const [showCustomSnooze, setShowCustomSnooze] = useState(false);

  // Toggle alarm ringing sound
  const handleToggleSound = () => {
    if (isSoundMuted) {
      startAlarmRinging(task.title, task.alarmSound);
      setIsSoundMuted(false);
    } else {
      stopAlarmRinging();
      setIsSoundMuted(true);
    }
  };

  // Quick pause preset handler
  const handleSelectPausePreset = (reason: string) => {
    stopAlarmRinging();
    onPauseTask(task, reason);
  };

  // Formatted deadline display
  const deadlineDate = task.deadline ? new Date(task.deadline) : new Date();
  const timeString = deadlineDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const dateString = deadlineDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  const soundName =
    ALARM_SOUND_OPTIONS.find((s) => s.id === task.alarmSound)?.name || 'Громкая сирена';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border-2 border-amber-500/80 dark:border-amber-400/80 rounded-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-white my-auto flex flex-col"
      >
        {/* Animated Alarm Top Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 bg-[length:200%_auto] animate-gradient p-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <motion.div
              animate={{ rotate: [-15, 15, -15, 15, 0] }}
              transition={{ repeat: Infinity, duration: 0.7, ease: 'easeInOut' }}
              className="p-2 bg-white/20 rounded-2xl backdrop-blur-sm shadow-inner shrink-0"
            >
              <BellRing className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <div className="flex items-center gap-1.5 font-extrabold text-sm sm:text-base tracking-wide uppercase">
                <span>⏰ Сработал Будильник Срока!</span>
              </div>
              <p className="text-[11px] text-white/90 font-medium">
                Мелодия: {soundName} • {dateString}, {timeString}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleSound}
              className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                isSoundMuted
                  ? 'bg-slate-900/60 text-amber-200 hover:bg-slate-900'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
              title={isSoundMuted ? 'Включить звук будильника' : 'Заглушить звук'}
            >
              {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
            </button>
            <button
              type="button"
              onClick={() => {
                stopAlarmRinging();
                onDismissAlarm(task);
              }}
              className="p-2 hover:bg-white/20 rounded-xl transition text-white/90 hover:text-white"
              title="Закрыть окно"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Task Summary Card */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 px-2 py-0.5 rounded-lg">
                <Folder className="w-3.5 h-3.5" />
                [Окно: {windowInfo ? windowInfo.name : 'Рабочее пространство'}]
              </span>

              <div className="flex items-center gap-1.5">
                {task.isUrgentPinned && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-300 dark:border-amber-700">
                    <Flame className="w-3 h-3 fill-amber-500 text-amber-500" /> 🔥 ВВЕРХУ
                  </span>
                )}
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                  {task.columnId === 'fifo_queue'
                    ? '⏳ В очереди (FIFO)'
                    : task.columnId === 'in_progress'
                    ? '🟢 В работе'
                    : task.columnId === 'paused'
                    ? '🟡 На паузе'
                    : '🔵 Сделано'}
                </span>
              </div>
            </div>

            <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
              {task.title}
            </h3>

            {task.description && (
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                {task.description}
              </p>
            )}

            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800/80">
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                <Clock className="w-3.5 h-3.5" /> Назначенный срок: {timeString} ({dateString})
              </span>
              <button
                type="button"
                onClick={() => {
                  stopAlarmRinging();
                  onOpenTaskDetail?.(task);
                }}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                Открыть карточку →
              </button>
            </div>
          </div>

          {/* Action Prompt */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Что дальше делать с задачей?
              </label>
              <span className="text-[11px] text-slate-400">Выберите действие в 1 клик</span>
            </div>

            {/* Quick Snooze Primary Banner (+30 min as specifically requested) */}
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border border-indigo-300 dark:border-indigo-500/40 p-3 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <AlarmClock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Перенести звонок (Будильник по новым срокам):
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* 30 Minutes Primary Button */}
                <button
                  type="button"
                  onClick={() => {
                    stopAlarmRinging();
                    onSnoozeAlarm(task, 30);
                  }}
                  className="col-span-2 sm:col-span-2 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Через 30 минут
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopAlarmRinging();
                    onSnoozeAlarm(task, 5);
                  }}
                  className="py-2.5 px-2 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-xs transition"
                >
                  +5 мин
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopAlarmRinging();
                    onSnoozeAlarm(task, 15);
                  }}
                  className="py-2.5 px-2 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-xs transition"
                >
                  +15 мин
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopAlarmRinging();
                    onSnoozeAlarm(task, 60);
                  }}
                  className="py-2 px-2 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-xs transition"
                >
                  +1 час
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopAlarmRinging();
                    onSnoozeAlarm(task, 120);
                  }}
                  className="py-2 px-2 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-xs transition"
                >
                  +2 часа
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopAlarmRinging();
                    onSnoozeAlarm(task, 1440); // 24 hours
                  }}
                  className="col-span-2 sm:col-span-2 py-2 px-2 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-xs transition"
                >
                  Завтра в это же время (+24ч)
                </button>
              </div>
            </div>

            {/* Core Task Progression Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Option 1: Start Task Now */}
              <button
                type="button"
                onClick={() => {
                  stopAlarmRinging();
                  onStartTask(task);
                }}
                className="p-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md transition flex flex-col items-center justify-center gap-1 text-center"
              >
                <div className="flex items-center gap-1.5">
                  <Play className="w-4 h-4 fill-white" />
                  <span>Выполнять</span>
                </div>
                <span className="text-[10px] opacity-80 font-normal">Перевести в «В работе»</span>
              </button>

              {/* Option 2: Put on Pause */}
              <button
                type="button"
                onClick={() => {
                  setShowCustomPauseInput(!showCustomPauseInput);
                }}
                className="p-3 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md transition flex flex-col items-center justify-center gap-1 text-center"
              >
                <div className="flex items-center gap-1.5">
                  <Pause className="w-4 h-4 fill-white" />
                  <span>На паузу</span>
                </div>
                <span className="text-[10px] opacity-80 font-normal">Отложить задачу</span>
              </button>

              {/* Option 3: Mark Done */}
              <button
                type="button"
                onClick={() => {
                  stopAlarmRinging();
                  onDoneTask(task);
                }}
                className="p-3 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md transition flex flex-col items-center justify-center gap-1 text-center"
              >
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Выполнено</span>
                </div>
                <span className="text-[10px] opacity-80 font-normal">Завершить задачу</span>
              </button>
            </div>

            {/* Pause Quick Reasons drawer if toggled */}
            <AnimatePresence>
              {showCustomPauseInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-600/40 p-3 rounded-2xl space-y-2.5"
                >
                  <label className="text-xs font-bold text-amber-800 dark:text-amber-300 block">
                    Укажите причину отправки на паузу:
                  </label>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['Ожидание звонка/согласования', 'Занят другой задачей', 'Обед / Перерыв', 'Ждем материалы'].map(
                      (preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleSelectPausePreset(preset)}
                          className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-600/40 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 text-[11px] rounded-lg font-medium transition"
                        >
                          {preset}
                        </button>
                      )
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={pauseReasonText}
                      onChange={(e) => setPauseReasonText(e.target.value)}
                      placeholder="Или введите свою причину..."
                      className="flex-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-600/50 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleSelectPausePreset(pauseReasonText || 'Отложено по будильнику')}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow"
                    >
                      Подтвердить
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Dismiss Button */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            <span>Телефон в кармане оповестит вас при следующем сроке</span>
            <button
              type="button"
              onClick={() => {
                stopAlarmRinging();
                onDismissAlarm(task);
              }}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition"
            >
              Закрыть будильник ✕
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
