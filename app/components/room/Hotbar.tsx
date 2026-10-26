'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Barlow_Condensed, Press_Start_2P } from 'next/font/google';
import { WEAPONS } from './weapons';
import type { Arsenal } from './arsenal';

const pixel = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' });
const hud = Barlow_Condensed({ weight: ['500', '600', '700'], subsets: ['latin'], display: 'swap' });

/* 16-wide pixel sprites, Minecraft-item style. One char per pixel; '.' is empty. */
const PALETTE: Record<string, string> = {
  k: '#1b1b1f',
  g: '#6b6f78',
  l: '#b9bec6',
  s: '#d5d8dd',
  w: '#8a4b23',
  W: '#5e3216',
  b: '#d1a54a',
  p: '#e0569b',
  y: '#f5d77a',
  v: '#6f5bd8',
  r: '#b02a24',
  o: '#ff9a3c',
  h: '#3a3d46',
};
const SPRITES: Record<string, string[]> = {
  hand: [
    '................',
    '....kkkkkk......',
    '...khhhhhhk.....',
    '..khhhhhhhhk....',
    '..khkhkhkhhk....',
    '..khhhhhhhhk....',
    '..khhhhhhhk.....',
    '...koooook......',
    '....khhhk.......',
    '....khhhk.......',
    '....kkkkk.......',
    '................',
  ],
  karambit: [
    '..........ppp...',
    '........ppvvv...',
    '.......ppvv.....',
    '......ypp.......',
    '.....yyp........',
    '....yyk.........',
    '...kkko.........',
    '..kkkk..........',
    '.kk.kk..........',
    '.k..k...........',
    '.kkkk...........',
    '................',
  ],
  glock: [
    '................',
    '..kkkkkkkkkkkkk.',
    '..kggggggggggggk',
    '..kkkkkkkkkkkkk.',
    '..kkkkkkkkkk....',
    '..kkkk.k..k.....',
    '..kkkk..kk......',
    '.kkkk...........',
    '.kkkk...........',
    '.kkkk...........',
    'kkkk............',
    'kkk.............',
  ],
  sheriff: [
    '................',
    '...k...........k',
    '..kggggggggggggk',
    '..kgllgkkkkkkkk.',
    '..kglllgk.......',
    '..kgllgkk.......',
    '..kkkkkk.k......',
    '.kkkk..kk.......',
    '.kbkk...........',
    '.kkkk...........',
    'kkkk............',
    'kkk.............',
  ],
  sw500: [
    '..k............k',
    '..ksssssssssssss',
    '..kslllssksksksk',
    '..kslllsssssssss',
    '..ksllssk.......',
    '..kkkkkkk.......',
    '.kkkk..kk.......',
    '.kkkk...........',
    '.kkkk...........',
    'kkkk............',
    'kkk.............',
    '................',
  ],
  deagle: [
    '................',
    '..gggggggggggggg',
    '..gllllllllllkkg',
    '..ggggggggggggg.',
    '..gggggggg......',
    '..kkkk.g..g.....',
    '..kkkk..gg......',
    '.kkkk...........',
    '.kkkk...........',
    '.kkkk...........',
    'kkkk............',
    'kkk.............',
  ],
  mp5: [
    '................',
    '...........k....',
    'kk.kkkkkkkkkkkkk',
    'kkkkkkkkkkkkkk..',
    'k..kkkkkkkhhh...',
    '...kkk.kk.hhh...',
    '...kkk..kk......',
    '...kk...kk......',
    '........kk......',
    '.........kk.....',
    '................',
    '................',
  ],
  ak47: [
    '................',
    '...........k..k.',
    'wwkkkkkkkkkkkkkk',
    'wwwkkkkkkwwwwk..',
    'wwwwkk.kk.......',
    'www.kk..kk......',
    '.....k...kk.....',
    '..........kk....',
    '..........kk....',
    '................',
    '................',
    '................',
  ],
  shotgun: [
    '................',
    '...............k',
    'wwwkkkkkkkkkkkkk',
    'wwwwkkkkkkkkkkkk',
    'wwww.k..hhhhh...',
    'www..kk.hhhhh...',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
};

function Sprite({ id }: { id: string }) {
  const rows = SPRITES[id] ?? [];
  return (
    <svg viewBox="0 0 16 12" className="room-sprite" shapeRendering="crispEdges" aria-hidden="true">
      {rows.flatMap((row, y) =>
        row.split('').map((ch, x) => (PALETTE[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={PALETTE[ch]} /> : null))
      )}
    </svg>
  );
}

export default function Hotbar({ arsenal, visible, inRange }: { arsenal: Arsenal; visible: boolean; inRange: boolean }) {
  const s = useSyncExternalStore(arsenal.subscribe, arsenal.snapshot, arsenal.snapshot);
  const held = WEAPONS[s.slot].kind === 'hand' || s.owned.includes(WEAPONS[s.slot].id) ? WEAPONS[s.slot] : WEAPONS[0];
  const ammo = held.mag ? s.ammo[held.id] : undefined;
  const [nameOn, setNameOn] = useState(false);
  const markerRef = useRef<HTMLDivElement>(null);

  // Minecraft: the held item's name shows above the hotbar for a moment after switching
  useEffect(() => {
    if (!visible) return undefined;
    setNameOn(true);
    const t = window.setTimeout(() => setNameOn(false), 1600);
    return () => window.clearTimeout(t);
  }, [s.switchSeq, visible]);

  useEffect(() => {
    const el = markerRef.current;
    if (!el || s.hit.seq === 0) return;
    el.className = 'room-hitmarker';
    void el.offsetWidth;
    el.className = `room-hitmarker is-${s.hit.kind}`;
  }, [s.hit]);

  useEffect(() => {
    document.documentElement.style.setProperty('--room-bloom', String(s.bloom));
  }, [s.bloom]);
  // aiming down sights: the sights are the crosshair
  useEffect(() => {
    document.documentElement.toggleAttribute('data-room-ads', s.ads && visible);
    return () => document.documentElement.removeAttribute('data-room-ads');
  }, [s.ads, visible]);

  const st = s.stats;
  const acc = st.shots ? Math.round((st.hits / st.shots) * 100) : 0;
  const hs = st.hits ? Math.round((st.heads / st.hits) * 100) : 0;

  return (
    <div className={`room-combat${visible ? ' is-on' : ''}`} aria-hidden={!visible}>
      <div ref={markerRef} className="room-hitmarker" />

      <div className={`room-session ${hud.className}${inRange || st.shots > 0 ? ' is-on' : ''}`}>
        <div><strong>{st.kills}</strong><span>Kills</span></div>
        <div><strong>{acc}<small>%</small></strong><span>Accuracy</span></div>
        <div><strong>{hs}<small>%</small></strong><span>Headshots</span></div>
        <div><strong>{st.best}</strong><span>Best streak</span></div>
      </div>

      <div className={`room-weaponhud ${hud.className}${held.kind === 'hand' ? '' : ' is-on'}`}>
        <span className="room-weaponhud-name">{held.name}</span>
        {ammo ? (
          <span className={`room-weaponhud-ammo${ammo.mag === 0 ? ' is-empty' : ''}`}>
            <strong>{ammo.mag}</strong>
            <span>{ammo.reserve}</span>
          </span>
        ) : (
          <span className="room-weaponhud-ammo is-melee">
            <strong>—</strong>
          </span>
        )}
        {s.reloading && <i className="room-weaponhud-bar" style={{ ['--reload' as string]: `${s.reloadDur}s` }} />}
        {!s.reloading && ammo && ammo.mag === 0 && <em>R to reload</em>}
      </div>

      <div className={`room-hotbar-wrap ${pixel.className}`}>
        <div className={`room-itemname${nameOn && held.kind !== 'hand' ? ' is-on' : ''}`}>{held.name}</div>
        <div className="room-hotbar" role="toolbar" aria-label="Hotbar">
          {WEAPONS.map((w, i) => {
            const has = w.kind === 'hand' || s.owned.includes(w.id);
            const a = s.ammo[w.id];
            return (
              <button
                key={w.id}
                type="button"
                className={`room-slot${i === s.slot ? ' is-selected' : ''}${has ? ' has-item' : ''}`}
                onClick={() => arsenal.select(i)}
                title={has ? `${i + 1} · ${w.name}` : `${i + 1} · empty`}
                tabIndex={-1}
              >
                {has && <Sprite id={w.id} />}
                {has && a && w.mag && <span className="room-slot-count">{a.mag}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
