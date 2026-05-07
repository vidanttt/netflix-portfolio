import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
    AnimatePresence,
    motion,
    useMotionValue,
    useSpring,
    useTransform,
    useDragControls,
    animate,
} from "framer-motion";
import {
    Music,
    Pause,
    Play,
    Repeat,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
} from "lucide-react";
export interface Song {
    title: string;
    artist: string;
    duration: number; // Keep as fallback duration
    cover: string;
    accent: string; // rgb triplet for adaptive glow
    src?: string;
}

const defaultPlaylist: Song[] = [
    { title: "16", artist: "Baby Keem", duration: 252, cover: "/music/1.jpg", accent: "255,140,80", src: "/music/16-BabyKeem.mp3" },
    { title: "Cool for the Summer", artist: "Demi Lovato", duration: 214, cover: "/music/2.jpg", accent: "60,210,180", src: "/music/cool for the summer.mp4" },
    { title: "Drowning", artist: "A Boogie", duration: 209, cover: "/music/3.jfif", accent: "200,90,230", src: "/music/drowning.mp4" },
    { title: "Flatline", artist: "Justin Bieber", duration: 219, cover: "/music/4.jpg", accent: "200,210,230", src: "/music/flatline.mp4" },
];

const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
};

interface MagneticButtonProps {
    onClick?: () => void;
    children: React.ReactNode;
    size?: number;
    primary?: boolean;
    active?: boolean;
    activeColor?: "white" | "red";
    ariaLabel?: string;
}

const MagneticButton = ({
    onClick,
    children,
    size = 44,
    primary,
    active,
    activeColor = "white",
    ariaLabel,
}: MagneticButtonProps) => {
    const ref = useRef<HTMLButtonElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 220, damping: 16 });
    const sy = useSpring(y, { stiffness: 220, damping: 16 });

    const handleMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        x.set((e.clientX - (r.left + r.width / 2)) * 0.35);
        y.set((e.clientY - (r.top + r.height / 2)) * 0.35);
    };
    const reset = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.button
            ref={ref}
            type="button"
            aria-label={ariaLabel}
            data-no-drag
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
                e.stopPropagation();
                onClick?.();
            }}
            onMouseMove={handleMove}
            onMouseLeave={reset}
            style={{ x: sx, y: sy, width: size, height: size }}
            whileTap={{ scale: 0.9 }}
            className={`flex items-center justify-center rounded-full backdrop-blur-xl border transition-all duration-300 will-change-transform ${primary
                ? "bg-white/85 text-black border-white/40 hover:bg-white"
                : active
                    ? activeColor === "red"
                        ? "bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                        : "bg-white/30 text-white border-white/50 shadow-[0_0_15px_rgba(255,255,255,0.25)]"
                    : "bg-white/10 text-white/85 border-white/15 hover:bg-white/20"
                }`}
        >
            {children}
        </motion.button>
    );
};

interface Props {
    songs?: Song[];
}

const GlassMusicPlayer = ({ songs = defaultPlaylist }: Props) => {
    const [expanded, setExpanded] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [scrubbing, setScrubbing] = useState(false);
    const [volume, setVolume] = useState(0.7);
    const [muted, setMuted] = useState(false);
    const [repeat, setRepeat] = useState(false);
    const [index, setIndex] = useState(0);
    const [direction, setDirection] = useState(1);

    const song = songs[index];

    const audioRef = useRef<HTMLAudioElement>(null);
    const [audioDuration, setAudioDuration] = useState(song.duration);

    const barRef = useRef<HTMLDivElement>(null);
    const volRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const draggedRef = useRef(false);
    const dragControls = useDragControls();

    // shared draggable position
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // viewport drag constraints
    const [constraints, setConstraints] = useState({
        top: -9999,
        left: -9999,
        right: 9999,
        bottom: 9999,
    });

    useLayoutEffect(() => {
        const recompute = () => {
            const el = containerRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const cx = x.get();
            const cy = y.get();
            const originLeft = r.left - cx;
            const originTop = r.top - cy;
            const pad = 12;
            const left = pad - originLeft;
            const top = pad - originTop;
            const right = window.innerWidth - r.width - pad - originLeft;
            const bottom = window.innerHeight - r.height - pad - originTop;
            setConstraints({ left, top, right, bottom });

            const clampedX = Math.min(Math.max(cx, left), right);
            const clampedY = Math.min(Math.max(cy, top), bottom);
            if (clampedX !== cx) animate(x, clampedX, { type: "spring", stiffness: 220, damping: 26 });
            if (clampedY !== cy) animate(y, clampedY, { type: "spring", stiffness: 220, damping: 26 });
        };
        recompute();
        const ro = new ResizeObserver(recompute);
        if (containerRef.current) ro.observe(containerRef.current);
        window.addEventListener("resize", recompute);
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", recompute);
        };
    }, [expanded, x, y]);

    // Update audio duration when song changes
    useEffect(() => {
        setAudioDuration(song.duration || 1);
    }, [song]);

    // Handle actual audio playback state
    useEffect(() => {
        if (!audioRef.current) return;
        if (playing) {
            audioRef.current.play().catch((e) => console.log("Playback failed:", e));
        } else {
            audioRef.current.pause();
        }
    }, [playing, index]);

    // Update volume
    useEffect(() => {
        if (!audioRef.current) return;
        audioRef.current.volume = muted ? 0 : volume;
    }, [volume, muted]);

    const handleEnded = () => {
        if (repeat) {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(console.error);
            }
        } else {
            setDirection(1);
            setIndex((i) => (i + 1) % songs.length);
        }
    };

    // outside click to minimize
    useEffect(() => {
        if (!expanded) return;
        const onDown = (e: PointerEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setExpanded(false);
            }
        };
        window.addEventListener("pointerdown", onDown);
        return () => window.removeEventListener("pointerdown", onDown);
    }, [expanded]);

    const pct = (progress / audioDuration) * 100;
    const effectiveVolume = muted ? 0 : volume;

    // Slider scrub helper
    const useTrackScrub = (
        ref: React.RefObject<HTMLDivElement | null>,
        onChange: (ratio: number) => void,
        onStart?: () => void,
        onEnd?: () => void,
    ) => {
        return (e: React.PointerEvent<HTMLDivElement>) => {
            e.stopPropagation();
            const el = ref.current;
            if (!el) return;
            el.setPointerCapture(e.pointerId);
            onStart?.();
            const update = (clientX: number) => {
                const r = el.getBoundingClientRect();
                const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
                onChange(ratio);
            };
            update(e.clientX);
            const move = (ev: PointerEvent) => update(ev.clientX);
            const up = (ev: PointerEvent) => {
                el.releasePointerCapture?.(ev.pointerId);
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", up);
                window.removeEventListener("pointercancel", up);
                onEnd?.();
            };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
            window.addEventListener("pointercancel", up);
        };
    };

    const onSeekDown = useTrackScrub(
        barRef,
        (r) => {
            const newTime = r * audioDuration;
            setProgress(newTime);
            if (audioRef.current) audioRef.current.currentTime = newTime;
        },
        () => setScrubbing(true),
        () => setScrubbing(false),
    );

    const onVolumeDown = useTrackScrub(volRef, (r) => {
        setVolume(r);
        if (r > 0 && muted) setMuted(false);
    });

    const haloOpacity = useTransform(() => 0.3 + effectiveVolume * 0.4);

    const goNext = () => {
        setDirection(1);
        setIndex((i) => (i + 1) % songs.length);
        setProgress(0);
    };
    const goPrev = () => {
        if (progress > 4) {
            setProgress(0);
            if (audioRef.current) audioRef.current.currentTime = 0;
            return;
        }
        setDirection(-1);
        setIndex((i) => (i - 1 + songs.length) % songs.length);
        setProgress(0);
    };

    // Only initiate drag from non-interactive surfaces
    const startDragIfAllowed = (e: React.PointerEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest("[data-no-drag]")) return;
        dragControls.start(e);
    };

    return (
        <motion.div
            ref={containerRef}
            drag
            dragListener={false}
            dragControls={dragControls}
            dragMomentum
            dragElastic={0.18}
            dragConstraints={constraints}
            dragTransition={{ power: 0.25, timeConstant: 240, bounceStiffness: 220, bounceDamping: 26 }}
            onPointerDown={startDragIfAllowed}
            onDragStart={() => {
                draggedRef.current = true;
            }}
            onDragEnd={() => {
                setTimeout(() => (draggedRef.current = false), 50);
            }}
            style={{ x, y, touchAction: "none" }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing will-change-transform z-50"
        >
            {/* Audio element for real playback */}
            <audio
                ref={audioRef}
                src={song.src}
                onTimeUpdate={(e) => {
                    if (!scrubbing) setProgress(e.currentTarget.currentTime);
                }}
                onLoadedMetadata={(e) => {
                    setAudioDuration(e.currentTarget.duration);
                }}
                onEnded={handleEnded}
            />

            {/* Adaptive halo, color drawn from current track */}
            <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 rounded-[40px] blur-3xl"
                style={{ opacity: haloOpacity }}
                animate={{
                    scale: expanded ? 1.15 : 0.9,
                    background: `radial-gradient(60% 60% at 50% 50%, rgba(${song.accent},0.35), transparent 70%)`,
                }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />

            <AnimatePresence mode="popLayout" initial={false}>
                {!expanded ? (
                    <motion.button
                        key="compact"
                        layoutId="player-shell"
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (draggedRef.current) return;
                            setExpanded(true);
                        }}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ layout: { type: "spring", stiffness: 400, damping: 32 } }}
                        className="relative h-20 w-20 rounded-full overflow-hidden border border-white/20 bg-white/10 backdrop-blur-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] flex items-center justify-center will-change-transform"
                    >
                        {playing && (
                            <motion.span
                                className="absolute inset-0 rounded-full"
                                animate={{
                                    boxShadow: [
                                        `0 0 0 0 rgba(${song.accent},0.45)`,
                                        `0 0 0 18px rgba(${song.accent},0)`,
                                    ],
                                }}
                                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                            />
                        )}
                        <AnimatePresence mode="popLayout">
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 1.1, filter: "blur(8px)" }}
                                animate={
                                    playing
                                        ? { opacity: 0.85, scale: 1, filter: "blur(0px)", rotate: 360 }
                                        : { opacity: 0.85, scale: 1, filter: "blur(0px)", rotate: 0 }
                                }
                                exit={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
                                transition={{
                                    opacity: { duration: 0.5 },
                                    scale: { duration: 0.5 },
                                    filter: { duration: 0.5 },
                                    rotate: { repeat: playing ? Infinity : 0, duration: 14, ease: "linear" },
                                }}
                                className="absolute inset-1 rounded-full bg-cover bg-center"
                                style={{ backgroundImage: `url(${song.cover})` }}
                            />
                        </AnimatePresence>
                        <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white">
                            <Music size={16} />
                        </div>
                    </motion.button>
                ) : (
                    <motion.div
                        key="expanded"
                        layoutId="player-shell"
                        transition={{ layout: { type: "spring", stiffness: 380, damping: 34 } }}
                        className="relative w-[420px] max-w-[92vw] rounded-[32px] overflow-hidden border border-white/15 bg-white/[0.08] backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.18)] will-change-transform"
                    >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                        <div
                            className="pointer-events-none absolute -top-1/2 -left-1/4 h-full w-1/2 rotate-12 bg-gradient-to-b from-white/10 to-transparent blur-2xl"
                            aria-hidden
                        />
                        {/* Adaptive inner tint that fades between tracks */}
                        <motion.div
                            aria-hidden
                            className="pointer-events-none absolute inset-0"
                            animate={{
                                background: `radial-gradient(120% 80% at 0% 0%, rgba(${song.accent},0.18), transparent 60%)`,
                            }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        />

                        <motion.div
                            initial="hidden"
                            animate="show"
                            variants={{
                                hidden: {},
                                show: { transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
                            }}
                            className="relative p-6"
                        >
                            <motion.button
                                data-no-drag
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setExpanded(false);
                                }}
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                className="absolute right-4 top-4 z-10 h-7 w-7 rounded-full bg-white/10 text-white/70 text-xs hover:bg-white/20"
                                aria-label="Minimize"
                            >
                                ✕
                            </motion.button>

                            <div className="flex items-center gap-4">
                                <div className="relative h-20 w-20 shrink-0 rounded-2xl overflow-hidden ring-1 ring-white/20 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
                                    <AnimatePresence mode="popLayout" initial={false}>
                                        <motion.img
                                            key={song.cover}
                                            src={song.cover}
                                            alt={song.title}
                                            loading="lazy"
                                            width={512}
                                            height={512}
                                            draggable={false}
                                            initial={{ opacity: 0, scale: 1.15, filter: "blur(10px)" }}
                                            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                                            exit={{ opacity: 0, scale: 0.92, filter: "blur(10px)" }}
                                            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                                            className="absolute inset-0 h-full w-full object-cover"
                                        />
                                    </AnimatePresence>
                                </div>

                                <div className="min-w-0 flex-1 overflow-hidden">
                                    <AnimatePresence mode="popLayout" initial={false}>
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, y: 14 * direction, filter: "blur(6px)" }}
                                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                            exit={{ opacity: 0, y: -14 * direction, filter: "blur(6px)" }}
                                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                        >
                                            <h3 className="truncate text-xl font-semibold text-white tracking-tight">
                                                {song.title}
                                            </h3>
                                            <p className="truncate text-sm text-white/60 italic">{song.artist}</p>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Seek bar */}
                            <motion.div
                                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                                className="mt-6"
                            >
                                <div
                                    ref={barRef}
                                    data-no-drag
                                    onPointerDown={onSeekDown}
                                    className="group relative h-6 flex items-center cursor-pointer touch-none select-none"
                                >
                                    <div
                                        className={`relative w-full rounded-full bg-white/15 overflow-hidden transition-all ${scrubbing ? "h-2.5" : "h-1.5 group-hover:h-2"
                                            }`}
                                    >
                                        <motion.div
                                            className="absolute inset-y-0 left-0 rounded-full bg-white/85"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <motion.div
                                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)]"
                                        style={{ left: `${pct}%` }}
                                        animate={{
                                            width: scrubbing ? 16 : 14,
                                            height: scrubbing ? 16 : 14,
                                            scale: scrubbing ? 1.1 : 1,
                                        }}
                                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                                    />
                                </div>
                                <div className="mt-1 flex justify-between text-[11px] font-medium text-white/55 tabular-nums">
                                    <span>{fmt(progress)}</span>
                                    <span>{fmt(audioDuration)}</span>
                                </div>
                            </motion.div>

                            {/* Transport */}
                            <motion.div
                                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                                className="mt-5 flex items-center justify-center gap-5"
                            >
                                <MagneticButton
                                    ariaLabel={repeat ? "Repeat on" : "Repeat off"}
                                    active={repeat}
                                    onClick={() => setRepeat((r) => !r)}
                                >
                                    <Repeat size={16} />
                                </MagneticButton>
                                <MagneticButton ariaLabel="Previous" onClick={goPrev}>
                                    <SkipBack size={18} />
                                </MagneticButton>
                                <MagneticButton
                                    ariaLabel={playing ? "Pause" : "Play"}
                                    primary
                                    size={56}
                                    onClick={() => setPlaying((p) => !p)}
                                >
                                    {playing ? (
                                        <Pause size={22} fill="currentColor" />
                                    ) : (
                                        <Play size={22} fill="currentColor" className="translate-x-0.5" />
                                    )}
                                </MagneticButton>
                                <MagneticButton ariaLabel="Next" onClick={goNext}>
                                    <SkipForward size={18} />
                                </MagneticButton>
                                <MagneticButton
                                    ariaLabel={muted || effectiveVolume === 0 ? "Unmute" : "Mute"}
                                    active={muted || effectiveVolume === 0}
                                    activeColor="red"
                                    onClick={() => setMuted((m) => !m)}
                                >
                                    {muted || effectiveVolume === 0 ? (
                                        <VolumeX size={16} />
                                    ) : (
                                        <Volume2 size={16} />
                                    )}
                                </MagneticButton>
                            </motion.div>

                            {/* Volume slider */}
                            <motion.div
                                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                                className="mt-5 flex items-center gap-3"
                            >
                                <button
                                    type="button"
                                    data-no-drag
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMuted((m) => !m);
                                    }}
                                    className={`transition-colors ${muted || effectiveVolume === 0 ? "text-red-400 hover:text-red-300 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]" : "text-white/60 hover:text-white"}`}
                                    aria-label={muted || effectiveVolume === 0 ? "Unmute" : "Mute"}
                                >
                                    {muted || effectiveVolume === 0 ? (
                                        <VolumeX size={14} />
                                    ) : (
                                        <Volume2 size={14} />
                                    )}
                                </button>
                                <div
                                    ref={volRef}
                                    data-no-drag
                                    onPointerDown={onVolumeDown}
                                    className="group relative h-5 flex-1 flex items-center cursor-pointer touch-none select-none"
                                >
                                    <div className="relative w-full h-1 rounded-full bg-white/15 overflow-hidden transition-all group-hover:h-1.5">
                                        <motion.div
                                            className="absolute inset-y-0 left-0 rounded-full bg-white/70"
                                            animate={{ width: `${effectiveVolume * 100}%` }}
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    </div>
                                    <motion.div
                                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)] opacity-0 group-hover:opacity-100 transition-opacity"
                                        animate={{ left: `${effectiveVolume * 100}%` }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                </div>
                                <span className="w-8 text-right text-[10px] tabular-nums text-white/45">
                                    {Math.round(effectiveVolume * 100)}
                                </span>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default GlassMusicPlayer;
