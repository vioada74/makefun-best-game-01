// All sound is synthesized with WebAudio: no audio files, no network.
// Every effect is a short oscillator/noise burst; the drone is two soft
// detuned sines that start on the player's first input. Mute with M.

let context = null;
let droneNodes = null;
let muted = false;

function ensureContext() {
  if (context !== null) return context;
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return null;
  context = new AudioContextClass();
  return context;
}

function tone(freqFrom, freqTo, seconds, type, gainValue, when = 0) {
  const ctx = ensureContext();
  if (ctx === null || muted) return;
  const start = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqFrom, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), start + seconds);
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + seconds + 0.02);
}

function noiseBurst(seconds, gainValue, filterFreq) {
  const ctx = ensureContext();
  if (ctx === null || muted) return;
  const start = ctx.currentTime;
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(start);
}

export const sfx = {
  shoot() { tone(880, 320, 0.08, 'square', 0.05); },
  hit() { noiseBurst(0.08, 0.12, 1800); },
  enemyDown() { tone(320, 60, 0.18, 'sawtooth', 0.09); noiseBurst(0.12, 0.08, 900); },
  pickup() { tone(660, 660, 0.07, 'sine', 0.08); tone(990, 990, 0.09, 'sine', 0.08, 0.06); },
  hurt() { tone(220, 70, 0.3, 'sawtooth', 0.14); },
  lanternHit() { tone(140, 90, 0.2, 'triangle', 0.12); },
  waveHorn() { tone(196, 196, 0.25, 'triangle', 0.12); tone(294, 294, 0.35, 'triangle', 0.12, 0.22); },
  upgrade() { tone(523, 523, 0.1, 'sine', 0.09); tone(659, 659, 0.1, 'sine', 0.09, 0.08); tone(784, 784, 0.16, 'sine', 0.09, 0.16); },
  victory() { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.22, 'sine', 0.1, i * 0.13)); },
  defeat() { [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.9, 0.28, 'triangle', 0.1, i * 0.18)); },
};

export function startDrone() {
  const ctx = ensureContext();
  if (ctx === null || muted || droneNodes !== null) return;
  const gain = ctx.createGain();
  gain.gain.value = 0.025;
  gain.connect(ctx.destination);
  const a = ctx.createOscillator();
  a.type = 'sine';
  a.frequency.value = 110;
  const b = ctx.createOscillator();
  b.type = 'sine';
  b.frequency.value = 164.81;
  a.connect(gain);
  b.connect(gain);
  a.start();
  b.start();
  droneNodes = { gain, a, b };
}

export function toggleMute() {
  muted = !muted;
  if (droneNodes !== null) droneNodes.gain.gain.value = muted ? 0 : 0.025;
  return muted;
}

export function isMuted() {
  return muted;
}
