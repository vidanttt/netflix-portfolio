'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ContinueWatchingItem } from '../lib/types';
import { getContinueWatching, removeContinueWatching, onContinueWatchingChange } from '../lib/storage';
import { relativeTime } from '../lib/tmdb';
import { PlayIcon, CloseIcon } from '../lib/icons';

export default function ContinueWatchingRow() {
  const router = useRouter();
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);

  const refresh = useCallback(() => {
    setItems(getContinueWatching());
  }, []);

  useEffect(() => {
    refresh();
    const unsub = onContinueWatchingChange(refresh);
    return () => { unsub(); };
  }, [refresh]);

  const handleResume = (item: ContinueWatchingItem) => {
    if (item.mediaType === 'movie') {
      router.push(`/Bored/watch/movie/${item.tmdbId}`);
    } else {
      router.push(`/Bored/watch/tv/${item.tmdbId}/${item.season || 1}/${item.episode || 1}`);
    }
  };

  const handleRemove = (e: React.MouseEvent, item: ContinueWatchingItem) => {
    e.stopPropagation();
    removeContinueWatching(item.tmdbId, item.mediaType);
  };

  if (items.length === 0) return null;

  return (
    <section className="bd-row" aria-label="Continue Watching">
      <div className="bd-row-header">
        <h2 className="bd-row-title">Continue Watching</h2>
        <span className="bd-row-count">{items.length} titles</span>
      </div>
      <div className="bd-row-scroll" role="list">
        {items.map((item) => {
          const progressPct = item.duration > 0
            ? Math.min(100, Math.round((item.progress / item.duration) * 100))
            : 0;

          return (
            <div
              key={`cw-${item.tmdbId}-${item.mediaType}`}
              className="bd-cw-card"
              role="listitem"
              onClick={() => handleResume(item)}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') handleResume(item); }}
            >
              <div className="bd-cw-poster-wrap">
                <img
                  className="bd-cw-backdrop"
                  src={item.backdrop}
                  alt={item.title}
                  loading="lazy"
                  draggable={false}
                />
                <div className="bd-cw-overlay">
                  <button className="bd-cw-resume" aria-label="Resume">
                    <PlayIcon />
                  </button>
                  <button
                    className="bd-cw-remove"
                    aria-label="Remove"
                    onClick={(e) => handleRemove(e, item)}
                  >
                    <CloseIcon />
                  </button>
                </div>
                <div className="bd-cw-progress-bar">
                  <div className="bd-cw-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
              <div className="bd-cw-info">
                <span className="bd-cw-title">{item.title}</span>
                {item.episodeTitle && (
                  <span className="bd-cw-episode">{item.episodeTitle}</span>
                )}
                <span className="bd-cw-time">{relativeTime(item.timestamp)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
