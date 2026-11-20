import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';
import { createLegStudy } from './legs.ts';
import { createSwordCarry } from './carry.ts';
import { createTwoHandCarry } from './twoHandCarry.ts';
import { createHumanRig } from '../../../src/humanRig.ts';

const animationMode = new URLSearchParams(location.search).get('mode') === 'animation';
const swordModel = !animationMode && new URLSearchParams(location.search).get('model') === 'sword';
document.body.dataset.mode = animationMode ? 'animation' : 'model';
document.title = animationMode ? 'Animation Testing · Rig Workbench' : swordModel ? 'Player Model · Sword' : 'Player Model · Knight';
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = element<HTMLCanvasElement>('view'), viewport = canvas.parentElement!;
const status = element('status'), stats = element('stats');
const clip = element<HTMLSelectElement>('clip'), timeline = element<HTMLInputElement>('timeline');
const play = element<HTMLButtonElement>('play'), restart = element<HTMLButtonElement>('restart');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.localClippingEnabled = true;
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene(); scene.background = new THREE.Color('#d6ddd6');
scene.add(new THREE.HemisphereLight('#f4f6ee', '#59636c', animationMode ? 2 : 1.1));
const key = new THREE.DirectionalLight('#fff1d2', 2.5); key.position.set(3, 5, 4); scene.add(key);
if (!animationMode) {
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
  scene.environment=pmrem.fromScene(room,.04).texture; scene.environmentIntensity=.65; room.dispose();pmrem.dispose();
  key.position.set(-3,5,-4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-2,right:2,top:3,bottom:-1,near:.1,far:14});key.shadow.bias=-.0002;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshStandardMaterial({color:'#c3c6c2',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.004;floor.receiveShadow=true;scene.add(floor);
}
const camera = new THREE.PerspectiveCamera(42, 1, .01, 1000);
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true;
const grid = new THREE.GridHelper(10, 20, '#81918b', '#b3bfb5'); scene.add(grid);
const mount = new THREE.Group(); scene.add(mount);
const loader = new GLTFLoader();
type ViewAsset = Pick<GLTF, 'scene' | 'animations'>;
let asset: ViewAsset | null = null, mixer: THREE.AnimationMixer | null = null;
let action: THREE.AnimationAction | null = null, helper: THREE.SkeletonHelper | null = null;
let needsRender = true;
controls.addEventListener('change', () => { needsRender = true; });
let playing = false, radius = 1, name = '', generation = 0, lastTime = performance.now(), frontYaw = 0;
let legStudy: ReturnType<typeof createLegStudy> = null, legClock = 0;
const displayOrigin = new THREE.Vector3();
const lowerClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1.1);
const supportMarkers = [0, 1].map(() => {
  const marker = new THREE.Mesh(new THREE.RingGeometry(.047, .062, 24), new THREE.MeshBasicMaterial({ color: '#387f62', side: THREE.DoubleSide }));
  marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker); return marker;
});
let sourceLower = new Map<string, THREE.AnimationClip>();
let sourceWaist: THREE.Object3D | undefined;
let sourceReference = 'soldier';
let swordCarry: ReturnType<typeof createSwordCarry> | ReturnType<typeof createTwoHandCarry> = null;
let carryPreferred = new URLSearchParams(location.search).get('carry') !== 'off';
const carryMode = () => !!swordCarry && swordCarry.clips.has(clip.value);
const lowerMode = () => clip.value.startsWith('lower:') && sourceLower.has(clip.value);
const isolateMode = () => legMode() || lowerMode();
const legMode = () => !!legStudy && clip.value === 'legs';
function currentLocomotion() {
  const name = lowerMode() || carryMode() ? clip.value.slice(6) : asset?.animations[Number(clip.value)]?.name;
  return name && (sourceLower.has(`lower:${name}`) || swordCarry?.clips.has(`carry:${name}`)) ? name : undefined;
}
function compareBody(full: boolean) {
  if (!asset || !mixer) return;
  const name = currentLocomotion(); if (!name) return;
  const time = action?.time ?? 0, wasPlaying = playing;
  clip.value = full ? (carryPreferred && swordCarry?.clips.has(`carry:${name}`) ? `carry:${name}` : String(asset.animations.findIndex(animation => animation.name === name))) : `lower:${name}`;
  setClip();
  if (action) { action.time = time; action.paused = !wasPlaying; }
  playing = wasPlaying; mixer.update(0); timeline.value = String(time);
  element('time').textContent = `${time.toFixed(2)}s`; play.textContent = playing ? 'Pause' : 'Play';
  updateLegDisplay(); fit(carryMode() ? 'weapon' : 'three-quarter');
  status.textContent = `${full ? 'Full-body source motion' : 'Legs and pelvis only'} · same stride time preserved.`;
}
function updateLegDisplay() {
  if (swordCarry) swordCarry.sword.visible = carryMode();
  element('carry-control').hidden = !swordCarry;
  element('carry-label').textContent = sourceReference === 'rigged-knight' ? 'Two-hand shoulder carry' : 'Sword carry';
  element<HTMLInputElement>('sword-carry').checked = carryPreferred;
  element<HTMLInputElement>('sword-carry').disabled = !currentLocomotion();
  const active = legMode(), isolate = isolateMode() && element<HTMLInputElement>('lower-only').checked;
  if (lowerMode() && sourceWaist) lowerClip.constant = sourceWaist.getWorldPosition(new THREE.Vector3()).y + .1;
  else if (legStudy) lowerClip.constant = legStudy.waist + legStudy.pelvisPose().position[1] - legStudy.legHeight;
  asset?.scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.clippingPlanes = isolate ? [lowerClip] : null;
  });
  if (helper) for (const material of Array.isArray(helper.material) ? helper.material : [helper.material]) material.clippingPlanes = isolate ? [lowerClip] : null;
  element('leg-panel').hidden = !legStudy && !sourceLower.size;
  element('study-title').textContent = sourceReference === 'rigged-knight' ? 'Knight · two-hand shoulder carry' : sourceLower.size ? 'AT-006 · Low sword carry' : 'AT-003 v2 · Procedural study';
  element('study-description').textContent = sourceReference === 'rigged-knight' ? 'Both hands share one sword grip over the right shoulder. Source torso and leg motion retained. Inspect wrists, armor and blade clearance.' : sourceLower.size ? carryMode() ? 'Sword carried low in the right hand. The free arm, torso, head and legs retain Quaternius source motion.' : 'Source motion or legs-only comparison. Enable Sword carry to review the one-handed adaptation.' : 'Procedural gait retained for comparison; user review found it creeping.';
  element('body-comparison').hidden = !sourceLower.size;
  element('body-note').hidden = !sourceLower.size;
  element<HTMLButtonElement>('full-body').disabled = !currentLocomotion() || !lowerMode();
  element<HTMLButtonElement>('legs-body').disabled = !currentLocomotion() || lowerMode() || !sourceLower.has(`lower:${currentLocomotion()}`);
  element<HTMLInputElement>('lower-only').disabled = !isolateMode();
  element('support-note').hidden = !active;
  element<HTMLInputElement>('travel').disabled = !active;
  if (active && legStudy) {
    const samples = legStudy.sample(action?.time ?? 0);
    element('leg-phase').textContent = samples.map(sample => `${sample.side}: ${sample.phaseName}`).join(' · ');
    samples.forEach((sample, index) => {
      const marker = supportMarkers[index]; marker.visible = sample.stance;
      marker.position.set(sample.ankle[0], .008, sample.ankle[2] + sample.contactOffset);
    });
  } else { supportMarkers.forEach(marker => { marker.visible = false; }); element('leg-phase').textContent = lowerMode() ? 'Authored lower-body motion · in place · no procedural support markers.' : 'Full supplied clip or rest pose.'; }
}
function updateTravel() {
  const next = displayOrigin.clone();
  if (legMode() && legStudy && element<HTMLInputElement>('travel').checked) next.z -= legClock * legStudy.speed;
  const delta = next.clone().sub(mount.position); mount.position.copy(next);
  camera.position.add(delta); controls.target.add(delta);
  const spacing = .5 * grid.scale.x;
  grid.position.z = Math.round(next.z / spacing) * spacing;
  mount.updateWorldMatrix(true, true);
}

function dispose(root: THREE.Object3D) {
  const textures = new Set<THREE.Texture>(), materials = new Set<THREE.Material>(), geometries = new Set<THREE.BufferGeometry>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); textures.forEach(texture => texture.dispose());
}
function clear() {
  if (asset) { mixer?.stopAllAction(); mixer?.uncacheRoot(asset.scene); mount.remove(asset.scene); dispose(asset.scene); }
  if (helper) { scene.remove(helper); helper.dispose(); }
  helper = null; mixer = null; action = null; asset = null; playing = false;
  legStudy = null; swordCarry = null; sourceLower.clear(); sourceWaist = undefined; legClock = 0; supportMarkers.forEach(marker => { marker.visible = false; });
  play.disabled = restart.disabled = timeline.disabled = clip.disabled = true;
  play.textContent = 'Play'; timeline.value = '0';
}
function fit(view = 'front') {
  const box = asset ? new THREE.Box3().setFromObject(asset.scene) : new THREE.Box3(new THREE.Vector3(-.5, 0, -.5), new THREE.Vector3(.5, 2, .5));
  if (isolateMode() && element<HTMLInputElement>('lower-only').checked) {
    box.min.set(mount.position.x - .4, 0, mount.position.z - .5);
    box.max.set(mount.position.x + .4, legStudy?.waist ?? lowerClip.constant, mount.position.z + .5);
  }
  if (view === 'upper' && asset && !sourceWaist) { box.min.y += (box.max.y - box.min.y) * .50; }
  if (view === 'upper' && asset && sourceWaist) {
    const pelvis = sourceWaist.getWorldPosition(new THREE.Vector3());
    const head = asset.scene.getObjectByName('Head')?.getWorldPosition(new THREE.Vector3());
    if (head) { box.min.set(pelvis.x - .55, pelvis.y - .1, pelvis.z - .4); box.max.set(pelvis.x + .55, head.y + .2, pelvis.z + .4); }
  }
  const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  radius = Math.max(size.length() / 2, .1);
  const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.max(1.15, 1 / camera.aspect);
  camera.near = Math.max(.001, radius / 1000); camera.far = Math.max(100, distance * 20); camera.updateProjectionMatrix();
  controls.target.copy(center);
  const angle = frontYaw + (view === 'side' ? Math.PI / 2 : view === 'back' ? Math.PI : view === 'weapon' ? -Math.PI / 3 : view === 'three-quarter' || view === 'upper' ? Math.PI / 5 : 0);
  camera.position.copy(center).add(new THREE.Vector3(Math.sin(angle) * distance, distance * .08, Math.cos(angle) * distance));
  controls.minDistance = radius * .15; controls.maxDistance = distance * 10; controls.update();
}
function setClip() {
  if (!asset || !mixer) return;
  mixer.stopAllAction(); action = null; playing = false; play.textContent = 'Play'; timeline.value = '0';
  legClock = 0;
  if (currentLocomotion() && !lowerMode()) carryPreferred = carryMode();
  const index = Number(clip.value), animation = carryMode() ? swordCarry!.clips.get(clip.value) : legMode() ? legStudy!.clip : lowerMode() ? sourceLower.get(clip.value) : asset.animations[index];
  if (animation) { action = mixer.clipAction(animation); action.reset().play(); action.paused = true; timeline.max = String(animation.duration); }
  else { for (const skeleton of skeletons()) skeleton.pose(); timeline.max = '1'; }
  play.disabled = restart.disabled = timeline.disabled = !action;
  mixer.update(0); element('time').textContent = '0.00s';
  updateTravel(); updateLegDisplay();
  status.textContent = carryMode() ? sourceReference === 'rigged-knight' ? 'Two-handed sword carried over the right shoulder · in place.' : 'Experimental one-handed carry on the Quaternius rig · in place.' : lowerMode() ? 'Quaternius authored clip, filtered to pelvis and legs. Playing in place.' : legMode() ? 'Procedural comparison; upper-body joints are unanimated.' : 'Supplied reference clip or rest pose.';
}
function skeletons() {
  const result = new Set<THREE.Skeleton>();
  asset?.scene.traverse(object => { if (object instanceof THREE.SkinnedMesh) result.add(object.skeleton); });
  return result;
}
function wireframe() {
  needsRender = true;
  const enabled = element<HTMLInputElement>('wireframe').checked;
  asset?.scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) if ('wireframe' in material) material.wireframe = enabled;
  });
}
function accept(gltf: ViewAsset, filename: string, token: number, viewYaw = 0, carriedSword?: THREE.Object3D) {
  if (token !== generation) { dispose(gltf.scene); return; }
  clear(); renderer.shadowMap.needsUpdate=true; needsRender=true; asset = gltf; name = filename; frontYaw = viewYaw; mount.position.set(0, 0, 0); mount.add(asset.scene);
  const box = new THREE.Box3().setFromObject(asset.scene), center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  if (box.isEmpty() || !Number.isFinite(size.length())) { clear(); status.textContent = 'The file has no visible model bounds.'; return; }
  mount.position.set(-center.x, -box.min.y, -center.z); mount.updateWorldMatrix(true, true);
  displayOrigin.copy(mount.position); legClock = 0;
  legStudy = animationMode ? createLegStudy(asset.scene) : null;
  sourceWaist = asset.scene.getObjectByName('pelvis') ?? asset.scene.getObjectByName('Pelvis');
  if (sourceWaist) {
    const lowerBones = /^(root|pelvis|thigh_[lr]|calf_[lr]|foot_[lr]|ball_[lr]|ball_leaf_[lr])$/;
    for (const animation of asset.animations) {
      if (!['Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop'].includes(animation.name)) continue;
      const tracks = animation.tracks.filter(track => lowerBones.test(THREE.PropertyBinding.parseTrackName(track.name).nodeName ?? '')).map(track => track.clone());
      if (tracks.length) sourceLower.set(`lower:${animation.name}`, new THREE.AnimationClip(`${animation.name} · pelvis and legs`, animation.duration, tracks));
    }
  }
  swordCarry = animationMode && carriedSword ? createTwoHandCarry(asset.scene, asset.animations, carriedSword) : animationMode && sourceReference !== 'rigged-knight' ? createSwordCarry(asset.scene, asset.animations) : null;
  mixer = new THREE.AnimationMixer(asset.scene);
  helper = new THREE.SkeletonHelper(asset.scene); helper.visible = element<HTMLInputElement>('skeleton').checked; scene.add(helper);
  let bones = 0, meshes = 0, skinned = 0;
  asset.scene.traverse(object => { if (object instanceof THREE.Bone) bones++; if (object instanceof THREE.Mesh) meshes++; if (object instanceof THREE.SkinnedMesh) skinned++; });
  stats.textContent = `${filename}\n${meshes} meshes · ${skinned} skinned\n${bones} bones${animationMode ? ` · ${asset.animations.length} clips` : ''}\nOriginal height: ${size.y.toFixed(3)} units${legStudy ? `\nAT-003 v2: 10 lower-body tracks\nIK reach error: ${(legStudy.maximumReachError * 1000).toFixed(2)}mm\nSupport knee bend: ${legStudy.minimumSupportKneeBend.toFixed(1)}° minimum` : ''}`;
  clip.replaceChildren(new Option('Rest pose', '-1'), ...(legStudy ? [new Option('AT-003 v2 · Flow and extension', 'legs')] : []), ...[...(swordCarry?.clips.entries() ?? [])].map(([id, animation]) => new Option(animation.name, id)), ...[...sourceLower.entries()].map(([id, animation]) => new Option(animation.name, id)), ...asset.animations.map((animation, i) => new Option(`${animation.name || `Clip ${i + 1}`} · supplied`, String(i))));
  clip.disabled = false; clip.value = '-1'; setClip(); wireframe();
  grid.scale.setScalar(Math.max(.01, size.y / 2)); fit();
  status.textContent = skinned ? 'Rig loaded. Inspect the rest pose or select a clip.' : 'Model loaded; no skinned mesh was found.';
}
async function loadFile(file: File) {
  if (!/\.(glb|gltf)$/i.test(file.name)) { status.textContent = '.blend files must be exported through Blender first. Load .glb or self-contained .gltf.'; return; }
  const token = ++generation; status.textContent = `Loading ${file.name}…`;
  try { const gltf = await loader.parseAsync(await file.arrayBuffer(), ''); if (token !== generation) { dispose(gltf.scene); return; } accept(gltf, file.name, token); element('reference-name').textContent = file.name; element('source-status').textContent = 'Manually loaded file; verify its source and terms separately.'; }
  catch (error) { if (token === generation) status.textContent = `Could not load model: ${error instanceof Error ? error.message : String(error)}`; }
}
element<HTMLInputElement>('file').addEventListener('change', event => {
  const input = event.target as HTMLInputElement; if (input.files?.[0]) void loadFile(input.files[0]); input.value = '';
});
canvas.addEventListener('dragover', event => event.preventDefault());
canvas.addEventListener('drop', event => { event.preventDefault(); if (event.dataTransfer?.files[0]) void loadFile(event.dataTransfer.files[0]); });
clip.addEventListener('change', setClip);
element('sword-carry').addEventListener('change', event => {
  carryPreferred = (event.target as HTMLInputElement).checked;
  if (currentLocomotion() && !lowerMode()) compareBody(true);
});
element('full-body').addEventListener('click', () => compareBody(true));
element('legs-body').addEventListener('click', () => compareBody(false));
play.addEventListener('click', () => { if (action) { playing = !playing; action.paused = !playing; play.textContent = playing ? 'Pause' : 'Play'; status.textContent = playing ? 'Playing the selected motion.' : 'Paused. Scrub or switch views to inspect the pose.'; } });
restart.addEventListener('click', () => { if (action && mixer) { action.time = 0; legClock = 0; mixer.update(0); timeline.value = '0'; updateTravel(); updateLegDisplay(); } });
timeline.addEventListener('input', () => {
  if (action && mixer) { playing = false; action.paused = true; action.time = Number(timeline.value); legClock = action.time; mixer.update(0); updateTravel(); updateLegDisplay(); play.textContent = 'Play'; status.textContent = 'Paused. Scrub or switch views to inspect the pose.'; }
});
element<HTMLInputElement>('skeleton').addEventListener('change', event => { if (helper) helper.visible = (event.target as HTMLInputElement).checked; });
element('wireframe').addEventListener('change', wireframe);
element('lower-only').addEventListener('change', () => { updateLegDisplay(); fit('side'); });
element('travel').addEventListener('change', () => { updateTravel(); updateLegDisplay(); });
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => { if (button.dataset.view === 'upper' && lowerMode()) compareBody(true); fit(button.dataset.view); }));
element('fit').addEventListener('click', () => fit());
new ResizeObserver(() => {
  needsRender = true; renderer.setSize(viewport.clientWidth, viewport.clientHeight, false); camera.aspect = viewport.clientWidth / viewport.clientHeight; camera.updateProjectionMatrix();
}).observe(viewport);
camera.aspect = viewport.clientWidth / viewport.clientHeight; fit();
Object.defineProperty(window, '__rigWorkbench', { get: () => ({ loaded: !!asset, mode: animationMode ? 'animation' : 'model', name, clips: asset?.animations.length ?? 0, skeletons: skeletons().size, playing, time: action?.time ?? 0, sourceReference, selected: clip.value, carry: swordCarry ? { active: carryMode(), tip: swordCarry.tip().toArray(), grip: swordCarry.grip().toArray(), maximumHandError: swordCarry.maximumHandError, maximumReachAdjustment: swordCarry.maximumReachAdjustment, socket: swordCarry.socket(), twoHand: 'gripErrors' in swordCarry ? { errors: swordCarry.gripErrors(), scale: swordCarry.scale, gripSpacing: swordCarry.gripSpacing } : null, backOfHand: swordCarry.backOfHand().toArray() } : null, bodyPose: asset ? Object.fromEntries(['hand_r', 'middle_01_r', 'middle_02_r', 'middle_03_r', 'pelvis', 'thigh_l', 'calf_l', 'foot_l', 'spine_01', 'spine_02', 'spine_03', 'clavicle_l', 'clavicle_r', 'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r', 'neck_01', 'Head'].map(name => { const node = asset!.scene.getObjectByName(name); return [name, node ? { position: node.position.toArray(), rotation: node.quaternion.toArray(), world: node.getWorldPosition(new THREE.Vector3()).toArray() } : null]; })) : null, authoredLower: lowerMode() ? { tracks: action?.getClip().tracks.map(track => track.name), duration: action?.getClip().duration, pelvis: sourceWaist?.position.toArray(), lower: ['thigh_l', 'calf_l', 'foot_l'].map(name => asset?.scene.getObjectByName(name)?.quaternion.toArray()), upper: ['spine_01', 'upperarm_l', 'Head'].map(name => asset?.scene.getObjectByName(name)?.quaternion.toArray()) } : null, study: legStudy ? { active: legMode(), duration: legStudy.clip.duration, tracks: legStudy.clip.tracks.map(track => track.name), speed: legStudy.speed, stride: legStudy.stride, distance: legClock * legStudy.speed, maximumReachError: legStudy.maximumReachError, minimumSupportKneeBend: legStudy.minimumSupportKneeBend, extendedSupportFraction: legStudy.extendedSupportFraction, pelvis: legStudy.pelvisPose(), feet: legStudy.sample(action?.time ?? 0), upper: legStudy.upperPose() } : null }) });
renderer.setAnimationLoop(now => {
  const dt = Math.min((now - lastTime) / 1000, .1); lastTime = now;
  if (animationMode && playing && mixer) { const step = dt * Number(element<HTMLSelectElement>('speed').value); mixer.update(step); if (legMode()) legClock += step; }
  if (animationMode) { updateTravel(); updateLegDisplay(); }
  if (action) { timeline.value = String(action.time); element('time').textContent = `${action.time.toFixed(2)}s`; }
  controls.update();
  if (animationMode || needsRender) { renderer.render(scene, camera); needsRender = false; }
});
async function loadReference(value: string) {
  const token = ++generation;
  sourceReference = value;
  element<HTMLSelectElement>('reference').value = value;
  status.textContent = 'Loading reference…';
  try {
    if (!animationMode && value === 'sword') {
      const gltf = await loader.loadAsync('/models/player-sword.glb');
      if (token !== generation) { dispose(gltf.scene); return; }
      gltf.scene.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
      accept(gltf, 'Player sword · supplied OBJ + PBR textures', token, 0);
      clip.value = '-1'; setClip(); fit('front');
      element('reference-name').textContent = 'Player sword';
      element('source-status').textContent = 'Your supplied sword · original geometry · derived PBR textures';
      status.textContent = 'Static sword review. Drag to rotate, scroll to zoom.';
      return;
    }
    if (value === 'rigged-knight') {
      const [gltf, weapon] = await Promise.all([loader.loadAsync('/models/red-herald-knight-rigged.glb'), animationMode ? loader.loadAsync('/models/player-sword.glb') : Promise.resolve(null)]);
      if (token !== generation) { dispose(gltf.scene); if (weapon) dispose(weapon.scene); return; }
      gltf.scene.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
      accept(gltf, 'Red Herald Knight · fitted rig', token, 0, weapon?.scene);
      element('reference-name').textContent = 'Red Herald Knight';
      element('source-status').textContent = 'Fitted humanoid rig · original mesh and textures · Quaternius motion';
      element<HTMLAnchorElement>('attribution').href = 'https://quaternius.itch.io/universal-animation-library';
      clip.value = animationMode ? (carryPreferred && swordCarry ? 'carry:Walk_Loop' : String(gltf.animations.findIndex(animation => animation.name === 'Walk_Loop'))) : '-1';
      setClip();
      if (animationMode && action) { playing = true; action.paused = false; play.textContent = 'Pause'; }
      fit('three-quarter'); status.textContent = animationMode ? 'Two-handed shoulder carry preview. Choose walking or sprinting; pause and rotate to inspect.' : 'Rigged model in its original static pose.';
      return;
    }
    if (!animationMode && value === 'imported-knight') {
      const gltf = await loader.loadAsync('/models/red-herald-knight.glb');
      if (token !== generation) { dispose(gltf.scene); return; }
      gltf.scene.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
      accept(gltf, 'Player knight · supplied GLB', token, 0);
      clip.value = '-1'; setClip(); fit('three-quarter');
      element('reference-name').textContent = 'Player knight';
      element('source-status').textContent = 'Your supplied model · original embedded materials';
      status.textContent = 'Static model view. Drag to rotate, scroll to zoom.';
      return;
    }
    if (!animationMode && value === 'knight') {
      const model = new THREE.Group(); model.name = 'Player knight model';
      createHumanRig(model, { body: new THREE.Group(), sword: new THREE.Group(), feet: [new THREE.Group(), new THREE.Group()] }, { modelReview: true });
      accept({ scene: model, animations: [] }, 'Silver and red knight', token, Math.PI);
      clip.value = '-1'; setClip(); fit('three-quarter');
      element('reference-name').textContent = 'The bat knight';
      element('source-status').textContent = 'Silver plate · red heraldry · enclosed armet · chainmail';
      status.textContent = 'Static modeling view. Drag to rotate, scroll to zoom.';
      return;
    }
    const info = await fetch('/workbench.json').then(response => response.json());
    const reference = value === 'quaternius' ? {
      name: 'Quaternius Universal Animation Library · Standard', url: '/reference/Quaternius-UAL1-Standard.glb',
      source: 'https://quaternius.itch.io/universal-animation-library',
      attribution: 'Quaternius · CC0 · 43 supplied clips. Sprint enter/exit are absent from this edition.', front_yaw: 0,
    } : info.reference_model;
    const gltf = await loader.loadAsync(reference.url);
    if (token !== generation) { dispose(gltf.scene); return; }
    element('reference-name').textContent = reference.name;
    element('source-status').textContent = reference.attribution;
    element<HTMLAnchorElement>('attribution').href = reference.source;
    accept(gltf, reference.name, token, reference.front_yaw ?? 0);
    if (!animationMode) { clip.value = '-1'; setClip(); fit('three-quarter'); status.textContent = 'Static model view.'; return; }
    clip.value = sourceLower.has('lower:Walk_Loop') ? (new URLSearchParams(location.search).get('body') === 'legs' ? 'lower:Walk_Loop' : (carryPreferred && swordCarry ? 'carry:Walk_Loop' : String(gltf.animations.findIndex(animation => animation.name === 'Walk_Loop')))) : legStudy ? 'legs' : String(Math.max(0, gltf.animations.findIndex(animation => animation.name === reference.clip)));
    setClip(); playing = true; if (action) action.paused = false; play.textContent = 'Pause';
    if (isolateMode()) fit('side'); else fit(carryMode() ? 'weapon' : 'three-quarter');
  } catch (error) { if (token === generation) status.textContent = `Could not load reference: ${error instanceof Error ? error.message : String(error)}`; }
}
element<HTMLSelectElement>('reference').addEventListener('change', event => { void loadReference((event.target as HTMLSelectElement).value); });
if (!animationMode) {
  element('viewer-title').textContent = swordModel ? 'Sword model' : 'Knight model';
  element('viewer-kicker').textContent = 'PLAYER MODEL';
  element('viewer-description').textContent = swordModel ? 'Inspect the blade, hilt and supplied materials.' : 'Inspect the proportions, silhouette and armor.';
  element('viewport-label').textContent = 'MODEL REVIEW';
}
const params = new URLSearchParams(location.search);
void loadReference(animationMode ? (params.get('reference') === 'rigged-knight' ? 'rigged-knight' : params.get('reference') === 'soldier' ? 'soldier' : 'quaternius') : (swordModel ? 'sword' : params.get('model') === 'rigged' ? 'rigged-knight' : params.get('model') === 'legacy' ? 'knight' : 'imported-knight'));
