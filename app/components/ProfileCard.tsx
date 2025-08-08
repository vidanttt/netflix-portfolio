'use client';

import { useState } from 'react';

interface ProfileCardProps {
  name: string;
  avatar: string;
  isKidsProfile?: boolean;
  onClick: () => void;
}

// Simple avatar generator component
function Avatar({ name, isKidsProfile = false }: { name: string; isKidsProfile?: boolean }) {
  const colors = [
    'bg-red-500',
    'bg-blue-500', 
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-yellow-500',
    'bg-indigo-500',
    'bg-orange-500'
  ];
  
  const colorIndex = name.charCodeAt(0) % colors.length;
  const bgColor = isKidsProfile ? 'bg-yellow-400' : colors[colorIndex];
  
  return (
    <div className={`w-full h-full ${bgColor} flex items-center justify-center text-white text-4xl md:text-5xl font-bold`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ProfileCard({ name, avatar, isKidsProfile = false, onClick }: ProfileCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="flex flex-col items-center cursor-pointer group"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`relative transition-all duration-300 ease-out ${isHovered ? 'scale-110 -translate-y-2' : ''}`}>
        <div className={`w-32 h-32 md:w-40 md:h-40 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
          isHovered ? 'border-white shadow-2xl shadow-white/20' : 'border-transparent'
        }`}>
          <Avatar name={name} isKidsProfile={isKidsProfile} />
        </div>
        {/* Premium glow effect on hover */}
        {isHovered && (
          <div className="absolute inset-0 rounded-lg bg-white opacity-10 animate-pulse" />
        )}
        {isKidsProfile && (
          <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">
            KIDS
          </div>
        )}
      </div>
      <p className={`mt-3 text-base md:text-lg transition-all duration-300 ${
        isHovered ? 'text-white scale-105' : 'text-gray-400'
      }`}>
        {name}
      </p>
    </div>
  );
}
