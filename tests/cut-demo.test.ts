import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';
import{importedAssets}from'./helpers/importedAssets.ts';
import{createImportedKnight}from'../Animation Testing/AT-007-Footwork/viewer/importedKnight.ts';
import{stancePose,stanceById}from'../src/footwork/stances.ts';import{solveLowerBody}from'../src/footwork/legs.ts';
import{createRigProfile,capturePose}from'../src/animation/rigProfile.ts';
import{validateLibrary}from'../src/animation/definitions.ts';import{applyEvaluation}from'../src/animation/evaluate.ts';
function fixture(){const a=importedAssets(),actor=createImportedKnight(a.model,a.clips,a.sword),bind=capturePose(actor.bones);actor.update(solveLowerBody(stancePose(stanceById('high'),1),actor.measurements),0);const profile=createRigProfile(actor.root,bind);const data=JSON.parse(fs.readFileSync(new URL('../src/animation/assets/default-guards.json',import.meta.url),'utf8'));return{actor,profile,library:validateLibrary(data,profile)};}

import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createCutDemo} from '../src/animation/cutDemo.ts';
import {createImportedLowerPose} from '../src/animation/importedLowerPose.ts';
import {createFootwork} from '../src/footwork/controller.ts';
const definition=JSON.parse(fs.readFileSync(new URL('../src/animation/assets/cut-demo.json',import.meta.url),'utf8'));
import {configureSingleHandSword} from '../src/animation/singleHandSword.ts';
async function demo(){const f=fixture();const load=async(id:string)=>{const b=fs.readFileSync(new URL(`../Animation%20Testing/AT-016-KinemIQ-Library/clips/${id}.glb`,import.meta.url));return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};const[g,idle]=await Promise.all([load('sword_light_a'),load('sword_idle')]);configureSingleHandSword(f.profile,{id:'single',scale:.34,gripY:.045,sourceLength:1.798174});f.library.socket.position=[...f.profile.socket.position];return{...f,source:g.scene,cut:createCutDemo(f.profile,f.library,f.actor.measurements,g.scene,g.animations[0],definition,{scene:idle.scene,clip:idle.animations[0]})};}
test('pure imported leg adapter reproduces the existing PR mesh adapter',()=>{
 const{profile,actor}=fixture(),adapt=createImportedLowerPose(profile),fw=createFootwork({stance:'high'});fw.lunge(.35,.5);
 for(let k=0;k<40;k++){fw.advance(1/120);const solution=solveLowerBody(fw.pose(),actor.measurements),pose=adapt(profile.reference,solution);actor.update(solution,0);for(let i=0;i<profile.names.length;i++)if(/^(pelvis|thigh_|calf_|foot_|ball_)/.test(profile.names[i])){assert.ok(new T.Quaternion().fromArray(pose.rotations[i]).normalize().angleTo(profile.nodes[i].quaternion.clone().normalize())<1e-6,profile.names[i]);assert.ok(new T.Vector3().fromArray(pose.positions[i]).distanceTo(profile.nodes[i].position)<1e-6);}}
});

test('downloaded cut and PR step keep the resized sword attached and evaluated feet on targets',async()=>{
 const{profile,actor,cut}=await demo();let maxStep=0,maxFootError=0;let footSamples=0;
 for(const moving of [false,true]){
  let previous:ReturnType<typeof cut.evaluate>|undefined;
  const initial=cut.evaluate(0,moving),firstFeet=initial.ankleTargets;
  for(let k=0;k<=240;k++){
   const r=cut.evaluate(k/240*cut.duration,moving);assert.ok(r.gripErrors.right<1e-7);assert.equal(r.singleHand,true);
   for(let i=0;i<profile.names.length;i++){assert.deepEqual(r.pose.scales[i],profile.reference.scales[i]);if(profile.names[i]!=='pelvis')assert.deepEqual(r.pose.positions[i],profile.reference.positions[i]);assert.ok(Math.abs(new T.Quaternion().fromArray(r.pose.rotations[i]).length()-1)<1e-6);}
   if(!moving)r.ankleTargets.forEach((p,i)=>assert.ok(p.distanceTo(firstFeet[i])<1e-7));
   if(previous)for(let i=0;i<profile.names.length;i++)maxStep=Math.max(maxStep,new T.Quaternion().fromArray(r.pose.rotations[i]).angleTo(new T.Quaternion().fromArray(previous.pose.rotations[i])));previous=r;
   if(k%8===0){actor.root.position.set(r.root.x,0,r.root.z);actor.root.rotation.y=r.root.yaw;applyEvaluation(profile,r);r.weaponWorld.elements.forEach((v,i)=>assert.ok(Math.abs(v-profile.weapon.matrixWorld.elements[i])<1e-8));for(const[i,side]of ['l','r'].entries()){const p=actor.model.getObjectByName(`foot_${side}`)!.getWorldPosition(new T.Vector3());maxFootError=Math.max(maxFootError,p.distanceTo(r.ankleTargets[i]));footSamples++;}}
  }
  assert.ok(new T.Quaternion().fromArray(initial.pose.rotations[profile.handIndices.left]).angleTo(new T.Quaternion().fromArray(cut.evaluate(.7,moving).pose.rotations[profile.handIndices.left]))>.1,'free arm should follow the source cut');
 }
 assert.ok(maxFootError<1e-6,`ankle error ${maxFootError}`);assert.ok(maxStep<.2,`joint snap ${maxStep}`);
 assert.equal(cut.evaluate(cut.duration,false).root.z,0);assert.ok(Math.abs(cut.evaluate(cut.duration,true).root.z+.303)<1e-5);
 const plant=cut.events.find(e=>e.type==='plant'&&e.move==='lunge')!;assert.ok(plant.time>definition.preparation&&plant.time<definition.preparation+definition.cut);
 console.log({maxJointStep:maxStep,maxFootError,footSamples,leadPlant:plant.time});
});

test('cut samples reproduce out of order without mutating source, skeleton, definitions or PR state',async()=>{
 const{profile,source,cut,library}=await demo(),scene=capturePose(profile.nodes),sourceNodes:T.Object3D[]=[];source.traverse(n=>sourceNodes.push(n));const original=capturePose(sourceNodes as T.Bone[]),saved=JSON.stringify(library),config=JSON.stringify(definition);
 const a=cut.evaluate(.71,true);cut.evaluate(.1,false);cut.evaluate(1.4,true);assert.deepEqual(cut.evaluate(.71,true),a);assert.deepEqual(capturePose(profile.nodes),scene);assert.deepEqual(capturePose(sourceNodes as T.Bone[]),original);assert.equal(JSON.stringify(library),saved);assert.equal(JSON.stringify(definition),config);assert.throws(()=>cut.evaluate(NaN,true));
 // The final source geometry still measures the intended physical single-hand size.
 applyEvaluation(profile,cut.evaluate(0,false));const axis=new T.Vector3(0,1,0).transformDirection(profile.weapon.matrixWorld);let min=Infinity,max=-Infinity;profile.weapon.traverse(n=>{if(n instanceof T.Mesh){const a=n.geometry.getAttribute('position');for(let i=0;i<a.count;i++){const v=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(n.matrixWorld).dot(axis);min=Math.min(min,v);max=Math.max(max,v);}}});assert.ok(Math.abs(max-min-1.10048)<.001,`mesh sword length ${max-min}`);
});
