'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ProfileCardProps {
  name: string;
  avatar: string;
  description?: string;
  color?: string;
  isKidsProfile?: boolean;
  onClick: () => void;
}

export default function ProfileCard({ name, avatar, description, color = 'from-gray-600 to-gray-800', onClick }: ProfileCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="flex flex-col items-center cursor-pointer group max-w-sm"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`relative transition-all duration-300 ease-out ${isHovered ? 'scale-110 -translate-y-2' : ''}`}>
        <div className={`rounded-lg overflow-hidden border-2 transition-all duration-300 ${
          isHovered ? 'border-white shadow-2xl shadow-white/20' : 'border-transparent'
        }`}>
          <div className="w-[300px] h-[200px] relative">
            <Image
              src={avatar}
              alt={`${name} profile`}
              fill
              className="object-contain"
              sizes="300px"
            />
          </div>
        </div>
        {/* Premium glow effect on hover */}
        {isHovered && (
          <div className="absolute inset-0 rounded-lg bg-white opacity-10 animate-pulse" />
        )}
      </div>
      {/* Portfolio info */}
      <div className="mt-4 text-center">
        <h3 className={`text-base md:text-lg font-semibold transition-all duration-300 ${
          isHovered ? 'text-white scale-105' : 'text-gray-300'
        }`}>
          {name}
        </h3>
        {description && (
          <p className={`mt-1 text-xs md:text-sm transition-all duration-300 ${
            isHovered ? 'text-gray-300' : 'text-gray-500'
          }`}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
