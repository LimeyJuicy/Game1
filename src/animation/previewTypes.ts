import type {finalizePose} from './evaluate.ts';
import type {FootworkEvent} from '../footwork/controller.ts';
export type PreviewEvaluation=ReturnType<typeof finalizePose>&{root:{x:number;z:number;yaw:number};rootY?:number;time:number;phase:string;singleHand:boolean;ankleTargets:import('three').Vector3[];events:FootworkEvent[];footOwnership?:'pr'|'clip';warnings?:string[]};
export interface AnimationPreview {duration:number;definition:{id:string};events:FootworkEvent[];evaluate(time:number,moving:boolean):PreviewEvaluation}
