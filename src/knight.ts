import * as THREE from 'three';
import { smooth, swingProgress } from './combat.ts';
import type { AttackDefinition, BladeSegment } from './combat.ts';
import type { PlayerDefense } from './defense.ts';
import { createHumanRig } from './humanRig.ts';
import { snapshotWeapon } from './debris.ts';
import type { SeverPart } from './debris.ts';
import { FINISHERS } from './finisher.ts';
import type { FinisherDefinition } from './finisher.ts';
import type { LowerBodyOverride } from './footwork/legs.ts';

/** Articulated, skinned character-quality sample with gameplay-aligned controls. */
export function createKnight() {
  const root = new THREE.Group();
  const visual = new THREE.Group(); visual.position.y = 0.9; root.add(visual);
  const skeleton = new THREE.Group(); skeleton.position.y = -0.9; visual.add(skeleton);
  // The carrier is identity unless the footwork system lowers the hips; it then moves the
  // upper-body controls and sword with them.
  const carrier = new THREE.Group(); skeleton.add(carrier);
  const body = new THREE.Group(); carrier.add(body);
  let lowerBody: LowerBodyOverride | null = null;
  const steel = new THREE.MeshToonMaterial({ color: '#c3cdca' });
  const leather = new THREE.MeshToonMaterial({ color: '#40322c' });
  function weaponPiece(geometry: THREE.BufferGeometry, material: THREE.Material, position: THREE.Vector3) {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.copy(position); mesh.castShadow = true; sword.add(mesh);
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 28), new THREE.LineBasicMaterial({ color: '#243137', transparent: true, opacity: 0.6 })));
  }
  const legs = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.18, 0.72, 0); skeleton.add(pivot);
    const knee = new THREE.Group(); knee.position.y = -0.28; pivot.add(knee);
    const foot = new THREE.Group(); foot.position.y = -0.28; knee.add(foot);
    return { side, pivot, knee, foot };
  });
  const sword = new THREE.Group(); sword.name = 'Longsword'; body.add(sword);
  weaponPiece(new THREE.CylinderGeometry(0.025,0.027,0.3,10),leather,new THREE.Vector3(0,-0.08,0));
  weaponPiece(new THREE.SphereGeometry(0.045,10,8),steel,new THREE.Vector3(0,-0.25,0));
  weaponPiece(new THREE.BoxGeometry(0.34,0.035,0.045),steel,new THREE.Vector3(0,0.12,0));
  const bladeGeometry = new THREE.BufferGeometry();
  bladeGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -.042,.16,0, .042,.16,0, 0,.16,.018, 0,.16,-.018,
    -.026,1.29,0, .026,1.29,0, 0,1.29,.012, 0,1.29,-.012, 0,1.46,0,
  ],3));
  bladeGeometry.setIndex([0,4,2,2,4,6,2,6,1,1,6,5,1,5,3,3,5,7,3,7,0,0,7,4,4,8,6,6,8,5,5,8,7,7,8,4]);
  bladeGeometry.computeVertexNormals(); weaponPiece(bladeGeometry,steel,new THREE.Vector3());
  const rig = createHumanRig(skeleton, { body, sword, feet: legs.map(leg=>leg.foot) });
  const axis = new THREE.Vector3(0, 1, 0);
  const neutral = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.5, 0, -0.2));
  let lastSerial = -1;
  let grip = 1, entryGrip = 1, spinAngle = 0, entrySpin = 0, finishSpin = 0, carryBlend = 1;
  let gait = 0, motionPhase = 0;
  const hilt = new THREE.Vector3(0.16, 1.18, -0.29);
  const joints = [body, sword, ...legs.flatMap(leg => [leg.pivot, leg.knee, leg.foot])];
  const capturePose = () => joints.map(joint => ({ position: joint.position.clone(), rotation: joint.quaternion.clone() }));
  type Pose = ReturnType<typeof capturePose>;
  const applyPose = (pose: Pose) => joints.forEach((joint, i) => {
    joint.position.copy(pose[i].position); joint.quaternion.copy(pose[i].rotation);
  });
  const blendPose = (from: Pose, to: Pose, amount: number) => joints.forEach((joint, i) => {
    joint.position.copy(from[i].position).lerp(to[i].position, amount);
    joint.quaternion.copy(from[i].rotation).slerp(to[i].rotation, amount);
  });
  sword.position.copy(hilt); sword.quaternion.copy(neutral);
  let idlePose = capturePose();
  let entryPose = capturePose();
  let attacking = false;
  let returnPose: Pose | null = null;
  let returnBlend = 1;
  let defenseBlend = 0;
  let defensivePose = capturePose();
  let defensiveRotation = new THREE.Quaternion();
  let defensiveHeight = 0.9;

  function poseAttack(definition: AttackDefinition | null, elapsed: number, serial: number) {
    if (definition && serial !== lastSerial) {
      entryPose = capturePose(); entryGrip = grip; lastSerial = serial;
      entrySpin = spinAngle;
      finishSpin = Math.round(entrySpin / (Math.PI * 2)) * Math.PI * 2 + (definition.style === 'backspin' ? definition.side * Math.PI * 2 : 0);
      returnPose = null;
    }
    if (!definition && attacking) { returnPose = capturePose(); returnBlend = 0; }
    attacking = !!definition;
    if (definition) spinAngle = THREE.MathUtils.lerp(entrySpin, finishSpin, smooth(elapsed / definition.preparation));
    const desired = neutral.clone();
    let swing = 0;
    let recover = 0;
    let preparation = 0;
    if (definition) {
      const orientation = (degrees: number) => {
        const angle = THREE.MathUtils.degToRad(degrees);
        const plane = new THREE.Vector2(...definition.plane).normalize();
        const direction = new THREE.Vector3(plane.x * Math.sin(angle), plane.y * Math.sin(angle), -Math.cos(angle));
        return new THREE.Quaternion().setFromUnitVectors(axis, direction);
      };
      if (elapsed < definition.preparation) {
        preparation = smooth(elapsed / definition.preparation);
        desired.copy(orientation(definition.arc[0]));
      } else if (elapsed < definition.preparation + definition.swing) {
        preparation = 1;
        swing = swingProgress((elapsed - definition.preparation) / definition.swing);
        // Follow the authored cut plane explicitly, avoiding quaternion shortcuts
        // that can turn a deep windup into a small wrist-driven motion.
        desired.copy(orientation(THREE.MathUtils.lerp(definition.arc[0], definition.arc[1], swing)));
      } else {
        preparation = 1;
        recover = smooth((elapsed - definition.preparation - definition.swing) / definition.recovery);
        desired.copy(orientation(definition.arc[1])); swing = 1;
      }
    }
    sword.position.copy(hilt);
    body.position.x = 0; body.position.z = 0;
    for (const leg of legs) leg.pivot.position.set(leg.side * 0.18, 0.72, 0);
    if (definition) {
      const overhead = definition.cut === 'overhead';
      const rising = definition.cut === 'rising';
      const side = definition.side;
      const strength = definition.kind === 'heavy' ? 1.15 : 1;
      const start = new THREE.Vector3(overhead ? 0 : side * 0.19, overhead ? 1.65 : rising ? 1.1 : 1.45, -0.15);
      const finish = new THREE.Vector3(overhead ? 0 : -side * 0.16, overhead ? 1.13 : rising ? 1.53 : 1.28, -0.36);
      sword.position.copy(start.lerp(finish, swing));
      body.position.y = -0.06;
      body.position.z = -0.045;
      body.rotation.y = overhead ? 0 : side * (-0.25 + 0.57 * swing) * strength;
      body.rotation.x = overhead ? 0.1 - 0.27 * swing : -0.09 * swing;
      body.rotation.z = overhead ? 0 : side * 0.055;

      const step = smooth((elapsed - definition.preparation * 0.45) / (definition.preparation * 0.55 + definition.swing * 0.4));
      for (const leg of legs) {
        const lead = leg.side === side;
        const travel = (lead ? -0.22 : 0.1) * step;
        const lift = lead && step < 1 ? Math.sin(step * Math.PI) * 0.035 : 0;
        leg.pivot.position.y -= 0.06;
        const down = leg.pivot.position.y - (0.16 + lift);
        const reach = Math.min(0.56, Math.hypot(down, travel));
        const bend = Math.acos(THREE.MathUtils.clamp(reach / 0.56, 0, 1));
        leg.pivot.rotation.x = Math.atan2(-travel, down) + bend;
        leg.knee.rotation.x = -2 * bend;
        leg.foot.rotation.x = -(leg.pivot.rotation.x + leg.knee.rotation.x);
      }
    }
    sword.quaternion.copy(desired);
    grip = definition ? THREE.MathUtils.lerp(entryGrip, 1, preparation) : grip;
    visual.quaternion.setFromAxisAngle(axis, spinAngle);
    // Blend the complete stance, not just the sword orientation. Pose sampling is
    // deterministic: entryPose stays fixed for every hit-test sample of a strike.
    if (!definition) {
      if (returnPose) blendPose(returnPose, idlePose, returnBlend);
      else applyPose(idlePose);
    }
    else if (preparation < 1) blendPose(entryPose, capturePose(), preparation);
    else if (recover > 0) blendPose(capturePose(), idlePose, recover);
    root.updateWorldMatrix(true, true);
    rig.update(grip, attacking ? 0 : gait, motionPhase, lowerBody);
  }
  poseAttack(null, 0, 0);

  let sprintBlend = 0;
  return {
    root,
    poseAttack,
    rig,
    carrier,
    /** Hand the pelvis and legs to the footwork system (null restores the built-in legs). */
    setLowerBody(value: LowerBodyOverride | null) { lowerBody = value; },
    get capabilities() { return { helmet: rig.hasPart('head'), head: rig.hasPart('head'), swordArm: rig.hasPart('sword-arm'), weapon: sword.visible }; },
    dropWeapon() { return snapshotWeapon(sword); },
    detach(part: SeverPart) {
      const detached = rig.detach(part);
      if (detached && part === 'sword-arm') {
        const weapon = snapshotWeapon(sword);
        if (weapon) { detached.updateWorldMatrix(true, true); detached.attach(weapon); }
      }
      return detached;
    },
    resetParts() { rig.resetParts(); sword.visible = true; },
    /** Functional paired-action poses only; final finisher clips come later. */
    poseFinisher(elapsed: number, victim: boolean, serial: number, definition: FinisherDefinition = FINISHERS[0]) {
      if (definition.id === 'rising' && !victim && elapsed >= 1.3) {
        this.poseKick({ preparation: 0.12, swing: 0.2, recovery: 0.48 }, elapsed - 1.3, serial + 1);
        return;
      }
      if (serial !== lastSerial) { entryPose = capturePose(); lastSerial = serial; }
      attacking = true; spinAngle = 0; grip = 1; visual.quaternion.identity(); visual.position.y = 0.9;
      applyPose(idlePose);
      if (victim) {
        const fall = smooth((elapsed - definition.fall) / 0.5);
        body.position.y = -0.12;
        body.rotation.x = -0.2 - 0.2 * smooth((elapsed - 0.55) / 0.3);
        sword.position.set(0.35, 0.9, -0.12);
        sword.quaternion.setFromUnitVectors(axis, new THREE.Vector3(0.8, -0.5, 0.1).normalize());
        visual.rotation.x = -1.45 * fall; visual.position.y -= 0.48 * fall;
        if (definition.id === 'decapitation') body.position.y -= .25 * (1 - fall);
      } else {
        const rise = smooth((elapsed - 0.85) / 0.4);
        sword.position.set(0.08, 1.15 + rise * 0.55, -0.6 + rise * 0.28);
        sword.quaternion.setFromUnitVectors(axis, new THREE.Vector3(0, rise * 1.4 - 0.2, -1).normalize());
        body.position.set(0, -0.06, -0.04);
        body.rotation.set(-0.06 + rise * 0.12, 0.1 * rise, 0);
        for (const leg of legs) { leg.pivot.rotation.x = 0.24; leg.knee.rotation.x = -0.48; leg.foot.rotation.x = 0.24; }
        if (definition.id !== 'rising') {
          const cut = smooth((elapsed - definition.lethal + .25) / .3);
          body.rotation.y = -.25 + cut * .55;
          if (definition.id === 'disarm') {
            const beats = elapsed < .75 ? .2 : elapsed < 1.1 ? -.7 : .7;
            sword.position.set(beats * .25, 1.3, -.45);
            sword.quaternion.setFromUnitVectors(axis, new THREE.Vector3(beats * (1 - cut), .25, -1).normalize());
          } else if (definition.id === 'helmet') {
            sword.position.set(.1, 1.55, -.32);
            sword.quaternion.setFromUnitVectors(axis, new THREE.Vector3(1, .1, -.15).normalize());
          } else {
            const armCut = definition.id === 'sword-arm' && elapsed < 1.1;
            sword.position.set(.2 - cut * .4, armCut ? 1.6 - smooth((elapsed - .7) / .3) * .45 : 1.35, -.4);
            sword.quaternion.setFromUnitVectors(axis, new THREE.Vector3(1 - cut * 2, armCut ? -.8 : .05, -.5).normalize());
          }
          const recover = smooth((elapsed - definition.duration + .4) / .4);
          if (recover > 0) blendPose(capturePose(), idlePose, recover);
        }
      }
      if (elapsed < 0.28) blendPose(entryPose, capturePose(), smooth(elapsed / 0.28));
      root.updateWorldMatrix(true, true); rig.update(grip, 0, motionPhase, lowerBody);
    },
    poseKick(timing: { preparation: number; swing: number; recovery: number }, elapsed: number, serial: number) {
      if (serial !== lastSerial) { entryPose = capturePose(); lastSerial = serial; }
      attacking = true; spinAngle = 0; grip = 1; visual.quaternion.identity();
      const load = smooth(elapsed / timing.preparation);
      const extension = smooth((elapsed - timing.preparation) / (timing.swing * 0.6));
      const recovery = smooth((elapsed - timing.preparation - timing.swing) / timing.recovery);
      body.position.set(-0.07, 0.03, 0.04);
      body.rotation.set(0.12 + extension * 0.08, -0.08, -0.045);
      // Keep the sword held upright and back; only the boot delivers contact.
      sword.position.set(-0.12, 1.3, -0.2);
      sword.quaternion.setFromUnitVectors(axis, new THREE.Vector3(0.6, 0.8, 0.2).normalize());
      const support = legs[0], kicking = legs[1];
      support.pivot.position.set(-0.18, 0.72, 0);
      support.pivot.rotation.set(0.2, 0, 0); support.knee.rotation.set(-0.4, 0, 0); support.foot.rotation.set(0.2, 0, 0);
      kicking.pivot.position.set(0.38 - extension * 0.24, 0.86, -0.12);
      kicking.pivot.rotation.set(2.25 - extension * 0.25, 0, 0.25 * (1 - extension));
      kicking.knee.rotation.set(-2.3 + extension * 1.85, 0, 0);
      kicking.foot.rotation.set(-(kicking.pivot.rotation.x + kicking.knee.rotation.x), 0, 0);
      if (load < 1) blendPose(entryPose, capturePose(), load);
      else if (recovery > 0) blendPose(capturePose(), idlePose, recovery);
      root.updateWorldMatrix(true, true);
      rig.update(grip, attacking ? 0 : gait, motionPhase, lowerBody);
    },
    kickContact(): BladeSegment {
      return { base: legs[1].foot.localToWorld(new THREE.Vector3(0, -0.075, 0.08)), tip: legs[1].foot.localToWorld(new THREE.Vector3(0, -0.075, -0.26)) };
    },
    poseDefense(defense: PlayerDefense, dt: number, locomoting = false) {
      if (attacking) { defenseBlend = 0; visual.quaternion.setFromAxisAngle(axis, spinAngle); visual.position.y = 0.9; return; }
      const active = defense.locked || defense.blocking || defense.parryLeft > 0 || defense.parryVisualLeft > 0;
      const baseline = capturePose();
      if (active) grip = THREE.MathUtils.lerp(grip, 1, 1 - Math.exp(-22 * dt));
      if (active) {
        const guarding = !defense.locked;
        sword.position.set(-0.12, 1.3, -0.42);
        sword.quaternion.setFromUnitVectors(axis, new THREE.Vector3(0.8, 0.6, -0.12).normalize());
        body.position.y = guarding ? -0.04 : -0.11;
        body.rotation.x = guarding ? -0.05 : 0.16;
        body.rotation.y = guarding ? -0.15 : 0;
        if (!guarding || !locomoting) for (const leg of legs) { leg.pivot.rotation.x = 0.22; leg.knee.rotation.x = -0.44; leg.foot.rotation.x = 0.22; }
        defensiveRotation.identity(); defensiveHeight = 0.9;
        if (defense.mode === 'roll') {
          const local = new THREE.Vector3(defense.dodgeDirection.x, 0, defense.dodgeDirection.z).applyAxisAngle(axis, -root.rotation.y);
          defensiveRotation.setFromAxisAngle(new THREE.Vector3(local.z, 0, -local.x).normalize(), Math.PI * 2 * smooth(defense.progress));
          defensiveHeight += Math.sin(Math.PI * defense.progress) * 0.08;
          body.position.y = -0.2;
        } else if (defense.mode === 'knockdown' || defense.mode === 'dead') {
          const fall = defense.mode === 'dead' ? 1 : Math.sin(Math.PI * defense.progress);
          defensiveRotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -1.35 * fall);
          defensiveHeight -= 0.2 * fall;
        } else if (defense.mode === 'flinch' || defense.mode === 'stagger' || defense.mode === 'guard-break') {
          body.rotation.x = -0.3 * Math.sin(Math.PI * defense.progress);
          sword.position.set(0.3, 0.95, -0.18);
          if (defense.mode === 'guard-break') {
            body.rotation.x = -0.32 - 0.12 * Math.sin(Math.PI * defense.progress);
            body.rotation.y = 0.28 * (1 - defense.progress);
            sword.position.set(0.5, 0.8, -0.05);
            sword.quaternion.setFromUnitVectors(axis, new THREE.Vector3(0.9, -0.3, 0.1).normalize());
          }
        }
        defensivePose = capturePose();
      }
      defenseBlend = THREE.MathUtils.lerp(defenseBlend, active ? 1 : 0, 1 - Math.exp(-22 * dt));
      blendPose(baseline, defensivePose, defenseBlend);
      visual.quaternion.setFromAxisAngle(axis, spinAngle).multiply(new THREE.Quaternion().slerp(defensiveRotation, defenseBlend));
      visual.position.y = THREE.MathUtils.lerp(0.9, defensiveHeight, defenseBlend);
      root.updateWorldMatrix(true, true);
      rig.update(grip, attacking ? 0 : gait, motionPhase, lowerBody);
    },
    blade(): BladeSegment {
      return { base: sword.localToWorld(new THREE.Vector3(0, 0.16, 0)), tip: sword.localToWorld(new THREE.Vector3(0, 1.46, 0)) };
    },
    animate(distance: number, speed: number, time: number, dt: number, travel?: { x: number; z: number }, combatReady = true) {
      const previousPose = attacking || returnPose || defenseBlend > 0.001 ? capturePose() : null;
      if (!attacking) {
        spinAngle = THREE.MathUtils.lerp(spinAngle, Math.round(spinAngle / (Math.PI * 2)) * Math.PI * 2, 1 - Math.exp(-20 * dt));
        returnBlend = THREE.MathUtils.lerp(returnBlend, 1, 1 - Math.exp(-18 * dt));
        if (returnBlend > 0.999) returnPose = null;
      }
      const blend = 1 - Math.exp(-10 * dt);
      gait = THREE.MathUtils.lerp(gait, Math.min(1, speed / 2), blend);
      sprintBlend = THREE.MathUtils.lerp(sprintBlend, THREE.MathUtils.clamp((speed - 4.2) / 3, 0, 1), blend);
      const phase = distance * 3.5; motionPhase = phase;
      if (!attacking) grip = THREE.MathUtils.lerp(grip, combatReady ? 1 : 0, 1 - Math.exp(-9 * dt));
      const length = travel ? Math.hypot(travel.x, travel.z) : 0;
      const lateral = length ? (Math.cos(root.rotation.y) * travel!.x - Math.sin(root.rotation.y) * travel!.z) / length : 0;
      const forward = length ? -(Math.sin(root.rotation.y) * travel!.x + Math.cos(root.rotation.y) * travel!.z) / length : 1;
      legs.forEach((leg, i) => {
        leg.pivot.position.set(leg.side * 0.18, 0.72, 0);
        const step = Math.sin(phase + i * Math.PI);
        leg.pivot.rotation.x = step * (0.4 + 0.3 * sprintBlend) * gait * forward;
        leg.pivot.rotation.z = -step * 0.3 * gait * lateral;
        leg.knee.rotation.x = -Math.max(0, step) * 0.45 * gait;
        leg.foot.rotation.x = 0;
        leg.foot.rotation.z = -leg.pivot.rotation.z;
      });
      body.position.y = Math.abs(Math.sin(phase)) * 0.035 * gait + Math.sin(time * 1.8) * 0.009 * (1 - gait);
      body.position.x = 0; body.position.z = 0;
      body.rotation.x = -0.055 * sprintBlend;
      body.rotation.y = 0; body.rotation.z = -lateral * gait * 0.025;
      sword.position.copy(hilt); sword.quaternion.copy(neutral);
      carryBlend = THREE.MathUtils.lerp(carryBlend, combatReady ? 1 : 0, 1 - Math.exp(-9 * dt));
      const lowCarry = new THREE.Vector3(0.3, 1.02 + Math.sin(phase) * gait * 0.025, 0.08);
      sword.position.copy(lowCarry).lerp(hilt,carryBlend);
      const lowRotation = new THREE.Quaternion().setFromUnitVectors(axis,new THREE.Vector3(0.05,-0.58,0.81).normalize());
      sword.quaternion.copy(lowRotation).slerp(neutral,carryBlend);
      idlePose = capturePose();
      // Keep the visible attack intact while refreshing its moving/idle return pose.
      if (previousPose) applyPose(previousPose);
    },
  };
}
