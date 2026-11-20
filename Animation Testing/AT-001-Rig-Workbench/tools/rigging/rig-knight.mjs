import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as T from 'three';
import SkinningAlgorithm from './vendor/mesh2motion/solvers/SkinningAlgorithm.ts';
import { SkeletonType } from './vendor/mesh2motion/enums/SkeletonType.ts';

const here=path.dirname(fileURLToPath(import.meta.url)),workbench=path.resolve(here,'../..');
const input=path.join(workbench,'viewer/public/models/red-herald-knight.glb');
const output=path.join(workbench,'viewer/public/models/red-herald-knight-rigged.glb');
const source=path.join(workbench,'viewer/public/reference/Quaternius-UAL1-Standard.glb');
const reports=path.join(workbench,'reports');
function readGLB(file){const raw=fs.readFileSync(file),n=raw.readUInt32LE(12);return {raw,json:JSON.parse(raw.subarray(20,20+n).toString()),bin:raw.subarray(28+n,28+n+raw.readUInt32LE(20+n))};}
const model=readGLB(input),animationSource=readGLB(source);
const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
function accessor(asset,index){const a=asset.json.accessors[index],view=asset.json.bufferViews[a.bufferView];const count=components[a.type],bytes={5126:4,5125:4,5123:2,5121:1}[a.componentType];const result=[];for(let i=0;i<a.count;i++)for(let c=0;c<count;c++){const o=(view.byteOffset??0)+(a.byteOffset??0)+i*(view.byteStride??count*bytes)+c*bytes;result.push(a.componentType===5126?asset.bin.readFloatLE(o):a.componentType===5125?asset.bin.readUInt32LE(o):a.componentType===5123?asset.bin.readUInt16LE(o):asset.bin.readUInt8(o));}return result;}
const geometry=new T.BufferGeometry(),primitive=model.json.meshes[0].primitives[0];
geometry.setAttribute('position',new T.Float32BufferAttribute(accessor(model,primitive.attributes.POSITION),3));geometry.setIndex(accessor(model,primitive.indices));
const sj=animationSource.json,skin=sj.skins[0],sourceSet=new Set(skin.joints);
const sourceNodes=sj.nodes.map((n,i)=>{const o=sourceSet.has(i)?new T.Bone():new T.Group();o.name=n.name??'';if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});
sj.nodes.forEach((n,i)=>(n.children??[]).forEach(c=>sourceNodes[i].add(sourceNodes[c])));
const sourceScene=new T.Group();sj.scenes[0].nodes.forEach(i=>sourceScene.add(sourceNodes[i]));sourceScene.updateWorldMatrix(true,true);
const sourceBones=skin.joints.map(i=>sourceNodes[i]);
const ref=new Map(sourceBones.map(b=>[b.name,{position:b.getWorldPosition(new T.Vector3()),rotation:b.getWorldQuaternion(new T.Quaternion()),local:b.position.clone(),quaternion:b.quaternion.clone()}]));
const armature=new T.Group(),boneMap=new Map();
for(const old of sourceBones){const bone=new T.Bone();bone.name=old.name;bone.position.copy(old.position).multiplyScalar(.54);bone.quaternion.copy(old.quaternion);boneMap.set(bone.name,bone);}
for(const old of sourceBones){const bone=boneMap.get(old.name),parent=boneMap.get(old.parent?.name);(parent??armature).add(bone);}armature.updateWorldMatrix(true,true);
const guides={root:[0,0,0],pelvis:[0,.535,-.005],spine_01:[0,.615,0],spine_02:[0,.690,.003],spine_03:[0,.765,.003],neck_01:[0,.854,.002],Head:[0,.906,.001]};
for(const [side,sign] of [['l',1],['r',-1]]) Object.assign(guides,{
 [`clavicle_${side}`]:[sign*.025,.813,-.002], [`upperarm_${side}`]:[sign*.139,.803,-.002], [`lowerarm_${side}`]:[sign*.177,.669,.006], [`hand_${side}`]:[sign*.202,.528,.012],
 [`thigh_${side}`]:[sign*.071,.529,-.005], [`calf_${side}`]:[sign*.086,.292,.006], [`foot_${side}`]:[sign*.103,.067,-.018], [`ball_${side}`]:[sign*.111,.026,.068], [`ball_leaf_${side}`]:[sign*.113,.017,.108],
});
const majorChild={pelvis:'spine_01',spine_01:'spine_02',spine_02:'spine_03',spine_03:'neck_01',neck_01:'Head'};
for(const side of ['l','r'])for(const [a,b] of [['clavicle','upperarm'],['upperarm','lowerarm'],['lowerarm','hand'],['thigh','calf'],['calf','foot'],['foot','ball'],['ball','ball_leaf']])majorChild[`${a}_${side}`]=`${b}_${side}`;
const fittedOrder=[];armature.traverse(o=>{if(o.isBone)fittedOrder.push(o);});
for(const bone of fittedOrder){
 const original=ref.get(bone.name),target=guides[bone.name];
 if(target){bone.parent.updateWorldMatrix(true,false);bone.position.copy(bone.parent.worldToLocal(new T.Vector3(...target)));}
 else if(/index|middle|ring|pinky|thumb/.test(bone.name))bone.position.copy(original.local).multiplyScalar(.43);
 const childName=majorChild[bone.name];let desiredRotation=original.rotation.clone();
 if(childName){const originalDirection=ref.get(childName).position.clone().sub(original.position).normalize(),desiredDirection=new T.Vector3(...guides[childName]).sub(new T.Vector3(...guides[bone.name])).normalize();desiredRotation.premultiply(new T.Quaternion().setFromUnitVectors(originalDirection,desiredDirection));}
 else if(/^hand_/.test(bone.name)){
  const suffix=bone.name.slice(-1),oldDirection=ref.get(`middle_01_${suffix}`).position.clone().sub(original.position).normalize();
  desiredRotation.premultiply(new T.Quaternion().setFromUnitVectors(oldDirection,new T.Vector3(suffix==='l'?.06:-.06,-1,.10).normalize()));
 } else if(/index|middle|ring|pinky|thumb/.test(bone.name)){bone.quaternion.copy(original.quaternion);bone.updateWorldMatrix(true,true);continue;}
 bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(desiredRotation));bone.updateWorldMatrix(true,true);
}
const headLeaf=new T.Bone();headLeaf.name='head_leaf';boneMap.get('Head').add(headLeaf);headLeaf.position.copy(boneMap.get('Head').worldToLocal(new T.Vector3(0,.993,.001)));armature.updateWorldMatrix(true,true);
const bones=[];armature.traverse(o=>{if(o.isBone)bones.push(o);});
const solver=new SkinningAlgorithm(boneMap.get('root'),SkeletonType.Human);solver.set_geometry(geometry);solver.set_head_weight_correction_enabled(true);solver.set_preview_plane_height(.865);
console.log('Calculating skin weights for',geometry.attributes.position.count,'vertices');
const [indices,weights]=solver.calculate_indexes_and_weights();
const indexOf=name=>bones.indexOf(boneMap.get(name));
armature.updateWorldMatrix(true,true);
const positions=geometry.attributes.position;let helmetVertices=0,clothVertices=0;
// UV islands provide useful local garment/armor regions. Never let a hand bone
// capture a nearby hip/skirt island merely because its midpoint is closer.
const parents=Int32Array.from({length:positions.count},(_,i)=>i);
const find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parents[a]=b;};
for(let i=0;i<geometry.index.count;i+=3){join(geometry.index.getX(i),geometry.index.getX(i+1));join(geometry.index.getX(i),geometry.index.getX(i+2));}
const islands=new Map();
for(let i=0;i<positions.count;i++){const id=find(i),g=islands.get(id)??{vertices:[],x:0,y:0,z:0,red:0,minY:99,maxY:-99};g.vertices.push(i);g.x+=positions.getX(i);g.y+=positions.getY(i);g.z+=positions.getZ(i);g.minY=Math.min(g.minY,positions.getY(i));g.maxY=Math.max(g.maxY,positions.getY(i));islands.set(id,g);}
const centers=bones.map(b=>{const from=b.getWorldPosition(new T.Vector3()),child=b.children.find(c=>c.isBone);return {from,to:child?child.getWorldPosition(new T.Vector3()):from.clone()};});
const nearest=(point,candidates)=>candidates.map(index=>{const {from,to}=centers[index],axis=to.clone().sub(from),t=T.MathUtils.clamp(point.clone().sub(from).dot(axis)/Math.max(axis.lengthSq(),1e-9),0,1);return {index,distance:point.distanceTo(from.clone().addScaledVector(axis,t))};}).sort((a,b)=>a.distance-b.distance)[0].index;
const armOwnership=new Uint8Array(positions.count);
const groupSummary={cloth:0,head:0,torso:0,arm:0,leg:0};
for(const g of islands.values()){
 const count=g.vertices.length,cx=g.x/count,cy=g.y/count,cz=g.z/count,side=cx>=0?'l':'r';

 const region=cy>.865?'head':Math.abs(cx)>.155&&cy>.42&&cy<.855||Math.abs(cx)>.125&&cy>.755&&cy<.865?'arm':cy<.535?'leg':'torso';
 groupSummary[region]+=count;
 const allowed=[];
 for(let k=0;k<bones.length;k++){const name=bones[k].name;if(name==='root'||name.includes('leaf')||name.startsWith('cloth_'))continue;
  const match=region==='head'?name==='Head'||name==='neck_01':region==='arm'?name.endsWith('_'+side)&&/clavicle|arm|hand|index|middle|ring|pinky|thumb/.test(name):region==='leg'?name.endsWith('_'+side)&&/thigh|calf|foot|ball/.test(name)||name==='pelvis':/pelvis|spine|neck|clavicle/.test(name);
  if(match)allowed.push(k);
 }
 for(const i of g.vertices){armOwnership[i]=region==='arm'?1:0;const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),offset=i*4;
  let sum=0;for(let k=0;k<4;k++){if(!allowed.includes(indices[offset+k]))weights[offset+k]=0;sum+=weights[offset+k];}
  if(sum<1e-8){indices[offset]=nearest(new T.Vector3(x,y,z),allowed);weights[offset]=1;for(let k=1;k<4;k++){weights[offset+k]=0;indices[offset+k]=0;}}
  else for(let k=0;k<4;k++)weights[offset+k]/=sum;
  if(y>.868&&Math.abs(x)<.080){indices[offset]=indexOf('Head');weights[offset]=1;for(let k=1;k<4;k++){indices[offset+k]=0;weights[offset+k]=0;}helmetVertices++;}
 }
}
// A continuous torso/arm partition avoids chart-boundary jumps near armpits.
// Each point receives the same anatomical field regardless of its UV island.
for(let i=0;i<positions.count;i++){
 const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);if(y<.555||y>.865)continue;
 const side=x>=0?'l':'r',offset=i*4,total=new Map();
 const boundaries=[[.555,.133],[.60,.119],[.65,.103],[.70,.115],[.75,.125],[.81,.110],[.865,.110]];
 let row=0;while(row<boundaries.length-2&&boundaries[row+1][0]<y)row++;const a=boundaries[row],b=boundaries[row+1],plane=T.MathUtils.lerp(a[1],b[1],T.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1));
 const armMix=T.MathUtils.smoothstep(Math.abs(x),plane-.017,plane+.017);
 const bodyNames=['pelvis','spine_01','spine_02','spine_03','neck_01'];
 const bodyScores=bodyNames.map(name=>{const pos=boneMap.get(name).getWorldPosition(new T.Vector3());return {name,score:Math.exp(-(((y-pos.y)/.068)**2))};});const sum=bodyScores.reduce((sum,x)=>sum+x.score,0);
 for(const entry of bodyScores)total.set(indexOf(entry.name),entry.score/sum*(1-armMix));
 const forearm=1-T.MathUtils.smoothstep(y,.648,.690),clavicle=T.MathUtils.smoothstep(y,.755,.805);
 for(const[name,w]of[[`clavicle_${side}`,clavicle],[`upperarm_${side}`,(1-clavicle)*(1-forearm)],[`lowerarm_${side}`,(1-clavicle)*forearm]])total.set(indexOf(name),(total.get(indexOf(name))??0)+armMix*w);
 const top=[...total].filter(x=>x[1]>.00001).sort((a,b)=>b[1]-a[1]).slice(0,4),norm=top.reduce((sum,x)=>sum+x[1],0);
 for(let k=0;k<4;k++){indices[offset+k]=top[k]?.[0]??0;weights[offset+k]=(top[k]?.[1]??0)/norm;}
}
// The source garment is not cleanly separated from the legs at every edge.
// Use a continuous lower-body field instead of incompatible independent cloth
// transforms on adjacent vertices; separate cloth simulation remains future work.
for(let i=0;i<positions.count;i++){
 const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);if(y>.555||armOwnership[i]&&y>.42)continue;
 const o=i*4,pelvisWeight=T.MathUtils.smoothstep(y,.465,.555),knee=1-T.MathUtils.smoothstep(y,.265,.315),ankle=1-T.MathUtils.smoothstep(y,.048,.098),left=T.MathUtils.smoothstep(x,-.015,.015),toe=T.MathUtils.smoothstep(z,.045,.09)*.35;
 const influence=new Map([[indexOf('pelvis'),pelvisWeight]]);
 for(const[side,sideWeight]of[['l',left],['r',1-left]])for(const[name,w]of[[`thigh_${side}`,1-knee],[`calf_${side}`,knee*(1-ankle)],[`foot_${side}`,knee*ankle*(1-toe)],[`ball_${side}`,knee*ankle*toe]])influence.set(indexOf(name),sideWeight*(1-pelvisWeight)*w);
 const top=[...influence].filter(x=>x[1]>.00001).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=top.reduce((sum,x)=>sum+x[1],0);
 for(let k=0;k<4;k++){indices[o+k]=top[k]?.[0]??0;weights[o+k]=(top[k]?.[1]??0)/sum;}
}
// Give coincident UV seam vertices identical influences. Otherwise different
// color-island constraints can open cracks despite a continuous surface.
const welded=new Map();for(let i=0;i<positions.count;i++){const key=[positions.getX(i),positions.getY(i),positions.getZ(i)].map(v=>Math.round(v*100000)).join(',');if(!welded.has(key))welded.set(key,[]);welded.get(key).push(i);}
for(const vertices of welded.values())if(vertices.length>1){const totals=new Map();for(const i of vertices)for(let k=0;k<4;k++){const o=i*4+k;if(weights[o]>0)totals.set(indices[o],(totals.get(indices[o])??0)+weights[o]);}const top=[...totals].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=top.reduce((s,p)=>s+p[1],0);for(const i of vertices)for(let k=0;k<4;k++){indices[i*4+k]=top[k]?.[0]??0;weights[i*4+k]=(top[k]?.[1]??0)/sum;}}
geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
const bind=new Map(bones.map(b=>[b.name,{position:b.position.clone(),rotation:b.quaternion.clone(),world:b.getWorldQuaternion(new T.Quaternion())}]));
const restore=()=>{for(const b of bones){b.position.copy(bind.get(b.name).position);b.quaternion.copy(bind.get(b.name).rotation);}armature.updateWorldMatrix(true,true);};
let maxWeightError=0;for(let i=0;i<positions.count;i++){const o=i*4,sum=weights[o]+weights[o+1]+weights[o+2]+weights[o+3];maxWeightError=Math.max(maxWeightError,Math.abs(sum-1));for(let k=0;k<4;k++)if(!Number.isFinite(weights[o+k])||weights[o+k]<0||indices[o+k]>=bones.length)throw new Error(`Invalid skin influence ${i}`);}
if(maxWeightError>1e-5)throw new Error('Weight normalization failed');
const json=structuredClone(model.json),chunks=[model.bin];let byteLength=model.bin.length;
function append(values,type,componentType=5126){const alignment=(4-byteLength%4)%4;if(alignment){chunks.push(Buffer.alloc(alignment));byteLength+=alignment;}const typed=componentType===5123?new Uint16Array(values):new Float32Array(values),data=Buffer.from(typed.buffer);const view=json.bufferViews.length;json.bufferViews.push({buffer:0,byteOffset:byteLength,byteLength:data.length});chunks.push(data);byteLength+=data.length;const accessor=json.accessors.length;const count=values.length/components[type],meta={bufferView:view,componentType,count,type};if(type==='SCALAR'&&componentType===5126){meta.min=[Math.min(...values)];meta.max=[Math.max(...values)];}json.accessors.push(meta);return accessor;}
const nodeIndex=new Map(bones.map((b,i)=>[b.name,json.nodes.length+i]));
for(const b of bones)json.nodes.push({name:b.name,translation:b.position.toArray(),rotation:b.quaternion.toArray(),children:b.children.filter(c=>c.isBone).map(c=>nodeIndex.get(c.name))});
json.scenes[json.scene??0].nodes.push(nodeIndex.get('root'));json.nodes[0].skin=0;
const inverses=[];for(const b of bones)inverses.push(...b.matrixWorld.clone().invert().elements);
json.skins=[{name:'RedHeraldKnight_QuaterniusBodyRig',skeleton:nodeIndex.get('root'),joints:bones.map(b=>nodeIndex.get(b.name)),inverseBindMatrices:append(inverses,'MAT4')}];
json.meshes[0].primitives[0].attributes.JOINTS_0=append(indices,'VEC4',5123);json.meshes[0].primitives[0].attributes.WEIGHTS_0=append(weights,'VEC4');
json.animations=[];
for(const src of sj.animations){
 restore();const sourceTracks=[];
 for(const ch of src.channels){const name=sj.nodes[ch.target.node].name;if(!boneMap.has(name))continue;const sampler=src.samplers[ch.sampler],times=accessor(animationSource,sampler.input),values=accessor(animationSource,sampler.output),p=ch.target.path;
  sourceTracks.push(p==='rotation'?new T.QuaternionKeyframeTrack(`${name}.quaternion`,times,values):new T.VectorKeyframeTrack(`${name}.${p==='translation'?'position':'scale'}`,times,values));
 }
 const duration=Math.max(...sourceTracks.map(t=>t.times[t.times.length-1])),sourceClip=new T.AnimationClip(src.name,duration,sourceTracks),sourceMixer=new T.AnimationMixer(sourceScene),sourceAction=sourceMixer.clipAction(sourceClip);sourceAction.setLoop(T.LoopOnce,1);sourceAction.clampWhenFinished=true;sourceAction.play();
 const times=Array.from({length:Math.ceil(duration*30)+1},(_,i)=>i/Math.ceil(duration*30)*duration),rotations=new Map(bones.map(b=>[b,[]])),translations=new Map(bones.map(b=>[b,[]]));
 const keepFittedAxes=name=>/^(root|pelvis|spine_\d+|neck_01|Head|clavicle_[lr])$/.test(name);
 for(const time of times){sourceMixer.setTime(time);sourceScene.updateWorldMatrix(true,true);
  for(const b of bones){
   if(b.name.startsWith('cloth_')||b===headLeaf)continue;
   const sourceBone=sourceNodes.find(n=>n.name===b.name&&n.isBone),r=ref.get(b.name);
   b.position.copy(bind.get(b.name).position);
   if(b.name==='root'||b.name==='pelvis')b.position.add(sourceBone.position.clone().sub(r.local).multiplyScalar(.54));
   let desired=sourceBone.getWorldQuaternion(new T.Quaternion());
   if(keepFittedAxes(b.name))desired.multiply(r.rotation.clone().invert()).multiply(bind.get(b.name).world);
   b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(desired));b.updateWorldMatrix(false,true);
  }
  for(const b of bones){rotations.get(b).push(...b.quaternion.toArray());translations.get(b).push(...b.position.toArray());}
 }
 sourceMixer.stopAllAction();sourceMixer.uncacheRoot(sourceScene);
 const dst={name:src.name,samplers:[],channels:[]};for(const b of bones)for(const[property,type,values]of[['rotation','VEC4',rotations.get(b)],['translation','VEC3',translations.get(b)]]){const sampler=dst.samplers.length;dst.samplers.push({input:append(times,'SCALAR'),output:append(values,type),interpolation:'LINEAR'});dst.channels.push({sampler,target:{node:nodeIndex.get(b.name),path:property}});}json.animations.push(dst);
}

restore();
json.buffers=[{byteLength}];json.asset={...json.asset,generator:'Game1 rigging tool; Mesh2Motion MIT skin solver; Quaternius CC0 motion'};
json.extras={...json.extras,rigging:{sourceMeshSha256:crypto.createHash('sha256').update(model.raw).digest('hex'),animationSource:'Quaternius Universal Animation Library Standard CC0',solver:'Mesh2Motion MIT',status:'First fitted rig; requires visual deformation review, especially fingers and cloth'}};
const bin=Buffer.concat(chunks),binPad=Buffer.alloc((4-bin.length%4)%4),text=Buffer.from(JSON.stringify(json)),jsonPad=Buffer.alloc((4-text.length%4)%4,32),header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);
header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+text.length+jsonPad.length+8+bin.length+binPad.length,8);jh.writeUInt32LE(text.length+jsonPad.length);jh.write('JSON',4);bh.writeUInt32LE(bin.length+binPad.length);bh.write('BIN\0',4);fs.writeFileSync(output,Buffer.concat([header,jh,text,jsonPad,bh,bin,binPad]));
// Bind-pose verification uses the same inverse matrices serialized in the skin.
let bindError=0;const skeleton=new T.Skeleton(bones),skinned=new T.SkinnedMesh(geometry,new T.MeshBasicMaterial());armature.add(skinned);skinned.bind(skeleton);skinned.updateWorldMatrix(true,true);skeleton.update();
for(let i=0;i<positions.count;i+=37)bindError=Math.max(bindError,skinned.getVertexPosition(i,new T.Vector3()).distanceTo(new T.Vector3().fromBufferAttribute(positions,i)));
const report={input,output,sourceMeshSha256:json.extras.rigging.sourceMeshSha256,outputSha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex'),vertices:positions.count,triangles:geometry.index.count/3,bones:bones.length,animationClips:json.animations.length,islandRegions:groupSummary,clothConstrainedVertices:clothVertices,rigidHelmetVertices:helmetVertices,maximumWeightSumError:maxWeightError,maximumSampledBindPoseError:bindError,landmarks:guides,notes:['Original static GLB unchanged. Geometry/UV/material/image data retained.','Fitted body rig requires visual approval. Garment follows continuous lower-body weights; separate cloth motion and finger cleanup remain pending.','Source motion sampled in world orientation; fitted trunk/clavicle axes preserved, limb axes compensated, scaled root/pelvis translation; no independent cloth drivers on fused garment/body regions.']};
fs.writeFileSync(path.join(reports,'knight-rigging-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
