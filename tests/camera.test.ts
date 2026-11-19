import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FollowCamera } from '../src/camera.ts';

test('exploration camera is low third person and follows travel heading', () => {
  const camera = new THREE.PerspectiveCamera();
  const follow = new FollowCamera(camera, []);
  const player = new THREE.Vector3();
  follow.update(player, 0, false, false, 0, true);
  assert.ok((camera.position.y - 1.1) / Math.hypot(camera.position.x, camera.position.z) < 0.4);
  for (let i = 0; i < 120; i++) follow.update(player, -Math.PI / 2, true, false, 1 / 60);
  assert.ok(Math.abs(follow.yaw + Math.PI / 2) < 0.02);
  assert.ok(camera.position.x < -7);
});

test('a wall behind the knight makes the camera orbit without collapsing its distance', () => {
  const camera = new THREE.PerspectiveCamera();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(20, 4, 1), new THREE.MeshBasicMaterial());
  wall.position.set(0, 2, 0.9);
  const follow = new FollowCamera(camera, [wall]);
  const player = new THREE.Vector3();
  for (let i = 0; i < 180; i++) {
    follow.update(player, 0, false, false, 1 / 60);
    assert.ok(camera.position.distanceTo(new THREE.Vector3(0, 1.1, 0)) > 7);
  }
  assert.ok(Math.abs(follow.yaw) > 1.3);
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 1.1, 0), camera.position.clone().sub(new THREE.Vector3(0, 1.1, 0)).normalize(), 0, 7.6);
  assert.equal(ray.intersectObject(wall).length, 0);
});

test('confined-space fallback fades blocking scenery independently', () => {
  const camera = new THREE.PerspectiveCamera();
  const shared = new THREE.MeshBasicMaterial();
  const cage = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 2), shared);
  cage.material.side = THREE.DoubleSide;
  const distant = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), shared);
  distant.position.set(30, 0, 0);
  const follow = new FollowCamera(camera, [cage, distant]);
  follow.update(new THREE.Vector3(), 0, false, false, 0, true);
  assert.ok(cage.material.opacity < 0.2);
  assert.equal(distant.material.opacity, 1);
  assert.ok(camera.position.length() > 7);
});

test('footstep camera motion is subtle and fades away when stationary', () => {
  const camera = new THREE.PerspectiveCamera();
  const follow = new FollowCamera(camera, []);
  const player = new THREE.Vector3();
  follow.update(player, 0, false, false, 0, true);
  const resting = camera.position.clone();
  for (let i = 0; i < 60; i++) {
    follow.update(player, 0, true, false, 1 / 60, false, { distance: i * 0.12, speed: 7.2 });
    assert.ok(camera.position.distanceTo(resting) < 0.03);
  }
  for (let i = 0; i < 120; i++) follow.update(player, 0, false, false, 1 / 60, false, { distance: 7.08, speed: 0 });
  assert.ok(camera.position.distanceTo(resting) < 1e-6);
});

test('finisher camera moves continuously closer and returns without a cut', () => {
  const camera = new THREE.PerspectiveCamera(), follow = new FollowCamera(camera, []);
  const player = new THREE.Vector3(), victim = new THREE.Vector3(0, 0, -1.2);
  follow.update(player, 0, false, true, 0, true, { distance: 0, speed: 0 }, victim);
  const original = camera.position.clone(); let previous = original.clone();
  for (let i = 0; i < 120; i++) {
    follow.update(player, 0, false, true, 1 / 60, false, { distance: 0, speed: 0 }, victim, [], 1);
    assert.ok(camera.position.distanceTo(previous) < .2); previous.copy(camera.position);
  }
  assert.ok(camera.position.distanceTo(player) < original.distanceTo(player) - 1);
  for (let i = 0; i < 180; i++) {
    follow.update(player, 0, false, true, 1 / 60, false, { distance: 0, speed: 0 }, victim, [], 0);
    assert.ok(camera.position.distanceTo(previous) < .2); previous.copy(camera.position);
  }
  assert.ok(camera.position.distanceTo(original) < .05);
});
