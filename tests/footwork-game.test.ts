import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createKnight } from '../src/knight.ts';
import { createFootwork } from '../src/footwork/controller.ts';
import { createPlayerFootwork } from '../src/footwork/game.ts';
import type { FootworkFrame } from '../src/footwork/game.ts';
import { TUNING, stanceById } from '../src/footwork/stances.ts';
import { DT, guardError, run } from './footwork-trace.ts';

// Rung 6: the pieces the ?footwork game hookup relies on.
TUNING.breath = 0;

test('a move can replace the one in progress, and a foot caught in the air comes down', () => {
  for (let at = 1; at <= 22; at++) {
    const fw = createFootwork({ stance: 'engarde' });
    fw.step(0, -1); run(fw, tick => tick >= at);
    const rear = 0, wasAirborne = !fw.state.feet[rear].planted;
    assert.equal(fw.request({ type: 'lunge', depth: 1 }, true), true);
    assert.equal(fw.state.move!.kind, 'lunge', `tick ${at}: the lunge starts at once`);
    const early = run(fw, tick => tick >= 8);
    if (wasAirborne) assert.ok(fw.state.feet[rear].planted, `tick ${at}: the rear foot has landed within 8 ticks`);
    const rest = run(fw, () => !fw.busy);
    for (const trace of [early, rest]) assert.ok(trace.finite && trace.maxMiss === 0 && trace.maxExtension <= 0.999, `tick ${at}: sound`);
    assert.equal(fw.state.pose, 'lunge');
    assert.ok(fw.state.feet[0].planted && fw.state.feet[1].planted);
  }
});

function harness() {
  const knight = createKnight();
  const player = createPlayerFootwork(knight);
  const frame: FootworkFrame = { x: 0, z: 0, yaw: 0, drive: false, blocking: false, attack: null };
  const tick = (ticks = 1) => { for (let i = 0; i < ticks; i++) { player.update(DT, frame); player.carry(true); knight.poseAttack(null, 0, 0); } };
  const pelvis = knight.rig.bones.find(bone => bone.name === 'Pelvis')!;
  return { knight, player, frame, tick, hips: () => pelvis.getWorldPosition(new THREE.Vector3()).y };
}

test('the game hookup takes the legs over when asked and hands them back', () => {
  const { knight, player, frame, tick, hips } = harness();
  tick(5);
  assert.equal(player.weight, 0);
  assert.ok(Math.abs(hips() - 0.94) < 0.02, 'built-in legs: standing height');
  assert.equal(knight.carrier.position.y, 0);
  frame.drive = true; tick(30);
  assert.ok(player.weight > 0.99);
  assert.ok(Math.abs(hips() - stanceById('engarde').hipHeight) < 0.01, `en garde hip height (${hips()})`);
  assert.ok(Math.abs(knight.carrier.position.y - (stanceById('engarde').hipHeight - 0.94)) < 0.01, 'upper body rides on the hips');
  frame.drive = false; tick(30);
  assert.equal(player.weight, 0);
  assert.ok(Math.abs(hips() - 0.94) < 0.02, 'handed back');
  frame.drive = true; tick(3); player.release(); knight.poseAttack(null, 0, 0);
  assert.equal(player.weight, 0); assert.equal(knight.carrier.position.y, 0);
});

test('the game hookup steps to follow the root at the pace it reports, without sliding planted feet', () => {
  const { player, frame, tick } = harness();
  frame.drive = true; tick(20);
  for (const [move, facingAlong] of [[{ x: 0, z: -1 }, true], [{ x: 1, z: 0 }, false]] as const) {
    const step = stanceById('engarde').step, pace = player.pace(false, move, 0);
    assert.ok(Math.abs(pace - (facingAlong ? step.length / step.duration : step.side / step.sideDuration)) < 1e-9);
    const fw = player.controller;
    let drift = 0; const anchor: ({ x: number; z: number } | null)[] = [null, null];
    for (let i = 0; i < 150; i++) {
      frame.x += move.x * pace * DT; frame.z += move.z * pace * DT; tick();
      fw.state.feet.forEach((foot, index) => {
        if (!foot.planted) { anchor[index] = null; return; }
        anchor[index] ??= { x: foot.x, z: foot.z };
        drift = Math.max(drift, Math.hypot(foot.x - anchor[index]!.x, foot.z - anchor[index]!.z));
      });
    }
    assert.ok(drift < 1e-9, `planted feet hold (${drift})`);
    tick(40);
    assert.ok(!fw.busy && guardError(fw).feet < 0.061, 'settles in guard when the body stops');
  }
  assert.ok(player.pace(true, { x: 0, z: -1 }, 0) < player.pace(false, { x: 0, z: -1 }, 0), 'the blocking guard is slower');
});

test('the game hookup lunges on the attack clock, recovers under the body, and snaps to guard on block', () => {
  const { knight, player, frame, tick, hips } = harness();
  const fw = player.controller;
  frame.drive = true; tick(20);
  const attack = { serial: 1, elapsed: 0, preparation: 0.2, swing: 0.2, recovery: 0.3, lunge: 0.42, lungeLeft: 0.42 };
  const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
  const rear = { ...fw.state.feet[0] };
  let lowest = 9, blade = 0;
  for (let i = 0; i < 24; i++) {
    attack.elapsed += DT;
    const progress = smooth((attack.elapsed - attack.preparation) / attack.swing);
    frame.z = -0.42 * progress; attack.lungeLeft = 0.42 * (1 - progress);
    frame.attack = attack;
    player.update(DT, frame);
    // Hit tests see the game's own sword height; the drawn pose rides on the hips.
    player.carry(false); knight.poseAttack(null, 0, 0); const tested = knight.blade().base.y;
    player.carry(true); knight.poseAttack(null, 0, 0); blade = Math.max(blade, tested - knight.blade().base.y);
    lowest = Math.min(lowest, hips());
    if (i === 3) assert.equal(fw.state.move!.name, 'Lunge');
  }
  assert.equal(fw.state.pose, 'lunge');
  assert.ok(Math.hypot(fw.state.feet[0].x - rear.x, fw.state.feet[0].z - rear.z) < 1e-9, 'rear foot stayed planted through the lunge');
  assert.ok(lowest < 0.68, `hips sank to ${lowest.toFixed(2)}`);
  assert.ok(blade > 0.15, 'the drawn sword rides lower than the tested one, which is left alone');
  // Recovery phase: both feet come back under the body, which gameplay leaves where the attack ended.
  for (let i = 0; i < 18; i++) { attack.elapsed += DT; tick(); }
  frame.attack = null; tick(4);
  assert.equal(fw.state.pose, 'guard');
  assert.ok(guardError(fw).planted && guardError(fw).feet < 0.02, 'back in guard around the new position');
  // A second attack, interrupted by blocking mid-swing.
  const second = { ...attack, serial: 2, elapsed: 0, lunge: 0, lungeLeft: 0 };
  frame.attack = second;
  for (let i = 0; i < 16; i++) { second.elapsed += DT; tick(); }
  assert.equal(fw.state.move!.name, 'Thrust step');
  frame.attack = null; frame.blocking = true; tick();
  assert.equal(fw.state.move!.kind, 'guard'); assert.equal(fw.state.stance, 'low');
  tick(Math.ceil(TUNING.guardTime / DT));
  const error = guardError(fw);
  assert.ok(error.planted && error.feet < 0.02 && error.hips < 0.012, `guard formed (${error.feet.toFixed(4)}, ${error.hips.toFixed(4)})`);
  assert.ok(Math.abs(hips() - stanceById('low').hipHeight) < 0.012);
  frame.blocking = false; tick(20);
  assert.equal(fw.state.stance, 'engarde');
});
