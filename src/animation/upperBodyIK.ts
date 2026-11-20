import * as T from 'three';
import type {LocalPose,RigProfile,Triple} from './rigProfile.ts';
import {clonePose,forwardKinematics} from './pose.ts';

export interface WeaponTarget {
  position:Triple; pitch:number; yaw:number; roll:number;
  elbowSwivel:[number,number];
}
export interface IKLimits {
  elbowMin:number; elbowMax:number; shoulderSwing:number; shoulderTwist:number;
  forearmTwist:number; wristSwing:number; wristTwist:number;
}
export const DEFAULT_IK_LIMITS:IKLimits={elbowMin:12,elbowMax:155,shoulderSwing:165,shoulderTwist:120,forearmTwist:120,wristSwing:75,wristTwist:100};
export function weaponOrientation(target:Pick<WeaponTarget,'pitch'|'yaw'|'roll'>){
  const p=T.MathUtils.degToRad(target.pitch),y=T.MathUtils.degToRad(target.yaw);
  const blade=new T.Vector3(-Math.sin(y)*Math.cos(p),Math.sin(p),-Math.cos(y)*Math.cos(p));
  // Local X follows elevation: roll zero presents a cutting edge in the vertical attack plane.
  const edge=new T.Vector3(Math.sin(y)*Math.sin(p),Math.cos(p),Math.cos(y)*Math.sin(p));
  return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(edge,blade,new T.Vector3().crossVectors(edge,blade)))
    .multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),T.MathUtils.degToRad(target.roll)));
}
const worldPosition=(m:T.Matrix4)=>new T.Vector3().setFromMatrixPosition(m);
const worldRotation=(m:T.Matrix4)=>new T.Quaternion().setFromRotationMatrix(new T.Matrix4().extractRotation(m));
const signedTwist=(q:T.Quaternion,axis:T.Vector3)=>2*Math.atan2(new T.Vector3(q.x,q.y,q.z).dot(axis),q.w);
function split(q:T.Quaternion,axis:T.Vector3){
  if(q.w<0)q=new T.Quaternion(-q.x,-q.y,-q.z,-q.w);
  const p=axis.clone().multiplyScalar(new T.Vector3(q.x,q.y,q.z).dot(axis));
  const twist=new T.Quaternion(p.x,p.y,p.z,q.w);if(twist.lengthSq()<1e-12)twist.identity();else twist.normalize();
  return {twist,swing:q.clone().multiply(twist.clone().invert()).normalize()};
}
/** Parent-frame swing cone and axial twist. No Euler conversion/clamping. */
export function limitJoint(q:T.Quaternion,reference:T.Quaternion,axis:T.Vector3,swingDegrees:number,twistDegrees:number){
  const delta=q.clone().multiply(reference.clone().invert()).normalize(),parts=split(delta,axis);
  const angle=2*Math.acos(T.MathUtils.clamp(Math.abs(parts.swing.w),0,1)),limit=T.MathUtils.degToRad(swingDegrees);
  if(angle>limit)parts.swing.identity().slerp(split(delta,axis).swing,limit/angle);
  const raw=signedTwist(parts.twist,axis),twist=T.MathUtils.clamp(raw,-T.MathUtils.degToRad(twistDegrees),T.MathUtils.degToRad(twistDegrees));
  return {rotation:parts.swing.multiply(new T.Quaternion().setFromAxisAngle(axis,twist)).multiply(reference).normalize(),limited:angle>limit+1e-7||Math.abs(raw-twist)>1e-7};
}

/** Analytical two-link arms plus bounded shared-target projection. Pure and stateless. */
export function solveWeaponIK(profile:RigProfile,source:LocalPose,target:WeaponTarget,socket:{position:Triple;rotation:Triple},limits:IKLimits=DEFAULT_IK_LIMITS){
  const pose=clonePose(source),initial=forwardKinematics(profile,source),desiredQ=weaponOrientation(target);
  const scale=new T.Vector3().setFromMatrixScale(initial[profile.handIndices.right]).x;
  const weaponScale=scale*profile.socket.scale[0],blade=new T.Vector3(0,1,0).applyQuaternion(desiredQ);
  const rightQ=desiredQ.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(...socket.rotation,'XYZ')).invert());
  const palmFrame=(side:string)=>{
    const find=(name:string)=>profile.names.indexOf(`${name}_${side}`);
    const middle=new T.Vector3().fromArray(profile.reference.positions[find('middle_01')]),index=new T.Vector3().fromArray(profile.reference.positions[find('index_01')]),pinky=new T.Vector3().fromArray(profile.reference.positions[find('pinky_01')]);
    const axis=index.sub(pinky).normalize(),fingers=middle.normalize();fingers.addScaledVector(axis,-fingers.dot(axis)).normalize();
    return {normal:new T.Vector3().crossVectors(axis,fingers).normalize(),basis:new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(axis,fingers,new T.Vector3().crossVectors(axis,fingers)))};
  };
  const rightPalm=palmFrame('r'),leftPalm=palmFrame('l'),leftNormal=rightPalm.normal.clone().applyQuaternion(rightQ).negate();
  const leftFingers=new T.Vector3().crossVectors(leftNormal,blade).normalize();
  const leftQ=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(blade,leftFingers,leftNormal)).multiply(leftPalm.basis.invert());
  // Actual right wrist target uses the complete hand->weapon transform, including translation.
  const wristOffset=(q:T.Quaternion)=>new T.Vector3(...socket.position).multiplyScalar(scale).applyQuaternion(q).addScaledVector(new T.Vector3(0,1,0).applyQuaternion(q.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(...socket.rotation,'XYZ')))),.045*weaponScale);
  const arms=(['r','l'] as const).map((side,i)=>{
    const upper=profile.names.indexOf(`upperarm_${side}`),lower=profile.names.indexOf(`lowerarm_${side}`),hand=profile.names.indexOf(`hand_${side}`);
    const a=new T.Vector3().fromArray(pose.positions[lower]).length()*scale,b=new T.Vector3().fromArray(pose.positions[hand]).length()*scale;
    return {side,i,upper,lower,hand,a,b,q:side==='r'?rightQ:leftQ,origin:worldPosition(initial[upper]),center:side==='r'?profile.gripCenters.right:profile.gripCenters.left};
  });
  const wanted=new T.Vector3(...target.position),projected=wanted.clone();
  // One rigid goal is projected into both arms' bend-limited reachable shells.
  for(let pass=0;pass<16;pass++)for(const arm of arms){
    const offset=arm.side==='r'?wristOffset(arm.q):arm.center.clone().multiplyScalar(scale).applyQuaternion(arm.q).addScaledVector(blade,.205*weaponScale);
    const center=arm.origin.clone().add(offset),d=projected.clone().sub(center),length=d.length();
    const min=Math.sqrt(arm.a**2+arm.b**2+2*arm.a*arm.b*Math.cos(T.MathUtils.degToRad(limits.elbowMax)));
    const max=Math.sqrt(arm.a**2+arm.b**2+2*arm.a*arm.b*Math.cos(T.MathUtils.degToRad(limits.elbowMin)));
    if(length<1e-8)d.set(0,0,-1);else d.divideScalar(length);
    projected.copy(center).addScaledVector(d,T.MathUtils.clamp(length,min,max));
  }
  let constrained=0;const flexions:number[]=[];
  const setWorld=(index:number,q:T.Quaternion)=>{
    const worlds=forwardKinematics(profile,pose),parent=profile.parents[index],parentQ=worldRotation(parent<0?profile.rootParent:worlds[parent]);
    pose.rotations[index]=parentQ.invert().multiply(q).normalize().toArray();
  };
  const aim=(index:number,child:number,point:T.Vector3)=>{
    const worlds=forwardKinematics(profile,pose),p=worldPosition(worlds[index]),from=worldPosition(worlds[child]).sub(p).normalize(),to=point.clone().sub(p).normalize();
    setWorld(index,new T.Quaternion().setFromUnitVectors(from,to).multiply(worldRotation(worlds[index])));
  };
  const socketMatrix=(world:T.Matrix4)=>world.clone().multiply(new T.Matrix4().compose(new T.Vector3(...socket.position),new T.Quaternion().setFromEuler(new T.Euler(...socket.rotation,'XYZ')),new T.Vector3(...profile.socket.scale)));
  for(const arm of arms){
    let desiredHand=arm.q.clone();
    const grip=arm.side==='r'?projected.clone():new T.Vector3(0,-.16,0).applyMatrix4(socketMatrix(forwardKinematics(profile,pose)[profile.handIndices.right]));
    if(arm.side==='l'){
      const actualWeaponQ=worldRotation(socketMatrix(forwardKinematics(profile,pose)[profile.handIndices.right]));
      const actualBlade=new T.Vector3(0,1,0).applyQuaternion(actualWeaponQ),normal=rightPalm.normal.clone().applyQuaternion(worldRotation(forwardKinematics(profile,pose)[profile.handIndices.right])).negate();
      desiredHand=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(actualBlade,new T.Vector3().crossVectors(normal,actualBlade).normalize(),normal)).multiply(palmFrame('l').basis.invert());
    }
    for(let pass=0;pass<4;pass++){
      const wrist=arm.side==='r'?grip.clone().sub(wristOffset(desiredHand)):grip.clone().sub(arm.center.clone().multiplyScalar(scale).applyQuaternion(desiredHand));
      // Deterministic authored seed; never reuse the last collision sample's solve.
      pose.rotations[arm.upper]=[...source.rotations[arm.upper]];pose.rotations[arm.lower]=[...source.rotations[arm.lower]];
      let worlds=forwardKinematics(profile,pose);const origin=worldPosition(worlds[arm.upper]),axis=wrist.clone().sub(origin).normalize();
      const maxReach=Math.sqrt(arm.a**2+arm.b**2+2*arm.a*arm.b*Math.cos(T.MathUtils.degToRad(limits.elbowMin))),minReach=Math.sqrt(arm.a**2+arm.b**2+2*arm.a*arm.b*Math.cos(T.MathUtils.degToRad(limits.elbowMax)));
      if(axis.lengthSq()<1e-10)axis.set(0,0,-1);
      const reach=T.MathUtils.clamp(origin.distanceTo(wrist),minReach,maxReach),pole=new T.Vector3(arm.side==='r'?.8:-.8,-.65,-.15);
      pole.addScaledVector(axis,-pole.dot(axis));if(pole.lengthSq()<1e-8)pole.set(0,1,0).addScaledVector(axis,-axis.y);pole.normalize().applyAxisAngle(axis,T.MathUtils.degToRad(target.elbowSwivel[arm.i]));
      const along=(arm.a**2+reach**2-arm.b**2)/(2*reach),middle=origin.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,arm.a**2-along**2)));
      aim(arm.upper,arm.lower,middle);
      const upperAxis=new T.Vector3().fromArray(profile.bind.positions[arm.lower]).normalize().applyQuaternion(new T.Quaternion().fromArray(profile.bind.rotations[arm.upper]));
      const upperBound=limitJoint(new T.Quaternion().fromArray(pose.rotations[arm.upper]),new T.Quaternion().fromArray(profile.bind.rotations[arm.upper]),upperAxis,limits.shoulderSwing,limits.shoulderTwist);pose.rotations[arm.upper]=upperBound.rotation.toArray();if(upperBound.limited)constrained++;
      aim(arm.lower,arm.hand,origin.clone().addScaledVector(axis,reach));worlds=forwardKinematics(profile,pose);
      // Shoulder bounds can change the triangle: enforce the elbow bend again on the final geometry.
      const upperDirection=worldPosition(worlds[arm.lower]).sub(worldPosition(worlds[arm.upper])).normalize();
      let lowerDirection=worldPosition(worlds[arm.hand]).sub(worldPosition(worlds[arm.lower])).normalize();
      const bend=upperDirection.angleTo(lowerDirection),boundedBend=T.MathUtils.clamp(bend,T.MathUtils.degToRad(limits.elbowMin),T.MathUtils.degToRad(limits.elbowMax));
      if(Math.abs(bend-boundedBend)>1e-8){
        const hinge=new T.Vector3().crossVectors(upperDirection,lowerDirection);if(hinge.lengthSq()<1e-10)hinge.crossVectors(upperDirection,pole);hinge.normalize();
        const direction=upperDirection.clone().applyAxisAngle(hinge,boundedBend);
        setWorld(arm.lower,new T.Quaternion().setFromUnitVectors(lowerDirection,direction).multiply(worldRotation(worlds[arm.lower])));constrained++;worlds=forwardKinematics(profile,pose);
      }
      const forearmAxis=worldPosition(worlds[arm.hand]).sub(worldPosition(worlds[arm.lower])).normalize(),lowerQ=worldRotation(worlds[arm.lower]);
      const desiredLower=desiredHand.clone().multiply(new T.Quaternion().fromArray(profile.bind.rotations[arm.hand]).invert());
      const roll=split(desiredLower.multiply(lowerQ.clone().invert()),forearmAxis).twist;
      const angle=T.MathUtils.clamp(signedTwist(roll,forearmAxis),-T.MathUtils.degToRad(limits.forearmTwist),T.MathUtils.degToRad(limits.forearmTwist));
      setWorld(arm.lower,new T.Quaternion().setFromAxisAngle(forearmAxis,angle).multiply(lowerQ));
      worlds=forwardKinematics(profile,pose);const parentQ=worldRotation(worlds[arm.lower]),local=parentQ.clone().invert().multiply(desiredHand);
      const bounded=limitJoint(local,new T.Quaternion().fromArray(profile.bind.rotations[arm.hand]),new T.Vector3().fromArray(pose.positions[arm.hand]).normalize(),limits.wristSwing,limits.wristTwist);
      pose.rotations[arm.hand]=bounded.rotation.toArray();if(bounded.limited)constrained++;
      desiredHand=parentQ.multiply(bounded.rotation);
    }
    const w=forwardKinematics(profile,pose),u=worldPosition(w[arm.upper]),e=worldPosition(w[arm.lower]),h=worldPosition(w[arm.hand]);
    flexions.push(T.MathUtils.radToDeg(Math.PI-u.sub(e).angleTo(h.sub(e))));
  }
  return {pose,projectionError:projected.distanceTo(wanted),constrained,flexions,projected:projected.toArray() as Triple};
}
