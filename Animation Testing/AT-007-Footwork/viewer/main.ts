import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createImportedKnight } from './importedKnight.ts';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { createKnight } from '../../../src/knight.ts';
import { moveWithCollision } from '../../../src/movement.ts';
import type { Obstacle } from '../../../src/movement.ts';
import { createFootwork } from '../../../src/footwork/controller.ts';
import type { FootworkEvent, FootworkState, Lead } from '../../../src/footwork/controller.ts';
import { LEG_RIG, carrierOffset, contactPoints, createLowerBodyOverride, solveLowerBody, writeOverride } from '../../../src/footwork/legs.ts';
import type { LowerBodySolution } from '../../../src/footwork/legs.ts';
import { LUNGE, STANCES, TUNING, stanceById } from '../../../src/footwork/stances.ts';

/**
 * AT-007 footwork bench. Hosts the game's real knight and lets the footwork
 * controller drive its hips and legs, with the controller owning the root.
 * The simulation runs at the game's 60 Hz; slow motion shortens each tick
 * rather than skipping ticks, so it stays smooth.
 */
const TICK = 1 / 60, HISTORY = 3600;
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

// ---------------------------------------------------------------- scene
const canvas = $<HTMLCanvasElement>('#view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#deded3');
scene.add(new THREE.HemisphereLight('#fff7e4', '#536574', 1.3));
const key = new THREE.DirectionalLight('#fff4d6', 2); key.position.set(-3, 6, -4); scene.add(key);
const rim = new THREE.DirectionalLight('#c5d9de', 0.8); rim.position.set(3, 3, 3); scene.add(rim);
const flat = (object: THREE.Object3D, y: number) => { object.rotation.x = -Math.PI / 2; object.position.y = y; return object; };
scene.add(flat(new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshToonMaterial({ color: '#c3c6b9' })), -0.004));
// Half-metre squares with darker metre lines, so step lengths can be read off the floor.
const fine = new THREE.GridHelper(60, 120, '#a9ae9f', '#b4b8aa'); fine.position.y = 0.0005; scene.add(fine);
const metres = new THREE.GridHelper(60, 60, '#8b9285', '#98a091'); metres.position.y = 0.001; scene.add(metres);
const line = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 60), new THREE.MeshBasicMaterial({ color: '#7a5f3a' })); scene.add(flat(line, 0.0015));

const legacy = new URLSearchParams(location.search).get('model') === 'legacy';
const knight = legacy ? createKnight() : null;
const imported = legacy ? null : await (async () => {
  const loader = new GLTFLoader();
  try {
    const [model, sword] = await Promise.all([loader.loadAsync('/models/red-herald-knight-rigged.glb'), loader.loadAsync('/models/player-sword.glb')]);
    return createImportedKnight(model.scene, model.animations, sword.scene);
  } catch (error) {
    $('#model-status').textContent = `Could not load knight: ${error instanceof Error ? error.message : String(error)}`;
    throw error;
  }
})();
const actorRoot = imported?.root ?? knight!.root, legRig = imported?.measurements ?? LEG_RIG;
scene.add(actorRoot);
$('#model-status').textContent = imported ? 'Your knight and two-handed sword · footwork testing' : 'Earlier native knight · comparison';
$<HTMLSelectElement>('#model').value = legacy ? 'legacy' : 'imported';
$('#model').addEventListener('change', event => { location.search = (event.target as HTMLSelectElement).value === 'legacy' ? '?model=legacy' : ''; });
if (imported) {
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, .04).texture; scene.environmentIntensity = .65;
  room.dispose(); pmrem.dispose(); renderer.toneMapping = THREE.ACESFilmicToneMapping;
}
const override = createLowerBodyOverride(); knight?.setLowerBody(override);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.34, 40), new THREE.MeshBasicMaterial({ color: '#59665d', transparent: true, opacity: 0.25, depthWrite: false }));
scene.add(flat(shadow, 0.002));
const skeleton = new THREE.SkeletonHelper(imported?.model ?? knight!.rig.root); skeleton.visible = false; scene.add(skeleton);
(skeleton.material as THREE.LineBasicMaterial).depthTest = false; skeleton.renderOrder = 5;

// Wall the body cannot pass. The clearance keeps the lead toes just short of it.
const WALL_Z = -2.6, CLEARANCE = 0.6;
const obstacles: Obstacle[] = [{ x: 0, z: WALL_Z - 0.12, halfX: 4, halfZ: 0.12 }];
// See-through, so the front view still works from the far side of it.
const wall = new THREE.Mesh(new THREE.BoxGeometry(8, 1.3, 0.24), new THREE.MeshBasicMaterial({ color: '#6f6a58', transparent: true, opacity: 0.28, depthWrite: false }));
wall.add(new THREE.LineSegments(new THREE.EdgesGeometry(wall.geometry), new THREE.LineBasicMaterial({ color: '#5d5848' })));
wall.position.set(0, 0.65, WALL_Z - 0.12); scene.add(wall);
// The game's collision helper tests in sub-steps of half the radius, which is too
// coarse for asking "how far can this step go?", so the query walks 2 cm at a time.
const collide = (from: { x: number; z: number }, delta: { x: number; z: number }) => {
  const parts = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.z) / 0.02));
  let at = { x: from.x, z: from.z };
  for (let i = 0; i < parts; i++) at = moveWithCollision(at, { x: delta.x / parts, z: delta.z / parts }, obstacles, CLEARANCE);
  return { x: at.x - from.x, z: at.z - from.z };
};

// Boot outline in the foot's own frame: heel behind the ankle, toes ahead (−Z).
const bootShape = () => {
  const shape = new THREE.Shape();
  shape.moveTo(-0.05, -0.085); shape.lineTo(0.05, -0.085); shape.lineTo(0.058, 0.16); shape.quadraticCurveTo(0.05, 0.3, 0, 0.305); shape.quadraticCurveTo(-0.05, 0.3, -0.058, 0.16); shape.closePath();
  return shape;
};
/** A flat boot-shaped mesh or outline lying on the floor, pointing along the foot's −Z. */
function boot(material: THREE.Material, outline = false) {
  const group = new THREE.Group();
  const geometry = outline ? new THREE.BufferGeometry().setFromPoints(bootShape().getPoints(10)) : new THREE.ShapeGeometry(bootShape(), 10);
  const mesh = outline ? new THREE.LineLoop(geometry, material) : new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2; group.add(mesh); scene.add(group);
  return group;
}
const COLORS = ['#3d7f8f', '#b0672c'];   // left, right
const homes = [0, 1].map(i => boot(new THREE.LineBasicMaterial({ color: COLORS[i] }), true));
const contacts = [0, 1].map(i => ['heel', 'ball'].map(() => {
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.024, 20), new THREE.MeshBasicMaterial({ color: COLORS[i], transparent: true, depthTest: false }));
  dot.renderOrder = 4; scene.add(flat(dot, 0.004)); return dot;
}));
const prints = Array.from({ length: 18 }, () => ({ mesh: boot(new THREE.MeshBasicMaterial({ color: '#555', transparent: true, opacity: 0, depthWrite: false })), born: -99 }));
let nextPrint = 0;
const PATH = 150;
const paths = [0, 1].map(i => {
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PATH * 3), 3)); geometry.setDrawRange(0, 0);
  const path = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: COLORS[i], depthTest: false })); path.frustumCulled = false; path.renderOrder = 3; scene.add(path);
  return { geometry, points: [] as number[] };
});

const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 80);
const orbit = new OrbitControls(camera, canvas); orbit.enableDamping = true; orbit.target.set(0, 0.62, 0);
const VIEWS: Record<string, [number, number, number]> = { side: [5.4, 0.35, 0], front: [0, 0.5, -5.6], back: [0, 0.9, 5.6], top: [0.001, 6.5, 0.6], quarter: [3.6, 1.2, -3.9] };
function setView(name: string) { const [x, y, z] = VIEWS[name] ?? VIEWS.quarter; camera.position.set(orbit.target.x + x, orbit.target.y + y, orbit.target.z + z); orbit.update(); }
setView('quarter');
const legsPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1);

// ---------------------------------------------------------------- simulation
const events: FootworkEvent[] = [];
const fw = createFootwork({ stance: 'engarde', listener: event => events.push(event) });
const env = { collide: undefined as typeof collide | undefined };
const held = new Set<string>();
let history: FootworkState[] = [fw.snapshot()], cursor = 0, paused = false, speed = 1, clock = 0;
let solution: LowerBodySolution = solveLowerBody(fw.pose(), legRig);
const guardWatch = { active: false, started: 0, from: '', result: '' };
const live = () => cursor === history.length - 1;

function measureGuard() {
  if (!guardWatch.active) return;
  const s = fw.state, wanted = fw.homes();
  const feet = Math.max(...s.feet.map((foot, i) => Math.hypot(foot.x - wanted[i].x, foot.z - wanted[i].z) + foot.lift));
  const hips = Math.hypot(s.hips.x - s.hipsTarget.x, s.hips.y - s.hipsTarget.y, s.hips.z - s.hipsTarget.z);
  if (s.feet[0].planted && s.feet[1].planted && feet < 0.02 && hips < 0.01) {
    guardWatch.active = false;
    guardWatch.result = `${Math.round((s.time - guardWatch.started) * 1000)} ms from ${guardWatch.from}`;
  }
}

function tick() {
  const turn = (held.has('ArrowLeft') ? 1 : 0) - (held.has('ArrowRight') ? 1 : 0);
  if (turn) fw.face(fw.state.root.yaw + turn * 1.6 * TICK * speed);
  fw.setIntent({ x: (held.has('KeyD') ? 1 : 0) - (held.has('KeyA') ? 1 : 0), z: (held.has('KeyS') ? 1 : 0) - (held.has('KeyW') ? 1 : 0) });
  runScript(TICK * speed);
  fw.advance(TICK * speed, env);
  measureGuard();
  history.push(fw.snapshot());
  if (history.length > HISTORY) history.shift();
  cursor = history.length - 1;
}

/** Continue from the moment being looked at: anything after it is dropped. */
function resumeHere() { if (!live()) history.length = cursor + 1; }
function show(index: number) { cursor = Math.max(0, Math.min(history.length - 1, index)); fw.restore(history[cursor]); }
function setPaused(value: boolean) { paused = value; if (!paused) resumeHere(); $('#pause').textContent = paused ? 'Play' : 'Pause'; $('#pause').classList.toggle('on', paused); }
function frame(direction: number) {
  setPaused(true);
  if (direction > 0 && live()) tick(); else show(cursor + direction);
}

function takeGuard(id?: string, lead?: Lead) {
  resumeHere();
  guardWatch.active = true; guardWatch.started = fw.state.time; guardWatch.from = fw.state.move ? fw.state.move.name.toLowerCase() : fw.state.pose === 'lunge' ? 'lunge pose' : 'standing'; guardWatch.result = '…';
  fw.guard(id, { lead });
  rebuildStanceFolder();
}

function act(code: string) {
  if (code.startsWith('Digit')) { const stance = STANCES[Number(code.slice(5)) - 1]; if (stance) takeGuard(stance.id); return; }
  resumeHere();
  switch (code) {
    case 'KeyE': takeGuard(); break;
    case 'KeyQ': takeGuard(undefined, fw.state.lead === 1 ? -1 : 1); break;
    case 'Space': fw.lunge(1); break;
    case 'KeyH': fw.lunge(0.5); break;
    case 'KeyJ': fw.lunge(0); break;
    case 'KeyR': fw.recover(true); break;
    case 'KeyF': fw.recover(false); break;
    case 'KeyT': fw.pass(true); break;
    case 'KeyG': fw.pass(false); break;
    case 'KeyP': setPaused(!paused); break;
    case 'Comma': frame(-1); break;
    case 'Period': frame(1); break;
    case 'KeyX': reset(); break;
  }
}

function reset() {
  script = null; held.clear(); fw.reset(fw.state.stance, fw.state.lead); events.length = 0;
  history = [fw.snapshot()]; cursor = 0; guardWatch.active = false; guardWatch.result = '';
  for (const print of prints) print.born = -99;
  for (const path of paths) path.points.length = 0;
}

// ---------------------------------------------------------------- scripted proof runs
type Cue = [at: number, run: () => void];
const hold = (code: string, from: number, seconds: number): Cue[] => [[from, () => held.add(code)], [from + seconds, () => held.delete(code)]];
const SCRIPTS: Record<string, () => Cue[]> = {
  'Rung 3 · advance and retreat in each guard': () => STANCES.flatMap((stance, i) => {
    const t = i * 5.2, step = stance.step.duration;
    return [[t, () => takeGuard(stance.id)], ...hold('KeyW', t + 0.6, step * 2.6), ...hold('KeyS', t + 0.9 + step * 3.2, step * 2.6)] as Cue[];
  }),
  'Rung 4 · side steps, chained steps, wall': () => [
    [0, () => takeGuard('engarde')], ...hold('KeyD', 0.5, 0.9), ...hold('KeyA', 1.9, 0.9),
    ...hold('KeyW', 3.4, 4.2), ...hold('KeyS', 8.2, 2.2),
  ],
  'Rung 5 · lunges and recoveries': () => [
    [0, () => takeGuard('engarde')], [0.6, () => fw.lunge(1)], [1.7, () => fw.recover(true)], [2.7, () => fw.lunge(0.5)], [3.8, () => fw.recover(false)],
    [4.8, () => fw.lunge(0)], [5.9, () => fw.recover(true)], [6.9, () => fw.lunge(1)], [8, () => fw.recover(false)],
  ],
  'Guard interrupts': () => [
    [0, () => takeGuard('engarde')], ...hold('KeyW', 0.5, 0.2), [0.72, () => takeGuard('low')],
    [1.9, () => fw.lunge(1)], [2.15, () => takeGuard('high')],
    [3.3, () => fw.pass(true)], [3.6, () => takeGuard('engarde')],
    ...hold('KeyS', 4.6, 0.95), [5.55, () => takeGuard('low')],
    [6.7, () => fw.lunge(1)], [7.6, () => takeGuard('engarde')],
    ...hold('KeyD', 8.6, 0.2), [8.78, () => takeGuard('high')],
  ],
};
let script: { cues: Cue[]; time: number; next: number } | null = null;
function runScript(dt: number) {
  if (!script) return;
  script.time += dt;
  while (script.next < script.cues.length && script.cues[script.next][0] <= script.time) script.cues[script.next++][1]();
  if (script.next >= script.cues.length) script = null;
}
function playScript(name: string) {
  reset(); setPaused(false);
  script = { cues: SCRIPTS[name]().sort((a, b) => a[0] - b[0]), time: 0, next: 0 };
}

// ---------------------------------------------------------------- panel wiring
const guards = $('#guards');
STANCES.forEach((stance, i) => {
  const button = document.createElement('button'); button.dataset.act = `Digit${i + 1}`; button.dataset.stance = stance.id;
  button.innerHTML = `<kbd>${i + 1}</kbd> ${stance.name}`; button.title = stance.summary; guards.append(button);
});
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-act]')) button.addEventListener('click', () => { act(button.dataset.act!); button.blur(); });
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-hold]')) {
  const code = button.dataset.hold!;
  button.addEventListener('pointerdown', () => { resumeHere(); held.add(code); });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel']) button.addEventListener(type, () => held.delete(code));
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-view]')) button.addEventListener('click', () => setView(button.dataset.view!));
const HOLDS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowLeft', 'ArrowRight']);
addEventListener('keydown', event => {
  const target = event.target as HTMLElement;
  if (event.metaKey || event.ctrlKey || event.altKey || (target instanceof HTMLInputElement && target.type !== 'range' && target.type !== 'checkbox') || target instanceof HTMLSelectElement) return;
  if (HOLDS.has(event.code)) { if (!held.has(event.code)) resumeHere(); held.add(event.code); event.preventDefault(); return; }
  if (event.code === 'Space') event.preventDefault();
  if (!event.repeat || event.code === 'Comma' || event.code === 'Period') act(event.code);
});
addEventListener('keyup', event => held.delete(event.code));
addEventListener('blur', () => held.clear());

const scriptSelect = $<HTMLSelectElement>('#script');
for (const name of Object.keys(SCRIPTS)) scriptSelect.add(new Option(name, name));
$('#run-script').addEventListener('click', () => playScript(scriptSelect.value));
$('#pause').addEventListener('click', () => setPaused(!paused));
$('#back').addEventListener('click', () => frame(-1));
$('#forward').addEventListener('click', () => frame(1));
const timeline = $<HTMLInputElement>('#timeline');
timeline.addEventListener('input', () => { setPaused(true); show(Number(timeline.value)); });
$<HTMLSelectElement>('#speed').addEventListener('change', event => { speed = Number((event.target as HTMLSelectElement).value); });
const toggles = { follow: $<HTMLInputElement>('#follow'), legs: $<HTMLInputElement>('#legs-only'), skeleton: $<HTMLInputElement>('#skeleton'), markers: $<HTMLInputElement>('#markers'), prints: $<HTMLInputElement>('#prints'), paths: $<HTMLInputElement>('#paths'), wall: $<HTMLInputElement>('#wall') };

// ---------------------------------------------------------------- tuning panel
const gui = new GUI({ container: $('#tuning'), title: 'Tuning' });
const snap = () => { if (!fw.busy) fw.guard(); };
gui.add(TUNING, 'guardTime', 0.04, 0.5, 0.01).name('guard time (s)');
const feel = gui.addFolder('Feel'); feel.close();
feel.add(TUNING, 'glideHalfLife', 0.005, 0.15, 0.005).name('stop glide half-life (s)');
feel.add(TUNING, 'chainFlow', 0, 1, 0.05).name('flow between steps');
feel.add(TUNING, 'hipHalfLife', 0.01, 0.2, 0.005).name('hip smoothing (s)');
feel.add(TUNING, 'hipInertia', 2, 40, 1).name('hip inertia (m/s²)');
feel.add(TUNING, 'rollTime', 0, 0.3, 0.01).name('foot roll-down (s)');
feel.add(TUNING, 'pushTime', 0, 0.2, 0.01).name('heel-raise lead-in (s)');
feel.add(TUNING, 'breath', 0, 0.02, 0.001).name('idle breathing (m)');
feel.add(TUNING, 'autoRecover', 0, 2, 0.05).name('auto recover after (s)');
let stanceFolder: GUI | null = null, shownStance = '';
function rebuildStanceFolder() {
  if (shownStance === fw.state.stance) return;
  shownStance = fw.state.stance; stanceFolder?.destroy();
  const stance = stanceById(shownStance), folder = stanceFolder = gui.addFolder(`Guard shape · ${stance.name}`);
  folder.add(stance, 'hipHeight', 0.55, 0.94, 0.005).name('hip height').onChange(snap);
  folder.add(stance, 'hipForward', -0.15, 0.2, 0.005).name('hips forward').onChange(snap);
  folder.add(stance, 'hipTurn', 0, 70, 1).name('hip turn °').onChange(snap);
  folder.add(stance, 'hipLean', -5, 25, 0.5).name('forward lean °').onChange(snap);
  folder.add(stance.lead, 'forward', 0, 0.6, 0.005).name('lead foot forward').onChange(snap);
  folder.add(stance.lead, 'out', 0, 0.35, 0.005).name('lead foot out').onChange(snap);
  folder.add(stance.lead, 'turnout', -20, 45, 1).name('lead turnout °').onChange(snap);
  folder.add(stance.rear, 'forward', -0.6, 0, 0.005).name('rear foot forward').onChange(snap);
  folder.add(stance.rear, 'out', 0, 0.35, 0.005).name('rear foot out').onChange(snap);
  folder.add(stance.rear, 'turnout', 0, 110, 1).name('rear turnout °').onChange(snap);
  folder.add(stance.step, 'length', 0.1, 0.8, 0.01).name('step length (m)');
  folder.add(stance.step, 'duration', 0.15, 1, 0.01).name('step time (s)');
  folder.add(stance.step, 'side', 0.1, 0.6, 0.01).name('side step (m)');
  folder.add(stance.step, 'sideDuration', 0.15, 1, 0.01).name('side step time (s)');
  folder.add(stance.step, 'lift', 0.01, 0.15, 0.005).name('foot lift (m)');
  folder.add(stance.step, 'weightShift', 0, 0.12, 0.005).name('weight shift (m)');
  folder.add({ copy: () => copyText(JSON.stringify(stance, null, 2)) }, 'copy').name('Copy guard as JSON');
}
const lunge = gui.addFolder('Lunge'); lunge.close();
lunge.add(LUNGE, 'travel', 0.1, 0.6, 0.01).name('hip travel (m)');
lunge.add(LUNGE, 'duration', 0.25, 1, 0.01).name('time (s)');
lunge.add(LUNGE, 'landAt', 0.4, 0.95, 0.01).name('lead foot lands at');
lunge.add(LUNGE, 'apex', 0.02, 0.15, 0.005).name('lead foot height (m)');
lunge.add(LUNGE, 'toeUp', 0, 35, 1).name('toes up °');
lunge.add(LUNGE, 'hipHeight', 0.5, 0.8, 0.005).name('hip height');
lunge.add(LUNGE, 'leadAhead', 0.25, 0.6, 0.005).name('lead foot ahead of hips');
lunge.add(LUNGE, 'recoverForward', 0.2, 1, 0.01).name('recover forward (s)');
lunge.add(LUNGE, 'recoverBackward', 0.2, 1, 0.01).name('recover back (s)');
lunge.add({ copy: () => copyText(JSON.stringify({ LUNGE, TUNING }, null, 2)) }, 'copy').name('Copy lunge and feel as JSON');
function copyText(text: string) {
  const done = () => { hudNote = 'Copied to the clipboard.'; hudNoteUntil = performance.now() + 2500; };
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => window.prompt('Copy:', text)); else window.prompt('Copy:', text);
}
let hudNote = '', hudNoteUntil = 0;
rebuildStanceFolder();

// ---------------------------------------------------------------- drawing
const world = (x: number, z: number) => {
  const root = fw.state.root, c = Math.cos(root.yaw), s = Math.sin(root.yaw);
  return { x: root.x + c * x + s * z, z: root.z - s * x + c * z };
};
function draw(dt: number) {
  const s = fw.state, pose = fw.pose();
  solution = solveLowerBody(pose, legRig);
  writeOverride(override, solution);
  actorRoot.position.set(s.root.x, 0, s.root.z); actorRoot.rotation.y = s.root.yaw;
  if (imported) imported.update(solution, s.time);
  else if (knight) {
    const carry = carrierOffset(solution);
    knight.carrier.position.set(carry.x, carry.y, carry.z); knight.carrier.rotation.y = carry.yaw;
    knight.animate(0, 0, s.time, dt, undefined, true);
    knight.poseAttack(null, 0, 0);
  }
  shadow.position.set(s.root.x, 0.002, s.root.z);

  const wanted = fw.homes();
  pose.feet.forEach((foot, i) => {
    homes[i].visible = toggles.markers.checked && s.pose === 'guard'; homes[i].position.set(wanted[i].x, 0.003, wanted[i].z); homes[i].rotation.y = wanted[i].yaw;
    const points = contactPoints(foot, legRig);
    ([points.heel, points.ball] as const).forEach((point, j) => {
      const dot = contacts[i][j], at = world(point.x, point.z), down = point.y < 0.004;
      dot.visible = toggles.markers.checked; dot.position.set(at.x, 0.004, at.z);
      (dot.material as THREE.MeshBasicMaterial).opacity = down ? 1 : 0.22; dot.scale.setScalar(down ? 1 : 0.7);
    });
  });
  // Footprints: one for every landing, fading over a few seconds.
  for (const event of events.splice(0)) {
    if (event.type !== 'plant') continue;
    const foot = s.feet[event.foot], print = prints[nextPrint++ % prints.length];
    print.mesh.position.set(foot.x, 0.0025, foot.z); print.mesh.rotation.y = foot.yaw; print.born = s.time;
    ((print.mesh.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(COLORS[event.foot]);
  }
  for (const print of prints) {
    const age = s.time - print.born, material = (print.mesh.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
    material.opacity = toggles.prints.checked && age >= 0 ? Math.max(0, 0.42 * (1 - age / 7)) : 0; print.mesh.visible = material.opacity > 0;
  }
  // Ankle paths over the last few seconds, in world space.
  solution.legs.forEach((leg, i) => {
    const path = paths[i], at = world(leg.ankle.x, leg.ankle.z);
    if (!paused) { path.points.push(at.x, leg.ankle.y, at.z); if (path.points.length > PATH * 3) path.points.splice(0, 3); }
    const attribute = path.geometry.getAttribute('position') as THREE.BufferAttribute;
    (attribute.array as Float32Array).set(path.points); attribute.needsUpdate = true;
    path.geometry.setDrawRange(0, toggles.paths.checked ? path.points.length / 3 : 0);
  });

  wall.visible = toggles.wall.checked; env.collide = toggles.wall.checked ? collide : undefined;
  skeleton.visible = toggles.skeleton.checked;
  legsPlane.constant = solution.pelvisPosition.y + 0.13;
  renderer.clippingPlanes = toggles.legs.checked ? [legsPlane] : [];
  if (toggles.follow.checked) {
    const dx = s.root.x - orbit.target.x, dz = s.root.z - orbit.target.z, ease = 1 - Math.exp(-8 * dt);
    orbit.target.x += dx * ease; orbit.target.z += dz * ease; camera.position.x += dx * ease; camera.position.z += dz * ease;
  }
  orbit.update();
  renderer.render(scene, camera);
  drawHud();
}

function drawHud() {
  const s = fw.state, move = s.move, stance = stanceById(s.stance);
  const speedNow = Math.hypot(s.rootVelX, s.rootVelZ);
  const foot = (i: number) => s.feet[i].planted ? (Math.abs(s.feet[i].pitch) > 0.01 ? (s.feet[i].pitch > 0 ? 'on heel' : 'on ball') : 'planted') : `in air ${(s.feet[i].lift * 100).toFixed(0)} cm`;
  const cap = stance.step.length / stance.step.duration;
  const lines = [
    `<b>Guard</b>   ${stance.name} · ${s.lead === 1 ? 'right' : 'left'} foot leads${s.pose === 'lunge' ? ' · IN LUNGE' : ''}`,
    `<b>Move</b>    ${move ? `${move.name}  ${Math.round(move.t / move.duration * 100)}%${move.blocked ? '  (shortened by wall)' : ''}` : '—'}`,
    `<b>Feet</b>    L ${foot(0).padEnd(13)} R ${foot(1)}`,
    `<b>Speed</b>   ${speedNow.toFixed(2)} m/s   guard pace ${cap.toFixed(2)} m/s`,
    `<b>Hips</b>    ${solution.pelvisPosition.y.toFixed(3)} m   knee/toes L ${solution.legs[0].kneeToToes.toFixed(0)}° R ${solution.legs[1].kneeToToes.toFixed(0)}°   leg L ${(solution.legs[0].extension * 100).toFixed(0)}% R ${(solution.legs[1].extension * 100).toFixed(0)}%`,
    `<b>Last</b>    ${s.last ? `${s.last.name}: ${s.last.travelled.toFixed(2)} m in ${s.last.duration.toFixed(2)} s, peak ${s.last.peakSpeed.toFixed(2)} m/s${s.last.blocked ? ' (wall)' : ''}` : '—'}`,
    `<b>Guard formed in</b> ${guardWatch.result || '—'}`,
  ];
  if (hudNote && performance.now() < hudNoteUntil) lines.push(hudNote);
  $('#hud').innerHTML = lines.join('\n');
  timeline.max = String(history.length - 1); timeline.value = String(cursor);
  $('#clock').textContent = `${s.time.toFixed(2)} s${paused ? live() ? ' · paused' : ' · replay' : ''}`;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-stance]')) button.classList.toggle('on', button.dataset.stance === s.stance);
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-hold]')) button.classList.toggle('on', held.has(button.dataset.hold!));
  rebuildStanceFolder();
}

function resize() {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * renderer.getPixelRatio()) || canvas.height !== Math.round(height * renderer.getPixelRatio())) {
    renderer.setSize(width, height, false); camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix();
  }
}

let previous = performance.now(), owed = 0;
function loop(now: number) {
  const elapsed = Math.min(0.1, (now - previous) / 1000); previous = now;
  if (!paused) { owed += elapsed; while (owed >= TICK) { tick(); owed -= TICK; } } else owed = 0;
  clock += elapsed;
  resize(); draw(elapsed);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// For automated checks and screenshots: drive the bench without real time.
Object.defineProperty(window, '__footwork', { configurable: true, value: {
  fw, act, held, setView, playScript, setPaused, reset, show, legRig,
  /** Run n ticks immediately and redraw. */
  run(n: number) { setPaused(true); resumeHere(); for (let i = 0; i < n; i++) tick(); draw(0); },
  toggle(name: keyof typeof toggles, value: boolean) { toggles[name].checked = value; draw(0); },
  frame() { draw(0); },
  /** Centre the camera on the knight, from a named view. */
  focus(view: string) { orbit.target.set(fw.state.root.x, 0.62, fw.state.root.z); setView(view); draw(0); },
  get info() { return { time: fw.state.time, clock, stance: fw.state.stance, move: fw.state.move?.name ?? null, root: { ...fw.state.root }, history: history.length, cursor, guard: guardWatch.result, bones: imported?.bones.length ?? knight!.rig.bones.length, model: imported ? 'imported' : 'legacy', adapter: imported?.metrics ?? null }; },
} });
