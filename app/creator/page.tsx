'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Particles from '@/app/Backgrounds/Particles';
import TextPressure from '@/app/TextPressure/TextPressure';

import { HeroParallax } from '@/src/components/ui/hero-parallax';
import './portfolio.css';
import TiltedCard from '@/components/TiltedCard';
import TargetCursor from '@/components/TargetCursor';
import StaggeredMenu from '@/components/StaggeredMenu';
import FlowingMenu from '@/components/FlowingMenu';
import ReelCarousel from "./components/ReelCarousel";
import SmoothScroll from "./components/SmoothScroll";

/* ════════════════════════════════════════════════════
   ABOUT SECTION
   ════════════════════════════════════════════════════ */
function AboutSection() {
  const skills = [
    { label: 'Adobe Premiere Pro', dot: 'green' },
    { label: 'After Effects', dot: 'green' },
    { label: 'DaVinci Resolve', dot: 'green' },
    { label: 'CapCut', dot: 'purple' },
    { label: 'Photoshop', dot: 'purple' },
    { label: 'Illustrator', dot: 'purple' },
    { label: 'Final Cut Pro', dot: 'green' },
    { label: 'Audition', dot: 'purple' },
  ];

  return (
    <section id="about" className="hz-section">
      {/* Section label */}
      <p className="hz-section-label">ABOUT ME</p>
      <h2 className="hz-section-heading">VIDAANT</h2>

      <div className="hz-about-grid">

        {/* ─ Left: Bio card ─ */}
        <div className="hz-card">
          <h3 className="hz-about-bio-title">ABOUT ME</h3>
          <p className="hz-about-bio-text">
            I'm <strong style={{ color: 'var(--hz-green)' }}>Vidant</strong> — a video editor
            and motion designer obsessed with fast cuts, cinematic colour grades, and storytelling
            that hits different. I work with creators, brands, and studios to turn raw footage into
            polished visual experiences.
          </p>
          <p className="hz-about-bio-text" style={{ marginTop: '1rem' }}>
            From short-form social content to full production edits, I've refined my craft across
            multiple niches — music videos, brand campaigns, reels, and documentary-style work.
          </p>
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="hz-tag">VIDEO EDITOR</span>
            <span className="hz-tag" style={{ borderColor: 'var(--hz-green)', color: 'var(--hz-green)', boxShadow: '0 0 8px var(--hz-green-glow)' }}>
              MOTION DESIGNER
            </span>
          </div>
        </div>

        {/* ─ Center: Avatar + name ─ */}
        <div className="hz-about-center">
          <div className="hz-avatar-ring">
            <Image
              src="/image.png"
              alt="Vidant Avatar"
              width={220}
              height={220}
              style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '50%' }}
            />
          </div>
          <p className="hz-name-display">VIDAANT</p>
          <p className="hz-name-role">VIDEO EDITOR & MOTION DESIGNER</p>

          {/* Decorative triangle logo */}
          <svg width="80" height="70" viewBox="0 0 80 70" fill="none" style={{ marginTop: '0.75rem', filter: 'drop-shadow(0 0 12px #39FF14)' }}>
            <polygon points="40,4 76,66 4,66" stroke="#39FF14" strokeWidth="2.5" fill="rgba(57,255,20,0.05)" />
            <polygon points="40,20 62,60 18,60" stroke="#9D4EDD" strokeWidth="1.5" fill="rgba(157,78,221,0.05)" />
          </svg>
        </div>

        {/* ─ Right: Skills + Contact ─ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Softwares card */}
          <div className="hz-card">
            <h4 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1rem',
              letterSpacing: '0.15em',
              color: 'var(--hz-green)',
              marginBottom: '0.85rem',
              textShadow: '0 0 10px var(--hz-green-glow)',
            }}>
              SOFTWARES
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {skills.map((s) => (
                <span key={s.label} className="hz-skill-badge">
                  <span className={`hz-skill-dot${s.dot === 'purple' ? ' hz-skill-dot-purple' : ''}`} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* Contact card */}
          <div className="hz-card hz-card-purple">
            <h4 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1rem',
              letterSpacing: '0.15em',
              color: 'var(--hz-purple)',
              marginBottom: '0.85rem',
              textShadow: '0 0 10px var(--hz-purple-glow)',
            }}>
              CONTACT ME
            </h4>
            <a href="mailto:hello@180hrtz.com" className="hz-contact-link cursor-target">
              <svg className="hz-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              hello@180hrtz.com
            </a>
            <a href="#" className="hz-contact-link cursor-target">
              <svg className="hz-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
              </svg>
              @180hrtz
            </a>
            <a href="#" className="hz-contact-link cursor-target" style={{ borderBottom: 'none' }}>
              <svg className="hz-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z" />
                <polygon points="9.75,15.02 15.5,12 9.75,8.98 9.75,15.02" fill="currentColor" />
              </svg>
              YouTube Channel
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════
   WORK SECTION
   ════════════════════════════════════════════════════ */
function WorkSection() {
  const projects = [
    { title: 'CINEMATIC REEL 2025', tag: 'SHOWREEL', num: '01', gradient: 'linear-gradient(135deg,#0f2010,#050f08,#0a121a)' },
    { title: 'BRAND CAMPAIGN CUT', tag: 'COMMERCIAL', num: '02', gradient: 'linear-gradient(135deg,#0a0a1a,#050508,#0f100a)' },
    { title: 'MUSIC VIDEO EDIT', tag: 'MUSIC', num: '03', gradient: 'linear-gradient(135deg,#1a0a1a,#0a050f,#0f0a0a)' },
    { title: 'SHORT-FORM SERIES', tag: 'SOCIAL', num: '04', gradient: 'linear-gradient(135deg,#0a1210,#060f0a,#0a0a14)' },
    { title: 'DOCUMENTARY CUT', tag: 'LONG-FORM', num: '05', gradient: 'linear-gradient(135deg,#0f1a0a,#080f05,#0a0f14)' },
    { title: 'MOTION GRAPHICS REEL', tag: 'MOTION', num: '06', gradient: 'linear-gradient(135deg,#0a0f1a,#050810,#100a14)' },
  ];

  return (
    <section id="work" className="hz-section">
      <div className="hz-divider" style={{ marginBottom: '10rem' }} />
      <p className="hz-section-label">SELECTED PROJECTS</p>
      <h2 className="hz-section-heading">MY WORK</h2>

      {/* Showreel placeholder */}
      <div className="hz-reel-wrapper">
        <div className="hz-reel-placeholder">
          <div className="hz-reel-play">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#39FF14">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
          <span style={{ letterSpacing: '0.25em', fontSize: '0.8rem' }}>
            — YOUR SHOWREEL GOES HERE —
          </span>
          <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>
            Drop a YouTube embed URL to activate
          </span>
        </div>
      </div>

      {/* Project grid */}
      <div className="hz-work-grid">
        {projects.map((p) => (
          <div key={p.num} className="hz-project-card">
            <div className="hz-project-card-bg" style={{ background: p.gradient }} />
            <span className="hz-project-card-num">{p.num}</span>

            {/* Animated lines overlay */}
            <svg
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.18 }}
              viewBox="0 0 400 225" preserveAspectRatio="none"
            >
              {[0.2, 0.4, 0.6, 0.8].map((y) => (
                <line key={y} x1="0" y1={y * 225} x2="400" y2={y * 225} stroke="#39FF14" strokeWidth="0.5" />
              ))}
              {[0.25, 0.5, 0.75].map((x) => (
                <line key={x} x1={x * 400} y1="0" x2={x * 400} y2="225" stroke="#39FF14" strokeWidth="0.5" />
              ))}
            </svg>

            {/* Waveform placeholder icon */}
            <div className="hz-project-placeholder-icon">
              <svg width="80" height="40" viewBox="0 0 80 40" fill="none">
                {[8, 16, 20, 12, 30, 14, 22, 18, 10, 26, 8, 16].map((h, i) => (
                  <rect
                    key={i}
                    x={i * 6 + 2}
                    y={(40 - h) / 2}
                    width="4"
                    height={h}
                    rx="2"
                    fill="#39FF14"
                  />
                ))}
              </svg>
            </div>

            <div className="hz-project-card-overlay">
              <p className="hz-project-card-tag">{p.tag}</p>
              <p className="hz-project-card-title">{p.title}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════
   SKILLS SECTION — TiltedCard software showcase
   ════════════════════════════════════════════════════ */
function SkillsSection() {
  const software = [
    { label: 'After Effects', img: '/ae-card.png', caption: 'Adobe After Effects' },
    { label: 'Premiere Pro', img: '/pr-card.png', caption: 'Adobe Premiere Pro' },
    { label: 'DaVinci Resolve', img: '/davinci-card.png', caption: 'DaVinci Resolve' },
    { label: 'Blender', img: '/blender-card.png', caption: 'Blender 3D' },
    { label: 'Photoshop', img: '/ps-card.png', caption: 'Adobe Photoshop' },
  ];

  // const bars = [
  //   { label: 'Video Editing', pct: '97%', val: 0.97 },
  //   { label: 'Colour Grading', pct: '92%', val: 0.92 },
  //   { label: 'Motion Graphics', pct: '85%', val: 0.85 },
  //   { label: 'Audio Design', pct: '78%', val: 0.78 },
  //   { label: 'Graphic Design', pct: '80%', val: 0.80 },
  // ];

  return (
    <section id="skills" className="hz-section">
      <div className="hz-divider" style={{ marginBottom: '4rem' }} />
      <p className="hz-section-label">TOOLS & EXPERTISE</p>
      <h2 className="hz-section-heading">SKILLS</h2>

      {/* Software TiltedCards — horizontal row */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '2rem',
        flexWrap: 'wrap',
        marginBottom: '4rem',
      }}>
        {software.map((s) => (
          <div key={s.label} className="cursor-target" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <TiltedCard
              imageSrc={s.img}
              altText={s.label}
              captionText={s.caption}
              containerHeight="300px"
              containerWidth="300px"
              imageHeight="300px"
              imageWidth="300px"
              rotateAmplitude={24}
              scaleOnHover={1.15}
              showMobileWarning={false}
              showTooltip
              displayOverlayContent
              overlayContent={
                <p className="tilted-card-demo-text">
                  {s.label}
                </p>
              }
            />
          </div>
        ))}
      </div>

      {/* Skill bars */}
      {/* <div className="hz-skill-bar-wrap">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="hz-skill-bar-label">
              <span>{b.label}</span>
              <span style={{ color: 'var(--hz-green)' }}>{b.pct}</span>
            </div>
            <div className="hz-skill-bar-track">
              <div className="hz-skill-bar-fill" style={{ width: b.pct }} />
            </div>
          </div>
        ))}
      </div> */}
    </section>
  );
}

/* ════════════════════════════════════════════════════
   CONTACT SECTION
   ════════════════════════════════════════════════════ */
function ContactSection() {
  return (
    <section id="contact" className="hz-contact-section">
      <div className="hz-divider" style={{ marginBottom: '5rem' }} />
      <p className="hz-section-label">GET IN TOUCH</p>

      <div className="hz-contact-inner">
        <div>
          <h2 className="hz-contact-heading">WANNA CONNECT?</h2>
          <p className="hz-contact-subtext">
            Drop me a mail and lets connect :)
          </p>
          <a href="mailto:hello@180hrtz.com" className="hz-contact-email cursor-target">
            vidantforeal@gmail.com
          </a>
          <div className="hz-social-links">
            {['INSTAGRAM', 'YOUTUBE', 'TWITTER', 'BEHANCE'].map((s) => (
              <a key={s} href="#" className="hz-social-btn cursor-target">{s}</a>
            ))}
          </div>
        </div>

        {/* <div className="hz-card" style={{ alignSelf: 'center' }}>
          <h4 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            letterSpacing: '0.2em',
            color: 'var(--hz-green)',
            marginBottom: '1.25rem',
            textShadow: '0 0 10px var(--hz-green-glow)',
          }}>
            {/* QUICK STATS */}
        {/* </h4>
          {[
            { label: 'Projects Completed', val: '100+' },
            { label: 'Years of Experience', val: '5+' },
            { label: 'Clients Worldwide', val: '40+' },
            { label: 'Hours of Footage Cut', val: '∞' },
          ].map((s) => (
            <div key={s.label} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.7rem 0',
              borderBottom: '1px solid rgba(57,255,20,0.07)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
            }}>
              <span style={{ color: 'var(--hz-text-dim)' }}>{s.label}</span>
              <span style={{ color: 'var(--hz-green)', fontWeight: 600, textShadow: '0 0 8px var(--hz-green-glow)' }}>
                {s.val}
              </span>
            </div>
          ))}
        </div> */}
      </div>

      {/* Footer bar */}
      <div className="hz-footer-bar">
        <span className="hz-footer-copy">© 2025 VIDAANT — ALL RIGHTS RESERVED</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="hz-live-dot" />
          <span className="hz-footer-copy">AVAILABLE FOR PROJECTS</span>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════
   MAIN PAGE ASSEMBLY
   ════════════════════════════════════════════════════ */

const menuItems = [
  { label: 'Home', ariaLabel: 'Go to home page', link: '#' },
  { label: 'About', ariaLabel: 'Learn about us', link: '#about' },
  { label: 'Work', ariaLabel: 'View our services', link: '#work' },
  { label: 'Contact', ariaLabel: 'Get in touch', link: '#contact' }
];

const socialItems = [
  { label: 'Instagram', link: '#' },
  { label: 'YouTube', link: '#' },
  { label: 'Behance', link: '#' }
];

const statItems = [
  { link: '#', text: '100+ PROJECTS DELIVERED', image: 'https://picsum.photos/600/400?random=1' },
  { link: '#', text: '50M+ TOTAL VIEWS', image: 'https://picsum.photos/600/400?random=2' },
  { link: '#', text: '5+ YEARS EXPERIENCE', image: 'https://picsum.photos/600/400?random=3' },
  { link: '#', text: 'TIER-1 CREATORS', image: 'https://picsum.photos/600/400?random=4' }
];

export default function CreatorPage() {
  const statueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!statueRef.current) return;
      // Normalize mouse to -1…+1
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      // Move opposite to cursor for parallax depth feel
      statueRef.current.style.transform = `translate(${x * -30}px, ${y * -20}px)`;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <SmoothScroll>
      <TargetCursor
        spinDuration={2}
        hideDefaultCursor
        parallaxOn
        hoverDuration={0.2}
      />
      {/* ── Fixed background layers ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#131313ff' }}>
        <Particles
          particleColors={['#ffffffff']}
          particleCount={200}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover={true}
          alphaParticles={false}
          disableRotation={false}
          className="w-full h-full"
        />
      </div>

      {/* Neon grid */}
      <div className="hz-neon-grid" />
      {/* Scanlines */}
      <div className="hz-scanlines" />

      {/* ── Fixed navbar ── */}
      <StaggeredMenu
        position="left"
        items={menuItems}
        socialItems={socialItems}
        displaySocials
        displayItemNumbering={true}
        menuButtonColor="#ffffffff"
        openMenuButtonColor="#ffffffff"
        changeMenuColorOnOpen={true}
        colors={['#B497CF', '#5227FF']}
        logoUrl="/hero-statue.png"
        accentColor="#66ff00ff"
        isFixed={true}
      />


      {/* ══════════════════════════════════════════════════
          SCROLLABLE PAGE CONTENT
          ══════════════════════════════════════════════════ */}
      <div className="hz-page" style={{ userSelect: 'none' }} onContextMenu={(e) => e.preventDefault()}>

        {/* ────── SECTION 1: HERO ────── */}
        <section id="hero" className="hz-hero">

          {/* ── Lab scene background image ── */}
          <Image
            src="/herao-bg.jpg"
            alt="Hero background"
            fill
            className="hz-hero-bg-img"
            priority
            sizes="100vw"
            style={{ border: 'none', outline: 'none' }}
          />
          <div className="hz-hero-bg-overlay" />



          {/* The massive interactive title */}
          <div className="hz-hero-title-wrapper hz-title-glow">
            <TextPressure
              text="VIDAANT"
              flex={true}
              alpha={false}
              stroke={false}
              width={true}
              weight={true}
              italic={false}
              textColor="#ffffff"
              strokeColor="#aaaaaa"
              minFontSize={80}
            />
          </div>

          {/* ── Statue: Mouse-parallax wrapper ── */}
          <div ref={statueRef} className="hz-hero-statue-parallax">
            <Image
              src="/hero-statue.png"
              alt="180 HRTZ :)"
              width={900}
              height={900}
              className="hz-hero-statue"
              priority
              sizes="65vw"
              style={{
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Bottom fade — blends hero into the page below */}
          <div className="hz-hero-bottom-fade" />

        </section>

        {/* ────── SECTION 2: ABOUT ────── */}
        <AboutSection />

        {/* ────── SECTION 2.5: QUICK STATS ────── */}
        <section id="stats" style={{ height: '600px', position: 'relative', width: '100vw' }}>
          <FlowingMenu
            items={statItems}
            speed={15}
            textColor="#ffffff"
            bgColor="#111111"
            marqueeBgColor="#39FF14"
            marqueeTextColor="#000000"
            borderColor="#39FF14"
          />
        </section>

        {/* ────── SECTION 3: WORK — Parallax Grid ────── */}
        <div className="hz-divider" style={{ marginBottom: '2rem', marginTop: '4rem' }} />
        <section id="work" style={{ background: 'transparent', position: 'relative' }}>
          <HeroParallax products={[
            { title: 'MUSIC VIDEO EDIT', link: '#', thumbnail: '/p1.png' },
            { title: 'BRAND CAMPAIGN CUT', link: '#', thumbnail: '/p2.png' },
            { title: 'DOCUMENTARY CUT', link: '#', thumbnail: '/p3.png' },
            { title: 'MOTION GRAPHICS REEL', link: '#', thumbnail: '/p4.png' },
            { title: 'SHORT-FORM SERIES', link: '#', thumbnail: '/p5.png' },
            { title: 'COLOUR GRADE REEL', link: '#', thumbnail: '/p6.png' },
            { title: 'AERIAL CITY SEQUENCE', link: '#', thumbnail: '/p7.png' },
            { title: 'FASHION EDITORIAL', link: '#', thumbnail: '/p8.png' },
            { title: 'VFX TITLE SEQUENCE', link: '#', thumbnail: '/p9.png' },
            { title: 'SHORT FILM EDIT', link: '#', thumbnail: '/p10.png' },
            { title: 'CREATOR INTRO PACK', link: '#', thumbnail: '/p11.png' },
            { title: 'CORPORATE CAMPAIGN', link: '#', thumbnail: '/p12.png' },
            { title: 'CINEMATIC REEL 2025', link: '#', thumbnail: '/p13.png' },
            { title: 'TRAVEL DOCUMENTARY', link: '#', thumbnail: '/p14.png' },
            { title: 'ESPORTS HIGHLIGHTS', link: '#', thumbnail: '/p15.png' },
          ]} />
        </section>

        {/* ────── SECTION 3.5: REEL CAROUSEL ────── */}
        <section id="reels" className="hz-section" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
          <div className="hz-divider" style={{ marginBottom: '4rem' }} />
          <p className="hz-section-label">PORTFOLIO · REELS</p>
          <h2 className="hz-section-heading">SELECTED WORK</h2>
          <ReelCarousel videos={[
            'https://res.cloudinary.com/dpuovefvs/video/upload/q_auto/f_auto/v1777233966/vid1_nc11bz.mp4',
            'https://res.cloudinary.com/dpuovefvs/video/upload/q_auto/f_auto/v1777235213/Vid2_kln2ha.mp4',
            'https://res.cloudinary.com/dpuovefvs/video/upload/q_auto/f_auto/v1777235272/Vid3_ntpwdw.mp4',
            'https://res.cloudinary.com/dpuovefvs/video/upload/q_auto/f_auto/v1777235289/Vid5_d0rs29.mp4',
            'https://res.cloudinary.com/dpuovefvs/video/upload/q_auto/f_auto/v1777234062/vid6_usi9t4.mp4'

          ]} />
        </section>

        {/* ────── SECTION 4: SKILLS ────── */}
        <SkillsSection />

        {/* ────── SECTION 5: CONTACT ────── */}
        <ContactSection />
      </div>
      {/* <div>

        <TiltedCard
          imageSrc="https://i.scdn.co/image/ab67616d0000b273d9985092cd88bffd97653b58"
          altText="Kendrick Lamar - GNX Album Cover"
          captionText="Kendrick Lamar - GNX"
          containerHeight="300px"
          containerWidth="300px"
          imageHeight="300px"
          imageWidth="300px"
          rotateAmplitude={12}
          scaleOnHover={1.05}
          showMobileWarning={false}
          showTooltip
          displayOverlayContent
          overlayContent={
            <p className="tilted-card-demo-text">
              Kendrick Lamar - GNX
            </p>
          }
        />
      </div> */}
    </SmoothScroll>
  );
}