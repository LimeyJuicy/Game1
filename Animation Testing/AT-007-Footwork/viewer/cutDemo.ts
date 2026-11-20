import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createImportedKnight} from './importedKnight.ts';
import {stancePose,stanceById} from '../../../src/footwork/stances.ts';
import {solveLowerBody} from '../../../src/footwork/legs.ts';
import {capturePose,createRigProfile,type Triple} from '../../../src/animation/rigProfile.ts';
import {validateLibrary} from '../../../src/animation/definitions.ts';
import {configureSingleHandSword,type SingleHandSword} from '../../../src/animation/singleHandSword.ts';
import {applyEvaluation} from '../../../src/animation/evaluate.ts';
import {createCutDemo,type CutDefinition} from '../../../src/animation/cutDemo.ts';
import type {AnimationPreview} from '../../../src/animation/previewTypes.ts';
import type {LibraryAction} from '../../../src/animation/animationLibrary.ts';
import './upperbody/style.css';
const $=<E extends HTMLElement>(id:string)=>document.getElementById(id) as E;
const libraryMode=new URLSearchParams(location.search).has('animations');
document.title=libraryMode?'Knight · Combat animation library':'Knight · Sword cut and footwork';
document.body.innerHTML=`<aside><small>ANIMATION TESTING · AT-017</small><h1>Sword cut + footwork</h1><p><a href="/">Footwork bench</a> · <a href="/?upperbody&phaseA">Pose / IK editor</a></p><p id="status" role="status">Loading your knight and downloaded cut…</p>
<section><h2>Compare the movement</h2><label>Footwork<select id="cut-mode"><option value="stationary">Planted feet</option><option value="step">Short attack step</option></select></label><p>One diagonal sword cut, then a return to guard. The step uses the pull request’s lead-foot movement and forward recovery.</p><button id="cut-play">Play cut</button><button id="cut-reset">Return to start</button><label>Speed<select id="cut-speed"><option value="0.25">¼ speed</option><option value="0.5">½ speed</option><option value="1" selected>Normal</option></select></label><label>Animation <output id="cut-phase"></output><input id="cut-time" type="range" min="0" step="0.001" value="0"></label></section>
<section><h2>View</h2><div class="buttons"><button data-view="quarter">¾ view</button><button data-view="front">Front</button><button data-view="side">Side</button><button data-view="hands">Hands</button></div><label class="check"><input id="cut-skeleton" type="checkbox">Skeleton</label><label class="check"><input id="cut-trail" type="checkbox">Sword-tip trail</label><label class="check"><input id="cut-feet" type="checkbox" checked>Foot targets</label></section>
<section><h2>Motion source</h2><p>Sword — light slash A, Quaternius Universal Animation Library 2 (CC0), downloaded from KinemIQ.</p><p class="note">The resized sword stays in the right hand. The left arm follows the source motion without a support-hand constraint. Source leg tracks and root travel are excluded; the PR footwork owns those. Source timing is a demonstration setting, not a gameplay rule.</p><p class="note">Review the torso turn, planted boots, hand contact and recovery. No pose editing is needed to watch this demonstration. This does not apply damage or change live combat.</p></section></aside>
<main><canvas id="view" aria-label="Knight sword cut demonstration"></canvas><pre id="hud">Loading…</pre><span class="pose-label">DOWNLOADED CUT · PR FOOTWORK · SINGLE-HAND SWORD</span></main>`;
const renderer=new T.WebGLRenderer({canvas:$<HTMLCanvasElement>('view'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;
const scene=new T.Scene();scene.background=new T.Color('#d6ddd6');scene.add(new T.HemisphereLight('#f4f6ee','#59636c',1.1));const key=new T.DirectionalLight('#fff1d2',2.5);key.position.set(-3,5,-4);scene.add(key);
const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();scene.add(new T.GridHelper(12,24,'#81918b','#b3bfb5'));
const floor=new T.Mesh(new T.PlaneGeometry(12,12),new T.MeshStandardMaterial({color:'#c3c6c2',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.004;scene.add(floor);
const camera=new T.PerspectiveCamera(38,1,.01,100),orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;const viewRoot=new T.Vector3();let dirty=true;orbit.addEventListener('change',()=>dirty=true);
function view(which:string){orbit.target.set(0,which==='hands'?1.35:1.05,-.15);camera.position.set(...(which==='front'?[0,1.5,-4.8]:which==='side'?[4.8,1.5,-.15]:which==='hands'?[1.1,1.65,-1.7]:[3.1,1.9,-3.8]) as Triple);if(libraryMode){orbit.target.add(viewRoot);camera.position.add(viewRoot);}orbit.update();dirty=true;}
view('quarter');const loader=new GLTFLoader();
const [knight,sword,source,idle,libraryData,definition,swordDefinition]=await Promise.all([loader.loadAsync('/models/red-herald-knight-rigged.glb'),loader.loadAsync('/models/player-sword.glb'),loader.loadAsync(new URL('../../AT-016-KinemIQ-Library/clips/sword_light_a.glb',import.meta.url).href),loader.loadAsync(new URL('../../AT-016-KinemIQ-Library/clips/sword_idle.glb',import.meta.url).href),fetch(new URL('../../../src/animation/assets/default-guards.json',import.meta.url)).then(r=>r.json()),fetch(new URL('../../../src/animation/assets/cut-demo.json',import.meta.url)).then(r=>r.json()),fetch(new URL('../../../src/animation/assets/single-hand-sword.json',import.meta.url)).then(r=>r.json())]);
const nativeSource=knight.scene.clone(true);
const actor=createImportedKnight(knight.scene,knight.animations,sword.scene),bind=capturePose(actor.bones);actor.update(solveLowerBody(stancePose(stanceById('high'),1),actor.measurements),0);scene.add(actor.root);const profile=createRigProfile(actor.root,bind),library=validateLibrary(libraryData,profile),swordSize=configureSingleHandSword(profile,swordDefinition as SingleHandSword);library.socket.position=[...profile.socket.position];let demo:AnimationPreview=createCutDemo(profile,library,actor.measurements,source.scene,source.animations[0],definition as CutDefinition,{scene:idle.scene,clip:idle.animations[0]});
const skeleton=new T.SkeletonHelper(actor.model);skeleton.visible=false;scene.add(skeleton);
const markers=[0,1].map(()=>{const mesh=new T.Mesh(new T.SphereGeometry(.025,12,8),new T.MeshBasicMaterial({color:'#438664'}));scene.add(mesh);return mesh;});
const trail=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:'#3574a9'}));trail.visible=false;scene.add(trail);let trailMode='';
let currentAction:LibraryAction|undefined;
let time=0,playing=false,moving=false,result=demo.evaluate(0,false);$<HTMLInputElement>('cut-time').max=String(demo.duration);
function pause(){playing=false;$('cut-play').textContent=time>=demo.duration?(libraryMode?'Replay animation':'Replay cut'):(libraryMode?'Play animation':'Play cut');}
function toggle(){if(playing)pause();else{if(time>=demo.duration)time=0;playing=true;$('cut-play').textContent='Pause';}dirty=true;}
$('cut-play').addEventListener('click',toggle);$('cut-reset').addEventListener('click',()=>{time=0;pause();dirty=true;});$('cut-mode').addEventListener('change',()=>{moving=$<HTMLSelectElement>('cut-mode').value==='step';pause();dirty=true;});
$('cut-time').addEventListener('input',()=>{time=Number($<HTMLInputElement>('cut-time').value);pause();dirty=true;});
$('cut-skeleton').addEventListener('change',()=>{skeleton.visible=$<HTMLInputElement>('cut-skeleton').checked;dirty=true;});for(const id of ['cut-trail','cut-feet'])$(id).addEventListener('change',()=>dirty=true);
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-view]'))b.addEventListener('click',()=>view(b.dataset.view!));
window.addEventListener('keydown',e=>{if(e.code==='Space'&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLSelectElement)){e.preventDefault();toggle();}});
new ResizeObserver(()=>{const main=$('view').parentElement!;renderer.setSize(main.clientWidth,main.clientHeight,false);camera.aspect=main.clientWidth/main.clientHeight;camera.updateProjectionMatrix();dirty=true;}).observe($('view').parentElement!);
function evaluate(){
 result=demo.evaluate(time,moving);if(libraryMode){const next=new T.Vector3(result.root.x,0,result.root.z),delta=next.clone().sub(viewRoot);camera.position.add(delta);orbit.target.add(delta);viewRoot.copy(next);}actor.root.position.set(result.root.x,result.rootY??0,result.root.z);actor.root.rotation.y=result.root.yaw;applyEvaluation(profile,result);
 markers.forEach((m,i)=>{m.position.copy(result.ankleTargets[i]);if(result.footOwnership!=='clip')m.position.y=.025;m.visible=$<HTMLInputElement>('cut-feet').checked;});
 trail.visible=$<HTMLInputElement>('cut-trail').checked;if(trail.visible&&trailMode!==demo.definition.id+String(moving)){trail.geometry.dispose();trail.geometry=new T.BufferGeometry().setFromPoints(Array.from({length:81},(_,i)=>demo.evaluate(demo.duration*i/80,moving).tip));trailMode=demo.definition.id+String(moving);}
 $('cut-phase').textContent=`${result.phase} · ${time.toFixed(2)} s`;$<HTMLInputElement>('cut-time').value=String(time);
 $('hud').textContent=`${currentAction?.name??(moving?'Short attack step':'Planted feet')} · ${result.phase}\nRoot travel ${Math.hypot(result.root.x,result.root.z).toFixed(3)} m\nRight grip ${(result.gripErrors.right*1000).toFixed(1)} mm · left arm free\nSword length ${swordSize.worldLength.toFixed(2)} m\n${result.footOwnership==='clip'?'Authored full-body movement':currentAction?.engine==='footwork'?'PR footwork and support':moving?'Lead foot plants at '+demo.events.find(e=>e.type==='plant'&&e.move==='lunge')?.time.toFixed(2)+' s':'Both foot targets remain planted'}${result.warnings?.length?'\n'+result.warnings.join('\n'):''}\nOne evaluated pose owns skeleton + sword`;
}
let previous=performance.now();renderer.setAnimationLoop(now=>{const dt=Math.min((now-previous)/1000,.1);previous=now;if(playing){time=Math.min(demo.duration,time+dt*Number($<HTMLSelectElement>('cut-speed').value));if(time>=demo.duration)pause();dirty=true;}orbit.update();if(dirty){evaluate();renderer.render(scene,camera);dirty=false;}});
evaluate();$('status').textContent='Ready. Press Play cut, then compare Planted feet with Short attack step.';
Object.defineProperty(window,'__cutDemo',{value:{get state(){return{time,playing,moving,phase:result.phase,root:result.root,gripErrors:result.gripErrors,action:currentAction?.id??demo.definition.id,footOwnership:result.footOwnership??'pr',rootY:result.rootY??0,swordLength:swordSize.worldLength,singleHand:result.singleHand,bones:profile.names.length,rotations:result.pose.rotations,positions:result.pose.positions,tip:result.tip.toArray()};},profile,demo,seek(t:number){time=T.MathUtils.clamp(t,0,demo.duration);pause();evaluate();dirty=true;}}});

if(libraryMode){
 document.querySelector('aside a[href*=upperbody]')!.textContent='Earlier IK study';document.querySelector('aside h1')!.textContent='Combat animations';document.querySelector('aside small')!.textContent='ANIMATION TESTING · AT-018';
 $<HTMLInputElement>('cut-trail').checked=false;$('cut-play').textContent='Play animation';
 const comparison=$('cut-mode').closest('section')!;comparison.querySelector('h2')!.textContent='Preview';comparison.querySelector('p')!.textContent='Play or scrub the selected animation. This is a review library; it does not change live combat.';
 const mode=$<HTMLSelectElement>('cut-mode');mode.add(new Option('Authored full-body','authored'));mode.add(new Option('PR movement','pr'));
 const {createAnimationLibraryPanel}=await import('./animationLibraryPanel.ts');
 await createAnimationLibraryPanel(profile,library,actor.measurements,nativeSource,knight.animations,{scene:idle.scene,clip:idle.animations[0]},(preview,action)=>{
  demo=preview;currentAction=action;time=0;moving=false;pause();trailMode='';mode.disabled=action.engine!=='upper'||action.stepDepth===undefined;mode.value=action.engine==='full'?'authored':action.engine==='footwork'?'pr':'stationary';$<HTMLInputElement>('cut-time').max=String(demo.duration);
  document.querySelector('main .pose-label')!.textContent=action.engine==='full'?'SINGLE-HAND SWORD · AUTHORED FULL BODY':'SINGLE-HAND SWORD · PR FOOTWORK';
  const sourceSection=document.querySelector('aside section:last-of-type')!;sourceSection.querySelector('h2')!.textContent='Review notes';sourceSection.querySelector('p')!.textContent='Right-handed sword with free left arm. Each action has one final pose owner.';sourceSection.querySelectorAll('p')[1].textContent=action.engine==='full'?'This action uses authored full-body motion, with a kinematic floor correction. Foot contacts and transitions need visual review.':'PR feet and hips support the selected upper-body action; the source does not overwrite planted legs.';evaluate();dirty=true;
 });
}
