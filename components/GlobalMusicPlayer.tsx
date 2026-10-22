'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import GlassMusicPlayer from '@/components/GlassMusicPlayer';
import { useIsLoading } from '@/lib/loadingState';

/**
 * Mounted once in the root layout so the player (and the song that's playing) carries
 * across page navigations. It is left out of the Bored section only, and it is hidden
 * (not unmounted, so playback never cuts out) while any loading screen is showing.
 */
export default function GlobalMusicPlayer() {
  const pathname = usePathname() || '';
  const loading = useIsLoading();
  const [mounted, setMounted] = useState(false);
  const [introPending, setIntroPending] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // The Netflix intro on "/" only mounts a moment after the page does; treat that gap as
  // loading too so the player never flashes in front of it.
  useEffect(() => {
    try {
      setIntroPending(pathname === '/' && !sessionStorage.getItem('netflixLoaderSeen'));
    } catch {
      setIntroPending(false);
    }
  }, [pathname, loading]);

  if (pathname === '/Bored' || pathname.startsWith('/Bored/')) return null;

  const hidden = !mounted || loading || introPending;
  return (
    <div
      className="global-music"
      aria-hidden={hidden || undefined}
      style={{
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : undefined,
        transition: 'opacity 0.5s ease',
      }}
    >
      <GlassMusicPlayer />
    </div>
  );
}
