"use client";

import DevTerminal from "../components/DevTerminal";
import { useState, useEffect } from "react";
import Lanyard from "../components/Lanyard";

export default function DeveloperPage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };
    return date.toLocaleDateString("en-US", options);
  };

  return (
    <div className="h-screen bg-black text-green-400 font-mono flex flex-col min-h-0 overflow-hidden touch-manipulation">
      {/* Top Navigation - Mobile Optimized */}
      <nav className="flex items-center justify-between px-4 md:px-6 py-2 md:py-3 border-b border-green-500/30 text-sm flex-shrink-0">
        <div className="flex flex-col items-start">
          <span className="text-green font-bold text-lg md:text-xl">
            VIDANT SHARMA
          </span>
          <span className="text-white text-xs md:text-sm">Web-Dev</span>
        </div>
      </nav>

      {/* Main Content - Mobile Optimized */}
      <div className="flex flex-1 min-h-0 h-full overflow-hidden flex-col lg:flex-row">
        {/* Lanyard Section - Responsive Height with Very Dark Gradient Background */}
        <div className="w-full lg:w-[40%] border-b lg:border-b-0 lg:border-r border-green-500/20 h-[280px] sm:h-[320px] md:h-[360px] lg:h-full relative bg-gradient-to-br from-white/[0.09] via-zinc-950 to-black">
          <Lanyard
            position={[0, 0, 20]}
            gravity={[0, -40, 0]}
            transparent={false}
          />

          {/* Additional gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 pointer-events-none" />

          {/* Bottom Right Text */}
          <div className="absolute bottom-4 right-4 text-right pointer-events-none z-10">
            <p
              className="text-green drop-shadow-lg"
              style={{ fontSize: "11px" }}
            >
              [interactive 3d Card]
            </p>
          </div>
        </div>

        {/* Terminal Section - Better Mobile Spacing */}
        <div className="flex-1 bg-black p-1 sm:p-2 lg:p-4 h-full min-h-0 flex flex-col overflow-hidden">
          <DevTerminal className="flex-1 min-h-0 w-full" />
        </div>
      </div>

      {/* Footer - Mobile Optimized */}
      <footer className="border-t border-green-500/30 px-2 sm:px-4 py-1 sm:py-2 text-xs text-green-600 flex-shrink-0 flex flex-col sm:flex-row justify-between items-center gap-1 sm:gap-0">
        <span className="text-center sm:text-left">
          &copy; WELCOME :)
        </span>
        <span className="text-green-400 font-mono text-xs">
          {formatDateTime(currentTime)}
        </span>
      </footer>
    </div>
  );
}
