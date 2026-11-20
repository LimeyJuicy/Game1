import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import { createTwoHandCarry } from '../viewer/twoHandCarry.ts';

function fixture() {
  const raw = fs.readFileSync(new URL('../viewer/public/models/red-herald-knight-rigged.glb', import.meta.url));
  const size = raw.readUInt32LE(12), json = JSON.parse(raw.subarray(20, 20 + size).toString()), bin = raw.subarray(28 + size);
  const read = (index: number) => {
    const a = json.accessors[index], v = json.bufferViews[a.bufferView];
    return new Float32Array(bin.buffer, bin.byteOffset + (v.byteOffset ?? 0) + (a.byteOffset ?? 0), a.count * ({ SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type as string] ?? 1));
  };
  const nodes = json.nodes.map((n: any) => {
    const node = new T.Object3D(); node.name = n.name ?? '';
    if (n.translation) node.position.fromArray(n.translation);
    if (n.rotation) node.quaternion.fromArray(n.rotation);
    if (n.scale) node.scale.fromArray(n.scale);
    return node;
  });
  json.nodes.forEach((n: any, i: number) => (n.children ?? []).forEach((c: number) => nodes[i].add(nodes[c])));
  const root = new T.Group(); json.scenes[json.scene ?? 0].nodes.forEach((i: number) => root.add(nodes[i])); root.updateWorldMatrix(true, true);
  const clips = json.animations.map((a: any) => new T.AnimationClip(a.name, -1, a.channels.map((c: any) => {
    const s = a.samplers[c.sampler], name = json.nodes[c.target.node].name;
    return c.target.path === 'rotation' ? new T.QuaternionKeyframeTrack(`${name}.quaternion`, read(s.input), read(s.output)) : new T.VectorKeyframeTrack(`${name}.position`, read(s.input), read(s.output));
  })));
  return { root, clips };
}

test('both grips stay on a backward shoulder carry throughout five locomotion clips', () => {
  const { root, clips } = fixture();
  const chest = root.getObjectByName('spine_03')!, chestRest = chest.getWorldQuaternion(new T.Quaternion());
  const carry = createTwoHandCarry(root, clips, new T.Group());
  assert.equal(carry.clips.size, 5);
  assert.ok(carry.maximumReachAdjustment < 1e-5, `Unreachable grip: ${carry.maximumReachAdjustment}`);
  assert.ok(carry.maximumHandError < 1e-5);
  assert.equal(carry.sword.parent?.name, 'hand_r');
  assert.ok(Math.abs(carry.gripSpacing - .1107) < 1e-8);
  const mixer = new T.AnimationMixer(root);
  for (const [id, derived] of carry.clips) {
    const source = clips.find((c: T.AnimationClip) => c.name === id.slice(6))!;
    // Body/leg motion must survive the arm adaptation byte-for-byte.
    for (const track of source.tracks.filter((t: T.KeyframeTrack) => /^(root|pelvis|spine|neck|Head|clavicle|thigh|calf|foot|ball)/.test(t.name))) {
      const retained = derived.tracks.find(t => t.name === track.name)!;
      assert.deepEqual(retained.values, track.values); assert.deepEqual(retained.times, track.times);
    }
    mixer.clipAction(derived).play();
    // Fractional sample times exercise interpolation between baked arm keys.
    for (let sample = 0; sample < 97; sample++) {
      mixer.setTime(derived.duration * (sample + .37) / 97); root.updateWorldMatrix(true, true);
      const errors = carry.gripErrors();
      assert.ok(errors.right < 1e-6 && errors.left < .0005, `${id}: ${JSON.stringify(errors)}`);
      const direction = carry.tip().sub(carry.grip()).normalize();
      const facing = new T.Vector3(0, 0, 1).applyQuaternion(chest.getWorldQuaternion(new T.Quaternion()).multiply(chestRest.clone().invert())); facing.y = 0; facing.normalize();
      assert.ok(direction.dot(facing) < -.65 && direction.y > -.05 && direction.y < .4, `${id}: blade pitches off shoulder ${direction.toArray()}`);
    }
    mixer.stopAllAction();
  }
  mixer.uncacheRoot(root);
});
