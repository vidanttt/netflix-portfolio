'use client';

import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes } from 'react';
import { BOXES, RANGE } from '@/lib/rangeLayout';

export type GridScanLineStyle = 'solid' | 'dashed' | 'dotted';

export type GridScanDirection = 'forward' | 'backward' | 'pingpong';

export type GridScanClickEffect = 'ping' | 'scan' | 'none';

export interface GridScanProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  linesColor?: string;
  scanColor?: string;
  cells?: number;
  lineThickness?: number;
  lineStyle?: GridScanLineStyle;
  depth?: number;
  depthFade?: number;
  parallax?: number;
  points?: boolean;
  reflection?: number;
  shading?: number;
  scanDirection?: GridScanDirection;
  scanDuration?: number;
  scanDelay?: number;
  scanWidth?: number;
  trail?: number;
  glow?: number;
  autoScan?: boolean;
  interactive?: boolean;
  clickEffect?: GridScanClickEffect;
  enableWebcam?: boolean;
  showPreview?: boolean;
  modelsPath?: string;
  enableGyro?: boolean;
  intro?: boolean;
  /** build everything and draw the first frame, but hold still (and keep the intro waiting)
   *  until this turns false: the room loads behind the opening title */
  hold?: boolean;
  lightMode?: boolean;
  dpr?: number;
  /** Called every frame with the camera's offset, normalised to -1..1 (x: right, y: up). */
  onEye?: (x: number, y: number) => void;
  /** First-person mode: the view flies from the window into the room and WASD / mouse take over. */
  fps?: boolean;
  /** Called when the player leaves first-person mode (Esc, or the pointer lock is lost). */
  onFpsExit?: () => void;
  /**
   * Called every frame with the camera that drew the room, so page content can be placed in the
   * room with the same projection. `blend` is 0 in the normal window view and 1 in first person.
   * A world point P (room units, y up, z into the room) lands on screen at
   *   c = (r.(P - pos), u.(P - pos), f.(P - pos));  screen = c.xy / c.z * focal + shift
   * in screen-height units from the centre of the screen (y up).
   */
  onCamera?: (camera: RoomCamera) => void;
  /** Doors on the side walls in first person: side -1 (left) / 1 (right), centre z along the wall. */
  doors?: { side: number; z: number }[];
  /** Index of the door that should be open (-1 for none). */
  openDoor?: number;
  /** First person stays on but movement and looking pause (e.g. while a door's card is open). */
  paused?: boolean;
  /** Mouse look pauses (the tablet is up) but walking still works. */
  lookPaused?: boolean;
  /** Player tuning from the tablet: mouse sensitivity and field of view as multipliers, head bob on/off. */
  sensitivity?: number;
  fovScale?: number;
  headBob?: boolean;
  /** Room lights, 0 (dim) .. 1 (on). */
  lights?: number;
  /** Footsteps, jumps and landings, for sound. `amount` is 0..1. */
  onStep?: (kind: 'step' | 'jump' | 'land', amount: number) => void;
  /** aim-down-sights zoom: field of view (and sensitivity) multiplier, 1 = none */
  zoom?: number;
  /** filled in with the room's controls for weapons and the range */
  controlRef?: { current: RoomControl | null };
  style?: CSSProperties;
}

/** Things the page can ask the room for while in first person (weapons, the training range). */
export type RoomControl = {
  /** recoil: radians up / to the side; part of it stays (climb), the rest springs back */
  kick: (up: number, side: number) => void;
  /** a bullet mark on a wall at this point */
  impact: (x: number, y: number, z: number) => void;
  /** the ray through the crosshair (camera position + view direction, recoil included) */
  aim: () => { o: [number, number, number]; d: [number, number, number] };
  /** where a ray first meets the rooms' walls (through the training doorway if it fits) */
  trace: (o: number[], d: number[]) => { t: number; x: number; y: number; z: number; face: number };
  /** pings on click (off while a weapon is out) */
  setPings: (on: boolean) => void;
  /** aim-down-sights: field of view (and sensitivity) multiplier, 1 = none */
  setZoom: (zoom: number) => void;
  /** whether any of the main room is on screen (in the training hall with the doorway out of
   *  view it isn't: the room keeps running but skips drawing) */
  setMainVisible: (on: boolean) => void;
};

export type RoomCamera = {
  blend: number;
  pos: [number, number, number];
  right: [number, number, number];
  up: [number, number, number];
  forward: [number, number, number];
  focal: number;
  shift: [number, number];
  time: number;
  /** door under the crosshair, -1 for none */
  aimDoor: number;
  /** whether the mouse is captured (pointer lock) */
  locked: boolean;
  /** horizontal speed (room units / s), on the ground or not, sprinting */
  speed: number;
  grounded: boolean;
  sprinting: boolean;
  /** 0 main room, 1 training range (by camera position) */
  room: number;
  /** the training doorway is open (fully in first person) */
  trainOpen: boolean;
  /** how fast the view turned this frame (radians / s) — for weapon sway */
  turnRate: [number, number];
  /** room width / height */
  aspect: number;
  /** depth of the main room (its back wall, where the mirror hangs) */
  depth: number;
  /** the player's body: feet, facing (yaw 0 looks down +z), look pitch, vertical speed */
  body: { x: number; y: number; z: number; yaw: number; pitch: number; vy: number };
  /** first person is on (not just blending) */
  fps: boolean;
};

type Settings = {
  linesColor: string;
  scanColor: string;
  cells: number;
  thickness: number;
  style: number;
  depth: number;
  depthFade: number;
  parallax: number;
  points: boolean;
  reflection: number;
  shading: number;
  direction: GridScanDirection;
  duration: number;
  delay: number;
  scanWidth: number;
  trail: number;
  glow: number;
  autoScan: boolean;
  interactive: boolean;
  clickEffect: GridScanClickEffect;
  enableGyro: boolean;
  intro: boolean;
  hold: boolean;
  lightMode: boolean;
  dpr?: number;
  fps: boolean;
  /** `color` (hex) tints a door's frame, seams and light; a `portal` is drawn by the page's
   *  door layer, so the room only adds its glow round the frame and on the floor */
  doors: { side: number; z: number; color?: string; portal?: boolean; dressed?: boolean }[];
  openDoor: number;
  paused: boolean;
  lookPaused: boolean;
  sensitivity: number;
  fovScale: number;
  headBob: boolean;
  lights: number;
  zoom: number;
};

type Program = { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> };

type Target = { texture: WebGLTexture | null; width: number; height: number };

type Ping = { x: number; y: number; z: number; age: number };

type Head = { active: boolean; move: (nx: number, ny: number, near: number) => void; release: () => void };

type Status = 'loading' | 'searching' | 'tracking' | 'blocked';

type FaceApi = {
  nets: { tinyFaceDetector: { loadFromUri: (url: string) => Promise<void> } };
  TinyFaceDetectorOptions: new (options: { inputSize: number; scoreThreshold: number }) => unknown;
  detectSingleFace: (
    input: HTMLVideoElement,
    options: unknown
  ) => PromiseLike<{ box: { x: number; y: number; width: number; height: number } } | undefined>;
};

type FaceScope = { faceapi?: FaceApi };

const MAX_PINGS = 4;
const PING_LIFE = 2.4;
const INTRO_SECONDS = 2.2;
// on tall, narrow screens the sideways eye travel is scaled up so tilting still moves things as much as hovering does on a desktop
const MIN_EYE_ASPECT = 0.95;
const EYE_DISTANCE = 1.25;
// First-person mode, in room units (the room is 1 tall; the window/screen sits at z = 0)
const FPS_FRONT = -1; // the room gets a front wall behind where the window was
const FPS_EYE = 0.58; // eye height above the floor (FPS_EYE_HEIGHT)
const FPS_START_Z = -0.6;
const FPS_RADIUS = 0.12;
const FPS_SPEED = 0.75;
const FPS_SPRINT = 1.35;
const FPS_JUMP = 1.55;
const FPS_GRAVITY = 5.5;
const FPS_FOV = 0.62; // tan of half the vertical field of view
const FPS_SENS = 0.0022;
const FPS_TURN = 2.2; // arrow-key turn speed, radians per second
const FPS_BLEND_SECONDS = 1.15;
const MAX_DOORS = 8;
/** The training range: a second room behind the spawn wall, reached through an open doorway. */
export const TRAIN_FRONT = -1; // the shared wall (= FPS_FRONT)
export const TRAIN_BACK = -4.2;
export const TRAIN_GAP_HALF = 0.2; // doorway half width
export const TRAIN_GAP_H = 0.72; // doorway height above the floor
/** the full-length mirror on the back wall (first person): centre x, bottom y, half width, height */
export const MIRROR = { x: 0, bottom: -0.47, halfW: 0.19, height: 0.8 };
export const FPS_EYE_HEIGHT = 0.58;
const MAX_IMPACTS = 16;
const IMPACT_LIFE = 6;
const DOOR_W = 0.34;
const DOOR_H = 0.62;
const NO_DOORS: { side: number; z: number }[] = [];
// a mouse step bigger than this that comes out of nowhere is taken for Chrome's bogus pointer-lock jump
const FPS_SPIKE = 260;
const FACE_API_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
const MODELS_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights';
const STYLES: Record<string, number> = { solid: 0, dashed: 1, dotted: 2 };

const VERTEX = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const ROOM = `#version 300 es
precision highp float;
precision highp int;
uniform float uAspect;
uniform float uPixel;
uniform vec3 uEye;
uniform float uDepth;
uniform vec3 uCell;
uniform float uThick;
uniform float uDot;
uniform int uStyle;
uniform vec3 uLineColor;
uniform vec3 uScanColor;
uniform vec3 uCoreColor;
uniform float uFade;
uniform float uScanZ;
uniform float uScanDir;
uniform float uScanAlpha;
uniform float uScanWidth;
uniform float uTrail;
uniform float uReveal;
uniform float uPoints;
uniform float uReflect;
uniform float uHaze;
uniform float uShade;
uniform float uLight;
uniform vec4 uPing[4];
uniform float uPingAlpha[4];
uniform vec4 uHover;
uniform float uTime;
uniform float uFps;
uniform vec3 uCamPos;
uniform mat3 uCamRot;
uniform float uFocal;
uniform vec2 uShift;
uniform float uFront;
uniform vec4 uDoors[8];
uniform vec4 uDoorTint[8]; // rgb, a: 0 plain, 1 portal, 2 dressed (the door layer draws the leaves)
uniform int uDoorCount;
uniform vec2 uDoorSize;
uniform float uLights;
uniform float uTrain;
uniform float uTrainBack;
uniform vec2 uGap;
uniform vec3 uAccent;
uniform vec4 uImpacts[16];
uniform vec4 uMirror; // x centre, y bottom, half width, height (height 0 = none)
uniform int uImpactCount;
in vec2 vUv;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outGlow;

struct Light {
  float grid;
  float fade;
  float core;
  float trail;
  float spill;
  float ping;
  float wake;
  float reveal;
};

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

vec2 hash2(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}

float lines(float across, float along, float period, float dash, float fa, float fb) {
  float u = across / period;
  float du = fa / period;
  float d = abs(fract(u + 0.5) - 0.5) / max(du, 1e-5);
  float dense = smoothstep(0.1, 0.4, du);
  if (uStyle == 2) {
    float c = along / dash * 5.0;
    float dc = fb / dash * 5.0;
    float e = abs(fract(c + 0.5) - 0.5) / max(dc, 1e-5);
    float cov = clamp(uThick + 1.0 - length(vec2(d, e)), 0.0, 1.0);
    float mean = min(1.0, 3.1416 * (uThick + 0.5) * (uThick + 0.5) * du * dc);
    return mix(cov, mean, max(dense, smoothstep(0.1, 0.4, dc)));
  }
  float cov = clamp(uThick + 0.5 - d, 0.0, 1.0);
  float mean = min(1.0, 2.0 * uThick * du);
  if (uStyle == 1) {
    float c = along / dash * 4.0;
    float dc = fb / dash * 4.0;
    float e = abs(fract(c + 0.5) - 0.5);
    float m = clamp((0.25 - e) / max(dc, 1e-5) + 0.5, 0.0, 1.0);
    cov *= mix(m, 0.5, smoothstep(0.1, 0.4, dc));
    mean *= 0.5;
  }
  return mix(cov, mean, dense);
}

float depthFade(float z) {
  float n = clamp(z / uDepth, 0.0, 1.0);
  return mix(1.0, (exp(-3.0 * n) - 0.0497871) / 0.9502129, uFade);
}

vec3 project(vec3 eye, vec3 o, int face, float plane) {
  vec3 d = o - eye;
  float t = face == 0 ? (plane - o.x) / d.x : (face == 1 ? (plane - o.y) / d.y : (plane - o.z) / d.z);
  return o + d * t;
}

void trace(vec3 o, vec3 d, out int face, out float plane, out vec3 h) {
  float sx = d.x > 0.0 ? 0.5 * uAspect : -0.5 * uAspect;
  float sy = d.y > 0.0 ? 0.5 : -0.5;
  float tx = abs(d.x) > 1e-6 ? (sx - o.x) / d.x : 1e9;
  float ty = abs(d.y) > 1e-6 ? (sy - o.y) / d.y : 1e9;
  float t = (uDepth - o.z) / d.z;
  face = 2;
  plane = uDepth;
  if (tx < t) {
    face = 0;
    plane = sx;
    t = tx;
  }
  if (ty < t) {
    face = 1;
    plane = sy;
    t = ty;
  }
  h = o + d * t;
}

vec2 faceUv(vec3 h, int face) {
  if (face == 0) return vec2(h.z, h.y + 0.5);
  if (face == 1) return vec2(h.x + 0.5 * uAspect, h.z);
  return vec2(h.x + 0.5 * uAspect, h.y + 0.5);
}

Light illuminate(vec3 h, int face, vec2 uv, vec2 foot, float blur) {
  Light l;
  vec2 cell = face == 0 ? uCell.zy : (face == 1 ? uCell.xz : uCell.xy);
  vec2 f = foot * blur;
  float minor = max(lines(uv.x, uv.y, cell.x, cell.y, f.x, f.y), lines(uv.y, uv.x, cell.y, cell.x, f.y, f.x));
  float major = max(
    lines(uv.x, uv.y, cell.x * 4.0, cell.y, f.x, f.y),
    lines(uv.y, uv.x, cell.y * 4.0, cell.x, f.y, f.x)
  );
  l.grid = max(minor * 0.75, major) / blur;
  float z = h.z;
  l.fade = depthFade(z);
  l.reveal = smoothstep(uReveal, uReveal - 0.2, z);
  float zFoot = face == 0 ? f.x : (face == 1 ? f.y : 0.0);
  float width = max(uScanWidth, zFoot * 1.1);
  float dz = z - uScanZ;
  l.core = exp(-dz * dz / (width * width)) * (face == 2 ? 0.45 : 1.0) * uScanAlpha;
  float behind = -dz * uScanDir;
  l.trail = exp(-max(behind, 0.0) / uTrail) * smoothstep(-width, width * 0.5, behind) * uScanAlpha;
  l.spill = exp(-dz * dz / 0.05) * uScanAlpha;
  l.ping = 0.0;
  l.wake = 0.0;
  for (int i = 0; i < 4; i++) {
    float alpha = uPingAlpha[i];
    if (alpha <= 0.0) continue;
    float dist = length(h - uPing[i].xyz) - uPing[i].w;
    l.ping += exp(-dist * dist / 0.0012) * alpha;
    l.wake += exp(min(dist, 0.0) / 0.22) * smoothstep(0.03, -0.03, dist) * alpha;
  }
  return l;
}

void over(inout vec4 acc, vec3 color, float alpha) {
  alpha = clamp(alpha, 0.0, 1.0);
  acc = vec4(color * alpha, alpha) + acc * (1.0 - alpha);
}

void paint(inout vec4 color, inout float energy, Light l, float gain, float lift, float hover) {
  float base = l.grid * l.fade * l.reveal * lift;
  float far = l.fade * l.reveal * gain;
  float lit = l.grid * (l.core * 1.2 + l.trail * 0.75 + l.ping * 1.4 + l.wake * 0.5 + hover * 0.5) * far;
  float sheen = (l.core * 0.14 + l.spill * 0.05 + l.trail * 0.03 + l.ping * 0.2 + l.wake * 0.04) * far;
  float laser = (l.core + l.ping * 0.35) * far;
  over(color, uLineColor, base);
  over(color, uScanColor, sheen);
  over(color, uScanColor, lit);
  over(color, uCoreColor, laser * 0.9);
  energy += laser * 0.9 + lit * 0.5;
}

void mainWindow() {
  vec3 p = vec3((vUv.x - 0.5) * uAspect, vUv.y - 0.5, 0.0);
  vec3 d = p - uEye;
  int face;
  float plane;
  vec3 h;
  trace(p, d, face, plane, h);
  vec3 hx = project(uEye, p + vec3(uPixel, 0.0, 0.0), face, plane);
  vec3 hy = project(uEye, p + vec3(0.0, uPixel, 0.0), face, plane);
  vec2 uv = faceUv(h, face);
  vec2 ux = faceUv(hx, face) - uv;
  vec2 uy = faceUv(hy, face) - uv;
  vec2 foot = vec2(length(vec2(ux.x, uy.x)), length(vec2(ux.y, uy.y)));
  Light l = illuminate(h, face, uv, foot, 1.0);

  vec4 color = vec4(0.0);
  float energy = 0.0;

  if (uShade > 0.0) {
    vec2 gaps = face == 0
      ? vec2(0.5 - abs(h.y), uDepth - h.z)
      : (face == 1 ? vec2(0.5 * uAspect - abs(h.x), uDepth - h.z) : vec2(0.5 * uAspect - abs(h.x), 0.5 - abs(h.y)));
    vec2 crease = 1.0 - exp(-max(gaps, 0.0) / 0.16);
    float occlusion = crease.x * crease.y;
    float lamp = 1.0 / (1.0 + h.z * h.z * 0.9);
    float tilt = face == 1 ? (plane < 0.0 ? 1.1 : 0.85) : (face == 2 ? 0.8 : 1.0);
    float glowSpill = (l.spill * 0.5 + l.trail * 0.12) * l.reveal * l.fade;
    if (uLight > 0.5) {
      float shadow = (1.0 - lamp * tilt) * 0.09 + (1.0 - occlusion) * 0.2;
      over(color, vec3(0.0), shadow * uShade * l.reveal * l.fade);
    } else {
      over(color, vec3(1.0), lamp * tilt * occlusion * 0.11 * uShade * l.reveal * l.fade);
    }
    over(color, uScanColor, glowSpill * uShade * occlusion * 0.35);
  }

  if (face == 1 && plane < 0.0 && uReflect > 0.0) {
    vec3 mirror = vec3(uEye.x, -1.0 - uEye.y, uEye.z);
    vec3 r = h - mirror;
    int face2;
    float plane2;
    vec3 h2;
    trace(h, r, face2, plane2, h2);
    vec2 uv2 = faceUv(h2, face2);
    vec2 ux2 = faceUv(project(mirror, hx, face2, plane2), face2) - uv2;
    vec2 uy2 = faceUv(project(mirror, hy, face2, plane2), face2) - uv2;
    vec2 foot2 = vec2(length(vec2(ux2.x, uy2.x)), length(vec2(ux2.y, uy2.y)));
    float travel = length(h2 - h);
    Light m = illuminate(h2, face2, uv2, foot2, 1.0 + travel * 4.0);
    m.reveal *= l.reveal;
    float grazing = 1.0 - normalize(r).y;
    float gain = (0.3 + 0.7 * grazing * grazing * grazing * grazing) * uReflect * exp(-travel * 1.1) * (uLight > 0.5 ? 0.6 : 1.0);
    float reflected = 0.0;
    paint(color, reflected, m, gain, 0.0, 0.0);
    energy += reflected * 0.6;
  }

  vec3 near = h - uHover.xyz;
  float hover = exp(-dot(near, near) / 0.08) * uHover.w;
  paint(color, energy, l, 1.0, 1.0, hover);

  if (uPoints > 0.5) {
    vec2 cell = face == 0 ? uCell.zy : (face == 1 ? uCell.xz : uCell.xy);
    vec2 spacing = cell / 2.5;
    vec2 q = uv / spacing;
    vec2 id = floor(q);
    vec2 seed = id + vec2(float(face) * 13.7 + plane * 5.3, float(face) * 3.1);
    vec2 delta = (q - id - (0.2 + 0.6 * hash2(seed))) * spacing;
    float det = ux.x * uy.y - ux.y * uy.x;
    vec2 s = vec2(delta.x * uy.y - delta.y * uy.x, ux.x * delta.y - ux.y * delta.x) / det;
    float radius = uDot * mix(1.0, 0.55, clamp(h.z / uDepth, 0.0, 1.0));
    float spot = clamp(radius + 0.5 - length(s), 0.0, 1.0);
    float gap = min(spacing.x / foot.x, spacing.y / foot.y);
    float r = hash(seed + 7.7);
    float flicker = 0.75 + 0.25 * sin(uTime * (3.0 + r * 5.0) + r * 40.0);
    float dots = spot * smoothstep(5.0, 10.0, gap) * smoothstep(0.25, 0.6, r) * (0.3 + 0.7 * r * r) * flicker;
    float hot = l.core * 2.5 + l.ping * 1.6;
    float warm = l.trail * l.trail * 1.3 + l.wake * 0.6 + hover * 1.3;
    float spark = dots * (hot + warm) * l.fade * l.reveal;
    over(color, mix(uScanColor, uCoreColor, clamp(hot / max(hot + warm, 1e-4), 0.0, 1.0)), spark);
    energy += spark * 0.9;
  }

  if (uHaze > 0.0 && uScanAlpha > 0.0 && uScanZ > 0.0 && h.z > uScanZ) {
    vec3 c = p + d * (uScanZ / d.z);
    float grain = hash(floor(c.xy * 180.0) + floor(uTime * 24.0) * 7.0);
    float edge = min(0.5 * uAspect - abs(c.x), 0.5 - abs(c.y));
    float rim = exp(-edge / 0.06);
    float veil = uHaze * uScanAlpha * (0.45 + 0.9 * grain) * (0.55 + rim * 1.6);
    over(color, uScanColor, veil * depthFade(uScanZ) * l.reveal);
  }

  energy = clamp(energy, 0.0, 1.0);
  outColor = color;
  outGlow = vec4(uScanColor * energy, energy);
}

// ── first-person view ───────────────────────────────────────────────────
// One pinhole camera (position, rotation, focal length and a screen shift) that the JS side
// blends from the window view (eye behind the screen, shifted frustum) to the player's eyes.
// The window view is exactly this camera with no rotation, focal = eye distance and shift = eye.
void rayAt(vec2 uv, out vec3 o, out vec3 d) {
  vec2 s = vec2((uv.x - 0.5) * uAspect, uv.y - 0.5) - uShift;
  o = uCamPos;
  d = normalize(uCamRot * vec3(s, uFocal));
}

// the closed room: the window view's open box plus a front wall at uFront
void traceBox(vec3 o, vec3 d, out int face, out float plane, out vec3 h) {
  float sx = d.x > 0.0 ? 0.5 * uAspect : -0.5 * uAspect;
  float sy = d.y > 0.0 ? 0.5 : -0.5;
  float sz = d.z > 0.0 ? uDepth : uFront;
  float tx = abs(d.x) > 1e-6 ? (sx - o.x) / d.x : 1e9;
  float ty = abs(d.y) > 1e-6 ? (sy - o.y) / d.y : 1e9;
  float t = abs(d.z) > 1e-6 ? (sz - o.z) / d.z : 1e9;
  face = 2;
  plane = sz;
  if (tx < t) {
    face = 0;
    plane = sx;
    t = tx;
  }
  if (ty < t) {
    face = 1;
    plane = sy;
    t = ty;
  }
  h = o + d * t;
}

// one box between z = lo and z = hi
void traceBounds(vec3 o, vec3 d, float lo, float hi, out int face, out float plane, out vec3 h) {
  float sx = d.x > 0.0 ? 0.5 * uAspect : -0.5 * uAspect;
  float sy = d.y > 0.0 ? 0.5 : -0.5;
  float sz = d.z > 0.0 ? hi : lo;
  float tx = abs(d.x) > 1e-6 ? (sx - o.x) / d.x : 1e9;
  float ty = abs(d.y) > 1e-6 ? (sy - o.y) / d.y : 1e9;
  float t = abs(d.z) > 1e-6 ? (sz - o.z) / d.z : 1e9;
  face = 2;
  plane = sz;
  if (tx < t) {
    face = 0;
    plane = sx;
    t = tx;
  }
  if (ty < t) {
    face = 1;
    plane = sy;
    t = ty;
  }
  h = o + d * t;
}

bool inGap(vec3 h) {
  return abs(h.x) < uGap.x && h.y + 0.5 < uGap.y;
}

// The whole space: the main room and, once open, the training range behind the spawn wall. A ray
// that meets the shared wall inside the doorway carries on into the other room.
void traceScene(vec3 o, vec3 d, out int face, out float plane, out vec3 h) {
  if (uTrain < 0.5) {
    traceBox(o, d, face, plane, h);
    return;
  }
  bool back = o.z < uFront;
  if (back) {
    // the camera is in the training hall: look out through the doorway into the main room
    if (d.z > 1e-5) {
      vec3 g = o + d * ((uFront - o.z) / d.z);
      if (inGap(g)) {
        traceBounds(g + d * 1e-4, d, uFront, uDepth, face, plane, h);
        return;
      }
    }
    face = 2;
    plane = uFront;
    h = o + d * 0.5;
    return;
  }
  traceBounds(o, d, uFront, uDepth, face, plane, h);
  if (face == 2 && abs(plane - uFront) < 1e-4 && inGap(h)) {
    bool goBack = d.z < 0.0;
    traceBounds(h + d * 1e-4, d, goBack ? uTrainBack : uFront, goBack ? uFront : uDepth, face, plane, h);
  }
}

vec3 onPlane(vec3 o, vec3 d, int face, float plane) {
  float den = face == 0 ? d.x : (face == 1 ? d.y : d.z);
  float num = face == 0 ? plane - o.x : (face == 1 ? plane - o.y : plane - o.z);
  // a neighbour ray that runs (almost) parallel to the plane or away from it: treat it as very far
  float t = abs(den) > 1e-5 ? num / den : 1e4;
  if (t <= 0.0 || t > 1e4) t = 1e4;
  return o + d * t;
}

// Fixtures that make the room feel lived in (first person only): light panels in the ceiling and
// the pools they throw on the floor, a guide runner down the middle of the floor with light
// pulses travelling towards the back, and a glowing strip along the foot of the walls.
float boxMask(vec2 p, vec2 halfSize, float px) {
  vec2 q = abs(p) - halfSize;
  float e = max(q.x, q.y);
  return smoothstep(px, -px, e);
}

void paintDetails(inout vec4 color, inout float energy, vec3 h, int face, float plane, vec2 foot) {
  float px = max(max(foot.x, foot.y), 1e-4);
  float lit = uLights;
  vec3 warm = mix(uScanColor, vec3(1.0), 0.55);
  bool range = uTrain > 0.5 && h.z < uFront;
  float zLo = range ? uTrainBack : uFront;
  float zHi = range ? uFront : uDepth;
  // ceiling: a row of long light panels
  if (face == 1 && plane > 0.0) {
    float cz = clamp(floor((h.z - zLo) / 0.9) * 0.9 + zLo + 0.45, zLo + 0.45, zHi - 0.45);
    float panel = boxMask(vec2(h.x, h.z - cz), vec2(0.13, 0.26), px);
    float rim = boxMask(vec2(h.x, h.z - cz), vec2(0.145, 0.275), px) - panel;
    over(color, vec3(0.02), rim * 0.6 * uFps);
    over(color, warm, panel * (0.12 + 0.78 * lit) * uFps);
    energy += panel * 0.7 * lit * uFps;
  }
  // floor: light pools under the panels, the runner and its pulses
  if (face == 1 && plane < 0.0) {
    float cz = clamp(floor((h.z - zLo) / 0.9) * 0.9 + zLo + 0.45, zLo + 0.45, zHi - 0.45);
    vec2 d = vec2(h.x / 0.42, (h.z - cz) / 0.55);
    float pool = exp(-dot(d, d) * 1.6) * 0.16 * lit;
    over(color, warm, pool * uFps);
  }
  if (face == 1 && plane < 0.0 && !range) {
    float runner = (1.0 - smoothstep(0.003, 0.003 + px * 1.5, abs(abs(h.x) - 0.2))) * step(uFront + 0.15, h.z) * step(h.z, uDepth - 0.15);
    float pulse = smoothstep(0.75, 1.0, fract(h.z * 1.2 - uTime * 0.5));
    over(color, uScanColor, runner * (0.22 + 0.6 * pulse) * uFps);
    energy += runner * pulse * 0.35 * uFps;
  }
  // foot of the walls: a thin light strip
  if (face == 0 || (face == 2 && (plane > 0.0 || plane < uFront - 0.01))) {
    float v = h.y + 0.5;
    float strip = 1.0 - smoothstep(0.0025, 0.0025 + px * 1.5, abs(v - 0.035));
    over(color, uScanColor, strip * (0.25 + 0.45 * lit) * uFps);
    energy += strip * 0.25 * uFps;
  }
}

// The training range: lane lines and distance marks on the floor, a firing line, a target painted
// on the back wall, and a lit frame round the doorway on both sides of the shared wall.
void paintRange(inout vec4 color, inout float energy, vec3 h, int face, float plane, vec2 foot) {
  if (uTrain < 0.5) return;
  float px = max(max(foot.x, foot.y), 1e-4);
  float line = 0.0025;
  // doorway frame (both sides of the shared wall) and the floor threshold
  if (face == 2 && abs(plane - uFront) < 1e-4) {
    float e = max(abs(h.x) - uGap.x, h.y + 0.5 - uGap.y);
    float frame = 1.0 - smoothstep(line, line + px * 1.5, abs(e + 0.006));
    float halo = exp(-max(e, 0.0) / 0.03) * step(0.0, e) * 0.25;
    over(color, uAccent, (frame * 0.9 + halo) * uFps);
    energy += (frame * 0.6 + halo * 0.4) * uFps;
    // a lamp bar over the opening
    float lamp = (1.0 - smoothstep(0.08, 0.08 + px, abs(h.x))) * (1.0 - smoothstep(0.004, 0.004 + px, abs(h.y + 0.5 - uGap.y - 0.035)));
    over(color, mix(uAccent, vec3(1.0), 0.4), lamp * uFps);
    energy += lamp * 0.7 * uFps;
  }
  if (h.z > uFront) return;
  if (face == 1 && plane < 0.0) {
    float zFire = uFront - 0.55;
    float fire = 1.0 - smoothstep(0.006, 0.006 + px * 1.5, abs(h.z - zFire));
    over(color, uAccent, fire * 0.85 * uFps);
    energy += fire * 0.5 * uFps;
    if (h.z < zFire) {
      float lane = 0.5 * uAspect / 3.0;
      float lanes = 1.0 - smoothstep(line, line + px * 1.5, abs(abs(h.x) - lane));
      over(color, uAccent, lanes * 0.45 * uFps);
      // distance marks every 0.6
      float m = fract((zFire - h.z) / 0.6);
      float mark = (1.0 - smoothstep(0.004, 0.004 + px * 1.5, min(m, 1.0 - m) * 0.6)) * (1.0 - smoothstep(0.06, 0.06 + px, abs(abs(h.x) - lane * 2.0)));
      over(color, uAccent, mark * 0.6 * uFps);
    }
  }
  if (face == 2 && plane < uFront - 0.01) {
    // a target on the back wall
    float r = length(vec2(h.x, h.y - 0.02));
    float rings = (1.0 - smoothstep(0.003, 0.003 + px * 1.5, abs(fract(r / 0.06 + 0.5) - 0.5) * 0.06)) * step(r, 0.3);
    float bull = smoothstep(0.022 + px, 0.022 - px, r);
    over(color, uAccent, (rings * 0.55 + bull * 0.9) * uFps);
    energy += (rings * 0.2 + bull * 0.6) * uFps;
  }
}

// Bullet marks: a hot spark that cools to a dark scorch with a faint glowing rim.
void paintImpacts(inout vec4 color, inout float energy, vec3 h, vec2 foot) {
  float px = max(max(foot.x, foot.y), 1e-4);
  for (int i = 0; i < 16; i++) {
    if (i >= uImpactCount) break;
    vec4 im = uImpacts[i];
    float dist = length(h - im.xyz);
    if (dist > 0.05) continue;
    float age = im.w;
    float heat = exp(-age * 7.0);
    float fade = 1.0 - smoothstep(4.0, 6.0, age);
    float hole = smoothstep(0.006 + px, 0.006 - px, dist);
    float rim = (1.0 - smoothstep(0.0, 0.004 + px, abs(dist - 0.009))) * 0.5;
    over(color, vec3(0.0), hole * 0.85 * fade * uFps);
    over(color, mix(uScanColor, vec3(1.0, 0.75, 0.4), heat), (rim * (0.3 + heat) + hole * heat) * fade * uFps);
    float spark = exp(-dist * dist / 0.0004) * heat;
    over(color, vec3(1.0, 0.85, 0.6), spark * uFps);
    energy += (spark + hole * heat) * uFps;
  }
}

// Sliding doors drawn into the side walls (and the light they throw on the floor once open).
// uDoors[i] = (side, centre z, open 0..1, glow 0..1).
void paintDoors(inout vec4 color, inout float energy, vec3 h, int face, float plane, vec2 foot) {
  float px = max(max(foot.x, foot.y), 1e-4);
  for (int i = 0; i < 8; i++) {
    if (i >= uDoorCount) break;
    vec4 dr = uDoors[i];
    float open = dr.z;
    float glow = dr.w;
    float hw = uDoorSize.x * 0.5;
    vec3 tint = mix(uScanColor, uDoorTint[i].rgb, 0.85);
    bool portal = uDoorTint[i].a > 0.5 && uDoorTint[i].a < 1.5;
    float plain = step(uDoorTint[i].a, 1.5); // dressed doors: only the light beyond and on the floor
    if (portal) {
      // a nether portal (drawn by the door layer): its purple light on the wall round the frame
      // and across the floor, breathing slowly
      float breath = 0.85 + 0.15 * sin(uTime * 1.7 + float(i));
      if (face == 0 && sign(plane) == dr.x) {
        float u = h.z - dr.y;
        float v = h.y + 0.5;
        float e = max(abs(u) - hw * 1.1, v - uDoorSize.y * 1.02);
        float halo = exp(-max(e, 0.0) / 0.07) * step(-0.02, e) * (0.35 + 0.25 * glow) * breath;
        over(color, tint, halo * 0.55 * uFps);
        energy += halo * 0.6 * uFps;
      } else if (face == 1 && plane < 0.0) {
        float fromWall = 0.5 * uAspect - dr.x * h.x;
        float along = abs(h.z - dr.y) - hw;
        float spill = exp(-fromWall * 4.0) * smoothstep(0.18, -0.06, along) * (0.45 + 0.2 * glow) * breath;
        over(color, tint, spill * 0.7 * uFps);
        energy += spill * 0.55 * uFps;
      }
      continue;
    }
    if (face == 0 && sign(plane) == dr.x) {
      float u = h.z - dr.y;
      float v = h.y + 0.5;
      float e = max(abs(u) - hw, v - uDoorSize.y); // < 0 inside the doorway
      if (e > 0.06) continue;
      float inside = smoothstep(px, -px, e);
      // leaves slide apart from the middle
      float gap = open * hw;
      float leaf = inside * smoothstep(gap - px, gap + px, abs(u));
      float portal = inside - leaf;
      over(color, vec3(0.012, 0.012, 0.018), 0.86 * leaf * uFps * plain);
      // horizontal accent lines on the leaves
      float band = (1.0 - smoothstep(0.0015, 0.0015 + px, abs(v - uDoorSize.y * 0.56))) * leaf;
      over(color, tint, band * (0.25 + 0.5 * glow) * uFps * plain);
      // the seam between the leaves, and the handles either side of it
      float seam = (1.0 - smoothstep(0.0012, 0.0012 + px, abs(abs(u) - gap))) * inside * (1.0 - step(0.999, open));
      float handle = (1.0 - smoothstep(0.0025, 0.0025 + px, abs(abs(u) - gap - 0.022))) *
        (1.0 - smoothstep(0.035, 0.035 + px, abs(v - uDoorSize.y * 0.48))) * leaf;
      over(color, mix(uLineColor, tint, 0.5 + 0.5 * glow), max(seam * 0.8, handle * 0.9) * uFps * plain);
      // light from the room beyond, brightest at the floor
      vec3 beyond = mix(tint, vec3(1.0), 0.35 + 0.35 * (1.0 - v / uDoorSize.y));
      over(color, beyond, portal * 0.92 * uFps);
      // frame: a crisp outer line plus a softer inner one
      float outer = 1.0 - smoothstep(0.002, 0.002 + px * 1.5, abs(e));
      float inner = 1.0 - smoothstep(0.0015, 0.0015 + px * 1.5, abs(e + 0.012));
      float frame = max(outer, inner * 0.55);
      float lit = 0.45 + 0.55 * max(glow, open);
      over(color, tint, frame * lit * uFps * plain);
      // status light above the door
      float lamp = (1.0 - smoothstep(0.045, 0.045 + px, abs(u))) * (1.0 - smoothstep(0.004, 0.004 + px, abs(v - uDoorSize.y - 0.03)));
      over(color, mix(tint, vec3(1.0), glow * 0.6), lamp * (0.35 + 0.65 * max(glow, open)) * uFps * plain);
      energy += ((frame * (0.15 + 0.6 * glow) + lamp * 0.6 * max(glow, open)) * plain + portal * 0.9) * uFps;
    } else if (face == 1 && plane < 0.0 && (open > 0.0 || glow > 0.0)) {
      // light spilling onto the floor in front of the door
      float fromWall = 0.5 * uAspect - dr.x * h.x;
      float along = abs(h.z - dr.y) - hw * mix(0.6, 1.0, open);
      float spill = exp(-fromWall * 5.0) * smoothstep(0.12, -0.04, along);
      float amount = spill * (open * 0.55 + glow * 0.12) * uFps;
      over(color, tint, amount);
      energy += amount * 0.5;
    }
  }
}

void mainFree() {
  vec3 o, d, ox, dx, oy, dy;
  rayAt(vUv, o, d);
  rayAt(vUv + vec2(uPixel / uAspect, 0.0), ox, dx);
  rayAt(vUv + vec2(0.0, uPixel), oy, dy);
  int face;
  float plane;
  vec3 h;
  traceScene(o, d, face, plane, h);
  // the mirror: a thin frame on the back wall, and the room bounced off the glass inside it
  float glass = 0.0;
  float frame = 0.0;
  if (uMirror.w > 0.0 && face == 2 && abs(plane - uDepth) < 1e-4) {
    float edge = max(abs(h.x - uMirror.x) - uMirror.z, max(uMirror.y - h.y, h.y - uMirror.y - uMirror.w));
    if (edge < 0.0) {
      glass = 1.0;
      o = h - d * 1e-4;
      d.z = -d.z;
      ox += dx * ((uDepth - ox.z) / dx.z);
      dx.z = -dx.z;
      oy += dy * ((uDepth - oy.z) / dy.z);
      dy.z = -dy.z;
      traceScene(o, d, face, plane, h);
    } else if (edge < 0.012) {
      frame = 1.0 - edge / 0.012;
    }
  }
  // past the doorway is the 3D hall's own layer; if that layer is ever off for a frame, show the
  // hall's dark rather than anything of this shader's
  if (uTrain > 0.5 && h.z < uFront - 1e-3) {
    outColor = vec4(0.043, 0.047, 0.063, 1.0);
    outGlow = vec4(0.0);
    return;
  }
  vec3 hx = onPlane(ox, dx, face, plane);
  vec3 hy = onPlane(oy, dy, face, plane);
  vec2 uv = faceUv(h, face);
  vec2 ux = faceUv(hx, face) - uv;
  vec2 uy = faceUv(hy, face) - uv;
  vec2 foot = vec2(length(vec2(ux.x, uy.x)), length(vec2(ux.y, uy.y)));
  Light l = illuminate(h, face, uv, foot, 1.0);

  vec4 color = vec4(0.0);
  float energy = 0.0;

  if (uShade > 0.0) {
    bool inRange = uTrain > 0.5 && h.z < uFront;
    float zGap = inRange ? min(uFront - h.z, h.z - uTrainBack) : min(uDepth - h.z, h.z - uFront);
    vec2 gaps = face == 0
      ? vec2(0.5 - abs(h.y), zGap)
      : (face == 1 ? vec2(0.5 * uAspect - abs(h.x), zGap) : vec2(0.5 * uAspect - abs(h.x), 0.5 - abs(h.y)));
    vec2 crease = 1.0 - exp(-max(gaps, 0.0) / 0.16);
    float occlusion = crease.x * crease.y;
    float lz = inRange ? (uFront - h.z) * 0.45 : h.z;
    float lamp = 1.0 / (1.0 + lz * lz * 0.9);
    float tilt = face == 1 ? (plane < 0.0 ? 1.1 : 0.85) : (face == 2 ? 0.8 : 1.0);
    float glowSpill = (l.spill * 0.5 + l.trail * 0.12) * l.reveal * l.fade;
    if (uLight > 0.5) {
      float shadow = (1.0 - lamp * tilt) * 0.09 + (1.0 - occlusion) * 0.2;
      over(color, vec3(0.0), shadow * uShade * l.reveal * l.fade);
    } else {
      over(color, vec3(1.0), lamp * tilt * occlusion * 0.11 * uShade * l.reveal * l.fade);
    }
    over(color, uScanColor, glowSpill * uShade * occlusion * 0.35);
  }

  if (face == 1 && plane < 0.0 && uReflect > 0.0) {
    vec3 n = vec3(0.0, 1.0, 0.0);
    vec3 r = reflect(d, n);
    int face2;
    float plane2;
    vec3 h2;
    traceScene(h, r, face2, plane2, h2);
    vec2 uv2 = faceUv(h2, face2);
    vec2 ux2 = faceUv(onPlane(hx, reflect(dx, n), face2, plane2), face2) - uv2;
    vec2 uy2 = faceUv(onPlane(hy, reflect(dy, n), face2, plane2), face2) - uv2;
    vec2 foot2 = vec2(length(vec2(ux2.x, uy2.x)), length(vec2(ux2.y, uy2.y)));
    float travel = length(h2 - h);
    Light m = illuminate(h2, face2, uv2, foot2, 1.0 + travel * 4.0);
    m.reveal *= l.reveal;
    float grazing = 1.0 - normalize(r).y;
    float gain = (0.3 + 0.7 * grazing * grazing * grazing * grazing) * uReflect * exp(-travel * 1.1) * (uLight > 0.5 ? 0.6 : 1.0);
    if (uTrain > 0.5 && h2.z < uFront - 1e-3) gain = 0.0; // the hall is its own layer: nothing of it to reflect here
    float reflected = 0.0;
    paint(color, reflected, m, gain, 0.0, 0.0);
    energy += reflected * 0.6;
  }

  vec3 near = h - uHover.xyz;
  float hover = exp(-dot(near, near) / 0.08) * uHover.w;
  paint(color, energy, l, 1.0, 1.0, hover);

  if (uPoints > 0.5) {
    vec2 cell = face == 0 ? uCell.zy : (face == 1 ? uCell.xz : uCell.xy);
    vec2 spacing = cell / 2.5;
    vec2 q = uv / spacing;
    vec2 id = floor(q);
    vec2 seed = id + vec2(float(face) * 13.7 + plane * 5.3, float(face) * 3.1);
    vec2 delta = (q - id - (0.2 + 0.6 * hash2(seed))) * spacing;
    float det = ux.x * uy.y - ux.y * uy.x;
    vec2 s = abs(det) > 1e-12 ? vec2(delta.x * uy.y - delta.y * uy.x, ux.x * delta.y - ux.y * delta.x) / det : vec2(1e3);
    float radius = uDot * mix(1.0, 0.55, clamp(h.z / uDepth, 0.0, 1.0));
    float spot = clamp(radius + 0.5 - length(s), 0.0, 1.0);
    float gap = min(spacing.x / max(foot.x, 1e-6), spacing.y / max(foot.y, 1e-6));
    float rr = hash(seed + 7.7);
    float flicker = 0.75 + 0.25 * sin(uTime * (3.0 + rr * 5.0) + rr * 40.0);
    float dots = spot * smoothstep(5.0, 10.0, gap) * smoothstep(0.25, 0.6, rr) * (0.3 + 0.7 * rr * rr) * flicker;
    float hot = l.core * 2.5 + l.ping * 1.6;
    float warm = l.trail * l.trail * 1.3 + l.wake * 0.6 + hover * 1.3;
    float spark = dots * (hot + warm) * l.fade * l.reveal;
    over(color, mix(uScanColor, uCoreColor, clamp(hot / max(hot + warm, 1e-4), 0.0, 1.0)), spark);
    energy += spark * 0.9;
  }

  // lights off: the room drops to a dim glow (its own fixtures and the doors stay lit)
  color.rgb *= mix(0.42, 1.0, mix(1.0, uLights, uFps));
  paintDetails(color, energy, h, face, plane, foot);
  paintRange(color, energy, h, face, plane, foot);
  if (uDoorCount > 0) paintDoors(color, energy, h, face, plane, foot);
  if (uImpactCount > 0) paintImpacts(color, energy, h, foot);
  if (glass > 0.0) {
    // a little darker and cooler than the room, with a faint diagonal sheen
    color.rgb *= 0.86;
    vec3 g0 = o;
    float sheen = smoothstep(0.0, 0.5, sin((g0.x + g0.y) * 7.0 + 1.2) * 0.5 + 0.5);
    over(color, vec3(0.78, 0.86, 1.0), 0.03 + sheen * 0.035);
    energy *= 0.8;
  }
  if (frame > 0.0) {
    over(color, vec3(0.045, 0.047, 0.055), 0.97);
    float lip = smoothstep(0.55, 1.0, frame);
    over(color, uScanColor, lip * 0.55);
    energy += lip * 0.35;
  }

  if (uHaze > 0.0 && uScanAlpha > 0.0 && uScanZ > uFront && abs(d.z) > 1e-5) {
    float ts = (uScanZ - o.z) / d.z;
    if (ts > 0.0 && ts < length(h - o)) {
      vec3 c = o + d * ts;
      float grain = hash(floor(c.xy * 180.0) + floor(uTime * 24.0) * 7.0);
      float edge = min(0.5 * uAspect - abs(c.x), 0.5 - abs(c.y));
      float rim = exp(-edge / 0.06);
      float veil = uHaze * uScanAlpha * (0.45 + 0.9 * grain) * (0.55 + rim * 1.6);
      over(color, uScanColor, veil * depthFade(uScanZ) * l.reveal);
    }
  }

  energy = clamp(energy, 0.0, 1.0);
  outColor = color;
  outGlow = vec4(uScanColor * energy, energy);
}

void main() {
  if (uFps > 0.0) mainFree();
  else mainWindow();
}`;

const DOWN = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec2 o = uTexel;
  outColor = 0.25 * (
    texture(uSource, vUv + vec2(-o.x, -o.y)) +
    texture(uSource, vUv + vec2(o.x, -o.y)) +
    texture(uSource, vUv + vec2(-o.x, o.y)) +
    texture(uSource, vUv + vec2(o.x, o.y))
  );
}`;

const BLUR = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uStep;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec4 sum = texture(uSource, vUv) * 0.1964825501511404;
  sum += (texture(uSource, vUv + uStep * 1.411764705882353) + texture(uSource, vUv - uStep * 1.411764705882353)) * 0.2969069646728344;
  sum += (texture(uSource, vUv + uStep * 3.2941176470588234) + texture(uSource, vUv - uStep * 3.2941176470588234)) * 0.09447039785044732;
  sum += (texture(uSource, vUv + uStep * 5.176470588235294) + texture(uSource, vUv - uStep * 5.176470588235294)) * 0.010381362401148057;
  outColor = sum;
}`;

const COMPOSITE = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uGlow;
in vec2 vUv;
out vec4 outColor;
float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
void main() {
  vec4 scene = texture(uScene, vUv);
  vec4 bloom = texture(uBloom, vUv) * uGlow;
  bloom.a = min(bloom.a, 1.0);
  bloom.rgb = min(bloom.rgb, vec3(bloom.a));
  vec4 color = scene + bloom * (1.0 - scene.a);
  float noise = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  color.a = clamp(color.a + noise, 0.0, 1.0);
  color.rgb = clamp(color.rgb + noise, vec3(0.0), vec3(color.a));
  outColor = color;
}`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Capture the mouse for first person, asking for raw (unaccelerated) movement where supported. */
export const lockPointer = (element: Element | null | undefined) => {
  if (!element?.requestPointerLock) return;
  const request = element.requestPointerLock as (options?: { unadjustedMovement?: boolean }) => Promise<void> | void;
  try {
    const result = request.call(element, { unadjustedMovement: true });
    if (result && typeof result.catch === 'function') {
      result.catch(() => {
        const plain = request.call(element);
        if (plain && typeof plain.catch === 'function') plain.catch(() => {});
      });
    }
  } catch {
    /* pointer lock unavailable: drag to look still works */
  }
};

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};

const link = (gl: WebGL2RenderingContext, fragmentSource: string): Program | null => {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (!info) continue;
    const name = info.name.replace(/\[0\]$/, '');
    uniforms[name] = gl.getUniformLocation(program, name);
  }
  return { program, uniforms };
};

const createTarget = (gl: WebGL2RenderingContext): Target => {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return { texture, width: 0, height: 0 };
};

const sizeTarget = (gl: WebGL2RenderingContext, target: Target, width: number, height: number) => {
  if (target.width === width && target.height === height) return;
  target.width = width;
  target.height = height;
  gl.bindTexture(gl.TEXTURE_2D, target.texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
};

let faceApiLoader: Promise<FaceApi> | null = null;

const loadFaceApi = () => {
  const scope = window as unknown as FaceScope;
  if (scope.faceapi) return Promise.resolve(scope.faceapi);
  if (!faceApiLoader) {
    faceApiLoader = new Promise<FaceApi>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = FACE_API_URL;
      script.async = true;
      script.onload = () => (scope.faceapi ? resolve(scope.faceapi) : reject(new Error('face-api.js')));
      script.onerror = () => {
        faceApiLoader = null;
        reject(new Error('face-api.js'));
      };
      document.head.appendChild(script);
    });
  }
  return faceApiLoader;
};

const STATUS_LABELS: Record<Status, string> = {
  loading: 'Loading face tracking',
  searching: 'Looking for a face',
  tracking: 'Tracking',
  blocked: 'Camera unavailable'
};

export const GridScan = ({
  linesColor,
  scanColor,
  cells = 8,
  lineThickness = 1,
  lineStyle = 'solid',
  depth = 3,
  depthFade = 0.6,
  parallax = 1,
  points = true,
  reflection = 0.35,
  shading = 0.7,
  scanDirection = 'forward',
  scanDuration = 2.4,
  scanDelay = 1.6,
  scanWidth = 1,
  trail = 0.5,
  glow = 0.6,
  autoScan = true,
  interactive = true,
  clickEffect = 'ping',
  enableWebcam = false,
  showPreview = false,
  modelsPath = MODELS_URL,
  enableGyro = false,
  intro = true,
  hold = false,
  lightMode = false,
  dpr,
  onEye,
  fps = false,
  onFpsExit,
  onCamera,
  doors = NO_DOORS,
  openDoor = -1,
  paused = false,
  lookPaused = false,
  sensitivity = 1,
  fovScale = 1,
  headBob = true,
  lights = 1,
  onStep,
  zoom = 1,
  controlRef,
  className = '',
  style,
  ...rest
}: GridScanProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wakeRef = useRef<(() => void) | null>(null);
  const headRef = useRef<Head | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  // Bumped to throw the canvas away and build a fresh WebGL context (see the init effect)
  const [attempt, setAttempt] = useState(0);
  const attemptRef = useRef(0);
  const settings: Settings = {
    linesColor: linesColor ?? (lightMode ? '#d4d4d8' : '#4d4757'),
    scanColor: scanColor ?? (lightMode ? '#0284c7' : '#7dd3fc'),
    cells: clamp(cells, 2, 40),
    thickness: clamp(lineThickness, 0.5, 4),
    style: STYLES[lineStyle] ?? 0,
    depth: clamp(depth, 0.5, 12),
    depthFade: clamp(depthFade, 0, 1),
    parallax: clamp(parallax, 0, 3),
    points,
    reflection: clamp(reflection, 0, 1),
    shading: clamp(shading, 0, 1),
    direction: scanDirection,
    duration: clamp(scanDuration, 0.3, 20),
    delay: clamp(scanDelay, 0, 30),
    scanWidth: clamp(scanWidth, 0.2, 5),
    trail: clamp(trail, 0, 1),
    glow: clamp(glow, 0, 1.5),
    autoScan,
    interactive,
    clickEffect,
    enableGyro,
    intro,
    hold,
    lightMode,
    dpr,
    fps,
    doors: doors.slice(0, MAX_DOORS),
    openDoor,
    paused,
    lookPaused,
    sensitivity: clamp(sensitivity, 0.2, 3),
    fovScale: clamp(fovScale, 0.7, 1.5),
    headBob,
    lights: clamp(lights, 0, 1),
    zoom: clamp(zoom, 0.3, 1)
  };
  const onEyeRef = useRef(onEye);
  onEyeRef.current = onEye;
  const onFpsExitRef = useRef(onFpsExit);
  onFpsExitRef.current = onFpsExit;
  const onCameraRef = useRef(onCamera);
  onCameraRef.current = onCamera;
  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;
  const controlRefRef = useRef(controlRef);
  controlRefRef.current = controlRef;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false
    });
    // The room can fail to come up (no context, a context the browser already dropped, shader
    // link failure). Rather than staying blank forever, rebuild it on a fresh canvas a few times.
    let retryTimer = 0;
    const retry = () => {
      if (retryTimer || attemptRef.current >= 5) return;
      attemptRef.current += 1;
      retryTimer = window.setTimeout(() => {
        retryTimer = 0;
        setAttempt(n => n + 1);
      }, 250);
    };
    const abandonRetry = () => window.clearTimeout(retryTimer);

    if (!container || !canvas) return undefined;
    if (!gl || gl.isContextLost()) {
      retry();
      return abandonRetry;
    }

    const room = link(gl, ROOM);
    const down = link(gl, DOWN);
    const blur = link(gl, BLUR);
    const composite = link(gl, COMPOSITE);
    if (!room || !down || !blur || !composite) {
      retry();
      return abandonRetry;
    }
    const vao = gl.createVertexArray();
    const scene = createTarget(gl);
    const light = createTarget(gl);
    const bloomA = createTarget(gl);
    const bloomB = createTarget(gl);
    const sceneBuffer = gl.createFramebuffer();
    const bloomBufferA = gl.createFramebuffer();
    const bloomBufferB = gl.createFramebuffer();

    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const colorCache = new Map<string, number[]>();
    const parse = (value: string): number[] => {
      const key = String(value);
      const cached = colorCache.get(key);
      if (cached) return cached;
      let rgb = [1, 1, 1];
      if (probe) {
        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = '#000000';
        probe.fillStyle = key;
        probe.fillRect(0, 0, 1, 1);
        const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
        rgb = [r / 255, g / 255, b / 255];
      }
      colorCache.set(key, rgb);
      return rgb;
    };

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const view = { width: 1, height: 1, ratio: 1 };
    const eye = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, f: EYE_DISTANCE, vf: 0, tf: EYE_DISTANCE };
    const pointer = { x: 0, y: 0, inside: false };
    const look = { x: 0, y: 0, held: false };
    const tilt = { gamma: 0, beta: 0, ready: false, asked: false };
    const hover = { x: 0, y: 0, z: 0, strength: 0, ready: false };
    const scan = { z: 0, dir: 1, alpha: 0, start: 0, sweeps: 0, waiting: false };
    const pings: Ping[] = [];
    // first-person player: blend (0 = window view, 1 = in the room), body, look and input
    const player = {
      active: false,
      blend: 0,
      locked: false,
      x: 0,
      y: -0.5 + FPS_EYE,
      z: FPS_START_Z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0,
      pitch: 0,
      grounded: true,
      bob: 0,
      dip: 0,
      vdip: 0,
      fov: FPS_FOV,
      turnX: 0,
      turnY: 0,
      keys: new Set<string>()
    };
    const camPos = { x: 0, y: 0, z: 0 };
    // the camera that actually draws: window view blended into the player's eyes
    const view3d = {
      blend: 0,
      pos: [0, 0, -EYE_DISTANCE] as [number, number, number],
      right: [1, 0, 0] as [number, number, number],
      up: [0, 1, 0] as [number, number, number],
      forward: [0, 0, 1] as [number, number, number],
      focal: EYE_DISTANCE,
      shift: [0, 0] as [number, number],
      rot: new Float32Array(9)
    };
    const doorData = new Float32Array(MAX_DOORS * 4);
    const doorTint = new Float32Array(MAX_DOORS * 4);
    const doorOpen = new Float32Array(MAX_DOORS);
    const doorGlow = new Float32Array(MAX_DOORS);
    let aimDoor = -1;
    let roomLights = 1;
    // bullet marks and the transient part of recoil
    const impacts: { x: number; y: number; z: number; age: number }[] = [];
    const impactData = new Float32Array(MAX_IMPACTS * 4);
    const kick = { p: 0, y: 0, vp: 0, vy: 0 };
    let pingsOn = true;
    let zoomTarget = 1;
    let zoomNow = 1;
    let lastYaw = 0;
    let lastPitch = 0;
    const turn: [number, number] = [0, 0];
    // the training range only exists once you are fully in first person
    const trainOpen = () => player.active && player.blend >= 0.999;
    const pingData = new Float32Array(MAX_PINGS * 4);
    const pingAlpha = new Float32Array(MAX_PINGS);
    let drawnOnce = false;
    let time = 0;
    let introClock = settingsRef.current.intro && !reduce ? 0 : 1;
    let raf = 0;
    let last = 0;
    let visible = true;
    let leaveTimer = 0;

    const roomSize = () => {
      const s = settingsRef.current;
      const aspect = view.width / view.height;
      const cy = 1 / Math.round(s.cells);
      const cx = aspect / Math.max(1, Math.round(aspect / cy));
      const roomDepth = Math.max(cy, Math.round(s.depth / cy) * cy);
      return { aspect, cx, cy, roomDepth };
    };

    const castRay = (u: number, v: number) => {
      const { aspect, roomDepth } = roomSize();
      const px = (u - 0.5) * aspect;
      const py = v - 0.5;
      const dx = px - eye.x;
      const dy = py - eye.y;
      const dz = eye.f;
      const sx = dx > 0 ? 0.5 * aspect : -0.5 * aspect;
      const sy = dy > 0 ? 0.5 : -0.5;
      let t = roomDepth / dz;
      if (Math.abs(dx) > 1e-6) t = Math.min(t, (sx - px) / dx);
      if (Math.abs(dy) > 1e-6) t = Math.min(t, (sy - py) / dy);
      return { x: px + dx * t, y: py + dy * t, z: dz * t };
    };

    const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
    const smoother = (t: number) => {
      const x = clamp(t, 0, 1);
      return x * x * x * (x * (x * 6 - 15) + 10);
    };

    const traceBoundsJS = (o: number[], d: number[], lo: number, hi: number) => {
      const { aspect } = roomSize();
      let face = 2;
      let t = Math.abs(d[2]) > 1e-6 ? ((d[2] > 0 ? hi : lo) - o[2]) / d[2] : 1e9;
      const tx = Math.abs(d[0]) > 1e-6 ? ((d[0] > 0 ? 0.5 : -0.5) * aspect - o[0]) / d[0] : 1e9;
      const ty = Math.abs(d[1]) > 1e-6 ? ((d[1] > 0 ? 0.5 : -0.5) - o[1]) / d[1] : 1e9;
      if (tx < t) {
        t = tx;
        face = 0;
      }
      if (ty < t) {
        t = ty;
        face = 1;
      }
      return { t, face, x: o[0] + d[0] * t, y: o[1] + d[1] * t, z: o[2] + d[2] * t };
    };
    // where a ray first meets the walls, passing through the training doorway when it fits
    const traceSceneJS = (o: number[], d: number[]) => {
      const { roomDepth } = roomSize();
      if (!trainOpen()) return traceBoundsJS(o, d, FPS_FRONT, roomDepth);
      const back = o[2] < TRAIN_FRONT;
      const hit = traceBoundsJS(o, d, back ? TRAIN_BACK : TRAIN_FRONT, back ? TRAIN_FRONT : roomDepth);
      if (hit.face === 2 && Math.abs(hit.z - TRAIN_FRONT) < 1e-6 && Math.abs(hit.x) < TRAIN_GAP_HALF && hit.y + 0.5 < TRAIN_GAP_H) {
        const goBack = d[2] < 0;
        const o2 = [hit.x + d[0] * 1e-4, hit.y + d[1] * 1e-4, hit.z + d[2] * 1e-4];
        const next = traceBoundsJS(o2, d, goBack ? TRAIN_BACK : TRAIN_FRONT, goBack ? TRAIN_FRONT : roomDepth);
        return { ...next, t: hit.t + 1e-4 + next.t };
      }
      return hit;
    };
    const viewDir = () => {
      const yaw = player.yaw + kick.y;
      const pitch = clamp(player.pitch + kick.p, -1.5, 1.5);
      const cp = Math.cos(pitch);
      return [Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp];
    };

    // where the crosshair (straight ahead of the player) meets the room
    const crosshairHit = () => {
      const hit = traceSceneJS([camPos.x, camPos.y, camPos.z], viewDir());
      return { x: hit.x, y: hit.y, z: hit.z, face: hit.face };
    };

    // which door (if any) the crosshair is on
    const findAimDoor = (s: Settings) => {
      if (!player.active || player.blend < 0.9 || s.paused) return -1;
      const hit = crosshairHit();
      if (hit.face !== 0 || hit.z < FPS_FRONT) return -1;
      const side = Math.sign(hit.x);
      for (let i = 0; i < s.doors.length; i++) {
        const door = s.doors[i];
        if (door.side === side && Math.abs(hit.z - door.z) < DOOR_W / 2 && hit.y + 0.5 < DOOR_H) return i;
      }
      return -1;
    };

    const updateDoors = (s: Settings, dt: number) => {
      aimDoor = findAimDoor(s);
      for (let i = 0; i < MAX_DOORS; i++) {
        const door = s.doors[i];
        if (!door) {
          doorData.set([0, 0, 0, 0], i * 4);
          continue;
        }
        const openTo = player.active && s.openDoor === i ? 1 : 0;
        doorOpen[i] += (openTo - doorOpen[i]) * (1 - Math.exp(-dt * (openTo ? 5 : 7)));
        doorGlow[i] += ((aimDoor === i ? 1 : 0) - doorGlow[i]) * (1 - Math.exp(-dt * 10));
        doorData.set([door.side, door.z, doorOpen[i], doorGlow[i]], i * 4);
        const tint = door.color ? parse(door.color) : parse(s.scanColor);
        doorTint.set([tint[0], tint[1], tint[2], door.portal ? 1 : door.dressed ? 2 : 0], i * 4);
      }
    };

    const exitFps = () => {
      if (!player.active) return;
      onFpsExitRef.current?.();
    };

    const updatePlayer = (s: Settings, dt: number) => {
      const { aspect, roomDepth } = roomSize();
      if (s.fps && !player.active) {
        Object.assign(player, { active: true, x: 0, y: -0.5 + FPS_EYE, z: FPS_START_Z, vx: 0, vy: 0, vz: 0 });
        Object.assign(player, { yaw: 0, pitch: 0, grounded: true, bob: 0, dip: 0, vdip: 0, fov: FPS_FOV, turnX: 0, turnY: 0 });
        player.keys.clear();
      } else if (!s.fps && player.active) {
        player.active = false;
        player.keys.clear();
        if (document.pointerLockElement === canvas) document.exitPointerLock?.();
      }

      if (player.active) {
        player.blend = Math.min(1, player.blend + dt / (reduce ? 0.2 : FPS_BLEND_SECONDS));
      } else if (player.blend > 0) {
        // settle back to facing the window, then glide out
        const ease = 1 - Math.exp(-dt * 7);
        player.yaw = wrapAngle(player.yaw);
        player.yaw += (0 - player.yaw) * ease;
        player.pitch += (0 - player.pitch) * ease;
        player.x += (0 - player.x) * ease;
        player.z += (FPS_START_Z - player.z) * Math.max(ease, Math.min(1, dt * 3));
        player.y += (-0.5 + FPS_EYE - player.y) * ease;
        player.vx = player.vz = player.vy = 0;
        if (Math.abs(player.yaw) < 0.4 && Math.abs(player.pitch) < 0.3) {
          player.blend = Math.max(0, player.blend - dt / (reduce ? 0.2 : FPS_BLEND_SECONDS));
        }
      }

      // walking: only once the view is (nearly) inside the room
      if (player.active && player.blend > 0.6 && !s.paused) {
        const k = player.keys;
        const ix = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
        const iz = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0);
        // arrow keys turn the head: laptop touchpads switch themselves off while a key is held
        // (palm rejection), so WASD + trackpad can't work together there
        const lx = (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0);
        const ly = (k.has('ArrowUp') ? 1 : 0) - (k.has('ArrowDown') ? 1 : 0);
        const turnEase = 1 - Math.exp(-dt * 10);
        player.turnX += (lx * FPS_TURN - player.turnX) * turnEase;
        player.turnY += (ly * FPS_TURN * 0.6 - player.turnY) * turnEase;
        player.yaw = wrapAngle(player.yaw + player.turnX * dt);
        player.pitch = clamp(player.pitch + player.turnY * dt, -1.45, 1.45);
        const sprint = k.has('ShiftLeft') || k.has('ShiftRight');
        const sy = Math.sin(player.yaw);
        const cy = Math.cos(player.yaw);
        let wx = ix * cy + iz * sy;
        let wz = -ix * sy + iz * cy;
        const len = Math.hypot(wx, wz);
        const speed = sprint ? FPS_SPRINT : FPS_SPEED;
        if (len > 0) {
          wx = (wx / len) * speed;
          wz = (wz / len) * speed;
        }
        const accel = 1 - Math.exp(-dt * (player.grounded ? 12 : 2.5));
        player.vx += (wx - player.vx) * accel;
        player.vz += (wz - player.vz) * accel;
        if ((k.has('Space')) && player.grounded) {
          player.vy = FPS_JUMP;
          player.grounded = false;
          onStepRef.current?.('jump', 1);
        }
        zoomNow += (zoomTarget - zoomNow) * (1 - Math.exp(-dt * 14));
        const baseFov = FPS_FOV * s.fovScale * s.zoom * zoomNow;
        player.fov += ((sprint && len > 0 ? baseFov * 1.08 : baseFov) - player.fov) * (1 - Math.exp(-dt * 6));
      } else {
        player.turnX = 0;
        player.turnY = 0;
        player.vx *= 0.8;
        player.vz *= 0.8;
      }

      // body: gravity, floor, ceiling and walls
      const wasZ = player.z;
      player.x += player.vx * dt;
      player.z += player.vz * dt;
      if (trainOpen()) {
        // the shared wall has a doorway. Which side you were on decides which wall stops you;
        // only someone already lined up with the opening may pass into the wall's thickness
        // (and is then kept inside the opening). Anyone else just stops at the wall.
        const gapX = TRAIN_GAP_HALF - FPS_RADIUS * 0.6;
        const wasMain = wasZ >= TRAIN_FRONT;
        const inBand = (z: number) => Math.abs(z - TRAIN_FRONT) < FPS_RADIUS - 1e-4;
        const lined = Math.abs(player.x) <= gapX;
        if (inBand(player.z) || (wasMain ? player.z < TRAIN_FRONT : player.z >= TRAIN_FRONT)) {
          if (lined || inBand(wasZ)) player.x = clamp(player.x, -gapX, gapX);
          else player.z = wasMain ? Math.max(player.z, TRAIN_FRONT + FPS_RADIUS) : Math.min(player.z, TRAIN_FRONT - FPS_RADIUS);
        }
        player.z = clamp(player.z, RANGE.back + FPS_RADIUS, roomDepth - FPS_RADIUS);
      }
      const inHall = trainOpen() && player.z < TRAIN_FRONT;
      const wallX = (inHall ? RANGE.halfW : 0.5 * aspect) - FPS_RADIUS;
      player.x = clamp(player.x, -wallX, wallX);
      if (!trainOpen() && (player.active || player.blend <= 0)) {
        player.z = clamp(player.z, FPS_FRONT + FPS_RADIUS, roomDepth - FPS_RADIUS);
      }
      // the boxes in the training hall: walk up steps, stand on platforms, bump into the rest
      let floorY = -0.5;
      if (inHall && player.active) {
        const feet = player.y - FPS_EYE;
        const STEP = 0.09;
        for (const b of BOXES) {
          const nx = clamp(player.x, b.min[0], b.max[0]);
          const nz = clamp(player.z, b.min[2], b.max[2]);
          const dx = player.x - nx;
          const dz = player.z - nz;
          const dist2 = dx * dx + dz * dz;
          const top = b.max[1];
          if (top <= feet + STEP + 1e-4) {
            // low enough to stand on (or step up onto) when over it
            if (dist2 < (FPS_RADIUS * 0.7) ** 2) floorY = Math.max(floorY, top);
            continue;
          }
          if (dist2 >= FPS_RADIUS * FPS_RADIUS) continue;
          // blocked: push out of the box sideways
          if (dist2 > 1e-10) {
            const d = Math.sqrt(dist2);
            player.x = nx + (dx / d) * FPS_RADIUS;
            player.z = nz + (dz / d) * FPS_RADIUS;
          } else {
            const pushes = [
              [player.x - b.min[0] + FPS_RADIUS, -1, 0],
              [b.max[0] - player.x + FPS_RADIUS, 1, 0],
              [player.z - b.min[2] + FPS_RADIUS, 0, -1],
              [b.max[2] - player.z + FPS_RADIUS, 0, 1],
            ].sort((a, c) => a[0] - c[0]);
            player.x += pushes[0][1] * pushes[0][0];
            player.z += pushes[0][2] * pushes[0][0];
          }
        }
      }
      const ground = floorY + FPS_EYE;
      const ceiling = (inHall ? RANGE.ceil : 0.5) - 0.06;
      if (player.active) {
        player.vy -= FPS_GRAVITY * dt;
        player.y += player.vy * dt;
        // stepping up onto something low: rise smoothly instead of popping
        if (player.grounded && player.y < ground && ground - player.y < 0.1) {
          player.y += Math.min(ground - player.y, dt * 1.6);
          if (player.y < ground - 0.002) player.vy = Math.max(player.vy, 0);
        }
        if (player.grounded && player.y > ground + 0.02 && player.vy <= 0) player.grounded = false; // walked off an edge
        if (player.y <= ground) {
          if (!player.grounded && player.vy < -0.6) {
            player.vdip += Math.min(1.2, -player.vy) * 0.9;
            onStepRef.current?.('land', Math.min(1, -player.vy / 2.4));
          }
          player.y = ground;
          player.vy = 0;
          player.grounded = true;
        }
        if (player.y > ceiling) {
          player.y = ceiling;
          player.vy = Math.min(player.vy, 0);
        }
      }
      player.vdip += (-player.dip * 140 - player.vdip * 15) * dt;
      player.dip += player.vdip * dt;

      // head bob while walking on the ground
      const moving = Math.hypot(player.vx, player.vz);
      if (player.grounded && moving > 0.05) {
        const before = Math.floor(player.bob / Math.PI);
        player.bob += dt * (6 + moving * 6);
        // a footstep every half bob cycle, i.e. each time a foot comes down
        if (Math.floor(player.bob / Math.PI) !== before && player.active) {
          onStepRef.current?.('step', clamp((moving - FPS_SPEED * 0.5) / (FPS_SPRINT - FPS_SPEED * 0.5), 0, 1));
        }
      }
      const bobAmp = reduce || !s.headBob ? 0 : Math.min(1, moving / FPS_SPEED) * (player.grounded ? 1 : 0);
      const bobY = Math.sin(player.bob * 2) * 0.007 * bobAmp;
      const bobX = Math.sin(player.bob) * 0.005 * bobAmp;

      const r = [Math.cos(player.yaw), 0, -Math.sin(player.yaw)]; // sway the head sideways
      camPos.x = player.x + r[0] * bobX;
      camPos.y = player.y + bobY - player.dip * 0.04;
      camPos.z = player.z + r[2] * bobX;

      // recoil: the transient part springs back to centre
      kick.vp += (-kick.p * 170 - kick.vp * 19) * dt;
      kick.vy += (-kick.y * 170 - kick.vy * 19) * dt;
      kick.p += kick.vp * dt;
      kick.y += kick.vy * dt;
      turn[0] = dt > 0 ? wrapAngle(player.yaw - lastYaw) / dt : 0;
      turn[1] = dt > 0 ? (player.pitch - lastPitch) / dt : 0;
      lastYaw = player.yaw;
      lastPitch = player.pitch;
      for (let i = impacts.length - 1; i >= 0; i--) {
        impacts[i].age += dt;
        if (impacts[i].age > IMPACT_LIFE) impacts.splice(i, 1);
      }

      // blend: position, turn, focal length and frustum shift all move together
      const k = smoother(player.blend);
      view3d.blend = k;
      view3d.pos = [eye.x + (camPos.x - eye.x) * k, eye.y + (camPos.y - eye.y) * k, -eye.f + (camPos.z + eye.f) * k];
      const yaw = (player.yaw + kick.y) * k;
      const pitch = clamp(player.pitch + kick.p, -1.5, 1.5) * k;
      const cpk = Math.cos(pitch);
      const fk: [number, number, number] = [Math.sin(yaw) * cpk, Math.sin(pitch), Math.cos(yaw) * cpk];
      const rk: [number, number, number] = [Math.cos(yaw), 0, -Math.sin(yaw)];
      const uk: [number, number, number] = [
        fk[1] * rk[2] - fk[2] * rk[1],
        fk[2] * rk[0] - fk[0] * rk[2],
        fk[0] * rk[1] - fk[1] * rk[0]
      ];
      view3d.right = rk;
      view3d.up = uk;
      view3d.forward = fk;
      view3d.rot.set([rk[0], rk[1], rk[2], uk[0], uk[1], uk[2], fk[0], fk[1], fk[2]]);
      view3d.focal = eye.f + (1 / (2 * player.fov) - eye.f) * k;
      view3d.shift = [eye.x * (1 - k), eye.y * (1 - k)];
    };

    const startSweep = (s: Settings) => {
      scan.dir = s.direction === 'backward' || (s.direction === 'pingpong' && scan.sweeps % 2 === 1) ? -1 : 1;
      scan.start = time;
      scan.waiting = false;
      scan.sweeps += 1;
    };

    const updateScan = (s: Settings, roomDepth: number) => {
      if (introClock < 1) {
        const k = introClock;
        scan.dir = 1;
        scan.z = k * (roomDepth + 0.4) - 0.2;
        scan.alpha = Math.min(1, k * 6) * (1 - Math.max(0, k - 0.85) / 0.15);
        return;
      }
      if (scan.sweeps === 0 && !scan.waiting) {
        scan.waiting = true;
        scan.start = time;
        scan.alpha = 0;
      }
      if (scan.waiting) {
        scan.alpha = 0;
        if (s.autoScan && !reduce && time - scan.start >= s.delay) startSweep(s);
        return;
      }
      const k = (time - scan.start) / s.duration;
      if (k >= 1) {
        scan.waiting = true;
        scan.start = time;
        scan.alpha = 0;
        return;
      }
      const travel = k * (roomDepth + 0.3) - 0.15;
      scan.z = scan.dir > 0 ? travel : roomDepth - travel;
      scan.alpha = Math.min(1, k / 0.12) * Math.min(1, (1 - k) / 0.12);
    };

    const updateEye = (dt: number) => {
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        eye.vx += ((eye.tx - eye.x) * 42 - eye.vx * 11) * h;
        eye.vy += ((eye.ty - eye.y) * 42 - eye.vy * 11) * h;
        eye.vf += ((eye.tf - eye.f) * 42 - eye.vf * 11) * h;
        eye.x += eye.vx * h;
        eye.y += eye.vy * h;
        eye.f += eye.vf * h;
      }
    };

    const setLook = (nx: number, ny: number, held: boolean) => {
      look.x = clamp(nx, -1, 1);
      look.y = clamp(ny, -1, 1);
      look.held = held;
    };

    const aimEye = (s: Settings) => {
      const aspect = Math.max(view.width / view.height, MIN_EYE_ASPECT);
      const drift = reduce ? 0 : 1;
      const nx = look.held ? look.x : (Math.sin(time * 0.21) * 0.2 + Math.sin(time * 0.083 + 1.3) * 0.12) * drift;
      const ny = look.held ? look.y : Math.sin(time * 0.17 + 2.1) * 0.16 * drift;
      eye.tx = nx * s.parallax * 0.22 * aspect;
      eye.ty = ny * s.parallax * 0.22;
    };

    const resize = () => {
      const s = settingsRef.current;
      view.width = Math.max(1, container.clientWidth);
      view.height = Math.max(1, container.clientHeight);
      view.ratio = Math.min(s.dpr || window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(view.width * view.ratio));
      canvas.height = Math.max(1, Math.round(view.height * view.ratio));
      sizeTarget(gl, scene, canvas.width, canvas.height);
      sizeTarget(gl, light, canvas.width, canvas.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, sceneBuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, scene.texture, 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, light.texture, 0);
      const bw = Math.max(1, Math.round(canvas.width / 4));
      const bh = Math.max(1, Math.round(canvas.height / 4));
      sizeTarget(gl, bloomA, bw, bh);
      sizeTarget(gl, bloomB, bw, bh);
      gl.bindFramebuffer(gl.FRAMEBUFFER, bloomBufferA);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, bloomA.texture, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, bloomBufferB);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, bloomB.texture, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      draw();
      wake();
    };

    const draw = () => {
      const s = settingsRef.current;
      const { aspect, cx, cy, roomDepth } = roomSize();
      const lineRgb = parse(s.linesColor);
      const scanRgb = parse(s.scanColor);
      const coreRgb = s.lightMode ? scanRgb : scanRgb.map(c => c + (1 - c) * 0.65);
      const ru = room.uniforms;
      gl.bindVertexArray(vao);
      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, sceneBuffer);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(room.program);
      gl.uniform1f(ru.uAspect, aspect);
      gl.uniform1f(ru.uPixel, 1 / canvas.height);
      gl.uniform3f(ru.uEye, eye.x, eye.y, -eye.f);
      gl.uniform1f(ru.uDepth, roomDepth);
      gl.uniform3f(ru.uCell, cx, cy, cy);
      gl.uniform1f(ru.uThick, s.thickness * view.ratio * 0.5);
      gl.uniform1f(ru.uDot, 1.8 * view.ratio);
      gl.uniform1i(ru.uStyle, s.style);
      gl.uniform3fv(ru.uLineColor, lineRgb);
      gl.uniform3fv(ru.uScanColor, scanRgb);
      gl.uniform3fv(ru.uCoreColor, coreRgb);
      gl.uniform1f(ru.uFade, s.depthFade);
      gl.uniform1f(ru.uScanZ, scan.z);
      gl.uniform1f(ru.uScanDir, scan.dir);
      gl.uniform1f(ru.uScanAlpha, scan.alpha);
      gl.uniform1f(ru.uScanWidth, 0.006 * s.scanWidth);
      gl.uniform1f(ru.uTrail, 0.04 + s.trail * 1.1);
      gl.uniform1f(ru.uReveal, introClock < 1 ? scan.z + 0.05 : 1e4);
      gl.uniform1f(ru.uPoints, s.points ? 1 : 0);
      gl.uniform1f(ru.uReflect, s.reflection);
      gl.uniform1f(ru.uHaze, s.lightMode ? 0.03 : 0.05);
      gl.uniform1f(ru.uShade, s.shading);
      gl.uniform1f(ru.uLight, s.lightMode ? 1 : 0);
      gl.uniform4fv(ru.uPing, pingData);
      gl.uniform1fv(ru.uPingAlpha, pingAlpha);
      gl.uniform4f(ru.uHover, hover.x, hover.y, hover.z, hover.strength);
      gl.uniform1f(ru.uTime, time);
      gl.uniform1f(ru.uFps, smoother(player.blend));
      gl.uniform3f(ru.uCamPos, view3d.pos[0], view3d.pos[1], view3d.pos[2]);
      gl.uniformMatrix3fv(ru.uCamRot, false, view3d.rot);
      gl.uniform1f(ru.uFocal, view3d.focal);
      gl.uniform2f(ru.uShift, view3d.shift[0], view3d.shift[1]);
      gl.uniform1f(ru.uFront, FPS_FRONT);
      gl.uniform4fv(ru.uDoors, doorData);
      gl.uniform4fv(ru.uDoorTint, doorTint);
      gl.uniform1i(ru.uDoorCount, Math.min(s.doors.length, MAX_DOORS));
      gl.uniform2f(ru.uDoorSize, DOOR_W, DOOR_H);
      gl.uniform1f(ru.uLights, roomLights);
      gl.uniform1f(ru.uTrain, trainOpen() ? 1 : 0);
      gl.uniform1f(ru.uTrainBack, TRAIN_BACK);
      gl.uniform2f(ru.uGap, TRAIN_GAP_HALF, TRAIN_GAP_H);
      gl.uniform3f(ru.uAccent, 1, 0.58, 0.24);
      gl.uniform4f(ru.uMirror, MIRROR.x, MIRROR.bottom, MIRROR.halfW, player.active ? MIRROR.height : 0);
      for (let i = 0; i < MAX_IMPACTS; i++) {
        const im = impacts[i];
        if (im) impactData.set([im.x, im.y, im.z, im.age], i * 4);
      }
      gl.uniform4fv(ru.uImpacts, impactData);
      gl.uniform1i(ru.uImpactCount, impacts.length);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      const glowing = s.glow > 0;
      if (glowing) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, bloomBufferA);
        gl.viewport(0, 0, bloomA.width, bloomA.height);
        gl.useProgram(down.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, light.texture);
        gl.uniform1i(down.uniforms.uSource, 0);
        gl.uniform2f(down.uniforms.uTexel, 1 / light.width, 1 / light.height);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        const spread = (2.2 * view.ratio) / 2;
        gl.useProgram(blur.program);
        gl.uniform1i(blur.uniforms.uSource, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, bloomBufferB);
        gl.bindTexture(gl.TEXTURE_2D, bloomA.texture);
        gl.uniform2f(blur.uniforms.uStep, spread / bloomA.width, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, bloomBufferA);
        gl.bindTexture(gl.TEXTURE_2D, bloomB.texture);
        gl.uniform2f(blur.uniforms.uStep, 0, spread / bloomA.height);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(composite.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, scene.texture);
      gl.uniform1i(composite.uniforms.uScene, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, bloomA.texture);
      gl.uniform1i(composite.uniforms.uBloom, 1);
      gl.uniform1f(composite.uniforms.uGlow, glowing ? s.glow * (s.lightMode ? 0.8 : 1.6) : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.activeTexture(gl.TEXTURE0);
    };

    const frame = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      const s = settingsRef.current;
      if (s.hold && drawnOnce) {
        last = 0; // the intro starts fresh once the hold lifts
        return;
      }
      const dt = last ? clamp((now - last) / 1000, 0.001, 0.05) : 1 / 60;
      last = now;
      time += dt;
      if (introClock < 1) introClock = Math.min(1, introClock + dt / INTRO_SECONDS);
      const { roomDepth } = roomSize();
      updateScan(s, roomDepth);
      aimEye(s);
      updateEye(dt);
      updatePlayer(s, dt);
      updateDoors(s, dt);
      roomLights += (s.lights - roomLights) * (1 - Math.exp(-dt * 6));
      onCameraRef.current?.({
        blend: view3d.blend,
        pos: view3d.pos,
        right: view3d.right,
        up: view3d.up,
        forward: view3d.forward,
        focal: view3d.focal,
        shift: view3d.shift,
        time,
        aimDoor,
        locked: player.locked,
        speed: Math.hypot(player.vx, player.vz),
        grounded: player.grounded,
        sprinting: player.keys.has('ShiftLeft') || player.keys.has('ShiftRight'),
        room: camPos.z < TRAIN_FRONT && trainOpen() ? 1 : 0,
        trainOpen: trainOpen(),
        turnRate: [turn[0], turn[1]],
        aspect: view.width / view.height,
        depth: roomDepth,
        body: { x: player.x, y: player.y - FPS_EYE, z: player.z, yaw: player.yaw, pitch: player.pitch, vy: player.vy },
        fps: player.active
      });
      if (onEyeRef.current && s.parallax > 0) {
        const range = 0.22 * s.parallax;
        onEyeRef.current(eye.x / (range * Math.max(view.width / view.height, MIN_EYE_ASPECT)), eye.y / range);
      }

      const inRoom = player.active && player.blend > 0.5;
      const aim = inRoom || (s.interactive && pointer.inside && !reduce && player.blend === 0) ? 1 : 0;
      if (aim) {
        const { x, y, z } = inRoom ? crosshairHit() : castRay(pointer.x, pointer.y);
        const target = { x, y, z };
        if (!hover.ready) Object.assign(hover, target, { ready: true });
        // in first person the glow sits exactly where the crosshair is (a lagging glow smears
        // across the walls when you flick); the normal view keeps its soft follow
        const follow = inRoom ? 1 : 1 - Math.exp(-dt / 0.08);
        hover.x += (target.x - hover.x) * follow;
        hover.y += (target.y - hover.y) * follow;
        hover.z += (target.z - hover.z) * follow;
      }
      hover.strength += (aim - hover.strength) * (1 - Math.exp(-dt / (inRoom ? 0.1 : 0.25)));
      if (!aim && hover.strength < 0.01) hover.ready = false;

      for (let i = pings.length - 1; i >= 0; i--) {
        pings[i].age += dt;
        if (pings[i].age > PING_LIFE) pings.splice(i, 1);
      }
      for (let i = 0; i < MAX_PINGS; i++) {
        const ping = pings[i];
        if (!ping) {
          pingAlpha[i] = 0;
          continue;
        }
        const k = ping.age / PING_LIFE;
        pingData.set([ping.x, ping.y, ping.z, ping.age * 1.15], i * 4);
        pingAlpha[i] = Math.min(1, ping.age / 0.05) * (1 - k) * (1 - k);
      }

      if (mainVisible || !drawnOnce) draw();
      if (!drawnOnce) {
        drawnOnce = true;
        attemptRef.current = 0; // healthy: reset the retry budget
      }

      const settling =
        Math.abs(eye.tx - eye.x) + Math.abs(eye.ty - eye.y) + Math.abs(eye.tf - eye.f) > 1e-4 ||
        Math.abs(eye.vx) + Math.abs(eye.vy) + Math.abs(eye.vf) > 1e-4;
      const busy =
        player.active ||
        player.blend > 0 ||
        impacts.length > 0 ||
        doorOpen.some(v => v > 0.001) ||
        introClock < 1 ||
        (!reduce && s.autoScan) ||
        !scan.waiting ||
        pings.length > 0 ||
        settling ||
        hover.strength > 0.002 ||
        (!reduce && s.parallax > 0 && !look.held) ||
        (s.points && !reduce && scan.alpha > 0);
      // (something during this frame may already have asked for the next one: never queue two)
      if (busy && !raf) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    function wake() {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
    }

    const locate = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const u = (event.clientX - rect.left) / Math.max(1, rect.width);
      const v = 1 - (event.clientY - rect.top) / Math.max(1, rect.height);
      return { u, v, inside: u >= 0 && u <= 1 && v >= 0 && v <= 1 };
    };

    // mouse look: pointer lock when we have it, otherwise drag to look
    let mainVisible = true;
    let lookAvg = 0;
    let lookAt = 0;
    let lookSkipped = false;
    const onMouseMove = (event: MouseEvent) => {
      const st = settingsRef.current;
      if (!player.active || st.paused || st.lookPaused) return;
      if (!player.locked && !(event.buttons & 1)) return;
      const mx = event.movementX;
      const my = event.movementY;
      if (!Number.isFinite(mx) || !Number.isFinite(my)) return;
      const now = performance.now();
      // the first event after the lock is taken can carry the whole cursor travel
      if (now - lockedAt < 60) return;
      // Chrome sometimes reports one bogus jump under pointer lock. Drop a single big step that
      // comes out of nowhere, but never a run of them: a fast flick (or a slow frame, which
      // batches the movement into fewer, bigger events) has to keep turning, not freeze.
      const mag = Math.max(Math.abs(mx), Math.abs(my));
      if (now - lookAt > 120) lookAvg = 0;
      lookAt = now;
      const outlier = mag > FPS_SPIKE && mag > lookAvg * 6 + 80;
      lookAvg = lookAvg * 0.6 + Math.min(mag, 600) * 0.4;
      if (outlier && !lookSkipped) {
        lookSkipped = true;
        return;
      }
      lookSkipped = false;
      player.yaw = wrapAngle(player.yaw + mx * FPS_SENS * st.sensitivity * st.zoom * zoomNow);
      player.pitch = clamp(player.pitch - my * FPS_SENS * st.sensitivity * st.zoom * zoomNow, -1.45, 1.45);
      wake();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!player.active || settingsRef.current.paused) return;
      if (event.code === 'Escape') {
        if (settingsRef.current.lookPaused) return; // the page closes the tablet
        exitFps();
        return;
      }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      player.keys.add(event.code);
      wake();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      player.keys.delete(event.code);
    };
    const onBlur = () => player.keys.clear();
    let lockedAt = 0;
    const onLockChange = () => {
      const locked = document.pointerLockElement === canvas;
      // Esc released the lock (a door's card releasing it on purpose doesn't count)
      if (player.locked && !locked && player.active && !settingsRef.current.paused && !settingsRef.current.lookPaused) exitFps();
      if (locked && !player.locked) lockedAt = performance.now();
      player.locked = locked;
      if (!locked && !settingsRef.current.lookPaused) player.keys.clear();
      wake();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (player.active) return;
      const s = settingsRef.current;
      const { u, v, inside } = locate(event);
      pointer.x = u;
      pointer.y = v;
      const was = pointer.inside;
      pointer.inside = inside;
      if (inside) {
        window.clearTimeout(leaveTimer);
        leaveTimer = 0;
        if (!headRef.current?.active && s.interactive && !reduce) setLook(u * 2 - 1, v * 2 - 1, true);
        wake();
      } else if (was && !leaveTimer) {
        leaveTimer = window.setTimeout(() => {
          leaveTimer = 0;
          if (!headRef.current?.active) look.held = false;
          wake();
        }, 220);
        wake();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const s = settingsRef.current;
      if (player.active) {
        if (s.paused || s.lookPaused) return;
        if (!player.locked) lockPointer(canvas);
        // a ping lands where the crosshair points
        if (player.blend > 0.5 && s.clickEffect !== 'none' && !reduce && pingsOn) {
          const hit = crosshairHit();
          pings.unshift({ x: hit.x, y: hit.y, z: hit.z, age: 0 });
          if (pings.length > MAX_PINGS) pings.pop();
        }
        wake();
        return;
      }
      const { u, v, inside } = locate(event);
      if (!inside || reduce || s.clickEffect === 'none') return;
      if (s.clickEffect === 'scan') {
        if (introClock >= 1) startSweep(s);
      } else {
        const hit = castRay(u, v);
        pings.unshift({ ...hit, age: 0 });
        if (pings.length > MAX_PINGS) pings.pop();
      }
      wake();
    };

    const onPointerLeave = () => {
      pointer.inside = false;
      if (!headRef.current?.active) look.held = false;
      wake();
    };

    const onOrientation = (event: DeviceOrientationEvent) => {
      const s = settingsRef.current;
      if (!s.enableGyro || headRef.current?.active || reduce || event.gamma === null || event.beta === null) return;
      if (!tilt.ready) Object.assign(tilt, { gamma: event.gamma, beta: event.beta, ready: true });
      setLook((event.gamma - tilt.gamma) / 14, (event.beta - tilt.beta) / -14, true);
      wake();
    };

    const onClick = () => {
      const s = settingsRef.current;
      const request = (
        window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined
      )?.requestPermission;
      if (!s.enableGyro || tilt.asked || typeof request !== 'function') return;
      tilt.asked = true;
      request.call(window.DeviceOrientationEvent).catch(() => {});
    };

    const onVisibility = () => {
      last = 0;
      wake();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) {
        last = 0;
        wake();
      }
    });
    intersection.observe(container);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('pointerlockchange', onLockChange);
    window.addEventListener('deviceorientation', onOrientation);
    window.addEventListener('click', onClick);
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);
    headRef.current = {
      active: false,
      move: (nx, ny, near) => {
        if (reduce) return;
        setLook(nx * 1.3, ny * 1.3, true);
        eye.tf = EYE_DISTANCE * clamp(near, 0.6, 1.6);
        wake();
      },
      release: () => {
        eye.tf = EYE_DISTANCE;
        look.held = false;
        wake();
      }
    };
    // If the browser drops the context (GPU reset, too many contexts, tab discarded), rebuild.
    const onContextLost = (event: Event) => {
      event.preventDefault();
      retry();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    // If nothing has been drawn a couple of seconds after mounting (while visible), start over.
    const watchdog = window.setTimeout(() => {
      if (!drawnOnce && !document.hidden && visible) retry();
    }, 2500);

    const control: RoomControl = {
      kick: (up, side) => {
        player.pitch = clamp(player.pitch + up * 0.35, -1.45, 1.45);
        player.yaw = wrapAngle(player.yaw + side * 0.35);
        kick.vp += up * 0.65 * 22;
        kick.vy += side * 0.65 * 22;
        wake();
      },
      impact: (x, y, z) => {
        impacts.unshift({ x, y, z, age: 0 });
        if (impacts.length > MAX_IMPACTS) impacts.pop();
        wake();
      },
      aim: () => {
        const d = viewDir();
        return { o: [camPos.x, camPos.y, camPos.z], d: [d[0], d[1], d[2]] };
      },
      trace: (o, d) => traceSceneJS(o, d),
      setPings: on => {
        pingsOn = on;
      },
      setZoom: z => {
        zoomTarget = clamp(z, 0.3, 1);
        wake();
      },
      setMainVisible: on => {
        if (on && !mainVisible) wake();
        mainVisible = on;
      }
    };
    if (controlRefRef.current) controlRefRef.current.current = control;

    resize();
    wakeRef.current = wake;

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(watchdog);
      abandonRetry();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      wakeRef.current = null;
      headRef.current = null;
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('pointerlockchange', onLockChange);
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
      window.removeEventListener('deviceorientation', onOrientation);
      window.removeEventListener('click', onClick);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      [scene, light, bloomA, bloomB].forEach(target => gl.deleteTexture(target.texture));
      [sceneBuffer, bloomBufferA, bloomBufferB].forEach(buffer => gl.deleteFramebuffer(buffer));
      gl.deleteVertexArray(vao);
      [room, down, blur, composite].forEach(item => gl.deleteProgram(item.program));
      // Only free the context when the canvas is really going away. During React's dev
      // double-mount (or any re-run) the same canvas is reused, and a context we have
      // force-lost would be handed straight back dead.
      if (!canvas.isConnected) gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [attempt]);

  useEffect(() => {
    wakeRef.current?.();
  });

  useEffect(() => {
    if (!enableWebcam) return undefined;
    const video = videoRef.current;
    if (!video) return undefined;
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer = 0;
    let lost = 0;
    const smooth = { x: 0, y: 0, near: 1, ready: false };
    setStatus('loading');

    const run = async () => {
      try {
        const faceapi = await loadFaceApi();
        await faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath);
        if (stopped) return;
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
        if (stopped) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
        setStatus('searching');
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 });
        const detect = async () => {
          if (stopped) return;
          let result = null;
          try {
            result = await faceapi.detectSingleFace(video, options);
          } catch {
            result = null;
          }
          if (stopped) return;
          const head = headRef.current;
          if (result && head) {
            const box = result.box;
            const vw = video.videoWidth || 1;
            const vh = video.videoHeight || 1;
            const x = -((box.x + box.width / 2) / vw - 0.5) * 2;
            const y = -((box.y + box.height / 2) / vh - 0.5) * 2;
            const near = 0.32 / Math.max(0.08, box.width / vw);
            const k = smooth.ready ? 0.45 : 1;
            smooth.x += (x - smooth.x) * k;
            smooth.y += (y - smooth.y) * k;
            smooth.near += (near - smooth.near) * k;
            smooth.ready = true;
            lost = 0;
            head.active = true;
            head.move(smooth.x, smooth.y, smooth.near);
            setStatus('tracking');
          } else if (head && ++lost > 12 && head.active) {
            head.active = false;
            smooth.ready = false;
            head.release();
            setStatus('searching');
          }
          timer = window.setTimeout(detect, 40);
        };
        detect();
      } catch {
        if (!stopped) setStatus('blocked');
      }
    };
    run();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach(track => track.stop());
      video.srcObject = null;
      const head = headRef.current;
      if (head?.active) {
        head.active = false;
        head.release();
      }
    };
  }, [enableWebcam, modelsPath]);

  return (
    <div
      ref={containerRef}
      className={['relative h-full w-full overflow-hidden', className].filter(Boolean).join(' ')}
      style={style}
      {...rest}
    >
      <canvas key={attempt} ref={canvasRef} data-gridscan="" className="absolute inset-0 block h-full w-full" aria-hidden="true" />
      {enableWebcam && (
        <div
          className={
            showPreview
              ? 'pointer-events-none absolute bottom-3 right-3 aspect-[4/3] w-[168px] overflow-hidden rounded-[14px] bg-[#0b0b0e] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.35)]'
              : 'pointer-events-none absolute h-px w-px overflow-hidden opacity-0'
          }
        >
          <video ref={videoRef} className="block h-full w-full -scale-x-100 object-cover" muted playsInline />
          {showPreview && (
            <span className="absolute bottom-2 left-2 rounded-lg bg-[rgba(10,10,12,0.6)] px-2 py-[3px] font-sans text-[11px] font-medium leading-[1.4] text-white backdrop-blur-sm">
              {STATUS_LABELS[status]}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default GridScan;
