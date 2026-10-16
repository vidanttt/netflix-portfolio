'use client';

/* ════════════════════════════════════════════════════
   BORED — Category page (anime, cartoons, k-drama, genres…)
   Rows come from TMDB discover queries defined in lib/categories.ts and use the same
   cards, detail modal and player flow as the rest of Bored.
   ════════════════════════════════════════════════════ */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PillNav from '@/components/PillNav';
import type { MediaItem, TMDBMovie, TMDBMovieDetail, TMDBTVDetail, TMDBTVShow } from '../../lib/types';
import {
  tmdb, normalizeMovie, normalizeMovieDetail, normalizeTVDetail, normalizeTVShow, BACKDROP_FB,
} from '../../lib/tmdb';
import { getCategory, CATEGORIES, type RowCfg } from '../../lib/categories';
import { StarIcon, PlayIcon, InfoIcon } from '../../lib/icons';
import MediaRow, { SkeletonRow } from '../../components/MediaRow';
import SearchOverlay from '../../components/SearchOverlay';
import AmbientBackdrop from '../../components/AmbientBackdrop';
import LiquidGlass from '../../components/LiquidGlass';
import { gsap, reducedMotion, installPressFeedback, animateHeroContent } from '../../lib/motion';
import DetailModal from '../../components/DetailModal';
import { initAuthStorage } from '../../lib/storage';
import { useAuth } from '@clerk/nextjs';
import '../../bored.css';

const PILL_NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Movies & TV', href: '/Bored' },
  { label: 'Search', href: '#search' },
];

export default function CategoryPage() {
  const params = useParams();
  const slug = String(params.slug || '');
  const category = getCategory(slug);

  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const [rows, setRows] = useState<{ title: string; items: MediaItem[] }[]>([]);
  const [heroItems, setHeroItems] = useState<MediaItem[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [allLoaded, setAllLoaded] = useState(false);
  const [, setWlTick] = useState(0);

  useEffect(() => {
    if (isAuthLoaded) initAuthStorage(isSignedIn);
  }, [isAuthLoaded, isSignedIn]);

  const batchRef = useRef(0);
  const batchLoadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hero = heroItems[heroIdx] || null;

  // Motion + glass setup for the page
  useEffect(() => {
    const off = installPressFeedback('.bd-btn, .bd-card-action-btn, .bd-cat-chip, .bd-cat-tile, .bd-row-arrow, .bd-hero-indicator');
    if (!reducedMotion()) {
      gsap.from('.bd-nav-wrap', { opacity: 0, y: -60, scale: 0.9, duration: 0.7, delay: 0.1, ease: 'back.out(1.9)', clearProps: 'transform,opacity' });
    }
    return off;
  }, []);

  useEffect(() => {
    const el = document.querySelector('.bd-hero-content');
    if (el) animateHeroContent(el);
  }, [hero?.id, hero?.mediaType]);

  const loadBatch = useCallback(async (batch: RowCfg[]) => {
    const results = await Promise.allSettled(batch.map((cfg) => tmdb(cfg.endpoint, cfg.params)));
    const out: { title: string; items: MediaItem[] }[] = [];
    results.forEach((r, i) => {
      if (r.status !== 'fulfilled' || !r.value.results) return;
      const cfg = batch[i];
      const items =
        cfg.type === 'tv'
          ? (r.value.results as TMDBTVShow[]).filter((m) => m.poster_path && m.name).map(normalizeTVShow)
          : (r.value.results as TMDBMovie[]).filter((m) => m.poster_path && m.title).map(normalizeMovie);
      if (items.length > 0) out.push({ title: cfg.title, items });
    });
    return out;
  }, []);

  const fetchNextBatch = useCallback(async () => {
    if (!category) return;
    const idx = batchRef.current;
    if (idx >= category.batches.length || batchLoadingRef.current) return;
    batchLoadingRef.current = true;
    try {
      const next = await loadBatch(category.batches[idx]);
      setRows((prev) => [...prev, ...next]);
      batchRef.current = idx + 1;
      if (idx + 1 >= category.batches.length) setAllLoaded(true);
    } catch {
      /* */
    } finally {
      batchLoadingRef.current = false;
    }
  }, [category, loadBatch]);

  /* ── Reset + initial load when the category changes ── */
  useEffect(() => {
    if (!category) return;
    let cancelled = false;
    setRows([]);
    setHeroItems([]);
    setHeroIdx(0);
    setAllLoaded(false);
    setInitialLoading(true);
    batchRef.current = 0;
    batchLoadingRef.current = false;

    (async () => {
      try {
        const first = await loadBatch(category.batches[0]);
        if (cancelled) return;
        setRows(first);
        batchRef.current = 1;
        if (category.batches.length <= 1) setAllLoaded(true);

        const lead = first[0];
        if (lead?.items.length) {
          const top5 = lead.items.filter((m) => m.backdrop !== BACKDROP_FB).slice(0, 5);
          const details = await Promise.allSettled(
            top5.map((m) => tmdb(`${m.mediaType}/${m.id}`, { append_to_response: 'credits' }))
          );
          if (cancelled) return;
          setHeroItems(
            top5.map((base, i) => {
              const d = details[i];
              if (d.status !== 'fulfilled') return base;
              return base.mediaType === 'tv'
                ? normalizeTVDetail(d.value as TMDBTVDetail)
                : normalizeMovieDetail(d.value as TMDBMovieDetail);
            })
          );
        }
      } catch {
        /* */
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category, loadBatch]);

  /* ── Infinite scroll ── */
  useEffect(() => {
    if (initialLoading || allLoaded) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextBatch();
      },
      { rootMargin: '800px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [initialLoading, allLoaded, rows.length, fetchNextBatch]);

  /* ── Hero auto-rotate ── */
  useEffect(() => {
    if (!heroItems.length) return;
    const t = setInterval(() => setHeroIdx((p) => (p + 1) % heroItems.length), 8000);
    return () => clearInterval(t);
  }, [heroItems.length]);

  const handleDockClick = useCallback((e: React.MouseEvent) => {
    const link = (e.target as HTMLElement).closest('a[href="#search"]');
    if (link) {
      e.preventDefault();
      setSearchOpen(true);
    }
  }, []);

  const handleSelect = useCallback((m: MediaItem) => setSelectedItem(m), []);
  const handleWatchlistChange = useCallback(() => setWlTick((t) => t + 1), []);

  if (!category) {
    return (
      <div className="bd-page">
        <div className="bd-noise" aria-hidden="true" />
        <div className="bd-content" style={{ padding: '8rem var(--bd-side-pad)' }}>
          <h1 className="bd-hero-movie-title">Category not found</h1>
          <p className="bd-hero-overview">Pick one from the list:</p>
          <div className="bd-hero-genres">
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/Bored/category/${c.slug}`} className="bd-genre-pill">
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bd-page">
      <div className="bd-noise" aria-hidden="true" />
      <LiquidGlass />
      <AmbientBackdrop src={hero?.backdrop} />

      <div className="bd-content">
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

        <SearchOverlay
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          onSelect={(item) => {
            setSearchOpen(false);
            setSelectedItem(item);
          }}
        />

        {/* ── Hero ── */}
        {hero ? (
          <section className="bd-hero" aria-label={`Featured ${category.label}`} id="trending">
            <img className="bd-hero-backdrop" src={hero.backdrop} alt="" draggable={false} key={`${hero.mediaType}-${hero.id}`} />
            <div className="bd-hero-gradient-top" />
            <div className="bd-hero-gradient-left" />
            <div className="bd-hero-gradient-bottom" />
            <div className="bd-hero-content">
              <div className="bd-hero-tag">{category.label}</div>
              <h1 className="bd-hero-movie-title">{hero.title}</h1>
              <div className="bd-hero-meta">
                <span className="bd-hero-rating">
                  <StarIcon /> {hero.rating.toFixed(1)}
                </span>
                <span className="bd-hero-dot" />
                <span className="bd-hero-meta-text">{hero.year}</span>
                {hero.runtime ? (
                  <>
                    <span className="bd-hero-dot" />
                    <span className="bd-hero-meta-text">{hero.runtime}</span>
                  </>
                ) : null}
                {hero.seasonCount ? (
                  <>
                    <span className="bd-hero-dot" />
                    <span className="bd-hero-meta-text">
                      {hero.seasonCount} season{hero.seasonCount > 1 ? 's' : ''}
                    </span>
                  </>
                ) : null}
              </div>
              <div className="bd-hero-genres">
                {hero.genres.map((g) => (
                  <span key={g} className="bd-genre-pill">
                    {g}
                  </span>
                ))}
              </div>
              <p className="bd-hero-overview">{hero.overview}</p>
              <div className="bd-hero-actions">
                <button className="bd-btn bd-btn-primary" onClick={() => handleSelect(hero)}>
                  <PlayIcon /> Watch Now
                </button>
                <button className="bd-btn bd-btn-secondary" onClick={() => handleSelect(hero)}>
                  <InfoIcon /> More Info
                </button>
              </div>
            </div>
            <div className="bd-hero-indicators">
              {heroItems.map((_, i) => (
                <button
                  key={i}
                  className={`bd-hero-indicator ${i === heroIdx ? 'bd-active' : ''}`}
                  onClick={() => setHeroIdx(i)}
                  aria-label={`${category.label} ${i + 1}`}
                />
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

        {/* ── Other categories ── */}
        <nav className="bd-cat-chips" aria-label="Categories">
          <Link href="/Bored" className="bd-cat-chip">
            All
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/Bored/category/${c.slug}`}
              className={`bd-cat-chip ${c.slug === category.slug ? 'bd-cat-chip-active' : ''}`}
            >
              {c.label}
            </Link>
          ))}
        </nav>

        <div id="browse">
          {initialLoading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
            : rows.map((row, i) => (
                <MediaRow
                  key={`${row.title}-${i}`}
                  title={row.title}
                  items={row.items}
                  onSelect={handleSelect}
                  onWatchlistChange={handleWatchlistChange}
                />
              ))}
        </div>

        {!allLoaded && !initialLoading && (
          <div ref={sentinelRef} className="bd-sentinel">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}
        {allLoaded && <div className="bd-end-message">You&apos;re all caught up.</div>}

        <footer className="bd-footer" role="contentinfo">
          <span className="bd-footer-text">© 2025 Vidaant</span>
          <span className="bd-footer-text">Powered by TMDB</span>
        </footer>
      </div>

      <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}
