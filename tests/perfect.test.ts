import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PerfectDefense } from '../src/perfect.ts';
import { PlayerDefense } from '../src/defense.ts';
import { SwordActions, RIPOSTE, attackDuration, sweptBladeHits } from '../src/combat.ts';
import { createTrainer } from '../src/trainer.ts';
import { createKnight } from '../src/knight.ts';

test('emphasis lasts half a real second and cannot be extended or stacked', () => {
  const perfect = new PerfectDefense(); perfect.trigger('attacker-a', 'parry');
  perfect.advanceGame(100); assert.equal(perfect.slow, true); assert.equal(perfect.ready, false);
  perfect.advanceReal(0.3); assert.equal(perfect.trigger('attacker-b', 'dodge'), false);
  assert.ok(Math.abs(perfect.slowLeft - 0.2) < 1e-8);
  perfect.advanceReal(0.2); assert.equal(perfect.slow, false); assert.equal(perfect.ready, true);
  assert.equal(perfect.source, 'attacker-a'); assert.equal(perfect.count, 1);
});

test('riposte opportunity starts after emphasis, belongs to its attacker, and is consumed once', () => {
  const perfect = new PerfectDefense(); perfect.trigger('attacker-a', 'dodge');
  assert.equal(perfect.consume(), null); perfect.advanceReal(0.5);
  perfect.advanceGame(0.4); assert.equal(perfect.consume(), 'attacker-a'); assert.equal(perfect.consume(), null);
  perfect.trigger('attacker-b', 'parry'); perfect.advanceReal(0.5); perfect.advanceGame(1);
  assert.equal(perfect.ready, false); assert.equal(perfect.source, null);
  perfect.trigger('attacker-c', 'dodge'); perfect.reset(); assert.equal(perfect.slow, false); assert.equal(perfect.ready, false);
});

test('cancelling the reward during emphasis does not revive it when slow motion ends', () => {
  const perfect = new PerfectDefense(); perfect.trigger('attacker', 'dodge');
  perfect.clearWindow(); perfect.advanceReal(0.5);
  assert.equal(perfect.ready, false); assert.equal(perfect.source, null);
});

test('perfect parry is narrower than normal parry and never defeats an unblockable', () => {
  const player = new PlayerDefense(); player.block(true, false, true); player.advance(0.04);
  assert.equal(player.receive('normal'), 'perfect-parry');
  player.reset(); player.block(true, false, true); player.advance(0.12);
  assert.equal(player.receive('heavy'), 'parry');
  player.reset(); player.block(true, true, true); assert.equal(player.receive('unblockable'), 'hit');
});

test('only the narrow initial-dodge timing qualifies; rolling forfeits the earned counter', () => {
  const player = new PlayerDefense(); player.dodge({ x: 1, z: 0 }, true); player.advance(0.09);
  assert.equal(player.receive('unblockable'), 'perfect-dodge');
  const perfect = new PerfectDefense(); perfect.trigger('trainer', 'dodge');
  player.advance(0.175); perfect.advanceReal(0.5); player.allowFollowupRoll();
  assert.equal(player.canRiposte, true);
  assert.equal(player.dodge({ x: 1, z: 0 }, true), true); perfect.clearWindow();
  assert.equal(player.mode, 'roll'); assert.equal(perfect.ready, false);
  player.advance(0.1); assert.equal(player.receive('normal'), 'evade');
});

test('the earned roll remains available during the reward window after the sidestep finishes', () => {
  const player = new PlayerDefense(); player.dodge({ x: -1, z: 0 }, true); player.advance(0.5);
  assert.equal(player.mode, 'free'); assert.equal(player.dodge({ x: 0, z: 1 }, true, true), true);
  assert.equal(player.mode, 'roll'); assert.deepEqual(player.dodgeDirection, { x: -1, z: 0 });
  assert.equal(player.evading, false);
});

test('the committed strike predicts a threatened original position without inventing a distant hit', () => {
  const trainer = createTrainer(new THREE.Scene()), player = new THREE.Vector3(), camera = new THREE.PerspectiveCamera();
  trainer.configure(true, 'normal', 0, player);
  for (let i = 0; i < 110; i++) trainer.update(1 / 60, i / 60, player, camera, [], () => false);
  const elapsed = trainer.elapsed;
  assert.equal(trainer.threatensSoon(new THREE.Vector3(0, 1.2, 0), 0.44), true);
  assert.equal(trainer.threatensSoon(new THREE.Vector3(5, 1.2, 0), 0.44), false);
  assert.equal(trainer.elapsed, elapsed);
});

test('a landed riposte breaks remaining defense and ordinary hits do not reset the break timer', () => {
  const trainer = createTrainer(new THREE.Scene()); trainer.configure(true, 'normal', 0, new THREE.Vector3());
  trainer.damage(RIPOSTE.damage, false); trainer.breakGuard();
  assert.equal(trainer.health, 68); assert.equal(trainer.guard, 0); assert.equal(trainer.stage, 'guard-break');
  const camera = new THREE.PerspectiveCamera(), player = new THREE.Vector3();
  trainer.update(0.7, 0.7, player, camera, [], () => false); trainer.damage(18, false);
  assert.equal(trainer.stage, 'guard-break');
  trainer.update(0.31, 1.01, player, camera, [], () => false);
  assert.equal(trainer.reaction, 'free'); assert.equal(trainer.guard, 35);
});

test('riposte is a distinct fast strike and respects real blade reach', () => {
  const actions = new SwordActions(); actions.request('riposte');
  assert.equal(actions.chain, 0); assert.ok(attackDuration(RIPOSTE) < 0.4);
  const knight = createKnight(); let near = false, far = false;
  knight.poseAttack(RIPOSTE, RIPOSTE.preparation, 1); let blade = knight.blade();
  for (let i = 1; i <= 30; i++) {
    knight.poseAttack(RIPOSTE, RIPOSTE.preparation + RIPOSTE.swing * i / 30, 1);
    const next = knight.blade();
    near ||= sweptBladeHits(blade, next, { x: 0, y: 1.2, z: -1.6 }, 0.44);
    far ||= sweptBladeHits(blade, next, { x: 0, y: 1.2, z: -5 }, 0.44); blade = next;
  }
  assert.equal(near, true); assert.equal(far, false);
});
