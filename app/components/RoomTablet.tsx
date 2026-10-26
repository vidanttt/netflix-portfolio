'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Room settings the tablet edits (saved in localStorage). */
export type RoomSettings = {
  effects: number; // footsteps and room sounds, 0..1
  muted: boolean;
  theme: string;
  lights: boolean;
  sensitivity: number;
  fov: number;
  headBob: boolean;
  /** who you are: your arms in first person, and you in the mirror (see room/avatar.ts) */
  character: string;
  crosshair: string;
  /** 'auto' inverts whatever is behind it */
  crosshairColor: string;
};

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  effects: 0.7,
  muted: false,
  theme: 'ice',
  lights: true,
  sensitivity: 1,
  fov: 1,
  headBob: true,
  character: 'nyx',
  crosshair: 'cross',
  crosshairColor: 'auto',
};

export const CROSSHAIRS = [
  { id: 'cross', name: 'Cross' },
  { id: 'tee', name: 'T' },
  { id: 'plus', name: 'Plus' },
  { id: 'circle', name: 'Circle' },
  { id: 'dot', name: 'Dot' },
];
export const CROSSHAIR_COLORS = [
  { id: 'auto', name: 'Invert' },
  { id: '#ffffff', name: 'White' },
  { id: '#7cff6b', name: 'Green' },
  { id: '#22e3ff', name: 'Cyan' },
  { id: '#ffe14d', name: 'Yellow' },
  { id: '#ff4fd8', name: 'Pink' },
];

/** The crosshair itself (the HUD's, and the tablet's previews): four lines, a dot and a ring;
 *  the style decides which show. Lines open up with `--room-bloom`. */
export function CrosshairMark({ kind, color }: { kind: string; color: string }) {
  return (
    <span className={`ch-mark ch-${kind}${color === 'auto' ? ' ch-invert' : ''}`} style={color === 'auto' ? undefined : { color }}>
      <i className="ch-t" />
      <i className="ch-b" />
      <i className="ch-l" />
      <i className="ch-r" />
      <i className="ch-dot" />
      <i className="ch-ring" />
    </span>
  );
}

/** Colour themes for the room: grid lines and the light. */
export const ROOM_THEMES: { id: string; name: string; lines: string; scan: string }[] = [
  { id: 'ice', name: 'Ice', lines: '#4d4757', scan: '#7dd3fc' },
  { id: 'crimson', name: 'Crimson', lines: '#5c3a40', scan: '#ff6b6b' },
  { id: 'emerald', name: 'Emerald', lines: '#3c5248', scan: '#5eead4' },
  { id: 'violet', name: 'Violet', lines: '#4a4160', scan: '#c4a1ff' },
  { id: 'gold', name: 'Gold', lines: '#5a4f3a', scan: '#fcd34d' },
  { id: 'mono', name: 'Mono', lines: '#555555', scan: '#f5f5f5' },
];

import { CHARACTERS } from './room/avatar';

type MusicState = { playing: boolean; volume: number; muted: boolean; title: string; artist: string };

const music = (action: string, value?: number | boolean) =>
  window.dispatchEvent(new CustomEvent('music:command', { detail: { action, value } }));

interface Props {
  open: boolean;
  settings: RoomSettings;
  onChange: (patch: Partial<RoomSettings>) => void;
  onClose: () => void;
  onLeave: () => void;
  onTick?: () => void;
}

/**
 * The tablet you hold up in the grid room (Tab). It rises into view from below, tilted in your
 * hands, and sways a little as you walk; the mouse is free while it is up.
 */
export default function RoomTablet({ open, settings, onChange, onClose, onLeave, onTick }: Props) {
  const [track, setTrack] = useState<MusicState | null>(null);
  const [clock, setClock] = useState('');
  const tabletRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);

  // shrink the tablet on short screens so it is never cut off at the top
  useLayoutEffect(() => {
    const measure = () => {
      const el = tabletRef.current;
      if (!el) return;
      setFit(Math.min(1, (window.innerHeight - 36) / Math.max(1, el.offsetHeight)));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const onState = (event: Event) => setTrack((event as CustomEvent<MusicState>).detail);
    window.addEventListener('music:state', onState);
    music('state'); // ask the player for its current state
    return () => window.removeEventListener('music:state', onState);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = window.setInterval(tick, 10000);
    return () => window.clearInterval(id);
  }, [open]);

  const set = (patch: Partial<RoomSettings>) => {
    onTick?.();
    onChange(patch);
  };
  const press = (action: string, value?: number | boolean) => {
    onTick?.();
    music(action, value);
  };

  return (
    <div className={`room-tablet-wrap${open ? ' is-open' : ''}`} aria-hidden={!open}>
      <div
        ref={tabletRef}
        className="room-tablet"
        role="dialog"
        aria-label="Room settings"
        aria-modal="false"
        style={{ scale: String(fit) }}
      >
        <span className="room-hand room-hand--left" aria-hidden="true" />
        <span className="room-hand room-hand--right" aria-hidden="true" />
        <div className="room-tablet-screen">
          <header className="rt-head">
            <span className="rt-os">ROOM&nbsp;OS</span>
            <span className="rt-clock">{clock}</span>
            <button type="button" className="rt-close" onClick={onClose} tabIndex={open ? 0 : -1}>
              <kbd>Tab</kbd> close
            </button>
          </header>

          <div className="rt-grid">
            <section className="rt-card rt-card--wide">
              <h4>Character</h4>
              <div className="rt-chars" role="radiogroup" aria-label="Character">
                {CHARACTERS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={settings.character === c.id}
                    className={settings.character === c.id ? 'is-on' : ''}
                    onClick={() => set({ character: c.id })}
                    tabIndex={open ? 0 : -1}
                  >
                    <strong>{c.name}</strong>
                    <span>{c.blurb}</span>
                  </button>
                ))}
              </div>
              {CHARACTERS.find((c) => c.id === settings.character)?.credit && (
                <p className="rt-credit">{CHARACTERS.find((c) => c.id === settings.character)!.credit}</p>
              )}
            </section>

            <section className="rt-card">
              <h4>Music</h4>
              <p className="rt-track">
                <strong>{track?.title ?? 'Nothing playing'}</strong>
                <span>{track?.artist ?? 'Open the music player'}</span>
              </p>
              <div className="rt-transport">
                <button type="button" onClick={() => press('prev')} aria-label="Previous song" tabIndex={open ? 0 : -1}>
                  <svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 5h2v14H6zM20 5v14L9 12z" fill="currentColor" /></svg>
                </button>
                <button type="button" className="rt-play" onClick={() => press('toggle')} aria-label={track?.playing ? 'Pause' : 'Play'} tabIndex={open ? 0 : -1}>
                  {track?.playing ? (
                    <svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
                  )}
                </button>
                <button type="button" onClick={() => press('next')} aria-label="Next song" tabIndex={open ? 0 : -1}>
                  <svg viewBox="0 0 24 24" width="16" height="16"><path d="M16 5h2v14h-2zM4 5v14l11-7z" fill="currentColor" /></svg>
                </button>
              </div>
              <label className="rt-slider">
                <span>Music volume</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={track ? (track.muted ? 0 : track.volume) : 0.7}
                  onChange={(e) => music('volume', Number(e.target.value))}
                  tabIndex={open ? 0 : -1}
                />
              </label>
            </section>

            <section className="rt-card">
              <h4>Sound</h4>
              <label className="rt-slider">
                <span>Footsteps &amp; effects</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={settings.effects}
                  onChange={(e) => onChange({ effects: Number(e.target.value), muted: false })}
                  tabIndex={open ? 0 : -1}
                />
              </label>
              <Toggle label="Mute everything" on={settings.muted} onToggle={() => {
                const next = !settings.muted;
                set({ muted: next });
                music('mute', next);
              }} open={open} />
            </section>

            <section className="rt-card">
              <h4>Room</h4>
              <div className="rt-themes" role="radiogroup" aria-label="Room colour">
                {ROOM_THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={settings.theme === t.id}
                    aria-label={t.name}
                    title={t.name}
                    className={settings.theme === t.id ? 'is-on' : ''}
                    style={{ ['--swatch' as string]: t.scan }}
                    onClick={() => set({ theme: t.id })}
                    tabIndex={open ? 0 : -1}
                  />
                ))}
              </div>
              <Toggle label="Lights" on={settings.lights} onToggle={() => set({ lights: !settings.lights })} open={open} />
            </section>

            <section className="rt-card">
              <h4>Controls</h4>
              <label className="rt-slider">
                <span>Mouse sensitivity <em>{settings.sensitivity.toFixed(1)}×</em></span>
                <input
                  type="range"
                  min={0.3}
                  max={2.5}
                  step={0.1}
                  value={settings.sensitivity}
                  onChange={(e) => onChange({ sensitivity: Number(e.target.value) })}
                  tabIndex={open ? 0 : -1}
                />
              </label>
              <label className="rt-slider">
                <span>Field of view <em>{Math.round(2 * Math.atan(0.62 * settings.fov) * (180 / Math.PI))}°</em></span>
                <input
                  type="range"
                  min={0.8}
                  max={1.35}
                  step={0.01}
                  value={settings.fov}
                  onChange={(e) => onChange({ fov: Number(e.target.value) })}
                  tabIndex={open ? 0 : -1}
                />
              </label>
              <Toggle label="Head bob" on={settings.headBob} onToggle={() => set({ headBob: !settings.headBob })} open={open} />
            </section>

            <section className="rt-card rt-card--wide">
              <h4>Crosshair</h4>
              <div className="rt-xhair-row">
                <div className="rt-xhairs" role="radiogroup" aria-label="Crosshair style">
                  {CROSSHAIRS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={settings.crosshair === c.id}
                      aria-label={c.name}
                      title={c.name}
                      className={settings.crosshair === c.id ? 'is-on' : ''}
                      onClick={() => set({ crosshair: c.id })}
                      tabIndex={open ? 0 : -1}
                    >
                      <CrosshairMark kind={c.id} color={settings.crosshairColor === 'auto' ? '#ffffff' : settings.crosshairColor} />
                    </button>
                  ))}
                </div>
                <div className="rt-themes" role="radiogroup" aria-label="Crosshair colour">
                  {CROSSHAIR_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={settings.crosshairColor === c.id}
                      aria-label={c.name}
                      title={c.name}
                      className={`${settings.crosshairColor === c.id ? 'is-on' : ''}${c.id === 'auto' ? ' rt-swatch-invert' : ''}`}
                      style={{ ['--swatch' as string]: c.id === 'auto' ? '#888' : c.id }}
                      onClick={() => set({ crosshairColor: c.id })}
                      tabIndex={open ? 0 : -1}
                    />
                  ))}
                </div>
              </div>
            </section>
          </div>

          <footer className="rt-foot">
            <button type="button" className="rt-reset" onClick={() => set(DEFAULT_ROOM_SETTINGS)} tabIndex={open ? 0 : -1}>
              Reset settings
            </button>
            <button type="button" className="rt-leave" onClick={onLeave} tabIndex={open ? 0 : -1}>
              Leave the room
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}

/** The music console on the room's left wall: shows what's playing; aim at a button and click. */
export function RoomMusicConsole() {
  const [track, setTrack] = useState<MusicState | null>(null);
  useEffect(() => {
    const onState = (event: Event) => setTrack((event as CustomEvent<MusicState>).detail);
    window.addEventListener('music:state', onState);
    music('state');
    return () => window.removeEventListener('music:state', onState);
  }, []);
  return (
    <>
      <span className="room-console-tag">Now playing</span>
      <span className="room-console-title">{track?.title ?? '—'}</span>
      <span className="room-console-artist">{track?.artist ?? ''}</span>
      <span className="room-console-buttons">
        <span className="room-console-btn" data-room-item="music-prev" data-label="Previous song">⏮</span>
        <span className="room-console-btn room-console-btn--main" data-room-item="music-toggle" data-label={track?.playing ? 'Pause music' : 'Play music'}>
          {track?.playing ? '❚❚' : '▶'}
        </span>
        <span className="room-console-btn" data-room-item="music-next" data-label="Next song">⏭</span>
      </span>
      <span className={`room-console-eq${track?.playing ? ' is-playing' : ''}`} aria-hidden="true">
        <i /><i /><i /><i /><i />
      </span>
    </>
  );
}

function Toggle({ label, on, onToggle, open }: { label: string; on: boolean; onToggle: () => void; open: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="rt-toggle" onClick={onToggle} tabIndex={open ? 0 : -1}>
      <span>{label}</span>
      <span className={`rt-switch${on ? ' is-on' : ''}`} aria-hidden="true" />
    </button>
  );
}
