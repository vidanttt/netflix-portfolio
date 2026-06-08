/* ════════════════════════════════════════════════════
   BORED — Shared TypeScript Types
   ════════════════════════════════════════════════════ */

/* ── TMDb Raw API Types ── */

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date: string;
  genre_ids?: number[];
  original_language?: string;
  media_type?: string;
}

export interface TMDBMovieDetail extends TMDBMovie {
  runtime: number | null;
  genres: { id: number; name: string }[];
  credits?: {
    crew: { job: string; name: string }[];
    cast: TMDBCastMember[];
  };
  videos?: { results: TMDBVideo[] };
  recommendations?: { results: TMDBMovie[] };
  similar?: { results: TMDBMovie[] };
}

export interface TMDBTVShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  first_air_date: string;
  genre_ids?: number[];
  original_language?: string;
  media_type?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
}

export interface TMDBTVDetail extends TMDBTVShow {
  genres: { id: number; name: string }[];
  episode_run_time: number[];
  seasons: TMDBSeason[];
  created_by: { name: string }[];
  credits?: {
    crew: { job: string; name: string }[];
    cast: TMDBCastMember[];
  };
  videos?: { results: TMDBVideo[] };
  recommendations?: { results: TMDBTVShow[] };
  similar?: { results: TMDBTVShow[] };
}

export interface TMDBSeason {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string | null;
  episode_count: number;
}

export interface TMDBEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
  vote_average: number;
}

export interface TMDBSeasonDetail {
  episodes: TMDBEpisode[];
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

/* ── TMDb Multi-search result ── */
export interface TMDBMultiResult {
  id: number;
  media_type: 'movie' | 'tv' | 'person';
  title?: string;
  name?: string;
  overview?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  original_language?: string;
}

/* ── Unified App Types ── */

export interface MediaItem {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  overview: string;
  poster: string;
  backdrop: string;
  rating: number;
  year: string;
  runtime: string;
  genres: string[];
  director?: string;
  cast?: string;
  language?: string;
  seasonCount?: number;
  episodeCount?: number;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  photo: string | null;
}

export interface TrailerInfo {
  key: string;
  name: string;
  site: string;
}

export interface ContinueWatchingItem {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  progress: number;
  duration: number;
  poster: string;
  backdrop: string;
  title: string;
  episodeTitle?: string;
  timestamp: number;
}

export interface WatchlistItem {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  poster: string;
  backdrop: string;
  title: string;
  year: string;
  rating: number;
  genres: string[];
  addedAt: number;
}

/* ── Player Provider Interface ── */

export interface PlayerProvider {
  name: string;
  getMovieUrl(tmdbId: number): string;
  getTVUrl(tmdbId: number, season: number, episode: number): string;
}
