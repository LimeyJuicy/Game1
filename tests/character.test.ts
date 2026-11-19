import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createKnight } from '../src/knight.ts';
import { LIGHTS, HEAVIES, SwordActions, attackDuration, sweptBladeHits } from '../src/combat.ts';

test('character has a weighted human skeleton with independent spine, twist, finger and toe joints', () => {
  const knight=createKnight();
  assert.ok(knight.rig.bones.length>=55);
  for(const name of ['Pelvis','Spine','Ribs','Chest','Head','1 Forearm twist','-1 Finger 2 1','1 Thumb tip','1 Toe']) assert.ok(knight.rig.bones.some(bone=>bone.name===name),name);
  for(const mesh of knight.rig.meshes){
    assert.ok(mesh instanceof THREE.SkinnedMesh);
    const weights=mesh.geometry.getAttribute('skinWeight');
    for(let i=0;i<weights.count;i++)assert.ok(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<1e-5);
  }
});

test('both hands maintain the sword grips through all representative active cuts without stretching', () => {
  const knight=createKnight();
  for(const [i,definition]of [...LIGHTS,...HEAVIES].entries())for(let sample=0;sample<=10;sample++){
    knight.poseAttack(definition,definition.preparation+definition.swing*sample/10,i+1);
    const blade=knight.blade(),axis=new THREE.Vector3().copy(blade.tip).sub(blade.base).normalize();
    for(const side of[-1,1]){
      const expected=new THREE.Vector3().copy(blade.base).addScaledVector(axis,side<0?-.32:-.14);
      const wrist=knight.rig.bones.find(bone=>bone.name===`${side} Hand`)!.getWorldPosition(new THREE.Vector3());
      assert.ok(wrist.distanceTo(expected)<0.025,`${definition.name}: ${side} grip`);
    }
  }
});

test('running low carry clears the floor, releases the support hand, and blends into a cut', () => {
  const knight=createKnight();
  for(let i=0;i<90;i++){knight.animate(i/10,7.2,i/60,1/60,{x:0,z:-.12},false);knight.poseAttack(null,0,0);}
  const blade=knight.blade(); assert.ok(blade.tip.y>0.05); assert.ok(blade.tip.z>0.5);
  const left=knight.rig.bones.find(bone=>bone.name==='-1 Hand')!.getWorldPosition(new THREE.Vector3());
  assert.ok(left.x<-.2);
  knight.poseAttack(LIGHTS[0],0,1);const entry=knight.blade();
  assert.ok(new THREE.Vector3().copy(blade.tip).distanceTo(new THREE.Vector3().copy(entry.tip))<1e-6);
});

test('backspin remains occasional and has ordinary timing, reach, damage and active contact', () => {
  const actions=new SwordActions(); let spins=0;
  for(let i=0;i<12;i++){
    actions.request('heavy');const definition=actions.current!;if(definition.style)spins++;
    assert.equal(attackDuration(definition),1.17);assert.equal(definition.damage,38);
    actions.advance(attackDuration(definition));
  }
  assert.equal(spins,2);
  const knight=createKnight(),definition={...HEAVIES[1],style:'backspin' as const};
  knight.poseAttack(definition,definition.preparation,90);let previous=knight.blade(),hit=false;
  for(let i=1;i<=30;i++){
    knight.poseAttack(definition,definition.preparation+definition.swing*i/30,90);const next=knight.blade();
    hit ||= sweptBladeHits(previous,next,{x:0,y:1.2,z:-1.6},.55);previous=next;
  }
  assert.equal(hit,true);assert.equal(knight.root.rotation.y,0);
});


test('helmet surfaces face outward so ink contours do not cover the enemy material', () => {
  const knight=createKnight(), steel=knight.rig.meshes.find(mesh=>mesh.name==='steel skinned surface')!;
  const position=steel.geometry.getAttribute('position'),normal=steel.geometry.getAttribute('normal');
  let checked=0;
  for(let i=0;i<position.count;i++)if(position.getY(i)>1.71&&position.getZ(i)>.04){
    const outward=position.getX(i)*normal.getX(i)+(position.getZ(i)-.01)*normal.getZ(i);
    assert.ok(outward>=-1e-5);checked++;
  }
  assert.ok(checked>10);
});

test('interrupting a backspin preserves the visible pose then smoothly returns to ready', () => {
  const knight=createKnight(), definition={...HEAVIES[1],style:'backspin' as const};
  knight.poseAttack(definition,definition.preparation*.4,1);
  const before=knight.blade();
  knight.poseAttack(null,0,1);
  assert.ok(new THREE.Vector3().copy(before.tip).distanceTo(knight.blade().tip)<1e-6);
  const ready=createKnight().blade();
  for(let i=0;i<90;i++) {
    knight.animate(0,0,0,1/60);
    knight.poseAttack(null,0,1);
  }
  assert.ok(new THREE.Vector3().copy(ready.tip).distanceTo(knight.blade().tip)<.005);
  assert.equal(knight.root.rotation.y,0);
});
