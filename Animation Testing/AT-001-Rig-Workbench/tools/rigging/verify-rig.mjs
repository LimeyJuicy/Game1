import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import * as T from 'three';
const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
function read(name) {
  const raw = fs.readFileSync(path.join(base, 'viewer/public/models', name));
  assert.equal(raw.toString('ascii', 0, 4), 'glTF');
  assert.equal(raw.readUInt32LE(4), 2);
  assert.equal(raw.readUInt32LE(8), raw.length);
  const size = raw.readUInt32LE(12);
  return { raw, json: JSON.parse(raw.subarray(20, 20 + size)), bin: raw.subarray(28 + size) };
}
const original = read('red-herald-knight.glb'), rig = read('red-herald-knight-rigged.glb');
assert.equal(crypto.createHash('sha256').update(original.raw).digest('hex'), '9be0076e9503389fa526aa503fac7016e2b1a8d83ed8f2b0a819198cd2a340b0');
assert.ok(rig.bin.subarray(0, original.json.buffers[0].byteLength).equals(original.bin.subarray(0, original.json.buffers[0].byteLength)), 'Original geometry/image binary must be unchanged');
for (const key of ['materials', 'textures', 'images', 'samplers']) assert.deepEqual(rig.json[key], original.json[key], key);
const p = rig.json.meshes[0].primitives[0], op = original.json.meshes[0].primitives[0];
for (const [name, value] of Object.entries(op.attributes)) assert.equal(p.attributes[name], value);
assert.equal(p.indices, op.indices);
function values(index) {
  const a = rig.json.accessors[index], v = rig.json.bufferViews[a.bufferView];
  const width = { SCALAR: 1, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type], size = { 5126: 4, 5125: 4, 5123: 2 }[a.componentType];
  return Array.from({ length: a.count * width }, (_, i) => {
    const offset = (v.byteOffset ?? 0) + (a.byteOffset ?? 0) + Math.floor(i / width) * (v.byteStride ?? width * size) + i % width * size;
    return a.componentType === 5126 ? rig.bin.readFloatLE(offset) : a.componentType === 5125 ? rig.bin.readUInt32LE(offset) : rig.bin.readUInt16LE(offset);
  });
}
const skin = rig.json.skins[0], weights = values(p.attributes.WEIGHTS_0), joints = values(p.attributes.JOINTS_0);
assert.equal(skin.joints.length, 66); assert.equal(rig.json.animations.length, 43);
for (let i = 0; i < weights.length; i += 4) {
  assert.ok(Math.abs(weights.slice(i, i + 4).reduce((a, b) => a + b, 0) - 1) < 1e-6);
  for (let k = 0; k < 4; k++) { assert.ok(Number.isFinite(weights[i+k]) && weights[i+k] >= 0); assert.ok(joints[i+k] < skin.joints.length); }
}
const nodes = rig.json.nodes.map(n => { const o = new T.Object3D(); if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale); return o; });
rig.json.nodes.forEach((n, i) => (n.children ?? []).forEach(c => nodes[i].add(nodes[c])));
const scene = new T.Group(); rig.json.scenes[rig.json.scene ?? 0].nodes.forEach(i => scene.add(nodes[i])); scene.updateWorldMatrix(true, true);
const ibm = values(skin.inverseBindMatrices), matrices = skin.joints.map((n, i) => nodes[n].matrixWorld.clone().multiply(new T.Matrix4().fromArray(ibm, i * 16))), positions = values(p.attributes.POSITION);
let maximumBindError = 0;
for (let i = 0; i < positions.length / 3; i++) {
  const point = new T.Vector3().fromArray(positions, i*3), posed = new T.Vector3();
  for (let k = 0; k < 4; k++) posed.addScaledVector(point.clone().applyMatrix4(matrices[joints[i*4+k]]), weights[i*4+k]);
  maximumBindError = Math.max(maximumBindError, point.distanceTo(posed));
}
assert.ok(maximumBindError < 1e-6, `Bind error ${maximumBindError}`);
for (const clip of rig.json.animations) for (const channel of clip.channels) {
  const sampler = clip.samplers[channel.sampler], times = values(sampler.input), output = values(sampler.output);
  assert.ok(times.every((t, i) => Number.isFinite(t) && (i === 0 || t > times[i-1])));
  assert.ok(output.every(Number.isFinite));
  if (channel.target.path === 'rotation') for (let i = 0; i < output.length; i += 4) assert.ok(Math.abs(Math.hypot(...output.slice(i, i+4)) - 1) < 1e-5);
}
const report = { originalBytesPreserved: true, materialsPreserved: true, verticesChecked: positions.length / 3, bones: skin.joints.length, clips: rig.json.animations.length, maximumBindError, result: 'PASS: structural checks only; deformation appearance requires visual review' };
fs.writeFileSync(path.join(base, 'reports/knight-rig-verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(report);
