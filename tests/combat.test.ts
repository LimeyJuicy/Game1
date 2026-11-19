import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SwordActions, LIGHTS, HEAVIES, attackDuration, sweptBladeHits, lungeBudget, swingProgress } from '../src/combat.ts';
import { createKnight } from '../src/knight.ts';

test('one request performs one strike; early mashing does not queue a chain', () => {
  const actions = new SwordActions();
  assert.equal(actions.request('light'), true);
  for (let i = 0; i < 20; i++) actions.request('light');
  actions.advance(attackDuration(LIGHTS[0]));
  assert.equal(actions.current, null);
  assert.equal(actions.serial, 1);
});

test('late input buffers only one successor and the chain ends after three cuts', () => {
  const actions = new SwordActions(); actions.request('light');
  for (let chain = 1; chain <= 3; chain++) {
    actions.advance(attackDuration(actions.current!) - 0.1);
    assert.equal(actions.chain, chain);
    for (let i = 0; i < 10; i++) actions.request('light');
    actions.advance(0.1);
  }
  assert.equal(actions.current, null);
  assert.equal(actions.serial, 3);
  actions.request('light');
  assert.equal(actions.chain, 1);
});

test('heavy attacks require recovery, end the light chain, and rotate variants', () => {
  const actions = new SwordActions(); actions.request('light');
  assert.equal(actions.request('heavy'), false);
  assert.equal(actions.current?.kind, 'light');
  actions.advance(attackDuration(LIGHTS[0]));
  for (const heavy of HEAVIES) {
    assert.equal(actions.request('heavy'), true);
    assert.equal(actions.current, heavy);
    assert.equal(actions.chain, 0);
    actions.advance(attackDuration(heavy));
  }
  actions.request('light'); assert.equal(actions.chain, 1);
});

test('defense cancellation is allowed in preparation and late recovery, never during swing', () => {
  const actions = new SwordActions(); actions.request('light');
  assert.equal(actions.canDefend, true);
  actions.advance(LIGHTS[0].preparation + 0.02);
  assert.equal(actions.phase, 'swing');
  assert.equal(actions.cancel(), false);
  actions.advance(LIGHTS[0].swing + 0.01);
  assert.equal(actions.phase, 'recovery');
  assert.equal(actions.canDefend, false);
  actions.advance(0.15);
  assert.equal(actions.cancel(), true);
  assert.equal(actions.current, null);
});

test('expired combo timing and clearing a buffer do not produce phantom swings', () => {
  const actions = new SwordActions(); actions.request('light');
  actions.advance(attackDuration(LIGHTS[0]) - 0.1);
  actions.request('light'); actions.clearBuffer(); actions.advance(0.1);
  assert.equal(actions.current, null);
  actions.advance(0.4); actions.request('light'); assert.equal(actions.chain, 1);
});

test('blade sweep catches a target between frames and rejects distant targets', () => {
  const from = { base: { x: -1, y: 1, z: 0 }, tip: { x: -1, y: 1, z: -2 } };
  const to = { base: { x: 1, y: 1, z: 0 }, tip: { x: 1, y: 1, z: -2 } };
  assert.equal(sweptBladeHits(from, to, { x: 0, y: 1, z: -1 }, 0.1), true);
  assert.equal(sweptBladeHits(from, to, { x: 0, y: 1, z: -5 }, 0.5), false);
});

test('all six placeholder sword cuts physically cross a target in reach at varied sample rates', () => {
  const knight = createKnight();
  for (const definition of [...LIGHTS, ...HEAVIES]) {
    for (const rate of [30, 60, 120]) {
      const begin = definition.preparation;
      const end = begin + definition.swing;
      knight.poseAttack(definition, begin, rate);
      let blade = knight.blade(); let hit = false;
      for (let time = begin + 1 / rate; time < end + 1 / rate; time += 1 / rate) {
        knight.poseAttack(definition, Math.min(end, time), rate);
        const next = knight.blade();
        hit ||= sweptBladeHits(blade, next, { x: 0, y: 1.2, z: -1.6 }, 0.55);
        blade = next;
      }
      assert.ok(hit, `${definition.name} should connect at ${rate} Hz`);
    }
  }
});

test('lunge is absent without a target, small at range, and stops short when close', () => {
  assert.equal(lungeBudget({ x: 0, z: 0 }, null), 0);
  assert.equal(lungeBudget({ x: 0, z: 0 }, { x: 0, z: -3 }), 0.42);
  assert.equal(lungeBudget({ x: 0, z: 0 }, { x: 0, z: -1 }), 0);
});

test('every cut starts behind the knight and travels through a broad forward arc', () => {
  const knight = createKnight();
  for (const definition of [...LIGHTS, ...HEAVIES]) {
    const direction = () => {
      const { base, tip } = knight.blade();
      const length = Math.hypot(tip.x - base.x, tip.y - base.y, tip.z - base.z);
      return { x: (tip.x - base.x) / length, y: (tip.y - base.y) / length, z: (tip.z - base.z) / length };
    };
    knight.poseAttack(definition, definition.preparation, 100);
    assert.ok(knight.blade().tip.z > 0, `${definition.name}: windup must place the tip behind the knight`);
    let previous = direction(), swept = 0;
    for (let i = 1; i <= 100; i++) {
      knight.poseAttack(definition, definition.preparation + definition.swing * i / 100, 100);
      const current = direction();
      swept += Math.acos(Math.max(-1, Math.min(1, previous.x * current.x + previous.y * current.y + previous.z * current.z)));
      previous = current;
    }
    const degrees = swept * 180 / Math.PI;
    assert.ok(degrees >= 130 && degrees <= 185, `${definition.name}: measured ${degrees.toFixed(1)} degree arc`);
  }
});

test('the cut loads slowly then accelerates without extending the existing attack timings', () => {
  assert.ok(swingProgress(0.25) < 0.08);
  assert.ok(swingProgress(0.75) - swingProgress(0.5) > 2 * (swingProgress(0.25) - swingProgress(0)));
  const durations = [...LIGHTS, ...HEAVIES].map(definition => Number(attackDuration(definition).toFixed(2)));
  assert.deepEqual(durations, [0.64, 0.64, 0.89, 1.17, 1.17, 1.17]);
});

test('the entire character blends continuously across entry, attack phases, recovery and chains', () => {
  const knight = createKnight();
  const snapshot = () => {
    const result: number[] = [];
    knight.root.traverse(object => result.push(...object.matrixWorld.elements));
    return result;
  };
  const close = (a: number[], b: number[], label: string) => {
    const error = Math.max(...a.map((value, i) => Math.abs(value - b[i])));
    assert.ok(error < 0.001, `${label}: discontinuity ${error}`);
  };
  let serial = 1;
  for (const definition of [...LIGHTS, ...HEAVIES]) {
    knight.animate(0, 0, 1, 1 / 60);
    knight.poseAttack(null, 0, 0);
    const neutral = snapshot();
    knight.poseAttack(definition, 0, serial);
    close(neutral, snapshot(), `${definition.name} entry`);
    for (const boundary of [definition.preparation, definition.preparation + definition.swing]) {
      knight.poseAttack(definition, boundary - 0.000001, serial);
      const before = snapshot();
      knight.poseAttack(definition, boundary + 0.000001, serial);
      close(before, snapshot(), `${definition.name} phase boundary`);
    }
    knight.poseAttack(definition, attackDuration(definition), serial);
    const finished = snapshot();
    knight.poseAttack(null, 0, serial);
    close(finished, snapshot(), `${definition.name} return to idle`);
    // A chained strike starts from the actual current follow-through pose.
    knight.poseAttack(definition, definition.preparation + definition.swing, serial);
    const followThrough = snapshot();
    knight.poseAttack(LIGHTS[1], 0, ++serial);
    close(followThrough, snapshot(), 'chained entry');
    serial++;
  }
});
