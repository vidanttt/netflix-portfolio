'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ContinueWatchingItem, PlayerProvider } from '../lib/types';
import { ALL_PROVIDERS } from '../lib/providers';
import { updateContinueWatching, getContinueWatching } from '../lib/storage';
import { ChevronDownIcon } from '../lib/icons';

/* ── Fallback timeout — how long before we consider a server failed ── */
const LOAD_TIMEOUT_MS = 15000;

export default function PlayerEmbed({
  tmdbId,
  mediaType,
  season,
  episode,
  title,
  poster,
  backdrop,
  episodeTitle,
}: {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  title: string;
  poster: string;
  backdrop: string;
  episodeTitle?: string;
}) {
  const [providerIdx, setProviderIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [failedServers, setFailedServers] = useState<Set<number>>(new Set());
  const [autoFallbackMsg, setAutoFallbackMsg] = useState<string | null>(null);
  
  // Local progress state for cross-origin watching fallback
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(mediaType === 'movie' ? 7200 : 2700);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const provider = ALL_PROVIDERS[providerIdx];

  const getPlayerUrl = useCallback((p: PlayerProvider) => {
    return mediaType === 'movie'
      ? p.getMovieUrl(tmdbId)
      : p.getTVUrl(tmdbId, season || 1, episode || 1);
  }, [tmdbId, mediaType, season, episode]);

  const src = getPlayerUrl(provider);

  /* ── Reset state when provider/content changes ── */
  useEffect(() => {
    setLoading(true);
    setError(false);
    setAutoFallbackMsg(null);

    // Clear previous timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Start load timeout — if iframe doesn't load in time, auto-fallback
    timeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      handleFallback(providerIdx);
    }, LOAD_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerIdx, tmdbId, season, episode]);

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  /* ── Auto-fallback to next server ── */
  const handleFallback = useCallback((failedIdx: number) => {
    if (!mountedRef.current) return;

    setFailedServers((prev) => {
      const next = new Set(prev);
      next.add(failedIdx);
      return next;
    });

    // Find next non-failed server
    let nextIdx = -1;
    for (let i = 0; i < ALL_PROVIDERS.length; i++) {
      if (i !== failedIdx && !failedServers.has(i)) {
        nextIdx = i;
        break;
      }
    }

    if (nextIdx >= 0) {
      const nextName = ALL_PROVIDERS[nextIdx].name;
      setAutoFallbackMsg(`${ALL_PROVIDERS[failedIdx].name} failed — switching to ${nextName}…`);
      setProviderIdx(nextIdx);
    } else {
      // All servers exhausted
      setLoading(false);
      setError(true);
      setAutoFallbackMsg(null);
    }
  }, [failedServers]);

  /* ── Manual server switch ── */
  const switchServer = useCallback((idx: number) => {
    setDropdownOpen(false);
    if (idx === providerIdx) return;
    // Reset failed state for manual switch
    setFailedServers(new Set());
    setProviderIdx(idx);
  }, [providerIdx]);

  /* ── Iframe event handlers ── */
  const handleLoad = useCallback(() => {
    if (!mountedRef.current) return;
    // Clear the timeout — server loaded successfully
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setLoading(false);
    setError(false);
    setAutoFallbackMsg(null);
  }, []);

  const handleError = useCallback(() => {
    if (!mountedRef.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    handleFallback(providerIdx);
  }, [providerIdx, handleFallback]);

  /* ── Retry all servers ── */
  const retryAll = useCallback(() => {
    setFailedServers(new Set());
    setProviderIdx(0);
    setError(false);
    setLoading(true);
  }, []);

  /* ── Save / Resume continue watching on mount ── */
  useEffect(() => {
    const historyList = getContinueWatching();
    const existing = historyList.find(
      (x) => x.tmdbId === tmdbId && x.mediaType === mediaType && x.season === season && x.episode === episode
    );

    const startProgress = existing ? existing.progress : 0;
    const startDuration = existing && existing.duration > 0 ? existing.duration : (mediaType === 'movie' ? 7200 : 2700);

    setProgress(startProgress);
    setDuration(startDuration);

    const cwItem: ContinueWatchingItem = {
      tmdbId,
      mediaType,
      season,
      episode,
      progress: startProgress,
      duration: startDuration,
      poster,
      backdrop,
      title,
      episodeTitle,
      timestamp: Date.now(),
    };
    updateContinueWatching(cwItem);
  }, [tmdbId, mediaType, season, episode, poster, backdrop, title, episodeTitle]);

  /* ── Local background progress timer & message listener fallback ── */
  useEffect(() => {
    // 1. Local background timer (updates database/progress every 5 seconds of active page view)
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 5;
        if (next >= duration) {
          clearInterval(interval);
          return duration;
        }

        updateContinueWatching({
          tmdbId,
          mediaType,
          season,
          episode,
          progress: next,
          duration,
          poster,
          backdrop,
          title,
          episodeTitle,
          timestamp: Date.now(),
        });

        return next;
      });
    }, 5000);

    // 2. Standard postMessage event handler (in case provider supports progress logging)
    const handler = (e: MessageEvent) => {
      if (e.data && typeof e.data === 'object') {
        const { type, currentTime, duration: videoDuration } = e.data;
        if (type === 'timeupdate' || type === 'progress') {
          if (typeof currentTime === 'number' && typeof videoDuration === 'number' && videoDuration > 0) {
            setProgress(currentTime);
            setDuration(videoDuration);
            updateContinueWatching({
              tmdbId,
              mediaType,
              season,
              episode,
              progress: currentTime,
              duration: videoDuration,
              poster,
              backdrop,
              title,
              episodeTitle,
              timestamp: Date.now(),
            });
          }
        }
      }
    };

    window.addEventListener('message', handler);
    return () => {
      clearInterval(interval);
      window.removeEventListener('message', handler);
    };
  }, [tmdbId, mediaType, season, episode, poster, backdrop, title, episodeTitle, duration]);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = () => setDropdownOpen(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [dropdownOpen]);

  return (
    <div className="bd-player-wrap">
      {/* Server selector */}
      <div className="bd-server-bar">
        <div className="bd-server-select-wrap" onClick={(e) => e.stopPropagation()}>
          <button
            className="bd-server-select"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="Select server"
          >
            <span className="bd-server-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
            </span>
            <span className="bd-server-name">{provider.name}</span>
            <ChevronDownIcon />
          </button>

          {dropdownOpen && (
            <div className="bd-server-dropdown">
              <div className="bd-server-dropdown-label">Select Server</div>
              {ALL_PROVIDERS.map((p, idx) => (
                <button
                  key={p.name}
                  className={`bd-server-option ${idx === providerIdx ? 'bd-server-active' : ''} ${failedServers.has(idx) ? 'bd-server-failed' : ''}`}
                  onClick={() => switchServer(idx)}
                >
                  <span className="bd-server-option-name">{p.name}</span>
                  {idx === providerIdx && <span className="bd-server-status bd-server-current">Active</span>}
                  {failedServers.has(idx) && idx !== providerIdx && <span className="bd-server-status bd-server-down">Failed</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {autoFallbackMsg && (
          <span className="bd-server-fallback-msg">{autoFallbackMsg}</span>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bd-player-loading">
          <div className="bd-trailer-spinner" />
          <span>Loading {provider.name}…</span>
        </div>
      )}

      {/* Error state — all servers exhausted */}
      {error && (
        <div className="bd-player-error">
          <span>All servers failed to load</span>
          <p className="bd-player-error-hint">This title might not be available right now</p>
          <button className="bd-btn bd-btn-secondary" onClick={retryAll}>
            Try Again
          </button>
        </div>
      )}

      {/* The iframe — key forces remount on provider change */}
      <iframe
        key={`${provider.name}-${tmdbId}-${season}-${episode}`}
        ref={iframeRef}
        className="bd-player-iframe"
        src={src}
        title={`Watch ${title} on ${provider.name}`}
        allow="accelerometer *; autoplay *; clipboard-write *; encrypted-media *; gyroscope *; picture-in-picture *; fullscreen *; web-share *"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        frameBorder="0"
        onLoad={handleLoad}
        onError={handleError}
        style={{ opacity: loading || error ? 0 : 1 }}
      />
    </div>
  );
}
