'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ProfileCard from './components/ProfileCard';
import NetflixLoader from './components/NetflixLoader';
import ParticleText from '@/components/ParticleText';
import GridScan from '@/components/GridScan';
import { usePageTransition } from '@/components/TransitionProvider';

interface Profile {
  id: string;
  name: string;
  avatar: string;
  color: string;
  /** rgb triplet of the light this profile gives off when hovered */
  glow: string;
  /** colours the room's grid takes on while this profile is hovered */
  grid: { lines: string; scan: string };
  isKidsProfile?: boolean;
}

const profiles: Profile[] = [
  {
    id: 'developer',
    name: 'Developer',
    avatar: '/blue-profile.png',
    color: 'from-blue-600 to-cyan-600',
    glow: '64,140,255',
    grid: { lines: '#4b5f8e', scan: '#7fb3ee' },
  },
  // {
  //   id: 'artist',
  //   name: 'Artist',
  //   avatar: '/yellow-profile.png',
  //   color: 'from-purple-600 to-pink-600'
  // },
  // {
  //   id: 'entrepreneur',
  //   name: 'Entrepreneur',
  //   avatar: '/grey-profile.png',
  //   color: 'from-green-600 to-emerald-600'
  // },
  {
    id: 'creator',
    name: 'Creator',
    avatar: '/red-profile.png',
    color: 'from-orange-600 to-red-600',
    glow: '255,72,48',
    grid: { lines: '#8b5651', scan: '#ee8e7e' },
  },
];

const GRID_REST = { lines: '#4d4757', scan: '#7dd3fc' };

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (c: number[]) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** Eases between two grid palettes so the room's light fades rather than snaps. */
function useGridColors(target: { lines: string; scan: string }) {
  const [colors, setColors] = useState(target);
  const current = useRef({ lines: hexToRgb(target.lines), scan: hexToRgb(target.scan) });
  useEffect(() => {
    const goal = { lines: hexToRgb(target.lines), scan: hexToRgb(target.scan) };
    let raf = 0;
    const tick = () => {
      let moving = false;
      (['lines', 'scan'] as const).forEach((k) => {
        current.current[k] = current.current[k].map((v, i) => {
          const d = goal[k][i] - v;
          if (Math.abs(d) > 0.6) moving = true;
          return Math.abs(d) > 0.6 ? v + d * 0.14 : goal[k][i];
        }) as [number, number, number];
      });
      setColors({ lines: rgbToHex(current.current.lines), scan: rgbToHex(current.current.scan) });
      if (moving) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target.lines, target.scan]);
  return colors;
}

export default function Home() {
  const [showLoader, setShowLoader] = useState(false);
  const router = useRouter();
  const { startTransition } = usePageTransition();

  // The three content layers sit at different depths inside the grid "room". GridScan
  // reports its camera offset every frame (-1..1, x right / y up); each layer moves the
  // way real objects behind a window would when the viewer's head moves, and leans
  // toward the viewpoint, so the heading, profiles and button feel placed in the room.
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hovered = profiles.find((p) => p.id === hoveredId);
  const gridColors = useGridColors(hovered ? hovered.grid : GRID_REST);
  const headingLayer = useRef<HTMLDivElement>(null);
  const profilesLayer = useRef<HTMLDivElement>(null);
  const boredLayer = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const h2Ref = useRef<HTMLHeadingElement>(null);
  const accordionRef = useRef<HTMLDivElement>(null);
  const boredBtnRef = useRef<HTMLButtonElement>(null);
  // Shadows lying on the floor of the grid room, one per object
  const floorHeading = useRef<HTMLDivElement>(null);
  const floorCards = useRef<HTMLDivElement>(null);
  const floorButton = useRef<HTMLDivElement>(null);
  const textWidth = useRef(480);
  // iOS only hands out gyroscope data after an explicit tap, so offer one
  const [needMotion, setNeedMotion] = useState(false);
  useEffect(() => {
    const D = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
    if (typeof D?.requestPermission === 'function' && window.matchMedia('(pointer: coarse)').matches) setNeedMotion(true);
  }, []);
  const askMotion = () => {
    const D = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    D.requestPermission?.().catch(() => {}).finally(() => setNeedMotion(false));
  };
  /* The room, in the grid's own units (screen height = 1, screen plane at z = 0, back wall at
     z = 3, floor at y = -0.5, eye F in front of the screen). A point at depth z that the eye
     looks at from offset (ex, ey) shows up on the screen at
         x = ex * z / (z + F)      y = ey + (y0 - ey) * F / (z + F)
     which is what the grid itself draws, so the objects and their shadows move exactly with it
     (far things follow the eye more, things on the screen plane not at all). */
  const handleEye = useCallback((nx: number, ny: number) => {
    const F = 1.25;
    nx = Math.max(-0.8, Math.min(0.8, nx));
    ny = Math.max(-0.8, Math.min(0.8, ny));
    const W = window.innerWidth;
    const H = window.innerHeight;
    const eyeX = nx * 0.22 * Math.max(W / H, 0.95); // eye offset, in screen-heights
    const eyeY = ny * 0.22;

    // [layer, depth behind the screen in screen-heights, lean in degrees, size it should appear at]
    // Depth places the object (and its floor shadow) in the room; the extra scale keeps it a
    // gentle "a bit back" instead of shrinking to the full perspective size.
    // last number: resting vertical offset (fraction of screen height) that undoes the layers
    // crowding each other when they are scaled toward the centre
    const layers: [HTMLDivElement | null, number, number, number, number][] = [
      [headingLayer.current, 0.62, 3, 0.8, -0.05],
      [profilesLayer.current, 0.5, 5, 0.84, 0],
      [boredLayer.current, 0.4, 7, 0.9, 0.035],
    ];
    for (const [el, z, lean, size, lift] of layers) {
      if (!el) continue;
      // translateZ pushes the layer back; the translate is divided by the perspective scale
      // CSS will apply (F / (z + F)), leaving exactly eye * z / (z + F) on screen.
      const dx = (eyeX * H * z) / F;
      const dy = (-eyeY * H * z) / F + (lift * H * (z + F)) / F;
      el.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, ${(-z * H).toFixed(1)}px) rotateY(${(-nx * lean).toFixed(2)}deg) rotateX(${(-ny * lean).toFixed(2)}deg) scale(${(size / (F / (z + F))).toFixed(4)})`;
    }

    // Shadows: the point on the floor straight below each object.
    const floor: [HTMLDivElement | null, number, number, number, number][] = [
      // [shadow, depth, width px on screen, opacity, blur px]
      [floorHeading.current, 0.62, textWidth.current * 0.8, 0.45, 14],
      [floorCards.current, 0.5, accordionRef.current ? accordionRef.current.getBoundingClientRect().width * 0.96 : 600, 0.62, 12],
      [floorButton.current, 0.4, boredBtnRef.current ? boredBtnRef.current.getBoundingClientRect().width * 0.9 : 220, 0.6, 9],
    ];
    for (const [el, z, width, opacity, blur] of floor) {
      if (!el) continue;
      const yUp = eyeY + (-0.5 - eyeY) * (F / (z + F));
      const x = W / 2 + eyeX * H * (z / (z + F));
      const y = H / 2 - yUp * H;
      const height = Math.max(10, width * 0.13); // the floor is seen at a grazing angle
      el.style.width = `${width.toFixed(1)}px`;
      el.style.height = `${height.toFixed(1)}px`;
      el.style.transform = `translate3d(${(x - width / 2).toFixed(2)}px, ${(y - height / 2).toFixed(2)}px, 0)`;
      el.style.opacity = opacity.toFixed(2);
      el.style.filter = `blur(${blur}px)`;
    }
  }, []);

  // Keep the CSS perspective equal to the room's eye distance (F * screen height), and
  // remember how wide the heading text is for its shadow.
  useEffect(() => {
    const fit = () => {
      const H = window.innerHeight;
      if (stageRef.current) stageRef.current.style.perspective = `${(1.25 * H).toFixed(0)}px`;
      const h2 = h2Ref.current;
      if (h2) {
        const range = document.createRange();
        range.selectNodeContents(h2);
        textWidth.current = range.getBoundingClientRect().width || 480;
      }
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Check if this is the first visit in this session
  useEffect(() => {
    const hasSeenLoader = sessionStorage.getItem('netflixLoaderSeen');
    if (!hasSeenLoader) {
      setShowLoader(true);
    }

    // Add secret key combination to reset loader (Ctrl+Shift+R)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        resetLoaderState();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLoaderComplete = () => {
    setShowLoader(false);
    sessionStorage.setItem('netflixLoaderSeen', 'true');
  };

  const handleProfileSelect = (profile: Profile) => {
    // 1. Show the loading screen overlay (lives in layout, won't unmount)
    startTransition();

    // 2. Navigate immediately — the page loads behind the overlay
    router.push(`/${profile.id}`);
  };

  const handleBoredSelect = () => {
    // 1. Show the loading screen overlay
    startTransition();

    // 2. Navigate immediately to the Bored route
    router.push('/Bored');
  };

  // Function to reset loader state (for testing purposes)
  const resetLoaderState = () => {
    sessionStorage.removeItem('netflixLoaderSeen');
    setShowLoader(true);
  };

  // Show Netflix loader on first load
  if (showLoader) {
    return <NetflixLoader onComplete={handleLoaderComplete} />;
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden" style={{ backgroundColor: '#141414' }}>
      {/* Animated scanning grid behind the profile picker */}
      <div className="fixed inset-0 z-0">
        <GridScan
          linesColor={gridColors.lines}
          scanColor={gridColors.scan}
          cells={8}
          depth={3}
          scanDuration={2.4}
          scanDelay={1.6}
          clickEffect="ping"
          onEye={handleEye}
          enableGyro
        />
        {/* shadows on the floor of the room (positioned every frame from the grid's camera) */}
        <div ref={floorHeading} className="room-shadow" aria-hidden="true" />
        <div ref={floorCards} className="room-shadow" aria-hidden="true" />
        <div ref={floorButton} className="room-shadow" aria-hidden="true" />
        {/* soft vignette so the heading and profiles stay readable over the grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(20,20,20,0.15) 0%, rgba(20,20,20,0.7) 100%)' }}
        />
      </div>

      {needMotion && !showLoader && (
        <button
          type="button"
          onClick={askMotion}
          className="fixed left-1/2 top-4 z-30 -translate-x-1/2 rounded-full border border-white/20 bg-black/55 px-4 py-2 text-xs font-medium tracking-wide text-white/85 backdrop-blur-md"
        >
          Tap to enable tilt
        </button>
      )}

      <div ref={stageRef} className="relative z-10 w-full max-w-6xl mx-auto text-center" style={{ perspective: '1135px' }}>
        {/* Netflix Logo */}
        {/* <div className="mb-16 animate-fade-in-up opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <h1 className="text-netflix-red text-5xl md:text-7xl font-bold tracking-wide">
            NETFLIX
          </h1>
        </div> */}

        {/* Who's watching heading */}
        <div ref={headingLayer} style={{ willChange: 'transform' }}>
          <h2
            ref={h2Ref}
            aria-label="Who's Watching?"
            className="text-white mb-10 md:mb-14 animate-fade-in-up opacity-0 h-[120px] md:h-[160px] w-full"
            style={{ animationDelay: '0.3s', animationFillMode: 'forwards', filter: 'drop-shadow(0 14px 22px rgba(0,0,0,0.55))' }}
          >
            <ParticleText
              text="Who's Watching?"
              particleSize={2}
              density={4}
              color="currentColor"
              highlightColor="#e50914"
              highlightMode="motion"
              shape="circle"
              intro="gather"
              scatter={180}
              gatherDuration={1600}
              stagger={420}
              clickBurst
              burstStrength={1}
              pointerRepel={40}
              repelRadius={120}
              idleDrift={0.7}
              trigger="mount"
              fontSize="clamp(3rem, 9vw, 5.75rem)"
              fontWeight={800}
              fontFamily="inherit"
              glow
            />
          </h2>
        </div>

        {/* Profiles Accordion */}
        <div ref={profilesLayer} style={{ willChange: 'transform' }}>
        <div
          ref={accordionRef}
          className="profiles-accordion mb-12 md:mb-16 animate-fade-in-up opacity-0"
          style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}
        >
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="profile-item"
              style={{ ['--glow' as string]: profile.glow }}
              onMouseEnter={() => setHoveredId(profile.id)}
              onMouseLeave={() => setHoveredId((id) => (id === profile.id ? null : id))}
              onFocus={() => setHoveredId(profile.id)}
              onBlur={() => setHoveredId((id) => (id === profile.id ? null : id))}
              onClick={() => handleProfileSelect(profile)}
            >
              <div 
                className="profile-bg" 
                style={{ backgroundImage: `url(${profile.avatar})` }}
              />
              <span>{profile.name}</span>
            </div>
          ))}
        </div>
        </div>

        {/* "Are YOU Bored?" Button */}
        <div ref={boredLayer} style={{ willChange: 'transform' }}>
        <div 
          className="flex justify-center mt-12 md:mt-16 animate-fade-in-up opacity-0" 
          style={{ 
            animationDelay: '0.8s', 
            animationFillMode: 'forwards' 
          }}
        >
          <div className="relative" style={{ filter: 'drop-shadow(0 16px 12px rgba(0,0,0,0.5))' }}>
            {/* Hand-drawn "Click!" and dashed arrow on top left */}
            <div className="absolute -top-10 -left-12 rotate-[-15deg] flex flex-col items-center pointer-events-none z-10 opacity-90">
              <span 
                className="text-white text-3xl font-bold tracking-widest" 
                style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", cursive', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
              >
                Click!
              </span>
              <svg width="45" height="45" viewBox="0 0 100 100" className="text-white mt-1 drop-shadow-md">
                <path d="M20,10 Q50,40 80,80" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray="8 6" />
                <path d="M50,80 L80,80 L80,50" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Hand-drawn squiggle doodle under the button */}
            <div className="absolute bottom-2 right-24 rotate-[2deg] pointer-events-none z-10 opacity-60">
              <svg width="100" height="25" viewBox="0 0 100 25" className="text-white drop-shadow-md">
                <path d="M5,12 Q15,2 25,12 T45,12 T65,12 T85,12 T95,7" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <button
              ref={boredBtnRef}
              className="bored-btn"
              onClick={handleBoredSelect}
              aria-label="Are you bored?"
            >
              <span>Are YOU Bored?</span>
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
