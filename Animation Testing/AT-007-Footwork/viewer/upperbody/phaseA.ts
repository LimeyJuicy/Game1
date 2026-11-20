import * as T from 'three';
import {DEFAULT_EXTENSION,evaluateExtension,extensionDuration,extensionTrajectory,sampleExtensionContact,type ExtensionDefinition} from '../../../../src/animation/extension.ts';
import type {PoseLibrary} from '../../../../src/animation/definitions.ts';
import type {RigProfile} from '../../../../src/animation/rigProfile.ts';

/** One explicit preview clock. Evaluation and contact queries never advance it. */
export function createPhaseA(scene:T.Scene,profile:RigProfile,getLibrary:()=>PoseLibrary,onChange:()=>void){
 const section=document.createElement('section');section.innerHTML=`<h2>Phase A · weapon targets</h2><label class="check"><input id="ik-enable" type="checkbox">Enable bounded arm IK</label><label>Preview<select id="ik-mode"><option value="target">Stationary target</option><option value="extension">Prepared extension</option></select></label><p class="note">Position is the right-hand grip in bench metres. Pitch/yaw aim the blade; edge roll rotates its cutting edge. The left hand follows the same rigid sword. Bounds take priority over unreachable targets; residuals are shown.</p><label>Authored seed guard<select id="ik-base"><option value="0">High right guard</option><option value="1">Forward rising guard</option></select></label><div id="ik-controls"></div><div class="buttons"><button id="ik-play">Play extension</button><button id="ik-reset">Reset Phase A</button></div><label>Action time <output id="ik-time-label"></output><input id="ik-time" type="range" min="0" step="0.001" value="0"></label><label class="check"><input id="ik-path" type="checkbox" checked>Weapon trajectory and contact probe</label><p class="note">Magenta: requested grip. Gold: actual grip. Blue path: final sword tip. Green sphere: contact probe at the active blade midpoint. Preview only; no damage or live gameplay changes. Joint controls below author the seed pose; IK owns arm/wrist corrections while enabled.</p>`;
 document.querySelector('aside')!.insertBefore(section,document.querySelector('aside section'));
 const $=<E extends HTMLElement>(id:string)=>document.getElementById(id) as E;
 let enabled=new URLSearchParams(location.search).has('phaseA'),mode='target',time=0,playing=false,stale=true;
 const target=new T.Mesh(new T.SphereGeometry(.018,12,8),new T.MeshBasicMaterial({color:'#d72ca7',depthTest:false}));
 const actual=new T.Mesh(new T.SphereGeometry(.012,12,8),new T.MeshBasicMaterial({color:'#f3bc35',depthTest:false}));
 const path=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:'#21669b'}));
 const probe=new T.Mesh(new T.SphereGeometry(.055,16,12),new T.MeshBasicMaterial({color:'#3a9b64',transparent:true,opacity:.55}));
 const edge=new T.ArrowHelper(new T.Vector3(0,1,0),new T.Vector3(),.16,0xd17b16,.03,.02);scene.add(target,actual,path,probe,edge);
 let contact=false;
 if(enabled)getLibrary().phaseA??=structuredClone(DEFAULT_EXTENSION);
 const definition=()=>getLibrary().phaseA??structuredClone(DEFAULT_EXTENSION);
 function pause(){playing=false;$('ik-play').textContent='Play extension';}
 function edit(){pause();time=Math.min(time,extensionDuration(definition()));stale=true;onChange();}
 function number(label:string,id:string,value:number,min:number,max:number,step:number,set:(n:number)=>void,container='ik-controls'){
  const row=document.createElement('label');row.textContent=label;const input=document.createElement('input');input.type='number';input.id=id;input.value=String(value);input.min=String(min);input.max=String(max);input.step=String(step);
  input.addEventListener('change',()=>{const n=Number(input.value);if(!Number.isFinite(n)||n<min||n>max){input.value=String(value);return;}const library=getLibrary();library.phaseA??=structuredClone(DEFAULT_EXTENSION);set(n);edit();refresh();});row.append(input);$(container).append(row);
 }
 function refresh(){
  const expanded=document.querySelector<HTMLDetailsElement>('#ik-controls details')?.open??false,d=structuredClone(definition());$<HTMLSelectElement>('ik-base').value=String(d.baseGuard);$('ik-controls').replaceChildren();$<HTMLInputElement>('ik-enable').checked=enabled;$<HTMLSelectElement>('ik-mode').value=mode;$<HTMLInputElement>('ik-time').max=String(extensionDuration(d));
  for(let i=0;i<3;i++)number(`Grip ${'XYZ'[i]} (m)`,`ik-pos-${i}`,d.target.position[i],-3,3,.01,n=>getLibrary().phaseA!.target.position[i]=n);
  for(const key of ['pitch','yaw','roll'] as const)number(key==='roll'?'Blade edge roll (°)':`Blade ${key} (°)`,`ik-${key}`,d.target[key],-180,180,1,n=>getLibrary().phaseA!.target[key]=n);
  for(let i=0;i<2;i++)number(`${i?'Left':'Right'} elbow swivel (°)`,`ik-elbow-${i}`,d.target.elbowSwivel[i],-80,80,1,n=>getLibrary().phaseA!.target.elbowSwivel[i]=n);
  const fields:Array<[keyof Pick<ExtensionDefinition,'preparation'|'extension'|'hold'|'recovery'|'distance'|'drawback'|'torsoLean'|'torsoTurn'>,number,number,number]>=[['preparation',0,2,.05],['extension',.1,2,.05],['hold',0,2,.05],['recovery',.1,2,.05],['distance',0,.35,.01],['drawback',0,.35,.005],['torsoLean',-20,20,1],['torsoTurn',-20,20,1]];
  for(const[key,min,max,step]of fields)number(key,`ik-${key}`,d[key],min,max,step,n=>getLibrary().phaseA![key]=n);
  const bounds=document.createElement('details');bounds.open=expanded;bounds.innerHTML='<summary>Joint bounds (degrees)</summary>';const area=document.createElement('div');area.id='ik-bounds';bounds.append(area);$('ik-controls').append(bounds);
  for(const key of Object.keys(d.limits) as Array<keyof typeof d.limits>)number(key,`ik-limit-${key}`,d.limits[key],key==='elbowMin'?5:key==='shoulderSwing'?20:0,key==='elbowMin'||key==='elbowMax'?165:175,1,n=>{const limits=getLibrary().phaseA!.limits;limits[key]=n;if(limits.elbowMin>=limits.elbowMax){limits.elbowMin=d.limits.elbowMin;limits.elbowMax=d.limits.elbowMax;}},'ik-bounds');
 }
 function invalidate(){pause();stale=true;time=Math.min(time,extensionDuration(definition()));refresh();}
 $('ik-base').addEventListener('change',()=>{getLibrary().phaseA??=structuredClone(DEFAULT_EXTENSION);getLibrary().phaseA!.baseGuard=Number($<HTMLSelectElement>('ik-base').value) as 0|1;edit();});
 $('ik-enable').addEventListener('change',()=>{enabled=$<HTMLInputElement>('ik-enable').checked;if(enabled)getLibrary().phaseA??=structuredClone(DEFAULT_EXTENSION);edit();});
 $('ik-mode').addEventListener('change',()=>{mode=$<HTMLSelectElement>('ik-mode').value;edit();});
 $('ik-play').addEventListener('click',()=>{if(playing)pause();else{enabled=true;mode='extension';getLibrary().phaseA??=structuredClone(DEFAULT_EXTENSION);if(time>=extensionDuration(definition()))time=0;onChange();playing=true;$('ik-play').textContent='Pause extension';refresh();}});
 $('ik-time').addEventListener('input',()=>{pause();time=Number($<HTMLInputElement>('ik-time').value);getLibrary().phaseA??=structuredClone(DEFAULT_EXTENSION);enabled=true;mode='extension';onChange();refresh();});
 $('ik-reset').addEventListener('click',()=>{getLibrary().phaseA=structuredClone(DEFAULT_EXTENSION);time=0;edit();refresh();});
 $('ik-path').addEventListener('change',()=>onChange());
 function update(dt:number,rate:number){if(!playing||!enabled)return false;time=Math.min(time+dt*rate,extensionDuration(definition()));if(time>=extensionDuration(definition()))pause();return true;}
 function display(result?:ReturnType<typeof evaluateExtension>){
  const visible=enabled&&$<HTMLInputElement>('ik-path').checked;for(const helper of[target,actual,path,probe,edge])helper.visible=visible;
  if(!enabled||!result)return '';
  if(stale){const d=definition(),points=extensionTrajectory(profile,getLibrary(),d,48);path.geometry.dispose();path.geometry=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p.tip as [number,number,number])));
   const active=evaluateExtension(profile,getLibrary(),d,d.preparation+d.extension*.8);probe.position.copy(active.blade.base).lerp(active.tip,.5);contact=sampleExtensionContact(profile,getLibrary(),d,0,extensionDuration(d),probe.position,.055);stale=false;}
  target.position.fromArray(result.requested.position);actual.position.set(0,.045,0).applyMatrix4(result.weaponWorld);edge.position.copy(actual.position);edge.setDirection(result.edge);
  $('ik-time-label').textContent=`${time.toFixed(2)} s · ${result.phase}`;$<HTMLInputElement>('ik-time').value=String(time);
  return `\nPhase A: ${result.phase} · ${time.toFixed(2)} s\nTarget residual ${(result.ik.targetError*1000).toFixed(2)} mm / ${(result.ik.orientationError*180/Math.PI).toFixed(2)}°\nReach projection ${(result.ik.projectionError*1000).toFixed(2)} mm · bound clamps ${result.ik.constrained}\nElbow bend ${result.ik.flexions.map(v=>v.toFixed(1)).join(' / ')}°\nFinal-blade contact probe: ${contact?'HIT':'MISS'} (240 Hz sampling)`;
 }
 refresh();
 return {get enabled(){return enabled;},get playing(){return playing;},get time(){return time;},get mode(){return mode;},definition,invalidate,pause,update,disable(){enabled=false;pause();refresh();},
  evaluate:()=>evaluateExtension(profile,getLibrary(),definition(),time,mode==='target'),display,
  seek(t:number){enabled=true;mode='extension';time=T.MathUtils.clamp(t,0,extensionDuration(definition()));pause();onChange();refresh();}};
}
