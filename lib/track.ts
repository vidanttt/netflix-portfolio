import { track as vercelTrack } from '@vercel/analytics';

/**
 * Custom events for Vercel Web Analytics (they show under Analytics → Events). Each event name
 * is logged once per page view at most for 'once' events, so a long play session doesn't flood
 * the dashboard; the rest go through every time.
 */
const sent = new Set<string>();
export function track(name: string, data?: Record<string, string | number | boolean | null>, once = false) {
  if (typeof window === 'undefined') return;
  const key = once ? `${name}:${JSON.stringify(data ?? {})}` : '';
  if (once) {
    if (sent.has(key)) return;
    sent.add(key);
  }
  try {
    vercelTrack(name, data);
  } catch {
    /* analytics blocked: nothing to do */
  }
}
