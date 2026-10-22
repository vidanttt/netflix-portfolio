'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { playMech } from '@/lib/roomAudio';
import type { WeaponKind } from './weapons';

/**
 * First-person weapons for the grid room: every gun (and the karambit) is modelled in code from
 * rounded boxes, cylinders and an extruded blade, held in gloved hands, and animated by hand:
 * equip, fire (slide / hammer / cylinder / bolt / pump, muzzle flash, brass), reload, inspect,
 * aim down sights, walking bob, sway and sprint. It draws on its own transparent canvas over the
 * room; nothing here touches the page.
 */
export type WeaponViewApi = {
  equip: (id: string) => void;
  fire: (empty: boolean) => void;
  reload: (duration: number, empty: boolean, shells?: number) => void;
  inspect: () => void;
  melee: (heavy: boolean) => void;
  setAds: (on: boolean) => void;
  setMotion: (m: { speed: number; grounded: boolean; sprint: boolean; turn: [number, number] }) => void;
  setTint: (hex: string) => void;
  busy: () => boolean;
};

type Parts = {
  slide?: THREE.Object3D;
  hammer?: THREE.Object3D;
  cylinder?: THREE.Object3D;
  crane?: THREE.Object3D;
  chambers?: THREE.Object3D; // brass in the cylinder (revolver reload)
  mag?: THREE.Object3D;
  pump?: THREE.Object3D;
  bolt?: THREE.Object3D;
  spinner?: THREE.Object3D; // karambit
  shell?: THREE.Object3D; // shotgun reload shell
};

type Model = {
  id: string;
  kind: WeaponKind;
  root: THREE.Group;
  parts: Parts;
  muzzle: THREE.Object3D;
  eject: THREE.Object3D;
  hip: THREE.Vector3;
  hipRot: THREE.Euler;
  sightY: number;
  adsZ: number;
  chambers: number;
  kickBack: number;
  kickUp: number;
  brass: 'pistol' | 'rifle' | 'shell' | 'none';
};

/* ── materials ──────────────────────────────────────────────────────── */
const mat = {
  black: new THREE.MeshStandardMaterial({ color: 0x24262c, metalness: 0.6, roughness: 0.4 }),
  polymer: new THREE.MeshStandardMaterial({ color: 0x33353d, metalness: 0.08, roughness: 0.72 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x8e949c, metalness: 0.95, roughness: 0.3 }),
  stainless: new THREE.MeshStandardMaterial({ color: 0xcdd1d6, metalness: 1, roughness: 0.2 }),
  gunmetal: new THREE.MeshStandardMaterial({ color: 0x50555e, metalness: 0.9, roughness: 0.36 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x7c3f1b, metalness: 0, roughness: 0.55 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x141416, metalness: 0, roughness: 0.92 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 1, roughness: 0.28 }),
  red: new THREE.MeshStandardMaterial({ color: 0xa3201c, metalness: 0.1, roughness: 0.5 }),
  hole: new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.2, roughness: 0.9 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd8aa4c, metalness: 1, roughness: 0.25 }),
  glove: new THREE.MeshStandardMaterial({ color: 0x3a3e48, metalness: 0.05, roughness: 0.8 }),
  sleeve: new THREE.MeshStandardMaterial({ color: 0x4d5462, metalness: 0.05, roughness: 0.78 }),
  knuckle: new THREE.MeshStandardMaterial({ color: 0x23262c, metalness: 0.1, roughness: 0.55 }),
  accent: new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x7dd3fc, emissiveIntensity: 0.9, roughness: 0.4 }),
  blade: new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.95, roughness: 0.16 }),
};

/* ── building blocks ────────────────────────────────────────────────── */
const geoCache = new Map<string, THREE.BufferGeometry>();
const rounded = (w: number, h: number, d: number, r: number) => {
  const key = `${w}|${h}|${d}|${r}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
    geoCache.set(key, g);
  }
  return g;
};
function box(
  parent: THREE.Object3D,
  size: [number, number, number],
  m: THREE.Material,
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
  r = 0.0025
) {
  const mesh = new THREE.Mesh(rounded(size[0], size[1], size[2], r), m);
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  parent.add(mesh);
  return mesh;
}
function cyl(
  parent: THREE.Object3D,
  r: number,
  len: number,
  m: THREE.Material,
  pos: [number, number, number],
  axis: 'x' | 'y' | 'z' = 'z',
  seg = 20,
  r2 = r
) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, len, seg), m);
  mesh.position.set(...pos);
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  parent.add(mesh);
  return mesh;
}
const group = (parent: THREE.Object3D, pos: [number, number, number] = [0, 0, 0], rot: [number, number, number] = [0, 0, 0]) => {
  const g = new THREE.Group();
  g.position.set(...pos);
  g.rotation.set(...rot);
  parent.add(g);
  return g;
};
const anchor = (parent: THREE.Object3D, pos: [number, number, number]) => group(parent, pos);

let withHands = true;

/** A gloved hand gripping something: palm, four curled fingers, thumb, knuckle guard, and the
 *  forearm and sleeve running off towards the bottom of the view. */
function hand(parent: THREE.Object3D, side: 1 | -1, pos: [number, number, number], rot: [number, number, number]) {
  const g = group(parent, pos, rot);
  if (!withHands) return g;
  // palm and back of the hand
  box(g, [0.034, 0.07, 0.048], mat.glove, [side * 0.006, 0, 0.004], [0, 0, 0], 0.014);
  box(g, [0.03, 0.05, 0.012], mat.knuckle, [side * 0.017, 0.004, 0.006], [0, 0, 0], 0.005);
  // four fingers curled round the front of the grip
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0072, 0.018, 4, 10), mat.glove);
    f.position.set(-side * 0.004, 0.022 - i * 0.017, -0.03);
    f.rotation.set(0, 0, Math.PI / 2);
    g.add(f);
    const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.0066, 0.008, 4, 8), mat.glove);
    tip.position.set(-side * 0.018, 0.022 - i * 0.017, -0.018);
    tip.rotation.set(Math.PI / 2, 0, 0);
    g.add(tip);
  }
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.0082, 0.03, 4, 10), mat.glove);
  thumb.position.set(-side * 0.02, 0.026, -0.016);
  thumb.rotation.set(-1.15, 0, side * 0.3);
  g.add(thumb);
  // wrist strap
  box(g, [0.04, 0.012, 0.052], mat.knuckle, [side * 0.004, -0.04, 0.008], [0, 0, 0], 0.005);
  box(g, [0.041, 0.003, 0.053], mat.accent, [side * 0.004, -0.034, 0.008], [0, 0, 0], 0.001);
  // forearm and sleeve, pointing down and back towards the camera
  const dir = new THREE.Vector3(side * 0.3, -0.62, 0.73).normalize();
  const arm = new THREE.Group();
  arm.position.set(side * 0.004, -0.042, 0.016);
  arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  g.add(arm);
  const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.2, 18), mat.glove);
  fore.position.y = 0.09;
  arm.add(fore);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.044, 0.36, 22), mat.sleeve);
  sleeve.position.y = 0.3;
  arm.add(sleeve);
  // rolled cuff and a seam down the sleeve
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.006, 10, 28), mat.sleeve);
  cuff.rotation.x = Math.PI / 2;
  cuff.position.y = 0.122;
  arm.add(cuff);
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.3, 0.003), mat.accent);
  seam.position.set(side * 0.038, 0.3, 0);
  arm.add(seam);
  return g;
}

/* ── the weapons ────────────────────────────────────────────────────── */
function base(id: string, kind: WeaponKind, extra: Partial<Model>): Model {
  const root = new THREE.Group();
  return {
    id,
    kind,
    root,
    parts: {},
    muzzle: new THREE.Object3D(),
    eject: new THREE.Object3D(),
    hip: new THREE.Vector3(0.105, -0.112, -0.4),
    hipRot: new THREE.Euler(0.02, 0.06, 0.02),
    sightY: 0.08,
    adsZ: -0.26,
    chambers: 0,
    kickBack: 0.03,
    kickUp: 0.18,
    brass: 'pistol',
    ...extra,
  };
}

function glock(): Model {
  const m = base('glock', 'pistol', { sightY: 0.083, kickBack: 0.032, kickUp: 0.2 });
  const r = m.root;
  box(r, [0.026, 0.022, 0.15], mat.polymer, [0, 0.036, -0.052], [0, 0, 0], 0.004);
  const slide = group(r);
  box(slide, [0.027, 0.031, 0.186], mat.black, [0, 0.063, -0.058], [0, 0, 0], 0.003);
  for (let i = 0; i < 6; i++) box(slide, [0.0278, 0.022, 0.0016], mat.hole, [0, 0.063, 0.022 - i * 0.0045], [0, 0, 0], 0.0005);
  box(slide, [0.004, 0.006, 0.005], mat.black, [0, 0.081, -0.145]);
  box(slide, [0.018, 0.007, 0.006], mat.black, [0, 0.081, 0.026]);
  box(slide, [0.002, 0.002, 0.002], mat.accent, [0, 0.084, -0.145], [0, 0, 0], 0.0005);
  box(slide, [0.011, 0.004, 0.03], mat.brass, [0.006, 0.0785, -0.045], [0, 0, 0], 0.001);
  m.parts.slide = slide;
  cyl(r, 0.006, 0.006, mat.hole, [0, 0.063, -0.15]);
  const grip = group(r, [0, 0.02, 0.004], [-0.32, 0, 0]);
  box(grip, [0.026, 0.1, 0.048], mat.polymer, [0, -0.03, 0.006], [0, 0, 0], 0.006);
  const mag = group(grip, [0, 0, 0]);
  box(mag, [0.028, 0.009, 0.05], mat.polymer, [0, -0.083, 0.006], [0, 0, 0], 0.003);
  box(mag, [0.02, 0.07, 0.036], mat.black, [0, -0.04, 0.004], [0, 0, 0], 0.002);
  m.parts.mag = mag;
  box(r, [0.02, 0.005, 0.045], mat.polymer, [0, 0.008, -0.045]);
  box(r, [0.02, 0.026, 0.005], mat.polymer, [0, 0.019, -0.068]);
  box(r, [0.006, 0.018, 0.006], mat.black, [0, 0.019, -0.042], [-0.3, 0, 0]);
  m.muzzle = anchor(r, [0, 0.063, -0.16]);
  m.eject = anchor(r, [0.012, 0.079, -0.045]);
  hand(r, 1, [0, -0.01, 0.012], [-0.32, 0, 0]);
  hand(r, -1, [-0.026, -0.022, -0.004], [-0.25, 0.25, -0.45]);
  return m;
}

function deagle(): Model {
  const m = base('deagle', 'pistol', { sightY: 0.103, kickBack: 0.045, kickUp: 0.32, hip: new THREE.Vector3(0.105, -0.122, -0.43) });
  const r = m.root;
  box(r, [0.03, 0.03, 0.16], mat.steel, [0, 0.042, -0.06], [0, 0, 0], 0.004);
  // fixed barrel with its triangular top and flutes
  box(r, [0.032, 0.042, 0.115], mat.gunmetal, [0, 0.078, -0.155], [0, 0, 0], 0.004);
  box(r, [0.016, 0.012, 0.115], mat.gunmetal, [0, 0.104, -0.155], [0, 0, 0], 0.003);
  for (let i = 0; i < 3; i++) box(r, [0.033, 0.004, 0.06], mat.hole, [0, 0.07 + i * 0.008, -0.17], [0, 0, 0], 0.001);
  cyl(r, 0.008, 0.004, mat.hole, [0, 0.082, -0.213]);
  const slide = group(r);
  box(slide, [0.033, 0.044, 0.12], mat.gunmetal, [0, 0.078, -0.035], [0, 0, 0], 0.004);
  for (let i = 0; i < 7; i++) box(slide, [0.0335, 0.03, 0.0018], mat.hole, [0, 0.078, 0.02 - i * 0.005], [0, 0, 0], 0.0005);
  box(slide, [0.02, 0.008, 0.008], mat.black, [0, 0.103, 0.018]);
  box(slide, [0.012, 0.005, 0.03], mat.brass, [0.008, 0.098, -0.06], [0, 0, 0], 0.001);
  m.parts.slide = slide;
  box(r, [0.005, 0.01, 0.006], mat.black, [0, 0.112, -0.205]);
  const grip = group(r, [0, 0.022, 0.005], [-0.25, 0, 0]);
  box(grip, [0.032, 0.11, 0.056], mat.rubber, [0, -0.034, 0.008], [0, 0, 0], 0.008);
  const mag = group(grip);
  box(mag, [0.03, 0.009, 0.056], mat.steel, [0, -0.092, 0.008], [0, 0, 0], 0.003);
  box(mag, [0.022, 0.075, 0.04], mat.black, [0, -0.045, 0.006], [0, 0, 0], 0.002);
  m.parts.mag = mag;
  box(r, [0.024, 0.006, 0.055], mat.steel, [0, 0.006, -0.05]);
  box(r, [0.024, 0.032, 0.006], mat.steel, [0, 0.02, -0.077]);
  box(r, [0.007, 0.02, 0.007], mat.black, [0, 0.022, -0.045], [-0.3, 0, 0]);
  const hammer = group(r, [0, 0.09, 0.03]);
  box(hammer, [0.012, 0.016, 0.01], mat.black, [0, 0.005, 0.003]);
  m.parts.hammer = hammer;
  m.muzzle = anchor(r, [0, 0.082, -0.22]);
  m.eject = anchor(r, [0.016, 0.098, -0.06]);
  hand(r, 1, [0, -0.012, 0.014], [-0.25, 0, 0]);
  hand(r, -1, [-0.03, -0.024, -0.006], [-0.2, 0.25, -0.45]);
  return m;
}

/** A revolver: frame, barrel and under-lug, a cylinder on a crane that swings out, hammer, grip. */
function revolver(id: 'sheriff' | 'sw500'): Model {
  const big = id === 'sw500';
  const n = big ? 5 : 6;
  const m = base(id, 'revolver', {
    sightY: big ? 0.108 : 0.097,
    chambers: n,
    brass: 'none',
    kickBack: big ? 0.07 : 0.05,
    kickUp: big ? 0.6 : 0.38,
    hip: new THREE.Vector3(0.105, -0.122, big ? -0.45 : -0.43),
  });
  const r = m.root;
  const frame = big ? mat.stainless : mat.gunmetal;
  const barrelMat = big ? mat.stainless : mat.black;
  const len = big ? 0.21 : 0.17;
  box(r, [big ? 0.031 : 0.025, big ? 0.068 : 0.058, 0.1], frame, [0, 0.05, -0.02], [0, 0, 0], 0.005);
  // barrel shroud with rib and full under-lug
  box(r, [big ? 0.03 : 0.022, big ? 0.04 : 0.03, len], barrelMat, [0, big ? 0.077 : 0.074, -0.07 - len / 2], [0, 0, 0], 0.005);
  box(r, [big ? 0.014 : 0.011, 0.01, len], barrelMat, [0, big ? 0.1 : 0.092, -0.07 - len / 2], [0, 0, 0], 0.003);
  if (big) {
    for (let i = 0; i < 3; i++) box(r, [0.016, 0.004, 0.012], mat.hole, [0, 0.0985, -0.07 - len + 0.015 + i * 0.016], [0, 0, 0], 0.001);
  } else {
    box(r, [0.002, 0.004, len * 0.9], mat.gold, [0.0115, 0.074, -0.07 - len / 2], [0, 0, 0], 0.0008);
  }
  cyl(r, big ? 0.009 : 0.0065, 0.004, mat.hole, [0, big ? 0.08 : 0.076, -0.071 - len]);
  box(r, [0.004, 0.012, 0.01], big ? mat.red : mat.black, [0, big ? 0.108 : 0.1, -0.06 - len]);
  box(r, [0.018, 0.008, 0.01], mat.black, [0, big ? 0.104 : 0.094, 0.026]);
  // crane + cylinder (swings out to the left for reloads)
  const crane = group(r, [-0.012, 0.03, -0.04]);
  const cylinder = group(crane, [0.012, 0.026, 0]);
  const cr = big ? 0.029 : 0.023;
  const cl = big ? 0.058 : 0.046;
  cyl(cylinder, cr, cl, big ? mat.stainless : mat.steel, [0, 0, 0], 'z', 30);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const flute = box(cylinder, [0.006, 0.004, cl * 0.75], mat.hole, [Math.cos(a) * cr * 0.97, Math.sin(a) * cr * 0.97, 0], [0, 0, a + Math.PI / 2], 0.0015);
    flute.scale.set(1, 0.6, 1);
  }
  const chambers = group(cylinder);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / n;
    cyl(chambers, big ? 0.0072 : 0.006, cl + 0.004, mat.brass, [Math.cos(a) * cr * 0.55, Math.sin(a) * cr * 0.55, 0.001], 'z', 12);
  }
  m.parts.crane = crane;
  m.parts.cylinder = cylinder;
  m.parts.chambers = chambers;
  const hammer = group(r, [0, big ? 0.084 : 0.077, 0.03]);
  box(hammer, [0.008, 0.024, 0.012], mat.black, [0, 0.01, 0.004], [0.3, 0, 0]);
  m.parts.hammer = hammer;
  // trigger guard and trigger
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.0032, 8, 20, Math.PI), frame);
  guard.position.set(0, 0.018, -0.018);
  guard.rotation.set(0, Math.PI / 2, Math.PI);
  r.add(guard);
  box(r, [0.006, 0.018, 0.006], mat.black, [0, 0.016, -0.016], [-0.25, 0, 0]);
  // grip (rubber with finger grooves on the 500)
  const grip = group(r, [0, 0.02, 0.03], [-0.42, 0, 0]);
  box(grip, [big ? 0.034 : 0.028, 0.095, 0.045], mat.rubber, [0, -0.035, 0.006], [0, 0, 0], 0.01);
  if (big) for (let i = 0; i < 3; i++) box(grip, [0.036, 0.008, 0.012], mat.rubber, [0, -0.015 - i * 0.022, -0.017], [0, 0, 0], 0.004);
  else {
    // Sheriff: brass medallions on the grip panels and a thin brass butt cap
    for (const sx of [-1, 1]) {
      cyl(grip, 0.0055, 0.0012, mat.gold, [sx * 0.0143, -0.03, 0.004], 'x', 18);
    }
    box(grip, [0.029, 0.004, 0.046], mat.gold, [0, -0.082, 0.006], [0, 0, 0], 0.0015);
  }
  m.muzzle = anchor(r, [0, big ? 0.08 : 0.076, -0.075 - len]);
  m.eject = anchor(r, [0, 0.056, -0.04]);
  hand(r, 1, [0, -0.012, 0.035], [-0.42, 0, 0]);
  hand(r, -1, [-0.028, -0.024, 0.02], [-0.35, 0.25, -0.45]);
  return m;
}

/** A curved magazine from stacked, progressively rotated segments. */
function curvedMag(parent: THREE.Object3D, segs: number, w: number, step: number, bend: number, m: THREE.Material) {
  let y = 0;
  let z = 0;
  let a = 0;
  for (let i = 0; i < segs; i++) {
    box(parent, [w, step * 1.15, 0.046], m, [0, y, z], [a, 0, 0], 0.003);
    y -= Math.cos(a) * step;
    z -= Math.sin(a) * step;
    a += bend;
  }
}

function mp5(): Model {
  const m = base('mp5', 'smg', {
    sightY: 0.104,
    adsZ: -0.2,
    brass: 'pistol',
    kickBack: 0.016,
    kickUp: 0.06,
    hip: new THREE.Vector3(0.105, -0.11, -0.39),
  });
  const r = m.root;
  box(r, [0.04, 0.05, 0.26], mat.black, [0, 0.062, -0.085], [0, 0, 0], 0.012);
  cyl(r, 0.008, 0.17, mat.black, [-0.012, 0.084, -0.17]);
  const bolt = group(r);
  box(bolt, [0.022, 0.008, 0.01], mat.black, [-0.024, 0.084, -0.215]);
  m.parts.bolt = bolt;
  const hg = group(r, [0, 0.05, -0.235]);
  box(hg, [0.048, 0.048, 0.13], mat.polymer, [0, 0, 0], [0, 0, 0], 0.012);
  for (let i = 0; i < 6; i++) box(hg, [0.05, 0.003, 0.004], mat.hole, [0, -0.012, -0.05 + i * 0.02], [0, 0, 0], 0.001);
  cyl(r, 0.008, 0.07, mat.black, [0, 0.062, -0.33]);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0025, 8, 22), mat.black);
  ring.position.set(0, 0.088, -0.3);
  r.add(ring);
  box(r, [0.004, 0.014, 0.004], mat.black, [0, 0.084, -0.3]);
  cyl(r, 0.012, 0.012, mat.black, [0, 0.094, 0.035], 'x', 18);
  box(r, [0.03, 0.026, 0.08], mat.polymer, [0, 0.028, 0.0], [0, 0, 0], 0.006);
  const grip = group(r, [0, 0.016, 0.03], [-0.3, 0, 0]);
  box(grip, [0.028, 0.09, 0.044], mat.polymer, [0, -0.035, 0.005], [0, 0, 0], 0.009);
  const mag = group(r, [0, 0.04, -0.105]);
  curvedMag(mag, 5, 0.022, 0.026, 0.07, mat.black);
  m.parts.mag = mag;
  cyl(r, 0.004, 0.19, mat.steel, [0.014, 0.068, 0.12]);
  cyl(r, 0.004, 0.19, mat.steel, [-0.014, 0.068, 0.12]);
  box(r, [0.042, 0.062, 0.012], mat.black, [0, 0.052, 0.215], [0, 0, 0], 0.006);
  box(r, [0.006, 0.016, 0.006], mat.black, [0, 0.014, -0.012], [-0.3, 0, 0]);
  m.muzzle = anchor(r, [0, 0.062, -0.37]);
  m.eject = anchor(r, [0.022, 0.075, -0.05]);
  hand(r, 1, [0, -0.012, 0.035], [-0.3, 0, 0]);
  hand(r, -1, [0, 0.01, -0.235], [0.35, 0.05, 0.55]);
  return m;
}

function ak47(): Model {
  const m = base('ak47', 'rifle', {
    sightY: 0.112,
    adsZ: -0.2,
    brass: 'rifle',
    kickBack: 0.022,
    kickUp: 0.08,
    hip: new THREE.Vector3(0.11, -0.12, -0.43),
  });
  const r = m.root;
  box(r, [0.044, 0.054, 0.27], mat.gunmetal, [0, 0.06, -0.045], [0, 0, 0], 0.005);
  box(r, [0.042, 0.016, 0.2], mat.gunmetal, [0, 0.093, -0.03], [0, 0, 0], 0.008);
  for (let i = 0; i < 5; i++) box(r, [0.043, 0.002, 0.006], mat.hole, [0, 0.1, 0.04 - i * 0.015], [0, 0, 0], 0.0008);
  box(r, [0.03, 0.016, 0.03], mat.gunmetal, [0, 0.1, -0.16]);
  box(r, [0.05, 0.036, 0.15], mat.wood, [0, 0.045, -0.255], [0, 0, 0], 0.012);
  box(r, [0.036, 0.022, 0.12], mat.wood, [0, 0.088, -0.255], [0, 0, 0], 0.009);
  cyl(r, 0.007, 0.08, mat.gunmetal, [0, 0.09, -0.355]);
  cyl(r, 0.0085, 0.22, mat.gunmetal, [0, 0.064, -0.4]);
  box(r, [0.012, 0.032, 0.016], mat.gunmetal, [0, 0.082, -0.445], [0, 0, 0], 0.003);
  box(r, [0.016, 0.006, 0.016], mat.gunmetal, [0, 0.1, -0.445], [0, 0, 0], 0.002);
  cyl(r, 0.011, 0.034, mat.black, [0, 0.064, -0.52]);
  const bolt = group(r);
  box(bolt, [0.014, 0.012, 0.022], mat.steel, [0.029, 0.074, -0.075], [0, 0, 0], 0.004);
  m.parts.bolt = bolt;
  box(r, [0.003, 0.03, 0.06], mat.gunmetal, [0.0235, 0.06, -0.03], [0.3, 0, 0], 0.001);
  const grip = group(r, [0, 0.02, 0.04], [-0.35, 0, 0]);
  box(grip, [0.03, 0.085, 0.045], mat.wood, [0, -0.034, 0.006], [0, 0, 0], 0.009);
  box(r, [0.04, 0.058, 0.26], mat.wood, [0, 0.036, 0.215], [0.12, 0, 0], 0.012);
  box(r, [0.042, 0.072, 0.012], mat.black, [0, 0.022, 0.345], [0.12, 0, 0], 0.005);
  const mag = group(r, [0, 0.036, -0.092]);
  curvedMag(mag, 6, 0.03, 0.028, 0.085, mat.gunmetal);
  m.parts.mag = mag;
  box(r, [0.006, 0.016, 0.006], mat.black, [0, 0.024, -0.005], [-0.3, 0, 0]);
  box(r, [0.022, 0.005, 0.05], mat.gunmetal, [0, 0.012, -0.008]);
  m.muzzle = anchor(r, [0, 0.064, -0.54]);
  m.eject = anchor(r, [0.024, 0.08, -0.06]);
  hand(r, 1, [0, -0.012, 0.045], [-0.35, 0, 0]);
  hand(r, -1, [0, 0.008, -0.26], [0.35, 0.05, 0.55]);
  return m;
}

function shotgun(): Model {
  const m = base('shotgun', 'shotgun', {
    sightY: 0.094,
    adsZ: -0.22,
    brass: 'shell',
    kickBack: 0.06,
    kickUp: 0.4,
    hip: new THREE.Vector3(0.11, -0.118, -0.44),
  });
  const r = m.root;
  box(r, [0.042, 0.062, 0.2], mat.black, [0, 0.056, -0.025], [0, 0, 0], 0.006);
  box(r, [0.0425, 0.014, 0.05], mat.hole, [0.0001, 0.07, -0.03], [0, 0, 0], 0.002).scale.set(1.01, 1, 1);
  cyl(r, 0.012, 0.42, mat.black, [0, 0.078, -0.33]);
  cyl(r, 0.011, 0.33, mat.black, [0, 0.046, -0.29]);
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.003, 10, 8), mat.steel);
  bead.position.set(0, 0.092, -0.535);
  r.add(bead);
  const pump = group(r);
  box(pump, [0.052, 0.046, 0.14], mat.polymer, [0, 0.045, -0.24], [0, 0, 0], 0.012);
  for (let i = 0; i < 7; i++) box(pump, [0.054, 0.004, 0.005], mat.hole, [0, 0.03, -0.29 + i * 0.016], [0, 0, 0], 0.001);
  m.parts.pump = pump;
  box(r, [0.04, 0.066, 0.3], mat.polymer, [0, 0.03, 0.225], [0.14, 0, 0], 0.012);
  box(r, [0.042, 0.078, 0.014], mat.rubber, [0, 0.012, 0.37], [0.14, 0, 0], 0.005);
  box(r, [0.02, 0.006, 0.05], mat.black, [0, 0.018, -0.0]);
  box(r, [0.006, 0.016, 0.006], mat.black, [0, 0.03, 0.002], [-0.3, 0, 0]);
  // a shell for the reload animation (shown only then)
  const shell = group(r, [0, -0.06, -0.03]);
  cyl(shell, 0.0095, 0.05, mat.red, [0, 0, -0.005], 'z', 14);
  cyl(shell, 0.0098, 0.014, mat.brass, [0, 0, 0.025], 'z', 14);
  shell.visible = false;
  m.parts.shell = shell;
  m.muzzle = anchor(r, [0, 0.078, -0.545]);
  m.eject = anchor(r, [0.024, 0.07, -0.03]);
  hand(r, 1, [0, 0.0, 0.07], [-0.42, 0, 0]);
  hand(pump, -1, [0, 0.015, -0.24], [0.35, 0.05, 0.55]);
  return m;
}

/** Karambit: a claw blade with a fade finish, a G10 handle and the finger ring it spins on. */
function karambit(): Model {
  const m = base('karambit', 'melee', {
    // held low on the right, the blade turned across the view so its curve and fade read clearly
    hip: new THREE.Vector3(0.115, -0.105, -0.3),
    hipRot: new THREE.Euler(0.55, 0.95, 0.25),
    brass: 'none',
    kickBack: 0,
    kickUp: 0,
  });
  const r = m.root;
  const spinner = group(r, [0, 0, 0.05]);
  spinner.scale.setScalar(1.3);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.0052, 12, 30), mat.black);
  ring.rotation.y = Math.PI / 2;
  spinner.add(ring);
  box(spinner, [0.016, 0.024, 0.09], mat.black, [0, -0.002, -0.06], [0, 0, 0], 0.006);
  box(spinner, [0.0168, 0.004, 0.08], mat.accent, [0, -0.002, -0.058], [0, 0, 0], 0.001);
  for (let i = 0; i < 3; i++) box(spinner, [0.017, 0.003, 0.003], mat.steel, [0, 0.003, -0.035 - i * 0.025], [0, 0, 0], 0.0008);
  // blade: an extruded claw shape, curving down
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.011);
  shape.quadraticCurveTo(0.058, 0.02, 0.104, -0.038);
  shape.quadraticCurveTo(0.064, -0.004, 0.0, -0.011);
  shape.lineTo(0, 0.011);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.0024, bevelEnabled: true, bevelThickness: 0.0011, bevelSize: 0.0016, bevelSegments: 3, curveSegments: 24 });
  geo.translate(0, 0, -0.0012);
  // fade finish: gold at the base through magenta to violet at the tip
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const a = new THREE.Color(0xf5d77a);
  const b = new THREE.Color(0xe0569b);
  const d = new THREE.Color(0x6f5bd8);
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp(pos.getX(i) / 0.104, 0, 1);
    if (t < 0.5) c.copy(a).lerp(b, t * 2);
    else c.copy(b).lerp(d, (t - 0.5) * 2);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const blade = new THREE.Mesh(geo, mat.blade);
  blade.rotation.y = Math.PI / 2;
  blade.position.set(0, 0, -0.103);
  spinner.add(blade);
  m.parts.spinner = spinner;
  m.muzzle = anchor(r, [0, 0, -0.2]);
  m.eject = anchor(r, [0, 0, 0]);
  hand(r, 1, [0, -0.008, -0.01], [0, 0, 0]);
  return m;
}

const BUILDERS: Record<string, () => Model> = {
  glock,
  deagle,
  sheriff: () => revolver('sheriff'),
  sw500: () => revolver('sw500'),
  mp5,
  ak47,
  shotgun,
  karambit,
};

/** A weapon model on its own (for the workbench): same geometry, no hands. */
export function buildWeapon(id: string) {
  const make = BUILDERS[id];
  if (!make) return null;
  withHands = false;
  try {
    const m = make();
    return { root: m.root, kind: m.kind };
  } finally {
    withHands = true;
  }
}

/* ── animation helpers ──────────────────────────────────────────────── */
const ease = (t: number) => {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
/** piecewise eased keyframes: [[time, value], ...] (times 0..1) */
const kf = (u: number, keys: [number, number][]) => {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (u <= t1) return v0 + (v1 - v0) * ease((u - t0) / Math.max(1e-6, t1 - t0));
  }
  return keys[keys.length - 1][1];
};

type Spring = { x: number; v: number };
const spring = (s: Spring, to: number, k: number, d: number, dt: number) => {
  s.v += (k * (to - s.x) - d * s.v) * dt;
  s.x += s.v * dt;
};

function flashTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,240,1)');
  grad.addColorStop(0.18, 'rgba(255,220,140,0.95)');
  grad.addColorStop(0.45, 'rgba(255,140,40,0.45)');
  grad.addColorStop(1, 'rgba(255,90,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  // spikes
  g.globalCompositeOperation = 'lighter';
  g.translate(64, 64);
  for (let i = 0; i < 6; i++) {
    g.rotate((Math.PI * 2) / 6 + Math.random() * 0.3);
    const sg = g.createLinearGradient(0, 0, 60, 0);
    sg.addColorStop(0, 'rgba(255,240,200,0.9)');
    sg.addColorStop(1, 'rgba(255,140,40,0)');
    g.fillStyle = sg;
    g.beginPath();
    g.moveTo(0, -4);
    g.lineTo(62, 0);
    g.lineTo(0, 4);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function WeaponView({
  apiRef,
  visible,
}: {
  apiRef: { current: WeaponViewApi | null };
  visible: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch {
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.85;
    const camera = new THREE.PerspectiveCamera(52, 1, 0.01, 10);
    scene.add(new THREE.HemisphereLight(0xdfe7ff, 0x1a1a1f, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(-0.6, 1, 0.5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7dd3fc, 1.6);
    rim.position.set(0.8, 0.4, -1);
    scene.add(rim);
    // fill from behind the camera, so what faces you is never lost in the dark room
    const fill = new THREE.DirectionalLight(0xffffff, 1.1);
    fill.position.set(0.15, 0.25, 1);
    scene.add(fill);
    const flashLight = new THREE.PointLight(0xffb060, 0, 1.2, 2);
    scene.add(flashLight);

    const holder = new THREE.Group(); // pose (ads, bob, sway, recoil...)
    scene.add(holder);
    const models = new Map<string, Model>();
    const getModel = (id: string) => {
      if (!BUILDERS[id]) return null;
      let model = models.get(id);
      if (!model) {
        model = BUILDERS[id]();
        model.root.traverse((o) => {
          o.frustumCulled = false;
        });
        models.set(id, model);
      }
      return model;
    };

    // muzzle flash and brass
    const flash = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: flashTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    flash.visible = false;
    scene.add(flash);
    const brassGeo = { pistol: new THREE.CylinderGeometry(0.0045, 0.0045, 0.019, 10), rifle: new THREE.CylinderGeometry(0.0055, 0.005, 0.038, 10), shell: new THREE.CylinderGeometry(0.0095, 0.0095, 0.06, 12) };
    const casings: { mesh: THREE.Mesh; v: THREE.Vector3; spin: THREE.Vector3; life: number }[] = [];
    const spawnBrass = (kind: Model['brass'], from: THREE.Object3D) => {
      if (kind === 'none') return;
      const mesh = new THREE.Mesh(brassGeo[kind], kind === 'shell' ? mat.red : mat.brass);
      from.getWorldPosition(mesh.position);
      mesh.rotation.set(Math.random(), Math.random(), Math.PI / 2);
      scene.add(mesh);
      casings.push({
        mesh,
        v: new THREE.Vector3(0.9 + Math.random() * 0.5, 0.9 + Math.random() * 0.5, 0.15 + Math.random() * 0.2),
        spin: new THREE.Vector3(Math.random() * 20, Math.random() * 20, Math.random() * 20),
        life: 0.9,
      });
      if (casings.length > 14) {
        const old = casings.shift();
        if (old) scene.remove(old.mesh);
      }
    };

    // state
    let current: Model | null = null;
    let pending: string | null = null;
    let switchT = 1; // 0..1 raise progress; negative while lowering
    let lowering = false;
    let adsOn = false;
    const ads: Spring = { x: 0, v: 0 };
    const rz: Spring = { x: 0, v: 0 };
    const rx: Spring = { x: 0, v: 0 };
    const rroll: Spring = { x: 0, v: 0 };
    const sway = { x: 0, y: 0 };
    let bob = 0;
    const motion = { speed: 0, grounded: true, sprint: false, turn: [0, 0] as [number, number] };
    let sprintK = 0;
    let wasGrounded = true;
    const land: Spring = { x: 0, v: 0 };
    let shotT = 9;
    let slideLocked = false;
    let cylAngle = 0;
    let cylTarget = 0;
    let hammerDown = 0;
    let pumpT = 9;
    let flashT = 9;
    let reload: { t: number; dur: number; empty: boolean; shells: number; fired: Set<string> } | null = null;
    let inspect: { t: number; dur: number } | null = null;
    let melee: { t: number; dur: number; heavy: boolean } | null = null;

    const cue = (name: string, at: number, u: number, fired: Set<string>, sound: Parameters<typeof playMech>[0]) => {
      if (u >= at && !fired.has(name)) {
        fired.add(name);
        playMech(sound);
      }
    };

    let draw: { t: number; dur: number } | null = null;
    const show = (id: string) => {
      if (current) current.root.removeFromParent();
      current = getModel(id);
      if (!current) return;
      holder.add(current.root);
      switchT = 0;
      slideLocked = false;
      reload = null;
      inspect = null;
      melee = null;
      cylAngle = cylTarget = 0;
      // each weapon has its own draw: rack, spin, charge, pump or a flip of the knife
      draw = { t: 0, dur: current.kind === 'melee' ? 0.75 : current.kind === 'shotgun' || current.kind === 'rifle' || current.kind === 'smg' ? 0.95 : 0.8 };
      playMech('equip');
    };

    const api: WeaponViewApi = {
      equip: (id) => {
        if (current?.id === id && !lowering) return;
        if (!BUILDERS[id]) {
          pending = null;
          lowering = !!current;
          if (!current) return;
          pending = '';
          return;
        }
        if (!current) show(id);
        else {
          pending = id;
          lowering = true;
        }
      },
      fire: (empty) => {
        if (!current) return;
        inspect = null;
        if (current.kind === 'revolver') {
          hammerDown = 1;
          cylTarget += (Math.PI * 2) / current.chambers;
        }
        if (empty) return;
        shotT = 0;
        flashT = 0;
        rz.v += current.kickBack * 30;
        rx.v += current.kickUp * 12;
        rroll.v += (Math.random() - 0.5) * current.kickUp * 6;
        if (current.kind === 'shotgun') pumpT = 0;
        else if (current.brass !== 'none') spawnBrass(current.brass, current.eject);
      },
      reload: (duration, empty, shells = 1) => {
        if (!current) return;
        inspect = null;
        reload = { t: 0, dur: duration, empty, shells, fired: new Set() };
      },
      inspect: () => {
        if (!current || reload || melee) return;
        inspect = { t: 0, dur: current.kind === 'melee' ? 2.1 : 2.4 };
      },
      melee: (heavy) => {
        if (!current) return;
        inspect = null;
        melee = { t: 0, dur: heavy ? 0.75 : 0.42, heavy };
      },
      setAds: (on) => {
        adsOn = on;
      },
      setMotion: (mm) => Object.assign(motion, mm),
      setTint: (hex) => {
        const c = new THREE.Color(hex);
        rim.color.copy(c);
        mat.accent.color.copy(c);
        mat.accent.emissive.copy(c);
      },
      busy: () => !!reload || lowering || (!!current && switchT < 0.7),
    };
    apiRef.current = api;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // keep the gun the same size on wide and narrow screens
      camera.fov = w / h < 1 ? 64 : 52;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let last = performance.now();
    const v3 = new THREE.Vector3();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visibleRef.current) {
        if (canvas.style.opacity !== '0') renderer.clear();
        return;
      }

      // switching: lower the old one, then raise the new one
      if (lowering) {
        switchT -= dt / 0.18;
        if (switchT <= 0) {
          lowering = false;
          if (pending) show(pending);
          else {
            if (current) current.root.removeFromParent();
            current = null;
          }
          pending = null;
        }
      } else if (switchT < 1) switchT = Math.min(1, switchT + dt / 0.38);

      const m = current;
      // timers
      shotT += dt;
      flashT += dt;
      pumpT += dt;
      hammerDown = Math.max(0, hammerDown - dt * 3);
      if (reload) {
        reload.t += dt;
        if (reload.t >= reload.dur) {
          reload = null;
          slideLocked = false;
        }
      }
      if (inspect) {
        inspect.t += dt;
        if (inspect.t >= inspect.dur) inspect = null;
      }
      if (melee) {
        melee.t += dt;
        if (melee.t >= melee.dur) melee = null;
      }

      // springs: aim, recoil
      spring(ads, adsOn && !reload && !inspect && m && m.kind !== 'melee' ? 1 : 0, 220, 26, dt);
      spring(rz, 0, 380, 26, dt);
      spring(rx, 0, 260, 20, dt);
      spring(rroll, 0, 200, 18, dt);
      sprintK += ((motion.sprint && motion.speed > 0.4 && !adsOn ? 1 : 0) - sprintK) * (1 - Math.exp(-dt * 8));
      // walking bob and look sway
      if (motion.grounded && motion.speed > 0.05) bob += dt * (6 + motion.speed * 6);
      if (motion.grounded && !wasGrounded) land.v -= 0.5; // the gun dips when you land
      if (!motion.grounded && wasGrounded) land.v += 0.25; // and lifts as you jump
      wasGrounded = motion.grounded;
      spring(land, 0, 160, 14, dt);
      if (draw) {
        draw.t += dt;
        if (draw.t >= draw.dur) draw = null;
      }
      const walk = Math.min(1, motion.speed / 0.75) * (motion.grounded ? 1 : 0.3) * (1 - ads.x * 0.85);
      sway.x += (-motion.turn[0] * 0.012 - sway.x) * (1 - Math.exp(-dt * 10));
      sway.y += (motion.turn[1] * 0.012 - sway.y) * (1 - Math.exp(-dt * 10));
      sway.x = THREE.MathUtils.clamp(sway.x, -0.04, 0.04);
      sway.y = THREE.MathUtils.clamp(sway.y, -0.03, 0.03);

      if (m) {
        const a = THREE.MathUtils.clamp(ads.x, 0, 1);
        const hip = m.hip;
        const aim = v3.set(0, -m.sightY, m.adsZ);
        const pos = new THREE.Vector3().copy(hip).lerp(aim, a);
        const rot = new THREE.Euler(m.hipRot.x * (1 - a), m.hipRot.y * (1 - a), m.hipRot.z * (1 - a));
        // idle breathing, walk bob, sway, sprint
        const breath = Math.sin(now / 1000 * 1.6) * 0.0015 * (1 - a * 0.7);
        pos.x += Math.sin(bob) * 0.008 * walk + sway.x * (1 - a * 0.6);
        pos.y += -Math.abs(Math.cos(bob)) * 0.007 * walk + breath + sway.y * (1 - a * 0.6);
        rot.z += Math.sin(bob) * 0.02 * walk - sway.x * 2;
        rot.x += sprintK * -0.35;
        rot.y += sprintK * 0.55;
        pos.y -= sprintK * 0.05;
        pos.x -= sprintK * 0.02;
        // equip / switch
        const up = ease(Math.max(0, switchT));
        pos.y -= (1 - up) * 0.22;
        rot.x -= (1 - up) * 0.7;
        rot.z += (1 - up) * 0.35;
        pos.y += land.x * 0.05;
        rot.x += land.x * 0.12;
        // recoil
        pos.z += rz.x;
        rot.x += rx.x;
        rot.z += rroll.x;

        const parts = m.parts;
        // slide: kicks back and returns; stays back once the last round is gone
        if (parts.slide) {
          const back = shotT < 0.09 ? Math.sin((shotT / 0.09) * Math.PI) : 0;
          parts.slide.position.z = (slideLocked ? 1 : back) * (m.id === 'deagle' ? 0.034 : 0.028);
        }
        if (parts.bolt) parts.bolt.position.z = shotT < 0.06 ? Math.sin((shotT / 0.06) * Math.PI) * 0.03 : 0;
        if (parts.hammer) parts.hammer.rotation.x = (m.kind === 'revolver' ? -0.5 * hammerDown : shotT < 0.08 ? -0.4 : 0);
        if (parts.cylinder) {
          cylAngle += (cylTarget - cylAngle) * (1 - Math.exp(-dt * 30));
          parts.cylinder.rotation.z = cylAngle;
        }
        if (parts.pump) {
          // after each shot: rack back (eject) and forward
          const u = (pumpT - 0.14) / 0.42;
          const back = u > 0 && u < 1 ? Math.sin(u * Math.PI) : 0;
          parts.pump.position.z = back * 0.075;
          if (u > 0.45 && u < 0.45 + dt / 0.42 + 0.001 && m.id === 'shotgun') {
            spawnBrass('shell', m.eject);
            playMech('pump');
          }
        }
        if (parts.crane) parts.crane.rotation.z = 0;
        if (parts.chambers) parts.chambers.position.z = 0;
        if (parts.chambers) parts.chambers.visible = true;
        if (parts.mag) {
          parts.mag.position.set(0, 0, 0);
          parts.mag.rotation.set(0, 0, 0);
          parts.mag.visible = true;
        }
        if (parts.shell) parts.shell.visible = false;
        if (parts.spinner) parts.spinner.rotation.set(0, 0, 0);

        // draw: racked, spun, charged, pumped or flipped as it comes up
        if (draw && !reload) {
          const u = draw.t / draw.dur;
          const f = new Set<string>();
          if (m.kind === 'pistol') {
            rot.z += kf(u, [[0, 0], [0.35, -0.35], [0.75, -0.35], [1, 0]]);
            if (parts.slide) parts.slide.position.z = kf(u, [[0.45, 0], [0.58, m.id === 'deagle' ? 0.034 : 0.028], [0.66, 0]]);
            if (u > 0.58 && u < 0.58 + dt / draw.dur + 1e-3) playMech('slide');
          } else if (m.kind === 'revolver') {
            rot.z += kf(u, [[0, 0], [0.3, 0.5], [0.8, 0.5], [1, 0]]);
            if (u > 0.3 && u < 0.75) cylTarget += dt * 35;
            if (parts.hammer) parts.hammer.rotation.x = kf(u, [[0.6, 0], [0.75, -0.5], [0.85, 0]]);
            if (u > 0.3 && u < 0.3 + dt / draw.dur + 1e-3) playMech('cylinder');
          } else if (m.kind === 'smg' || m.kind === 'rifle') {
            rot.z += kf(u, [[0, 0], [0.35, -0.4], [0.8, -0.4], [1, 0]]);
            rot.x += kf(u, [[0, 0], [0.35, 0.1], [0.8, 0.1], [1, 0]]);
            if (parts.bolt) parts.bolt.position.z = kf(u, [[0.5, 0], [0.6, 0.06], [0.68, 0]]);
            if (u > 0.6 && u < 0.6 + dt / draw.dur + 1e-3) playMech('slide');
          } else if (m.kind === 'shotgun') {
            rot.z += kf(u, [[0, 0], [0.35, -0.3], [0.8, -0.3], [1, 0]]);
            if (parts.pump) parts.pump.position.z = kf(u, [[0.45, 0], [0.58, 0.075], [0.7, 0]]);
            if (u > 0.5 && u < 0.5 + dt / draw.dur + 1e-3) playMech('pump');
          } else if (m.kind === 'melee' && parts.spinner) {
            // flicked open round the finger ring
            parts.spinner.rotation.x = kf(u, [[0, -Math.PI * 2], [0.7, 0]]);
            rot.y += kf(u, [[0, 0.6], [0.8, 0]]);
          }
          void f;
        }

        // reload choreography
        if (reload) {
          const u = reload.t / reload.dur;
          const f = reload.fired;
          if (m.kind === 'pistol') {
            rot.x += kf(u, [[0, 0], [0.12, 0.3], [0.78, 0.3], [0.92, 0]]);
            rot.z += kf(u, [[0, 0], [0.12, -0.5], [0.78, -0.5], [0.92, 0]]);
            pos.x += kf(u, [[0, 0], [0.12, -0.04], [0.78, -0.04], [0.92, 0]]);
            if (parts.mag) {
              parts.mag.position.y = kf(u, [[0.14, 0], [0.32, -0.32], [0.42, -0.32], [0.43, -0.24], [0.62, 0]]);
              parts.mag.visible = u < 0.32 || u > 0.43;
            }
            cue('out', 0.16, u, f, 'magOut');
            cue('in', 0.62, u, f, 'magIn');
            if (reload.empty) {
              slideLocked = u < 0.78;
              cue('slide', 0.78, u, f, 'slide');
            }
          } else if (m.kind === 'revolver') {
            rot.z += kf(u, [[0, 0], [0.12, 0.9], [0.84, 0.9], [0.95, 0]]);
            rot.x += kf(u, [[0, 0], [0.12, 0.15], [0.28, 0.75], [0.42, 0.75], [0.5, -0.25], [0.7, -0.25], [0.84, 0.15], [0.95, 0]]);
            pos.x += kf(u, [[0, 0], [0.12, -0.05], [0.84, -0.05], [0.95, 0]]);
            if (parts.crane) parts.crane.rotation.z = kf(u, [[0.1, 0], [0.2, 1.25], [0.74, 1.25], [0.82, 0]]);
            if (parts.chambers) {
              parts.chambers.position.z = kf(u, [[0.26, 0], [0.36, 0.12], [0.37, -0.16], [0.62, 0]]);
              parts.chambers.visible = !(u > 0.36 && u < 0.45);
            }
            if (u > 0.84 && u < 0.95) cylTarget += dt * 40;
            cue('open', 0.18, u, f, 'cylinder');
            cue('dump', 0.34, u, f, 'shell');
            cue('load', 0.62, u, f, 'magIn');
            cue('close', 0.8, u, f, 'cylinder');
          } else if (m.kind === 'smg' || m.kind === 'rifle') {
            rot.z += kf(u, [[0, 0], [0.12, -0.35], [0.82, -0.35], [0.94, 0]]);
            rot.x += kf(u, [[0, 0], [0.12, 0.12], [0.82, 0.12], [0.94, 0]]);
            if (parts.mag) {
              parts.mag.rotation.x = kf(u, [[0.12, 0], [0.2, 0.35], [0.42, 0.35], [0.6, 0]]);
              parts.mag.position.y = kf(u, [[0.18, 0], [0.32, -0.3], [0.42, -0.3], [0.43, -0.22], [0.6, 0]]);
              parts.mag.visible = u < 0.32 || u > 0.43;
            }
            if (parts.bolt && reload.empty) parts.bolt.position.z = kf(u, [[0.68, 0], [0.74, 0.06], [0.78, 0.06], [0.8, 0]]);
            cue('out', 0.2, u, f, 'magOut');
            cue('in', 0.6, u, f, 'magIn');
            if (reload.empty) cue('bolt', 0.79, u, f, 'slide');
          } else if (m.kind === 'shotgun') {
            // tip the gun to show the loading port, feed shells one at a time
            const lead = 0.3 / reload.dur;
            rot.z += kf(u, [[0, 0], [lead, -0.6], [0.92, -0.6], [1, 0]]);
            rot.x += kf(u, [[0, 0], [lead, 0.25], [0.92, 0.25], [1, 0]]);
            pos.y += kf(u, [[0, 0], [lead, 0.03], [0.92, 0.03], [1, 0]]);
            const body = (reload.dur - 0.3 - (reload.empty ? 0.45 : 0)) / reload.dur;
            const per = body / Math.max(1, reload.shells);
            const k = (u - lead) / per;
            if (k >= 0 && k < reload.shells && parts.shell) {
              const s = k - Math.floor(k);
              parts.shell.visible = s < 0.8;
              parts.shell.position.set(0, kf(s, [[0, -0.09], [0.6, 0.012]]), kf(s, [[0, 0.02], [0.4, 0.02], [0.75, -0.05]]));
              cue(`shell${Math.floor(k)}`, lead + (Math.floor(k) + 0.6) * per, u, f, 'shell');
            }
            if (reload.empty && parts.pump) {
              const pu = (u - (lead + body)) / (0.45 / reload.dur);
              if (pu > 0 && pu < 1) parts.pump.position.z = Math.sin(pu * Math.PI) * 0.075;
              cue('pump', lead + body + 0.05 / reload.dur, u, f, 'pump');
            }
          }
        }

        // inspect
        if (inspect) {
          const u = inspect.t / inspect.dur;
          if (m.kind === 'melee' && parts.spinner) {
            // the karambit twirl: two spins round the finger ring, then a flip to look at the blade
            parts.spinner.rotation.x = kf(u, [[0.05, 0], [0.4, -Math.PI * 4], [0.62, -Math.PI * 4], [0.78, -Math.PI * 4 - 0.6], [0.92, -Math.PI * 4]]);
            rot.y += kf(u, [[0, 0], [0.45, 0.4], [0.62, 1.2], [0.85, 1.2], [1, 0]]);
            rot.z += kf(u, [[0, 0], [0.45, -0.2], [0.62, 0.5], [0.85, 0.5], [1, 0]]);
            pos.x += kf(u, [[0, 0], [0.5, -0.04], [0.85, -0.06], [1, 0]]);
            pos.y += kf(u, [[0, 0], [0.5, 0.04], [0.85, 0.04], [1, 0]]);
            if (u > 0.08 && u < 0.4 && Math.floor(u * 20) !== Math.floor((u - dt / inspect.dur) * 20)) playMech('cylinder');
          } else {
            rot.z += kf(u, [[0, 0], [0.18, 1.05], [0.5, 1.05], [0.66, -0.35], [0.86, -0.35], [1, 0]]);
            rot.y += kf(u, [[0, 0], [0.18, 0.35], [0.5, 0.35], [0.66, -0.2], [0.86, -0.2], [1, 0]]);
            pos.x += kf(u, [[0, 0], [0.18, -0.05], [0.86, -0.05], [1, 0]]);
            pos.y += kf(u, [[0, 0], [0.18, 0.03], [0.86, 0.03], [1, 0]]);
            if (m.kind === 'revolver' && u > 0.5 && u < 0.66) cylTarget += dt * 30;
          }
        }

        // knife attacks
        if (melee) {
          const u = melee.t / melee.dur;
          if (melee.heavy) {
            pos.z += kf(u, [[0, 0], [0.25, 0.05], [0.45, -0.16], [0.6, -0.16], [1, 0]]);
            pos.x += kf(u, [[0, 0], [0.25, 0.02], [0.45, -0.1], [1, 0]]);
            rot.x += kf(u, [[0, 0], [0.25, 0.5], [0.45, -0.5], [0.6, -0.5], [1, 0]]);
            rot.y += kf(u, [[0, 0], [0.45, 0.4], [1, 0]]);
          } else {
            pos.x += kf(u, [[0, 0], [0.18, 0.05], [0.55, -0.22], [1, 0]]);
            pos.y += kf(u, [[0, 0], [0.18, 0.04], [0.55, -0.03], [1, 0]]);
            rot.y += kf(u, [[0, 0], [0.18, -0.5], [0.55, 1.3], [1, 0]]);
            rot.z += kf(u, [[0, 0], [0.18, 0.3], [0.55, -0.6], [1, 0]]);
          }
        }

        holder.position.copy(pos);
        holder.rotation.copy(rot);

        // muzzle flash
        if (flashT < 0.05 && m.kind !== 'melee') {
          m.muzzle.getWorldPosition(flash.position);
          flash.visible = true;
          const size = (m.kind === 'revolver' || m.kind === 'shotgun' ? 0.16 : m.kind === 'rifle' ? 0.13 : 0.1) * (0.8 + Math.random() * 0.4);
          flash.scale.set(size, size, size);
          flash.rotation.set(0, 0, Math.random() * Math.PI);
          flash.lookAt(camera.position);
          flash.rotateZ(Math.random() * Math.PI);
          flashLight.position.copy(flash.position);
          flashLight.intensity = 6 * (1 - flashT / 0.05);
        } else {
          flash.visible = false;
          flashLight.intensity = 0;
        }
      }

      // brass
      for (let i = casings.length - 1; i >= 0; i--) {
        const cs = casings[i];
        cs.life -= dt;
        cs.v.y -= 6 * dt;
        cs.mesh.position.addScaledVector(cs.v, dt);
        cs.mesh.rotation.x += cs.spin.x * dt;
        cs.mesh.rotation.y += cs.spin.y * dt;
        if (cs.life <= 0) {
          scene.remove(cs.mesh);
          casings.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      apiRef.current = null;
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, [apiRef]);

  return (
    <canvas
      ref={canvasRef}
      className="room-weapon"
      aria-hidden="true"
      style={{ opacity: visible ? 1 : 0 }}
    />
  );
}
