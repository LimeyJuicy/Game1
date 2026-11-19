import * as THREE from 'three';

const angleDelta = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

/** Follow behind the knight, orbit around obstructions, fade walls as a last resort. */
export class FollowCamera {
  yaw = 0;
  private target = new THREE.Vector3();
  private ray = new THREE.Raycaster();
  private offset = new THREE.Vector3();
  private origin = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private fades = new Map<THREE.Material, { opacity: number; depthWrite: boolean }>();
  private lastMovementHeading = 0;
  private initialized = false;
  private stepBlend = 0;
  private focusBlend = 0;
  private distance = 7.2;
  private height = 2.4;
  private camera: THREE.PerspectiveCamera;
  private occluders: THREE.Object3D[];

  constructor(camera: THREE.PerspectiveCamera, occluders: THREE.Object3D[]) {
    this.camera = camera;
    this.occluders = occluders;
    // World meshes share materials; each needs independent occlusion fading.
    for (const object of occluders) object.traverse(child => {
      if (!(child instanceof THREE.Mesh || child instanceof THREE.LineSegments)) return;
      child.material = Array.isArray(child.material) ? child.material.map(material => material.clone()) : child.material.clone();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        this.fades.set(material, { opacity: material.opacity, depthWrite: material.depthWrite });
        material.transparent = true;
      }
    });
  }

  private blockers(yaw: number): { clear: boolean; objects: Set<THREE.Object3D> } {
    const objects = new Set<THREE.Object3D>();
    this.offset.set(Math.sin(yaw) * this.distance, this.height, Math.cos(yaw) * this.distance);
    this.direction.copy(this.offset).normalize();
    // Multiple probes provide clearance for the near plane, not just a pencil ray.
    for (const [x, y, z] of [[0, 0, 0], [0.25, 0, 0], [-0.25, 0, 0], [0, 0.25, 0], [0, 0, 0.25], [0, 0, -0.25]]) {
      this.origin.copy(this.target).add(new THREE.Vector3(x, y, z));
      this.ray.set(this.origin, this.direction);
      this.ray.far = this.offset.length() + 0.3;
      for (const hit of this.ray.intersectObjects(this.occluders, false)) objects.add(hit.object);
    }
    return { clear: objects.size === 0, objects };
  }

  update(position: THREE.Vector3, facing: number, moving: boolean, engaged: boolean, dt: number, snap = false, motion = { distance: 0, speed: 0 }, focus: THREE.Vector3 | null = null, nearby: readonly THREE.Vector3[] = [], cinematic = 0) {
    // Update matrices before collision queries, including on the very first frame.
    for (const object of this.occluders) object.updateWorldMatrix(true, false);
    const anchor = position.clone(); anchor.y += 1.1;
    const crowd = engaged && nearby.length > 1 && cinematic < 0.1;
    const spread = crowd ? Math.max(...nearby.map(target => target.distanceTo(position))) : 0;
    const extra = crowd ? Math.min(4, spread * 0.6 + (nearby.length - 1) * 0.4) : 0;
    const framingBlend = snap ? 1 : 1 - Math.exp(-3 * dt);
    this.distance = THREE.MathUtils.lerp(this.distance, 7.2 + extra - cinematic * 2, framingBlend);
    this.height = THREE.MathUtils.lerp(this.height, 2.4 + extra * 0.25 - cinematic * 0.45, framingBlend);
    if (crowd) {
      const center = new THREE.Vector3();
      for (const target of nearby) center.add(target);
      center.multiplyScalar(1 / nearby.length).sub(position); center.y = 0;
      center.clampLength(0, 2); anchor.addScaledVector(center, 0.3);
    }
    this.focusBlend = THREE.MathUtils.lerp(this.focusBlend, focus ? 1 : 0, snap ? 1 : 1 - Math.exp(-6 * dt));
    if (focus) {
      const framing = focus.clone().sub(position); framing.y = 0;
      framing.clampLength(0, 4); anchor.addScaledVector(framing, 0.25 * this.focusBlend);
    }
    if (snap || !this.initialized) { this.target.copy(anchor); this.initialized = true; }
    else this.target.lerp(anchor, 1 - Math.exp(-12 * dt));
    if (moving && !engaged) this.lastMovementHeading = facing;
    const focusYaw = focus ? Math.atan2(position.x - focus.x, position.z - focus.z) : this.lastMovementHeading;
    const preferred = this.lastMovementHeading + angleDelta(this.lastMovementHeading, focusYaw) * this.focusBlend + cinematic * 0.4;
    let bestYaw = this.yaw;
    let bestScore = Infinity;
    // Keep the current angle among candidates to avoid flipping sides near a corner.
    const candidates = [this.yaw, ...[0, 25, -25, 50, -50, 80, -80, 110, -110, 145, -145, 180].map(degrees => preferred + THREE.MathUtils.degToRad(degrees))];
    for (const candidate of candidates) {
      const { clear, objects } = this.blockers(candidate);
      const score = (clear ? 0 : 10 + objects.size) + Math.abs(angleDelta(preferred, candidate)) + 0.4 * Math.abs(angleDelta(this.yaw, candidate));
      if (score < bestScore) { bestScore = score; bestYaw = candidate; }
    }
    const amount = snap ? 1 : 1 - Math.exp(-3 * dt);
    this.yaw += angleDelta(this.yaw, bestYaw) * amount;
    const blocked = this.blockers(this.yaw).objects;
    this.offset.set(Math.sin(this.yaw) * this.distance, this.height, Math.cos(this.yaw) * this.distance);
    this.camera.position.copy(this.target).add(this.offset);
    this.stepBlend = THREE.MathUtils.lerp(this.stepBlend, engaged ? 0 : Math.min(1, motion.speed / 4.2), snap ? 1 : 1 - Math.exp(-8 * dt));
    // Distance-driven and under three centimetres: an understated footstep rhythm.
    const phase = motion.distance * 3.5;
    const bob = Math.cos(phase * 2) * 0.022 * this.stepBlend;
    const sway = Math.sin(phase) * 0.012 * this.stepBlend;
    const stepOffset = new THREE.Vector3(Math.cos(this.yaw) * sway, bob, -Math.sin(this.yaw) * sway);
    this.camera.position.add(stepOffset);
    this.camera.lookAt(this.target.clone().addScaledVector(stepOffset, 0.35));

    // During the orbit, or in a confined corner, fade the obstruction instead of
    // pushing the camera into the knight. Restore it as soon as the view clears.
    const faded = new Set<THREE.Material>();
    for (const object of blocked) object.traverse(child => {
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        for (const material of Array.isArray(child.material) ? child.material : [child.material]) faded.add(material);
      }
    });
    for (const [material, original] of this.fades) {
      const obstructing = faded.has(material);
      const wanted = obstructing ? original.opacity * 0.12 : original.opacity;
      // Clear an obstruction immediately; restore scenery gently afterward.
      material.opacity = obstructing || snap ? wanted : THREE.MathUtils.lerp(material.opacity, wanted, 1 - Math.exp(-6 * dt));
      material.depthWrite = material.opacity >= original.opacity * 0.98 ? original.depthWrite : false;
    }
  }
}
