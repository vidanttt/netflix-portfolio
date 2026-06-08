'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { WatchlistItem, MediaItem } from '../lib/types';
import { getWatchlist, removeFromWatchlist, onWatchlistChange } from '../lib/storage';
import { StarIcon, CloseIcon } from '../lib/icons';

export default function WatchlistRow() {
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[]>([]);

  const refresh = useCallback(() => {
    setItems(getWatchlist());
  }, []);

  useEffect(() => {
    refresh();
    const unsub = onWatchlistChange(refresh);
    return () => { unsub(); };
  }, [refresh]);

  const handleSelect = (item: WatchlistItem) => {
    router.push(`/Bored/${item.mediaType}/${item.tmdbId}`);
  };

  const handleRemove = (e: React.MouseEvent, item: WatchlistItem) => {
    e.stopPropagation();
    removeFromWatchlist(item.tmdbId, item.mediaType);
  };

  if (items.length === 0) return null;

  return (
    <section className="bd-row" aria-label="My Watchlist">
      <div className="bd-row-header">
        <h2 className="bd-row-title">My Watchlist</h2>
        <span className="bd-row-count">{items.length} titles</span>
      </div>
      <div className="bd-row-scroll" role="list">
        {items.map((item) => (
          <div
            key={`wl-${item.tmdbId}-${item.mediaType}`}
            className="bd-card"
            role="listitem"
            onClick={() => handleSelect(item)}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSelect(item); }}
          >
            <div className="bd-card-poster-wrap">
              {item.mediaType === 'tv' && <span className="bd-badge">TV</span>}
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
                  <button
                    className="bd-card-action-btn"
                    aria-label="Remove from watchlist"
                    onClick={(e) => handleRemove(e, item)}
                  >
                    <CloseIcon />
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
        ))}
      </div>
    </section>
  );
}
