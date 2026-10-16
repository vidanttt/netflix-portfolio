/* ════════════════════════════════════════════════════
   BORED — Player Provider Abstraction
   Multiple servers with fallback support
   ════════════════════════════════════════════════════ */

import type { PlayerProvider } from './types';

// Videasy moved its embeds: the old player.videasy.net/movie/... now 301-redirects to a
// regular site page, while the documented embed player lives at player.videasy.ws/embed/...
// (see https://videasy.ws/docs.html). autoplay=1 starts playback without the extra click.
export const VideasyProvider: PlayerProvider = {
  name: 'Videasy',
  getMovieUrl: (tmdbId: number) => `https://player.videasy.ws/embed/movie/${tmdbId}?autoplay=1`,
  getTVUrl: (tmdbId: number, season: number, episode: number) =>
    `https://player.videasy.ws/embed/tv/${tmdbId}/${season}/${episode}?autoplay=1&autonext=1`,
};

export const VidsrcProvider: PlayerProvider = {
  name: 'VidSrc',
  getMovieUrl: (tmdbId: number) => `https://vidsrc.sh/embed/movie/${tmdbId}`,
  getTVUrl: (tmdbId: number, season: number, episode: number) =>
    `https://vidsrc.sh/embed/tv/${tmdbId}/${season}/${episode}`,
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
  getMovieUrl: (tmdbId: number) => `https://nontongo.win/embed/movie/${tmdbId}`,
  getTVUrl: (tmdbId: number, season: number, episode: number) =>
    `https://nontongo.win/embed/tv/${tmdbId}/${season}/${episode}`,
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
  NontonGoProvider,
  Twoembed,
  VidsrcProvider,
  EmbedSuProvider,
  AutoembedProvider,
];

export const defaultProvider = VideasyProvider;
