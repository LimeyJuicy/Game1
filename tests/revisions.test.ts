import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LooseSurround, ImpactFreeze, wantsRetreat, GROUP_SPAWNS } from '../src/encounter.ts';
import { RiposteDash } from '../src/riposte.ts';
import { PerfectDefense } from '../src/perfect.ts';
import { createTrainer } from '../src/trainer.ts';

test('loose surrounding spreads a clustered approach with unequal radii and stable individual goals', () => {
  const director = new LooseSurround(), player = { x: 0, z: 0 };
  const peers = [{ x: 0, z: -3 }, { x: 0.4, z: -3 }, { x: -0.4, z: -3 }];
  const goals = peers.map((self, i) => director.goal(String(i), i, 0, player, self, peers.filter(peer => peer !== self), []));
  assert.ok(goals.some(goal => Math.abs(goal.x) > 1.8));
  assert.ok(Math.max(...goals.map(goal => Math.hypot(goal.x, goal.z))) - Math.min(...goals.map(goal => Math.hypot(goal.x, goal.z))) > 0.2);
  assert.deepEqual(director.goal('0', 0, 1, player, peers[0], peers.slice(1), []), goals[0]);
  assert.equal(new Set(GROUP_SPAWNS.map(spawn => spawn.distance)).size, 3);
  director.reset();
});

test('surround goals yield safely when no position around the player is navigable', () => {
  const director = new LooseSurround(), self = { x: 5, z: 0 };
  const goal = director.goal('enemy', 0, 0, { x: 0, z: 0 }, self, [], [{ x: 0, z: 0, halfX: 4, halfZ: 4 }]);
  assert.deepEqual(goal, self);
});

test('bystanders probe from outside a reserved execution space rather than its occupied player anchor', () => {
  const director = new LooseSurround(), player = { x: 0, z: 0 }, self = { x: 3.5, z: 1.5 };
  const reserved = [{ x: 0, z: -.5, halfX: .6, halfZ: 1.6 }];
  const goal = director.goal('bystander', 1, 0, player, self, [], reserved, self);
  assert.ok(Math.hypot(goal.x - self.x, goal.z - self.z) > .1);
  assert.ok(goal.x > 1, 'goal must stay outside the reserved pair');
});

test('retreat requires Shift and travel away, rather than proximity disengagement first', () => {
  const player = { x: 0, z: 0 }, enemy = { x: 0, z: -2 };
  assert.equal(wantsRetreat(player, enemy, { x: 0, z: 1 }, true), true);
  assert.equal(wantsRetreat(player, enemy, { x: 0, z: -1 }, true), false);
  assert.equal(wantsRetreat(player, enemy, { x: 1, z: 0 }, true), false);
  assert.equal(wantsRetreat(player, enemy, { x: 0, z: 1 }, false), false);
  assert.equal(wantsRetreat(player, null, { x: 0, z: 1 }, true), false);
});

test('impact freeze holds reward time, cannot stack, and returns only the unpaused real-time remainder', () => {
  const impact = new ImpactFreeze(), perfect = new PerfectDefense(); perfect.trigger('source', 'parry'); perfect.advanceReal(0.5);
  assert.equal(impact.trigger(), true); assert.equal(impact.trigger(), false);
  perfect.advanceGame(impact.advanceReal(0.03)); assert.equal(perfect.windowLeft, 0.95);
  const remainder = impact.advanceReal(0.07); assert.ok(Math.abs(remainder - 0.02) < 1e-8);
  perfect.advanceGame(remainder); assert.ok(Math.abs(perfect.windowLeft - 0.93) < 1e-8);
  assert.equal(impact.active, false); assert.equal(impact.count, 1); impact.reset(); assert.equal(impact.count, 0);
});

test('a distant earned counter dashes to contact without the old lunge/range cap', () => {
  const dash = new RiposteDash(), target = { x: 0, z: -7 };
  let player = { x: 0, z: 0 }; assert.equal(dash.begin('enemy', player, target, []), true);
  for (let i = 0; i < 90 && dash.active; i++) player = dash.step(player, 1 / 60, []);
  assert.equal(dash.active, false); assert.equal(dash.source, 'enemy');
  assert.ok(Math.abs(Math.hypot(player.x - target.x, player.z - target.z) - 1.4) < 0.02);
});

test('dashing counter routes around walls and other bodies rather than crossing them', () => {
  const dash = new RiposteDash(), target = { x: 5, z: 0 };
  const obstacles = [{ x: 0, z: 0, halfX: 0.5, halfZ: 3 }, { x: 3.6, z: 0, halfX: 0.4, halfZ: 0.4 }];
  let player = { x: -5, z: 0 }, wentAround = false;
  assert.equal(dash.begin('source', player, target, obstacles), true);
  for (let i = 0; i < 180 && dash.active; i++) {
    player = dash.step(player, 1 / 60, obstacles); wentAround ||= Math.abs(player.z) > 3.3;
    assert.ok(!(Math.abs(player.x) < 0.84 && Math.abs(player.z) < 3.34));
  }
  assert.equal(dash.active, false); assert.equal(wentAround, true);
  assert.ok(Math.abs(Math.hypot(player.x - target.x, player.z - target.z) - 1.4) < 0.02);
});

test('a blocked route is rejected before consuming an earned opportunity', () => {
  const dash = new RiposteDash(), perfect = new PerfectDefense(); perfect.trigger('enemy', 'dodge'); perfect.advanceReal(0.5);
  const possible = dash.begin('enemy', { x: -5, z: 0 }, { x: 0, z: 0 }, [{ x: 0, z: 0, halfX: 2, halfZ: 2 }]);
  assert.equal(possible, false); assert.equal(perfect.ready, true); assert.equal(dash.active, false);
});

test('adaptive fighters choose independent types and executions; counter reservation holds the source', () => {
  const scene = new THREE.Scene(), player = new THREE.Vector3(), camera = new THREE.PerspectiveCamera();
  const actors = [0, 1, 2].map(profile => { const fighter = createTrainer(scene); fighter.configure(true, 'adaptive', profile * 110, player, profile); return fighter; });
  assert.equal(new Set(actors.map(actor => actor.kind)).size, 3);
  const names = new Set<string>();
  for (let i = 0; i < 900; i++) for (const actor of actors) { actor.update(1 / 60, i / 60, player, camera, [], () => false); names.add(actor.attackName); }
  assert.ok(names.size >= 4);
  const source = actors[0], before = source.root.position.clone(); source.holdForCounter(true);
  source.update(0.1, 16, new THREE.Vector3(10, 0, 0), camera, [], () => { assert.fail('reserved source cannot attack'); });
  assert.deepEqual(source.root.position, before); assert.equal(source.cueVisible, false);
  source.holdForCounter(false); assert.equal(source.heldForCounter, false);
});
