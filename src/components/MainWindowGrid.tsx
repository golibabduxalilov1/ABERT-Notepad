import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Folder,
  Plus,
  Play,
  Clock,
  CheckCircle2,
  Flame,
  Search,
  ArrowRight,
  Star,
  Trash2,
  Layers,
  PauseCircle,
  X,
  BarChart3,
} from 'lucide-react';
import { ProjectWindow, TaskCard } from '../types';
import { WindowDashboard } from './WindowDashboard';

interface MainWindowGridProps {
  windows: ProjectWindow[];
  tasks: TaskCard[];
  onOpenWindow: (windowId: string) => void;
  onNewWindowClick: () => void;
  onDeleteWindow: (windowId: string) => void;
  onOpenDetailModal?: (task: TaskCard) => void;
}

export const MainWindowGrid: React.FC<MainWindowGridProps> = ({
  windows,
  tasks,
  onOpenWindow,
  onNewWindowClick,
  onDeleteWindow,
  onOpenDetailModal,
}) => {
  const [mainTab, setMainTab] = useState<'windows' | 'dashboard'>('windows');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingWindowId, setDeletingWindowId] = useState<string | null>(null);

  const windowToDelete = windows.find((w) => w.id === deletingWindowId);

  const filteredWindows = windows.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.description && w.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getThemeGradient = (colorTheme: string) => {
    switch (colorTheme) {
      case 'emerald':
        return 'from-emerald-500/10 dark:from-emerald-900/40 via-white dark:via-slate-900 to-white dark:to-slate-900 border-emerald-300 dark:border-emerald-500/40 hover:border-emerald-500';
      case 'amber':
        return 'from-amber-500/10 dark:from-amber-900/40 via-white dark:via-slate-900 to-white dark:to-slate-900 border-amber-300 dark:border-amber-500/40 hover:border-amber-500';
      case 'purple':
        return 'from-purple-500/10 dark:from-purple-900/40 via-white dark:via-slate-900 to-white dark:to-slate-900 border-purple-300 dark:border-purple-500/40 hover:border-purple-500';
      case 'rose':
        return 'from-rose-500/10 dark:from-rose-900/40 via-white dark:via-slate-900 to-white dark:to-slate-900 border-rose-300 dark:border-rose-500/40 hover:border-rose-500';
      case 'indigo':
        return 'from-indigo-500/10 dark:from-indigo-900/40 via-white dark:via-slate-900 to-white dark:to-slate-900 border-indigo-300 dark:border-indigo-500/40 hover:border-indigo-500';
      default:
        return 'from-blue-500/10 dark:from-blue-900/40 via-white dark:via-slate-900 to-white dark:to-slate-900 border-blue-300 dark:border-blue-500/40 hover:border-blue-500';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Switcher Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-sm">
        {/* Tabs: Окна проектов vs Дашборд & Графики */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 w-full md:w-auto">
          <button
            id="main-tab-windows"
            type="button"
            onClick={() => setMainTab('windows')}
            className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              mainTab === 'windows'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Окна проектов ({windows.length})</span>
          </button>

          <button
            id="main-tab-dashboard"
            type="button"
            onClick={() => setMainTab('dashboard')}
            className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              mainTab === 'dashboard'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            <span>Дашборд & Графики</span>
          </button>
        </div>

        {/* Right side controls dependent on tab */}
        {mainTab === 'windows' ? (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по окнам..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-xs transition"
              />
            </div>

            <button
              type="button"
              onClick={onNewWindowClick}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95"
            >
              <Plus className="w-4 h-4" /> Создать окно
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Сводка по всем проектам • {windows.length} окон • {tasks.length} задач</span>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {mainTab === 'dashboard' ? (
        <WindowDashboard
          windows={windows}
          tasks={tasks}
          onOpenDetailModal={onOpenDetailModal || (() => {})}
          onSelectWindow={onOpenWindow}
          onSwitchToBoard={() => setMainTab('windows')}
        />
      ) : (
        /* Grid of Named Windows */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <AnimatePresence mode="popLayout">
          {filteredWindows.map((win) => {
            const winTasks = tasks.filter((t) => t.windowId === win.id);
            const urgentCount = winTasks.filter((t) => t.isUrgentPinned && t.columnId !== 'done').length;
            const fifoCount = winTasks.filter((t) => t.columnId === 'fifo_queue' && !t.isUrgentPinned).length;
            const inProgressTasks = winTasks.filter((t) => t.columnId === 'in_progress');
            const pausedCount = winTasks.filter((t) => t.columnId === 'paused').length;
            const doneCount = winTasks.filter((t) => t.columnId === 'done').length;

            return (
              <motion.div
                key={win.id}
                layout
                initial={{ opacity: 0, scale: 0.94, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -15, transition: { duration: 0.18 } }}
                transition={{
                  type: 'spring',
                  stiffness: 350,
                  damping: 25,
                }}
                whileHover={{ y: -3, transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.985 }}
                onClick={() => onOpenWindow(win.id)}
                className={`group relative bg-gradient-to-b ${getThemeGradient(
                  win.colorTheme
                )} border rounded-2xl p-5 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between space-y-4`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition shrink-0">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition truncate">
                        [Окно: {win.name}]
                      </h3>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        Всего задач: {winTasks.length}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingWindowId(win.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                    title="Удалить окно"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {win.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {win.description}
                  </p>
                )}

                {/* Completion Progress Bar */}
                {winTasks.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Прогресс выполнения:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {Math.round((doneCount / winTasks.length) * 100)}% ({doneCount}/{winTasks.length})
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((doneCount / winTasks.length) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Active in-progress task banner preview */}
                {inProgressTasks.length > 0 && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 p-2.5 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-emerald-600 dark:fill-emerald-400 shrink-0" />
                      <span className="font-semibold truncate">
                        {inProgressTasks[0].title}
                      </span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded shrink-0">
                      В работе
                    </span>
                  </div>
                )}

                {/* Columns Counter Grid */}
                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                  <div className="bg-slate-50 dark:bg-slate-950/70 p-2 rounded-xl text-center border border-slate-200 dark:border-slate-800/80">
                    <div className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">{urgentCount}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">🔥 Вверху</div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/70 p-2 rounded-xl text-center border border-slate-200 dark:border-slate-800/80">
                    <div className="font-mono font-bold text-sky-600 dark:text-sky-400 text-sm">{fifoCount}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">⏳ FIFO</div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/70 p-2 rounded-xl text-center border border-slate-200 dark:border-slate-800/80">
                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">{inProgressTasks.length}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">🟢 Начал</div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/70 p-2 rounded-xl text-center border border-slate-200 dark:border-slate-800/80">
                    <div className="font-mono font-bold text-slate-600 dark:text-slate-400 text-sm">{doneCount}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">🔵 Сделано</div>
                  </div>
                </div>

                {/* Footer Open Button */}
                <div className="flex items-center justify-between pt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                  <span>Открыть задачи пространства</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Create New Window Card */}
        <motion.div
          layout
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          whileTap={{ scale: 0.985 }}
          onClick={onNewWindowClick}
          className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-500/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3 cursor-pointer group transition bg-white/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900/80 min-h-[220px] shadow-sm"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-white">
              Создать Именное Окно
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
              Добавьте новое пространство для конкретного человека, объекта или проекта
            </p>
          </div>
        </motion.div>
      </div>
      )}

      {/* Delete Window Confirmation Modal with AnimatePresence */}
      <AnimatePresence>
        {windowToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-red-500/40 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-slate-900 dark:text-slate-100"
            >
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <div className="p-2.5 bg-red-100 dark:bg-red-500/20 rounded-xl border border-red-200 dark:border-red-500/30">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Удалить рабочее окно?</h3>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Вы уверены, что хотите удалить окно <strong className="text-slate-900 dark:text-white">"[Окно: {windowToDelete.name}]"</strong> и все связанные с ним задачи?
                Это действие нельзя будет отменить.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeletingWindowId(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteWindow(windowToDelete.id);
                    setDeletingWindowId(null);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Удалить окно
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
