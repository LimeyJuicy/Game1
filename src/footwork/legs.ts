import * as THREE from 'three';

/**
 * Lower-body solver for the footwork system.
 *
 * Everything here works in the character's root frame: origin on the floor
 * under the gameplay root, +X to the character's right, +Y up, −Z forward.
 * A pose is described by constraints (where the pelvis and the two boot soles
 * are), and the solver fills in thigh, shin, ankle and toe rotations.
 *
 * Three things the original rig solve did not do are handled here:
 *  1. Reach: when a planted foot is farther away than the leg is long, the hips
 *     sink (and, at the extreme, shift) instead of the foot leaving its target.
 *  2. Knee direction: the knee bends over the toes of its own foot, so a
 *     turned-out rear foot gets a turned-out knee.
 *  3. Foot roll: a pitched foot rotates about its heel (toes up) or the ball of
 *     the foot (heel up), so the contact point stays where it was planted.
 */

/** Skeleton measurements; these match the bones built in src/humanRig.ts. */
export const LEG_RIG = {
  hipHalfWidth: 0.135,
  pelvisRest: 0.94,
  thigh: 0.43,
  shin: 0.39,
  /** Ankle-joint height with the boot sole flat on the floor. */
  ankleHeight: 0.148,
  /** Heel and ball contact points along the boot, measured from the ankle (−Z is toward the toes). */
  heel: 0.06,
  ball: -0.16,
  /** The hips never sink below this; beyond it the pelvis shifts toward the foot instead. */
  minHipHeight: 0.5,
};

export interface FootTarget {
  /** Sole reference point: the spot on the floor under the ankle when the boot is flat. */
  x: number; z: number;
  /** Height of that point above the floor. */
  lift: number;
  /** Radians about +Y. Positive turns the toes toward the character's left. */
  yaw: number;
  /** Radians. Positive lifts the toes (heel contact); negative lifts the heel (ball contact). */
  pitch: number;
}

export interface LowerBodyPose {
  pelvis: { x: number; y: number; z: number; yaw: number; pitch: number; roll: number };
  /** Index 0 is the left foot (−X) and index 1 the right, matching the rig's limb order. */
  feet: [FootTarget, FootTarget];
}

export interface LegSolution {
  hip: THREE.Vector3; knee: THREE.Vector3; ankle: THREE.Vector3;
  /** Local rotations for the Hip, Knee and Ankle bones. */
  thigh: THREE.Quaternion; shin: THREE.Quaternion; foot: THREE.Quaternion;
  /** Toe bend in radians; keeps the toes flat while the heel is raised. */
  toe: number;
  /** Degrees between the knee's bend direction and the foot's toe direction, seen from above. */
  kneeToToes: number;
  /** Hip-to-ankle distance as a fraction of the full leg length. */
  extension: number;
  /** Distance by which the ankle still misses its target after hip adjustment. */
  miss: number;
}

export interface LowerBodySolution {
  pelvisPosition: THREE.Vector3;
  pelvisQuaternion: THREE.Quaternion;
  pelvisYaw: number;
  legs: [LegSolution, LegSolution];
  /** How far the hips were lowered and shifted to keep both feet in reach. */
  sink: number; shift: number;
}

export type LegRig = typeof LEG_RIG & { hipDrop?: number };
const UP = new THREE.Vector3(0, 1, 0);

/** Polynomial smooth minimum: equals min(a, b) away from the crossover, with no kink at it. */
function smoothMin(a: number, b: number, k: number) {
  const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / k));
  return b + (a - b) * h - k * h * (1 - h);
}

/** Ankle-joint position for a foot target, honouring the heel or ball pivot. */
export function anklePosition(foot: FootTarget, out = new THREE.Vector3(), rig: LegRig = LEG_RIG) {
  const pivot = foot.pitch > 0 ? rig.heel : rig.ball;
  const sy = Math.sin(foot.yaw), cy = Math.cos(foot.yaw);
  const sp = Math.sin(foot.pitch), cp = Math.cos(foot.pitch);
  const up = rig.ankleHeight * cp + pivot * sp;
  const along = pivot + rig.ankleHeight * sp - pivot * cp;
  return out.set(foot.x + sy * along, foot.lift + up, foot.z + cy * along);
}

/** Floor contact points of a boot in the root frame, for markers and tests. */
export function contactPoints(foot: FootTarget, rig: LegRig = LEG_RIG) {
  const sy = Math.sin(foot.yaw), cy = Math.cos(foot.yaw);
  const point = (offset: number, pivot: number) => {
    // Rotate the sole point about the active pivot by the foot pitch.
    const local = offset - pivot, sp = Math.sin(foot.pitch), cp = Math.cos(foot.pitch);
    const along = pivot + local * cp, height = foot.lift - local * sp;
    return { x: foot.x + sy * along, y: height, z: foot.z + cy * along };
  };
  const pivot = foot.pitch > 0 ? rig.heel : rig.ball;
  return { heel: point(rig.heel, pivot), ball: point(rig.ball, pivot) };
}

const basis = new THREE.Matrix4();
/** Rotation whose +Y runs along `up` and whose −Z faces `forward` as nearly as possible. */
function orient(up: THREE.Vector3, forward: THREE.Vector3, out: THREE.Quaternion) {
  const y = up.clone().normalize();
  const f = forward.clone().addScaledVector(y, -forward.dot(y));
  if (f.lengthSq() < 1e-8) f.set(0, 0, -1).addScaledVector(y, y.z);
  if (f.lengthSq() < 1e-8) f.set(1, 0, 0);
  const z = f.normalize().negate();
  const x = new THREE.Vector3().crossVectors(y, z);
  return out.setFromRotationMatrix(basis.makeBasis(x, y, z));
}

export function solveLowerBody(pose: LowerBodyPose, rig: LegRig = LEG_RIG): LowerBodySolution {
  const REACH = (rig.thigh + rig.shin) * 0.998;
  const pelvisQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.pelvis.pitch, pose.pelvis.yaw, pose.pelvis.roll, 'YXZ'));
  const pelvisPosition = new THREE.Vector3(pose.pelvis.x, pose.pelvis.y, pose.pelvis.z);
  const ankles = pose.feet.map(foot => anklePosition(foot, new THREE.Vector3(), rig));
  const hipOffsets = [-1, 1].map(side => new THREE.Vector3(side * rig.hipHalfWidth, -(rig.hipDrop ?? 0), 0).applyQuaternion(pelvisQuaternion));
  let sink = 0, shift = 0;

  // Reach: lower the hips until both ankles are within leg length. Only when
  // sinking alone cannot do it (a foot beyond the horizontal limit) does the
  // pelvis shift toward that foot.
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < 2; i++) {
      const ankle = ankles[i], offset = hipOffsets[i];
      let dx = ankle.x - (pelvisPosition.x + offset.x), dz = ankle.z - (pelvisPosition.z + offset.z);
      let horizontal = Math.hypot(dx, dz);
      const lowest = Math.max(0.05, rig.minHipHeight - ankle.y);
      const limit = Math.sqrt(Math.max(0.01, REACH * REACH - lowest * lowest));
      if (horizontal > limit) {
        const excess = (horizontal - limit) / horizontal;
        pelvisPosition.x += dx * excess; pelvisPosition.z += dz * excess;
        shift += horizontal - limit; horizontal = limit;
      }
      const bound = ankle.y + Math.sqrt(Math.max(0, REACH * REACH - horizontal * horizontal)) - offset.y;
      const lowered = Math.min(bound, smoothMin(pelvisPosition.y, bound, 0.02));
      sink += pelvisPosition.y - lowered; pelvisPosition.y = lowered;
    }
  }

  const pelvisForward = new THREE.Vector3(-Math.sin(pose.pelvis.yaw), 0, -Math.cos(pose.pelvis.yaw));
  const legs = pose.feet.map((foot, i) => {
    const hip = pelvisPosition.clone().add(hipOffsets[i]);
    const target = ankles[i];
    const axis = target.clone().sub(hip);
    const length = axis.length();
    const distance = THREE.MathUtils.clamp(length, Math.abs(rig.thigh - rig.shin) + 0.02, REACH);
    axis.normalize();
    const ankle = hip.clone().addScaledVector(axis, distance);

    // Knee over the toes: aim the bend at the foot's own toe direction, with a
    // little of the pelvis heading and an upward bias so a leg reaching
    // straight forward still has a well-defined bend.
    const toes = new THREE.Vector3(-Math.sin(foot.yaw), 0, -Math.cos(foot.yaw));
    const pole = toes.clone().multiplyScalar(0.8).addScaledVector(pelvisForward, 0.2).addScaledVector(UP, 0.3);
    const bend = pole.addScaledVector(axis, -pole.dot(axis));
    if (bend.lengthSq() < 1e-8) bend.copy(UP).addScaledVector(axis, -axis.y);
    bend.normalize();

    const a = rig.thigh, b = rig.shin;
    const along = (a * a + distance * distance - b * b) / (2 * distance);
    const height = Math.sqrt(Math.max(0, a * a - along * along));
    const knee = hip.clone().addScaledVector(axis, along).addScaledVector(bend, height);

    const thighWorld = orient(hip.clone().sub(knee), bend, new THREE.Quaternion());
    const shinWorld = orient(knee.clone().sub(ankle), bend, new THREE.Quaternion());
    const footWorld = new THREE.Quaternion().setFromEuler(new THREE.Euler(foot.pitch, foot.yaw, 0, 'YXZ'));
    const flat = bend.clone().setY(0);
    const kneeToToes = flat.lengthSq() < 1e-8 ? 0 : THREE.MathUtils.radToDeg(flat.normalize().angleTo(toes));
    return {
      hip, knee, ankle,
      thigh: pelvisQuaternion.clone().invert().multiply(thighWorld),
      shin: thighWorld.clone().invert().multiply(shinWorld),
      foot: shinWorld.clone().invert().multiply(footWorld),
      toe: Math.min(0.9, Math.max(0, -foot.pitch)) * THREE.MathUtils.clamp(1 - foot.lift / 0.06, 0, 1),
      kneeToToes,
      extension: distance / (a + b),
      miss: Math.max(0, length - distance),
    };
  }) as [LegSolution, LegSolution];

  return { pelvisPosition, pelvisQuaternion, pelvisYaw: pose.pelvis.yaw, legs, sink, shift };
}

/** What the skinned rig reads when the footwork system drives the lower body. */
export interface LowerBodyOverride {
  /** 0 leaves the rig's own legs untouched; 1 applies this solution fully. */
  weight: number;
  pelvisPosition: THREE.Vector3;
  pelvisQuaternion: THREE.Quaternion;
  /** Counter-rotation spread through the spine, and the remainder for the head, so the chest and helmet stay toward the opponent. */
  spineYaw: number; headYaw: number;
  legs: { thigh: THREE.Quaternion; shin: THREE.Quaternion; foot: THREE.Quaternion; toe: number }[];
}

/** How much of the pelvis turn the chest keeps; the head keeps almost none. */
const CHEST_FOLLOW = 0.6, HEAD_FOLLOW = 0.1;

export function createLowerBodyOverride(): LowerBodyOverride {
  return {
    weight: 1, pelvisPosition: new THREE.Vector3(0, LEG_RIG.pelvisRest, 0), pelvisQuaternion: new THREE.Quaternion(), spineYaw: 0, headYaw: 0,
    legs: [0, 1].map(() => ({ thigh: new THREE.Quaternion(), shin: new THREE.Quaternion(), foot: new THREE.Quaternion(), toe: 0 })),
  };
}

export function writeOverride(target: LowerBodyOverride, solution: LowerBodySolution) {
  target.pelvisPosition.copy(solution.pelvisPosition);
  target.pelvisQuaternion.copy(solution.pelvisQuaternion);
  target.spineYaw = -solution.pelvisYaw * (1 - CHEST_FOLLOW);
  target.headYaw = -solution.pelvisYaw * (CHEST_FOLLOW - HEAD_FOLLOW);
  solution.legs.forEach((leg, i) => {
    target.legs[i].thigh.copy(leg.thigh); target.legs[i].shin.copy(leg.shin); target.legs[i].foot.copy(leg.foot); target.legs[i].toe = leg.toe;
  });
  return target;
}

/** Offset for whatever the upper body is holding, so it travels with the hips. */
export function carrierOffset(solution: LowerBodySolution, weight = 1) {
  return {
    x: solution.pelvisPosition.x * weight,
    y: (solution.pelvisPosition.y - LEG_RIG.pelvisRest) * weight,
    z: solution.pelvisPosition.z * weight,
    yaw: solution.pelvisYaw * CHEST_FOLLOW * weight,
  };
}
