import * as THREE from 'three';

export function createGuardBreakEffect(scene: THREE.Scene) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 16; i++) {
    const angle = i * Math.PI / 8, radius = i % 2 ? 0.075 : i % 4 ? 0.23 : 0.46;
    const x = Math.sin(angle) * radius, y = Math.cos(angle) * radius;
    if (!i) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  const material = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const flash = new THREE.Mesh(new THREE.ShapeGeometry(shape), material); flash.renderOrder = 20; flash.visible = false; scene.add(flash);
  let life = 0, audio: AudioContext | null = null;
  return {
    unlock() { audio ??= new AudioContext(); void audio.resume(); },
    emit(point: THREE.Vector3) {
      flash.position.copy(point); life = 0.22; flash.visible = true; material.opacity = 1;
      if (audio?.state === 'running') {
        const gain = audio.createGain(); gain.connect(audio.destination);
        gain.gain.setValueAtTime(0.065, audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.14);
        for (const frequency of [1100, 2370, 3910]) {
          const oscillator = audio.createOscillator(); oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.65, audio.currentTime + 0.12);
          oscillator.connect(gain); oscillator.start(); oscillator.stop(audio.currentTime + 0.14);
        }
        setTimeout(() => gain.disconnect(), 200);
      }
    },
    updateReal(dt: number, camera: THREE.Camera) {
      life = Math.max(0, life - dt); flash.visible = life > 0; flash.quaternion.copy(camera.quaternion);
      material.opacity = Math.min(1, life / 0.14); flash.scale.setScalar(1 + (0.22 - life) * 1.7);
    },
    reset() { life = 0; flash.visible = false; },
  };
}

export function createBlockSparks(scene: THREE.Scene) {
  const positions = new Float32Array(36 * 3);
  const velocity = new Float32Array(36 * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: '#ead9a9', size: 0.055, transparent: true, depthWrite: false, toneMapped: false });
  const points = new THREE.Points(geometry, material); points.visible = false; points.frustumCulled = false; scene.add(points);
  let life = 0;
  return {
    emit(position: THREE.Vector3, parry: boolean) {
      life = 0.25; points.visible = true; material.color.set(parry ? '#fff5ce' : '#d9c89c');
      for (let i = 0; i < positions.length; i += 3) {
        positions.set([position.x, position.y, position.z], i);
        const speed = parry ? 2.7 : 1.8;
        velocity.set([(Math.random() - 0.5) * speed, Math.random() * speed, (Math.random() - 0.5) * speed], i);
      }
      geometry.attributes.position.needsUpdate = true;
    },
    update(dt: number) {
      life = Math.max(0, life - dt); points.visible = life > 0;
      if (!life) return;
      for (let i = 0; i < positions.length; i += 3) {
        velocity[i + 1] -= 6 * dt;
        for (let axis = 0; axis < 3; axis++) positions[i + axis] += velocity[i + axis] * dt;
      }
      geometry.attributes.position.needsUpdate = true; material.opacity = life / 0.25;
    },
  };
}
