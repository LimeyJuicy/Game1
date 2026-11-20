import {validateExtension,type ExtensionDefinition} from './extension.ts';
import {UPPER_BONES, PROFILE_ID, type BoneName, type Triple, type RigProfile} from './rigProfile.ts';
export interface Guard {id:string;name:string;rotations:Record<BoneName,Triple>}
export interface PoseLibrary {
  schemaVersion:1;profileId:string;referenceId:'high-stance-idle-0';duration:number;
  guards:[Guard,Guard]; bridge:Array<{t:number;rotations:Record<BoneName,Triple>}>;
  socket:{position:Triple;rotation:Triple}; phaseA?:ExtensionDefinition;
}
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const triple=(a:unknown):a is Triple=>Array.isArray(a)&&a.length===3&&a.every(finite);
export function validateLibrary(value:unknown,profile:RigProfile):PoseLibrary{
  const j=structuredClone(value) as PoseLibrary;
  if(!j||j.schemaVersion!==1||j.profileId!==PROFILE_ID||j.referenceId!=='high-stance-idle-0')throw new Error('Unsupported schema or knight reference profile');
  if(!finite(j.duration)||j.duration<.2||j.duration>10)throw new Error('Transition duration must be 0.2–10 seconds');
  if(!Array.isArray(j.guards)||j.guards.length!==2||j.guards.some(g=>!g||typeof g.name!=='string'||g.name.length>80||typeof g.id!=='string'))throw new Error('Expected two named guards');
  const validateRotations=(rotations:Record<BoneName,Triple>)=>{
    if(!rotations||Object.keys(rotations).length!==UPPER_BONES.length||Object.keys(rotations).some(n=>!UPPER_BONES.includes(n as BoneName)))throw new Error('Only upper-body bone rotations may be imported');
    for(const name of UPPER_BONES){const a=rotations[name];if(!triple(a)||a.some((n,i)=>Math.abs(n)>profile.limits[name][i]+1e-5))throw new Error(`Invalid rotation or authoring bound: ${name}`);}
  };
  j.guards.forEach(g=>validateRotations(g.rotations));
  if(!Array.isArray(j.bridge)||j.bridge.length<2||j.bridge.length>241)throw new Error('Invalid authored transition');
  j.bridge.forEach((k,i)=>{if(!finite(k.t)||k.t<0||k.t>1||(i>0&&k.t<=j.bridge[i-1].t))throw new Error('Transition keys must increase');validateRotations(k.rotations);});
  if(j.bridge[0].t!==0||j.bridge.at(-1)!.t!==1)throw new Error('Transition must include both endpoints');
  if(!j.socket||!triple(j.socket.position)||!triple(j.socket.rotation))throw new Error('Invalid sword socket');
  if(j.socket.position.some((v,i)=>Math.abs(v-profile.socket.position[i])>.015001)||j.socket.rotation.some((v,i)=>Math.abs(v-profile.socket.rotation[i])>Math.PI/9+.000001))throw new Error('Sword socket outside calibration range');
  if(j.phaseA!==undefined)j.phaseA=validateExtension(j.phaseA);
  return j;
}
