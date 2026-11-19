import type * as THREE from 'three';
import { createFootwork } from './controller.ts';
import { carrierOffset, createLowerBodyOverride, solveLowerBody, writeOverride } from './legs.ts';
import type { LowerBodyOverride } from './legs.ts';
import { LUNGE, TUNING, stanceById } from './stances.ts';

/**
 * Experimental hookup of the footwork system to the player knight, used only
 * when the game is opened with ?footwork.
 *
 * Gameplay keeps ownership of where the player is. This module watches the
 * root move and makes the feet keep up, lunges on the attack clock, and snaps
 * to a guard when the player blocks. It writes only to the leg and pelvis
 * bones (through the rig's lower-body override) and to a display-only offset
 * that lets the upper body ride on the lowered hips.
 */

/** Guard held while engaged, and the braced guard taken when blocking. */
const ENGAGED = 'engarde', BLOCKING = 'low';
/** Seconds for the footwork legs to take over from, or hand back to, the built-in legs. */
const HANDOVER = 0.06;

export interface FootworkFrame {
  /** Player root after this tick's movement. */
  x: number; z: number; yaw: number;
  /** Should footwork own the legs this tick? False for dodges, rolls, knockdowns, sprinting and so on. */
  drive: boolean;
  blocking: boolean;
  /** The attack in progress: its clock after this tick, its phase lengths, and the forward travel gameplay granted it. */
  attack: { serial: number; elapsed: number; preparation: number; swing: number; recovery: number; lunge: number; lungeLeft: number } | null;
}

export function createPlayerFootwork(knight: { setLowerBody(value: LowerBodyOverride | null): void; carrier: THREE.Object3D }) {
  const fw = createFootwork({ external: true, stance: ENGAGED });
  const override = createLowerBodyOverride(); override.weight = 0;
  knight.setLowerBody(override);
  let weight = 0, driving = false, blocking = false, serial = -1, lunging = false;
  let carry = { x: 0, y: 0, z: 0, yaw: 0 };

  return {
    controller: fw,
    get weight() { return weight; },
    get debug() { return { weight, driving, stance: fw.state.stance, pose: fw.state.pose, move: fw.state.move?.name ?? null, hipHeight: override.pelvisPosition.y, feet: fw.state.feet.map(foot => ({ x: foot.x, z: foot.z, planted: foot.planted })) }; },

    /**
     * Engaged walking speed for the guard in use, in units per second: what one
     * of its steps covers in the time it takes. Side steps are shorter, so the
     * pace depends on the direction of travel relative to the facing.
     */
    pace(isBlocking: boolean, move: { x: number; z: number }, yaw: number) {
      const step = stanceById(isBlocking ? BLOCKING : ENGAGED).step, size = Math.hypot(move.x, move.z);
      const along = size ? Math.abs(Math.sin(yaw) * move.x + Math.cos(yaw) * move.z) / size : 1;
      return (step.side + (step.length - step.side) * along) / (step.sideDuration + (step.duration - step.sideDuration) * along);
    },

    /** Call once per simulation tick, after the root has moved and before the knight is posed. Returns the weight in use. */
    update(dt: number, frame: FootworkFrame) {
      if (frame.drive && !driving) {
        // Taking over: stand in guard where the body is, with nothing in progress.
        blocking = frame.blocking; lunging = false;
        fw.place(frame.x, frame.z, frame.yaw, blocking ? BLOCKING : ENGAGED);
      }
      driving = frame.drive;
      weight += ((driving ? 1 : 0) - weight) * (1 - Math.exp(-dt / HANDOVER));
      if (!driving) {
        // Handing back: hold the last pose and fade it out. The feet are not followed while the built-in legs run.
        if (weight < 0.01) weight = 0;
        override.weight = weight;
        return weight;
      }
      if (frame.blocking !== blocking) {
        // The guard interrupt: whatever the legs were doing stops and the guard forms.
        blocking = frame.blocking; lunging = false;
        fw.guard(blocking ? BLOCKING : ENGAGED, { time: blocking ? TUNING.guardTime : 0.22 });
      }
      const attack = frame.attack;
      let ahead: { x: number; z: number } | undefined;
      if (attack) {
        if (attack.serial !== serial) {
          // A new attack: the lead foot goes out during the wind-up and lands as the body arrives.
          serial = attack.serial; lunging = true;
          fw.request({ type: 'lunge', depth: Math.max(0, Math.min(1, attack.lunge / LUNGE.travel)), duration: attack.preparation + attack.swing }, true);
        }
        if (lunging && attack.elapsed >= attack.preparation + attack.swing) {
          // Gameplay never moves the body back after an attack, so both feet come in under it.
          lunging = false;
          fw.guard(blocking ? BLOCKING : ENGAGED, { time: Math.max(0.12, attack.recovery * 0.85) });
        }
        if (lunging) ahead = { x: -Math.sin(frame.yaw) * attack.lungeLeft, z: -Math.cos(frame.yaw) * attack.lungeLeft };
      } else if (lunging || fw.state.pose === 'lunge') {
        // The attack was cancelled before it finished.
        lunging = false; fw.guard(blocking ? BLOCKING : ENGAGED);
      }
      fw.advance(dt, { external: { x: frame.x, z: frame.z, yaw: frame.yaw, ahead } });
      const solution = solveLowerBody(fw.pose());
      writeOverride(override, solution); override.weight = weight;
      carry = carrierOffset(solution);
      return weight;
    },

    /**
     * Whether the upper body and sword ride on the footwork hips. Blade hit
     * tests must run with this off, so hits use exactly the game's own sword
     * placement; turn it on again for the pose that is drawn.
     */
    carry(on: boolean) {
      const amount = on ? weight : 0;
      knight.carrier.position.set(carry.x * amount, carry.y * amount, carry.z * amount); knight.carrier.rotation.y = carry.yaw * amount;
    },

    /** Give the legs back at once (finishers, resets). */
    release() { driving = false; weight = 0; override.weight = 0; lunging = false; knight.carrier.position.set(0, 0, 0); knight.carrier.rotation.y = 0; },
  };
}

export type PlayerFootwork = ReturnType<typeof createPlayerFootwork>;
