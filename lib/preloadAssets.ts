/**
 * Asset Preloader
 * ───────────────
 * Preloads all critical assets (videos, images, API data) during the loading
 * screen so the page is buttery-smooth when it appears.
 *
 * LOCAL VIDEOS use fetch → blob → Object URL so the data lives in memory
 * and the VideoCarousel can use the blob URLs directly (no re-download).
 */

// ── Types ──
export interface PreloadManifest {
  /** Local video files (e.g. /showreels/1.mp4) — fetched as blobs */
  localVideos: string[];
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

// ── Global video blob cache ──
// Maps original src → blob object URL.  Survives across re-renders.
const videoBlobCache = new Map<string, string>();
const cacheListeners = new Set<() => void>();

/** Look up a cached blob URL for a given original src. */
export function getCachedVideoUrl(originalSrc: string): string {
  return videoBlobCache.get(originalSrc) || originalSrc;
}

/** Check if a video is already cached. */
export function isVideoCached(originalSrc: string): boolean {
  return videoBlobCache.has(originalSrc);
}

/** Subscribe to cache updates (so components can re-render when blobs load) */
export function subscribeToVideoCache(callback: () => void) {
  cacheListeners.add(callback);
  return () => cacheListeners.delete(callback);
}

/** Notify listeners of cache updates */
function notifyCacheUpdate() {
  cacheListeners.forEach((cb) => cb());
}

// ── Helpers ──

/**
 * Fetch a local video as a blob and store it as an Object URL in the cache.
 * The actual <video> element in the carousel will use the blob URL so
 * there is zero re-downloading — the data is already in memory.
 */
async function fetchVideoAsBlob(src: string, timeoutMs = 15000): Promise<void> {
  if (videoBlobCache.has(src)) return; // already cached

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(src, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    videoBlobCache.set(src, blobUrl);
    notifyCacheUpdate();
  } catch {
    clearTimeout(timer);
    // On failure, the carousel will fall back to the original src
  }
}

/**
 * Preload a remote video using a <video> element. We don't blob-cache
 * remote videos (they can be huge / CORS-restricted) — just warm the
 * browser's media cache.
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

  // Local videos (highest priority — fetched as blobs for guaranteed caching)
  for (const src of manifest.localVideos) {
    tasks.push({ label: `video:${src}`, fn: () => fetchVideoAsBlob(src, 12000) });
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

// ── Default manifest for the creator page ──

export function getCreatorPageManifest(): PreloadManifest {
  // YouTube channel URLs that HeroParallax will fetch
  const channelUrls = [
    'https://www.youtube.com/@bachuuuuu',
    'https://www.youtube.com/@realpeachgg',
    'https://www.youtube.com/@EliteShot',
    'https://www.youtube.com/@DoctorNarcos/shorts',
    'https://www.youtube.com/@PeachGaming',
    'https://www.youtube.com/@_Inferno_playz',
    'https://www.youtube.com/@vibhorsverse8535',
  ];

  return {
    localVideos: [
      '/showreels/1.mp4',
      '/showreels/2.mp4',
      '/showreels/3.mp4',
      '/showreels/4.mp4',
      '/showreels/5.mp4',
      '/showreels/6.mp4',
    ],
    remoteVideos: [
      'https://res.cloudinary.com/dpuovefvs/video/upload/q_auto/f_auto/v1777233966/vid1_nc11bz.mp4',
      'https://res.cloudinary.com/dpuovefvs/video/upload/q_auto/f_auto/v1777235213/Vid2_kln2ha.mp4',
      'https://res.cloudinary.com/dpuovefvs/video/upload/q_auto/f_auto/v1777235272/Vid3_ntpwdw.mp4',
      'https://res.cloudinary.com/dpuovefvs/video/upload/q_auto/f_auto/v1777235289/Vid5_d0rs29.mp4',
      'https://res.cloudinary.com/dpuovefvs/video/upload/q_auto/f_auto/v1777234062/vid6_usi9t4.mp4',
    ],
    images: [
      '/hero-statue.png',
      '/image.png',
      '/ae-card.png',
      '/pr-card.png',
      '/davinci-card.png',
      '/blender-card.png',
      '/ps-card.png',
    ],
    apiEndpoints: channelUrls.map(
      (url) => `/api/youtube-channel?url=${encodeURIComponent(url)}`
    ),
  };
}
