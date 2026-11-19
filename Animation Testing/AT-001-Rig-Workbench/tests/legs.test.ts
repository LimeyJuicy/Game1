import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createLegStudy, sampleFoot, LEG_STUDY } from '../viewer/legs.ts';

const calibration = { height: .14, toe: -.16, heel: .056, stride: 1.05, clearance: .056 };
const near = (a: number, b: number, tolerance = .00001) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`);
test('heel/sole/toe support remains on ground and swing clears it across the whole cycle', () => {
  for (let i = 0; i < 1000; i++) {
    const sample = sampleFoot(i / 1000, calibration);
    const heel = sample.y - calibration.height * Math.cos(sample.pitch) - calibration.heel * Math.sin(sample.pitch);
    const toe = sample.y - calibration.height * Math.cos(sample.pitch) - calibration.toe * Math.sin(sample.pitch);
    assert.ok(Math.min(heel, toe) >= -.000001);
    if (sample.stance) near(Math.min(heel, toe), 0);
    if (sample.phase > .79 && sample.phase < .94) assert.ok(Math.min(heel, toe) > .01);
    assert.ok(Math.min(heel, toe) < .057, 'recovery should stay low, not march high');
  }
});
test('stance pivots stay fixed in world space with matching forward travel', () => {
  for (const range of [[.01, .1], [.15, .4], [.46, .58]]) {
    const values = range.map(p => {
      const sample = sampleFoot(p, calibration);
      return sample.z + sample.contactOffset - calibration.stride * p;
    });
    near(values[0], values[1]);
  }
});
test('ankle and toe tracks stay continuous through toe-off, landing and the loop seam', () => {
  for (const p of [LEG_STUDY.contactEnd, LEG_STUDY.rollStart, LEG_STUDY.stance, LEG_STUDY.stance + (1 - LEG_STUDY.stance) * .4, LEG_STUDY.stance + (1 - LEG_STUDY.stance) * .55, 1]) {
    const before = sampleFoot(p - .000001, calibration), after = sampleFoot(p + .000001, calibration);
    for (const key of ['y', 'z', 'pitch', 'toePitch'] as const) near(before[key], after[key], .0001);
  }
});
function rig() {
  const root = new THREE.Group(), hips = new THREE.Bone(); hips.name = 'Hips'; hips.position.y = 1; root.add(hips);
  const chest = new THREE.Bone(); chest.name = 'Spine'; chest.position.y = .2; chest.rotation.z = .05; hips.add(chest);
  for (const [i, side] of ['Left', 'Right'].entries()) {
    const upper = new THREE.Bone(); upper.name = `${side}UpLeg`; upper.position.x = i ? .1 : -.1; hips.add(upper);
    const lower = new THREE.Bone(); lower.name = `${side}Leg`; lower.position.y = -.43; upper.add(lower);
    const foot = new THREE.Bone(); foot.name = `${side}Foot`; foot.position.y = -.43; lower.add(foot);
    const toe = new THREE.Bone(); toe.name = `${side}ToeBase`; toe.position.set(0, -.12, -.16); foot.add(toe);
  }
  return { root, chest };
}
test('new clip includes linked pelvis rotation and nearly straight support, without stretching limbs', () => {
  const { root, chest } = rig(), study = createLegStudy(root)!;
  assert.ok(study); assert.equal(study.clip.tracks.length, 10); assert.ok(study.maximumReachError < .003);
  assert.ok(study.minimumSupportKneeBend < 10, `support bend ${study.minimumSupportKneeBend}`);
  assert.ok(study.extendedSupportFraction > .6, `extended support fraction ${study.extendedSupportFraction}`);
  assert.ok(study.clip.tracks.every(track => !/Spine|Arm|Head/.test(track.name)));
  const mixer = new THREE.AnimationMixer(root), action = mixer.clipAction(study.clip); action.play(); action.paused = true;
  const chestPose = chest.quaternion.clone();
  for (let i = 0; i < 160; i++) {
    action.time = i / 160 * LEG_STUDY.duration; mixer.update(0); root.updateWorldMatrix(true, true);
    for (const sample of study.sample(action.time)) {
      const hip = new THREE.Vector3().fromArray(sample.hip), knee = new THREE.Vector3().fromArray(sample.knee), foot = new THREE.Vector3().fromArray(sample.ankle);
      near(hip.distanceTo(knee), .43); near(knee.distanceTo(foot), .43);
      assert.ok(knee.z < (hip.z + foot.z) / 2 + .01, 'knees should bend forward');
    }
    assert.ok(chest.quaternion.angleTo(chestPose) < .000001);
  }
  for (const track of study.clip.tracks) {
    const size = track.getValueSize();
    for (let i = 0; i < size; i++) near(track.values[i], track.values[track.values.length - size + i]);
  }
});
test('support lasts longer and the swing lifts gradually rather than immediately picking up', () => {
  assert.equal(sampleFoot(.64, calibration).stance, true);
  const p = LEG_STUDY.stance + .015, sample = sampleFoot(p, calibration);
  const floor = Math.max(calibration.height * Math.cos(sample.pitch) + calibration.heel * Math.sin(sample.pitch), calibration.height * Math.cos(sample.pitch) + calibration.toe * Math.sin(sample.pitch));
  assert.ok(sample.y - floor < .001);
  const { root } = rig(), study = createLegStudy(root)!, mixer = new THREE.AnimationMixer(root);
  const action = mixer.clipAction(study.clip); action.play(); action.paused = true;
  const pelvisRotations: number[][] = [];
  for (const phase of [0, .5]) {
    action.time = phase * LEG_STUDY.duration; mixer.update(0); root.updateWorldMatrix(true, true);
    const feet = study.sample(action.time); pelvisRotations.push(study.pelvisPose().rotation);
    if (phase === 0) assert.ok(feet[0].hip[2] < feet[1].hip[2], 'left pelvis should advance with left contact');
    else assert.ok(feet[1].hip[2] < feet[0].hip[2], 'right pelvis should advance with right contact');
  }
  assert.ok(new THREE.Quaternion().fromArray(pelvisRotations[0]).angleTo(new THREE.Quaternion().fromArray(pelvisRotations[1])) > .1);
});
test('unsupported rigs are not silently substituted or misidentified', () => {
  assert.equal(createLegStudy(new THREE.Group()), null);
});
