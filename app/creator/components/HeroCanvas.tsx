'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { useRef, useMemo, Suspense } from 'react';
import * as THREE from 'three';

/* ─────────────────────────────────────────────
   SWAP: Replace this component with your real 3D model.
   When you have a .glb file, put it in /public and use:
     const { scene } = useGLTF('/your-model.glb')
     return <primitive object={scene} ... />
   ─────────────────────────────────────────────── */

function SittingCreator() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.35) * 0.18;
  });

  const greenMain = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color('#39FF14'),
    emissive: new THREE.Color('#1a5a08'),
    emissiveIntensity: 0.6,
    metalness: 0.65,
    roughness: 0.2,
  }), []);

  const greenBody = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color('#2dcc10'),
    emissive: new THREE.Color('#0f4a06'),
    emissiveIntensity: 0.45,
    metalness: 0.55,
    roughness: 0.3,
  }), []);

  const laptopMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color('#111'),
    emissive: new THREE.Color('#003300'),
    emissiveIntensity: 0.2,
    metalness: 0.95,
    roughness: 0.05,
  }), []);

  const screenGlow = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color('#000'),
    emissive: new THREE.Color('#39FF14'),
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0.85,
  }), []);

  const purpleAccent = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color('#9D4EDD'),
    emissive: new THREE.Color('#5a1fa0'),
    emissiveIntensity: 0.55,
    metalness: 0.6,
    roughness: 0.25,
  }), []);

  return (
    <Float speed={1.8} rotationIntensity={0.08} floatIntensity={0.35}>
      <group ref={groupRef} position={[0.4, -1.2, 0]} scale={1}>

        {/* ── Head ── */}
        <mesh position={[0, 3.3, 0]} material={greenMain}>
          <sphereGeometry args={[0.48, 32, 32]} />
        </mesh>

        {/* ── Neck ── */}
        <mesh position={[0, 2.72, 0]} material={greenMain}>
          <cylinderGeometry args={[0.16, 0.19, 0.38, 16]} />
        </mesh>

        {/* ── Torso ── */}
        <mesh position={[0, 1.65, 0]} material={greenBody}>
          <boxGeometry args={[1.15, 1.8, 0.58]} />
        </mesh>

        {/* ── Shoulders (purple accent) ── */}
        <mesh position={[-0.7, 2.3, 0]} material={purpleAccent}>
          <sphereGeometry args={[0.24, 16, 16]} />
        </mesh>
        <mesh position={[0.7, 2.3, 0]} material={purpleAccent}>
          <sphereGeometry args={[0.24, 16, 16]} />
        </mesh>

        {/* ── Left upper arm ── */}
        <mesh position={[-0.82, 1.85, 0]} rotation={[0, 0, Math.PI / 5.5]} material={greenMain}>
          <cylinderGeometry args={[0.17, 0.14, 0.88, 12]} />
        </mesh>

        {/* ── Right upper arm ── */}
        <mesh position={[0.82, 1.85, 0]} rotation={[0, 0, -Math.PI / 5.5]} material={greenMain}>
          <cylinderGeometry args={[0.17, 0.14, 0.88, 12]} />
        </mesh>

        {/* ── Left forearm (bent toward laptop) ── */}
        <mesh position={[-0.65, 1.1, 0.35]} rotation={[Math.PI / 2.8, 0, Math.PI / 10]} material={greenMain}>
          <cylinderGeometry args={[0.14, 0.12, 0.78, 12]} />
        </mesh>

        {/* ── Right forearm ── */}
        <mesh position={[0.65, 1.1, 0.35]} rotation={[Math.PI / 2.8, 0, -Math.PI / 10]} material={greenMain}>
          <cylinderGeometry args={[0.14, 0.12, 0.78, 12]} />
        </mesh>

        {/* ── Laptop base ── */}
        <mesh position={[0, 0.72, 0.42]} material={laptopMat}>
          <boxGeometry args={[1.05, 0.06, 0.72]} />
        </mesh>

        {/* ── Laptop screen ── */}
        <mesh position={[0, 1.24, 0.06]} rotation={[-Math.PI / 5.5, 0, 0]} material={laptopMat}>
          <boxGeometry args={[1.0, 0.7, 0.035]} />
        </mesh>

        {/* ── Screen glow content ── */}
        <mesh position={[0, 1.24, 0.041]} rotation={[-Math.PI / 5.5, 0, 0]} material={screenGlow}>
          <planeGeometry args={[0.88, 0.58]} />
        </mesh>

        {/* ── Upper legs (sitting, angled forward) ── */}
        <mesh position={[-0.33, 0.22, 0.45]} rotation={[Math.PI / 2.3, 0, 0.08]} material={greenBody}>
          <cylinderGeometry args={[0.24, 0.21, 1.05, 12]} />
        </mesh>
        <mesh position={[0.33, 0.22, 0.45]} rotation={[Math.PI / 2.3, 0, -0.08]} material={greenBody}>
          <cylinderGeometry args={[0.24, 0.21, 1.05, 12]} />
        </mesh>

        {/* ── Lower legs (hanging down) ── */}
        <mesh position={[-0.38, -0.75, 0.62]} rotation={[Math.PI / 7, 0, 0.05]} material={greenMain}>
          <cylinderGeometry args={[0.2, 0.17, 1.0, 12]} />
        </mesh>
        <mesh position={[0.38, -0.75, 0.62]} rotation={[Math.PI / 7, 0, -0.05]} material={greenMain}>
          <cylinderGeometry args={[0.2, 0.17, 1.0, 12]} />
        </mesh>

        {/* ── Chair/seat platform ── */}
        <mesh position={[0, -0.15, 0]} material={purpleAccent}>
          <boxGeometry args={[1.4, 0.08, 0.9]} />
        </mesh>

        {/* ── Chair back ── */}
        <mesh position={[0, 0.9, -0.42]} material={purpleAccent}>
          <boxGeometry args={[1.2, 1.6, 0.07]} />
        </mesh>

        {/* ── Headphones arc (stylized) ── */}
        <mesh position={[0, 3.85, 0]} rotation={[0, 0, 0]} material={purpleAccent}>
          <torusGeometry args={[0.52, 0.055, 12, 32, Math.PI]} />
        </mesh>
        {/* ── Left ear cup ── */}
        <mesh position={[-0.52, 3.52, 0]} material={purpleAccent}>
          <sphereGeometry args={[0.13, 12, 12]} />
        </mesh>
        {/* ── Right ear cup ── */}
        <mesh position={[0.52, 3.52, 0]} material={purpleAccent}>
          <sphereGeometry args={[0.13, 12, 12]} />
        </mesh>

      </group>
    </Float>
  );
}

function SceneSetup() {
  return (
    <>
      {/* Ambient */}
      <ambientLight intensity={0.08} color="#001100" />

      {/* Key light — green from front-left */}
      <pointLight position={[-4, 4, 6]} color="#39FF14" intensity={3.5} distance={18} />

      {/* Rim light — purple from back-right */}
      <pointLight position={[5, 2, -4]} color="#9D4EDD" intensity={2.5} distance={15} />

      {/* Fill — green below for bounce */}
      <pointLight position={[0, -3, 5]} color="#1a7a0a" intensity={1.2} distance={10} />

      {/* Screen glow simulation */}
      <pointLight position={[0.4, 1.3, 0.5]} color="#39FF14" intensity={1.0} distance={4} />
    </>
  );
}

export default function HeroCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 1, 9], fov: 38 }}
      gl={{ alpha: true, antialias: true }}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <SceneSetup />
        <SittingCreator />
      </Suspense>
    </Canvas>
  );
}
