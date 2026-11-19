import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FINISHER, FINISHERS, selectFinisher, FinisherAction } from '../src/finisher.ts';
import type { ExecutionTarget } from '../src/finisher.ts';
import { createTrainer } from '../src/trainer.ts';
import { PlayerDefense, DEFENSE } from '../src/defense.ts';

const player = { x: 0, z: 0 };
const target: ExecutionTarget = { id: 'a', x: 0, z: -1.8, alive: true, health: 24, broken: true };
const plan = () => selectFinisher(player, [target], 'a', [])!;

test('finisher requires a living low-health broken opponent in reach and rejects overlapping pairs', () => {
  assert.ok(plan());
  for (const change of [{ health: 31 }, { health: 0 }, { alive: false }, { broken: false }, { z: -2.41 }, { z: -.3 }]) {
    assert.equal(selectFinisher(player, [{ ...target, ...change }], 'a', []), null);
  }
});

test('eligible focus wins, otherwise nearest safe target wins with stable ties', () => {
  const near = { ...target, id: 'b', x: 1.5, z: 0 };
  assert.equal(selectFinisher(player, [near, target], 'a', [])?.id, 'a');
  assert.equal(selectFinisher(player, [near, target], null, [])?.id, 'b');
  assert.equal(selectFinisher(player, [{ ...near, broken: false }, target], 'b', [])?.id, 'a');
});

test('finisher checks alignment path, contact gap, kick landing and nearby bodies before activation', () => {
  for (const obstacle of [
    { x: 0, z: -.3, halfX: .1, halfZ: .05 },
    { x: 0, z: -1.2, halfX: 1, halfZ: .05 },
    { x: 0, z: -2.6, halfX: 1, halfZ: .05 },
  ]) assert.equal(selectFinisher(player, [target], 'a', [obstacle], { only: 'rising' }), null);
  assert.equal(selectFinisher(player, [target, { ...target, id: 'body', x: .1, z: -.7, health: 100 }], 'a', []), null);
  const available = selectFinisher(player, [target], 'a', []);
  assert.ok(available, 'rejecting a blocked attempt must not consume or mutate eligibility');
});

test('finisher alignment is continuous and lethal event occurs once even across large time steps', () => {
  const action = new FinisherAction(); assert.equal(action.begin(plan()), true);
  assert.equal(action.begin(plan()), false);
  assert.deepEqual(action.positions()!.player, player);
  assert.ok(action.reservation.length);
  assert.equal(action.advance(.2, true).lethal, false);
  const aligned = action.positions()!.player;
  assert.ok(aligned.z < 0 && aligned.z > plan().player.z);
  const event = action.advance(.8, true);
  assert.equal(event.lethal, true); assert.equal(event.finished, false);
  assert.equal(action.advance(.1, false).cancelled, false, 'own lethal event must not invalidate the victim');
  assert.equal(action.advance(10, false).finished, true);
  assert.equal(action.advance(.1, false).lethal, false);
  assert.deepEqual(action.positions()!.victim, plan().victimEnd);
  action.reset(); assert.equal(action.active, false); assert.deepEqual(action.reservation, []);
});

test('invalid/dead source before lethal and player death cancel without a kill event', () => {
  const action = new FinisherAction(); action.begin(plan());
  assert.deepEqual(action.advance(.3, false), { lethal: false, finished: false, cancelled: true, events: [] });
  assert.equal(action.active, false);
  action.begin(plan()); action.advance(1, true);
  assert.equal(action.advance(.1, false, false).cancelled, true);
});

test('all five executions fit open space, keep body paths outside victim, and deliver each event once', () => {
  for (const definition of FINISHERS) {
    const selected = selectFinisher(player, [target], 'a', [], { only: definition.id });
    assert.ok(selected, definition.id);
    const action = new FinisherAction(); action.begin(selected);
    const events: string[] = [];
    for (let i = 0; i < 180; i++) {
      const result = action.advance(1 / 60, !action.lethalApplied);
      events.push(...result.events);
      const pos = action.positions()!;
      assert.ok(Math.hypot(pos.player.x - target.x, pos.player.z - target.z) >= .77, definition.id);
    }
    assert.deepEqual(events, definition.events.map(event => event.type), definition.id);
    assert.equal(action.lethalApplied, true); assert.equal(action.progress, 1);
  }
});

test('tight spaces select compact fallback while incompatible head/weapon executions are excluded', () => {
  const backWall = [{ x: 0, z: -2.6, halfX: 2, halfZ: .05 }];
  const compact = selectFinisher(player, [target], 'a', backWall);
  assert.equal(compact?.definition.id, 'disarm');
  const cap = { head: false, helmet: false, swordArm: false, weapon: false };
  for (const id of ['helmet', 'decapitation', 'disarm', 'sword-arm'] as const) {
    assert.equal(selectFinisher(player, [{ ...target, capabilities: cap }], 'a', [], { only: id }), null);
  }
  assert.equal(selectFinisher(player, [{ ...target, capabilities: cap }], 'a', [], { preferred: 'decapitation' })?.definition.id, 'rising');
  const sideWall = [{ x: .95, z: -2, halfX: .1, halfZ: 1 }];
  assert.equal(selectFinisher(player, [target], 'a', sideWall, { only: 'helmet' }), null);
  assert.ok(selectFinisher(player, [target], 'a', sideWall), 'failed surround path must fall back safely');
  assert.equal(selectFinisher(player, [{ ...target, capabilities: { ...cap, head: true, swordArm: true, weapon: true } }], 'a', [], { only: 'helmet' }), null);
  assert.equal(selectFinisher(player, [{ ...target, capabilities: { ...cap, head: true, helmet: true, swordArm: true } }], 'a', [], { only: 'disarm' }), null);
});

test('rotation offers all five without consuming selection on prompt polls; cancellation clears pending events', () => {
  for (let start = 0; start < 5; start++) {
    const options = { start };
    const first = selectFinisher(player, [target], 'a', [], options)!;
    assert.equal(first.definition.id, FINISHERS[start].id);
    assert.equal(selectFinisher(player, [target], 'a', [], options)!.definition.id, first.definition.id);
  }
  const action = new FinisherAction();
  action.begin(selectFinisher(player, [target], 'a', [], { only: 'sword-arm' })!);
  assert.deepEqual(action.advance(1, true).events, ['sever-arm']);
  assert.equal(action.advance(.1, false).cancelled, true);
  assert.deepEqual(action.advance(10, false).events, []);
  action.begin(plan()); assert.deepEqual(action.advance(3, true).events, ['lethal']);
});

test('finisher hold interrupts committed strikes; bystanders move but resume only with a fresh windup', () => {
  const scene = new THREE.Scene(), fighter = createTrainer(scene), camera = new THREE.PerspectiveCamera();
  const position = new THREE.Vector3();
  fighter.configure(true, 'normal', 0, position);
  for (let i = 0; i < 60; i++) fighter.update(1 / 60, i / 60, position, camera, [], () => false);
  assert.equal(fighter.committed, true);
  fighter.holdForFinisher(true); assert.equal(fighter.cueVisible, false);
  const before = fighter.root.position.clone();
  for (let i = 0; i < 80; i++) fighter.update(1 / 60, 1 + i / 60, position, camera, [], () => { assert.fail('held enemy struck'); }, false, { x: 3, z: -3 });
  assert.ok(fighter.root.position.distanceTo(before) > .1);
  assert.equal(fighter.committed, false); assert.equal(fighter.cueVisible, false);
  fighter.holdForFinisher(false);
  assert.ok(fighter.elapsed < -.6);
  for (let i = 0; i < 20; i++) fighter.update(1 / 60, 3 + i / 60, fighter.root.position.clone().add(new THREE.Vector3(0, 0, 1.95)), camera, [], () => { assert.fail('resumed stale contact'); });
  assert.ok(fighter.elapsed < 0); assert.equal(fighter.cueVisible, false);
});

test('execution kills once and reset clears execution hold and corpse state', () => {
  const scene = new THREE.Scene(), fighter = createTrainer(scene), position = new THREE.Vector3();
  fighter.configure(true, 'normal', 0, position);
  fighter.damage(76, false); fighter.breakGuard(); fighter.holdForFinisher(true);
  fighter.execute(); assert.equal(fighter.health, 0); assert.equal(fighter.alive, false);
  fighter.execute(); assert.equal(fighter.health, 0);
  fighter.holdForFinisher(false);
  fighter.update(.1, 3, position, new THREE.PerspectiveCamera(), [], () => { assert.fail('corpse attacked'); });
  assert.equal(fighter.cueVisible, false);
  fighter.configure(true, 'normal', 0, position);
  assert.equal(fighter.health, 100); assert.equal(fighter.availableToCommit, true);
});

test('inactivity heals living player slowly only to half; movement is not an activity flag', () => {
  const defense = new PlayerDefense(); defense.health = 20;
  defense.advance(DEFENSE.healDelay - .01); assert.equal(defense.health, 20);
  for (let i = 0; i < 600; i++) defense.advance(1 / 60);
  assert.equal(defense.health, 50);
  defense.health = 75; defense.advance(10); assert.equal(defense.health, 75);
  defense.health = 0; defense.mode = 'dead'; defense.advance(100); assert.equal(defense.health, 0);
});

test('attacks, held block, dodging and fresh damage interrupt the passive-heal delay', () => {
  for (const activity of ['attack', 'block', 'dodge', 'hit']) {
    const defense = new PlayerDefense(); defense.health = 30; defense.advance(3.5);
    if (activity === 'attack') defense.advance(.2, true);
    else if (activity === 'block') { defense.block(false, true, true); defense.advance(.2); defense.release(); }
    else if (activity === 'dodge') { defense.dodge({ x: 0, z: 1 }, true); defense.advance(.5); }
    else defense.receive('normal');
    const after = defense.health;
    defense.advance(.2); assert.equal(defense.health, after, activity);
  }
});
