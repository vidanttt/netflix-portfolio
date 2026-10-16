"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import DevTerminal from "../components/DevTerminal";
import Lanyard from "../components/Lanyard";
import ShapeWaves from "@/components/ShapeWaves";
import "./developer.css";

export default function DeveloperPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState<Date | null>(null);

  // Clock starts after mount so server and client markup match
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // One composed entrance: header, giant type, facts, badge area, terminal
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "back.out(1.5)" } });
      tl.from(".dv-nav", { opacity: 0, y: -24, duration: 0.5, clearProps: "all" }, 0)
        .from(".dv-fact, .dv-stats", { opacity: 0, y: 24, duration: 0.5, stagger: 0.08, clearProps: "all" }, 0.3)
        .from(".dt-window", { opacity: 0, y: 40, scale: 0.97, duration: 0.7, clearProps: "all" }, 0.2)
        .from(".dv-footer", { opacity: 0, duration: 0.5, ease: "power1.out", clearProps: "all" }, 0.5);
    }, root);
    return () => ctx.revert();
  }, []);

  const time = now
    ? now.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    : "";

  return (
    <div className="dv-root" ref={rootRef}>
      <nav className="dv-nav" aria-label="Primary">
        <div className="dv-brand">
          <span className="dv-brand-name">Vidant Sharma</span>
          <span className="dv-brand-role">Creative Dev</span>
        </div>
        <div className="dv-links">
          <Link href="/">Home</Link>
          <Link href="/creator">Creator</Link>
          <Link href="/Bored">Bored</Link>
        </div>
      </nav>

      <main className="dv-main">
        {/* Left: details sit behind the physics badge */}
        <section className="dv-left" aria-label="Profile badge">
          {/* Animated field of glyphs and shapes behind the badge; reacts to the pointer */}
          <div className="dv-wavebg" aria-hidden="true">
            <ShapeWaves
              text="</>"
              color="#929292"
              hoverColor="#00a9dd"
              backgroundColor="#000000"
              shapes="mixed"
              cellSize={9}
              dotSize={0.39}
              textSize={0.6}
              speed={0.2}
              scale={0.45}
              contrast={0.9}
              brightness={0.16}
              flow={0.8}
              direction={0}
              fade={0.45}
              interactive
              splashRadius={14}
              splashStrength={0.45}
              glow={3}
              intro
              introDuration={1.6}
            />
          </div>
          <div className="dv-behind" aria-hidden="true">
            <div className="dv-facts">
              <div className="dv-fact">
                <div className="dv-fact-label">Role</div>
                <div className="dv-fact-value">
                  <em>Creative developer</em>
                  <br />
                  Video editor &amp; motion designer
                </div>
              </div>
              <div className="dv-fact">
                <div className="dv-fact-label">Builds with</div>
                <div className="dv-fact-value">Next.js · GSAP · Three.js</div>
              </div>
              <div className="dv-stats">
                <div>
                  <strong>1K+</strong>
                  <span>projects</span>
                </div>
                <div>
                  <strong>1M+</strong>
                  <span>views</span>
                </div>
                <div>
                  <strong>5+</strong>
                  <span>years</span>
                </div>
              </div>
            </div>
          </div>

          <div className="dv-canvas">
            <Lanyard position={[0, 0, 20]} gravity={[0, -40, 0]} transparent />
          </div>
          <p className="dv-hint">drag the badge</p>
        </section>

        {/* Right: terminal */}
        <section className="dv-right" aria-label="Terminal">
          <DevTerminal className="dt-fill" />
        </section>
      </main>

      <footer className="dv-footer">
        <span className="dv-live">available for projects</span>
        <span suppressHydrationWarning>{time}</span>
      </footer>
    </div>
  );
}
