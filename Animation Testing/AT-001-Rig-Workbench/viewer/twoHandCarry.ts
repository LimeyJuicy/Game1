import * as T from 'three';

/** AT-011: a rigid shared grip above the right shoulder on the fitted knight.
 * Source legs/trunk remain intact. Both arms are solved to one sword transform,
 * then baked; the sword is owned by the right hand, with a fixed local socket.
 */
export function createTwoHandCarry(root: T.Object3D, clips: T.AnimationClip[], sword: T.Object3D) {
  const required = (name: string) => {
    const node = root.getObjectByName(name);
    if (!node) throw new Error(`Two-hand carry needs ${name}`);
    return node;
  };
  const chest = required('spine_03');
  const nodes: T.Object3D[] = []; root.traverse(node => nodes.push(node));
  const rest = nodes.map(node => ({ node, p: node.position.clone(), q: node.quaternion.clone(), s: node.scale.clone() }));
  const world = (node: T.Object3D) => node.getWorldPosition(new T.Vector3());
  const rotation = (node: T.Object3D) => node.getWorldQuaternion(new T.Quaternion());
  const setWorldRotation = (node: T.Object3D, q: T.Quaternion) => {
    node.quaternion.copy(rotation(node.parent!).invert().multiply(q));
    node.updateWorldMatrix(false, true);
  };
  const restore = () => {
    for (const p of rest) { p.node.position.copy(p.p); p.node.quaternion.copy(p.q); p.node.scale.copy(p.s); }
    root.updateWorldMatrix(true, true);
  };
  root.updateWorldMatrix(true, true);
  const chestRest = rotation(chest), chestOrigin = world(chest);
  const swordScale = .54;
  const axis = new T.Vector3(-.38, .16, -.912).normalize();
  const sx = new T.Vector3(1, 0, 0).addScaledVector(axis, -axis.x).normalize();
  const swordRestRotation = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(sx, axis, new T.Vector3().crossVectors(sx, axis)));
  const rightGripY = .045, leftGripY = -.16;
  const rightGrip = new T.Vector3(-.075, .840, .045);
  const gripChestOffset = rightGrip.clone().sub(chestOrigin);
  const arms = (['r', 'l'] as const).map(side => {
    const upper = required(`upperarm_${side}`), elbow = required(`lowerarm_${side}`), hand = required(`hand_${side}`);
    const middle = required(`middle_01_${side}`), index = required(`index_01_${side}`), pinky = required(`pinky_01_${side}`);
    const gripAxis = index.position.clone().sub(pinky.position).normalize();
    const fingers = middle.position.clone().normalize(); fingers.addScaledVector(gripAxis, -fingers.dot(gripAxis)).normalize();
    const palm = new T.Vector3().crossVectors(gripAxis, fingers).normalize();
    const palmFrame = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(gripAxis, fingers, palm));
    // Handle center inside the curved palm, not at the wrist joint.
    const center = middle.position.clone().multiplyScalar(.48).addScaledVector(palm, .006);
    // Opposing palms wrap opposite sides of the same handle.
    const normal = sx.clone().multiplyScalar(side === 'r' ? 1 : -1);
    const desiredFingers = new T.Vector3().crossVectors(normal, axis).normalize();
    const handQ = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(axis, desiredFingers, normal)).multiply(palmFrame.invert());
    const fingerNodes = nodes.filter(n => new RegExp(`^(index|middle|ring|pinky|thumb)_0[123]_${side}$`).test(n.name));
    return { side, upper, elbow, hand, center, handQ, palm, fingerNodes,
      upperQ: rotation(upper), elbowQ: rotation(elbow),
      a: world(upper).distanceTo(world(elbow)), b: world(elbow).distanceTo(world(hand)),
      gripY: side === 'r' ? rightGripY : leftGripY };
  });
  const aim = (node: T.Object3D, child: T.Object3D, target: T.Vector3) => {
    const p = world(node);
    const turn = new T.Quaternion().setFromUnitVectors(world(child).sub(p).normalize(), target.clone().sub(p).normalize());
    setWorldRotation(node, turn.multiply(rotation(node)));
  };
  const mixer = new T.AnimationMixer(root);
  const derived = new Map<string, T.AnimationClip>();
  const driven = arms.flatMap(a => [a.upper, a.elbow, a.hand, ...a.fingerNodes]);
  const fingerRest = new Map(rest.filter(p => driven.includes(p.node)).map(p => [p.node, p.q]));
  let maximumHandError = 0, maximumReachAdjustment = 0;
  const sourceNames = ['Idle_Loop', 'Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop'];
  for (const source of clips.filter(c => sourceNames.includes(c.name))) {
    const action = mixer.clipAction(source); action.setLoop(T.LoopOnce, 1); action.clampWhenFinished = true; action.reset().play();
    const samples = new Map(driven.map(node => [node, [] as number[]]));
    const times: number[] = [], frames = Math.ceil(source.duration * 60);
    for (let frame = 0; frame <= frames; frame++) {
      const time = frame / frames * source.duration;
      mixer.setTime(time); root.updateWorldMatrix(true, true);
      const delta = rotation(chest).multiply(chestRest.clone().invert());
      // Carry position follows chest bob/lean. Blade heading follows torso yaw,
      // keeping the sword laid back instead of pitching upright in a sprint.
      const forward = new T.Vector3(0, 0, 1).applyQuaternion(delta);
      const heldDelta = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.atan2(forward.x, forward.z));
      const blade = axis.clone().applyQuaternion(heldDelta);
      const origin = gripChestOffset.clone().applyQuaternion(delta).add(world(chest)).addScaledVector(blade, -rightGripY * swordScale);
      for (const arm of arms) {
        const desiredQ = heldDelta.clone().multiply(arm.handQ);
        const grip = origin.clone().addScaledVector(blade, arm.gripY * swordScale);
        const target = grip.clone().sub(arm.center.clone().applyQuaternion(desiredQ));
        const shoulder = world(arm.upper), direction = target.clone().sub(shoulder).normalize();
        const distance = target.distanceTo(shoulder), reach = T.MathUtils.clamp(distance, Math.abs(arm.a - arm.b) + .002, (arm.a + arm.b) * .985);
        maximumReachAdjustment = Math.max(maximumReachAdjustment, Math.abs(distance - reach));
        const pole = new T.Vector3(arm.side === 'r' ? -.65 : .65, -.85, .3).applyQuaternion(delta);
        pole.addScaledVector(direction, -pole.dot(direction)).normalize();
        const along = (arm.a * arm.a + reach * reach - arm.b * arm.b) / (2 * reach);
        const elbowTarget = shoulder.clone().addScaledVector(direction, along).addScaledVector(pole, Math.sqrt(Math.max(0, arm.a * arm.a - along * along)));
        const wrist = shoulder.clone().addScaledVector(direction, reach);
        setWorldRotation(arm.upper, delta.clone().multiply(arm.upperQ));
        setWorldRotation(arm.elbow, delta.clone().multiply(arm.elbowQ));
        aim(arm.upper, arm.elbow, elbowTarget); aim(arm.elbow, arm.hand, wrist);
        setWorldRotation(arm.hand, desiredQ);
        for (const finger of arm.fingerNodes) finger.quaternion.copy(fingerRest.get(finger)!);
        root.updateWorldMatrix(true, true);
        maximumHandError = Math.max(maximumHandError, arm.hand.localToWorld(arm.center.clone()).distanceTo(grip));
      }
      times.push(time);
      for (const node of driven) samples.get(node)!.push(...node.quaternion.toArray());
    }
    const changed = new Set(driven.map(n => `${n.name}.quaternion`));
    const tracks = source.tracks.filter(t => !changed.has(t.name)).map(t => t.clone());
    for (const node of driven) tracks.push(new T.QuaternionKeyframeTrack(`${node.name}.quaternion`, times, samples.get(node)!));
    derived.set(`carry:${source.name}`, new T.AnimationClip(`${source.name} · two-hand shoulder carry`, source.duration, tracks));
    mixer.stopAllAction(); restore();
  }
  mixer.uncacheRoot(root); restore();
  const right = arms[0], left = arms[1];
  sword.name = 'PlayerSword_TwoHandShoulder'; sword.scale.setScalar(swordScale);
  sword.quaternion.copy(right.handQ.clone().invert().multiply(swordRestRotation));
  sword.position.copy(right.center).addScaledVector(new T.Vector3(0, 1, 0).applyQuaternion(sword.quaternion), -rightGripY * swordScale);
  right.hand.add(sword); sword.visible = false;
  root.updateWorldMatrix(true, true);
  return {
    clips: derived, sword, maximumHandError, maximumReachAdjustment,
    tip: () => sword.localToWorld(new T.Vector3(0, 1.478455, 0)),
    grip: () => sword.localToWorld(new T.Vector3(0, rightGripY, 0)),
    backOfHand: () => right.palm.clone().negate().applyQuaternion(rotation(right.hand)),
    socket: () => ({ position: sword.position.toArray(), rotation: sword.quaternion.toArray() }),
    gripErrors: () => ({
      right: right.hand.localToWorld(right.center.clone()).distanceTo(sword.localToWorld(new T.Vector3(0, rightGripY, 0))),
      left: left.hand.localToWorld(left.center.clone()).distanceTo(sword.localToWorld(new T.Vector3(0, leftGripY, 0))),
    }),
    scale: swordScale, gripSpacing: (rightGripY - leftGripY) * swordScale,
  };
}
