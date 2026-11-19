import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createTrainer } from '../src/trainer.ts';
import { LIGHTS, HEAVIES, RIPOSTE } from '../src/combat.ts';

function fixture() {
  const trainer = createTrainer(new THREE.Scene()), player = new THREE.Vector3(), camera = new THREE.PerspectiveCamera();
  trainer.configure(true, 'normal', 0, player);
  let time = 0;
  const advance = (seconds: number) => {
    for (let remaining = seconds; remaining > 1e-8; remaining -= 1 / 120) {
      const dt = Math.min(remaining, 1 / 120); time += dt;
      trainer.update(dt, time, player, camera, [], () => false);
    }
  };
  return { trainer, player, advance };
}

test('ready enemies block health damage; heavy and chain-ending cuts exert more pressure', () => {
  const { trainer } = fixture();
  assert.equal(trainer.guarding, true);
  assert.equal(trainer.receiveAttack(LIGHTS[0]), 'block');
  assert.equal(trainer.health, 100); assert.equal(trainer.guard, 76);
  assert.equal(trainer.receiveAttack(LIGHTS[2]), 'block'); assert.equal(trainer.guard, 44);
  assert.equal(trainer.receiveAttack(HEAVIES[0]), 'guard-break');
  assert.equal(trainer.health, 100); assert.equal(trainer.guard, 0); assert.equal(trainer.guarding, false);
});

test('guard pressure opens a fixed punishment window and restores partial defense afterward', () => {
  const { trainer, advance } = fixture();
  trainer.receiveAttack(HEAVIES[0]); trainer.receiveAttack(HEAVIES[0]); trainer.receiveAttack(LIGHTS[0]);
  advance(0.6); assert.equal(trainer.receiveAttack(LIGHTS[0]), 'hit');
  assert.equal(trainer.health, 82); assert.equal(trainer.guard, 0);
  advance(0.41); assert.equal(trainer.reaction, 'free'); assert.equal(trainer.guard, 35);
  assert.equal(trainer.guarding, true);
  assert.equal(trainer.receiveAttack(LIGHTS[0]), 'block'); assert.equal(trainer.health, 82);
});

test('blocking does not reset attack windup; committed attacks and recovery can be punished', () => {
  const { trainer, advance } = fixture();
  advance(1.2); assert.equal(trainer.guarding, true);
  const before = trainer.elapsed; trainer.receiveAttack(LIGHTS[0]); assert.equal(trainer.elapsed, before);
  advance(0.4); assert.equal(trainer.guarding, false);
  assert.equal(trainer.receiveAttack(HEAVIES[0]), 'hit');
  assert.equal(trainer.health, 62); assert.equal(trainer.reaction, 'stagger');
  const other = fixture(); other.advance(2.05);
  assert.equal(other.trainer.stage, 'recovery'); assert.equal(other.trainer.receiveAttack(LIGHTS[0]), 'hit');
});

test('riposte defeats an active guard; death and drill reset do not retain guard state', () => {
  const { trainer } = fixture();
  assert.equal(trainer.receiveAttack(RIPOSTE), 'hit');
  assert.equal(trainer.health, 68); assert.equal(trainer.guard, 0); assert.equal(trainer.stage, 'guard-break');
  trainer.receiveAttack({ ...HEAVIES[0], damage: 100 });
  assert.equal(trainer.stage, 'dead'); assert.equal(trainer.receiveAttack(LIGHTS[0]), 'ignored');
  trainer.configure(true, 'normal', 0, new THREE.Vector3());
  assert.equal(trainer.health, 100); assert.equal(trainer.guard, 100); assert.equal(trainer.guarding, true);
});

test('defense recovers during a prolonged pursuit lull, but not under continuous pressure', () => {
  const { trainer, player, advance } = fixture();
  trainer.receiveAttack(HEAVIES[0]); player.z = 18; advance(2.4);
  assert.ok(trainer.guard > 56); assert.ok(trainer.guard < 100);
  const guard = trainer.guard; trainer.receiveAttack(LIGHTS[0]); advance(0.4);
  assert.equal(trainer.guard, guard - 24);
});
