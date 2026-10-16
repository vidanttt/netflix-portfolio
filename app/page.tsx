'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ProfileCard from './components/ProfileCard';
import NetflixLoader from './components/NetflixLoader';
import GridScan from '@/components/GridScan';
import { usePageTransition } from '@/components/TransitionProvider';

interface Profile {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isKidsProfile?: boolean;
}

const profiles: Profile[] = [
  {
    id: 'developer',
    name: 'Developer',
    avatar: '/blue-profile.png',
    color: 'from-blue-600 to-cyan-600'
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
    color: 'from-orange-600 to-red-600'
  },
];

export default function Home() {
  const [showLoader, setShowLoader] = useState(false);
  const router = useRouter();
  const { startTransition } = usePageTransition();

  // The three content layers sit at different depths inside the grid "room". GridScan
  // reports its camera offset every frame (-1..1, x right / y up); each layer moves the
  // way real objects behind a window would when the viewer's head moves, and leans
  // toward the viewpoint, so the heading, profiles and button feel placed in the room.
  const headingLayer = useRef<HTMLDivElement>(null);
  const profilesLayer = useRef<HTMLDivElement>(null);
  const boredLayer = useRef<HTMLDivElement>(null);
  const handleEye = useCallback((ex: number, ey: number) => {
    const layers: [HTMLDivElement | null, number, number][] = [
      [headingLayer.current, 34, 3], // farthest back: shifts most
      [profilesLayer.current, 22, 5],
      [boredLayer.current, 13, 7], // closest to the viewer: shifts least, leans most
    ];
    for (const [el, shift, lean] of layers) {
      if (!el) continue;
      el.style.transform = `translate3d(${(-ex * shift).toFixed(2)}px, ${(ey * shift).toFixed(2)}px, 0) rotateY(${(-ex * lean).toFixed(2)}deg) rotateX(${(-ey * lean).toFixed(2)}deg)`;
    }
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
          linesColor="#4d4757"
          scanColor="#7dd3fc"
          cells={8}
          depth={3}
          scanDuration={2.4}
          scanDelay={1.6}
          clickEffect="ping"
          onEye={handleEye}
        />
        {/* soft vignette so the heading and profiles stay readable over the grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(20,20,20,0.15) 0%, rgba(20,20,20,0.7) 100%)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto text-center" style={{ perspective: '1100px' }}>
        {/* Netflix Logo */}
        {/* <div className="mb-16 animate-fade-in-up opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <h1 className="text-netflix-red text-5xl md:text-7xl font-bold tracking-wide">
            NETFLIX
          </h1>
        </div> */}

        {/* Who's watching heading */}
        <div ref={headingLayer} style={{ willChange: 'transform' }}>
          <h2 className="text-white text-4xl md:text-6xl font-light mb-12 md:mb-16 animate-fade-in-up opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
            Who's Watching?
          </h2>
        </div>

        {/* Profiles Accordion */}
        <div ref={profilesLayer} style={{ willChange: 'transform' }}>
        <div 
          className="profiles-accordion mb-12 md:mb-16 animate-fade-in-up opacity-0"
          style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}
        >
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="profile-item"
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
          <div className="relative">
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
