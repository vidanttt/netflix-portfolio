'use client';

import { useEffect, useRef, useState } from 'react';
import { buildDisplacementMap, isChromium } from '@/app/Bored/components/LiquidGlass';

/**
 * A draggable, bouncy blob of the same liquid glass the Bored navbar uses.
 *
 * Glass: a two-step refraction. First a gentle magnifier map enlarges what is under the middle
 * of the blob (the same for red, green and blue, so the middle stays colour-clean). Then the
 * Bored bezel map bends the rim, with each colour bent a little differently, so the chromatic
 * fringe only appears at the edge where the glass curves.
 *
 * Motion: spring-driven. It follows the pointer with a lag and overshoot, stretches along its
 * direction of travel and wobbles like jelly when it stops, pops when grabbed, keeps its
 * momentum when let go and bounces off the edges of the window.
 */
const MAGNIFY = 1.22; // how much the middle is enlarged
const MAP = 128;

/** Radial magnifier map: displacement grows linearly from the centre (sample nearer the middle). */
function buildMagnifyMap(size: number, scale: number): string {
  const c = document.createElement('canvas');
  c.width = c.height = MAP;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(MAP, MAP);
  // displacement (px) = -(1 - 1/M) * r ; map value c = 0.5 + d / scale
  const k = ((1 - 1 / MAGNIFY) * (size / 2)) / (scale * 0.498);
  for (let y = 0; y < MAP; y++) {
    for (let x = 0; x < MAP; x++) {
      const u = ((x + 0.5) / MAP) * 2 - 1;
      const v = ((y + 0.5) / MAP) * 2 - 1;
      const i = (y * MAP + x) * 4;
      img.data[i] = Math.max(0, Math.min(255, 128 - u * k * 127));
      img.data[i + 1] = Math.max(0, Math.min(255, 128 - v * k * 127));
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

const MAG_SCALE = 60;

export default function GlassBlob({
  size = 200,
  start,
}: {
  size?: number;
  /** where it rests first (px, from the top-left of the window); defaults to the middle-right */
  start?: (width: number, height: number, size: number) => { x: number; y: number };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const startRef = useRef(start);
  startRef.current = start;
  const [maps, setMaps] = useState<{ bezel: string; magnify: string } | null>(null);

  useEffect(() => {
    if (!isChromium()) return;
    try {
      setMaps({ bezel: buildDisplacementMap(), magnify: buildMagnifyMap(size, MAG_SCALE) });
    } catch {
      /* frosted fallback */
    }
  }, [size]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const W = () => window.innerWidth;
    const H = () => window.innerHeight;
    const lo = 8;

    // position + velocity (px, px/s) and the pointer target
    const first = startRef.current?.(W(), H(), size) ?? { x: W() * 0.62 - size / 2, y: H() * 0.5 - size / 2 };
    const p = { x: Math.max(lo, first.x), y: Math.max(lo, first.y), vx: 0, vy: 0 };
    const target = { x: p.x, y: p.y };
    // jelly: stretch along travel direction, press pop, both on springs
    const j = { stretch: 1, vs: 0, pop: 1, vp: 0, dirX: 1, dirY: 0 };
    let dragging = false;
    let grabX = 0;
    let grabY = 0;
    let raf = 0;
    let last = performance.now();

    const spring = (x: number, v: number, to: number, omega: number, zeta: number, dt: number) => {
      const n = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / n;
      for (let i = 0; i < n; i++) {
        v += (omega * omega * (to - x) - 2 * zeta * omega * v) * h;
        x += v * h;
      }
      return [x, v] as const;
    };
    const maxX = () => Math.max(lo, W() - size - lo);
    const maxY = () => Math.max(lo, H() - size - lo);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.04, (now - last) / 1000 || 0.016);
      last = now;
      const t = now / 1000;

      if (dragging) {
        // follows the pointer with a springy lag, so it overshoots and settles like a liquid
        [p.x, p.vx] = spring(p.x, p.vx, target.x, 22, 0.55, dt);
        [p.y, p.vy] = spring(p.y, p.vy, target.y, 22, 0.55, dt);
      } else {
        // momentum with friction, bouncing off the edges of the window
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const f = Math.exp(-dt * 1.5);
        p.vx *= f;
        p.vy *= f;
        const bounce = (pos: number, vel: number, max: number) => {
          if (pos < lo) return [lo, -vel * 0.68, Math.abs(vel)] as const;
          if (pos > max) return [max, -vel * 0.68, Math.abs(vel)] as const;
          return [pos, vel, 0] as const;
        };
        let hit = 0;
        let r = bounce(p.x, p.vx, maxX());
        [p.x, p.vx] = [r[0], r[1]];
        hit = Math.max(hit, r[2]);
        r = bounce(p.y, p.vy, maxY());
        [p.y, p.vy] = [r[0], r[1]];
        hit = Math.max(hit, r[2]);
        // squash against the wall: kick the jelly springs
        if (hit > 150) j.vs -= Math.min(5, hit / 380);
        // a tiny idle float once it has come to rest
        if (Math.hypot(p.vx, p.vy) < 12 && !reduce) {
          p.x += Math.sin(t * 0.7) * 0.12;
          p.y += Math.cos(t * 0.55) * 0.12;
        }
      }

      const speed = Math.hypot(p.vx, p.vy);
      if (speed > 8) {
        j.dirX = p.vx / speed;
        j.dirY = p.vy / speed;
      }
      // stretch grows with speed; an underdamped spring makes it wobble when the speed drops
      const stretchTarget = 1 + (reduce ? 0 : Math.min(0.42, speed / 2600));
      [j.stretch, j.vs] = spring(j.stretch, j.vs, stretchTarget, 13, 0.3, dt);
      [j.pop, j.vp] = spring(j.pop, j.vp, dragging ? 1.07 : 1, 16, 0.38, dt);

      const sx = Math.max(0.55, j.stretch);
      const sy = 1 / Math.sqrt(sx); // keeps its volume: longer along travel, thinner across
      const angle = Math.atan2(j.dirY, j.dirX);
      const wob = reduce ? 0 : Math.sin(t * 2.1) * 0.012; // faint breathing
      el.style.transform =
        `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0) ` +
        `rotate(${angle.toFixed(3)}rad) scale(${(sx * j.pop + wob).toFixed(4)}, ${(sy * j.pop - wob).toFixed(4)}) rotate(${(-angle).toFixed(3)}rad)`;
    };
    raf = requestAnimationFrame(frame);

    const down = (e: PointerEvent) => {
      dragging = true;
      grabX = e.clientX - p.x;
      grabY = e.clientY - p.y;
      target.x = p.x;
      target.y = p.y;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
      j.vp += 2.2; // a little pop when it is picked up
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      target.x = Math.max(lo, Math.min(maxX(), e.clientX - grabX));
      target.y = Math.max(lo, Math.min(maxY(), e.clientY - grabY));
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false; // it keeps the velocity it had and flies on
      el.releasePointerCapture?.(e.pointerId);
      el.style.cursor = 'grab';
      j.vp -= 2.4; // and squishes back down
    };
    const resize = () => {
      p.x = Math.min(p.x, maxX());
      p.y = Math.min(p.y, maxY());
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      window.removeEventListener('resize', resize);
    };
  }, [size]);

  return (
    <>
      {maps && (
        <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden="true" focusable="false">
          <defs>
            {/* maps are sized in pixels: a percentage would resolve against this 0x0 svg */}
            <filter id="gb-liquid" x="0" y="0" width={size} height={size} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              {/* 1: enlarge the middle (same for every colour, so no fringe there) */}
              <feImage href={maps.magnify} x="0" y="0" width={size} height={size} preserveAspectRatio="none" result="magMap" />
              <feDisplacementMap in="SourceGraphic" in2="magMap" scale={MAG_SCALE} xChannelSelector="R" yChannelSelector="G" result="mag" />
              {/* 2: bend the rim, a touch differently per colour: the fringe lives only there */}
              <feImage href={maps.bezel} x="0" y="0" width={size} height={size} preserveAspectRatio="none" result="rimMap" />
              <feDisplacementMap in="mag" in2="rimMap" scale="30" xChannelSelector="R" yChannelSelector="G" result="dR" />
              <feColorMatrix in="dR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
              <feDisplacementMap in="mag" in2="rimMap" scale="38" xChannelSelector="R" yChannelSelector="G" result="dG" />
              <feColorMatrix in="dG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
              <feDisplacementMap in="mag" in2="rimMap" scale="46" xChannelSelector="R" yChannelSelector="G" result="dB" />
              <feColorMatrix in="dB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
              <feBlend in="r" in2="g" mode="screen" result="rg" />
              <feBlend in="rg" in2="b" mode="screen" />
            </filter>
          </defs>
        </svg>
      )}
      <div
        ref={ref}
        className="glass-blob"
        data-refract={maps ? '1' : undefined}
        role="presentation"
        aria-hidden="true"
        style={{ width: size, height: size }}
      />
    </>
  );
}
