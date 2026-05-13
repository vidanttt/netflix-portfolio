'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import LoadingScreen from '@/components/LoadingScreen';

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

  // Show loading immediately if landing directly on /creator (works on SSR too)
  const [showLoading, setShowLoading] = useState(pathname === '/creator');

  // Mark that auto-trigger already fired so we don't re-fire on re-renders
  useEffect(() => {
    if (pathname === '/creator' && !hasAutoTriggered.current) {
      hasAutoTriggered.current = true;
      setShowLoading(true);
    }
  }, [pathname]);

  const startTransition = useCallback(() => {
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
      {showLoading && <LoadingScreen onComplete={handleComplete} />}
    </TransitionContext.Provider>
  );
}
