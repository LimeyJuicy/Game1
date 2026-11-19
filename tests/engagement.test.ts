import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { faceTarget, stepStrafe } from '../src/movement.ts';
import { FollowCamera } from '../src/camera.ts';
import { createTrainer } from '../src/trainer.ts';
import { approachPath } from '../src/navigation.ts';

test('combat strafing moves laterally while facing stays on the opponent', () => {
  let velocity = { x: 0, z: 0 }, position = { x: 0, z: 0 }, yaw = 0;
  const target = { x: 0, z: -3 };
  for (let i = 0; i < 60; i++) {
    velocity = stepStrafe(velocity, { x: 1, z: 0 }, 4.2, 1 / 60);
    position.x += velocity.x / 60; position.z += velocity.z / 60;
    yaw = faceTarget(yaw, position, target, 1 / 60);
  }
  assert.ok(position.x > 3); assert.equal(position.z, 0);
  assert.ok(Math.abs(yaw - Math.atan2(position.x - target.x, position.z - target.z)) < 0.01);
});

test('lock-on camera orbits behind the engagement instead of retaining the exploration heading', () => {
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  const follow = new FollowCamera(camera, []), player = new THREE.Vector3(), target = new THREE.Vector3(3, 0, 0);
  for (let i = 0; i < 180; i++) follow.update(player, 0, false, true, 1 / 60, false, { distance: 0, speed: 0 }, target);
  assert.ok(Math.abs(follow.yaw + Math.PI / 2) < 0.02);
  assert.ok(camera.position.x < -6);
  camera.updateMatrixWorld();
  const projected = target.clone(); projected.y = 1; projected.project(camera);
  assert.ok(Math.abs(projected.x) < 0.2 && Math.abs(projected.y) < 1);
});

test('pursuit finds waypoints around an intervening wall', () => {
  const path = approachPath({ x: -5, z: 0 }, { x: 5, z: 0 }, [{ x: 0, z: 0, halfX: 0.5, halfZ: 5 }]);
  assert.ok(path.length > 2);
  assert.ok(path.some(point => Math.abs(point.z) > 5));
  assert.deepEqual(path.at(-1), { x: 5, z: 0 });
});

test('opponent approaches into range, and damaging hits interrupt it with stronger heavy reactions', () => {
  const trainer = createTrainer(new THREE.Scene()), player = new THREE.Vector3(), camera = new THREE.PerspectiveCamera();
  trainer.configure(true, 'normal', 0, player); player.z = 6;
  const starting = trainer.root.position.clone();
  for (let i = 0; i < 240; i++) trainer.update(1 / 60, i / 60, player, camera, [], () => false);
  assert.ok(trainer.root.position.z > starting.z + 4);
  assert.ok(trainer.root.position.distanceTo(player) < 2.1);
  trainer.damage(18, false); assert.equal(trainer.health, 82); assert.equal(trainer.reaction, 'flinch');
  trainer.update(0.1, 5, player, camera, [], () => { assert.fail('a staggered opponent cannot strike'); });
  assert.equal(trainer.cueVisible, false);
  trainer.damage(38, true); assert.equal(trainer.health, 44); assert.equal(trainer.reaction, 'stagger');
  trainer.damage(100, true); assert.equal(trainer.alive, false); assert.equal(trainer.stage, 'dead');
});
