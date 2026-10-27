import { AlarmSoundId } from '../types';

export interface SoundOption {
  id: AlarmSoundId;
  name: string;
  category: 'loud' | 'melodic' | 'classic' | 'gentle';
  description: string;
  iconName: string;
  badge?: string;
}

export const ALARM_SOUND_OPTIONS: SoundOption[] = [
  {
    id: 'siren',
    name: 'Громкая сирена (SOS)',
    category: 'loud',
    description: 'Пронзительный мультичастотный сигнал с гармониками — гарантированно разбудит даже в кармане',
    iconName: 'Volume2',
    badge: 'По умолчанию',
  },
  {
    id: 'digital',
    name: 'Электронный писк (Beep-Beep)',
    category: 'classic',
    description: 'Классический двойной стаккато-писк цифровых кварцевых часов Casio / Монтана',
    iconName: 'Clock',
  },
  {
    id: 'marimba',
    name: 'Маримба (Apple-стиль)',
    category: 'melodic',
    description: 'Бодрая звонкая маримба с переливом нот и теплым деревянным резонансом',
    iconName: 'Music',
    badge: 'Хит',
  },
  {
    id: 'chime',
    name: 'Колокольчики (Chimes)',
    category: 'melodic',
    description: 'Чистый кристаллический перезвон колоколов с мягким затуханием',
    iconName: 'Bell',
  },
  {
    id: 'military',
    name: 'Армейский горн (Реveille)',
    category: 'loud',
    description: 'Бодрящий сигнальный призыв к подъему и действию (аккорды до-ми-соль)',
    iconName: 'Flame',
  },
  {
    id: 'retro',
    name: 'Ретро-будильник (Звонок-колотушка)',
    category: 'classic',
    description: 'Имитация металлического механического колокола старого советского будильника',
    iconName: 'AlarmClock',
  },
  {
    id: 'pulse',
    name: 'Пульсирующий радар (Sonar)',
    category: 'loud',
    description: 'Ритмичные нарастающие гидролокационные импульсы с басовым панчем',
    iconName: 'Radio',
  },
  {
    id: 'gentle',
    name: 'Мягкое утро (Ambient)',
    category: 'gentle',
    description: 'Плавный синусоидальный аккорд без резких ударов, приятный для спокойного пробуждения',
    iconName: 'Sparkles',
  },
];

const DEFAULT_SOUND_KEY = 'fifo_default_alarm_sound';

export function getDefaultAlarmSound(): AlarmSoundId {
  if (typeof window === 'undefined') return 'siren';
  const saved = localStorage.getItem(DEFAULT_SOUND_KEY) as AlarmSoundId | null;
  if (saved && ALARM_SOUND_OPTIONS.some((s) => s.id === saved)) {
    return saved;
  }
  return 'siren';
}

export function setDefaultAlarmSound(soundId: AlarmSoundId): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEFAULT_SOUND_KEY, soundId);
}
