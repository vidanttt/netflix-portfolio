'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProfileCard from './components/ProfileCard';
import NetflixLoader from './components/NetflixLoader';
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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#141414' }}>
      <div className="w-full max-w-6xl mx-auto text-center">
        {/* Netflix Logo */}
        {/* <div className="mb-16 animate-fade-in-up opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <h1 className="text-netflix-red text-5xl md:text-7xl font-bold tracking-wide">
            NETFLIX
          </h1>
        </div> */}

        {/* Who's watching heading */}
        <h2 className="text-white text-4xl md:text-6xl font-light mb-12 md:mb-16 animate-fade-in-up opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
          Who's Watching?

        </h2>

        {/* Profiles Accordion */}
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

        {/* "Are YOU Bored?" Button */}
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
  );
}
