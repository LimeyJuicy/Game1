import * as T from 'three';
import type {RigProfile} from './rigProfile.ts';
import type {PoseLibrary} from './definitions.ts';
import type {LegRig} from '../footwork/legs.ts';
import {solveLowerBody} from '../footwork/legs.ts';
import {TUNING} from '../footwork/stances.ts';
import {createFootworkPlan} from './footworkPlan.ts';
import {createImportedLowerPose} from './importedLowerPose.ts';
import {createClipRetarget} from './clipRetarget.ts';
import {evaluateUpperBody,finalizePose} from './evaluate.ts';
export interface CutDefinition {id:string;source:string;preparation:number;cut:number;recovery:number;settle:number;stepStart:number;stepDuration:number;stepDepth:number;recoverAt:number;hipTwistWeight:number;hipTwistLimit:number;hipLeanLimit:number;sourceFrom?:number;sourceTo?:number;holdPose?:number;hipHalfLife?:number}
export const cutDuration=(d:CutDefinition)=>d.preparation+d.cut+d.recovery+d.settle;
const smooth=(v:number)=>{const t=T.MathUtils.clamp(v,0,1);return t*t*(3-2*t);};
/** One isolated demonstration, using the real PR planner on a scratch clock.
 * Its immutable, dense constraint plan permits arbitrary-time sampling without advancing live state. */
export function createCutDemo(profile:RigProfile,library:PoseLibrary,rig:LegRig,source:T.Object3D,clip:T.AnimationClip,d:CutDefinition,guard?:{scene:T.Object3D;clip:T.AnimationClip}){
 if(Object.entries(d).some(([k,v])=>k!=='id'&&k!=='source'&&v!==undefined&&(typeof v!=='number'||!Number.isFinite(v)||v<0))||d.cut<.1||d.recovery<.1||d.stepDepth>1||d.recoverAt<d.stepStart+d.stepDuration)throw new Error('Invalid cut demonstration definition');
 d=structuredClone(d);
 const retarget=createClipRetarget(source,clip,profile),lower=createImportedLowerPose(profile),base=guard?createClipRetarget(guard.scene,guard.clip,profile).evaluate(profile.reference,0).pose:evaluateUpperBody(profile,library,1).pose,total=cutDuration(d);
 const plan=createFootworkPlan(total,[{time:d.stepStart,command:{type:'lunge',depth:d.stepDepth,duration:d.stepDuration}},{time:d.recoverAt,command:{type:'recover',forward:true}}]),events=plan.events;
 const phase=(t:number)=>{const progress=T.MathUtils.clamp((t-d.preparation)/d.cut,0,1),weight=t<d.preparation?smooth(t/d.preparation):1-smooth((t-d.preparation-d.cut)/d.recovery);return{weight,sourceTime:T.MathUtils.lerp(d.sourceFrom??0,d.sourceTo??1,d.holdPose??progress)*retarget.duration};};
 // Plan the bounded action contribution once, with the PR hip response. Sampling never integrates it.
 const hipRate=240,hips:Array<{yaw:number;pitch:number}>=[];let yaw=0,pitch=0;
 const response=1-Math.exp(-Math.LN2/(hipRate*(d.hipHalfLife??TUNING.hipHalfLife)));
 for(let k=0;k<=Math.ceil(total*hipRate);k++){const t=k/hipRate,state=phase(t),sourceHips=retarget.hips(state.sourceTime),wantedYaw=T.MathUtils.clamp(sourceHips.yaw*d.hipTwistWeight,-T.MathUtils.degToRad(d.hipTwistLimit),T.MathUtils.degToRad(d.hipTwistLimit))*state.weight,wantedPitch=T.MathUtils.clamp(sourceHips.pitch*.25,-T.MathUtils.degToRad(d.hipLeanLimit),T.MathUtils.degToRad(d.hipLeanLimit))*state.weight;yaw=T.MathUtils.lerp(yaw,wantedYaw,response);pitch=T.MathUtils.lerp(pitch,wantedPitch,response);const settle=d.settle>0?1-smooth((t-d.preparation-d.cut-d.recovery)/d.settle):1;hips.push({yaw:yaw*settle,pitch:pitch*settle});}
 function hipAt(t:number){const f=t*hipRate,i=Math.min(Math.floor(f),hips.length-2),a=hips[i],b=hips[i+1];return{yaw:T.MathUtils.lerp(a.yaw,b.yaw,f-i),pitch:T.MathUtils.lerp(a.pitch,b.pitch,f-i)};}
 function evaluate(time:number,moving:boolean){
  if(!Number.isFinite(time))throw new Error('Cut time must be finite');const t=T.MathUtils.clamp(time,0,total);
  const{weight,sourceTime}=phase(t),actionHips=hipAt(t);
  const lowerState=plan.sample(t,moving);
  // Action pelvis requests enter the leg solve BEFORE foot IK; planted feet remain authoritative.
  lowerState.pose.pelvis.yaw+=actionHips.yaw;
  lowerState.pose.pelvis.pitch+=actionHips.pitch;
  const solution=solveLowerBody(lowerState.pose,rig),pose=lower(base,solution),authored=retarget.evaluate(pose,sourceTime).pose;
  for(const name of retarget.bones){const i=profile.names.indexOf(name);pose.rotations[i]=new T.Quaternion().fromArray(pose.rotations[i]).slerp(new T.Quaternion().fromArray(authored.rotations[i]),weight).normalize().toArray();}
  const root=new T.Matrix4().makeRotationY(lowerState.root.yaw).setPosition(lowerState.root.x,0,lowerState.root.z),worldProfile={...profile,rootParent:root.clone().multiply(profile.rootParent)};
  const result=finalizePose(worldProfile,pose,library.socket);
  return{...result,root:lowerState.root,time:t,sourceTime,weight,phase:t<d.preparation?'prepare':t<d.preparation+d.cut?'cut':t<d.preparation+d.cut+d.recovery?'recover':'settled',
   lower:lowerState.pose,ankleTargets:solution.legs.map(l=>l.ankle.clone().applyMatrix4(root)),singleHand:true,events:structuredClone(events)};
 }
 return{duration:total,definition:structuredClone(d),events:structuredClone(events),evaluate};
}
