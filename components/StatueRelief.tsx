'use client';

/**
 * StatueRelief — renders the real 3D statue model (/3d model.glb) in the hero.
 * It follows the pointer (capped tilt), is lit with page-accent rim lights and
 * a generated studio environment (no network HDR), and falls back to the flat
 * PNG while the model loads, without WebGL, or under reduced motion.
 *
 * Name kept as StatueRelief so the creator page import doesn't change.
 */

import React, { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const FALLBACK_SRC = '/hero-statue.png';
const MODEL_URL = encodeURI('/3d model.glb');
const FOV = 20;
const FILL = 0.96; // fraction of the container height the model occupies
const SPIN = 0.28; // rad/s idle turntable (~22 s per turn)
const TAU = Math.PI * 2;

/* Studio-style reflections generated on the GPU — keeps metals from going black */
function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const rt = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = rt.texture;
    scene.environmentIntensity = 0.55;
    return () => {
      scene.environment = null;
      rt.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function Model({ coarse, onReady }: { coarse: boolean; onReady: () => void }) {
  const { scene: source } = useGLTF(MODEL_URL);
  const group = useRef<THREE.Group>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const { size, camera, gl } = useThree();

  // Centre the model on its own bounds
  const { object, extent } = useMemo(() => {
    const object = source.clone(true);
    object.updateMatrixWorld(true); // quantized GLBs carry their scale on the node
    const box = new THREE.Box3().setFromObject(object);
    const centre = box.getCenter(new THREE.Vector3());
    const extent = box.getSize(new THREE.Vector3());
    object.position.sub(centre);
    return { object, extent };
  }, [source]);

  /* Size + placement. The hero container is far larger than the phone screen on
     mobile (CSS bleeds it off-screen), so there we size from the viewport instead. */
  const vpRef = useRef<{ vw: number; vh: number } | null>(null);
  const layout = useMemo(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : size.width;
    // Keep the first-seen viewport height: mobile browsers resize the viewport as the
    // address bar collapses while scrolling, which must not re-place the model.
    if (!vpRef.current || vpRef.current.vw !== vw) {
      vpRef.current = { vw, vh: typeof window !== 'undefined' ? window.innerHeight : size.height };
    }
    const vh = vpRef.current.vh;
    const narrow = vw <= 768;
    const diag = Math.hypot(extent.x, extent.z); // widest it gets while spinning
    let maxH = size.height * FILL;
    let maxW = size.width * FILL;
    let offset = new THREE.Vector3(0, 0, 0);
    if (narrow) {
      // Full-screen landing: the statue fills most of the hero and may bleed off the sides
      maxH = Math.min(maxH, vh * 0.54);
      maxW = vw * 2.2;
      const rect = gl.domElement.getBoundingClientRect();
      if (rect.height > 0) {
        // Page coordinates (not screen), so the model is pinned to the hero and scrolls
        // away with the title instead of being re-centred on the screen.
        const pageTop = rect.top + window.scrollY;
        const wantX = vw * 0.52 - (rect.left + rect.width / 2);
        const wantY = -(vh * 0.58 - (pageTop + rect.height / 2));
        offset = new THREE.Vector3(wantX, wantY, 0);
      }
    }
    const fit = Math.min(maxH / Math.max(extent.y, 1e-6), maxW / Math.max(diag, 1e-6));
    const radius = 0.5 * Math.max(extent.y * fit, diag * fit) * 0.8;
    return { fit, offset, radius };
  }, [size, extent, gl]);

  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = FOV;
    cam.position.z = size.height / 2 / Math.tan((FOV * Math.PI) / 360);
    cam.near = 10;
    cam.far = cam.position.z * 6;
    cam.updateProjectionMatrix();
  }, [camera, size]);

  const st = useRef({
    yaw: 0,
    pitch: 0,
    tiltX: 0,
    tiltY: 0,
    px: 0,
    py: 0,
    hovering: false,
    dragging: false,
    touched: false, // user has dragged during this interaction
    returning: false,
    startX: 0,
    startY: 0,
    yaw0: 0,
    pitch0: 0,
  });
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const told = useRef(false);

  /* Pointer: hover tilt, click-drag to orient. Listened on window because the
     canvas itself must not swallow clicks meant for the page underneath. */
  useEffect(() => {
    const s = st.current;
    const ray = new THREE.Raycaster();
    const sphere = new THREE.Sphere();
    const hit = new THREE.Vector3();
    const ndc = new THREE.Vector2();

    const over = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1));
      ray.setFromCamera(ndc, camera);
      sphere.center.copy(layoutRef.current.offset);
      sphere.radius = layoutRef.current.radius;
      return ray.ray.intersectSphere(sphere, hit) !== null;
    };

    const endInteraction = () => {
      s.hovering = false;
      s.touched = false;
      s.returning = true;
    };

    const onMove = (e: PointerEvent) => {
      if (s.dragging) {
        s.yaw = s.yaw0 + (e.clientX - s.startX) * 0.009;
        s.pitch = Math.max(-0.6, Math.min(0.6, s.pitch0 + (e.clientY - s.startY) * 0.006));
        return;
      }
      if (e.pointerType !== 'mouse') return;
      s.px = (e.clientX / window.innerWidth - 0.5) * 2;
      s.py = (e.clientY / window.innerHeight - 0.5) * 2;
      const now = over(e);
      if (now && !s.hovering) {
        s.hovering = true;
        s.touched = false;
        s.returning = false;
      } else if (!now && s.hovering) endInteraction();
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if ((e.target as Element | null)?.closest?.('a,button,input,textarea,select,[role="button"]')) return;
      if (!over(e)) return;
      s.dragging = true;
      s.touched = true;
      s.returning = false;
      s.startX = e.clientX;
      s.startY = e.clientY;
      s.yaw0 = s.yaw;
      s.pitch0 = s.pitch;
    };

    const onUp = (e: PointerEvent) => {
      if (!s.dragging) return;
      s.dragging = false;
      // Mouse still over the model: keep the pose until it leaves. Otherwise glide home.
      if (e.pointerType === 'mouse' && over(e)) s.hovering = true;
      else endInteraction();
    };

    const onLeave = () => {
      if (s.dragging) return;
      if (s.hovering) endInteraction();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    window.addEventListener('blur', onLeave);
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', onLeave);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, [camera, gl]);

  useFrame((_, dt) => {
    const s = st.current;
    const ease = (rate: number) => 1 - Math.exp(-dt * rate);
    const home = Math.round(s.yaw / TAU) * TAU; // nearest "facing front" angle

    if (s.dragging) {
      // yaw/pitch are driven by the pointer
    } else if (s.hovering && s.touched) {
      // user oriented it by hand and is still over it: hold the pose
    } else if (s.hovering || s.returning) {
      // face front (hover) or glide home after leaving
      s.yaw += (home - s.yaw) * ease(3.2);
      s.pitch += (0 - s.pitch) * ease(3.2);
      if (s.returning && Math.abs(home - s.yaw) < 0.03 && Math.abs(s.pitch) < 0.02) {
        s.yaw = home;
        s.pitch = 0;
        s.returning = false;
      }
    } else {
      s.yaw += dt * SPIN; // idle: slow turntable
      s.pitch += (0 - s.pitch) * ease(2);
    }

    // Subtle pointer-follow tilt, only while hovering with a mouse
    const tx = s.hovering && !coarse ? s.px * 0.3 : 0;
    const ty = s.hovering && !coarse ? s.py * 0.12 : 0;
    s.tiltY += (tx - s.tiltY) * ease(4);
    s.tiltX += (ty - s.tiltX) * ease(4);

    if (group.current) {
      group.current.rotation.set(s.pitch + s.tiltX, s.yaw + s.tiltY, 0, 'YXZ');
    }
    if (key.current) {
      key.current.position.set(-s.tiltY * 1400 - 200, -s.tiltX * 1600 + 500, 700);
    }
    if (!told.current) {
      told.current = true;
      onReady();
    }
  });

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight ref={key} intensity={2.4} color="#fff4e6" />
      {/* purple rim from behind-left, green kicker from the right to match the page accents */}
      <directionalLight position={[-700, 300, -250]} intensity={2.6} color="#9d4edd" />
      <directionalLight position={[700, -200, 200]} intensity={1} color="#39ff14" />
      <StudioEnvironment />

      <group position={layout.offset}>
        <group ref={group}>
          <group scale={layout.fit}>
            <primitive object={object} />
          </group>
        </group>
      </group>
    </>
  );
}

export default function StatueRelief({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const [supported, setSupported] = useState(true);
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const test = document.createElement('canvas');
    const gl = test.getContext('webgl2') || test.getContext('webgl');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!gl || reduced) setSupported(false);
    setCoarse(window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 768);
  }, []);

  // Pause rendering when the hero is off-screen or the tab is hidden
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    let inView = true;
    const sync = () => setActive(inView && !document.hidden);
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener('visibilitychange', sync);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  return (
    <div ref={wrapRef} className={className} style={{ aspectRatio: '1200 / 896', ...style }}>
      {/* Static first frame: also the permanent fallback without WebGL / under reduced motion */}
      {(!ready || !supported) && (
        <Image
          src={FALLBACK_SRC}
          alt="180 HRTZ :)"
          width={900}
          height={900}
          priority
          sizes="65vw"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom right', pointerEvents: 'none' }}
        />
      )}
      {supported && (
        <Canvas
          frameloop={active ? 'always' : 'never'}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          camera={{ fov: FOV, position: [0, 0, 1000] }}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: ready ? 1 : 0, transition: 'opacity 0.6s ease' }}
          aria-hidden="true"
        >
          <Suspense fallback={null}>
            <Model coarse={coarse} onReady={() => setReady(true)} />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
