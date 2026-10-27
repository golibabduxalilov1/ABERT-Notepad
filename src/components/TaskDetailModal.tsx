import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Flame,
  Clock,
  CheckSquare,
  Plus,
  Trash2,
  Mic,
  Image as ImageIcon,
  Video as VideoIcon,
  Play,
  Pause,
  AlertCircle,
  History,
  Tag,
  Paperclip,
  CheckCircle2,
  Calendar,
  Volume2,
  AlarmClock,
  BellRing
} from 'lucide-react';
import { TaskCard, ColumnId, PriorityLevel, MediaAttachment, AlarmSoundId } from '../types';
import { VoiceRecorder } from './VoiceRecorder';
import { MediaViewerModal } from './MediaViewerModal';
import {
  testAlarmSound,
  requestNotificationPermission,
  unlockMobileAudio,
  armBackgroundAlarmKeepAlive,
} from '../utils/alarmAudio';
import { SoundSelector } from './SoundSelector';
import { getDefaultAlarmSound } from '../utils/alarmPresets';

interface TaskDetailModalProps {
  task: TaskCard | null;
  onClose: () => void;
  onUpdateTask: (updatedTask: TaskCard) => void;
  onDeleteTask: (taskId: string) => void;
}

// Helper to convert ISO date string to YYYY-MM-DDTHH:mm string in LOCAL timezone
const formatForDateTimeInput = (isoString?: string): string => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Helper to convert datetime-local input string YYYY-MM-DDTHH:mm to ISO string
const parseDateTimeInput = (val: string): string => {
  if (!val) return '';
  const d = new Date(val);
  return isNaN(d.getTime()) ? '' : d.toISOString();
};

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  onClose,
  onUpdateTask,
  onDeleteTask,
}) => {
  if (!task) return null;

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [columnId, setColumnId] = useState<ColumnId>(task.columnId);
  const [priority, setPriority] = useState<PriorityLevel>(task.priority);
  const [isUrgentPinned, setIsUrgentPinned] = useState(task.isUrgentPinned);
  const [pauseReason, setPauseReason] = useState(task.pauseReason || '');
  const [deadline, setDeadline] = useState(task.deadline || '');
  const [reminderSet, setReminderSet] = useState(task.reminderSet || false);
  const [alarmSound, setAlarmSound] = useState<AlarmSoundId>(task.alarmSound || getDefaultAlarmSound());

  const [checklist, setChecklist] = useState(task.checklist);
  const [newChecklistText, setNewChecklistText] = useState('');

  const [attachments, setAttachments] = useState<MediaAttachment[]>(task.attachments);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [activeMediaViewer, setActiveMediaViewer] = useState<MediaAttachment | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [isDragOverFiles, setIsDragOverFiles] = useState(false);

  const processUploadedFiles = (fileList: FileList | File[]) => {
    Array.from(fileList).forEach((file: File) => {
      const reader = new FileReader();
      const isVideo = file.type.startsWith('video');
      const isImage = file.type.startsWith('image');

      reader.onload = (event) => {
        const url = event.target?.result as string;
        const newAttachment: MediaAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          type: isVideo ? 'video' : 'photo',
          url,
          fileName: file.name,
          fileSize: file.size,
          createdAt: new Date().toISOString(),
        };
        setAttachments((prev) => [...prev, newAttachment]);
      };

      reader.readAsDataURL(file);
    });
  };

  const handleQuickDeadline = (
    type: 'in15m' | 'in30m' | 'in1h' | 'in2h' | 'today' | 'tomorrow' | 'tomorrowMorning' | 'plus3' | 'clear'
  ) => {
    if (type === 'clear') {
      setDeadline('');
      setReminderSet(false);
      return;
    }
    const d = new Date();
    if (type === 'in15m') {
      d.setMinutes(d.getMinutes() + 15);
    } else if (type === 'in30m') {
      d.setMinutes(d.getMinutes() + 30);
    } else if (type === 'in1h') {
      d.setHours(d.getHours() + 1);
    } else if (type === 'in2h') {
      d.setHours(d.getHours() + 2);
    } else if (type === 'tomorrowMorning') {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    } else if (type === 'tomorrow') {
      d.setDate(d.getDate() + 1);
      d.setHours(18, 0, 0, 0);
    } else if (type === 'today') {
      d.setHours(18, 0, 0, 0);
      if (d.getTime() < Date.now()) {
        d.setHours(d.getHours() + 2);
      }
    } else if (type === 'plus3') {
      d.setDate(d.getDate() + 3);
      d.setHours(18, 0, 0, 0);
    }
    setDeadline(d.toISOString());
    setReminderSet(true);
  };

  const handleSaveAll = (
    newCol = columnId,
    newReason = pauseReason,
    newPinned = isUrgentPinned
  ) => {
    const now = new Date().toISOString();
    const historyAction =
      newCol !== task.columnId
        ? `Изменен статус на: ${newCol}`
        : newPinned !== task.isUrgentPinned
        ? newPinned
          ? 'Поднята карточка на самый верх 🔥'
          : 'Снята отметка 🔥 Вверху'
        : 'Обновлена карточка';

    const updated: TaskCard = {
      ...task,
      title,
      description,
      columnId: newCol,
      priority,
      isUrgentPinned: newPinned,
      fifoOrder: newPinned && !task.isUrgentPinned ? Math.min(task.fifoOrder ?? 1, 1) - 1 : task.fifoOrder,
      pauseReason: newCol === 'paused' ? newReason : undefined,
      deadline,
      reminderSet,
      alarmSound,
      checklist,
      attachments,
      updatedAt: now,
      completedAt: newCol === 'done' ? now : task.completedAt,
      historyLog: [
        ...task.historyLog,
        {
          id: `h-${Date.now()}`,
          timestamp: now,
          action: historyAction,
        },
      ],
    };

    onUpdateTask(updated);
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    const newItem = {
      id: `c-${Date.now()}`,
      text: newChecklistText.trim(),
      completed: false,
    };
    const updated = [...checklist, newItem];
    setChecklist(updated);
    setNewChecklistText('');
  };

  const toggleChecklist = (id: string) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updated);
  };

  const deleteChecklistItem = (id: string) => {
    setChecklist(checklist.filter((c) => c.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processUploadedFiles(files);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverFiles(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFiles(e.dataTransfer.files);
    }
  };

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverFiles(true);
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverFiles(false);
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    const newAttachment: MediaAttachment = {
      id: `att-${Date.now()}`,
      type: 'photo',
      url: imageUrlInput.trim(),
      fileName: 'Фото_ссылка.jpg',
      createdAt: new Date().toISOString(),
    };
    setAttachments((prev) => [...prev, newAttachment]);
    setImageUrlInput('');
    setShowImageInput(false);
  };

  const handleVoiceRecordComplete = (audioUrl: string, durationSec: number, transcript: string) => {
    const newAttachment: MediaAttachment = {
      id: `voice-${Date.now()}`,
      type: 'voice',
      url: audioUrl,
      fileName: `Голосовая_заметка_${new Date().toLocaleTimeString('ru-RU')}.webm`,
      durationSeconds: durationSec,
      transcript,
      createdAt: new Date().toISOString(),
    };
    setAttachments((prev) => [...prev, newAttachment]);
    setShowVoiceRecorder(false);
  };

  const deleteAttachment = (attId: string) => {
    setAttachments(attachments.filter((a) => a.id !== attId));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">
              Карточка задачи
            </span>
            {isUrgentPinned && (
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 px-2 py-1 rounded border border-amber-300 dark:border-amber-500/40 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-500 dark:fill-amber-400 text-amber-500 dark:text-amber-400" /> 🔥 ВВЕРХУ
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              handleSaveAll();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-slate-900 dark:text-slate-100 flex-1">
          {/* Title Input */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
              Наименование задачи
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите название задачи..."
              className="w-full text-lg font-bold bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none transition shadow-inner"
            />
          </div>

          {/* Quick Column & Urgent Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                Статус и колонка
              </label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value as ColumnId)}
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="urgent">🔥 Вверху (Срочно / Вне очереди)</option>
                <option value="fifo_queue">⏳ 1. В очереди (FIFO)</option>
                <option value="in_progress">🟢 2. Начал (В работе)</option>
                <option value="paused">🟡 3. Пауза (Отложено)</option>
                <option value="done">🔵 4. Сделано</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                Приоритет
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="urgent">🔥 Срочный</option>
                <option value="high">⚡ Высокий</option>
                <option value="medium">🔷 Средний</option>
                <option value="low">⚪ Низкий</option>
              </select>
            </div>

            {/* Toggle Urgent Pin */}
            <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Поднять на самый верх (минуя FIFO очередь)
              </span>
              <button
                type="button"
                onClick={() => setIsUrgentPinned(!isUrgentPinned)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  isUrgentPinned
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Flame className={`w-4 h-4 ${isUrgentPinned ? 'fill-slate-950' : ''}`} />
                {isUrgentPinned ? 'Вверху 🔥' : 'Поднять наверх'}
              </button>
            </div>

            {/* Pause Reason Field if Paused */}
            {columnId === 'paused' && (
              <div className="sm:col-span-2 space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                  Причина откладывания (Паузы)
                </label>
                <input
                  type="text"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  placeholder="Например: ожидание согласования / задержка материалов..."
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-amber-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          {/* Description textarea */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 block">
              Описание, замеры и требования
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Добавьте подробное описание задачи, размеры, спецификацию..."
              className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-200 focus:outline-none leading-relaxed transition resize-y"
            />
          </div>

          {/* Deadline & Smart Phone Alarm Settings */}
          <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 dark:from-slate-950/80 dark:to-indigo-950/20 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 space-y-3.5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                <AlarmClock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Будильник и напоминание по срокам
              </label>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleQuickDeadline('in15m')}
                  className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition"
                  title="Установить будильник через 15 минут"
                >
                  +15 мин
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDeadline('in30m')}
                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg shadow-sm transition"
                  title="Установить будильник через 30 минут"
                >
                  +30 мин ⏰
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDeadline('in1h')}
                  className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition"
                  title="Установить будильник через 1 час"
                >
                  +1 час
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDeadline('today')}
                  className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition"
                  title="Установить на сегодня 18:00"
                >
                  Сегодня 18:00
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDeadline('tomorrowMorning')}
                  className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition"
                  title="Установить на завтра 09:00"
                >
                  Завтра 09:00
                </button>
                {deadline && (
                  <button
                    type="button"
                    onClick={() => handleQuickDeadline('clear')}
                    className="px-2 py-1 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-700 dark:text-red-400 text-[11px] font-medium rounded-lg border border-red-200 dark:border-red-500/20 transition"
                  >
                    Сбросить
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <input
                type="datetime-local"
                value={formatForDateTimeInput(deadline)}
                onChange={(e) => {
                  setDeadline(parseDateTimeInput(e.target.value));
                  if (e.target.value) setReminderSet(true);
                }}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium transition shadow-inner"
              />

              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={reminderSet}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      setReminderSet(checked);
                      if (checked) {
                        unlockMobileAudio();
                        armBackgroundAlarmKeepAlive();
                        await requestNotificationPermission();
                      }
                    }}
                    className="w-4 h-4 rounded text-indigo-600 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-indigo-500"
                  />
                  <span>Включить звонок будильника ⏰</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    testAlarmSound(alarmSound);
                    requestNotificationPermission();
                  }}
                  className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-300 border border-amber-400/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                  title="Тест выбранного звука будильника и вибрации на телефоне"
                >
                  <BellRing className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Тест звука
                </button>
              </div>
            </div>

            {/* Sound Selection for this task */}
            {reminderSet && (
              <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-900/40">
                <SoundSelector
                  selectedSound={alarmSound}
                  onChange={(newSound) => setAlarmSound(newSound)}
                  label="Мелодия будильника для этой задачи"
                />
              </div>
            )}
          </div>

          {/* Media Attachments Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Вложения и Медиа ({attachments.length})
              </label>

              <div className="flex items-center gap-2 flex-wrap">
                <label className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition">
                  <ImageIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> Файл / Фото / Видео
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setShowImageInput(!showImageInput)}
                  className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Ссылка
                </button>

                <button
                  type="button"
                  onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow transition"
                >
                  <Mic className="w-3.5 h-3.5" /> Наговорить голосом
                </button>
              </div>
            </div>

            {/* URL Image Input Dropdown */}
            {showImageInput && (
              <div className="flex gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <input
                  type="text"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="Вставьте URL картинки (https://...)"
                  className="flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
                >
                  Добавить
                </button>
              </div>
            )}

            {/* Embedded Voice Recorder */}
            {showVoiceRecorder && (
              <VoiceRecorder
                onRecordComplete={handleVoiceRecordComplete}
                onCancel={() => setShowVoiceRecorder(false)}
              />
            )}

            {/* Attachments List / Grid with Drag & Drop */}
            <div
              onDragOver={handleFileDragOver}
              onDragLeave={handleFileDragLeave}
              onDrop={handleFileDrop}
              className={`rounded-2xl p-3.5 transition-all ${
                isDragOverFiles
                  ? 'border-2 border-dashed border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-4 ring-indigo-400/20'
                  : 'border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30'
              }`}
            >
              {isDragOverFiles && (
                <div className="text-center py-4 text-xs font-bold text-indigo-600 dark:text-indigo-400 animate-pulse">
                  📁 Отпустите файлы (фото / видео), чтобы прикрепить к задаче
                </div>
              )}

              {attachments.length === 0 && !isDragOverFiles ? (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Нет прикрепленных файлов или голосовых заметок.
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Перетащите файлы сюда (Drag & Drop) или используйте кнопки выше.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      onClick={() => setActiveMediaViewer(att)}
                      className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/60 rounded-xl overflow-hidden p-2.5 flex flex-col justify-between cursor-pointer transition shadow-sm"
                    >
                      {att.type === 'photo' && (
                        <div className="relative h-24 w-full bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden mb-2">
                          <img src={att.url} alt={att.fileName} className="w-full h-full object-cover" />
                          <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                            <ImageIcon className="w-3 h-3 text-sky-400" /> Фото
                          </span>
                        </div>
                      )}

                      {att.type === 'video' && (
                        <div className="relative h-24 w-full bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden mb-2 flex items-center justify-center">
                          <video src={att.url} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Play className="w-8 h-8 text-white fill-white" />
                          </div>
                        </div>
                      )}

                      {att.type === 'voice' && (
                        <div className="h-24 w-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 rounded-lg p-2.5 flex flex-col justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Mic className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-200 truncate">
                              {att.fileName}
                            </span>
                          </div>
                          {att.transcript && (
                            <p className="text-[10px] text-slate-700 dark:text-slate-300 line-clamp-2 italic">
                              "{att.transcript}"
                            </p>
                          )}
                          <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                            {att.durationSeconds ? `${att.durationSeconds} сек` : 'Запись'}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="truncate max-w-[120px] font-medium text-slate-800 dark:text-slate-300">
                          {att.fileName}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAttachment(att.id);
                          }}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Checklist Section */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Чек-лист и Подзадачи
              </label>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {checklist.filter((c) => c.completed).length} / {checklist.length}
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                placeholder="Добавить пункт чек-листа..."
                className="flex-1 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition"
              >
                <Plus className="w-4 h-4" /> Добавить
              </button>
            </div>

            <div className="space-y-1.5">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 p-2 rounded-lg text-xs"
                >
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleChecklist(item.id)}
                      className="w-4 h-4 rounded text-emerald-600 bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-emerald-500"
                    />
                    <span className={item.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}>
                      {item.text}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => deleteChecklistItem(item.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Activity History Log */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-sky-600 dark:text-sky-400" /> Журнал изменений
            </label>
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 max-h-32 overflow-y-auto space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              {task.historyLog.map((log) => (
                <div key={log.id} className="flex items-start justify-between border-b border-slate-200 dark:border-slate-900/80 pb-1">
                  <span>{log.action}</span>
                  <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">
                    {new Date(log.timestamp).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
          {showDeleteConfirm ? (
            <div className="w-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-500/50 p-3 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
              <span className="text-xs font-semibold text-red-700 dark:text-red-200 text-center sm:text-left">
                Удалить эту карточку безвозвратно?
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteTask(task.id);
                    onClose();
                  }}
                  className="flex-1 sm:flex-initial px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow transition text-center"
                >
                  Да, удалить
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition text-center"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full sm:w-auto px-3 py-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-xl border border-red-200 dark:border-red-500/30 flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 className="w-4 h-4" /> Удалить карточку
              </button>

              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition text-center"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveAll();
                    onClose();
                  }}
                  className="flex-1 sm:flex-initial px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition text-center"
                >
                  Сохранить
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Media Viewer Modal */}
      {activeMediaViewer && (
        <MediaViewerModal
          attachment={activeMediaViewer}
          onClose={() => setActiveMediaViewer(null)}
        />
      )}
    </motion.div>
  );
};
