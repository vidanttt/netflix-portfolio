'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { MediaItem } from '../lib/types';
import { StarIcon, PlusIcon, HeartIcon, InfoIcon, BookmarkIcon, BookmarkFilledIcon } from '../lib/icons';
import { isInWatchlist, toggleWatchlist } from '../lib/storage';

/* ── Skeleton ── */
export function SkeletonCard() {
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

/* ── Media Card ── */
export default function MediaCard({
  item,
  onSelect,
  onWatchlistChange,
}: {
  item: MediaItem;
  onSelect?: (m: MediaItem) => void;
  onWatchlistChange?: () => void;
}) {
  const router = useRouter();
  const inWatchlist = isInWatchlist(item.id, item.mediaType);

  const handleClick = () => {
    if (onSelect) onSelect(item);
  };

  const handleWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWatchlist({
      tmdbId: item.id,
      mediaType: item.mediaType,
      poster: item.poster,
      backdrop: item.backdrop,
      title: item.title,
      year: item.year,
      rating: item.rating,
      genres: item.genres,
      addedAt: Date.now(),
    });
    onWatchlistChange?.();
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.mediaType === 'movie') {
      router.push(`/Bored/watch/movie/${item.id}`);
    } else {
      router.push(`/Bored/watch/tv/${item.id}/1/1`);
    }
  };

  const handleInfo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) onSelect(item);
  };

  return (
    <div
      className="bd-card"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${item.title}, rated ${item.rating}`}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
    >
      <div className="bd-card-poster-wrap">
        {item.mediaType === 'tv' && (
          <span className="bd-badge">TV</span>
        )}
        <img
          className="bd-card-poster"
          src={item.poster}
          alt={item.title}
          loading="lazy"
          draggable={false}
        />
        <div className="bd-card-overlay">
          <div className="bd-card-overlay-rating">
            <StarIcon /> {item.rating.toFixed(1)}
          </div>
          <div className="bd-card-overlay-title">{item.title}</div>
          <div className="bd-card-overlay-meta">
            <span>{item.year}</span>
            {item.genres[0] && <span>{item.genres[0]}</span>}
          </div>
          <div className="bd-card-overlay-actions">
            <button className="bd-card-action-btn" aria-label="Play" onClick={handlePlay}>
              <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
            </button>
            <button
              className={`bd-card-action-btn ${inWatchlist ? 'bd-card-action-active' : ''}`}
              aria-label={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
              onClick={handleWatchlist}
            >
              {inWatchlist ? <BookmarkFilledIcon /> : <BookmarkIcon />}
            </button>
            <button className="bd-card-action-btn" aria-label="More info" onClick={handleInfo}>
              <InfoIcon />
            </button>
          </div>
        </div>
      </div>
      <div className="bd-card-info">
        <h3 className="bd-card-title">{item.title}</h3>
        <div className="bd-card-meta">
          <span className="bd-card-year">{item.year}</span>
          <span className="bd-card-rating-small"><StarIcon /> {item.rating.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
