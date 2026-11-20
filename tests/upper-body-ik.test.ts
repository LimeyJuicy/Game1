import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';
import{importedAssets}from'./helpers/importedAssets.ts';
import{createImportedKnight}from'../Animation Testing/AT-007-Footwork/viewer/importedKnight.ts';
import{stancePose,stanceById}from'../src/footwork/stances.ts';import{solveLowerBody}from'../src/footwork/legs.ts';
import{createRigProfile,capturePose,UPPER_BONES,type BoneName}from'../src/animation/rigProfile.ts';
import{applyPose,poseError}from'../src/animation/pose.ts';import{validateLibrary}from'../src/animation/definitions.ts';import{applyEvaluation,evaluateUpperBody,setBoneRotation}from'../src/animation/evaluate.ts';
function fixture(){const a=importedAssets(),actor=createImportedKnight(a.model,a.clips,a.sword),bind=capturePose(actor.bones);actor.update(solveLowerBody(stancePose(stanceById('high'),1),actor.measurements),0);const profile=createRigProfile(actor.root,bind);const data=JSON.parse(fs.readFileSync(new URL('../src/animation/assets/default-guards.json',import.meta.url),'utf8'));return{actor,profile,library:validateLibrary(data,profile)};}

import {DEFAULT_EXTENSION,evaluateExtension,extensionDuration,extensionTrajectory,sampleExtensionContact,validateExtension} from '../src/animation/extension.ts';
import {weaponOrientation,limitJoint} from '../src/animation/upperBodyIK.ts';
test('bounded two-arm IK reaches the rigid weapon without moving the stance',()=>{
 const{profile,library,actor}=fixture(),before=capturePose(profile.nodes),json=JSON.stringify(library);let previous:ReturnType<typeof evaluateExtension>|undefined;let maxStep=0;
 let mesh:T.SkinnedMesh;actor.model.traverse(n=>{if(n instanceof T.SkinnedMesh)mesh=n;});
 const footVertices:number[]=[];for(let i=0;i<mesh!.geometry.attributes.position.count;i++)if(mesh!.geometry.attributes.position.getY(i)<.055&&i%29===0)footVertices.push(i);
 const start=evaluateExtension(profile,library,DEFAULT_EXTENSION,0);applyEvaluation(profile,start);mesh!.skeleton.update();const ground=footVertices.map(i=>mesh!.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh!.matrixWorld));
 for(let k=0;k<=120;k++){
  const r=evaluateExtension(profile,library,DEFAULT_EXTENSION,extensionDuration(DEFAULT_EXTENSION)*k/120);
  assert.ok(r.ik.targetError<1e-6);assert.ok(r.ik.orientationError<1e-6);assert.ok(Math.max(...Object.values(r.gripErrors))<1e-6);
  r.ik.flexions.forEach(v=>assert.ok(v>=DEFAULT_EXTENSION.limits.elbowMin-1e-4&&v<=DEFAULT_EXTENSION.limits.elbowMax+1e-4));
  for(let i=0;i<profile.names.length;i++){assert.deepEqual(r.pose.positions[i],profile.reference.positions[i]);assert.deepEqual(r.pose.scales[i],profile.reference.scales[i]);assert.ok(Math.abs(new T.Quaternion().fromArray(r.pose.rotations[i]).length()-1)<1e-6);if(/^(pelvis|thigh_|calf_|foot_|ball_)/.test(profile.names[i]))assert.deepEqual(r.pose.rotations[i],profile.reference.rotations[i]);}
  if(previous)for(const n of UPPER_BONES){const i=profile.names.indexOf(n);maxStep=Math.max(maxStep,new T.Quaternion().fromArray(previous.pose.rotations[i]).angleTo(new T.Quaternion().fromArray(r.pose.rotations[i])));}previous=r;
  if(k%20===0){applyEvaluation(profile,r);r.weaponWorld.elements.forEach((v,i)=>assert.ok(Math.abs(v-profile.weapon.matrixWorld.elements[i])<1e-8));mesh!.skeleton.update();footVertices.forEach((i,j)=>assert.ok(mesh!.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh!.matrixWorld).distanceTo(ground[j])<1e-6));}
 }
 assert.ok(maxStep<.15,`joint step ${maxStep}`);assert.deepEqual(evaluateExtension(profile,library,DEFAULT_EXTENSION,0).pose,evaluateExtension(profile,library,DEFAULT_EXTENSION,extensionDuration(DEFAULT_EXTENSION)).pose);
 applyPose(profile,before);const a=evaluateExtension(profile,library,DEFAULT_EXTENSION,.62);evaluateExtension(profile,library,DEFAULT_EXTENSION,.2);assert.deepEqual(a,evaluateExtension(profile,library,DEFAULT_EXTENSION,.62));assert.deepEqual(capturePose(profile.nodes),before);assert.equal(JSON.stringify(library),json);
 console.log({maximumJointStep:maxStep,plantedFootVertices:footVertices.length});
});

test('unreachable targets and tight constraints remain finite, bounded and unstretched',()=>{
 const{profile,library}=fixture();for(const position of [[0,1.3,-3],[0,1.5,.2],[2,2,0],[-.5,.8,-.3]] as [number,number,number][])for(const roll of [0,90,180]){
  const d=structuredClone(DEFAULT_EXTENSION);d.target.position=position;d.target.roll=roll;d.limits.shoulderSwing=65;d.limits.elbowMin=25;d.limits.elbowMax=125;
  const r=evaluateExtension(profile,library,d,0,true);assert.ok(r.ik.projectionError>0);assert.ok(r.pose.rotations.flat().every(Number.isFinite));
  r.ik.flexions.forEach(v=>assert.ok(v>=25-1e-4&&v<=125+1e-4,`elbow ${v}`));
  for(const side of ['r','l']){const i=profile.names.indexOf(`upperarm_${side}`),child=profile.names.indexOf(`lowerarm_${side}`),axis=new T.Vector3().fromArray(profile.bind.positions[child]).normalize().applyQuaternion(new T.Quaternion().fromArray(profile.bind.rotations[i]));const bounded=limitJoint(new T.Quaternion().fromArray(r.pose.rotations[i]),new T.Quaternion().fromArray(profile.bind.rotations[i]),axis,d.limits.shoulderSwing,d.limits.shoulderTwist);assert.ok(bounded.rotation.angleTo(new T.Quaternion().fromArray(r.pose.rotations[i]))<1e-6);}
  for(const side of ['r','l']){const i=profile.names.indexOf(`hand_${side}`),axis=new T.Vector3().fromArray(profile.reference.positions[i]).normalize(),q=new T.Quaternion().fromArray(r.pose.rotations[i]);const bounded=limitJoint(q,new T.Quaternion().fromArray(profile.bind.rotations[i]),axis,d.limits.wristSwing,d.limits.wristTwist);assert.ok(bounded.rotation.angleTo(q)<1e-6);}
  assert.deepEqual(r.pose.positions,profile.reference.positions);assert.deepEqual(r.pose.scales,profile.reference.scales);
 }
});

test('blade orientation supports cutting-edge roll and deterministic final-transform contact samples',()=>{
 const{profile,library}=fixture(),d=structuredClone(DEFAULT_EXTENSION),a=weaponOrientation(d.target),b=weaponOrientation({...d.target,roll:90});
 const axis=new T.Vector3(0,1,0);assert.ok(axis.clone().applyQuaternion(a).distanceTo(axis.clone().applyQuaternion(b))<1e-12);assert.ok(Math.abs(new T.Vector3(1,0,0).applyQuaternion(a).dot(new T.Vector3(1,0,0).applyQuaternion(b)))<1e-12);
 const r=evaluateExtension(profile,library,d,.7),center=r.blade.base.clone().lerp(r.tip,.5);assert.equal(sampleExtensionContact(profile,library,d,0,extensionDuration(d),center,.02),true);assert.equal(sampleExtensionContact(profile,library,d,0,d.preparation,center,.02),false);assert.equal(sampleExtensionContact(profile,library,d,0,extensionDuration(d),new T.Vector3(5,5,5),.02),false);
 const trace=extensionTrajectory(profile,library,d,16);for(const p of trace){const r=evaluateExtension(profile,library,d,p.time);assert.deepEqual(p.tip,r.tip.toArray());assert.deepEqual(p.base,r.blade.base.toArray());}assert.deepEqual(trace,extensionTrajectory(profile,library,d,16));
 d.target.roll=20;library.phaseA=d;const loaded=validateLibrary(JSON.parse(JSON.stringify(library)),profile);assert.deepEqual(loaded.phaseA,d);assert.deepEqual(evaluateExtension(profile,loaded,loaded.phaseA!,.5),evaluateExtension(profile,library,d,.5));
 assert.throws(()=>validateExtension({...d,target:{...d.target,position:[NaN,0,0]}}));assert.throws(()=>validateExtension({...d,recovery:0}));assert.throws(()=>validateExtension({...d,limits:{...d.limits,elbowMin:170}}));assert.throws(()=>evaluateExtension(profile,library,d,NaN));
});

test('edited wrist interpolation does not clamp through Euler representation boundaries',()=>{
 const{profile,library}=fixture();library.guards[0].rotations.hand_l=[55,85,60];library.guards[1].rotations.hand_l=[-55,-85,-60];let previous:T.Quaternion|undefined;let maximum=0;
 for(let k=0;k<=480;k++){const r=evaluateUpperBody(profile,library,k/480),q=new T.Quaternion().fromArray(r.pose.rotations[profile.handIndices.left]);if(previous)maximum=Math.max(maximum,previous.angleTo(q));previous=q;}
 assert.ok(maximum<.12,`wrist step ${maximum}`);
});
