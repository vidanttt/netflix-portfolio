'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className={`hz-navbar${scrolled ? ' scrolled' : ''}`}>
      {/* Logo */}
      <button
        onClick={() => scrollTo('hero')}
        className="hz-hero-brand"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        aria-label="Go to top"
      >
        <Image
          src="/180hrtz-logo.png"
          alt="180 HRTZ Logo"
          width={80}
          height={28}
          className="hz-hero-brand-logo"
          priority
        />
        <span className="hz-hero-brand-text">180 HRTZ</span>
      </button>

      {/* Nav links */}
      <ul className="hz-nav-links">
        {[
          { label: 'ABOUT',    id: 'about'   },
          { label: 'WORK',     id: 'work'    },
          { label: 'SKILLS',   id: 'skills'  },
          { label: 'CONTACT',  id: 'contact' },
        ].map(({ label, id }) => (
          <li key={id}>
            <button
              onClick={() => scrollTo(id)}
              className="hz-nav-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>

      {/* Live indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="hz-live-dot" />
        <span style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.7rem',
          letterSpacing: '0.2em',
          color: 'var(--hz-text-dim)',
        }}>
          AVAILABLE FOR WORK
        </span>
      </div>
    </nav>
  );
}
