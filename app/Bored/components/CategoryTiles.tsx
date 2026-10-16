'use client';

import React from 'react';
import Link from 'next/link';
import { CATEGORIES } from '../lib/categories';

/* "Browse by Category" strip — one tile per category, each opens its own page. */
export default function CategoryTiles() {
  return (
    <section className="bd-row" aria-label="Browse by category">
      <div className="bd-row-header">
        <h2 className="bd-row-title">Browse by Category</h2>
      </div>
      <div className="bd-cat-tiles">
        {CATEGORIES.map((c) => (
          <Link key={c.slug} href={`/Bored/category/${c.slug}`} className="bd-cat-tile" aria-label={c.label} title={c.tagline}>
            <span className="bd-cat-tile-icon" style={{ background: c.gradient }} aria-hidden="true">
              {c.icon}
            </span>
            <span className="bd-cat-tile-label">{c.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
