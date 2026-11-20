import * as T from 'three';
import {UPPER_BONES,type BoneName,type RigProfile,type Triple} from './rigProfile.ts';
import type {PoseLibrary} from './definitions.ts';
import {applyPose,clonePose,forwardKinematics} from './pose.ts';
const q=(degrees:Triple)=>new T.Quaternion().setFromEuler(new T.Euler(...degrees.map(T.MathUtils.degToRad) as Triple,'XYZ'));
export function evaluateUpperBody(profile:RigProfile,library:PoseLibrary,progress:number){
  if(!Number.isFinite(progress))throw new Error('Pose time must be finite');
  const t=T.MathUtils.clamp(progress,0,1), u=t*t*(3-2*t), keys=library.bridge;
  let i=0;while(i<keys.length-2&&keys[i+1].t<u)i++;
  const a=keys[i],b=keys[i+1],f=(u-a.t)/(b.t-a.t),pose=clonePose(profile.reference);
  for(const name of UPPER_BONES){
    const index=profile.names.indexOf(name),baseA=q(keys[0].rotations[name]),baseB=q(keys.at(-1)!.rotations[name]);
    const correctionA=q(library.guards[0].rotations[name]).multiply(baseA.invert());
    const correctionB=q(library.guards[1].rotations[name]).multiply(baseB.invert());
    const correction=correctionA.slerp(correctionB,u);
    const delta=correction.multiply(q(a.rotations[name]).slerp(q(b.rotations[name]),f));
    // Clamp authored inputs, not Euler representations of an interpolated quaternion.
    // Euler clamping here caused jumps near the saved wrist's gimbal boundary.
    pose.rotations[index]=new T.Quaternion().fromArray(profile.reference.rotations[index]).multiply(delta).normalize().toArray();
  }
  return finalizePose(profile,pose,library.socket);
}
export function finalizePose(profile:RigProfile,pose:import('./rigProfile.ts').LocalPose,socketConfig:PoseLibrary['socket']){
  const world=forwardKinematics(profile,pose),socket=new T.Matrix4().compose(new T.Vector3(...socketConfig.position),new T.Quaternion().setFromEuler(new T.Euler(...socketConfig.rotation,'XYZ')),new T.Vector3(...profile.socket.scale));
  const weaponWorld=world[profile.handIndices.right].clone().multiply(socket);
  const right=new T.Vector3(0,.045,0).applyMatrix4(weaponWorld),left=new T.Vector3(0,-.16,0).applyMatrix4(weaponWorld),tip=new T.Vector3(0,1.478455,0).applyMatrix4(weaponWorld);
  return {pose,world,weaponWorld,socket:structuredClone(socketConfig),tip,
    blade:{base:new T.Vector3(0,.1827,0).applyMatrix4(weaponWorld),tip},
    edge:new T.Vector3(1,0,0).transformDirection(weaponWorld),
    gripErrors:{right:right.distanceTo(profile.gripCenters.right.clone().applyMatrix4(world[profile.handIndices.right])),left:left.distanceTo(profile.gripCenters.left.clone().applyMatrix4(world[profile.handIndices.left]))}};
}
export function setBoneRotation(library:PoseLibrary,profile:RigProfile,guard:0|1,name:BoneName,degrees:Triple){
  if(!UPPER_BONES.includes(name)||!degrees.every(Number.isFinite))throw new Error('Invalid upper-body rotation');
  const next=structuredClone(library);next.guards[guard].rotations[name]=degrees.map((v,i)=>T.MathUtils.clamp(v,-profile.limits[name][i],profile.limits[name][i])) as Triple;return next;
}

/** The only scene-writing step: commit one evaluated full pose and its socket. */
export function applyEvaluation(profile:RigProfile,result:ReturnType<typeof evaluateUpperBody>){
  applyPose(profile,result.pose);
  profile.weapon.position.fromArray(result.socket.position);
  profile.weapon.quaternion.setFromEuler(new T.Euler(...result.socket.rotation,'XYZ'));
  profile.weapon.updateWorldMatrix(true,true);
}
