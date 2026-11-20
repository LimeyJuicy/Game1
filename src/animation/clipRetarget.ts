import * as T from 'three';
import type {LocalPose,RigProfile} from './rigProfile.ts';
import {capturePose} from './rigProfile.ts';
import {clonePose,forwardKinematics} from './pose.ts';
const rotation=(m:T.Matrix4)=>new T.Quaternion().setFromRotationMatrix(new T.Matrix4().extractRotation(m));
/** Sample source tracks in scratch buffers. No AnimationMixer/scene mutation during queries. */
export function createClipRetarget(source:T.Object3D,clip:T.AnimationClip,profile:RigProfile){
 const nodes:T.Object3D[]=[];source.traverse(n=>nodes.push(n));const parents=nodes.map(n=>nodes.indexOf(n.parent!));
 const names=nodes.map(n=>n.name),bind=capturePose(nodes as T.Bone[]),sourceProfile={parents,rootParent:new T.Matrix4()} as RigProfile;
 const sourceBind=forwardKinematics(sourceProfile,bind),targetBind=forwardKinematics(profile,profile.bind);
 const sourcePelvis=names.indexOf('pelvis'),targetPelvis=profile.names.indexOf('pelvis'),sourceRoot=names.indexOf('root'),targetRoot=profile.names.indexOf('root');
 if(Math.min(sourcePelvis,targetPelvis,sourceRoot,targetRoot)<0)throw new Error('Clip needs the mapped humanoid root and pelvis');
 const alignment=rotation(targetBind[targetRoot]).multiply(rotation(sourceBind[sourceRoot]).invert());
 const mappings=profile.names.map((name,i)=>({name,i,source:names.indexOf(name)})).filter(m=>/^(spine_|neck_|Head|clavicle_|upperarm_|lowerarm_|hand_|index_|middle_|ring_|pinky_|thumb_)/.test(m.name)&&m.source>=0);
 const tracks=clip.tracks.map(track=>{const binding=T.PropertyBinding.parseTrackName(track.name),index=names.indexOf(binding.nodeName);if(index<0||!['position','quaternion','scale'].includes(binding.propertyName)||track.getInterpolation()!==T.InterpolateLinear)throw new Error(`Unsupported source track ${track.name}`);return{index,field:binding.propertyName as 'position'|'quaternion'|'scale',interpolant:track.InterpolantFactoryMethodLinear()};});
 function sample(time:number){
  if(!Number.isFinite(time))throw new Error('Clip sample time must be finite');const pose=clonePose(bind),t=T.MathUtils.clamp(time,0,clip.duration);
  for(const track of tracks){const field=track.field==='position'?'positions':track.field==='quaternion'?'rotations':'scales';pose[field][track.index]=Array.from(track.interpolant.evaluate(t));}
  return forwardKinematics(sourceProfile,pose);
 }
 // Unwrap source hip yaw once: Euler ±π is a representation seam, not a 32° capped-hip reversal.
 let yawCurve:number[]|undefined;
 const hipEuler=(worlds:T.Matrix4[])=>new T.Euler().setFromQuaternion(alignment.clone().multiply(rotation(worlds[sourcePelvis])).multiply(rotation(sourceBind[sourcePelvis]).invert()).multiply(alignment.clone().invert()),'YXZ');
 function continuousYaw(time:number){
  if(!yawCurve){const frames=Math.max(2,Math.ceil(clip.duration*90));yawCurve=[];let previous=0,unwrapped=0;for(let k=0;k<=frames;k++){const raw=hipEuler(sample(clip.duration*k/frames)).y;unwrapped=k===0?raw:unwrapped+Math.atan2(Math.sin(raw-previous),Math.cos(raw-previous));yawCurve.push(unwrapped);previous=raw;}}
  const f=T.MathUtils.clamp(time/clip.duration,0,1)*(yawCurve.length-1),i=Math.min(yawCurve.length-2,Math.floor(f));return T.MathUtils.lerp(yawCurve[i],yawCurve[i+1],f-i);
 }
 return {duration:clip.duration,hips(time:number){const e=hipEuler(sample(time));return{yaw:continuousYaw(time),pitch:e.x,roll:e.z};},bones:mappings.map(m=>m.name),sample,
  evaluate(base:LocalPose,time:number){
   const worlds=sample(time),pose=clonePose(base),pelvisWorld=rotation(forwardKinematics(profile,base)[targetPelvis]);
   // Express source motion relative to its animated pelvis; the PR resolver owns the target pelvis.
   const carrier=pelvisWorld.clone().multiply(rotation(targetBind[targetPelvis]).invert()).multiply(alignment).multiply(rotation(sourceBind[sourcePelvis])).multiply(rotation(worlds[sourcePelvis]).invert());
   for(const m of mappings){let desired=carrier.clone().multiply(rotation(worlds[m.source]));
    if(/^(spine_|neck_|Head|clavicle_)/.test(m.name))desired.multiply(rotation(sourceBind[m.source]).invert()).multiply(alignment.clone().invert()).multiply(rotation(targetBind[m.i]));
    const w=forwardKinematics(profile,pose),p=profile.parents[m.i];pose.rotations[m.i]=rotation(p<0?profile.rootParent:w[p]).invert().multiply(desired).normalize().toArray();
   }
   const e=hipEuler(worlds);
   return{pose,hips:{yaw:continuousYaw(time),pitch:e.x,roll:e.z}};
  }};
}
