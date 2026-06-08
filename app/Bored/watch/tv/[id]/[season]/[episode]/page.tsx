'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type {
  TMDBTVDetail, TMDBTVShow, TMDBEpisode, TMDBSeasonDetail, MediaItem,
} from '../../../../../lib/types';
import {
  tmdb, normalizeTVDetail, normalizeTVShow, stillUrl, fmtRuntime,
} from '../../../../../lib/tmdb';
import {
  StarIcon, ArrowLeftIcon, PlayIcon, SkipForwardIcon, ChevronDownIcon,
} from '../../../../../lib/icons';
import PlayerEmbed from '../../../../../components/PlayerEmbed';
import MediaRow from '../../../../../components/MediaRow';
import '../../../../../bored.css';

export default function WatchTVPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const season = parseInt(params.season as string, 10) || 1;
  const episode = parseInt(params.episode as string, 10) || 1;

  const [show, setShow] = useState<MediaItem | null>(null);
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [currentEp, setCurrentEp] = useState<TMDBEpisode | null>(null);
  const [recs, setRecs] = useState<MediaItem[]>([]);
  const [seasons, setSeasons] = useState<{ season_number: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);

  /* ── Load show details ── */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      tmdb(`tv/${id}`, { append_to_response: 'recommendations' }),
      tmdb(`tv/${id}/season/${season}`),
    ]).then(([showData, seasonData]: [TMDBTVDetail, TMDBSeasonDetail]) => {
      if (cancelled) return;
      setShow(normalizeTVDetail(showData));
      const realSeasons = (showData.seasons || [])
        .filter((s) => s.season_number > 0)
        .map((s) => ({ season_number: s.season_number, name: s.name }));
      setSeasons(realSeasons);
      setRecs(
        (showData.recommendations?.results || [])
          .filter((r: TMDBTVShow) => r.poster_path)
          .slice(0, 20)
          .map(normalizeTVShow)
      );
      const eps = seasonData.episodes || [];
      setEpisodes(eps);
      setCurrentEp(eps.find((e) => e.episode_number === episode) || eps[0] || null);
    })
    .catch(() => {})
    .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id, season, episode]);

  const handleNextEpisode = () => {
    const nextEp = episodes.find((e) => e.episode_number === episode + 1);
    if (nextEp) {
      router.push(`/Bored/watch/tv/${id}/${season}/${nextEp.episode_number}`);
    } else {
      // Try next season
      const currentSeasonIdx = seasons.findIndex((s) => s.season_number === season);
      if (currentSeasonIdx >= 0 && currentSeasonIdx < seasons.length - 1) {
        const nextSeason = seasons[currentSeasonIdx + 1];
        router.push(`/Bored/watch/tv/${id}/${nextSeason.season_number}/1`);
      }
    }
  };

  const handleEpisodeClick = (ep: TMDBEpisode) => {
    router.push(`/Bored/watch/tv/${id}/${ep.season_number}/${ep.episode_number}`);
  };

  const handleSeasonChange = (seasonNum: number) => {
    setSeasonDropdownOpen(false);
    router.push(`/Bored/watch/tv/${id}/${seasonNum}/1`);
  };

  const handleSelectRec = (m: MediaItem) => {
    router.push(`/Bored/${m.mediaType}/${m.id}`);
  };

  const hasNextEpisode = episodes.some((e) => e.episode_number === episode + 1) ||
    seasons.findIndex((s) => s.season_number === season) < seasons.length - 1;

  if (loading || !show) {
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

      <button className="bd-back-btn" onClick={() => router.back()} aria-label="Go back">
        <ArrowLeftIcon />
      </button>

      {/* Player */}
      <PlayerEmbed
        tmdbId={show.id}
        mediaType="tv"
        season={season}
        episode={episode}
        title={show.title}
        poster={show.poster}
        backdrop={show.backdrop}
        episodeTitle={currentEp ? `S${season} E${episode}: ${currentEp.name}` : undefined}
      />

      {/* Metadata */}
      <div className="bd-watch-meta">
        <h1 className="bd-watch-title">{show.title}</h1>
        {currentEp && (
          <h2 className="bd-watch-episode-title">
            S{season} E{episode} — {currentEp.name}
          </h2>
        )}
        <div className="bd-modal-meta">
          <span className="bd-modal-rating"><StarIcon /> {show.rating.toFixed(1)}</span>
          {currentEp?.runtime && (
            <><span className="bd-hero-dot" /><span className="bd-modal-meta-text">{fmtRuntime(currentEp.runtime)}</span></>
          )}
        </div>
        {currentEp?.overview && (
          <p className="bd-watch-overview">{currentEp.overview}</p>
        )}

        {/* Next Episode */}
        {hasNextEpisode && (
          <button className="bd-btn bd-btn-primary bd-next-episode" onClick={handleNextEpisode}>
            <SkipForwardIcon /> Next Episode
          </button>
        )}
      </div>

      {/* Episode List */}
      <div className="bd-detail-section">
        <div className="bd-episodes-header">
          <h2 className="bd-row-title">Episodes</h2>
          <div className="bd-season-select-wrap">
            <button
              className="bd-season-select"
              onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
            >
              {seasons.find((s) => s.season_number === season)?.name || `Season ${season}`}
              <ChevronDownIcon />
            </button>
            {seasonDropdownOpen && (
              <div className="bd-season-dropdown">
                {seasons.map((s) => (
                  <button
                    key={s.season_number}
                    className={`bd-season-option ${s.season_number === season ? 'bd-season-active' : ''}`}
                    onClick={() => handleSeasonChange(s.season_number)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bd-episodes-list">
          {episodes.map((ep) => {
            const thumb = stillUrl(ep.still_path);
            const isActive = ep.episode_number === episode;
            return (
              <div
                key={ep.id}
                className={`bd-episode-card ${isActive ? 'bd-episode-active' : ''}`}
                onClick={() => handleEpisodeClick(ep)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') handleEpisodeClick(ep); }}
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
                  </div>
                  {ep.overview && (
                    <p className="bd-episode-overview">{ep.overview}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      {recs.length > 0 && (
        <MediaRow title="More Shows" items={recs} onSelect={handleSelectRec} />
      )}

      <footer className="bd-footer" role="contentinfo">
        <span className="bd-footer-text">© 2025 Vidaant</span>
        <span className="bd-footer-text">Powered by TMDB</span>
      </footer>
    </div>
  );
}
