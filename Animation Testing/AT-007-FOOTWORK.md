# AT-007 — Fencing footwork on the game knight

- Date: 2026-11-19
- Question / intended result: can the knight's own skeleton do fencing footwork (guards, advance, retreat, side steps, lunges, recoveries) with planted feet that do not slide, and can a guard interrupt any of it and form very quickly from wherever the body is?
- Status: ready for review. Every numeric check below passes. **No part of this has been visually accepted by the user.** The stills were looked at by the assistant only.
- Tool and version: Three.js 0.187, TypeScript 7, Vite 8, Node test runner, Playwright 1.65 with Chrome (SwiftShader). No Blender, no external animation tool, no imported clips.
- Rig/model/clip and source/reuse terms: the game's own code-generated knight (`src/knight.ts`, `src/humanRig.ts`). No third-party assets.
- Files and dependencies:
  - Engine, shared by the bench and the game: `src/footwork/legs.ts` (leg solver), `src/footwork/stances.ts` (guards, lunge and tuning as data), `src/footwork/controller.ts` (steps, lunges, guard interrupt), `src/footwork/game.ts` (the `?footwork` hookup).
  - Rig hook: `src/humanRig.ts` `update(grip, gait, phase, lower?)` and `src/knight.ts` `setLowerBody()` / `carrier`. Both are inert unless something passes a lower-body override.
  - Bench: `Animation Testing/AT-007-Footwork/viewer/`.
  - Tools: `tools/footwork-report.ts` (numbers for every move), `tools/capture.mjs` and `tools/capture-game.mjs` (stills).
  - Tests: `tests/footwork-legs.test.ts`, `footwork-stances.test.ts`, `footwork-moves.test.ts`, `footwork-guard.test.ts`, `footwork-game.test.ts`, `tests/browser/footwork.spec.ts`, `Animation Testing/AT-007-Footwork/tests/bench.spec.ts`.

## Procedure

Run the bench with `npm run footwork:dev` and open http://127.0.0.1:5175.

| Key | Action |
| --- | --- |
| 1 / 2 / 3 | Take the en garde, low or high guard. Interrupts anything. |
| E | Take the current guard again now. Q switches the lead foot. |
| W / S / A / D | Advance, retreat, step left, step right. Hold to keep stepping. |
| T / G | Passing step forward or back (swaps the lead foot). |
| Space / H / J | Lunge at full, half and zero travel. |
| R / F | Recover from a lunge forward or back. |
| ← / → | Turn on the spot. |
| P , . | Pause, back one tick, forward one tick. X resets. |

The bar at the bottom scrubs through the last minute; pressing a key while looking at an earlier moment continues from there. Speed goes down to one tenth. The panel on the right changes every guard, lunge and feel value live, and "Copy guard as JSON" gives text to paste into `src/footwork/stances.ts`. "Proof runs" plays a scripted sequence for rungs 3, 4, 5 and for the guard interrupt.

How it works, in the order it was built:

1. **Leg solver.** A pose is two boot placements and a pelvis placement in the character's own frame. The solver lowers the hips when a planted foot runs out of reach, bends each knee over the toes of its own foot, and pivots a pitched foot on its heel or the ball of the foot. These are the three gaps measured in the 2026-11-19 baseline.
2. **Guards as data.** Each guard gives the lead and rear foot placement, hip height, turn and lean, and its own step length, time, lift and weight shift. Guards are written for "lead" and "rear", so either foot can lead.
3. **Controller.** Feet are stored in world space, so a planted foot cannot move. Every move starts from wherever the feet and hips are and heads for a target. `advance(dt)` is the only thing that changes state; `pose()` is a pure read; state is plain data, so a snapshot replays exactly.
4. **Guard interrupt.** `guard()` drops the current move, lets the body's speed die away over a few centimetres, sends each foot that is not where the guard wants it straight there (the airborne or farther one first), and springs the hips to the guard. The whole thing takes the guard time, 0.14 s by default.

Numbers taken from research rather than guessed: 0.46 m advance (Chida 2023), rear foot near a right angle, lunge about half a second with peak body speed between 1.7 and 3.4 m/s, front foot thrown toe-up and landing on the heel, rear foot flat. Step durations and everything about the low and high guards are estimates. Sources are in the 2026-11-19 learning-log entry.

## Observations and evidence

Measured at 60 Hz with `npm run footwork:report`, right foot leading:

| Move | En garde | Low guard | High guard |
| --- | --- | --- | --- |
| Advance / retreat | 0.46 m in 0.40 s | 0.36 m in 0.52 s | 0.50 m in 0.44 s |
| Chained advance, mean speed | 1.14 m/s | 0.69 m/s | 1.13 m/s |
| Side step | 0.26 m in 0.36 s | 0.32 m in 0.50 s | 0.34 m in 0.40 s |
| Full lunge, hip travel | 0.42 m in 0.50 s | 0.36 m in 0.50 s | 0.42 m in 0.50 s |
| Full lunge, peak body speed | 1.99 m/s | 1.73 m/s | 1.99 m/s |

In every move in every guard: a planted boot moves 0.00000 m, no foot misses its target, no leg exceeds 99.9% extension, and outside the guard interrupt both feet are never off the floor together. The low guard's full lunge is shorter because its rear foot starts farther back and the leg runs out.

Guard interrupt, tested from 11 moves at each of 45 ticks across all 9 guard pairs (4,455 cases): after 0.15 s (9 ticks) both feet are down within 2 cm of the guard and the hips within 1 cm; the body travels less than 10 cm after the key; the fastest joint moves under 20 cm in a tick. Feet already within 1.2 cm of their place are left alone. During the snap both feet can be off the floor for one tick.

Automated checks: 133 Node tests (97 existing, 36 new), 4 bench browser tests and 3 game browser tests pass.

Stills, all taken at 1500×900 with `tools/capture.mjs` (side view is from the knight's right; the knight faces right):

- Guards: `evidence/guard-engarde-side.png`, `guard-low-side.png`, `guard-high-side.png`, `guard-engarde-top.png`.
- Advance: `evidence/advance-heel-landing.png` (lead foot down on its heel, rear foot on the ball, body at 1.72 m/s).
- Lunge: `evidence/lunge-full-side.png`, `lunge-legs-only.png` (with skeleton), `recover-forward-mid.png`.
- Other steps: `evidence/retreat-mid.png`, `side-step-front.png`, `pass-mid.png`.
- Guard interrupt: `evidence/guard-interrupt-0.png`, `-2.png`, `-3.png`: a lunge at 0.30 s when the low guard key is pressed, the feet coming in at 0.40 s, and the guard standing at 0.45 s.
- Wall: `evidence/wall-stopped.png` (last step shortened to 0.14 m).
- Game with the flag: `evidence/game-attack-lunge.png`, `game-guard-interrupt.png`.

What the assistant saw in the stills: the three guards read as different stances; the lunge has a straight rear leg, a planted flat rear foot and the lead shin close to vertical; the knee of the turned-out rear foot points out over its toes. What stills cannot show: timing, weight, and whether the motion feels like fencing. That needs the user's eye at normal and slow speed.

Problems found and fixed while building:

- Chained steps lost speed for one tick at each join, because a step that ended partway through a tick wasted the rest of it. The controller now gives the remainder of the tick to the next move.
- A step toward a wall first landed the lead foot at full length and then pulled it back. The controller now asks how far the body can get before the foot comes down.
- The game's `moveWithCollision` tests in 30 cm sub-steps, which made the last 16 cm before the wall look unreachable. The bench's wall query walks 2 cm at a time. `moveWithCollision` itself is unchanged.
- Interrupting a passing step used to drag both feet back to the old lead. A guard that interrupts a pass now leads with whichever foot is nearer to leading.

## Conclusion and limits

Confirmed by test: the knight's skeleton can hold all three guards, step in four directions and diagonally, chain steps at each guard's own pace, shorten a step at a wall, lunge at any depth with the rear foot planted, recover both ways, and take a guard from any of those at any tick within the guard time, without a planted foot sliding or a leg stretching.

Not confirmed:

- The look. Nothing here has been reviewed by the user. AT-003 and AT-006 both passed their numbers and were rejected on sight.
- Step timing. The durations are estimates; no cadence data was found.
- The upper body. Arms, torso and head only ride on the hips. The sword does not thrust in a lunge.
- The high guard dips about 6 cm in each step because a 0.50 m step is long for a stance that upright. Shorten the step or accept the bob.
- Slopes, stairs, turning while stepping, and anything faster than a guard's pace.

## Future game integration

`?footwork` is an experiment behind a URL flag, player only. Without the flag the footwork object is never created and behaviour is unchanged (checked by test).

With the flag, while the player is engaged with a target:

- The legs and hips come from the footwork controller. Gameplay still owns where the player is; the controller follows.
- Dodges, rolls, knockdowns, staggers, the dashing riposte, the retreat sprint, the turning cleave, finishers and unengaged movement keep the built-in legs, with a crossfade of about 0.15 s.
- An attack starts a lunge sized by the forward travel gameplay grants (`lungeBudget`, at most 0.42). The recovery phase brings both feet back under the body.
- Blocking snaps to the low guard in the guard time. Releasing returns to en garde.

Three things differ from the default game under the flag, and each is a decision for the user rather than a finished design:

1. **Engaged speed drops from 4.2 to about 1.15 units per second** (0.72 sideways, 0.69 while blocking). That is the pace the guard's steps cover. At 4.2 a 0.46 m step would have to repeat nine times a second.
2. **E cancels an attack at any point**, including the swing, so a guard can be taken at any time. The default game only allows it in the wind-up and the last 0.14 s. Ripostes are still not cancellable.
3. **The drawn sword rides up to 0.32 m lower than the sword used for hit tests** in a deep lunge, because the upper body follows the hips down but hits deliberately keep the game's own sword placement.

Not done: enemies do not use footwork; the turning cleave keeps the old legs because the whole body spins; nothing has been balanced around the slower pace.

## Learning-log entry

See the 2026-11-19 AT-007 entry in `LEARNING_LOG.md`.
