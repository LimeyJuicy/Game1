import * as T from 'three';
import type { LegRig, LowerBodySolution } from '../../../src/footwork/legs.ts';
import { createTwoHandCarry } from '../../AT-001-Rig-Workbench/viewer/twoHandCarry.ts';

const position = (n: T.Object3D) => n.getWorldPosition(new T.Vector3());
const rotation = (n: T.Object3D) => n.getWorldQuaternion(new T.Quaternion());
function frame(up: T.Vector3, forward = new T.Vector3(0, 0, -1)) {
  const y = up.clone().normalize(), z = forward.clone().addScaledVector(y, -forward.dot(y)).normalize().negate();
  return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3().crossVectors(y, z), y, z));
}
function setWorldRotation(n: T.Object3D, q: T.Quaternion) {
  n.quaternion.copy(rotation(n.parent!).invert().multiply(q)); n.updateWorldMatrix(false, true);
}

/** AT-012: convert PR #1's metric foot constraints to the imported model's bind axes.
 * Forward is -Z in the bench. The imported knight faces +Z and is 1 unit tall,
 * so its presentation parent turns 180 degrees and scales to 1.8 metres.
 * Actual measured segment lengths drive the solver; no leg bone is stretched.
 */
export function createImportedKnight(model: T.Object3D, clips: T.AnimationClip[], sword: T.Object3D) {
  // Derive the normalized carry before introducing metric scale or bench facing.
  const carry = createTwoHandCarry(model, clips, sword);
  const root = new T.Group(); root.name = 'ImportedKnightFootwork';
  const presentation = new T.Group(); presentation.rotation.y = Math.PI; presentation.scale.setScalar(1.8); root.add(presentation); presentation.add(model);
  root.updateWorldMatrix(true, true);
  const get = (name: string) => { const n = model.getObjectByName(name); if (!n) throw new Error(`Footwork model needs ${name}`); return n; };
  const pelvis = get('pelvis'), pelvisRest = rotation(pelvis), pelvisOrigin = position(pelvis);
  const legs = (['l', 'r'] as const).map(side => {
    const hip = get(`thigh_${side}`), knee = get(`calf_${side}`), ankle = get(`foot_${side}`), toe = get(`ball_${side}`);
    return { hip, knee, ankle, toe,
      thigh: position(hip).distanceTo(position(knee)), shin: position(knee).distanceTo(position(ankle)),
      hipOffset: position(hip).sub(pelvisOrigin), ankleOrigin: position(ankle),
      thighCorrection: frame(position(hip).sub(position(knee))).invert().multiply(rotation(hip)),
      shinCorrection: frame(position(knee).sub(position(ankle))).invert().multiply(rotation(knee)),
      ankleRest: rotation(ankle), toeRest: rotation(toe), toeOrigin: position(toe),
    };
  });
  const measurements: LegRig = {
    hipHalfWidth: Math.abs(legs[0].hipOffset.x), hipDrop: -legs[0].hipOffset.y,
    pelvisRest: pelvisOrigin.y, thigh: legs[0].thigh, shin: legs[0].shin,
    ankleHeight: legs[0].ankleOrigin.y, heel: .06,
    ball: legs[0].toeOrigin.z - legs[0].ankleOrigin.z, minHipHeight: .5,
  };
  const spine = ['spine_01', 'spine_02', 'spine_03'].map(get), head = get('Head');
  const mixer = new T.AnimationMixer(model), idle = carry.clips.get('carry:Idle_Loop');
  if (!idle) throw new Error('Imported knight needs Idle_Loop for shoulder carry');
  const idleAction = mixer.clipAction(idle); idleAction.play(); carry.sword.visible = true;
  model.traverse(n => { if (n instanceof T.Mesh) { n.castShadow = true; n.receiveShadow = true; n.frustumCulled = false; } });
  let ankleError = 0, maximumGripError = 0;
  const update = (solution: LowerBodySolution, time: number) => {
    // Mixer caches unchanged samples. Restore/re-activate before applying an
    // absolute pose, so a paused frame cannot accumulate our post-mixer edits.
    mixer.stopAllAction(); idleAction.reset().play();
    mixer.setTime(time); root.updateWorldMatrix(true, true);
    const rootQ = rotation(root);
    const upper = [...spine, head], sourceWorld = upper.map(rotation);
    pelvis.position.copy(pelvis.parent!.worldToLocal(root.localToWorld(solution.pelvisPosition.clone())));
    setWorldRotation(pelvis, rootQ.clone().multiply(solution.pelvisQuaternion).multiply(pelvisRest));
    // Source spine keys compensate the source pelvis lean. Replacing that
    // pelvis while reusing local spine keys would arch the chest/head backward.
    // Carry source upper-body WORLD poses into the stance, distributing the
    // pelvis counter-turn across the spine and keeping the head nearly forward.
    const counterTurn = [.16, .30, .40, .90];
    upper.forEach((node, i) => {
      const stanceDelta = i === 3
        ? new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), solution.pelvisYaw * .1)
        : new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), -solution.pelvisYaw * counterTurn[i]).multiply(solution.pelvisQuaternion);
      const worldDelta = rootQ.clone().multiply(stanceDelta).multiply(rootQ.clone().invert());
      setWorldRotation(node, worldDelta.multiply(sourceWorld[i]));
    });
    root.updateWorldMatrix(true, true);
    solution.legs.forEach((leg, i) => {
      const chain = legs[i];
      const thighQ = solution.pelvisQuaternion.clone().multiply(leg.thigh);
      const shinQ = thighQ.clone().multiply(leg.shin);
      const footQ = shinQ.clone().multiply(leg.foot);
      setWorldRotation(chain.hip, rootQ.clone().multiply(thighQ).multiply(chain.thighCorrection));
      setWorldRotation(chain.knee, rootQ.clone().multiply(shinQ).multiply(chain.shinCorrection));
      setWorldRotation(chain.ankle, rootQ.clone().multiply(footQ).multiply(chain.ankleRest));
      setWorldRotation(chain.toe, rootQ.clone().multiply(footQ).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), leg.toe)).multiply(chain.toeRest));
      ankleError = Math.max(ankleError, position(chain.ankle).distanceTo(root.localToWorld(leg.ankle.clone())));
    });
    root.updateWorldMatrix(true, true);
    maximumGripError = Math.max(maximumGripError, ...Object.values(carry.gripErrors()));
  };
  const bones: T.Bone[] = []; let skinnedMeshes = 0;
  model.traverse(n => { if (n instanceof T.Bone) bones.push(n); if (n instanceof T.SkinnedMesh) skinnedMeshes++; });
  return { root, model, bones, measurements, update,
    get metrics() { return { skinnedMeshes, maximumAnkleError: ankleError, maximumGripError, gripErrors: carry.gripErrors(), swordLength: 1.798174 * .54 * 1.8 }; },
    anklePositions: () => legs.map(l => position(l.ankle)),
  };
}
