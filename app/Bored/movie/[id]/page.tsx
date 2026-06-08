'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { TMDBMovieDetail, TMDBMovie, MediaItem, CastMember, TrailerInfo } from '../../lib/types';
import {
  tmdb, normalizeMovieDetail, normalizeMovie, normalizeCast, findTrailer, backdropUrl,
} from '../../lib/tmdb';
import { isInWatchlist, toggleWatchlist } from '../../lib/storage';
import {
  StarIcon, PlayIcon, ArrowLeftIcon, BookmarkIcon, BookmarkFilledIcon,
} from '../../lib/icons';
import MediaRow from '../../components/MediaRow';
import TrailerModal from '../../components/TrailerModal';
import '../../bored.css';

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [movie, setMovie] = useState<MediaItem | null>(null);
  const [castList, setCastList] = useState<CastMember[]>([]);
  const [trailer, setTrailer] = useState<TrailerInfo | null>(null);
  const [recs, setRecs] = useState<MediaItem[]>([]);
  const [similar, setSimilar] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const d: TMDBMovieDetail = await tmdb(`movie/${id}`, {
          append_to_response: 'credits,videos,recommendations,similar',
        });
        if (cancelled) return;
        setMovie(normalizeMovieDetail(d));
        setCastList(normalizeCast(d.credits?.cast || []));
        setTrailer(findTrailer(d.videos?.results || []));
        setRecs(
          (d.recommendations?.results || [])
            .filter((r: TMDBMovie) => r.poster_path)
            .slice(0, 20)
            .map(normalizeMovie)
        );
        setSimilar(
          (d.similar?.results || [])
            .filter((r: TMDBMovie) => r.poster_path)
            .slice(0, 20)
            .map(normalizeMovie)
        );
        setInWatchlist(isInWatchlist(d.id, 'movie'));
      } catch (err) {
        console.error('[Bored] Movie detail fetch failed:', err);
        if (cancelled) return;
        // Retry with simpler request
        try {
          const d: TMDBMovieDetail = await tmdb(`movie/${id}`);
          if (cancelled) return;
          setMovie(normalizeMovieDetail(d));
        } catch (retryErr) {
          console.error('[Bored] Movie detail retry also failed:', retryErr);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  const handleWatch = () => {
    router.push(`/Bored/watch/movie/${id}`);
  };

  const handleToggleWatchlist = () => {
    if (!movie) return;
    const added = toggleWatchlist({
      tmdbId: movie.id,
      mediaType: 'movie',
      poster: movie.poster,
      backdrop: movie.backdrop,
      title: movie.title,
      year: movie.year,
      rating: movie.rating,
      genres: movie.genres,
      addedAt: Date.now(),
    });
    setInWatchlist(added);
  };

  const handleSelectRec = (m: MediaItem) => {
    router.push(`/Bored/${m.mediaType}/${m.id}`);
  };

  if (loading) {
    return (
      <div className="bd-page">
        <div className="bd-noise" aria-hidden="true" />
        <div className="bd-detail-loading">
          <div className="bd-trailer-spinner" />
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="bd-page">
        <div className="bd-noise" aria-hidden="true" />
        <div className="bd-detail-loading">
          <p>Movie not found</p>
          <button className="bd-btn bd-btn-secondary" onClick={() => router.push('/Bored')}>
            Back to Browse
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bd-page">
      <div className="bd-noise" aria-hidden="true" />

      {/* Back button */}
      <button className="bd-back-btn" onClick={() => router.back()} aria-label="Go back">
        <ArrowLeftIcon />
      </button>

      {/* Hero Backdrop */}
      <div className="bd-detail-hero">
        <img className="bd-detail-hero-img" src={movie.backdrop} alt="" draggable={false} />
        <div className="bd-detail-hero-gradient" />
        <div className="bd-detail-hero-gradient-left" />
      </div>

      {/* Content */}
      <div className="bd-detail-content">
        <div className="bd-detail-poster-col">
          <img className="bd-detail-poster" src={movie.poster} alt={movie.title} draggable={false} />
        </div>

        <div className="bd-detail-info">
          <h1 className="bd-detail-title">{movie.title}</h1>

          <div className="bd-modal-meta">
            <span className="bd-modal-rating"><StarIcon /> {movie.rating.toFixed(1)}</span>
            <span className="bd-hero-dot" />
            <span className="bd-modal-meta-text">{movie.year}</span>
            {movie.runtime && (
              <><span className="bd-hero-dot" /><span className="bd-modal-meta-text">{movie.runtime}</span></>
            )}
            {movie.language && (
              <><span className="bd-hero-dot" /><span className="bd-modal-meta-text">{movie.language}</span></>
            )}
          </div>

          <div className="bd-modal-genres">
            {movie.genres.map((g) => <span key={g} className="bd-genre-pill">{g}</span>)}
          </div>

          <p className="bd-detail-overview">{movie.overview}</p>

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

          {/* Director */}
          {movie.director && (
            <div className="bd-detail-credit">
              <span className="bd-modal-detail-label">Director</span>
              <span className="bd-modal-detail-value">{movie.director}</span>
            </div>
          )}
        </div>
      </div>

      {/* Cast */}
      {castList.length > 0 && (
        <div className="bd-detail-section">
          <h2 className="bd-row-title">Cast</h2>
          <div className="bd-detail-cast-grid">
            {castList.slice(0, 12).map((c) => (
              <div key={c.id} className="bd-detail-cast-card">
                {c.photo ? (
                  <img className="bd-detail-cast-photo" src={c.photo} alt={c.name} loading="lazy" draggable={false} />
                ) : (
                  <div className="bd-detail-cast-photo bd-detail-cast-placeholder" />
                )}
                <span className="bd-detail-cast-name">{c.name}</span>
                <span className="bd-detail-cast-char">{c.character}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <MediaRow title="Recommendations" items={recs} onSelect={handleSelectRec} />
      )}

      {/* Similar */}
      {similar.length > 0 && (
        <MediaRow title="Similar Movies" items={similar} onSelect={handleSelectRec} />
      )}

      {/* Footer */}
      <footer className="bd-footer" role="contentinfo">
        <span className="bd-footer-text">© 2025 Vidaant</span>
        <span className="bd-footer-text">Powered by TMDB</span>
      </footer>

      {/* Trailer modal */}
      {trailerOpen && (
        <TrailerModal mediaType="movie" tmdbId={movie.id} onClose={() => setTrailerOpen(false)} />
      )}
    </div>
  );
}
