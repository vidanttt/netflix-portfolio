/* ════════════════════════════════════════════════════
   BORED — localStorage Utilities
   Continue Watching & Watchlist persistence
   ════════════════════════════════════════════════════ */

import type { ContinueWatchingItem, WatchlistItem } from './types';

const CW_KEY = 'bored-continue-watching';
const WL_KEY = 'bored-watchlist';
const MAX_CW_ITEMS = 30;
const MAX_WL_ITEMS = 200;

/* ── Helpers ── */
function safeGet<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded — silently fail */ }
}

/* ── Storage event listeners ── */
type StorageListener = () => void;
const cwListeners = new Set<StorageListener>();
const wlListeners = new Set<StorageListener>();

function notifyCW() { cwListeners.forEach((fn) => fn()); }
function notifyWL() { wlListeners.forEach((fn) => fn()); }

export function onContinueWatchingChange(fn: StorageListener) {
  cwListeners.add(fn);
  return () => cwListeners.delete(fn);
}

export function onWatchlistChange(fn: StorageListener) {
  wlListeners.add(fn);
  return () => wlListeners.delete(fn);
}

// Cross-tab sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === CW_KEY) notifyCW();
    if (e.key === WL_KEY) notifyWL();
  });
}

/* ════════════════════════════════════════════════════
   CONTINUE WATCHING
   ════════════════════════════════════════════════════ */

export function getContinueWatching(): ContinueWatchingItem[] {
  return safeGet<ContinueWatchingItem>(CW_KEY, [])
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function updateContinueWatching(item: ContinueWatchingItem): void {
  const list = safeGet<ContinueWatchingItem>(CW_KEY, []);
  const idx = list.findIndex(
    (x) => x.tmdbId === item.tmdbId && x.mediaType === item.mediaType
  );
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...item, timestamp: Date.now() };
  } else {
    list.unshift({ ...item, timestamp: Date.now() });
  }
  // Cap at max items
  safeSet(CW_KEY, list.slice(0, MAX_CW_ITEMS));
  notifyCW();
}

export function removeContinueWatching(tmdbId: number, mediaType: 'movie' | 'tv'): void {
  const list = safeGet<ContinueWatchingItem>(CW_KEY, []);
  safeSet(CW_KEY, list.filter((x) => !(x.tmdbId === tmdbId && x.mediaType === mediaType)));
  notifyCW();
}

/* ════════════════════════════════════════════════════
   WATCHLIST
   ════════════════════════════════════════════════════ */

export function getWatchlist(): WatchlistItem[] {
  return safeGet<WatchlistItem>(WL_KEY, [])
    .sort((a, b) => b.addedAt - a.addedAt);
}

export function addToWatchlist(item: WatchlistItem): void {
  const list = safeGet<WatchlistItem>(WL_KEY, []);
  const exists = list.some(
    (x) => x.tmdbId === item.tmdbId && x.mediaType === item.mediaType
  );
  if (exists) return;
  list.unshift({ ...item, addedAt: Date.now() });
  safeSet(WL_KEY, list.slice(0, MAX_WL_ITEMS));
  notifyWL();
}

export function removeFromWatchlist(tmdbId: number, mediaType: 'movie' | 'tv'): void {
  const list = safeGet<WatchlistItem>(WL_KEY, []);
  safeSet(WL_KEY, list.filter((x) => !(x.tmdbId === tmdbId && x.mediaType === mediaType)));
  notifyWL();
}

export function isInWatchlist(tmdbId: number, mediaType: 'movie' | 'tv'): boolean {
  const list = safeGet<WatchlistItem>(WL_KEY, []);
  return list.some((x) => x.tmdbId === tmdbId && x.mediaType === mediaType);
}

export function toggleWatchlist(item: WatchlistItem): boolean {
  if (isInWatchlist(item.tmdbId, item.mediaType)) {
    removeFromWatchlist(item.tmdbId, item.mediaType);
    return false;
  }
  addToWatchlist(item);
  return true;
}
