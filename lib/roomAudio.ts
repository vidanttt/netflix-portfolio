/**
 * Sound for the first-person grid room, synthesised with Web Audio (no files to load).
 *
 * Footsteps are a short band-passed noise scuff over a soft low thump, varied a little every
 * step so they never sound like one sample on repeat. Landing, jumping, interaction clicks and
 * the door hum use the same building blocks.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let volume = 0.7;
let muted = false;

const audio = () => {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    master.connect(ctx.destination);
    // one second of white noise, reused by every sound
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

export const setRoomVolume = (value: number) => {
  volume = Math.min(1, Math.max(0, value));
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.03);
};

export const setRoomMuted = (value: boolean) => {
  muted = value;
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.03);
};

/** Wake the audio context inside a user gesture (browsers keep it silent until then). */
export const unlockRoomAudio = () => {
  audio();
};

const burst = (opts: { at?: number; duration: number; freq: number; q: number; gain: number; type?: BiquadFilterType }) => {
  const c = audio();
  if (!c || !master || !noise || muted || volume <= 0) return;
  const t = opts.at ?? c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const filter = c.createBiquadFilter();
  filter.type = opts.type ?? 'bandpass';
  filter.frequency.value = opts.freq;
  filter.Q.value = opts.q;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(opts.gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.duration);
  src.connect(filter).connect(g).connect(master);
  src.start(t, Math.random() * 0.8, opts.duration + 0.05);
};

const thump = (opts: { at?: number; from: number; to: number; duration: number; gain: number }) => {
  const c = audio();
  if (!c || !master || muted || volume <= 0) return;
  const t = opts.at ?? c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(opts.from, t);
  osc.frequency.exponentialRampToValueAtTime(opts.to, t + opts.duration);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(opts.gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.duration);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + opts.duration + 0.02);
};

/** One footstep. `speed` 0..1 (walking → sprinting) makes it a little harder and brighter. */
export const playStep = (speed = 0.5) => {
  const v = 0.6 + Math.random() * 0.3;
  burst({ duration: 0.09 + speed * 0.03, freq: 900 + Math.random() * 500 + speed * 600, q: 0.9, gain: 0.16 * v * (0.8 + speed * 0.5) });
  burst({ duration: 0.05, freq: 3200 + Math.random() * 900, q: 1.4, gain: 0.035 * v });
  thump({ from: 120 + Math.random() * 20, to: 55, duration: 0.11, gain: 0.32 * v * (0.8 + speed * 0.4) });
};

/** Landing after a jump; `impact` 0..1. */
export const playLand = (impact = 0.6) => {
  thump({ from: 140, to: 45, duration: 0.2, gain: 0.5 * impact + 0.15 });
  burst({ duration: 0.14, freq: 700, q: 0.7, gain: 0.22 * impact + 0.05 });
  const c = audio();
  if (c) burst({ at: c.currentTime + 0.035, duration: 0.08, freq: 1400, q: 0.9, gain: 0.07 * impact });
};

export const playJump = () => {
  burst({ duration: 0.07, freq: 1100, q: 0.8, gain: 0.09 });
  thump({ from: 90, to: 70, duration: 0.07, gain: 0.12 });
};

/** A soft UI tick (aiming / pressing things in the room, tablet controls). */
export const playClick = (pitch = 1) => {
  const c = audio();
  if (!c || !master || muted || volume <= 0) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1300 * pitch, t);
  osc.frequency.exponentialRampToValueAtTime(700 * pitch, t + 0.05);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.09, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + 0.09);
};

/** The sliding door: a low airy whoosh with a soft hum under it. */
export const playDoor = (opening = true) => {
  const c = audio();
  if (!c) return;
  burst({ duration: 0.6, freq: opening ? 500 : 380, q: 0.5, gain: 0.12, type: 'lowpass' });
  thump({ from: opening ? 70 : 90, to: opening ? 95 : 60, duration: 0.55, gain: 0.12 });
  burst({ at: c.currentTime + (opening ? 0.45 : 0.4), duration: 0.12, freq: 260, q: 0.8, gain: 0.1 });
};

/** Room lights switching on or off. */
export const playSwitch = (on: boolean) => {
  playClick(on ? 1.15 : 0.8);
  thump({ from: on ? 180 : 120, to: on ? 240 : 80, duration: 0.25, gain: 0.08 });
};
