import type { RoomCamera } from '@/components/GridScan';

/** Per-frame screen context for drawing page elements into the room with the grid's camera. */
export type ScreenCtx = {
  cam: RoomCamera;
  W: number;
  H: number;
  /** centre of projection on screen (px) */
  ox: number;
  oy: number;
};

export const screenCtx = (cam: RoomCamera): ScreenCtx => {
  const W = window.innerWidth;
  const H = window.innerHeight;
  return { cam, W, H, ox: W / 2 + cam.shift[0] * H, oy: H / 2 - cam.shift[1] * H };
};

const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Put an element into the room as a flat panel: centre P (room units), its own right / down /
 * out axes, and how many screen pixels one of its CSS pixels spans (kpx). `base` is the
 * top-left of the element's positioned container in viewport px (the container must carry
 * `perspective: focal*H` with its perspective-origin on the camera's centre of projection).
 * Panels fade before a corner reaches the camera and are skipped entirely when off-screen.
 */
export function placeInRoom(
  el: HTMLElement,
  ctx: ScreenCtx,
  base: { left: number; top: number },
  P: number[],
  ax: number[],
  ay: number[],
  az: number[],
  kpx: number,
  alpha = 1
) {
  const { cam, W, H, ox, oy } = ctx;
  const [r, u, f] = [cam.right, cam.up, cam.forward];
  const C = cam.pos;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const unit = kpx / H;
  let nearest = Infinity;
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
  if (near * alpha <= 0.002 || outside) {
    el.style.visibility = 'hidden';
    el.style.opacity = '0';
    return false;
  }
  el.style.visibility = 'visible';
  el.style.opacity = (near * alpha).toFixed(3);
  const cx = base.left + el.offsetLeft + w / 2;
  const cy = base.top + el.offsetTop + h / 2;
  const d = [P[0] - C[0], P[1] - C[1], P[2] - C[2]];
  const col = (a: number[]) => [kpx * dot(r, a), -kpx * dot(u, a), -kpx * dot(f, a)];
  const t = [dot(r, d) * H - (cx - ox), -dot(u, d) * H - (cy - oy), -dot(f, d) * H + cam.focal * H];
  const m = [...col(ax), 0, ...col(ay), 0, ...col(az), 0, ...t, 1];
  el.style.transform = `matrix3d(${m.map((v) => +v.toFixed(5)).join(',')})`;
  return true;
}

/**
 * The doorway between the rooms as a screen polygon (viewport px), clipped to what is in front
 * of the camera. Null when none of it is in view.
 */
export function doorwayPolygon(ctx: ScreenCtx, front: number, halfW: number, height: number): [number, number][] | null {
  return quadPolygon(ctx, [
    [-halfW, -0.5, front],
    [halfW, -0.5, front],
    [halfW, -0.5 + height, front],
    [-halfW, -0.5 + height, front],
  ]);
}

/** A flat quad in the room (corners in order) on screen, clipped to what's in front of the eye. */
export function quadPolygon(ctx: ScreenCtx, world: number[][]): [number, number][] | null {
  const { cam, H, ox, oy } = ctx;
  const [r, u, f] = [cam.right, cam.up, cam.forward];
  const C = cam.pos;
  const pts = world.map((p) => {
    const q = [p[0] - C[0], p[1] - C[1], p[2] - C[2]];
    return [dot(r, q), dot(u, q), dot(f, q)];
  });
  // clip against the near plane
  // small, so the doorway still has a shape when you're right on its plane walking through
  const near = 0.001;
  const clipped: number[][] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const ain = a[2] >= near;
    const bin = b[2] >= near;
    if (ain) clipped.push(a);
    if (ain !== bin) {
      const t = (near - a[2]) / (b[2] - a[2]);
      clipped.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, near]);
    }
  }
  if (clipped.length < 3) return null;
  return clipped.map((p) => [ox + (p[0] / p[2]) * cam.focal * H, oy - (p[1] / p[2]) * cam.focal * H]);
}

export const polygonCss = (poly: [number, number][] | null, dx = 0, dy = 0) =>
  poly ? `polygon(${poly.map(([x, y]) => `${(x - dx).toFixed(1)}px ${(y - dy).toFixed(1)}px`).join(',')})` : 'polygon(0 0, 0 0, 0 0)';
