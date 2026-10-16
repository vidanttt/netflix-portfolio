'use client';

import Link from 'next/link';
import FuzzyText from '@/components/FuzzyText';
import FallingText from '@/components/FallingText';

// One size drives both the big 404 and where the message starts, so they never overlap
const BIG = 'clamp(7rem, 24vw, 20rem)';

export default function NotFound() {
  return (
    <main
      className="relative min-h-screen overflow-hidden text-white"
      style={{
        backgroundColor: '#141414',
        backgroundImage:
          'radial-gradient(900px 520px at 50% 28%, rgba(125, 211, 252, 0.08), transparent 70%), radial-gradient(700px 420px at 50% 100%, rgba(255, 255, 255, 0.04), transparent 70%)',
      }}
    >
      <h1 className="sr-only">404 — page not found</h1>

      {/* The message falls apart and the whole screen is its floor and walls: pieces can be
          grabbed, thrown and swiped anywhere, then they fly back together and fall again. */}
      <FallingText
        text="This page wandered off. The link might be broken, or the page may have moved somewhere else."
        highlightWords={['wandered', 'broken', 'moved']}
        trigger="auto"
        variant="text"
        split="words"
        order="random"
        stagger={0.06}
        gravity={1}
        bounciness={0.35}
        scatter={0.6}
        draggable
        cursorPush={0.6}
        restoreDelay={0}
        fontSize="clamp(1.15rem, 2.6vw, 1.9rem)"
        accentColor="#7dd3fc"
        className="text-white/85"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          alignItems: 'flex-start',
          // start just under the 404, in a readable column
          paddingTop: `calc(15vh + ${BIG} * 0.8 + 1.5rem)`,
          paddingInline: 'max(1rem, calc(50% - 22rem))',
        }}
      />

      {/* Navigation sits above the physics layer */}
      <nav
        className="absolute left-1/2 top-6 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-3"
        aria-label="Get back on track"
      >
        <Link
          href="/"
          className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:scale-95"
        >
          Take me home
        </Link>
        <Link
          href="/creator"
          className="rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:scale-95"
        >
          See my work
        </Link>
      </nav>

      {/* The big number. The layer ignores the pointer so the falling pieces underneath stay
          grabbable; only the 404 itself reacts (fuzz on hover). */}
      <div aria-hidden="true" className="pointer-events-none relative z-10 flex justify-center" style={{ paddingTop: '15vh' }}>
        <div className="pointer-events-auto">
          <FuzzyText
            color="#ffffff"
            colorSplit={0}
            trigger="hover"
            direction="horizontal"
            baseIntensity={0.2}
            hoverIntensity={0.5}
            fuzzRange={30}
            sliceSize={1}
            fps={60}
            transitionDuration={0}
            intro
            introDuration={1400}
            letterSpacing={0}
            enableHover
            clickEffect={false}
            glitchMode={false}
            fontSize={BIG}
          >
            404
          </FuzzyText>
        </div>
      </div>
    </main>
  );
}
