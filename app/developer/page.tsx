'use client';

import DevTerminal from '../components/DevTerminal';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

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
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    return date.toLocaleDateString('en-US', options);
  };

  return (
  <div className="h-screen bg-black text-green-400 font-mono flex flex-col min-h-0 overflow-hidden">
      {/* Top Navigation */}
      <nav className="flex items-center justify-between px-6 py-3 border-b border-green-500/30 text-sm">
        {/* <div className="flex gap-4 text-green-400">
          <Link href="#about" className="hover:text-cyan-300">about</Link>
          <Link href="#projects" className="hover:text-cyan-300">projects</Link>
          <Link href="#skills" className="hover:text-cyan-300">skills</Link>
          <Link href="#experience" className="hover:text-cyan-300">experience</Link>
          <Link href="#contact" className="hover:text-cyan-300">contact</Link>
        </div> */}
        <div className="flex flex-col items-end">
          <span className="text-cyan-300 font-bold" style={{ fontSize: 'calc(1rem + 15px)' }}>vidant</span>
          <span className="text-green-400 text-xs" style={{ fontSize: 'calc(0.75rem + 15px)' }}>welcome</span>
        </div>
      </nav>

      {/* Main Content */}
  <div className="flex flex-1 min-h-0 h-full overflow-hidden flex-col md:flex-row">
        {/* Left Column - Lanyard Placeholder */}
        <div className="w-full md:w-[40%] flex items-center justify-center border-b md:border-b-0 md:border-r border-green-500/20 h-[320px] md:h-full p-4 md:p-0">
          <div className="relative w-full max-w-[340px] h-full max-h-[420px] bg-gray-900 border border-green-500/30 rounded-md overflow-hidden">
            {/* Replace this with actual lanyard image */}
            <Image
              src="/lanyard-placeholder.png"
              alt="Lanyard"
              fill
              className="object-cover grayscale"
            />
          </div>
        </div>

        {/* Right Column - Dev Terminal */}
        <div className="flex-1 bg-black p-2 md:p-4 h-full min-h-0 flex flex-col overflow-hidden">
          <DevTerminal className="flex-1 min-h-0 w-full" />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-green-500/30 px-4 py-2 text-xs text-green-600 flex-shrink-0 flex justify-between items-center">
        <span>&copy; WELCOME TO MY DEN lmao</span>
        <span className="text-green-400 font-mono">
          {formatDateTime(currentTime)}
        </span>
      </footer>
    </div>
  );
}
