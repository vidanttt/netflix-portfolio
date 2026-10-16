'use client';

import React, { useRef, useState, useCallback, useLayoutEffect } from 'react';
import { revealRow } from '../lib/motion';
import type { MediaItem } from '../lib/types';
import MediaCard, { SkeletonCard } from './MediaCard';
import { ChevronLeftIcon, ChevronRightIcon } from '../lib/icons';

/* ── Skeleton Row ── */
export function SkeletonRow() {
  return (
    <section className="bd-row" aria-hidden="true">
      <div className="bd-row-header">
        <div className="bd-skeleton-text" style={{ width: 140, height: 18 }} />
      </div>
      <div className="bd-row-scroll">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </section>
  );
}

/* ── Media Row ── */
export default function MediaRow({
  title,
  items,
  onSelect,
  id,
  onWatchlistChange,
}: {
  title: string;
  items: MediaItem[];
  onSelect: (m: MediaItem) => void;
  id?: string;
  onWatchlistChange?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const row = sectionRef.current;
    const scroller = scrollRef.current;
    if (!row || !scroller) return;
    return revealRow(row, row.querySelector('.bd-row-title'), scroller.querySelectorAll('.bd-card'));
    // only on first mount of the row; later item updates keep their own state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 20);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 20);
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
  };

  if (items.length === 0) return null;

  return (
    <section className="bd-row" aria-label={title} id={id} ref={sectionRef}>
      <div className="bd-row-header">
        <h2 className="bd-row-title">{title}</h2>
        <span className="bd-row-count">{items.length} titles</span>
      </div>
      <div className="bd-row-container">
        {showLeft && (
          <button
            className="bd-row-arrow bd-row-arrow-left"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
          >
            <ChevronLeftIcon />
          </button>
        )}
        <div
          className="bd-row-scroll"
          role="list"
          ref={scrollRef}
          onScroll={updateArrows}
        >
          {items.map((m) => (
            <div key={`${m.id}-${m.mediaType}-${title}`} role="listitem">
              <MediaCard item={m} onSelect={onSelect} onWatchlistChange={onWatchlistChange} />
            </div>
          ))}
        </div>
        {showRight && (
          <button
            className="bd-row-arrow bd-row-arrow-right"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
          >
            <ChevronRightIcon />
          </button>
        )}
      </div>
    </section>
  );
}
