// Decode every downloaded GLB using the same Three.js loader family as Game1.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {AnimationMixer,LoopOnce,PropertyBinding} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const root=new URL('../',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',root),'utf8'));
const loader=new GLTFLoader(),results=[],failures=[];
for(const entry of manifest.clips){
 try{
  const data=await fs.readFile(new URL(entry.path,root));
  if(crypto.createHash('sha256').update(data).digest('hex')!==entry.sha256)throw new Error('Hash mismatch');
  const gltf=await loader.parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  if(!gltf.animations.length||gltf.animations.some(a=>!Number.isFinite(a.duration)||a.duration<=0||!a.tracks.length))throw new Error('Missing/invalid playable clip');
  let bones=0;gltf.scene.traverse(n=>{if(n.isBone)bones++;});
  for(const name of ['pelvis','Head','upperarm_l','lowerarm_l','hand_l','upperarm_r','lowerarm_r','hand_r','thigh_l','thigh_r','foot_l','foot_r'])if(!gltf.scene.getObjectByName(name))throw new Error(`Missing humanoid joint ${name}`);
  if(entry.validation.skins.length&&bones<10)throw new Error(`Unexpected skinned skeleton: ${bones} bones`);
  const mixer=new AnimationMixer(gltf.scene);
  for(const a of gltf.animations){
   for(const track of a.tracks){if(!track.validate())throw new Error('Invalid Three.js track');if(!PropertyBinding.findNode(gltf.scene,PropertyBinding.parseTrackName(track.name).nodeName))throw new Error(`Unbound track ${track.name}`);}
   const action=mixer.clipAction(a);action.setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();
   for(const t of [0,a.duration*.5,a.duration]){mixer.setTime(t);gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(n=>{if(![...n.position.toArray(),...n.quaternion.toArray(),...n.scale.toArray(),...n.matrixWorld.elements].every(Number.isFinite))throw new Error('Nonfinite evaluated transform');});}mixer.stopAllAction();
  }
  mixer.uncacheRoot(gltf.scene);
  results.push({id:entry.id,bones,hierarchyKind:bones?'skin-joints':'transform-joints-without-skin',clips:gltf.animations.map(a=>({name:a.name,duration:a.duration,tracks:a.tracks.length}))});
 }catch(error){failures.push({id:entry.id,error:String(error)});}
}
const report={verified:results.length,failed:failures.length,results,failures,scope:'Byte/hash integrity, embedded buffers, animation timing/finite keys and actual Three.js decoding, track binding and three sampled mixer poses per clip. No knight retargeting or visual-quality approval.'};
await fs.writeFile(new URL('verification.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({verified:report.verified,failed:report.failed,failures},null,2));
if(failures.length||results.length!==manifest.selected)process.exitCode=1;
