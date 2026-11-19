import { moveWithCollision } from './movement.ts';
import type { Point, Obstacle } from './movement.ts';

const deltaAngle = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const GROUP_SPAWNS = [{ angle: 0, distance: 1.95 }, { angle: 132, distance: 2.7 }, { angle: -105, distance: 3.2 }];

/** Individually refreshed gap-seeking goals, rather than equal formation slots. */
export class LooseSurround {
  private goals = new Map<string, { angle: number; radius: number; until: number }>();
  reset() { this.goals.clear(); }
  goal(id: string, index: number, time: number, player: Point, self: Point, peers: Point[], obstacles: Obstacle[], probeOrigin: Point = player): Point {
    let goal = this.goals.get(id);
    if (!goal || time >= goal.until) {
      const angle = Math.atan2(self.x - player.x, -(self.z - player.z));
      const others = peers.map(peer => Math.atan2(peer.x - player.x, -(peer.z - player.z)));
      const variation = Math.sin(time * 0.37 + index * 2.17);
      const radius = 2.25 + index * 0.24 + (variation + 1) * 0.28;
      let best = -Infinity, selected = angle;
      for (const offset of [0, 0.65, -0.65, 1.25, -1.25, 2.1, -2.1]) {
        const candidate = angle + offset + variation * 0.12;
        const point = { x: player.x + Math.sin(candidate) * radius, z: player.z - Math.cos(candidate) * radius };
        const reachable = moveWithCollision(probeOrigin, { x: point.x - probeOrigin.x, z: point.z - probeOrigin.z }, obstacles, 0.42);
        if (Math.hypot(reachable.x - point.x, reachable.z - point.z) > 0.05) continue;
        const gap = others.length ? Math.min(...others.map(other => Math.abs(deltaAngle(candidate, other)))) : 2;
        const score = Math.min(gap, 1.65) - Math.abs(offset) * 0.22;
        if (score > best) { best = score; selected = candidate; }
      }
      if (best === -Infinity) return { ...self };
      goal = { angle: selected, radius, until: time + 3.2 + index * 0.47 + (variation + 1) * 0.6 };
      this.goals.set(id, goal);
    }
    return { x: player.x + Math.sin(goal.angle) * goal.radius, z: player.z - Math.cos(goal.angle) * goal.radius };
  }
}

export function wantsRetreat(player: Point, target: Point | null, intent: Point, shift: boolean): boolean {
  if (!shift || !target || Math.hypot(intent.x, intent.z) < 0.1) return false;
  const dx = player.x - target.x, dz = player.z - target.z;
  return (intent.x * dx + intent.z * dz) / (Math.hypot(dx, dz) || 1) > 0.25;
}

/** Freeze consumes real time without advancing any combat/reward timer. */
export class ImpactFreeze {
  remaining = 0;
  count = 0;
  get active() { return this.remaining > 0; }
  trigger() { if (this.active) return false; this.remaining = 0.08; this.count++; return true; }
  advanceReal(dt: number) { const held = Math.min(dt, this.remaining); this.remaining -= held; return dt - held; }
  reset() { this.remaining = 0; this.count = 0; }
}
