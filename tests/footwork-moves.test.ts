import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFootwork } from '../src/footwork/controller.ts';
import type { Footwork, FootworkEvent } from '../src/footwork/controller.ts';
import { LUNGE, STANCES, TUNING, footFor, lungeReach, stanceById } from '../src/footwork/stances.ts';
import { DT, guardError, run } from './footwork-trace.ts';

// Rungs 3 to 5: steps in every guard, chained steps, a wall, then lunges and recoveries.
TUNING.breath = 0;

const STEPS: { name: string; x: number; z: number; first: 'lead' | 'rear' | 'right' | 'left'; lands: string }[] = [
  { name: 'advance', x: 0, z: -1, first: 'lead', lands: 'heel' },
  { name: 'retreat', x: 0, z: 1, first: 'rear', lands: 'ball' },
  { name: 'step right', x: 1, z: 0, first: 'right', lands: 'flat' },
  { name: 'step left', x: -1, z: 0, first: 'left', lands: 'flat' },
];

function recorded(stance: string, lead: 1 | -1 = 1) {
  const events: FootworkEvent[] = [];
  return { fw: createFootwork({ stance, lead, listener: event => events.push(event) }), events };
}

/** Checks that hold for every move: nothing slides, stretches, floats or blows up. */
function sound(trace: ReturnType<typeof run>, label: string, hop = 0) {
  assert.ok(trace.finite, `${label}: finite`);
  assert.ok(trace.plantedDrift < 1e-9, `${label}: a planted boot moved ${trace.plantedDrift}`);
  assert.equal(trace.maxMiss, 0, `${label}: a foot missed its target`);
  assert.equal(trace.maxShift, 0, `${label}: the pelvis had to be dragged toward a foot`);
  assert.ok(trace.maxExtension <= 0.999, `${label}: leg stretched to ${trace.maxExtension}`);
  assert.ok(trace.bothAirborne <= hop, `${label}: both feet off the floor for ${trace.bothAirborne} ticks`);
}

test('rung 3: advance and retreat in every guard, with either foot leading', () => {
  for (const stance of STANCES) for (const lead of [1, -1] as const) for (const step of STEPS.slice(0, 2)) {
    const label = `${stance.name} ${lead > 0 ? 'right' : 'left'}-lead ${step.name}`;
    const { fw, events } = recorded(stance.id, lead);
    fw.step(step.x, step.z);
    const trace = run(fw, () => !fw.busy);
    sound(trace, label);
    assert.ok(Math.abs(trace.travelled - stance.step.length) < 1e-6, `${label}: travelled ${trace.travelled}, wanted ${stance.step.length}`);
    assert.ok(Math.abs(trace.seconds - stance.step.duration) <= DT + 1e-9, `${label}: took ${trace.seconds}s`);
    assert.ok(Math.abs(fw.state.root.x) < 1e-9, `${label}: stays on the line`);
    const error = guardError(fw);
    assert.ok(error.planted && error.feet < 1e-6, `${label}: ends with both feet exactly in guard`);
    assert.equal(fw.state.stance, stance.id); assert.equal(fw.state.lead, lead);
    // The fencing order: front foot first going forward, rear foot first going back.
    const lifts = events.filter(event => event.type === 'lift').map(event => event.foot);
    assert.deepEqual(lifts, step.first === 'lead' ? [footFor('lead', lead), footFor('rear', lead)] : [footFor('rear', lead), footFor('lead', lead)], `${label}: foot order`);
    // Going forward the lead foot lands on its heel; going back it comes down on the ball of the foot.
    const landings = events.filter(event => event.type === 'plant' && event.foot === footFor('lead', lead));
    assert.equal(landings[0].landOn, step.lands, `${label}: lead foot landing`);
    assert.ok(trace.peakSpeed < 2.2, `${label}: peak body speed ${trace.peakSpeed}`);
  }
});

test('rung 3: a step can be scrubbed: snapshots replay exactly and reading the pose changes nothing', () => {
  const fw = createFootwork({ stance: 'engarde' });
  fw.step(0, -1);
  run(fw, tick => tick >= 7);
  const snapshot = fw.snapshot();
  const before = JSON.stringify(snapshot);
  for (let i = 0; i < 20; i++) fw.pose();
  assert.equal(JSON.stringify(fw.snapshot()), before, 'pose() is a pure read');
  const first: string[] = [];
  run(fw, tick => tick >= 40, { each: () => first.push(JSON.stringify(fw.pose())) });
  fw.restore(snapshot);
  const second: string[] = [];
  run(fw, tick => tick >= 40, { each: () => second.push(JSON.stringify(fw.pose())) });
  assert.deepEqual(second, first, 'restoring a snapshot replays the same motion');
  assert.equal(JSON.stringify(snapshot), before, 'the snapshot itself was not disturbed');
});

test('rung 3: the same step looks different in each guard', () => {
  const sway = (id: string) => {
    const fw = createFootwork({ stance: id }); let widest = 0, height = 0, ticks = 0;
    fw.step(0, -1);
    const trace = run(fw, () => !fw.busy, { each: () => { widest = Math.max(widest, Math.abs(fw.state.hips.x - stanceById(id).hipToLead)); height += fw.state.hips.y; ticks++; } });
    return { trace, widest, height: height / ticks };
  };
  const engarde = sway('engarde'), low = sway('low'), high = sway('high');
  assert.ok(low.trace.seconds > engarde.trace.seconds && low.trace.travelled < engarde.trace.travelled, 'low guard: shorter and slower');
  assert.ok(low.height < engarde.height - 0.05 && engarde.height < high.height - 0.03, 'each guard rides at its own height');
  assert.ok(low.widest > engarde.widest * 1.3, `low guard shifts its weight more (${low.widest.toFixed(4)} vs ${engarde.widest.toFixed(4)})`);
});

test('rung 4: side steps go to the side, opening with the foot on that side', () => {
  for (const stance of STANCES) for (const lead of [1, -1] as const) for (const step of STEPS.slice(2)) {
    const label = `${stance.name} ${lead > 0 ? 'right' : 'left'}-lead ${step.name}`;
    const { fw, events } = recorded(stance.id, lead);
    fw.step(step.x, step.z);
    const trace = run(fw, () => !fw.busy);
    sound(trace, label);
    assert.ok(Math.abs(fw.state.root.x - step.x * stance.step.side) < 1e-6 && Math.abs(fw.state.root.z) < 1e-9, `${label}: moved ${fw.state.root.x}`);
    assert.equal(events.find(event => event.type === 'lift')!.foot, step.first === 'right' ? 1 : 0, `${label}: opening foot`);
    assert.ok(guardError(fw).feet < 1e-6, `${label}: ends in guard`);
  }
  // Diagonals work too and blend the two step sizes.
  const fw = createFootwork({ stance: 'engarde' });
  fw.step(1, -1);
  sound(run(fw, () => !fw.busy), 'diagonal');
  assert.ok(fw.state.root.x > 0.15 && fw.state.root.z < -0.15 && guardError(fw).feet < 1e-6);
});

test('rung 4: holding a direction chains steps at the guard\'s own speed, without stopping between them', () => {
  for (const stance of STANCES) for (const step of STEPS) {
    const label = `${stance.name} ${step.name}`;
    const fw = createFootwork({ stance: stance.id });
    fw.setIntent({ x: step.x, z: step.z });
    const speeds: number[] = [];
    const trace = run(fw, tick => tick >= 240, { each: () => speeds.push(Math.hypot(fw.state.rootVelX, fw.state.rootVelZ)) });
    sound(trace, label);
    const along = Math.abs(step.z), cap = (along ? stance.step.length : stance.step.side) / (along ? stance.step.duration : stance.step.sideDuration);
    const mean = trace.travelled / trace.seconds;
    assert.ok(mean > cap * 0.93 && mean < cap * 1.03, `${label}: mean ${mean.toFixed(3)} m/s against a cap of ${cap.toFixed(3)}`);
    assert.ok(trace.peakSpeed < cap * 1.45, `${label}: peak ${trace.peakSpeed.toFixed(2)} m/s`);
    // After the first step the body keeps flowing: it never comes to rest between steps.
    const cruising = speeds.slice(Math.round(stance.step.duration / DT) + 4);
    assert.ok(Math.min(...cruising) > cap * 0.55, `${label}: slowest moment ${Math.min(...cruising).toFixed(2)} m/s`);
    assert.ok(trace.maxSpeedStep < 0.2, `${label}: speed changes by at most ${trace.maxSpeedStep.toFixed(3)} m/s per tick`);
    // Letting go finishes the step in progress and stops in guard.
    fw.setIntent(null);
    const stop = run(fw, tick => tick >= 60);
    sound(stop, `${label} stopping`);
    assert.ok(!fw.busy && Math.hypot(fw.state.rootVelX, fw.state.rootVelZ) < 1e-6 && guardError(fw).feet < 1e-6, `${label}: stops in guard`);
    assert.ok(stop.travelled <= (along ? stance.step.length : stance.step.side) + 1e-6, `${label}: stops within one step`);
  }
});

test('rung 4: a step into a wall is shortened and still ends in guard', () => {
  for (const stance of STANCES) for (const gap of [0.05, 0.12, 0.3]) {
    const label = `${stance.name} wall at ${gap}`;
    const fw = createFootwork({ stance: stance.id });
    // The body cannot pass z = −gap.
    const env = () => ({ collide: (from: { x: number; z: number }, delta: { x: number; z: number }) => ({ x: delta.x, z: Math.max(delta.z, -gap - from.z) }) });
    fw.step(0, -1);
    const trace = run(fw, () => !fw.busy, { env });
    sound(trace, label);
    assert.ok(Math.abs(trace.travelled - Math.min(gap, stance.step.length)) < 1e-6, `${label}: travelled ${trace.travelled}`);
    assert.ok(fw.state.root.z >= -gap - 1e-9, 'did not pass the wall');
    assert.ok(guardError(fw).feet < 1e-6, `${label}: feet end in guard around where the body actually stopped`);
    assert.equal(fw.state.last!.blocked, gap < stance.step.length);
    // Leaning on the wall: holding the key does not creep, slide or shuffle through it.
    fw.setIntent({ x: 0, z: -1 });
    const pushing = run(fw, tick => tick >= 90, { env });
    sound(pushing, `${label} pushing`);
    assert.ok(fw.state.root.z >= -gap - 1e-9);
  }
  // Already against the wall: no step is taken at all, rather than marching on the spot.
  const events: FootworkEvent[] = [];
  const fw = createFootwork({ stance: 'engarde', listener: event => events.push(event) });
  fw.setIntent({ x: 0, z: -1 });
  run(fw, tick => tick >= 90, { env: () => ({ collide: (from, delta) => ({ x: delta.x, z: Math.max(delta.z, -0.01 - from.z) }) }) });
  assert.equal(events.length, 0, 'no foot leaves the floor');
  assert.equal(fw.state.root.z, 0);
});

test('rung 4: a passing step swaps the lead foot (longsword footwork)', () => {
  for (const stance of STANCES) for (const forward of [true, false]) {
    const fw = createFootwork({ stance: stance.id });
    fw.pass(forward);
    const trace = run(fw, () => !fw.busy);
    sound(trace, `${stance.name} pass`);
    assert.equal(fw.state.lead, -1, 'the other foot leads now');
    assert.ok(guardError(fw).feet < 1e-6);
    assert.ok(Math.abs(trace.travelled - (stance.lead.forward - stance.rear.forward)) < 1e-6);
    assert.equal(Math.sign(-fw.state.root.z), forward ? 1 : -1);
  }
});

test('rung 5: lunge at full, half and zero travel keeps the rear foot planted', () => {
  for (const stance of STANCES) for (const lead of [1, -1] as const) for (const depth of [1, 0.5, 0]) {
    const label = `${stance.name} lunge ${depth}`;
    const { fw, events } = recorded(stance.id, lead);
    const rear = footFor('rear', lead), front = footFor('lead', lead);
    const planted = { ...fw.state.feet[rear] }, started = { ...fw.state.feet[front] };
    let apex = 0, toes = 0, rearMoved = 0;
    fw.lunge(depth);
    const trace = run(fw, () => !fw.busy, { each: () => {
      const foot = fw.state.feet[rear];
      rearMoved = Math.max(rearMoved, Math.hypot(foot.x - planted.x, foot.z - planted.z) + Math.abs(foot.yaw - planted.yaw) + foot.lift + Math.abs(foot.pitch) + (foot.planted ? 0 : 1));
      apex = Math.max(apex, fw.state.feet[front].lift); toes = Math.max(toes, fw.state.feet[front].pitch);
    } });
    sound(trace, label);
    assert.equal(rearMoved, 0, `${label}: the rear foot never moves, lifts or rolls`);
    const travel = Math.min(LUNGE.travel * depth, lungeReach(stance));
    assert.ok(Math.abs(trace.travelled - travel) < 1e-6, `${label}: travelled ${trace.travelled}, wanted ${travel}`);
    assert.ok(Math.abs(trace.seconds - LUNGE.duration) <= DT + 1e-9);
    assert.equal(fw.state.pose, 'lunge');
    // The lead foot is thrown forward low, toes up, and lands on the heel.
    assert.deepEqual(events.map(event => [event.type, event.foot, event.landOn]), [['lift', front, undefined], ['plant', front, 'heel']], `${label}: only the lead foot leaves the floor`);
    assert.ok(apex > 0.02 && apex <= LUNGE.apex + 1e-9, `${label}: lead foot clears ${apex.toFixed(3)} m`);
    assert.ok(toes > 0.17, `${label}: toes up ${toes.toFixed(2)} rad`);
    const reach = Math.hypot(fw.state.feet[front].x - started.x, fw.state.feet[front].z - started.z);
    assert.ok(reach > travel + 0.09, `${label}: lead foot reaches ${reach.toFixed(2)} m`);
    if (depth === 1) {
      // Measured lunges peak at 1.7–3.4 m/s body speed.
      assert.ok(trace.peakSpeed >= 1.7 && trace.peakSpeed <= 3.4, `${label}: peak ${trace.peakSpeed.toFixed(2)} m/s`);
      assert.ok(trace.minHip < stance.hipHeight - 0.08, `${label}: hips sink to ${trace.minHip.toFixed(2)}`);
    }
    run(fw, tick => tick >= 12);
    assert.equal(fw.state.feet[front].pitch, 0, 'the landed foot has rolled flat');
  }
});

test('rung 5: recovering forward gathers the rear foot; recovering back pushes off the lead foot', () => {
  for (const stance of STANCES) for (const depth of [1, 0.5, 0]) for (const forward of [true, false]) {
    const label = `${stance.name} lunge ${depth} recover ${forward ? 'forward' : 'back'}`;
    const fw = createFootwork({ stance: stance.id });
    fw.lunge(depth); run(fw, () => !fw.busy);
    const lunged = fw.state.root.z, keep = footFor(forward ? 'lead' : 'rear', 1), stays = { ...fw.state.feet[keep] };
    let moved = 0;
    fw.recover(forward);
    const trace = run(fw, () => !fw.busy, { each: () => { moved = Math.max(moved, Math.hypot(fw.state.feet[keep].x - stays.x, fw.state.feet[keep].z - stays.z)); } });
    sound(trace, label);
    assert.equal(moved, 0, `${label}: the ${forward ? 'lead' : 'rear'} foot stays where it is`);
    assert.equal(fw.state.pose, 'guard');
    const error = guardError(fw);
    assert.ok(error.planted && error.feet < 1e-6, `${label}: back in guard (${error.feet})`);
    if (forward) assert.ok(fw.state.root.z <= lunged + 1e-9, `${label}: ground is kept`);
    else assert.ok(Math.abs(fw.state.root.z) < 1e-6, `${label}: returns to where the lunge began (${fw.state.root.z})`);
  }
});

test('rung 5: commands given in a lunge recover first, in the direction asked', () => {
  const lunged = () => { const fw = createFootwork({ stance: 'engarde' }); fw.lunge(1); run(fw, () => !fw.busy); return fw; };
  let fw = lunged(); fw.step(0, 1);
  assert.equal(fw.state.move!.name, 'Recover back');
  run(fw, () => !fw.busy); assert.ok(Math.abs(fw.state.root.z) < 1e-6 && !fw.busy, 'a retreat is the backward recovery, nothing more');
  fw = lunged(); fw.step(0, -1);
  assert.equal(fw.state.move!.name, 'Recover forward');
  fw = lunged(); fw.lunge(1);
  assert.equal(fw.state.move!.name, 'Recover forward');
  run(fw, () => !fw.busy || fw.state.move!.kind === 'lunge');
  assert.equal(fw.state.move?.kind, 'lunge', 'then lunges again');
  fw = lunged(); fw.step(1, 0);
  run(fw, () => !fw.busy || fw.state.move!.kind === 'step');
  assert.equal(fw.state.move?.name, 'Step right');
});

test('the motion does not depend on the tick rate', () => {
  const end = (dt: number, act: (fw: Footwork) => void) => {
    const fw = createFootwork({ stance: 'engarde' }); act(fw);
    run(fw, () => !fw.busy, { dt, limit: 5000 });
    return fw.state;
  };
  for (const act of [(fw: Footwork) => { fw.step(0, -1); }, (fw: Footwork) => { fw.lunge(1); }, (fw: Footwork) => { fw.step(1, 0); }]) {
    const a = end(1 / 60, act), b = end(1 / 144, act);
    assert.ok(Math.hypot(a.root.x - b.root.x, a.root.z - b.root.z) < 1e-6, 'same travel');
    for (const i of [0, 1]) assert.ok(Math.hypot(a.feet[i].x - b.feet[i].x, a.feet[i].z - b.feet[i].z) < 1e-6, 'same foot placement');
  }
});

test('when gameplay owns the root the feet keep up with it and never slide', () => {
  for (const stance of STANCES) for (const direction of [{ x: 0, z: -1 }, { x: 0, z: 1 }, { x: 1, z: 0 }, { x: -0.7, z: -0.7 }]) {
    const label = `${stance.name} following ${direction.x},${direction.z}`;
    const fw = createFootwork({ stance: stance.id, external: true });
    const speed = (Math.abs(direction.z) > 0.5 ? stance.step.length / stance.step.duration : stance.step.side / stance.step.sideDuration) * 0.95;
    const root = { x: 0, z: 0, yaw: 0 };
    let moving = true;
    const env = () => {
      if (moving) { root.x += direction.x * speed * DT; root.z += direction.z * speed * DT; }
      return { external: { ...root } };
    };
    const trace = run(fw, tick => tick >= 180, { env });
    assert.ok(trace.finite && trace.plantedDrift < 1e-9 && trace.maxMiss === 0, `${label}: planted feet hold (${trace.plantedDrift})`);
    assert.ok(trace.maxExtension <= 0.999 && trace.bothAirborne === 0, `${label}: extension ${trace.maxExtension}`);
    assert.ok(trace.maxShift === 0, `${label}: the hips ride where the guard puts them`);
    moving = false;
    run(fw, tick => tick >= 60, { env });
    const error = guardError(fw);
    assert.ok(!fw.busy && error.planted && error.feet < 0.061, `${label}: settles into guard when the body stops (${error.feet.toFixed(3)})`);
  }
  assert.throws(() => createFootwork({ external: true }).advance(DT), /follows gameplay/);
});
