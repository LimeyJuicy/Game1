import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { SeverPart } from './debris.ts';

export interface RigControls {
  body: THREE.Object3D;
  sword: THREE.Object3D;
  feet: THREE.Object3D[];
}

/** Native skinned sample: human proportions, independently driven joints, fitted plate. */
export function createHumanRig(parent: THREE.Group, controls: RigControls) {
  const container = new THREE.Group(); container.name = 'Human armored character'; parent.add(container);
  const bones: THREE.Bone[] = [];
  function joint(name: string, owner: THREE.Object3D, x = 0, y = 0, z = 0) {
    const bone = new THREE.Bone(); bone.name = name; bone.position.set(x, y, z); owner.add(bone); bones.push(bone); return bone;
  }
  const root = joint('Root', container);
  const pelvis = joint('Pelvis', root, 0, 0.94);
  const spine = joint('Spine', pelvis, 0, 0.13);
  const ribs = joint('Ribs', spine, 0, 0.17);
  const chest = joint('Chest', ribs, 0, 0.15);
  const neck = joint('Neck', chest, 0, 0.23);
  const head = joint('Head', neck, 0, 0.09);
  const limbs = [-1, 1].map(side => {
    const clavicle = joint(`${side} Clavicle`, chest, side * 0.12, 0.1);
    const shoulder = joint(`${side} Shoulder`, clavicle, side * 0.14);
    const elbow = joint(`${side} Elbow`, shoulder, 0, -0.335);
    const forearmTwist = joint(`${side} Forearm twist`, elbow);
    const wrist = joint(`${side} Wrist`, forearmTwist, 0, -0.315);
    const hand = joint(`${side} Hand`, wrist);
    const hip = joint(`${side} Hip`, pelvis, side * 0.135);
    const knee = joint(`${side} Knee`, hip, 0, -0.43);
    const ankle = joint(`${side} Ankle`, knee, 0, -0.39);
    const toe = joint(`${side} Toe`, ankle, 0, -0.075, -0.16);
    return { side, clavicle, shoulder, elbow, forearmTwist, wrist, hand, hip, knee, ankle, toe };
  });
  const parts = new Map<string, THREE.BufferGeometry[]>();
  const colors: Record<string, string> = { steel: '#95a6a8', edge: '#bdc9c7', mail: '#58646a', cloth: '#912f3b', leather: '#493a30', dark: '#121c23' };
  const palette = new Uint8Array([80, 151, 214, 255]);
  const gradient = new THREE.DataTexture(palette, 4, 1, THREE.RedFormat); gradient.needsUpdate = true; gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  function add(geometry: THREE.BufferGeometry, bone: THREE.Bone, material: string, blendBone?: THREE.Bone, blend?: (point: THREE.Vector3) => number) {
    const geo = geometry.clone();
    if(!geo.index) geo.setIndex(Array.from({length:geo.getAttribute('position').count},(_,i)=>i));
    geometry.dispose();
    if (!geo.getAttribute('uv')) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.getAttribute('position').count * 2), 2));
    container.updateWorldMatrix(true, true);
    const position = geo.getAttribute('position'), indices: number[] = [], weights: number[] = [], shades: number[] = [];
    const local = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
      local.fromBufferAttribute(position, i);
      const amount = blendBone && blend ? THREE.MathUtils.clamp(blend(local), 0, 1) : 0;
      indices.push(bones.indexOf(bone), blendBone ? bones.indexOf(blendBone) : 0, 0, 0); weights.push(1 - amount, amount, 0, 0);
      const shade = 0.97 + 0.03 * Math.sin(local.y * 19 + local.x * 7) * Math.cos(local.z * 11);
      shades.push(shade, shade, shade);
    }
    geo.applyMatrix4(bone.matrixWorld);
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(shades, 3));
    let owner: THREE.Object3D | null = bone;
    let region = bone === head ? 1 : 0;
    while (owner) { if (owner.name === '1 Shoulder') region = 2; owner = owner.parent; }
    geo.setAttribute('bodyRegion', new THREE.Float32BufferAttribute(new Float32Array(position.count).fill(region), 1));
    const list = parts.get(material) ?? []; list.push(geo); parts.set(material, list);
  }
  function ellipsoid(bone: THREE.Bone, material: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const small = Math.max(sx,sy,sz)<0.06;
    const geometry = new THREE.SphereGeometry(1, small ? 8 : 16, small ? 6 : 10); geometry.scale(sx, sy, sz); geometry.translate(x, y, z); add(geometry, bone, material);
  }
  function tube(bone: THREE.Bone, next: THREE.Bone, material: string, length: number, top: number, bottom: number, depth = 1) {
    const geometry = new THREE.CylinderGeometry(top, bottom, length, 12, 6);
    geometry.scale(1, 1, depth); geometry.translate(0, -length / 2, 0);
    add(geometry, bone, material, next, p => Math.max(0, (-p.y / length - 0.72) / 0.28) * 0.5);
  }
  function shell(bone: THREE.Bone, material: string, rings: [number, number, number, number][], segments = 28) {
    const vertices: number[] = [], uv: number[] = [], indices: number[] = [];
    for (const [j, [y, width, depth, z]] of rings.entries()) for (let i = 0; i <= segments; i++) {
      const angle = i / segments * Math.PI * 2;
      vertices.push(Math.sin(angle) * width, y, Math.cos(angle) * depth + z); uv.push(i / segments, j / (rings.length - 1));
    }
    for (let j = 0; j < rings.length - 1; j++) for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i, b = a + segments + 1; indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); add(geometry, bone, material);
  }
  // A fitted torso with independent lumbar/chest deformation and overlapping plates.
  ellipsoid(pelvis, 'mail', 0, 0.035, 0, 0.19, 0.16, 0.125);
  shell(spine, 'mail', [[-0.08, 0.17, 0.11, 0], [0.1, 0.19, 0.12, 0], [0.27, 0.235, 0.14, 0], [0.36, 0.19, 0.115, 0]]);
  shell(chest, 'steel', [[-0.23, 0.165, 0.115, 0], [-0.13, 0.2, 0.145, -0.01], [0.01, 0.245, 0.155, -0.005], [0.14, 0.205, 0.12, 0], [0.16, 0.15, 0.095, 0]]);
  for (let i = 0; i < 3; i++) shell(spine, 'steel', [[-0.11 + i * 0.065, 0.19 + i * 0.005, 0.125, 0], [-0.07 + i * 0.065, 0.19 + i * 0.005, 0.13, 0]]);
  shell(pelvis, 'leather', [[0.075, 0.195, 0.135, 0], [0.12, 0.19, 0.135, 0]]);
  ellipsoid(pelvis, 'edge', 0.045, 0.095, -0.14, 0.025, 0.027, 0.008);
  shell(neck, 'mail', [[-0.07, 0.1, 0.085, 0], [0.05, 0.085, 0.075, 0]]);
  shell(neck, 'steel', [[-0.14, 0.16, 0.115, 0], [-0.08, 0.115, 0.09, 0], [-0.04, 0.1, 0.085, 0]]);
  // Rounded armet bowl and projecting visor, with a completely black narrow slit.
  shell(head, 'steel', [[-0.07, 0.08, 0.075, 0], [-0.025, 0.115, 0.105, -0.01], [0.07, 0.13, 0.125, 0], [0.16, 0.115, 0.11, 0.005], [0.205, 0.065, 0.07, 0.01], [0.22, 0.005, 0.009, 0.01]]);
  const visor = new THREE.BufferGeometry();
  visor.setAttribute('position', new THREE.Float32BufferAttribute([-0.11,0.065,-0.105, 0.11,0.065,-0.105, 0,0.015,-0.18, -0.085,-0.045,-0.105, 0.085,-0.045,-0.105],3));
  visor.setIndex([0,2,1,0,3,2,2,4,1,3,4,2]); visor.computeVertexNormals(); add(visor, head, 'steel');
  const slit = new THREE.BoxGeometry(0.205, 0.012, 0.012); slit.translate(0, 0.074, -0.12); add(slit, head, 'dark');
  for (const side of [-1, 1]) {
    ellipsoid(head, 'edge', side * 0.119, 0.015, -0.025, 0.012, 0.012, 0.012);
    for (let i = 0; i < 3; i++) ellipsoid(head, 'dark', side * (0.035 + i * 0.018), -0.012, -0.14 + i * 0.007, 0.0035, 0.004, 0.004);
  }
  for (const limb of limbs) {
    const { side, shoulder, elbow, forearmTwist, wrist, hand, hip, knee, ankle, toe } = limb;
    ellipsoid(shoulder, 'mail', 0, -0.025, 0, 0.105, 0.11, 0.105);
    ellipsoid(shoulder, 'steel', side * 0.012, 0.015, 0, 0.11, 0.075, 0.12);
    tube(shoulder, elbow, 'mail', 0.335, 0.075, 0.06);
    tube(shoulder, elbow, 'steel', 0.23, 0.078, 0.065, 0.9);
    ellipsoid(elbow, 'steel', 0, 0, -0.015, 0.075, 0.07, 0.075);
    tube(forearmTwist, wrist, 'mail', 0.315, 0.06, 0.042);
    tube(forearmTwist, wrist, 'steel', 0.26, 0.068, 0.045, 0.88);
    ellipsoid(hand, 'leather', 0.035, 0, 0.015, 0.045, 0.057, 0.033);
    ellipsoid(hand, 'steel', 0.055, 0, 0.025, 0.03, 0.055, 0.022);
    for (let finger = 0; finger < 4; finger++) {
      let digit = joint(`${side} Finger ${finger}`, hand, 0.025, -0.042 + finger * 0.026, -0.015);
      for (let segment = 0; segment < 3; segment++) {
        ellipsoid(digit, segment ? 'leather' : 'steel', -0.009, 0, 0, 0.016, 0.011, 0.012);
        if (segment < 2) { digit = joint(`${side} Finger ${finger} ${segment}`, digit, -0.023); digit.rotation.y = -0.7; }
      }
    }
    const thumb = joint(`${side} Thumb`, hand, 0.045, 0.06, -0.01);
    ellipsoid(thumb, 'leather', -0.015, -0.015, 0, 0.025, 0.015, 0.015);
    const thumbTip = joint(`${side} Thumb tip`,thumb,-0.025,-0.01);
    ellipsoid(thumbTip,'leather',-0.01,0,0,0.017,0.012,0.012);
    tube(hip, knee, 'mail', 0.43, 0.102, 0.07);
    tube(hip, knee, 'steel', 0.31, 0.105, 0.078, 0.87);
    ellipsoid(knee, 'steel', 0, 0, -0.025, 0.083, 0.083, 0.085);
    tube(knee, ankle, 'mail', 0.39, 0.065, 0.045);
    tube(knee, ankle, 'steel', 0.34, 0.075, 0.048, 0.92);
    ellipsoid(ankle, 'leather', 0, -0.045, -0.02, 0.073, 0.095, 0.095);
    ellipsoid(ankle, 'steel', 0, -0.095, -0.05, 0.083, 0.052, 0.14);
    ellipsoid(toe, 'steel', 0, -0.027, -0.035, 0.08, 0.035, 0.105);
    // Split mail and cloth panels follow each thigh, allowing real leg articulation.
    const skirt = new THREE.CylinderGeometry(0.145, 0.17, 0.34, 12, 5, true);
    skirt.scale(1,1,0.8); skirt.translate(-side * 0.015, -0.1, 0); add(skirt, hip, 'mail', knee, p => Math.max(0, -p.y - 0.15));
    const cloth = new THREE.PlaneGeometry(0.15, 0.34, 4, 6); cloth.translate(-side * 0.025, -0.085, -0.145); add(cloth, hip, 'cloth', knee, p => Math.max(0, -p.y - 0.15));
  }
  // Curved red chest cloth, shaped to the breastplate rather than a box apron.
  const cloth = new THREE.PlaneGeometry(0.31, 0.31, 6, 8);
  const cp = cloth.getAttribute('position');
  for (let i = 0; i < cp.count; i++) { const x = cp.getX(i), y = cp.getY(i); cp.setXYZ(i, x, y - 0.015, -0.171 + x * x * 0.4); }
  cloth.computeVertexNormals(); add(cloth, chest, 'cloth');
  const bat = new THREE.Shape();
  const outline = [[0,.076],[.018,.09],[.024,.06],[.065,.1],[.155,.135],[.13,.035],[.095,.055],[.07,.005],[.046,.03],[.025,-.035],[.044,-.065],[.017,-.05],[0,-.075],[-.017,-.05],[-.044,-.065],[-.025,-.035],[-.046,.03],[-.07,.005],[-.095,.055],[-.13,.035],[-.155,.135],[-.065,.1],[-.024,.06],[-.018,.09]];
  outline.forEach(([x,y],i)=> { if (!i) bat.moveTo(x,y); else bat.lineTo(x,y); }); bat.closePath();
  const heraldry = new THREE.ShapeGeometry(bat); heraldry.translate(0, -0.025, -0.177); add(heraldry, chest, 'dark');
  // Bind once; all visible anatomy/armor shares the actual articulated skeleton.
  container.updateWorldMatrix(true, true);
  const skeleton = new THREE.Skeleton(bones);
  const meshes: THREE.SkinnedMesh[] = [];
  const mailPixels = new Uint8Array(64*64*4);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){
    const u=((x+(Math.floor(y/8)%2)*4)%8-4)/3.5,v=(y%8-4)/3;
    const ring=Math.abs(Math.sqrt(u*u+v*v)-0.9)<0.18;
    const value=ring?132:212; const at=(y*64+x)*4;mailPixels.set([value,value,value,255],at);
  }
  const mailTexture=new THREE.DataTexture(mailPixels,64,64);mailTexture.wrapS=mailTexture.wrapT=THREE.RepeatWrapping;mailTexture.repeat.set(2,3);mailTexture.needsUpdate=true;
  for (const [name, geometries] of parts) {
    const merged = mergeGeometries(geometries); if (!merged) throw new Error('Character geometry merge failed');
    for (const geometry of geometries) geometry.dispose();
    const material = new THREE.MeshToonMaterial({ color: colors[name], gradientMap: gradient, vertexColors: true, side: THREE.DoubleSide });
    if(name==='mail')material.map=mailTexture;
    const mesh = new THREE.SkinnedMesh(merged, material); mesh.name = `${name} skinned surface`; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; container.add(mesh); mesh.bind(skeleton); meshes.push(mesh);
    const ink = new THREE.MeshBasicMaterial({ color: '#18242b', side: THREE.BackSide });
    ink.onBeforeCompile = shader => { shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', 'transformed += normalize(objectNormal) * 0.004;\n#include <project_vertex>'); };
    const contour = new THREE.SkinnedMesh(merged, ink); contour.name = 'Ink contour'; contour.frustumCulled = false; container.add(contour); contour.bind(skeleton, mesh.bindMatrix);
  }
  const down = new THREE.Vector3(0,-1,0);
  function localPoint(object: THREE.Object3D, point: THREE.Vector3) { return container.worldToLocal(object.localToWorld(point)); }
  function orient(bone: THREE.Bone, direction: THREE.Vector3) {
    const world = new THREE.Quaternion().setFromUnitVectors(down, direction.normalize());
    const owner = bone.parent!.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.copy(owner.invert().multiply(world)); bone.updateWorldMatrix(false,true);
  }
  function solve(upper: THREE.Bone, lower: THREE.Bone, end: THREE.Bone, target: THREE.Vector3, a: number, b: number, pole: THREE.Vector3) {
    container.updateWorldMatrix(true,true);
    const origin = container.worldToLocal(upper.getWorldPosition(new THREE.Vector3()));
    const axis = target.clone().sub(origin), distance = Math.min(a+b-0.001, Math.max(0.04, axis.length())); axis.normalize();
    const bend = pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize();
    const along = (a*a+distance*distance-b*b)/(2*distance), height = Math.sqrt(Math.max(0,a*a-along*along));
    const middle = origin.clone().addScaledVector(axis,along).addScaledVector(bend,height);
    // Directions are transformed into world orientation; end positions follow FK.
    const rotation = container.getWorldQuaternion(new THREE.Quaternion());
    orient(upper,middle.clone().sub(origin).applyQuaternion(rotation));
    orient(lower,target.clone().sub(middle).applyQuaternion(rotation));
    end.updateWorldMatrix(false,true);
  }
  const severed = new Set<SeverPart>();
  const originalIndices = new Map(meshes.map(mesh => [mesh.geometry, Array.from(mesh.geometry.index!.array)]));
  const caps: THREE.Mesh[] = [];
  function refreshIndices() {
    for (const mesh of meshes) {
      const geometry = mesh.geometry, original = originalIndices.get(geometry)!;
      const region = geometry.getAttribute('bodyRegion'), index = geometry.index!;
      let count = 0;
      for (let i = 0; i < original.length; i += 3) {
        const part = region.getX(original[i]);
        if ((part === 1 && severed.has('head')) || (part === 2 && severed.has('sword-arm'))) continue;
        index.setX(count++, original[i]); index.setX(count++, original[i + 1]); index.setX(count++, original[i + 2]);
      }
      index.needsUpdate = true; geometry.setDrawRange(0, count);
    }
  }
  return {
    root: container, skeleton, bones, meshes,
    hasPart(part: SeverPart) { return !severed.has(part); },
    detach(part: SeverPart): THREE.Group | null {
      if (severed.has(part)) return null;
      container.updateWorldMatrix(true, true); skeleton.update();
      const joint = part === 'head' ? head : limbs.find(limb => limb.side === 1)!.shoulder;
      const pivot = joint.localToWorld(new THREE.Vector3(0, part === 'head' ? -.06 : -.045, 0));
      const detached = new THREE.Group(); detached.name = part === 'head' ? 'Detached head' : 'Detached sword arm'; detached.position.copy(pivot);
      const code = part === 'head' ? 1 : 2;
      for (const mesh of meshes) {
        const geometry = mesh.geometry, region = geometry.getAttribute('bodyRegion');
        const original = originalIndices.get(geometry)!, used = new Map<number, number>();
        const triangles: number[] = [], positions: number[] = [], colors: number[] = [], uvs: number[] = [];
        for (let i = 0; i < original.length; i += 3) {
          if (region.getX(original[i]) !== code) continue;
          for (const vertex of original.slice(i, i + 3)) {
            if (!used.has(vertex)) {
              used.set(vertex, used.size);
              const point = mesh.localToWorld(mesh.getVertexPosition(vertex, new THREE.Vector3())).sub(pivot);
              positions.push(point.x, point.y, point.z);
              const color = geometry.getAttribute('color'), uv = geometry.getAttribute('uv');
              colors.push(color.getX(vertex), color.getY(vertex), color.getZ(vertex)); uvs.push(uv.getX(vertex), uv.getY(vertex));
            }
            triangles.push(used.get(vertex)!);
          }
        }
        if (!triangles.length) continue;
        const snapshot = new THREE.BufferGeometry();
        snapshot.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        snapshot.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        snapshot.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); snapshot.setIndex(triangles); snapshot.computeVertexNormals();
        const surface = new THREE.Mesh(snapshot, (mesh.material as THREE.Material).clone()); surface.castShadow = true; detached.add(surface);
        detached.add(new THREE.LineSegments(new THREE.EdgesGeometry(snapshot, 40), new THREE.LineBasicMaterial({ color: '#18242b' })));
      }
      const capGeometry = new THREE.CircleGeometry(part === 'head' ? .078 : .075, 14); capGeometry.rotateX(-Math.PI / 2);
      const capMaterial = new THREE.MeshToonMaterial({ color: '#501c24', side: THREE.DoubleSide });
      const stump = new THREE.Mesh(capGeometry, capMaterial); stump.position.y = part === 'head' ? -.06 : -.045; joint.add(stump); caps.push(stump);
      const end = new THREE.Mesh(capGeometry.clone(), capMaterial.clone());
      end.quaternion.copy(joint.getWorldQuaternion(new THREE.Quaternion())); detached.add(end);
      severed.add(part); refreshIndices(); return detached;
    },
    resetParts() {
      severed.clear(); refreshIndices();
      for (const cap of caps) { cap.removeFromParent(); cap.geometry.dispose(); (cap.material as THREE.Material).dispose(); }
      caps.length = 0;
    },
    update(grip = 1, gait = 0, phase = 0) {
      const pose = controls.body;
      pelvis.position.set(pose.position.x * 0.7, 0.94 + pose.position.y * 0.75, pose.position.z * 0.5);
      pelvis.rotation.set(pose.rotation.x * 0.2,pose.rotation.y * 0.4,pose.rotation.z * 0.4);
      spine.rotation.set(pose.rotation.x * 0.25,pose.rotation.y * 0.25,pose.rotation.z * 0.25);
      ribs.rotation.set(pose.rotation.x * 0.3,pose.rotation.y * 0.2,pose.rotation.z * 0.2);
      chest.rotation.set(pose.rotation.x * 0.25,pose.rotation.y * 0.15,pose.rotation.z * 0.15);
      head.rotation.set(-0.035,-pose.rotation.y * 0.15,0);
      container.updateWorldMatrix(true,true);
      for (const [index, limb] of limbs.entries()) {
        const target = localPoint(controls.feet[index], new THREE.Vector3());
        solve(limb.hip,limb.knee,limb.ankle,target,0.43,0.39,new THREE.Vector3(0,0,-1));
        const footRotation = controls.feet[index].getWorldQuaternion(new THREE.Quaternion());
        const kneeRotation = limb.knee.getWorldQuaternion(new THREE.Quaternion()); limb.ankle.quaternion.copy(kneeRotation.invert().multiply(footRotation));
        limb.toe.rotation.x = Math.max(0,Math.sin(phase + index*Math.PI)) * gait * 0.12;
        container.updateWorldMatrix(true,true);
        const handTarget = localPoint(controls.sword,new THREE.Vector3(0,limb.side < 0 ? -0.16 : 0.02,0));
        if (limb.side < 0 && grip < 1) {
          const free = new THREE.Vector3(-0.3,0.96,Math.sin(phase)*gait*0.23);
          handTarget.lerp(free,1-grip);
        }
        limb.clavicle.position.set(limb.side * 0.12, 0.1, 0);
        container.updateWorldMatrix(true,true);
        const origin = container.worldToLocal(limb.shoulder.getWorldPosition(new THREE.Vector3()));
        const reach = Math.max(0,handTarget.distanceTo(origin)-0.64);
        limb.clavicle.position.z = -Math.min(0.11,reach);
        limb.clavicle.position.y -= Math.min(0.05,reach*0.5);
        limb.clavicle.position.x -= limb.side*Math.min(0.035,reach*0.4);
        solve(limb.shoulder,limb.elbow,limb.wrist,handTarget,0.335,0.315,new THREE.Vector3(limb.side, -0.35, 0.45));
        const weaponRotation = controls.sword.getWorldQuaternion(new THREE.Quaternion());
        if (limb.side < 0 && grip < 1) weaponRotation.slerp(container.getWorldQuaternion(new THREE.Quaternion()),1-grip);
        const elbowRotation = limb.elbow.getWorldQuaternion(new THREE.Quaternion());
        const relative = elbowRotation.invert().multiply(weaponRotation.clone());
        const twist = new THREE.Quaternion(0,relative.y,0,relative.w).normalize();
        limb.forearmTwist.quaternion.identity().slerp(twist,0.5);
        limb.forearmTwist.updateWorldMatrix(false,true);
        const wristParent = limb.forearmTwist.getWorldQuaternion(new THREE.Quaternion());
        limb.wrist.quaternion.copy(wristParent.invert().multiply(weaponRotation));
        for(const bone of bones) if(bone.name.startsWith(`${limb.side} Finger`) && / [01]$/.test(bone.name) && bone.parent?.name.includes('Finger')) {
          bone.rotation.y = limb.side < 0 ? -0.12 - 0.58 * grip : -0.7;
        }
      }
      container.updateWorldMatrix(true,true); skeleton.update();

    },
  };
}
