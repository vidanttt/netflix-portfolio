'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MIRROR, FPS_EYE_HEIGHT, type RoomCamera } from '@/components/GridScan';
import { buildWeapon } from './WeaponView';
import { animateBody, characterById, holdGrip, loadAvatar, makeAvatar, updateSprings, type Avatar, type Gait } from './avatar';
import { polygonCss, quadPolygon, screenCtx } from './place';

/**
 * You, in the mirror on the back wall of the grid room. The room's own shader draws the glass
 * and the room reflected in it; this layer adds the character: posed from how you move (walk,
 * run, jump, look up and down, the weapon you hold) and drawn reflected through the mirror's
 * plane, clipped on screen to the glass. It sits under the room's DOM panels, so anything that
 * stands between you and the mirror still covers it.
 */
export type MirrorApi = {
  update: (cam: RoomCamera, dt: number, opts: { weapon: string | null; lights: boolean; character: string }) => void;
};

// three.js has z the other way round from the room
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, -z);
const WEAPON_SCALE = 0.6; // view metres -> canonical units (see avatar.ts)
const POLE_R = new THREE.Vector3(-0.2, 0.05, 0.4);
const POLE_L = new THREE.Vector3(-0.2, 0.05, -0.4);

const MirrorLayer = forwardRef<MirrorApi>(function MirrorLayer(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<MirrorApi | null>(null);
  useImperativeHandle(ref, () => ({ update: (...a) => apiRef.current?.update(...a) }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch {
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.5;
    const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 30);
    const hemi = new THREE.HemisphereLight(0xcfd9ff, 0x14151a, 1.1);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(0.3, 2, -1);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7dd3fc, 0.9);
    rim.position.set(-1, 0.6, 1);
    scene.add(rim);

    // everything in `world` is reflected through the mirror's plane
    const world = new THREE.Group();
    world.matrixAutoUpdate = false;
    scene.add(world);

    // one avatar per character, each fetched the first time it's wanted (never with the page)
    const avatars = new Map<string, Avatar | null>();
    let me: Avatar | null = null;
    let disposed = false;
    const want = (id: string) => {
      if (avatars.has(id)) return avatars.get(id) ?? null;
      avatars.set(id, null);
      const def = characterById(id);
      loadAvatar(def.url)
        .then((src) => {
          if (disposed) return;
          const a = makeAvatar(def, src);
          a.root.scale.setScalar(FPS_EYE_HEIGHT / a.eye.y); // eyes at the player's eye height
          a.root.visible = false;
          world.add(a.root);
          avatars.set(id, a);
        })
        .catch(() => avatars.delete(id));
      return null;
    };
    let shown = false;
    if (process.env.NODE_ENV !== 'production') (window as unknown as { __mirrorDebug: unknown }).__mirrorDebug = { avatars };

    const weapons = new Map<string, THREE.Group | null>();
    let held: { id: string; root: THREE.Group } | null = null;
    const hold = (id: string | null) => {
      if (held?.id === id) return;
      if (held) held.root.removeFromParent();
      held = null;
      if (!id || !me) return;
      if (!weapons.has(id)) {
        const w = buildWeapon(id);
        weapons.set(id, w ? w.root : null);
      }
      const root = weapons.get(id);
      if (!root) return;
      me.canon.add(root);
      root.scale.setScalar(WEAPON_SCALE);
      held = { id, root };
    };

    const gait: Gait = { phase: 0, walk: 0, sprint: 0, air: 0, pitch: 0, time: 0, armed: false };
    const last = { x: 0, z: 0, ready: false };
    const reflect = new THREE.Matrix4();
    const pitchQ = new THREE.Quaternion();
    const faceQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
    const zAxis = new THREE.Vector3(0, 0, 1);
    const shoulder = new THREE.Vector3(-0.02, 0.29, 0.06);

    apiRef.current = {
      update: (cam, dt, opts) => {
        const W = window.innerWidth;
        const H = window.innerHeight;
        // only while you're in the main room, in first person, with the glass in view
        const D = cam.depth;
        const poly =
          cam.fps && cam.blend > 0.6 && cam.room === 0 && cam.pos[2] < D
            ? quadPolygon(screenCtx(cam), [
                [MIRROR.x - MIRROR.halfW, MIRROR.bottom, D],
                [MIRROR.x + MIRROR.halfW, MIRROR.bottom, D],
                [MIRROR.x + MIRROR.halfW, MIRROR.bottom + MIRROR.height, D],
                [MIRROR.x - MIRROR.halfW, MIRROR.bottom + MIRROR.height, D],
              ])
            : null;
        const next = cam.fps ? want(opts.character) : me;
        if (next !== me) {
          // a different character: the weapon moves over, the old one goes away
          if (held) held.root.removeFromParent();
          held = null;
          if (me) me.root.visible = false;
          me = next;
          shown = false;
        }
        const b = cam.body;
        // the walk is driven by how far you actually moved
        const moved = last.ready ? Math.hypot(b.x - last.x, b.z - last.z) : 0;
        Object.assign(last, { x: b.x, z: b.z, ready: cam.fps });
        const speed = dt > 0 ? Math.min(3, moved / dt) : 0;
        const k = 1 - Math.exp(-dt * 10);
        gait.walk += (Math.min(1, speed / 0.55) - gait.walk) * k;
        gait.sprint += ((cam.sprinting && speed > 0.9 ? 1 : 0) - gait.sprint) * k;
        gait.air += ((cam.grounded ? 0 : 1) - gait.air) * (1 - Math.exp(-dt * 12));
        gait.phase += (speed / 0.4) * Math.PI * 2 * dt; // two steps per 0.4 of the room
        gait.pitch = THREE.MathUtils.clamp(b.pitch, -1, 1);
        gait.time = cam.time;
        if (!poly || !me) {
          canvas.style.display = 'none';
          shown = false;
          return;
        }
        canvas.style.display = '';
        me.root.visible = true;
        canvas.style.clipPath = polygonCss(poly);

        // you, where you stand, facing where you look
        me.root.position.copy(V(b.x, b.y, b.z));
        me.root.rotation.set(0, -b.yaw, 0);
        hold(opts.weapon);
        gait.armed = !!held;
        animateBody(me, gait);
        if (held) {
          // the weapon sits out in front of the right shoulder, tilted with the look
          const kind = held.id;
          const long = kind === 'ak47' || kind === 'mp5' || kind === 'shotgun';
          const knife = kind === 'karambit';
          pitchQ.setFromAxisAngle(zAxis, knife ? 0 : gait.pitch * 0.85);
          const at = knife ? new THREE.Vector3(0.1, 0.06, 0.1) : long ? new THREE.Vector3(0.14, 0.2, 0.05) : new THREE.Vector3(0.21, 0.24, 0.025);
          at.sub(shoulder).applyQuaternion(pitchQ).add(shoulder);
          held.root.position.copy(at);
          held.root.quaternion.copy(pitchQ).multiply(faceQ);
          const gripR = held.root.getObjectByName('grip-R');
          const gripL = held.root.getObjectByName('grip-L');
          if (gripR) holdGrip(me, 'R', gripR, POLE_R, knife ? 1 : 0.85);
          if (gripL) holdGrip(me, 'L', gripL, POLE_L, 0.75);
        }

        // reflect through the glass (three z = -room z)
        reflect.makeScale(1, 1, -1).premultiply(new THREE.Matrix4().makeTranslation(0, 0, -2 * D));
        world.matrix.copy(reflect);
        world.matrixWorldNeedsUpdate = true;
        // hair and skirt follow through on every step, turn and jump (from rest when it reappears)
        if (!shown) for (const j of me.springs) j.ready = false;
        updateSprings(me, world, dt);
        shown = true;

        const dim = opts.lights ? 1 : 0.45;
        hemi.intensity = 1.1 * dim;
        key.intensity = 1.5 * dim;
        scene.environmentIntensity = 0.5 * dim;

        renderer.setSize(W, H, false);
        camera.aspect = W / H;
        camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(0.5 / cam.focal));
        camera.updateProjectionMatrix();
        camera.position.copy(V(cam.pos[0], cam.pos[1], cam.pos[2]));
        camera.up.copy(V(cam.up[0], cam.up[1], cam.up[2]));
        camera.lookAt(V(cam.pos[0] + cam.forward[0], cam.pos[1] + cam.forward[1], cam.pos[2] + cam.forward[2]));
        renderer.render(scene, camera);
      },
    };

    return () => {
      disposed = true;
      apiRef.current = null;
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="mirror-canvas" aria-hidden="true" style={{ display: 'none' }} />;
});

export default MirrorLayer;
