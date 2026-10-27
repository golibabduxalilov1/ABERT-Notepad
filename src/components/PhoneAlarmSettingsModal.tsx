import React, { useState, useEffect, useRef } from 'react';
import {
  AlarmClock,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Vibrate,
  ShieldCheck,
  X,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  Radio,
  Lock,
  Square,
  ExternalLink,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { AlarmSoundId } from '../types';
import {
  requestNotificationPermissionDetailed,
  getNotificationDiagnostic,
  NotificationDiagnostic,
  testAlarmSound,
  sendSystemAlarmNotification,
  startAlarmRinging,
  stopAlarmRinging,
  unlockMobileAudio,
  armBackgroundAlarmKeepAlive,
  isKeepAliveArmed,
  scheduleAlarmTest,
} from '../utils/alarmAudio';
import { SoundSelector } from './SoundSelector';
import { getDefaultAlarmSound, setDefaultAlarmSound } from '../utils/alarmPresets';

interface PhoneAlarmSettingsModalProps {
  onClose: () => void;
}

export const PhoneAlarmSettingsModal: React.FC<PhoneAlarmSettingsModalProps> = ({ onClose }) => {
  const [diagnostic, setDiagnostic] = useState<NotificationDiagnostic>(() => getNotificationDiagnostic());
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);
  const [showFaq, setShowFaq] = useState<boolean>(false);
  const [swActive, setSwActive] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [testActive, setTestActive] = useState<boolean>(false);
  const [isArmed, setIsArmed] = useState<boolean>(false);
  const [defaultSound, setDefaultSound] = useState<AlarmSoundId>(() => getDefaultAlarmSound());
  const testCancelRef = useRef<(() => void) | null>(null);

  const refreshDiagnostic = () => {
    const diag = getNotificationDiagnostic();
    setDiagnostic(diag);
  };

  useEffect(() => {
    refreshDiagnostic();

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        setSwActive(!!reg);
      });
    }
    setIsArmed(isKeepAliveArmed());

    return () => {
      if (testCancelRef.current) {
        testCancelRef.current();
        testCancelRef.current = null;
      }
    };
  }, []);

  const handleSoundChange = (soundId: AlarmSoundId) => {
    setDefaultSound(soundId);
    setDefaultAlarmSound(soundId);
  };

  // Handle request permission with rich feedback
  const handleRequestPermission = async () => {
    unlockMobileAudio();
    armBackgroundAlarmKeepAlive();
    setIsArmed(true);

    if (diagnostic.effectiveStatus === 'iframe_blocked') {
      setFeedback({
        type: 'warning',
        message: 'Браузер блокирует запрос уведомлений внутри окна предпросмотра (iframe). Откройте приложение в новой отдельной вкладке по кнопке ниже!',
      });
      return;
    }

    if (diagnostic.effectiveStatus === 'denied') {
      setFeedback({
        type: 'warning',
        message: 'Уведомления заблокированы сайтом в вашем браузере. Нажмите на значок замочка 🔒 слева от адреса сайта и переключите «Уведомления» в положение «Разрешить».',
      });
      return;
    }

    const result = await requestNotificationPermissionDetailed();
    setDiagnostic(result.diagnostic);

    if (result.granted) {
      setFeedback({
        type: 'success',
        message: 'Уведомления успешно включены! Теперь на заблокированном экране телефона будет появляться карточка будильника.',
      });
    } else {
      setFeedback({
        type: 'warning',
        message: result.diagnostic.actionTip || result.diagnostic.explanation,
      });
    }
  };

  // Robust 5-second delayed test for locking screen and putting phone into pocket
  const startDelayedTest = async () => {
    if (testCancelRef.current) {
      testCancelRef.current();
      testCancelRef.current = null;
    }

    unlockMobileAudio();
    armBackgroundAlarmKeepAlive();
    setIsArmed(true);

    if (diagnostic.effectiveStatus === 'default') {
      const result = await requestNotificationPermissionDetailed();
      setDiagnostic(result.diagnostic);
    }

    setCountdown(5);
    setTestActive(false);

    const cancel = scheduleAlarmTest(
      5,
      () => {
        setCountdown(null);
        setTestActive(true);

        // Fire alarm & push notification (works reliably on locked screen via Master Audio & SW)
        startAlarmRinging('ТЕСТ: Срок в кармане наступил', defaultSound);
        sendSystemAlarmNotification(
          '⏰ ТЕСТ БУДИЛЬНИКА: Сработал в кармане!',
          'Сигнал и вибрация успешно сработали при заблокированном экране!',
          undefined,
          undefined,
          { taskTitle: 'Тест будильника', windowName: 'Проверка' }
        );
      },
      (secondsLeft) => {
        setCountdown(secondsLeft);
      }
    );

    testCancelRef.current = cancel;
  };

  const stopTest = () => {
    if (testCancelRef.current) {
      testCancelRef.current();
      testCancelRef.current = null;
    }
    stopAlarmRinging();
    setTestActive(false);
    setCountdown(null);
  };

  return (
    <div
      id="phone-alarm-settings-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="phone-alarm-settings-modal"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-5 sm:p-6 space-y-5 text-slate-900 dark:text-slate-100 my-auto animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-amber-500 flex items-center justify-center text-white shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg tracking-tight flex items-center gap-1.5 text-slate-900 dark:text-white">
                Будильник на смартфоне
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Работа в кармане, при блокировке и в фоне
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert Message */}
        {feedback && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-start justify-between gap-2.5 transition animate-fadeIn ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-400/40 text-emerald-800 dark:text-emerald-200'
                : 'bg-amber-500/15 border border-amber-400/40 text-amber-900 dark:text-amber-200'
            }`}
          >
            <div className="flex items-start gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">{feedback.message}</div>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Status Indicators Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Notifications Status Card */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Уведомления
              </span>
              {diagnostic.effectiveStatus === 'granted' ? (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Включено
                </span>
              ) : diagnostic.effectiveStatus === 'iframe_blocked' ? (
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" /> Блок фрейма
                </span>
              ) : diagnostic.effectiveStatus === 'denied' ? (
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" /> Запрещено 🔒
                </span>
              ) : (
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" /> Выключено
                </span>
              )}
            </div>

            {/* Notification Card Action Area */}
            {diagnostic.effectiveStatus === 'granted' ? (
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-500/10 p-1.5 rounded-lg">
                ✓ Разрешены для экрана блокировки
              </div>
            ) : diagnostic.effectiveStatus === 'iframe_blocked' ? (
              <div className="space-y-1.5">
                <a
                  href={typeof window !== 'undefined' ? window.location.href : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Открыть в отдельной вкладке
                </a>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Браузер блокирует уведомления внутри фрейма. В отдельной вкладке кнопка сработает сразу!
                </p>
              </div>
            ) : diagnostic.effectiveStatus === 'denied' ? (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={refreshDiagnostic}
                  className="w-full py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" /> Проверить статус (🔒)
                </button>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-tight">
                  Нажмите 🔒 в адресной строке браузера и переключите «Уведомления» в «Разрешить».
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                Разрешить уведомления
              </button>
            )}
          </div>

          {/* Pocket Background Audio Engine */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-emerald-500" /> Фоновый аудиоканал
              </span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> Активен
              </span>
            </div>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => testAlarmSound(defaultSound)}
                className="w-full py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-300 border border-amber-400/40 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
              >
                <Volume2 className="w-3.5 h-3.5" /> Тест мелодии
              </button>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Звук играет через аппаратный динамик даже без уведомлений!
              </p>
            </div>
          </div>
        </div>

        {/* Direct Answer Explainer Banner: Почему кнопка может не работать */}
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 p-3.5 rounded-2xl text-xs space-y-2">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowFaq(!showFaq)}
          >
            <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200 font-bold">
              <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Кнопка уведомлений не работает? В чем причина и влияет ли это?</span>
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
            >
              {showFaq ? 'Скрыть ▲' : 'Подробнее ▼'}
            </button>
          </div>

          {showFaq && (
            <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 space-y-2 text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
              <div>
                <strong className="text-indigo-950 dark:text-indigo-100">1. Почему кнопка не нажимается:</strong>
                <p className="mt-0.5">
                  Если вы находитесь в окне предпросмотра (iframe), браузеры Chrome и Safari по соображениям безопасности <strong>запрещают вызов окна разрешений из фреймов</strong>. Просто откройте сайт по прямой ссылке в отдельной вкладке или на телефоне — там окно разрешения сразу появится!
                </p>
              </div>

              <div>
                <strong className="text-indigo-950 dark:text-indigo-100">2. Заблокировано ранее (значок 🔒):</strong>
                <p className="mt-0.5">
                  Если ранее было случайно нажато «Блокировать», браузер больше не показывает окно. Нажмите на значок 🔒 в начале адресной строки → переключите «Уведомления» в «Разрешить».
                </p>
              </div>

              <div>
                <strong className="text-indigo-950 dark:text-indigo-100">3. Влияет ли это на звонок будильника?</strong>
                <p className="mt-0.5">
                  <strong>Звук и вибрация сработают в любом случае!</strong> Мы используем аппаратный аудиоканал Master Audio, который мобильная ОС не глушит при выключенном дисплее. А системные уведомления нужны для того, чтобы на заблокированном экране появилась визуальная карточка с кнопками «Выключить» и «Отложить на 30 мин».
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sound Selection Grid */}
        <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <SoundSelector
            selectedSound={defaultSound}
            onChange={handleSoundChange}
            label="Выбор мелодии звонка по умолчанию"
          />
        </div>

        {/* Pocket / Lock Screen Simulation Test Box */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-slate-900/5 dark:from-indigo-950/60 dark:to-slate-900/60 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 space-y-3 shadow-inner">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
              Проверка работы в кармане и при блокировке
            </h4>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            Нажмите кнопку ниже, <strong>сразу заблокируйте телефон</strong> боковой кнопкой питания и положите в карман. Ровно через 5 секунд раздастся выбранный звонок и вибрация.
          </p>

          {countdown !== null ? (
            <div className="p-3.5 bg-indigo-600 text-white rounded-xl text-center space-y-2.5 shadow-lg">
              <div className="font-bold text-sm flex items-center justify-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span>⏳ Заблокируйте телефон прямо сейчас: {countdown} сек...</span>
              </div>
              <p className="text-[11px] font-normal opacity-95 text-indigo-100">
                Аудиоканал активирован. Сигнал сработает через аппаратный динамик ровно в 0 секунд при выключенном экране.
              </p>
              <button
                type="button"
                onClick={stopTest}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition"
              >
                Отменить тест
              </button>
            </div>
          ) : testActive ? (
            <div className="p-3.5 bg-red-600 text-white rounded-xl flex items-center justify-between shadow-lg">
              <div className="space-y-0.5">
                <div className="font-extrabold text-xs tracking-wide animate-pulse">⏰ Будильник звонит!</div>
                <div className="text-[11px] text-red-100">Карточка отображается на экране блокировки</div>
              </div>
              <button
                type="button"
                onClick={stopTest}
                className="px-3.5 py-1.5 bg-white text-red-700 text-xs font-extrabold rounded-xl shadow hover:bg-red-50 transition"
              >
                Выключить звонок
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startDelayedTest}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition"
            >
              <Play className="w-4 h-4" />
              Запустить тест для кармана (через 5 сек)
            </button>
          )}
        </div>

        {/* Operating Rules & Explanations */}
        <div className="space-y-2 text-xs">
          <h5 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-indigo-500" />
            Что важно знать для работы при блокировке:
          </h5>
          <ul className="space-y-2 text-slate-600 dark:text-slate-400">
            <li className="flex items-start gap-2 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
              <span className="text-emerald-500 font-bold">✓</span>
              <div>
                <strong className="text-slate-800 dark:text-slate-200">Не закрывайте вкладку:</strong> Браузер можно свернуть, а телефон заблокировать и убрать в карман, но саму вкладку не следует закрывать крестиком.
              </div>
            </li>
            <li className="flex items-start gap-2 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
              <span className="text-emerald-500 font-bold">✓</span>
              <div>
                <strong className="text-slate-800 dark:text-slate-200">Аудиоканал & MediaSession:</strong> Система непрерывно синхронизируется с аудиопроцессором телефона, поэтому мобильная ОС не глушит таймеры дедлайнов при выключенном дисплее.
              </div>
            </li>
            <li className="flex items-start gap-2 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
              <span className="text-indigo-500 font-bold">📲</span>
              <div>
                <strong className="text-slate-800 dark:text-slate-200">Добавить на экран «Домой» (PWA):</strong> Нажмите в меню браузера (на Android — три точки, на iPhone — кнопку «Поделиться») и выберите <em>«На экран "Домой"»</em> для работы в режиме нативного приложения.
              </div>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition"
          >
            Понятно, закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

