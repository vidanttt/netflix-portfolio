'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
  const [showLoading, setShowLoading] = useState(false);
  const pathname = usePathname();

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
