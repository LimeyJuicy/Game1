export interface Point { x: number; z: number }
export interface Obstacle { x: number; z: number; halfX: number; halfZ: number }

export const MOVEMENT = { walkSpeed: 4.2, sprintSpeed: 7.2, radius: 0.36 };

export interface Locomotion { speed: number; yaw: number; turnVelocity: number }
const approach = (value: number, target: number, amount: number) => value + Math.max(-amount, Math.min(amount, target - value));

/** Combat travel is independent of facing so strafing never turns away from a target. */
export function stepStrafe(velocity: Point, intent: Point, speed: number, dt: number): Point {
  const desired = { x: intent.x * speed, z: intent.z * speed };
  const dx = desired.x - velocity.x, dz = desired.z - velocity.z;
  const distance = Math.hypot(dx, dz);
  const limit = (Math.hypot(intent.x, intent.z) ? 11 : 15) * dt;
  const amount = distance ? Math.min(1, limit / distance) : 1;
  return { x: velocity.x + dx * amount, z: velocity.z + dz * amount };
}

export function faceTarget(yaw: number, position: Point, target: Point, dt: number): number {
  const desired = Math.atan2(position.x - target.x, position.z - target.z);
  const delta = Math.atan2(Math.sin(desired - yaw), Math.cos(desired - yaw));
  return yaw + Math.max(-9 * dt, Math.min(9 * dt, delta));
}

/** Acceleration and capped steering affect the actual path, not just the model. */
export function stepLocomotion(state: Locomotion, intent: Point, sprinting: boolean, dt: number): Locomotion {
  const hasIntent = Math.hypot(intent.x, intent.z) > 0;
  const angle = hasIntent ? Math.atan2(-intent.x, -intent.z) : state.yaw;
  const error = Math.atan2(Math.sin(angle - state.yaw), Math.cos(angle - state.yaw));
  // Steering tightens gradually as speed increases, including sprint-to-walk transitions.
  const fast = Math.max(0, Math.min(1, (state.speed - 2) / (MOVEMENT.sprintSpeed - 2)));
  const turnLimit = 3.6 + (1.45 - 3.6) * fast;
  const wantedTurn = hasIntent ? Math.max(-turnLimit, Math.min(turnLimit, error * 4)) : 0;
  let turnVelocity = approach(state.turnVelocity, wantedTurn, 8 * dt);
  let turn = turnVelocity * dt;
  if (hasIntent && Math.abs(turn) > Math.abs(error) && Math.sign(turn) === Math.sign(error)) {
    turn = error; turnVelocity = 0;
  }
  // Slow into sharp changes of direction rather than sliding sideways at full speed.
  const cornerSpeed = 1 - 0.65 * Math.min(1, Math.abs(error) / Math.PI);
  const targetSpeed = hasIntent ? (sprinting ? MOVEMENT.sprintSpeed : MOVEMENT.walkSpeed) * cornerSpeed : 0;
  const rate = targetSpeed < state.speed ? 15 : sprinting ? 8 : 11;
  return {
    speed: approach(state.speed, targetSpeed, rate * dt),
    yaw: state.yaw + (hasIntent ? turn : 0),
    turnVelocity,
  };
}

/** Caller latches the camera basis for each sustained directional input. */
export function movementVector(x: number, forward: number, yaw: number): Point {
  const length = Math.hypot(x, forward);
  if (!length) return { x: 0, z: 0 };
  return {
    x: (x * Math.cos(yaw) - forward * Math.sin(yaw)) / length,
    z: (-x * Math.sin(yaw) - forward * Math.cos(yaw)) / length,
  };
}

export function sprintAllowed(engaged: boolean): boolean { return !engaged; }

/** Separate thresholds keep future enemy-distance transitions stable. */
export function updateEngagement(current: boolean, nearestDistance: number): boolean {
  return current ? nearestDistance < 9 : nearestDistance <= 6;
}

/** Circle vs rectangle collision, substepped to avoid passing through thin walls. */
export function moveWithCollision(position: Point, delta: Point, obstacles: Obstacle[], radius = MOVEMENT.radius): Point {
  const result = { ...position };
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.z) / (radius * 0.5)));
  const blocked = (x: number, z: number) => obstacles.some(box => {
    const nearX = Math.max(box.x - box.halfX, Math.min(x, box.x + box.halfX));
    const nearZ = Math.max(box.z - box.halfZ, Math.min(z, box.z + box.halfZ));
    return (x - nearX) ** 2 + (z - nearZ) ** 2 < radius ** 2;
  });
  for (let step = 0; step < steps; step++) {
    if (!blocked(result.x + delta.x / steps, result.z)) result.x += delta.x / steps;
    if (!blocked(result.x, result.z + delta.z / steps)) result.z += delta.z / steps;
  }
  return result;
}
