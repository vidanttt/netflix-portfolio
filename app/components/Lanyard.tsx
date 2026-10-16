/* eslint-disable react/no-unknown-property */
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  useGLTF,
  useTexture,
  Environment,
  Lightformer,
} from "@react-three/drei";
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  RigidBodyProps,
} from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import * as THREE from "three";

interface LanyardProps {
  position?: [number, number, number];
  gravity?: [number, number, number];
  fov?: number;
  transparent?: boolean;
}

export default function Lanyard({
  position = [0, 0, 30],
  gravity = [0, -40, 0],
  fov = 20,
  transparent = true,
}: LanyardProps) {
  return (
    <div className="w-full h-full" style={{ touchAction: "none" }}>
      <Canvas
        camera={{ position, fov }}
        gl={{ alpha: transparent }}
        onCreated={({ gl }) =>
          gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 0)
        }
      >
        <ambientLight intensity={Math.PI} />
        <Physics gravity={gravity} timeStep={1 / 60}>
          <Band />
        </Physics>
        <Environment blur={0.75}>
          <Lightformer
            intensity={2}
            color="white"
            position={[0, -1, 5]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color="white"
            position={[-1, -1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color="white"
            position={[1, 1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={10}
            color="white"
            position={[-10, 0, 14]}
            rotation={[0, Math.PI / 2, Math.PI / 3]}
            scale={[100, 10, 1]}
          />
        </Environment>
      </Canvas>
    </div>
  );
}

interface BandProps {
  maxSpeed?: number;
  minSpeed?: number;
}

// Simple rope using basic Three.js Line - guaranteed to work
function SimpleRope({ fixed, j1, j2, j3, card }: any) {
  const lineRef = useRef<any>(null);
  const [points, setPoints] = useState<THREE.Vector3[]>([]);

  useFrame(() => {
    if (
      fixed.current &&
      j1.current &&
      j2.current &&
      j3.current &&
      card.current
    ) {
      // Only go from fixed point to the top of the card (j3), not to the card center
      const cardTopPosition = new THREE.Vector3().copy(
        j3.current.translation()
      );

      const newPoints = [
        new THREE.Vector3().copy(fixed.current.translation()),
        new THREE.Vector3().copy(j1.current.translation()),
        new THREE.Vector3().copy(j2.current.translation()),
        cardTopPosition, // Stop at the connection point, not the card center
      ];
      setPoints(newPoints);
    }
  });

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    if (points.length > 0) {
      geom.setFromPoints(points);
    }
    return geom;
  }, [points]);

  return (
    <primitive
      ref={lineRef}
      object={
        new THREE.Line(
          geometry,
          new THREE.LineBasicMaterial({
            color: 0xffffff,
            linewidth: 3,
          })
        )
      }
    />
  );
}

/* ── ID-card face ─────────────────────────────────────────────────────
   card.glb maps one 1678×1678 sheet with two UV islands: the left (x 0–869) is the face
   that hangs toward the viewer, the right (x 874–1678) is the reverse. This paints a new
   sheet in that layout: the creator-page profile photo + name + role on the front face,
   a VS monogram on the reverse. */
const SHEET = 2048;
const K = SHEET / 1678;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function paintCardSheet(photo: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = SHEET;
  const ctx = c.getContext("2d")!;
  ctx.scale(K, K);

  // brushed off-white base
  const bg = ctx.createLinearGradient(0, 0, 1678, 1678);
  bg.addColorStop(0, "#f4f4f6");
  bg.addColorStop(1, "#d9d9de");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1678, 1678);

  const sans = "'Space Grotesk', system-ui, 'Segoe UI', Helvetica, Arial, sans-serif";
  const mono = "'Geist Mono Local', ui-monospace, Menlo, Consolas, monospace";

  // ── face A (UV island x 0–869, y 0–1267): the profile photo, name and role.
  // This is the face that hangs toward the viewer by default.
  const px = 56, py = 150, pw = 757, ph = 700;
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 54);
  ctx.clip();
  const scale = Math.max(pw / photo.width, ph / photo.height);
  const dw = photo.width * scale, dh = photo.height * scale;
  ctx.drawImage(photo, px - (dw - pw) * 0.3, py - (dh - ph) * 0.15, dw, dh);
  const fade = ctx.createLinearGradient(0, py + ph * 0.62, 0, py + ph);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = fade;
  ctx.fillRect(px, py, pw, ph);
  ctx.restore();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#0b0b0d";
  ctx.font = `700 96px ${sans}`;
  ctx.fillText("Vidant Sharma", px, 972);
  ctx.fillStyle = "#0a8f2a";
  ctx.font = `600 40px ${mono}`;
  ctx.fillText("CREATIVE DEV", px, 1036);
  ctx.fillStyle = "rgba(11,11,13,0.62)";
  ctx.font = `500 32px ${mono}`;
  ctx.fillText("video editor · motion designer", px, 1088);
  ctx.fillText("@180hrtz_", px, 1134);

  // ── face B (UV island x 874–1678, y 0–1270): monogram
  const cx = 1276, cy = 600;
  ctx.strokeStyle = "#0b0b0d";
  ctx.lineWidth = 22;
  roundRect(ctx, cx - 250, cy - 250, 500, 500, 120);
  ctx.stroke();
  ctx.fillStyle = "#0b0b0d";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 250px ${sans}`;
  ctx.fillText("VS", cx, cy - 6);
  ctx.font = `600 36px ${mono}`;
  ctx.fillText("CREATIVE DEV", cx, cy + 330);

  return c;
}

function useProfileCardTexture(): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let dead = false;
    let made: THREE.Texture | null = null;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      try {
        // make sure the card fonts are ready before painting text onto the sheet
        await document.fonts?.load("700 40px 'Space Grotesk'");
        await document.fonts?.load("600 20px 'Geist Mono Local'");
      } catch {
        /* fall back to system fonts */
      }
      if (dead) return;
      const t = new THREE.CanvasTexture(paintCardSheet(img));
      t.flipY = false; // glTF convention, same as the texture it replaces
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
      made = t;
      setTex(t);
    };
    img.src = "/image.png"; // the profile photo used on the creator page
    return () => {
      dead = true;
      made?.dispose();
    };
  }, []);
  return tex;
}

function Band({ maxSpeed = 50, minSpeed = 0 }: BandProps) {
  const band = useRef<any>(null);
  const fixed = useRef<any>(null);
  const j1 = useRef<any>(null);
  const j2 = useRef<any>(null);
  const j3 = useRef<any>(null);
  const card = useRef<any>(null);

  const vec = new THREE.Vector3();
  const ang = new THREE.Vector3();
  const rot = new THREE.Vector3();
  const dir = new THREE.Vector3();

  const segmentProps: any = {
    type: "dynamic" as RigidBodyProps["type"],
    canSleep: true,
    colliders: false,
    angularDamping: 1.5, // Reduced for more flexibility
    linearDamping: 1.5, // Reduced for more flexibility
  };

  // ✅ Load GLB + texture from /public
  const { nodes, materials } = useGLTF("/card.glb") as any;
  const texture = useTexture("/lanyard.png");
  const profileMap = useProfileCardTexture();

  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ])
  );
  const [dragged, drag] = useState<false | THREE.Vector3>(false);
  const [hovered, hover] = useState(false);

  const [isSmall, setIsSmall] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = (): void => {
      setIsSmall(window.innerWidth < 1024);
    };
    window.addEventListener("resize", handleResize);
    return (): void => window.removeEventListener("resize", handleResize);
  }, []);

  // Rope joints - shorter string length
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 0.6]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 0.6]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 0.5]);
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, 1.45, 0],
  ]);

  // Cursor logic
  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? "grabbing" : "grab";
      return () => {
        document.body.style.cursor = "auto";
      };
    }
  }, [hovered, dragged]);

  // Animation loop
  useFrame((state, delta) => {
    if (dragged && typeof dragged !== "boolean") {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    }
    if (fixed.current) {
      [j1, j2].forEach((ref) => {
        if (!ref.current.lerped)
          ref.current.lerped = new THREE.Vector3().copy(
            ref.current.translation()
          );
        const clampedDistance = Math.max(
          0.1,
          Math.min(1, ref.current.lerped.distanceTo(ref.current.translation()))
        );
        ref.current.lerped.lerp(
          ref.current.translation(),
          delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed))
        );
      });
      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(j2.current.lerped);
      curve.points[2].copy(j1.current.lerped);
      curve.points[3].copy(fixed.current.translation());

      // Update the line geometry with new points
      if (band.current) {
        lineGeometry.setPoints(curve.getPoints(32));
      }
      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.1, z: ang.z }); // Reduced rotation damping for more natural movement
    }
  });

  curve.curveType = "chordal";
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  // Create line geometry and material
  const lineGeometry = useMemo(() => new MeshLineGeometry(), []);

  const lineMaterial = useMemo(
    () =>
      new MeshLineMaterial({
        color: "#ffffff",
        depthTest: true,
        resolution: isSmall ? [1000, 2000] : [1000, 1000],
        useMap: false, // Disable texture for now to make it visible
        lineWidth: 2,
        transparent: false,
        opacity: 1.0,
      }),
    [isSmall]
  );

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody
          ref={fixed}
          {...segmentProps}
          type={"fixed" as RigidBodyProps["type"]}
        />
        <RigidBody position={[0.2, -0.3, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[0.4, -0.6, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[0.6, -0.9, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[0.8, -1.2, 0]}
          ref={card}
          {...segmentProps}
          type={
            dragged
              ? ("kinematicPosition" as RigidBodyProps["type"])
              : ("dynamic" as RigidBodyProps["type"])
          }
        >
          {/* Larger collider for better mobile touch interaction */}
          <CuboidCollider args={[1.2, 1.5, 0.1]} />
          <group
            scale={isSmall ? 3.0 : 2.25} // Bigger on mobile
            position={[0, -1.2, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={(e: any) => {
              e.target.releasePointerCapture?.(e.pointerId);
              drag(false);
            }}
            onPointerDown={(e: any) => {
              e.target.setPointerCapture?.(e.pointerId);
              drag(
                new THREE.Vector3()
                  .copy(e.point)
                  .sub(vec.copy(card.current.translation()))
              );
            }}
          >
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial
                map={profileMap ?? materials.base?.map ?? texture}
                clearcoat={1}
                clearcoatRoughness={0.12}
                roughness={profileMap ? 0.55 : 0.9}
                metalness={profileMap ? 0.25 : 0.8}
              />
            </mesh>
            <mesh
              geometry={nodes.clip.geometry}
              material={materials.metal}
              material-roughness={0.3}
            />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>

      {/* Rope/Thread using MeshLine */}
      <mesh ref={band} geometry={lineGeometry} material={lineMaterial} />

      {/* Simple fallback rope - guaranteed to be visible */}
      <SimpleRope fixed={fixed} j1={j1} j2={j2} j3={j3} card={card} />
    </>
  );
}
