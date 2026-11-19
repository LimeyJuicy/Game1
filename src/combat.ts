import type { Point } from './movement.ts';

export type AttackKind = 'light' | 'heavy' | 'riposte';
export type AttackPhase = 'preparation' | 'swing' | 'recovery';
export interface AttackDefinition {
  kind: AttackKind; name: string; preparation: number; swing: number; recovery: number;
  style?: 'backspin';
  damage: number; cut: 'falling' | 'rising' | 'horizontal' | 'overhead'; side: -1 | 1;
  plane: [number, number]; arc: [number, number];
}
export const LIGHTS: AttackDefinition[] = [
  { kind: 'light', name: 'Diagonal cut', preparation: 0.18, swing: 0.18, recovery: 0.28, damage: 18, cut: 'falling', side: 1, plane: [0.82, 0.57], arc: [100, -30] },
  { kind: 'light', name: 'Rising cut', preparation: 0.17, swing: 0.18, recovery: 0.29, damage: 18, cut: 'rising', side: -1, plane: [-0.82, -0.57], arc: [100, -30] },
  { kind: 'light', name: 'Finishing cut', preparation: 0.24, swing: 0.22, recovery: 0.43, damage: 28, cut: 'horizontal', side: 1, plane: [1, 0], arc: [100, -30] },
];
export const HEAVIES: AttackDefinition[] = [
  { kind: 'heavy', name: 'Overhead cleave', preparation: 0.4, swing: 0.27, recovery: 0.5, damage: 38, cut: 'overhead', side: 1, plane: [0, 1], arc: [100, -60] },
  { kind: 'heavy', name: 'Left heavy sweep', preparation: 0.4, swing: 0.27, recovery: 0.5, damage: 38, cut: 'horizontal', side: 1, plane: [1, 0], arc: [100, -30] },
  { kind: 'heavy', name: 'Right heavy sweep', preparation: 0.4, swing: 0.27, recovery: 0.5, damage: 38, cut: 'horizontal', side: -1, plane: [-1, 0], arc: [100, -30] },
];
export const RIPOSTE: AttackDefinition = { kind: 'riposte', name: 'Riposte', preparation: 0.07, swing: 0.12, recovery: 0.2, damage: 32, cut: 'horizontal', side: 1, plane: [1, 0], arc: [75, -45] };
export const attackDuration = (definition: AttackDefinition) => definition.preparation + definition.swing + definition.recovery;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
export const smooth = (value: number) => { const t = clamp01(value); return t * t * (3 - 2 * t); };
/** A slower load, a late fast cut, then a smooth arrival at follow-through. */
export const swingProgress = (value: number) => { const t = clamp01(value); return t * t * t * (4 - 3 * t); };

/** Gameplay timeline, independent of rendering and keyboard-repeat behavior. */
export class SwordActions {
  current: AttackDefinition | null = null;
  elapsed = 0;
  serial = 0;
  chain = 0;
  private queuedLight = false;
  private continuation = 0;
  private heavyVariant = 0;

  get phase(): AttackPhase | null {
    if (!this.current) return null;
    if (this.elapsed < this.current.preparation) return 'preparation';
    if (this.elapsed < this.current.preparation + this.current.swing) return 'swing';
    return 'recovery';
  }
  get canDefend() {
    return !this.current || this.phase === 'preparation' || (this.phase === 'recovery' && this.elapsed >= attackDuration(this.current) - 0.14);
  }
  get bufferOpen() {
    return !!this.current && this.current.kind === 'light' && this.chain < 3 && this.elapsed >= attackDuration(this.current) - 0.16;
  }

  request(kind: AttackKind): boolean {
    if (this.current) {
      if (kind === 'light' && this.bufferOpen) this.queuedLight = true;
      return false;
    }
    if (kind === 'riposte') { this.chain = 0; this.begin(RIPOSTE); }
    else if (kind === 'heavy') {
      this.chain = 0; const index = this.heavyVariant++; const base = HEAVIES[index % HEAVIES.length];
      this.begin(index % 6 === 4 ? { ...base, name: 'Turning cleave', style: 'backspin' } : base);
    }
    else {
      this.chain = this.continuation > 0 && this.chain < 3 ? this.chain + 1 : 1;
      this.begin(LIGHTS[this.chain - 1]);
    }
    return true;
  }

  private begin(definition: AttackDefinition) {
    this.current = definition; this.elapsed = 0; this.serial++; this.queuedLight = false; this.continuation = 0;
  }

  advance(dt: number) {
    if (!this.current) {
      this.continuation = Math.max(0, this.continuation - dt);
      if (!this.continuation) this.chain = 0;
      return;
    }
    this.elapsed += dt;
    if (this.elapsed < attackDuration(this.current) - 1e-9) return;
    const overflow = Math.max(0, this.elapsed - attackDuration(this.current));
    const continueChain = this.queuedLight && this.current.kind === 'light' && this.chain < 3;
    const wasLight = this.current.kind === 'light';
    this.current = null; this.queuedLight = false; this.elapsed = 0;
    if (continueChain) { this.chain++; this.begin(LIGHTS[this.chain - 1]); this.advance(overflow); }
    else { this.continuation = wasLight && this.chain < 3 ? Math.max(0, 0.28 - overflow) : 0; if (!this.continuation) this.chain = 0; }
  }

  /** Hook for later defense/damage states; voluntary cancels respect commitment. */
  cancel(forced = false) {
    if (!forced && !this.canDefend) return false;
    this.current = null; this.elapsed = 0; this.chain = 0; this.queuedLight = false; this.continuation = 0;
    return true;
  }
  clearBuffer() { this.queuedLight = false; }
}

export interface Vec3 { x: number; y: number; z: number }
export interface BladeSegment { base: Vec3; tip: Vec3 }
const mixPoint = (a: Vec3, b: Vec3, t: number): Vec3 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
const distance3 = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Sweep between animation samples rather than testing only the blade endpoint. */
export function sweptBladeHits(previous: BladeSegment, current: BladeSegment, center: Vec3, radius: number): boolean {
  const steps = Math.max(1, Math.ceil(Math.max(distance3(previous.base, current.base), distance3(previous.tip, current.tip)) / 0.05));
  for (let i = 0; i <= steps; i++) {
    const a = mixPoint(previous.base, current.base, i / steps);
    const b = mixPoint(previous.tip, current.tip, i / steps);
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const lengthSquared = dx * dx + dy * dy + dz * dz;
    const along = lengthSquared ? clamp01(((center.x - a.x) * dx + (center.y - a.y) * dy + (center.z - a.z) * dz) / lengthSquared) : 0;
    if (distance3(mixPoint(a, b, along), center) <= radius) return true;
  }
  return false;
}

export function lungeBudget(position: Point, target: Point | null): number {
  return target ? Math.min(0.42, Math.max(0, Math.hypot(target.x - position.x, target.z - position.z) - 1.35)) : 0;
}
