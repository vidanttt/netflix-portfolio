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

/* ── Weapons ─────────────────────────────────────────────────────────── */
type ShotVoice = { body: number; crack: number; thump: number; tail: number; size: number };
const SHOTS: Record<string, ShotVoice> = {
  light: { body: 1500, crack: 5200, thump: 130, tail: 0.22, size: 0.6 },
  heavy: { body: 1000, crack: 4200, thump: 95, tail: 0.38, size: 0.95 },
  magnum: { body: 800, crack: 3800, thump: 80, tail: 0.5, size: 1.1 },
  smg: { body: 1700, crack: 5600, thump: 140, tail: 0.18, size: 0.55 },
  rifle: { body: 1200, crack: 4600, thump: 105, tail: 0.32, size: 0.85 },
  shotgun: { body: 700, crack: 3000, thump: 70, tail: 0.55, size: 1.15 },
};

/** A gunshot: a sharp crack, the body of the blast, a low punch and the room's tail. */
export const playShot = (sound: string) => {
  const v = SHOTS[sound];
  const c = audio();
  if (!v || !c) return;
  const j = 0.9 + Math.random() * 0.2;
  burst({ duration: 0.05, freq: v.crack * j, q: 0.7, gain: 0.35 * v.size, type: 'highpass' });
  burst({ duration: 0.12 + v.size * 0.06, freq: v.body * j, q: 0.6, gain: 0.55 * v.size });
  thump({ from: v.thump * 2.2, to: v.thump * 0.5, duration: 0.16 + v.size * 0.08, gain: 0.6 * v.size });
  burst({ at: c.currentTime + 0.025, duration: v.tail, freq: 520, q: 0.4, gain: 0.16 * v.size, type: 'lowpass' });
  burst({ at: c.currentTime + 0.09, duration: v.tail * 1.4, freq: 360, q: 0.4, gain: 0.07 * v.size, type: 'lowpass' });
};

/** Trigger on an empty chamber. */
export const playDryFire = () => {
  burst({ duration: 0.025, freq: 3400, q: 2.5, gain: 0.12 });
  playClick(1.6);
};

/** Mechanical clicks for reloads: mag out, mag in, slide / bolt, cylinder, shell, pump. */
export const playMech = (kind: 'magOut' | 'magIn' | 'slide' | 'cylinder' | 'shell' | 'pump' | 'equip') => {
  const c = audio();
  if (!c) return;
  if (kind === 'magOut') {
    burst({ duration: 0.05, freq: 2200, q: 2, gain: 0.12 });
    thump({ at: c.currentTime + 0.02, from: 260, to: 160, duration: 0.06, gain: 0.08 });
  } else if (kind === 'magIn') {
    burst({ duration: 0.04, freq: 1800, q: 1.6, gain: 0.18 });
    burst({ at: c.currentTime + 0.05, duration: 0.03, freq: 3200, q: 2.5, gain: 0.12 });
  } else if (kind === 'slide') {
    burst({ duration: 0.06, freq: 2600, q: 1.4, gain: 0.14 });
    burst({ at: c.currentTime + 0.09, duration: 0.05, freq: 3000, q: 2, gain: 0.18 });
  } else if (kind === 'cylinder') {
    for (let i = 0; i < 3; i++) burst({ at: c.currentTime + i * 0.035, duration: 0.02, freq: 3600, q: 3, gain: 0.08 });
  } else if (kind === 'shell') {
    burst({ duration: 0.04, freq: 1500, q: 1.4, gain: 0.12 });
    thump({ from: 300, to: 200, duration: 0.05, gain: 0.05 });
  } else if (kind === 'pump') {
    burst({ duration: 0.07, freq: 1300, q: 1, gain: 0.2 });
    thump({ from: 180, to: 110, duration: 0.07, gain: 0.12 });
    burst({ at: c.currentTime + 0.16, duration: 0.06, freq: 1700, q: 1.2, gain: 0.22 });
  } else {
    burst({ duration: 0.08, freq: 2400, q: 0.9, gain: 0.06 });
    playClick(0.9);
  }
};

/** A knife cutting the air; `heavy` for the stab. */
export const playSwish = (heavy = false) => {
  const c = audio();
  if (!c || !master || !noise || muted || volume <= 0) return;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noise;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.6;
  filter.frequency.setValueAtTime(heavy ? 900 : 1400, t);
  filter.frequency.exponentialRampToValueAtTime(heavy ? 2400 : 4200, t + 0.12);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(heavy ? 0.28 : 0.2, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  src.connect(filter).connect(g).connect(master);
  src.start(t, Math.random() * 0.5, 0.3);
};

/** Hit marker tick; a bright ping for a headshot. */
export const playHit = (head = false) => {
  const c = audio();
  if (!c || !master || muted || volume <= 0) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = head ? 'sine' : 'triangle';
  osc.frequency.setValueAtTime(head ? 2400 : 1900, t);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(head ? 0.16 : 0.1, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (head ? 0.35 : 0.06));
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + 0.4);
  if (head) {
    const o2 = c.createOscillator();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(3600, t);
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.linearRampToValueAtTime(0.06, t + 0.003);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o2.connect(g2).connect(master);
    o2.start(t);
    o2.stop(t + 0.3);
  }
};

/** A practice bot shutting down. */
export const playBotDown = () => {
  const c = audio();
  if (!c || !master || muted || volume <= 0) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(520, t);
  osc.frequency.exponentialRampToValueAtTime(90, t + 0.45);
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.06, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  osc.connect(filter).connect(g).connect(master);
  osc.start(t);
  osc.stop(t + 0.55);
  thump({ at: t + 0.42, from: 120, to: 50, duration: 0.18, gain: 0.3 });
};

/** A bot powering back up. */
export const playBotSpawn = () => {
  const c = audio();
  if (!c || !master || muted || volume <= 0) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(880, t + 0.25);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.04, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + 0.32);
};

/* ── the nether portal ─────────────────────────────────────────────── */
let hum: { gain: GainNode; level: number } | null = null;

/** noise through a slowly wandering band-pass and a flanger: the portal's breathy whoosh */
const portalVoice = (c: AudioContext, out: AudioNode) => {
  const src = c.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 480;
  bp.Q.value = 3.2;
  for (const [rate, depth] of [[0.21, 180], [0.37, 110]]) {
    const lfo = c.createOscillator();
    lfo.frequency.value = rate + Math.random() * 0.05;
    const d = c.createGain();
    d.gain.value = depth;
    lfo.connect(d).connect(bp.frequency);
    lfo.start();
  }
  // flanger: the dry sound plus a copy delayed by a few wobbling milliseconds
  const dly = c.createDelay(0.02);
  dly.delayTime.value = 0.005;
  const sweep = c.createOscillator();
  sweep.frequency.value = 0.16;
  const sd = c.createGain();
  sd.gain.value = 0.0035;
  sweep.connect(sd).connect(dly.delayTime);
  sweep.start();
  const fb = c.createGain();
  fb.gain.value = 0.55;
  dly.connect(fb).connect(dly);
  // a slow swell in and out
  const trem = c.createGain();
  trem.gain.value = 0.75;
  const tl = c.createOscillator();
  tl.frequency.value = 0.42;
  const td = c.createGain();
  td.gain.value = 0.25;
  tl.connect(td).connect(trem.gain);
  tl.start();
  src.connect(bp);
  bp.connect(trem);
  bp.connect(dly).connect(trem);
  trem.connect(out);
  src.start();
  return { src, bp };
};

/**
 * The portal's ambience, quiet: `level` 0..1 follows how close you are. Built the first time
 * it's needed and left running silently afterwards.
 */
export const setPortalHum = (level: number) => {
  const c = audio();
  if (!c || !master || !noise) return;
  const want = muted ? 0 : Math.max(0, Math.min(1, level)) ** 1.5 * 0.05;
  if (!hum) {
    if (want <= 0.0005) return;
    const gain = c.createGain();
    gain.gain.value = 0;
    gain.connect(master);
    portalVoice(c, gain);
    hum = { gain, level: 0 };
  }
  if (Math.abs(want - hum.level) < 0.001) return;
  hum.level = want;
  hum.gain.gain.setTargetAtTime(want, c.currentTime, 0.3);
};

/** Stepping into the portal: the whoosh swelling and rising over a couple of seconds, softly. */
export const playPortalEnter = () => {
  const c = audio();
  if (!c || !master || !noise || muted || volume <= 0) return;
  const t = c.currentTime;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.09, t + 1.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
  g.connect(master);
  const { src, bp } = portalVoice(c, g);
  bp.frequency.cancelScheduledValues(t);
  bp.frequency.setValueAtTime(260, t);
  bp.frequency.exponentialRampToValueAtTime(1400, t + 2.6);
  src.stop(t + 3.1);
};
