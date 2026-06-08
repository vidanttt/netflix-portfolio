/* ════════════════════════════════════════════════════
   BORED — Player Provider Abstraction
   Multiple servers with fallback support
   ════════════════════════════════════════════════════ */

import type { PlayerProvider } from './types';

export const VideasyProvider: PlayerProvider = {
  name: 'Videasy',
  getMovieUrl: (tmdbId: number) => `https://player.videasy.net/movie/${tmdbId}`,
  getTVUrl: (tmdbId: number, season: number, episode: number) =>
    `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}`,
};

export const VidsrcProvider: PlayerProvider = {
  name: 'VidSrc',
  getMovieUrl: (tmdbId: number) => `https://vidsrc.xyz/embed/movie/${tmdbId}`,
  getTVUrl: (tmdbId: number, season: number, episode: number) =>
    `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}/${episode}`,
};

export const EmbedSuProvider: PlayerProvider = {
  name: 'EmbedSu',
  getMovieUrl: (tmdbId: number) => `https://embed.su/embed/movie/${tmdbId}`,
  getTVUrl: (tmdbId: number, season: number, episode: number) =>
    `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`,
};

export const AutoembedProvider: PlayerProvider = {
  name: 'AutoEmbed',
  getMovieUrl: (tmdbId: number) => `https://player.autoembed.cc/embed/movie/${tmdbId}`,
  getTVUrl: (tmdbId: number, season: number, episode: number) =>
    `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`,
};

export const NontonGoProvider: PlayerProvider = {
  name: 'NontonGo',
  getMovieUrl: (tmdbId: number) => `https://www.NontonGo.win/embed/movie/${tmdbId}`,
  getTVUrl: (tmdbId: number, season: number, episode: number) =>
    `https://www.NontonGo.win/embed/tv/${tmdbId}/${season}/${episode}`,
};

export const Twoembed: PlayerProvider = {
  name: '2embed',
  getMovieUrl: (tmdbId: number) => `https://www.2embed.cc/embed/${tmdbId}`,
  getTVUrl: (tmdbId: number, season: number, episode: number) =>
    `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`,
};

/* ── Ordered list — fallback goes top to bottom ── */
export const ALL_PROVIDERS: PlayerProvider[] = [
  VideasyProvider,
  VidsrcProvider,
  EmbedSuProvider,
  AutoembedProvider,
  NontonGoProvider,
  Twoembed,
];

export const defaultProvider = VideasyProvider;
