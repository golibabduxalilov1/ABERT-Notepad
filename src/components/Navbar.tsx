import React, { useState } from 'react';
import {
  Layers,
  Bell,
  Folder,
  X,
  Sun,
  Moon,
  AlarmClock,
  ArrowLeft,
} from 'lucide-react';
import { ProjectWindow, SystemNotification } from '../types';

interface NavbarProps {
  windows: ProjectWindow[];
  activeWindowId: string | null;
  onSelectWindow: (windowId: string | null) => void;
  notifications: SystemNotification[];
  onMarkNotificationRead: (id: string) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onOpenPhoneAlarmSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  windows,
  activeWindowId,
  onSelectWindow,
  notifications,
  onMarkNotificationRead,
  theme = 'light',
  onToggleTheme,
  onOpenPhoneAlarmSettings,
}) => {
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const activeWindow = windows.find((w) => w.id === activeWindowId);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 px-3 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] sm:px-4 shadow-sm transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* If inside a project window: show "Назад" button + window title */}
        {activeWindowId ? (
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              id="navbar-back-button"
              type="button"
              onClick={() => onSelectWindow(null)}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-sm transition-all active:scale-95 shrink-0"
              title="Вернуться в Главное окно"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Назад</span>
            </button>

            {activeWindow && (
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <Folder className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                <span className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate">
                  [{activeWindow.name}]
                </span>
              </div>
            )}
          </div>
        ) : (
          /* App Logo & Breadcrumb for Main Window */
          <div className="flex items-center gap-3">
            <div
              onClick={() => onSelectWindow(null)}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow group-hover:scale-105 transition">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  FIFO <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs">Мульти-Окна</span>
                </h1>
              </div>
            </div>

            {/* Window Switcher Breadcrumb Selector */}
            <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => onSelectWindow(null)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  activeWindowId === null
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                Главное окно
              </button>

              {windows.map((win) => (
                <button
                  key={win.id}
                  type="button"
                  onClick={() => onSelectWindow(win.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    activeWindowId === win.id
                      ? 'bg-indigo-600 text-white shadow ring-1 ring-indigo-400/50'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  [{win.name}]
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile Phone Alarm Button */}
          {onOpenPhoneAlarmSettings && (
            <button
              type="button"
              onClick={onOpenPhoneAlarmSettings}
              className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500/15 to-indigo-500/15 hover:from-amber-500/25 hover:to-indigo-500/25 text-indigo-900 dark:text-indigo-200 rounded-xl border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1.5 text-xs font-bold shadow-sm"
              title="Настройка будильника и выбор мелодии (в кармане и при блокировке)"
            >
              <AlarmClock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">Будильник и звуки</span>
            </button>
          )}

          {/* Theme Switcher Toggle Button */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-800 transition flex items-center gap-1.5 text-xs font-semibold"
              title={theme === 'light' ? 'Переключить на тёмную тему' : 'Переключить на светлую тему'}
            >
              {theme === 'light' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="hidden xs:inline text-slate-700 font-bold text-xs">Светлая</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-400 fill-indigo-400" />
                  <span className="hidden xs:inline text-slate-300 font-bold text-xs">Тёмная</span>
                </>
              )}
            </button>
          )}

          {/* Notifications button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              className="relative p-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-800 transition"
              title="Напоминания и уведомления"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce shadow">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotificationsDropdown && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-xs sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl p-3 z-50 space-y-2 animate-fadeIn text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">Напоминания и сирена</h4>
                  <button
                    type="button"
                    onClick={() => setShowNotificationsDropdown(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-slate-500 italic text-center py-4">
                      Нет новых напоминаний
                    </p>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => onMarkNotificationRead(notif.id)}
                        className={`p-2.5 rounded-xl border transition cursor-pointer ${
                          notif.read
                            ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-850 opacity-60 text-slate-600 dark:text-slate-400'
                            : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-500/40 text-slate-900 dark:text-slate-100 font-medium'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-indigo-700 dark:text-indigo-300">{notif.title}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(notif.createdAt).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 dark:text-slate-300">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
    {/* Spacer to prevent content from jumping under fixed header */}
    <div className="h-14 sm:h-16 shrink-0 pointer-events-none" aria-hidden="true" />
  </>
  );
};
