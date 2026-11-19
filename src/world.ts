import * as THREE from 'three';
import type { Obstacle } from './movement.ts';

export function createWorld(scene: THREE.Scene) {
  const obstacles: Obstacle[] = [];
  const occluders: THREE.Object3D[] = [];
  const stone = new THREE.MeshToonMaterial({ color: '#707a73' });
  const darkStone = new THREE.MeshToonMaterial({ color: '#505f5b' });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 44), new THREE.MeshToonMaterial({ color: '#6c7567' }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(40, 20, '#596658', '#657160');
  grid.position.y = 0.012;
  scene.add(grid);

  function block(x: number, z: number, width: number, depth: number, height: number, material = stone) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: '#253532', transparent: true, opacity: 0.45 }));
    mesh.add(edges);
    scene.add(mesh);
    obstacles.push({ x, z, halfX: width / 2, halfZ: depth / 2 });
    occluders.push(mesh);
    return mesh;
  }

  block(-20, 0, 1, 44, 2.3);
  block(20, 0, 1, 44, 2.3);
  block(0, -22, 40, 1, 3.2);
  block(0, 22, 40, 1, 2.3);
  // An L-shaped ruin tests sliding collision and camera obstruction around a bend.
  block(3, -5, 9, 0.9, 3.1);
  block(7.1, -1.8, 0.9, 5.6, 2.4);
  for (const [x, z, h] of [[-9, -9, 2.8], [-9, 5, 1.6], [11, 9, 2.4], [-3, 13, 1.2]]) {
    block(x, z, 1.3, 1.3, h, darkStone);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 1.6), stone);
    cap.position.set(x, h + 0.1, z); scene.add(cap); occluders.push(cap);
  }

  // Non-colliding painted floor accents keep the movement routes uncluttered.
  const paving = new THREE.MeshToonMaterial({ color: '#7d8375' });
  for (let z = -19; z <= 19; z += 2.4) {
    const tile = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.025, 1.8), paving);
    tile.position.set(-3.5, 0.015, z); tile.receiveShadow = true; scene.add(tile);
  }
  const backdrop = new THREE.Mesh(new THREE.CylinderGeometry(65, 65, 8, 8, 1, true), new THREE.MeshBasicMaterial({ color: '#455552', side: THREE.BackSide }));
  backdrop.position.y = -1; scene.add(backdrop);
  return { obstacles, occluders };
}
