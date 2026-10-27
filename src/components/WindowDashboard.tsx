import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Hourglass,
  ArrowUpRight,
  Flame,
  Zap,
  Info,
  LayoutList,
  Calendar,
  Table as TableIcon,
  Layers,
  Search,
  Folder,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ProjectWindow, TaskCard } from '../types';
import {
  computeWindowAnalytics,
} from '../utils/analytics';

interface WindowDashboardProps {
  windows?: ProjectWindow[];
  tasks: TaskCard[];
  onOpenDetailModal: (task: TaskCard) => void;
  onSelectWindow?: (windowId: string) => void;
  onSwitchToBoard?: () => void;
}

export const WindowDashboard: React.FC<WindowDashboardProps> = ({
  windows = [],
  tasks,
  onOpenDetailModal,
  onSelectWindow,
}) => {
  const [taskTimeViewMode, setTaskTimeViewMode] = useState<'cards' | 'table'>('cards');
  const [taskSearch, setTaskSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'fifo_queue' | 'paused' | 'done'>('all');

  // Compute overall analytics across all tasks without window filtering
  const analytics = useMemo(() => {
    return computeWindowAnalytics(tasks, 'all');
  }, [tasks]);

  // Window breakdown data
  const windowBreakdowns = useMemo(() => {
    return windows.map((win) => {
      const winTasks = tasks.filter((t) => t.windowId === win.id);
      const total = winTasks.length;
      const done = winTasks.filter((t) => t.columnId === 'done').length;
      const inProgress = winTasks.filter((t) => t.columnId === 'in_progress').length;
      const queue = winTasks.filter((t) => t.columnId === 'fifo_queue').length;
      const paused = winTasks.filter((t) => t.columnId === 'paused').length;
      const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

      return {
        ...win,
        total,
        done,
        inProgress,
        queue,
        paused,
        completionRate,
      };
    });
  }, [windows, tasks]);

  // Filtered task time metrics for the detail list
  const filteredTaskMetrics = useMemo(() => {
    return analytics.tasksTimeMetrics.filter((m) => {
      if (statusFilter !== 'all') {
        if (m.columnId !== statusFilter) return false;
      }
      if (taskSearch.trim()) {
        const q = taskSearch.toLowerCase();
        return (
          m.title.toLowerCase().includes(q) ||
          m.statusLabel.toLowerCase().includes(q) ||
          m.priorityLabel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [analytics.tasksTimeMetrics, statusFilter, taskSearch]);

  const getWindowName = (taskWindowId: string) => {
    const found = windows.find((w) => w.id === taskWindowId);
    return found ? found.name : 'Проект';
  };

  const getThemeColorClass = (colorTheme: string) => {
    switch (colorTheme) {
      case 'emerald':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/30';
      case 'amber':
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/30';
      case 'purple':
        return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/20 border-purple-300 dark:border-purple-500/30';
      case 'rose':
        return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500/30';
      case 'indigo':
        return 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/20 border-indigo-300 dark:border-indigo-500/30';
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/20 border-blue-300 dark:border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Sleek Unified Dashboard Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Сводная аналитика
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Охват: все окна проектов
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Единый дашборд выполнения задач
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Сквозной контроль продуктивности, темпа закрытия (Cycle Time) и соблюдения дисциплины FIFO.
          </p>
        </div>

        {/* Live Status Counter Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/70">
            <span className="text-slate-500 dark:text-slate-400">Окон: </span>
            <strong className="text-slate-900 dark:text-white font-bold">{windows.length}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/70">
            <span className="text-slate-500 dark:text-slate-400">Всего задач: </span>
            <strong className="text-slate-900 dark:text-white font-bold">{analytics.totalTasks}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-bold">
            Выполнено: {analytics.completedTasks}
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-bold">
            В потоке: {analytics.inProgressTasks + analytics.queueTasks}
          </div>
        </div>
      </div>

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Completion Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Общий процент выполнения
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {analytics.completionRate}%
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              ({analytics.completedTasks} из {analytics.totalTasks})
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${analytics.completionRate}%` }}
            />
          </div>
          <p className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>В работе: <strong>{analytics.inProgressTasks}</strong></span>
            <span>В очереди: <strong>{analytics.queueTasks}</strong></span>
          </p>
        </div>

        {/* Card 2: Cycle Time */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Ср. время выполнения (Cycle Time)
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {analytics.avgLeadTimeHours > 0 ? `${analytics.avgLeadTimeHours}ч` : '—'}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              на задачу
            </span>
          </div>
          <p className="mt-3 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            {analytics.completedTasks > 0 ? (
              <>Медианное время: <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">{analytics.medianTimeHours}ч</strong></>
            ) : (
              'Завершите задачу для расчёта средней скорости'
            )}
          </p>
        </div>

        {/* Card 3: FIFO Queue Flow */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Поток очереди FIFO
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {analytics.queueTasks + analytics.inProgressTasks}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
              В очереди и работе
            </span>
          </div>
          <p className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Срочных 🔥: <strong>{analytics.urgentTasks}</strong></span>
            <span>На паузе ⏸️: <strong>{analytics.pausedTasks}</strong></span>
          </p>
        </div>

        {/* Card 4: Speed Record & Blockers */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Быстрейшая задача
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            {analytics.fastestCompletedTask ? (
              <>
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={analytics.fastestCompletedTask.title}>
                  {analytics.fastestCompletedTask.title}
                </p>
                <p className="mt-1 text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {analytics.fastestCompletedTask.formattedDuration}
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-400 italic mt-2">Нет завершенных задач</p>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            {analytics.pausedTasks > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {analytics.pausedTasks} задач(и) на паузе
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                ✓ Нет заблокированных задач
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Window Breakdown Section (All Windows Visible Simultaneously) */}
      {windowBreakdowns.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                Прогресс по окнам проектов ({windowBreakdowns.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Сравнение прогресса и распределения нагрузки по всем рабочим пространствам без фильтрации.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {windowBreakdowns.map((wb) => (
              <div
                key={wb.id}
                className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between space-y-3 hover:border-indigo-400/50 transition group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        wb.colorTheme === 'emerald' ? 'bg-emerald-500' :
                        wb.colorTheme === 'amber' ? 'bg-amber-500' :
                        wb.colorTheme === 'purple' ? 'bg-purple-500' :
                        wb.colorTheme === 'rose' ? 'bg-rose-500' :
                        wb.colorTheme === 'indigo' ? 'bg-indigo-500' : 'bg-blue-500'
                      }`} />
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {wb.name}
                      </h4>
                    </div>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 shrink-0">
                      {wb.completionRate}%
                    </span>
                  </div>

                  {wb.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">
                      {wb.description}
                    </p>
                  )}

                  {/* Progress bar */}
                  <div className="mt-2.5 w-full bg-slate-200 dark:bg-slate-700/80 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${wb.completionRate}%` }}
                    />
                  </div>
                </div>

                {/* Badges & Go to window button */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <span>{wb.total} зад.</span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{wb.done} выполнено</span>
                  </div>

                  {onSelectWindow && (
                    <button
                      type="button"
                      onClick={() => onSelectWindow(wb.id)}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 group-hover:translate-x-0.5 transition"
                    >
                      К доске <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Time Detail Table & Bottlenecks Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Detailed Task List / Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Hourglass className="w-4 h-4 text-indigo-500" />
                Хронометраж задач
              </h4>
              <span className="text-xs text-slate-400 font-medium">({filteredTaskMetrics.length})</span>
            </div>

            {/* View Mode Toggle: Cards vs Table */}
            <div className="flex items-center self-start sm:self-auto bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setTaskTimeViewMode('cards')}
                className={`px-2.5 py-1 font-semibold rounded-lg transition flex items-center gap-1.5 ${
                  taskTimeViewMode === 'cards'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Отображать удобными карточками"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Карточки</span>
              </button>
              <button
                type="button"
                onClick={() => setTaskTimeViewMode('table')}
                className={`px-2.5 py-1 font-semibold rounded-lg transition flex items-center gap-1.5 ${
                  taskTimeViewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Отображать широкой таблицей"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Таблица</span>
              </button>
            </div>
          </div>

          {/* Search and Status Pills */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                placeholder="Поиск по задачам..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-3 py-1 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Все ({analytics.totalTasks})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('in_progress')}
                className={`px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap ${
                  statusFilter === 'in_progress'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                В работе ({analytics.inProgressTasks})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('fifo_queue')}
                className={`px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap ${
                  statusFilter === 'fifo_queue'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Очередь ({analytics.queueTasks})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('done')}
                className={`px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap ${
                  statusFilter === 'done'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Выполнено ({analytics.completedTasks})
              </button>
            </div>
          </div>

          {/* Cards View (default & best for mobile) */}
          {taskTimeViewMode === 'cards' ? (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredTaskMetrics.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Задачи по указанным параметрам не найдены.
                </div>
              ) : (
                filteredTaskMetrics.map((taskMetric) => {
                  const rawTask = tasks.find((t) => t.id === taskMetric.id);
                  const winName = rawTask ? getWindowName(rawTask.windowId) : 'Проект';

                  return (
                    <div
                      key={taskMetric.id}
                      onClick={() => rawTask && onOpenDetailModal(rawTask)}
                      className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-500/50 hover:bg-slate-100/90 dark:hover:bg-slate-800 transition cursor-pointer flex flex-col gap-2 shadow-xs group"
                    >
                      {/* Top: Window badge, Status & Priority */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/50 flex items-center gap-1">
                            <Folder className="w-3 h-3 text-indigo-500" />
                            {winName}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide"
                            style={{
                              backgroundColor: `${taskMetric.statusColor}22`,
                              color: taskMetric.statusColor,
                              border: `1px solid ${taskMetric.statusColor}40`,
                            }}
                          >
                            {taskMetric.statusLabel}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {taskMetric.priorityLabel}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (rawTask) onOpenDetailModal(rawTask);
                          }}
                          className="p-1 rounded-lg text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                          title="Открыть задачу"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Middle: Title */}
                      <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2">
                        {taskMetric.title}
                      </div>

                      {/* Bottom: Creation date and prominent time counter */}
                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/50 text-[11px]">
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(taskMetric.createdAt).toLocaleDateString('ru-RU')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/30 font-mono font-bold text-xs shadow-xs">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>{taskMetric.formattedDuration}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Table View with guaranteed non-wrapping columns */
            <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs min-w-[620px]">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 backdrop-blur text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700 z-10">
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap">Окно</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Задача</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Статус</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Приоритет</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Затраченное время</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTaskMetrics.map((taskMetric) => {
                    const rawTask = tasks.find((t) => t.id === taskMetric.id);
                    const winName = rawTask ? getWindowName(rawTask.windowId) : 'Проект';

                    return (
                      <tr
                        key={taskMetric.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                        onClick={() => rawTask && onOpenDetailModal(rawTask)}
                      >
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {winName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 max-w-[200px]">
                          <div className="font-semibold text-slate-900 dark:text-white truncate">
                            {taskMetric.title}
                          </div>
                          <div className="text-[10px] text-slate-400 whitespace-nowrap">
                            Создана: {new Date(taskMetric.createdAt).toLocaleDateString('ru-RU')}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold"
                            style={{
                              backgroundColor: `${taskMetric.statusColor}20`,
                              color: taskMetric.statusColor,
                            }}
                          >
                            {taskMetric.statusLabel}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            {taskMetric.priorityLabel}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {taskMetric.formattedDuration}
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (rawTask) onOpenDetailModal(rawTask);
                            }}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-lg transition"
                            title="Открыть карточку"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bottlenecks & Recommendations */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Анализ задержек и узких мест
              </h4>
            </div>

            {analytics.bottlenecks.length === 0 ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Узких мест не обнаружено!
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                  Все задачи продвигаются по очереди FIFO без длительных простоев и блокировок.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {analytics.bottlenecks.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-bold text-amber-900 dark:text-amber-300">
                      <span>⏸️ {b.reason}</span>
                      <span className="bg-amber-200 dark:bg-amber-500/30 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded text-[10px]">
                        {b.count} зад.
                      </span>
                    </div>
                    <ul className="text-[11px] text-amber-800 dark:text-amber-400/90 list-disc list-inside space-y-0.5">
                      {b.taskTitles.map((title, tIdx) => (
                        <li key={tIdx} className="truncate">{title}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl">
            <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <span>
              По правилу FIFO задачи, снятые с паузы, возвращаются в очередь с сохранением первоначального приоритета.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
