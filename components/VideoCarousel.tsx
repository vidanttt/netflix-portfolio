import { useEffect, useRef, useState } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useTransform,
} from "motion/react";

export interface CarouselItem {
  src: string;
  poster?: string;
  title?: string;
  tag?: string;
}

interface VideoCarouselProps {
  items: CarouselItem[];
  speed?: number;
  cardWidth?: number;
  cardHeight?: number;
  gap?: number;
}

export function VideoCarousel({
  items,
  speed = 50,
  cardWidth = 300,
  cardHeight = 480,
  gap = 28,
}: VideoCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Triple the items for seamless infinite looping
  const loop = [...items, ...items, ...items];

  useEffect(() => {
    if (!trackRef.current) return;
    const measure = () => {
      if (!trackRef.current) return;
      setTrackWidth(trackRef.current.scrollWidth / 3);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(trackRef.current);
    return () => ro.disconnect();
  }, [items.length]);

  // Keep x wrapped within [-trackWidth, 0] so the loop is seamless even
  // after drags, momentum, or auto-scroll.
  const wrap = (v: number) => {
    if (trackWidth === 0) return v;
    let n = v;
    while (n <= -trackWidth) n += trackWidth;
    while (n > 0) n -= trackWidth;
    return n;
  };

  // Perpetual motion — NEVER stops. Not on hover, not during drag.
  // Framer's drag system manipulates the same motion value, so the
  // conveyor keeps advancing and the user's gesture blends on top.
  // After release, momentum continues from wherever x lands —
  // no snap, no delay, no easing reset.
  useAnimationFrame((_, delta) => {
    if (trackWidth === 0) return;
    const currentSpeed = isMobile ? speed * 2.5 : speed;
    const dx = (currentSpeed * delta) / 1000;
    x.set(wrap(x.get() - dx));
  });

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{
        perspective: "1600px",
        overflowX: "clip",
        overflowY: "visible",
        paddingBlock: 60,
      }}
    >
      {/* Soft atmospheric white glow — diffused, cinematic */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
        style={{
          width: "90%",
          height: "140%",
          background:
            "radial-gradient(closest-side, rgba(255,255,255,0.06), rgba(255,255,255,0.025) 35%, rgba(255,255,255,0.008) 60%, transparent 80%)",
          filter: "blur(40px)",
        }}
      />

      {/* Edge fade masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden w-32 bg-gradient-to-r from-background to-transparent md:block md:w-64" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden w-32 bg-gradient-to-l from-background to-transparent md:block md:w-64" />

      <motion.div
        ref={trackRef}
        className="flex will-change-transform"
        style={{
          x,
          gap: `${gap}px`,
          paddingInline: `${gap}px`,
          transformStyle: "preserve-3d",
          cursor: "grab",
          touchAction: "pan-y",
        }}
        drag="x"
        dragMomentum={false}
        dragElastic={0}
      >
        {loop.map((item, i) => (
          <CarouselCard
            key={`${item.src}-${i}`}
            item={item}
            index={i}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            gap={gap}
            trackX={x}
            containerRef={containerRef}
            isMobile={isMobile}
          />
        ))}
      </motion.div>
    </div>
  );
}

interface CardProps {
  item: CarouselItem;
  index: number;
  cardWidth: number;
  cardHeight: number;
  gap: number;
  trackX: ReturnType<typeof useMotionValue<number>>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isMobile: boolean;
}

function CarouselCard({
  item,
  index,
  cardWidth,
  cardHeight,
  gap,
  trackX,
  containerRef,
  isMobile,
}: CardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const cardCenterInTrack = gap + index * (cardWidth + gap) + cardWidth / 2;

  // Distance from this card's center to the container's visual center.
  // Used to drive 3D tilt, opacity fade, and blur on far-edge cards.
  const distance = useTransform(trackX, (tx) => {
    const container = containerRef.current;
    if (!container) return 0;
    const containerCenter = container.clientWidth / 2;
    return cardCenterInTrack + tx - containerCenter;
  });

  // Subtle 3D rotateY — cards at the edges tilt away slightly
  const rotateY = useTransform(distance, (d) => {
    const container = containerRef.current;
    const half = container ? container.clientWidth / 2 : 600;
    const t = Math.max(-1, Math.min(1, d / half));
    return -t * 6;
  });

  // Fade out cards approaching the edge masks
  const opacity = useTransform(distance, (d) => {
    if (isMobile) return 1;
    const container = containerRef.current;
    const half = container ? container.clientWidth / 2 : 600;
    const t = Math.abs(d) / half;
    if (t < 0.85) return 1;
    return Math.max(0, 1 - (t - 0.85) / 0.35);
  });

  // Gentle depth-of-field blur on distant cards
  const blurPx = useTransform(distance, (d) => {
    if (isMobile) return 0;
    const container = containerRef.current;
    const half = container ? container.clientWidth / 2 : 600;
    const t = Math.abs(d) / half;
    return t < 0.8 ? 0 : Math.min(3, (t - 0.8) * 8);
  });
  const filter = useTransform(blurPx, (b) => `blur(${b}px)`);

  // Keep video playing at all times — even after fast drags cause
  // the browser to pause offscreen elements. A periodic check
  // re-triggers play on any paused video so the loop never breaks.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => { });
    const id = setInterval(() => {
      if (v.paused) v.play().catch(() => { });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      className="relative shrink-0"
      style={{
        width: cardWidth,
        height: cardHeight,
        rotateY,
        opacity,
        transformStyle: "preserve-3d",
        transformPerspective: 2000,
        willChange: "transform, opacity, filter",
      }}
    >
      <motion.div
        className="pointer-events-none relative h-full w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-muted shadow-[0_40px_100px_-30px_rgba(0,0,0,0.85)]"
        style={{ filter }}
      >
        <video
          ref={videoRef}
          src={item.src}
          poster={item.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/60" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent mix-blend-overlay" />
        {(item.title || item.tag) && (
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-6">
            {item.tag && (
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/70">
                {item.tag}
              </span>
            )}
            {item.title && (
              <span className="text-lg font-medium text-white drop-shadow-md">
                {item.title}
              </span>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default VideoCarousel;
