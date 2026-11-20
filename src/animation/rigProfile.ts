import * as T from 'three';
export const PROFILE_ID = 'red-herald-knight-upper-v1';
export const UPPER_BONES = ['spine_01','spine_02','spine_03','neck_01','Head','clavicle_l','upperarm_l','lowerarm_l','hand_l','clavicle_r','upperarm_r','lowerarm_r','hand_r'] as const;
export type BoneName = typeof UPPER_BONES[number];
export type Triple = [number, number, number];
export interface LocalPose { positions: number[][]; rotations: number[][]; scales: number[][] }
export interface RigProfile {
  id: string; weapon: T.Object3D; names: string[]; parents: number[]; nodes: T.Bone[];
  reference: LocalPose; bind: LocalPose; rootParent: T.Matrix4;
  limits: Record<string, Triple>; socket: { position: Triple; rotation: Triple; scale: Triple };
  gripCenters: { right: T.Vector3; left: T.Vector3 }; handIndices: { right: number; left: number };
}
export const capturePose = (bones: T.Bone[]): LocalPose => ({ positions: bones.map(b=>b.position.toArray()), rotations:bones.map(b=>b.quaternion.toArray()), scales:bones.map(b=>b.scale.toArray()) });
export function createRigProfile(actor: T.Object3D, bind?: LocalPose): RigProfile {
  actor.updateWorldMatrix(true,true);
  const nodes: T.Bone[]=[]; actor.traverse(n=>{if(n instanceof T.Bone) nodes.push(n);});
  const names=nodes.map(n=>n.name), parents=nodes.map(n=>nodes.indexOf(n.parent as T.Bone));
  for(const name of UPPER_BONES) if(!names.includes(name)) throw new Error(`Missing upper-body bone ${name}`);
  const sword=actor.getObjectByName('PlayerSword_SingleHand')??actor.getObjectByName('PlayerSword_TwoHandShoulder');
  if(!sword || sword.parent?.name!=='hand_r') throw new Error('Expected imported sword attached to hand_r');
  const limits: Record<string,Triple>={};
  for(const n of UPPER_BONES) limits[n]=n.startsWith('spine')?[30,40,25]:n==='Head'||n==='neck_01'?[35,60,25]:n.startsWith('clavicle')?[35,35,35]:n.startsWith('upperarm')?[150,150,150]:n.startsWith('lowerarm')?[180,100,180]:[65,90,65];
  const center=(side:string)=>{
    const middle=actor.getObjectByName(`middle_01_${side}`)!, index=actor.getObjectByName(`index_01_${side}`)!, pinky=actor.getObjectByName(`pinky_01_${side}`)!;
    const axis=index.position.clone().sub(pinky.position).normalize(),fingers=middle.position.clone().normalize();fingers.addScaledVector(axis,-fingers.dot(axis)).normalize();
    return middle.position.clone().multiplyScalar(.48).addScaledVector(new T.Vector3().crossVectors(axis,fingers).normalize(),.006);
  };
  const rotation=new T.Euler().setFromQuaternion(sword.quaternion,'XYZ');
  return {id:PROFILE_ID,weapon:sword,names,parents,nodes,reference:capturePose(nodes),bind:bind??capturePose(nodes),rootParent:nodes[0].parent!.matrixWorld.clone(),limits,
    socket:{position:sword.position.toArray(),rotation:[rotation.x,rotation.y,rotation.z],scale:sword.scale.toArray()},gripCenters:{right:center('r'),left:center('l')},handIndices:{right:names.indexOf('hand_r'),left:names.indexOf('hand_l')}};
}
