import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFootwork } from '../src/footwork/controller.ts';
import type { Footwork, FootworkEvent } from '../src/footwork/controller.ts';
import { STANCES, TUNING } from '../src/footwork/stances.ts';
import { DT, guardError, run } from './footwork-trace.ts';

// The guard interrupt: at any moment, from any move, a guard forms fast around where the body is.
TUNING.breath = 0;

const MOVES: [string, (fw: Footwork) => void, number][] = [
  ['advance', fw => { fw.step(0, -1); }, 0], ['retreat', fw => { fw.step(0, 1); }, 0], ['step right', fw => { fw.step(1, 0); }, 0], ['step left', fw => { fw.step(-1, 0); }, 0],
  ['pass forward', fw => { fw.pass(true); }, 0], ['pass back', fw => { fw.pass(false); }, 0],
  ['lunge', fw => { fw.lunge(1); }, 0], ['half lunge', fw => { fw.lunge(0.5); }, 0],
  // Recoveries: lunge first (30 ticks), then recover, then interrupt that.
  ['recover forward', fw => { fw.lunge(1); run(fw, () => !fw.busy); fw.recover(true); }, 0],
  ['recover back', fw => { fw.lunge(1); run(fw, () => !fw.busy); fw.recover(false); }, 0],
  ['chained advance', fw => { fw.setIntent({ x: 0, z: -1 }); run(fw, tick => tick >= 50); }, 0],
];
const guardTicks = (time = TUNING.guardTime) => Math.ceil(time / DT - 1e-6);

test('a guard interrupts every move at every moment and is formed within the guard time', () => {
  let cases = 0, slowest = 0, farthest = 0, fastestJoint = 0;
  for (const from of STANCES) for (const to of STANCES) for (const [name, act] of MOVES) for (let at = 0; at <= 44; at++) {
    const label = `${from.name} ${name} @${at} -> ${to.name}`;
    const fw = createFootwork({ stance: from.id });
    act(fw); run(fw, tick => tick >= at);
    fw.setIntent(null);
    const before = { ...fw.state.root };
    fw.guard(to.id);
    // The interruption is immediate: the old move is gone before the next tick.
    assert.equal(fw.state.move!.kind, 'guard', `${label}: guard replaces the move at once`);
    assert.equal(fw.state.stance, to.id); assert.equal(fw.state.pose, 'guard'); assert.equal(fw.state.queue, null);
    const trace = run(fw, tick => tick >= guardTicks());
    assert.ok(trace.finite && trace.maxMiss === 0 && trace.maxExtension <= 0.999 && trace.plantedDrift < 1e-9, `${label}: sound (${trace.maxExtension})`);
    assert.ok(trace.bothAirborne <= 1, `${label}: at most a one-tick hop`);
    const error = guardError(fw);
    assert.ok(error.planted, `${label}: both feet down`);
    assert.ok(error.feet < 0.02, `${label}: feet ${error.feet.toFixed(4)} from guard`);
    assert.ok(error.hips < 0.01, `${label}: hips ${error.hips.toFixed(4)} from guard`);
    assert.ok(Math.abs(fw.state.hips.y - to.hipHeight) < 0.01, `${label}: hip height ${fw.state.hips.y.toFixed(3)}`);
    const drift = Math.hypot(fw.state.root.x - before.x, fw.state.root.z - before.z);
    assert.ok(drift < 0.1, `${label}: the body stops within ${drift.toFixed(3)} m`);
    assert.ok(Math.hypot(fw.state.rootVelX, fw.state.rootVelZ) < 0.15, `${label}: and is at rest`);
    // And it stays there: nothing left over restarts.
    const after = run(fw, tick => tick >= 30);
    assert.ok(!fw.busy && guardError(fw).feet < 0.02 && guardError(fw).hips < 1e-3 && after.maxMiss === 0, `${label}: holds`);
    cases++; slowest = Math.max(slowest, error.hips); farthest = Math.max(farthest, drift); fastestJoint = Math.max(fastestJoint, trace.maxJointStep);
  }
  assert.ok(cases > 4000);
  // Fast, but every joint still moves through space rather than teleporting.
  assert.ok(fastestJoint < 0.2, `fastest joint moves ${fastestJoint.toFixed(3)} m in one tick`);
});

test('the guard time is adjustable and the guard can interrupt itself', () => {
  for (const time of [0.08, 0.14, 0.25]) {
    const fw = createFootwork({ stance: 'engarde' });
    fw.lunge(1); run(fw, tick => tick >= 20);
    fw.guard('low', { time });
    assert.ok(Math.abs(fw.state.move!.duration - time) < 1e-9);
    run(fw, tick => tick >= guardTicks(time));
    const error = guardError(fw);
    assert.ok(error.planted && error.feet < 0.02 && error.hips < 0.012, `guard in ${time}s (${error.hips.toFixed(4)})`);
  }
  // Change of mind halfway through taking a guard.
  const fw = createFootwork({ stance: 'engarde' });
  fw.lunge(1); run(fw, () => !fw.busy);
  fw.guard('low'); run(fw, tick => tick >= 4);
  fw.guard('high');
  const trace = run(fw, tick => tick >= guardTicks());
  assert.ok(trace.finite && trace.maxMiss === 0);
  assert.equal(fw.state.stance, 'high');
  assert.ok(guardError(fw).planted && guardError(fw).feet < 0.02 && guardError(fw).hips < 0.01);
});

test('asking for the guard already held moves no foot; asking for another guard changes shape in place', () => {
  const events: FootworkEvent[] = [];
  const fw = createFootwork({ stance: 'engarde', listener: event => events.push(event) });
  fw.guard('engarde'); run(fw, tick => tick >= 20);
  assert.equal(events.length, 0, 'already in guard: no step');
  assert.ok(Math.hypot(fw.state.root.x, fw.state.root.z) === 0);
  fw.guard('low'); run(fw, tick => tick >= guardTicks());
  assert.ok(events.filter(event => event.type === 'lift').length === 2, 'both feet re-place for the wider guard');
  assert.ok(Math.hypot(fw.state.root.x, fw.state.root.z) === 0, 'the body does not travel');
  assert.ok(Math.abs(fw.state.hips.y - 0.72) < 0.01);
});

test('a guard can change the lead foot, and a guard that interrupts a passing step leads with the nearer foot', () => {
  const fw = createFootwork({ stance: 'high' });
  fw.guard(undefined, { lead: -1 }); run(fw, tick => tick >= guardTicks());
  assert.equal(fw.state.lead, -1);
  assert.ok(guardError(fw).planted && guardError(fw).feet < 0.02);
  for (const [at, lead] of [[3, 1], [30, -1]] as const) {
    const pass = createFootwork({ stance: 'high' });
    pass.pass(true); run(pass, tick => tick >= at);
    pass.guard();
    assert.equal(pass.state.lead, lead, `interrupted at tick ${at}`);
    run(pass, tick => tick >= guardTicks());
    assert.ok(guardError(pass).planted && guardError(pass).feet < 0.02);
  }
});

test('the guard interrupt works the same when gameplay owns the root', () => {
  const fw = createFootwork({ stance: 'engarde', external: true });
  const root = { x: 0, z: 0, yaw: 0.4 };
  let speed = 1.1;
  const env = () => { root.x -= Math.sin(root.yaw) * speed * DT; root.z -= Math.cos(root.yaw) * speed * DT; return { external: { ...root } }; };
  run(fw, tick => tick >= 37, { env });
  assert.ok(fw.busy, 'stepping to keep up');
  speed = 0; fw.guard('low');
  const trace = run(fw, tick => tick >= guardTicks() + 1, { env });
  assert.ok(trace.finite && trace.maxMiss === 0);
  const error = guardError(fw);
  assert.ok(error.planted && error.feet < 0.02 && error.hips < 0.02, `${error.feet} ${error.hips}`);
  assert.equal(fw.state.stance, 'low');
});

test('random play for two minutes never breaks the skeleton', () => {
  let seed = 12345;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  const fw = createFootwork({ stance: 'engarde' });
  const wall = { collide: (from: { x: number; z: number }, delta: { x: number; z: number }) => ({ x: Math.max(-1.5 - from.x, Math.min(1.5 - from.x, delta.x)), z: Math.max(-1.5 - from.z, Math.min(1.5 - from.z, delta.z)) }) };
  let guards = 0;
  const trace = run(fw, tick => tick >= 7200, { limit: 7200, env: () => wall, each: () => {
    const roll = random();
    if (roll < 0.02) { fw.guard(pick(STANCES).id, { time: 0.06 + random() * 0.2, lead: random() < 0.2 ? pick([1, -1] as const) : undefined }); guards++; }
    else if (roll < 0.05) fw.setIntent(random() < 0.3 ? null : { x: pick([-1, 0, 1]), z: pick([-1, 0, 1]) });
    else if (roll < 0.065) fw.lunge(pick([0, 0.5, 1]));
    else if (roll < 0.075) fw.recover(random() < 0.5);
    else if (roll < 0.082) fw.pass(random() < 0.5);
    else if (roll < 0.09) fw.face(fw.state.root.yaw + (random() - 0.5));
  } });
  assert.ok(guards > 100);
  assert.ok(trace.finite, 'no NaN anywhere');
  assert.equal(trace.maxMiss, 0, 'every foot always reaches its target');
  assert.ok(trace.maxExtension <= 0.999, `no stretched leg (${trace.maxExtension})`);
  assert.ok(trace.plantedDrift < 1e-9, `no planted boot ever slides (${trace.plantedDrift})`);
  assert.ok(Math.abs(fw.state.root.x) <= 1.5 + 1e-9 && Math.abs(fw.state.root.z) <= 1.5 + 1e-9, 'stays inside the walls');
  assert.ok(trace.minHip > 0.45, `hips stay off the floor (${trace.minHip})`);
});
