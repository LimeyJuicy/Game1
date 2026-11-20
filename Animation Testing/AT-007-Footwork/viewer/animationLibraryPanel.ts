import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {RigProfile} from '../../../src/animation/rigProfile.ts';
import type {LegRig} from '../../../src/footwork/legs.ts';
import type {PoseLibrary} from '../../../src/animation/definitions.ts';
import {createLibraryPreview,validateCombatLibrary,type LibraryAction,type AnimationSource} from '../../../src/animation/animationLibrary.ts';
import type {AnimationPreview} from '../../../src/animation/previewTypes.ts';
import {animationURLs} from './animationSources.ts';
/** Extend the current viewer: lazy load sources, share one actor and evaluator, no second animation loop. */
export async function createAnimationLibraryPanel(profile:RigProfile,poses:PoseLibrary,rig:LegRig,native:T.Object3D,clips:T.AnimationClip[],guard:AnimationSource,apply:(preview:AnimationPreview,action:LibraryAction)=>void){
 const raw=await fetch(new URL('../../../src/animation/assets/combat-library.json',import.meta.url));if(!raw.ok)throw new Error('Animation catalogue unavailable');const catalog=validateCombatLibrary(await raw.json());
 const section=document.createElement('section');section.innerHTML='<h2>Animation library</h2><label>Category<select id="library-category"></select></label><label>Animation<select id="library-action"></select></label><p id="library-count" class="note"></p><p id="library-note"></p><p><a id="library-credit" target="_blank" rel="noopener"></a></p><details id="library-gaps"><summary>Still needs custom animation</summary><div></div></details>';
 document.querySelector('aside')!.insertBefore(section,document.querySelector('aside section'));
 const $=<E extends HTMLElement>(id:string)=>document.getElementById(id) as E,category=$<HTMLSelectElement>('library-category'),selector=$<HTMLSelectElement>('library-action');
 const loader=new GLTFLoader(),sources=new Map<string,Promise<AnimationSource>>(),previews=new Map<string,AnimationPreview>();let ticket=0,selected='',loading=false;
 for(const name of [...new Set(catalog.actions.map(a=>a.category))])category.add(new Option(name,name));
 $('library-count').textContent=`${catalog.actions.length} adaptations · review each movement before game integration`;
 for(const gap of catalog.missing){const p=document.createElement('p'),b=document.createElement('strong');b.textContent=gap.name;p.append(b,document.createElement('br'),gap.reason);$('library-gaps').querySelector('div')!.append(p);}
 function options(){selector.replaceChildren();for(const a of catalog.actions.filter(a=>a.category===category.value))selector.add(new Option(a.name,a.id));}
 async function source(id:string):Promise<AnimationSource>{
  if(id.startsWith('native:')){const clip=clips.find(c=>c.name===id.slice(7));if(!clip)throw new Error(`Missing native clip ${id}`);return{scene:native,clip};}
  if(!animationURLs[id])throw new Error(`Missing downloaded clip ${id}`);
  if(!sources.has(id))sources.set(id,loader.loadAsync(animationURLs[id]).then(g=>{if(!g.animations[0])throw new Error(`No motion in ${id}`);return{scene:g.scene,clip:g.animations[0]};}).catch(e=>{sources.delete(id);throw e;}));return sources.get(id)!;
 }
 async function select(id:string){
  const a=catalog.actions.find(a=>a.id===id);if(!a)throw new Error('Unknown animation');const request=++ticket;loading=true;$('status').textContent=`Loading ${a.name}…`;
  category.value=a.category;options();selector.value=id;
  try{let preview=previews.get(id);if(!preview){preview=createLibraryPreview(profile,poses,rig,await source(a.source),guard,a);previews.set(id,preview);}if(request!==ticket)return;
   apply(preview,a);selected=id;loading=false;$('library-note').textContent=a.note??(a.engine==='upper'?'Compare planted feet and the PR attack step.':'Review the complete movement and its recovery.');
   const credit=$<HTMLAnchorElement>('library-credit');credit.textContent=a.credit?.text??a.source;credit.href=a.credit?.url??'https://kinemiq.app/animations/';
   $('status').textContent=`Ready: ${a.name}. Press Play animation.`;
  }catch(e){if(request===ticket){loading=false;$('status').textContent=`Could not load ${a.name}: ${String(e)}`;}throw e;}
 }
 category.addEventListener('change',()=>{options();void select(selector.value).catch(console.error);});selector.addEventListener('change',()=>{void select(selector.value).catch(console.error);});
 await select('light-1');
 const api={catalog,select,get selected(){return selected;},get loading(){return loading;}};Object.defineProperty(window,'__animationLibrary',{value:api});return api;
}
