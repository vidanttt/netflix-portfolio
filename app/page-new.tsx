'use client';

import { useState } from 'react';
import ProfileCard from './components/ProfileCard';

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

  const handleProfileSelect = (profile: Profile) => {
    setSelectedProfile(profile);
    // Here you would typically navigate to the main Netflix interface
    console.log(`Selected profile: ${profile.name}`);
  };

  const handleManageProfiles = () => {
    console.log('Manage profiles clicked');
  };

  if (selectedProfile) {
    return (
      <div className="min-h-screen bg-netflix-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-netflix-red border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-netflix-black via-gray-900 to-black flex items-center justify-center px-4">
      <div className="w-full max-w-4xl mx-auto text-center">
        {/* Netflix Logo */}
        <div className="mb-12">
          <h1 className="text-netflix-red text-4xl md:text-5xl font-bold tracking-wide">
            NETFLIX
          </h1>
        </div>

        {/* Who's watching heading */}
        <h2 className="text-white text-3xl md:text-5xl font-normal mb-8 md:mb-12">
          Who&apos;s watching?
        </h2>

        {/* Profiles Grid */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-8 lg:gap-12 mb-8 md:mb-12">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              name={profile.name}
              avatar={profile.avatar}
              isKidsProfile={profile.isKidsProfile}
              onClick={() => handleProfileSelect(profile)}
            />
          ))}
        </div>

        {/* Manage Profiles Button */}
        <button
          onClick={handleManageProfiles}
          className="text-gray-400 hover:text-white text-lg md:text-xl font-normal border border-gray-400 hover:border-white px-6 py-3 transition-colors duration-200"
        >
          Manage Profiles
        </button>
      </div>
    </div>
  );
}
