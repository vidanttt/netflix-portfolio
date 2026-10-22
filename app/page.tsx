'use client';

import { memo, useState, useEffect, useCallback, useMemo, useRef, type ComponentProps } from 'react';
import { useRouter } from 'next/navigation';
import ProfileCard from './components/ProfileCard';
import NetflixLoader from './components/NetflixLoader';
import ParticleText from '@/components/ParticleText';
import type { RoomCamera, RoomControl } from '@/components/GridScan';
import GridScan, { lockPointer, TRAIN_FRONT, TRAIN_GAP_H, TRAIN_GAP_HALF } from '@/components/GridScan';
import WeaponView, { type WeaponViewApi } from './components/room/WeaponView';
import Hotbar from './components/room/Hotbar';
import RangeWorld, { type RangeWorldApi } from './components/room/RangeWorld';
import { Arsenal, type WorldHit } from './components/room/arsenal';
import { WEAPONS, weaponById } from './components/room/weapons';
import { doorwayPolygon, polygonCss, screenCtx } from './components/room/place';
import { ROOM_DOORS, DOOR_HEIGHT, doorLayout } from './roomDoors';
import RoomTablet, { DEFAULT_ROOM_SETTINGS, ROOM_THEMES, RoomMusicConsole, type RoomSettings } from './components/RoomTablet';
import {
  playClick,
  playDoor,
  playJump,
  playLand,
  playStep,
  playSwitch,
  setRoomMuted,
  setRoomVolume,
  unlockRoomAudio,
} from '@/lib/roomAudio';
import { usePageTransition } from '@/components/TransitionProvider';

interface Profile {
  id: string;
  name: string;
  avatar: string;
  color: string;
  /** rgb triplet of the light this profile gives off when hovered */
  glow: string;
  /** colours the room's grid takes on while this profile is hovered */
  grid: { lines: string; scan: string };
  isKidsProfile?: boolean;
}

const profiles: Profile[] = [
  {
    id: 'developer',
    name: 'Developer',
    avatar: '/blue-profile.png',
    color: 'from-blue-600 to-cyan-600',
    glow: '64,140,255',
    grid: { lines: '#4b5f8e', scan: '#7fb3ee' },
  },
  // {
  //   id: 'artist',
  //   name: 'Artist',
  //   avatar: '/yellow-profile.png',
  //   color: 'from-purple-600 to-pink-600'
  // },
  // {
  //   id: 'entrepreneur',
  //   name: 'Entrepreneur',
  //   avatar: '/grey-profile.png',
  //   color: 'from-green-600 to-emerald-600'
  // },
  {
    id: 'creator',
    name: 'Creator',
    avatar: '/red-profile.png',
    color: 'from-orange-600 to-red-600',
    glow: '255,72,48',
    grid: { lines: '#8b5651', scan: '#ee8e7e' },
  },
];


const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (c: number[]) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** Eases between two grid palettes so the room's light fades rather than snaps. */
function useGridColors(target: { lines: string; scan: string }) {
  const [colors, setColors] = useState(target);
  const current = useRef({ lines: hexToRgb(target.lines), scan: hexToRgb(target.scan) });
  useEffect(() => {
    const goal = { lines: hexToRgb(target.lines), scan: hexToRgb(target.scan) };
    let raf = 0;
    const tick = () => {
      let moving = false;
      (['lines', 'scan'] as const).forEach((k) => {
        current.current[k] = current.current[k].map((v, i) => {
          const d = goal[k][i] - v;
          if (Math.abs(d) > 0.6) moving = true;
          return Math.abs(d) > 0.6 ? v + d * 0.14 : goal[k][i];
        }) as [number, number, number];
      });
      setColors({ lines: rgbToHex(current.current.lines), scan: rgbToHex(current.current.scan) });
      if (moving) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target.lines, target.scan]);
  return colors;
}

/* The room's colour fades towards the hovered profile's colours. The fade ticks every frame for
   about a second, so it lives in its own small component: only the grid re-renders, not the
   whole page (re-rendering every card mid-turn in first person is what left ghost frames). */
const RoomGrid = memo(function RoomGrid({
  target,
  ...props
}: { target: { lines: string; scan: string } } & ComponentProps<typeof GridScan>) {
  const colors = useGridColors(target);
  return <GridScan linesColor={colors.lines} scanColor={colors.scan} {...props} />;
});

export default function Home() {
  const [showLoader, setShowLoader] = useState(false);
  const router = useRouter();
  const { startTransition } = usePageTransition();

  // The three content layers sit at different depths inside the grid "room". GridScan
  // reports its camera offset every frame (-1..1, x right / y up); each layer moves the
  // way real objects behind a window would when the viewer's head moves, and leans
  // toward the viewpoint, so the heading, profiles and button feel placed in the room.
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hovered = profiles.find((p) => p.id === hoveredId);
  // (the chosen room theme replaces the resting colours; a hovered profile still tints the room)
  const headingLayer = useRef<HTMLDivElement>(null);
  const profilesLayer = useRef<HTMLDivElement>(null);
  const boredLayer = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const h2Ref = useRef<HTMLHeadingElement>(null);
  const accordionRef = useRef<HTMLDivElement>(null);
  const boredBtnRef = useRef<HTMLButtonElement>(null);
  // Shadows lying on the floor of the grid room, one per object
  const floorHeading = useRef<HTMLDivElement>(null);
  const floorCards = useRef<HTMLDivElement>(null);
  const floorButton = useRef<HTMLDivElement>(null);
  const textWidth = useRef(480);
  // first-person walk through the grid room
  const [fps, setFps] = useState(false);
  const roomCanvas = () => document.querySelector<HTMLCanvasElement>('canvas[data-gridscan]');
  const enterRoom = () => {
    // pointer lock (and sound) have to be asked for inside the click itself
    lockPointer(roomCanvas());
    unlockRoomAudio();
    setFps(true);
  };
  const leaveRoom = useCallback(() => {
    setFps(false);
    setOpenDoor(-1);
    setDoorCard(null);
    setTabletOpen(false);
  }, []);
  // doors on the side walls (edit app/roomDoors.ts)
  const doorSpots = useMemo(() => doorLayout(ROOM_DOORS), []);
  const [openDoor, setOpenDoor] = useState(-1);
  const [doorCard, setDoorCard] = useState<number | null>(null);
  const signRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hudRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const aimDoor = useRef(-1);
  const lockWorks = useRef(false);
  // the tablet (Tab in first person) and the settings it edits, kept between visits
  const [tabletOpen, setTabletOpen] = useState(false);
  const [roomSettings, setRoomSettings] = useState<RoomSettings>(DEFAULT_ROOM_SETTINGS);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('room-settings') || 'null');
      if (saved) setRoomSettings({ ...DEFAULT_ROOM_SETTINGS, ...saved });
    } catch {
      /* storage unavailable */
    }
  }, []);
  const updateRoom = useCallback((patch: Partial<RoomSettings>) => {
    setRoomSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem('room-settings', JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);
  useEffect(() => {
    setRoomVolume(roomSettings.effects);
    setRoomMuted(roomSettings.muted);
  }, [roomSettings.effects, roomSettings.muted]);
  const theme = ROOM_THEMES.find((t) => t.id === roomSettings.theme) ?? ROOM_THEMES[0];
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // weapons and the training range behind the spawn wall
  const controlRef = useRef<RoomControl | null>(null);
  const weaponApi = useRef<WeaponViewApi | null>(null);
  const worldRef = useRef<RangeWorldApi | null>(null);
  const arsenal = useMemo(() => new Arsenal(), []);
  const benchAim = useRef<string | null>(null);
  const lastCamTime = useRef(0);
  const [inRange, setInRange] = useState(false);
  const inRangeRef = useRef(false);
  const rangeSignRef = useRef<HTMLDivElement>(null);
  const onStep = useCallback((kind: 'step' | 'jump' | 'land', amount: number) => {
    if (kind === 'step') playStep(amount);
    else if (kind === 'land') playLand(amount);
    else playJump();
  }, []); // once the mouse has been captured, a click while free only recaptures it
  const camBlend = useRef(0);
  const aimed = useRef<HTMLElement | null>(null);
  const aimedProfile = useRef<string | null>(null);
  const actions = useRef<{ item: (item: string, el: HTMLElement | null) => void; profile: (id: string) => void; bored: () => void }>({
    item: () => {},
    profile: () => {},
    bored: () => {},
  });

  const setAim = (target: HTMLElement | null) => {
    if (aimed.current === target) return;
    aimed.current?.classList.remove('is-aimed');
    target?.classList.add('is-aimed');
    aimed.current = target;
    const id = target?.dataset.profileId ?? null;
    if (id !== aimedProfile.current) {
      aimedProfile.current = id;
      setHoveredId(id);
    }
  };

  /* First person: the heading, the profiles and the Bored button stay in the room as floating
     panels. Each one keeps the spot it has in the normal view (same depth, size and lift that
     handleEye uses) and is drawn with the exact camera the grid is drawn with, so they never
     slip against the room, from the first frame of the fly-in to walking around them. */
  const handleCamera = useCallback((cam: RoomCamera) => {
    const stage = stageRef.current;
    if (!stage) return;
    const was = camBlend.current;
    camBlend.current = cam.blend;
    aimDoor.current = cam.aimDoor;
    const shadows = [floorHeading.current, floorCards.current, floorButton.current];
    const layers: [HTMLDivElement | null, number, number, number][] = [
      [headingLayer.current, 0.62, 0.8, -0.05],
      [profilesLayer.current, 0.5, 0.84, 0],
      [boredLayer.current, 0.4, 0.9, 0.035],
    ];
    const signs = signRefs.current;
    const dt = Math.min(0.05, Math.max(0, cam.time - lastCamTime.current));
    lastCamTime.current = cam.time;
    // weapons follow the body: bob, sway, sprint, spread
    arsenal.setMotion(cam.speed, cam.grounded);
    arsenal.update(dt);
    weaponApi.current?.setMotion({ speed: cam.speed, grounded: cam.grounded, sprint: cam.sprinting, turn: cam.turnRate });
    const nowInRange = cam.room === 1;
    if (nowInRange !== inRangeRef.current) {
      inRangeRef.current = nowInRange;
      setInRange(nowInRange);
    }
    if (cam.blend <= 0) {
      if (was > 0) {
        // back in the normal view: hand the layers back to handleEye
        stage.style.perspective = `${(1.25 * window.innerHeight).toFixed(0)}px`;
        stage.style.perspectiveOrigin = '';
        stage.style.clipPath = '';
        worldRef.current?.update(cam, dt, { visible: false, clip: null, above: false });
        if (rangeSignRef.current) rangeSignRef.current.style.visibility = 'hidden';
        layers.forEach(([el]) => {
          if (!el) return;
          el.style.visibility = '';
          el.style.opacity = '';
        });
        signs.forEach((el) => el && (el.style.visibility = 'hidden'));
        setAim(null);
      }
      return;
    }
    shadows.forEach((el) => el && (el.style.opacity = '0'));

    const F = 1.25;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const box = stage.getBoundingClientRect();
    // the camera's centre of projection on screen
    const ox = W / 2 + cam.shift[0] * H;
    const oy = H / 2 - cam.shift[1] * H;
    stage.style.perspective = `${(cam.focal * H).toFixed(2)}px`;
    stage.style.perspectiveOrigin = `${(ox - box.left).toFixed(2)}px ${(oy - box.top).toFixed(2)}px`;
    const [r, u, f] = [cam.right, cam.up, cam.forward];
    const C = cam.pos;
    const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

    /* Put an element into the room as a flat panel: centre P (room units), its own right / down /
       out axes, and how many screen pixels one of its CSS pixels spans (kpx). It is drawn with the
       grid's camera. Panels fade out before any corner reaches the camera: a corner behind it is
       what used to smear them across the screen when turning fast or walking close. */
    const place = (el: HTMLElement, P: number[], ax: number[], ay: number[], az: number[], kpx: number, alpha = 1) => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const unit = kpx / H;
      let nearest = Infinity;
      // which sides of the screen every corner is beyond (all four past the same edge = off-screen)
      let outside = 0b1111;
      const halfW = W / H / 2 + 0.05;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const q = [0, 1, 2].map((i) => P[i] + ax[i] * sx * w * 0.5 * unit + ay[i] * sy * h * 0.5 * unit - C[i]);
        const zc = dot(f, q);
        nearest = Math.min(nearest, zc);
        if (zc <= 0) {
          outside = 0;
          continue;
        }
        const x = (dot(r, q) / zc) * cam.focal + cam.shift[0];
        const y = (dot(u, q) / zc) * cam.focal + cam.shift[1];
        outside &= (x < -halfW ? 1 : 0) | (x > halfW ? 2 : 0) | (y < -0.55 ? 4 : 0) | (y > 0.55 ? 8 : 0);
      }
      const t01 = Math.min(1, Math.max(0, (nearest - 0.03) / 0.09));
      const near = t01 * t01 * (3 - 2 * t01);
      // off-screen panels are skipped entirely: drawing them at huge projected sizes mid-turn
      // is what made the browser show stale frames
      if (near * alpha <= 0.002 || outside) {
        // opacity as well: it applies to everything inside, even a child still finishing a
        // transition, so nothing can linger on screen once the panel is gone
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
        return;
      }
      el.style.visibility = 'visible';
      el.style.opacity = (near * alpha).toFixed(3);
      const cx = box.left + el.offsetLeft + w / 2;
      const cy = box.top + el.offsetTop + h / 2;
      const d = [P[0] - C[0], P[1] - C[1], P[2] - C[2]];
      const col = (a: number[]) => [kpx * dot(r, a), -kpx * dot(u, a), -kpx * dot(f, a)];
      const [cx1, cy1, cz1] = [col(ax), col(ay), col(az)];
      const t = [dot(r, d) * H - (cx - ox), -dot(u, d) * H - (cy - oy), -dot(f, d) * H + cam.focal * H];
      const m = [...cx1, 0, ...cy1, 0, ...cz1, 0, ...t, 1];
      el.style.transform = `matrix3d(${m.map((v) => +v.toFixed(5)).join(',')})`;
    };

    // the heading, the profiles and the Bored button keep their spots from the normal view
    layers.forEach(([el, z, size, lift], i) => {
      if (!el) return;
      const cx = box.left + el.offsetLeft + el.offsetWidth / 2;
      const cy = box.top + el.offsetTop + el.offsetHeight / 2;
      const hover = Math.sin(cam.time * 0.9 + i * 1.7) * 0.012 * cam.blend; // a slow float
      const P = [(cx - W / 2) / H, -(cy - H / 2) / H - (lift * (z + F)) / F + hover, z];
      place(el, P, [1, 0, 0], [0, -1, 0], [0, 0, -1], (size * (z + F)) / F);
    });

    // a sign above every door, flat on the wall
    const half = (0.5 * W) / H;
    doorSpots.forEach((spot, i) => {
      const el = signs[i];
      if (!el) return;
      const P = [spot.side * (half - 0.003), -0.5 + DOOR_HEIGHT + 0.115, spot.z];
      const ax = spot.side < 0 ? [0, 0, 1] : [0, 0, -1];
      const az = [-spot.side, 0, 0];
      place(el, P, ax, [0, -1, 0], az, 0.00125 * H, cam.blend);
      el.classList.toggle('is-aimed', cam.aimDoor === i);
    });

    // the training range: drawn in its own layer; each room's content is only visible from the
    // other room through the doorway (clipped to it on screen)
    const ctx = screenCtx(cam);
    const world = worldRef.current;
    if (cam.trainOpen) {
      const door = doorwayPolygon(ctx, TRAIN_FRONT, TRAIN_GAP_HALF, TRAIN_GAP_H);
      // standing in the doorway itself the opening has no shape on screen: draw the hall whole
      const p = cam.pos;
      const inDoorway =
        !door && p[2] - TRAIN_FRONT < 0.04 && Math.abs(p[0]) < TRAIN_GAP_HALF && p[1] + 0.5 < TRAIN_GAP_H;
      if (cam.room === 1 || inDoorway) {
        stage.style.clipPath = polygonCss(door, box.left, box.top);
        world?.update(cam, dt, { visible: true, clip: null, above: true });
      } else {
        stage.style.clipPath = '';
        world?.update(cam, dt, { visible: !!door, clip: polygonCss(door), above: false });
      }
      if (rangeSignRef.current) {
        place(rangeSignRef.current, [0, -0.5 + TRAIN_GAP_H + 0.1, TRAIN_FRONT + 0.003], [-1, 0, 0], [0, -1, 0], [0, 0, 1], 0.0011 * H, cam.blend);
      }
    } else {
      stage.style.clipPath = '';
      world?.update(cam, dt, { visible: false, clip: null, above: false });
      if (rangeSignRef.current) rangeSignRef.current.style.visibility = 'hidden';
    }

    // things to play with: the music console and the light switch by the entrance, and three
    // stat holograms near the back wall that turn slowly in the air
    const items = itemRefs.current;
    const wall = half - 0.004;
    if (items.music) place(items.music, [-wall, 0.02, -0.38], [0, 0, 1], [0, -1, 0], [1, 0, 0], 0.0011 * H, cam.blend);
    if (items.lights) place(items.lights, [wall, 0.0, -0.38], [0, 0, -1], [0, -1, 0], [-1, 0, 0], 0.0011 * H, cam.blend);
    ['stat0', 'stat1', 'stat2'].forEach((key, i) => {
      const el = items[key];
      if (!el) return;
      const a = Math.sin(cam.time * 0.5 + i * 2.1) * 0.35;
      const x = Math.max(-half + 0.2, Math.min(half - 0.2, (i - 1) * 0.46));
      const y = 0.02 + Math.sin(cam.time * 0.8 + i) * 0.015;
      place(el, [x, y, 2.5], [Math.cos(a), 0, -Math.sin(a)], [0, -1, 0], [-Math.sin(a), 0, -Math.cos(a)], 0.0012 * H, cam.blend);
    });

    // aim: whatever sits under the crosshair behaves as if hovered
    let label = '';
    benchAim.current = null;
    if (cam.blend > 0.9 && cam.room === 1 && world && controlRef.current) {
      const aim = controlRef.current.aim();
      const id = world.aimItem(aim.o, aim.d);
      if (id !== benchAim.current && id) playClick(1.3);
      benchAim.current = id;
      if (id) label = `E  ·  Pick up ${weaponById(id).name}`;
    }
    if (cam.blend > 0.9 && !label) {
      const hit = document.elementFromPoint(W / 2, H / 2) as HTMLElement | null;
      const target = hit?.closest<HTMLElement>('.profile-item, .bored-btn, [data-room-item]') ?? null;
      if (target !== aimed.current && target) playClick(1.4); // a faint tick as the crosshair finds something
      setAim(target);
      if (target?.dataset.label) label = target.dataset.label;
      else if (target) label = target.dataset.profileId ? `Open ${target.dataset.profileId}` : 'Are you bored?';
      else if (cam.aimDoor >= 0) label = `Enter · ${ROOM_DOORS[cam.aimDoor]?.title ?? ''}`;
    } else {
      setAim(null);
    }
    if (promptRef.current && promptRef.current.dataset.label !== label) {
      promptRef.current.dataset.label = label;
      promptRef.current.textContent = label;
      promptRef.current.classList.toggle('is-on', !!label);
    }
    if (cam.locked) lockWorks.current = true;
    hudRef.current?.classList.toggle('is-unlocked', !cam.locked && lockWorks.current);
  }, [doorSpots, arsenal]);

  // weapons: hook the arsenal up to the view, the room and the range
  useEffect(() => {
    arsenal.view = weaponApi.current;
    arsenal.control = controlRef.current;
    arsenal.hooks = {
      traceWorld: (o, d, maxT = 40) => {
        const ctrl = controlRef.current;
        const world = worldRef.current;
        if (!ctrl) return null;
        const toGap = (o2: number[]) => (Math.abs(d[2]) > 1e-6 ? (TRAIN_FRONT - o2[2]) / d[2] : -1);
        const inGap = (p: number[]) => Math.abs(p[0]) < TRAIN_GAP_HALF && p[1] + 0.5 < TRAIN_GAP_H;
        if (o[2] < TRAIN_FRONT) {
          // from the hall: its geometry and bots first, then out through the doorway
          const h = world?.raycast(o, d, maxT);
          if (h) return { ...h, surface: 'range' } as WorldHit;
          const t = toGap(o);
          if (t > 0) {
            const g = [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
            if (inGap(g) && t < maxT) {
              const m = ctrl.trace([g[0], g[1], g[2] + 1e-4], d);
              if (t + m.t < maxT) return { t: t + m.t, point: [m.x, m.y, m.z], surface: 'main' };
            }
          }
          return null;
        }
        const m = ctrl.trace(o, d);
        if (m.z < TRAIN_FRONT - 1e-5 && world) {
          // went through the doorway into the hall
          const t = toGap(o);
          const g = [o[0] + d[0] * t, o[1] + d[1] * t, TRAIN_FRONT - 1e-4];
          const h = world.raycast(g, d, maxT - t);
          return h ? ({ ...h, t: t + h.t, surface: 'range' } as WorldHit) : null;
        }
        return m.t < maxT ? { t: m.t, point: [m.x, m.y, m.z], surface: 'main' } : null;
      },
      damageBot: (id, amount, head, point) => worldRef.current?.damage(id, amount, head, point) ?? false,
      impact: (hit, kind) => {
        if (hit.surface === 'range') worldRef.current?.impact({ t: hit.t, point: hit.point, normal: hit.normal ?? [0, 1, 0] }, kind);
        else controlRef.current?.impact(hit.point[0], hit.point[1], hit.point[2]);
      },
    };
  });
  useEffect(() => {
    worldRef.current?.setTheme(theme.scan);
  });
  // development only: a handle for automated play-throughs (stripped from production builds)
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __roomDebug?: unknown }).__roomDebug = { arsenal, controlRef, worldRef };
  });
  useEffect(() => {
    weaponApi.current?.setTint(theme.scan);
  }, [theme.scan]);
  useEffect(() => {
    const on = fps && !tabletOpen && openDoor < 0;
    arsenal.setEnabled(on);
    if (!fps) {
      // back to the normal page: empty hands, weapons back on the bench
      arsenal.reset();
      worldRef.current?.restoreAll();
    }
    // the floating music player would sit right where the weapons are: hide it while playing
    if (fps) document.documentElement.setAttribute('data-room-fps', '');
    else document.documentElement.removeAttribute('data-room-fps');
  }, [fps, tabletOpen, openDoor, arsenal]);

  // weapon controls: 1-9 / scroll to switch, click to fire, right click to aim (or stab),
  // R reload, F inspect
  useEffect(() => {
    if (!fps || openDoor >= 0 || tabletOpen) return undefined;
    let wheelAt = 0;
    const onDown = (event: MouseEvent) => {
      if (lockWorks.current && !document.pointerLockElement) return;
      if (event.button === 0 && arsenal.armed) arsenal.setTrigger(true);
      if (event.button === 2) arsenal.setAlt(true);
    };
    const onUp = (event: MouseEvent) => {
      if (event.button === 0) arsenal.setTrigger(false);
      if (event.button === 2) arsenal.setAlt(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const n = Number(event.key);
      if (n >= 1 && n <= WEAPONS.length) arsenal.select(n - 1);
      else if (event.code === 'KeyR') arsenal.reload();
      else if (event.code === 'KeyF') arsenal.inspect();
    };
    const onWheel = (event: WheelEvent) => {
      const now = performance.now();
      if (now - wheelAt < 90 || Math.abs(event.deltaY) < 4) return;
      wheelAt = now;
      arsenal.cycle(event.deltaY > 0 ? 1 : -1);
    };
    const noMenu = (event: MouseEvent) => event.preventDefault();
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('contextmenu', noMenu);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('contextmenu', noMenu);
      arsenal.setTrigger(false);
      arsenal.setAlt(false);
    };
  }, [fps, openDoor, tabletOpen, arsenal]);

  const enterDoor = useCallback((i: number) => {
    setOpenDoor(i);
    // let the room know it is paused before the mouse is released, so that doesn't end first person
    window.setTimeout(() => {
      if (document.pointerLockElement) document.exitPointerLock();
    }, 30);
    window.setTimeout(() => setDoorCard(i), 650);
  }, []);

  const closeDoor = () => {
    playDoor(false);
    setDoorCard(null);
    setOpenDoor(-1);
    lockPointer(roomCanvas());
  };

  const followDoor = (i: number) => {
    const href = ROOM_DOORS[i]?.href;
    if (!href) return;
    if (href.startsWith('/')) {
      setDoorCard(null);
      startTransition();
      router.push(href);
    } else if (href.startsWith('mailto:')) {
      window.location.href = href;
    } else {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  // Esc closes a door's card
  useEffect(() => {
    if (doorCard === null) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Escape') return;
      setDoorCard(null);
      setOpenDoor(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doorCard]);

  // click while aiming at a profile or the Bored button opens it
  useEffect(() => {
    if (!fps || openDoor >= 0 || tabletOpen) return undefined;
    const use = () => {
      // the click that recaptures the mouse shouldn't also open whatever is under the crosshair
      if (lockWorks.current && !document.pointerLockElement) return;
      const benchItem = benchAim.current;
      if (benchItem) {
        worldRef.current?.take(benchItem);
        arsenal.give(benchItem);
        benchAim.current = null;
        return;
      }
      const target = aimed.current;
      const item = target?.dataset.roomItem;
      if (item) {
        actions.current.item(item, target);
        return;
      }
      if (target) {
        if (document.pointerLockElement) document.exitPointerLock();
        if (target.dataset.profileId) actions.current.profile(target.dataset.profileId);
        else actions.current.bored();
        return;
      }
      if (aimDoor.current >= 0) {
        playDoor(true);
        enterDoor(aimDoor.current);
      }
    };
    const onDown = (event: PointerEvent) => {
      if (event.button === 0 && !arsenal.armed) use();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'KeyE' && !event.repeat) use();
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [fps, openDoor, tabletOpen, enterDoor, arsenal]);

  // Tab: hold the tablet up (frees the mouse) or put it away (captures it again)
  useEffect(() => {
    if (!fps) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Tab' && doorCard === null) {
        event.preventDefault();
        if (tabletOpen) {
          setTabletOpen(false);
          lockPointer(roomCanvas());
        } else {
          setTabletOpen(true);
          window.setTimeout(() => {
            if (document.pointerLockElement) document.exitPointerLock();
          }, 30);
        }
        playClick(tabletOpen ? 0.8 : 1.1);
      } else if (event.code === 'Escape' && tabletOpen) {
        setTabletOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fps, tabletOpen, doorCard]);
  // iOS only hands out gyroscope data after an explicit tap, so offer one
  const [needMotion, setNeedMotion] = useState(false);
  useEffect(() => {
    const D = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
    if (typeof D?.requestPermission === 'function' && window.matchMedia('(pointer: coarse)').matches) setNeedMotion(true);
  }, []);
  const askMotion = () => {
    const D = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    D.requestPermission?.().catch(() => {}).finally(() => setNeedMotion(false));
  };
  /* The room, in the grid's own units (screen height = 1, screen plane at z = 0, back wall at
     z = 3, floor at y = -0.5, eye F in front of the screen). A point at depth z that the eye
     looks at from offset (ex, ey) shows up on the screen at
         x = ex * z / (z + F)      y = ey + (y0 - ey) * F / (z + F)
     which is what the grid itself draws, so the objects and their shadows move exactly with it
     (far things follow the eye more, things on the screen plane not at all). */
  const handleEye = useCallback((nx: number, ny: number) => {
    const F = 1.25;
    nx = Math.max(-0.8, Math.min(0.8, nx));
    ny = Math.max(-0.8, Math.min(0.8, ny));
    const W = window.innerWidth;
    const H = window.innerHeight;
    const eyeX = nx * 0.22 * Math.max(W / H, 0.95); // eye offset, in screen-heights
    const eyeY = ny * 0.22;

    // [layer, depth behind the screen in screen-heights, lean in degrees, size it should appear at]
    // Depth places the object (and its floor shadow) in the room; the extra scale keeps it a
    // gentle "a bit back" instead of shrinking to the full perspective size.
    // last number: resting vertical offset (fraction of screen height) that undoes the layers
    // crowding each other when they are scaled toward the centre
    const layers: [HTMLDivElement | null, number, number, number, number][] = [
      [headingLayer.current, 0.62, 3, 0.8, -0.05],
      [profilesLayer.current, 0.5, 5, 0.84, 0],
      [boredLayer.current, 0.4, 7, 0.9, 0.035],
    ];
    if (camBlend.current > 0) return; // first person: handleCamera places everything
    for (const [el, z, lean, size, lift] of layers) {
      if (!el) continue;
      // translateZ pushes the layer back; the translate is divided by the perspective scale
      // CSS will apply (F / (z + F)), leaving exactly eye * z / (z + F) on screen.
      const dx = (eyeX * H * z) / F;
      const dy = (-eyeY * H * z) / F + (lift * H * (z + F)) / F;
      el.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, ${(-z * H).toFixed(1)}px) rotateY(${(-nx * lean).toFixed(2)}deg) rotateX(${(-ny * lean).toFixed(2)}deg) scale(${(size / (F / (z + F))).toFixed(4)})`;
    }

    // Shadows: the point on the floor straight below each object.
    const floor: [HTMLDivElement | null, number, number, number, number][] = [
      // [shadow, depth, width px on screen, opacity, blur px]
      [floorHeading.current, 0.62, textWidth.current * 0.8, 0.45, 14],
      [floorCards.current, 0.5, accordionRef.current ? accordionRef.current.getBoundingClientRect().width * 0.96 : 600, 0.62, 12],
      [floorButton.current, 0.4, boredBtnRef.current ? boredBtnRef.current.getBoundingClientRect().width * 0.9 : 220, 0.6, 9],
    ];
    for (const [el, z, width, opacity, blur] of floor) {
      if (!el) continue;
      const yUp = eyeY + (-0.5 - eyeY) * (F / (z + F));
      const x = W / 2 + eyeX * H * (z / (z + F));
      const y = H / 2 - yUp * H;
      const height = Math.max(10, width * 0.13); // the floor is seen at a grazing angle
      el.style.width = `${width.toFixed(1)}px`;
      el.style.height = `${height.toFixed(1)}px`;
      el.style.transform = `translate3d(${(x - width / 2).toFixed(2)}px, ${(y - height / 2).toFixed(2)}px, 0)`;
      el.style.opacity = opacity.toFixed(2);
      el.style.filter = `blur(${blur}px)`;
    }
  }, []);

  // Keep the CSS perspective equal to the room's eye distance (F * screen height), and
  // remember how wide the heading text is for its shadow.
  useEffect(() => {
    const fit = () => {
      const H = window.innerHeight;
      if (stageRef.current) stageRef.current.style.perspective = `${(1.25 * H).toFixed(0)}px`;
      const h2 = h2Ref.current;
      if (h2) {
        const range = document.createRange();
        range.selectNodeContents(h2);
        textWidth.current = range.getBoundingClientRect().width || 480;
      }
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Check if this is the first visit in this session
  useEffect(() => {
    const hasSeenLoader = sessionStorage.getItem('netflixLoaderSeen');
    if (!hasSeenLoader) {
      setShowLoader(true);
    }

    // Add secret key combination to reset loader (Ctrl+Shift+R)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        resetLoaderState();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLoaderComplete = () => {
    setShowLoader(false);
    sessionStorage.setItem('netflixLoaderSeen', 'true');
  };

  const handleProfileSelect = (profile: Profile) => {
    // 1. Show the loading screen overlay (lives in layout, won't unmount)
    startTransition();

    // 2. Navigate immediately — the page loads behind the overlay
    router.push(`/${profile.id}`);
  };

  const handleBoredSelect = () => {
    // 1. Show the loading screen overlay
    startTransition();

    // 2. Navigate immediately to the Bored route
    router.push('/Bored');
  };

  actions.current = {
    item: (item, el) => {
      if (item === 'lights') {
        playSwitch(!roomSettings.lights);
        updateRoom({ lights: !roomSettings.lights });
      } else if (item.startsWith('music-')) {
        playClick(1);
        window.dispatchEvent(new CustomEvent('music:command', { detail: { action: item.slice(6) } }));
      } else if (item === 'stat') {
        playClick(1.2);
        el?.classList.remove('is-popped');
        void el?.offsetWidth; // restart the pop
        el?.classList.add('is-popped');
      }
    },
    profile: (id) => {
      const profile = profiles.find((p) => p.id === id);
      if (profile) handleProfileSelect(profile);
    },
    bored: () => handleBoredSelect(),
  };

  // Function to reset loader state (for testing purposes)
  const resetLoaderState = () => {
    sessionStorage.removeItem('netflixLoaderSeen');
    setShowLoader(true);
  };

  // Show Netflix loader on first load
  if (showLoader) {
    return <NetflixLoader onComplete={handleLoaderComplete} />;
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden"
      style={{ backgroundColor: '#141414' }}
      data-fps={fps ? '' : undefined}
    >
      {/* Animated scanning grid behind the profile picker */}
      <div className="fixed inset-0 z-0">
        <RoomGrid
          target={hovered ? hovered.grid : theme}
          lookPaused={tabletOpen}
          sensitivity={roomSettings.sensitivity}
          fovScale={roomSettings.fov}
          headBob={roomSettings.headBob}
          lights={roomSettings.lights ? 1 : 0}
          onStep={onStep}
          controlRef={controlRef}
          cells={8}
          depth={3}
          scanDuration={2.4}
          scanDelay={1.6}
          clickEffect="ping"
          onEye={handleEye}
          enableGyro
          fps={fps}
          onFpsExit={leaveRoom}
          onCamera={handleCamera}
          doors={doorSpots}
          openDoor={openDoor}
          paused={openDoor >= 0}
        />
        {/* shadows on the floor of the room (positioned every frame from the grid's camera) */}
        <div ref={floorHeading} className="room-shadow" aria-hidden="true" />
        <div ref={floorCards} className="room-shadow" aria-hidden="true" />
        <div ref={floorButton} className="room-shadow" aria-hidden="true" />
        {/* soft vignette so the heading and profiles stay readable over the grid */}
        <div
          className="room-vignette absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(20,20,20,0.15) 0%, rgba(20,20,20,0.7) 100%)' }}
        />
      </div>

      {/* Play: step into the room */}
      <button
        type="button"
        className="room-play"
        onClick={enterRoom}
        onPointerDown={(e) => e.stopPropagation() /* no ping on the wall behind the button */}
        aria-label="Explore the room in first person"
      >
        <span className="room-play-ring" aria-hidden="true" />
        <span className="room-play-ring room-play-ring--late" aria-hidden="true" />
        <span className="room-play-label">Explore the room</span>
        <span className="room-play-disc" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="currentColor" />
          </svg>
        </span>
      </button>

      {/* first-person HUD */}
      <div ref={hudRef} className={`room-hud${tabletOpen ? ' is-tablet' : ''}`} aria-hidden={!fps}>
        <div className="room-crosshair" />
        <div ref={promptRef} className="room-prompt" />
        <div className="room-resume">Click to look around</div>
        <div className="room-keys">
          <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move</span>
          <span><kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> look</span>
          <span><kbd>Space</kbd> jump</span>
          <span><kbd>Shift</kbd> sprint</span>
          <span><kbd>E</kbd> use <i>(click with hands)</i></span>
          <span><kbd>1</kbd>–<kbd>9</kbd> / scroll weapons</span>
          <span><kbd>Click</kbd> fire · <kbd>RMB</kbd> aim</span>
          <span><kbd>R</kbd> reload · <kbd>F</kbd> inspect</span>
          <span><kbd>Tab</kbd> tablet</span>
          <span><kbd>Esc</kbd> exit</span>
        </div>
      </div>

      <WeaponView apiRef={weaponApi} visible={fps} />
      <Hotbar arsenal={arsenal} visible={fps} inRange={inRange} />
      <RangeWorld ref={worldRef} />

      {fps && (
        <RoomTablet
          open={tabletOpen}
          settings={roomSettings}
          onChange={updateRoom}
          onTick={() => playClick(1)}
          onClose={() => {
            setTabletOpen(false);
            lockPointer(roomCanvas());
          }}
          onLeave={() => {
            if (document.pointerLockElement) document.exitPointerLock();
            leaveRoom();
          }}
        />
      )}

      {doorCard !== null && ROOM_DOORS[doorCard] && (
        <div className="room-card-backdrop" onClick={closeDoor}>
          <div
            className="room-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-card-title"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="room-card-tag">{ROOM_DOORS[doorCard].tag}</span>
            <h3 id="room-card-title">{ROOM_DOORS[doorCard].title}</h3>
            <p>{ROOM_DOORS[doorCard].description}</p>
            {ROOM_DOORS[doorCard].stack && (
              <ul className="room-card-stack">
                {ROOM_DOORS[doorCard].stack!.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            <div className="room-card-actions">
              {ROOM_DOORS[doorCard].href && (
                <button type="button" className="room-card-primary" onClick={() => followDoor(doorCard)}>
                  {ROOM_DOORS[doorCard].cta ?? 'Open project'}
                </button>
              )}
              <button type="button" className="room-card-secondary" onClick={closeDoor}>
                Back to the room
              </button>
            </div>
          </div>
        </div>
      )}

      {needMotion && !showLoader && !fps && (
        <button
          type="button"
          onClick={askMotion}
          className="fixed left-1/2 top-4 z-30 -translate-x-1/2 rounded-full border border-white/20 bg-black/55 px-4 py-2 text-xs font-medium tracking-wide text-white/85 backdrop-blur-md"
        >
          Tap to enable tilt
        </button>
      )}

      <div ref={stageRef} className="room-stage relative z-10 w-full max-w-6xl mx-auto text-center" style={{ perspective: '1135px' }}>
        {/* Netflix Logo */}
        {/* <div className="mb-16 animate-fade-in-up opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <h1 className="text-netflix-red text-5xl md:text-7xl font-bold tracking-wide">
            NETFLIX
          </h1>
        </div> */}

        {/* the way into the training range, over the doorway behind the spawn */}
        <div ref={rangeSignRef} className="room-range-sign" aria-hidden="true">
          <span>Behind you</span>
          <strong>Training range</strong>
        </div>

        {/* signs above the doors in first person */}
        {ROOM_DOORS.map((door, i) => (
          <div
            key={door.id}
            ref={(el) => {
              signRefs.current[i] = el;
            }}
            className="room-door-sign"
            aria-hidden="true"
          >
            <span className="room-door-tag">{door.tag}</span>
            <span className="room-door-title">{door.title}</span>
          </div>
        ))}

        {/* things in the room (first person only) */}
        <div ref={(el) => { itemRefs.current.music = el; }} className="room-item room-console" aria-hidden="true">
          <RoomMusicConsole />
        </div>
        <div
          ref={(el) => { itemRefs.current.lights = el; }}
          className={`room-item room-switch${roomSettings.lights ? ' is-on' : ''}`}
          data-room-item="lights"
          data-label={roomSettings.lights ? 'Lights off' : 'Lights on'}
          aria-hidden="true"
        >
          <span className="room-switch-tag">Lights</span>
          <span className="room-switch-rocker"><i /></span>
          <span className="room-switch-state">{roomSettings.lights ? 'On' : 'Off'}</span>
        </div>
        {[
          ['1K+', 'projects delivered'],
          ['1M+', 'total views'],
          ['5+', 'years editing'],
        ].map(([value, label], i) => (
          <div
            key={label}
            ref={(el) => { itemRefs.current[`stat${i}`] = el; }}
            className="room-item room-holo"
            data-room-item="stat"
            data-label={`${value} ${label}`}
            aria-hidden="true"
          >
            <span className="room-holo-inner">
              <strong>{value}</strong>
              <span>{label}</span>
            </span>
          </div>
        ))}

        {/* Who's watching heading */}
        <div ref={headingLayer} style={{ willChange: 'transform' }}>
          <h2
            ref={h2Ref}
            aria-label="Who's Watching?"
            className="text-white mb-10 md:mb-14 animate-fade-in-up opacity-0 h-[120px] md:h-[160px] w-full"
            style={{ animationDelay: '0.3s', animationFillMode: 'forwards', filter: 'drop-shadow(0 14px 22px rgba(0,0,0,0.55))' }}
          >
            <ParticleText
              text="Who's Watching?"
              particleSize={2}
              density={4}
              color="currentColor"
              highlightColor="#e50914"
              highlightMode="motion"
              shape="circle"
              intro="gather"
              scatter={180}
              gatherDuration={1600}
              stagger={420}
              clickBurst
              burstStrength={1}
              pointerRepel={40}
              repelRadius={120}
              idleDrift={0.7}
              trigger="mount"
              fontSize="clamp(3rem, 9vw, 5.75rem)"
              fontWeight={800}
              fontFamily="inherit"
              glow
            />
          </h2>
        </div>

        {/* Profiles Accordion */}
        <div ref={profilesLayer} style={{ willChange: 'transform' }}>
        <div
          ref={accordionRef}
          className="profiles-accordion mb-12 md:mb-16 animate-fade-in-up opacity-0"
          style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}
        >
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="profile-item"
              data-profile-id={profile.id}
              style={{ ['--glow' as string]: profile.glow }}
              onMouseEnter={() => setHoveredId(profile.id)}
              onMouseLeave={() => setHoveredId((id) => (id === profile.id ? null : id))}
              onFocus={() => setHoveredId(profile.id)}
              onBlur={() => setHoveredId((id) => (id === profile.id ? null : id))}
              onClick={() => handleProfileSelect(profile)}
            >
              <div 
                className="profile-bg" 
                style={{ backgroundImage: `url(${profile.avatar})` }}
              />
              <span>{profile.name}</span>
            </div>
          ))}
        </div>
        </div>

        {/* "Are YOU Bored?" Button */}
        <div ref={boredLayer} style={{ willChange: 'transform' }}>
        <div 
          className="flex justify-center mt-12 md:mt-16 animate-fade-in-up opacity-0" 
          style={{ 
            animationDelay: '0.8s', 
            animationFillMode: 'forwards' 
          }}
        >
          <div className="relative" style={{ filter: 'drop-shadow(0 16px 12px rgba(0,0,0,0.5))' }}>
            {/* Hand-drawn "Click!" and dashed arrow on top left */}
            <div className="absolute -top-10 -left-12 rotate-[-15deg] flex flex-col items-center pointer-events-none z-10 opacity-90">
              <span 
                className="text-white text-3xl font-bold tracking-widest" 
                style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", cursive', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
              >
                Click!
              </span>
              <svg width="45" height="45" viewBox="0 0 100 100" className="text-white mt-1 drop-shadow-md">
                <path d="M20,10 Q50,40 80,80" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray="8 6" />
                <path d="M50,80 L80,80 L80,50" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Hand-drawn squiggle doodle under the button */}
            <div className="absolute bottom-2 right-24 rotate-[2deg] pointer-events-none z-10 opacity-60">
              <svg width="100" height="25" viewBox="0 0 100 25" className="text-white drop-shadow-md">
                <path d="M5,12 Q15,2 25,12 T45,12 T65,12 T85,12 T95,7" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <button
              ref={boredBtnRef}
              className="bored-btn"
              onClick={handleBoredSelect}
              aria-label="Are you bored?"
            >
              <span>Are YOU Bored?</span>
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
