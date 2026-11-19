import * as THREE from 'three';

export const LEG_STUDY = { duration: 1.45, stance: .66, contactEnd: .14, rollStart: .52, samples: 200 };
const wrap = (value: number) => ((value % 1) + 1) % 1;
const ease = (value: number) => { const t = THREE.MathUtils.clamp(value, 0, 1); return t ** 3 * (10 - 15 * t + 6 * t * t); };
const lerp = THREE.MathUtils.lerp;
function hermite(a: number, b: number, m: number, t: number) {
  // Match both support velocity and zero support acceleration at each end.
  return a + m * t + (b - a - m) * ease(t);
}
export interface FootCalibration { height: number; toe: number; heel: number; stride: number; clearance: number }
/** Forward is -Z. During stance a moving root cancels the backward local foot motion. */
export function sampleFoot(phase: number, config: FootCalibration) {
  const p = wrap(phase), stance = p < LEG_STUDY.stance;
  const heelPitch = THREE.MathUtils.degToRad(8), pushPitch = THREE.MathUtils.degToRad(-18);
  const { stance: support, contactEnd, rollStart } = LEG_STUDY;
  const swing = 1 - support;
  let pitch = 0;
  if (p < contactEnd) pitch = heelPitch * (1 - ease(p / contactEnd));
  else if (p < support) pitch = pushPitch * ease((p - rollStart) / (support - rollStart));
  else {
    const u = (p - support) / swing;
    pitch = u < .55 ? lerp(pushPitch, 0, ease(u / .55)) : lerp(0, heelPitch, ease((u - .55) / .45));
  }
  const pivot = p < contactEnd || p >= support + swing * .55 ? config.heel : config.toe;
  const pivotOffset = (angle: number, z: number) => z - (-config.height * Math.sin(angle) + z * Math.cos(angle));
  const contactHeight = (angle: number, z: number) => config.height * Math.cos(angle) + z * Math.sin(angle);
  let z: number, y: number;
  if (stance) {
    z = -config.stride * support / 2 + config.stride * p + pivotOffset(pitch, pivot);
    y = contactHeight(pitch, pivot);
  } else {
    const u = (p - support) / swing;
    const start = config.stride * support / 2 + pivotOffset(pushPitch, config.toe);
    const end = -config.stride * support / 2 + pivotOffset(heelPitch, config.heel);
    z = hermite(start, end, config.stride * swing, u);
    const floorHeight = Math.max(contactHeight(pitch, config.heel), contactHeight(pitch, config.toe));
    // Stay low just after toe-off, then recover forward in a shallow late arc.
    const peak = 4 / 7;
    const clearance = u ** 4 * (1 - u) ** 3 / (peak ** 4 * (1 - peak) ** 3);
    y = floorHeight + clearance * config.clearance;
  }
  const phaseName = p < .03 ? 'Heel contact' : p < contactEnd ? 'Weight acceptance' : p < .5 ? 'Support / extension'
    : p < rollStart ? 'Trailing extension' : p < .61 ? 'Heel rise' : p < support ? 'Push-off' : p < .85 ? 'Low recovery' : 'Reach / landing';
  const releaseEnd = support + swing * .4;
  const toePitch = stance && p > rollStart ? -pitch : p >= support && p < releaseEnd ? -pushPitch * (1 - ease((p - support) / (releaseEnd - support))) : 0;
  return { phase: p, phaseName, stance, pitch, toePitch, z, y, contactOffset: -config.height * Math.sin(pitch) + pivot * Math.cos(pitch) };
}

export function createLegStudy(root: THREE.Object3D) {
  const find = (suffix: string) => {
    let found: THREE.Object3D | null = null;
    root.traverse(object => { if (object.name.replace(/[^a-z0-9]/gi, '').toLowerCase().endsWith(suffix.toLowerCase())) found = object; });
    return found as THREE.Object3D | null;
  };
  const hips = find('Hips');
  const sides = ['Left', 'Right'].map(side => ({ side, thigh: find(`${side}UpLeg`), shin: find(`${side}Leg`), foot: find(`${side}Foot`), toe: find(`${side}ToeBase`) }));
  if (!hips || sides.some(leg => !leg.thigh || !leg.shin || !leg.foot || !leg.toe)) return null;
  root.updateWorldMatrix(true, true);
  const nodes: THREE.Object3D[] = []; root.traverse(object => nodes.push(object));
  const baseline = nodes.map(node => ({ node, position: node.position.clone(), rotation: node.quaternion.clone(), scale: node.scale.clone() }));
  const restore = () => { for (const pose of baseline) { pose.node.position.copy(pose.position); pose.node.quaternion.copy(pose.rotation); pose.node.scale.copy(pose.scale); } root.updateWorldMatrix(true, true); };
  const hipOrigin = hips.getWorldPosition(new THREE.Vector3());
  const hipRotation = hips.getWorldQuaternion(new THREE.Quaternion());
  const legs = sides.map(leg => {
    const thigh = leg.thigh!, shin = leg.shin!, foot = leg.foot!, toe = leg.toe!;
    const thighWorld = thigh.getWorldPosition(new THREE.Vector3()), kneeWorld = shin.getWorldPosition(new THREE.Vector3());
    const ankle = foot.getWorldPosition(new THREE.Vector3()), toeWorld = toe.getWorldPosition(new THREE.Vector3());
    return { side: leg.side, thigh, shin, foot, toe, ankle, a: thighWorld.distanceTo(kneeWorld), b: kneeWorld.distanceTo(ankle),
      footRotation: foot.getWorldQuaternion(new THREE.Quaternion()), toeRotation: toe.getWorldQuaternion(new THREE.Quaternion()), toeZ: toeWorld.z - ankle.z };
  });
  const length = (legs[0].a + legs[0].b + legs[1].a + legs[1].b) / 2;
  const stride = length * 1.22, speed = stride / LEG_STUDY.duration;
  const calibration = (index: number): FootCalibration => ({ height: legs[index].ankle.y, toe: legs[index].toeZ, heel: length * .065, stride, clearance: length * .065 });
  const animated = [hips, ...legs.flatMap(leg => [leg.thigh, leg.shin, leg.foot, leg.toe])];
  const times: number[] = [], positions: number[] = [], rotations = new Map(animated.map(node => [node, [] as number[]]));
  const axis = new THREE.Vector3(1, 0, 0);
  function worldRotation(node: THREE.Object3D, desired: THREE.Quaternion) {
    const parent = node.parent!.getWorldQuaternion(new THREE.Quaternion());
    node.quaternion.copy(parent.invert().multiply(desired)); node.updateWorldMatrix(false, true);
  }
  function aim(node: THREE.Object3D, child: THREE.Object3D, target: THREE.Vector3) {
    const origin = node.getWorldPosition(new THREE.Vector3());
    const old = child.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
    const next = target.clone().sub(origin).normalize();
    worldRotation(node, new THREE.Quaternion().setFromUnitVectors(old, next).multiply(node.getWorldQuaternion(new THREE.Quaternion())));
  }
  let maximumReachError = 0;
  const supportAngles: number[] = [];
  let contactHeight = hipOrigin.y;
  const softMinimum = (a: number, b: number) => Math.min(a, b) - length * .003 * Math.log1p(Math.exp(-Math.abs(a - b) / (length * .003)));
  const smoothPositive = (value: number) => {
    const width = length * .001;
    if (value <= 0) return 0;
    if (value >= width) return value;
    const t = value / width;
    return width * t ** 3 * (6 - 8 * t + 3 * t * t);
  };
  for (let frame = 0; frame <= LEG_STUDY.samples; frame++) {
    restore(); const phase = frame === LEG_STUDY.samples ? 0 : frame / LEG_STUDY.samples;
    const pelvis = hipOrigin.clone();
    pelvis.x -= Math.sin((phase - .035) * Math.PI * 2) * length * .021;
    hips.position.copy(hips.parent!.worldToLocal(pelvis.clone())); root.updateWorldMatrix(true, true);
    const yaw = -THREE.MathUtils.degToRad(4.5) * Math.cos((phase + .015) * Math.PI * 2);
    const roll = -THREE.MathUtils.degToRad(1.6) * Math.sin((phase - .035) * Math.PI * 2);
    worldRotation(hips, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll)).multiply(hipRotation));
    const samples = legs.map((_, index) => sampleFoot(phase + index * .5, calibration(index)));
    const targets = legs.map((leg, index) => new THREE.Vector3(leg.ankle.x, samples[index].y, leg.ankle.z + samples[index].z));
    // Let support geometry set hip height: extend over the planted leg rather
    // than forcing every frame into the old uniformly lowered/crouched pelvis.
    const heightBounds = legs.map((leg, index) => {
      const origin = leg.thigh.getWorldPosition(new THREE.Vector3()), target = targets[index];
      const horizontal = (target.x - origin.x) ** 2 + (target.z - origin.z) ** 2;
      const reach = leg.a + leg.b - length * .0007;
      return target.y + Math.sqrt(Math.max(.001, reach ** 2 - horizontal)) - (origin.y - hipOrigin.y);
    });
    const distanceToLoad = (offset: number) => (wrap(phase - offset + .5) - .5) / .055;
    const load = Math.exp(-.5 * distanceToLoad(.055) ** 2) + Math.exp(-.5 * distanceToLoad(.555) ** 2);
    if (frame === 0) contactHeight = Math.min(...heightBounds);
    const stepPhase = wrap(phase * 2);
    // Rise into support and carry the extended leg through a broad passing
    // interval, then settle into the next contact instead of dipping twice.
    const carry = stepPhase < .4 ? ease(stepPhase / .4) : stepPhase < .7 ? 1 : 1 - ease((stepPhase - .7) / .3);
    const desiredHeight = lerp(contactHeight, hipOrigin.y, carry);
    const constraints = heightBounds.map((bound, i) => {
      const sample = samples[i];
      const weight = sample.stance ? 1 : sample.phase < .72 ? 1 - ease((sample.phase - LEG_STUDY.stance) / (.72 - LEG_STUDY.stance))
        : ease((sample.phase - .94) / .06);
      return lerp(hipOrigin.y + length * .25, bound, weight);
    });
    pelvis.y = softMinimum(desiredHeight, softMinimum(constraints[0], constraints[1])) - length * (.001 + .003 * load);
    hips.position.copy(hips.parent!.worldToLocal(pelvis.clone())); root.updateWorldMatrix(true, true);
    for (const [index, leg] of legs.entries()) {
      const sample = samples[index], target = targets[index];
      const origin = leg.thigh.getWorldPosition(new THREE.Vector3());
      if (!sample.stance) {
        // A recovering foot must fold under the supporting hip, not drag that
        // hip down just to satisfy an arbitrary low swing target.
        const horizontal = (target.x - origin.x) ** 2 + (target.z - origin.z) ** 2;
        const maximum = leg.a + leg.b - length * .0015;
        const reachableY = origin.y - Math.sqrt(Math.max(.001, maximum ** 2 - horizontal));
        target.y += smoothPositive(reachableY - target.y);
      }
      const direction = target.clone().sub(origin), reach = direction.length(); direction.normalize();
      const distance = THREE.MathUtils.clamp(reach, Math.abs(leg.a - leg.b) + .001, leg.a + leg.b - length * .0005);
      const forward = new THREE.Vector3(0, 0, -1).addScaledVector(direction, direction.z).normalize();
      const along = (leg.a ** 2 + distance ** 2 - leg.b ** 2) / (2 * distance);
      const bend = Math.sqrt(Math.max(0, leg.a ** 2 - along ** 2));
      const knee = origin.clone().addScaledVector(direction, along).addScaledVector(forward, bend);
      aim(leg.thigh, leg.shin, knee); aim(leg.shin, leg.foot, target);
      worldRotation(leg.foot, new THREE.Quaternion().setFromAxisAngle(axis, sample.pitch).multiply(leg.footRotation));
      worldRotation(leg.toe, new THREE.Quaternion().setFromAxisAngle(axis, sample.pitch + sample.toePitch).multiply(leg.toeRotation));
      maximumReachError = Math.max(maximumReachError, leg.foot.getWorldPosition(new THREE.Vector3()).distanceTo(target));
      if (sample.stance && sample.phase > .2 && sample.phase < .48) supportAngles.push(THREE.MathUtils.radToDeg(Math.PI - Math.acos(THREE.MathUtils.clamp((leg.a ** 2 + leg.b ** 2 - reach ** 2) / (2 * leg.a * leg.b), -1, 1))));
    }
    times.push(frame / LEG_STUDY.samples * LEG_STUDY.duration); positions.push(...hips.position.toArray());
    for (const [node, values] of rotations) values.push(...node.quaternion.toArray());
  }
  const tracks: THREE.KeyframeTrack[] = [new THREE.VectorKeyframeTrack(`${hips.name}.position`, times, positions)];
  for (const [node, values] of rotations) tracks.push(new THREE.QuaternionKeyframeTrack(`${node.name}.quaternion`, times, values));
  restore();
  return {
    clip: new THREE.AnimationClip('AT-003 v2 · Flow and extension', LEG_STUDY.duration, tracks), speed, stride, maximumReachError,
    minimumSupportKneeBend: Math.min(...supportAngles),
    extendedSupportFraction: supportAngles.filter(angle => angle < 15).length / supportAngles.length,
    pelvisPose() { return { position: hips.getWorldPosition(new THREE.Vector3()).toArray(), rotation: hips.quaternion.toArray() }; },
    waist: hipOrigin.y + length * .07, legHeight: hipOrigin.y,
    sample(time: number) { return legs.map((leg, i) => ({ side: leg.side, ...sampleFoot(time / LEG_STUDY.duration + i * .5, calibration(i)), ankle: leg.foot.getWorldPosition(new THREE.Vector3()).toArray(), knee: leg.shin.getWorldPosition(new THREE.Vector3()).toArray(), hip: leg.thigh.getWorldPosition(new THREE.Vector3()).toArray() })); },
    upperPose() { return baseline.filter(pose => !animated.includes(pose.node)).map(pose => ({ name: pose.node.name, rotation: pose.node.quaternion.toArray() })); },
  };
}
