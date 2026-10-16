'use client';

import { useEffect, useRef } from 'react';
import { Bebas_Neue } from 'next/font/google';
import gsap from 'gsap';
import { beginLoading, endLoading } from '@/lib/loadingState';

const display = Bebas_Neue({ subsets: ['latin'], weight: '400', display: 'swap' });

interface NetflixLoaderProps {
  onComplete: () => void;
}

const WORD = 'VIDAANT';
const STREAKS = 64;
const STREAK_COLORS = ['#e50914', '#b1060f', '#ff2a2a', '#7a1fff', '#2b6bff', '#ff4fa3', '#ff8a1f'];

/**
 * The opening title, staged like the real thing: the wordmark settles out of the dark in deep,
 * glossy red, a specular glint sweeps across it, then the camera pushes through the letters,
 * the red blooms over the screen and a fan of coloured light streaks flares and fades to black.
 */
export default function NetflixLoader({ onComplete }: NetflixLoaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onComplete);
  doneRef.current = onComplete;

  useEffect(() => {
    beginLoading();
    return endLoading;
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      doneRef.current();
    };
    if (reduce) {
      gsap.set(root.querySelectorAll('.nl-letter'), { opacity: 1 });
      const t = setTimeout(finish, 1200);
      return () => clearTimeout(t);
    }

    const ctx = gsap.context(() => {
      const letters = gsap.utils.toArray<HTMLElement>('.nl-letter');
      const streaks = gsap.utils.toArray<HTMLElement>('.nl-streak');
      gsap.set('.nl-word', { transformPerspective: 900, transformOrigin: '50% 52%' });
      gsap.set(letters, { opacity: 0, y: 14, scale: 1.12, filter: 'blur(14px)' });
      gsap.set('.nl-glint', { xPercent: -140 });
      gsap.set('.nl-bloom', { opacity: 0, scale: 0.4 });
      gsap.set('.nl-floor', { opacity: 0, scaleX: 0.3 });
      gsap.set(streaks, { opacity: 0, scaleY: 0.05 });

      const tl = gsap.timeline({ onComplete: finish });

      // 1 — the letters settle out of the dark, one after another
      tl.to('.nl-floor', { opacity: 0.9, scaleX: 1, duration: 1.4, ease: 'power2.out' }, 0.1)
        .to(letters, { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1.0, ease: 'power3.out', stagger: 0.09 }, 0.25)
        // a slow, barely-there push-in while they land
        .fromTo('.nl-word', { scale: 0.94 }, { scale: 1, duration: 2.0, ease: 'power1.out' }, 0.25)
        // 2 — a specular glint travels across the glossy red
        .to('.nl-glint', { xPercent: 140, duration: 1.0, ease: 'power2.inOut' }, 1.25)
        .to('.nl-word', { '--nl-glow': 1, duration: 0.9, ease: 'sine.inOut' }, 1.1)
        // 3 — the camera pushes through the letters; the red floods the frame
        .set('.nl-glint', { opacity: 0 }, 2.3)
        .to('.nl-word', { scale: 22, duration: 1.15, ease: 'power3.in', z: 0 }, 2.35)
        .to('.nl-word', { opacity: 0, duration: 0.25, ease: 'power1.in' }, 3.25)
        .to('.nl-bloom', { opacity: 1, scale: 1.6, duration: 0.9, ease: 'power2.in' }, 2.55)
        .to('.nl-floor', { opacity: 0, duration: 0.4 }, 2.4)
        // 4 — light streaks fan out and burn away
        .to(
          streaks,
          { opacity: () => 0.55 + Math.random() * 0.45, scaleY: () => 0.7 + Math.random() * 0.5, duration: 0.45, ease: 'power2.out', stagger: { each: 0.006, from: 'center' } },
          3.0,
        )
        .to(streaks, { opacity: 0, scaleY: 1.3, duration: 0.7, ease: 'power1.in', stagger: { each: 0.004, from: 'edges' } }, 3.45)
        .to('.nl-bloom', { opacity: 0, duration: 0.6, ease: 'power1.in' }, 3.5)
        .to(root, { opacity: 0, duration: 0.35, ease: 'power1.in' }, 4.0);
    }, root);

    // never let the intro hang the page
    const guard = setTimeout(finish, 6500);
    return () => {
      clearTimeout(guard);
      ctx.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className="fixed inset-0 z-50 overflow-hidden bg-black" aria-label="Loading" role="status">
      {/* deep vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.92) 100%)' }}
      />

      {/* light the wordmark casts on the floor below it */}
      <div
        className="nl-floor pointer-events-none absolute left-1/2 top-1/2 h-[18vh] w-[80vw] max-w-[1100px] -translate-x-1/2 translate-y-[10vh]"
        style={{ background: 'radial-gradient(ellipse at center, rgba(229,9,20,0.38) 0%, rgba(229,9,20,0.12) 40%, transparent 70%)', filter: 'blur(22px)' }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="nl-word relative" style={{ ['--nl-glow' as string]: 0 }}>
          {/* soft red halo behind the letters */}
          <div
            aria-hidden="true"
            className={`${display.className} absolute inset-0 flex select-none justify-center whitespace-nowrap text-[26vw] leading-none md:text-[17vw]`}
            style={{ color: '#e50914', filter: 'blur(26px)', opacity: 'calc(0.25 + var(--nl-glow) * 0.35)', letterSpacing: '0.04em' }}
          >
            {WORD}
          </div>

          {/* the wordmark: deep red, lit from above like a glossy ribbon */}
          <h1
            className={`${display.className} relative flex select-none whitespace-nowrap text-[26vw] leading-none md:text-[17vw]`}
            style={{ letterSpacing: '0.04em', margin: 0 }}
          >
            {WORD.split('').map((ch, i) => (
              <span
                key={i}
                className="nl-letter inline-block"
                style={{
                  background: 'linear-gradient(180deg, #ff4a52 0%, #e50914 28%, #b00610 62%, #5e0309 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 0.5px rgba(255,120,120,0.6))',
                }}
              >
                {ch}
              </span>
            ))}
            {/* specular glint, clipped to the letters */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{
                WebkitMaskImage: 'linear-gradient(#000,#000)',
              }}
            >
              <span
                className="nl-glint absolute inset-y-0 left-0 block w-1/3"
                style={{ background: 'linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.0) 30%, rgba(255,230,230,0.55) 50%, rgba(255,255,255,0) 70%, transparent 80%)', mixBlendMode: 'overlay' }}
              />
            </span>
          </h1>
        </div>
      </div>

      {/* red bloom as the camera goes through */}
      <div
        className="nl-bloom pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[160vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,60,60,0.95) 0%, rgba(229,9,20,0.85) 25%, rgba(120,0,8,0.55) 55%, transparent 72%)' }}
      />

      {/* fan of light streaks */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ mixBlendMode: 'screen' }}>
        <div className="relative h-full w-full">
          {Array.from({ length: STREAKS }).map((_, i) => {
            const t = i / (STREAKS - 1);
            const color = STREAK_COLORS[(i * 5) % STREAK_COLORS.length];
            return (
              <span
                key={i}
                className="nl-streak absolute top-0 block h-full origin-center"
                style={{
                  left: `${t * 100}%`,
                  width: `${0.25 + ((i * 7) % 5) * 0.18}vw`,
                  background: `linear-gradient(180deg, transparent 0%, ${color} 35%, ${color} 65%, transparent 100%)`,
                  filter: 'blur(1.5px)',
                  opacity: 0,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
