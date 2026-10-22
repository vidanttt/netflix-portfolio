/**
 * The training range behind the spawn wall, in room units (the main room is 1 tall and the
 * doorway sits in its front wall at z = -1). Shared by the walking physics (GridScan) and the
 * 3D scene (RangeWorld) so what you see is exactly what you collide with.
 *
 * Axes: x right, y up, z towards the main room (the range lies at z < -1).
 */
export const RANGE = {
  front: -1,
  back: -8.6,
  halfW: 2.2,
  floor: -0.5,
  ceil: 1.4,
  gapHalf: 0.2,
  gapH: 0.72,
};

export type Box = { min: [number, number, number]; max: [number, number, number]; kind: 'bench' | 'platform' | 'step' | 'cover' | 'barrier' | 'pillar' };

const F = RANGE.floor;
const box = (x0: number, x1: number, h: number, z0: number, z1: number, kind: Box['kind'], y0 = F): Box => ({
  min: [Math.min(x0, x1), y0, Math.min(z0, z1)],
  max: [Math.max(x0, x1), F + h, Math.max(z0, z1)],
  kind,
});

/** The armory bench along the left wall, just inside the doorway. */
export const BENCH = { x0: -2.2, x1: -1.62, z0: -2.75, z1: -1.35, top: F + 0.3 };

export const BOXES: Box[] = [
  box(BENCH.x0, BENCH.x1, 0.3, BENCH.z0, BENCH.z1, 'bench'),
  // the firing line: a waist-high counter with an opening in the middle
  box(-2.2, -0.45, 0.13, -3.08, -2.98, 'barrier'),
  box(0.45, 2.2, 0.13, -3.08, -2.98, 'barrier'),
  // overlook on the right with steps up to it
  box(1.25, 2.2, 0.3, -2.75, -1.45, 'platform'),
  box(0.95, 1.05, 0.075, -2.45, -1.75, 'step'),
  box(1.05, 1.15, 0.15, -2.45, -1.75, 'step'),
  box(1.15, 1.25, 0.225, -2.45, -1.75, 'step'),
  // the field: a raised deck on the left, a tower on the right, cover in the middle, pillars
  box(-2.2, -1.15, 0.2, -6.1, -4.4, 'platform'),
  box(-1.15, -1.0, 0.1, -5.6, -4.9, 'step'),
  box(1.15, 2.2, 0.45, -7.5, -6.2, 'platform'),
  box(-0.38, 0.38, 0.16, -5.35, -4.95, 'cover'),
  box(-0.9, -0.6, 0.12, -7.0, -6.7, 'cover'),
  box(0.55, 0.85, 0.12, -4.2, -3.9, 'cover'),
  box(-1.72, -1.48, 1.9, -7.9, -7.66, 'pillar'),
];

/** Practice bots: where they stand and how far they roam (along x). */
export type BotSpawn = { x: number; z: number; y: number; range: [number, number]; mode: 'still' | 'strafe' | 'peek' };
export const BOT_SPAWNS: BotSpawn[] = [
  { x: 0, z: -4.1, y: F, range: [-0.9, 0.35], mode: 'strafe' },
  { x: 0.8, z: -5.7, y: F, range: [0.5, 1.0], mode: 'still' },
  { x: -1.7, z: -5.25, y: F + 0.2, range: [-2.0, -1.35], mode: 'strafe' },
  { x: 1.7, z: -6.85, y: F + 0.45, range: [1.4, 2.0], mode: 'peek' },
  { x: -0.4, z: -7.4, y: F, range: [-1.6, 0.9], mode: 'strafe' },
  { x: -0.75, z: -6.45, y: F, range: [-1.2, -0.3], mode: 'still' },
];

/** Where the weapons rest on the bench (local slot order), from the doorway end inwards. */
export const BENCH_SLOTS = ['karambit', 'glock', 'sheriff', 'sw500', 'deagle', 'mp5', 'ak47', 'shotgun'];
