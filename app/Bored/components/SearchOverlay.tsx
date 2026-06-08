'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { MediaItem, TMDBMultiResult } from '../lib/types';
import { tmdb, normalizeMultiResult } from '../lib/tmdb';
import { SearchIcon, CloseIcon, StarIcon } from '../lib/icons';

export default function SearchOverlay({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (item: MediaItem) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const queryRef = useRef('');
  const pageRef = useRef(1);

  /* ── Focus input on open ── */
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  /* ── Escape key ── */
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  /* ── Multi-search ── */
  const doSearch = useCallback(async (q: string, p: number, append: boolean) => {
    if (!q.trim()) { setResults([]); setTotal(0); return; }
    setLoading(true);
    try {
      const data = await tmdb('search/multi', {
        query: q, page: String(p), include_adult: 'false',
      });
      if (data.results) {
        const items = (data.results as TMDBMultiResult[])
          .filter((r) => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path)
          .map(normalizeMultiResult)
          .filter(Boolean) as MediaItem[];
        setResults((prev) => append ? [...prev, ...items] : items);
        setTotal(data.total_results || 0);
      }
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    queryRef.current = q;
    setPage(1);
    pageRef.current = 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q.trim()) { setResults([]); setTotal(0); return; }
    timerRef.current = setTimeout(() => doSearch(q, 1, false), 300);
  }, [doSearch]);

  /* ── Infinite scroll ── */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !open) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !loading && results.length < total) {
        const next = pageRef.current + 1;
        pageRef.current = next;
        setPage(next);
        doSearch(queryRef.current, next, true);
      }
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [open, loading, results.length, total, doSearch]);

  const handleSelect = (item: MediaItem) => {
    onSelect(item);
    setQuery('');
    setResults([]);
    setPage(1);
    queryRef.current = '';
    pageRef.current = 1;
  };

  const handleClose = () => {
    onClose();
    setQuery('');
    setResults([]);
    setPage(1);
    queryRef.current = '';
    pageRef.current = 1;
  };

  if (!open) return null;

  return (
    <div className="bd-search-overlay" onClick={handleClose}>
      <div className="bd-search-glass" onClick={(e) => e.stopPropagation()}>
        {/* Search bar */}
        <div className="bd-search-bar">
          <div className="bd-search-bar-icon"><SearchIcon /></div>
          <input
            ref={inputRef}
            className="bd-search-bar-input"
            type="text"
            placeholder="Search movies & TV shows..."
            value={query}
            onChange={handleChange}
            aria-label="Search movies and TV shows"
            autoComplete="off"
            spellCheck={false}
          />
          <button className="bd-search-bar-close" onClick={handleClose} aria-label="Close search">
            <CloseIcon />
          </button>
        </div>

        {/* Results */}
        <div className="bd-search-results-glass">
          {query.trim() ? (
            <>
              {results.length > 0 && (
                <div className="bd-search-meta-bar">
                  <span>{total.toLocaleString()} results</span>
                </div>
              )}
              <div className="bd-search-grid">
                {results.map((m) => (
                  <div
                    key={`${m.id}-${m.mediaType}`}
                    className="bd-search-card"
                    onClick={() => handleSelect(m)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSelect(m); }}
                  >
                    <div className="bd-search-card-poster-wrap">
                      {m.mediaType === 'tv' && <span className="bd-badge">TV</span>}
                      <img
                        className="bd-search-card-poster"
                        src={m.poster}
                        alt={m.title}
                        loading="lazy"
                        draggable={false}
                      />
                    </div>
                    <div className="bd-search-card-info">
                      <span className="bd-search-card-title">{m.title}</span>
                      <div className="bd-search-card-meta">
                        <span>{m.year}</span>
                        <span className="bd-search-card-star">
                          <StarIcon /> {m.rating.toFixed(1)}
                        </span>
                      </div>
                      <span className="bd-search-card-genre">
                        {m.genres.slice(0, 2).join(' · ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {results.length < total && (
                <div ref={sentinelRef} className="bd-search-more">
                  {loading ? 'Loading more…' : 'Scroll for more'}
                </div>
              )}
              {results.length === 0 && !loading && (
                <div className="bd-search-empty">
                  <p>No results for &ldquo;{query}&rdquo;</p>
                  <p className="bd-search-empty-hint">Try different keywords or check the spelling</p>
                </div>
              )}
              {loading && results.length === 0 && (
                <div className="bd-search-more">Searching…</div>
              )}
            </>
          ) : (
            <div className="bd-search-empty">
              <p>Search any movie or TV show</p>
              <p className="bd-search-empty-hint">Search by title — typos are fine</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
