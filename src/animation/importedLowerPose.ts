import * as T from 'three';
import type {LocalPose,RigProfile} from './rigProfile.ts';
import type {LowerBodySolution} from '../footwork/legs.ts';
import {clonePose,forwardKinematics} from './pose.ts';
const pos=(m:T.Matrix4)=>new T.Vector3().setFromMatrixPosition(m);
const rot=(m:T.Matrix4)=>new T.Quaternion().setFromRotationMatrix(new T.Matrix4().extractRotation(m));
function frame(up:T.Vector3){const y=up.clone().normalize(),z=new T.Vector3(0,0,1).addScaledVector(y,-y.z).normalize();return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3().crossVectors(y,z),y,z));}
/** Pure equivalent of the existing imported footwork adapter's leg calibration.
 * Works in the actor's floor/root frame. Does not run a mixer or write scene bones. */
export function createImportedLowerPose(profile:RigProfile){
 const bind=forwardKinematics(profile,profile.bind),index=(name:string)=>{const i=profile.names.indexOf(name);if(i<0)throw new Error(`Missing leg joint ${name}`);return i;},pelvis=index('pelvis');
 const chains=['l','r'].map(side=>{const hip=index(`thigh_${side}`),knee=index(`calf_${side}`),ankle=index(`foot_${side}`),toe=index(`ball_${side}`);return{hip,knee,ankle,toe,
  thighCorrection:frame(pos(bind[hip]).sub(pos(bind[knee]))).invert().multiply(rot(bind[hip])),
  shinCorrection:frame(pos(bind[knee]).sub(pos(bind[ankle]))).invert().multiply(rot(bind[knee])),ankleRest:rot(bind[ankle]),toeRest:rot(bind[toe])};});
 return (source:LocalPose,solution:LowerBodySolution)=>{
  const pose=clonePose(source);
  const setWorld=(i:number,q:T.Quaternion)=>{const w=forwardKinematics(profile,pose),p=profile.parents[i];pose.rotations[i]=rot(p<0?profile.rootParent:w[p]).invert().multiply(q).normalize().toArray();};
  const w=forwardKinematics(profile,pose),parent=profile.parents[pelvis];pose.positions[pelvis]=solution.pelvisPosition.clone().applyMatrix4((parent<0?profile.rootParent:w[parent]).clone().invert()).toArray();
  setWorld(pelvis,solution.pelvisQuaternion.clone().multiply(rot(bind[pelvis])));
  chains.forEach((chain,i)=>{const leg=solution.legs[i],thigh=solution.pelvisQuaternion.clone().multiply(leg.thigh),shin=thigh.clone().multiply(leg.shin),foot=shin.clone().multiply(leg.foot);
   setWorld(chain.hip,thigh.multiply(chain.thighCorrection));setWorld(chain.knee,shin.multiply(chain.shinCorrection));setWorld(chain.ankle,foot.clone().multiply(chain.ankleRest));setWorld(chain.toe,foot.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),leg.toe)).multiply(chain.toeRest));});
  return pose;
 };
}
