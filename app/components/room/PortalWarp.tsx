'use client';

import { useEffect, useRef, useState } from 'react';
import { portalFrames, PORTAL_FRAMES } from './portalFrames';

/**
 * Standing in the nether portal, as in the game: the portal's own animated texture stretched
 * over the whole screen, fading in while the view sways, then `onDone` runs. With nowhere to go
 * yet a quiet line says so and a click steps back out.
 */
export default function PortalWarp({ href, onDone, onBack }: { href: string; onDone: () => void; onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [held, setHeld] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const g = canvasRef.current?.getContext('2d');
    if (!g) return undefined;
    const frames = portalFrames();
    const t0 = performance.now();
    let raf = 0;
    let finished = false;
    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      g.putImageData(frames[Math.floor(t * 20) % PORTAL_FRAMES], 0, 0);
      if (t > 2 && !finished) {
        finished = true;
        if (href) done.current();
        else setHeld(true);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [href]);

  return (
    <div className={`portal-warp${held ? ' is-held' : ''}`} onClick={held ? onBack : undefined}>
      <canvas ref={canvasRef} width={16} height={16} className="portal-warp-canvas" aria-hidden="true" />
      {held && <p className="portal-warp-note">The portal isn&rsquo;t connected yet &middot; click to step back</p>}
    </div>
  );
}
