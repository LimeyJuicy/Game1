import { LUNGE, TUNING, footFor, footHome, hipsHome, lungeReach, roleOf, stanceById } from './stances.ts';
import type { Hips, Lead, PoseKind, Role } from './stances.ts';
import type { LowerBodyPose } from './legs.ts';

/**
 * Footwork controller: which foot is planted where, and how the hips ride
 * between them.
 *
 * Feet are held in world space, so a planted boot cannot slide. Every move is
 * planned from wherever the feet and hips are at that instant and heads for a
 * target, so any move can start from any pose. That is what lets a guard
 * interrupt anything.
 *
 * `advance(dt)` is the only thing that changes state and must run once per
 * simulation tick. `pose()` is a pure read of that state. State is plain data,
 * so `snapshot()` / `restore()` give exact replay and scrubbing.
 *
 * Frames: the root sits on the floor at (x, z) with heading `yaw`; forward is
 * (−sin yaw, −cos yaw), as in the game. Directions given to `step` are in the
 * root's own frame: x to the character's right, z toward the back.
 */

export type { Hips, Lead, PoseKind } from './stances.ts';
export type MoveKind = 'step' | 'pass' | 'lunge' | 'recover' | 'guard' | 'settle';
export type LandOn = 'heel' | 'ball' | 'flat';
export interface Point { x: number; z: number }

export interface FootState {
  x: number; z: number; yaw: number; lift: number; pitch: number; planted: boolean;
  /** A landed foot rolling flat: the pitch it landed with, and progress. */
  rollFrom: number; rollTime: number; rollDuration: number;
}

interface Swing {
  foot: 0 | 1; role: Role; start: number; end: number; apex: number; landOn: LandOn;
  /** Pitch carried through the air, and the heel raise before leaving. */
  swingPitch: number; push: number;
  /** Sideways bow in the path, toward the foot's own side, so a passing foot clears the standing one. */
  bulge: number;
  active: boolean; done: boolean;
  fromX: number; fromZ: number; fromYaw: number; fromLift: number; fromPitch: number;
}

export interface Move {
  kind: MoveKind; name: string; t: number; duration: number;
  /** Root travel still to come (world space) and the body's current speed along it. */
  remX: number; remZ: number; speed: number;
  /** The slice of the move the travel happens in, its mean speed, and the speed to finish at (0 stops). */
  travelStart: number; travelEnd: number; cruise: number; endSpeed: number;
  /** Steps may flow into the next one while the same direction is held. */
  flow: boolean; dirX: number; dirZ: number;
  blocked: boolean; external: boolean;
  swings: Swing[];
  endStance: string; endLead: Lead; endPose: PoseKind; depth: number;
  hipsFrom: Hips; hipStart: number; hipEnd: number; hipHalfLife: number;
  peakSpeed: number; travelled: number;
}

export type Command =
  | { type: 'step'; x: number; z: number }
  | { type: 'pass'; forward: boolean }
  | { type: 'lunge'; depth: number; duration?: number }
  | { type: 'recover'; forward: boolean };

export interface MoveSummary { name: string; kind: MoveKind; duration: number; travelled: number; peakSpeed: number; blocked: boolean }

export interface FootworkState {
  time: number;
  root: { x: number; z: number; yaw: number };
  rootVelX: number; rootVelZ: number; glideX: number; glideZ: number;
  stance: string; lead: Lead; pose: PoseKind; depth: number;
  feet: [FootState, FootState];
  hips: Hips; hipsVel: Hips; hipsTarget: Hips;
  move: Move | null; queue: Command | null; intent: Point | null;
  idle: number; last: MoveSummary | null;
}

export interface FootworkEvent { type: 'lift' | 'plant'; foot: 0 | 1; time: number; landOn?: LandOn; move: MoveKind }

export interface StepEnvironment {
  /**
   * Clamp a requested root displacement against the world and return what is
   * possible. Must be a pure query: it is also used to look ahead, so a step
   * toward a wall is shortened before the foot comes down.
   */
  collide?: (from: Point, delta: Point) => Point;
  /**
   * Required when the controller was created with `external: true`: gameplay
   * owns the root. Give its transform for this tick and, if known, how much
   * farther it will travel before the current move ends (otherwise the current
   * velocity is assumed to continue).
   */
  external?: { x: number; z: number; yaw: number; ahead?: Point };
}

export interface FootworkOptions {
  stance?: string; lead?: Lead; x?: number; z?: number; yaw?: number;
  /**
   * false (default): the controller moves the root itself, one step at a time.
   * true: gameplay moves the root and the feet keep up with it.
   */
  external?: boolean;
  listener?: (event: FootworkEvent) => void;
}

const rad = (degrees: number) => degrees * Math.PI / 180;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const t = clamp01(value); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const HIP_KEYS = ['x', 'y', 'z', 'yaw', 'pitch', 'roll'] as const;

/** Root speed above which an externally driven body starts stepping. */
const FOLLOW_SPEED = 0.2;
/** A step that could not cover at least this much ground is not taken at all. */
const MIN_STEP = 0.03;

export function createFootwork(options: FootworkOptions = {}) {
  const listener = options.listener, external = options.external ?? false;
  let s = initial(options.stance ?? 'engarde', options.lead ?? 1, options.x ?? 0, options.z ?? 0, options.yaw ?? 0);

  function initial(stanceId: string, lead: Lead, x: number, z: number, yaw: number): FootworkState {
    const stance = stanceById(stanceId), root = { x, z, yaw };
    const foot = (index: 0 | 1): FootState => {
      const home = footHome(stance, lead, roleOf(index, lead)), world = toWorld(root, home);
      return { x: world.x, z: world.z, yaw: yaw + home.yaw, lift: 0, pitch: 0, planted: true, rollFrom: 0, rollTime: 0, rollDuration: 0 };
    };
    const hips = hipsHome(stance, lead);
    return {
      time: 0, root, rootVelX: 0, rootVelZ: 0, glideX: 0, glideZ: 0, stance: stance.id, lead, pose: 'guard', depth: 0,
      feet: [foot(0), foot(1)], hips: { ...hips }, hipsVel: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0 }, hipsTarget: { ...hips },
      move: null, queue: null, intent: null, idle: 0, last: null,
    };
  }

  function toWorld(root: { x: number; z: number; yaw: number }, local: Point): Point {
    const c = Math.cos(root.yaw), sn = Math.sin(root.yaw);
    return { x: root.x + c * local.x + sn * local.z, z: root.z - sn * local.x + c * local.z };
  }
  function toLocal(root: { x: number; z: number; yaw: number }, world: Point): Point {
    const c = Math.cos(root.yaw), sn = Math.sin(root.yaw), dx = world.x - root.x, dz = world.z - root.z;
    return { x: c * dx - sn * dz, z: sn * dx + c * dz };
  }
  const forward = () => ({ x: -Math.sin(s.root.yaw), z: -Math.cos(s.root.yaw) });
  const glideReach = () => TUNING.glideHalfLife / Math.LN2;

  /** Where the root will be when the current move (and any leftover glide) has finished. */
  function predictedRoot(ahead?: Point) {
    const move = s.move;
    if (move?.external) {
      const left = Math.max(0, move.duration - move.t);
      return { x: s.root.x + (ahead?.x ?? s.rootVelX * left), z: s.root.z + (ahead?.z ?? s.rootVelZ * left), yaw: s.root.yaw };
    }
    const reach = glideReach();
    return { x: s.root.x + (move ? move.remX : 0) + s.glideX * reach, z: s.root.z + (move ? move.remZ : 0) + s.glideZ * reach, yaw: s.root.yaw };
  }

  function blankMove(kind: MoveKind, name: string, duration: number): Move {
    return {
      kind, name, t: 0, duration, remX: 0, remZ: 0, speed: 0, travelStart: 0, travelEnd: 1, cruise: 0, endSpeed: 0,
      flow: false, dirX: 0, dirZ: 0, blocked: false, external, swings: [],
      endStance: s.stance, endLead: s.lead, endPose: 'guard', depth: 0,
      hipsFrom: { ...s.hipsTarget }, hipStart: 0, hipEnd: 1, hipHalfLife: TUNING.hipHalfLife, peakSpeed: 0, travelled: 0,
    };
  }
  /** Give a move its root travel: a world-space displacement spread over a slice of the move. */
  function travel(move: Move, x: number, z: number, start = 0, end = 1) {
    move.remX = x; move.remZ = z; move.travelStart = start; move.travelEnd = end;
    move.cruise = Math.hypot(x, z) / Math.max(1e-6, (end - start) * move.duration);
  }
  function swing(foot: 0 | 1, role: Role, start: number, end: number, apex: number, landOn: LandOn, swingPitch = 0, push = 0, bulge = 0): Swing {
    return { foot, role, start, end, apex, landOn, swingPitch, push, bulge, active: false, done: false, fromX: 0, fromZ: 0, fromYaw: 0, fromLift: 0, fromPitch: 0 };
  }

  /** Start a move, carrying over whatever speed the body already has. */
  function begin(move: Move) {
    const length = Math.hypot(move.remX, move.remZ);
    if (move.external) { s.glideX = 0; s.glideZ = 0; }
    else if (length > 1e-4 && move.travelStart <= 0) {
      // Speed already going the right way becomes the start of this move; the rest dies away.
      const dx = move.remX / length, dz = move.remZ / length;
      move.speed = Math.min(Math.max(0, s.rootVelX * dx + s.rootVelZ * dz), 2.5 * move.cruise);
      s.glideX = s.rootVelX - dx * move.speed; s.glideZ = s.rootVelZ - dz * move.speed;
    } else { s.glideX = s.rootVelX; s.glideZ = s.rootVelZ; }
    move.hipsFrom = { ...s.hipsTarget };
    s.move = move; s.idle = 0;
  }

  function planStep(direction: Point): Move {
    const stance = stanceById(s.stance), size = Math.hypot(direction.x, direction.z) || 1;
    const dir = { x: direction.x / size, z: direction.z / size };
    const along = Math.abs(dir.z);
    const move = blankMove('step', dir.z < -0.5 ? 'Advance' : dir.z > 0.5 ? 'Retreat' : dir.x > 0 ? 'Step right' : 'Step left', mix(stance.step.sideDuration, stance.step.duration, along));
    const length = mix(stance.step.side, stance.step.length, along);
    const world = toWorld({ x: 0, z: 0, yaw: s.root.yaw }, dir);
    travel(move, world.x * length, world.z * length);
    move.flow = true; move.dirX = dir.x; move.dirZ = dir.z;
    // The foot that is already farther along the direction of travel opens the
    // space; the other follows. Forward that is the lead foot, backward the rear.
    const homes = ([0, 1] as const).map(foot => footHome(stance, s.lead, roleOf(foot, s.lead)));
    const first: 0 | 1 = homes[0].x * dir.x + homes[0].z * dir.z > homes[1].x * dir.x + homes[1].z * dir.z ? 0 : 1;
    ([first, first === 0 ? 1 : 0] as const).forEach((foot, order) => {
      const home = homes[foot];
      // How much the foot travels toward its own toes decides how it lands.
      const toward = -Math.sin(home.yaw) * dir.x - Math.cos(home.yaw) * dir.z;
      const start = order === 0 ? 0 : 0.52 * move.duration, end = order === 0 ? 0.48 * move.duration : move.duration;
      const apex = stance.step.lift * (order === 0 ? 1 : 0.75);
      if (toward > 0.4) move.swings.push(swing(foot, roleOf(foot, s.lead), start, end, apex, 'heel', rad(13) * toward, order === 1 ? rad(14) : 0));
      else if (toward < -0.4) move.swings.push(swing(foot, roleOf(foot, s.lead), start, end, apex, 'ball', rad(-10)));
      else move.swings.push(swing(foot, roleOf(foot, s.lead), start, end, apex, 'flat', 0, order === 1 ? rad(8) : 0));
    });
    return move;
  }

  /** A passing step: one foot passes the other and the lead changes side. */
  function planPass(ahead: boolean): Move {
    const stance = stanceById(s.stance), move = blankMove('pass', ahead ? 'Pass forward' : 'Pass back', stance.step.duration * 1.35);
    const length = stance.lead.forward - stance.rear.forward, f = forward(), sign = ahead ? 1 : -1;
    travel(move, f.x * length * sign, f.z * length * sign);
    move.endLead = (s.lead === 1 ? -1 : 1);
    const passing = footFor(ahead ? 'rear' : 'lead', s.lead), standing = passing === 0 ? 1 : 0;
    move.swings.push(swing(passing, ahead ? 'lead' : 'rear', 0, 0.6 * move.duration, stance.step.lift * 1.2, ahead ? 'heel' : 'ball', ahead ? rad(12) : rad(-10), 0, 0.04));
    move.swings.push(swing(standing, ahead ? 'rear' : 'lead', 0.62 * move.duration, move.duration, 0.012, 'flat'));
    return move;
  }

  function planLunge(depth: number, duration = LUNGE.duration): Move {
    const stance = stanceById(s.stance), move = blankMove('lunge', depth > 0.75 ? 'Lunge' : depth > 0.25 ? 'Half lunge' : 'Thrust step', duration);
    const f = forward(), length = Math.min(LUNGE.travel * depth, lungeReach(stance));
    move.depth = clamp01(depth); move.endPose = 'lunge';
    travel(move, f.x * length, f.z * length, LUNGE.travelStart, LUNGE.travelEnd);
    move.hipStart = 0.05; move.hipEnd = 0.8;
    // Only the lead foot leaves the floor; the rear foot stays flat where it is.
    move.swings.push(swing(footFor('lead', s.lead), 'lead', LUNGE.liftAt * move.duration, LUNGE.landAt * move.duration, LUNGE.apex * (0.5 + 0.5 * move.depth), 'heel', rad(LUNGE.toeUp) * (0.5 + 0.5 * move.depth)));
    return move;
  }

  /** Return from a lunge to guard, forward (gather the rear foot up) or backward (push off the lead foot). */
  function planRecover(ahead: boolean): Move {
    // When gameplay owns the root there is nowhere to travel: both feet come in under the body.
    if (external) { s.pose = 'guard'; s.depth = 0; const move = planReplant('settle', LUNGE.recoverForward); move.name = 'Recover'; move.kind = 'recover'; return move; }
    const stance = stanceById(s.stance), f = forward();
    const move = blankMove('recover', ahead ? 'Recover forward' : 'Recover back', ahead ? LUNGE.recoverForward : LUNGE.recoverBackward);
    const lead = footFor('lead', s.lead), rear = footFor('rear', s.lead);
    // Travel exactly far enough that the foot staying on the floor ends up where the guard wants it.
    const keep = s.feet[ahead ? lead : rear], home = ahead ? stance.lead.forward : stance.rear.forward;
    const gap = (keep.x - s.root.x) * f.x + (keep.z - s.root.z) * f.z - home;
    const length = ahead ? Math.max(0, gap) : Math.min(0, gap);
    travel(move, f.x * length, f.z * length, 0.05, 0.9);
    move.hipEnd = 0.9;
    if (ahead) move.swings.push(swing(rear, 'rear', 0.08 * move.duration, 0.82 * move.duration, stance.step.lift, 'flat', rad(-6), rad(16)));
    else move.swings.push(swing(lead, 'lead', 0.1 * move.duration, 0.85 * move.duration, stance.step.lift, 'ball', rad(-8)));
    return move;
  }

  /**
   * Re-place whichever feet are not where the current guard wants them. Used
   * both for the fast guard that interrupts a move and for the unhurried
   * settling of a foot that has ended up out of place.
   */
  function planReplant(kind: 'guard' | 'settle', duration: number): Move {
    const stance = stanceById(s.stance), move = blankMove(kind, kind === 'guard' ? `Guard · ${stance.name}` : 'Settle', duration);
    const fast = kind === 'guard', reach = fast ? glideReach() : 0;
    const root = { x: s.root.x + s.rootVelX * reach, z: s.root.z + s.rootVelZ * reach, yaw: s.root.yaw };
    const needs = ([0, 1] as const).map(foot => {
      const home = footHome(stance, s.lead, roleOf(foot, s.lead)), world = toWorld(root, home), state = s.feet[foot];
      const distance = Math.hypot(world.x - state.x, world.z - state.z), turn = Math.abs(wrap(root.yaw + home.yaw - state.yaw));
      const airborne = !state.planted || state.lift > 0.001;
      return { foot, distance, airborne, move: airborne || distance > (fast ? 0.012 : TUNING.settleDistance) || turn > (fast ? 0.05 : 0.25) };
    }).filter(entry => entry.move).sort((a, b) => Number(b.airborne) - Number(a.airborne) || b.distance - a.distance);
    needs.forEach((entry, order) => {
      // Two feet overlap slightly when the guard is urgent: a quick hop into place.
      const start = needs.length === 1 || order === 0 ? 0 : fast ? 0.44 : 0.5, end = needs.length === 1 ? 1 : order === 0 ? (fast ? 0.56 : 0.5) : 1;
      move.swings.push(swing(entry.foot, roleOf(entry.foot, s.lead), start * duration, end * duration, Math.max(0.012, Math.min(0.05, entry.distance * 0.25)), 'flat'));
    });
    if (fast) { move.hipHalfLife = Math.max(0.012, duration * 0.2); move.hipEnd = 0.001; }
    return move;
  }

  function run(command: Command) {
    if (s.pose === 'lunge') {
      // A lunge has to be recovered first; the request picks the direction.
      if (command.type === 'recover') { begin(planRecover(command.forward)); return; }
      const back = command.type === 'step' && command.z > 0.5;
      begin(planRecover(!back));
      // An advance or retreat is answered by the recovery itself.
      if (!(command.type === 'step' && Math.abs(command.z) > 0.5)) s.queue = command;
      return;
    }
    if (command.type === 'step') begin(planStep(command));
    else if (command.type === 'pass') begin(planPass(command.forward));
    else if (command.type === 'lunge') begin(planLunge(command.depth, command.duration));
  }

  function plant(foot: FootState, index: 0 | 1, landOn: LandOn, kind: MoveKind) {
    foot.lift = 0; foot.planted = true;
    foot.rollFrom = foot.pitch; foot.rollTime = 0; foot.rollDuration = Math.abs(foot.pitch) > 1e-4 ? TUNING.rollTime : 0;
    listener?.({ type: 'plant', foot: index, time: s.time, landOn, move: kind });
  }

  function finish(move: Move) {
    for (const item of move.swings) if (!item.done) { item.done = true; item.active = false; plant(s.feet[item.foot], item.foot, item.landOn, move.kind); }
    s.stance = move.endStance; s.lead = move.endLead; s.pose = move.endPose; s.depth = move.depth;
    s.last = { name: move.name, kind: move.kind, duration: move.duration, travelled: move.travelled, peakSpeed: move.peakSpeed, blocked: move.blocked };
    s.move = null; s.idle = 0;
    const next = s.queue; s.queue = null;
    if (next) run(next);
    else if (s.intent && s.pose === 'guard' && !external) begin(planStep(s.intent));
  }

  /** Move the root for `dt`: the current move's travel plus any leftover glide, through collision. */
  function moveRoot(dt: number, env: StepEnvironment) {
    const move = s.move, here = { x: s.root.x, z: s.root.z };
    let stepX = 0, stepZ = 0;
    if (move) {
      let distance = Math.hypot(move.remX, move.remZ);
      if (distance > 1e-9 && env.collide) {
        // Look ahead: if the rest of the travel will not fit, shorten it now so the feet aim for where the body can really get to.
        const possible = env.collide(here, { x: move.remX, z: move.remZ });
        if (Math.hypot(possible.x - move.remX, possible.z - move.remZ) > 1e-6) {
          move.remX = possible.x; move.remZ = possible.z; move.blocked = true; distance = Math.hypot(possible.x, possible.z);
        }
      }
      const opens = move.travelStart * move.duration, closes = move.travelEnd * move.duration;
      const from = Math.max(move.t, opens), to = Math.min(move.t + dt, closes);
      if (distance <= 1e-9) move.speed = 0;
      else if (to > from) {
        // A cubic from the current speed to the finishing speed, re-planned every
        // time: the finishing speed or the distance can change without a jolt.
        const left = closes - from, k = Math.min(1, (to - from) / left), done = k >= 1 - 1e-9;
        const c1 = move.speed * left, c2 = 3 * distance - 2 * c1 - move.endSpeed * left, c3 = -2 * distance + c1 + move.endSpeed * left;
        const covered = done ? distance : Math.max(0, Math.min(distance, c1 * k + c2 * k * k + c3 * k * k * k));
        move.speed = done ? move.endSpeed : Math.max(0, (c1 + 2 * c2 * k + 3 * c3 * k * k) / left);
        stepX = move.remX / distance * covered; stepZ = move.remZ / distance * covered;
        move.remX -= stepX; move.remZ -= stepZ;
        if (done) { move.remX = 0; move.remZ = 0; }
      }
    }
    const reach = glideReach(), decay = Math.exp(-dt / reach);
    const wantX = stepX + s.glideX * reach * (1 - decay), wantZ = stepZ + s.glideZ * reach * (1 - decay);
    s.glideX *= decay; s.glideZ *= decay;
    if (Math.hypot(s.glideX, s.glideZ) < 1e-4) { s.glideX = 0; s.glideZ = 0; }
    const actual = env.collide ? env.collide(here, { x: wantX, z: wantZ }) : { x: wantX, z: wantZ };
    const wanted = Math.hypot(wantX, wantZ);
    if (wanted > 1e-9 && actual.x * wantX + actual.z * wantZ < 0.5 * wanted * wanted) {
      // Something is in the way after all. Give up the rest of the travel; the
      // feet re-aim at where the body actually stopped.
      s.glideX = 0; s.glideZ = 0;
      if (move) { move.remX = 0; move.remZ = 0; move.speed = 0; move.endSpeed = 0; move.blocked = true; }
    }
    s.root.x += actual.x; s.root.z += actual.z;
    s.rootVelX = actual.x / dt; s.rootVelZ = actual.z / dt;
    if (move) { move.travelled += Math.hypot(actual.x, actual.z); if (dt > 1e-4) move.peakSpeed = Math.max(move.peakSpeed, Math.hypot(actual.x, actual.z) / dt); }
  }

  function moveFeet(dt: number, env: StepEnvironment) {
    const move = s.move;
    for (const foot of s.feet) if (foot.planted && foot.rollDuration > 0) {
      foot.rollTime += dt;
      const k = smooth(foot.rollTime / foot.rollDuration);
      foot.pitch = foot.rollFrom * (1 - k);
      if (k >= 1) { foot.rollDuration = 0; foot.pitch = 0; }
    }
    if (!move) return;
    const root = predictedRoot(env.external?.ahead), stance = stanceById(move.endStance);
    for (const item of move.swings) {
      if (item.done) continue;
      const foot = s.feet[item.foot];
      if (!item.active) {
        if (move.t >= item.start) {
          item.active = true; item.fromX = foot.x; item.fromZ = foot.z; item.fromYaw = foot.yaw; item.fromLift = foot.lift; item.fromPitch = foot.pitch;
          foot.planted = false; foot.rollDuration = 0;
          listener?.({ type: 'lift', foot: item.foot, time: s.time, move: move.kind });
        } else if (item.push > 0 && foot.planted && move.t >= item.start - TUNING.pushTime) {
          // Heel rises on the ball of the foot just before it leaves.
          foot.rollDuration = 0; foot.pitch = -item.push * smooth((move.t - (item.start - TUNING.pushTime)) / TUNING.pushTime);
        }
      }
      if (!item.active) continue;
      const u = clamp01((move.t - item.start) / (item.end - item.start)), eased = smooth(u);
      const home = footHome(stance, move.endLead, item.role, move.endPose, move.depth), target = toWorld(root, home);
      const side = item.foot === 0 ? -1 : 1, bow = item.bulge * Math.sin(Math.PI * u) * side;
      foot.x = mix(item.fromX, target.x, eased) + Math.cos(s.root.yaw) * bow;
      foot.z = mix(item.fromZ, target.z, eased) - Math.sin(s.root.yaw) * bow;
      foot.yaw = item.fromYaw + wrap(root.yaw + home.yaw - item.fromYaw) * eased;
      foot.lift = item.fromLift * (1 - eased) + Math.max(0, item.apex - item.fromLift * 0.5) * Math.sin(Math.PI * u) ** 1.2;
      foot.pitch = mix(item.fromPitch, item.swingPitch, smooth(u / 0.35));
      if (u >= 1) { item.active = false; item.done = true; foot.x = target.x; foot.z = target.z; foot.yaw = root.yaw + home.yaw; plant(foot, item.foot, item.landOn, move.kind); }
    }
  }

  function hipsTarget(): Hips {
    const move = s.move;
    if (!move) {
      const home = hipsHome(stanceById(s.stance), s.lead, s.pose, s.depth);
      if (s.pose === 'guard') home.y += TUNING.breath * Math.sin(s.time * 1.8);
      return home;
    }
    const stance = stanceById(move.endStance), end = hipsHome(stance, move.endLead, move.endPose, move.depth);
    const k = smooth((move.t / move.duration - move.hipStart) / Math.max(1e-4, move.hipEnd - move.hipStart));
    const target = {} as Hips;
    for (const key of HIP_KEYS) target[key] = mix(move.hipsFrom[key], end[key], k);
    // Weight goes over the foot that is on the floor while the other is in the air.
    // A guard snap skips this: there is no time for the hips to sway and come back.
    for (const item of move.swings) {
      if (!item.active || move.kind === 'guard') continue;
      const support = s.feet[item.foot === 0 ? 1 : 0];
      if (!support.planted) continue;
      const local = toLocal(s.root, support), dx = local.x - target.x, dz = local.z - target.z, distance = Math.hypot(dx, dz);
      const weight = Math.sin(Math.PI * clamp01((move.t - item.start) / (item.end - item.start)));
      if (distance > 1e-4) { target.x += dx / distance * stance.step.weightShift * weight; target.z += dz / distance * stance.step.weightShift * weight; }
    }
    return target;
  }

  /** Critically damped follow: quick, with no overshoot, and independent of tick length. */
  function follow(dt: number, halfLife: number) {
    const y = 2 * Math.LN2 / Math.max(1e-4, halfLife), decay = Math.exp(-y * dt);
    for (const key of HIP_KEYS) {
      const offset = s.hips[key] - s.hipsTarget[key], carry = s.hipsVel[key] + offset * y;
      s.hips[key] = decay * (offset + carry * dt) + s.hipsTarget[key];
      s.hipsVel[key] = decay * (s.hipsVel[key] - carry * y * dt);
    }
  }

  /** Nothing is in progress: start a held step, follow a moving body, recover a held lunge, or tidy the feet. */
  function whenIdle(dt: number, walled: boolean) {
    s.idle += dt;
    if (s.pose !== 'guard') {
      if (TUNING.autoRecover > 0 && s.idle >= TUNING.autoRecover) begin(planRecover(true));
      return;
    }
    const speed = Math.hypot(s.rootVelX, s.rootVelZ);
    if (external) { if (speed > FOLLOW_SPEED) begin(planStep(toLocal({ x: 0, z: 0, yaw: s.root.yaw }, { x: s.rootVelX, z: s.rootVelZ }))); }
    else if (s.intent && !walled) begin(planStep(s.intent));
    if (s.move) return;
    // Standing still with a foot out of place: put it back where the guard wants it.
    if (s.idle > 0.05 && speed <= FOLLOW_SPEED) {
      const settle = planReplant('settle', 0.3);
      if (settle.swings.length === 1) { settle.duration = 0.2; settle.swings[0].end = 0.2; }
      if (settle.swings.length) begin(settle);
    }
  }

  return {
    get state() { return s; },
    get stance() { return stanceById(s.stance); },
    get busy() { return !!s.move; },
    /** True when gameplay owns the root. */
    external,

    /** Direction currently held, in the root frame (x right, z back), or null. Steps repeat while it is held. */
    setIntent(direction: Point | null) {
      s.intent = direction && Math.hypot(direction.x, direction.z) > 0.01 ? { x: direction.x, z: direction.z } : null;
    },
    /** Ask for a move. It starts now if nothing is running, otherwise when the current move ends. */
    request(command: Command) {
      if (s.move) { s.queue = command; return false; }
      run(command); return true;
    },
    step(x: number, z: number) { return this.request({ type: 'step', x, z }); },
    pass(ahead = true) { return this.request({ type: 'pass', forward: ahead }); },
    lunge(depth = 1, duration?: number) { return this.request({ type: 'lunge', depth, duration }); },
    recover(ahead = true) { return this.request({ type: 'recover', forward: ahead }); },

    /**
     * Take a guard now. Whatever is happening stops; the feet go to the guard
     * from wherever they are and the hips follow, in `time` seconds.
     */
    guard(stanceId?: string, opts: { time?: number; lead?: Lead } = {}) {
      if (stanceId) s.stance = stanceById(stanceId).id;
      if (opts.lead) s.lead = opts.lead;
      else if (s.move && s.move.endLead !== s.lead) {
        // Caught in the middle of a passing step: lead with whichever foot is nearer to leading already.
        const stance = stanceById(s.stance), reach = glideReach();
        const root = { x: s.root.x + s.rootVelX * reach, z: s.root.z + s.rootVelZ * reach, yaw: s.root.yaw };
        const cost = (lead: Lead) => ([0, 1] as const).reduce<number>((sum, foot) => {
          const home = toWorld(root, footHome(stance, lead, roleOf(foot, lead)));
          return sum + Math.hypot(home.x - s.feet[foot].x, home.z - s.feet[foot].z);
        }, 0);
        if (cost(s.move.endLead) < cost(s.lead)) s.lead = s.move.endLead;
      }
      s.pose = 'guard'; s.depth = 0; s.queue = null;
      begin(planReplant('guard', Math.max(0.03, opts.time ?? TUNING.guardTime)));
    },

    /** Put the body somewhere else, standing in guard, with nothing in progress. */
    place(x: number, z: number, yaw: number, stanceId = s.stance, lead: Lead = s.lead) {
      const time = s.time; s = initial(stanceId, lead, x, z, yaw); s.time = time;
    },
    /** Turn the body on the spot (when the controller owns the root). The feet re-place themselves afterwards. */
    face(yaw: number) { s.root.yaw = yaw; },

    /** Advance the simulation. Call exactly once per tick. */
    advance(dt: number, env: StepEnvironment = {}) {
      if (dt <= 0) return;
      if (external && !env.external) throw new Error('This footwork controller follows gameplay: pass env.external every tick.');
      const beforeX = s.rootVelX, beforeZ = s.rootVelZ, startX = s.root.x, startZ = s.root.z;
      if (env.external) {
        const dx = env.external.x - s.root.x, dz = env.external.z - s.root.z;
        s.root.x = env.external.x; s.root.z = env.external.z; s.root.yaw = env.external.yaw;
        s.rootVelX = dx / dt; s.rootVelZ = dz / dt; s.glideX = 0; s.glideZ = 0;
        if (s.move) { s.move.travelled += Math.hypot(dx, dz); s.move.peakSpeed = Math.max(s.move.peakSpeed, Math.hypot(dx, dz) / dt); }
      }
      // A move can end partway through a tick. The rest of the tick goes to
      // whatever follows it, so chained steps keep their speed across the join.
      let left = dt, walled = false;
      for (let pass = 0; pass < 8 && left > 1e-12; pass++) {
        let move = s.move;
        if (move && move.kind === 'step' && move.t <= 0 && !move.external && env.collide) {
          // Do not shuffle on the spot against a wall.
          const possible = env.collide({ x: s.root.x, z: s.root.z }, { x: move.remX, z: move.remZ });
          if (Math.hypot(possible.x, possible.z) < MIN_STEP) { s.move = null; move = null; walled = true; }
        }
        if (move?.flow && !move.external) {
          // While the same direction is held the step ends at speed and the next one picks it up.
          // Letting go, or asking for something else, brings this step to a stop instead.
          const held = !!s.intent && !s.queue && (s.intent.x * move.dirX + s.intent.z * move.dirZ) / Math.hypot(s.intent.x, s.intent.z) > 0.7;
          move.endSpeed = held ? TUNING.chainFlow * move.cruise : 0;
        }
        const slice = move ? Math.min(left, Math.max(0, move.duration - move.t)) : left;
        if (slice > 0) {
          if (!env.external) moveRoot(slice, env);
          if (move) move.t += slice;
          moveFeet(slice, env);
          s.hipsTarget = hipsTarget();
          follow(slice, move ? move.hipHalfLife : TUNING.hipHalfLife);
          s.time += slice; left -= slice;
        }
        if (move) { if (move.t >= move.duration - 1e-9) finish(move); }
        else whenIdle(slice, walled);
      }
      if (!env.external) { s.rootVelX = (s.root.x - startX) / dt; s.rootVelZ = (s.root.z - startZ) / dt; }
      // The hips have inertia: when the body is stopped or shoved harder than the legs
      // could manage, the hips carry on for a moment and the hip spring settles them.
      const changeX = s.rootVelX - beforeX, changeZ = s.rootVelZ - beforeZ, change = Math.hypot(changeX, changeZ), limit = TUNING.hipInertia * dt;
      if (change > limit) {
        const local = toLocal({ x: 0, z: 0, yaw: s.root.yaw }, { x: changeX, z: changeZ }), excess = (change - limit) / change;
        s.hipsVel.x -= local.x * excess; s.hipsVel.z -= local.z * excess;
      }
    },

    /** The current pose as constraints in the root frame. Pure: reads state, changes nothing. */
    pose(): LowerBodyPose {
      const foot = (index: 0 | 1) => {
        const state = s.feet[index], local = toLocal(s.root, state);
        return { x: local.x, z: local.z, lift: state.lift, yaw: wrap(state.yaw - s.root.yaw), pitch: state.pitch };
      };
      return { pelvis: { ...s.hips }, feet: [foot(0), foot(1)] };
    },

    /** Where the current guard wants each foot, in world space. */
    homes() {
      const stance = stanceById(s.stance);
      return ([0, 1] as const).map(index => {
        const home = footHome(stance, s.lead, roleOf(index, s.lead), s.pose, s.depth), world = toWorld(s.root, home);
        return { x: world.x, z: world.z, yaw: s.root.yaw + home.yaw };
      });
    },

    snapshot(): FootworkState { return structuredClone(s); },
    restore(state: FootworkState) { s = structuredClone(state); },
    reset(stanceId = s.stance, lead: Lead = s.lead, x = 0, z = 0, yaw = 0) { s = initial(stanceId, lead, x, z, yaw); },
  };
}

export type Footwork = ReturnType<typeof createFootwork>;
