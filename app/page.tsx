'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProfileCard from './components/ProfileCard';
import LoadingScreen from './components/LoadingScreen';
import NetflixLoader from './components/NetflixLoader';

interface Profile {
  id: string;
  name: string;
  avatar: string;
  description: string;
  color: string;
  isKidsProfile?: boolean;
}

const profiles: Profile[] = [
  {
    id: 'developer',
    name: 'Developer',
    avatar: '/blue-profile.png',
    description: 'Full-Stack Development & Web Technologies',
    color: 'from-blue-600 to-cyan-600'
  },
  {
    id: 'designer',
    name: 'Designer',
    avatar: '/yellow-profile.png',
    description: 'UI/UX Design & Creative Solutions',
    color: 'from-purple-600 to-pink-600'
  },
  {
    id: 'entrepreneur',
    name: 'Entrepreneur',
    avatar: '/grey-profile.png',
    description: 'Business Strategy & Innovation',
    color: 'from-green-600 to-emerald-600'
  },
  {
    id: 'creator',
    name: 'Creator',
    avatar: '/red-profile.png',
    description: 'Content Creation & Digital Marketing',
    color: 'from-orange-600 to-red-600'
  },
];

export default function Home() {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const router = useRouter();

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
    setIsLoading(true);
    setSelectedProfile(profile);
    
    // Simulate loading time then navigate to the portfolio page
    setTimeout(() => {
      setIsLoading(false);
      router.push(`/${profile.id}`);
    }, 1500);
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

  if (isLoading && selectedProfile) {
    return <LoadingScreen profileName={selectedProfile.name} />;
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

        {/* Profiles Grid */}
        <div className="flex flex-col md:flex-row justify-center gap-8 md:gap-12 lg:gap-16 mb-12 md:mb-16">
          {profiles.map((profile, index) => (
            <div
              key={profile.id}
              className="animate-fade-in-up opacity-0"
              style={{ 
                animationDelay: `${0.5 + index * 0.1}s`, 
                animationFillMode: 'forwards' 
              }}
            >
              <ProfileCard
                name={profile.name}
                avatar={profile.avatar}
                description={profile.description}
                color={profile.color}
                onClick={() => handleProfileSelect(profile)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
