/**
 * The nether portal's animation, generated the way the original game did it: 32 frames of a
 * 16 x 16 tile, each pixel two counter-rotating spirals (tighter towards their centres, which
 * sit on the tile's corners and middle so it tiles seamlessly) plus a little noise, mapped to
 * the portal's purple. Built once and shared.
 */
export const PORTAL_FRAMES = 32;
let frames: ImageData[] | null = null;

export function portalFrames() {
  if (frames) return frames;
  frames = [];
  let seed = 100;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let f = 0; f < PORTAL_FRAMES; f++) {
    const img = new ImageData(16, 16);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        let v = 0;
        for (let k = 0; k < 2; k++) {
          const c = k * 8;
          let dx = ((x - c) / 16) * 2;
          let dy = ((y - c) / 16) * 2;
          if (dx < -1) dx += 2;
          if (dx >= 1) dx -= 2;
          if (dy < -1) dy += 2;
          if (dy >= 1) dy -= 2;
          const r2 = dx * dx + dy * dy;
          const dir = k * 2 - 1;
          let a = Math.atan2(dy, dx) + ((f / PORTAL_FRAMES) * Math.PI * 2 - r2 * 10 + k * 2) * dir;
          a = (Math.sin(a) + 1) / 2 / (r2 + 1);
          v += a * 0.5;
        }
        v += rand() * 0.1;
        // stretched for contrast, so the spirals read at 16 pixels
        v = Math.min(1, Math.max(0, (v - 0.12) / 0.52));
        const i = (y * 16 + x) * 4;
        img.data[i] = Math.min(255, v * v * 200 + 55);
        img.data[i + 1] = Math.min(255, v ** 4 * 255);
        img.data[i + 2] = Math.min(255, v * 100 + 155);
        img.data[i + 3] = Math.min(255, v * 100 + 155);
      }
    }
    frames.push(img);
  }
  return frames;
}
