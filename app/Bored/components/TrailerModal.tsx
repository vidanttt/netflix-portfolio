'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { TrailerInfo, TMDBVideo } from '../lib/types';
import { tmdb, findTrailer } from '../lib/tmdb';
import { CloseIcon } from '../lib/icons';

export default function TrailerModal({
  mediaType,
  tmdbId,
  onClose,
}: {
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  onClose: () => void;
}) {
  const [trailer, setTrailer] = useState<TrailerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    const endpoint = mediaType === 'movie' ? `movie/${tmdbId}/videos` : `tv/${tmdbId}/videos`;
    tmdb(endpoint)
      .then((data: { results: TMDBVideo[] }) => {
        if (cancelled) return;
        const found = findTrailer(data.results || []);
        if (found) {
          setTrailer(found);
        } else {
          setError(true);
        }
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [mediaType, tmdbId]);

  /* Escape key */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="bd-trailer-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Trailer">
      <div className="bd-trailer-modal" onClick={(e) => e.stopPropagation()}>
        <button className="bd-trailer-close" onClick={onClose} aria-label="Close trailer">
          <CloseIcon />
        </button>
        {loading && (
          <div className="bd-trailer-loading">
            <div className="bd-trailer-spinner" />
            <span>Loading trailer…</span>
          </div>
        )}
        {error && !loading && (
          <div className="bd-trailer-loading">
            <span>No trailer available</span>
          </div>
        )}
        {trailer && !loading && (
          <div className="bd-trailer-iframe-wrap">
            <iframe
              className="bd-trailer-iframe"
              src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0&modestbranding=1`}
              title={trailer.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              frameBorder="0"
            />
          </div>
        )}
      </div>
    </div>
  );
}
