export type ColumnId = 'urgent' | 'fifo_queue' | 'in_progress' | 'paused' | 'done';

export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

export interface MediaAttachment {
  id: string;
  type: 'photo' | 'video' | 'voice';
  url: string; // Base64 or Blob URL or object URL
  fileName: string;
  fileSize?: number;
  durationSeconds?: number;
  transcript?: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  action: string;
}

export type AlarmSoundId =
  | 'siren'
  | 'digital'
  | 'marimba'
  | 'chime'
  | 'military'
  | 'retro'
  | 'pulse'
  | 'gentle';

export interface TaskCard {
  id: string;
  windowId: string;
  title: string;
  description: string;
  columnId: ColumnId;
  priority: PriorityLevel;
  fifoOrder: number; // Order index or timestamp for FIFO sorting
  isUrgentPinned: boolean; // Moves card to 🔥 Вверху
  pauseReason?: string;
  deadline?: string; // ISO String or YYYY-MM-DDTHH:mm
  reminderSet?: boolean;
  alarmSound?: AlarmSoundId;
  attachments: MediaAttachment[];
  checklist: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  historyLog: HistoryEntry[];
}

export interface ProjectWindow {
  id: string;
  name: string;
  description?: string;
  colorTheme: string; // 'emerald' | 'amber' | 'blue' | 'purple' | 'rose' | 'indigo'
  createdAt: string;
  isFavorite?: boolean;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  windowId: string;
  taskId?: string;
  type: 'info' | 'warning' | 'fifo_alert' | 'deadline';
  createdAt: string;
  read: boolean;
}
