/* ════════════════════════════════════════════════════
   BORED — localStorage & Secure Database Sync Utilities
   Supports Local Storage fallback for guests & background sync for authenticated users
   ════════════════════════════════════════════════════ */

import type { ContinueWatchingItem, WatchlistItem } from './types';

const CW_KEY = 'bored-continue-watching';
const WL_KEY = 'bored-watchlist';
const MAX_CW_ITEMS = 30;
const MAX_WL_ITEMS = 200;

/* ── Caches for Authenticated Mode ── */
let isUserAuthenticated = false;
let dbWatchlistCache: WatchlistItem[] | null = null;
let dbCWCache: ContinueWatchingItem[] | null = null;

/* ── Helpers for Local Storage ── */
function safeGet<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
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
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded */ }
}

/* ── Storage event listeners ── */
type StorageListener = () => void;
const cwListeners = new Set<StorageListener>();
const wlListeners = new Set<StorageListener>();

export function notifyCW() { cwListeners.forEach((fn) => fn()); }
export function notifyWL() { wlListeners.forEach((fn) => fn()); }

export function onContinueWatchingChange(fn: StorageListener) {
  cwListeners.add(fn);
  return () => cwListeners.delete(fn);
}

export function onWatchlistChange(fn: StorageListener) {
  wlListeners.add(fn);
  return () => wlListeners.delete(fn);
}

// Cross-tab sync for guest users
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === CW_KEY && !isUserAuthenticated) notifyCW();
    if (e.key === WL_KEY && !isUserAuthenticated) notifyWL();
  });
}

/* ════════════════════════════════════════════════════
   AUTHENTICATION INITIALIZATION & SYNCING
   ════════════════════════════════════════════════════ */

export async function initAuthStorage(authenticated: boolean): Promise<void> {
  isUserAuthenticated = authenticated;
  if (!authenticated) {
    dbWatchlistCache = null;
    dbCWCache = null;
    notifyCW();
    notifyWL();
    return;
  }

  try {
    // 1. Fetch current database lists
    const [wlRes, cwRes] = await Promise.all([
      fetch('/api/bored/watchlist'),
      fetch('/api/bored/watch-history')
    ]);

    let wlData = wlRes.ok ? (await wlRes.json()).results || [] : [];
    let cwData = cwRes.ok ? (await cwRes.json()).results || [] : [];

    // 2. Check if we have guest items in Local Storage to sync
    const guestWatchlist = safeGet<WatchlistItem>(WL_KEY, []);
    const guestCW = safeGet<ContinueWatchingItem>(CW_KEY, []);

    if (guestWatchlist.length > 0) {
      // Sync guest watchlist items to DB
      await Promise.allSettled(
        guestWatchlist.map((item) =>
          fetch('/api/bored/watchlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          })
        )
      );
      // Clear local storage watchlist
      localStorage.removeItem(WL_KEY);
      
      // Refetch merged watchlist
      const refetch = await fetch('/api/bored/watchlist');
      if (refetch.ok) wlData = (await refetch.json()).results || [];
    }

    if (guestCW.length > 0) {
      // Sync guest continue-watching progress to DB
      await Promise.allSettled(
        guestCW.map((item) =>
          fetch('/api/bored/watch-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          })
        )
      );
      // Clear local storage CW
      localStorage.removeItem(CW_KEY);

      // Refetch merged history
      const refetch = await fetch('/api/bored/watch-history');
      if (refetch.ok) cwData = (await refetch.json()).results || [];
    }

    // 3. Update the local caches
    // Map DB fields back to frontend properties if needed (Mongoose added createdAt/tmdbId)
    dbWatchlistCache = wlData;
    dbCWCache = cwData;

    notifyCW();
    notifyWL();
  } catch (err) {
    console.error('Error initializing authenticated storage:', err);
  }
}

/* ════════════════════════════════════════════════════
   CONTINUE WATCHING
   ════════════════════════════════════════════════════ */

export function getContinueWatching(): ContinueWatchingItem[] {
  if (isUserAuthenticated && dbCWCache) {
    return dbCWCache.sort((a, b) => b.timestamp - a.timestamp);
  }
  return safeGet<ContinueWatchingItem>(CW_KEY, [])
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function updateContinueWatching(item: ContinueWatchingItem): void {
  if (isUserAuthenticated) {
    const list = dbCWCache ? [...dbCWCache] : [];
    const idx = list.findIndex(
      (x) => x.tmdbId === item.tmdbId && x.mediaType === item.mediaType
    );
    const updatedItem = { ...item, timestamp: Date.now() };

    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updatedItem };
    } else {
      list.unshift(updatedItem);
    }

    dbCWCache = list.slice(0, MAX_CW_ITEMS);
    notifyCW();

    // Push to DB in background
    fetch('/api/bored/watch-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    }).catch(err => console.error('Error syncing CW update:', err));
    return;
  }

  const list = safeGet<ContinueWatchingItem>(CW_KEY, []);
  const idx = list.findIndex(
    (x) => x.tmdbId === item.tmdbId && x.mediaType === item.mediaType
  );
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...item, timestamp: Date.now() };
  } else {
    list.unshift({ ...item, timestamp: Date.now() });
  }
  safeSet(CW_KEY, list.slice(0, MAX_CW_ITEMS));
  notifyCW();
}

export function removeContinueWatching(tmdbId: number, mediaType: 'movie' | 'tv'): void {
  if (isUserAuthenticated) {
    if (dbCWCache) {
      dbCWCache = dbCWCache.filter((x) => !(x.tmdbId === tmdbId && x.mediaType === mediaType));
      notifyCW();
    }
    // Delete from DB in background
    fetch(`/api/bored/watch-history?tmdbId=${tmdbId}&mediaType=${mediaType}`, {
      method: 'DELETE',
    }).catch(err => console.error('Error syncing CW deletion:', err));
    return;
  }

  const list = safeGet<ContinueWatchingItem>(CW_KEY, []);
  safeSet(CW_KEY, list.filter((x) => !(x.tmdbId === tmdbId && x.mediaType === mediaType)));
  notifyCW();
}

/* ════════════════════════════════════════════════════
   WATCHLIST
   ════════════════════════════════════════════════════ */

export function getWatchlist(): WatchlistItem[] {
  if (isUserAuthenticated && dbWatchlistCache) {
    // MongoDB stores addedAt, default to Date.now() if missing
    return dbWatchlistCache.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  }
  return safeGet<WatchlistItem>(WL_KEY, [])
    .sort((a, b) => b.addedAt - a.addedAt);
}

export function addToWatchlist(item: WatchlistItem): void {
  if (isUserAuthenticated) {
    const list = dbWatchlistCache ? [...dbWatchlistCache] : [];
    const exists = list.some(
      (x) => x.tmdbId === item.tmdbId && x.mediaType === item.mediaType
    );
    if (exists) return;

    const newItem = { ...item, addedAt: Date.now() };
    list.unshift(newItem);
    dbWatchlistCache = list.slice(0, MAX_WL_ITEMS);
    notifyWL();

    // Push to DB in background
    fetch('/api/bored/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    }).catch(err => console.error('Error syncing watchlist addition:', err));
    return;
  }

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
  if (isUserAuthenticated) {
    if (dbWatchlistCache) {
      dbWatchlistCache = dbWatchlistCache.filter((x) => !(x.tmdbId === tmdbId && x.mediaType === mediaType));
      notifyWL();
    }
    // Delete from DB in background
    fetch(`/api/bored/watchlist?tmdbId=${tmdbId}&mediaType=${mediaType}`, {
      method: 'DELETE',
    }).catch(err => console.error('Error syncing watchlist deletion:', err));
    return;
  }

  const list = safeGet<WatchlistItem>(WL_KEY, []);
  safeSet(WL_KEY, list.filter((x) => !(x.tmdbId === tmdbId && x.mediaType === mediaType)));
  notifyWL();
}

export function isInWatchlist(tmdbId: number, mediaType: 'movie' | 'tv'): boolean {
  if (isUserAuthenticated && dbWatchlistCache) {
    return dbWatchlistCache.some((x) => x.tmdbId === tmdbId && x.mediaType === mediaType);
  }
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
