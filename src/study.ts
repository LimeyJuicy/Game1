import * as THREE from 'three';
import { createKnight } from './knight.ts';
import { LIGHTS, HEAVIES, attackDuration } from './combat.ts';
import type { AttackDefinition } from './combat.ts';
import { PlayerDefense } from './defense.ts';

/** Separate inspection presentation; gameplay still uses its automatic camera. */
export function startCharacterStudy(canvas: HTMLCanvasElement) {
  document.body.classList.add('character-study');
  const panel = document.createElement('section'); panel.className = 'study-panel';
  panel.innerHTML = `<span class="eyebrow">CHARACTER QUALITY / 01</span><h1>The Bat Knight</h1><p>Human proportions. Fitted plate. Flowing, forceful motion.</p>
    <label for="study-action">Sequence</label><select id="study-action">
    <option value="flow">Connected movement & combat</option><option value="idle">Low carry</option><option value="walk">Walk</option><option value="sprint">Sprint</option><option value="light">Light chain</option><option value="heavy">Heavy cut</option><option value="spin">Backspin into strike</option><option value="guard">Guard</option><option value="parry">Parry</option><option value="dodge">Controlled dodge</option><option value="kick">Enemy front kick</option></select>
    <div class="study-views"><button data-view="front">Front</button><button data-view="side">Side</button><button data-view="back">Back</button></div>
    <button id="study-pause">Pause motion</button><a href="/">Return to courtyard</a><small>Representative rig and motion sample for visual review.</small>`;
  document.body.append(panel);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#deded3');
  scene.add(new THREE.HemisphereLight('#fff7e4','#536574',1.3));
  const key = new THREE.DirectionalLight('#fff4d6',2); key.position.set(-3,6,-4); scene.add(key);
  const rim = new THREE.DirectionalLight('#c5d9de',0.8); rim.position.set(3,3,3); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4,80),new THREE.MeshToonMaterial({color:'#b9bdb0'})); floor.rotation.x=-Math.PI/2; floor.position.y=-0.008; scene.add(floor);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1,1.11,96),new THREE.MeshBasicMaterial({color:'#7f8a80',side:THREE.DoubleSide})); ring.rotation.x=-Math.PI/2; ring.position.y=-0.003; scene.add(ring);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.33,48),new THREE.MeshBasicMaterial({color:'#68766b',transparent:true,opacity:0.3,depthWrite:false})); shadow.rotation.x=-Math.PI/2; shadow.scale.set(1,0.6,1); shadow.position.y=0.002; scene.add(shadow);
  const knight = createKnight(); scene.add(knight.root);
  const camera = new THREE.PerspectiveCamera(35,1,0.1,30);
  let view = 'front';
  function positionCamera() {
    const x = view === 'front' ? 2.9 : view === 'side' ? 4.5 : -2.9;
    camera.position.set(x,2.15,view === 'front' ? -4.2 : view === 'side' ? 0.2 : 4.2);
    camera.lookAt(-0.12,1.05,0);
  }
  positionCamera();
  const select = panel.querySelector<HTMLSelectElement>('#study-action')!;
  const pause = panel.querySelector<HTMLButtonElement>('#study-pause')!;
  let mode = 'flow', paused = false, time = 0, distance = 0, serial = 1, previousSegment = '', previous = performance.now();
  const defense = new PlayerDefense();
  select.addEventListener('change',()=>{mode=select.value; time=0; serial++; previousSegment=''; defense.reset();});
  pause.addEventListener('click',()=>{paused=!paused;pause.textContent=paused?'Resume motion':'Pause motion';});
  for(const button of panel.querySelectorAll<HTMLButtonElement>('[data-view]')) button.addEventListener('click',()=>{view=button.dataset.view!;positionCamera();});
  const turning: AttackDefinition = { ...HEAVIES[1], style:'backspin', name:'Turning cleave' };
  const sequence: { key:string; duration:number; definition?:AttackDefinition; speed?:number; combat?:boolean }[] = [
    {key:'walk',duration:1.2,speed:3.2,combat:false},{key:'brake',duration:0.4,speed:0,combat:false},
    ...LIGHTS.map((definition,i)=>({key:`cut${i}`,duration:attackDuration(definition),definition,combat:true})),
    {key:'guard',duration:0.65,combat:true},{key:'dodge',duration:0.5,combat:true},
    {key:'spin',duration:attackDuration(turning),definition:turning,combat:true},{key:'ready',duration:0.8,combat:true},
  ];
  const total = sequence.reduce((sum,item)=>sum+item.duration,0);
  renderer.setAnimationLoop((now:number)=>{
    const dt=Math.min(0.05,(now-previous)/1000); previous=now; if(!paused)time+=dt;
    let local = time, loop = Math.floor(time/2), keyName=mode, definition:AttackDefinition|null=null, speed=0, combat=true;
    if(mode==='flow') {
      loop = Math.floor(time/total);local %= total;
      for(const step of sequence){if(local<step.duration){keyName=step.key;definition=step.definition??null;speed=step.speed??0;combat=step.combat??true;break;}local-=step.duration;}
    } else if(mode==='light') {
      loop = Math.floor(time/3);local %= 3;
      for(const [i,cut] of LIGHTS.entries()){if(local<attackDuration(cut)){keyName=`cut${i}`;definition=cut;break;}local-=attackDuration(cut);}
    } else if(mode==='heavy'||mode==='spin') {definition=mode==='spin'?turning:HEAVIES[0];loop=Math.floor(time/(attackDuration(definition)+0.8));local%=attackDuration(definition)+0.8;if(local>attackDuration(definition))definition=null;}
    else if(mode==='walk'||mode==='sprint'){speed=mode==='walk'?3.2:7.2;combat=false;}
    else if(mode==='idle') combat=false;
    else local%=2;
    const segmentIdentity=`${keyName}:${loop}`;
    if(segmentIdentity!==previousSegment){serial++;defense.reset();if(definition)knight.poseAttack(definition,0,serial);if(keyName==='dodge')defense.dodge({x:1,z:0},true);if(keyName==='parry')defense.block(true,true,true);previousSegment=segmentIdentity;}
    const step=paused?0:dt;distance+=speed*step;
    knight.animate(distance,speed,time,step,{x:0,z:-speed*step},combat);
    if(keyName==='kick'&&local<1.89)knight.poseKick({preparation:.9,swing:.24,recovery:.75},local,serial);
    else knight.poseAttack(definition,definition?local:0,serial);
    if(keyName==='guard')defense.block(false,true,true);
    knight.poseDefense(defense,step,speed>.1);defense.advance(step,!!definition);
    renderer.render(scene,camera);
  });
  function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.setViewOffset(innerWidth,innerHeight,-Math.round(innerWidth*0.13),0,innerWidth,innerHeight);camera.updateProjectionMatrix();}
  addEventListener('resize',resize);resize();
  Object.defineProperty(window,'__study',{configurable:true,get:()=>({mode,time,bones:knight.rig.bones.length,skinned:knight.rig.meshes.length,paused,view})});
}
