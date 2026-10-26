import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * The player characters, and everything that poses them.
 *
 * Each character is a rigged glTF with its own skeleton, proportions and bind pose. They are all
 * driven in one shared "canonical" space, the space of the first character (an auto-rigged scan):
 * x forward, y up, z to the character's right, 0.98 tall, feet at y = -0.49. Each avatar carries
 * `canon`, an object inside its model that maps canonical space onto its own, so the walk cycle,
 * the grips, the elbow poles and the weapon placements are written once and fit every body.
 *
 * Bones are posed as rotations away from their bind pose, about canonical axes (forward, up,
 * right) expressed in the parent's bind frame, so the same numbers bend any rig's knee forward.
 */

export type Side = 'R' | 'L';
type Semantic =
  | 'hips' | 'spine' | 'chest' | 'neck' | 'head'
  | `${Side}_${'shoulder' | 'arm' | 'forearm' | 'hand' | 'fingers' | 'leg' | 'shin' | 'foot'}`;

type V3 = [number, number, number];
/** `maxAngle`: how far (radians) a joint may swing from its pose */
type Spring = { match: RegExp; stiffness: number; drag: number; gravity: number; maxAngle: number };

export type CharacterDef = {
  id: string;
  name: string;
  /** a few words for the tablet */
  blurb: string;
  /** shown in the tablet (CC-BY models need their author named) */
  credit?: string;
  url: string;
  /** a high-detail copy of the same rig for the first-person arms (else they come from `url`) */
  armsUrl?: string;
  /** canonical forward, in model space */
  forward: V3;
  /** model-space height of the soles and of the top of the head */
  feet: number;
  height: number;
  /** between the eyes (model space), unless the rig has eye bones */
  eye?: V3;
  eyeBones?: [string, string];
  bones: Record<Semantic, string>;
  /** the finger joints that curl round a grip (thumbs bend less) */
  fingers?: Record<Side, string[]>;
  thumbs?: Record<Side, string[]>;
  /** curl per joint for a full grip */
  curl: number;
  /** which way each palm faces in the bind pose (canonical) */
  palm: Record<Side, V3>;
  /** a resting pose on top of the bind pose: [bone, canonical axis, angle] */
  stance?: [Semantic, V3, number][];
  /** which arms swing freely when nothing is held */
  swing: Side[];
  /** the first-person left arm is a mirrored copy of the right one (the scan's left hand is in
   *  a pocket); otherwise each side is cut from the model */
  mirrorLeft?: boolean;
  /** how hard the hand grips (0 = as modelled) */
  gripCurl: number;
  /** first person: take wide sleeves in to this radius round the forearm (model units) */
  sleeve?: number;
  springs?: Spring[];
  /** a skirt sways as one piece, trailing the hips a little (panels on their own would tear
   *  gaps in the hem): its top joints share a single lagging tilt, capped at `maxAngle` */
  skirt?: { match: RegExp; follow: number; damping: number; gain: number; maxAngle: number };
  /** soft tissue: these bones trail the body's movement on an underdamped spring (`follow`
   *  rad/s, `damping` 1/s), turned by at most `maxAngle`: a small follow-through on landings */
  jiggle?: { bones: string[]; follow: number; damping: number; gain: number; maxAngle: number };
  /** cloth that the model also binds to the legs: those weights go to the cloth's own bones,
   *  so stepping and tucking the legs don't drag the hem out of shape */
  unbindLegs?: { cloth: RegExp; legs: RegExp };
  /** bones that are left exactly as modelled: no physics, no posing */
  still?: RegExp;
  material?: (m: THREE.MeshStandardMaterial) => void;
};

const F: V3 = [1, 0, 0];
const U: V3 = [0, 1, 0];
const R: V3 = [0, 0, 1];

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'nyx',
    name: 'Nyx',
    blurb: 'Street · scanned',
    url: '/models/avatar.glb',
    armsUrl: '/models/arms.glb',
    forward: [1, 0, 0],
    feet: -0.49,
    height: 0.98,
    eye: [0.05, 0.4, 0],
    bones: {
      hips: 'hips', spine: 'spine', chest: 'chest', neck: 'neck', head: 'head',
      R_shoulder: 'R_shoulder', R_arm: 'R_arm', R_forearm: 'R_forearm', R_hand: 'R_hand', R_fingers: 'R_fingers',
      L_shoulder: 'L_shoulder', L_arm: 'L_arm', L_forearm: 'L_forearm', L_hand: 'L_hand', L_fingers: 'L_fingers',
      R_leg: 'R_leg', R_shin: 'R_shin', R_foot: 'R_foot', L_leg: 'L_leg', L_shin: 'L_shin', L_foot: 'L_foot',
    },
    fingers: { R: ['R_fingers'], L: ['L_fingers'] },
    curl: 1.25,
    palm: { R: [0, 0, -1], L: [0, 0, 1] },
    swing: ['L'],
    mirrorLeft: true,
    gripCurl: 0.1,
    material: (m) => {
      // the scan's material map reads most of the body as metal: keep it to the studs' sheen
      m.metalness = 0.15;
    },
  },
  {
    id: 'swordswoman',
    name: 'Swordswoman',
    blurb: 'Fantasy · rigged',
    credit: 'Model by Xavi Vidal · CC BY 4.0',
    url: '/models/swordswoman.glb',
    forward: [1, 0, 0],
    feet: -0.49,
    height: 0.98,
    eye: [0.08, 0.37, 0],
    bones: {
      hips: 'hips', spine: 'spine', chest: 'chest', neck: 'neck', head: 'head',
      R_shoulder: 'R_shoulder', R_arm: 'R_arm', R_forearm: 'R_forearm', R_hand: 'R_hand', R_fingers: 'R_fingers',
      L_shoulder: 'L_shoulder', L_arm: 'L_arm', L_forearm: 'L_forearm', L_hand: 'L_hand', L_fingers: 'L_fingers',
      R_leg: 'R_leg', R_shin: 'R_shin', R_foot: 'R_foot', L_leg: 'L_leg', L_shin: 'L_shin', L_foot: 'L_foot',
    },
    fingers: { R: ['R_fingers'], L: ['L_fingers'] },
    curl: 1.25,
    palm: { R: [0, 0, -1], L: [0, 0, 1] },
    swing: ['R', 'L'],
    gripCurl: 0.8,
    jiggle: { bones: ['R_breast', 'L_breast'], follow: 20, damping: 4.5, gain: 0.7, maxAngle: 0.22 },
  },
  {
    id: 'draconia',
    name: 'Draconia',
    blurb: 'Slytherin · rigged',
    credit: 'Model by HiGuys920 · CC BY 4.0',
    url: '/models/draconia.glb',
    forward: [0, 0, 1],
    feet: 0,
    height: 1.6,
    eyeBones: ['Eye_L_0112', 'Eye_R_0113'],
    bones: {
      hips: 'Hips_04', spine: 'Spine_065', chest: 'Chest_066', neck: 'Neck_0100', head: 'Head_0101',
      R_shoulder: 'Right shoulder_0239', R_arm: 'Right arm_0240', R_forearm: 'Right elbow_0221', R_hand: 'Right wrist_0241', R_fingers: 'MiddleFinger1_R_0248',
      L_shoulder: 'Left shoulder_081', L_arm: 'Left arm_082', L_forearm: 'Left elbow_083', L_hand: 'Left wrist_084', L_fingers: 'MiddleFinger1_L_091',
      R_leg: 'Right leg_012', R_shin: 'Right knee_013', R_foot: 'Right ankle_015',
      L_leg: 'Left leg_07', L_shin: 'Left knee_08', L_foot: 'Left ankle_09',
    },
    fingers: {
      R: ['Index', 'Middle', 'Ring', 'Little'].flatMap((f) => [1, 2, 3].map((k) => `${f}Finger${k}_R`)),
      L: ['Index', 'Middle', 'Ring', 'Little'].flatMap((f) => [1, 2, 3].map((k) => `${f}Finger${k}_L`)),
    },
    thumbs: { R: ['Thumb1_R', 'Thumb2_R'], L: ['Thumb1_L', 'Thumb2_L'] },
    curl: 1,
    // a T-pose: palms down; she stands with her arms by her sides
    palm: { R: [0, -1, 0], L: [0, -1, 0] },
    stance: [
      ['R_arm', F, 1.25],
      ['L_arm', F, -1.25],
      ['R_forearm', R, 0.18],
      ['L_forearm', R, 0.18],
    ],
    swing: ['R', 'L'],
    gripCurl: 0.85,
    sleeve: 0.05,
    springs: [
      { match: /^(A00_J_Kami|HairF)/, stiffness: 7, drag: 0.35, gravity: 0.6, maxAngle: 0.5 },
      { match: /^Joint\d/, stiffness: 4.5, drag: 0.3, gravity: 0.9, maxAngle: 0.45 },
    ],
    skirt: { match: /^Sk_\d\d_00_/, follow: 9, damping: 7, gain: 2.2, maxAngle: 0.13 },
    unbindLegs: { cloth: /^Sk_/, legs: /^(Left|Right)_(leg|knee)/ },
    still: /^(Bust|Bnip|Siri|Ana|Kokan)/,
  },
];
export const characterById = (id: string) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

/** three's loader turns spaces in node names into underscores */
const clean = (name: string) => name.replace(/\s/g, '_');

export type Avatar = {
  def: CharacterDef;
  /** faces -z with its feet on y = 0, in its own units (scale it to taste) */
  root: THREE.Group;
  /** the glTF scene: model space lives here */
  model: THREE.Object3D;
  /** canonical space (see the top of this file), inside the model */
  canon: THREE.Object3D;
  meshes: THREE.SkinnedMesh[];
  bones: Record<Semantic, THREE.Bone>;
  byName: Map<string, THREE.Bone>;
  bind: Map<THREE.Object3D, { q: THREE.Quaternion; p: THREE.Vector3; qm: THREE.Quaternion; pm: THREE.Vector3 }>;
  /** between the eyes, in root space (before the root's scale) */
  eye: THREE.Vector3;
  springs: SpringJoint[];
  jiggle: { bone: THREE.Bone; lag: THREE.Vector3; vel: THREE.Vector3; ready: boolean }[];
  skirt: { bones: THREE.Bone[]; panels: { bone: THREE.Bone; front: number; right: number }[]; lag: THREE.Vector3; vel: THREE.Vector3; ready: boolean };
};
type SpringJoint = {
  bone: THREE.Bone;
  tailLocal: THREE.Vector3;
  len: number;
  spec: Spring;
  tail: THREE.Vector3;
  prev: THREE.Vector3;
  ready: boolean;
};

const sources = new Map<string, Promise<THREE.Object3D>>();
export function loadAvatar(url: string) {
  let source = sources.get(url);
  if (!source) {
    source = new GLTFLoader().loadAsync(url).then((gltf) => gltf.scene);
    sources.set(url, source);
    source.catch(() => sources.delete(url));
  }
  return source;
}

export function makeAvatar(def: CharacterDef, scene: THREE.Object3D): Avatar {
  const model = cloneSkinned(scene);
  const meshes: THREE.SkinnedMesh[] = [];
  const byName = new Map<string, THREE.Bone>();
  model.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) {
      const mesh = o as THREE.SkinnedMesh;
      meshes.push(mesh);
      // materials are per avatar (the first-person copies tint theirs)
      const m = (mesh.material as THREE.MeshStandardMaterial).clone();
      m.side = THREE.DoubleSide;
      m.envMapIntensity = 0.6;
      def.material?.(m);
      mesh.material = m;
    }
    if ((o as THREE.Bone).isBone) byName.set(o.name, o as THREE.Bone);
    o.frustumCulled = false;
  });
  const find = (name: string) => {
    const want = clean(name);
    const b = byName.get(want) ?? [...byName.entries()].find(([n]) => n.startsWith(want))?.[1];
    if (!b) throw new Error(`avatar ${def.id}: no bone ${name}`);
    return b;
  };
  const bones = Object.fromEntries(Object.entries(def.bones).map(([k, n]) => [k, find(n)])) as Record<Semantic, THREE.Bone>;

  // the bind pose, locally and in model space
  model.updateMatrixWorld(true);
  const toModel = new THREE.Matrix4().copy(model.matrixWorld).invert();
  const bind: Avatar['bind'] = new Map();
  const m4 = new THREE.Matrix4();
  model.traverse((o) => {
    if (o === model) return;
    m4.multiplyMatrices(toModel, o.matrixWorld);
    const pm = new THREE.Vector3();
    const qm = new THREE.Quaternion();
    m4.decompose(pm, qm, new THREE.Vector3());
    bind.set(o, { q: o.quaternion.clone(), p: o.position.clone(), qm, pm });
  });

  // canonical space: rotate canonical forward onto the model's, scale by height, feet to feet
  const canon = new THREE.Object3D();
  const fwd = new THREE.Vector3(...def.forward);
  const canonQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), fwd);
  const s = def.height / 0.98;
  canon.quaternion.copy(canonQ);
  canon.scale.setScalar(s);
  canon.position.set(0, def.feet + 0.49 * s, 0);
  model.add(canon);
  canon.updateMatrix();

  // the whole thing faces -z, feet on the ground
  const root = new THREE.Group();
  model.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(fwd, new THREE.Vector3(0, 0, -1)));
  model.position.set(0, 0, 0);
  model.updateMatrix();
  const feetRoot = new THREE.Vector3(0, def.feet, 0).applyMatrix4(model.matrix);
  model.position.y = -feetRoot.y;
  model.updateMatrix();
  root.add(model);

  const eyeModel = def.eyeBones
    ? bind.get(find(def.eyeBones[0]))!.pm.clone().add(bind.get(find(def.eyeBones[1]))!.pm).multiplyScalar(0.5)
    : new THREE.Vector3(...(def.eye ?? [0, def.feet + def.height * 0.93, 0]));
  const eye = eyeModel.applyMatrix4(model.matrix);

  const avatar: Avatar = {
    def, root, model, canon, meshes, bones, byName, bind, eye, springs: [],
    jiggle: (def.jiggle?.bones ?? []).map((n) => ({ bone: find(n), lag: new THREE.Vector3(), vel: new THREE.Vector3(), ready: false })),
    skirt: { bones: [], panels: [], lag: new THREE.Vector3(), vel: new THREE.Vector3(), ready: false },
  };
  if (def.skirt) {
    // which way each panel hangs (canonical): front panels get pushed by a thigh swinging forward
    const hipsAt = bind.get(bones.hips)!.pm;
    const toCanon = canon.quaternion.clone().invert();
    for (const b of byName.values()) {
      if (!def.skirt.match.test(b.name)) continue;
      avatar.skirt.bones.push(b);
      const kid = b.children.find((c) => (c as THREE.Bone).isBone);
      const d = (kid ? bind.get(kid)! : bind.get(b)!).pm.clone().sub(hipsAt).applyQuaternion(toCanon);
      d.y = 0;
      d.normalize();
      avatar.skirt.panels.push({ bone: b, front: d.x, right: d.z });
    }
  }
  if (def.unbindLegs) for (const mesh of meshes) unbindLegs(mesh, def.unbindLegs.cloth, def.unbindLegs.legs);

  // spring chains: every matching bone with a child swings from its bind direction
  if (def.springs) {
    model.traverse((o) => {
      const bone = o as THREE.Bone;
      if (!bone.isBone) return;
      const spec = def.springs!.find((sp) => sp.match.test(bone.name));
      const kids = bone.children.filter((c) => (c as THREE.Bone).isBone);
      if (!spec || !kids.length) return;
      const tailLocal = kids.reduce((acc, c) => acc.add(c.position), new THREE.Vector3()).multiplyScalar(1 / kids.length);
      avatar.springs.push({ bone, tailLocal, len: 0, spec, tail: new THREE.Vector3(), prev: new THREE.Vector3(), ready: false });
    });
  }
  return avatar;
}

function unbindLegs(mesh: THREE.SkinnedMesh, cloth: RegExp, legs: RegExp) {
  const bones = mesh.skeleton.bones;
  const isCloth = bones.map((b) => cloth.test(b.name));
  const isLeg = bones.map((b) => legs.test(b.name));
  if (!isCloth.some(Boolean)) return;
  const geo = mesh.geometry.clone();
  const ji = geo.getAttribute('skinIndex');
  const wi = geo.getAttribute('skinWeight');
  const weights = new Float32Array(wi.count * 4);
  let changed = 0;
  for (let i = 0; i < wi.count; i++) {
    let clothW = 0;
    let top = -1;
    let topW = 0;
    for (let k = 0; k < 4; k++) {
      const j = ji.getComponent(i, k);
      const w = wi.getComponent(i, k);
      weights[i * 4 + k] = w;
      if (isCloth[j]) {
        clothW += w;
        if (w > topW) [top, topW] = [k, w];
      }
    }
    if (clothW < 0.05) continue;
    for (let k = 0; k < 4; k++) {
      if (!isLeg[ji.getComponent(i, k)] || k === top) continue;
      weights[i * 4 + top] += weights[i * 4 + k];
      weights[i * 4 + k] = 0;
      changed++;
    }
  }
  if (!changed) return;
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(weights, 4));
  mesh.geometry = geo;
}

/* ── space helpers ──────────────────────────────────────────────────── */
const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _q3 = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _s = new THREE.Vector3();

/** canonical point -> model space */
export const canonPoint = (avatar: Avatar, p: THREE.Vector3, out = new THREE.Vector3()) => out.copy(p).applyMatrix4(avatar.canon.matrix);
/** canonical direction -> model space */
export const canonDir = (avatar: Avatar, d: THREE.Vector3 | V3, out = new THREE.Vector3()) =>
  (Array.isArray(d) ? out.set(d[0], d[1], d[2]) : out.copy(d)).applyQuaternion(avatar.canon.quaternion);

/** a bone's rotation in model space, as posed now */
export function modelQuat(avatar: Avatar, bone: THREE.Object3D, out: THREE.Quaternion) {
  out.identity();
  const stack: THREE.Object3D[] = [];
  for (let o: THREE.Object3D | null = bone; o && o !== avatar.model; o = o.parent) stack.push(o);
  for (let i = stack.length - 1; i >= 0; i--) out.multiply(stack[i].quaternion);
  return out;
}

/** a bone's position in model space (bones above it must already be posed) */
export function modelPos(avatar: Avatar, bone: THREE.Object3D, out: THREE.Vector3) {
  avatar.model.updateMatrixWorld(true);
  _m.copy(avatar.model.matrixWorld).invert().multiply(bone.matrixWorld);
  return out.setFromMatrixPosition(_m);
}

/** an object's position and rotation in the avatar's model space (works through mirrors too) */
function inModel(avatar: Avatar, o: THREE.Object3D, pos: THREE.Vector3, quat: THREE.Quaternion) {
  avatar.model.updateMatrixWorld(true);
  o.updateWorldMatrix(true, false);
  _m.copy(avatar.model.matrixWorld).invert().multiply(o.matrixWorld);
  _m.decompose(pos, quat, _s);
}

const bindOf = (avatar: Avatar, o: THREE.Object3D) => avatar.bind.get(o)!;
const parentBindQ = (avatar: Avatar, bone: THREE.Object3D, out: THREE.Quaternion) => {
  const b = bone.parent && avatar.bind.get(bone.parent);
  return b ? out.copy(b.qm) : out.identity();
};

/** turn a bone about a canonical axis (fixed in its parent), on top of its current pose */
export function turn(avatar: Avatar, bone: THREE.Object3D, axis: V3, angle: number) {
  if (!angle) return;
  canonDir(avatar, axis, _v).applyQuaternion(parentBindQ(avatar, bone, _q2).invert());
  bone.quaternion.premultiply(_q.setFromAxisAngle(_v, angle));
}

export function resetPose(avatar: Avatar) {
  for (const [o, b] of avatar.bind) {
    if (!(o as THREE.Bone).isBone) continue;
    o.quaternion.copy(b.q);
    o.position.copy(b.p);
  }
  for (const [name, axis, angle] of avatar.def.stance ?? []) turn(avatar, avatar.bones[name], axis, angle);
}

/* ── arms ───────────────────────────────────────────────────────────── */
/**
 * Two-bone IK for an arm, in model space: puts the wrist on `wrist`, bends the elbow towards
 * `pole` (a point), and (if given) turns the hand by `hand`, a rotation away from its bind pose.
 */
export function reachArm(avatar: Avatar, side: Side, wrist: THREE.Vector3, pole: THREE.Vector3, hand?: THREE.Quaternion) {
  const { bones } = avatar;
  const upper = bones[`${side}_arm`];
  const fore = bones[`${side}_forearm`];
  const palm = bones[`${side}_hand`];
  const S = modelPos(avatar, upper, new THREE.Vector3());
  const a = bindOf(avatar, fore).pm.distanceTo(bindOf(avatar, upper).pm);
  const b = bindOf(avatar, palm).pm.distanceTo(bindOf(avatar, fore).pm);
  const toT = _v.copy(wrist).sub(S);
  const d = THREE.MathUtils.clamp(toT.length(), Math.abs(a - b) + 1e-4, a + b - 1e-4);
  const dir = toT.normalize();
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const bend = _a.copy(pole).sub(S);
  bend.addScaledVector(dir, -bend.dot(dir));
  if (bend.lengthSq() < 1e-10) bend.set(0, -1, 0);
  bend.normalize();
  const E = new THREE.Vector3().copy(S).addScaledVector(dir, a * cosA).addScaledVector(bend, a * sinA);
  const T = new THREE.Vector3().copy(S).addScaledVector(dir, d);

  // upper arm: its bind orientation under the current parent, swung onto the elbow
  const parentQ = modelQuat(avatar, upper.parent!, new THREE.Quaternion());
  const upperQ = new THREE.Quaternion().copy(parentQ).multiply(bindOf(avatar, upper).q);
  const from = _b.copy(fore.position).normalize().applyQuaternion(upperQ);
  upperQ.premultiply(_q.setFromUnitVectors(from, _a.copy(E).sub(S).normalize()));
  upper.quaternion.copy(parentQ).invert().multiply(upperQ);
  // forearm: likewise onto the wrist
  const foreQ = new THREE.Quaternion().copy(upperQ).multiply(bindOf(avatar, fore).q);
  const from2 = _b.copy(palm.position).normalize().applyQuaternion(foreQ);
  foreQ.premultiply(_q.setFromUnitVectors(from2, _a.copy(T).sub(E).normalize()));
  fore.quaternion.copy(upperQ).invert().multiply(foreQ);
  // hand: its bind orientation turned by `hand`
  if (hand) palm.quaternion.copy(foreQ).invert().multiply(_q3.copy(hand).multiply(bindOf(avatar, palm).qm));
  else palm.quaternion.copy(bindOf(avatar, palm).q);
  return T;
}

/** bind axes of a hand in model space: wrist -> knuckles, and the way the palm faces */
export function handRest(avatar: Avatar, side: Side) {
  const axis = bindOf(avatar, avatar.bones[`${side}_fingers`]).pm.clone().sub(bindOf(avatar, avatar.bones[`${side}_hand`]).pm).normalize();
  const palm = canonDir(avatar, avatar.def.palm[side]);
  palm.addScaledVector(axis, -palm.dot(axis)).normalize();
  return { axis, palm };
}

const basis = (x: THREE.Vector3, y: THREE.Vector3) => {
  const X = x.clone().normalize();
  const Y = y.clone().addScaledVector(X, -y.dot(X)).normalize();
  return new THREE.Matrix4().makeBasis(X, Y, new THREE.Vector3().crossVectors(X, Y));
};
/** the model-space rotation that turns a hand's bind axes onto `axis` / `palm` (model space) */
export function handQuat(avatar: Avatar, side: Side, axis: THREE.Vector3, palm: THREE.Vector3, out: THREE.Quaternion) {
  const rest = handRest(avatar, side);
  return out.setFromRotationMatrix(basis(axis, palm).multiply(basis(rest.axis, rest.palm).transpose()));
}

/** curl the fingers towards the palm (0 = as modelled, 1 = a fist round a grip) */
export function curlFingers(avatar: Avatar, side: Side, amount: number) {
  const { def } = avatar;
  const rest = handRest(avatar, side);
  const hinge = new THREE.Vector3().crossVectors(rest.palm, rest.axis).normalize();
  const bend = (names: string[] | undefined, k: number) => {
    for (const n of names ?? []) {
      const bone = avatar.byName.get(clean(n)) ?? [...avatar.byName.entries()].find(([b]) => b.startsWith(clean(n)))?.[1];
      if (!bone) continue;
      const local = _v.copy(hinge).applyQuaternion(_q2.copy(bindOf(avatar, bone).qm).invert());
      bone.quaternion.copy(bindOf(avatar, bone).q).multiply(_q.setFromAxisAngle(local, amount * def.curl * k));
    }
  };
  bend(def.fingers?.[side], 1);
  bend(def.thumbs?.[side], 0.45);
}

/**
 * How a hand takes hold of a weapon's grip anchor (`grip-R` / `grip-L`, see WeaponView): in the
 * anchor's frame y runs along the grip, -z is forward and x is to the right. The wrist sits
 * behind and under the grip, the hand points forward and round it, the palm faces the grip.
 */
export const GRIP = {
  wrist: [0.012, -0.012, 0.036],
  axis: [-0.32, 0.3, -0.9],
  palm: [-1, 0.05, 0],
};
const _w = new THREE.Vector3();
const _ax = new THREE.Vector3();
const _pm = new THREE.Vector3();
const _ap = new THREE.Vector3();
const _aq = new THREE.Quaternion();
const _hq = new THREE.Quaternion();
const _pole = new THREE.Vector3();

/**
 * Pose one arm onto a grip anchor; `pole` (canonical space) is where the elbow should point.
 * `hand` is which hand the grip is for, when that differs from the arm used (a mirrored copy of
 * the right arm standing in for the left).
 */
export function holdGrip(avatar: Avatar, side: Side, anchor: THREE.Object3D, pole: THREE.Vector3, curl: number, hand: Side = side) {
  const s = hand === 'R' ? 1 : -1;
  inModel(avatar, anchor, _ap, _aq);
  // anchors may be scaled (the weapon in the mirror): positions go through the full matrix
  const wrist = _w.set(GRIP.wrist[0] * s, GRIP.wrist[1], GRIP.wrist[2]).applyMatrix4(_m2.copy(avatar.model.matrixWorld).invert().multiply(anchor.matrixWorld));
  const axis = _ax.set(GRIP.axis[0] * s, GRIP.axis[1], GRIP.axis[2]).normalize().applyQuaternion(_aq);
  const palm = _pm.set(GRIP.palm[0] * s, GRIP.palm[1], GRIP.palm[2]).normalize().applyQuaternion(_aq);
  handQuat(avatar, side, axis, palm, _hq);
  reachArm(avatar, side, wrist, canonPoint(avatar, pole, _pole), _hq);
  curlFingers(avatar, side, curl);
}

/* ── the body ───────────────────────────────────────────────────────── */
export type Gait = {
  /** walk cycle phase (radians) */
  phase: number;
  /** 0 standing .. 1 full walk */
  walk: number;
  sprint: number;
  /** 0 grounded .. 1 mid-air */
  air: number;
  /** look up/down (radians, up positive) */
  pitch: number;
  time: number;
  /** the hands are holding something */
  armed: boolean;
};

/**
 * Body motion: breathing and a weight shift at rest, a walk / run cycle with knees, hips and
 * counter-swinging arms, legs tucking in the air, and the head and chest following where you
 * look. Arms holding a weapon are left to `holdGrip`.
 */
export function animateBody(avatar: Avatar, g: Gait) {
  const B = avatar.bones;
  resetPose(avatar);
  const w = g.walk;
  const amp = 0.3 + g.sprint * 0.14;
  const s = Math.sin(g.phase);
  const c = Math.cos(g.phase);
  const breathe = Math.sin(g.time * 1.6);
  // hips: bob twice a step, a little roll and twist with the stride
  const bob = (-w * (0.004 + g.sprint * 0.004) * Math.abs(c) + g.air * 0.01) * avatar.canon.scale.x;
  B.hips.position.add(canonDir(avatar, U, _v).applyQuaternion(parentBindQ(avatar, B.hips, _q2).invert()).multiplyScalar(bob));
  turn(avatar, B.hips, U, s * 0.08 * w);
  turn(avatar, B.hips, F, -s * 0.03 * w + (1 - w) * Math.sin(g.time * 0.45) * 0.015);
  // legs swing about the right axis; knees fold on the swing, tuck in the air
  const legR = s * amp * w + g.air * 0.35;
  const legL = -s * amp * w + g.air * 0.1;
  turn(avatar, B.R_leg, R, legR);
  turn(avatar, B.L_leg, R, legL);
  const kneeR = (Math.max(0, Math.sin(g.phase + 1.3)) * 0.65 * w + g.air * 0.7) * (1 + g.sprint * 0.4);
  const kneeL = (Math.max(0, Math.sin(g.phase + 1.3 + Math.PI)) * 0.65 * w + g.air * 0.45) * (1 + g.sprint * 0.4);
  turn(avatar, B.R_shin, R, -kneeR);
  turn(avatar, B.L_shin, R, -kneeL);
  turn(avatar, B.R_foot, R, kneeR * 0.35 - legR * 0.4);
  turn(avatar, B.L_foot, R, kneeL * 0.35 - legL * 0.4);
  // a skirt is pushed by the thigh behind it: front panels forward, back panels back
  for (const p of avatar.skirt.panels) {
    const leg = p.right > 0.25 ? legR : p.right < -0.25 ? legL : Math.max(legR, legL);
    const back = p.right > 0.25 ? legR : p.right < -0.25 ? legL : Math.min(legR, legL);
    turn(avatar, p.bone, R, Math.max(0, leg) * Math.max(0, p.front) * 1.05 + Math.min(0, back) * Math.max(0, -p.front) * 0.8);
  }
  // spine: counter-twist, a forward lean when running, breathing
  turn(avatar, B.spine, U, -s * 0.06 * w);
  turn(avatar, B.spine, R, -g.sprint * 0.12 * w);
  turn(avatar, B.chest, R, -breathe * 0.012 + g.pitch * 0.18);
  // head follows the look (most of it), the chest takes the rest
  turn(avatar, B.neck, R, g.pitch * 0.3);
  turn(avatar, B.head, R, g.pitch * 0.45 + breathe * 0.006);
  if (!g.armed) {
    for (const side of avatar.def.swing) {
      const leg = side === 'R' ? legR : legL;
      turn(avatar, B[`${side}_arm`], R, -leg * 0.7 + breathe * 0.01);
      turn(avatar, B[`${side}_forearm`], R, Math.max(0, -leg) * 0.4 * w);
    }
    if (!avatar.def.swing.includes('R')) turn(avatar, B.R_arm, R, s * 0.05 * w);
  }
}

/* ── secondary motion ───────────────────────────────────────────────── */
const _head = new THREE.Vector3();
const _rest = new THREE.Vector3();
const _next = new THREE.Vector3();
const _pq = new THREE.Quaternion();
const _frame = new THREE.Matrix4();
const _hip = new THREE.Vector3();
const _off = new THREE.Vector3();

/**
 * Hair and skirt. Each hair spring's tip is a point mass in `space` (the avatar's surroundings,
 * so walking, turning and jumping all carry into it) pulled back towards where the bone points
 * in its pose, with drag, a little gravity and a limit on how far it swings. Call after posing.
 */
export function updateSprings(avatar: Avatar, space: THREE.Object3D, dt: number) {
  if (!avatar.springs.length && !avatar.skirt.bones.length && !avatar.jiggle.length) return;
  const step = Math.min(dt, 1 / 30);
  avatar.root.updateMatrixWorld(true);
  space.updateWorldMatrix(true, false);
  _frame.copy(space.matrixWorld).invert();
  const scale = avatar.root.scale.x * avatar.canon.scale.x;
  const down = _b.set(0, -1, 0);
  // soft tissue: a point trailing each bone's tip on an underdamped spring; the bone turns
  // towards it, a little
  const jg = avatar.def.jiggle;
  if (jg) {
    for (const j of avatar.jiggle) {
      const { bone } = j;
      bone.updateWorldMatrix(false, false);
      _m.multiplyMatrices(_frame, bone.matrixWorld);
      _head.setFromMatrixPosition(_m);
      const kid = bone.children[0];
      _rest.copy(kid ? kid.position : _v.set(0, 0.05, 0)).applyMatrix4(_m);
      if (!j.ready || j.lag.distanceTo(_rest) > scale) {
        j.lag.copy(_rest);
        j.vel.set(0, 0, 0);
        j.ready = true;
      }
      j.vel.addScaledVector(_v.copy(_rest).sub(j.lag), jg.follow * jg.follow * step).multiplyScalar(Math.exp(-jg.damping * step));
      j.lag.addScaledVector(j.vel, step);
      const restDir = _a.copy(_rest).sub(_head);
      const len = restDir.length();
      const want = _v.copy(restDir).addScaledVector(_s.copy(j.lag).sub(_rest), jg.gain).normalize();
      restDir.normalize();
      const angle = Math.min(jg.maxAngle, restDir.angleTo(want));
      if (angle < 1e-4 || !len) continue;
      _q.setFromUnitVectors(restDir, want);
      _q3.identity().slerp(_q, angle / restDir.angleTo(want));
      _m2.multiplyMatrices(_frame, bone.parent!.matrixWorld).decompose(_ap, _pq, _s);
      _q.copy(_pq).invert().multiply(_q3).multiply(_pq);
      bone.quaternion.premultiply(_q);
      bone.updateWorldMatrix(false, false);
    }
  }
  // the skirt: a point that trails the hips on a damped spring; the hem leans away from it
  const sk = avatar.skirt;
  if (sk.bones.length && avatar.def.skirt) {
    const spec = avatar.def.skirt;
    const hips = _hip.setFromMatrixPosition(_m.multiplyMatrices(_frame, avatar.bones.hips.matrixWorld));
    if (!sk.ready || sk.lag.distanceTo(hips) > scale) {
      sk.lag.copy(hips);
      sk.vel.set(0, 0, 0);
      sk.ready = true;
    }
    sk.vel.addScaledVector(_v.copy(hips).sub(sk.lag), spec.follow * spec.follow * step).multiplyScalar(Math.exp(-spec.damping * step));
    sk.lag.addScaledVector(sk.vel, step);
    const off = _off.copy(hips).sub(sk.lag);
    off.y = 0;
    const angle = Math.min(spec.maxAngle, (off.length() / scale) * spec.gain);
    if (angle > 1e-4) {
      // the hem hangs down; moving along `off` it swings back the other way
      const axis = _a.crossVectors(down, off.negate()).normalize();
      _q3.setFromAxisAngle(axis, angle);
      for (const bone of sk.bones) {
        _m2.multiplyMatrices(_frame, bone.parent!.matrixWorld).decompose(_ap, _pq, _s);
        _q.copy(_pq).invert().multiply(_q3).multiply(_pq);
        bone.quaternion.premultiply(_q);
      }
    }
  }
  for (const j of avatar.springs) {
    const { bone, spec } = j;
    bone.quaternion.copy(bindOf(avatar, bone).q);
    bone.updateWorldMatrix(false, false);
    _m.multiplyMatrices(_frame, bone.matrixWorld);
    _head.setFromMatrixPosition(_m);
    _rest.copy(j.tailLocal).applyMatrix4(_m);
    const len = _rest.distanceTo(_head);
    if (!j.ready || j.tail.distanceTo(_rest) > len * 4) {
      j.tail.copy(_rest);
      j.prev.copy(_rest);
      j.ready = true;
    }
    // verlet: carry on, pulled back to the pose, a little gravity
    _next.copy(j.tail).sub(j.prev).multiplyScalar(1 - spec.drag);
    _next.add(j.tail);
    _a.copy(_rest).sub(_head).normalize().multiplyScalar(len * spec.stiffness * step);
    _next.add(_a);
    _next.addScaledVector(down, len * spec.gravity * step);
    _next.sub(_head).setLength(len).add(_head);
    // keep within reach of the pose
    const restDir = _a.copy(_rest).sub(_head).normalize();
    const dir = _v.copy(_next).sub(_head).normalize();
    const angle = restDir.angleTo(dir);
    if (angle > spec.maxAngle) {
      _q.setFromUnitVectors(restDir, dir);
      _q3.identity().slerp(_q, spec.maxAngle / angle);
      dir.copy(restDir).applyQuaternion(_q3);
    }
    _next.copy(_head).addScaledVector(dir, len);
    j.prev.copy(j.tail);
    j.tail.copy(_next);
    // turn the bone so it points at its tip
    _q.setFromUnitVectors(_a.copy(_rest).sub(_head).normalize(), _v.copy(j.tail).sub(_head).normalize());
    _m2.multiplyMatrices(_frame, bone.parent!.matrixWorld).decompose(_ap, _pq, _s);
    _q.premultiply(_q2.copy(_pq).invert()).multiply(_pq);
    bone.quaternion.premultiply(_q);
    bone.updateWorldMatrix(false, false);
  }
}

/**
 * Keep only one side's forearm and hand of a copy (first person): every other triangle is
 * dropped from the index, so the body (and the upper sleeve) is never drawn round the camera.
 */
export function keepArm(avatar: Avatar, side: Side) {
  const keep = new Set<THREE.Bone>();
  const add = (b: THREE.Object3D) => {
    if ((b as THREE.Bone).isBone) keep.add(b as THREE.Bone);
    b.children.forEach(add);
  };
  add(avatar.bones[`${side}_forearm`]);
  for (const mesh of avatar.meshes) {
    const geo = mesh.geometry.clone();
    const bones = mesh.skeleton.bones;
    const ji = geo.getAttribute('skinIndex');
    const wi = geo.getAttribute('skinWeight');
    const score = new Float32Array(ji.count);
    for (let i = 0; i < ji.count; i++) {
      let sc = 0;
      for (let k = 0; k < 4; k++) if (keep.has(bones[ji.getComponent(i, k)])) sc += wi.getComponent(i, k);
      score[i] = sc;
    }
    const index = geo.getIndex()!;
    const kept: number[] = [];
    for (let f = 0; f < index.count; f += 3) {
      const a = index.getX(f);
      const b = index.getX(f + 1);
      const c = index.getX(f + 2);
      if (score[a] > 0.4 && score[b] > 0.4 && score[c] > 0.4) kept.push(a, b, c);
    }
    geo.setIndex(kept);
    mesh.geometry = geo;
    mesh.visible = kept.length > 0;
  }
}

/**
 * Take a wide sleeve in round the forearm (first person only: a bell sleeve a few centimetres
 * from the lens would fill the screen). Vertices that follow the forearm or the wrist and stand
 * further than `radius` (model units) from the elbow-wrist line are pulled in to it.
 */
export function slimSleeve(avatar: Avatar, side: Side, radius: number) {
  const fore = avatar.bones[`${side}_forearm`];
  const wrist = avatar.bones[`${side}_hand`];
  const p = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (const mesh of avatar.meshes) {
    if (!mesh.visible) continue;
    const bones = mesh.skeleton.bones;
    const fi = bones.indexOf(fore);
    const wi = bones.indexOf(wrist);
    if (fi < 0) continue;
    // the mesh's own space can be quantized (the dequantization is folded into its bind
    // matrices), so work in model space: toModel = the forearm's bind pose x its inverse bind
    const fb = bindOf(avatar, fore);
    const toModel = new THREE.Matrix4().compose(fb.pm, fb.qm, new THREE.Vector3(1, 1, 1)).multiply(mesh.skeleton.boneInverses[fi]).multiply(mesh.bindMatrix);
    const fromModel = toModel.clone().invert();
    a.copy(fb.pm);
    b.copy(bindOf(avatar, wrist).pm);
    ab.copy(b).sub(a);
    const geo = mesh.geometry;
    const pos = geo.getAttribute('position');
    const ji = geo.getAttribute('skinIndex');
    const ww = geo.getAttribute('skinWeight');
    const out = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      let wf = 0;
      let wh = 0;
      for (let k = 0; k < 4; k++) {
        const j = ji.getComponent(i, k);
        if (j === fi) wf += ww.getComponent(i, k);
        else if (j === wi) wh += ww.getComponent(i, k);
      }
      if (wf + wh > 0.5) {
        p.applyMatrix4(toModel);
        const t = THREE.MathUtils.clamp(c.copy(p).sub(a).dot(ab) / ab.lengthSq(), 0, 1.25);
        c.copy(a).addScaledVector(ab, t);
        const d = p.distanceTo(c);
        if (d > radius * 0.85) {
          // sleeve, not skin: taken in to the radius and the cuff rolled back off the hand
          const r = Math.min(d, wf >= wh ? radius : radius * 1.2);
          p.sub(c).multiplyScalar(r / d);
          p.add(c.copy(a).addScaledVector(ab, Math.min(t, 0.8)));
        }
        p.applyMatrix4(fromModel);
      }
      out.set([p.x, p.y, p.z], i * 3);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(out, 3));
    geo.computeVertexNormals();
  }
}
