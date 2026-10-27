import React, { useState } from 'react';
import {
  Volume2,
  Play,
  Square,
  Check,
  Music,
  Clock,
  Bell,
  Flame,
  AlarmClock,
  Radio,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { AlarmSoundId } from '../types';
import { ALARM_SOUND_OPTIONS, SoundOption } from '../utils/alarmPresets';
import { testAlarmSound, stopAlarmRinging, isAlarmPlaying } from '../utils/alarmAudio';

interface SoundSelectorProps {
  selectedSound: AlarmSoundId;
  onChange: (soundId: AlarmSoundId) => void;
  label?: string;
  compact?: boolean;
}

export const SoundSelector: React.FC<SoundSelectorProps> = ({
  selectedSound,
  onChange,
  label = 'Звук и мелодия будильника',
  compact = false,
}) => {
  const [previewingId, setPreviewingId] = useState<AlarmSoundId | null>(null);
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);

  const handlePreview = (e: React.MouseEvent, soundId: AlarmSoundId) => {
    e.stopPropagation();
    if (previewingId === soundId && isAlarmPlaying()) {
      stopAlarmRinging();
      setPreviewingId(null);
    } else {
      stopAlarmRinging();
      setPreviewingId(soundId);
      testAlarmSound(soundId, 4500);
      setTimeout(() => {
        setPreviewingId((curr) => (curr === soundId ? null : curr));
      }, 4500);
    }
  };

  const handleSelect = (soundId: AlarmSoundId) => {
    onChange(soundId);
    setIsOpenDropdown(false);
  };

  const currentOption =
    ALARM_SOUND_OPTIONS.find((s) => s.id === selectedSound) || ALARM_SOUND_OPTIONS[0];

  const renderIcon = (iconName: string, className = 'w-4 h-4') => {
    switch (iconName) {
      case 'Volume2':
        return <Volume2 className={className} />;
      case 'Clock':
        return <Clock className={className} />;
      case 'Music':
        return <Music className={className} />;
      case 'Bell':
        return <Bell className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      case 'AlarmClock':
        return <AlarmClock className={className} />;
      case 'Radio':
        return <Radio className={className} />;
      case 'Sparkles':
      default:
        return <Sparkles className={className} />;
    }
  };

  if (compact) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpenDropdown(!isOpenDropdown)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 transition shadow-sm"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              {renderIcon(currentOption.iconName, 'w-3.5 h-3.5')}
            </span>
            <span className="truncate">{currentOption.name}</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        {isOpenDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 space-y-1 max-h-60 overflow-y-auto">
            {ALARM_SOUND_OPTIONS.map((opt) => {
              const isSelected = opt.id === selectedSound;
              const isPlaying = previewingId === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  className={`flex items-center justify-between gap-2 p-2 rounded-xl cursor-pointer text-xs transition ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    <span className="shrink-0 text-indigo-500">{renderIcon(opt.iconName, 'w-3.5 h-3.5')}</span>
                    <span className="truncate">{opt.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handlePreview(e, opt.id)}
                      className={`p-1 rounded-lg transition ${
                        isPlaying
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900'
                      }`}
                      title={isPlaying ? 'Остановить' : 'Прослушать'}
                    >
                      {isPlaying ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </button>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          {label}
        </label>
        <span className="text-[11px] text-slate-400">8 мелодий на выбор</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ALARM_SOUND_OPTIONS.map((sound: SoundOption) => {
          const isSelected = sound.id === selectedSound;
          const isPlaying = previewingId === sound.id;

          return (
            <div
              key={sound.id}
              onClick={() => handleSelect(sound.id)}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 relative select-none ${
                isSelected
                  ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-sm ring-1 ring-indigo-500/30'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={`p-2 rounded-xl shrink-0 mt-0.5 transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {renderIcon(sound.iconName, 'w-4 h-4')}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-xs font-bold leading-tight ${
                        isSelected
                          ? 'text-indigo-950 dark:text-indigo-200'
                          : 'text-slate-900 dark:text-slate-200'
                      }`}
                    >
                      {sound.name}
                    </span>
                    {sound.badge && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-amber-500 text-white rounded-full leading-relaxed">
                        {sound.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {sound.description}
                  </p>
                </div>
              </div>

              {/* Action Controls: Preview & Radio selection */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handlePreview(e, sound.id)}
                  className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                    isPlaying
                      ? 'bg-red-600 text-white shadow animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                  title={isPlaying ? 'Остановить' : 'Прослушать мелодию'}
                >
                  {isPlaying ? (
                    <Square className="w-3.5 h-3.5 fill-white" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                </button>

                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-300 dark:border-slate-700 bg-transparent'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
