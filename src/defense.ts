import type { Point } from './movement.ts';

export type StrikeKind = 'normal' | 'heavy' | 'unblockable';
export type Reaction = 'free' | 'dodge' | 'roll' | 'flinch' | 'stagger' | 'knockdown' | 'guard-break' | 'dead';
export type DefenseResult = 'parry' | 'perfect-parry' | 'perfect-dodge' | 'block' | 'guard-break' | 'evade' | 'protected' | 'hit';
export const DEFENSE = { guard: 100, parryWindow: 0.2, parryCooldown: 0.34, guardDelay: 1.1, guardRecovery: 20, healDelay: 4, healRate: 5, healCap: 50 };
const duration: Record<Reaction, number> = { free: 0, dodge: 0.42, roll: 0.68, flinch: 0.32, stagger: 0.65, knockdown: 1.05, 'guard-break': 1, dead: Infinity };

/** Defensive timing uses simulation time; cinematic timing is owned separately. */
export class PlayerDefense {
  health = 100;
  guard = DEFENSE.guard;
  mode: Reaction = 'free';
  elapsed = 0;
  blocking = false;
  parryLeft = 0;
  parryVisualLeft = 0;
  parryCooldown = 0;
  protectedLeft = 0;
  inactivity = 0;
  dodgeDirection: Point = { x: 0, z: 1 };
  private rollWindow = 0;
  private dodgeCooldown = 0;
  private pushDirection: Point | null = null;
  get locked() { return this.mode !== 'free'; }
  get evading() {
    return this.mode === 'dodge' ? this.elapsed >= 0.055 && this.elapsed <= 0.2
      : this.mode === 'roll' && this.elapsed >= 0.06 && this.elapsed <= 0.29;
  }
  get progress() { return this.locked ? Math.min(1, this.elapsed / duration[this.mode]) : 0; }
  get perfectDodge() { return this.mode === 'dodge' && this.elapsed >= 0.055 && this.elapsed <= 0.13; }
  get canRiposte() { return this.mode === 'free' || (this.mode === 'dodge' && this.elapsed >= 0.2); }
  finishForRiposte() { this.mode = 'free'; this.elapsed = 0; this.rollWindow = 0; this.release(); }
  allowFollowupRoll() { if (this.mode === 'dodge') this.rollWindow = Math.max(this.rollWindow, 0.15); }

  activity() { this.inactivity = 0; }
  block(pressed: boolean, held: boolean, allowed: boolean) {
    this.blocking = held && allowed && !this.locked;
    if (pressed && allowed && !this.locked && this.parryCooldown <= 0) {
      this.parryLeft = DEFENSE.parryWindow;
      this.parryVisualLeft = 0.25;
      this.parryCooldown = DEFENSE.parryCooldown;
      this.activity();
    }
  }
  dodge(direction: Point, allowed: boolean, earnedRoll = false): boolean {
    const rolling = (this.mode === 'dodge' && this.rollWindow > 0) || (earnedRoll && this.mode === 'free');
    if (!rolling && (!allowed || this.locked || this.dodgeCooldown > 0)) return false;
    if (!rolling) {
      const length = Math.hypot(direction.x, direction.z) || 1;
      this.dodgeDirection = { x: direction.x / length, z: direction.z / length };
    }
    this.mode = rolling ? 'roll' : 'dodge'; this.elapsed = 0;
    this.rollWindow = rolling ? 0 : 0.28;
    this.blocking = false; this.parryLeft = 0; this.activity();
    return true;
  }
  travel(dt: number): Point {
    if (this.mode === 'stagger' && this.pushDirection) {
      const progress = (time: number) => { const t = Math.min(1, time / 0.18); return t * t * (3 - 2 * t); };
      const distance = 0.65 * (progress(this.elapsed + dt) - progress(this.elapsed));
      return { x: this.pushDirection.x * distance, z: this.pushDirection.z * distance };
    }
    const travelTime = this.mode === 'dodge' ? 0.28 : 0.44;
    const length = this.mode === 'dodge' ? 1.35 : 2.6;
    if (this.mode !== 'dodge' && this.mode !== 'roll') return { x: 0, z: 0 };
    const progress = (time: number) => {
      const t = Math.max(0, Math.min(1, time / travelTime)); return t * t * (3 - 2 * t);
    };
    const step = length * (progress(this.elapsed + dt) - progress(this.elapsed));
    return { x: this.dodgeDirection.x * step, z: this.dodgeDirection.z * step };
  }
  knockBackFrom(source: Point, player: Point) {
    if (this.mode !== 'stagger') return;
    const dx = player.x - source.x, dz = player.z - source.z, distance = Math.hypot(dx, dz) || 1;
    this.pushDirection = { x: dx / distance, z: dz / distance };
  }
  receive(kind: StrikeKind, delivery: 'sword' | 'kick' = 'sword'): DefenseResult {
    if (this.health <= 0) return 'protected';
    if (this.evading) return this.perfectDodge ? 'perfect-dodge' : 'evade';
    if (!this.locked && kind !== 'unblockable' && this.parryLeft > 0) {
      const perfect = DEFENSE.parryWindow - this.parryLeft <= 0.07;
      this.guard = Math.min(DEFENSE.guard, this.guard + 22); this.activity(); this.parryLeft = 0; this.parryVisualLeft = 0.25;
      return perfect ? 'perfect-parry' : 'parry';
    }
    if (!this.locked && kind !== 'unblockable' && this.blocking) {
      this.guard = Math.max(0, this.guard - (kind === 'heavy' ? 44 : 24)); this.activity();
      if (this.guard > 0) return 'block';
      this.mode = 'guard-break'; this.elapsed = 0; this.blocking = false; this.parryLeft = 0;
      this.protectedLeft = duration['guard-break'] + 0.18;
      return 'guard-break';
    }
    if (this.protectedLeft > 0) return 'protected';
    this.health = Math.max(0, this.health - (kind === 'normal' ? 15 : kind === 'heavy' ? 26 : 30));
    this.mode = this.health <= 0 ? 'dead' : delivery === 'kick' ? 'stagger' : kind === 'normal' ? 'flinch' : kind === 'heavy' ? 'stagger' : 'knockdown';
    this.pushDirection = null;
    this.elapsed = 0; this.blocking = false; this.parryLeft = 0;
    this.protectedLeft = duration[this.mode] + 0.18; this.activity();
    return 'hit';
  }
  advance(dt: number, attacking = false) {
    this.parryLeft = Math.max(0, this.parryLeft - dt);
    this.parryVisualLeft = Math.max(0, this.parryVisualLeft - dt);
    this.parryCooldown = Math.max(0, this.parryCooldown - dt);
    this.protectedLeft = Math.max(0, this.protectedLeft - dt);
    this.rollWindow = Math.max(0, this.rollWindow - dt);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
    if (this.locked) {
      this.elapsed += dt;
      if (this.elapsed >= duration[this.mode]) {
        if (this.mode === 'guard-break') this.guard = 35;
        if (this.mode === 'dodge' || this.mode === 'roll') this.dodgeCooldown = 0.14;
        this.mode = 'free'; this.elapsed = 0;
      }
    }
    if (attacking || this.blocking || this.parryLeft > 0 || this.locked) this.activity();
    else this.inactivity += dt;
    if (this.inactivity >= DEFENSE.guardDelay && this.mode === 'free') this.guard = Math.min(100, this.guard + DEFENSE.guardRecovery * dt);
    if (this.inactivity >= DEFENSE.healDelay && this.mode === 'free' && this.health > 0 && this.health < DEFENSE.healCap) {
      this.health = Math.min(DEFENSE.healCap, this.health + DEFENSE.healRate * dt);
    }
  }
  release() { this.blocking = false; this.parryLeft = 0; this.parryVisualLeft = 0; }
  reset() {
    this.health = 100; this.guard = 100; this.mode = 'free'; this.elapsed = 0;
    this.release(); this.parryCooldown = 0; this.protectedLeft = 0; this.inactivity = 0;
    this.rollWindow = 0; this.dodgeCooldown = 0;
    this.pushDirection = null;
  }
}
