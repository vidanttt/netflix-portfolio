/**
 * Asset Preloader
 * ───────────────
 * Preloads the creator page's heavy assets (videos, the hero statue, images, API data) during
 * the loading screen so the page is smooth when it appears. What gets preloaded is read from
 * lib/creatorContent.ts, the same list the page renders from.
 */
import { SHOWREELS, REEL_VIDEOS, CREATOR_CHANNELS, STATUE_MODEL, CREATOR_IMAGES } from '@/lib/creatorContent';

// ── Types ──
export interface PreloadManifest {
  /** Files on this site that are downloaded in full (local videos, the 3D model) */
  files: string[];
  /** Remote video URLs (e.g. Cloudinary) — preloaded via <video> element */
  remoteVideos: string[];
  /** Image URLs to preload */
  images: string[];
  /** API endpoints to warm up (e.g. YouTube channel API) */
  apiEndpoints: string[];
}

export interface PreloadResult {
  total: number;
  loaded: number;
  failed: number;
  done: boolean;
}

type ProgressCallback = (result: PreloadResult) => void;

// ── Helpers ──

/** Download a file completely so the browser has it cached when the page asks for it. */
async function warmFile(src: string, timeoutMs = 15000): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(src, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await res.arrayBuffer();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Preload a remote video using a <video> element. We don't cache the bytes ourselves
 * (they can be huge / CORS-restricted), just warm the browser's media cache.
 */
function preloadRemoteVideo(src: string, timeoutMs = 15000): Promise<void> {
  return new Promise<void>((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    // Keep element in DOM but hidden so browser retains the cached data
    video.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.appendChild(video);

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener('canplaythrough', settle);
      video.removeEventListener('loadeddata', settle);
      video.removeEventListener('error', settle);
      // DON'T remove from DOM — keep the element alive so browser
      // retains the buffered data in its media cache
      resolve();
    };

    video.addEventListener('canplaythrough', settle);
    video.addEventListener('loadeddata', settle);
    video.addEventListener('error', settle);

    setTimeout(settle, timeoutMs);

    video.src = src;
    video.load();
  });
}

/** Preload an image. Returns when loaded or on error. */
function preloadImage(src: string, timeoutMs = 10000): Promise<void> {
  return new Promise<void>((resolve) => {
    const img = new Image();
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    img.onload = settle;
    img.onerror = settle;
    setTimeout(settle, timeoutMs);

    img.src = src;
  });
}

/** Warm an API endpoint so the response is in the browser/Next.js cache. */
function warmApi(url: string, timeoutMs = 8000): Promise<void> {
  return new Promise<void>((resolve) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      resolve();
    }, timeoutMs);

    fetch(url, { signal: controller.signal })
      .then(() => {
        clearTimeout(timer);
        resolve();
      })
      .catch(() => {
        clearTimeout(timer);
        resolve();
      });
  });
}

// ── Main Preloader ──

/**
 * Kicks off preloading of ALL assets. Calls `onProgress` as each asset
 * completes. Returns a promise that resolves when everything is done
 * (or has timed out).
 */
export async function preloadAllAssets(
  manifest: PreloadManifest,
  onProgress?: ProgressCallback
): Promise<PreloadResult> {
  const tasks: Array<{ label: string; fn: () => Promise<void> }> = [];

  // Local files (highest priority — fetched in full)
  for (const src of manifest.files) {
    tasks.push({ label: `file:${src}`, fn: () => warmFile(src, 25000) });
  }

  // Remote videos (Cloudinary reels — preloaded via <video> element)
  for (const src of manifest.remoteVideos) {
    tasks.push({ label: `remote-video:${src}`, fn: () => preloadRemoteVideo(src, 15000) });
  }

  // Images
  for (const src of manifest.images) {
    tasks.push({ label: `image:${src}`, fn: () => preloadImage(src) });
  }

  // API endpoints (YouTube channel data)
  for (const url of manifest.apiEndpoints) {
    tasks.push({ label: `api:${url}`, fn: () => warmApi(url) });
  }

  const total = tasks.length;
  let loaded = 0;
  let failed = 0;

  const report = (): PreloadResult => ({
    total,
    loaded,
    failed,
    done: loaded + failed >= total,
  });

  if (total === 0) {
    const result = report();
    onProgress?.(result);
    return result;
  }

  // Run all tasks concurrently but with a concurrency limit to avoid
  // overwhelming the network. We use a simple semaphore.
  const CONCURRENCY = 6;
  const queue = [...tasks];
  const running: Promise<void>[] = [];

  const runNext = (): Promise<void> => {
    const task = queue.shift();
    if (!task) return Promise.resolve();

    const p = task.fn().then(
      () => { loaded++; },
      () => { failed++; }
    ).then(() => {
      onProgress?.(report());
      return runNext();
    });

    return p;
  };

  // Start up to CONCURRENCY workers
  for (let i = 0; i < Math.min(CONCURRENCY, total); i++) {
    running.push(runNext());
  }

  await Promise.all(running);

  return report();
}

// ── Manifest for the creator page ──

export function getCreatorPageManifest(): PreloadManifest {
  // each distinct channel once (the grid repeats some)
  const channelUrls = [...new Set(CREATOR_CHANNELS.map((c) => c.channelUrl))];

  return {
    files: [STATUE_MODEL, ...SHOWREELS],
    remoteVideos: REEL_VIDEOS,
    images: CREATOR_IMAGES,
    apiEndpoints: channelUrls.map((url) => `/api/youtube-channel?url=${encodeURIComponent(url)}`),
  };
}
