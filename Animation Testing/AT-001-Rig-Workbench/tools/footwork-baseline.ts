// Read-only baseline measurements for the fencing-footwork research (2026-11-19).
// Measures the main-game knight rig as it is; changes nothing. Numbers are bone/numeric
// facts, not evidence of visual quality. Run from Game1:
//   node --experimental-strip-types "Animation Testing/AT-001-Rig-Workbench/tools/footwork-baseline.ts"
import * as THREE from 'three';
import { createKnight } from '../../../src/knight.ts';
import { createHumanRig } from '../../../src/humanRig.ts';

const LEG = ['Pelvis', '-1 Hip', '-1 Knee', '-1 Ankle', '-1 Toe', '1 Hip', '1 Knee', '1 Ankle', '1 Toe'];
const bone = (k: any, name: string) => k.rig.bones.find((b: THREE.Bone) => b.name === name)!;
const wp = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
const wq = (o: THREE.Object3D) => o.getWorldQuaternion(new THREE.Quaternion());

// ---------- M1: does the only existing "stance" input (combatReady) reach the legs?
{
  let maxLegPos = 0, maxLegRot = 0, maxHand = 0, samples = 0;
  for (const [tx, tz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) for (const speed of [1.7, 4.2]) {
    const a = createKnight(), b = createKnight();
    let d = 0;
    for (let i = 0; i < 120; i++) {
      d += speed / 60;
      const travel = { x: tx * speed / 60, z: tz * speed / 60 };
      a.animate(d, speed, i / 60, 1 / 60, travel, true); a.poseAttack(null, 0, 0);
      b.animate(d, speed, i / 60, 1 / 60, travel, false); b.poseAttack(null, 0, 0);
      if (i < 60) continue; // let the carry blend settle
      samples++;
      for (const n of LEG) {
        maxLegPos = Math.max(maxLegPos, wp(bone(a, n)).distanceTo(wp(bone(b, n))));
        maxLegRot = Math.max(maxLegRot, wq(bone(a, n)).angleTo(wq(bone(b, n))));
      }
      maxHand = Math.max(maxHand, wp(bone(a, '-1 Hand')).distanceTo(wp(bone(b, '-1 Hand'))));
    }
  }
  console.log(`M1 stance→legs: ${samples} paired samples, max leg/pelvis position diff ${maxLegPos.toExponential(2)} m, max rotation diff ${maxLegRot.toExponential(2)} rad; free-hand diff up to ${maxHand.toFixed(3)} m`);
}

// ---------- M2: how much does a "planted" foot skate in the current gait?
function skate(tx: number, tz: number, speed: number) {
  const k = createKnight(); let d = 0; const dt = 1 / 60;
  const prev = new Map<string, THREE.Vector3>(); const ratios: number[] = [];
  let lowest = Infinity;
  for (let i = 0; i < 600; i++) {
    d += speed * dt; k.root.position.x += tx * speed * dt; k.root.position.z += tz * speed * dt;
    k.animate(d, speed, i * dt, dt, { x: tx * speed * dt, z: tz * speed * dt }, true); k.poseAttack(null, 0, 0);
    for (const n of ['-1 Ankle', '1 Ankle']) {
      const p = wp(bone(k, n)); const q = prev.get(n);
      if (q && i > 120) { const v = Math.hypot(p.x - q.x, p.z - q.z) / dt / speed; ratios.push(v); lowest = Math.min(lowest, v); }
      prev.set(n, p);
    }
  }
  const planted = ratios.filter(r => r < 0.05).length / ratios.length;
  return { lowest, planted };
}
for (const [label, tx, tz, speed] of [['advance 4.2', 0, -1, 4.2], ['retreat 4.2', 0, 1, 4.2], ['strafe 4.2', 1, 0, 4.2], ['guarded advance 1.7', 0, -1, 1.7], ['guarded strafe 1.7', 1, 0, 1.7]] as const) {
  const r = skate(tx, tz, speed);
  console.log(`M2 ${label}: slowest ankle ground speed = ${(r.lowest * 100).toFixed(0)}% of body speed; fraction of time an ankle is planted (<5% of body speed) = ${(r.planted * 100).toFixed(1)}%`);
}

// ---------- M3: can the EXISTING solver hold world-locked feet while the pelvis travels?
function probe() {
  const world = new THREE.Group();
  const character = new THREE.Group(); world.add(character);
  const body = new THREE.Group(); character.add(body);
  const sword = new THREE.Group(); sword.position.set(0.16, 1.18, -0.29); character.add(sword);
  const feet = [-1, 1].map(() => { const f = new THREE.Group(); world.add(f); return f; });
  const rig = createHumanRig(character, { body, sword, feet });
  const b = (n: string) => rig.bones.find(x => x.name === n)!;
  return { world, character, body, feet, rig, b };
}
{
  const ANKLE = 0.15; // ankle-joint height with the sole on the floor (boot geometry reaches ~0.147 below the joint)
  const p = probe();
  // en garde: right foot leads, left foot behind and turned out 90°
  p.feet[1].position.set(0.10, ANKLE, -0.24); p.feet[0].position.set(-0.10, ANKLE, 0.24);
  p.feet[0].rotation.y = Math.PI / 2;
  for (const drop of [0, 0.1, 0.2, 0.3]) {
    p.body.position.y = -drop / 0.75; // update() scales body.y by 0.75
    let maxErr = 0, firstFail = NaN;
    for (let z = 0; z >= -0.8; z -= 0.01) {
      p.character.position.z = z; p.world.updateWorldMatrix(true, true); p.rig.update(1, 0, 0);
      const err = Math.max(wp(p.b('-1 Ankle')).distanceTo(wp(p.feet[0])), wp(p.b('1 Ankle')).distanceTo(wp(p.feet[1])));
      if (err > 0.002 && Number.isNaN(firstFail)) firstFail = -z;
      if (Number.isNaN(firstFail)) maxErr = Math.max(maxErr, err);
    }
    console.log(`M3 pelvis drop ${drop.toFixed(2)} m (hip height ${(0.94 - drop).toFixed(2)}): both ankles hold their world targets within ${(maxErr * 1000).toFixed(3)} mm until the pelvis has advanced ${Number.isNaN(firstFail) ? '>0.80' : firstFail.toFixed(2)} m, then the rear leg runs out of reach`);
  }
  // knee direction for the turned-out rear leg
  p.character.position.z = 0; p.body.position.y = -0.2 / 0.75; p.world.updateWorldMatrix(true, true); p.rig.update(1, 0, 0);
  const hip = wp(p.b('-1 Hip')), knee = wp(p.b('-1 Knee')), ankle = wp(p.b('-1 Ankle'));
  const axis = ankle.clone().sub(hip).normalize();
  const bend = knee.clone().sub(hip); bend.addScaledVector(axis, -bend.dot(axis)).setY(0).normalize();
  const toeDir = new THREE.Vector3(0, 0, -1).applyQuaternion(wq(p.feet[0])).setY(0).normalize();
  console.log(`M3 rear leg, foot turned out 90°: knee points ${THREE.MathUtils.radToDeg(bend.angleTo(toeDir)).toFixed(0)}° away from the toes (pole vector is hard-coded forward)`);
  const toeBone = wp(p.b('-1 Toe')).sub(ankle).setY(0).normalize();
  console.log(`M3 rear boot follows requested yaw: boot axis is ${THREE.MathUtils.radToDeg(toeBone.angleTo(toeDir)).toFixed(1)}° from requested toe direction`);
}

// ---------- M4: geometry budget for stances and a lunge on this skeleton
{
  const thigh = 0.43, shin = 0.39, leg = thigh + shin, ANKLE = 0.15;
  for (const hip of [0.94, 0.86, 0.78, 0.70, 0.62, 0.54]) {
    const v = hip - ANKLE, reach = v < leg ? Math.sqrt(leg * leg - v * v) : 0;
    console.log(`M4 hip height ${hip.toFixed(2)} m → a planted ankle can sit up to ${reach.toFixed(2)} m from under the hip → widest symmetric stance ≈ ${(2 * reach).toFixed(2)} m`);
  }
}
