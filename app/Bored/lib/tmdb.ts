/* ════════════════════════════════════════════════════
   BORED — TMDb Helpers, Normalizers, Constants
   ════════════════════════════════════════════════════ */

import type {
  TMDBMovie,
  TMDBMovieDetail,
  TMDBTVShow,
  TMDBTVDetail,
  TMDBMultiResult,
  TMDBCastMember,
  TMDBVideo,
  MediaItem,
  CastMember,
  TrailerInfo,
} from './types';

/* ── Constants ── */
export const IMG = 'https://image.tmdb.org/t/p/';
export const POSTER_FB =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="500" height="750" fill="%23141414"%3E%3Crect width="500" height="750"/%3E%3C/svg%3E';
export const BACKDROP_FB =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" fill="%230a0a0a"%3E%3Crect width="1920" height="1080"/%3E%3C/svg%3E';
export const PROFILE_FB =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="185" height="278" fill="%231a1a1a"%3E%3Crect width="185" height="278"/%3E%3C/svg%3E';

/* ── Genre maps ── */
export const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western',
};

export const TV_GENRE_MAP: Record<number, string> = {
  10759: 'Action & Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 10762: 'Kids',
  9648: 'Mystery', 10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy',
  10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics', 37: 'Western',
};

/* ── Image URL builders ── */
export function posterUrl(p: string | null, size = 'w500') {
  return p ? `${IMG}${size}${p}` : POSTER_FB;
}

export function backdropUrl(p: string | null, size = 'original') {
  return p ? `${IMG}${size}${p}` : BACKDROP_FB;
}

export function profileUrl(p: string | null, size = 'w185') {
  return p ? `${IMG}${size}${p}` : PROFILE_FB;
}

export function stillUrl(p: string | null, size = 'w300') {
  return p ? `${IMG}${size}${p}` : null;
}

/* ── Formatting ── */
export function fmtRuntime(m: number | null | undefined) {
  if (!m) return '';
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m % 60}m`;
}

export function fmtDate(dateStr: string | null | undefined) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return dateStr; }
}

export function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

/* ── Normalizers ── */
export function normalizeMovie(t: TMDBMovie): MediaItem {
  return {
    id: t.id,
    mediaType: 'movie',
    title: t.title,
    overview: t.overview,
    poster: posterUrl(t.poster_path),
    backdrop: backdropUrl(t.backdrop_path),
    rating: Math.round(t.vote_average * 10) / 10,
    year: t.release_date?.substring(0, 4) || '',
    runtime: '',
    genres: (t.genre_ids || []).map((id) => GENRE_MAP[id]).filter(Boolean),
    language: t.original_language?.toUpperCase(),
  };
}

export function normalizeMovieDetail(d: TMDBMovieDetail): MediaItem {
  return {
    id: d.id,
    mediaType: 'movie',
    title: d.title,
    overview: d.overview,
    poster: posterUrl(d.poster_path),
    backdrop: backdropUrl(d.backdrop_path),
    rating: Math.round(d.vote_average * 10) / 10,
    year: d.release_date?.substring(0, 4) || '',
    runtime: fmtRuntime(d.runtime),
    genres: d.genres?.map((g) => g.name) || [],
    director: d.credits?.crew.find((c) => c.job === 'Director')?.name,
    cast: d.credits?.cast.slice(0, 3).map((c) => c.name).join(', '),
    language: d.original_language?.toUpperCase(),
  };
}

export function normalizeTVShow(t: TMDBTVShow): MediaItem {
  return {
    id: t.id,
    mediaType: 'tv',
    title: t.name,
    overview: t.overview,
    poster: posterUrl(t.poster_path),
    backdrop: backdropUrl(t.backdrop_path),
    rating: Math.round(t.vote_average * 10) / 10,
    year: t.first_air_date?.substring(0, 4) || '',
    runtime: '',
    genres: (t.genre_ids || []).map((id) => TV_GENRE_MAP[id] || GENRE_MAP[id]).filter(Boolean),
    language: t.original_language?.toUpperCase(),
    seasonCount: t.number_of_seasons,
    episodeCount: t.number_of_episodes,
  };
}

export function normalizeTVDetail(d: TMDBTVDetail): MediaItem {
  const avgRuntime = d.episode_run_time?.length ? d.episode_run_time[0] : null;
  return {
    id: d.id,
    mediaType: 'tv',
    title: d.name,
    overview: d.overview,
    poster: posterUrl(d.poster_path),
    backdrop: backdropUrl(d.backdrop_path),
    rating: Math.round(d.vote_average * 10) / 10,
    year: d.first_air_date?.substring(0, 4) || '',
    runtime: avgRuntime ? `${avgRuntime}m/ep` : '',
    genres: d.genres?.map((g) => g.name) || [],
    director: d.created_by?.map((c) => c.name).join(', '),
    cast: d.credits?.cast.slice(0, 3).map((c) => c.name).join(', '),
    language: d.original_language?.toUpperCase(),
    seasonCount: d.number_of_seasons,
    episodeCount: d.number_of_episodes,
  };
}

export function normalizeMultiResult(r: TMDBMultiResult): MediaItem | null {
  if (r.media_type === 'movie') {
    return normalizeMovie({
      ...r,
      title: r.title || '',
      release_date: r.release_date || '',
    } as TMDBMovie);
  }
  if (r.media_type === 'tv') {
    return normalizeTVShow({
      ...r,
      name: r.name || '',
      first_air_date: r.first_air_date || '',
    } as TMDBTVShow);
  }
  return null;
}

export function normalizeCast(members: TMDBCastMember[]): CastMember[] {
  return members.map((c) => ({
    id: c.id,
    name: c.name,
    character: c.character,
    photo: c.profile_path ? profileUrl(c.profile_path) : null,
  }));
}

export function findTrailer(videos: TMDBVideo[]): TrailerInfo | null {
  // Prefer official YouTube trailers
  const official = videos.find(
    (v) => v.site === 'YouTube' && v.type === 'Trailer' && v.official
  );
  if (official) return { key: official.key, name: official.name, site: official.site };

  const anyTrailer = videos.find(
    (v) => v.site === 'YouTube' && v.type === 'Trailer'
  );
  if (anyTrailer) return { key: anyTrailer.key, name: anyTrailer.name, site: anyTrailer.site };

  const teaser = videos.find(
    (v) => v.site === 'YouTube' && v.type === 'Teaser'
  );
  if (teaser) return { key: teaser.key, name: teaser.name, site: teaser.site };

  return null;
}

/* ── API Fetch Helper ── */

const requestCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function tmdb(endpoint: string, params?: Record<string, string>) {
  const cacheKey = `${endpoint}|${JSON.stringify(params || {})}`;
  const cached = requestCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const url = new URL('/api/tmdb', window.location.origin);
  url.searchParams.set('endpoint', endpoint);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();

  requestCache.set(cacheKey, { data, ts: Date.now() });
  return data;
}
