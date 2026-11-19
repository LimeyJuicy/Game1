import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createKnight } from '../src/knight.ts';
import { createTrainer } from '../src/trainer.ts';
import { PlayerDefense } from '../src/defense.ts';
import { sweptBladeHits } from '../src/combat.ts';

const timing = { preparation: 0.9, swing: 0.24, recovery: 0.75 };
test('only the animated boot delivers the short-range forward kick; the guarded sword stays out of the swing', () => {
  const knight = createKnight(); knight.poseKick(timing, 0.9, 1);
  let previous = knight.kickContact(), near = false, far = false, side = false;
  const swordStart = knight.blade().tip;
  for (let i = 1; i <= 30; i++) {
    knight.poseKick(timing, 0.9 + 0.24 * i / 30, 1); const next = knight.kickContact();
    near ||= sweptBladeHits(previous, next, { x: 0, y: 1.2, z: -1.12 }, 0.44);
    far ||= sweptBladeHits(previous, next, { x: 0, y: 1.2, z: -1.95 }, 0.44);
    side ||= sweptBladeHits(previous, next, { x: 1.2, y: 1.2, z: 0 }, 0.44);
    previous = next;
  }
  assert.equal(near, true); assert.equal(far, false); assert.equal(side, false);
  assert.ok(new THREE.Vector3().copy(swordStart).distanceTo(new THREE.Vector3().copy(knight.blade().tip)) < 0.2);
});

test('kick preparation, extension and retraction blend continuously at phase boundaries', () => {
  const knight = createKnight();
  const original = knight.kickContact(); knight.poseKick(timing, 0, 5);
  assert.deepEqual(knight.kickContact(), original);
  for (const time of [0.9, 1.14, 1.89]) {
    knight.poseKick(timing, time - 1e-5, 5); const before = knight.kickContact();
    knight.poseKick(timing, time + 1e-5, 5); const after = knight.kickContact();
    assert.ok(new THREE.Vector3().copy(before.tip).distanceTo(new THREE.Vector3().copy(after.tip)) < 0.002);
  }
});

test('a real opponent closes to kick range, warns red, hits once and never tracks late', () => {
  const fighter = createTrainer(new THREE.Scene()), player = new THREE.Vector3(), camera = new THREE.PerspectiveCamera();
  fighter.configure(true, 'unblockable', 0, player);
  let cue = false, hits = 0, hitsMovedTarget = false, yaw: number | null = null;
  for (let i = 0; i < 300; i++) {
    fighter.update(1 / 120, i / 120, player, camera, [], (_, before, after) => {
      hitsMovedTarget ||= player.x > 0 && sweptBladeHits(before, after, { x: player.x, y: 1.2, z: player.z }, 0.44);
      if (!sweptBladeHits(before, after, { x: 0, y: 1.2, z: 0 }, 0.44)) return false;
      hits++; return 'hit';
    });
    cue ||= fighter.cueVisible;
    if (fighter.elapsed > 0.68 && fighter.elapsed < 1.14) {
      if (yaw === null) { yaw = fighter.root.rotation.y; player.x = 0.8; }
      assert.equal(fighter.root.rotation.y, yaw);
    }
  }
  assert.equal(fighter.delivery, 'kick'); assert.equal(fighter.attackName, 'Front push kick');
  assert.equal(cue, true); assert.equal(hits, 1); assert.equal(hitsMovedTarget, false);
  assert.ok(fighter.root.position.distanceTo(new THREE.Vector3()) < 1.3);
});

test('kick defeats held block and timed parry, shoves into a stagger, and remains perfectly dodgeable', () => {
  const defense = new PlayerDefense(); defense.block(true, true, true);
  assert.equal(defense.receive('unblockable', 'kick'), 'hit'); assert.equal(defense.mode, 'stagger');
  assert.equal(defense.health, 70); assert.equal(defense.guard, 100);
  defense.knockBackFrom({ x: 0, z: -1 }, { x: 0, z: 0 });
  let travel = 0;
  for (let i = 0; i < 24; i++) { travel += defense.travel(1 / 120).z; defense.advance(1 / 120); }
  assert.ok(Math.abs(travel - 0.65) < 0.001);
  defense.reset(); defense.dodge({ x: 1, z: 0 }, true); defense.advance(0.09);
  assert.equal(defense.receive('unblockable', 'kick'), 'perfect-dodge'); assert.equal(defense.health, 100);
});
