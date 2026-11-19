import { test } from 'node:test';
import assert from 'node:assert/strict';
import { movementVector, moveWithCollision, updateEngagement, sprintAllowed, stepLocomotion, MOVEMENT } from '../src/movement.ts';

test('movement accelerates, blends sprint speed, and brakes to a full stop', () => {
  const forward = { x: 0, z: -1 };
  let state = { speed: 0, yaw: 0, turnVelocity: 0 };
  state = stepLocomotion(state, forward, true, 1 / 60);
  assert.ok(state.speed > 0 && state.speed < 0.2);
  for (let i = 0; i < 90; i++) state = stepLocomotion(state, forward, true, 1 / 60);
  assert.equal(state.speed, MOVEMENT.sprintSpeed);
  state = stepLocomotion(state, forward, false, 1 / 60);
  assert.ok(state.speed > MOVEMENT.walkSpeed && state.speed < MOVEMENT.sprintSpeed);
  const previousSpeed = state.speed;
  state = stepLocomotion(state, { x: 0, z: 0 }, false, 1 / 60);
  assert.ok(state.speed > 0 && state.speed < previousSpeed);
  for (let i = 0; i < 60; i++) state = stepLocomotion(state, { x: 0, z: 0 }, false, 1 / 60);
  assert.equal(state.speed, 0);
});

test('steering changes the actual heading gradually and is slower at sprint speed', () => {
  const right = { x: 1, z: 0 };
  const walk = stepLocomotion({ speed: 4.2, yaw: 0, turnVelocity: 0 }, right, false, 0.25);
  const sprint = stepLocomotion({ speed: 7.2, yaw: 0, turnVelocity: 0 }, right, true, 0.25);
  assert.ok(Math.abs(sprint.yaw) < Math.abs(walk.yaw));
  assert.ok(Math.abs(sprint.yaw) <= 1.45 * 0.25 + 1e-9);
  assert.ok(Math.abs(walk.yaw) < Math.PI / 2);
});

test('diagonal movement is normalized and camera-relative', () => {
  const diagonal = movementVector(1, 1, 0);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1) < 1e-9);
  const rotated = movementVector(0, 1, Math.PI / 2);
  assert.ok(Math.abs(rotated.x + 1) < 1e-9);
  assert.ok(Math.abs(rotated.z) < 1e-9);
});

test('collision prevents tunneling through a thin wall while allowing sliding', () => {
  const walls = [{ x: 0, z: 0, halfX: 0.2, halfZ: 8 }];
  const end = moveWithCollision({ x: -2, z: 0 }, { x: 10, z: 3 }, walls);
  assert.ok(end.x <= -0.56);
  assert.ok(Math.abs(end.z - 3) < 1e-8);
});

test('engagement uses separate distances and releases sprint despite distant pursuit', () => {
  assert.equal(updateEngagement(false, 5), true);
  assert.equal(updateEngagement(true, 7), true);
  assert.equal(updateEngagement(false, 7), false);
  assert.equal(updateEngagement(true, 10), false);
  assert.equal(sprintAllowed(updateEngagement(true, 10)), true);
  assert.equal(updateEngagement(true, Infinity), false);
});
