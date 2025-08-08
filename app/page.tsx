'use client';

import { useState, useEffect } from 'react';
import ProfileCard from './components/ProfileCard';
import LoadingScreen from './components/LoadingScreen';
import AddProfileCard from './components/AddProfileCard';
import NetflixLoader from './components/NetflixLoader';

interface Profile {
  id: string;
  name: string;
  avatar: string;
  isKidsProfile?: boolean;
}

const profiles: Profile[] = [
  {
    id: '1',
    name: 'John',
    avatar: '/avatars/avatar1.png',
  },
  {
    id: '2',
    name: 'Sarah',
    avatar: '/avatars/avatar2.png',
  },
  {
    id: '3',
    name: 'Kids',
    avatar: '/avatars/kids.png',
    isKidsProfile: true,
  },
  {
    id: '4',
    name: 'Guest',
    avatar: '/avatars/avatar4.png',
  },
];

export default function Home() {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

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
    
    // Simulate loading time (in real app, this would be authentication/data loading)
    setTimeout(() => {
      setIsLoading(false);
      // Here you would typically navigate to the main Netflix interface
      console.log(`Profile ${profile.name} loaded successfully`);
      // For demo purposes, we'll just reset after 3 seconds
      setTimeout(() => {
        setSelectedProfile(null);
      }, 3000);
    }, 2000);
  };

  const handleAddProfile = () => {
    console.log('Add profile clicked');
    // In a real app, this would open a profile creation interface
  };

  const handleManageProfiles = () => {
    console.log('Manage profiles clicked');
    // In a real app, this would open a profile management interface
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

  if (selectedProfile && !isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-netflix-red text-6xl font-bold mb-8">NETFLIX</h1>
          <p className="text-white text-2xl">Welcome, {selectedProfile.name}!</p>
          <p className="text-gray-400 text-lg mt-4">This would be the main Netflix interface...</p>
          <p className="text-gray-500 text-sm mt-8">Click will return to profile selection in a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center px-4">
      <div className="w-full max-w-6xl mx-auto text-center">
        {/* Netflix Logo */}
        <div className="mb-16 animate-fade-in-up opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <h1 className="text-netflix-red text-5xl md:text-7xl font-bold tracking-wide">
            NETFLIX
          </h1>
        </div>

        {/* Who's watching heading */}
        <h2 className="text-white text-4xl md:text-6xl font-light mb-12 md:mb-16 animate-fade-in-up opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
          Who&apos;s watching?
        </h2>

        {/* Profiles Grid */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-12 lg:gap-16 mb-12 md:mb-16">
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
                isKidsProfile={profile.isKidsProfile}
                onClick={() => handleProfileSelect(profile)}
              />
            </div>
          ))}
          {profiles.length < 5 && (
            <div
              className="animate-fade-in-up opacity-0"
              style={{ 
                animationDelay: `${0.5 + profiles.length * 0.1}s`, 
                animationFillMode: 'forwards' 
              }}
            >
              <AddProfileCard onClick={handleAddProfile} />
            </div>
          )}
        </div>

        {/* Manage Profiles Button */}
        <button
          onClick={handleManageProfiles}
          className="text-gray-400 hover:text-white text-xl md:text-2xl font-light border border-gray-400 hover:border-white px-8 py-4 transition-all duration-200 hover:bg-white hover:bg-opacity-10 animate-fade-in-up opacity-0"
          style={{ animationDelay: '1.0s', animationFillMode: 'forwards' }}
        >
          Manage Profiles
        </button>
      </div>
    </div>
  );
}
