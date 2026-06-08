'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { MediaItem, TMDBMovieDetail, TMDBTVDetail, TMDBMovie, TMDBTVShow } from '../lib/types';
import {
  tmdb, normalizeMovieDetail, normalizeTVDetail,
  normalizeMovie, normalizeTVShow, normalizeCast, findTrailer,
  backdropUrl,
} from '../lib/tmdb';
import { isInWatchlist, toggleWatchlist } from '../lib/storage';
import {
  StarIcon, CloseIcon, PlayIcon, BookmarkIcon, BookmarkFilledIcon,
} from '../lib/icons';
import type { CastMember, TrailerInfo } from '../lib/types';
import TrailerModal from './TrailerModal';

export default function DetailModal({
  item,
  onClose,
}: {
  item: MediaItem | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<MediaItem | null>(null);
  const [castList, setCastList] = useState<CastMember[]>([]);
  const [trailer, setTrailer] = useState<TrailerInfo | null>(null);
  const [recs, setRecs] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    if (!item) {
      setDetail(null);
      setCastList([]);
      setTrailer(null);
      setRecs([]);
      return;
    }
    setLoading(true);
    setInWatchlist(isInWatchlist(item.id, item.mediaType));

    const endpoint = item.mediaType === 'movie'
      ? `movie/${item.id}`
      : `tv/${item.id}`;

    tmdb(endpoint, { append_to_response: 'credits,videos,recommendations' })
      .then((d) => {
        if (item.mediaType === 'movie') {
          const det = d as TMDBMovieDetail;
          setDetail(normalizeMovieDetail(det));
          setCastList(normalizeCast(det.credits?.cast || []));
          setTrailer(findTrailer(det.videos?.results || []));
          setRecs(
            (det.recommendations?.results || [])
              .filter((r: TMDBMovie) => r.poster_path)
              .slice(0, 10)
              .map(normalizeMovie)
          );
        } else {
          const det = d as TMDBTVDetail;
          setDetail(normalizeTVDetail(det));
          setCastList(normalizeCast(det.credits?.cast || []));
          setTrailer(findTrailer(det.videos?.results || []));
          setRecs(
            (det.recommendations?.results || [])
              .filter((r: TMDBTVShow) => r.poster_path)
              .slice(0, 10)
              .map(normalizeTVShow)
          );
        }
      })
      .catch(() => setDetail(item))
      .finally(() => setLoading(false));

    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [item, onClose]);

  const m = detail || item;

  const handleWatch = () => {
    if (!m) return;
    onClose();
    if (m.mediaType === 'movie') {
      router.push(`/Bored/watch/movie/${m.id}`);
    } else {
      router.push(`/Bored/watch/tv/${m.id}/1/1`);
    }
  };

  const handleDetail = () => {
    if (!m) return;
    onClose();
    router.push(`/Bored/${m.mediaType}/${m.id}`);
  };

  const handleToggleWatchlist = () => {
    if (!m) return;
    const added = toggleWatchlist({
      tmdbId: m.id,
      mediaType: m.mediaType,
      poster: m.poster,
      backdrop: m.backdrop,
      title: m.title,
      year: m.year,
      rating: m.rating,
      genres: m.genres,
      addedAt: Date.now(),
    });
    setInWatchlist(added);
  };

  const handleRecSelect = (rec: MediaItem) => {
    onClose();
    router.push(`/Bored/${rec.mediaType}/${rec.id}`);
  };

  return (
    <>
      <div
        className={`bd-modal-backdrop ${item ? 'bd-modal-open' : ''}`}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={m?.title || ''}
      >
        {m && (
          <div className="bd-modal" onClick={(e) => e.stopPropagation()}>
            <img className="bd-modal-backdrop-img" src={m.backdrop} alt="" draggable={false} />
            <div className="bd-modal-gradient" />
            <button className="bd-modal-close" onClick={onClose} aria-label="Close"><CloseIcon /></button>
            <div className="bd-modal-body">
              <h2 className="bd-modal-title">{m.title}</h2>
              <div className="bd-modal-meta">
                <span className="bd-modal-rating"><StarIcon /> {m.rating.toFixed(1)}</span>
                <span className="bd-hero-dot" />
                <span className="bd-modal-meta-text">{m.year}</span>
                {m.runtime && (
                  <><span className="bd-hero-dot" /><span className="bd-modal-meta-text">{m.runtime}</span></>
                )}
                {m.language && (
                  <><span className="bd-hero-dot" /><span className="bd-modal-meta-text">{m.language}</span></>
                )}
                {m.mediaType === 'tv' && m.seasonCount && (
                  <><span className="bd-hero-dot" /><span className="bd-modal-meta-text">{m.seasonCount} Season{m.seasonCount > 1 ? 's' : ''}</span></>
                )}
                {loading && <span className="bd-modal-meta-text" style={{ opacity: 0.4 }}>Loading…</span>}
              </div>
              <div className="bd-modal-genres">
                {m.genres.map((g) => <span key={g} className="bd-genre-pill">{g}</span>)}
              </div>
              <p className="bd-modal-overview">{m.overview}</p>

              <div className="bd-modal-actions">
                <button className="bd-btn bd-btn-primary" onClick={handleWatch}>
                  <PlayIcon /> Watch Now
                </button>
                {trailer && (
                  <button className="bd-btn bd-btn-secondary" onClick={() => setTrailerOpen(true)}>
                    <PlayIcon /> Trailer
                  </button>
                )}
                <button className="bd-btn bd-btn-secondary" onClick={handleToggleWatchlist}>
                  {inWatchlist ? <BookmarkFilledIcon /> : <BookmarkIcon />}
                  {inWatchlist ? 'In Watchlist' : 'Watchlist'}
                </button>
              </div>

              {/* Cast */}
              {castList.length > 0 && (
                <div className="bd-modal-cast-section">
                  <div className="bd-modal-detail-label">Cast</div>
                  <div className="bd-modal-cast-row">
                    {castList.slice(0, 8).map((c) => (
                      <div key={c.id} className="bd-modal-cast-card">
                        {c.photo && (
                          <img src={c.photo} alt={c.name} className="bd-modal-cast-photo" loading="lazy" draggable={false} />
                        )}
                        <span className="bd-modal-cast-name">{c.name}</span>
                        <span className="bd-modal-cast-char">{c.character}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detail row */}
              {(m.director || m.cast) && (
                <div className="bd-modal-detail-row">
                  {m.director && (
                    <div>
                      <div className="bd-modal-detail-label">{m.mediaType === 'tv' ? 'Created by' : 'Director'}</div>
                      <div className="bd-modal-detail-value">{m.director}</div>
                    </div>
                  )}
                </div>
              )}

              {/* More info link */}
              <button className="bd-btn bd-btn-secondary bd-modal-more-info" onClick={handleDetail}>
                View Full Details →
              </button>

              {/* Recommendations */}
              {recs.length > 0 && (
                <div className="bd-modal-recs">
                  <div className="bd-modal-detail-label">More Like This</div>
                  <div className="bd-modal-recs-grid">
                    {recs.map((rec) => (
                      <div
                        key={`${rec.id}-${rec.mediaType}`}
                        className="bd-search-card"
                        onClick={() => handleRecSelect(rec)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRecSelect(rec); }}
                      >
                        <div className="bd-search-card-poster-wrap">
                          {rec.mediaType === 'tv' && <span className="bd-badge">TV</span>}
                          <img className="bd-search-card-poster" src={rec.poster} alt={rec.title} loading="lazy" draggable={false} />
                        </div>
                        <div className="bd-search-card-info">
                          <span className="bd-search-card-title">{rec.title}</span>
                          <div className="bd-search-card-meta">
                            <span>{rec.year}</span>
                            <span className="bd-search-card-star"><StarIcon /> {rec.rating.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Trailer modal */}
      {trailerOpen && m && (
        <TrailerModal
          mediaType={m.mediaType}
          tmdbId={m.id}
          onClose={() => setTrailerOpen(false)}
        />
      )}
    </>
  );
}
