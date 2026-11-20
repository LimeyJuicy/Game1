import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';
import{importedAssets}from'./helpers/importedAssets.ts';
import{createImportedKnight}from'../Animation Testing/AT-007-Footwork/viewer/importedKnight.ts';
import{stancePose,stanceById}from'../src/footwork/stances.ts';import{solveLowerBody}from'../src/footwork/legs.ts';
import{createRigProfile,capturePose,UPPER_BONES,type BoneName}from'../src/animation/rigProfile.ts';
import{applyPose,poseError}from'../src/animation/pose.ts';import{validateLibrary}from'../src/animation/definitions.ts';import{applyEvaluation,evaluateUpperBody,setBoneRotation}from'../src/animation/evaluate.ts';
function fixture(){const a=importedAssets(),actor=createImportedKnight(a.model,a.clips,a.sword),bind=capturePose(actor.bones);actor.update(solveLowerBody(stancePose(stanceById('high'),1),actor.measurements),0);const profile=createRigProfile(actor.root,bind);const data=JSON.parse(fs.readFileSync(new URL('../src/animation/assets/default-guards.json',import.meta.url),'utf8'));return{actor,profile,library:validateLibrary(data,profile)};}

test('actual imported mesh has reference hierarchy, independently editable joints and a fixed sword socket',()=>{
 const{actor,profile,library}=fixture();assert.equal(profile.names.length,66);let skinned=0;actor.model.traverse(n=>{if(n instanceof T.SkinnedMesh){skinned++;assert.equal(n.geometry.attributes.position.count,167063);}});assert.equal(skinned,1);
 const boneState=capturePose(profile.nodes),input=JSON.stringify(library),a=evaluateUpperBody(profile,library,.3);evaluateUpperBody(profile,library,.8);const b=evaluateUpperBody(profile,library,.3);
 assert.deepEqual(a.pose,b.pose);assert.deepEqual(capturePose(profile.nodes),boneState);assert.equal(JSON.stringify(library),input);
 for(const name of UPPER_BONES){const edited=setBoneRotation(library,profile,0,name,[1,2,3]),p=evaluateUpperBody(profile,edited,0).pose,base=evaluateUpperBody(profile,library,0).pose;assert.notDeepEqual(p.rotations[profile.names.indexOf(name)],base.rotations[profile.names.indexOf(name)]);for(let i=0;i<profile.names.length;i++)if(profile.names[i]!==name)assert.deepEqual(p.rotations[i],base.rotations[i]);}
});

test('authored guards and their full transition preserve actual foot vertices, lengths and both grips',()=>{
 const{actor,profile,library}=fixture();let maximumGap=0,maximumJump=0,maximumJointStep=0,previous:T.Vector3|undefined;let previousRotations:number[][]|undefined;
 const footIndices=profile.names.map((name,i)=>/^(pelvis|thigh_|calf_|foot_|ball_)/.test(name)?i:-1).filter(i=>i>=0),base=evaluateUpperBody(profile,library,0);
 let mesh:T.SkinnedMesh;actor.model.traverse(n=>{if(n instanceof T.SkinnedMesh)mesh=n;});
 const footVertices:number[]=[];for(let i=0;i<mesh!.geometry.attributes.position.count;i++)if(mesh!.geometry.attributes.position.getY(i)<.055&&i%29===0)footVertices.push(i);
 applyPose(profile,base.pose);mesh!.skeleton.update();const ground=footVertices.map(i=>mesh!.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh!.matrixWorld));
 for(let sample=0;sample<=480;sample++){
  const r=evaluateUpperBody(profile,library,sample/480);maximumGap=Math.max(maximumGap,r.gripErrors.left,r.gripErrors.right);
  for(const i of footIndices){assert.deepEqual(r.pose.rotations[i],base.pose.rotations[i]);assert.deepEqual(r.pose.positions[i],base.pose.positions[i]);}
  for(let i=0;i<profile.names.length;i++){assert.deepEqual(r.pose.positions[i],profile.reference.positions[i]);assert.ok(Math.abs(new T.Quaternion().fromArray(r.pose.rotations[i]).length()-1)<1e-6);}
  if(previousRotations)for(const n of UPPER_BONES){const index=profile.names.indexOf(n);maximumJointStep=Math.max(maximumJointStep,new T.Quaternion().fromArray(previousRotations[index]).angleTo(new T.Quaternion().fromArray(r.pose.rotations[index])));}
  previousRotations=r.pose.rotations;
  if(previous)maximumJump=Math.max(maximumJump,r.tip.distanceTo(previous));previous=r.tip;
  if(sample%40===0){applyEvaluation(profile,r);r.weaponWorld.elements.forEach((v,k)=>assert.ok(Math.abs(v-profile.weapon.matrixWorld.elements[k])<1e-8));mesh!.skeleton.update();footVertices.forEach((i,k)=>assert.ok(mesh!.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh!.matrixWorld).distanceTo(ground[k])<1e-6));}
 }
 assert.ok(maximumGap<.005,`support grip separation ${maximumGap} m`);assert.ok(maximumJump<.04,`blade snap ${maximumJump} m`);
 assert.ok(maximumJointStep<.14,`joint snap ${maximumJointStep} radians`);
 const last=evaluateUpperBody(profile,library,1);assert.ok(base.tip.distanceTo(last.tip)>.5);console.log({maximumGripGap:maximumGap,maximumTipStep:maximumJump,maximumJointStep,footVertices:footVertices.length});
});

test('pose JSON round-trips, rejects lower-body edits and enforces editor bounds',()=>{
 const{profile,library}=fixture(),edited=setBoneRotation(library,profile,1,'spine_03',[5,-12,2]);edited.duration=2.7;
 const loaded=validateLibrary(JSON.parse(JSON.stringify(edited)),profile);for(const t of[0,.2,.5,.8,1]){const a=evaluateUpperBody(profile,edited,t).pose,b=evaluateUpperBody(profile,loaded,t).pose;assert.deepEqual(a,b);assert.ok(poseError(a,b)<1e-7);};
 const calibrated=structuredClone(library);calibrated.socket.position[0]+=.003;const validSocket=validateLibrary(calibrated,profile),socketPose=evaluateUpperBody(profile,validSocket,0);applyEvaluation(profile,socketPose);socketPose.weaponWorld.elements.forEach((v,i)=>assert.ok(Math.abs(v-profile.weapon.matrixWorld.elements[i])<1e-8));
 const bad=structuredClone(library);(bad.guards[0].rotations as Record<string,number[]>).pelvis=[0,0,0];assert.throws(()=>validateLibrary(bad,profile),/upper-body/);
 const invalid=structuredClone(library);invalid.guards[0].rotations.hand_r[0]=999;assert.throws(()=>validateLibrary(invalid,profile),/bound/);
 assert.throws(()=>validateLibrary({...library,profileId:'another-rig'},profile),/profile/);
 const clamped=setBoneRotation(library,profile,0,'Head',[900,-900,900]);assert.deepEqual(clamped.guards[0].rotations.Head,profile.limits.Head.map((v,i)=>i===1?-v:v));
 for(const n of UPPER_BONES)assert.ok(profile.names.includes(n as BoneName));
});
