import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solveLowerBody } from '../src/footwork/legs.ts';
import { LUNGE, STANCES, footFor, lungeReach, stanceById, stancePose } from '../src/footwork/stances.ts';

// Rung 2: guards are data, and every guard is a pose the skeleton can actually hold.

test('guards are plain data that survives a JSON round trip', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(STANCES)), STANCES);
  assert.ok(STANCES.length >= 2, 'at least two guards');
  assert.equal(new Set(STANCES.map(stance => stance.id)).size, STANCES.length, 'ids are unique');
  assert.equal(stanceById('no-such-guard'), STANCES[0]);
});

test('every guard is within reach: no hip sinking, no stretched leg, knees over toes', () => {
  for (const stance of STANCES) for (const lead of [1, -1] as const) {
    const pose = stancePose(stance, lead), solution = solveLowerBody(pose);
    assert.ok(solution.sink < 1e-4 && solution.shift === 0, `${stance.name}: hips stay at ${stance.hipHeight} (sank ${solution.sink.toFixed(4)})`);
    assert.ok(Math.abs(solution.pelvisPosition.y - stance.hipHeight) < 1e-4);
    solution.legs.forEach((leg, i) => {
      assert.equal(leg.miss, 0);
      assert.ok(leg.extension < 0.97, `${stance.name}: leg ${i} is ${(leg.extension * 100).toFixed(0)}% extended`);
      assert.ok(leg.kneeToToes < 15, `${stance.name}: knee ${i} is ${leg.kneeToToes.toFixed(1)}° off the toes`);
    });
    const lead_ = pose.feet[footFor('lead', lead)], rear = pose.feet[footFor('rear', lead)];
    assert.ok(lead_.z < rear.z, 'lead foot is in front');
  }
});

test('either foot can lead: the left-lead guard is the mirror image of the right-lead one', () => {
  for (const stance of STANCES) {
    const right = solveLowerBody(stancePose(stance, 1)), left = solveLowerBody(stancePose(stance, -1));
    for (const i of [0, 1]) for (const joint of ['knee', 'ankle'] as const) {
      const a = right.legs[i][joint], b = left.legs[1 - i][joint];
      assert.ok(Math.abs(a.x + b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9 && Math.abs(a.z - b.z) < 1e-9, `${stance.name}: ${joint} ${i} mirrors`);
    }
  }
});

test('the guards differ from each other in shape and in how they step', () => {
  const [engarde, low, high] = ['engarde', 'low', 'high'].map(stanceById);
  assert.ok(low.hipHeight < engarde.hipHeight && engarde.hipHeight < high.hipHeight);
  const length = (id: string) => { const stance = stanceById(id); return stance.lead.forward - stance.rear.forward; };
  assert.ok(length('low') > length('engarde') && length('engarde') > length('high'));
  const speed = (id: string) => { const stance = stanceById(id); return stance.step.length / stance.step.duration; };
  assert.ok(speed('low') < speed('engarde') * 0.7, 'the low guard is clearly slower');
  assert.ok(low.step.weightShift > engarde.step.weightShift);
});

test('en garde carries the measured fencing numbers', () => {
  const stance = stanceById('engarde');
  assert.equal(stance.step.length, 0.46, 'advance length: 46 cm (Chida 2023)');
  assert.ok(stance.rear.turnout >= 68 && stance.rear.turnout <= 100, 'rear foot turned out near a right angle');
  assert.ok(LUNGE.duration >= 0.4 && LUNGE.duration <= 0.6, 'lunge takes about half a second');
  assert.equal(LUNGE.travel, 0.42, "matches the game's lunge cap");
});

test('the lunge pose is reachable at every depth with the rear foot still planted where the guard left it', () => {
  for (const stance of STANCES) for (const depth of [0, 0.5, 1]) {
    const travel = Math.min(LUNGE.travel * depth, lungeReach(stance));
    const pose = stancePose(stance, 1, 'lunge', depth);
    // The rear foot did not move, so seen from the travelled root it is that much farther back.
    pose.feet[footFor('rear', 1)].z += travel;
    const solution = solveLowerBody(pose);
    assert.ok(solution.sink < 0.012 && solution.shift === 0, `${stance.name} depth ${depth}: hips hold (sank ${solution.sink.toFixed(4)})`);
    solution.legs.forEach(leg => assert.equal(leg.miss, 0));
  }
});
