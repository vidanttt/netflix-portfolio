'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import PillNav from '@/components/PillNav';
import './bored.css';

/* ════════════════════════════════════════════════════
   TMDB TYPES
   ════════════════════════════════════════════════════ */
interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date: string;
  genre_ids?: number[];
  original_language?: string;
}

interface TMDBMovieDetail extends TMDBMovie {
  runtime: number | null;
  genres: { id: number; name: string }[];
  credits?: {
    crew: { job: string; name: string }[];
    cast: { name: string; order: number }[];
  };
}

interface Movie {
  id: number;
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
}

/* ════════════════════════════════════════════════════
   CONSTANTS & HELPERS
   ════════════════════════════════════════════════════ */
const IMG = 'https://image.tmdb.org/t/p/';
const POSTER_FB = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="500" height="750" fill="%23141414"%3E%3Crect width="500" height="750"/%3E%3C/svg%3E';
const BACKDROP_FB = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" fill="%230a0a0a"%3E%3Crect width="1920" height="1080"/%3E%3C/svg%3E';

const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western',
};

function poster(p: string | null) { return p ? `${IMG}w500${p}` : POSTER_FB; }
function backdrop(p: string | null) { return p ? `${IMG}original${p}` : BACKDROP_FB; }
function fmtRuntime(m: number | null) {
  if (!m) return '';
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m % 60}m`;
}

function normalize(t: TMDBMovie): Movie {
  return {
    id: t.id, title: t.title, overview: t.overview,
    poster: poster(t.poster_path), backdrop: backdrop(t.backdrop_path),
    rating: Math.round(t.vote_average * 10) / 10,
    year: t.release_date?.substring(0, 4) || '',
    runtime: '', genres: (t.genre_ids || []).map((id) => GENRE_MAP[id]).filter(Boolean),
    language: t.original_language?.toUpperCase(),
  };
}

function normalizeDetail(d: TMDBMovieDetail): Movie {
  return {
    id: d.id, title: d.title, overview: d.overview,
    poster: poster(d.poster_path), backdrop: backdrop(d.backdrop_path),
    rating: Math.round(d.vote_average * 10) / 10,
    year: d.release_date?.substring(0, 4) || '',
    runtime: fmtRuntime(d.runtime),
    genres: d.genres?.map((g) => g.name) || [],
    director: d.credits?.crew.find((c) => c.job === 'Director')?.name,
    cast: d.credits?.cast.slice(0, 3).map((c) => c.name).join(', '),
    language: d.original_language?.toUpperCase(),
  };
}

async function tmdb(endpoint: string, params?: Record<string, string>) {
  const url = new URL('/api/tmdb', window.location.origin);
  url.searchParams.set('endpoint', endpoint);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

/* ════════════════════════════════════════════════════
   ROW BATCHES — loaded progressively
   ════════════════════════════════════════════════════ */
interface RowCfg { title: string; endpoint: string; params?: Record<string, string>; }

const ROW_BATCHES: RowCfg[][] = [
  [
    { title: 'Trending Now', endpoint: 'trending/movie/week' },
    { title: 'Popular', endpoint: 'movie/popular' },
    { title: 'Top Rated', endpoint: 'movie/top_rated' },
    { title: 'Now Playing', endpoint: 'movie/now_playing' },
  ],
  [
    { title: 'Action', endpoint: 'discover/movie', params: { with_genres: '28', sort_by: 'popularity.desc' } },
    { title: 'Sci-Fi', endpoint: 'discover/movie', params: { with_genres: '878', sort_by: 'popularity.desc' } },
    { title: 'Thriller', endpoint: 'discover/movie', params: { with_genres: '53', sort_by: 'popularity.desc' } },
  ],
  [
    { title: 'Comedy', endpoint: 'discover/movie', params: { with_genres: '35', sort_by: 'popularity.desc' } },
    { title: 'Horror', endpoint: 'discover/movie', params: { with_genres: '27', sort_by: 'popularity.desc' } },
    { title: 'Romance', endpoint: 'discover/movie', params: { with_genres: '10749', sort_by: 'popularity.desc' } },
  ],
  [
    { title: 'Crime', endpoint: 'discover/movie', params: { with_genres: '80', sort_by: 'popularity.desc' } },
    { title: 'Drama', endpoint: 'discover/movie', params: { with_genres: '18', sort_by: 'vote_average.desc', 'vote_count.gte': '500' } },
    { title: 'Adventure', endpoint: 'discover/movie', params: { with_genres: '12', sort_by: 'popularity.desc' } },
  ],
  [
    { title: 'Animation', endpoint: 'discover/movie', params: { with_genres: '16', sort_by: 'popularity.desc' } },
    { title: 'Mystery', endpoint: 'discover/movie', params: { with_genres: '9648', sort_by: 'popularity.desc' } },
    { title: 'Fantasy', endpoint: 'discover/movie', params: { with_genres: '14', sort_by: 'popularity.desc' } },
  ],
  [
    { title: 'Documentary', endpoint: 'discover/movie', params: { with_genres: '99', sort_by: 'popularity.desc' } },
    { title: 'War Films', endpoint: 'discover/movie', params: { with_genres: '10752', sort_by: 'vote_average.desc', 'vote_count.gte': '200' } },
    { title: 'Westerns', endpoint: 'discover/movie', params: { with_genres: '37', sort_by: 'popularity.desc' } },
  ],
  [
    { title: 'Critically Acclaimed', endpoint: 'discover/movie', params: { sort_by: 'vote_average.desc', 'vote_count.gte': '2000', 'vote_average.gte': '8' } },
    { title: 'Hidden Gems', endpoint: 'discover/movie', params: { sort_by: 'vote_average.desc', 'vote_count.gte': '100', 'vote_count.lte': '600', 'vote_average.gte': '7.5' } },
    { title: 'Recent Blockbusters', endpoint: 'discover/movie', params: { sort_by: 'revenue.desc', 'primary_release_date.gte': '2023-01-01' } },
  ],
  [
    { title: '90s Classics', endpoint: 'discover/movie', params: { sort_by: 'vote_average.desc', 'vote_count.gte': '500', 'primary_release_date.gte': '1990-01-01', 'primary_release_date.lte': '1999-12-31' } },
    { title: '2000s Favorites', endpoint: 'discover/movie', params: { sort_by: 'vote_average.desc', 'vote_count.gte': '500', 'primary_release_date.gte': '2000-01-01', 'primary_release_date.lte': '2009-12-31' } },
    { title: '2010s Best', endpoint: 'discover/movie', params: { sort_by: 'vote_average.desc', 'vote_count.gte': '500', 'primary_release_date.gte': '2010-01-01', 'primary_release_date.lte': '2019-12-31' } },
  ],
  [
    { title: 'Mind-Bending', endpoint: 'discover/movie', params: { with_genres: '878,9648', sort_by: 'vote_average.desc', 'vote_count.gte': '300' } },
    { title: 'Feel-Good Movies', endpoint: 'discover/movie', params: { with_genres: '35,10749', sort_by: 'vote_average.desc', 'vote_count.gte': '300' } },
    { title: 'Dark & Intense', endpoint: 'discover/movie', params: { with_genres: '53,80', sort_by: 'vote_average.desc', 'vote_count.gte': '300' } },
  ],
  [
    { title: 'Popular — Page 2', endpoint: 'movie/popular', params: { page: '2' } },
    { title: 'Top Rated — Page 2', endpoint: 'movie/top_rated', params: { page: '2' } },
    { title: 'Family Favorites', endpoint: 'discover/movie', params: { with_genres: '10751', sort_by: 'popularity.desc' } },
  ],
  [
    { title: 'Trending — Page 2', endpoint: 'trending/movie/week', params: { page: '2' } },
    { title: 'Music Films', endpoint: 'discover/movie', params: { with_genres: '10402', sort_by: 'popularity.desc' } },
    { title: 'History', endpoint: 'discover/movie', params: { with_genres: '36', sort_by: 'vote_average.desc', 'vote_count.gte': '300' } },
  ],
  [
    { title: 'Popular — Page 3', endpoint: 'movie/popular', params: { page: '3' } },
    { title: 'Now Playing — Page 2', endpoint: 'movie/now_playing', params: { page: '2' } },
    { title: 'Action — Page 2', endpoint: 'discover/movie', params: { with_genres: '28', sort_by: 'popularity.desc', page: '2' } },
  ],
  [
    { title: 'Sci-Fi — Page 2', endpoint: 'discover/movie', params: { with_genres: '878', sort_by: 'popularity.desc', page: '2' } },
    { title: 'Thriller — Page 2', endpoint: 'discover/movie', params: { with_genres: '53', sort_by: 'popularity.desc', page: '2' } },
    { title: 'Comedy — Page 2', endpoint: 'discover/movie', params: { with_genres: '35', sort_by: 'popularity.desc', page: '2' } },
  ],
];

/* ════════════════════════════════════════════════════
   SVG ICONS
   ════════════════════════════════════════════════════ */
const StarIcon = () => (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>);
const PlayIcon = () => (<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>);
const InfoIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>);
const SearchIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>);
const CloseIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
const PlusIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>);
const HeartIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>);
const HomeIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>);
const TrendIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>);
const FilmIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /><line x1="17" y1="17" x2="22" y2="17" /></svg>);

/* ════════════════════════════════════════════════════
   PILL NAV ITEMS
   ════════════════════════════════════════════════════ */
const PILL_NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Search', href: '#search' },
  { label: 'Trending', href: '#trending' },
  { label: 'Browse', href: '#browse' },
];

/* ════════════════════════════════════════════════════
   SKELETON COMPONENTS
   ════════════════════════════════════════════════════ */
function SkeletonCard() {
  return (
    <div className="bd-card bd-skeleton-card" aria-hidden="true">
      <div className="bd-card-poster-wrap"><div className="bd-skeleton-poster" /></div>
      <div className="bd-card-info">
        <div className="bd-skeleton-text" style={{ width: '75%', height: 12 }} />
        <div className="bd-skeleton-text" style={{ width: '50%', height: 10, marginTop: 6 }} />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <section className="bd-row" aria-hidden="true">
      <div className="bd-row-header"><div className="bd-skeleton-text" style={{ width: 140, height: 18 }} /></div>
      <div className="bd-row-scroll">{Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}</div>
    </section>
  );
}

/* ════════════════════════════════════════════════════
   MOVIE CARD
   ════════════════════════════════════════════════════ */
function MovieCard({ movie, onSelect }: { movie: Movie; onSelect: (m: Movie) => void }) {
  return (
    <div className="bd-card" onClick={() => onSelect(movie)} role="button" tabIndex={0}
      aria-label={`${movie.title}, rated ${movie.rating}`}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect(movie); }}>
      <div className="bd-card-poster-wrap">
        <img className="bd-card-poster" src={movie.poster} alt={movie.title} loading="lazy" draggable={false} />
        <div className="bd-card-overlay">
          <div className="bd-card-overlay-rating"><StarIcon /> {movie.rating.toFixed(1)}</div>
          <div className="bd-card-overlay-title">{movie.title}</div>
          <div className="bd-card-overlay-meta">
            <span>{movie.year}</span>
            {movie.genres[0] && <span>{movie.genres[0]}</span>}
          </div>
          <div className="bd-card-overlay-actions">
            <button className="bd-card-action-btn" aria-label="Add to list" onClick={(e) => e.stopPropagation()}><PlusIcon /></button>
            <button className="bd-card-action-btn" aria-label="Like" onClick={(e) => e.stopPropagation()}><HeartIcon /></button>
            <button className="bd-card-action-btn" aria-label="More info" onClick={(e) => { e.stopPropagation(); onSelect(movie); }}><InfoIcon /></button>
          </div>
        </div>
      </div>
      <div className="bd-card-info">
        <h3 className="bd-card-title">{movie.title}</h3>
        <div className="bd-card-meta">
          <span className="bd-card-year">{movie.year}</span>
          <span className="bd-card-rating-small"><StarIcon /> {movie.rating.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MOVIE ROW
   ════════════════════════════════════════════════════ */
function MovieRow({ title, movies, onSelect, id }: { title: string; movies: Movie[]; onSelect: (m: Movie) => void; id?: string }) {
  if (movies.length === 0) return null;
  return (
    <section className="bd-row" aria-label={title} id={id}>
      <div className="bd-row-header">
        <h2 className="bd-row-title">{title}</h2>
        <span className="bd-row-count">{movies.length} titles</span>
      </div>
      <div className="bd-row-scroll" role="list">
        {movies.map((m) => (
          <div key={`${m.id}-${title}`} role="listitem"><MovieCard movie={m} onSelect={onSelect} /></div>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════
   MOVIE DETAIL MODAL
   ════════════════════════════════════════════════════ */
function MovieModal({ movie, onClose }: { movie: Movie | null; onClose: () => void }) {
  const [detail, setDetail] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!movie) { setDetail(null); return; }
    setLoading(true);
    tmdb(`movie/${movie.id}`, { append_to_response: 'credits' })
      .then((d: TMDBMovieDetail) => setDetail(normalizeDetail(d)))
      .catch(() => setDetail(movie))
      .finally(() => setLoading(false));

    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [movie, onClose]);

  const m = detail || movie;

  return (
    <div className={`bd-modal-backdrop ${movie ? 'bd-modal-open' : ''}`} onClick={onClose} role="dialog" aria-modal="true" aria-label={m?.title || ''}>
      {m && (
        <div className="bd-modal" onClick={(e) => e.stopPropagation()}>
          <img className="bd-modal-backdrop-img" src={m.backdrop} alt="" draggable={false} />
          <div className="bd-modal-gradient" />
          <button className="bd-modal-close" onClick={onClose} aria-label="Close"><CloseIcon /></button>
          <div className="bd-modal-body">
            <h2 className="bd-modal-title">{m.title}</h2>
            <div className="bd-modal-meta">
              <span className="bd-modal-rating"><StarIcon /> {m.rating.toFixed(1)}</span>
              <span className="bd-hero-dot" /><span className="bd-modal-meta-text">{m.year}</span>
              {m.runtime && <><span className="bd-hero-dot" /><span className="bd-modal-meta-text">{m.runtime}</span></>}
              {m.language && <><span className="bd-hero-dot" /><span className="bd-modal-meta-text">{m.language}</span></>}
              {loading && <span className="bd-modal-meta-text" style={{ opacity: 0.4 }}>Loading…</span>}
            </div>
            <div className="bd-modal-genres">{m.genres.map((g) => <span key={g} className="bd-genre-pill">{g}</span>)}</div>
            <p className="bd-modal-overview">{m.overview}</p>
            <div className="bd-modal-actions">
              <button className="bd-btn bd-btn-primary"><PlayIcon /> Watch Now</button>
              <button className="bd-btn bd-btn-secondary"><PlusIcon /> Add to List</button>
            </div>
            {(m.director || m.cast) && (
              <div className="bd-modal-detail-row">
                {m.director && <div><div className="bd-modal-detail-label">Director</div><div className="bd-modal-detail-value">{m.director}</div></div>}
                {m.cast && <div><div className="bd-modal-detail-label">Cast</div><div className="bd-modal-detail-value">{m.cast}</div></div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════ */
export default function BoredPage() {
  const [rows, setRows] = useState<{ title: string; movies: Movie[] }[]>([]);
  const [heroMovies, setHeroMovies] = useState<Movie[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [allLoaded, setAllLoaded] = useState(false);

  const batchRef = useRef(0);
  const batchLoadingRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchSentinelRef = useRef<HTMLDivElement>(null);
  const searchQueryRef = useRef('');
  const searchPageRef = useRef(1);

  const heroMovie = heroMovies[heroIdx] || null;

  /* ── Fetch next batch — uses refs to avoid stale closures ── */
  const fetchNextBatch = useCallback(async () => {
    const idx = batchRef.current;
    if (idx >= ROW_BATCHES.length || batchLoadingRef.current) return;
    batchLoadingRef.current = true;
    const batch = ROW_BATCHES[idx];

    try {
      const results = await Promise.allSettled(batch.map((cfg) => tmdb(cfg.endpoint, cfg.params)));
      const newRows: { title: string; movies: Movie[] }[] = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value.results) {
          const movies = r.value.results.filter((m: TMDBMovie) => m.poster_path && m.title).map(normalize);
          if (movies.length > 0) newRows.push({ title: batch[i].title, movies });
        }
      });
      setRows((prev) => [...prev, ...newRows]);
      batchRef.current = idx + 1;
      if (idx + 1 >= ROW_BATCHES.length) setAllLoaded(true);
    } catch { /* */ }
    finally { batchLoadingRef.current = false; }
  }, []);

  /* ── Initial load ── */
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const batch = ROW_BATCHES[0];
        const results = await Promise.allSettled(batch.map((cfg) => tmdb(cfg.endpoint, cfg.params)));
        if (cancelled) return;
        const newRows: { title: string; movies: Movie[] }[] = [];
        results.forEach((r, i) => {
          if (r.status === 'fulfilled' && r.value.results) {
            const movies = r.value.results.filter((m: TMDBMovie) => m.poster_path && m.title).map(normalize);
            if (movies.length > 0) newRows.push({ title: batch[i].title, movies });
          }
        });
        setRows(newRows);
        batchRef.current = 1;

        // Hero details
        const trending = newRows[0];
        if (trending?.movies.length) {
          const top5 = trending.movies.filter((m) => m.backdrop !== BACKDROP_FB).slice(0, 5);
          const details = await Promise.allSettled(top5.map((m) => tmdb(`movie/${m.id}`, { append_to_response: 'credits' })));
          if (cancelled) return;
          setHeroMovies(top5.map((base, i) => {
            const d = details[i];
            return d.status === 'fulfilled' ? normalizeDetail(d.value) : base;
          }));
        }
      } catch { /* */ }
      finally { if (!cancelled) setInitialLoading(false); }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  /* ── Infinite scroll observer — re-observes after each batch ── */
  useEffect(() => {
    if (initialLoading || allLoaded) return;
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) fetchNextBatch(); },
      { rootMargin: '800px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [initialLoading, allLoaded, rows.length, fetchNextBatch]);

  /* ── Hero auto-rotate ── */
  useEffect(() => {
    if (!heroMovies.length) return;
    const t = setInterval(() => setHeroIdx((p) => (p + 1) % heroMovies.length), 8000);
    return () => clearInterval(t);
  }, [heroMovies.length]);

  /* ── Nav scroll ── */
  useEffect(() => {
    const h = () => setNavScrolled(window.scrollY > 50);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  /* ── Search focus/escape ── */
  useEffect(() => { if (searchOpen && searchInputRef.current) searchInputRef.current.focus(); }, [searchOpen]);
  useEffect(() => {
    if (!searchOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSearch(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [searchOpen]);

  /* ── Search with TMDB (already fuzzy) ── */
  const doSearch = useCallback(async (q: string, page: number, append: boolean) => {
    if (!q.trim()) { setSearchResults([]); setSearchTotal(0); return; }
    setSearchLoading(true);
    try {
      const data = await tmdb('search/movie', { query: q, page: String(page), include_adult: 'false' });
      if (data.results) {
        const movies = data.results.filter((m: TMDBMovie) => m.poster_path && m.title).map(normalize);
        setSearchResults((prev) => append ? [...prev, ...movies] : movies);
        setSearchTotal(data.total_results || 0);
      }
    } catch { /* */ }
    finally { setSearchLoading(false); }
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    searchQueryRef.current = q;
    setSearchPage(1);
    searchPageRef.current = 1;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setSearchResults([]); setSearchTotal(0); return; }
    searchTimerRef.current = setTimeout(() => doSearch(q, 1, false), 300);
  }, [doSearch]);

  /* ── Search infinite scroll ── */
  useEffect(() => {
    const el = searchSentinelRef.current;
    if (!el || !searchOpen) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !searchLoading && searchResults.length < searchTotal) {
        const next = searchPageRef.current + 1;
        searchPageRef.current = next;
        setSearchPage(next);
        doSearch(searchQueryRef.current, next, true);
      }
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [searchOpen, searchLoading, searchResults.length, searchTotal, doSearch]);

  const handleSelect = useCallback((m: Movie) => {
    setSelectedMovie(m);
    setSearchOpen(false); setSearchQuery(''); setSearchResults([]); setSearchPage(1);
    searchQueryRef.current = ''; searchPageRef.current = 1;
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false); setSearchQuery(''); setSearchResults([]); setSearchPage(1);
    searchQueryRef.current = ''; searchPageRef.current = 1;
  }, []);

  // Intercept dock "Search" click
  const handleDockClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a[href="#search"]');
    if (link) { e.preventDefault(); setSearchOpen(true); }
  }, []);

  /* ════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════ */
  return (
    <div className="bd-page">
      <div className="bd-noise" aria-hidden="true" />

      <div className="bd-content">
        {/* ── Pill Nav ── */}
        <div className="bd-nav-wrap" onClick={handleDockClick}>
          <PillNav
            logo="/hero-statue.png"
            items={PILL_NAV_ITEMS}
            baseColor="#0a0a0a"
            pillColor="#1f1f1f"
            hoveredPillTextColor="#000000"
            hoverBgColor="#ffffff"
            pillTextColor="#ffffff"
          />
        </div>

        {/* ── Search Overlay — Liquid Glass ── */}
        {searchOpen && (
          <div className="bd-search-overlay" onClick={closeSearch}>
            <div className="bd-search-glass" onClick={(e) => e.stopPropagation()}>
              {/* Search bar */}
              <div className="bd-search-bar">
                <div className="bd-search-bar-icon"><SearchIcon /></div>
                <input
                  ref={searchInputRef}
                  className="bd-search-bar-input"
                  type="text"
                  placeholder="Search any movie..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  aria-label="Search movies"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button className="bd-search-bar-close" onClick={closeSearch} aria-label="Close search">
                  <CloseIcon />
                </button>
              </div>

              {/* Results */}
              <div className="bd-search-results-glass">
                {searchQuery.trim() ? (
                  <>
                    {searchResults.length > 0 && (
                      <div className="bd-search-meta-bar">
                        <span>{searchTotal.toLocaleString()} results</span>
                      </div>
                    )}
                    <div className="bd-search-grid">
                      {searchResults.map((m) => (
                        <div key={m.id} className="bd-search-card" onClick={() => handleSelect(m)} role="button" tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSelect(m); }}>
                          <img className="bd-search-card-poster" src={m.poster} alt={m.title} loading="lazy" draggable={false} />
                          <div className="bd-search-card-info">
                            <span className="bd-search-card-title">{m.title}</span>
                            <div className="bd-search-card-meta">
                              <span>{m.year}</span>
                              <span className="bd-search-card-star"><StarIcon /> {m.rating.toFixed(1)}</span>
                            </div>
                            <span className="bd-search-card-genre">{m.genres.slice(0, 2).join(' · ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {searchResults.length < searchTotal && (
                      <div ref={searchSentinelRef} className="bd-search-more">
                        {searchLoading ? 'Loading more…' : 'Scroll for more'}
                      </div>
                    )}
                    {searchResults.length === 0 && !searchLoading && (
                      <div className="bd-search-empty">
                        <p>No results for &ldquo;{searchQuery}&rdquo;</p>
                        <p className="bd-search-empty-hint">Try different keywords or check the spelling</p>
                      </div>
                    )}
                    {searchLoading && searchResults.length === 0 && (
                      <div className="bd-search-more">Searching…</div>
                    )}
                  </>
                ) : (
                  <div className="bd-search-empty">
                    <p>Search any movie</p>
                    <p className="bd-search-empty-hint">Search by title, director, or keyword — typos are fine</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Hero ── */}
        {heroMovie ? (
          <section className="bd-hero" aria-label="Featured movie" id="trending">
            <img className="bd-hero-backdrop" src={heroMovie.backdrop} alt="" draggable={false} key={heroMovie.id} />
            <div className="bd-hero-gradient-top" />
            <div className="bd-hero-gradient-left" />
            <div className="bd-hero-gradient-bottom" />
            <div className="bd-hero-content">
              <div className="bd-hero-tag">Featured</div>
              <h1 className="bd-hero-movie-title">{heroMovie.title}</h1>
              <div className="bd-hero-meta">
                <span className="bd-hero-rating"><StarIcon /> {heroMovie.rating.toFixed(1)}</span>
                <span className="bd-hero-dot" /><span className="bd-hero-meta-text">{heroMovie.year}</span>
                {heroMovie.runtime && <><span className="bd-hero-dot" /><span className="bd-hero-meta-text">{heroMovie.runtime}</span></>}
              </div>
              <div className="bd-hero-genres">{heroMovie.genres.map((g) => <span key={g} className="bd-genre-pill">{g}</span>)}</div>
              <p className="bd-hero-overview">{heroMovie.overview}</p>
              <div className="bd-hero-actions">
                <button className="bd-btn bd-btn-primary" onClick={() => handleSelect(heroMovie)}><PlayIcon /> Watch Now</button>
                <button className="bd-btn bd-btn-secondary" onClick={() => handleSelect(heroMovie)}><InfoIcon /> More Info</button>
              </div>
            </div>
            <div className="bd-hero-indicators">
              {heroMovies.map((_, i) => (
                <button key={i} className={`bd-hero-indicator ${i === heroIdx ? 'bd-active' : ''}`} onClick={() => setHeroIdx(i)} aria-label={`Movie ${i + 1}`} />
              ))}
            </div>
          </section>
        ) : initialLoading ? (
          <div className="bd-hero" style={{ background: '#0a0a0a' }}>
            <div className="bd-hero-content">
              <div className="bd-skeleton-text" style={{ width: 80, height: 12, marginBottom: 16 }} />
              <div className="bd-skeleton-text" style={{ width: '60%', height: 48, marginBottom: 12 }} />
              <div className="bd-skeleton-text" style={{ width: 200, height: 14 }} />
            </div>
          </div>
        ) : null}

        {/* ── Movie Rows ── */}
        <div id="browse">
          {initialLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            : rows.map((row, i) => (
                <MovieRow key={`${row.title}-${i}`} title={row.title} movies={row.movies} onSelect={handleSelect}
                  id={i === 0 ? 'trending-row' : undefined} />
              ))}
        </div>

        {/* ── Infinite scroll sentinel — always rendered ── */}
        {!allLoaded && !initialLoading && (
          <div ref={sentinelRef} className="bd-sentinel">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {allLoaded && <div className="bd-end-message">You&apos;ve seen it all. Maybe go outside?</div>}

        <footer className="bd-footer" role="contentinfo">
          <span className="bd-footer-text">© 2025 Vidaant</span>
          <span className="bd-footer-text">Powered by TMDB</span>
        </footer>
      </div>

      <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
    </div>
  );
}
