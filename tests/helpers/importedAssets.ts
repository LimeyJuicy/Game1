import fs from 'node:fs';
import * as T from 'three';

/** CPU fixture reads the actual shipped GLBs, including their mesh/skin data. */
function load(file:URL){
  const raw=fs.readFileSync(file),size=raw.readUInt32LE(12),j=JSON.parse(raw.subarray(20,20+size).toString()),bin=raw.subarray(28+size);
  const read=(index:number)=>{
    const a=j.accessors[index],v=j.bufferViews[a.bufferView],width=({SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16} as Record<string,number>)[a.type],size=({5126:4,5125:4,5123:2,5121:1} as Record<number,number>)[a.componentType];
    return Array.from({length:a.count*width},(_,i)=>{const o=(v.byteOffset??0)+(a.byteOffset??0)+Math.floor(i/width)*(v.byteStride??width*size)+(i%width)*size;return a.componentType===5126?bin.readFloatLE(o):a.componentType===5125?bin.readUInt32LE(o):a.componentType===5123?bin.readUInt16LE(o):bin.readUInt8(o);});
  };
  const joints=new Set<number>((j.skins??[]).flatMap((s:any)=>s.joints));
  const nodes:T.Object3D[]=j.nodes.map((n:any,i:number)=>{const o=joints.has(i)?new T.Bone():new T.Group();o.name=n.name??'';if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});
  j.nodes.forEach((n:any,i:number)=>(n.children??[]).forEach((c:number)=>nodes[i].add(nodes[c])));
  const scene=new T.Group();j.scenes[j.scene??0].nodes.forEach((i:number)=>scene.add(nodes[i]));scene.updateWorldMatrix(true,true);
  j.nodes.forEach((n:any,i:number)=>{
    if(n.mesh===undefined)return;
    for(const p of j.meshes[n.mesh].primitives){
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(read(p.attributes.POSITION),3));
      if(p.indices!==undefined)geometry.setIndex(read(p.indices));
      const mesh=n.skin===undefined?new T.Mesh(geometry,new T.MeshBasicMaterial()):new T.SkinnedMesh(geometry,new T.MeshBasicMaterial());
      nodes[i].add(mesh);
      if(mesh instanceof T.SkinnedMesh){
        geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(read(p.attributes.JOINTS_0),4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(read(p.attributes.WEIGHTS_0),4));
        const s=j.skins[n.skin],matrices=read(s.inverseBindMatrices),skeleton=new T.Skeleton(s.joints.map((k:number)=>nodes[k] as T.Bone),s.joints.map((_:number,k:number)=>new T.Matrix4().fromArray(matrices,k*16)));
        mesh.updateWorldMatrix(true,false);mesh.bind(skeleton,mesh.matrixWorld.clone());
      }
    }
  });
  const clips:T.AnimationClip[]=(j.animations??[]).map((a:any)=>new T.AnimationClip(a.name,-1,a.channels.map((c:any)=>{
    const s=a.samplers[c.sampler],name=j.nodes[c.target.node].name,property=c.target.path==='rotation'?'quaternion':c.target.path==='translation'?'position':'scale';
    return property==='quaternion'?new T.QuaternionKeyframeTrack(`${name}.${property}`,read(s.input),read(s.output)):new T.VectorKeyframeTrack(`${name}.${property}`,read(s.input),read(s.output));
  })));
  return {scene,clips};
}
export function importedAssets(){
  const base=new URL('../../Animation%20Testing/AT-001-Rig-Workbench/viewer/public/models/',import.meta.url);
  const knight=load(new URL('red-herald-knight-rigged.glb',base)),sword=load(new URL('player-sword.glb',base));
  return {model:knight.scene,clips:knight.clips,sword:sword.scene};
}
