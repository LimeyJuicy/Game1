import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import { createImportedKnight } from '../Animation Testing/AT-007-Footwork/viewer/importedKnight.ts';
import { createFootwork } from '../src/footwork/controller.ts';
import { solveLowerBody } from '../src/footwork/legs.ts';

function fixture() {
  const raw = fs.readFileSync(new URL('../Animation Testing/AT-001-Rig-Workbench/viewer/public/models/red-herald-knight-rigged.glb', import.meta.url));
  const size = raw.readUInt32LE(12), j = JSON.parse(raw.subarray(20, 20 + size).toString()), bin = raw.subarray(28 + size);
  const read = (index: number) => {
    const a = j.accessors[index], v = j.bufferViews[a.bufferView], width = a.type === 'VEC4' ? 4 : a.type === 'VEC3' ? 3 : 1;
    return new Float32Array(bin.buffer, bin.byteOffset + (v.byteOffset ?? 0) + (a.byteOffset ?? 0), a.count * width);
  };
  const joints = new Set(j.skins[0].joints);
  const nodes = j.nodes.map((n: any, i: number) => {
    const o = joints.has(i) ? new T.Bone() : new T.Group(); o.name = n.name ?? '';
    if (n.translation) o.position.fromArray(n.translation);
    if (n.rotation) o.quaternion.fromArray(n.rotation);
    if (n.scale) o.scale.fromArray(n.scale);
    return o;
  });
  j.nodes.forEach((n: any, i: number) => (n.children ?? []).forEach((c: number) => nodes[i].add(nodes[c])));
  const model = new T.Group(); j.scenes[j.scene ?? 0].nodes.forEach((i: number) => model.add(nodes[i]));
  const clips = j.animations.map((a: any) => new T.AnimationClip(a.name, -1, a.channels.map((c: any) => {
    const s = a.samplers[c.sampler], name = j.nodes[c.target.node].name;
    return c.target.path === 'rotation' ? new T.QuaternionKeyframeTrack(`${name}.quaternion`, read(s.input), read(s.output)) : new T.VectorKeyframeTrack(`${name}.position`, read(s.input), read(s.output));
  })));
  return createImportedKnight(model, clips, new T.Group());
}

test('imported knight uses measured anatomy, reaches planted targets and keeps both sword grips through PR footwork', () => {
  const actor = fixture(), fw = createFootwork({ stance: 'engarde' });
  assert.equal(actor.bones.length, 66);
  assert.ok(Math.abs(actor.measurements.pelvisRest - .963) < 1e-5);
  const lengths = ['l','r'].map(side => {
    const hip = actor.model.getObjectByName(`thigh_${side}`)!, knee = actor.model.getObjectByName(`calf_${side}`)!, ankle = actor.model.getObjectByName(`foot_${side}`)!;
    return { hip, knee, ankle, a: knee.position.length(), b: ankle.position.length() };
  });
  const tick = (n = 1) => { for (let i = 0; i < n; i++) {
    fw.advance(1/60); const state = fw.state;
    actor.root.position.set(state.root.x, 0, state.root.z); actor.root.rotation.y = state.root.yaw;
    const solution = solveLowerBody(fw.pose(), actor.measurements); actor.update(solution, state.time);
    const headUp = new T.Vector3(0, 1, 0).applyQuaternion(actor.model.getObjectByName('Head')!.getWorldQuaternion(new T.Quaternion()));
    assert.ok(headUp.y > .9, `Unexpected head tilt: ${headUp.y}`);
    for (const leg of solution.legs) assert.ok(leg.miss < 1e-5, `Unreachable foot: ${leg.miss}`);
    for (const chain of lengths) { assert.ok(Math.abs(chain.knee.position.length() - chain.a) < 1e-7); assert.ok(Math.abs(chain.ankle.position.length() - chain.b) < 1e-7); }
  }};
  for (const stance of ['engarde','low','high']) {
    fw.guard(stance); tick(20);
    fw.setIntent({x:0,z:-1}); tick(80); fw.setIntent({x:0,z:0});tick(40);
    fw.setIntent({x:1,z:1}); tick(70); fw.setIntent({x:0,z:0});tick(40);
    fw.lunge(1);tick(40); fw.recover(false);tick(40);
    fw.pass(true);tick(50);fw.guard(stance, {lead:-1});tick(20);
    fw.lunge(.5);tick(40);fw.recover(true);tick(40);
  }
  fw.face(.8);tick(15);
  // Pausing/redrawing/scrubbing must not accumulate the procedural correction.
  const chest = actor.model.getObjectByName('spine_03')!, referenceQ = chest.getWorldQuaternion(new T.Quaternion());
  const frozen = solveLowerBody(fw.pose(), actor.measurements);
  for (let i = 0; i < 30; i++) actor.update(frozen, fw.state.time);
  assert.ok(chest.getWorldQuaternion(new T.Quaternion()).angleTo(referenceQ) < 1e-6, 'Paused redraw changed the pose');
  assert.ok(actor.metrics.maximumAnkleError < 1e-5, `Bone/target mismatch: ${actor.metrics.maximumAnkleError}`);
  assert.ok(actor.metrics.maximumGripError < .001, `Grip separation: ${actor.metrics.maximumGripError}`);
});
