/**
/**
 * Advanced Alarm Sound, Vibration & Background Mobile Notification Engine
 * Engineered for reliable mobile alerting (Screen Locked, In Pocket, Standby & Background tabs)
 */

import { AlarmSoundId } from '../types';
import { getAlarmSoundWavUri } from './alarmSynthesizer';
import { getDefaultAlarmSound } from './alarmPresets';
import {
  isNativeApp,
  initNativeAlarms,
  getNativePermission,
  requestNativePermission,
  syncNativeAlarms,
  showNativeAlarmNow,
} from './nativeAlarms';

let alarmAudioCtx: AudioContext | null = null;
let alarmIntervalId: ReturnType<typeof setInterval> | null = null;
let vibrationIntervalId: ReturnType<typeof setInterval> | null = null;
let isAlarmCurrentlyPlaying = false;
let currentPlayingSoundId: AlarmSoundId = 'siren';
let swRegistration: ServiceWorkerRegistration | null = null;
let wakeLockSentinel: unknown = null;
let backgroundWorker: Worker | null = null;

// Hardware Web Audio Thread Clock (immune to lock-screen timer freezing)
let scriptProcessorNode: ScriptProcessorNode | null = null;
let subCarrierOscillator: OscillatorNode | null = null;
let subCarrierGain: GainNode | null = null;

// Unified Master Audio Element for Seamless Lock-Screen & Pocket Playback
let masterAudio: HTMLAudioElement | null = null;
let currentAudioMode: 'idle' | 'standby' | 'ringing' = 'idle';
let isAudioGloballyUnlocked = false;
let isStoppingAlarm = false;

const ALARM_AUDIO_URL = '/alarm.wav';
const SILENT_AUDIO_URL = '/silent.wav';

// Event Listeners for External State Synchronization
type SimpleCallback = () => void;
type SnoozeCallback = (minutes: number) => void;
const alarmStopListeners: Set<SimpleCallback> = new Set();
const alarmSnoozeListeners: Set<SnoozeCallback> = new Set();
const masterClockListeners: Set<SimpleCallback> = new Set();

let lastTickTimestamp = 0;

// Cached synthetic audio Data URIs
let cachedAlarmWavUri: string | null = null;
let cachedSubCarrierWavUri: string | null = null;

/**
 * Generate a loud, piercing, multi-frequency alarm siren WAV data URI in pure JavaScript.
 * This guarantees offline loud audio playback without external network requests,
 * and plays reliably through HTML5 <audio> even when AudioContext is throttled.
 */
function generateAlarmWavUri(): string {
  const sampleRate = 22050;
  const duration = 1.2; // 1.2s repeating siren phrase
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // 16 bits
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, numSamples * 2, true);

  // Synthesize 4 loud, rhythmic piercing alarm beeps with overtone harmonics
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    const inBeep1 = t >= 0.02 && t < 0.22;
    const inBeep2 = t >= 0.28 && t < 0.48;
    const inBeep3 = t >= 0.54 && t < 0.74;
    const inBeep4 = t >= 0.80 && t < 1.12;

    if (inBeep1) {
      sample = Math.sin(2 * Math.PI * 880 * t) * 0.7 + Math.sin(2 * Math.PI * 1760 * t) * 0.25;
    } else if (inBeep2) {
      sample = Math.sin(2 * Math.PI * 1174.66 * t) * 0.75 + Math.sin(2 * Math.PI * 2349 * t) * 0.25;
    } else if (inBeep3) {
      sample = Math.sin(2 * Math.PI * 880 * t) * 0.7 + Math.sin(2 * Math.PI * 1760 * t) * 0.25;
    } else if (inBeep4) {
      sample = Math.sin(2 * Math.PI * 1318.51 * t) * 0.8 + Math.sin(2 * Math.PI * 2637 * t) * 0.3;
    }

    // Fast soft-clipping for maximum perceived loudness without distortion
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

/**
 * Generate a continuous sub-carrier WAV data URI (28Hz low-frequency wave).
 * Smartphone speakers physically cannot reproduce 28Hz (below their ~150Hz hardware cutoff),
 * making this virtually inaudible to human ears.
 * However, to iOS (CoreAudio) and Android (AudioTrack), it is an active non-zero PCM audio stream
 * with full 16-bit dynamic range, which:
 * 1. Bypasses iOS silence-detection auto-pause algorithms.
 * 2. Prevents the mobile browser from freezing JavaScript timers when the screen is locked.
 * 3. Triggers continuous `timeupdate` events that drive our alarm checks on the lock screen!
 */
function generateSubCarrierWavUri(): string {
  const sampleRate = 22050;
  const duration = 4.0; // 4s seamless carrier loop
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + numSamples * 2, true);
  view.setUint32(8, 0x57415645, false);
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // 28Hz sub-bass sine wave with slight amplitude envelope
    const sample = Math.sin(2 * Math.PI * 28 * t) * 0.25;
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

function getAlarmWavUri(): string {
  if (!cachedAlarmWavUri) {
    cachedAlarmWavUri = generateAlarmWavUri();
  }
  return cachedAlarmWavUri;
}

function getSubCarrierWavUri(): string {
  if (!cachedSubCarrierWavUri) {
    cachedSubCarrierWavUri = generateSubCarrierWavUri();
  }
  return cachedSubCarrierWavUri;
}

/**
 * Initializes and gets the singleton Master HTML5 Audio element.
 * By keeping a SINGLE continuous audio element, mobile browsers permit
 * seamless track changing from inaudible standby to full-blast siren
 * while the phone screen is locked without throwing Autoplay Policy errors!
 */
function getMasterAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;

  if (!masterAudio) {
    try {
      masterAudio = new Audio();
      masterAudio.src = ALARM_AUDIO_URL;
      masterAudio.loop = true;
      masterAudio.preload = 'auto';
      // iOS Safari specific attributes to ensure background playback
      (masterAudio as unknown as { playsInline?: boolean }).playsInline = true;
      (masterAudio as unknown as { webkitPlaysInline?: boolean }).webkitPlaysInline = true;

      // CRITICAL: The hardware audio decoding clock drives timeupdate even when screen is locked!
      masterAudio.addEventListener('timeupdate', () => {
        dispatchClockTick();
      });

      // Handle pause by user or system
      masterAudio.addEventListener('pause', () => {
        if (currentAudioMode === 'ringing' && !isStoppingAlarm) {
          // If paused by lock-screen button or headphone controls
          stopAlarmRinging();
        }
      });

      // Fallback if static file can't be loaded
      masterAudio.addEventListener('error', () => {
        if (masterAudio && !masterAudio.src.startsWith('data:')) {
          masterAudio.src = getAlarmWavUri();
        }
      });
    } catch (err) {
      console.warn('Failed to initialize master audio element:', err);
    }
  }

  return masterAudio;
}

/**
 * Central clock dispatcher: Ensures all task deadline checks and countdowns
 * run reliably in real-time (~every 800-1000ms), driven by the audio hardware clock.
 */
function dispatchClockTick() {
  const now = Date.now();
  // Throttle to at most once every 750ms to save CPU
  if (now - lastTickTimestamp < 750) return;
  lastTickTimestamp = now;

  masterClockListeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error('Error in master clock listener:', err);
    }
  });
}

/**
 * Register a listener that fires on every master clock tick (even on lock screen!)
 */
export function registerMasterClockListener(callback: SimpleCallback): () => void {
  masterClockListeners.add(callback);
  return () => {
    masterClockListeners.delete(callback);
  };
}

/**
 * Register a listener for when alarm is stopped (e.g. from lock-screen MediaSession or SW notification)
 */
export function registerAlarmStopListener(callback: SimpleCallback): () => void {
  alarmStopListeners.add(callback);
  return () => {
    alarmStopListeners.delete(callback);
  };
}

/**
 * Register a listener for when alarm is snoozed from lock-screen
 */
export function registerAlarmSnoozeListener(callback: SnoozeCallback): () => void {
  alarmSnoozeListeners.add(callback);
  return () => {
    alarmSnoozeListeners.delete(callback);
  };
}

/**
 * Initializes and registers the Service Worker for lock-screen & pocket push alarms
 */
export async function initServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  // In the Android app alarms go through native notifications instead of the SW
  if (isNativeApp()) {
    await initNativeAlarms();
    return null;
  }

  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = reg;
    return reg;
  } catch (err) {
    console.warn('Service Worker registration failed or running in unsupported context:', err);
    return null;
  }
}

/**
 * Audio Context helper with automatic resume on user gestures
 */
export function getAudioContext(): AudioContext | null {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!alarmAudioCtx || alarmAudioCtx.state === 'closed') {
      alarmAudioCtx = new AudioContextClass();
    }
    if (alarmAudioCtx.state === 'suspended') {
      alarmAudioCtx.resume().catch(() => {});
    }
    return alarmAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Realtime Audio Engine Clock:
 * Runs on the native hardware audio rendering thread via ScriptProcessorNode.
 * Because the hardware audio DAC requires continuous PCM audio blocks to avoid buffer underruns,
 * the mobile operating system (iOS CoreAudio and Android AudioTrack) CANNOT freeze this thread,
 * even when the display is locked or the phone is in the pocket!
 */
export function startAudioEngineClock() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (!scriptProcessorNode) {
      // 4096 samples at 44.1kHz = ~92ms rendering slice
      scriptProcessorNode = ctx.createScriptProcessor(4096, 1, 1);
      scriptProcessorNode.onaudioprocess = () => {
        dispatchClockTick();
      };

      // 28Hz sub-carrier sine wave (completely below speaker physical limits, non-audible)
      subCarrierOscillator = ctx.createOscillator();
      subCarrierOscillator.type = 'sine';
      subCarrierOscillator.frequency.setValueAtTime(28, ctx.currentTime);

      subCarrierGain = ctx.createGain();
      subCarrierGain.gain.setValueAtTime(0.001, ctx.currentTime);

      subCarrierOscillator.connect(subCarrierGain);
      subCarrierGain.connect(scriptProcessorNode);
      scriptProcessorNode.connect(ctx.destination);
      subCarrierOscillator.start();
    }
  } catch (err) {
    console.warn('Audio engine clock setup error:', err);
  }
}

/**
 * Unlocks the mobile audio pipeline on user touch/click.
 * Primes both the Web Audio API and Master HTML5 <audio> element so the mobile OS
 * permits background sound and lock-screen alerts.
 */
export function unlockMobileAudio() {
  isAudioGloballyUnlocked = true;

  // 1. Unlock Web Audio Context & start hardware audio engine clock
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  startAudioEngineClock();

  // 2. Prime Master Audio element with inaudible sub-carrier
  const audio = getMasterAudio();
  if (audio && currentAudioMode === 'idle') {
    try {
      const carrierUri = getSubCarrierWavUri();
      if (!audio.src || audio.src !== carrierUri) {
        audio.src = carrierUri;
      }
      audio.volume = 0.15;
      audio.load();
    } catch {
      // Ignore
    }
  }
}

export function isAudioUnlocked(): boolean {
  return isAudioGloballyUnlocked;
}

/**
 * Sets up the MediaSession API on the lock screen.
 * This instructs the mobile OS that the web page is an active media player,
 * which displays the lock-screen player card and prevents tab freezing.
 */
function updateLockScreenMediaSession(mode: 'standby' | 'ringing', taskTitle?: string) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }

  try {
    if (mode === 'ringing') {
      const titleText = taskTitle ? `⏰ БУДИЛЬНИК: ${taskTitle}` : '⏰ Будильник: Срок задачи наступил!';
      navigator.mediaSession.metadata = new MediaMetadata({
        title: titleText,
        artist: 'TaskFlow FIFO',
        album: 'Срок наступил! Нажмите «Пауза» для выключения',
        artwork: [
          { src: '/icon.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      });
      navigator.mediaSession.playbackState = 'playing';

      // Lock-screen action handlers
      navigator.mediaSession.setActionHandler('pause', () => {
        stopAlarmRinging();
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        stopAlarmRinging();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        // Snooze for 30 minutes
        stopAlarmRinging();
        alarmSnoozeListeners.forEach((cb) => cb(30));
      });
    } else if (mode === 'standby') {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'TaskFlow FIFO • Фоновый монитор',
        artist: 'Контроль дедлайнов в кармане активен',
        album: 'Будильник сработает вовремя при блокировке',
        artwork: [
          { src: '/icon.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      });
      navigator.mediaSession.playbackState = 'playing';

      navigator.mediaSession.setActionHandler('pause', () => {
        // Keep standby alive
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        // Safe no-op
      });
    }
  } catch (err) {
    console.warn('Failed to update MediaSession metadata:', err);
  }
}

/**
 * Arms the background keep-alive audio loop.
 * Plays the continuous sub-carrier wave and marks mediaSession as 'playing'.
 * Keeps mobile browser tabs alive and timers firing when screen is locked / in pocket.
 */
export function armBackgroundAlarmKeepAlive() {
  if (typeof window === 'undefined') return;

  unlockMobileAudio();
  startAudioEngineClock();

  const audio = getMasterAudio();
  if (!audio) return;

  if (currentAudioMode === 'ringing') {
    // Alarm is already ringing, do not downgrade to standby
    return;
  }

  try {
    currentAudioMode = 'standby';
    // Use the 28Hz sub-carrier wave: completely silent to human ears on phone speakers,
    // but full 16-bit PCM dynamic range to Android and iOS audio daemons
    const carrierUri = getSubCarrierWavUri();
    if (!audio.src || audio.src !== carrierUri) {
      audio.src = carrierUri;
    }
    audio.loop = true;
    audio.volume = 0.15;
    audio.muted = false;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          updateLockScreenMediaSession('standby');
        })
        .catch(() => {
          // Will be auto-resumed on next user gesture
        });
    }
  } catch {
    // Ignore
  }
}

export function isKeepAliveArmed(): boolean {
  return currentAudioMode === 'standby' || currentAudioMode === 'ringing';
}

/**
 * Request Screen Wake Lock so display doesn't sleep during an active alarm
 */
export async function requestWakeLock() {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      const nav = navigator as unknown as {
        wakeLock: { request: (type: string) => Promise<unknown> };
      };
      wakeLockSentinel = await nav.wakeLock.request('screen');
    } catch {
      // Ignore wake lock failure
    }
  }
}

export function releaseWakeLock() {
  if (wakeLockSentinel && typeof (wakeLockSentinel as { release?: () => Promise<void> }).release === 'function') {
    try {
      (wakeLockSentinel as { release: () => Promise<void> }).release().catch(() => {});
    } catch {
      // Ignore
    }
    wakeLockSentinel = null;
  }
}

/**
 * Plays a loud, piercing, rhythmic multi-tone alarm chime through Web Audio API
 */
function playWebAudioPulse() {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  const notes = [
    { freq: 880, start: 0, dur: 0.09 },
    { freq: 1174.66, start: 0.11, dur: 0.09 },
    { freq: 880, start: 0.22, dur: 0.09 },
    { freq: 1318.51, start: 0.33, dur: 0.18 },
  ];

  notes.forEach(({ freq, start, dur }) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.4, now + start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + dur);
    } catch {
      // Ignore oscillator errors
    }
  });
}

/**
 * Triggers phone hardware vibration pattern (repeating high-impact pulse)
 */
function triggerPhoneVibration() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      // Intense repeating alarm vibration pattern
      navigator.vibrate([600, 150, 600, 150, 900, 200, 1200]);
    } catch {
      // Ignore vibration errors
    }
  }
}

/**
 * Starts continuous looping alarm sound, phone vibration & wake lock.
 * Uses a Dual Audio Engine:
 * 1. Primary: Master HTML5 <audio> playing selected procedural or default alarm melody.
 * 2. Secondary: Web Audio API oscillator chime pulse.
 * 3. MediaSession API with interactive lock-screen controls.
 */
export function startAlarmRinging(taskTitle?: string, soundId?: AlarmSoundId) {
  if (isAlarmCurrentlyPlaying) return;
  isAlarmCurrentlyPlaying = true;
  currentAudioMode = 'ringing';

  const effectiveSoundId: AlarmSoundId = soundId || getDefaultAlarmSound();
  currentPlayingSoundId = effectiveSoundId;

  unlockMobileAudio();
  startAudioEngineClock();
  requestWakeLock();
  updateLockScreenMediaSession('ringing', taskTitle);

  // 1. Play selected procedural sound WAV in Master Audio at 100% volume
  const audio = getMasterAudio();
  if (audio) {
    try {
      const soundUri = getAlarmSoundWavUri(effectiveSoundId);
      audio.src = soundUri;
      audio.loop = true;
      audio.muted = false;
      audio.volume = 1.0;
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Audio play catch in alarm ringing, trying fallback:', err);
          if (audio) {
            audio.src = getAlarmWavUri();
            audio.play().catch(() => {});
          }
        });
      }
    } catch (err) {
      console.warn('Error starting master alarm audio:', err);
    }
  }

  // 2. Play Secondary Web Audio Pulse & Vibration (tuned to siren or sound)
  playWebAudioPulse();
  triggerPhoneVibration();

  // Repeat Web Audio & Vibration pulses
  if (alarmIntervalId) clearInterval(alarmIntervalId);
  alarmIntervalId = setInterval(() => {
    if (isAlarmCurrentlyPlaying) {
      // For melodic sounds, we don't overpower the audio element with harsh square pulses
      if (effectiveSoundId === 'siren' || effectiveSoundId === 'digital' || effectiveSoundId === 'pulse') {
        playWebAudioPulse();
      }
    }
  }, 1200);

  if (vibrationIntervalId) clearInterval(vibrationIntervalId);
  vibrationIntervalId = setInterval(() => {
    if (isAlarmCurrentlyPlaying) {
      triggerPhoneVibration();
    }
  }, 2200);
}

/**
 * Stops continuous alarm ringing, vibration & releases wake lock.
 * Protected against re-entrancy loops.
 */
export function stopAlarmRinging(hasRemainingReminders = false) {
  if (isStoppingAlarm) return;
  if (!isAlarmCurrentlyPlaying && currentAudioMode !== 'ringing') return;

  isStoppingAlarm = true;
  try {
    isAlarmCurrentlyPlaying = false;

    // Stop Master Audio
    const audio = getMasterAudio();
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // Ignore
      }
    }

    if (alarmIntervalId) {
      clearInterval(alarmIntervalId);
      alarmIntervalId = null;
    }

    if (vibrationIntervalId) {
      clearInterval(vibrationIntervalId);
      vibrationIntervalId = null;
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch {
        // Ignore
      }
    }

    releaseWakeLock();

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'paused';
      } catch {
        // Ignore
      }
    }

    if (hasRemainingReminders) {
      currentAudioMode = 'idle';
      armBackgroundAlarmKeepAlive();
    } else {
      currentAudioMode = 'idle';
    }

    // Safely notify registered listeners (App.tsx, Modals, etc.)
    alarmStopListeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in alarm stop listener:', err);
      }
    });
  } finally {
    isStoppingAlarm = false;
  }
}

/**
 * Returns whether alarm is currently ringing
 */
export function isAlarmPlaying(): boolean {
  return isAlarmCurrentlyPlaying;
}

/**
 * Play quick preview of alarm sound (e.g. for testing custom melodies in UI)
 */
export function testAlarmSound(soundId?: AlarmSoundId, durationMs = 3500) {
  unlockMobileAudio();
  const effectiveSoundId: AlarmSoundId = soundId || getDefaultAlarmSound();
  startAlarmRinging('Тестовый сигнал', effectiveSoundId);
  setTimeout(() => {
    stopAlarmRinging();
  }, durationMs);
}

/**
 * High-precision alarm test scheduler designed specifically for testing in pocket & lock-screen.
 * Uses absolute wall-clock timestamps (Date.now() >= target) driven by the hardware audio clock,
 * ensuring it fires reliably on time even when the screen is locked!
 */
export function scheduleAlarmTest(
  seconds: number,
  onTrigger: () => void,
  onTick?: (secondsLeft: number) => void
): () => void {
  // 1. Crucial: Unlock audio & prime background keep-alive directly from this user interaction!
  unlockMobileAudio();
  armBackgroundAlarmKeepAlive();

  const targetTimestamp = Date.now() + seconds * 1000;
  let isCancelled = false;

  // 2. Schedule in Service Worker as well for lock-screen wakeup
  // (the Android app shows its native notification from onTrigger instead)
  if (!isNativeApp() && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      if (reg && reg.active) {
        reg.active.postMessage({
          type: 'SCHEDULE_ALARM',
          title: '⏰ ТЕСТ БУДИЛЬНИКА: Сработал в кармане!',
          body: 'Сигнал и вибрация сработали при выключенном экране!',
          taskId: 'pocket-test-alarm',
          triggerAt: targetTimestamp,
        });
      }
    }).catch(() => {});
  }

  const tickHandler = () => {
    if (isCancelled) return;

    const now = Date.now();
    const remainingMs = targetTimestamp - now;
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

    if (onTick) {
      onTick(remainingSeconds);
    }

    if (now >= targetTimestamp) {
      isCancelled = true;
      unregisterTick();
      if (onTick) onTick(0);
      onTrigger();
    }
  };

  // Register with master audio clock (runs even on lock screen!)
  const unregisterTick = registerMasterClockListener(tickHandler);

  // Backup interval in case audio clock has brief latency
  const fallbackInterval = setInterval(tickHandler, 500);

  // Immediate first tick
  tickHandler();

  return () => {
    isCancelled = true;
    unregisterTick();
    clearInterval(fallbackInterval);
  };
}

/**
 * Synchronizes upcoming task alarms with the Service Worker so the mobile OS
 * can schedule native lock-screen alarm triggers (TimestampTrigger) or background wakeups.
 */
export function syncTaskAlarmsWithServiceWorker(
  upcomingAlarms: Array<{
    id: string;
    title: string;
    deadline: string;
    alarmSound?: AlarmSoundId;
    description?: string;
    windowName?: string;
  }>
) {
  if (isNativeApp()) {
    syncNativeAlarms(upcomingAlarms);
    return;
  }
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker.ready.then((reg) => {
    if (reg && reg.active) {
      reg.active.postMessage({
        type: 'SYNC_SCHEDULED_ALARMS',
        alarms: upcomingAlarms.map((a) => ({
          ...a,
          triggerAt: new Date(a.deadline).getTime(),
          alarmSound: a.alarmSound || getDefaultAlarmSound(),
        })),
      });
    }
  }).catch(() => {});
}

export interface NotificationDiagnostic {
  supported: boolean;
  isIframe: boolean;
  rawPermission: NotificationPermission | 'unsupported';
  effectiveStatus: 'granted' | 'default' | 'denied' | 'iframe_blocked' | 'unsupported';
  title: string;
  explanation: string;
  actionTip: string;
}

export function isRunningInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function getNotificationDiagnostic(): NotificationDiagnostic {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      isIframe: false,
      rawPermission: 'unsupported',
      effectiveStatus: 'unsupported',
      title: 'Уведомления недоступны',
      explanation: 'Серверная среда без поддержки Window.',
      actionTip: '',
    };
  }

  if (isNativeApp()) {
    const perm = getNativePermission();
    if (perm === 'granted') {
      return {
        supported: true,
        isIframe: false,
        rawPermission: 'granted',
        effectiveStatus: 'granted',
        title: 'Уведомления разрешены',
        explanation: 'Будильник сработает по сроку, даже если приложение закрыто.',
        actionTip: 'Всё настроено!',
      };
    }
    if (perm === 'denied') {
      return {
        supported: true,
        isIframe: false,
        rawPermission: 'denied',
        effectiveStatus: 'denied',
        title: 'Уведомления запрещены',
        explanation: 'Android запрещает приложению показывать уведомления.',
        actionTip: 'Откройте Настройки → Приложения → Notepad → Уведомления и включите их.',
      };
    }
    return {
      supported: true,
      isIframe: false,
      rawPermission: 'default',
      effectiveStatus: 'default',
      title: 'Требуется разрешение',
      explanation: 'Разрешите уведомления, чтобы будильник звонил по сроку даже при закрытом приложении.',
      actionTip: 'Нажмите кнопку «Разрешить уведомления».',
    };
  }

  const isIframe = isRunningInIframe();
  const supported = 'Notification' in window;

  if (!supported) {
    return {
      supported: false,
      isIframe,
      rawPermission: 'unsupported',
      effectiveStatus: 'unsupported',
      title: 'Уведомления не поддерживаются браузером',
      explanation: 'Браузер не поддерживает системные уведомления в данном режиме. На iPhone / iPad (iOS) системные уведомления работают при добавлении на экран «Домой» (PWA).',
      actionTip: 'На iPhone: нажмите значок «Поделиться» в Safari → «На экран “Домой”».',
    };
  }

  const perm = Notification.permission;

  if (perm === 'granted') {
    return {
      supported: true,
      isIframe,
      rawPermission: 'granted',
      effectiveStatus: 'granted',
      title: 'Уведомления разрешены',
      explanation: 'Системные уведомления и звонок на заблокированном экране активны.',
      actionTip: 'Всё настроено!',
    };
  }

  if (isIframe) {
    return {
      supported: true,
      isIframe: true,
      rawPermission: perm,
      effectiveStatus: 'iframe_blocked',
      title: 'Браузер блокирует запрос внутри iframe',
      explanation: 'В окне предварительного просмотра (внутри фрейма) современные браузеры (Chrome, Edge, Safari) запрещают вызов окна разрешения уведомлений.',
      actionTip: 'Откройте приложение в новой вкладке по прямой ссылке или на смартфоне, чтобы нажать «Разрешить уведомления».',
    };
  }

  if (perm === 'denied') {
    return {
      supported: true,
      isIframe: false,
      rawPermission: 'denied',
      effectiveStatus: 'denied',
      title: 'Уведомления заблокированы сайтом',
      explanation: 'Ранее в браузере было выбрано «Заблокировать» или запрещено в настройках. Браузер больше не показывает диалог автоматически.',
      actionTip: 'Нажмите на значок 🔒 (настройки сайта) слева от адреса в строке браузера и переключите «Уведомления» в положение «Разрешить».',
    };
  }

  return {
    supported: true,
    isIframe: false,
    rawPermission: 'default',
    effectiveStatus: 'default',
    title: 'Требуется разрешение',
    explanation: 'Разрешите уведомления, чтобы будильник громко звонил и вибрировал на экране блокировки телефона.',
    actionTip: 'Нажмите кнопку «Разрешить уведомления».',
  };
}

export async function requestNotificationPermissionDetailed(): Promise<{
  granted: boolean;
  diagnostic: NotificationDiagnostic;
}> {
  if (isNativeApp()) {
    const granted = await requestNativePermission();
    return { granted, diagnostic: getNotificationDiagnostic() };
  }

  const diagBefore = getNotificationDiagnostic();
  if (diagBefore.effectiveStatus === 'granted') {
    return { granted: true, diagnostic: diagBefore };
  }

  if (diagBefore.effectiveStatus === 'iframe_blocked' || diagBefore.effectiveStatus === 'unsupported' || diagBefore.effectiveStatus === 'denied') {
    return { granted: false, diagnostic: diagBefore };
  }

  try {
    const permission = await Notification.requestPermission();
    const diagAfter = getNotificationDiagnostic();
    return {
      granted: permission === 'granted',
      diagnostic: diagAfter,
    };
  } catch {
    const diagAfter = getNotificationDiagnostic();
    return {
      granted: false,
      diagnostic: diagAfter,
    };
  }
}

/**
 * Requests browser notification permissions for phone push notifications
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const result = await requestNotificationPermissionDetailed();
  return result.granted;
}

/**
 * Sends a system browser push notification (via Service Worker if active, or standard Notification)
 * Plays sound, vibrates, and adds interactive lock-screen actions.
 */
export async function sendSystemAlarmNotification(
  title: string,
  body: string,
  taskId?: string,
  deadline?: string,
  // Richer content for the Android notification (plain task title, window, description)
  details?: { taskTitle?: string; description?: string; windowName?: string }
) {
  unlockMobileAudio();

  if (isNativeApp()) {
    await showNativeAlarmNow({
      id: taskId,
      title: details?.taskTitle || title,
      deadline,
      description: details?.description,
      windowName: details?.windowName,
      body: taskId ? undefined : body,
    });
    return;
  }

  const options: NotificationOptions & {
    renotify?: boolean;
    vibrate?: number[];
    actions?: Array<{ action: string; title: string }>;
  } = {
    body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: `fifo-alarm-${taskId || 'general'}`,
    requireInteraction: true,
    renotify: true,
    data: {
      taskId,
      deadline: deadline || new Date().toISOString(),
      timestamp: Date.now(),
    },
    vibrate: [600, 150, 600, 150, 900, 200, 1200],
    actions: [
      { action: 'stop_alarm', title: '🛑 Выключить сигнал' },
      { action: 'snooze_30', title: '⏰ Отложить (+30 мин)' },
      { action: 'open_task', title: '🟢 Открыть задачу' },
    ],
  };

  // 1. Try Service Worker showNotification directly
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = swRegistration || (await navigator.serviceWorker.getRegistration());
      if (reg) {
        if (typeof (reg as ServiceWorkerRegistration).showNotification === 'function') {
          await (reg as ServiceWorkerRegistration).showNotification(title, options);
          return;
        }
        const activeSw = (reg as ServiceWorkerRegistration).active;
        if (activeSw) {
          activeSw.postMessage({
            type: 'SHOW_ALARM',
            title,
            body,
            taskId: taskId || 'general',
            deadline: deadline || new Date().toISOString(),
          });
          return;
        }
      }
    } catch (err) {
      console.warn('Service Worker showNotification fallback:', err);
    }
  }

  // 2. Fallback to standard Notification API
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, options);
    } catch {
      // Ignore notification creation errors
    }
  }
}

/**
 * Web Worker & Master Audio Background Timer
 * Keeps ticking even when mobile browser minimizes tabs or locks screen
 */
export function startBackgroundTimer(onTick: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  // Register with Master Audio Clock
  const unregisterAudioClock = registerMasterClockListener(onTick);

  // Background Web Worker fallback
  try {
    if (!backgroundWorker) {
      const workerCode = `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (!timer) {
              timer = setInterval(function() {
                self.postMessage('tick');
              }, 1000);
            }
          } else if (e.data === 'stop') {
            if (timer) {
              clearInterval(timer);
              timer = null;
            }
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      backgroundWorker = new Worker(URL.createObjectURL(blob));
    }

    backgroundWorker.onmessage = (e) => {
      if (e.data === 'tick') {
        onTick();
      }
    };

    backgroundWorker.postMessage('start');
  } catch (err) {
    console.warn('Background Web Worker not supported:', err);
  }

  const fallbackInterval = setInterval(onTick, 1000);

  return () => {
    unregisterAudioClock();
    clearInterval(fallbackInterval);
    if (backgroundWorker) {
      try {
        backgroundWorker.postMessage('stop');
      } catch {
        // Ignore
      }
    }
  };
}
