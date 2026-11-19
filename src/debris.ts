import * as THREE from 'three';
import { moveWithCollision } from './movement.ts';
import type { Obstacle } from './movement.ts';

export type SeverPart = 'head' | 'sword-arm';

/** Snapshot a rigid weapon in world space; own clones so cleanup is safe. */
export function snapshotWeapon(weapon: THREE.Object3D): THREE.Group | null {
  if (!weapon.visible) return null;
  weapon.updateWorldMatrix(true, true);
  const group = new THREE.Group(); group.name = 'Dropped sword';
  group.position.copy(weapon.getWorldPosition(new THREE.Vector3()));
  group.quaternion.copy(weapon.getWorldQuaternion(new THREE.Quaternion()));
  group.scale.copy(weapon.getWorldScale(new THREE.Vector3()));
  for (const child of weapon.children) {
    const copy = child.clone(true);
    copy.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        object.geometry = object.geometry.clone();
        object.material = Array.isArray(object.material) ? object.material.map(material => material.clone()) : object.material.clone();
      }
    });
    group.add(copy);
  }
  weapon.visible = false;
  return group;
}

export function disposeDebris(group: THREE.Object3D) {
  group.removeFromParent();
  group.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
    }
  });
}

export const DEBRIS = { limit: 12, lifetime: 10 };
export function createDebris(scene: THREE.Scene) {
  const items: { root: THREE.Group; age: number; velocity: THREE.Vector3; spin: THREE.Vector3; settled: boolean }[] = [];
  const box = new THREE.Box3();
  function removeOldest() { const item = items.shift(); if (item) disposeDebris(item.root); }
  return {
    get count() { return items.length; },
    get snapshot() { return items.map(item => ({ kind: item.root.name, age: item.age, settled: item.settled })); },
    add(root: THREE.Group | null, direction: THREE.Vector3) {
      if (!root) return;
      while (items.length >= DEBRIS.limit) removeOldest();
      scene.add(root);
      items.push({ root, age: 0, velocity: direction.clone().setY(2.2), spin: new THREE.Vector3(2.5, 1.7, -.9), settled: false });
    },
    update(dt: number, obstacles: Obstacle[]) {
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i]; item.age += dt;
        if (item.age >= DEBRIS.lifetime) { disposeDebris(item.root); items.splice(i, 1); continue; }
        if (item.settled) continue;
        const steps = Math.max(1, Math.ceil(dt / (1 / 60))), step = dt / steps;
        for (let n = 0; n < steps; n++) {
          item.velocity.y -= 9.8 * step;
          const before = item.root.position.clone();
          const next = moveWithCollision(before, { x: item.velocity.x * step, z: item.velocity.z * step }, obstacles, .18);
          if (Math.abs(next.x - before.x - item.velocity.x * step) > .001) item.velocity.x *= -.2;
          if (Math.abs(next.z - before.z - item.velocity.z * step) > .001) item.velocity.z *= -.2;
          item.root.position.set(next.x, before.y + item.velocity.y * step, next.z);
          item.root.rotation.x += item.spin.x * step; item.root.rotation.y += item.spin.y * step; item.root.rotation.z += item.spin.z * step;
          item.root.updateWorldMatrix(true, true); box.setFromObject(item.root);
          if (box.min.y < .02) {
            item.root.position.y += .02 - box.min.y;
            if (Math.abs(item.velocity.y) < .7) { item.settled = true; break; }
            item.velocity.y *= -.2; item.velocity.x *= .5; item.velocity.z *= .5; item.spin.multiplyScalar(.3);
          }
        }
      }
    },
    reset() { while (items.length) removeOldest(); },
  };
}
