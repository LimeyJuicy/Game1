import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createImportedKnight} from '../importedKnight.ts';
import {stancePose,stanceById} from '../../../../src/footwork/stances.ts';
import {solveLowerBody} from '../../../../src/footwork/legs.ts';
import {capturePose,createRigProfile,UPPER_BONES,type BoneName,type Triple} from '../../../../src/animation/rigProfile.ts';
import {validateLibrary} from '../../../../src/animation/definitions.ts';
import {applyEvaluation,evaluateUpperBody,setBoneRotation} from '../../../../src/animation/evaluate.ts';
import {createPhaseA} from './phaseA.ts';
import './style.css';

const $=<E extends HTMLElement>(id:string)=>document.getElementById(id) as E;
document.title='Knight · Upper-body pose editor';
document.body.innerHTML=`<aside><small>ANIMATION TESTING · STAGES 0–5</small><h1>Upper-body poses</h1><p><a href="/">← Footwork bench</a></p><p id="status" role="status">Loading your knight and sword…</p>
<section><h2>Guard poses</h2><label>Edit guard<select id="guard"><option value="0">High right guard</option><option value="1">Middle point guard</option></select></label><label>Pose name<input id="pose-name" maxlength="80"></label>
<div class="buttons"><button id="play">Play transition</button><button id="reverse">Reverse</button></div><label>Transition <output id="phase"></output><input id="progress" type="range" min="0" max="1" step="0.001" value="0"></label><label>Duration (seconds)<input id="duration" type="number" min="0.2" max="10" step="0.1" value="1.8"></label><label>Playback speed<select id="rate"><option value="0.25">¼ speed</option><option value="0.5">½ speed</option><option value="1" selected>Normal</option></select></label><button id="edit-endpoint">Show selected guard</button></section>
<section><h2>Upper-body hierarchy</h2><label>Selected bone<select id="bone"></select></label><p id="parent" class="note"></p><div id="rotation"></div><button id="reset-bone">Reset this bone</button><p class="note">Joint edits show the selected guard endpoint. Local XYZ rotation is relative to the saved stance reference. Children follow their parent; the feet stay fixed. Hands also serve as wrists on this rig.</p></section>
<section><h2>Sword attachment</h2><div id="socket"></div><button id="reset-socket">Reset sword attachment</button><p class="note">Fine attachment offsets relative to the calibrated right-hand socket. Offset 0.001 is about 1.8 mm; angles are degrees. Use arm/wrist rotation to carry the sword. Enable Phase A target following for bounded two-arm IK. Manual edits with IK disabled can open the left-hand grip.</p></section>
<section><h2>Save and reset</h2><div class="buttons"><button id="save">Download JSON</button><button id="load">Load JSON</button></div><input id="file" type="file" accept=".json,application/json" hidden><button id="restore">Restore saved draft</button><button id="reset-guard">Reset selected guard</button><button id="reset-all">Reset all changes</button><p class="note">Download saves a portable pose library. A browser draft is saved locally after each edit. Reset all also clears that draft.</p></section>
<section><h2>View</h2><div class="buttons"><button data-view="front">Front</button><button data-view="side">Side</button><button data-view="quarter">¾</button><button data-view="hands">Hands</button></div><label class="check"><input id="skeleton" type="checkbox">Skeleton</label><label class="check"><input id="axes" type="checkbox" checked>Selected joint axes</label><label class="check"><input id="wire" type="checkbox">Wireframe</label><p id="limits" class="note"></p></section></aside>
<main><canvas id="view" aria-label="Upper-body knight viewport"></canvas><pre id="hud">Loading…</pre><span class="pose-label">FIXED HIGH FOOTWORK STANCE · PHASE A PREVIEW</span></main>`;
const renderer=new T.WebGLRenderer({canvas:$<HTMLCanvasElement>('view'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;
const scene=new T.Scene();scene.background=new T.Color('#d6ddd6');scene.add(new T.HemisphereLight('#f4f6ee','#59636c',1.1));
const key=new T.DirectionalLight('#fff1d2',2.5);key.position.set(-3,5,-4);scene.add(key);
const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
scene.add(new T.GridHelper(12,24,'#81918b','#b3bfb5'));
const floor=new T.Mesh(new T.PlaneGeometry(12,12),new T.MeshStandardMaterial({color:'#c3c6c2',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.004;scene.add(floor);
const camera=new T.PerspectiveCamera(38,1,.01,100),orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;
let dirty=true;orbit.addEventListener('change',()=>{dirty=true;});
function view(which:string){orbit.target.set(0,which==='hands'?1.45:1.35,0);camera.position.set(...(which==='side'?[5.5,1.6,0]:which==='front'?[0,1.6,-5.5]:which==='hands'?[1.25,1.65,-1.5]:[3.8,2,-4.2]) as Triple);orbit.update();dirty=true;}
view('quarter');
const loader=new GLTFLoader();
const [knight,weapon]=await Promise.all([loader.loadAsync('/models/red-herald-knight-rigged.glb'),loader.loadAsync('/models/player-sword.glb')]);
const actor=createImportedKnight(knight.scene,knight.animations,weapon.scene),bind=capturePose(actor.bones);
actor.update(solveLowerBody(stancePose(stanceById('high'),1),actor.measurements),0);scene.add(actor.root);actor.root.updateWorldMatrix(true,true);
const profile=createRigProfile(actor.root,bind);
const response=await fetch(new URL('../../../../src/animation/assets/default-guards.json',import.meta.url));if(!response.ok)throw new Error('Could not load authored guards');
const defaults=validateLibrary(await response.json(),profile);let library=structuredClone(defaults),guard:0|1=0,selected:BoneName='spine_03',progress=0,playing=false,direction=1;
let result=evaluateUpperBody(profile,library,progress);
const skeleton=new T.SkeletonHelper(actor.model);skeleton.visible=false;scene.add(skeleton);
const axes=new T.AxesHelper(.12),selection=new T.Mesh(new T.SphereGeometry(.015,12,8),new T.MeshBasicMaterial({color:'#f5d67d',depthTest:false}));axes.renderOrder=selection.renderOrder=10;scene.add(axes,selection);
const storageKey='game1-upperbody-v1';
function message(text:string){$('status').textContent=text;}
function pause(){playing=false;$('play').textContent='Play transition';}
function persist(){try{localStorage.setItem(storageKey,JSON.stringify(library));}catch{message('Browser draft unavailable. Download JSON to save.');}}
function changed(){pause();phaseA.invalidate();persist();dirty=true;}
function endpoint(){pause();phaseA.pause();progress=guard;$<HTMLInputElement>('progress').value=String(progress);dirty=true;}
function sliders(container:string,prefix:string,steps:number,limits:(i:number)=>[number,number],get:(i:number)=>number,set:(i:number,n:number)=>void){
  for(let i=0;i<3;i++){
    const label=document.createElement('label');label.textContent=`${prefix} ${'XYZ'[i]}`;
    const input=document.createElement('input');input.type='range';input.id=`${container}-${i}`;input.step=String(steps);
    const output=document.createElement('output');const refresh=()=>{const[min,max]=limits(i);input.min=String(min);input.max=String(max);input.value=String(get(i));output.textContent=get(i).toFixed(2);};
    input.addEventListener('input',()=>{endpoint();set(i,Number(input.value));changed();refresh();});label.append(output,input);$(container).append(label);refresh();
  }
}
for(const name of UPPER_BONES){const index=profile.names.indexOf(name),parent=profile.names[profile.parents[index]]??'root';const option=new Option(`${name} · ${parent}`,name);$<HTMLSelectElement>('bone').add(option);}
const phaseA=createPhaseA(scene,profile,()=>library,()=>{pause();persist();dirty=true;});
function refresh(){
 phaseA.invalidate();
 $<HTMLSelectElement>('guard').options[0].text=library.guards[0].name;$<HTMLSelectElement>('guard').options[1].text=library.guards[1].name;
 $<HTMLSelectElement>('guard').value=String(guard);$<HTMLInputElement>('pose-name').value=library.guards[guard].name;$<HTMLInputElement>('duration').value=String(library.duration);$<HTMLSelectElement>('bone').value=selected;
 $('parent').textContent=`Parent: ${profile.names[profile.parents[profile.names.indexOf(selected)]]??'root'} · right-handed local XYZ · degrees`;
 $('limits').textContent=`Authoring bounds for ${selected}: ±${profile.limits[selected].join(' / ')}°. These are calibrated editor bounds, not a complete anatomical IK model.`;
 $('rotation').replaceChildren();sliders('rotation','Rotate',.1,i=>[-profile.limits[selected][i],profile.limits[selected][i]],i=>library.guards[guard].rotations[selected][i],(i,n)=>{const a=[...library.guards[guard].rotations[selected]] as Triple;a[i]=n;library=setBoneRotation(library,profile,guard,selected,a);});
 $('socket').replaceChildren();
 for(const field of ['position','rotation'] as const){const group=document.createElement('div');group.id=`socket-${field}`;$('socket').append(group);sliders(group.id,field==='position'?'Offset':'Angle',field==='position'?.0005:.5,()=>field==='position'?[-.015,.015]:[-20,20],i=>field==='position'?library.socket.position[i]-profile.socket.position[i]:T.MathUtils.radToDeg(library.socket.rotation[i]-profile.socket.rotation[i]),(i,n)=>{library.socket[field][i]=field==='position'?profile.socket.position[i]+n:profile.socket.rotation[i]+T.MathUtils.degToRad(n);});}
 dirty=true;
}
$('guard').addEventListener('change',()=>{phaseA.disable();guard=Number($<HTMLSelectElement>('guard').value) as 0|1;endpoint();refresh();});
$('bone').addEventListener('change',()=>{selected=$<HTMLSelectElement>('bone').value as BoneName;refresh();});
$('pose-name').addEventListener('change',()=>{library.guards[guard].name=$<HTMLInputElement>('pose-name').value.trim()||defaults.guards[guard].name;changed();refresh();});
$('duration').addEventListener('change',()=>{library.duration=T.MathUtils.clamp(Number($<HTMLInputElement>('duration').value)||1.8,.2,10);changed();refresh();});
$('progress').addEventListener('input',()=>{pause();progress=Number($<HTMLInputElement>('progress').value);dirty=true;});
$('play').addEventListener('click',()=>{phaseA.disable();if(playing)pause();else{direction=1;if(progress>=1)progress=0;playing=true;$('play').textContent='Pause';}dirty=true;});
$('reverse').addEventListener('click',()=>{phaseA.disable();direction=-1;if(progress<=0)progress=1;playing=true;$('play').textContent='Pause';dirty=true;});
$('edit-endpoint').addEventListener('click',()=>{phaseA.disable();endpoint();});
$('reset-bone').addEventListener('click',()=>{library.guards[guard].rotations[selected]=[...defaults.guards[guard].rotations[selected]];endpoint();changed();refresh();});
$('reset-guard').addEventListener('click',()=>{library.guards[guard]=structuredClone(defaults.guards[guard]);endpoint();changed();refresh();});
$('reset-socket').addEventListener('click',()=>{library.socket=structuredClone(defaults.socket);changed();refresh();});
$('reset-all').addEventListener('click',()=>{library=structuredClone(defaults);phaseA.disable();guard=0;endpoint();localStorage.removeItem(storageKey);refresh();message('Default poses restored.');});
function load(value:unknown){const candidate=validateLibrary(value,profile);library=candidate;if(!library.phaseA)phaseA.disable();guard=0;endpoint();persist();refresh();message('Pose library loaded.');}
$('save').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(library,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='knight-upperbody-poses.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Downloaded pose library; your browser draft is also saved.');});
$('load').addEventListener('click',()=>$<HTMLInputElement>('file').click());
$('file').addEventListener('change',async()=>{const input=$<HTMLInputElement>('file');try{if(input.files?.[0])load(JSON.parse(await input.files[0].text()));}catch(error){message(`Could not load: ${error instanceof Error?error.message:String(error)}`);}input.value='';});
$('restore').addEventListener('click',()=>{try{const draft=localStorage.getItem(storageKey);if(!draft){message('No saved browser draft.');return;}load(JSON.parse(draft));}catch(error){message(`Draft rejected: ${String(error)}`);}});
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-view]'))button.addEventListener('click',()=>view(button.dataset.view!));
$('skeleton').addEventListener('change',()=>{skeleton.visible=$<HTMLInputElement>('skeleton').checked;dirty=true;});$('axes').addEventListener('change',()=>{dirty=true;});
$('wire').addEventListener('change',()=>{actor.root.traverse(n=>{if(n instanceof T.Mesh)for(const m of Array.isArray(n.material)?n.material:[n.material])if('wireframe'in m)m.wireframe=$<HTMLInputElement>('wire').checked;});dirty=true;});
new ResizeObserver(()=>{const main=$('view').parentElement!;renderer.setSize(main.clientWidth,main.clientHeight,false);camera.aspect=main.clientWidth/main.clientHeight;camera.updateProjectionMatrix();dirty=true;}).observe($('view').parentElement!);
function evaluate(){
 const ikResult=phaseA.enabled?phaseA.evaluate():undefined;result=ikResult??evaluateUpperBody(profile,library,progress);applyEvaluation(profile,result);
 const matrix=result.world[profile.names.indexOf(selected)];axes.position.setFromMatrixPosition(matrix);axes.quaternion.setFromRotationMatrix(matrix.clone().extractRotation(matrix));axes.visible=$<HTMLInputElement>('axes').checked;selection.position.copy(axes.position);
 $('phase').textContent=`${(progress*100).toFixed(1)}%`;$<HTMLInputElement>('progress').value=String(progress);
 const gap=Math.max(result.gripErrors.left,result.gripErrors.right)*1000;
 $('hud').textContent=`${library.guards[0].name} → ${library.guards[1].name}\n${profile.nodes.length} bones · fixed lower stance\nSelected: ${selected}\nGrip error R ${(result.gripErrors.right*1000).toFixed(2)} mm / L ${(result.gripErrors.left*1000).toFixed(2)} mm\n${gap>5?'Grip opened by this pose/socket edit. Adjust the IK target or bounds to close the grip.':'Both authored grips within 5 mm.'}`;
 const extra=phaseA.display(ikResult);$('hud').textContent+=extra;
 $('hud').dataset.warning=String(gap>5);
}
refresh();evaluate();message('Ready. Choose a guard or joint to begin editing.');
let previous=performance.now();renderer.setAnimationLoop(now=>{const dt=Math.min((now-previous)/1000,.1);previous=now;if(phaseA.update(dt,Number($<HTMLSelectElement>('rate').value)))dirty=true;if(playing){progress=T.MathUtils.clamp(progress+direction*dt*Number($<HTMLSelectElement>('rate').value)/library.duration,0,1);if(progress===0||progress===1){pause();guard=progress as 0|1;refresh();}dirty=true;}orbit.update();if(dirty){evaluate();renderer.render(scene,camera);dirty=false;}});
Object.defineProperty(window,'__upperbody',{value:{profile,get library(){return structuredClone(library);},get state(){return {phaseA:{enabled:phaseA.enabled,time:phaseA.time,playing:phaseA.playing,mode:phaseA.mode},ik:'ik'in result?result.ik:null,progress,playing,selected,gripErrors:result.gripErrors,rotations:result.pose.rotations,positions:result.pose.positions,bones:profile.names.length};},phaseA, sample(t:number){return evaluateUpperBody(profile,library,t);},load,seek(t:number){pause();progress=T.MathUtils.clamp(t,0,1);evaluate();dirty=true;}}});
