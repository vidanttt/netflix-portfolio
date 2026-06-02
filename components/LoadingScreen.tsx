import { useEffect, useState, useRef, useCallback } from "react";
import {
    AnimatePresence,
    motion,
    type Easing,
} from "framer-motion";
import Counter from "@/components/Counter";

export interface LoadingScreenProps {
    /** Minimum duration before the screen can dismiss, in seconds. Default: 2.5s */
    duration?: number;
    /** Background color of the overlay. Default: "#0a0a0a" */
    backgroundColor?: string;
    /** Called once the exit transition fully completes. */
    onComplete?: () => void;
    /** Optional small label rendered under the counter. */
    label?: string;
    /**
     * External progress signal (0–100). The counter tracks this value
     * with smooth easing — it never races ahead of real loading.
     */
    externalProgress?: number;
    /**
     * Whether all external assets are ready. When true the counter
     * finishes to 100 and the split animation begins.
     */
    assetsReady?: boolean;
}

const EASE_IN_OUT_EXPO: Easing = [0.87, 0, 0.13, 1];

const LoadingScreen = ({
    duration = 2.5,
    backgroundColor = "#0a0a0a",
    onComplete,
    label = "Loading",
    externalProgress,
    assetsReady,
}: LoadingScreenProps) => {
    const [visible, setVisible] = useState(true);
    const [phase, setPhase] = useState<"counting" | "splitting" | "done">("counting");
    const [counterValue, setCounterValue] = useState(0);

    const hasExternalProgress = externalProgress !== undefined;
    const minTimeElapsed = useRef(false);
    const startTime = useRef(Date.now());

    // ── Dynamic counter that follows real progress ──
    // Instead of a fixed timer, the counter:
    //   • Starts with a quick initial burst to ~15% (feels responsive)
    //   • Then tracks externalProgress with slight lead (never more than +5%)
    //   • Slows down around 80-90% if assets aren't done yet
    //   • Snaps to 100 only when assetsReady === true
    useEffect(() => {
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime.current;
            const minMs = duration * 1000;

            // Mark when minimum time has passed
            if (elapsed >= minMs) {
                minTimeElapsed.current = true;
            }

            setCounterValue((prev) => {
                if (!hasExternalProgress) {
                    // Legacy: timer-only mode
                    const t = Math.min(elapsed / (duration * 1000), 1);
                    const eased = 1 - Math.pow(1 - t, 3);
                    const val = Math.round(eased * 100);
                    if (val >= 100) {
                        clearInterval(interval);
                        setTimeout(() => setPhase("splitting"), 300);
                    }
                    return val;
                }

                const realPct = externalProgress ?? 0;

                // Assets are fully ready — snap to 100
                if (assetsReady && minTimeElapsed.current) {
                    if (prev < 100) return 100;
                    return 100;
                }

                // Initial burst: quickly ramp to ~12% in the first 400ms
                if (elapsed < 400) {
                    const burst = Math.round((elapsed / 400) * 12);
                    return Math.max(prev, burst);
                }

                // Track real progress with a slight lead (+3) for responsiveness,
                // but never jump more than +2 per tick (smooth crawl)
                const target = Math.min(realPct + 3, 99);

                // Slow crawl zone: when above 85% and assets not ready,
                // advance very slowly (max +0.5 per tick)
                if (prev >= 85 && !assetsReady) {
                    const slowTarget = Math.min(target, 95);
                    const step = Math.min(0.5, slowTarget - prev);
                    return step > 0 ? Math.round(prev + step) : prev;
                }

                // Normal zone: advance up to +2 per tick toward target
                const step = Math.min(2, target - prev);
                return step > 0 ? Math.round(prev + step) : prev;
            });
        }, 50);

        return () => clearInterval(interval);
    }, [duration, hasExternalProgress, externalProgress, assetsReady]);

    // Trigger split once counter hits 100
    useEffect(() => {
        if (counterValue >= 100 && phase === "counting" && hasExternalProgress) {
            const timer = setTimeout(() => setPhase("splitting"), 200);
            return () => clearTimeout(timer);
        }
    }, [counterValue, phase, hasExternalProgress]);

    // Safety valve: 18s max
    useEffect(() => {
        if (!hasExternalProgress) return;
        const safety = setTimeout(() => {
            if (phase === "counting") {
                setCounterValue(100);
                setTimeout(() => setPhase("splitting"), 200);
            }
        }, 18000);
        return () => clearTimeout(safety);
    }, [hasExternalProgress, phase]);

    if (!visible) return null;

    const halfTransition = {
        duration: 1.2,
        ease: EASE_IN_OUT_EXPO,
    };

    const counterFontSize = typeof window !== "undefined" && window.innerWidth < 768 ? 180 : 280;

    // Show spinner when counter is above 80 and assets aren't ready yet
    const showSpinner = hasExternalProgress && !assetsReady && counterValue >= 40;

    return (
        <AnimatePresence onExitComplete={() => { setVisible(false); onComplete?.(); }}>
            {phase !== "done" && (
                <motion.div
                    key="loading-screen"
                    className="fixed inset-0 z-[9999] overflow-hidden"
                    initial={false}
                    aria-busy="true"
                    aria-live="polite"
                    role="status"
                >
                    {phase === "counting" && (
                        /* ─── PHASE 1: Single centered rolling counter ─── */
                        <motion.div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ backgroundColor }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0 }}
                        >
                            {/* Subtle radial glow */}
                            <div
                                aria-hidden
                                className="absolute inset-0 opacity-60"
                                style={{
                                    background:
                                        "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.06), transparent 60%)",
                                }}
                            />

                            <div className="relative flex items-baseline gap-2">
                                {/* Glow behind counter */}
                                <div
                                    aria-hidden
                                    className="absolute inset-0 -z-10 blur-3xl opacity-40"
                                    style={{
                                        background:
                                            "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 65%)",
                                    }}
                                />
                                <Counter
                                    value={counterValue}
                                    fontSize={counterFontSize}
                                    places={[100, 10, 1]}
                                    gap={4}
                                    textColor="rgba(255,255,255,0.92)"
                                    fontWeight={200}
                                    borderRadius={0}
                                    horizontalPadding={0}
                                    gradientFrom={backgroundColor}
                                    gradientTo="transparent"
                                    gradientHeight={20}
                                />
                                <span
                                    style={{
                                        fontSize: counterFontSize * 0.25,
                                        color: "rgba(255,255,255,0.5)",
                                        fontWeight: 200,
                                        alignSelf: "center",
                                        marginLeft: 4,
                                    }}
                                >
                                    %
                                </span>
                                
                                {/* Bottom info row: spinner + label */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 md:mt-8 flex items-center gap-3">
                                    {/* Circular loading spinner */}
                                    <AnimatePresence>
                                        {showSpinner && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.5 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.5 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    style={{ animation: "ls-spin 1s linear infinite" }}
                                                >
                                                    <circle
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="rgba(255,255,255,0.15)"
                                                        strokeWidth="2.5"
                                                    />
                                                    <path
                                                        d="M12 2a10 10 0 0 1 10 10"
                                                        stroke="rgba(255,255,255,0.7)"
                                                        strokeWidth="2.5"
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <span
                                        className="font-mono text-[10px] md:text-xs tracking-[0.3em] uppercase whitespace-nowrap opacity-80"
                                        style={{ color: "#d0d0d0", textShadow: "0 0 15px rgba(255,255,255,0.6)" }}
                                    >
                                        Best experienced on Desktop
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {phase === "splitting" && (
                        /* ─── PHASE 2: Split reveal ─── */
                        <>
                            {/* Top half — slides up */}
                            <motion.div
                                className="absolute inset-x-0 top-0 h-1/2 overflow-hidden will-change-transform"
                                style={{ backgroundColor }}
                                initial={{ y: 0 }}
                                animate={{ y: "-100%" }}
                                transition={halfTransition}
                                onAnimationComplete={() => setPhase("done")}
                            >
                                <div
                                    className="pointer-events-none absolute inset-0 opacity-60"
                                    style={{
                                        background:
                                            "radial-gradient(ellipse at 50% 100%, rgba(255,255,255,0.08), transparent 60%)",
                                    }}
                                />
                                {/* "100%" anchored at bottom-center of top half */}
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 flex items-baseline gap-2">
                                    <Counter
                                        value={100}
                                        fontSize={counterFontSize}
                                        places={[100, 10, 1]}
                                        gap={4}
                                        textColor="rgba(255,255,255,0.85)"
                                        fontWeight={200}
                                        borderRadius={0}
                                        horizontalPadding={0}
                                        gradientHeight={0}
                                    />
                                    <span
                                        style={{
                                            fontSize: counterFontSize * 0.25,
                                            color: "rgba(255,255,255,0.5)",
                                            fontWeight: 200,
                                            alignSelf: "center",
                                            marginLeft: 4,
                                        }}
                                    >
                                        %
                                    </span>
                                </div>
                            </motion.div>

                            {/* Bottom half — slides down */}
                            <motion.div
                                className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden will-change-transform"
                                style={{ backgroundColor }}
                                initial={{ y: 0 }}
                                animate={{ y: "100%" }}
                                transition={halfTransition}
                            >
                                <div
                                    className="pointer-events-none absolute inset-0 opacity-60"
                                    style={{
                                        background:
                                            "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.08), transparent 60%)",
                                    }}
                                />
                                {/* "100%" anchored at top-center of bottom half */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-baseline gap-2">
                                    <Counter
                                        value={100}
                                        fontSize={counterFontSize}
                                        places={[100, 10, 1]}
                                        gap={4}
                                        textColor="rgba(255,255,255,0.85)"
                                        fontWeight={200}
                                        borderRadius={0}
                                        horizontalPadding={0}
                                        gradientHeight={0}
                                    />
                                    <span
                                        style={{
                                            fontSize: counterFontSize * 0.25,
                                            color: "rgba(255,255,255,0.5)",
                                            fontWeight: 200,
                                            alignSelf: "center",
                                            marginLeft: 4,
                                        }}
                                    >
                                        %
                                    </span>
                                    
                                    {/* Desktop experience indicator (slides down with bottom half) */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 md:mt-8 font-mono text-[10px] md:text-xs tracking-[0.3em] uppercase whitespace-nowrap opacity-80" style={{ color: "#d0d0d0", textShadow: "0 0 15px rgba(255,255,255,0.6)" }}>
                                        Best experienced on Desktop
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}

                    {/* Film grain overlay */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-[0.12]"
                        style={{ backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(GRAIN_SVG)}")` }}
                    />
                    {/* Vignette */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        style={{
                            background:
                                "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
                        }}
                    />

                    {/* Spinner keyframes — injected once */}
                    <style>{`
                        @keyframes ls-spin {
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const GRAIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>
  <filter id='n'>
    <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>
    <feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(%23n)'/>
</svg>`;

export default LoadingScreen;
