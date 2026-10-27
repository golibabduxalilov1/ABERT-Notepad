import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, FolderPlus, Palette } from 'lucide-react';
import { ProjectWindow } from '../types';

interface CreateWindowModalProps {
  onClose: () => void;
  onCreateWindow: (newWindow: ProjectWindow) => void;
}

const COLOR_THEMES = [
  { id: 'blue', name: 'Синий', bg: 'bg-blue-600', border: 'border-blue-500' },
  { id: 'emerald', name: 'Изумрудный', bg: 'bg-emerald-600', border: 'border-emerald-500' },
  { id: 'amber', name: 'Янтарный', bg: 'bg-amber-600', border: 'border-amber-500' },
  { id: 'purple', name: 'Фиолетовый', bg: 'bg-purple-600', border: 'border-purple-500' },
  { id: 'rose', name: 'Розовый', bg: 'bg-rose-600', border: 'border-rose-500' },
  { id: 'indigo', name: 'Индиго', bg: 'bg-indigo-600', border: 'border-indigo-500' },
];

export const CreateWindowModal: React.FC<CreateWindowModalProps> = ({
  onClose,
  onCreateWindow,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('blue');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newWindow: ProjectWindow = {
      id: `win-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      colorTheme: selectedTheme,
      createdAt: new Date().toISOString(),
      isFavorite: false,
    };

    onCreateWindow(newWindow);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl text-slate-900 dark:text-slate-100"
      >
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-base flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <FolderPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Создать Именное Окно
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1 block">
              Наименование окна / проекта <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: [Окно: Клиент Анна], [Окно: Автосервис]..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none transition"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1 block">
              Описание пространства
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткие цели, контактные лица или описание проекта..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none transition resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Цветовая тема карточки
            </label>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition ${
                    selectedTheme === theme.id
                      ? `${theme.bg} text-white border-white shadow-lg`
                      : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${theme.bg}`} />
                  {theme.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
            >
              Создать Окно
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
