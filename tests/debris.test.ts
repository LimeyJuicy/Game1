import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createKnight } from '../src/knight.ts';
import { createTrainer } from '../src/trainer.ts';
import { createDebris, disposeDebris, DEBRIS } from '../src/debris.ts';
import { FINISHERS } from '../src/finisher.ts';

test('head and sword arm detach actual posed geometry and contours, with idempotence and complete reset', () => {
  const knight = createKnight(); knight.root.position.set(3, 0, -2); knight.root.rotation.y = .7;
  const scene = new THREE.Scene(); scene.add(knight.root);
  const initial = knight.rig.meshes.map(mesh => mesh.geometry.index!.count);
  knight.poseFinisher(.9, true, 80, FINISHERS[4]);
  for (const [part, code] of [['head', 1], ['sword-arm', 2]] as const) {
    const mesh = knight.rig.meshes.find(mesh => {
      const region = mesh.geometry.getAttribute('bodyRegion');
      return Array.from({ length: region.count }, (_, i) => region.getX(i)).includes(code);
    })!;
    const vertex = Array.from(mesh.geometry.index!.array).find(index => mesh.geometry.getAttribute('bodyRegion').getX(index) === code)!;
    const expected = mesh.localToWorld(mesh.getVertexPosition(vertex, new THREE.Vector3()));
    const prop = knight.detach(part)!; assert.ok(prop.children.length); scene.add(prop);
    const surface = prop.children.find(child => child instanceof THREE.Mesh)! as THREE.Mesh;
    const actual = surface.localToWorld(new THREE.Vector3().fromBufferAttribute(surface.geometry.getAttribute('position'), 0));
    assert.ok(actual.distanceTo(expected) < .001, `${part} must snapshot the current world pose`);
    assert.equal(knight.detach(part), null);
    assert.equal(knight.rig.hasPart(part), false);
    for (const original of knight.rig.meshes) {
      const index = original.geometry.index!, region = original.geometry.getAttribute('bodyRegion');
      for (let i = 0; i < original.geometry.drawRange.count; i++) assert.notEqual(region.getX(index.getX(i)), code);
    }
    if (part === 'sword-arm') { assert.equal(knight.capabilities.weapon, false); assert.ok(prop.getObjectByName('Dropped sword')); }
    disposeDebris(prop);
  }
  knight.resetParts(); assert.deepEqual(knight.capabilities, { head: true, helmet: true, swordArm: true, weapon: true });
  assert.deepEqual(knight.rig.meshes.map(mesh => mesh.geometry.drawRange.count), initial);
});

test('dropped sword is unique; detached props settle above floor and expire without disposing actor resources', () => {
  const knight = createKnight(), scene = new THREE.Scene(), debris = createDebris(scene); scene.add(knight.root);
  const sword = knight.root.getObjectByName('Longsword')!;
  let actorDisposed = false;
  sword.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.addEventListener('dispose', () => { actorDisposed = true; }); });
  knight.poseFinisher(.62, true, 12, FINISHERS[1]);
  const prop = knight.dropWeapon()!; assert.ok(prop); assert.equal(knight.dropWeapon(), null);
  debris.add(prop, new THREE.Vector3(2, 0, 0)); assert.equal(debris.count, 1);
  for (let i = 0; i < 300; i++) debris.update(1 / 60, []);
  assert.equal(debris.snapshot[0].settled, true);
  assert.ok(new THREE.Box3().setFromObject(prop).min.y >= .019);
  assert.equal(knight.capabilities.weapon, false);
  debris.update(DEBRIS.lifetime, []); assert.equal(debris.count, 0); assert.equal(prop.parent, null);
  assert.equal(actorDisposed, false); knight.resetParts(); assert.equal(knight.capabilities.weapon, true);
});

test('debris count is bounded and reset disposes owned geometry/material and leaves no orphan props', () => {
  const scene = new THREE.Scene(), debris = createDebris(scene);
  let disposed = 0;
  for (let i = 0; i < DEBRIS.limit + 3; i++) {
    const root = new THREE.Group(), geometry = new THREE.BoxGeometry(.1, .1, .1);
    geometry.addEventListener('dispose', () => { disposed++; });
    root.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial())); debris.add(root, new THREE.Vector3());
  }
  assert.equal(debris.count, DEBRIS.limit); assert.equal(disposed, 3);
  debris.reset(); assert.equal(scene.children.length, 0); assert.equal(disposed, DEBRIS.limit + 3);
});

test('enemy reset restores severed regions, held sword and compatibility after an execution', () => {
  const enemy = createTrainer(new THREE.Scene()); enemy.configure(true, 'normal', 0, new THREE.Vector3());
  const arm = enemy.detach('sword-arm')!, head = enemy.detach('head')!;
  enemy.execute(FINISHERS[3]); assert.equal(enemy.health, 0);
  assert.equal(enemy.capabilities.swordArm, false); assert.equal(enemy.capabilities.head, false);
  enemy.configure(true, 'normal', 0, new THREE.Vector3());
  assert.deepEqual(enemy.capabilities, { head: true, helmet: true, swordArm: true, weapon: true });
  assert.equal(enemy.health, 100); disposeDebris(arm); disposeDebris(head);
});
