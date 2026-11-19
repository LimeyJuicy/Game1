import { smooth } from './combat.ts';
import type { Point, Obstacle } from './movement.ts';

/** Provisional mechanics values; final paired animation is deferred. */
export const FINISHER = { health: 30, reach: 2.4, spacing: 1.2, align: 0.28, lethal: 0.85, kick: 1.3, duration: 2.1, kickTravel: 0.65 };
export type FinisherId = 'rising' | 'disarm' | 'helmet' | 'decapitation' | 'sword-arm';
export type ExecutionEvent = 'drop-weapon' | 'sever-head' | 'sever-arm' | 'lethal';
export interface FinisherDefinition {
  id: FinisherId; name: string; duration: number; lethal: number; fall: number; spacing: number;
  displacement: number; events: readonly { time: number; type: ExecutionEvent }[];
}
export const FINISHERS: readonly FinisherDefinition[] = [
  { id: 'rising', name: 'Rising Cleave', duration: 2.1, lethal: .85, fall: 1.3, spacing: 1.2, displacement: .65, events: [{ time: .85, type: 'lethal' }] },
  { id: 'disarm', name: 'Disarm and Dispatch', duration: 2.4, lethal: 1.5, fall: 1.65, spacing: 1.1, displacement: 0, events: [{ time: .62, type: 'drop-weapon' }, { time: 1.5, type: 'lethal' }] },
  { id: 'helmet', name: 'Helmet Bash and Throat Cut', duration: 2.5, lethal: 1.55, fall: 1.7, spacing: 1.15, displacement: 0, events: [{ time: 1.55, type: 'lethal' }] },
  { id: 'decapitation', name: 'Sweeping Decapitation', duration: 2.15, lethal: 1.1, fall: 1.2, spacing: 1.3, displacement: .15, events: [{ time: 1.1, type: 'sever-head' }, { time: 1.1, type: 'drop-weapon' }, { time: 1.1, type: 'lethal' }] },
  { id: 'sword-arm', name: 'Sword-Arm Sever', duration: 2.35, lethal: 1.4, fall: 1.55, spacing: 1.15, displacement: .1, events: [{ time: .95, type: 'sever-arm' }, { time: 1.4, type: 'lethal' }] },
];
export interface ExecutionCapabilities { helmet: boolean; head: boolean; swordArm: boolean; weapon: boolean }
export interface ExecutionTarget extends Point { id: string; alive: boolean; health: number; broken: boolean; capabilities?: ExecutionCapabilities }
interface MotionPoint extends Point { time: number }
export interface ExecutionPlan {
  id: string; start: Point; player: Point; victim: Point; victimEnd: Point; yaw: number;
  definition: FinisherDefinition; path: MotionPoint[]; space: Point[];
}
function reservationFor(points: Point[]): Obstacle {
  const xs = points.map(p => p.x), zs = points.map(p => p.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, halfX: (maxX - minX) / 2 + .48, halfZ: (maxZ - minZ) / 2 + .48 };
}
const mix = (a: Point, b: Point, amount: number): Point => ({ x: a.x + (b.x - a.x) * amount, z: a.z + (b.z - a.z) * amount });
function free(point: Point, obstacles: readonly Obstacle[], radius = 0.42): boolean {
  return !obstacles.some(box => {
    const x = Math.max(box.x - box.halfX, Math.min(point.x, box.x + box.halfX));
    const z = Math.max(box.z - box.halfZ, Math.min(point.z, box.z + box.halfZ));
    return Math.hypot(x - point.x, z - point.z) < radius;
  });
}
function segmentFree(a: Point, b: Point, obstacles: readonly Obstacle[]): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.08));
  for (let i = 0; i <= steps; i++) if (!free(mix(a, b, i / steps), obstacles)) return false;
  return true;
}

/** Only select a pair whose alignment and complete body travel fit the space. */
export function selectFinisher(player: Point, targets: readonly ExecutionTarget[], focus: string | null, obstacles: readonly Obstacle[], options: { start?: number; preferred?: FinisherId; only?: FinisherId } = {}): ExecutionPlan | null {
  const start = (options.start ?? 0) % FINISHERS.length;
  const ordered = [...FINISHERS.slice(start), ...FINISHERS.slice(0, start)];
  const definitions = options.only ? FINISHERS.filter(def => def.id === options.only)
    : options.preferred ? [...ordered.filter(def => def.id === options.preferred), ...ordered.filter(def => def.id !== options.preferred)] : ordered;
  const eligible = targets.filter(target => target.alive && target.health > 0 && target.health <= FINISHER.health && target.broken
    && Math.hypot(target.x - player.x, target.z - player.z) <= FINISHER.reach)
    .sort((a, b) => Number(b.id === focus) - Number(a.id === focus)
      || Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z) || a.id.localeCompare(b.id));
  for (const target of eligible) {
    const length = Math.hypot(player.x - target.x, player.z - target.z);
    if (length < 0.8) continue;
    const dx = (player.x - target.x) / length, dz = (player.z - target.z) / length;
    const blockers = [...obstacles, ...targets.filter(other => other.id !== target.id && other.alive).map(other => ({ ...other, halfX: 0.35, halfZ: 0.35 }))];
    const body = [...blockers, { ...target, halfX: .35, halfZ: .35 }];
    const cap = target.capabilities ?? { helmet: true, head: true, swordArm: true, weapon: true };
    const local = (side: number, front: number): Point => ({ x: target.x + dz * side + dx * front, z: target.z - dx * side + dz * front });
    for (const definition of definitions) {
      if ((definition.id === 'helmet' && (!cap.helmet || !cap.head)) || (definition.id === 'decapitation' && !cap.head)
        || ((definition.id === 'disarm' || definition.id === 'sword-arm') && (!cap.weapon || !cap.swordArm))) continue;
      const aligned = local(0, definition.spacing);
      const victimEnd = local(0, -definition.displacement);
      const path: MotionPoint[] = [{ ...player, time: 0 }, { ...aligned, time: FINISHER.align }];
      if (definition.id === 'helmet') path.push({ ...local(1.15, .55), time: .65 }, { ...local(1.15, -.65), time: 1 }, { ...local(0, -1.15), time: 1.35 });
      if (definition.id === 'sword-arm') path.push({ ...local(.8, 1), time: .65 });
      if (path.slice(1).some((point, i) => !segmentFree(path[i], point, body))) continue;
      if (!segmentFree(aligned, target, blockers) || !segmentFree(target, victimEnd, blockers)) continue;
      // Broad lateral cuts need room for the temporary blade envelope too.
      if ((definition.id === 'decapitation' || definition.id === 'sword-arm') && !segmentFree(local(-1.25, .25), local(1.25, .25), blockers)) continue;
      const space: Point[] = [...path, target, victimEnd];
      if (definition.id === 'decapitation' || definition.id === 'sword-arm') space.push(local(-1.25, .25), local(1.25, .25));
      // Conservative box also keeps bystanders out of gaps between route points.
      // Reject rather than trap a bystander inside its expanded bounds at entry.
      if (targets.some(other => other.id !== target.id && other.alive && !free(other, [reservationFor(space)], .36))) continue;
      return { id: target.id, start: { ...player }, player: aligned, victim: { x: target.x, z: target.z }, victimEnd, yaw: Math.atan2(dx, dz), definition, path, space };
    }
  }
  return null;
}

/** Owns timing and positions, never damage or rendering. Pause by not advancing. */
export class FinisherAction {
  plan: ExecutionPlan | null = null;
  elapsed = 0;
  lethalApplied = false;
  private fired = new Set<number>();
  get active() { return this.plan !== null; }
  get progress() { return Math.min(1, this.elapsed / (this.plan?.definition.duration ?? FINISHER.duration)); }
  get phase() { return this.elapsed < FINISHER.align ? 'align' : this.elapsed < (this.plan?.definition.lethal ?? FINISHER.lethal) ? 'execution' : 'recover'; }
  begin(plan: ExecutionPlan) {
    if (this.active) return false;
    this.plan = plan; this.elapsed = 0; this.lethalApplied = false; this.fired.clear(); return true;
  }
  advance(dt: number, sourceAlive: boolean, playerAlive = true): { lethal: boolean; finished: boolean; cancelled: boolean; events: ExecutionEvent[] } {
    if (!this.plan) return { lethal: false, finished: false, cancelled: false, events: [] };
    if (!playerAlive || (!sourceAlive && !this.lethalApplied)) { this.reset(); return { lethal: false, finished: false, cancelled: true, events: [] }; }
    this.elapsed = Math.min(this.plan.definition.duration, this.elapsed + Math.max(0, dt));
    const events: ExecutionEvent[] = [];
    this.plan.definition.events.forEach((event, index) => {
      if (event.time <= this.elapsed && !this.fired.has(index)) { this.fired.add(index); events.push(event.type); }
    });
    const lethal = events.includes('lethal');
    if (lethal) this.lethalApplied = true;
    return { lethal, finished: this.elapsed >= this.plan.definition.duration, cancelled: false, events };
  }
  positions() {
    if (!this.plan) return null;
    const path = this.plan.path;
    const next = path.findIndex(point => point.time > this.elapsed);
    const player = next < 0 ? path[path.length - 1] : mix(path[next - 1] ?? path[0], path[next], smooth((this.elapsed - (path[next - 1]?.time ?? 0)) / (path[next].time - (path[next - 1]?.time ?? 0))));
    return { player: { x: player.x, z: player.z }, victim: mix(this.plan.victim, this.plan.victimEnd, smooth((this.elapsed - this.plan.definition.fall) / .35)) };
  }
  /** Bystanders avoid the full reserved pair corridor while still repositioning. */
  get reservation(): Obstacle[] {
    if (!this.plan) return [];
    return [reservationFor(this.plan.space)];
  }
  reset() { this.plan = null; this.elapsed = 0; this.lethalApplied = false; this.fired.clear(); }
}
