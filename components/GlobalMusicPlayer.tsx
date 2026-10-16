'use client';

import { usePathname } from 'next/navigation';
import GlassMusicPlayer from '@/components/GlassMusicPlayer';

/**
 * Mounted once in the root layout so the player (and the song that's playing) carries
 * across page navigations. It is left out of the Bored section only.
 */
export default function GlobalMusicPlayer() {
  const pathname = usePathname() || '';
  if (pathname === '/Bored' || pathname.startsWith('/Bored/')) return null;
  return <GlassMusicPlayer />;
}
