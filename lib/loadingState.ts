'use client';

import { useSyncExternalStore } from 'react';

/* Tiny store so unrelated components (the music player) can tell when any full-screen
   loading screen is showing. Each loading screen calls beginLoading() while it is
   mounted and endLoading() when it goes away. */
let active = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const beginLoading = () => {
  active += 1;
  emit();
};
export const endLoading = () => {
  active = Math.max(0, active - 1);
  emit();
};

export const useIsLoading = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => active > 0,
    () => false
  );
