'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { RoomCamera } from '@/components/GridScan';
import type { DoorTheme } from '@/app/roomDoors';
import { portalFrames, PORTAL_FRAMES } from './portalFrames';

/**
 * The doors of the grid room, dressed. Each door is two leaves drawn by one fragment shader per
 * theme (circuit board, liquid glass, an iris among glowing glyphs, a holographic code screen,
 * an aurora, an art-deco sunburst), set in a machined frame with neon tubes, with a soft
 * bloom-like halo on the wall behind (one additive quad, no post-processing) and particles in the
 * door's own style. The leaves slide apart when the door opens; the room's shader keeps the
 * light beyond and on the floor. The 'portal' door is a nether portal: obsidian blocks round the
 * game's own swirl animation, purple pixels drifting out.
 *
 * Drawn with the room's camera on a transparent canvas between the room and its panels.
 */
export type DoorSpot = { side: number; z: number; theme: DoorTheme; color: string; portal: boolean };
export type DoorsApi = {
  update: (
    cam: RoomCamera,
    dt: number,
    opts: { doors: DoorSpot[]; aim: number; open: number; lights: boolean; visible: boolean; clip: string | null }
  ) => void;
};

const DOOR_W = 0.34;
const DOOR_H = 0.62;
const THEME_ID: Record<DoorTheme, number> = { creator: 0, bored: 1, developer: 2, github: 3, instagram: 4, contact: 5, jewelry: 7, portal: 6 };
// three.js has z the other way round from the room
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, -z);

/* ── the door panel shader ──────────────────────────────────────────── */
const PANEL_VERT = `
varying vec2 vUv;
varying vec3 vView;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vView = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const PANEL_FRAG = `
uniform float uTime;
uniform float uTheme;
uniform vec3 uColor;
uniform float uGlow;
uniform float uOpen;
uniform float uLeaf;
uniform float uDim;
uniform vec3 uNormal;
varying vec2 vUv;
varying vec3 vView;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
float box(vec2 p, vec2 c, vec2 h) { vec2 d = abs(p - c) - h; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float line(float d, float w) { return 1.0 - smoothstep(w * 0.5, w * 0.5 + fwidth(d) * 1.2, abs(d)); }
float glowOf(float d, float r) { return exp(-max(d, 0.0) / r); }
float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }

// a door's face in metres: x across the whole door (-W/2..W/2), y up (0..H)
const vec2 S = vec2(${DOOR_W}, ${DOOR_H});

vec3 circuit(vec2 p, vec3 c, inout float e) {
  // traces on a grid: each cell runs a trace one way, with pads, and pulses race along them
  vec2 g = p * 46.0;
  vec2 id = floor(g), f = fract(g) - 0.5;
  float h = hash(id);
  float tr = h < 0.5 ? line(f.y, 0.12) : line(f.x, 0.12);
  tr *= step(0.28, hash(id + 3.1));
  float pad = 1.0 - smoothstep(0.16, 0.22, length(f)) ;
  pad *= step(0.82, hash(id + 7.7));
  float run = h < 0.5 ? id.x : id.y;
  float pulse = pow(fract(run * 0.06 - uTime * 0.45 + hash(id * 1.3)), 10.0);
  e += tr * (0.35 + 2.4 * pulse) + pad * 1.6;
  return c;
}

void main() {
  // which part of the door this leaf shows, sliding with it
  float half_ = vUv.x - 0.5;
  vec2 p = vec2((uLeaf * 0.25 + half_ * 0.5) * S.x, vUv.y * S.y);
  float doorX = p.x + uLeaf * uOpen * S.x * 0.5;
  if (abs(doorX) > S.x * 0.5) discard;
  vec2 q = p / S + vec2(0.5, 0.0); // 0..1 over the whole door

  // the metal: near-black, brushed, with a recessed panel and a bevel
  float brush = noise(vec2(p.x * 900.0, p.y * 6.0)) * 0.5 + noise(p * 220.0) * 0.5;
  vec3 col = vec3(0.032, 0.034, 0.042) + brush * 0.018;
  float inset = box(p, vec2(0.0, S.y * 0.5), vec2(S.x * 0.43, S.y * 0.465));
  col *= inset < 0.0 ? 0.82 : 1.0;
  float bevel = line(inset, 0.0016);
  col += vec3(0.07) * bevel;

  vec3 c = uColor;
  float e = 0.0;     // emissive amount (multiplies the door's colour)
  vec3 extra = vec3(0.0); // emissive in its own colours
  float t = uTime;

  if (uTheme < 0.5) {
    // CREATOR: a circuit board with a film strip running up the middle
    if (inset < 0.0) circuit(p, c, e);
    float strip = box(p, vec2(0.0, S.y * 0.5), vec2(0.03, S.y * 0.44));
    if (strip < 0.0) {
      e *= 0.15;
      col = vec3(0.02, 0.012, 0.012);
      vec2 sp = vec2(abs(p.x) - 0.023, mod(p.y - t * 0.03, 0.016) - 0.008);
      float hole = 1.0 - smoothstep(0.0028, 0.0034, max(abs(sp.x), abs(sp.y) * 0.9));
      e += hole * 0.5;
      float frame = box(vec2(p.x, mod(p.y - t * 0.03, 0.07) - 0.035), vec2(0.0), vec2(0.015, 0.028));
      extra += mix(vec3(1.0, 0.35, 0.2), vec3(1.0, 0.75, 0.45), q.y) * (frame < 0.0 ? 0.35 + 0.25 * fbm(p * 60.0 + t) : 0.0);
    }
    e += line(strip, 0.0018) * 2.2;
  } else if (uTheme < 1.5) {
    // BORED: liquid glass, a slow swirl under a glossy surface
    if (inset < 0.0) {
      vec2 w = vec2(fbm(p * 9.0 + vec2(t * 0.12, 0.0)), fbm(p * 9.0 + vec2(0.0, -t * 0.1)));
      float v = fbm(p * 6.0 + w * 2.5);
      extra += mix(vec3(0.16, 0.06, 0.38), mix(c, vec3(0.6, 0.85, 1.0), 0.35), smoothstep(0.35, 0.8, v)) * (0.55 + 0.6 * v);
      // a soft glossy reflection drifting across the glass
      float gloss = exp(-pow((q.y - q.x * 0.9 - 0.3 - 0.1 * sin(t * 0.3)) / 0.09, 2.0));
      extra += vec3(0.75, 0.8, 1.0) * gloss * 0.12;
      col *= 0.4;
    }
    e += line(inset, 0.002) * 1.8;
  } else if (uTheme < 2.5) {
    // DEVELOPER: an iris in the middle among columns of glowing glyphs
    vec2 cp = p - vec2(0.0, S.y * 0.55);
    float r = length(cp);
    float a = atan(cp.y, cp.x) + t * 0.15;
    float blades = line(fract(a / 6.28318 * 8.0 + r * 9.0) - 0.5, 0.06) * step(r, 0.075) * step(0.022, r);
    e += blades * 1.1 + line(r - 0.078, 0.0022) * 2.6 + line(r - 0.092, 0.0012) * 1.4;
    extra += vec3(1.0) * (1.0 - smoothstep(0.016, 0.022, r)) * (0.6 + 0.4 * sin(t * 2.0));
    // glyph columns either side
    vec2 gp = vec2(abs(p.x) - 0.11, p.y);
    if (abs(gp.x) < 0.022 && p.y > 0.05 && p.y < S.y - 0.05) {
      vec2 cell = floor(vec2(gp.x / 0.011 + 2.0, p.y / 0.016));
      vec2 f = fract(vec2(gp.x / 0.011, p.y / 0.016));
      float on = step(0.45, hash(cell + floor(t * 1.2 + hash(cell) * 9.0)));
      float glyph = step(0.55, hash(cell * 3.0 + floor(f * 3.0))) * step(0.15, f.x) * step(f.x, 0.85) * step(0.15, f.y) * step(f.y, 0.85);
      e += glyph * on * 1.3;
    }
    e += line(abs(p.x) - 0.145, 0.0015) * 1.2 * step(0.04, p.y) * step(p.y, S.y - 0.04);
  } else if (uTheme < 3.5) {
    // GITHUB: a holographic screen, scrolling code and a branching commit graph
    float scr = box(p, vec2(0.0, S.y * 0.52), vec2(S.x * 0.38, S.y * 0.38));
    if (scr < 0.0) {
      col = vec3(0.004, 0.02, 0.01);
      vec2 sp = p - vec2(-S.x * 0.36, S.y * 0.14);
      float row = floor((sp.y + t * 0.03) / 0.011);
      float len = hash(vec2(row, 1.0)) * 0.12 + 0.02;
      float indent = floor(hash(vec2(row, 2.0)) * 3.0) * 0.012;
      float fy = fract((sp.y + t * 0.03) / 0.011);
      float code = step(indent, sp.x) * step(sp.x, indent + len) * step(0.25, fy) * step(fy, 0.7) * step(sp.x, 0.13);
      code *= step(0.2, hash(vec2(floor(sp.x / 0.007), row)));
      e += code * (0.7 + 0.3 * hash(vec2(row, 5.0)));
      // commit graph on the right
      vec2 gp = p - vec2(0.075, S.y * 0.52);
      float trunk = line(gp.x, 0.002) * step(abs(gp.y), 0.16);
      float br = line(gp.x - 0.03 * smoothstep(-0.05, 0.0, gp.y) * smoothstep(0.1, 0.05, gp.y), 0.002) * step(-0.06, gp.y) * step(gp.y, 0.11);
      float dots = 0.0;
      for (int i = 0; i < 6; i++) {
        float y = -0.14 + float(i) * 0.055;
        dots += 1.0 - smoothstep(0.0045, 0.006, length(gp - vec2(0.0, y)));
      }
      dots += 1.0 - smoothstep(0.0045, 0.006, length(gp - vec2(0.03, 0.02)));
      e += (trunk + br) * 1.4 + dots * 2.2;
      e *= 0.85 + 0.15 * sin(p.y * 900.0 + t * 8.0); // scanlines
      e *= 0.93 + 0.07 * step(0.97, hash(vec2(floor(t * 14.0), 0.0))); // flicker
      e += 0.08;
    }
    e += line(scr, 0.0022) * 2.4;
  } else if (uTheme < 4.5) {
    // INSTAGRAM: an aurora in the brand's colours behind a camera outline
    if (inset < 0.0) {
      float v = fbm(vec2(q.x * 3.0 + t * 0.1, q.y * 2.0 - t * 0.15));
      vec3 g = mix(vec3(0.99, 0.85, 0.46), vec3(0.84, 0.16, 0.46), smoothstep(0.0, 0.55, q.y + v * 0.3));
      g = mix(g, vec3(0.31, 0.36, 0.84), smoothstep(0.5, 1.0, q.y + v * 0.3));
      extra += g * (0.25 + 0.55 * v);
      col *= 0.35;
    }
    vec2 cp = p - vec2(0.0, S.y * 0.55);
    float cam = box(cp, vec2(0.0), vec2(0.07, 0.07)) - 0.022;
    e += line(cam, 0.003) * 2.4 + line(length(cp) - 0.034, 0.003) * 2.4;
    e += (1.0 - smoothstep(0.004, 0.006, length(cp - vec2(0.055, 0.055)))) * 2.4;
    e += line(inset, 0.0015) * 1.2;
  } else if (uTheme > 6.5) {
    // JEWELLERY: deep velvet under a gold Mughal arch beaded with filigree, and a brilliant-cut
    // diamond throwing fire, its facets catching the light
    vec2 ap = vec2(abs(p.x), p.y);
    float arch = ap.y < 0.42 ? abs(ap.x - 0.13) : abs(length(ap - vec2(-0.04, 0.42)) - 0.17);
    float inside = ap.y < 0.42 ? step(ap.x, 0.13) : step(length(ap - vec2(-0.04, 0.42)), 0.17);
    inside *= step(0.03, p.y);
    col = mix(col, vec3(0.075, 0.012, 0.03) * (0.65 + 0.5 * fbm(p * 70.0)), inside);
    e += line(arch, 0.0026) * 2.2 + line(arch - 0.012, 0.001) * 0.9;
    // filigree beads along the arch
    float along = ap.y < 0.42 ? ap.y : 0.42 + atan(ap.y - 0.42, ap.x + 0.04) * 0.17;
    float bead = 1.0 - smoothstep(0.0022, 0.0034, length(vec2(arch - 0.02, mod(along, 0.022) - 0.011)));
    e += bead * step(0.04, p.y) * 1.3;
    // the diamond: table, crown, girdle, pavilion down to the culet
    vec2 tl = vec2(-0.03, 0.375), tr = vec2(0.03, 0.375), gl = vec2(-0.068, 0.338), gr = vec2(0.068, 0.338), cu = vec2(0.0, 0.245);
    float d = min(min(seg(p, tl, tr), seg(p, tl, gl)), min(seg(p, tr, gr), seg(p, gl, gr)));
    d = min(d, min(seg(p, gl, cu), seg(p, gr, cu)));
    float facets = min(min(seg(p, vec2(-0.03, 0.338), cu), seg(p, vec2(0.03, 0.338), cu)), min(seg(p, tl, vec2(-0.012, 0.338)), seg(p, tr, vec2(0.012, 0.338))));
    facets = min(facets, min(seg(p, vec2(-0.012, 0.338), cu), seg(p, vec2(0.012, 0.338), cu)));
    float wy = p.y > 0.338 ? mix(0.068, 0.03, (p.y - 0.338) / 0.037) : 0.068 * (p.y - 0.245) / 0.093;
    float gem = step(abs(p.x), wy) * step(0.245, p.y) * step(p.y, 0.375);
    vec3 fire = 0.5 + 0.5 * cos(6.2831 * (fract(p.x * 18.0 + p.y * 13.0 + t * 0.25) + vec3(0.0, 0.33, 0.67)));
    extra += gem * mix(vec3(0.75, 0.85, 1.0), fire, 0.45) * (0.18 + 0.22 * fbm(p * 120.0 + t * 0.5));
    extra += vec3(1.0, 0.97, 0.9) * (line(d, 0.0018) * 1.4 + line(facets, 0.0009) * 0.6);
    // glints: four-pointed stars that flare on the facets in turn
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      vec2 gp = vec2(-0.04 + fi * 0.027, 0.33 + 0.03 * sin(fi * 2.1));
      float tw = pow(max(0.0, sin(t * 1.3 + fi * 1.9)), 12.0);
      vec2 q2 = abs(p - gp);
      float star = (exp(-q2.x * 900.0) * exp(-q2.y * 90.0) + exp(-q2.y * 900.0) * exp(-q2.x * 90.0));
      extra += vec3(1.0, 0.98, 0.92) * star * tw * 1.6;
    }
    e += line(inset, 0.0015) * 1.2;
  } else {
    // CONTACT: an art-deco sunburst rising from the threshold, in warm gold
    vec2 cp = p - vec2(0.0, 0.02);
    float a = atan(cp.x, cp.y);
    float rays = line(fract(a / 0.2618 + 0.5) - 0.5, 0.05) * step(0.09, length(cp)) * step(length(cp), 0.5);
    float arcs = line(length(cp) - 0.09, 0.002) + line(length(cp) - 0.2, 0.0015) + line(length(cp) - 0.32, 0.0015);
    float shimmer = 0.6 + 0.4 * sin(length(cp) * 60.0 - t * 1.5);
    if (inset < 0.0) e += rays * 0.55 * shimmer + arcs * 1.6;
    col += vec3(0.05, 0.035, 0.012) * fbm(p * 80.0);
    e += line(inset, 0.002) * 1.6;
  }

  // the leaves' inner edges glow where they meet, and the rim of the door
  e += glowOf(abs(doorX) - 0.0, 0.0035) * 0.6 * (1.0 - uOpen);
  // a sheen as you walk past
  float sheen = pow(1.0 - abs(dot(vView, uNormal)), 3.0);
  col += vec3(0.08, 0.09, 0.11) * sheen;

  float k = (0.85 + 0.15 * sin(t * 1.6 + uLeaf)) * (1.0 + uGlow * 0.9) * uDim;
  vec3 outc = col + (c * e + extra) * k;
  gl_FragColor = vec4(outc, 1.0);
}`;

/* ── the halo behind a door: a soft glow round its edge, on the wall ──── */
const HALO_FRAG = `
uniform vec3 uColor;
uniform float uGlow;
uniform float uTime;
uniform vec2 uSize;
uniform vec2 uDoor;
varying vec2 vUv;
varying vec3 vView;
void main() {
  vec2 p = (vUv - 0.5) * uSize;
  p.y += uSize.y * 0.5 - uDoor.y * 0.5;
  vec2 d = abs(p - vec2(0.0, 0.0)) - uDoor * 0.5;
  float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  if (dist < 0.0) discard;
  float g = exp(-dist / 0.028) * 0.7 + exp(-dist / 0.09) * 0.35;
  g *= 0.75 + 0.25 * sin(uTime * 1.6) + uGlow * 0.8;
  gl_FragColor = vec4(uColor * g, g);
}`;

/* ── particles ──────────────────────────────────────────────────────── */
const POINTS_VERT = `
attribute vec3 aColor;
attribute float aSize;
attribute float aAlpha;
uniform float uScale;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(1.0, aSize * uScale / max(0.001, -mv.z));
  vColor = aColor;
  vAlpha = aAlpha;
}`;
const POINTS_FRAG = `
uniform float uSquare;
uniform float uBoost;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float shape = uSquare > 0.5 ? 1.0 : smoothstep(0.5, 0.0, length(d));
  if (shape <= 0.0 || vAlpha <= 0.0) discard;
  gl_FragColor = vec4(vColor * uBoost, vAlpha * shape);
}`;

type Particle = { x: number; y: number; z: number; vx: number; vy: number; vz: number; age: number; life: number; size: number; color: THREE.Color; seed: number };
type Style = {
  count: number;
  square: boolean;
  colors: string[];
  size: [number, number];
  life: [number, number];
  spawn: (p: Particle) => void;
  move?: (p: Particle, dt: number, time: number) => void;
  fade?: (u: number, p: Particle, time: number) => number;
  boost: number;
};
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const softFade = (u: number) => Math.min(1, u * 5) * Math.min(1, (1 - u) * 3);
const fromDoor = (p: Particle, vy: [number, number], out: [number, number]) => {
  p.x = rnd(-DOOR_W * 0.5, DOOR_W * 0.5);
  p.y = rnd(0.02, DOOR_H);
  p.z = rnd(0.01, 0.05);
  p.vx = rnd(-0.008, 0.008);
  p.vy = rnd(vy[0], vy[1]);
  p.vz = rnd(out[0], out[1]);
};

const STYLES: Record<DoorTheme, Style> = {
  // like the game's: purple specks drifting off the portal, some drawn back in
  portal: {
    count: 90,
    square: true,
    colors: ['#5a1fb0', '#7b2ee0', '#a24dff', '#c48bff'],
    size: [0.005, 0.009],
    life: [1.4, 3],
    boost: 1.1,
    spawn: (p) => {
      const b = DOOR_H / 7;
      if (Math.random() < 0.6) {
        p.x = rnd(-b, b);
        p.y = rnd(b * 1.1, b * 5.9);
        p.z = 0.035;
        p.vx = rnd(-0.03, 0.03);
        p.vy = rnd(-0.03, 0.03);
        p.vz = rnd(0.03, 0.1);
      } else {
        p.x = rnd(-0.28, 0.28);
        p.y = rnd(0.02, DOOR_H * 0.95);
        p.z = rnd(0.12, 0.3);
        p.vx = (rnd(-b * 0.5, b * 0.5) - p.x) / p.life;
        p.vy = (rnd(b * 2, b * 5) - p.y) / p.life;
        p.vz = (0.035 - p.z) / p.life;
      }
    },
  },
  creator: { count: 22, square: false, colors: ['#ff5a3d', '#ffb38a', '#ff8f5a'], size: [0.004, 0.009], life: [3, 5], boost: 1.2, spawn: (p) => fromDoor(p, [0.008, 0.03], [0.005, 0.02]) },
  bored: { count: 16, square: false, colors: ['#c4b5fd', '#a78bfa', '#93c5fd'], size: [0.006, 0.013], life: [3.5, 6], boost: 0.9, spawn: (p) => fromDoor(p, [0.02, 0.04], [0.005, 0.015]), fade: (u) => softFade(u) * 0.6 },
  developer: { count: 18, square: true, colors: ['#4ade80', '#86efac'], size: [0.003, 0.006], life: [2, 3.5], boost: 1.3, spawn: (p) => fromDoor(p, [-0.03, 0.01], [0.01, 0.03]) },
  github: { count: 20, square: true, colors: ['#26a641', '#39d353', '#006d32'], size: [0.005, 0.009], life: [2.5, 4.5], boost: 1.2, spawn: (p) => fromDoor(p, [0.015, 0.04], [0.008, 0.02]) },
  instagram: {
    count: 24,
    square: false,
    colors: ['#feda75', '#fa7e1e', '#d62976', '#962fbf', '#4f5bd5'],
    size: [0.004, 0.008],
    life: [1.8, 3.5],
    boost: 1.35,
    spawn: (p) => fromDoor(p, [-0.005, 0.02], [0.01, 0.03]),
    fade: (u, p, t) => softFade(u) * (0.35 + 0.65 * Math.max(0, Math.sin(t * 7 + p.seed * 30))),
  },
  // gold dust and the odd diamond glint, twinkling as they drift
  jewelry: {
    count: 26,
    square: false,
    colors: ['#f6dba0', '#e8c27a', '#ffffff', '#fff3d6'],
    size: [0.003, 0.008],
    life: [2.5, 4.5],
    boost: 1.35,
    spawn: (p) => fromDoor(p, [0.004, 0.02], [0.01, 0.03]),
    fade: (u, p, t) => softFade(u) * (0.3 + 0.7 * Math.max(0, Math.sin(t * 5 + p.seed * 40)) ** 2),
  },
  contact: { count: 18, square: false, colors: ['#fde68a', '#fbbf24', '#fff7d6'], size: [0.004, 0.009], life: [3, 5], boost: 1.1, spawn: (p) => fromDoor(p, [0.002, 0.018], [0.02, 0.04]) },
};

type Rig = {
  spot: DoorSpot;
  root: THREE.Group;
  style: Style;
  particles: Particle[];
  points: THREE.Points;
  pos: Float32Array;
  col: Float32Array;
  size: Float32Array;
  alpha: Float32Array;
  pointsMat: THREE.ShaderMaterial;
  leaves: THREE.Mesh[];
  shared?: Record<string, THREE.IUniform>;
  neon?: THREE.MeshStandardMaterial;
  halo: THREE.ShaderMaterial;
  mats: THREE.Material[];
  glow: number;
  open: number;
};

function obsidianTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d')!;
  const base = ['#0d0816', '#120c1e', '#170f26', '#1c1330', '#100a1b'];
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const r = Math.random();
      g.fillStyle = r > 0.97 ? '#45337a' : r > 0.93 ? '#2c2050' : base[Math.floor(Math.random() * base.length)];
      g.fillRect(x, y, 1, 1);
    }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

const DoorsLayer = forwardRef<DoorsApi>(function DoorsLayer(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<DoorsApi | null>(null);
  useImperativeHandle(ref, () => ({ update: (...a) => apiRef.current?.update(...a) }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch {
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.5;
    const camera = new THREE.PerspectiveCamera(60, 1, 0.005, 30);
    const hemi = new THREE.HemisphereLight(0xdbe4ff, 0x15161b, 0.8);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(0, 2, 1);
    scene.add(key);

    const metal = new THREE.MeshStandardMaterial({ color: 0x15171c, metalness: 0.9, roughness: 0.3 });
    const metalDark = new THREE.MeshStandardMaterial({ color: 0x0b0c10, metalness: 0.7, roughness: 0.45 });
    const obsidian = new THREE.MeshStandardMaterial({ map: obsidianTexture(), roughness: 0.35, metalness: 0.1, emissive: 0x1e0838, emissiveIntensity: 0.4 });
    // the portal: the game's 16 x 16 animation, tiled 2 x 5 across the opening
    const portalCanvas = document.createElement('canvas');
    portalCanvas.width = portalCanvas.height = 16;
    const portalCtx = portalCanvas.getContext('2d')!;
    const portalTex = new THREE.CanvasTexture(portalCanvas);
    portalTex.colorSpace = THREE.SRGBColorSpace;
    portalTex.magFilter = portalTex.minFilter = THREE.NearestFilter;
    portalTex.generateMipmaps = false;
    portalTex.wrapS = portalTex.wrapT = THREE.RepeatWrapping;
    portalTex.repeat.set(2, 5);
    const portalMat = new THREE.MeshBasicMaterial({ map: portalTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    let portalFrame = -1;

    const geos: THREE.BufferGeometry[] = [];
    const geo = <T extends THREE.BufferGeometry>(g: T) => {
      geos.push(g);
      return g;
    };
    const leafGeo = geo(new THREE.PlaneGeometry(DOOR_W / 2, DOOR_H));
    leafGeo.translate(0, DOOR_H / 2, 0);

    const rigs: Rig[] = [];
    let built = '';
    const clear = () => {
      for (const r of rigs) {
        scene.remove(r.root);
        r.points.geometry.dispose();
        r.mats.forEach((m) => m.dispose());
      }
      rigs.length = 0;
    };
    const build = (doors: DoorSpot[]) => {
      clear();
      for (const spot of doors) {
        const root = new THREE.Group();
        scene.add(root);
        const accent = new THREE.Color(spot.color);
        const mats: THREE.Material[] = [];
        const leaves: THREE.Mesh[] = [];
        let shared: Record<string, THREE.IUniform> | undefined;
        let neon: THREE.MeshStandardMaterial | undefined;
        const b = DOOR_H / 7;
        // the glow on the wall round the door
        const pad = 0.2;
        const haloSize = new THREE.Vector2((spot.portal ? 4 * b : DOOR_W) + pad * 2, (spot.portal ? DOOR_H : DOOR_H) + pad);
        const halo = new THREE.ShaderMaterial({
          vertexShader: PANEL_VERT,
          fragmentShader: HALO_FRAG,
          uniforms: {
            uColor: { value: accent.clone().multiplyScalar(0.9) },
            uGlow: { value: 0 },
            uTime: { value: 0 },
            uSize: { value: haloSize },
            uDoor: { value: new THREE.Vector2(spot.portal ? 4 * b : DOOR_W + 0.05, spot.portal ? DOOR_H : DOOR_H + 0.03) },
          },
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        mats.push(halo);
        const haloMesh = new THREE.Mesh(geo(new THREE.PlaneGeometry(haloSize.x, haloSize.y)), halo);
        haloMesh.position.set(0, haloSize.y / 2 - 0.0, 0.0008);
        haloMesh.renderOrder = -1;
        root.add(haloMesh);

        if (spot.portal) {
          // obsidian: a 4 x 7 frame of blocks round a 2 x 5 opening
          const blocks: [number, number][] = [];
          for (let i = 0; i < 4; i++) blocks.push([i, 0], [i, 6]);
          for (let j = 1; j < 6; j++) blocks.push([0, j], [3, j]);
          const inst = new THREE.InstancedMesh(geo(new THREE.BoxGeometry(b, b, b * 0.6)), obsidian, blocks.length);
          const m = new THREE.Matrix4();
          blocks.forEach(([i, j], k) => inst.setMatrixAt(k, m.makeTranslation((i - 1.5) * b, (j + 0.5) * b, b * 0.3)));
          root.add(inst);
          const plane = new THREE.Mesh(geo(new THREE.PlaneGeometry(2 * b, 5 * b)), portalMat);
          plane.position.set(0, 3.5 * b, b * 0.3);
          root.add(plane);
        } else {
          // two leaves, one shader
          shared = {
            uTime: { value: 0 },
            uTheme: { value: THEME_ID[spot.theme] },
            uColor: { value: accent },
            uGlow: { value: 0 },
            uOpen: { value: 0 },
            uDim: { value: 1 },
            uNormal: { value: new THREE.Vector3(0, 0, 1) },
          };
          for (const leaf of [-1, 1]) {
            const mat = new THREE.ShaderMaterial({
              vertexShader: PANEL_VERT,
              fragmentShader: PANEL_FRAG,
              uniforms: { ...shared, uLeaf: { value: leaf } },
              toneMapped: true,
            });
            mats.push(mat);
            const mesh = new THREE.Mesh(leafGeo, mat);
            mesh.position.set(leaf * DOOR_W * 0.25, 0, 0.003);
            root.add(mesh);
            leaves.push(mesh);
          }
          // the frame: a heavy outer casing, an inner lip, and neon tubes in the door's colour
          const t = 0.03;
          const d = 0.028;
          const jamb = geo(new RoundedBoxGeometry(t, DOOR_H + t, d, 3, 0.007));
          for (const sx of [-1, 1]) {
            const j = new THREE.Mesh(jamb, metal);
            j.position.set(sx * (DOOR_W / 2 + t / 2), (DOOR_H + t) / 2, d / 2);
            root.add(j);
            // vents down the jambs
            for (let k = 0; k < 6; k++) {
              const vent = new THREE.Mesh(geo(new THREE.BoxGeometry(0.012, 0.004, 0.002)), metalDark);
              vent.position.set(sx * (DOOR_W / 2 + t / 2), 0.08 + k * 0.012, d + 0.0005);
              root.add(vent);
            }
          }
          const header = new THREE.Mesh(geo(new RoundedBoxGeometry(DOOR_W + 2 * t, t * 1.3, d, 3, 0.007)), metal);
          header.position.set(0, DOOR_H + t * 0.65, d / 2);
          root.add(header);
          neon = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: accent, emissiveIntensity: 3, toneMapped: false });
          mats.push(neon);
          const tube = (w: number, h: number, x: number, y: number) => {
            const m = new THREE.Mesh(geo(new THREE.CapsuleGeometry(0.0022, Math.max(w, h), 4, 8)), neon);
            if (w > h) m.rotation.z = Math.PI / 2;
            m.position.set(x, y, d + 0.002);
            root.add(m);
          };
          tube(0, DOOR_H - 0.01, -(DOOR_W / 2 + 0.006), DOOR_H / 2);
          tube(0, DOOR_H - 0.01, DOOR_W / 2 + 0.006, DOOR_H / 2);
          tube(DOOR_W + 0.002, 0, 0, DOOR_H + 0.006);
          // accent bars in the header and a threshold strip
          tube(0.06, 0, 0, DOOR_H + t * 0.65);
          const sill = new THREE.Mesh(geo(new RoundedBoxGeometry(DOOR_W + 2 * t, 0.008, 0.06, 2, 0.003)), metal);
          sill.position.set(0, 0.004, 0.03);
          root.add(sill);
          tube(DOOR_W + 0.04, 0, 0, 0.009);
        }

        // particles
        const style = STYLES[spot.theme];
        const n = style.count;
        const pos = new Float32Array(n * 3);
        const col = new Float32Array(n * 3);
        const size = new Float32Array(n);
        const alpha = new Float32Array(n);
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
        g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
        g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
        const pointsMat = new THREE.ShaderMaterial({
          vertexShader: POINTS_VERT,
          fragmentShader: POINTS_FRAG,
          uniforms: { uScale: { value: 400 }, uSquare: { value: style.square ? 1 : 0 }, uBoost: { value: style.boost } },
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        mats.push(pointsMat);
        const points = new THREE.Points(g, pointsMat);
        points.frustumCulled = false;
        root.add(points);
        const palette = style.colors.map((c) => new THREE.Color(c));
        const particles: Particle[] = [];
        for (let i = 0; i < n; i++) {
          const p: Particle = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: rnd(style.life[0], style.life[1]), size: rnd(style.size[0], style.size[1]), color: palette[i % palette.length], seed: Math.random() };
          style.spawn(p);
          p.age = Math.random() * p.life;
          particles.push(p);
        }
        root.traverse((o) => {
          o.frustumCulled = false;
        });
        rigs.push({ spot, root, style, particles, points, pos, col, size, alpha, pointsMat, leaves, shared, neon, halo, mats, glow: 0, open: 0 });
      }
    };

    const basis = new THREE.Matrix4();
    const normalW = new THREE.Vector3();
    apiRef.current = {
      update: (cam, dt, opts) => {
        if (!opts.visible) {
          canvas.style.display = 'none';
          return;
        }
        canvas.style.display = '';
        canvas.style.clipPath = opts.clip ?? '';
        const sig = opts.doors.map((d) => `${d.theme}${d.side}${d.z}${d.color}`).join('|');
        if (sig !== built) {
          build(opts.doors);
          built = sig;
        }
        const W = window.innerWidth;
        const H = window.innerHeight;
        const half = (0.5 * W) / H;
        const time = cam.time;
        const step = Math.min(dt, 1 / 20);
        const dim = opts.lights ? 1 : 0.6;
        hemi.intensity = 0.8 * dim;
        key.intensity = 1.0 * dim;
        // the portal animation runs at the game's 20 frames a second
        const pf = Math.floor(time * 20) % PORTAL_FRAMES;
        if (pf !== portalFrame) {
          portalFrame = pf;
          portalCtx.putImageData(portalFrames()[pf], 0, 0);
          portalTex.needsUpdate = true;
        }

        rigs.forEach((r, i) => {
          const s = r.spot.side;
          // on the wall: x along it (to the right seen from the room), y up, z out into the room
          basis.makeBasis(new THREE.Vector3(0, 0, s), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-s, 0, 0));
          r.root.quaternion.setFromRotationMatrix(basis);
          r.root.position.copy(V(s * half, -0.5, r.spot.z));
          const k = 1 - Math.exp(-dt * 8);
          r.glow += ((opts.aim === i ? 1 : 0) - r.glow) * k;
          r.open += ((opts.open === i ? 1 : 0) - r.open) * (1 - Math.exp(-dt * 5));
          if (r.shared) {
            r.shared.uTime.value = time;
            r.shared.uGlow.value = r.glow;
            r.shared.uOpen.value = r.open;
            r.shared.uDim.value = dim;
            normalW.set(-s, 0, 0);
            (r.shared.uNormal.value as THREE.Vector3).copy(normalW);
            r.leaves.forEach((leaf, j) => {
              const side = j ? 1 : -1;
              leaf.position.x = side * (DOOR_W * 0.25 + r.open * DOOR_W * 0.5);
            });
          }
          if (r.neon) r.neon.emissiveIntensity = (2.2 + 0.6 * Math.sin(time * 1.6 + i) + r.glow * 2.5) * dim;
          r.halo.uniforms.uTime.value = time + i;
          r.halo.uniforms.uGlow.value = r.glow + r.open;
          // particles
          const speed = 1 + r.glow * 0.6;
          const style = r.style;
          for (let j = 0; j < r.particles.length; j++) {
            const p = r.particles[j];
            p.age += step * speed;
            if (p.age >= p.life) {
              p.age = 0;
              p.life = rnd(style.life[0], style.life[1]);
              style.spawn(p);
            }
            style.move?.(p, step, time);
            p.x += p.vx * step * speed;
            p.y += p.vy * step * speed;
            p.z += p.vz * step * speed;
            const u = p.age / p.life;
            r.pos[j * 3] = p.x;
            r.pos[j * 3 + 1] = p.y;
            r.pos[j * 3 + 2] = p.z;
            r.col[j * 3] = p.color.r;
            r.col[j * 3 + 1] = p.color.g;
            r.col[j * 3 + 2] = p.color.b;
            r.size[j] = p.size;
            r.alpha[j] = (style.fade ? style.fade(u, p, time) : softFade(u)) * (0.7 + 0.3 * r.glow) * dim;
          }
          const g = r.points.geometry;
          for (const name of ['position', 'aColor', 'aSize', 'aAlpha']) g.getAttribute(name).needsUpdate = true;
        });

        renderer.setSize(W, H, false);
        camera.aspect = W / H;
        camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(0.5 / cam.focal));
        camera.updateProjectionMatrix();
        camera.position.copy(V(cam.pos[0], cam.pos[1], cam.pos[2]));
        camera.up.copy(V(cam.up[0], cam.up[1], cam.up[2]));
        camera.lookAt(V(cam.pos[0] + cam.forward[0], cam.pos[1] + cam.forward[1], cam.pos[2] + cam.forward[2]));
        const scale = (H * renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
        for (const r of rigs) r.pointsMat.uniforms.uScale.value = scale;
        renderer.render(scene, camera);
      },
    };

    return () => {
      apiRef.current = null;
      clear();
      for (const g of geos) g.dispose();
      [metal, metalDark, obsidian, portalMat].forEach((m) => m.dispose());
      obsidian.map?.dispose();
      portalTex.dispose();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="doors-canvas" aria-hidden="true" style={{ display: 'none' }} />;
});

export default DoorsLayer;
