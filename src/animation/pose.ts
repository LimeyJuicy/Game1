import * as T from 'three';
import {capturePose, type LocalPose, type RigProfile} from './rigProfile.ts';
export const clonePose=(p:LocalPose):LocalPose=>({positions:p.positions.map(a=>[...a]),rotations:p.rotations.map(a=>[...a]),scales:p.scales.map(a=>[...a])});
export function forwardKinematics(profile:RigProfile,pose:LocalPose):T.Matrix4[]{
  return profile.parents.reduce<T.Matrix4[]>((world,parent,i)=>{
    const local=new T.Matrix4().compose(new T.Vector3().fromArray(pose.positions[i]),new T.Quaternion().fromArray(pose.rotations[i]),new T.Vector3().fromArray(pose.scales[i]));
    world.push((parent<0?profile.rootParent:world[parent]).clone().multiply(local));return world;
  },[]);
}
export function applyPose(profile:RigProfile,pose:LocalPose):void{
  profile.nodes.forEach((n,i)=>{n.position.fromArray(pose.positions[i]);n.quaternion.fromArray(pose.rotations[i]);n.scale.fromArray(pose.scales[i]);});
  profile.nodes[0].updateWorldMatrix(true,true);
}
export function poseError(a:LocalPose,b:LocalPose):number{
  return Math.max(...a.rotations.map((q,i)=>new T.Quaternion().fromArray(q).normalize().angleTo(new T.Quaternion().fromArray(b.rotations[i]).normalize())));
}
export {capturePose};
