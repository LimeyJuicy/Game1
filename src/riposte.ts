import { approachPath, clearPath } from './navigation.ts';
import { moveWithCollision } from './movement.ts';
import type { Point, Obstacle } from './movement.ts';

/** Reserve an earned source and route to a collision-free paired-strike pose. */
export class RiposteDash {
  source: string | null = null;
  active = false;
  private path: Point[] = [];
  begin(source: string, from: Point, target: Point, obstacles: Obstacle[]): boolean {
    const base = Math.atan2(from.x - target.x, from.z - target.z);
    for (const offset of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, Math.PI]) {
      const point = { x: target.x + Math.sin(base + offset) * 1.4, z: target.z + Math.cos(base + offset) * 1.4 };
      if (!clearPath(point, target, obstacles)) continue;
      const path = approachPath(from, point, obstacles);
      if (!path.length) continue;
      this.source = source; this.path = path; this.active = true; return true;
    }
    return false;
  }
  step(from: Point, dt: number, obstacles: Obstacle[]): Point {
    let current = { ...from }, budget = 16 * dt;
    while (this.path.length && budget > 1e-6) {
      const point = this.path[0], dx = point.x - current.x, dz = point.z - current.z, distance = Math.hypot(dx, dz);
      if (distance < 0.015) { this.path.shift(); continue; }
      const amount = Math.min(distance, budget);
      const next = moveWithCollision(current, { x: dx / distance * amount, z: dz / distance * amount }, obstacles);
      const traveled = Math.hypot(next.x - current.x, next.z - current.z);
      current = next; budget -= amount;
      if (traveled < amount * 0.95) break;
      if (amount >= distance - 1e-6) this.path.shift();
    }
    if (!this.path.length) this.active = false;
    return current;
  }
  reset() { this.source = null; this.active = false; this.path = []; }
}
