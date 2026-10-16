'use client';

import React, { useEffect, useState } from 'react';

/**
 * Liquid-glass refraction for Bored.
 *
 * Technique (the same idea the open-source "liquid glass" web demos use): a
 * backdrop-filter that points at an SVG filter. The filter warps whatever is behind
 * an element with an feDisplacementMap driven by a "bezel" map — flat in the middle,
 * pushing harder near the rim — and splits the red/green/blue channels by slightly
 * different amounts for the thin colour fringe real glass has.
 *
 * The map itself is drawn here on a canvas (signed-distance rounded rectangle), so
 * there is no image asset. Chromium is the only engine that accepts url() in
 * backdrop-filter; everywhere else the CSS falls back to ordinary frosted glass.
 */
const MAP_SIZE = 256;

function buildDisplacementMap(): string {
  const c = document.createElement('canvas');
  c.width = c.height = MAP_SIZE;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(MAP_SIZE, MAP_SIZE);

  const half = 1; // normalised half extents
  const radius = 0.92; // large radius so pills and cards both read as soft lenses
  const bezel = 0.34; // how far in from the edge the refraction reaches

  // signed distance to a rounded box (negative inside)
  const sdf = (px: number, py: number) => {
    const qx = Math.abs(px) - (half - radius);
    const qy = Math.abs(py) - (half - radius);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
  };

  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const px = (x / (MAP_SIZE - 1)) * 2 - 1;
      const py = (y / (MAP_SIZE - 1)) * 2 - 1;
      const d = -sdf(px, py); // distance in from the rim
      let dx = 0;
      let dy = 0;
      if (d >= 0 && d < bezel) {
        // gradient of the sdf = outward normal
        const e = 0.004;
        let nx = sdf(px + e, py) - sdf(px - e, py);
        let ny = sdf(px, py + e) - sdf(px, py - e);
        const len = Math.hypot(nx, ny) || 1;
        nx /= len;
        ny /= len;
        const t = 1 - d / bezel; // 1 at the rim, 0 at the inner edge of the bezel
        const strength = t * t * t; // eased: strong at the very edge, fades smoothly
        // sample from further inside than the pixel sits -> the rim "gathers" the scene
        dx = -nx * strength;
        dy = -ny * strength;
      }
      const i = (y * MAP_SIZE + x) * 4;
      img.data[i] = 128 + dx * 127;
      img.data[i + 1] = 128 + dy * 127;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

const isChromium = () => {
  if (typeof navigator === 'undefined') return false;
  const uaData = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData;
  if (uaData?.brands?.some((b) => /Chromium/i.test(b.brand))) return true;
  return /Chrome\//.test(navigator.userAgent) && !/Edg\/|OPR\//.test(navigator.userAgent) ? true : /Edg\/|OPR\//.test(navigator.userAgent);
};

export default function LiquidGlass() {
  const [map, setMap] = useState<string | null>(null);

  useEffect(() => {
    if (!isChromium()) return;
    if (window.matchMedia('(prefers-reduced-transparency: reduce)').matches) return;
    try {
      setMap(buildDisplacementMap());
    } catch {
      /* fall back to plain frosted glass */
    }
  }, []);

  // Tell the stylesheet the refracting filter is ready (otherwise it keeps the frosted fallback)
  useEffect(() => {
    if (!map) return;
    document.documentElement.setAttribute('data-bd-liquid', '1');
    return () => document.documentElement.removeAttribute('data-bd-liquid');
  }, [map]);

  if (!map) return null;

  return (
    <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden="true" focusable="false">
      <defs>
        <filter id="bd-liquid" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feImage href={map} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />
          {/* one displacement per channel, each a touch stronger -> chromatic fringe at the rim */}
          <feDisplacementMap in="SourceGraphic" in2="map" scale="30" xChannelSelector="R" yChannelSelector="G" result="dR" />
          <feColorMatrix in="dR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="38" xChannelSelector="R" yChannelSelector="G" result="dG" />
          <feColorMatrix in="dG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="46" xChannelSelector="R" yChannelSelector="G" result="dB" />
          <feColorMatrix in="dB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feBlend in="r" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="b" mode="screen" />
        </filter>
        {/* Same lens, much lower strength: for big panels (search) where the full-strength
            version would bend the text behind it too far */}
        <filter id="bd-liquid-soft" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feImage href={map} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="14" xChannelSelector="R" yChannelSelector="G" result="dR" />
          <feColorMatrix in="dR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="19" xChannelSelector="R" yChannelSelector="G" result="dG" />
          <feColorMatrix in="dG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="25" xChannelSelector="R" yChannelSelector="G" result="dB" />
          <feColorMatrix in="dB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feBlend in="r" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="b" mode="screen" />
        </filter>
      </defs>
    </svg>
  );
}
