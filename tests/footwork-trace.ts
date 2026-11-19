import { solveLowerBody } from '../src/footwork/legs.ts';
import type { Footwork, StepEnvironment } from '../src/footwork/controller.ts';

/** Shared measuring loop for the footwork tests and the report tool. Not a test file itself. */
export const DT = 1 / 60;

export interface Trace {
  ticks: number; seconds: number; travelled: number; peakSpeed: number;
  /** Worst leg extension (1 = straight), knee-to-toe angle on planted feet, and ankle miss. */
  maxExtension: number; maxKneeOff: number; maxMiss: number; maxShift: number; minHip: number;
  /** Farthest any planted boot moved while planted, and ticks with neither foot on the floor. */
  plantedDrift: number; bothAirborne: number;
  /** Largest single-tick movement of the pelvis, a knee or an ankle, and largest single-tick change in root speed. */
  maxJointStep: number; maxSpeedStep: number;
  finite: boolean;
}

export function run(fw: Footwork, until: (tick: number) => boolean, options: { limit?: number; dt?: number; env?: (tick: number) => StepEnvironment; each?: (tick: number) => void } = {}): Trace {
  const dt = options.dt ?? DT;
  const trace: Trace = { ticks: 0, seconds: 0, travelled: 0, peakSpeed: 0, maxExtension: 0, maxKneeOff: 0, maxMiss: 0, maxShift: 0, minHip: 9, plantedDrift: 0, bothAirborne: 0, maxJointStep: 0, maxSpeedStep: 0, finite: true };
  const anchor: ({ x: number; z: number } | null)[] = [null, null];
  let previous: { x: number; y: number; z: number }[] | null = null;
  let speed = Math.hypot(fw.state.rootVelX, fw.state.rootVelZ);
  const start = { ...fw.state.root };
  for (let tick = 0; tick < (options.limit ?? 1200) && !until(tick); tick++) {
    fw.advance(dt, options.env?.(tick));
    const s = fw.state, solution = solveLowerBody(fw.pose()), c = Math.cos(s.root.yaw), sn = Math.sin(s.root.yaw);
    const world = (p: { x: number; y: number; z: number }) => ({ x: s.root.x + c * p.x + sn * p.z, y: p.y, z: s.root.z - sn * p.x + c * p.z });
    const joints = [world(solution.pelvisPosition), ...solution.legs.flatMap(leg => [world(leg.knee), world(leg.ankle)])];
    for (const joint of joints) if (!Number.isFinite(joint.x + joint.y + joint.z)) trace.finite = false;
    if (previous) joints.forEach((joint, i) => { trace.maxJointStep = Math.max(trace.maxJointStep, Math.hypot(joint.x - previous![i].x, joint.y - previous![i].y, joint.z - previous![i].z)); });
    previous = joints;
    solution.legs.forEach((leg, i) => {
      trace.maxExtension = Math.max(trace.maxExtension, leg.extension); trace.maxMiss = Math.max(trace.maxMiss, leg.miss);
      const foot = s.feet[i];
      if (foot.planted) {
        trace.maxKneeOff = Math.max(trace.maxKneeOff, leg.kneeToToes);
        if (!anchor[i]) anchor[i] = { x: foot.x, z: foot.z };
        trace.plantedDrift = Math.max(trace.plantedDrift, Math.hypot(foot.x - anchor[i]!.x, foot.z - anchor[i]!.z));
      } else anchor[i] = null;
    });
    if (!s.feet[0].planted && !s.feet[1].planted) trace.bothAirborne++;
    trace.maxShift = Math.max(trace.maxShift, solution.shift); trace.minHip = Math.min(trace.minHip, solution.pelvisPosition.y);
    const now = Math.hypot(s.rootVelX, s.rootVelZ);
    trace.peakSpeed = Math.max(trace.peakSpeed, now); trace.maxSpeedStep = Math.max(trace.maxSpeedStep, Math.abs(now - speed)); speed = now;
    trace.ticks++; options.each?.(tick);
  }
  trace.seconds = trace.ticks * dt;
  trace.travelled = Math.hypot(fw.state.root.x - start.x, fw.state.root.z - start.z);
  return trace;
}

/** How far each foot and the hips are from where the current guard wants them. */
export function guardError(fw: Footwork) {
  const s = fw.state, homes = fw.homes();
  const turn = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  /** Metres from home, plus heading error (radians) counted at a tenth, plus any height off the floor. */
  const feet = Math.max(...s.feet.map((foot, i) => Math.hypot(foot.x - homes[i].x, foot.z - homes[i].z) + turn(foot.yaw, homes[i].yaw) * 0.1 + foot.lift));
  const hips = Math.hypot(s.hips.x - s.hipsTarget.x, s.hips.y - s.hipsTarget.y, s.hips.z - s.hipsTarget.z);
  return { feet, hips, roll: Math.max(...s.feet.map(foot => Math.abs(foot.pitch))), planted: s.feet[0].planted && s.feet[1].planted };
}
