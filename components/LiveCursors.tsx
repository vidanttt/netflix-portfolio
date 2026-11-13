'use client';

import { useEffect, useRef, useState } from 'react';
import PartySocket from 'partysocket';

/**
 * Other visitors' cursors, live (see party/cursors.ts). Shows nothing unless
 * NEXT_PUBLIC_PARTYKIT_HOST is set, and only on devices with a real pointer. Positions travel as
 * fractions of the window, so a cursor lands in the same relative spot on every screen.
 */
const HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST;
const SEND_EVERY_MS = 50;
const MAX_SHOWN = 30;

type Peer = { el: HTMLDivElement; x: number; y: number; tx: number; ty: number };

/** a steady colour per visitor, from their connection id */
const hueOf = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
};

export default function LiveCursors({ paused = false }: { paused?: boolean }) {
  const layer = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const socketRef = useRef<PartySocket | null>(null);
  const [count, setCount] = useState(0);

  // first person hides this visitor's cursor from everyone else
  useEffect(() => {
    pausedRef.current = paused;
    if (paused) socketRef.current?.send(JSON.stringify({ gone: true }));
  }, [paused]);

  useEffect(() => {
    const root = layer.current;
    if (!HOST || !root || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;

    const peers = new Map<string, Peer>();
    const socket = new PartySocket({ host: HOST, room: 'home' });
    socketRef.current = socket;

    const add = (id: string, x: number, y: number) => {
      if (peers.has(id) || peers.size >= MAX_SHOWN) return;
      const el = document.createElement('div');
      el.className = 'live-cursor';
      el.style.setProperty('--hue', String(hueOf(id)));
      el.innerHTML =
        '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 3.5l13 7.2-5.6 1.6-2.2 5.6L5 3.5z" fill="currentColor" stroke="rgba(0,0,0,0.55)" stroke-width="1.2" stroke-linejoin="round"/></svg>';
      root.appendChild(el);
      peers.set(id, { el, x, y, tx: x, ty: y });
      setCount(peers.size);
    };
    const remove = (id: string) => {
      const p = peers.get(id);
      if (!p) return;
      p.el.remove();
      peers.delete(id);
      setCount(peers.size);
    };
    const clear = () => {
      for (const id of [...peers.keys()]) remove(id);
    };

    socket.addEventListener('message', (event) => {
      let msg: { t?: string; id?: string; x?: number; y?: number; peers?: { id: string; x: number; y: number }[] };
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (msg.t === 'hello') {
        clear();
        for (const p of msg.peers ?? []) add(p.id, p.x, p.y);
      } else if (msg.t === 'm' && msg.id && typeof msg.x === 'number' && typeof msg.y === 'number') {
        const p = peers.get(msg.id);
        if (p) {
          p.tx = msg.x;
          p.ty = msg.y;
        } else add(msg.id, msg.x, msg.y);
      } else if (msg.t === 'bye' && msg.id) remove(msg.id);
    });
    socket.addEventListener('close', clear);

    // glide towards the latest position instead of jumping
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const k = 1 - Math.exp(-(now - last) / 70);
      last = now;
      const W = window.innerWidth;
      const H = window.innerHeight;
      for (const p of peers.values()) {
        p.x += (p.tx - p.x) * k;
        p.y += (p.ty - p.y) * k;
        p.el.style.transform = `translate3d(${(p.x * W).toFixed(1)}px, ${(p.y * H).toFixed(1)}px, 0)`;
      }
    };
    raf = requestAnimationFrame(frame);

    let sentAt = 0;
    const move = (e: PointerEvent) => {
      if (pausedRef.current || e.pointerType !== 'mouse') return;
      const now = performance.now();
      if (now - sentAt < SEND_EVERY_MS) return;
      sentAt = now;
      socket.send(JSON.stringify({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight }));
    };
    const leave = () => socket.send(JSON.stringify({ gone: true }));
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      socket.close();
      socketRef.current = null;
      clear();
    };
  }, []);

  if (!HOST) return null;
  return (
    <>
      <div ref={layer} className="live-cursors" aria-hidden="true" style={{ visibility: paused ? 'hidden' : undefined }} />
      {count > 0 && !paused && (
        <div className="live-count" aria-live="polite">
          <i /> {count} {count === 1 ? 'other is' : 'others are'} here right now
        </div>
      )}
    </>
  );
}
