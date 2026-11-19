import type { Point } from './movement.ts';

export interface CombatTarget extends Point {
  id: string;
  threatIn?: number;
}
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);

/** Retain focus until an explicit combat event or disengagement changes it. */
export class CombatFocus {
  current: string | null = null;
  private resumeTarget: string | null = null;
  private urgent: string | null = null;
  defend(id: string) { this.resumeTarget = id; this.current = this.urgent ?? id; }
  attack(id: string) { this.resumeTarget = this.urgent ? id : null; this.current = this.urgent ?? id; }
  reset() { this.current = null; this.resumeTarget = null; this.urgent = null; }
  update(player: Point, targets: CombatTarget[]) {
    const nearby = targets.filter(target => distance(player, target) < 9);
    const threats = nearby.filter(target => target.threatIn !== undefined && distance(player, target) < 4)
      .sort((a, b) => a.threatIn! - b.threatIn! || a.id.localeCompare(b.id));
    if (!threats.some(target => target.id === this.urgent)) this.urgent = threats[0]?.id ?? null;
    if (this.urgent) this.current = this.urgent;
    else if (!nearby.some(target => target.id === this.current)) this.current = null;
    if (!this.urgent && this.resumeTarget) {
      if (nearby.some(target => target.id === this.resumeTarget)) this.current = this.resumeTarget;
      this.resumeTarget = null;
    }
    if (!this.current) this.current = nearby.filter(target => distance(player, target) <= 6)
      .sort((a, b) => {
        const delta = distance(player, a) - distance(player, b);
        return Math.abs(delta) > 1e-5 ? delta : a.id.localeCompare(b.id);
      })[0]?.id ?? null;
    return this.current;
  }
}

/** A small practice coordinator: stagger commitments, permit two windups,
 * and reserve red attacks so they cannot coincide with another committed hit. */
export class AttackCoordinator {
  private lastGrant = -Infinity;
  private previous: string | null = null;
  reset() { this.lastGrant = -Infinity; this.previous = null; }
  grant(time: number, candidates: { id: string; ready: boolean; active: boolean; red: boolean }[]): string | null {
    const active = candidates.filter(candidate => candidate.active);
    if (time - this.lastGrant < 0.72 || active.length >= 2 || active.some(candidate => candidate.red)) return null;
    const start = (candidates.findIndex(candidate => candidate.id === this.previous) + 1) % Math.max(1, candidates.length);
    const ordered = [...candidates.slice(start), ...candidates.slice(0, start)];
    const next = ordered.find(candidate => candidate.ready && (!candidate.red || !active.length));
    if (!next) return null;
    this.lastGrant = time; this.previous = next.id;
    return next.id;
  }
}
