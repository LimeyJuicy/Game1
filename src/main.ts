import * as THREE from 'three';
import './style.css';
import { startCharacterStudy } from './study.ts';
import { Input } from './input.ts';
import { movementVector, moveWithCollision, sprintAllowed, stepLocomotion, stepStrafe, faceTarget } from './movement.ts';
import { createWorld } from './world.ts';
import { createKnight } from './knight.ts';
import { createPlayerFootwork } from './footwork/game.ts';
import { FollowCamera } from './camera.ts';
import { SwordActions, smooth, sweptBladeHits, lungeBudget } from './combat.ts';
import { createDummy } from './dummy.ts';
import type { AttackKind } from './combat.ts';
import { PlayerDefense } from './defense.ts';
import { createTrainer } from './trainer.ts';
import type { Drill } from './trainer.ts';
import { createBlockSparks, createGuardBreakEffect } from './effects.ts';
import { GROUP_SPAWNS, LooseSurround, ImpactFreeze, wantsRetreat } from './encounter.ts';
import { RiposteDash } from './riposte.ts';
import type { AttackDefinition } from './combat.ts';
import { PerfectDefense } from './perfect.ts';
import { CombatFocus, AttackCoordinator } from './targeting.ts';
import { FINISHER, FINISHERS, FinisherAction, selectFinisher } from './finisher.ts';
import type { ExecutionPlan } from './finisher.ts';
import { createDebris } from './debris.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const overlay = document.querySelector<HTMLElement>('#overlay')!;
const title = document.querySelector<HTMLElement>('#overlay-title')!;
const copy = document.querySelector<HTMLElement>('#overlay-copy')!;
const resume = document.querySelector<HTMLButtonElement>('#resume')!;
const status = document.querySelector<HTMLElement>('#movement-status')!;
const dummyHealth = document.querySelector<HTMLElement>('#dummy-health')!;
const dummyReadout = document.querySelector<HTMLElement>('#dummy-readout')!;
const playerHealth = document.querySelector<HTMLElement>('#player-health')!;
const playerGuard = document.querySelector<HTMLElement>('#player-guard')!;
const playerReadout = document.querySelector<HTMLElement>('#player-readout')!;
const drillButton = document.querySelector<HTMLButtonElement>('#drill-toggle')!;
const drillPattern = document.querySelector<HTMLSelectElement>('#drill-pattern')!;
const drillBearing = document.querySelector<HTMLSelectElement>('#drill-bearing')!;
const drillCount = document.querySelector<HTMLSelectElement>('#drill-count')!;
const threatHud = document.querySelector<HTMLElement>('#threats')!;
const feedback = document.querySelector<HTMLElement>('#feedback')!;

function start() {
  const lowQuality = new URLSearchParams(location.search).get('quality') === 'low';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(lowQuality ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = !lowQuality;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#8e9e97');
  scene.fog = new THREE.Fog('#8e9e97', 25, 65);
  scene.add(new THREE.HemisphereLight('#d8e0d9', '#3b463a', 2.5));
  const sun = new THREE.DirectionalLight('#f2e6c9', 2.7);
  sun.position.set(-12, 20, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -27, right: 27, top: 27, bottom: -27, far: 65 });
  sun.shadow.normalBias = 0.04; scene.add(sun);
  const { obstacles, occluders } = createWorld(scene);
  const dummy = createDummy(scene);
  obstacles.push(dummy.obstacle);
  const knight = createKnight(); scene.add(knight.root);
  knight.root.position.set(-3, 0, 5);
  // Experimental, off by default: ?footwork lets the AT-007 footwork system drive the
  // player's legs while engaged. Without the flag nothing below changes behaviour.
  const footwork = new URLSearchParams(location.search).has('footwork') ? createPlayerFootwork(knight) : null;
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 110);
  const input = new Input(canvas);
  const followCamera = new FollowCamera(camera, occluders);
  const actions = new SwordActions();
  const defense = new PlayerDefense();
  const perfect = new PerfectDefense();
  const impact = new ImpactFreeze();
  const dash = new RiposteDash();
  const finisher = new FinisherAction();
  const debris = createDebris(scene);
  const finisherPreference = document.querySelector<HTMLSelectElement>('#finisher-variant')!;
  let finisherCursor = 0;
  const executionEvents: { type: string; target: string; time: number }[] = [];
  let eligibleFinisher: ExecutionPlan | null = null, finisherSerial = 100000;
  let cinematicBlend = 0;
  const finisherHint = document.querySelector<HTMLElement>('#finisher-hint')!;
  const surround = new LooseSurround();
  const breakEffect = createGuardBreakEffect(scene);
  let retreating = false, retreatPivot = false, approachAttacker: string | null = null, lastCommit = -Infinity;
  let evasionSource: string | null = null;
  let dodgeOrigin: THREE.Vector3 | null = null;
  let riposteSource: string | null = null;
  const trainer = createTrainer(scene);
  const opponents = [
    { id: 'trainer', fighter: trainer },
    { id: 'trainer-2', fighter: createTrainer(scene) },
    { id: 'trainer-3', fighter: createTrainer(scene) },
  ];
  const targeting = new CombatFocus();
  const coordinator = new AttackCoordinator();
  const fighterFor = (id: string | null) => opponents.find(opponent => opponent.id === id)?.fighter;
  const targetIds = [...opponents.map(opponent => opponent.id), 'dummy'];
  const threatMarkers = new Map(opponents.map(({ id }) => {
    const marker = document.createElement('div'); marker.className = 'threat-marker'; marker.textContent = '✦'; marker.hidden = true;
    threatHud.append(marker); return [id, marker] as const;
  }));
  const sparks = createBlockSparks(scene);
  let feedbackUntil = 0;
  const sightRay = new THREE.Raycaster();
  let initializedAttack = 0;
  let attackStartYaw = 0;
  let attackYaw = 0;
  let attackLunge = 0;
  const hitTargets = new Set<string>();
  let attackTarget: string | null = null;
  let attackFocus = false;
  let focus: string | null = null;
  let wasFocused = false;
  let strafeVelocity = { x: 0, z: 0 };
  let brakingYaw = 0;
  const focusRing = new THREE.Mesh(new THREE.RingGeometry(0.63, 0.68, 48), new THREE.MeshBasicMaterial({ color: '#e8d59d', side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
  focusRing.rotation.x = -Math.PI / 2; focusRing.visible = false; scene.add(focusRing);
  let inputYaw = 0;
  let previousInput = '';
  let moving = false;
  let locomotion = { speed: 0, yaw: 0, turnVelocity: 0 };
  let actualSpeed = 0;
  let pendingAttack: { kind: AttackKind; aim: { x: number; z: number } } | null = null;
  let paused = true;
  let accumulator = 0;
  let previous = performance.now();
  let gameTime = 0;
  let distance = 0;
  let engaged = false;
  let fpsTime = 0;
  let fpsFrames = 0;
  let fps = 0;
  const debug = new URLSearchParams(location.search).has('debug');
  const fixedStep = 1 / 60;
  const targetPosition = (id = focus) => id === 'dummy' && dummy.health > 0 ? dummy.root.position : fighterFor(id)?.alive ? fighterFor(id)!.root.position : null;
  const snapshot = (fighter: typeof trainer) => ({ enabled: fighter.enabled, kind: fighter.kind, elapsed: fighter.elapsed, cue: fighter.cueVisible, x: fighter.root.position.x, z: fighter.root.position.z, facing: fighter.root.rotation.y, health: fighter.health, guard: fighter.guard, guarding: fighter.guarding, reaction: fighter.reaction, stage: fighter.stage, attackName: fighter.attackName, delivery: fighter.delivery, windup: fighter.windup, capabilities: fighter.capabilities });

  if (debug) Object.defineProperty(window, '__prototype', { configurable: true, get: () => ({
    position: { x: knight.root.position.x, z: knight.root.position.z },
    camera: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    cameraYaw: followCamera.yaw,
    facing: knight.root.rotation.y,
    speed: locomotion.speed,
    actualSpeed,
    turnVelocity: locomotion.turnVelocity,
    attack: actions.current ? { name: actions.current.name, kind: actions.current.kind, elapsed: actions.elapsed, phase: actions.phase, chain: actions.chain, style: actions.current.style, bufferOpen: actions.bufferOpen } : null,
    attackSerial: actions.serial,
    attackBraking: !!pendingAttack,
    dummy: { health: dummy.health, hits: dummy.hits, x: dummy.root.position.x, z: dummy.root.position.z },
    defense: { health: defense.health, guard: defense.guard, mode: defense.mode, elapsed: defense.elapsed, blocking: defense.blocking, parryLeft: defense.parryLeft, evading: defense.evading },
    trainer: snapshot(trainer),
    opponents: opponents.map(({ id, fighter }) => ({ id, ...snapshot(fighter) })),
    attackTarget, riposteSource, retreating,
    dash: { active: dash.active, source: dash.source },
    footwork: footwork?.debug ?? null,
    finisher: { active: finisher.active, source: finisher.plan?.id ?? null, variant: finisher.plan?.definition.id ?? null, elapsed: finisher.elapsed, duration: finisher.plan?.definition.duration ?? FINISHER.duration, phase: finisher.active ? finisher.phase : null, lethalApplied: finisher.lethalApplied, available: eligibleFinisher?.id ?? null, availableVariant: eligibleFinisher?.definition.id ?? null, events: executionEvents },
    debris: debris.snapshot,
    impact: { active: impact.active, remaining: impact.remaining, count: impact.count },
    perfect: { slow: perfect.slow, slowLeft: perfect.slowLeft, ready: perfect.ready, windowLeft: perfect.windowLeft, source: perfect.source, kind: perfect.kind, count: perfect.count },
    focus,
    paused, engaged, gameTime,
  }) });

  function setPaused(value: boolean) {
    paused = value; input.enabled = !value; input.clear(); accumulator = 0; previous = performance.now();
    if (value) { locomotion.speed = 0; locomotion.turnVelocity = 0; strafeVelocity = { x: 0, z: 0 }; actualSpeed = 0; moving = false; previousInput = ''; actions.clearBuffer(); pendingAttack = null; defense.release(); }
    overlay.hidden = !value;
    if (value) {
      title.textContent = 'Take a breath';
      copy.textContent = 'The courtyard is paused. Resume to continue movement and sword practice.';
      resume.textContent = 'Resume'; status.textContent = 'Paused'; resume.focus();
    } else canvas.focus();
  }
  function resetPractice() {
    finisherCursor = 0;
    resetRevisionState(); defense.reset(); perfect.reset(); input.setLocked(false); dodgeOrigin = null; actions.cancel(true); pendingAttack = null;
    locomotion = { speed: 0, yaw: 0, turnVelocity: 0 }; actualSpeed = 0; focus = null; engaged = false; strafeVelocity = { x: 0, z: 0 };
    knight.root.position.set(-3, 0, 5); knight.root.rotation.y = 0; footwork?.release();
    configureOpponents(trainer.enabled);
    updateCamera(0, true);
  }
  resume.addEventListener('click', () => { breakEffect.unlock(); if (defense.health <= 0) resetPractice(); setPaused(false); });
  window.addEventListener('keydown', event => {
    if (event.code === 'Escape' && !event.repeat) { event.preventDefault(); if (defense.health > 0) setPaused(!paused); }
  });
  window.addEventListener('blur', () => { if (!paused) setPaused(true); });
  canvas.addEventListener('blur', event => {
    // Keep the practice panel clickable: opening the pause overlay on mousedown
    // would cover its button before the subsequent click can reach it.
    if (event.relatedTarget instanceof Element && event.relatedTarget.closest('.training')) return;
    if (!paused) setPaused(true);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && !paused) setPaused(true); });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); setPaused(true); title.textContent = 'Graphics interrupted';
    copy.textContent = 'The browser lost its graphics context. Reload to restart the prototype.';
    resume.textContent = 'Reload'; resume.onclick = () => location.reload();
  });

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();

  function resetRevisionState() {
    for (const { fighter } of opponents) { fighter.holdForCounter(false); fighter.holdForFinisher(false); }
    finisher.reset(); eligibleFinisher = null; finisherHint.hidden = true; cinematicBlend = 0;
    executionEvents.length = 0; debris.reset();
    dash.reset(); impact.reset(); breakEffect.reset(); surround.reset();
    retreating = false; retreatPivot = false; approachAttacker = null; lastCommit = -Infinity; evasionSource = null;
  }

  function configureOpponents(enabled: boolean) {
    targeting.reset(); coordinator.reset(); attackTarget = null; riposteSource = null;
    for (const [index, { fighter }] of opponents.entries()) {
      fighter.configure(enabled && index < Number(drillCount.value), drillPattern.value as Drill,
        Number(drillBearing.value) + (Number(drillCount.value) > 1 ? GROUP_SPAWNS[index].angle : 0), knight.root.position, index, Number(drillCount.value) > 1 ? GROUP_SPAWNS[index].distance : 1.95);
    }
    focus = null;
    targeting.update(knight.root.position, opponents.filter(({ fighter }) => fighter.alive).map(({ id, fighter }) => ({ id, x: fighter.root.position.x, z: fighter.root.position.z })));
    focus = targeting.current;
  }

  function configureDrill(enabled: boolean) {
    resetRevisionState(); defense.reset(); perfect.reset(); input.setLocked(false); dodgeOrigin = null; actions.cancel(true); pendingAttack = null;
    locomotion.speed = 0; locomotion.turnVelocity = 0; strafeVelocity = { x: 0, z: 0 }; focus = null;
    if (enabled) {
      const occupied = [...obstacles];
      for (let index = 0; index < Number(drillCount.value); index++) {
        const angle = THREE.MathUtils.degToRad(Number(drillBearing.value) + (Number(drillCount.value) > 1 ? GROUP_SPAWNS[index].angle : 0));
        const start = { x: knight.root.position.x, z: knight.root.position.z };
        const radius = Number(drillCount.value) > 1 ? GROUP_SPAWNS[index].distance : 1.95;
        const desired = { x: Math.sin(angle) * radius, z: -Math.cos(angle) * radius };
        const endpoint = moveWithCollision(start, desired, occupied, 0.4);
        if (Math.hypot(endpoint.x - start.x - desired.x, endpoint.z - start.z - desired.z) > 0.05) {
          feedback.textContent = 'Move into open space for this approach'; feedbackUntil = gameTime + 2;
          setPaused(false); return;
        }
        occupied.push({ x: endpoint.x, z: endpoint.z, halfX: 0.35, halfZ: 0.35 });
      }
    }
    configureOpponents(enabled);
    drillButton.textContent = enabled ? 'Stop defense drill' : 'Start defense drill';
    setPaused(false);
  }
  drillButton.addEventListener('click', () => { breakEffect.unlock(); configureDrill(!trainer.enabled); });
  for (const select of [drillPattern, drillBearing, drillCount]) select.addEventListener('change', () => configureDrill(trainer.enabled));
  finisherPreference.addEventListener('change', () => { if (!paused) canvas.focus(); });

  function updateCamera(dt: number, snap = false) {
    cinematicBlend = THREE.MathUtils.lerp(cinematicBlend, finisher.active ? 1 : 0, snap ? 1 : 1 - Math.exp(-5 * dt));
    const executionTarget = fighterFor(finisher.plan?.id ?? null)?.root.position;
    followCamera.update(knight.root.position, knight.root.rotation.y, moving, engaged, dt, snap, { distance, speed: actualSpeed }, executionTarget ?? targetPosition(), opponents.filter(({ fighter }) => fighter.alive && fighter.root.position.distanceTo(knight.root.position) < 7).map(({ fighter }) => fighter.root.position), cinematicBlend);
    updateThreatWarnings();
    const target = targetPosition(); focusRing.visible = !!target;
    if (target) { focusRing.position.copy(target); focusRing.position.y = 0.035; }
    if (eligibleFinisher) {
      const point = new THREE.Vector3(eligibleFinisher.victim.x, 2.15, eligibleFinisher.victim.z).project(camera);
      finisherHint.style.left = `${THREE.MathUtils.clamp((point.x + 1) * window.innerWidth / 2, 90, window.innerWidth - 90)}px`;
      finisherHint.style.top = `${THREE.MathUtils.clamp((1 - point.y) * window.innerHeight / 2, 60, window.innerHeight - 100)}px`;
    }
  }

  function updateThreatWarnings() {
    camera.updateMatrixWorld();
    for (const { id, fighter } of opponents) {
      const marker = threatMarkers.get(id)!;
      marker.hidden = true;
      if (!fighter.alive || !fighter.cueVisible) continue;
      const point = fighter.root.position.clone(); point.y = 2.45;
      const projected = point.clone().project(camera);
      const view = point.applyMatrix4(camera.matrixWorldInverse);
      if (view.z < 0 && Math.abs(projected.x) < 0.88 && Math.abs(projected.y) < 0.8 && projected.z < 1) continue;
      const dx = view.x, dy = -view.y;
      const angle = Math.abs(dx) + Math.abs(dy) < 0.01 ? Math.PI / 2 : Math.atan2(dy, dx);
      const halfWidth = Math.max(40, window.innerWidth / 2 - 55), halfHeight = Math.max(40, window.innerHeight / 2 - 90);
      const scale = Math.min(halfWidth / Math.max(0.001, Math.abs(Math.cos(angle))), halfHeight / Math.max(0.001, Math.abs(Math.sin(angle))));
      marker.style.left = `${window.innerWidth / 2 + Math.cos(angle) * scale}px`;
      marker.style.top = `${window.innerHeight / 2 + Math.sin(angle) * scale}px`;
      marker.style.setProperty('--direction', `${angle}rad`);
      marker.dataset.kind = fighter.kind === 'unblockable' ? 'red' : 'white';
      marker.setAttribute('aria-label', `${fighter.kind === 'unblockable' ? 'Unblockable' : 'Blockable'} attack outside view`);
      marker.hidden = false;
    }
  }

  function clearSight(target = dummy.root.position) {
    const origin = knight.root.position.clone(); origin.y = 1.2;
    const center = target.clone(); center.y = 1.2;
    const delta = center.sub(origin);
    sightRay.set(origin, delta.clone().normalize()); sightRay.far = delta.length();
    return sightRay.intersectObjects(occluders, false).length === 0;
  }

  function initializeAttack(move: { x: number; z: number }) {
    if (initializedAttack === actions.serial) return;
    initializedAttack = actions.serial;
    knight.poseAttack(actions.current, 0, actions.serial);
    hitTargets.clear();
    attackStartYaw = locomotion.yaw;
    attackYaw = attackStartYaw;
    const aim = Math.hypot(move.x, move.z) ? move : { x: -Math.sin(locomotion.yaw), z: -Math.cos(locomotion.yaw) };
    let selected = focus; let best = -Infinity;
    for (const id of targetIds) {
      if (actions.current?.kind === 'riposte' && id !== riposteSource) continue;
      const candidate = targetPosition(id); if (!candidate) continue;
      const delta = candidate.clone().sub(knight.root.position);
      const range = delta.length();
      const alignment = range ? (aim.x * delta.x + aim.z * delta.z) / range : 1;
      if (range > (actions.current?.kind === 'riposte' ? 2.7 : 3.2) || !clearSight(candidate) || (alignment <= 0.45 && id !== focus && actions.current?.kind !== 'riposte')) continue;
      const score = alignment * 2 - range * 0.12 + (id === focus ? 0.15 : 0);
      if (score > best) { best = score; selected = id; }
    }
    if (actions.current?.kind === 'riposte') selected = riposteSource;
    attackTarget = selected;
    const target = targetPosition(selected);
    attackFocus = !!target && target.distanceTo(knight.root.position) <= (actions.current?.kind === 'riposte' ? 2.7 : 3.2) && clearSight(target);
    attackLunge = attackFocus ? lungeBudget(knight.root.position, target) : 0;
    if (attackFocus) {
      const delta = target!.clone().sub(knight.root.position);
      attackYaw = Math.atan2(-delta.x, -delta.z);
      if (selected) targeting.attack(selected);
      focus = targeting.current;
    }
    // Sprint momentum cannot carry the player through a committed attack.
    locomotion.speed = 0; locomotion.turnVelocity = 0; strafeVelocity = { x: 0, z: 0 };
  }

  function applyEnemyHit(id: string, definition: AttackDefinition, center: THREE.Vector3) {
    const enemy = fighterFor(id)!; const before = enemy.guard;
    const result = enemy.receiveAttack(definition);
    const contact = center.clone().lerp(knight.root.position.clone().setY(1.2), 0.35);
    if (result === 'block') sparks.emit(contact, false);
    if (before > 0 && enemy.guard === 0 && impact.trigger()) {
      sparks.emit(contact, true); breakEffect.emit(contact);
      input.setLocked(true); actions.clearBuffer(); pendingAttack = null;
    }
    feedback.textContent = result === 'block' ? 'ENEMY BLOCKED' : enemy.guard === 0 && before > 0 ? 'DEFENSE BROKEN' : definition.kind === 'heavy' ? 'ENEMY STAGGERED' : 'ENEMY HIT';
    feedbackUntil = gameTime + 0.6;
  }

  function sampleSwordHit(start: number, end: number) {
    const definition = actions.current!;
    if (definition.kind === 'riposte') {
      const target = targetPosition(riposteSource);
      const contactTime = definition.preparation + definition.swing * 0.65;
      if (target && riposteSource && !hitTargets.has(riposteSource) && start <= contactTime && end >= contactTime
        && target.distanceTo(knight.root.position) <= 1.7 && clearSight(target)) {
        const center = target.clone().setY(1.2); applyEnemyHit(riposteSource, definition, center);
        hitTargets.add(riposteSource); fighterFor(riposteSource)!.holdForCounter(false);
      }
      return;
    }
    const from = Math.max(start, definition.preparation);
    const to = Math.min(end, definition.preparation + definition.swing);
    if (to <= from) return;
    knight.poseAttack(definition, from, actions.serial);
    let blade = knight.blade();
    const steps = Math.max(1, Math.ceil((to - from) / (1 / 120)));
    for (let i = 1; i <= steps; i++) {
      knight.poseAttack(definition, from + (to - from) * i / steps, actions.serial);
      const next = knight.blade();
      for (const id of targetIds) {
        const target = targetPosition(id); if (!target || hitTargets.has(id)) continue;
        const center = target.clone(); center.y = 1.2;
        if (sweptBladeHits(blade, next, center, id === 'dummy' ? dummy.radius : 0.44) && clearSight(target)) {
          if (id === 'dummy') dummy.damage(definition.damage, gameTime);
          else applyEnemyHit(id, definition, center);
          hitTargets.add(id);
        }
      }
      blade = next;
    }
  }

  function simulate(dt: number) {
    gameTime += dt;
    if (finisher.active) { simulateFinisher(dt); return; }
    const shift = input.down('ShiftLeft') || input.down('ShiftRight');
    const retreatIntent = movementVector(Number(input.down('KeyD')) - Number(input.down('KeyA')), Number(input.down('KeyW')) - Number(input.down('KeyS')), focus ? followCamera.yaw : inputYaw);
    if (retreating && (!shift || Math.hypot(retreatIntent.x, retreatIntent.z) < 0.1 || input.down('KeyJ') || input.down('KeyK') || input.down('KeyE'))) retreating = false;
    if (!retreating && !actions.current && !pendingAttack && !dash.active && !defense.locked && !input.down('KeyE')
      && wantsRetreat(knight.root.position, targetPosition(), retreatIntent, shift)) {
      retreating = true; retreatPivot = true; targeting.reset(); focus = null; inputYaw = followCamera.yaw;
      locomotion.speed = 0; locomotion.turnVelocity = 0; strafeVelocity = { x: 0, z: 0 };
    }
    targeting.current = focus;
    const candidates = opponents.filter(({ fighter }) => fighter.alive).map(({ id, fighter }) => ({
      id, x: fighter.root.position.x, z: fighter.root.position.z,
      threatIn: !dash.active && actions.current?.kind !== 'riposte' && fighter.kind === 'unblockable' && fighter.cueVisible ? Math.max(0, fighter.windup + 0.24 - fighter.elapsed) : undefined,
    }));
    // The passive dummy retains intentional focus but never auto-engages by proximity.
    if (focus === 'dummy' && dummy.health > 0) candidates.push({ id: 'dummy', x: dummy.root.position.x, z: dummy.root.position.z, threatIn: undefined });
    focus = retreating ? null : targeting.update(knight.root.position, candidates);
    if (wasFocused !== !!focus) {
      strafeVelocity = focus ? { x: -Math.sin(locomotion.yaw) * locomotion.speed, z: -Math.cos(locomotion.yaw) * locomotion.speed } : { x: 0, z: 0 };
      wasFocused = !!focus; previousInput = '';
    }
    engaged = !!focus || !!actions.current;
    const sprinting = !pendingAttack && sprintAllowed(engaged) && (input.down('ShiftLeft') || input.down('ShiftRight'));
    const horizontal = Number(input.down('KeyD')) - Number(input.down('KeyA'));
    const forward = Number(input.down('KeyW')) - Number(input.down('KeyS'));
    const signature = `${horizontal},${forward}`;
    // Latch the movement basis until the input changes. Otherwise auto-following
    // the player would steer held A/D into a perpetual circle.
    if (signature !== previousInput) { inputYaw = followCamera.yaw; previousInput = signature; }
    const move = movementVector(horizontal, forward, focus ? followCamera.yaw : inputYaw);
    const parry = input.consumePress('KeyE');
    const dodge = input.consumePress('Space');
    const heavy = input.consumePress('KeyK');
    const light = input.consumePress('KeyJ');
    const execution = input.consumePress('KeyF');
    eligibleFinisher = findFinisher();
    if (execution && eligibleFinisher && finisher.begin(eligibleFinisher)) {
      finisherCursor = (FINISHERS.findIndex(def => def.id === finisher.plan!.definition.id) + 1) % FINISHERS.length;
      surround.reset();
      actions.cancel(); actions.clearBuffer(); pendingAttack = null;
      defense.release(); defense.activity(); perfect.reset(); dash.reset(); impact.reset();
      for (const { fighter } of opponents) { fighter.holdForCounter(false); fighter.holdForFinisher(true); }
      focus = finisher.plan!.id; targeting.reset(); targeting.attack(focus);
      approachAttacker = null; retreating = false; retreatPivot = false;
      locomotion.speed = 0; locomotion.turnVelocity = 0; strafeVelocity = { x: 0, z: 0 };
      moving = false; actualSpeed = 0; finisherSerial += 2;
      input.setLocked(true); eligibleFinisher = null; finisherHint.hidden = true;
      simulateFinisher(dt); return;
    }
    const riposteRequested = light && perfect.ready && !!fighterFor(perfect.source)?.alive && defense.canRiposte && !actions.current && !pendingAttack;
    let riposteStarted = false;
    if (riposteRequested) {
      const source = perfect.source!, enemy = fighterFor(source)!;
      const routeObstacles = [...obstacles, ...opponents.filter(other => other.id !== source && other.fighter.alive).map(other => other.fighter.obstacle)];
      if (dash.begin(source, knight.root.position, enemy.root.position, routeObstacles)) {
        riposteSource = perfect.consume(); defense.finishForRiposte(); input.suppressUntilRelease('KeyE');
        hitTargets.clear(); enemy.holdForCounter(true); focus = riposteSource; targeting.attack(source); dodgeOrigin = null;
        retreating = false; riposteStarted = true; input.setLocked(true);
        locomotion.speed = 0; strafeVelocity = { x: 0, z: 0 };
      } else { feedback.textContent = 'COUNTER ROUTE BLOCKED'; feedbackUntil = gameTime + 0.5; }
    }
    const canDefend = actions.canDefend && !dash.active && actions.current?.kind !== 'riposte';
    if (!riposteStarted && dodge && perfect.ready && perfect.kind === 'dodge') defense.allowFollowupRoll();
    const wasDodging = defense.mode === 'dodge';
    if (!riposteStarted && dodge && defense.dodge(Math.hypot(move.x, move.z) ? move : { x: Math.sin(locomotion.yaw), z: Math.cos(locomotion.yaw) }, canDefend, perfect.ready && perfect.kind === 'dodge')) {
      dodgeOrigin = knight.root.position.clone();
      if (!wasDodging) evasionSource = null;
      perfect.clearWindow();
      actions.cancel(); pendingAttack = null; locomotion.speed = 0; locomotion.turnVelocity = 0;
    }
    // ?footwork only: the guard key interrupts a committed swing as well, so a guard can be taken at any time.
    if (footwork && !riposteStarted && input.down('KeyE') && !defense.locked && !dash.active && actions.current && actions.current.kind !== 'riposte') { actions.cancel(true); pendingAttack = null; }
    if (!riposteStarted && (parry || input.down('KeyE')) && canDefend && !defense.locked) { actions.cancel(); pendingAttack = null; }
    defense.block(!riposteStarted && parry, input.down('KeyE'), !actions.current && !pendingAttack);
    const requested = riposteStarted || riposteRequested || dash.active ? null : heavy ? 'heavy' : light ? 'light' : null;
    if (requested && !pendingAttack && !defense.locked && !defense.blocking && defense.parryLeft <= 0) {
      if (!actions.current && locomotion.speed > 0.1) {
        brakingYaw = focus && Math.hypot(strafeVelocity.x, strafeVelocity.z) > 0.1 ? Math.atan2(-strafeVelocity.x, -strafeVelocity.z) : locomotion.yaw;
        pendingAttack = { kind: requested, aim: { ...move } };
      } else actions.request(requested);
    }
    let attackAim = move;
    if (pendingAttack) {
      // Keep the current travel direction while planting the feet. New inputs
      // cannot steer the slide or queue additional attacks during this transition.
      locomotion.speed = Math.max(0, locomotion.speed - 22 * dt);
      locomotion.turnVelocity = 0;
      if (locomotion.speed <= 0.1) {
        locomotion.speed = 0;
        attackAim = pendingAttack.aim;
        actions.request(pendingAttack.kind);
        pendingAttack = null;
      }
    }
    const before = { x: knight.root.position.x, z: knight.root.position.z };
    let stride = 0;
    let displacement: { x: number; z: number } | null = null;
    if (dash.active) {
      const source = fighterFor(dash.source);
      if (!source?.alive) { source?.holdForCounter(false); dash.reset(); }
      else {
        const routeObstacles = [...obstacles, ...opponents.filter(other => other.id !== dash.source && other.fighter.alive).map(other => other.fighter.obstacle)];
        const next = dash.step(before, dt, routeObstacles);
        displacement = { x: next.x - before.x, z: next.z - before.z };
        locomotion.yaw = faceTarget(locomotion.yaw, knight.root.position, source.root.position, dt * 2);
        if (!dash.active) {
          const position = new THREE.Vector3(next.x, 0, next.z);
          locomotion.yaw = Math.atan2(position.x - source.root.position.x, position.z - source.root.position.z);
          actions.request('riposte');
        }
      }
    } else if (defense.locked) {
      locomotion.speed = 0; locomotion.turnVelocity = 0;
      strafeVelocity = { x: 0, z: 0 };
      displacement = defense.travel(dt);
    } else if (actions.current) {
      initializeAttack(attackAim);
      const definition = actions.current;
      const turn = Math.atan2(Math.sin(attackYaw - attackStartYaw), Math.cos(attackYaw - attackStartYaw));
      locomotion.yaw = attackStartYaw + turn * smooth((actions.elapsed + dt) / definition.preparation);
      const progress = (time: number) => smooth((time - definition.preparation) / definition.swing);
      stride = attackLunge * (progress(actions.elapsed + dt) - progress(actions.elapsed));
    } else {
      if (!pendingAttack && focus) {
        // ?footwork only: engaged pace is what the guard's own steps can cover, not the default 4.2.
        strafeVelocity = stepStrafe(strafeVelocity, move, footwork ? footwork.pace(defense.blocking, move, locomotion.yaw) : defense.blocking ? 1.7 : 4.2, dt);
        locomotion.speed = Math.hypot(strafeVelocity.x, strafeVelocity.z);
        displacement = { x: strafeVelocity.x * dt, z: strafeVelocity.z * dt };
      } else if (!pendingAttack && retreating && retreatPivot) {
        const pivot = stepLocomotion({ ...locomotion, speed: Math.min(locomotion.speed, 2) }, move, false, dt);
        locomotion.yaw = pivot.yaw; locomotion.turnVelocity = pivot.turnVelocity;
        strafeVelocity = stepStrafe(strafeVelocity, move, 3.2, dt);
        locomotion.speed = Math.hypot(strafeVelocity.x, strafeVelocity.z);
        displacement = { x: strafeVelocity.x * dt, z: strafeVelocity.z * dt };
        const desired = Math.atan2(-move.x, -move.z);
        if (Math.abs(Math.atan2(Math.sin(desired - locomotion.yaw), Math.cos(desired - locomotion.yaw))) < 0.65) retreatPivot = false;
      } else if (!pendingAttack) locomotion = stepLocomotion(locomotion, move, sprinting && !defense.blocking, dt);
      if (pendingAttack) displacement = { x: -Math.sin(brakingYaw) * locomotion.speed * dt, z: -Math.cos(brakingYaw) * locomotion.speed * dt };
      if (defense.blocking) locomotion.speed = Math.min(locomotion.speed, 1.7);
      stride = locomotion.speed * dt;
    }
    const collision = [...obstacles, ...opponents.filter(({ fighter }) => fighter.alive).map(({ fighter }) => fighter.obstacle)];
    const after = moveWithCollision(before, displacement ?? { x: -Math.sin(locomotion.yaw) * stride, z: -Math.cos(locomotion.yaw) * stride }, collision);
    knight.root.position.set(after.x, 0, after.z);
    const travel = Math.hypot(after.x - before.x, after.z - before.z);
    moving = !actions.current && !defense.locked && travel > 0.0001;
    actualSpeed = actions.current || defense.locked ? 0 : travel / dt;
    // Impact removes blocked momentum, so the knight doesn't run in place at a wall.
    if (stride > 0 && travel < stride * 0.99) { locomotion.speed *= travel / stride; strafeVelocity.x *= travel / stride; strafeVelocity.z *= travel / stride; }
    if (!actions.current && !defense.locked) distance += travel;
    const face = targetPosition();
    if (face && !actions.current && !defense.locked) locomotion.yaw = faceTarget(locomotion.yaw, knight.root.position, face, dt);
    knight.root.rotation.y = locomotion.yaw;
    const attack = actions.current;
    const legs = footwork ? footwork.update(dt, {
      x: after.x, z: after.z, yaw: locomotion.yaw,
      drive: (!!focus || !!attack || defense.blocking) && !dash.active && !defense.locked && !retreating && attack?.style !== 'backspin',
      blocking: defense.blocking || defense.parryLeft > 0,
      attack: attack ? { serial: actions.serial, elapsed: actions.elapsed + dt, preparation: attack.preparation, swing: attack.swing, recovery: attack.recovery,
        lunge: attackLunge, lungeLeft: attackLunge * (1 - smooth((actions.elapsed + dt - attack.preparation) / attack.swing)) } : null,
    }) : 0;
    // The built-in walk cycle fades out as the footwork legs take over.
    knight.animate(distance, actualSpeed * (1 - legs), gameTime, dt, { x: after.x - before.x, z: after.z - before.z }, engaged || dash.active || defense.blocking || defense.parryLeft > 0 || defense.locked);
    // Hits are tested with the game's own sword placement; the lowered hips only affect what is drawn.
    footwork?.carry(false);
    if (actions.current) sampleSwordHit(actions.elapsed, actions.elapsed + dt);
    footwork?.carry(true);
    knight.poseAttack(actions.current, actions.elapsed + (actions.current ? dt : 0), actions.serial);
    knight.poseDefense(defense, dt, actualSpeed > 0.1);
    const group = Number(drillCount.value) > 1;
    if (approachAttacker && (!fighterFor(approachAttacker)?.alive || !fighterFor(approachAttacker)?.availableToCommit)) approachAttacker = null;
    if (group && !approachAttacker && !dash.active && gameTime - lastCommit >= 0.72) {
      approachAttacker = coordinator.grant(gameTime, opponents.filter(({ fighter }) => fighter.alive).map(({ id, fighter }) => ({
        id, ready: fighter.availableToCommit && fighter.root.position.distanceTo(knight.root.position) < 6,
        active: fighter.committed, red: fighter.kind === 'unblockable',
      })));
    }
    for (const [index, { id, fighter }] of opponents.entries()) {
      const separation = opponents.filter(opponent => opponent.id !== id && opponent.fighter.alive).map(opponent => opponent.fighter.obstacle);
      const goal = dash.active ? { x: fighter.root.position.x, z: fighter.root.position.z }
        : group ? surround.goal(id, index, gameTime, knight.root.position, fighter.root.position,
          opponents.filter(other => other.id !== id && other.fighter.alive).map(other => other.fighter.root.position), obstacles) : null;
      const wasCommitted = fighter.committed;
      fighter.update(dt, gameTime, knight.root.position, camera, [...obstacles, ...separation], (kind, previous, current) => {
        const center = knight.root.position.clone(); center.y = 1.2;
        const hit = sweptBladeHits(previous, current, center, 0.44);
        const beforeDodge = dodgeOrigin?.clone(); if (beforeDodge) beforeDodge.y = 1.2;
        const avoidedOriginal = defense.evading && !!beforeDodge && (
          sweptBladeHits(previous, current, beforeDodge, 0.44) || (hit && fighter.threatensSoon(beforeDodge, 0.44))
        );
        if (!hit && !avoidedOriginal) return false;
        const origin = fighter.root.position.clone(); origin.y = 1.2;
        const delta = center.clone().sub(origin);
        sightRay.set(origin, delta.clone().normalize()); sightRay.far = delta.length();
        if (sightRay.intersectObjects(occluders, false).length) return false;
        let result = !hit && avoidedOriginal ? (defense.perfectDodge ? 'perfect-dodge' : 'evade') : dash.active || (actions.current?.kind === 'riposte' && !hitTargets.has(riposteSource!)) ? 'protected' : defense.receive(kind, fighter.delivery);
        if (result === 'hit' && fighter.delivery === 'kick') defense.knockBackFrom(fighter.root.position, knight.root.position);
        // Moving into an otherwise harmless strike is an ordinary evade, not an
        // earned perfect dodge. Its path must also threaten the pre-dodge position.
        if (result === 'perfect-dodge' && !avoidedOriginal) result = 'evade';
        if ((result === 'evade' || result === 'perfect-dodge') && !evasionSource) {
          evasionSource = id; retreating = false; targeting.defend(id); focus = targeting.current;
        }
        if (result === 'perfect-parry' || result === 'perfect-dodge') {
          if (perfect.trigger(id, result === 'perfect-parry' ? 'parry' : 'dodge')) {
            input.setLocked(true); actions.clearBuffer(); pendingAttack = null;
            locomotion.speed = 0; strafeVelocity = { x: 0, z: 0 }; focus = id;
          }
        }
        if (result === 'block' || result === 'parry' || result === 'perfect-parry') {
          const facing = fighter.root.position.clone().sub(knight.root.position);
          retreating = false; targeting.defend(id); focus = targeting.current;
          locomotion.yaw = Math.atan2(-facing.x, -facing.z); knight.root.rotation.y = locomotion.yaw;
          sparks.emit(center.clone().addScaledVector(facing.normalize(), 0.35), result !== 'block');
        }
        if (result === 'hit' || result === 'guard-break') {
          retreating = false;
          actions.cancel(true); pendingAttack = null; locomotion.speed = 0; locomotion.turnVelocity = 0;
          perfect.clearWindow();
        }
        if (result !== 'protected') {
          feedback.textContent = result === 'guard-break' ? 'GUARD BROKEN' : result.replace('-', ' ').toUpperCase(); feedbackUntil = gameTime + 0.7;
          feedback.dataset.kind = result;
        }
        return result;
      }, !group || (!dash.active && approachAttacker === id), goal);
      if (!wasCommitted && fighter.committed) { lastCommit = gameTime; if (approachAttacker === id) approachAttacker = null; }
    }
    const actionLabel = dash.active ? 'Dashing riposte' : retreating ? 'Retreat sprint' : defense.locked ? defense.mode : defense.parryLeft > 0 ? 'Parrying' : defense.blocking ? 'Blocking' : actions.current ? `${actions.current.name} · ${actions.phase}` : pendingAttack ? 'Planting stance' : moving ? sprinting ? 'Sprinting' : 'Moving' : 'At rest';
    status.textContent = `${actionLabel}${debug ? ` · ${fps} FPS` : ''}`;
    actions.advance(dt);
    if (!actions.current && !dash.active && dash.source) { fighterFor(dash.source)?.holdForCounter(false); dash.reset(); }
    defense.advance(dt, !!actions.current || !!pendingAttack);
    perfect.advanceGame(dt);
    if (perfect.source && !fighterFor(perfect.source)?.alive && !perfect.slow) perfect.clearWindow();
    dummy.update(dt, gameTime);
    sparks.update(dt);
    debris.update(dt, obstacles);
    updateReadouts(group);
    input.endStep();
  }

  function findFinisher() {
    if (defense.health <= 0 || defense.locked || defense.blocking || defense.parryLeft > 0 || !actions.canDefend || pendingAttack || dash.active || perfect.slow || impact.active) return null;
    return selectFinisher(knight.root.position, opponents.map(({ id, fighter }) => ({ id, x: fighter.root.position.x, z: fighter.root.position.z, alive: fighter.alive, health: fighter.health, broken: fighter.reaction === 'guard-break', capabilities: fighter.capabilities })), focus, obstacles,
      { start: finisherCursor, preferred: FINISHERS.find(def => def.id === finisherPreference.value)?.id });
  }

  function releaseFinisher() {
    for (const { fighter } of opponents) fighter.holdForFinisher(false);
    finisher.reset(); coordinator.reset(); surround.reset(); approachAttacker = null; lastCommit = gameTime;
    input.setLocked(false); defense.activity();
    // Camera eases back on subsequent frames; no snap to the old view.
  }

  function simulateFinisher(dt: number) {
    footwork?.release();
    const plan = finisher.plan!;
    const victim = fighterFor(plan.id);
    const result = finisher.advance(dt, !!victim?.alive, defense.health > 0);
    if (result.cancelled) {
      releaseFinisher(); updateReadouts(Number(drillCount.value) > 1); input.endStep(); return;
    }
    const positions = finisher.positions()!;
    knight.root.position.set(positions.player.x, 0, positions.player.z);
    locomotion.yaw = faceTarget(locomotion.yaw, knight.root.position, new THREE.Vector3(plan.victim.x, 0, plan.victim.z), dt * 1.5);
    knight.root.rotation.y = locomotion.yaw;
    knight.poseFinisher(finisher.elapsed, false, finisherSerial, plan.definition);
    victim!.root.position.set(positions.victim.x, 0, positions.victim.z);
    victim!.root.rotation.y = faceTarget(victim!.root.rotation.y, victim!.root.position, new THREE.Vector3(plan.player.x, 0, plan.player.z), dt * 1.5);
    victim!.poseFinisher(finisher.elapsed, plan.definition);
    for (const event of result.events) {
      executionEvents.push({ type: event, target: plan.id, time: finisher.elapsed });
      if (executionEvents.length > 24) executionEvents.shift();
      const direction = victim!.root.position.clone().sub(knight.root.position).normalize().multiplyScalar(2);
      if (event === 'drop-weapon') debris.add(victim!.dropWeapon(), direction);
      else if (event === 'sever-head') debris.add(victim!.detach('head'), direction);
      else if (event === 'sever-arm') debris.add(victim!.detach('sword-arm'), direction);
      else { victim!.execute(plan.definition); feedback.textContent = plan.definition.name.toUpperCase(); feedbackUntil = gameTime + .8; }
    }
    for (const [index, { id, fighter }] of opponents.entries()) {
      if (id === plan.id || !fighter.alive) continue;
      const separation = opponents.filter(other => other.id !== id && other.id !== plan.id && other.fighter.alive).map(other => other.fighter.obstacle);
      const blockers = [...obstacles, ...separation, ...finisher.reservation];
      const goal = surround.goal(id, index, gameTime, knight.root.position, fighter.root.position,
        opponents.filter(other => other.id !== id && other.fighter.alive).map(other => other.fighter.root.position), blockers, fighter.root.position);
      fighter.update(dt, gameTime, knight.root.position, camera, blockers, () => 'protected', false, goal);
    }
    defense.activity(); sparks.update(dt); dummy.update(dt, gameTime); debris.update(dt, obstacles);
    status.textContent = `${plan.definition.name} · ${finisher.phase}`;
    if (result.finished) releaseFinisher();
    updateReadouts(Number(drillCount.value) > 1); input.endStep();
  }

  function updateReadouts(group: boolean) {
    eligibleFinisher = finisher.active ? null : findFinisher();
    finisherHint.hidden = !eligibleFinisher;
    finisherHint.textContent = eligibleFinisher ? `F · ${eligibleFinisher.definition.name}` : 'F · Finish opponent';
    finisherHint.dataset.target = eligibleFinisher?.id ?? '';
    dummyHealth.style.width = `${dummy.health}%`;
    dummyReadout.textContent = dummy.health > 0 ? `${dummy.health} / 100 · ${dummy.hits} hits` : 'Resetting…';
    const focusedEnemy = fighterFor(focus);
    const living = opponents.filter(({ fighter }) => fighter.alive).length;
    document.querySelector<HTMLElement>('#enemy-readout')!.textContent = focusedEnemy ? `${group ? `${living} opponents · ` : ''}Health ${focusedEnemy.health} · Defense ${Math.round(focusedEnemy.guard)} · ${focusedEnemy.guarding ? 'guarding' : focusedEnemy.stage}` : trainer.enabled ? `${living} opponents remaining` : 'Opponent inactive';
    document.querySelector<HTMLElement>('.enemy-defense')!.classList.toggle('broken', focusedEnemy?.reaction === 'guard-break');
    document.querySelector<HTMLElement>('#enemy-guard')!.style.width = `${focusedEnemy?.guard ?? 0}%`;
    const riposteHint = document.querySelector<HTMLElement>('#riposte-hint')!;
    riposteHint.hidden = finisher.active || !perfect.ready || !defense.canRiposte || !!actions.current;
    riposteHint.textContent = perfect.kind === 'dodge' ? 'J · Riposte    SPACE · Roll away' : 'J · Riposte';
    playerHealth.style.width = `${defense.health}%`; playerGuard.style.width = `${defense.guard}%`;
    playerReadout.textContent = `Health ${Math.ceil(defense.health)} · Guard ${Math.round(defense.guard)}`;
    feedback.hidden = gameTime > feedbackUntil;
    if (defense.health <= 0 && !paused) {
      setPaused(true); title.textContent = 'Practice over'; copy.textContent = 'Reset your health and guard, then try the drill again. White strikes can be blocked or parried. Red strikes require evasion.'; resume.textContent = 'Try again';
    }
  }

  updateCamera(0, true);
  renderer.setAnimationLoop((now: number) => {
    const elapsedReal = Math.max((now - previous) / 1000, 0);
    const realDelta = Math.min(elapsedReal, 0.1); previous = now;
    fpsTime += realDelta; fpsFrames++;
    if (fpsTime >= 0.5) { fps = Math.round(fpsFrames / fpsTime); fpsTime = 0; fpsFrames = 0; }
    if (!paused) {
      const wasSlow = perfect.slow;
      const playableReal = impact.advanceReal(elapsedReal);
      perfect.advanceReal(playableReal);
      if (wasSlow && !perfect.slow && perfect.kind === 'dodge') defense.allowFollowupRoll();
      input.setLocked(finisher.active || perfect.slow || impact.active || dash.active);
      accumulator += Math.min(playableReal, 0.1) * (wasSlow ? 0.35 : perfect.timeScale);
      while (accumulator >= fixedStep && !impact.active) { simulate(fixedStep); accumulator -= fixedStep; if (impact.active) accumulator = 0; }
      if (playableReal > 0) updateCamera(Math.min(playableReal, 0.1));
      breakEffect.updateReal(elapsedReal, camera);
    }
    document.body.classList.toggle('perfect-emphasis', perfect.slow);
    renderer.render(scene, camera);
  });
}

try { if (new URLSearchParams(location.search).has('study')) startCharacterStudy(canvas); else start(); } catch (error) {
  console.error(error);
  title.textContent = 'Unable to start';
  copy.textContent = 'This prototype needs a browser with WebGL 2 and hardware acceleration enabled. Reload after checking your browser settings.';
  resume.textContent = 'Reload'; resume.onclick = () => location.reload();
}
