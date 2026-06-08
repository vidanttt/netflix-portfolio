'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import PillNav from '@/components/PillNav';
import type { MediaItem, TMDBMovie, TMDBMovieDetail, TMDBTVShow } from './lib/types';
import {
  tmdb, normalizeMovie, normalizeMovieDetail, normalizeTVShow,
  BACKDROP_FB,
} from './lib/tmdb';
import { StarIcon, PlayIcon, InfoIcon } from './lib/icons';
import MediaRow, { SkeletonRow } from './components/MediaRow';
import SearchOverlay from './components/SearchOverlay';
import DetailModal from './components/DetailModal';
import ContinueWatchingRow from './components/ContinueWatchingRow';
import WatchlistRow from './components/WatchlistRow';
import './bored.css';

/* ════════════════════════════════════════════════════
   ROW BATCHES — loaded progressively
   ════════════════════════════════════════════════════ */
interface RowCfg {
  title: string;
  endpoint: string;
  params?: Record<string, string>;
  type?: 'movie' | 'tv';
}

const ROW_BATCHES: RowCfg[][] = [
  [
    { title: 'Trending Movies', endpoint: 'trending/movie/week' },
    { title: 'Trending TV Shows', endpoint: 'trending/tv/week', type: 'tv' },
    { title: 'Popular Movies', endpoint: 'movie/popular' },
    { title: 'Popular TV Shows', endpoint: 'tv/popular', type: 'tv' },
  ],
  [
    { title: 'Top Rated Movies', endpoint: 'movie/top_rated' },
    { title: 'Top Rated TV', endpoint: 'tv/top_rated', type: 'tv' },
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
    { title: 'Sci-Fi & Fantasy TV', endpoint: 'discover/tv', params: { with_genres: '10765', sort_by: 'popularity.desc' }, type: 'tv' },
    { title: 'Crime TV', endpoint: 'discover/tv', params: { with_genres: '80', sort_by: 'popularity.desc' }, type: 'tv' },
    { title: 'Drama TV', endpoint: 'discover/tv', params: { with_genres: '18', sort_by: 'popularity.desc' }, type: 'tv' },
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
];

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
   MAIN PAGE
   ════════════════════════════════════════════════════ */
export default function BoredPage() {
  const [rows, setRows] = useState<{ title: string; items: MediaItem[] }[]>([]);
  const [heroMovies, setHeroMovies] = useState<MediaItem[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [allLoaded, setAllLoaded] = useState(false);
  const [, setWlTick] = useState(0); // force re-render on watchlist changes

  const batchRef = useRef(0);
  const batchLoadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const heroMovie = heroMovies[heroIdx] || null;

  /* ── Normalize a row result based on type ── */
  const normalizeRow = useCallback((cfg: RowCfg, results: TMDBMovie[] | TMDBTVShow[]) => {
    if (cfg.type === 'tv') {
      return (results as TMDBTVShow[])
        .filter((m) => m.poster_path && m.name)
        .map(normalizeTVShow);
    }
    return (results as TMDBMovie[])
      .filter((m) => m.poster_path && m.title)
      .map(normalizeMovie);
  }, []);

  /* ── Fetch next batch ── */
  const fetchNextBatch = useCallback(async () => {
    const idx = batchRef.current;
    if (idx >= ROW_BATCHES.length || batchLoadingRef.current) return;
    batchLoadingRef.current = true;
    const batch = ROW_BATCHES[idx];

    try {
      const results = await Promise.allSettled(batch.map((cfg) => tmdb(cfg.endpoint, cfg.params)));
      const newRows: { title: string; items: MediaItem[] }[] = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value.results) {
          const items = normalizeRow(batch[i], r.value.results);
          if (items.length > 0) newRows.push({ title: batch[i].title, items });
        }
      });
      setRows((prev) => [...prev, ...newRows]);
      batchRef.current = idx + 1;
      if (idx + 1 >= ROW_BATCHES.length) setAllLoaded(true);
    } catch { /* */ }
    finally { batchLoadingRef.current = false; }
  }, [normalizeRow]);

  /* ── Initial load ── */
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const batch = ROW_BATCHES[0];
        const results = await Promise.allSettled(batch.map((cfg) => tmdb(cfg.endpoint, cfg.params)));
        if (cancelled) return;
        const newRows: { title: string; items: MediaItem[] }[] = [];
        results.forEach((r, i) => {
          if (r.status === 'fulfilled' && r.value.results) {
            const items = normalizeRow(batch[i], r.value.results);
            if (items.length > 0) newRows.push({ title: batch[i].title, items });
          }
        });
        setRows(newRows);
        batchRef.current = 1;

        // Hero details — use trending movies
        const trending = newRows[0];
        if (trending?.items.length) {
          const top5 = trending.items
            .filter((m) => m.backdrop !== BACKDROP_FB && m.mediaType === 'movie')
            .slice(0, 5);
          const details = await Promise.allSettled(
            top5.map((m) => tmdb(`movie/${m.id}`, { append_to_response: 'credits' }))
          );
          if (cancelled) return;
          setHeroMovies(top5.map((base, i) => {
            const d = details[i];
            return d.status === 'fulfilled' ? normalizeMovieDetail(d.value as TMDBMovieDetail) : base;
          }));
        }
      } catch { /* */ }
      finally { if (!cancelled) setInitialLoading(false); }
    }
    init();
    return () => { cancelled = true; };
  }, [normalizeRow]);

  /* ── Infinite scroll ── */
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

  /* ── Intercept nav Search click ── */
  const handleDockClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a[href="#search"]');
    if (link) { e.preventDefault(); setSearchOpen(true); }
  }, []);

  const handleSelect = useCallback((m: MediaItem) => {
    setSelectedItem(m);
  }, []);

  const handleWatchlistChange = useCallback(() => {
    setWlTick((t) => t + 1);
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

        {/* ── Search Overlay ── */}
        <SearchOverlay
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          onSelect={(item) => {
            setSearchOpen(false);
            setSelectedItem(item);
          }}
        />

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

        {/* ── Continue Watching ── */}
        <ContinueWatchingRow />

        {/* ── Watchlist ── */}
        <WatchlistRow />

        {/* ── Content Rows ── */}
        <div id="browse">
          {initialLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            : rows.map((row, i) => (
                <MediaRow
                  key={`${row.title}-${i}`}
                  title={row.title}
                  items={row.items}
                  onSelect={handleSelect}
                  onWatchlistChange={handleWatchlistChange}
                  id={i === 0 ? 'trending-row' : undefined}
                />
              ))}
        </div>

        {/* ── Infinite scroll sentinel ── */}
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

      {/* ── Detail Modal ── */}
      <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}
