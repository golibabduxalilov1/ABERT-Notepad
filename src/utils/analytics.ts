import { TaskCard, PriorityLevel, ColumnId } from '../types';

export interface TaskTimeMetric {
  id: string;
  title: string;
  shortTitle: string;
  priority: PriorityLevel;
  priorityLabel: string;
  columnId: ColumnId;
  statusLabel: string;
  statusColor: string;
  isCompleted: boolean;
  totalDurationMs: number;
  durationMinutes: number;
  durationHours: number;
  durationDays: number;
  activeDurationMinutes: number;
  formattedDuration: string;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
  pauseReason?: string;
}

export interface PriorityMetric {
  priority: PriorityLevel;
  name: string;
  total: number;
  completed: number;
  completionRate: number;
  avgHours: number;
  color: string;
}

export interface StatusDistribution {
  name: string;
  columnId: ColumnId;
  count: number;
  percentage: number;
  color: string;
}

export interface DailyActivityPoint {
  date: string;
  displayDate: string;
  created: number;
  completed: number;
  cumulativeCompleted: number;
  totalCumulative: number;
  completionRate: number;
}

export interface PausedBottleneck {
  reason: string;
  count: number;
  taskTitles: string[];
}

export interface WindowAnalyticsData {
  windowId: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  queueTasks: number;
  pausedTasks: number;
  urgentTasks: number;
  completionRate: number;
  avgLeadTimeHours: number;
  avgActiveTimeHours: number;
  medianTimeHours: number;
  fastestCompletedTask: TaskTimeMetric | null;
  longestCompletedTask: TaskTimeMetric | null;
  tasksTimeMetrics: TaskTimeMetric[];
  priorityMetrics: PriorityMetric[];
  statusDistribution: StatusDistribution[];
  dailyTimeline: DailyActivityPoint[];
  bottlenecks: PausedBottleneck[];
}

const PRIORITY_META: Record<PriorityLevel, { name: string; color: string }> = {
  urgent: { name: 'Срочный', color: '#ef4444' },
  high: { name: 'Высокий', color: '#f59e0b' },
  medium: { name: 'Средний', color: '#6366f1' },
  low: { name: 'Низкий', color: '#10b981' },
};

const STATUS_META: Record<ColumnId, { name: string; color: string }> = {
  urgent: { name: '🔥 Срочно вверху', color: '#ef4444' },
  fifo_queue: { name: '📋 Очередь FIFO', color: '#6366f1' },
  in_progress: { name: '🟢 В работе', color: '#10b981' },
  paused: { name: '⏸️ Пауза', color: '#f59e0b' },
  done: { name: '🔵 Выполнено', color: '#3b82f6' },
};

export function formatDuration(ms: number): string {
  if (ms <= 0 || isNaN(ms)) return '0 мин';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}д ${remainingHours}ч` : `${days} дн`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}ч ${remainingMinutes}м` : `${hours} час`;
  }
  return `${Math.max(1, minutes)} мин`;
}

export function computeTaskTimeMetric(task: TaskCard): TaskTimeMetric {
  const createdTime = new Date(task.createdAt).getTime();
  const now = Date.now();
  let endTime = now;

  if (task.columnId === 'done') {
    if (task.completedAt) {
      endTime = new Date(task.completedAt).getTime();
    } else {
      endTime = new Date(task.updatedAt).getTime();
    }
  }

  // Ensure positive duration
  const totalDurationMs = Math.max(60000, endTime - createdTime);
  const durationMinutes = Math.round((totalDurationMs / (1000 * 60)) * 10) / 10;
  const durationHours = Math.round((totalDurationMs / (1000 * 60 * 60)) * 10) / 10;
  const durationDays = Math.round((totalDurationMs / (1000 * 60 * 60 * 24)) * 10) / 10;

  // Active time estimate from history or status
  let activeDurationMinutes = durationMinutes;
  if (task.columnId === 'paused') {
    activeDurationMinutes = Math.round(durationMinutes * 0.3 * 10) / 10;
  } else if (task.columnId === 'fifo_queue') {
    activeDurationMinutes = 0;
  }

  const shortTitle =
    task.title.length > 26 ? `${task.title.slice(0, 24)}...` : task.title;

  return {
    id: task.id,
    title: task.title,
    shortTitle,
    priority: task.priority,
    priorityLabel: PRIORITY_META[task.priority]?.name || task.priority,
    columnId: task.columnId,
    statusLabel: STATUS_META[task.columnId]?.name || task.columnId,
    statusColor: STATUS_META[task.columnId]?.color || '#64748b',
    isCompleted: task.columnId === 'done',
    totalDurationMs,
    durationMinutes,
    durationHours,
    durationDays,
    activeDurationMinutes,
    formattedDuration: formatDuration(totalDurationMs),
    createdAt: task.createdAt,
    completedAt: task.completedAt,
    updatedAt: task.updatedAt,
    pauseReason: task.pauseReason,
  };
}

export function computeWindowAnalytics(
  tasks: TaskCard[],
  windowId: string
): WindowAnalyticsData {
  const windowTasks = (!windowId || windowId === 'all') ? tasks : tasks.filter((t) => t.windowId === windowId);
  const totalTasks = windowTasks.length;

  const completedTasksList = windowTasks.filter((t) => t.columnId === 'done');
  const completedTasks = completedTasksList.length;
  const inProgressTasks = windowTasks.filter((t) => t.columnId === 'in_progress').length;
  const queueTasks = windowTasks.filter((t) => t.columnId === 'fifo_queue').length;
  const pausedTasks = windowTasks.filter((t) => t.columnId === 'paused').length;
  const urgentTasks = windowTasks.filter((t) => t.isUrgentPinned || t.columnId === 'urgent').length;

  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Individual task time metrics
  const tasksTimeMetrics = windowTasks.map(computeTaskTimeMetric);

  // Completed metrics for lead times
  const completedMetrics = tasksTimeMetrics.filter((t) => t.isCompleted);

  let avgLeadTimeHours = 0;
  let avgActiveTimeHours = 0;
  let medianTimeHours = 0;
  let fastestCompletedTask: TaskTimeMetric | null = null;
  let longestCompletedTask: TaskTimeMetric | null = null;

  if (completedMetrics.length > 0) {
    const totalHours = completedMetrics.reduce((acc, curr) => acc + curr.durationHours, 0);
    avgLeadTimeHours = Math.round((totalHours / completedMetrics.length) * 10) / 10;

    const totalActiveMins = completedMetrics.reduce((acc, curr) => acc + curr.activeDurationMinutes, 0);
    avgActiveTimeHours = Math.round((totalActiveMins / (60 * completedMetrics.length)) * 10) / 10;

    const sortedByDuration = [...completedMetrics].sort(
      (a, b) => a.totalDurationMs - b.totalDurationMs
    );
    fastestCompletedTask = sortedByDuration[0];
    longestCompletedTask = sortedByDuration[sortedByDuration.length - 1];

    const mid = Math.floor(sortedByDuration.length / 2);
    medianTimeHours =
      sortedByDuration.length % 2 !== 0
        ? sortedByDuration[mid].durationHours
        : Math.round(((sortedByDuration[mid - 1].durationHours + sortedByDuration[mid].durationHours) / 2) * 10) / 10;
  }

  // Priority Breakdown
  const priorities: PriorityLevel[] = ['urgent', 'high', 'medium', 'low'];
  const priorityMetrics: PriorityMetric[] = priorities.map((p) => {
    const pTasks = windowTasks.filter((t) => t.priority === p);
    const pDone = pTasks.filter((t) => t.columnId === 'done');
    const pRate = pTasks.length > 0 ? Math.round((pDone.length / pTasks.length) * 100) : 0;
    const pDoneMetrics = pDone.map(computeTaskTimeMetric);
    const pAvg =
      pDoneMetrics.length > 0
        ? Math.round((pDoneMetrics.reduce((a, c) => a + c.durationHours, 0) / pDoneMetrics.length) * 10) / 10
        : 0;

    return {
      priority: p,
      name: PRIORITY_META[p].name,
      total: pTasks.length,
      completed: pDone.length,
      completionRate: pRate,
      avgHours: pAvg,
      color: PRIORITY_META[p].color,
    };
  });

  // Status Distribution
  const columns: ColumnId[] = ['done', 'in_progress', 'fifo_queue', 'paused'];
  const statusDistribution: StatusDistribution[] = columns
    .map((col) => {
      const count = windowTasks.filter((t) => t.columnId === col).length;
      return {
        name: STATUS_META[col].name,
        columnId: col,
        count,
        percentage: totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0,
        color: STATUS_META[col].color,
      };
    })
    .filter((s) => s.count > 0 || totalTasks === 0);

  // Daily Timeline Activity (Cumulative creation vs completion)
  const dateMap = new Map<string, { created: number; completed: number }>();

  // Collect last 7 days or days spanning tasks
  const daysToShow = 7;
  const today = new Date();
  for (let i = daysToShow - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dateMap.set(key, { created: 0, completed: 0 });
  }

  windowTasks.forEach((t) => {
    const createdKey = t.createdAt.slice(0, 10);
    if (dateMap.has(createdKey)) {
      dateMap.get(createdKey)!.created += 1;
    } else {
      dateMap.set(createdKey, { created: 1, completed: 0 });
    }

    if (t.columnId === 'done' && t.completedAt) {
      const completedKey = t.completedAt.slice(0, 10);
      if (dateMap.has(completedKey)) {
        dateMap.get(completedKey)!.completed += 1;
      } else {
        dateMap.set(completedKey, { created: 0, completed: 1 });
      }
    }
  });

  // Sort dates
  const sortedDates = Array.from(dateMap.keys()).sort();
  let cumCreated = 0;
  let cumCompleted = 0;

  const dailyTimeline: DailyActivityPoint[] = sortedDates.map((dateKey) => {
    const data = dateMap.get(dateKey)!;
    cumCreated += data.created;
    cumCompleted += data.completed;

    const [yyyy, mm, dd] = dateKey.split('-');
    const displayDate = `${dd}.${mm}`;

    return {
      date: dateKey,
      displayDate,
      created: data.created,
      completed: data.completed,
      cumulativeCompleted: cumCompleted,
      totalCumulative: cumCreated,
      completionRate: cumCreated > 0 ? Math.round((cumCompleted / cumCreated) * 100) : 0,
    };
  });

  // Bottlenecks from paused tasks
  const pauseReasonMap = new Map<string, string[]>();
  windowTasks
    .filter((t) => t.columnId === 'paused' && t.pauseReason)
    .forEach((t) => {
      const reason = t.pauseReason || 'Причина не указана';
      if (!pauseReasonMap.has(reason)) {
        pauseReasonMap.set(reason, []);
      }
      pauseReasonMap.get(reason)!.push(t.title);
    });

  const bottlenecks: PausedBottleneck[] = Array.from(pauseReasonMap.entries()).map(
    ([reason, taskTitles]) => ({
      reason,
      count: taskTitles.length,
      taskTitles,
    })
  );

  return {
    windowId,
    totalTasks,
    completedTasks,
    inProgressTasks,
    queueTasks,
    pausedTasks,
    urgentTasks,
    completionRate,
    avgLeadTimeHours,
    avgActiveTimeHours,
    medianTimeHours,
    fastestCompletedTask,
    longestCompletedTask,
    tasksTimeMetrics,
    priorityMetrics,
    statusDistribution,
    dailyTimeline,
    bottlenecks,
  };
}
