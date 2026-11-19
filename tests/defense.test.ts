import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PlayerDefense } from '../src/defense.ts';

test('held block protects all-angle hits and heavier strikes cost more guard', () => {
  const player = new PlayerDefense(); player.block(false, true, true);
  assert.equal(player.receive('normal'), 'block'); assert.equal(player.guard, 76);
  assert.equal(player.receive('heavy'), 'block'); assert.equal(player.guard, 32);
  assert.equal(player.health, 100);
});

test('fresh parry restores guard; holding the button does not renew its window', () => {
  const player = new PlayerDefense(); player.guard = 50;
  player.block(true, true, true); player.advance(0.1); assert.equal(player.receive('heavy'), 'parry'); assert.equal(player.guard, 72);
  player.advance(0.4); player.block(false, true, true);
  assert.equal(player.receive('normal'), 'block'); assert.equal(player.guard, 48);
  player.block(true, true, true); player.advance(0.1); assert.equal(player.receive('normal'), 'parry');
});

test('unblockable attacks defeat both block and parry and cause knockdown', () => {
  const player = new PlayerDefense(); player.block(true, true, true);
  assert.equal(player.receive('unblockable'), 'hit');
  assert.equal(player.health, 70); assert.equal(player.mode, 'knockdown');
});

test('guard break stuns for one second and restores enough guard to recover', () => {
  const player = new PlayerDefense(); player.guard = 10; player.block(false, true, true);
  assert.equal(player.receive('heavy'), 'guard-break'); assert.equal(player.guard, 0);
  player.advance(0.9); assert.equal(player.mode, 'guard-break');
  player.advance(0.11); assert.equal(player.mode, 'free'); assert.equal(player.guard, 35);
  assert.equal(player.health, 100);
});

test('guard regenerates after inactivity but held block and attacks prevent it', () => {
  const player = new PlayerDefense(); player.guard = 30;
  player.block(false, true, true); player.advance(3); assert.equal(player.guard, 30);
  player.release(); player.advance(1); assert.equal(player.guard, 30);
  player.advance(0.2); assert.ok(player.guard > 30);
  const guard = player.guard; player.advance(2, true); assert.equal(player.guard, guard);
});

test('dodge has vulnerable startup and recovery; roll is a second press with its own gap', () => {
  const player = new PlayerDefense(); assert.equal(player.dodge({ x: 1, z: 0 }, true), true);
  assert.equal(player.evading, false); player.advance(0.15); assert.equal(player.evading, true);
  assert.equal(player.receive('unblockable'), 'evade');
  assert.equal(player.dodge({ x: 0, z: 1 }, false), true);
  assert.equal(player.mode, 'roll'); assert.deepEqual(player.dodgeDirection, { x: 1, z: 0 });
  assert.equal(player.evading, false); player.advance(0.1); assert.equal(player.evading, true);
  player.advance(0.25); assert.equal(player.evading, false);
  assert.equal(player.dodge({ x: 1, z: 0 }, true), false);
  player.advance(0.4); assert.equal(player.mode, 'free');
  assert.equal(player.dodge({ x: 1, z: 0 }, true), false);
});

test('dodge travel is bounded and cannot begin during an uncancellable attack', () => {
  const player = new PlayerDefense(); assert.equal(player.dodge({ x: 1, z: 0 }, false), false);
  player.dodge({ x: 3, z: 4 }, true);
  let x = 0, z = 0;
  for (let i = 0; i < 30; i++) {
    const step = player.travel(1 / 60); x += step.x; z += step.z; player.advance(1 / 60);
  }
  assert.ok(Math.abs(Math.hypot(x, z) - 1.35) < 1e-8);
});

test('damage interrupts with distinct reactions and protects against unavoidable hit chains', () => {
  const player = new PlayerDefense(); assert.equal(player.receive('normal'), 'hit'); assert.equal(player.mode, 'flinch');
  assert.equal(player.receive('heavy'), 'protected'); assert.equal(player.health, 85);
  player.advance(0.4); assert.equal(player.mode, 'free'); assert.equal(player.receive('normal'), 'protected');
  player.advance(0.2); assert.equal(player.receive('heavy'), 'hit'); assert.equal(player.mode, 'stagger');
});

test('a dead player stays dead until explicitly reset', () => {
  const player = new PlayerDefense(); player.health = 5; player.receive('normal');
  player.advance(100); assert.equal(player.mode, 'dead'); assert.equal(player.dodge({ x: 1, z: 0 }, true), false);
  player.reset(); assert.equal(player.health, 100); assert.equal(player.guard, 100); assert.equal(player.mode, 'free');
});
