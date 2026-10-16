'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * Page-wide ambient glow: the featured hero's backdrop, enlarged and heavily blurred,
 * fixed behind everything so the whole page takes on the colours of whatever is
 * featured. It cross-fades whenever the hero changes.
 */
export default function AmbientBackdrop({ src }: { src?: string | null }) {
  // Two layers that swap, so each change is a cross-fade rather than a pop
  const [layers, setLayers] = useState<{ a: string; b: string; showB: boolean }>({ a: '', b: '', showB: false });
  const last = useRef('');

  useEffect(() => {
    if (!src || src === last.current) return;
    // A smaller render is plenty for a 60px blur and keeps the decode cheap
    const small = src.replace('/original/', '/w780/');
    const img = new Image();
    img.onload = () => {
      last.current = src;
      setLayers((p) => (p.showB ? { ...p, a: small, showB: false } : { ...p, b: small, showB: true }));
    };
    img.src = small;
  }, [src]);

  return (
    <div className="bd-ambient" aria-hidden="true">
      <div className={`bd-ambient-layer ${!layers.showB && layers.a ? 'bd-ambient-on' : ''}`} style={{ backgroundImage: layers.a ? `url(${layers.a})` : undefined }} />
      <div className={`bd-ambient-layer ${layers.showB ? 'bd-ambient-on' : ''}`} style={{ backgroundImage: layers.b ? `url(${layers.b})` : undefined }} />
      <div className="bd-ambient-shade" />
    </div>
  );
}
