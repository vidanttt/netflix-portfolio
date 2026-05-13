import { useEffect, useState } from "react";
import {
    AnimatePresence,
    motion,
    type Easing,
} from "framer-motion";
import Counter from "@/components/Counter";

export interface LoadingScreenProps {
    /** Total duration of the 0 → 100 count, in seconds. Default: 3.2s */
    duration?: number;
    /** Background color of the overlay. Default: "#0a0a0a" */
    backgroundColor?: string;
    /** Called once the exit transition fully completes. */
    onComplete?: () => void;
    /** Optional small label rendered under the counter. */
    label?: string;
}

const EASE_IN_OUT_EXPO: Easing = [0.87, 0, 0.13, 1];

const LoadingScreen = ({
    duration = 3.2,
    backgroundColor = "#0a0a0a",
    onComplete,
    label = "Loading",
}: LoadingScreenProps) => {
    const [visible, setVisible] = useState(true);
    const [phase, setPhase] = useState<"counting" | "splitting" | "done">("counting");
    const [counterValue, setCounterValue] = useState(0);

    // Drive counter 0 → 100 over the duration. Updates at ~20fps; Counter's
    // internal useSpring smooths out the transitions between steps.
    useEffect(() => {
        const totalMs = duration * 1000;
        const startTime = Date.now();

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / totalMs, 1);
            // Cubic ease-out for cinematic pacing
            const eased = 1 - Math.pow(1 - t, 3);
            setCounterValue(Math.round(eased * 100));

            if (t >= 1) {
                clearInterval(interval);
                setTimeout(() => setPhase("splitting"), 500);
            }
        }, 50);

        return () => clearInterval(interval);
    }, [duration]);

    if (!visible) return null;

    const halfTransition = {
        duration: 1.2,
        ease: EASE_IN_OUT_EXPO,
    };

    const counterFontSize = typeof window !== "undefined" && window.innerWidth < 768 ? 180 : 280;

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
                                
                                {/* Desktop experience indicator */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 md:mt-8 font-mono text-[10px] md:text-xs tracking-[0.3em] uppercase whitespace-nowrap opacity-80" style={{ color: "#d0d0d0", textShadow: "0 0 15px rgba(255,255,255,0.6)" }}>
                                    Best experienced on Desktop
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
