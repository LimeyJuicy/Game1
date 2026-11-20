import * as T from 'three';
import type {LocalPose,RigProfile} from './rigProfile.ts';
import {clonePose,forwardKinematics} from './pose.ts';
import {createClipRetarget} from './clipRetarget.ts';
const q=(m:T.Matrix4)=>new T.Quaternion().setFromRotationMatrix(new T.Matrix4().extractRotation(m));
const p=(m:T.Matrix4)=>new T.Vector3().setFromMatrixPosition(m);
/** Authored actions own the full body, including aerial legs. No standing-leg IK is imposed. */
export function createFullBodyClip(source:T.Object3D,clip:T.AnimationClip,profile:RigProfile){
 const sampler=createClipRetarget(source,clip,profile),nodes:T.Object3D[]=[];source.traverse(n=>nodes.push(n));
 const names=nodes.map(n=>n.name),targetBind=forwardKinematics(profile,profile.bind),si=names.indexOf('pelvis'),ti=profile.names.indexOf('pelvis');
 source.updateWorldMatrix(true,true);const rest=nodes.map(n=>n.matrixWorld.clone()),root=names.indexOf('root'),targetRoot=profile.names.indexOf('root');
 const align=q(targetBind[targetRoot]).multiply(q(rest[root]).invert()),scale=p(targetBind[ti]).y/Math.max(.1,p(rest[si]).y);
 const mappings=profile.names.map((name,i)=>({name,i,s:names.indexOf(name)})).filter(m=>m.s>=0&&m.name!=='root'&&!m.name.startsWith('cloth_'));
 return{duration:clip.duration,evaluate(base:LocalPose,time:number){
  const sourceWorld=sampler.sample(time),pose=clonePose(base),delta=p(sourceWorld[si]).sub(p(rest[si])).applyQuaternion(align).multiplyScalar(scale);
  // Keep planar travel outside the skeleton, so a caller can constrain it without rewriting bones.
  const rootPosition={x:delta.x,y:0,z:delta.z},pelvis=p(targetBind[ti]).add(new T.Vector3(0,delta.y,0));
  let worlds=forwardKinematics(profile,pose),parent=profile.parents[ti];pose.positions[ti]=pelvis.applyMatrix4((parent<0?profile.rootParent:worlds[parent]).clone().invert()).toArray();
  for(const m of mappings){let desired=align.clone().multiply(q(sourceWorld[m.s]));
   if(/^(pelvis|spine_|neck_|Head|clavicle_)/.test(m.name))desired.multiply(q(rest[m.s]).invert()).multiply(align.clone().invert()).multiply(q(targetBind[m.i]));
   worlds=forwardKinematics(profile,pose);parent=profile.parents[m.i];pose.rotations[m.i]=q(parent<0?profile.rootParent:worlds[parent]).invert().multiply(desired).normalize().toArray();
  }
  return{pose,rootPosition};
 }};
}
