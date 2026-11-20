/**
 * Guards and footwork timings as plain data.
 *
 * A guard says where the two feet and the hips sit, not what the joints do.
 * Distances are metres, angles degrees, times seconds. Everything is written
 * for "lead" and "rear" feet, so the same guard works with either foot in
 * front. These are starting values meant to be tuned by eye in the bench
 * (npm run footwork:dev) and pasted back here.
 *
 * Where a number comes from measurement it says so; the rest are estimates.
 */
import { LEG_RIG } from './legs.ts';
import type { LowerBodyPose } from './legs.ts';

export interface FootPlace {
  /** Ahead of the stance origin, toward the opponent. Negative is behind. */
  forward: number;
  /** Away from the centre line, toward that foot's own side. */
  out: number;
  /** Toes rotated outward, away from the body's midline. */
  turnout: number;
}

export interface StepTiming {
  /** Ground covered by one advance or retreat, and how long it takes. */
  length: number; duration: number;
  /** The same for a step to the side. */
  side: number; sideDuration: number;
  /** How high the stepping foot clears the floor. */
  lift: number;
  /** How far the hips move over the supporting foot while the other is in the air. */
  weightShift: number;
}

export interface StanceDef {
  id: string; name: string; summary: string;
  /** Hip-joint height above the floor. Standing straight is 0.94. */
  hipHeight: number;
  /** Hips ahead of the stance origin, and toward the lead side. */
  hipForward: number; hipToLead: number;
  /** Pelvis: lead hip turned toward the opponent, forward lean, lead hip raised. */
  hipTurn: number; hipLean: number; hipTilt: number;
  lead: FootPlace; rear: FootPlace;
  step: StepTiming;
}

export const STANCES: StanceDef[] = [
  {
    id: 'engarde', name: 'En garde',
    summary: 'Sport-fencing guard. Narrow, profiled, quick even steps.',
    // Feet about two foot-lengths apart heel to heel, rear foot near 90°
    // (historical manuals and Gresham-Fiegel 2013, via Chen 2017).
    hipHeight: 0.82, hipForward: 0.03, hipToLead: 0, hipTurn: 32, hipLean: 4, hipTilt: 0,
    lead: { forward: 0.27, out: 0.07, turnout: 4 },
    rear: { forward: -0.23, out: 0.08, turnout: 82 },
    // 0.46 m advance: Chida 2023 measured 46.3 ± 2.0 cm. Duration is an estimate.
    step: { length: 0.46, duration: 0.4, side: 0.26, sideDuration: 0.36, lift: 0.045, weightShift: 0.025 },
  },
  {
    id: 'low', name: 'Low guard',
    summary: 'Wide and deep. Shorter, slower steps with a long weight shift.',
    hipHeight: 0.72, hipForward: 0, hipToLead: 0, hipTurn: 20, hipLean: 8, hipTilt: 0,
    lead: { forward: 0.34, out: 0.13, turnout: 8 },
    rear: { forward: -0.32, out: 0.14, turnout: 55 },
    step: { length: 0.36, duration: 0.52, side: 0.32, sideDuration: 0.5, lift: 0.035, weightShift: 0.05 },
  },
  {
    id: 'high', name: 'High guard',
    summary: 'Upright longsword guard. Feet shoulder-width, rear foot at 45°.',
    // Shoulder-width, back foot about 45°, knees slightly bent, weight centred (Grandy, myArmoury).
    hipHeight: 0.89, hipForward: 0.02, hipToLead: 0, hipTurn: 14, hipLean: 2, hipTilt: 0,
    lead: { forward: 0.2, out: 0.13, turnout: 6 },
    rear: { forward: -0.2, out: 0.15, turnout: 45 },
    step: { length: 0.5, duration: 0.44, side: 0.34, sideDuration: 0.4, lift: 0.05, weightShift: 0.03 },
  },
];

export const stanceById = (id: string) => STANCES.find(stance => stance.id === id) ?? STANCES[0];

/** +1 when the right foot leads, −1 when the left does. */
export type Lead = 1 | -1;
export type Role = 'lead' | 'rear';
export type PoseKind = 'guard' | 'lunge';
/** Pelvis placement in the root frame: metres and radians. */
export interface Hips { x: number; y: number; z: number; yaw: number; pitch: number; roll: number }

/**
 * The lunge. The rear foot stays where it is; the lead foot is thrown forward
 * and lands on the heel while the hips travel and sink.
 */
export const LUNGE = {
  /** Full hip travel. Equals the game's lunge cap (combat.ts lungeBudget). */
  travel: 0.42,
  /** Measured lunges take about 0.54 s (Gutiérrez-Dávila 2014). */
  duration: 0.5,
  /** The hips travel inside this slice of the lunge; peak speed lands near the middle, about 2 m/s at full travel. Measured peak body speed is 1.7–3.4 m/s. */
  travelStart: 0.12, travelEnd: 0.75,
  /** Lead foot: when it leaves and lands, how high it flies, how far the toes are raised. Coaching: toe up, heel about 5 cm off the floor. */
  liftAt: 0.05, landAt: 0.66, apex: 0.06, toeUp: 22,
  /** Final pose: hips low, lead foot ahead of the hips with the knee over the ankle. */
  hipHeight: 0.62, hipForward: 0.02, leadAhead: 0.44, hipTurn: 40, hipLean: 12,
  /** Recoveries. Forward gathers the rear foot up; backward pushes off the lead foot. */
  recoverForward: 0.42, recoverBackward: 0.46,
};

/** Values that shape transitions rather than poses. All are safe to change live. */
export const TUNING = {
  /** How long a guard takes to form when it interrupts something. */
  guardTime: 0.14,
  /** Speed carried from one step into the next when a direction is held (0 stops between steps). */
  chainFlow: 0.9,
  /** How quickly leftover body speed dies when a move is interrupted. */
  glideHalfLife: 0.03,
  /** Hip smoothing. Smaller is snappier. */
  hipHalfLife: 0.045,
  /** Body acceleration (m/s²) the hips follow rigidly. A harder stop or shove makes the hips carry on briefly and settle. */
  hipInertia: 9,
  /** Time for a landed heel or ball to roll flat, and for a heel to rise before the foot leaves. */
  rollTime: 0.09, pushTime: 0.07,
  /** Idle breathing: hip height variation in metres. */
  breath: 0.004,
  /** Seconds a lunge is held before recovering forward on its own; 0 holds until told. */
  autoRecover: 0,
  /** A planted foot farther than this from where the guard wants it gets re-placed. */
  settleDistance: 0.06,
};

const rad = (degrees: number) => degrees * Math.PI / 180;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Which rig foot (0 left, 1 right) plays a role for a given lead. */
export const footFor = (role: Role, lead: Lead): 0 | 1 => (role === 'lead') === (lead === 1) ? 1 : 0;
export const roleOf = (foot: 0 | 1, lead: Lead): Role => footFor('lead', lead) === foot ? 'lead' : 'rear';

/** Where a guard (or lunge) wants a foot, in the root frame. */
export function footHome(stance: StanceDef, lead: Lead, role: Role, pose: PoseKind = 'guard', depth = 0) {
  const place = role === 'lead' ? stance.lead : stance.rear;
  const forward = pose === 'lunge' && role === 'lead'
    ? mix(stance.lead.forward + 0.1, LUNGE.hipForward + LUNGE.leadAhead, depth) : place.forward;
  const side = role === 'lead' ? lead : -lead;
  return { x: side * place.out, z: -forward, yaw: -side * rad(place.turnout) };
}

/** Where a guard (or lunge) wants the hips, in the root frame. */
export function hipsHome(stance: StanceDef, lead: Lead, pose: PoseKind = 'guard', depth = 0): Hips {
  if (pose === 'lunge') return {
    x: lead * stance.hipToLead, y: mix(stance.hipHeight - 0.03, LUNGE.hipHeight, depth),
    z: -mix(stance.hipForward + 0.05, LUNGE.hipForward, depth),
    yaw: lead * rad(mix(stance.hipTurn, LUNGE.hipTurn, depth)), pitch: -rad(mix(stance.hipLean + 3, LUNGE.hipLean, depth)), roll: lead * rad(stance.hipTilt),
  };
  return { x: lead * stance.hipToLead, y: stance.hipHeight, z: -stance.hipForward, yaw: lead * rad(stance.hipTurn), pitch: -rad(stance.hipLean), roll: lead * rad(stance.hipTilt) };
}

/** Farthest the hips can travel in a lunge from this guard with the rear foot still planted and flat. */
export function lungeReach(stance: StanceDef) {
  const leg = (LEG_RIG.thigh + LEG_RIG.shin) * 0.998, drop = LUNGE.hipHeight - LEG_RIG.ankleHeight;
  return Math.max(0, Math.min(LUNGE.travel, Math.sqrt(leg * leg - drop * drop) + LUNGE.hipForward + stance.rear.forward - 0.005));
}

/** A stance as solver constraints: both feet flat at home and the hips where the stance wants them. */
export function stancePose(stance: StanceDef, lead: Lead, pose: PoseKind = 'guard', depth = 0): LowerBodyPose {
  const foot = (index: 0 | 1) => ({ ...footHome(stance, lead, roleOf(index, lead), pose, depth), lift: 0, pitch: 0 });
  return { pelvis: hipsHome(stance, lead, pose, depth), feet: [foot(0), foot(1)] };
}
