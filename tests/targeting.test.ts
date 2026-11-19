import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CombatFocus, AttackCoordinator } from '../src/targeting.ts';
import { createTrainer } from '../src/trainer.ts';
import { FollowCamera } from '../src/camera.ts';

test('closest acquisition uses stable ties, retention, explicit attack intent, death and disengagement', () => {
  const focus = new CombatFocus(), player = { x: 0, z: 0 };
  const a = { id: 'a', x: 0, z: -2 }, b = { id: 'b', x: 2, z: 0 };
  assert.equal(focus.update(player, [b, a]), 'a');
  b.x = 1; assert.equal(focus.update(player, [b, a]), 'a');
  focus.attack('b'); assert.equal(focus.update(player, [a, b]), 'b');
  assert.equal(focus.update(player, [a]), 'a');
  a.z = -8; assert.equal(focus.update(player, [a]), 'a');
  a.z = -9; assert.equal(focus.update(player, [a]), null);
  a.z = -7; assert.equal(focus.update(player, [a]), null);
  a.z = -6; assert.equal(focus.update(player, [a]), 'a');
});

test('earliest red warning holds priority, then returns to the latest defended attacker', () => {
  const focus = new CombatFocus(), player = { x: 0, z: 0 };
  const a = { id: 'a', x: 0, z: -2, threatIn: 0.3 }, b = { id: 'b', x: 2, z: 0, threatIn: 0.2 };
  assert.equal(focus.update(player, [a, b]), 'b');
  a.threatIn = 0.1; assert.equal(focus.update(player, [a, b]), 'b');
  focus.defend('a'); assert.equal(focus.update(player, [a, b]), 'b');
  assert.equal(focus.update(player, [{ ...a, threatIn: undefined }, { ...b, threatIn: undefined }]), 'a');
  focus.reset(); assert.equal(focus.current, null);
});

test('coordinator rotates fairly, spaces commitments and isolates unblockables', () => {
  const coordinator = new AttackCoordinator();
  const candidates = ['a', 'b', 'c'].map(id => ({ id, ready: true, active: false, red: false }));
  assert.equal(coordinator.grant(0, candidates), 'a');
  assert.equal(coordinator.grant(0.5, candidates), null);
  assert.equal(coordinator.grant(0.73, candidates), 'b');
  assert.equal(coordinator.grant(1.46, candidates), 'c');
  candidates[0].red = true; candidates[0].active = true; candidates[0].ready = false;
  assert.equal(coordinator.grant(3, candidates), null);
  candidates[0].active = false; candidates[0].ready = true;
  candidates[1].active = true; candidates[1].ready = false; candidates[2].ready = false;
  assert.equal(coordinator.grant(3, candidates), null);
  coordinator.reset(); candidates[1].active = false;
  assert.equal(coordinator.grant(0, candidates), 'a');
});

test('attack intent waits behind an urgent warning, then becomes focus when that warning ends', () => {
  const focus = new CombatFocus(), player = { x: 0, z: 0 };
  const red = { id: 'red', x: 0, z: -2, threatIn: 0.3 }, other = { id: 'other', x: 2, z: 0 };
  focus.update(player, [red, other]); focus.attack('other');
  assert.equal(focus.current, 'red'); assert.equal(focus.update(player, [red, other]), 'red');
  assert.equal(focus.update(player, [{ ...red, threatIn: undefined }, other]), 'other');
});

test('three real opponents start separate attacks, preserve warnings and all get turns', () => {
  const scene = new THREE.Scene(), player = new THREE.Vector3(), camera = new THREE.PerspectiveCamera();
  const opponents = [0, 100, -100].map((bearing, i) => {
    const fighter = createTrainer(scene); fighter.configure(true, i === 2 ? 'unblockable' : 'normal', bearing, player);
    return { id: String(i), fighter };
  });
  const coordinator = new AttackCoordinator(), starts: { id: string; time: number }[] = [], warned = new Set<string>();
  for (let frame = 0; frame < 480; frame++) {
    const time = frame / 60;
    const grant = coordinator.grant(time, opponents.map(({ id, fighter }) => ({ id, ready: fighter.readyToAttack, active: fighter.committed, red: fighter.kind === 'unblockable' })));
    for (const { id, fighter } of opponents) {
      const before = fighter.elapsed;
      fighter.update(1 / 60, time, player, camera, opponents.filter(other => other.id !== id).map(other => other.fighter.obstacle), () => false, grant === id);
      if (before < 0 && fighter.elapsed >= 0) starts.push({ id, time });
      if (fighter.cueVisible) warned.add(id);
    }
    const active = opponents.filter(({ fighter }) => fighter.committed);
    assert.ok(active.length <= 2);
    if (active.some(({ fighter }) => fighter.kind === 'unblockable')) assert.equal(active.length, 1);
  }
  assert.equal(new Set(starts.map(start => start.id)).size, 3); assert.equal(warned.size, 3);
  for (let i = 1; i < starts.length; i++) assert.ok(starts[i].time - starts[i - 1].time >= 0.71);
});

test('group framing pulls back smoothly, keeps a low angle and returns after disengagement', () => {
  const camera = new THREE.PerspectiveCamera(55, 1.5, 0.1, 100), follow = new FollowCamera(camera, []);
  const player = new THREE.Vector3(), focus = new THREE.Vector3(0, 0, -2);
  follow.update(player, 0, false, true, 1 / 60, true, { distance: 0, speed: 0 }, focus);
  const before = camera.position.clone();
  const group = [focus, new THREE.Vector3(-3, 0, 1), new THREE.Vector3(3, 0, 1)];
  follow.update(player, 0, false, true, 1 / 60, false, { distance: 0, speed: 0 }, focus, group);
  assert.ok(camera.position.distanceTo(before) < 0.2);
  for (let i = 0; i < 180; i++) follow.update(player, 0, false, true, 1 / 60, false, { distance: 0, speed: 0 }, focus, group);
  assert.ok(camera.position.z > before.z + 2); assert.ok(camera.position.y < 4.6);
  for (let i = 0; i < 180; i++) follow.update(player, 0, false, false, 1 / 60);
  assert.ok(Math.abs(camera.position.z - 7.2) < 0.02);
});
