'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap, reducedMotion } from '../lib/motion';
import Link from 'next/link';
import { CATEGORIES } from '../lib/categories';
import { tmdb, IMG } from '../lib/tmdb';

/* Each tile shows real artwork from one of that category's own top titles (TMDB backdrop),
   so the strip always reflects what's actually inside. Covers are cached for a day. */
const CACHE_KEY = 'bd-category-covers-v1';
const CACHE_TTL = 24 * 60 * 60 * 1000;

type Covers = Record<string, string>;

function readCache(): Covers {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (raw && Date.now() - raw.at < CACHE_TTL) return raw.covers as Covers;
  } catch {
    /* ignore */
  }
  return {};
}

function writeCache(covers: Covers) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), covers }));
  } catch {
    /* ignore */
  }
}

export default function CategoryTiles() {
  const [covers, setCovers] = useState<Covers>({});
  const stripRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (!strip || reducedMotion()) return;
    const tween = gsap.from(strip.children, {
      opacity: 0,
      y: 40,
      scale: 0.88,
      duration: 0.55,
      ease: 'back.out(1.8)',
      stagger: 0.05,
      clearProps: 'transform,opacity',
      scrollTrigger: { trigger: strip, start: 'top 92%', once: true },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cached = readCache();
    setCovers(cached);

    const missing = CATEGORIES.filter((c) => !cached[c.slug]);
    if (!missing.length) return;

    (async () => {
      const next = { ...cached };
      await Promise.allSettled(
        missing.map(async (c, i) => {
          const lead = c.batches[0][0];
          const data = (await tmdb(lead.endpoint, lead.params)) as {
            results?: { backdrop_path: string | null; vote_count?: number }[];
          };
          // A few of the most popular titles with a backdrop; vary the pick per tile
          const pool = (data.results || []).filter((r) => r.backdrop_path).slice(0, 6);
          const pick = pool[i % Math.max(pool.length, 1)];
          if (pick?.backdrop_path) next[c.slug] = `${IMG}w780${pick.backdrop_path}`;
        })
      );
      if (cancelled) return;
      setCovers(next);
      writeCache(next);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bd-row" aria-label="Browse by category">
      <div className="bd-row-header">
        <h2 className="bd-row-title">Browse by Category</h2>
      </div>
      <div className="bd-cat-tiles" ref={stripRef}>
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/Bored/category/${c.slug}`}
            className="bd-cat-tile"
            style={{ ['--tile-accent' as string]: c.accent }}
            title={c.tagline}
          >
            {covers[c.slug] && (
              <img className="bd-cat-tile-img" src={covers[c.slug]} alt="" loading="lazy" draggable={false} />
            )}
            <span className="bd-cat-tile-shade" aria-hidden="true" />
            <span className="bd-cat-tile-label">{c.label}</span>
            <span className="bd-cat-tile-sub">{c.tagline}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
