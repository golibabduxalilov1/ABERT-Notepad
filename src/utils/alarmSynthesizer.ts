import { AlarmSoundId } from '../types';

/**
 * Procedural Audio Synthesizer for high-quality alarm sounds.
 * Generates valid PCM 16-bit WAV data URIs in-memory without network requests.
 * This guarantees 100% offline, immediate, zero-latency playback in HTML5 <audio>
 * even on lock screen and in pocket.
 */

function encodeWav(sampleRate: number, numSamples: number, sampleGenerator: (t: number, index: number) => number): string {
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // format chunk identifier
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // 16 bits
  // data chunk identifier
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const rawSample = sampleGenerator(t, i);
    // Soft clipping with saturation
    const clamped = Math.max(-1, Math.min(1, rawSample));
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

// 1. Loud Multi-tone Piercing Siren (Default)
export function generateSirenWav(): string {
  const sampleRate = 22050;
  const duration = 1.2;
  const numSamples = Math.floor(sampleRate * duration);

  return encodeWav(sampleRate, numSamples, (t) => {
    const inBeep1 = t >= 0.02 && t < 0.22;
    const inBeep2 = t >= 0.28 && t < 0.48;
    const inBeep3 = t >= 0.54 && t < 0.74;
    const inBeep4 = t >= 0.80 && t < 1.12;

    if (inBeep1) {
      return Math.sin(2 * Math.PI * 880 * t) * 0.7 + Math.sin(2 * Math.PI * 1760 * t) * 0.25;
    } else if (inBeep2) {
      return Math.sin(2 * Math.PI * 1174.66 * t) * 0.75 + Math.sin(2 * Math.PI * 2349 * t) * 0.25;
    } else if (inBeep3) {
      return Math.sin(2 * Math.PI * 880 * t) * 0.7 + Math.sin(2 * Math.PI * 1760 * t) * 0.25;
    } else if (inBeep4) {
      return Math.sin(2 * Math.PI * 1318.51 * t) * 0.8 + Math.sin(2 * Math.PI * 2637 * t) * 0.3;
    }
    return 0;
  });
}

// 2. Digital Beep (Classic Quartz LCD Alarm Clock)
export function generateDigitalWav(): string {
  const sampleRate = 22050;
  const duration = 1.0;
  const numSamples = Math.floor(sampleRate * duration);

  return encodeWav(sampleRate, numSamples, (t) => {
    // 2 high-pitched double beeps: 2048 Hz square wave with 4096 Hz harmonic
    const beep1 = t >= 0.05 && t < 0.15;
    const beep2 = t >= 0.20 && t < 0.30;
    const beep3 = t >= 0.50 && t < 0.60;
    const beep4 = t >= 0.65 && t < 0.75;

    if (beep1 || beep2 || beep3 || beep4) {
      const square = Math.sin(2 * Math.PI * 2048 * t) >= 0 ? 0.7 : -0.7;
      const sub = Math.sin(2 * Math.PI * 4096 * t) * 0.2;
      return square + sub;
    }
    return 0;
  });
}

// 3. Marimba Melody (Warm wooden acoustic percussion, Apple-style)
export function generateMarimbaWav(): string {
  const sampleRate = 22050;
  const duration = 1.6;
  const numSamples = Math.floor(sampleRate * duration);

  // Notes: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50), A5 (880), G5 (783.99)
  const notes = [
    { start: 0.0, freq: 523.25 },
    { start: 0.22, freq: 659.25 },
    { start: 0.44, freq: 783.99 },
    { start: 0.66, freq: 1046.50 },
    { start: 0.95, freq: 880.0 },
    { start: 1.18, freq: 783.99 },
  ];

  return encodeWav(sampleRate, numSamples, (t) => {
    let sum = 0;
    for (const note of notes) {
      if (t >= note.start && t < note.start + 0.45) {
        const dt = t - note.start;
        // Percussive fast strike and exponential decay
        const envelope = Math.exp(-dt * 9.0);
        // Rich harmonic wooden overtones: 1x, 3x, 4x
        const strike =
          Math.sin(2 * Math.PI * note.freq * dt) * 0.7 +
          Math.sin(2 * Math.PI * note.freq * 3 * dt) * 0.2 +
          Math.sin(2 * Math.PI * note.freq * 4 * dt) * 0.1;
        sum += strike * envelope;
      }
    }
    return sum;
  });
}

// 4. Crystal Chimes / Bells (Bright ringing metallophone)
export function generateChimeWav(): string {
  const sampleRate = 22050;
  const duration = 1.8;
  const numSamples = Math.floor(sampleRate * duration);

  // E6 (1318.5), B5 (987.77), G#5 (830.61), E5 (659.25)
  const notes = [
    { start: 0.0, freq: 1318.5 },
    { start: 0.35, freq: 987.77 },
    { start: 0.70, freq: 830.61 },
    { start: 1.05, freq: 659.25 },
  ];

  return encodeWav(sampleRate, numSamples, (t) => {
    let sum = 0;
    for (const note of notes) {
      if (t >= note.start && t < note.start + 0.7) {
        const dt = t - note.start;
        const envelope = Math.exp(-dt * 5.0);
        // Inharmonic bell partials
        const bell =
          Math.sin(2 * Math.PI * note.freq * dt) * 0.6 +
          Math.sin(2 * Math.PI * note.freq * 2.76 * dt) * 0.25 +
          Math.sin(2 * Math.PI * note.freq * 5.4 * dt) * 0.15;
        sum += bell * envelope;
      }
    }
    return sum;
  });
}

// 5. Military Bugle / Reveille (Fanfare call)
export function generateMilitaryWav(): string {
  const sampleRate = 22050;
  const duration = 1.5;
  const numSamples = Math.floor(sampleRate * duration);

  // Classic bugle notes: G4 (392), C5 (523.25), E5 (659.25), G5 (783.99)
  const notes = [
    { start: 0.0, dur: 0.12, freq: 392.0 },
    { start: 0.15, dur: 0.12, freq: 523.25 },
    { start: 0.30, dur: 0.14, freq: 659.25 },
    { start: 0.48, dur: 0.28, freq: 783.99 },
    { start: 0.82, dur: 0.12, freq: 659.25 },
    { start: 0.98, dur: 0.45, freq: 783.99 },
  ];

  return encodeWav(sampleRate, numSamples, (t) => {
    let sum = 0;
    for (const note of notes) {
      if (t >= note.start && t < note.start + note.dur) {
        const dt = t - note.start;
        // Brass envelope: sharp attack, sustained body, quick release
        let env = 1.0;
        if (dt < 0.02) env = dt / 0.02;
        else if (dt > note.dur - 0.03) env = (note.dur - dt) / 0.03;

        // Brass harmonic series (sawtooth-like)
        const brass =
          Math.sin(2 * Math.PI * note.freq * dt) * 0.6 +
          Math.sin(2 * Math.PI * note.freq * 2 * dt) * 0.3 +
          Math.sin(2 * Math.PI * note.freq * 3 * dt) * 0.15;
        sum += brass * env;
      }
    }
    return sum;
  });
}

// 6. Retro Mechanical Twin-Bell Alarm Clock (Ringing Hammer)
export function generateRetroWav(): string {
  const sampleRate = 22050;
  const duration = 1.2;
  const numSamples = Math.floor(sampleRate * duration);

  return encodeWav(sampleRate, numSamples, (t) => {
    // Fast clattering metallic hammer hitting two bells (at ~18 Hz rapid strikes)
    const burst = t < 1.0;
    if (burst) {
      const strikeRate = 22; // 22 strikes per second
      const strikePhase = (t * strikeRate) % 1;
      const strikeEnvelope = Math.exp(-strikePhase * 12);
      // Alternate between slightly detuned bells: 1450 Hz and 1580 Hz
      const whichBell = Math.floor(t * strikeRate) % 2 === 0;
      const freq = whichBell ? 1450 : 1580;
      const metallic =
        Math.sin(2 * Math.PI * freq * t) * 0.7 +
        Math.sin(2 * Math.PI * freq * 1.58 * t) * 0.3;
      return metallic * strikeEnvelope;
    }
    return 0;
  });
}

// 7. Pulse Sonar / Radar (Sci-Fi Submarine Ping)
export function generatePulseWav(): string {
  const sampleRate = 22050;
  const duration = 1.4;
  const numSamples = Math.floor(sampleRate * duration);

  return encodeWav(sampleRate, numSamples, (t) => {
    // 2 intense sonar pulses
    const p1 = t >= 0.0 && t < 0.6;
    const p2 = t >= 0.65 && t < 1.35;

    if (p1 || p2) {
      const dt = p1 ? t : t - 0.65;
      const env = Math.exp(-dt * 4.5);
      // Sweeping frequency from 1800 down to 900 Hz + sub pulse
      const f = 1800 - dt * 1100;
      const ping =
        Math.sin(2 * Math.PI * f * dt) * 0.75 +
        Math.sin(2 * Math.PI * 300 * dt) * 0.25;
      return ping * env;
    }
    return 0;
  });
}

// 8. Gentle Morning Ambient (Warm Soft Awakening)
export function generateGentleWav(): string {
  const sampleRate = 22050;
  const duration = 2.0;
  const numSamples = Math.floor(sampleRate * duration);

  // Soft triad chords: F4 (349.23), A4 (440), C5 (523.25), E5 (659.25)
  const notes = [
    { start: 0.0, freq: 349.23, dur: 1.0 },
    { start: 0.15, freq: 440.0, dur: 1.0 },
    { start: 0.35, freq: 523.25, dur: 1.1 },
    { start: 0.55, freq: 659.25, dur: 1.3 },
    { start: 1.1, freq: 523.25, dur: 0.8 },
  ];

  return encodeWav(sampleRate, numSamples, (t) => {
    let sum = 0;
    for (const note of notes) {
      if (t >= note.start && t < note.start + note.dur) {
        const dt = t - note.start;
        // Soft slow attack and smooth fade
        let env = Math.sin((Math.PI * dt) / note.dur);
        if (env < 0) env = 0;
        // Pure smooth sine with gentle warm overtone
        const warm =
          Math.sin(2 * Math.PI * note.freq * dt) * 0.8 +
          Math.sin(2 * Math.PI * note.freq * 2 * dt) * 0.15;
        sum += warm * env * 0.4;
      }
    }
    return sum;
  });
}

// Cache of generated sound URIs
const soundUriCache: Partial<Record<AlarmSoundId, string>> = {};

export function getAlarmSoundWavUri(soundId: AlarmSoundId = 'siren'): string {
  if (soundUriCache[soundId]) {
    return soundUriCache[soundId]!;
  }

  let uri: string;
  switch (soundId) {
    case 'digital':
      uri = generateDigitalWav();
      break;
    case 'marimba':
      uri = generateMarimbaWav();
      break;
    case 'chime':
      uri = generateChimeWav();
      break;
    case 'military':
      uri = generateMilitaryWav();
      break;
    case 'retro':
      uri = generateRetroWav();
      break;
    case 'pulse':
      uri = generatePulseWav();
      break;
    case 'gentle':
      uri = generateGentleWav();
      break;
    case 'siren':
    default:
      uri = generateSirenWav();
      break;
  }

  soundUriCache[soundId] = uri;
  return uri;
}
