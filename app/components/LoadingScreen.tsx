'use client';

import { useEffect, useState } from 'react';

export default function LoadingScreen({ profileName }: { profileName: string }) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[99999] bg-black flex items-center justify-center">
      <div className="text-center">
        {/* Pulsing avatar ring */}
        <div className="relative mx-auto mb-8 h-28 w-28">
          {/* Outer glow ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: '2px solid rgba(229, 9, 20, 0.4)',
              animation: 'loader-pulse 1.5s ease-in-out infinite',
            }}
          />
          {/* Spinning arc */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="#e50914"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="80 200"
              style={{ animation: 'loader-spin 1.2s linear infinite' }}
            />
          </svg>
          {/* Inner avatar placeholder */}
          <div className="absolute inset-3 rounded-full bg-neutral-900 flex items-center justify-center overflow-hidden">
            <span className="text-3xl font-bold text-white/80">
              {profileName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Profile name */}
        <p
          className="text-white text-xl font-light tracking-wider"
          style={{ animation: 'loader-fade-in 0.6s ease-out forwards' }}
        >
          {profileName}{dots}
        </p>
      </div>

      <style jsx>{`
        @keyframes loader-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes loader-pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
        @keyframes loader-fade-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
