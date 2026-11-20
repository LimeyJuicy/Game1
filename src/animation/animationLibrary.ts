import * as T from 'three';
import type {RigProfile,LocalPose} from './rigProfile.ts';
import type {PoseLibrary} from './definitions.ts';
import type {LegRig} from '../footwork/legs.ts';
import {solveLowerBody} from '../footwork/legs.ts';
import {clonePose,forwardKinematics} from './pose.ts';
import {finalizePose} from './evaluate.ts';
import {createCutDemo} from './cutDemo.ts';
import {createClipRetarget} from './clipRetarget.ts';
import {createFullBodyClip} from './fullBodyClip.ts';
import {createImportedLowerPose} from './importedLowerPose.ts';
import {createFootworkPlan,type FootworkCue} from './footworkPlan.ts';
import type {AnimationPreview} from './previewTypes.ts';
export interface LibraryAction {id:string;name:string;category:string;source:string;engine:'upper'|'footwork'|'full';preparation:number;playback:number;recovery:number;settle:number;status:string;roles:string[];note?:string;stepDepth?:number;sourceFrom?:number;sourceTo?:number;holdPose?:number;movement?:'idle'|'walk'|'evade';direction?:[number,number];travelScale?:number;heading?:number;velocity?:[number,number];cycles?:number;terminal?:boolean;bodySupport?:boolean;footworkSpeed?:number;credit?:{text:string;url:string}}
export interface CombatLibrary {schemaVersion:1;actions:LibraryAction[];missing:Array<{id:string;name:string;reason:string}>}
export interface AnimationSource {scene:T.Object3D;clip:T.AnimationClip}
const smooth=(n:number)=>{const t=T.MathUtils.clamp(n,0,1);return t*t*(3-2*t);};
const point=(m:T.Matrix4)=>new T.Vector3().setFromMatrixPosition(m);
export function validateCombatLibrary(value:unknown):CombatLibrary{
 const j=structuredClone(value) as CombatLibrary,ids=new Set<string>();if(!j||j.schemaVersion!==1||!Array.isArray(j.actions)||!Array.isArray(j.missing))throw new Error('Invalid animation library');
 for(const a of j.actions){
  if(!a||typeof a.id!=='string'||ids.has(a.id)||typeof a.name!=='string'||typeof a.category!=='string'||typeof a.source!=='string'||!['upper','footwork','full'].includes(a.engine)||!Array.isArray(a.roles)||!a.roles.every(r=>typeof r==='string'))throw new Error('Invalid or duplicate animation definition');ids.add(a.id);
  for(const k of ['preparation','playback','recovery','settle'] as const)if(!Number.isFinite(a[k])||a[k]<0||a[k]>10)throw new Error('Invalid action timing');
  if(a.playback<.1||a.preparation+a.playback+a.recovery+a.settle>25)throw new Error('Invalid action duration');
  for(const k of ['sourceFrom','sourceTo','holdPose','stepDepth'] as const){const value=a[k];if(value!==undefined&&(!Number.isFinite(value)||value<0||value>1))throw new Error('Invalid source/step range');}
  if((a.sourceFrom??0)>=(a.sourceTo??1))throw new Error('Empty source range');
  for(const k of ['travelScale','heading','cycles','footworkSpeed'] as const)if(a[k]!==undefined&&!Number.isFinite(a[k]))throw new Error('Invalid movement parameter');
  if((a.footworkSpeed??1)<=0||(a.footworkSpeed??1)>3)throw new Error('Invalid footwork speed');
  if(a.engine==='footwork'&&!['idle','walk','evade'].includes(a.movement??''))throw new Error('Invalid movement family');
  if((a.cycles??1)<1||(a.cycles??1)>8||!Number.isInteger(a.cycles??1)||(a.travelScale??1)<0||(a.travelScale??1)>2||Math.abs(a.heading??0)>180)throw new Error('Invalid movement bounds');
  for(const vector of [a.direction,a.velocity])if(vector&&(!Array.isArray(vector)||vector.length!==2||vector.some(v=>!Number.isFinite(v)||Math.abs(v)>8)))throw new Error('Invalid action direction');
 }
 for(const gap of j.missing)if(!gap||typeof gap.id!=='string'||typeof gap.name!=='string'||typeof gap.reason!=='string')throw new Error('Invalid coverage gap');return j;
}
const rootProfile=(profile:RigProfile,root:{x:number;z:number;yaw:number},y=0)=>({...profile,rootParent:new T.Matrix4().makeRotationY(root.yaw).setPosition(root.x,y,root.z).multiply(profile.rootParent)});
function blend(a:LocalPose,b:LocalPose,w:number){const pose=clonePose(a);for(let i=0;i<pose.rotations.length;i++){pose.rotations[i]=new T.Quaternion().fromArray(a.rotations[i]).slerp(new T.Quaternion().fromArray(b.rotations[i]),w).normalize().toArray();pose.positions[i]=new T.Vector3().fromArray(a.positions[i]).lerp(new T.Vector3().fromArray(b.positions[i]),w).toArray();}return pose;}
/** Source data + existing solvers; never owns live combat state or advances on sample. */
export function createLibraryPreview(profile:RigProfile,library:PoseLibrary,rig:LegRig,source:AnimationSource,guard:AnimationSource,input:LibraryAction):AnimationPreview{
 const a=structuredClone(input),duration=a.preparation+a.playback+a.recovery+a.settle;
 if(a.engine==='upper'){
  const preview=createCutDemo(profile,library,rig,source.scene,source.clip,{id:a.id,source:a.source,preparation:a.preparation,cut:a.playback,recovery:Math.max(.1,a.recovery),settle:a.settle,stepStart:Math.max(0,a.preparation-.18),stepDuration:.5,stepDepth:a.stepDepth??.25,recoverAt:Math.max(a.preparation+a.playback+.05,Math.max(0,a.preparation-.18)+.5),hipTwistWeight:.6,hipTwistLimit:16,hipLeanLimit:2,sourceFrom:a.sourceFrom,sourceTo:a.sourceTo,holdPose:a.holdPose},guard);
  return{...preview,evaluate(time,moving){const r=preview.evaluate(time,moving&&a.stepDepth!==undefined);return{...r,footOwnership:'pr',phase:r.phase==='cut'?'perform':r.phase};}};
 }
 const guardRetarget=createClipRetarget(guard.scene,guard.clip,profile),base=guardRetarget.evaluate(profile.reference,0).pose,lower=createImportedLowerPose(profile);
 if(a.engine==='footwork'){
  const dir=a.direction??[0,0],cues:FootworkCue[]=a.movement==='walk'?[{time:a.preparation,command:{type:'intent',x:dir[0],z:dir[1]}},{time:a.preparation+a.playback-.4,command:{type:'intent',x:0,z:0}}]:a.movement==='evade'?[{time:a.preparation,command:{type:'step',x:dir[0],z:dir[1]}}]:[];
  const plan=createFootworkPlan(duration,cues,240,a.footworkSpeed??1),stanceRetarget=createClipRetarget(source.scene,source.clip,profile);
  return{duration,definition:{id:a.id},events:plan.events,evaluate(time){
   if(!Number.isFinite(time))throw new Error('Animation time must be finite');const t=T.MathUtils.clamp(time,0,duration),state=plan.sample(t),solution=solveLowerBody(state.pose,rig),pose=stanceRetarget.evaluate(lower(base,solution),a.holdPose!==undefined?a.holdPose*source.clip.duration:t%source.clip.duration).pose;
   const rp=rootProfile(profile,state.root),r=finalizePose(rp,pose,library.socket),matrix=new T.Matrix4().makeRotationY(state.root.yaw).setPosition(state.root.x,0,state.root.z);
   return{...r,time:t,root:state.root,phase:a.movement==='idle'?'guard':a.movement==='evade'?'evade':'move',singleHand:true,footOwnership:'pr',ankleTargets:solution.legs.map(l=>l.ankle.clone().applyMatrix4(matrix)),events:structuredClone(plan.events)};
  }};
 }
 const full=createFullBodyClip(source.scene,source.clip,profile),from=(a.sourceFrom??0)*full.duration,to=(a.sourceTo??1)*full.duration,first=full.evaluate(base,from),last=full.evaluate(base,to),cycles=a.cycles??1;
 const bind=forwardKinematics(profile,profile.bind),soleMarkers=['l','r'].flatMap(side=>{const foot=profile.names.indexOf(`foot_${side}`),ball=profile.names.indexOf(`ball_${side}`);return[foot,ball].map(i=>{const v=point(bind[i]);v.y=0;return{index:i,local:v.applyMatrix4(bind[i].clone().invert())};});});
 function weight(t:number){if(a.terminal&&a.preparation===0)return 1;if(t<a.preparation)return smooth(t/Math.max(.001,a.preparation));if(a.terminal)return 1;return 1-smooth((t-a.preparation-a.playback)/Math.max(.001,a.recovery));}
 function clock(t:number){if(t<a.preparation){const u=t/Math.max(.001,a.preparation);return a.preparation*(u**3-.5*u**4);}let n=.5*a.preparation+Math.min(a.playback,Math.max(0,t-a.preparation));if(t>a.preparation+a.playback){const u=T.MathUtils.clamp((t-a.preparation-a.playback)/Math.max(.001,a.recovery),0,1);n+=a.recovery*(u-u**3+.5*u**4);}return n;}
 return{duration,definition:{id:a.id},events:[],evaluate(time){
  if(!Number.isFinite(time))throw new Error('Animation time must be finite');const t=T.MathUtils.clamp(time,0,duration),w=weight(t),progress=a.cycles?T.MathUtils.clamp(clock(t)/(.5*a.preparation+a.playback+.5*a.recovery),0,1):T.MathUtils.clamp((t-a.preparation)/a.playback,0,1),phase=progress*cycles,index=Math.min(cycles-1,Math.floor(phase)),u=progress>=1?1:phase-index;
  const frame=full.evaluate(base,T.MathUtils.lerp(from,to,u)),pose=blend(base,frame.pose,w);
  // Closed sword fingers remain independent of an unarmed source's open hand.
  for(let i=0;i<profile.names.length;i++)if(/^(index|middle|ring|pinky|thumb)_.*_r$/.test(profile.names[i]))pose.rotations[i]=[...base.rotations[i]];
  const x=(frame.rootPosition.x-first.rootPosition.x+index*(last.rootPosition.x-first.rootPosition.x))*(a.travelScale??1),z=(frame.rootPosition.z-first.rootPosition.z+index*(last.rootPosition.z-first.rootPosition.z))*(a.travelScale??1);
  const displacement=a.velocity?new T.Vector3(a.velocity[0]*clock(t),0,a.velocity[1]*clock(t)):new T.Vector3(x,0,z),heading=T.MathUtils.degToRad(a.heading??0),yaw=heading*w;
  displacement.applyAxisAngle(new T.Vector3(0,1,0),heading);const root={x:displacement.x,z:displacement.z,yaw};
  // Kinematic floor nonpenetration only; source actions do not acquire PR planted-foot locks.
  const fk=forwardKinematics(profile,pose);let min=Math.min(...soleMarkers.map(s=>s.local.clone().applyMatrix4(fk[s.index]).y));
  if(a.bodySupport)for(const[name,radius]of [['pelvis',.09],['spine_03',.12],['Head',.1]] as const)min=Math.min(min,point(fk[profile.names.indexOf(name)]).y-radius);
  const floor=Math.max(0,-min),result=finalizePose(rootProfile(profile,root,floor),pose,library.socket);
  const warnings=floor>.12?[`Floor correction ${(floor*100).toFixed(1)} cm; contact calibration needs review`]:[];
  return{...result,root,rootY:floor,time:t,phase:a.terminal&&progress>=1?'held':t<a.preparation?'prepare':t<a.preparation+a.playback?'perform':t<a.preparation+a.playback+a.recovery?'recover':'settled',singleHand:true,footOwnership:'clip',ankleTargets:['l','r'].map(s=>point(result.world[profile.names.indexOf(`foot_${s}`)])),events:[],warnings};
 }};
}
