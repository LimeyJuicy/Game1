import * as T from 'three';
import type {RigProfile} from './rigProfile.ts';
export interface SingleHandSword {id:string;scale:number;gripY:number;sourceLength:number}
/** Resize the approved mesh through its attachment transform, preserving source asset bytes. */
export function configureSingleHandSword(profile:RigProfile,definition:SingleHandSword){
 if(!Number.isFinite(definition.scale)||definition.scale<=0||definition.scale>.54||definition.gripY!==.045||!Number.isFinite(definition.sourceLength)||definition.sourceLength<=0)throw new Error('Invalid single-hand sword profile');
 const sword=profile.weapon;sword.name='PlayerSword_SingleHand';sword.scale.setScalar(definition.scale);
 const axis=new T.Vector3(0,1,0).applyQuaternion(sword.quaternion);sword.position.copy(profile.gripCenters.right).addScaledVector(axis,-definition.gripY*definition.scale);
 profile.socket.scale=sword.scale.toArray();profile.socket.position=sword.position.toArray();sword.updateWorldMatrix(true,true);
 return {sourceLength:definition.sourceLength,worldLength:definition.sourceLength*definition.scale*new T.Vector3().setFromMatrixScale(sword.parent!.matrixWorld).x};
}
