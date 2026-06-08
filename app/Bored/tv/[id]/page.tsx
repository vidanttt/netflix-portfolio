'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type {
  TMDBTVDetail, TMDBTVShow, TMDBEpisode, TMDBSeasonDetail,
  MediaItem, CastMember, TrailerInfo,
} from '../../lib/types';
import {
  tmdb, normalizeTVDetail, normalizeTVShow, normalizeCast, findTrailer,
  stillUrl, fmtRuntime, fmtDate,
} from '../../lib/tmdb';
import { isInWatchlist, toggleWatchlist } from '../../lib/storage';
import {
  StarIcon, PlayIcon, ArrowLeftIcon, BookmarkIcon, BookmarkFilledIcon,
  ChevronDownIcon,
} from '../../lib/icons';
import MediaRow from '../../components/MediaRow';
import TrailerModal from '../../components/TrailerModal';
import '../../bored.css';

export default function TVDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [show, setShow] = useState<MediaItem | null>(null);
  const [seasons, setSeasons] = useState<{ season_number: number; name: string; episode_count: number }[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [castList, setCastList] = useState<CastMember[]>([]);
  const [trailer, setTrailer] = useState<TrailerInfo | null>(null);
  const [recs, setRecs] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);

  /* ── Load show details ── */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const d: TMDBTVDetail = await tmdb(`tv/${id}`, {
          append_to_response: 'credits,videos,recommendations',
        });
        if (cancelled) return;
        setShow(normalizeTVDetail(d));
        setCastList(normalizeCast(d.credits?.cast || []));
        setTrailer(findTrailer(d.videos?.results || []));
        setRecs(
          (d.recommendations?.results || [])
            .filter((r: TMDBTVShow) => r.poster_path)
            .slice(0, 20)
            .map(normalizeTVShow)
        );
        const realSeasons = (d.seasons || [])
          .filter((s) => s.season_number > 0)
          .map((s) => ({
            season_number: s.season_number,
            name: s.name,
            episode_count: s.episode_count,
          }));
        setSeasons(realSeasons);
        if (realSeasons.length > 0) {
          setSelectedSeason(realSeasons[0].season_number);
        }
        setInWatchlist(isInWatchlist(d.id, 'tv'));
      } catch (err) {
        console.error('[Bored] TV detail fetch failed:', err);
        if (cancelled) return;
        try {
          const d: TMDBTVDetail = await tmdb(`tv/${id}`);
          if (cancelled) return;
          setShow(normalizeTVDetail(d));
        } catch (retryErr) {
          console.error('[Bored] TV detail retry also failed:', retryErr);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  /* ── Load episodes when season changes ── */
  useEffect(() => {
    if (!id || !selectedSeason) return;
    let cancelled = false;
    setEpisodesLoading(true);

    tmdb(`tv/${id}/season/${selectedSeason}`)
      .then((data: TMDBSeasonDetail) => {
        if (cancelled) return;
        setEpisodes(data.episodes || []);
      })
      .catch(() => { if (!cancelled) setEpisodes([]); })
      .finally(() => { if (!cancelled) setEpisodesLoading(false); });

    return () => { cancelled = true; };
  }, [id, selectedSeason]);

  const handleWatch = (season: number, episode: number) => {
    router.push(`/Bored/watch/tv/${id}/${season}/${episode}`);
  };

  const handleToggleWatchlist = () => {
    if (!show) return;
    const added = toggleWatchlist({
      tmdbId: show.id,
      mediaType: 'tv',
      poster: show.poster,
      backdrop: show.backdrop,
      title: show.title,
      year: show.year,
      rating: show.rating,
      genres: show.genres,
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

  if (!show) {
    return (
      <div className="bd-page">
        <div className="bd-noise" aria-hidden="true" />
        <div className="bd-detail-loading">
          <p>Show not found</p>
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

      <button className="bd-back-btn" onClick={() => router.back()} aria-label="Go back">
        <ArrowLeftIcon />
      </button>

      {/* Hero Backdrop */}
      <div className="bd-detail-hero">
        <img className="bd-detail-hero-img" src={show.backdrop} alt="" draggable={false} />
        <div className="bd-detail-hero-gradient" />
        <div className="bd-detail-hero-gradient-left" />
      </div>

      {/* Content */}
      <div className="bd-detail-content">
        <div className="bd-detail-poster-col">
          <img className="bd-detail-poster" src={show.poster} alt={show.title} draggable={false} />
        </div>

        <div className="bd-detail-info">
          <h1 className="bd-detail-title">{show.title}</h1>

          <div className="bd-modal-meta">
            <span className="bd-modal-rating"><StarIcon /> {show.rating.toFixed(1)}</span>
            <span className="bd-hero-dot" />
            <span className="bd-modal-meta-text">{show.year}</span>
            {show.seasonCount && (
              <><span className="bd-hero-dot" /><span className="bd-modal-meta-text">{show.seasonCount} Season{show.seasonCount > 1 ? 's' : ''}</span></>
            )}
            {show.runtime && (
              <><span className="bd-hero-dot" /><span className="bd-modal-meta-text">{show.runtime}</span></>
            )}
            {show.language && (
              <><span className="bd-hero-dot" /><span className="bd-modal-meta-text">{show.language}</span></>
            )}
          </div>

          <div className="bd-modal-genres">
            {show.genres.map((g) => <span key={g} className="bd-genre-pill">{g}</span>)}
          </div>

          <p className="bd-detail-overview">{show.overview}</p>

          <div className="bd-modal-actions">
            <button className="bd-btn bd-btn-primary" onClick={() => handleWatch(1, 1)}>
              <PlayIcon /> Watch S1 E1
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

          {show.director && (
            <div className="bd-detail-credit">
              <span className="bd-modal-detail-label">Created by</span>
              <span className="bd-modal-detail-value">{show.director}</span>
            </div>
          )}
        </div>
      </div>

      {/* Episodes Section */}
      <div className="bd-detail-section">
        <div className="bd-episodes-header">
          <h2 className="bd-row-title">Episodes</h2>
          {/* Season selector */}
          <div className="bd-season-select-wrap">
            <button
              className="bd-season-select"
              onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
            >
              {seasons.find((s) => s.season_number === selectedSeason)?.name || `Season ${selectedSeason}`}
              <ChevronDownIcon />
            </button>
            {seasonDropdownOpen && (
              <div className="bd-season-dropdown">
                {seasons.map((s) => (
                  <button
                    key={s.season_number}
                    className={`bd-season-option ${s.season_number === selectedSeason ? 'bd-season-active' : ''}`}
                    onClick={() => {
                      setSelectedSeason(s.season_number);
                      setSeasonDropdownOpen(false);
                    }}
                  >
                    {s.name}
                    <span className="bd-season-ep-count">{s.episode_count} ep</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {episodesLoading ? (
          <div className="bd-episodes-loading">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bd-episode-card bd-skeleton-card" aria-hidden="true">
                <div className="bd-skeleton-poster" style={{ width: 180, height: 100, borderRadius: 4 }} />
                <div style={{ flex: 1 }}>
                  <div className="bd-skeleton-text" style={{ width: '60%', height: 14 }} />
                  <div className="bd-skeleton-text" style={{ width: '90%', height: 10, marginTop: 8 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bd-episodes-list">
            {episodes.map((ep) => {
              const thumb = stillUrl(ep.still_path);
              return (
                <div
                  key={ep.id}
                  className="bd-episode-card"
                  onClick={() => handleWatch(ep.season_number, ep.episode_number)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleWatch(ep.season_number, ep.episode_number); }}
                >
                  <div className="bd-episode-thumb-wrap">
                    {thumb ? (
                      <img className="bd-episode-thumb" src={thumb} alt="" loading="lazy" draggable={false} />
                    ) : (
                      <div className="bd-episode-thumb bd-episode-thumb-placeholder" />
                    )}
                    <div className="bd-episode-play-overlay">
                      <PlayIcon />
                    </div>
                    <span className="bd-episode-number">E{ep.episode_number}</span>
                  </div>
                  <div className="bd-episode-info">
                    <h3 className="bd-episode-title">{ep.name}</h3>
                    <div className="bd-episode-meta">
                      {ep.runtime && <span>{fmtRuntime(ep.runtime)}</span>}
                      {ep.air_date && <span>{fmtDate(ep.air_date)}</span>}
                      {ep.vote_average > 0 && (
                        <span className="bd-episode-rating">
                          <StarIcon /> {ep.vote_average.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {ep.overview && (
                      <p className="bd-episode-overview">{ep.overview}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

      {/* Footer */}
      <footer className="bd-footer" role="contentinfo">
        <span className="bd-footer-text">© 2025 Vidaant</span>
        <span className="bd-footer-text">Powered by TMDB</span>
      </footer>

      {trailerOpen && (
        <TrailerModal mediaType="tv" tmdbId={show.id} onClose={() => setTrailerOpen(false)} />
      )}
    </div>
  );
}
