import * as THREE from 'three';
import { createKnight } from './knight.ts';
import { LIGHTS, HEAVIES, attackDuration, sweptBladeHits } from './combat.ts';
import type { AttackDefinition, BladeSegment } from './combat.ts';
import { PlayerDefense } from './defense.ts';
import type { StrikeKind, DefenseResult } from './defense.ts';
import { approachPath } from './navigation.ts';
import { moveWithCollision } from './movement.ts';
import type { Obstacle, Point } from './movement.ts';
import { FINISHERS } from './finisher.ts';
import type { FinisherDefinition } from './finisher.ts';

export type Drill = StrikeKind | 'sequence' | 'adaptive';
export const ENEMY_DEFENSE = { lightPressure: 24, chainPressure: 32, heavyPressure: 44, recoveryDelay: 2, recoveryRate: 12, guardUntil: 0.55 };
export type EnemyHit = 'block' | 'guard-break' | 'hit' | 'ignored';
export const ENEMY_KICK = { name: 'Front push kick', standOff: 1.05, recovery: 0.75 };
export function createTrainer(scene: THREE.Scene) {
  const knight = createKnight(); scene.add(knight.root); knight.root.visible = false;
  knight.root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const material = object.material as THREE.MeshToonMaterial;
    if (material.color) {
      const copy = material.clone(); copy.onBeforeCompile = material.onBeforeCompile;
      object.material = copy; copy.color.multiplyScalar(0.65);
    }
  });
  const shape = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4, radius = i % 2 ? 0.055 : 0.24;
    const x = Math.sin(angle) * radius, y = Math.cos(angle) * radius;
    if (!i) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  const material = new THREE.MeshBasicMaterial({ color: 'white', side: THREE.DoubleSide, depthTest: false });
  const cue = new THREE.Mesh(new THREE.ShapeGeometry(shape), material); cue.renderOrder = 10; cue.visible = false; scene.add(cue);
  let enabled = false, pattern: Drill = 'sequence', bearing = 0;
  let elapsed = -0.8, cycle = 0, serial = 10000, resolved = false;
  let kind: StrikeKind = 'normal';
  let lastBlade: BladeSegment | null = null;
  const reaction = new PlayerDefense();
  let walked = 0, approaching = false, path: Point[] = [], repathAt = 0;
  let guardIdle = 0, executed = false;
  let executionDefinition = FINISHERS[0];
  let personality = 0, randomState = 1, variant = 0, preparation = 0.9, rest = 0.85, counterHeld = false, finisherHeld = false;
  const random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
  const kinds: StrikeKind[] = ['normal', 'heavy', 'unblockable'];
  const definition = () => ({ ...(kind === 'normal' ? LIGHTS[variant] : HEAVIES[variant]), name: kind === 'unblockable' ? ENEMY_KICK.name : (kind === 'normal' ? LIGHTS[variant] : HEAVIES[variant]).name, preparation, swing: 0.24, recovery: kind === 'unblockable' ? ENEMY_KICK.recovery : 0.55 });
  function poseStrike(time: number) {
    if (kind === 'unblockable') knight.poseKick(definition(), time, serial);
    else knight.poseAttack(definition(), time, serial);
  }
  const contact = () => kind === 'unblockable' ? knight.kickContact() : knight.blade();
  function select() {
    if (pattern === 'adaptive') {
      const choice = random();
      kind = cycle === 0 ? kinds[personality % 3] : choice < 0.52 ? 'normal' : choice < 0.83 ? 'heavy' : 'unblockable';
      variant = Math.floor(random() * 3); preparation = 0.82 + random() * 0.23; rest = 0.55 + random() * 0.6;
    } else { kind = pattern === 'sequence' ? kinds[cycle % 3] : pattern; variant = kind === 'unblockable' ? 1 : 0; preparation = 0.9; rest = 0.85; }
  }
  function guarding() {
    return enabled && reaction.health > 0 && !reaction.locked && reaction.guard > 0
      && (elapsed < ENEMY_DEFENSE.guardUntil || elapsed > attackDuration(definition()));
  }
  return {
    root: knight.root,
    get enabled() { return enabled; }, get pattern() { return pattern; }, get kind() { return kind; },
    get elapsed() { return elapsed; }, get cueVisible() { return cue.visible; },
    get alive() { return enabled && reaction.health > 0; },
    get health() { return reaction.health; },
    get guard() { return reaction.guard; },
    get guarding() { return guarding(); },
    get availableToCommit() { return enabled && reaction.health > 0 && !reaction.locked && !counterHeld && !finisherHeld && elapsed < 0; },
    get heldForCounter() { return counterHeld; },
    get attackName() { return definition().name; },
    get delivery() { return kind === 'unblockable' ? 'kick' as const : 'sword' as const; },
    get windup() { return preparation; },
    get capabilities() { return knight.capabilities; },
    detach: knight.detach.bind(knight),
    dropWeapon: knight.dropWeapon.bind(knight),
    holdForFinisher(on: boolean) {
      if (on !== finisherHeld) {
        elapsed = -0.65; resolved = true; lastBlade = null; cue.visible = false; serial++;
        approaching = false; path = []; repathAt = 0;
      }
      finisherHeld = on;
    },
    poseFinisher(elapsed: number, definition: FinisherDefinition = FINISHERS[0]) { cue.visible = false; knight.poseFinisher(elapsed, true, serial, definition); },
    execute(definition: FinisherDefinition = FINISHERS[0]) { if (this.alive) { this.damage(reaction.health, true); executed = true; executionDefinition = definition; } },
    holdForCounter(on: boolean) {
      if (on && !counterHeld) { elapsed = -0.65; resolved = true; cue.visible = false; serial++; }
      counterHeld = on;
    },
    get readyToAttack() { return enabled && reaction.health > 0 && !reaction.locked && !approaching && elapsed < 0 && elapsed >= -1 / 60 - 1e-6; },
    get committed() { return enabled && reaction.health > 0 && !reaction.locked && elapsed >= 0 && elapsed <= preparation + 0.24; },
    receiveAttack(attack: AttackDefinition): EnemyHit {
      if (!enabled || reaction.health <= 0) return 'ignored';
      guardIdle = 0;
      if (attack.kind !== 'riposte' && guarding()) {
        const pressure = attack.kind === 'heavy' ? ENEMY_DEFENSE.heavyPressure
          : attack.damage > LIGHTS[0].damage ? ENEMY_DEFENSE.chainPressure : ENEMY_DEFENSE.lightPressure;
        reaction.guard = Math.max(0, reaction.guard - pressure);
        reaction.parryVisualLeft = 0.16;
        if (reaction.guard > 0) return 'block';
        this.breakGuard();
        return 'guard-break';
      }
      this.damage(attack.damage, attack.kind === 'heavy');
      if (attack.kind === 'riposte') this.breakGuard();
      return 'hit';
    },
    threatensSoon(center: THREE.Vector3, radius: number): boolean {
      const attack = definition();
      if (reaction.locked || elapsed < attack.preparation || elapsed > attack.preparation + attack.swing) return false;
      const end = Math.min(elapsed + 0.065, attack.preparation + attack.swing);
      poseStrike(elapsed); let blade = contact(), threatened = false;
      const steps = Math.max(1, Math.ceil((end - elapsed) * 120));
      for (let i = 1; i <= steps; i++) {
        poseStrike(elapsed + (end - elapsed) * i / steps);
        const next = contact();
        if (sweptBladeHits(blade, next, center, radius)) { threatened = true; break; }
        blade = next;
      }
      poseStrike(elapsed);
      return threatened;
    },
    breakGuard() {
      if (!enabled) return;
      reaction.guard = 0;
      if (reaction.health <= 0) return;
      reaction.mode = 'guard-break'; reaction.elapsed = 0;
      reaction.release(); approaching = false; guardIdle = 0;
      elapsed = -0.65; resolved = true; cue.visible = false; serial++;
    },
    get reaction() { return reaction.mode; },
    get stage() { return reaction.health <= 0 ? 'dead' : reaction.locked ? reaction.mode : counterHeld ? 'countered' : approaching ? 'approach' : elapsed < 0 ? 'ready' : elapsed < preparation ? 'windup' : elapsed < preparation + 0.24 ? 'swing' : 'recovery'; },
    damage(amount: number, heavy: boolean) {
      if (!enabled || reaction.health <= 0) return;
      reaction.health = Math.max(0, reaction.health - amount);
      reaction.release(); approaching = false; guardIdle = 0;
      const broken = reaction.mode === 'guard-break';
      reaction.mode = reaction.health <= 0 ? 'dead' : broken ? 'guard-break' : heavy ? 'stagger' : 'flinch';
      if (!broken || reaction.health <= 0) reaction.elapsed = 0;
      elapsed = -0.65; resolved = true; cue.visible = false;
      path = []; repathAt = 0; serial++;
    },
    get obstacle() { return { x: knight.root.position.x, z: knight.root.position.z, halfX: 0.35, halfZ: 0.35 }; },
    configure(on: boolean, drill: Drill, degrees: number, player: THREE.Vector3, profile = 0, radius = 1.95) {
      personality = profile; randomState = (profile + 1) * 9277; counterHeld = false; finisherHeld = false; executed = false;
      knight.resetParts(); executionDefinition = FINISHERS[0];
      enabled = on; pattern = drill; bearing = degrees; elapsed = -0.8; cycle = 0; serial++; resolved = false; lastBlade = null; select();
      reaction.reset(); guardIdle = 0; walked = 0; approaching = false; path = []; repathAt = 0;
      knight.root.visible = enabled; cue.visible = false;
      const angle = THREE.MathUtils.degToRad(bearing);
      knight.root.position.copy(player).add(new THREE.Vector3(Math.sin(angle) * radius, 0, -Math.cos(angle) * radius));
    },
    update(dt: number, time: number, player: THREE.Vector3, camera: THREE.Camera, obstacles: Obstacle[],
      strike: (kind: StrikeKind, previous: BladeSegment, current: BladeSegment) => DefenseResult | false,
      canStart = true, moveGoal: Point | null = null) {
      if (!enabled) return;
      if (executed && reaction.health <= 0) { cue.visible = false; knight.poseFinisher(executionDefinition.duration, true, serial, executionDefinition); return; }
      const wasLocked = reaction.locked;
      reaction.blocking = guarding();
      reaction.advance(dt, true);
      if (wasLocked) {
        cue.visible = false;
        knight.animate(0, 0, time, dt); knight.poseAttack(null, 0, serial); knight.poseDefense(reaction, dt);
        return;
      }
      if (counterHeld) {
        cue.visible = false; knight.animate(0, 0, time, dt); knight.poseAttack(null, 0, serial); knight.poseDefense(reaction, dt); return;
      }
      // Guard recovers only after a genuine lull, never during attack commitment.
      if (elapsed >= 0 && elapsed <= attackDuration(definition())) guardIdle = 0;
      else guardIdle += dt;
      if (guardIdle >= ENEMY_DEFENSE.recoveryDelay) reaction.guard = Math.min(100, reaction.guard + ENEMY_DEFENSE.recoveryRate * dt);
      const separation = player.distanceTo(knight.root.position);
      const availableToMove = elapsed < 0 || elapsed >= attackDuration(definition());
      const destinationGoal = moveGoal && !canStart ? moveGoal : player;
      const goalDistance = Math.hypot(destinationGoal.x - knight.root.position.x, destinationGoal.z - knight.root.position.z);
      const standOff = destinationGoal === player ? kind === 'unblockable' ? ENEMY_KICK.standOff : 1.95 : 0.12;
      approaching = availableToMove && goalDistance > standOff + 0.1;
      if (approaching) {
        // End a pursuit path at spacing, never inside the player's collider.
        const factor = Math.max(0, (goalDistance - standOff) / (goalDistance || 1));
        const end = { x: knight.root.position.x + (destinationGoal.x - knight.root.position.x) * factor, z: knight.root.position.z + (destinationGoal.z - knight.root.position.z) * factor };
        const navigation = [...obstacles, { x: player.x, z: player.z, halfX: 0.36, halfZ: 0.36 }];
        if (time >= repathAt || !path.length) { path = approachPath(knight.root.position, end, navigation); repathAt = time + 0.45; }
        while (path.length && Math.hypot(path[0].x - knight.root.position.x, path[0].z - knight.root.position.z) < (path.length > 1 ? 0.25 : 0.025)) path.shift();
        const destination = path[0];
        let speed = 0;
        let travel = { x: 0, z: 0 };
        if (destination) {
          const dx = destination.x - knight.root.position.x, dz = destination.z - knight.root.position.z;
          const length = Math.hypot(dx, dz);
          const step = Math.min(length, Math.max(0, goalDistance - standOff), (separation > 5 ? 5.6 : 2.8 + personality * 0.16) * dt);
          const before = knight.root.position.clone();
          const next = moveWithCollision(before, { x: dx / length * step, z: dz / length * step }, navigation);
          knight.root.position.set(next.x, 0, next.z);
          travel = { x: next.x - before.x, z: next.z - before.z };
          speed = knight.root.position.distanceTo(before) / dt; walked += speed * dt;
          const yaw = moveGoal && separation < 5 ? Math.atan2(before.x - player.x, before.z - player.z) : Math.atan2(-dx, -dz);
          const turn = Math.atan2(Math.sin(yaw - knight.root.rotation.y), Math.cos(yaw - knight.root.rotation.y));
          knight.root.rotation.y += Math.max(-5 * dt, Math.min(5 * dt, turn));
        }
        elapsed = -0.35; resolved = false; cue.visible = false;
        reaction.blocking = guarding();
        knight.animate(walked, speed, time, dt, travel); knight.poseAttack(null, 0, serial); knight.poseDefense(reaction, dt, speed > 0.1);
        return;
      }
      const previousElapsed = elapsed;
      elapsed += dt;
      if (previousElapsed < 0 && (!canStart || finisherHeld)) elapsed = Math.min(-0.001, elapsed);
      // Interruptions resolve the old strike, then return to a negative ready
      // timer. A fresh windup must rearm both its warning and hit resolution.
      if (previousElapsed < 0 && elapsed >= 0) { resolved = false; lastBlade = null; }
      const attack = definition();
      if (elapsed >= attackDuration(attack) + rest) {
        elapsed = -0.15; cycle++; serial++; resolved = false; lastBlade = null; select();
      }
      const current = definition();
      if (elapsed <= preparation - 0.25) {
        const delta = player.clone().sub(knight.root.position);
        knight.root.rotation.y = Math.atan2(-delta.x, -delta.z);
      }
      knight.animate(0, 0, time, dt);
      if (elapsed >= 0 && elapsed <= attackDuration(current)) poseStrike(elapsed);
      else knight.poseAttack(null, 0, serial);
      if (!resolved && elapsed >= current.preparation && elapsed <= current.preparation + current.swing) {
        // Subsample the visible weapon or boot; a kick never uses sword collision.
        const start = Math.max(current.preparation, elapsed - dt);
        poseStrike(start); lastBlade = contact();
        for (let i = 1; i <= 3; i++) {
          poseStrike(start + (elapsed - start) * i / 3);
          const blade = contact();
          const result = strike(kind, lastBlade, blade);
          if (result) {
            resolved = true;
            if (result === 'parry' || result === 'perfect-parry') {
              reaction.mode = 'flinch'; reaction.elapsed = 0; elapsed = -0.65; serial++;
            }
            break;
          }
          lastBlade = blade;
        }
        if (elapsed >= 0) poseStrike(elapsed);
        else knight.poseAttack(null, 0, serial);
      }
      reaction.blocking = guarding();
      knight.poseDefense(reaction, dt);
      cue.visible = !resolved && elapsed >= preparation - 0.35 && elapsed <= current.preparation + current.swing;
      cue.position.copy(knight.root.position).y += 2.45;
      cue.quaternion.copy(camera.quaternion);
      material.color.set(kind === 'unblockable' ? '#ff443d' : '#ffffff');
    },
  };
}
