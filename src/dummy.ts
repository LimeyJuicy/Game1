import * as THREE from 'three';

/** Passive test fixture. No enemy AI, attacks, rewards, or execution logic. */
export function createDummy(scene: THREE.Scene) {
  const root = new THREE.Group(); root.position.set(-6, 0, 2); scene.add(root);
  const wood = new THREE.MeshToonMaterial({ color: '#584533' });
  const sack = new THREE.MeshToonMaterial({ color: '#b8a378' });
  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, y: number) {
    const object = new THREE.Mesh(geometry, material); object.position.y = y;
    object.castShadow = true; object.receiveShadow = true; root.add(object); return object;
  }
  mesh(new THREE.CylinderGeometry(0.1, 0.13, 1.8, 8), wood, 0.9);
  const torso = mesh(new THREE.SphereGeometry(0.5, 10, 8), sack, 1.2); torso.scale.set(0.9, 1.1, 0.8);
  mesh(new THREE.SphereGeometry(0.24, 8, 6), sack, 1.9);
  const bar = mesh(new THREE.BoxGeometry(1.4, 0.13, 0.13), wood, 1.45);
  bar.rotation.z = 0.05;
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.82, 0.86, 40), new THREE.MeshBasicMaterial({ color: '#c9ae74', side: THREE.DoubleSide, transparent: true, opacity: 0.65 }));
  marker.rotation.x = -Math.PI / 2; marker.position.y = 0.03; root.add(marker);
  const center = root.position.clone(); center.y = 1.2;
  let health = 100, hits = 0, resetAt = Infinity, flash = 0;
  return {
    root, center, radius: 0.55,
    obstacle: { x: root.position.x, z: root.position.z, halfX: 0.42, halfZ: 0.36 },
    get health() { return health; }, get hits() { return hits; },
    damage(amount: number, time: number) {
      if (health <= 0) return;
      health = Math.max(0, health - amount); hits++; flash = 1;
      if (!health) resetAt = time + 2;
    },
    update(dt: number, time: number) {
      if (time >= resetAt) { health = 100; resetAt = Infinity; }
      flash = Math.max(0, flash - dt * 5);
      sack.color.set('#b8a378').lerp(new THREE.Color('#f7dfb1'), flash);
      torso.rotation.z = Math.sin(time * 25) * flash * 0.06;
      root.scale.y = THREE.MathUtils.lerp(root.scale.y, health > 0 ? 1 : 0.6, 1 - Math.exp(-8 * dt));
    },
  };
}
