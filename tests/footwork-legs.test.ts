import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createKnight } from '../src/knight.ts';
import { LEG_RIG, anklePosition, carrierOffset, contactPoints, createLowerBodyOverride, solveLowerBody, writeOverride } from '../src/footwork/legs.ts';
import type { FootTarget, LowerBodyPose } from '../src/footwork/legs.ts';

// Rung 1: the leg solver on its own, then on the real knight skeleton.

const foot = (x: number, z: number, yawDegrees = 0, pitchDegrees = 0, lift = 0): FootTarget =>
  ({ x, z, lift, yaw: THREE.MathUtils.degToRad(yawDegrees), pitch: THREE.MathUtils.degToRad(pitchDegrees) });
const pose = (y: number, left: FootTarget, right: FootTarget, yawDegrees = 0, x = 0, z = 0): LowerBodyPose =>
  ({ pelvis: { x, y, z, yaw: THREE.MathUtils.degToRad(yawDegrees), pitch: 0, roll: 0 }, feet: [left, right] });

test('legs keep their bone lengths and put each ankle exactly on its target', () => {
  const cases = [
    pose(0.82, foot(-0.08, 0.23, 82), foot(0.07, -0.27, -4), 32),
    pose(0.72, foot(-0.14, 0.32, 55), foot(0.13, -0.34, -8), 20),
    pose(0.9, foot(-0.2, -0.1, 10, 0, 0.05), foot(0.25, 0.1, -20, 14)),
    pose(0.62, foot(-0.08, 0.6, 82), foot(0.07, -0.45, -4, 20, 0.04), 40),
  ];
  for (const [index, entry] of cases.entries()) {
    const solution = solveLowerBody(entry);
    solution.legs.forEach((leg, i) => {
      assert.ok(Math.abs(leg.hip.distanceTo(leg.knee) - LEG_RIG.thigh) < 1e-6, `case ${index} leg ${i}: thigh length`);
      assert.ok(Math.abs(leg.knee.distanceTo(leg.ankle) - LEG_RIG.shin) < 1e-6, `case ${index} leg ${i}: shin length`);
      assert.ok(leg.ankle.distanceTo(anklePosition(entry.feet[i])) < 1e-6, `case ${index} leg ${i}: ankle on target`);
      assert.equal(leg.miss, 0);
      for (const value of [...leg.thigh.toArray(), ...leg.shin.toArray(), ...leg.foot.toArray()]) assert.ok(Number.isFinite(value));
    });
  }
});

test('the knee bends over the toes of its own foot, including a turned-out rear foot', () => {
  for (const turnout of [0, 30, 60, 82]) {
    const solution = solveLowerBody(pose(0.8, foot(-0.08, 0.22, turnout), foot(0.07, -0.26, 0), 25));
    assert.ok(solution.legs[0].kneeToToes < 15, `rear foot at ${turnout}°: knee is ${solution.legs[0].kneeToToes.toFixed(1)}° off the toes`);
    assert.ok(solution.legs[1].kneeToToes < 15, `lead knee is ${solution.legs[1].kneeToToes.toFixed(1)}° off the toes`);
  }
});

test('when a planted foot is out of reach the hips sink instead of the foot leaving the floor', () => {
  // Standing height with the feet a long stride apart: the legs are too short for this.
  const wide = pose(LEG_RIG.pelvisRest, foot(-0.1, 0.45, 60), foot(0.1, -0.45, 0));
  const solution = solveLowerBody(wide);
  assert.ok(solution.sink > 0.1, `hips lowered by ${solution.sink.toFixed(3)}`);
  assert.equal(solution.shift, 0, 'sinking alone is enough here');
  solution.legs.forEach((leg, i) => {
    assert.equal(leg.miss, 0, `foot ${i} stays on its target`);
    assert.ok(leg.extension <= 1, 'no stretching');
    assert.ok(leg.ankle.distanceTo(anklePosition(wide.feet[i])) < 1e-6);
  });
  // A pose already within reach is left exactly where it was asked to be.
  const easy = solveLowerBody(pose(0.8, foot(-0.1, 0.2), foot(0.1, -0.2)));
  assert.ok(easy.sink < 1e-6 && easy.shift === 0 && Math.abs(easy.pelvisPosition.y - 0.8) < 1e-6);
});

test('hip height changes smoothly as a foot moves out of reach', () => {
  let previous = solveLowerBody(pose(0.9, foot(-0.1, 0), foot(0.1, 0))).pelvisPosition.y;
  for (let reach = 0.005; reach <= 0.75; reach += 0.005) {
    const height = solveLowerBody(pose(0.9, foot(-0.1, reach), foot(0.1, 0))).pelvisPosition.y;
    assert.ok(Math.abs(height - previous) < 0.012, `hip height jumps ${(height - previous).toFixed(4)} at reach ${reach.toFixed(3)}`);
    assert.ok(height <= previous + 1e-9, 'hips only go down as the foot goes out');
    previous = height;
  }
});

test('a pitched foot turns about its heel or the ball of the foot, so the contact point stays put', () => {
  const flat = contactPoints(foot(0.1, -0.3, 20));
  for (const pitch of [5, 12, 22]) {
    const raised = contactPoints(foot(0.1, -0.3, 20, pitch));
    assert.ok(Math.hypot(raised.heel.x - flat.heel.x, raised.heel.y, raised.heel.z - flat.heel.z) < 1e-9, 'heel stays down with the toes up');
    assert.ok(raised.ball.y > 0.01, 'ball of the foot is off the floor');
    const pushed = contactPoints(foot(0.1, -0.3, 20, -pitch));
    assert.ok(Math.hypot(pushed.ball.x - flat.ball.x, pushed.ball.y, pushed.ball.z - flat.ball.z) < 1e-9, 'ball stays down with the heel up');
    assert.ok(pushed.heel.y > 0.01, 'heel is off the floor');
  }
});

test('the real knight skeleton follows the solver: ankles on target, pelvis where asked, bones unstretched', () => {
  const knight = createKnight();
  const names = ['Pelvis', '-1 Hip', '-1 Knee', '-1 Ankle', '1 Hip', '1 Knee', '1 Ankle'];
  const bones = Object.fromEntries(names.map(name => [name, knight.rig.bones.find(bone => bone.name === name)!]));
  const world = (name: string) => bones[name].getWorldPosition(new THREE.Vector3());
  const override = createLowerBodyOverride();
  knight.setLowerBody(override);
  const cases = [
    pose(0.82, foot(-0.08, 0.23, 82), foot(0.07, -0.27, -4), 32),
    pose(0.62, foot(-0.08, 0.6, 82), foot(0.07, -0.45, -4, 20, 0.04), 40),
    pose(LEG_RIG.pelvisRest, foot(-0.1, 0.45, 60), foot(0.1, -0.45, 0)),
  ];
  for (const [index, entry] of cases.entries()) {
    const solution = solveLowerBody(entry);
    writeOverride(override, solution);
    knight.poseAttack(null, 0, 0);
    assert.ok(world('Pelvis').distanceTo(solution.pelvisPosition) < 1e-5, `case ${index}: pelvis`);
    [-1, 1].forEach((side, i) => {
      assert.ok(world(`${side} Ankle`).distanceTo(solution.legs[i].ankle) < 1e-4, `case ${index}: ankle ${side} is ${world(`${side} Ankle`).distanceTo(solution.legs[i].ankle).toFixed(5)} from its target`);
      assert.ok(world(`${side} Knee`).distanceTo(solution.legs[i].knee) < 1e-4, `case ${index}: knee ${side}`);
      assert.ok(Math.abs(world(`${side} Hip`).distanceTo(world(`${side} Knee`)) - LEG_RIG.thigh) < 1e-5);
      // The boot's own forward axis points where the foot target says.
      const toes = new THREE.Vector3(0, 0, -1).applyQuaternion(bones[`${side} Ankle`].getWorldQuaternion(new THREE.Quaternion()));
      const wanted = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(entry.feet[i].pitch, entry.feet[i].yaw, 0, 'YXZ'));
      assert.ok(toes.angleTo(wanted) < 1e-4, `case ${index}: boot ${side} heading`);
    });
  }
});

test('handing the legs back restores the knight exactly, and half weight sits between the two', () => {
  const knight = createKnight();
  const ankle = knight.rig.bones.find(bone => bone.name === '1 Ankle')!, pelvis = knight.rig.bones.find(bone => bone.name === 'Pelvis')!;
  knight.poseAttack(null, 0, 0);
  const before = ankle.getWorldPosition(new THREE.Vector3()), beforeHips = pelvis.getWorldPosition(new THREE.Vector3());
  const override = writeOverride(createLowerBodyOverride(), solveLowerBody(pose(0.7, foot(-0.14, 0.3, 55), foot(0.13, -0.34, -8), 20)));
  knight.setLowerBody(override); knight.poseAttack(null, 0, 0);
  const driven = pelvis.getWorldPosition(new THREE.Vector3());
  assert.ok(driven.y < beforeHips.y - 0.2);
  override.weight = 0.5; knight.poseAttack(null, 0, 0);
  const half = pelvis.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(half.y - (driven.y + beforeHips.y) / 2) < 1e-5);
  override.weight = 0; knight.poseAttack(null, 0, 0);
  assert.ok(ankle.getWorldPosition(new THREE.Vector3()).distanceTo(before) < 1e-9, 'zero weight is the original pose');
  knight.setLowerBody(null); knight.poseAttack(null, 0, 0);
  assert.ok(ankle.getWorldPosition(new THREE.Vector3()).distanceTo(before) < 1e-9 && pelvis.getWorldPosition(new THREE.Vector3()).distanceTo(beforeHips) < 1e-9);
});

test('the upper-body carrier moves the sword with the hips', () => {
  const knight = createKnight();
  knight.poseAttack(null, 0, 0);
  const standing = knight.blade().base.clone();
  const solution = solveLowerBody(pose(0.74, foot(-0.1, 0.2), foot(0.1, -0.2)));
  const offset = carrierOffset(solution);
  knight.setLowerBody(writeOverride(createLowerBodyOverride(), solution));
  knight.carrier.position.set(offset.x, offset.y, offset.z); knight.carrier.rotation.y = offset.yaw;
  knight.poseAttack(null, 0, 0);
  assert.ok(Math.abs(knight.blade().base.y - (standing.y - 0.2)) < 1e-6, 'sword drops by exactly as much as the hips');
});
