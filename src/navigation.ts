import { moveWithCollision } from './movement.ts';
import type { Obstacle, Point } from './movement.ts';

export function clearPath(from: Point, to: Point, obstacles: Obstacle[]): boolean {
  const actual = moveWithCollision(from, { x: to.x - from.x, z: to.z - from.z }, obstacles, 0.42);
  return Math.hypot(actual.x - to.x, actual.z - to.z) < 0.01;
}

/** Small arena waypoint search; direct pursuit stays cheap in open space. */
export function approachPath(from: Point, to: Point, obstacles: Obstacle[]): Point[] {
  if (clearPath(from, to, obstacles)) return [to];
  const key = (p: Point) => `${p.x},${p.z}`;
  const start = { x: Math.round(from.x), z: Math.round(from.z) };
  const goal = { x: Math.round(to.x), z: Math.round(to.z) };
  const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
  const queue = [start], scores = new Map([[key(start), 0]]), parents = new Map<string, Point>();
  const visited = new Set<string>();
  for (let count = 0; queue.length && count < 1800; count++) {
    queue.sort((a, b) => (scores.get(key(a))! + distance(a, goal)) - (scores.get(key(b))! + distance(b, goal)));
    const current = queue.shift()!;
    if (visited.has(key(current))) continue;
    visited.add(key(current));
    if (distance(current, goal) < 1 && clearPath(current, to, obstacles)) {
      const path = [to, current]; let node = current;
      while (parents.has(key(node))) { node = parents.get(key(node))!; path.push(node); }
      path.reverse();
      // Never route through a rounded grid start that lies inside scenery.
      while (path.length && !clearPath(from, path[0], obstacles)) path.shift();
      return path.length && clearPath(from, path[0], obstacles) ? path : [];
    }
    for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const next = { x: current.x + x, z: current.z + z };
      if (Math.abs(next.x) > 19 || Math.abs(next.z) > 21 || visited.has(key(next)) || !clearPath(current, next, obstacles)) continue;
      const cost = scores.get(key(current))! + Math.hypot(x, z);
      if (cost >= (scores.get(key(next)) ?? Infinity)) continue;
      scores.set(key(next), cost); parents.set(key(next), current); queue.push(next);
    }
  }
  return [];
}
