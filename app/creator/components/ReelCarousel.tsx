import { useCallback, useEffect, useRef, useState } from "react";
import { motion, PanInfo, AnimatePresence } from "framer-motion";

interface ReelCarouselProps {
  videos: string[];
}

/**
 * Aggressive video-loading strategy:
 * 1. All videos start with preload="auto" so the browser fetches them in the background.
 * 2. We listen to BOTH `loadeddata` and `canplay` events to mark videos as ready.
 * 3. A periodic watchdog checks for stuck videos and forces a reload by resetting `src`.
 * 4. When the active slide changes we explicitly call `.load()` + `.play()` on that video
 *    to make sure the browser prioritises it.
 */
export default function ReelCarousel({ videos }: ReelCarouselProps) {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [loadedSet, setLoadedSet] = useState<Set<number>>(new Set());
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track how many times we've retried each video to avoid infinite loops
  const retryCountRef = useRef<number[]>(new Array(videos.length).fill(0));
  const MAX_RETRIES = 3;

  const markLoaded = useCallback((idx: number) => {
    setLoadedSet((prev) => {
      if (prev.has(idx)) return prev;
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  }, []);

  const count = videos.length;

  const go = useCallback(
    (dir: number) => {
      setPaused(false);
      setActive((prev) => (prev + dir + count) % count);
    },
    [count]
  );

  const goTo = useCallback(
    (idx: number) => {
      setPaused(false);
      setActive(((idx % count) + count) % count);
    },
    [count]
  );

  // ── Force-load a video that might be stuck ──
  const forceLoadVideo = useCallback(
    (v: HTMLVideoElement, idx: number) => {
      if (retryCountRef.current[idx] >= MAX_RETRIES) return;
      retryCountRef.current[idx]++;
      // Reassign src to bust any stalled connection
      const currentSrc = v.src;
      v.src = "";
      v.removeAttribute("src");
      v.load();
      // After a micro-tick, reassign the real src
      requestAnimationFrame(() => {
        v.src = currentSrc;
        v.load();
      });
    },
    []
  );

  // ── Manage playback when the active slide changes ──
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === active) {
        v.currentTime = 0;
        v.muted = muted;

        // If the video has no data yet, explicitly kick-start loading
        if (v.readyState < 2) {
          v.load();
        }

        if (!paused) {
          const playPromise = v.play();
          if (playPromise) {
            playPromise.catch(() => {
              // Autoplay might be blocked; mute and retry once
              v.muted = true;
              v.play().catch(() => {});
            });
          }
        }
      } else {
        v.pause();
      }
    });
    setProgress(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // ── Sync muted ──
  useEffect(() => {
    const v = videoRefs.current[active];
    if (v) v.muted = muted;
  }, [muted, active]);

  // ── Sync play/pause ──
  useEffect(() => {
    const v = videoRefs.current[active];
    if (!v) return;
    if (paused) v.pause();
    else v.play().catch(() => {});
  }, [paused, active]);

  // ── Track progress ──
  useEffect(() => {
    const v = videoRefs.current[active];
    if (!v) return;
    const onTime = () => {
      if (v.duration > 0) setProgress((v.currentTime / v.duration) * 100);
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [active]);

  // ── Watchdog: detect stuck videos and force-reload them ──
  useEffect(() => {
    const watchdogInterval = setInterval(() => {
      videoRefs.current.forEach((v, i) => {
        if (!v) return;
        // If the video hasn't loaded after being in the DOM for a while, retry
        if (!loadedSet.has(i) && v.readyState < 2 && v.networkState !== 2) {
          // networkState 2 = LOADING (still actively trying)
          // readyState < 2 = not enough data to play
          forceLoadVideo(v, i);
        }
      });
    }, 4000); // Check every 4 seconds

    return () => clearInterval(watchdogInterval);
  }, [loadedSet, forceLoadVideo]);

  // ── Handle video error events ──
  const handleVideoError = useCallback(
    (idx: number) => {
      const v = videoRefs.current[idx];
      if (!v) return;
      // Retry loading after a short delay
      setTimeout(() => {
        forceLoadVideo(v, idx);
      }, 1500);
    },
    [forceLoadVideo]
  );

  // ── Handle stall events (browser stopped receiving data) ──
  const handleVideoStall = useCallback(
    (idx: number) => {
      const v = videoRefs.current[idx];
      if (!v) return;
      // Wait a bit, then check if it's still stuck
      setTimeout(() => {
        if (v.readyState < 2 && !loadedSet.has(idx)) {
          forceLoadVideo(v, idx);
        }
      }, 3000);
    },
    [forceLoadVideo, loadedSet]
  );

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "m" || e.key === "M") setMuted((p) => !p);
      if (e.key === " ") { e.preventDefault(); togglePause(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go]);

  // Toggle pause with icon flash
  const togglePause = () => {
    setPaused((p) => !p);
    setShowPauseIcon(true);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => setShowPauseIcon(false), 800);
  };

  // Scrub
  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressBarRef.current;
    const v = videoRefs.current[active];
    if (!bar || !v || !v.duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = pct * v.duration;
    setProgress(pct * 100);
  };

  // Per-card mouse tilt handler
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>, idx: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const nx = (e.clientX - cx) / (rect.width / 2);
    const ny = (e.clientY - cy) / (rect.height / 2);
    setHoveredIdx(idx);
    setTilt({ x: nx, y: ny });
  };

  const handleCardMouseLeave = () => {
    setHoveredIdx(null);
    setTilt({ x: 0, y: 0 });
  };

  // Circular offset
  const getOffset = (i: number) => {
    let diff = i - active;
    const half = Math.floor(count / 2);
    if (diff > half) diff -= count;
    if (diff < -half) diff += count;
    return diff;
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 40;
    if (info.offset.x < -threshold) go(1);
    else if (info.offset.x > threshold) go(-1);
  };

  return (
    <div className="relative w-full select-none" style={{ userSelect: "none", WebkitUserSelect: "none" }}>
      <motion.div
        className="relative mx-auto flex h-[70vh] max-h-[640px] min-h-[420px] w-full items-center justify-center overflow-hidden"
        style={{ perspective: 1400 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        onDragEnd={handleDragEnd}
      >
        {videos.map((src, i) => {
          const offset = getOffset(i);
          const abs = Math.abs(offset);
          const isActive = offset === 0;

          if (abs > 2) {
            return (
              <video
                key={i}
                ref={(el) => { videoRefs.current[i] = el; }}
                src={src}
                loop
                muted
                playsInline
                preload="auto"
                className="hidden"
                onLoadedData={() => markLoaded(i)}
                onCanPlay={() => markLoaded(i)}
                onError={() => handleVideoError(i)}
                onStalled={() => handleVideoStall(i)}
              />
            );
          }

          const baseShift = 220;
          const mobileShift = 90;
          const xDesk = offset * baseShift;
          const xMob = offset * mobileShift;

          const scale = isActive ? 1 : abs === 1 ? 0.82 : 0.66;
          const opacity = isActive ? 1 : abs === 1 ? 0.7 : 0.35;
          const baseRotateY = offset * -18;
          const z = 100 - abs * 10;
          const blurPx = isActive ? 0 : abs === 1 ? 4 : 8;

          // Only the hovered card gets tilt
          const isHovered = hoveredIdx === i;
          const tiltX = isHovered ? tilt.y * -10 : 0;
          const tiltY = isHovered ? tilt.x * 10 : 0;

          return (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 cursor-target"
              onMouseMove={(e) => handleCardMouseMove(e, i)}
              onMouseLeave={handleCardMouseLeave}
              style={{
                zIndex: z,
                transformStyle: "preserve-3d",
                width: "min(320px, 70vw)",
                aspectRatio: "9 / 16",
                marginLeft: "calc(min(320px, 70vw) / -2)",
                marginTop: "calc(min(320px, 70vw) * 16 / 9 / -2)",
                filter: `blur(${blurPx}px)`,
                transition: "filter 0.4s ease",
                cursor: isActive ? "pointer" : "pointer",
                pointerEvents: "auto",
              }}
              animate={{
                x: typeof window !== "undefined" && window.innerWidth < 640 ? xMob : xDesk,
                scale,
                opacity,
                rotateY: baseRotateY + tiltY,
                rotateX: tiltX,
              }}
              transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.8 }}
              whileHover={isActive ? {} : { scale: scale + 0.04 }}
              onClick={() => {
                if (isActive) togglePause();
                else goTo(i);
              }}
            >
              <div
                className={`relative h-full w-full overflow-hidden rounded-3xl bg-black transition-shadow duration-500 ${
                  isActive
                    ? "shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6),0_0_60px_-10px_rgba(120,120,255,0.35)] ring-1 ring-white/20"
                    : "shadow-2xl ring-1 ring-white/5"
                }`}
              >
                <video
                  ref={(el) => { videoRefs.current[i] = el; }}
                  src={src}
                  loop
                  muted={isActive ? muted : true}
                  playsInline
                  preload="auto"
                  className="h-full w-full object-cover pointer-events-none"
                  draggable={false}
                  onLoadedData={() => markLoaded(i)}
                  onCanPlay={() => markLoaded(i)}
                  onError={() => handleVideoError(i)}
                  onStalled={() => handleVideoStall(i)}
                  style={{ userSelect: "none", WebkitUserDrag: "none" } as React.CSSProperties}
                />

                {/* Skeleton loader */}
                {!loadedSet.has(i) && (
                  <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-3xl bg-neutral-900">
                    <div
                      className="absolute inset-0"
                      style={{
                        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.06) 60%, transparent 100%)",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.5s ease-in-out infinite",
                      }}
                    />
                    {/* Fake content lines */}
                    <div className="absolute bottom-6 left-4 right-4 flex flex-col gap-2">
                      <div className="h-2 w-3/4 rounded-full bg-white/10" />
                      <div className="h-2 w-1/2 rounded-full bg-white/10" />
                    </div>
                    {/* Center play icon placeholder */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-14 w-14 rounded-full bg-white/10" />
                    </div>
                  </div>
                )}

                {/* Inactive overlay */}
                {!isActive && (
                  <div className="pointer-events-none absolute inset-0 bg-black/30" />
                )}

                {/* Play/Pause icon flash on click */}
                {isActive && (
                  <AnimatePresence>
                    {showPauseIcon && (
                      <motion.div
                        key="pause-icon"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        transition={{ duration: 0.35 }}
                        className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                      >
                        <div className="rounded-full bg-black/60 p-5 backdrop-blur-sm">
                          {paused ? (
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
                              <polygon points="5,3 19,12 5,21" />
                            </svg>
                          ) : (
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
                              <rect x="6" y="4" width="4" height="16" rx="1" />
                              <rect x="14" y="4" width="4" height="16" rx="1" />
                            </svg>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}

                {/* Active controls: mute + scrub bar */}
                {isActive && (
                  <>
                    {/* Mute / Unmute */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setMuted((p) => !p); }}
                      className="absolute top-3 right-3 z-10 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
                      aria-label={muted ? "Unmute" : "Mute"}
                    >
                      {muted ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <line x1="23" y1="9" x2="17" y2="15" />
                          <line x1="17" y1="9" x2="23" y2="15" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                      )}
                    </button>

                    {/* Scrubable progress bar */}
                    <div
                      ref={progressBarRef}
                      onClick={(e) => { e.stopPropagation(); handleScrub(e); }}
                      className="absolute inset-x-3 bottom-3 z-10 h-1.5 cursor-pointer overflow-hidden rounded-full bg-white/20 backdrop-blur transition-all hover:h-2.5"
                    >
                      <div
                        className="h-full rounded-full bg-white transition-none"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Arrow controls */}
        <button
          aria-label="Previous reel"
          onClick={() => go(-1)}
          className="absolute top-1/2 z-[200] -translate-y-1/2 rounded-full bg-white/10 p-3 text-foreground backdrop-blur-md transition hover:bg-white/20"
          style={{ left: "calc(50% - min(320px, 70vw) / 2 - 60px)" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          aria-label="Next reel"
          onClick={() => go(1)}
          className="absolute top-1/2 z-[200] -translate-y-1/2 rounded-full bg-white/10 p-3 text-foreground backdrop-blur-md transition hover:bg-white/20"
          style={{ right: "calc(50% - min(320px, 70vw) / 2 - 60px)" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </motion.div>

      {/* Dots */}
      <div className="mt-6 flex items-center justify-center gap-2">
        {videos.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to reel ${i + 1}`}
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === active ? "w-8 bg-foreground" : "w-1.5 bg-foreground/30 hover:bg-foreground/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
