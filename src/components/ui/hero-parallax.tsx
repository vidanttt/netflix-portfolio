"use client";
import React, { useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  MotionValue,
} from "motion/react";

export const HeroParallax = ({
  products,
}: {
  products: {
    title: string;
    link: string;
    thumbnail: string;
  }[];
}) => {
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
    useTransform(scrollYProgress, [0, 0.2], [-700, 500]),
    springConfig
  );

  return (
    <div
      ref={ref}
      style={{
        height: "300vh",
        paddingTop: "10rem",
        paddingBottom: "10rem",
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
        position: "relative",
        margin: "0 auto",
        paddingTop: "5rem",
        paddingBottom: "10rem",
        paddingLeft: "1rem",
        paddingRight: "1rem",
        width: "100%",
        left: 0,
        top: 0,
      }}
    >
      <p
        style={{
          fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
          fontSize: "0.75rem",
          letterSpacing: "0.45em",
          color: "#39FF14",
          textTransform: "uppercase",
          marginBottom: "0.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <span style={{ display: "inline-block", width: 28, height: 1, background: "#39FF14", boxShadow: "0 0 6px #39FF14" }} />
        Selected Projects
      </p>
      <h2
        style={{
          fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
          fontSize: "clamp(3rem, 8vw, 6rem)",
          color: "#39FF14",
          letterSpacing: "0.06em",
          lineHeight: 1,
          textShadow: "0 0 30px rgba(57,255,20,0.35), 0 0 80px rgba(57,255,20,0.1)",
          marginBottom: "1.5rem",
        }}
      >
        MY WORK
      </h2>
      <p
        style={{
          maxWidth: "36rem",
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          fontSize: "0.9rem",
          lineHeight: 1.75,
          color: "#7fa870",
        }}
      >
        A selection of cinematic edits, brand campaigns, music videos, and motion
        graphics — crafted frame by frame to tell stories that hit different.
      </p>
    </div>
  );
};

export const ProductCard = ({
  product,
  translate,
}: {
  product: { title: string; link: string; thumbnail: string };
  translate: MotionValue<number>;
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
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
        style={{ display: "block" }}
      >
        <img
          src={product.thumbnail}
          height="600"
          width="600"
          style={{
            objectFit: "cover",
            objectPosition: "left top",
            position: "absolute",
            height: "100%",
            width: "100%",
            inset: 0,
            borderRadius: 4,
            pointerEvents: "auto",
          }}
          alt={product.title}
        />
      </a>
      {/* Dark overlay + neon green border on hover */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: hovered ? 0.9 : 0,
          pointerEvents: "none",
          transition: "opacity 0.3s ease",
          background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
          borderRadius: 4,
          border: "1px solid rgba(57,255,20,0.5)",
          boxShadow: hovered ? "0 0 20px rgba(57,255,20,0.15)" : "none",
        }}
      />
      <h2
        style={{
          position: "absolute",
          bottom: "1rem",
          left: "1rem",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.3s ease",
          fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
          fontSize: "1.25rem",
          letterSpacing: "0.1em",
          color: "#ffffff",
        }}
      >
        {product.title}
      </h2>
    </motion.div>
  );
};
