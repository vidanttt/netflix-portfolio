'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { TMDBMovieDetail, TMDBMovie, MediaItem } from '../../../lib/types';
import { tmdb, normalizeMovieDetail, normalizeMovie } from '../../../lib/tmdb';
import { StarIcon, ArrowLeftIcon } from '../../../lib/icons';
import PlayerEmbed from '../../../components/PlayerEmbed';
import MediaRow from '../../../components/MediaRow';
import '../../../bored.css';

export default function WatchMoviePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [movie, setMovie] = useState<MediaItem | null>(null);
  const [recs, setRecs] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    tmdb(`movie/${id}`, { append_to_response: 'recommendations' })
      .then((d: TMDBMovieDetail) => {
        if (cancelled) return;
        setMovie(normalizeMovieDetail(d));
        setRecs(
          (d.recommendations?.results || [])
            .filter((r: TMDBMovie) => r.poster_path)
            .slice(0, 20)
            .map(normalizeMovie)
        );
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id]);

  const handleSelectRec = (m: MediaItem) => {
    if (m.mediaType === 'movie') {
      router.push(`/Bored/watch/movie/${m.id}`);
    } else {
      router.push(`/Bored/${m.mediaType}/${m.id}`);
    }
  };

  if (loading || !movie) {
    return (
      <div className="bd-page bd-watch-page">
        <div className="bd-noise" aria-hidden="true" />
        <div className="bd-detail-loading">
          <div className="bd-trailer-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="bd-page bd-watch-page">
      <div className="bd-noise" aria-hidden="true" />

      {/* Back button */}
      <button className="bd-back-btn" onClick={() => router.back()} aria-label="Go back">
        <ArrowLeftIcon />
      </button>

      {/* Player */}
      <PlayerEmbed
        tmdbId={movie.id}
        mediaType="movie"
        title={movie.title}
        poster={movie.poster}
        backdrop={movie.backdrop}
      />

      {/* Metadata */}
      <div className="bd-watch-meta">
        <h1 className="bd-watch-title">{movie.title}</h1>
        <div className="bd-modal-meta">
          <span className="bd-modal-rating"><StarIcon /> {movie.rating.toFixed(1)}</span>
          <span className="bd-hero-dot" />
          <span className="bd-modal-meta-text">{movie.year}</span>
          {movie.runtime && (
            <><span className="bd-hero-dot" /><span className="bd-modal-meta-text">{movie.runtime}</span></>
          )}
        </div>
        <div className="bd-modal-genres">
          {movie.genres.map((g) => <span key={g} className="bd-genre-pill">{g}</span>)}
        </div>
        <p className="bd-watch-overview">{movie.overview}</p>
        {movie.director && (
          <div className="bd-detail-credit">
            <span className="bd-modal-detail-label">Director</span>
            <span className="bd-modal-detail-value">{movie.director}</span>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recs.length > 0 && (
        <MediaRow title="Recommendations" items={recs} onSelect={handleSelectRec} />
      )}

      <footer className="bd-footer" role="contentinfo">
        <span className="bd-footer-text">© 2025 Vidaant</span>
        <span className="bd-footer-text">Powered by TMDB</span>
      </footer>
    </div>
  );
}
