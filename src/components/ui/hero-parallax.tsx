"use client";
import React, { useState, useEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  MotionValue,
} from "motion/react";

// ── Types ──
interface ChannelData {
  /** YouTube channel URL, e.g. https://www.youtube.com/@_Inferno_playz */
  channelUrl: string;
  /** Fallback display name (used while fetching) */
  title: string;
  /** Optional: provide a thumbnail directly to skip fetching */
  thumbnail?: string;
}

interface ResolvedChannel {
  title: string;
  link: string;
  thumbnail: string;
}

// ── Hook: fetch channel info via our API route ──
function useResolvedChannels(channels: ChannelData[]): ResolvedChannel[] {
  const [resolved, setResolved] = useState<ResolvedChannel[]>(() =>
    channels.map((c) => ({
      title: c.title,
      link: c.channelUrl,
      thumbnail: c.thumbnail || "",
    }))
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      const results = await Promise.allSettled(
        channels.map(async (ch, i) => {
          // If a thumbnail was provided directly, skip the API call
          if (ch.thumbnail) {
            return {
              title: ch.title,
              link: ch.channelUrl,
              thumbnail: ch.thumbnail,
            };
          }

          try {
            const res = await fetch(
              `/api/youtube-channel?url=${encodeURIComponent(ch.channelUrl)}`
            );
            if (!res.ok) throw new Error("API error");
            const data = await res.json();
            return {
              title: data.name || ch.title,
              link: data.channelUrl || ch.channelUrl,
              thumbnail: data.avatar || "",
            };
          } catch {
            // Return fallback on error
            return {
              title: ch.title,
              link: ch.channelUrl,
              thumbnail: "",
            };
          }
        })
      );

      if (cancelled) return;

      setResolved(
        results.map((r, i) =>
          r.status === "fulfilled"
            ? r.value
            : {
              title: channels[i].title,
              link: channels[i].channelUrl,
              thumbnail: "",
            }
        )
      );
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [channels]);

  return resolved;
}

// ── Main Component ──
export const HeroParallax = ({
  channels,
}: {
  channels: ChannelData[];
}) => {
  const products = useResolvedChannels(channels);

  const firstRow = products.slice(0, 5);
  const secondRow = products.slice(5, 10);
  const thirdRow = products.slice(10, 15);
  const ref = React.useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const springConfig = { stiffness: 300, damping: 30, bounce: 100 };

  const translateX = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, 1000]),
    springConfig
  );
  const translateXReverse = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, -1000]),
    springConfig
  );
  const rotateX = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [15, 0]),
    springConfig
  );
  const opacity = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [0.2, 1]),
    springConfig
  );
  const rotateZ = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [20, 0]),
    springConfig
  );
  const translateY = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [-700, 200]),
    springConfig
  );

  return (
    <div
      ref={ref}
      style={{
        height: "min(300vh, 2400px)",
        paddingTop: "10rem",
        paddingBottom: "4rem",
        overflow: "hidden",
        WebkitFontSmoothing: "antialiased",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignSelf: "auto",
        perspective: "1000px",
        transformStyle: "preserve-3d",
        background: "transparent",
      }}
    >
      <ParallaxHeader />
      <motion.div
        style={{ rotateX, rotateZ, translateY, opacity }}
      >
        <motion.div
          style={{
            display: "flex",
            flexDirection: "row-reverse",
            gap: "5rem",
            marginBottom: "5rem",
          }}
        >
          {firstRow.map((product) => (
            <ProductCard product={product} translate={translateX} key={product.title} />
          ))}
        </motion.div>
        <motion.div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "5rem",
            marginBottom: "5rem",
          }}
        >
          {secondRow.map((product) => (
            <ProductCard product={product} translate={translateXReverse} key={product.title} />
          ))}
        </motion.div>
        <motion.div
          style={{
            display: "flex",
            flexDirection: "row-reverse",
            gap: "5rem",
            marginBottom: "5rem",
          }}
        >
          {thirdRow.map((product) => (
            <ProductCard product={product} translate={translateX} key={product.title} />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export const ParallaxHeader = () => {
  return (
    <div
      style={{
        maxWidth: "80rem",
        marginLeft: "auto",   // 👉 pushes everything to right
        marginRight: "0",     // 👉 removes right gap
        paddingTop: "5rem",
        paddingBottom: "10rem",
        paddingLeft: "1rem",
        paddingRight: "clamp(0.5rem, 2vw, 1.5rem)", // 👉 small responsive edge spacing
        width: "100%",
      }}
    >
      <div
        style={{
          maxWidth: "36rem",
          width: "100%",
          marginLeft: "auto", // 👉 keeps text block tight to right
          textAlign: "right",
          position: "relative",
          top: "-14rem",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            letterSpacing: "0.45em",
            color: "#39FF14",
            textTransform: "uppercase",
            marginBottom: "0.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            justifyContent: "flex-end", // 👉 line + text right aligned
          }}
        >
          Creators I Work With
          <span
            style={{
              display: "inline-block",
              width: 28,
              height: 1,
              background: "#39FF14",
              boxShadow: "0 0 6px #39FF14",
            }}
          />
        </p>

        <h2
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(3rem, 8vw, 6rem)",
            fontWeight: 800,
            color: "#f4f4f5",
            letterSpacing: "0.06em",
            lineHeight: 1,
            textShadow:
              "0 0 20px rgba(255,255,255,0.4), 0 0 50px rgba(255,255,255,0.1)",
            marginBottom: "1.5rem",
          }}
        >
          CREATORS
        </h2>

        <p
          style={{
            maxWidth: "36rem",
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: "0.9rem",
            lineHeight: 1.75,
            color: "#7fa870",
          }}
        >
          Some of the creators I've worked with xd
        </p>
      </div>
    </div>
  );
};

export const ProductCard = ({
  product,
  translate,
}: {
  product: ResolvedChannel;
  translate: MotionValue<number>;
}) => {
  const [hovered, setHovered] = useState(false);
  const hasAvatar = product.thumbnail && product.thumbnail.length > 0;

  return (
    <motion.div
      className="cursor-target"
      style={{
        x: translate,
        height: "24rem",
        width: "30rem",
        position: "relative",
        flexShrink: 0,
      }}
      whileHover={{ y: -20 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      key={product.title}
    >
      <a
        href={product.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "block", height: "100%", width: "100%" }}
      >
        {/* Channel profile picture or loading skeleton */}
        {hasAvatar ? (
          <img
            src={product.thumbnail}
            height="600"
            width="600"
            style={{
              objectFit: "cover",
              objectPosition: "center",
              position: "absolute",
              height: "100%",
              width: "100%",
              inset: 0,
              borderRadius: 8,
              pointerEvents: "auto",
            }}
            alt={product.title}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 8,
              background: "linear-gradient(135deg, #1a1a2e 0%, #0a0a14 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Skeleton shimmer */}
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                animation: "shimmer 1.5s infinite",
              }}
            />
          </div>
        )}
      </a>

      {/* Dark overlay + glow border on hover */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: hovered ? 0.9 : 0,
          pointerEvents: "none",
          transition: "opacity 0.3s ease",
          background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.25)",
          boxShadow: hovered ? "0 0 20px rgba(255,255,255,0.1)" : "none",
        }}
      />

      {/* Channel name label */}
      <h2
        style={{
          position: "absolute",
          bottom: "1rem",
          left: "1rem",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.3s ease",
          fontFamily: "var(--font-mono)",
          fontWeight: 800,
          fontSize: "1.25rem",
          letterSpacing: "0.1em",
          color: "#ffffff",
          textShadow: "0 0 10px rgba(255,255,255,0.3)",
        }}
      >
        {product.title}
      </h2>

      {/* YouTube icon badge */}
      <div
        style={{
          position: "absolute",
          top: "0.75rem",
          right: "0.75rem",
          opacity: hovered ? 1 : 0.4,
          transition: "opacity 0.3s ease",
          background: "rgba(0,0,0,0.6)",
          borderRadius: "50%",
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#FF0000">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      </div>
    </motion.div>
  );
};
