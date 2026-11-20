import * as T from 'three';
import {createFootwork,type Command,type FootworkEvent} from '../footwork/controller.ts';
import type {LowerBodyPose} from '../footwork/legs.ts';
export interface FootworkCue {time:number;command:Command|{type:'intent';x:number;z:number}}
/** Build once on a scratch PR controller; queries only interpolate immutable constraints. */
export function createFootworkPlan(duration:number,cues:FootworkCue[],rate=240,timeScale=1){
 if(!Number.isFinite(timeScale)||timeScale<=0||timeScale>3||!Number.isFinite(duration)||duration<=0||duration>30||!Number.isInteger(rate)||rate<30||rate>480||cues.some(c=>!Number.isFinite(c.time)||c.time<0||c.time>duration))throw new Error('Invalid footwork plan');
 const commands=structuredClone(cues).sort((a,b)=>a.time-b.time),events:FootworkEvent[]=[],fw=createFootwork({stance:'high',listener:e=>events.push({...e,time:e.time/timeScale})});
 const plan:Array<{time:number;root:{x:number;z:number;yaw:number};pose:LowerBodyPose}>=[];let next=0;
 for(let k=0;k<=Math.ceil(duration*rate);k++){
  const time=k/rate;while(next<commands.length&&commands[next].time<=time){const c=commands[next++].command;if(c.type==='intent')fw.setIntent({x:c.x,z:c.z});else fw.request(c);}
  plan.push({time,root:{...fw.state.root},pose:fw.pose()});if(k<Math.ceil(duration*rate))fw.advance(timeScale/rate);
 }
 return{events:structuredClone(events),sample(time:number,moving=true){
  if(!Number.isFinite(time))throw new Error('Footwork time must be finite');if(!moving)return structuredClone(plan[0]);
  const t=T.MathUtils.clamp(time,0,duration),i=Math.min(Math.floor(t*rate),plan.length-2),a=plan[i],b=plan[i+1],f=T.MathUtils.clamp((t-a.time)/(b.time-a.time),0,1),out=structuredClone(a);
  for(const key of ['x','z','yaw'] as const)out.root[key]=T.MathUtils.lerp(a.root[key],b.root[key],f);
  for(const key of ['x','y','z','yaw','pitch','roll'] as const)out.pose.pelvis[key]=T.MathUtils.lerp(a.pose.pelvis[key],b.pose.pelvis[key],f);
  for(let foot=0;foot<2;foot++)for(const key of ['x','z','yaw','lift','pitch'] as const)out.pose.feet[foot][key]=T.MathUtils.lerp(a.pose.feet[foot][key],b.pose.feet[foot][key],f);
  return out;
 }};
}
