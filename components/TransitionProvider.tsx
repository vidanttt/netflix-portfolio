'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import LoadingScreen from '@/components/LoadingScreen';
import { preloadAllAssets, getCreatorPageManifest } from '@/lib/preloadAssets';

interface TransitionContextType {
  startTransition: () => void;
}

const TransitionContext = createContext<TransitionContextType>({
  startTransition: () => {},
});

export const usePageTransition = () => useContext(TransitionContext);

export default function TransitionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasAutoTriggered = useRef(false);
  const preloadStarted = useRef(false);

  // Show loading immediately if landing directly on /creator (works on SSR too)
  const [showLoading, setShowLoading] = useState(pathname === '/creator');
  const [loadProgress, setLoadProgress] = useState(0);
  const [assetsReady, setAssetsReady] = useState(false);

  // Auto-finish transition for routes that don't have custom preloading (like /developer, /Bored)
  useEffect(() => {
    if (showLoading && pathname !== '/creator') {
      setLoadProgress(100);
      setAssetsReady(true);
    }
  }, [showLoading, pathname]);

  // Mark that auto-trigger already fired so we don't re-fire on re-renders
  useEffect(() => {
    if (pathname === '/creator' && !hasAutoTriggered.current) {
      hasAutoTriggered.current = true;
      setShowLoading(true);
    }
  }, [pathname]);

  // Start preloading when the loading screen appears for the creator page
  useEffect(() => {
    if (!showLoading || pathname !== '/creator' || preloadStarted.current) return;
    preloadStarted.current = true;

    const manifest = getCreatorPageManifest();

    preloadAllAssets(manifest, (result) => {
      // Map loaded/total to a 0–100 percentage
      const pct = result.total > 0
        ? Math.round(((result.loaded + result.failed) / result.total) * 100)
        : 100;
      setLoadProgress(pct);

      if (result.done) {
        setAssetsReady(true);
      }
    }).then(() => {
      setAssetsReady(true);
      setLoadProgress(100);
    });
  }, [showLoading, pathname]);

  const startTransition = useCallback(() => {
    // Reset state for a fresh transition
    preloadStarted.current = false;
    setLoadProgress(0);
    setAssetsReady(false);
    setShowLoading(true);
  }, []);

  const handleComplete = useCallback(() => {
    setShowLoading(false);
  }, []);

  // If the user navigates back (popstate / pathname changes back), dismiss the loader
  useEffect(() => {
    const handlePopState = () => {
      setShowLoading(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <TransitionContext.Provider value={{ startTransition }}>
      {children}
      {showLoading && (
        <LoadingScreen
          onComplete={handleComplete}
          externalProgress={loadProgress}
          assetsReady={assetsReady}
        />
      )}
    </TransitionContext.Provider>
  );
}
