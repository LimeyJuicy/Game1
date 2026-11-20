import * as T from 'three';
import type {RigProfile,Triple} from './rigProfile.ts';
import type {PoseLibrary} from './definitions.ts';
import {evaluateUpperBody,finalizePose} from './evaluate.ts';
import {solveWeaponIK,weaponOrientation,DEFAULT_IK_LIMITS,type WeaponTarget,type IKLimits} from './upperBodyIK.ts';
import {sweptBladeHits,type Vec3} from '../combat.ts';

export interface ExtensionDefinition {
  schemaVersion:1;id:string;baseGuard:0|1;target:WeaponTarget;limits:IKLimits;
  preparation:number;extension:number;hold:number;recovery:number;
  distance:number;drawback:number;torsoLean:number;torsoTurn:number;
}
export const DEFAULT_EXTENSION:ExtensionDefinition={schemaVersion:1,id:'straight-extension',baseGuard:1,
  target:{position:[.05,1.28,-.22],pitch:8,yaw:0,roll:0,elbowSwivel:[0,0]},limits:{...DEFAULT_IK_LIMITS},
  preparation:.35,extension:.45,hold:.15,recovery:.65,distance:.12,drawback:.025,torsoLean:3,torsoTurn:-5};
export const extensionDuration=(d:ExtensionDefinition)=>d.preparation+d.extension+d.hold+d.recovery;
export function validateExtension(value:unknown):ExtensionDefinition{
  const d=structuredClone(value) as ExtensionDefinition;
  const finite=(a:unknown)=>typeof a==='number'&&Number.isFinite(a);
  if(!d||d.schemaVersion!==1||typeof d.id!=='string'||![0,1].includes(d.baseGuard)||!d.target||!d.limits)throw new Error('Invalid extension definition');
  if(!Array.isArray(d.target.position)||d.target.position.length!==3||!d.target.position.every(finite)||d.target.position.some(v=>Math.abs(v)>10))throw new Error('Invalid weapon position');
  for(const key of ['pitch','yaw','roll'] as const)if(!finite(d.target[key])||Math.abs(d.target[key])>180)throw new Error('Invalid weapon orientation');
  if(!Array.isArray(d.target.elbowSwivel)||d.target.elbowSwivel.length!==2||d.target.elbowSwivel.some(v=>!finite(v)||Math.abs(v)>80))throw new Error('Invalid elbow swivel');
  for(const key of ['preparation','extension','hold','recovery'] as const)if(!finite(d[key])||d[key]<0||d[key]>5)throw new Error('Invalid phase duration');
  if(d.extension<.1||d.recovery<.1||extensionDuration(d)>12)throw new Error('Extension/recovery duration out of range');
  for(const key of ['distance','drawback'] as const)if(!finite(d[key])||d[key]<0||d[key]>.35)throw new Error('Invalid extension distance');
  for(const key of ['torsoLean','torsoTurn'] as const)if(!finite(d[key])||Math.abs(d[key])>20)throw new Error('Invalid torso contribution');
  for(const key of Object.keys(DEFAULT_IK_LIMITS) as Array<keyof IKLimits>)if(!finite(d.limits[key])||d.limits[key]<0||d.limits[key]>175)throw new Error('Invalid IK bound');
  if(d.limits.elbowMin<5||d.limits.elbowMax>165||d.limits.elbowMax<=d.limits.elbowMin||d.limits.shoulderSwing<20)throw new Error('Invalid elbow/shoulder bounds');
  return d;
}
const ease=(v:number)=>{const t=T.MathUtils.clamp(v,0,1);return t*t*(3-2*t);};
export function extensionPhase(d:ExtensionDefinition,time:number){
  const t=T.MathUtils.clamp(time,0,extensionDuration(d));let travel=0,body=0,phase='preparation';
  if(t<d.preparation){const p=ease(t/Math.max(d.preparation,1e-6));travel=-d.drawback*p;body=-.15*p;}
  else if(t<d.preparation+d.extension){const p=ease((t-d.preparation)/d.extension);phase='extension';travel=T.MathUtils.lerp(-d.drawback,d.distance,p);body=T.MathUtils.lerp(-.15,1,p);}
  else if(t<d.preparation+d.extension+d.hold){phase='hold';travel=d.distance;body=1;}
  else{const p=ease((t-d.preparation-d.extension-d.hold)/d.recovery);phase='recovery';travel=d.distance*(1-p);body=1-p;}
  return {phase,travel,body,active:t>=d.preparation+d.extension*.45&&t<=d.preparation+d.extension};
}
export function evaluateExtension(profile:RigProfile,library:PoseLibrary,d:ExtensionDefinition,time:number,stationary=false){
  if(!Number.isFinite(time))throw new Error('Action time must be finite');
  const state=stationary?{phase:'IK target',travel:0,body:0,active:false}:extensionPhase(d,time);
  const base=evaluateUpperBody(profile,library,d.baseGuard).pose;
  for(const name of ['spine_01','spine_02','spine_03']){const i=profile.names.indexOf(name);base.rotations[i]=new T.Quaternion().fromArray(base.rotations[i]).multiply(new T.Quaternion().setFromEuler(new T.Euler(T.MathUtils.degToRad(d.torsoLean*state.body/3),T.MathUtils.degToRad(d.torsoTurn*state.body/3),0))).toArray();}
  const target=structuredClone(d.target),axis=new T.Vector3(0,1,0).applyQuaternion(weaponOrientation(target));target.position=new T.Vector3(...target.position).addScaledVector(axis,state.travel).toArray() as Triple;
  const solved=solveWeaponIK(profile,base,target,library.socket,d.limits),result=finalizePose(profile,solved.pose,library.socket);
  const actualGrip=new T.Vector3(0,.045,0).applyMatrix4(result.weaponWorld),actualQ=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().extractRotation(result.weaponWorld));
  return {...result,phase:state.phase,active:state.active,requested:target,ik:{projectionError:solved.projectionError,targetError:actualGrip.distanceTo(new T.Vector3(...target.position)),orientationError:actualQ.angleTo(weaponOrientation(target)),constrained:solved.constrained,flexions:solved.flexions}};
}
export function extensionTrajectory(profile:RigProfile,library:PoseLibrary,d:ExtensionDefinition,samples=80){
  if(!Number.isInteger(samples)||samples<2||samples>1000)throw new Error('Trajectory samples must be 2–1000');
  return Array.from({length:samples+1},(_,i)=>{const time=extensionDuration(d)*i/samples,r=evaluateExtension(profile,library,d,time);return{time,tip:r.tip.toArray(),base:r.blade.base.toArray(),active:r.active,targetError:r.ik.targetError,gripError:Math.max(...Object.values(r.gripErrors))};});
}
/** Uses exactly the final FK blade exposed to the renderer; no state advancement or damage. */
export function sampleExtensionContact(profile:RigProfile,library:PoseLibrary,d:ExtensionDefinition,start:number,end:number,center:Vec3,radius:number){
  if(![start,end,center.x,center.y,center.z,radius].every(Number.isFinite)||radius<0)throw new Error('Invalid contact query');
  if(end<=start)return false;const from=Math.max(start,d.preparation+d.extension*.45),to=Math.min(end,d.preparation+d.extension);if(to<from)return false;
  const steps=Math.max(1,Math.ceil((to-from)*240));let previous=evaluateExtension(profile,library,d,from).blade;
  for(let i=1;i<=steps;i++){const current=evaluateExtension(profile,library,d,from+(to-from)*i/steps).blade;if(sweptBladeHits(previous,current,center,radius))return true;previous=current;}return false;
}
