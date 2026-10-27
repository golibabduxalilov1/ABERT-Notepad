import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Send,
  HelpCircle,
  Terminal,
  Sparkles,
  Volume2,
  X,
  Play,
  Flame,
  PlusCircle,
  FolderPlus
} from 'lucide-react';
import { parseSystemCommand, ParsedCommandResult } from '../utils/fifo';

interface CommandBarProps {
  onExecuteCommand: (result: ParsedCommandResult) => void;
}

export const CommandBar: React.FC<CommandBarProps> = ({ onExecuteCommand }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [lastCommandFeedback, setLastCommandFeedback] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'ru-RU';

      recognition.onresult = (event: any) => {
        const text = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setInput(text);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceListen = () => {
    if (!recognitionRef.current) {
      alert('Голосовой ввод не поддерживается вашим браузером.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch {
        // ignore double start
      }
    }
  };

  const handleSend = (textToSend = input) => {
    if (!textToSend.trim()) return;
    const result = parseSystemCommand(textToSend);
    onExecuteCommand(result);

    // Feedback message
    if (result.type === 'CREATE_WINDOW') {
      setLastCommandFeedback(`Создано окно: "${result.windowName}"`);
    } else if (result.type === 'OPEN_WINDOW') {
      setLastCommandFeedback(`Открыто окно: "${result.windowName}"`);
    } else if (result.type === 'ADD_TASK') {
      setLastCommandFeedback(`Добавлена задача: "${result.taskTitle}"`);
    } else if (result.type === 'PIN_TOP') {
      setLastCommandFeedback(`Поднята на самый верх: "${result.taskTitle}" 🔥`);
    } else if (result.type === 'OPEN_CARD') {
      setLastCommandFeedback(`Открыта карточка: "${result.taskTitle}"`);
    } else if (result.type === 'START_TASK') {
      setLastCommandFeedback(`Переведено в работу: "${result.taskTitle}" 🟢`);
    } else if (result.type === 'PAUSE_TASK') {
      setLastCommandFeedback(`Поставлено на паузу: "${result.taskTitle}" 🟡`);
    } else if (result.type === 'DONE_TASK') {
      setLastCommandFeedback(`Завершено: "${result.taskTitle}" 🔵`);
    } else if (result.type === 'NEXT_FIFO') {
      setLastCommandFeedback(`Переключена следующая задача по FIFO ⏳`);
    } else {
      setLastCommandFeedback(`Команда не распознана. Попробуйте 'Создай окно [Имя]' или 'Добавь задачу [Имя]'`);
    }

    setInput('');
    setTimeout(() => setLastCommandFeedback(null), 5000);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto space-y-2">
      {/* Command input box */}
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 focus-within:border-indigo-500 dark:focus-within:border-indigo-500/80 rounded-2xl shadow-md dark:shadow-xl p-1.5 flex items-center gap-2 transition">
        <div className="pl-3 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Sparkles className="w-5 h-5 animate-pulse" />
          <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            ИИ-Ассистент
          </span>
        </div>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Жду указаний... Напишите или скажите голосом: «Создай окно Цех», «Открой окно Иван»..."
          className="flex-1 bg-transparent border-none text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none px-2 py-1.5"
        />

        {/* Voice mic button */}
        <button
          type="button"
          onClick={toggleVoiceListen}
          className={`p-2.5 rounded-xl transition flex items-center justify-center ${
            isListening
              ? 'bg-red-600 text-white animate-pulse ring-4 ring-red-500/30'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
          title={isListening ? 'Идет прослушивание...' : 'Голосовой ввод команды'}
        >
          <Mic className="w-4 h-4" />
        </button>

        {/* Send button */}
        <button
          type="button"
          onClick={() => handleSend()}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition flex items-center justify-center"
          title="Выполнить команду"
        >
          <Send className="w-4 h-4" />
        </button>

        {/* Help button */}
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition"
          title="Справка по командам"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Feedback banner */}
      {lastCommandFeedback && (
        <div className="bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-xs px-3 py-1.5 rounded-xl flex items-center justify-between shadow animate-fadeIn">
          <span className="font-semibold">{lastCommandFeedback}</span>
          <button
            type="button"
            onClick={() => setLastCommandFeedback(null)}
            className="text-indigo-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick chip shortcuts */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
        <span className="text-slate-600 dark:text-slate-500 font-medium whitespace-nowrap">Быстрые команды:</span>
        <button
          type="button"
          onClick={() => handleSend('Создай окно Мастерская')}
          className="px-2.5 py-1 bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg whitespace-nowrap border border-slate-200 dark:border-slate-700/60 flex items-center gap-1 transition shadow-sm"
        >
          <FolderPlus className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> +Окно Мастерская
        </button>
        <button
          type="button"
          onClick={() => handleSend('Открой окно Клиент Иван')}
          className="px-2.5 py-1 bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg whitespace-nowrap border border-slate-200 dark:border-slate-700/60 transition shadow-sm"
        >
          Открыть «Клиент Иван»
        </button>
        <button
          type="button"
          onClick={() => handleSend('Следующая задача')}
          className="px-2.5 py-1 bg-sky-50 dark:bg-sky-950/80 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-800 dark:text-sky-300 rounded-lg whitespace-nowrap border border-sky-200 dark:border-sky-500/30 flex items-center gap-1 transition shadow-sm"
        >
          <Play className="w-3 h-3 text-sky-600 dark:text-sky-400" /> Взять следующую по FIFO
        </button>
        <button
          type="button"
          onClick={() => handleSend('Подними наверх Замер дверного проема')}
          className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/80 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 rounded-lg whitespace-nowrap border border-amber-200 dark:border-amber-500/30 flex items-center gap-1 transition shadow-sm"
        >
          <Flame className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Поднять наверх
        </button>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Справка по командам системы
              </h3>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 max-h-[60vh] overflow-y-auto pr-1">
              <p className="text-slate-400">
                Вы можете вводить команды текстом или надиктовывать их голосом с помощью кнопки микрофона:
              </p>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <p className="font-bold text-indigo-400">1. Управление Окнами (Пространствами):</p>
                <ul className="list-disc list-inside space-y-1 font-mono text-slate-200">
                  <li>«Создай окно [Наименование]»</li>
                  <li>«Открой окно [Наименование]»</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <p className="font-bold text-sky-400">2. Добавление и навигация по задачам:</p>
                <ul className="list-disc list-inside space-y-1 font-mono text-slate-200">
                  <li>«Добавь задачу [Наименование]»</li>
                  <li>«Открой карточку [Наименование]»</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <p className="font-bold text-emerald-400">3. Очередь FIFO и Статусы:</p>
                <ul className="list-disc list-inside space-y-1 font-mono text-slate-200">
                  <li>«Подними наверх [Наименование]» — карточка переместится в 🔥 Вверху</li>
                  <li>«Начни [Наименование]» — переведет в 🟢 Начал (В работе)</li>
                  <li>«Поставь на паузу [Наименование] [Причина]» — переведет в 🟡 Паузу</li>
                  <li>«Заверши [Наименование]» — переведет в 🔵 Сделано</li>
                  <li>«Следующая задача» — берет очередную карточку из FIFO</li>
                </ul>
              </div>
            </div>

            <div className="text-right border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
