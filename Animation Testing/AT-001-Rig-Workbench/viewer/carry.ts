import * as THREE from 'three';

/** AT-006: derive a right-arm low carry; keep all other source tracks verbatim. */
export function createSwordCarry(root: THREE.Object3D, clips: THREE.AnimationClip[]) {
  const get = (name: string) => root.getObjectByName(name);
  const pelvis = get('pelvis'), shoulder = get('upperarm_r'), elbow = get('lowerarm_r'), hand = get('hand_r');
  const middle = get('middle_01_r'), index = get('index_01_r'), pinky = get('pinky_01_r');
  if (!pelvis || !shoulder || !elbow || !hand || !middle || !index || !pinky) return null;
  const nodes: THREE.Object3D[] = []; root.traverse(node => nodes.push(node));
  const rest = nodes.map(node => ({ node, p: node.position.clone(), q: node.quaternion.clone(), s: node.scale.clone() }));
  const restore = () => { for (const pose of rest) { pose.node.position.copy(pose.p); pose.node.quaternion.copy(pose.q); pose.node.scale.copy(pose.s); } root.updateWorldMatrix(true, true); };
  const world = (node: THREE.Object3D) => node.getWorldPosition(new THREE.Vector3());
  const setWorldRotation = (node: THREE.Object3D, rotation: THREE.Quaternion) => {
    node.quaternion.copy(node.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation));
    node.updateWorldMatrix(false, true);
  };
  const aim = (node: THREE.Object3D, child: THREE.Object3D, target: THREE.Vector3) => {
    const origin = world(node);
    const turn = new THREE.Quaternion().setFromUnitVectors(world(child).sub(origin).normalize(), target.clone().sub(origin).normalize());
    setWorldRotation(node, turn.multiply(node.getWorldQuaternion(new THREE.Quaternion())));
  };
  const armA = world(shoulder).distanceTo(world(elbow)), armB = world(elbow).distanceTo(world(hand));
  // Anatomical palm landmarks provide the grip axis, instead of arbitrary wrist axes.
  const gripAxis = index.position.clone().sub(pinky.position).normalize();
  const fingersAxis = middle.position.clone().normalize().addScaledVector(gripAxis, -middle.position.clone().normalize().dot(gripAxis)).normalize();
  const palmBasis = new THREE.Matrix4().makeBasis(gripAxis, fingersAxis, new THREE.Vector3().crossVectors(gripAxis, fingersAxis));
  const gripCenter = middle.position.clone().multiplyScalar(.64);
  const fingerNodes = nodes.filter(node => /^(index|middle|ring|pinky|thumb)_0[123]_r$/.test(node.name));
  const fingerGrip = new Map<THREE.Object3D, THREE.Quaternion>();
  const palmNormal = new THREE.Vector3().crossVectors(gripAxis, fingersAxis);
  let dorsalSign = 1;
  const tempMixer = new THREE.AnimationMixer(root);
  const gripClip = clips.find(clip => clip.name === 'Sword_Idle');
  if (gripClip) {
    tempMixer.clipAction(gripClip).play(); tempMixer.update(0);
    fingerNodes.forEach(node => fingerGrip.set(node, node.quaternion.clone()));
    root.updateWorldMatrix(true, true);
    const distal = get('middle_03_r');
    if (distal) {
      // Finger flexion identifies the palm side; the opposite surface is the
      // back of the hand. This avoids assuming a particular exported bone axis.
      const curl = hand.worldToLocal(world(distal)).sub(middle.position);
      if (Math.abs(curl.dot(palmNormal)) > .001) dorsalSign = -Math.sign(curl.dot(palmNormal));
    }
    tempMixer.stopAllAction();
  }
  restore();
  const derived = new Map<string, THREE.AnimationClip>();
  let maximumHandError = 0, maximumReachAdjustment = 0;
  for (const source of clips.filter(clip => ['Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop'].includes(clip.name))) {
    const sourceAction = tempMixer.clipAction(source); sourceAction.setLoop(THREE.LoopOnce, 1); sourceAction.clampWhenFinished = true; sourceAction.reset().play();
    const driven = [shoulder, elbow, hand, ...fingerNodes];
    const rotations = new Map(driven.map(node => [node, [] as number[]]));
    const times: number[] = [], frames = Math.ceil(source.duration * 60);
    for (let frame = 0; frame <= frames; frame++) {
      const time = frame / frames * source.duration;
      tempMixer.setTime(time); root.updateWorldMatrix(true, true);
      const body = pelvis.getWorldQuaternion(new THREE.Quaternion());
      // Follow the source arm's rhythm relative to its moving shoulder. A shorter
      // reach keeps the elbow bent instead of dragging an almost straight arm.
      const origin = world(shoulder);
      const sourceOffset = world(hand).sub(origin);
      const desired = origin.clone().add(new THREE.Vector3(
        -.12 + sourceOffset.x * .12,
        -.30 + sourceOffset.y * .06,
        -.015 + sourceOffset.z * .52,
      ));
      const direction = desired.clone().sub(origin).normalize();
      const minimumBend = THREE.MathUtils.degToRad(45);
      const maximumReach = Math.sqrt(armA * armA + armB * armB + 2 * armA * armB * Math.cos(minimumBend));
      const reach = THREE.MathUtils.clamp(origin.distanceTo(desired), Math.abs(armA - armB) + .001, maximumReach);
      const pole = new THREE.Vector3(-.25, -1, -.35); pole.addScaledVector(direction, -pole.dot(direction)).normalize();
      const along = (armA * armA + reach * reach - armB * armB) / (2 * reach);
      const bend = Math.sqrt(Math.max(0, armA * armA - along * along));
      const elbowTarget = origin.clone().addScaledVector(direction, along).addScaledVector(pole, bend);
      const target = origin.clone().addScaledVector(direction, reach);
      aim(shoulder, elbow, elbowTarget); aim(elbow, hand, target);
      maximumHandError = Math.max(maximumHandError, world(hand).distanceTo(target));
      maximumReachAdjustment = Math.max(maximumReachAdjustment, target.distanceTo(desired));
      const bladeDirection = new THREE.Vector3(-.42, 0, -.89).normalize();
      // Restrained body yaw follows the source pelvis; no freeze of spine/clavicles.
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(body);
      const yaw = Math.atan2(forward.x, forward.z) * .15;
      bladeDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      // Back of hand faces sky, palm down. The grip/socket never rotates
      // inside the fingers; the wrist/forearm carry the blade backward/outward.
      const up = new THREE.Vector3(0, dorsalSign, 0);
      const fingers = new THREE.Vector3().crossVectors(up, bladeDirection).normalize();
      const worldBasis = new THREE.Matrix4().makeBasis(bladeDirection, fingers, new THREE.Vector3().crossVectors(bladeDirection, fingers));
      setWorldRotation(hand, new THREE.Quaternion().setFromRotationMatrix(worldBasis.multiply(palmBasis.clone().invert())));
      fingerGrip.forEach((rotation, node) => node.quaternion.copy(rotation));
      times.push(time);
      for (const node of driven) rotations.get(node)!.push(...node.quaternion.toArray());
    }
    const changed = new Set(driven.map(node => `${node.name}.quaternion`));
    const tracks = source.tracks.filter(track => !changed.has(track.name)).map(track => track.clone());
    for (const node of driven) tracks.push(new THREE.QuaternionKeyframeTrack(`${node.name}.quaternion`, times, rotations.get(node)!));
    derived.set(`carry:${source.name}`, new THREE.AnimationClip(`${source.name} · low sword carry`, source.duration, tracks));
    tempMixer.stopAllAction(); restore();
  }
  tempMixer.uncacheRoot(root); restore();
  const sword = new THREE.Group(); sword.name = 'AT006_StudySword';
  sword.position.copy(gripCenter);
  sword.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), gripAxis);
  const steel = new THREE.MeshStandardMaterial({ color: '#ccd3da', metalness: .65, roughness: .34 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: '#606978', metalness: .6, roughness: .45 });
  const leather = new THREE.MeshStandardMaterial({ color: '#362721', roughness: .9 });
  const part = (geometry: THREE.BufferGeometry, material: THREE.Material, y: number) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.y = y; sword.add(mesh); return mesh;
  };
  part(new THREE.CylinderGeometry(.017, .019, .18, 10), leather, 0);
  part(new THREE.BoxGeometry(.23, .032, .04), darkSteel, .108);
  part(new THREE.SphereGeometry(.028, 12, 8), darkSteel, -.115).scale.set(1, .8, .7);
  const shape = new THREE.Shape(); shape.moveTo(-.033, .128); shape.lineTo(.033, .128); shape.lineTo(.024, .83); shape.lineTo(0, .97); shape.lineTo(-.024, .83); shape.closePath();
  const blade = new THREE.ExtrudeGeometry(shape, { depth: .009, bevelEnabled: true, bevelThickness: .002, bevelSize: .002, bevelSegments: 1, steps: 1 });
  blade.translate(0, 0, -.0045); part(blade, steel, 0);
  hand.add(sword); sword.visible = false;
  return { clips: derived, sword, maximumHandError, maximumReachAdjustment, tip: () => sword.localToWorld(new THREE.Vector3(0, .97, 0)), grip: () => sword.getWorldPosition(new THREE.Vector3()), backOfHand: () => palmNormal.clone().multiplyScalar(dorsalSign).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion())), socket: () => ({ position: sword.position.toArray(), rotation: sword.quaternion.toArray() }) };
}
