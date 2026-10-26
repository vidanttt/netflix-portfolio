'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { RoomCamera } from '@/components/GridScan';
import { BENCH, BENCH_SLOTS, BOT_SPAWNS, BOXES, RANGE, type Box } from '@/lib/rangeLayout';
import { playBotSpawn } from '@/lib/roomAudio';
import { buildWeapon } from './WeaponView';
import { weaponById } from './weapons';

/**
 * The training hall behind the spawn wall, as a real 3D scene drawn with the grid room's camera:
 * the hall itself, platforms, steps, cover, the armory bench with the weapons laid out on it,
 * practice bots that walk, flinch, fall and respawn, bullet marks and sparks.
 *
 * World coordinates are the grid room's (x right, y up, z towards the main room); three.js is
 * right-handed, so z is mirrored on the way in (see `V`).
 */
export type RangeHit = { t: number; point: number[]; normal: number[]; bot?: number; head?: boolean };

export type RangeWorldApi = {
  /** `rect`: the part of the screen to draw (viewport px: x, y, width, height), when the hall is
   *  only seen through the doorway */
  update: (
    cam: RoomCamera,
    dt: number,
    opts: { visible: boolean; clip: string | null; above: boolean; rect?: number[] | null; sealed?: number; fade?: number }
  ) => void;
  raycast: (o: number[], d: number[], maxT?: number) => RangeHit | null;
  damage: (bot: number, amount: number, head: boolean, point: number[]) => boolean;
  impact: (hit: RangeHit, kind?: 'bullet' | 'blade') => void;
  aimItem: (o: number[], d: number[]) => string | null;
  take: (id: string) => void;
  restore: (id: string) => void;
  restoreAll: () => void;
  setTheme: (hex: string) => void;
};

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, -z);
const toWorld = (v: THREE.Vector3) => [v.x, v.y, -v.z];

/* ── textures ───────────────────────────────────────────────────────── */
function gridTexture(base: string, line: string, cells = 8, major = 4, size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  // faint panel noise so surfaces are never flat
  const img = g.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 6;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  const step = size / cells;
  for (let i = 0; i <= cells; i++) {
    const isMajor = i % major === 0;
    g.strokeStyle = line;
    g.globalAlpha = isMajor ? 0.55 : 0.2;
    g.lineWidth = isMajor ? 3 : 1.5;
    g.beginPath();
    g.moveTo(i * step, 0);
    g.lineTo(i * step, size);
    g.moveTo(0, i * step);
    g.lineTo(size, i * step);
    g.stroke();
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function textTexture(lines: { text: string; size: number; color: string; weight?: number; spacing?: number }[], w = 1024, h = 256, bg?: string) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  if (bg) {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const total = lines.reduce((s, l) => s + l.size * 1.15, 0);
  let y = h / 2 - total / 2;
  for (const l of lines) {
    y += (l.size * 1.15) / 2;
    g.font = `${l.weight ?? 700} ${l.size}px Inter, "Segoe UI", system-ui, sans-serif`;
    if ('letterSpacing' in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${l.spacing ?? 0}px`;
    g.fillStyle = l.color;
    g.shadowColor = l.color;
    g.shadowBlur = 18;
    g.fillText(l.text, w / 2, y);
    y += (l.size * 1.15) / 2;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function hazardTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 32;
  const g = c.getContext('2d')!;
  g.fillStyle = '#16171b';
  g.fillRect(0, 0, 256, 32);
  g.fillStyle = '#f2b233';
  for (let x = -32; x < 288; x += 32) {
    g.beginPath();
    g.moveTo(x, 32);
    g.lineTo(x + 16, 32);
    g.lineTo(x + 32, 0);
    g.lineTo(x + 16, 0);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function radialTexture(stops: [number, string][]) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ── bots ───────────────────────────────────────────────────────────── */
type BotRig = {
  root: THREE.Group;
  body: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  skull: THREE.Mesh;
  legs: { thigh: THREE.Group; knee: THREE.Group }[];
  arms: { shoulder: THREE.Group; elbow: THREE.Group }[];
  shell: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  glow: THREE.MeshStandardMaterial;
  bar: THREE.Group;
  barFill: THREE.Mesh;
  pad: THREE.Mesh;
};

type Bot = {
  id: number;
  rig: BotRig;
  x: number;
  y: number;
  z: number;
  vx: number;
  target: number;
  timer: number;
  mode: 'still' | 'strafe' | 'peek';
  range: [number, number];
  hp: number;
  state: 'alive' | 'dying' | 'gone' | 'spawning';
  t: number;
  walk: number;
  flinch: { x: number; v: number };
  headSnap: { x: number; v: number };
  flash: number;
  barT: number;
};

const BOT_H = 0.6;
/** a shot passing this close to the middle of a bot's skull is a headshot */
const HEAD_GIVE = 0.056;

function capsule(r: number, len: number, m: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), m);
  mesh.castShadow = true;
  return mesh;
}
function rbox(w: number, h: number, d: number, r: number, m: THREE.Material) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m);
  mesh.castShadow = true;
  return mesh;
}

function makeBot(accent: THREE.Color): BotRig {
  const shell = new THREE.MeshStandardMaterial({ color: 0xd9dce1, roughness: 0.42, metalness: 0.08, transparent: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x24272e, roughness: 0.55, metalness: 0.5, transparent: true });
  const glow = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 2.2, roughness: 0.3, transparent: true });
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hips = new THREE.Group();
  hips.position.y = 0.29;
  body.add(hips);
  hips.add(rbox(0.12, 0.055, 0.08, 0.02, dark));
  const legs = [-1, 1].map((side) => {
    const thigh = new THREE.Group();
    thigh.position.set(side * 0.042, -0.02, 0);
    hips.add(thigh);
    const t = capsule(0.027, 0.09, shell);
    t.position.y = -0.065;
    thigh.add(t);
    const kneePad = rbox(0.04, 0.035, 0.03, 0.01, dark);
    kneePad.position.set(0, -0.13, -0.016);
    thigh.add(kneePad);
    const knee = new THREE.Group();
    knee.position.y = -0.135;
    thigh.add(knee);
    const s = capsule(0.024, 0.1, shell);
    s.position.y = -0.07;
    knee.add(s);
    const foot = rbox(0.045, 0.026, 0.075, 0.01, dark);
    foot.position.set(0, -0.135, -0.012);
    knee.add(foot);
    return { thigh, knee };
  });
  const torso = new THREE.Group();
  torso.position.y = 0.02;
  hips.add(torso);
  const chest = rbox(0.165, 0.17, 0.1, 0.035, shell);
  chest.position.y = 0.105;
  torso.add(chest);
  const plate = rbox(0.12, 0.09, 0.02, 0.012, dark);
  plate.position.set(0, 0.12, -0.052);
  torso.add(plate);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 24), glow);
  core.rotation.x = Math.PI / 2;
  core.position.set(0, 0.12, -0.064);
  torso.add(core);
  const pack = rbox(0.1, 0.11, 0.04, 0.012, dark);
  pack.position.set(0, 0.11, 0.065);
  torso.add(pack);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.03, 12), dark);
  neck.position.y = 0.205;
  torso.add(neck);
  const head = new THREE.Group();
  head.position.y = 0.215;
  torso.add(head);
  const skull = rbox(0.095, 0.1, 0.1, 0.04, shell);
  skull.position.y = 0.045;
  head.add(skull);
  const visor = rbox(0.078, 0.024, 0.02, 0.009, glow);
  visor.position.set(0, 0.05, -0.048);
  head.add(visor);
  const ear = rbox(0.012, 0.04, 0.04, 0.006, dark);
  ear.position.set(0.05, 0.045, 0);
  head.add(ear);
  const ear2 = ear.clone();
  ear2.position.x = -0.05;
  head.add(ear2);
  const arms = [-1, 1].map((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.1, 0.175, 0);
    torso.add(shoulder);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), dark);
    cap.castShadow = true;
    shoulder.add(cap);
    const u = capsule(0.021, 0.08, shell);
    u.position.y = -0.06;
    shoulder.add(u);
    const elbow = new THREE.Group();
    elbow.position.y = -0.12;
    shoulder.add(elbow);
    const f = capsule(0.019, 0.08, shell);
    f.position.y = -0.055;
    elbow.add(f);
    const fist = rbox(0.03, 0.035, 0.032, 0.01, dark);
    fist.position.y = -0.115;
    elbow.add(fist);
    shoulder.rotation.z = side * 0.12;
    return { shoulder, elbow };
  });
  // health bar over the head (faces the camera)
  const bar = new THREE.Group();
  bar.position.y = BOT_H + 0.07;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.012), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
  bar.add(back);
  const fillGeo = new THREE.PlaneGeometry(0.116, 0.008);
  fillGeo.translate(0.058, 0, 0);
  const barFill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: 0xff7a3a, transparent: true, depthWrite: false }));
  barFill.position.set(-0.058, 0, 0.001);
  bar.add(barFill);
  bar.visible = false;
  root.add(bar);
  // spawn pad on the floor
  const pad = new THREE.Mesh(
    new THREE.RingGeometry(0.09, 0.105, 48),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide })
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.002;
  root.add(pad);
  return { root, body, hips, torso, head, skull, legs, arms, shell, dark, glow, bar, barFill, pad };
}

/* ── the component ──────────────────────────────────────────────────── */
const RangeWorld = forwardRef<RangeWorldApi>(function RangeWorld(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<RangeWorldApi | null>(null);

  useImperativeHandle(ref, () => ({
    update: (...a) => apiRef.current?.update(...a),
    raycast: (...a) => apiRef.current?.raycast(...a) ?? null,
    damage: (...a) => apiRef.current?.damage(...a) ?? false,
    impact: (...a) => apiRef.current?.impact(...a),
    aimItem: (...a) => apiRef.current?.aimItem(...a) ?? null,
    take: (id) => apiRef.current?.take(id),
    restore: (id) => apiRef.current?.restore(id),
    restoreAll: () => apiRef.current?.restoreAll(),
    setTheme: (hex) => apiRef.current?.setTheme(hex),
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return undefined;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch {
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.35;
    scene.fog = new THREE.Fog(0x0b0c10, 4, 11);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 40);

    let accent = new THREE.Color('#7dd3fc');
    const warm = new THREE.Color('#ff8a3d');

    /* lighting: cool fill, a soft key from above that casts the shadows, warm lamps */
    scene.add(new THREE.HemisphereLight(0xc9d6ff, 0x101114, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.copy(V(0.6, 4, -2.5));
    key.target.position.copy(V(0, -0.5, -4.8));
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -3;
    key.shadow.camera.right = 3;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -5;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 10;
    key.shadow.bias = -0.0006;
    key.shadow.radius = 4;
    scene.add(key, key.target);
    const lamps: THREE.PointLight[] = [];
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight(0xffffff, 0.8, 3.2, 1.6);
      l.position.copy(V(i % 2 === 0 ? -1.1 : 1.1, 1.25, -1.9 - i * 1.7));
      scene.add(l);
      lamps.push(l);
    }
    const benchLamp = new THREE.PointLight(0xffb070, 1.4, 1.6, 1.8);
    benchLamp.position.copy(V(-1.75, 0.5, -2.05));
    scene.add(benchLamp);

    /* materials */
    const floorTex = gridTexture('#121318', '#7dd3fc', 8, 4);
    const wallTex = gridTexture('#15161b', '#7dd3fc', 8, 4);
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.62, metalness: 0.12, envMapIntensity: 0.45 });
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.75, metalness: 0.15 });
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x0d0e12, roughness: 0.9 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x2c3038, roughness: 0.42, metalness: 0.65 });
    const metalTop = new THREE.MeshStandardMaterial({ map: gridTexture('#22252c', '#aab4c4', 4, 4, 256), roughness: 0.5, metalness: 0.55 });
    const trim = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.6 });
    const trimWarm = new THREE.MeshStandardMaterial({ color: warm, emissive: warm, emissiveIntensity: 1.6 });
    const hazard = new THREE.MeshStandardMaterial({ map: hazardTexture(), roughness: 0.6 });
    const panelLight = new THREE.MeshStandardMaterial({ color: 0x8e98a6, emissive: 0xdfe9f5, emissiveIntensity: 0.75, roughness: 0.4 });
    const solids: THREE.Object3D[] = [];
    const add = (obj: THREE.Object3D, solid = true) => {
      scene.add(obj);
      if (solid) solids.push(obj);
      return obj;
    };

    /* the hall */
    const W = RANGE.halfW * 2;
    const D = RANGE.front - RANGE.back;
    const Hh = RANGE.ceil - RANGE.floor;
    const midZ = (RANGE.front + RANGE.back) / 2;
    const midY = (RANGE.ceil + RANGE.floor) / 2;
    const plane = (w: number, h: number, m: THREE.Material, repeat?: [number, number]) => {
      let mm = m;
      if (repeat && (m as THREE.MeshStandardMaterial).map) {
        mm = (m as THREE.MeshStandardMaterial).clone();
        const tex = (mm as THREE.MeshStandardMaterial).map!.clone();
        tex.repeat.set(...repeat);
        tex.needsUpdate = true;
        (mm as THREE.MeshStandardMaterial).map = tex;
      }
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mm);
      mesh.receiveShadow = true;
      return mesh;
    };
    const floor = plane(W, D, floorMat, [W / 0.5, D / 0.5]);
    floor.rotation.x = -Math.PI / 2;
    floor.position.copy(V(0, RANGE.floor, midZ));
    add(floor);
    const ceil = plane(W, D, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.copy(V(0, RANGE.ceil, midZ));
    add(ceil);
    const left = plane(D, Hh, wallMat, [D / 0.5, Hh / 0.5]);
    left.rotation.y = Math.PI / 2;
    left.position.copy(V(-RANGE.halfW, midY, midZ));
    add(left);
    const right = left.clone();
    right.rotation.y = -Math.PI / 2;
    right.position.copy(V(RANGE.halfW, midY, midZ));
    add(right);
    const backWall = plane(W, Hh, wallMat, [W / 0.5, Hh / 0.5]);
    backWall.rotation.y = Math.PI;
    backWall.position.copy(V(0, midY, RANGE.back));
    add(backWall);
    // front wall round the doorway (three pieces, so the opening is truly open)
    const sideW = RANGE.halfW - RANGE.gapHalf;
    const frontL = plane(sideW, Hh, wallMat, [sideW / 0.5, Hh / 0.5]);
    frontL.position.copy(V(-(RANGE.gapHalf + sideW / 2), midY, RANGE.front));
    add(frontL);
    const frontR = frontL.clone();
    frontR.position.copy(V(RANGE.gapHalf + sideW / 2, midY, RANGE.front));
    add(frontR);
    const lintelH = RANGE.ceil - (RANGE.floor + RANGE.gapH);
    const lintel = plane(RANGE.gapHalf * 2, lintelH, wallMat, [1, lintelH / 0.5]);
    lintel.position.copy(V(0, RANGE.floor + RANGE.gapH + lintelH / 2, RANGE.front));
    add(lintel);
    // a dark veil in the doorway, shown while the main room isn't being drawn (you're deep in
    // the hall); it never blocks shots
    const seal = new THREE.Mesh(
      new THREE.PlaneGeometry(RANGE.gapHalf * 2, RANGE.gapH),
      new THREE.MeshBasicMaterial({ color: 0x060709, transparent: true, opacity: 1, depthWrite: true })
    );
    seal.position.copy(V(0, RANGE.floor + RANGE.gapH / 2, RANGE.front + 0.002));
    seal.visible = false;
    scene.add(seal);
    // doorway frame
    const frameMat = trimWarm;
    for (const [w, h, x, y] of [
      [0.012, RANGE.gapH, -RANGE.gapHalf, RANGE.floor + RANGE.gapH / 2],
      [0.012, RANGE.gapH, RANGE.gapHalf, RANGE.floor + RANGE.gapH / 2],
      [RANGE.gapHalf * 2 + 0.012, 0.012, 0, RANGE.floor + RANGE.gapH],
    ]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.01), frameMat);
      m.position.copy(V(x, y, RANGE.front - 0.004));
      add(m, false);
    }

    // light strips along the foot of the walls and the ceiling edges
    const strip = (len: number, pos: THREE.Vector3, rotY: number, m = trim) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(len, 0.008, 0.006), m);
      s.position.copy(pos);
      s.rotation.y = rotY;
      add(s, false);
    };
    strip(D, V(-RANGE.halfW + 0.004, RANGE.floor + 0.035, midZ), Math.PI / 2);
    strip(D, V(RANGE.halfW - 0.004, RANGE.floor + 0.035, midZ), Math.PI / 2);
    strip(W, V(0, RANGE.floor + 0.035, RANGE.back + 0.004), 0);
    strip(D, V(-RANGE.halfW + 0.004, RANGE.ceil - 0.02, midZ), Math.PI / 2);
    strip(D, V(RANGE.halfW - 0.004, RANGE.ceil - 0.02, midZ), Math.PI / 2);
    // ceiling light panels
    for (let iz = 0; iz < 4; iz++) {
      for (const x of [-1.1, 1.1]) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.012, 0.9), panelLight);
        p.position.copy(V(x, RANGE.ceil - 0.006, -1.9 - iz * 1.7));
        add(p, false);
      }
    }

    // floor markings: firing line, lanes, distance numbers
    const decal = (w: number, d: number, m: THREE.Material, x: number, z: number) => {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
      s.rotation.x = -Math.PI / 2;
      s.position.copy(V(x, RANGE.floor + 0.0015, z));
      add(s, false);
      return s;
    };
    const paintWarm = new THREE.MeshBasicMaterial({ color: warm, transparent: true, opacity: 0.85 });
    const paintLine = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 });
    decal(W, 0.025, paintWarm, 0, -3.2);
    for (const x of [-1.1, 0, 1.1]) decal(0.012, 4.9, paintLine, x, -5.85);
    [-4.6, -6.2, -7.8].forEach((z, i) => {
      const tex = textTexture([{ text: `${(i + 1) * 10} M`, size: 150, color: '#ffffff', weight: 800 }], 512, 192);
      const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.32, depthWrite: false });
      decal(0.42, 0.16, m, -1.65, z).rotation.z = Math.PI;
    });

    // signs
    const sign = (tex: THREE.Texture, w: number, h: number, pos: THREE.Vector3, rotY: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
      m.position.copy(pos);
      m.rotation.y = rotY;
      add(m, false);
      return m;
    };
    sign(
      textTexture([
        { text: 'TRAINING HALL', size: 120, color: '#ffffff', weight: 800, spacing: 18 },
        { text: 'LIVE FIRE  ·  STAY BEHIND THE LINE', size: 40, color: '#ff9a4d', weight: 600, spacing: 10 },
      ], 2048, 400),
      2.2, 0.43, V(0, 0.95, RANGE.back + 0.005), Math.PI
    );
    sign(textTexture([{ text: 'EXIT', size: 110, color: '#ff9a4d', weight: 800, spacing: 24 }], 512, 160), 0.3, 0.094, V(0, RANGE.floor + RANGE.gapH + 0.09, RANGE.front - 0.005), 0);

    // target board on the back wall
    const target = new THREE.Mesh(
      new THREE.CircleGeometry(0.38, 64),
      new THREE.MeshStandardMaterial({
        map: (() => {
          const c = document.createElement('canvas');
          c.width = c.height = 512;
          const g = c.getContext('2d')!;
          for (let i = 8; i > 0; i--) {
            g.fillStyle = i % 2 ? '#ececec' : '#1a1b20';
            g.beginPath();
            g.arc(256, 256, i * 31, 0, Math.PI * 2);
            g.fill();
          }
          g.fillStyle = '#ff6a2a';
          g.beginPath();
          g.arc(256, 256, 28, 0, Math.PI * 2);
          g.fill();
          const t = new THREE.CanvasTexture(c);
          t.colorSpace = THREE.SRGBColorSpace;
          return t;
        })(),
        roughness: 0.7,
      })
    );
    target.position.copy(V(0, 0.15, RANGE.back + 0.004));
    target.rotation.y = Math.PI;
    add(target);

    /* boxes: platforms, steps, cover, the firing-line counter, the pillar */
    const boxMesh = (b: Box) => {
      const w = b.max[0] - b.min[0];
      const h = b.max[1] - b.min[1];
      const d = b.max[2] - b.min[2];
      const g = new THREE.Group();
      const cx = (b.min[0] + b.max[0]) / 2;
      const cy = (b.min[1] + b.max[1]) / 2;
      const cz = (b.min[2] + b.max[2]) / 2;
      g.position.copy(V(cx, cy, cz));
      const mats = [metal, metal, metalTop, metal, metal, metal];
      const core = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), b.kind === 'cover' ? metal : mats);
      core.castShadow = true;
      core.receiveShadow = true;
      g.add(core);
      solids.push(core);
      // lit edges along the top
      const edgeM = b.kind === 'barrier' ? trimWarm : trim;
      for (const [ew, ed, ex, ez] of [
        [w, 0.006, 0, d / 2],
        [w, 0.006, 0, -d / 2],
        [0.006, d, w / 2, 0],
        [0.006, d, -w / 2, 0],
      ]) {
        const e = new THREE.Mesh(new THREE.BoxGeometry(ew + 0.006, 0.006, ed + 0.006), edgeM);
        e.position.set(ex, h / 2, -ez);
        g.add(e);
      }
      if (b.kind === 'step' || b.kind === 'platform') {
        // hazard band on the riser facing the hall
        const tex = hazard.map!.clone();
        tex.repeat.set(w / 0.08, 1);
        tex.needsUpdate = true;
        const band = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.02), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
        band.position.set(0, h / 2 - 0.016, d / 2 + 0.001);
        g.add(band);
      }
      if (b.kind === 'cover') {
        // crate panels
        for (const s of [-1, 1]) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(w + 0.004, 0.012, 0.012), trimWarm);
          bar.position.set(0, s * h * 0.3, d / 2);
          g.add(bar);
        }
      }
      scene.add(g);
    };
    BOXES.filter((b) => b.kind !== 'bench').forEach(boxMesh);

    /* the armory bench */
    const bench = new THREE.Group();
    const bx = (BENCH.x0 + BENCH.x1) / 2;
    const bz = (BENCH.z0 + BENCH.z1) / 2;
    const bw = BENCH.x1 - BENCH.x0;
    const bd = BENCH.z1 - BENCH.z0;
    bench.position.copy(V(bx, BENCH.top, bz));
    scene.add(bench);
    const topMat = new THREE.MeshStandardMaterial({ map: gridTexture('#191b20', '#5a6272', 6, 3, 256), roughness: 0.85, metalness: 0.05 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.025, bd), [metal, metal, topMat, metal, metal, metal]);
    top.position.y = -0.0125;
    top.castShadow = top.receiveShadow = true;
    bench.add(top);
    solids.push(top);
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.03), metal);
      leg.position.set((lx * (bw - 0.05)) / 2, -0.15, (lz * (bd - 0.05)) / 2);
      leg.castShadow = true;
      bench.add(leg);
    }
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.04, 0.012, bd - 0.04), metal);
    shelf.position.y = -0.22;
    shelf.receiveShadow = true;
    bench.add(shelf);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, bd), trimWarm);
    edge.position.set(bw / 2, 0, 0);
    bench.add(edge);
    // pegboard and the armory sign on the wall behind it
    const peg = new THREE.Mesh(
      new THREE.PlaneGeometry(bd, 0.5),
      new THREE.MeshStandardMaterial({
        map: (() => {
          const c = document.createElement('canvas');
          c.width = 1024;
          c.height = 360;
          const g = c.getContext('2d')!;
          g.fillStyle = '#1b1d22';
          g.fillRect(0, 0, 1024, 360);
          g.fillStyle = '#0c0d10';
          for (let y = 12; y < 360; y += 24) for (let x = 12; x < 1024; x += 24) {
            g.beginPath();
            g.arc(x, y, 3.2, 0, Math.PI * 2);
            g.fill();
          }
          const t = new THREE.CanvasTexture(c);
          t.colorSpace = THREE.SRGBColorSpace;
          return t;
        })(),
        roughness: 0.8,
      })
    );
    peg.rotation.y = Math.PI / 2;
    peg.position.copy(V(-RANGE.halfW + 0.003, BENCH.top + 0.27, bz));
    add(peg, false);
    sign(
      textTexture([
        { text: 'ARMORY', size: 130, color: '#ff9a4d', weight: 800, spacing: 26 },
        { text: 'AIM AT A WEAPON · PRESS E', size: 34, color: '#ffffff', weight: 600, spacing: 8 },
      ], 1024, 300),
      0.62, 0.18, V(-RANGE.halfW + 0.006, BENCH.top + 0.62, bz), Math.PI / 2
    );

    // weapons resting on foam cradles, a name plate under each
    type Item = { id: string; holder: THREE.Group; model: THREE.Object3D; slot: THREE.Mesh; label: THREE.Mesh; home: THREE.Vector3; taken: boolean; fly: number; glow: number };
    const items: Item[] = [];
    const slotMat = new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.95 });
    BENCH_SLOTS.forEach((id, i) => {
      const z = BENCH.z1 - 0.12 - i * ((bd - 0.24) / (BENCH_SLOTS.length - 1));
      const cradle = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.12, 0.008, 0.11), slotMat);
      cradle.position.set(0.02, 0.004, -(z - bz));
      cradle.receiveShadow = true;
      bench.add(cradle);
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.004, 0.1), new THREE.MeshStandardMaterial({ color: warm, emissive: warm, emissiveIntensity: 0.6 }));
      slot.position.set(bw / 2 - 0.035, 0.009, -(z - bz));
      bench.add(slot);
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(0.11, 0.02),
        new THREE.MeshBasicMaterial({
          map: textTexture([{ text: weaponById(id).name.toUpperCase(), size: 64, color: '#ffffff', weight: 700, spacing: 4 }], 512, 100),
          transparent: true,
          opacity: 0.7,
          toneMapped: false,
          depthWrite: false,
        })
      );
      label.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
      label.position.set(bw / 2 - 0.06, 0.0095, -(z - bz));
      bench.add(label);
      const holder = new THREE.Group();
      const home = new THREE.Vector3(0.03, 0.028, -(z - bz));
      holder.position.copy(home);
      bench.add(holder);
      const built = buildWeapon(id);
      const model = built ? built.root : new THREE.Group();
      // lie the weapon on its side, muzzle towards the wall, sized from metres to room units
      model.scale.setScalar(0.42);
      model.rotation.set(0, Math.PI / 2, Math.PI / 2, 'YXZ');
      model.traverse((o) => {
        o.castShadow = true;
      });
      holder.add(model);
      items.push({ id, holder, model, slot, label, home, taken: false, fly: 0, glow: 0 });
    });
    let aimedItem: Item | null = null;

    /* bots */
    const bots: Bot[] = BOT_SPAWNS.map((sp, id) => {
      const rig = makeBot(warm);
      rig.root.position.copy(V(sp.x, sp.y, sp.z));
      scene.add(rig.root);
      return {
        id,
        rig,
        x: sp.x,
        y: sp.y,
        z: sp.z,
        vx: 0,
        target: sp.x,
        timer: Math.random() * 1.5,
        mode: sp.mode,
        range: sp.range,
        hp: 100,
        state: 'alive' as const,
        t: 0,
        walk: Math.random() * 6,
        flinch: { x: 0, v: 0 },
        headSnap: { x: 0, v: 0 },
        flash: 0,
        barT: 9,
      };
    });

    /* bullet marks, sparks */
    const markTex = radialTexture([[0, 'rgba(0,0,0,0.95)'], [0.35, 'rgba(10,10,12,0.9)'], [0.55, 'rgba(255,150,70,0.6)'], [0.75, 'rgba(255,120,40,0.15)'], [1, 'rgba(0,0,0,0)']]);
    const marks: { mesh: THREE.Mesh; age: number }[] = [];
    const markGeo = new THREE.PlaneGeometry(0.03, 0.03);
    const sparkTex = radialTexture([[0, 'rgba(255,255,230,1)'], [0.3, 'rgba(255,190,90,0.9)'], [1, 'rgba(255,120,30,0)']]);
    const SPARKS = 160;
    const sparkPos = new Float32Array(SPARKS * 3);
    const sparkVel = new Float32Array(SPARKS * 3);
    const sparkLife = new Float32Array(SPARKS);
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparks = new THREE.Points(
      sparkGeo,
      new THREE.PointsMaterial({ size: 0.012, map: sparkTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, toneMapped: false })
    );
    sparks.frustumCulled = false;
    scene.add(sparks);
    let sparkNext = 0;
    const burst = (p: THREE.Vector3, n: THREE.Vector3, count: number, speed: number) => {
      for (let i = 0; i < count; i++) {
        const k = sparkNext;
        sparkNext = (sparkNext + 1) % SPARKS;
        sparkPos.set([p.x, p.y, p.z], k * 3);
        const dir = new THREE.Vector3(n.x + (Math.random() - 0.5) * 1.4, n.y + (Math.random() - 0.2) * 1.4, n.z + (Math.random() - 0.5) * 1.4).normalize();
        const s = speed * (0.4 + Math.random() * 0.8);
        sparkVel.set([dir.x * s, dir.y * s, dir.z * s], k * 3);
        sparkLife[k] = 0.25 + Math.random() * 0.3;
      }
    };
    const puffTex = radialTexture([[0, 'rgba(200,205,215,0.55)'], [1, 'rgba(200,205,215,0)']]);
    const puffs: { sprite: THREE.Sprite; age: number }[] = [];

    /* damage numbers (DOM, drawn over the canvas at the hit point) */
    const numbers: { el: HTMLDivElement; p: THREE.Vector3; age: number; drift: number }[] = [];

    /* ray hit test: static geometry + bots */
    const raycaster = new THREE.Raycaster();
    const tmpO = new THREE.Vector3();
    const tmpD = new THREE.Vector3();
    const skullAt = new THREE.Vector3();
    const tmpP = new THREE.Vector3();
    const raycast = (o: number[], d: number[], maxT = 30): RangeHit | null => {
      tmpO.copy(V(o[0], o[1], o[2]));
      tmpD.copy(V(d[0], d[1], d[2])).normalize();
      raycaster.set(tmpO, tmpD);
      raycaster.far = maxT;
      const hits = raycaster.intersectObjects(solids, false);
      let best: RangeHit | null = null;
      if (hits.length) {
        const h = hits[0];
        const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
        best = { t: h.distance, point: toWorld(h.point), normal: toWorld(n) };
      }
      // bots: against the meshes exactly as they're drawn this frame (walk bob, lean, flinch);
      // anything in the head counts as a headshot, with a sliver of give round the skull
      for (const b of bots) {
        if (b.state !== 'alive') continue;
        const rig = b.rig;
        rig.root.updateMatrixWorld(true);
        const hit = raycaster.intersectObject(rig.body, true)[0];
        let head = false;
        let hp: THREE.Vector3 | null = null;
        let ht = Infinity;
        if (hit) {
          ht = hit.distance;
          hp = hit.point;
          for (let o: THREE.Object3D | null = hit.object; o && o !== rig.body; o = o.parent) if (o === rig.head) head = true;
        }
        if (!head) {
          rig.skull.getWorldPosition(skullAt);
          const r = raycaster.ray.distanceSqToPoint(skullAt);
          if (r < HEAD_GIVE * HEAD_GIVE) {
            const t = raycaster.ray.closestPointToPoint(skullAt, tmpP).distanceTo(tmpO);
            if (t < ht + 0.06) {
              head = true;
              ht = Math.min(ht, t);
              hp = tmpP.clone();
            }
          }
        }
        if (!hp || ht > maxT || (best && ht >= best.t)) continue;
        const n = hp.clone().sub(head ? skullAt : rig.root.position);
        best = { t: ht, point: toWorld(hp), normal: toWorld(n), bot: b.id, head };
      }
      return best;
    };

    let themeHex = '#7dd3fc';
    if (process.env.NODE_ENV !== 'production') (window as unknown as { __rangeDebug: unknown }).__rangeDebug = { bots, renderer };
    const api: RangeWorldApi = {
      raycast,
      update: (cam, dt, opts) => {
        canvas.style.display = opts.visible ? '' : 'none';
        overlay.style.display = opts.visible ? '' : 'none';
        if (!opts.visible) return;
        canvas.style.clipPath = opts.clip ?? '';
        overlay.style.clipPath = opts.clip ?? '';
        canvas.style.zIndex = opts.above ? '12' : '9';
        // 0..1: how far the doorway is veiled over (the main room fading out of being drawn)
        const sealed = opts.sealed ?? 0;
        canvas.style.opacity = String(opts.fade ?? 1);
        overlay.style.opacity = String(opts.fade ?? 1);
        seal.visible = sealed > 0.001;
        (seal.material as THREE.MeshBasicMaterial).opacity = sealed;
        overlay.style.zIndex = opts.above ? '13' : '9';
        // the grid room's camera, mirrored into three.js
        const W2 = window.innerWidth;
        const H2 = window.innerHeight;
        renderer.setSize(W2, H2, false);
        camera.aspect = W2 / H2;
        camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(0.5 / cam.focal));
        camera.updateProjectionMatrix();
        camera.position.copy(V(cam.pos[0], cam.pos[1], cam.pos[2]));
        camera.up.copy(V(cam.up[0], cam.up[1], cam.up[2]));
        camera.lookAt(V(cam.pos[0] + cam.forward[0], cam.pos[1] + cam.forward[1], cam.pos[2] + cam.forward[2]));
        const time = cam.time;

        // bots
        for (const b of bots) {
          const rig = b.rig;
          b.t += dt;
          b.flash = Math.max(0, b.flash - dt * 7);
          b.barT += dt;
          // springs for flinches
          b.flinch.v += (-b.flinch.x * 220 - b.flinch.v * 18) * dt;
          b.flinch.x += b.flinch.v * dt;
          b.headSnap.v += (-b.headSnap.x * 260 - b.headSnap.v * 16) * dt;
          b.headSnap.x += b.headSnap.v * dt;
          let opacity = 1;
          if (b.state === 'alive') {
            if (b.mode !== 'still') {
              b.timer -= dt;
              if (b.timer <= 0) {
                const [lo, hi] = b.range;
                if (b.mode === 'peek') {
                  b.target = Math.abs(b.target - lo) < Math.abs(b.target - hi) ? hi : lo;
                  b.timer = 0.6 + Math.random() * 1.1;
                } else {
                  b.target = lo + Math.random() * (hi - lo);
                  b.timer = 0.8 + Math.random() * 1.8;
                }
              }
              const speed = b.mode === 'peek' ? 0.85 : 0.42;
              const want = THREE.MathUtils.clamp((b.target - b.x) * 6, -speed, speed);
              b.vx += (want - b.vx) * (1 - Math.exp(-dt * 8));
              b.x += b.vx * dt;
            }
            const sp = Math.abs(b.vx);
            b.walk += dt * (2 + sp * 22);
            const amp = Math.min(1, sp / 0.35);
            const sw = Math.sin(b.walk);
            rig.legs[0].thigh.rotation.x = sw * 0.55 * amp;
            rig.legs[1].thigh.rotation.x = -sw * 0.55 * amp;
            rig.legs[0].knee.rotation.x = Math.max(0, -sw) * 0.8 * amp;
            rig.legs[1].knee.rotation.x = Math.max(0, sw) * 0.8 * amp;
            rig.arms[0].shoulder.rotation.x = -sw * 0.4 * amp;
            rig.arms[1].shoulder.rotation.x = sw * 0.4 * amp;
            rig.arms[0].elbow.rotation.x = -0.25 - amp * 0.3;
            rig.arms[1].elbow.rotation.x = -0.25 - amp * 0.3;
            rig.hips.position.y = 0.29 + Math.abs(Math.cos(b.walk)) * 0.008 * amp + Math.sin(time * 1.7 + b.id) * 0.002;
            rig.torso.rotation.x = b.flinch.x;
            rig.torso.rotation.z = -b.vx * 0.12;
            rig.head.rotation.x = b.headSnap.x;
            rig.body.rotation.set(0, 0, 0);
            rig.body.position.set(0, 0, 0);
            rig.body.scale.set(1, 1, 1);
          } else if (b.state === 'dying') {
            // knees give, the body tips back and drops, then fades
            const u = Math.min(1, b.t / 0.85);
            const e = u * u;
            rig.legs.forEach((l) => {
              l.thigh.rotation.x = -1.1 * e;
              l.knee.rotation.x = 1.9 * e;
            });
            rig.hips.position.y = 0.29 - 0.17 * e;
            rig.torso.rotation.x = 0.6 * e + b.flinch.x;
            rig.body.rotation.x = 1.35 * Math.max(0, (u - 0.35) / 0.65) ** 2;
            rig.arms.forEach((a, i) => {
              a.shoulder.rotation.x = -1.2 * e;
              a.shoulder.rotation.z = (i ? 1 : -1) * 0.5 * e;
            });
            opacity = 1 - Math.max(0, (b.t - 0.9) / 0.45);
            if (b.t > 1.35) {
              b.state = 'gone';
              b.t = 0;
            }
          } else if (b.state === 'gone') {
            opacity = 0;
            if (b.t > 1.1) {
              b.state = 'spawning';
              b.t = 0;
              b.hp = 100;
              b.x = b.range[0] + Math.random() * (b.range[1] - b.range[0]);
              b.target = b.x;
              playBotSpawn();
            }
          } else if (b.state === 'spawning') {
            // materialises from the pad up
            const u = Math.min(1, b.t / 0.55);
            rig.body.rotation.set(0, 0, 0);
            rig.body.scale.set(1, Math.max(0.01, 1 - (1 - u) ** 3), 1);
            rig.hips.position.y = 0.29;
            rig.torso.rotation.set(0, 0, 0);
            rig.legs.forEach((l) => {
              l.thigh.rotation.x = 0;
              l.knee.rotation.x = 0;
            });
            rig.arms.forEach((a, i) => {
              a.shoulder.rotation.set(0, 0, (i ? 1 : -1) * 0.12);
            });
            b.flash = Math.max(b.flash, 1 - u);
            if (u >= 1) {
              b.state = 'alive';
              b.t = 0;
            }
          }
          rig.root.position.copy(V(b.x, b.y, b.z));
          // turn to face you
          const yaw = Math.atan2(cam.pos[0] - b.x, -(cam.pos[2] - b.z));
          rig.root.rotation.y = yaw + Math.PI;
          rig.root.visible = opacity > 0.01;
          for (const m of [rig.shell, rig.dark, rig.glow]) m.opacity = opacity;
          rig.shell.emissive.setRGB(b.flash, b.flash, b.flash);
          rig.glow.emissiveIntensity = 2.2 + b.flash * 4;
          // health bar faces the camera, shows for a while after a hit
          rig.bar.visible = b.state === 'alive' && b.barT < 2.5;
          if (rig.bar.visible) {
            rig.bar.quaternion.copy(camera.quaternion);
            rig.bar.quaternion.premultiply(rig.root.quaternion.clone().invert());
            rig.barFill.scale.x = Math.max(0.001, b.hp / 100);
          }
          (rig.pad.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.25 * Math.sin(time * 3 + b.id) + (b.state === 'spawning' ? 0.4 : 0);
        }

        // bench: the aimed weapon lifts and glows; taken ones fly to you and vanish
        for (const it of items) {
          const aimed = it === aimedItem && !it.taken;
          it.glow += ((aimed ? 1 : 0) - it.glow) * (1 - Math.exp(-dt * 12));
          const slotMat2 = it.slot.material as THREE.MeshStandardMaterial;
          slotMat2.emissiveIntensity = it.taken ? 0.08 : 0.6 + it.glow * 2.4;
          if (it.taken) {
            it.fly = Math.min(1, it.fly + dt / 0.32);
            if (it.fly < 1) {
              const camLocal = bench.worldToLocal(camera.position.clone().add(new THREE.Vector3(0, -0.08, 0)));
              it.holder.position.lerpVectors(it.home, camLocal, it.fly * it.fly);
              it.holder.scale.setScalar(1 - it.fly * 0.6);
              it.holder.visible = true;
            } else it.holder.visible = false;
          } else {
            it.fly = Math.max(0, it.fly - dt / 0.4);
            it.holder.visible = true;
            it.holder.position.copy(it.home);
            it.holder.position.y += it.glow * 0.02 + (it.fly > 0 ? it.fly * 0.05 : 0);
            it.holder.rotation.x = it.glow * Math.sin(time * 2) * 0.05;
            it.holder.scale.setScalar(1 + it.glow * 0.06 - it.fly * 0.4);
          }
        }

        // marks age out
        for (let i = marks.length - 1; i >= 0; i--) {
          const mk = marks[i];
          mk.age += dt;
          const mm = mk.mesh.material as THREE.MeshBasicMaterial;
          mm.opacity = Math.max(0, 1 - Math.max(0, mk.age - 6) / 2);
          if (mk.age > 8) {
            scene.remove(mk.mesh);
            mm.dispose();
            marks.splice(i, 1);
          }
        }
        // sparks
        for (let i = 0; i < SPARKS; i++) {
          if (sparkLife[i] <= 0) {
            sparkPos[i * 3 + 1] = -100;
            continue;
          }
          sparkLife[i] -= dt;
          sparkVel[i * 3 + 1] -= 6 * dt;
          sparkPos[i * 3] += sparkVel[i * 3] * dt;
          sparkPos[i * 3 + 1] += sparkVel[i * 3 + 1] * dt;
          sparkPos[i * 3 + 2] += sparkVel[i * 3 + 2] * dt;
        }
        sparkGeo.attributes.position.needsUpdate = true;
        for (let i = puffs.length - 1; i >= 0; i--) {
          const pf = puffs[i];
          pf.age += dt;
          pf.sprite.scale.setScalar(0.02 + pf.age * 0.12);
          (pf.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, 0.5 - pf.age);
          if (pf.age > 0.5) {
            scene.remove(pf.sprite);
            (pf.sprite.material as THREE.SpriteMaterial).dispose();
            puffs.splice(i, 1);
          }
        }

        // through the doorway: only its rectangle, shadows frozen; inside: everything
        const rect = opts.rect;
        if (rect) {
          renderer.setScissorTest(true);
          renderer.setScissor(rect[0], H2 - rect[1] - rect[3], rect[2], rect[3]);
        } else renderer.setScissorTest(false);
        if (!rect && !renderer.shadowMap.autoUpdate) renderer.shadowMap.needsUpdate = true;
        renderer.shadowMap.autoUpdate = !rect;
        renderer.render(scene, camera);

        // damage numbers
        for (let i = numbers.length - 1; i >= 0; i--) {
          const n = numbers[i];
          n.age += dt;
          const p = n.p.clone();
          p.y += n.age * 0.14;
          p.x += n.drift * n.age;
          const s = p.project(camera);
          const behind = s.z > 1;
          n.el.style.transform = `translate(${((s.x + 1) / 2) * W2}px, ${((1 - s.y) / 2) * H2}px) translate(-50%, -50%) scale(${1 + Math.max(0, 0.15 - n.age) * 3})`;
          n.el.style.opacity = behind ? '0' : String(Math.max(0, 1 - Math.max(0, n.age - 0.5) / 0.35));
          if (n.age > 0.85) {
            n.el.remove();
            numbers.splice(i, 1);
          }
        }
      },
      damage: (id, amount, head, point) => {
        const b = bots[id];
        if (!b || b.state !== 'alive') return false;
        b.hp -= amount;
        b.flash = 1;
        b.barT = 0;
        if (head) b.headSnap.v -= 9;
        else b.flinch.v += 4 + amount * 0.05;
        // number
        const el = document.createElement('div');
        el.className = `range-dmg${head ? ' is-head' : ''}${b.hp <= 0 ? ' is-kill' : ''}`;
        el.textContent = String(amount);
        overlay.appendChild(el);
        numbers.push({ el, p: V(point[0], point[1] + 0.03, point[2]), age: 0, drift: (Math.random() - 0.5) * 0.08 });
        if (numbers.length > 14) numbers.shift()?.el.remove();
        burst(V(point[0], point[1], point[2]), new THREE.Vector3().subVectors(camera.position, V(point[0], point[1], point[2])).normalize(), head ? 14 : 8, 1.4);
        if (b.hp <= 0) {
          b.state = 'dying';
          b.t = 0;
          b.vx = 0;
          return true;
        }
        return false;
      },
      impact: (hit, kind = 'bullet') => {
        const p = V(hit.point[0], hit.point[1], hit.point[2]);
        const n = V(hit.normal[0], hit.normal[1], hit.normal[2]).normalize();
        if (hit.bot === undefined) {
          const mesh = new THREE.Mesh(
            markGeo,
            new THREE.MeshBasicMaterial({ map: markTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })
          );
          mesh.position.copy(p).addScaledVector(n, 0.0015);
          mesh.lookAt(p.clone().add(n));
          mesh.rotation.z = Math.random() * Math.PI;
          mesh.scale.setScalar(kind === 'blade' ? 0.6 : 0.8 + Math.random() * 0.4);
          scene.add(mesh);
          marks.push({ mesh, age: 0 });
          if (marks.length > 60) {
            const old = marks.shift();
            if (old) scene.remove(old.mesh);
          }
          const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false }));
          puff.position.copy(p).addScaledVector(n, 0.01);
          scene.add(puff);
          puffs.push({ sprite: puff, age: 0 });
        }
        burst(p, n, kind === 'blade' ? 5 : 9, 1.6);
      },
      aimItem: (o, d) => {
        // weapons within reach of the crosshair (a little forgiving)
        let best: Item | null = null;
        let bestScore = 0.11; // radians off the crosshair
        const oo = V(o[0], o[1], o[2]);
        const dd = V(d[0], d[1], d[2]).normalize();
        const wp = new THREE.Vector3();
        for (const it of items) {
          if (it.taken) continue;
          it.holder.getWorldPosition(wp);
          const to = wp.clone().sub(oo);
          const dist = to.length();
          if (dist > 1.1) continue;
          const along = to.dot(dd);
          if (along <= 0) continue;
          const off = Math.acos(Math.min(1, along / Math.max(dist, 1e-6)));
          if (off < bestScore) {
            bestScore = off;
            best = it;
          }
        }
        // something solid in the way?
        if (best) {
          const wall = raycast(o, d, 1.2);
          best.holder.getWorldPosition(wp);
          if (wall && wall.bot === undefined && wall.t < oo.distanceTo(wp) - 0.08) best = null;
        }
        aimedItem = best;
        return best ? best.id : null;
      },
      take: (id) => {
        const it = items.find((x) => x.id === id);
        if (!it || it.taken) return;
        it.taken = true;
        it.fly = 0;
      },
      restore: (id) => {
        const it = items.find((x) => x.id === id);
        if (!it || !it.taken) return;
        it.taken = false;
        it.fly = 1;
      },
      restoreAll: () => items.forEach((it) => {
        it.taken = false;
        it.fly = 0;
      }),
      setTheme: (hex) => {
        if (hex === themeHex) return;
        themeHex = hex;
        accent = new THREE.Color(hex);
        trim.color.copy(accent);
        trim.emissive.copy(accent);
        const f2 = gridTexture('#121318', hex, 8, 4);
        const w2 = gridTexture('#15161b', hex, 8, 4);
        scene.traverse((o) => {
          const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
          if (!m || Array.isArray(m) || !m.map) return;
          if (m.map.image === floorTex.image || m.map.userData.floor) {
            const r = m.map.repeat.clone();
            m.map = f2.clone();
            m.map.repeat.copy(r);
            m.map.userData.floor = true;
            m.map.needsUpdate = true;
          } else if (m.map.image === wallTex.image || m.map.userData.wall) {
            const r = m.map.repeat.clone();
            m.map = w2.clone();
            m.map.repeat.copy(r);
            m.map.userData.wall = true;
            m.map.needsUpdate = true;
          }
        });
      },
    };
    apiRef.current = api;

    return () => {
      apiRef.current = null;
      numbers.forEach((n) => n.el.remove());
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="range-canvas" aria-hidden="true" style={{ display: 'none' }} />
      <div ref={overlayRef} className="range-overlay" aria-hidden="true" style={{ display: 'none' }} />
    </>
  );
});

export default RangeWorld;
