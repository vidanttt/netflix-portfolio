'use client';

import Particles from "@/app/Backgrounds/Particles";
import React from "react";
import { FloatingDock } from "@/app/components/Floating-Dock";
import {
  IconBrandGithub,
  IconBrandX,
  IconExchange,
  IconHome,
  IconNewSection,
  IconTerminal2,
} from "@tabler/icons-react";
import TextPressure from "@/app/TextPressure/TextPressure";




export function FloatingDockDemo() {
  const links = [
    {
      title: "ME",
      icon: (
        <IconHome className="h-full w-full text-white" />
      ),
      href: "#",
    },
    {
      title: "PROJECTS",
      icon: (
        <IconTerminal2 className="h-full w-full text-white" />
      ),
      href: "#",
    },
    {
      title: ":/",
      icon: (
        <IconNewSection className="h-full w-full text-white" />
      ),
      href: "#",
    },
    {
      title: "LINKEDIN",
      icon: (
        <img
          src="https://assets.aceternity.com/logo-dark.png"
          width={20}
          height={20}
          alt="Aceternity Logo"
        />
      ),
      href: "#",
    },
    {
      title: "INSTAGRAM",
      icon: (
        <img
          src="/instagram.png"
          width={30}
          height={30}
          alt="Instagram Logo"
          style={{ filter: 'brightness(1.5) invert(0)' }}
        />
      ),
      href: "#",
    },
    {
      title: "TWITTER",
      icon: (
        <IconBrandX className="h-full w-full text-white" />
      ),
      href: "#",
    },
    {
      title: "GITHUB",
      icon: (
        <IconBrandGithub className="h-full w-full text-white" />
      ),
      href: "#",
    },
  ];
  return (
    <div
      className="flex items-center justify-center w-full"
      style={{
        position: 'fixed',
        left: '3px',
        right: '3px',
        bottom: '3px',
        zIndex: 20,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          background: 'rgba(24, 24, 27, 0.85)', // dark grey with opacity
          borderRadius: '1.5rem',
          boxShadow: '0 4px 32px 0 rgba(0,0,0,0.25)',
          padding: '0.5rem 1.25rem',
          backdropFilter: 'blur(8px)',
        }}
      >
        <FloatingDock
          mobileClassName="-translate-y-4"
          items={links}
        />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        margin: 0,
        padding: 0,
        background: '#000000ff', // Tailwind's zinc-900 for a dark grey
        border: '3px solid white',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        zIndex: 0,
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <Particles
        particleColors={['#ffffff', '#ffffff']}
        particleCount={200}
        particleSpread={10}
        speed={0.1}
        particleBaseSize={100}
        moveParticlesOnHover={true}
        alphaParticles={false}
        disableRotation={false}
      />
      <FloatingDockDemo />
<div
  style={{
    position: 'absolute',
    top: 0,
    left: 0,
    width: '98vw',
    height: 'auto',
    minHeight: '10vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 10,
    overflow: 'visible',
  }}
>
  <div style={{ pointerEvents: 'auto' }}>
    <TextPressure
      text="PORTFOLIO!"
      flex={true}
      alpha={false}
      stroke={false}
      width={true}
      weight={true}
      italic={true}
      textColor="#ffffff"
      strokeColor="#ff0000"
      minFontSize={120}
      className="!text-[120px]"
    />
  </div>
</div>

    </div>

    
  );
}