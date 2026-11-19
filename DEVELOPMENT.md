# Running the defense prototype

**Latest scheduling decision — 2026-11-18:** core gameplay/combat mechanics first using existing practice/debug UI, test arena, and placeholder motion. Waves/rewards, weather, final UI, maps, and balance are deferred until after core mechanics and before final animation production/polish. Earlier conflicting sequencing is superseded by [CODING_PLAN.md](CODING_PLAN.md#updated-production-order--2026-11-18). Existing motion remains visually unaccepted; preserve its quality requirements for the final phase. This documentation update does not itself resume coding.

```sh
npm install
npm run dev
```

Open the local address printed by Vite and select **Begin**. WASD moves, Shift sprints (hold it while moving away from a focused opponent to disengage), J performs a light cut, K performs a heavy strike, E blocks/parries, Space sidesteps (press again promptly to roll), and Escape pauses. The camera is automatic. Losing window focus pauses and clears held inputs and queued attacks.

This milestone uses a native skinned armored-character sample, a simple courtyard, a straw dummy, and pursuing combat opponents. The dummy displays health and hit count, reacts to contact, and resets two seconds after depletion. The opponent has pursuit, attack commitment, health, a displayed defense meter, and interruptible hit reactions. Perfect defenses and ripostes are now implemented; active enemy blocking and guard pressure are implemented. Optional three-opponent practice now adds group targeting and a basic attack coordinator. All five finisher mechanics variants now use temporary poses and safe/compatible selection; full tactics, waves, and final art remain later work.

## Perfect defenses and ripostes

Very late E presses can earn a perfect parry inside the ordinary parry window. A narrowly timed initial sidestep can earn a perfect dodge only when the actual weapon path threatens the position occupied before dodging. Dodging empty space, dodging into a strike that otherwise misses, and the roll itself do not earn perfect rewards. The qualifying windows are provisional tuning values.

A perfect defense slows the entire fight to 35% speed for half a second of real time. The current defensive animation continues, with a restrained desaturation effect. No gameplay input is queued or acted on during emphasis. Held keys are suppressed until released, so a held or repeated J cannot become a free counter after control returns. Pause freezes both cinematic and game clocks; restarting the drill clears them.

After emphasis, a brief riposte opportunity opens against the attacker just defended against, independently of camera focus. Fresh J commits a dashing riposte against the actual source attacker. It finds a collision-checked route to a contact stance 1.4 units from that source, holds the source in place, and delivers one paired impact after the dash. There is no old 2.7-unit range cap or 0.42-unit counter lunge limit. The dash travels at a provisional 16 units/second; ordinary attacks retain their existing lunge. Inputs during the dash are discarded, and the committed counter is protected through impact, with ordinary vulnerability returning during recovery. An unreachable route leaves the earned window unconsumed and displays feedback; a defeated source invalidates the counter. A perfect dodge can cancel its late vulnerable recovery into that earned riposte; the active dodge/evasion portion cannot be attacked out of. Alternatively, fresh Space rolls away and gives up the riposte; this earned roll remains available during the reward window even if the initial sidestep has finished. Opportunities do not stack; they expire, are consumed once, or are lost on damage or source defeat.

For sideways dodges, a blade may enter the new position just before reaching the original one. At such actual contacts, a short projection of the already-committed sword animation checks that the original position is genuinely threatened. The projection restores the visible pose and does not steer or change the strike. It cannot award a perfect dodge for a strike that would miss the original position.

The aligned riposte impact event deals counter damage exactly once and immediately empties the source opponent's defense meter. It creates a temporary guard-break opening for ordinary J/K attacks. The earned counter closes distance rather than missing for range; it cannot apply damage through scenery. Protection applies only to the committed dash/strike through impact, not the reward window or later recovery. Ripostes bypass an active opponent guard; ordinary attacks must drain defense or exploit an opening.

## Defense drill

Use the practice panel to choose one or three opponents, normal/heavy/red attacks or a repeating sequence, and a front/right/behind/left starting approach. Group spawns use uneven angles and distances; move into open space if the layout cannot safely fit all three. **Start defense drill** places an opponent near you. It pursues between attacks, routes around test-arena obstacles, tracks during early windup, then commits without sliding after you mid-swing. Move into open space if its starting approach is obstructed. Player sword contacts resolve once per strike. While ready, approaching, or winding up early, the opponent blocks ordinary cuts without losing health; lights drain 24 defense (32 for the chain finisher), heavies drain 44. Guarding uses a visible sword pose, impact sparks, and ENEMY BLOCKED feedback. Committed attacks, recovery, and hit reactions are open to health damage: lights flinch, heavies stagger, and either interrupts its current attack. Blocked cuts do not reset its attack timer. Empty defense opens a fixed one-second break; further hits do not extend it, and 35 defense returns afterward. Defense regenerates at 12 per second after two seconds without attack commitment or incoming sword contact, such as an extended pursuit. The temporary enemy readout identifies guarding. Values remain provisional. A successful parry also interrupts it without dealing health damage. A defeated opponent stops attacking; restart the drill to reset it. Changing settings resets the drill. **Stop defense drill** removes it and restores free practice.

Combat focus persists within disengagement range. A ground ring marks the selected opponent. WASD strafes or retreats independently of facing, and the knight continually turns toward that opponent outside committed attacks and locked reactions. The camera's orbit follows the player-to-target direction and frames the engagement rather than retaining the exploration heading. Sword intent can switch between the dummy and opponent; block/parry and threatening red attacks select the attacker. Focus now uses stable IDs across all three opponents. It retains targets, uses closest acquisition with stable ties, switches on movement-plus-attack, a successful block/parry, or actual strike avoidance by a dodge/roll, and gives a threatening red warning latched priority without redirecting committed swings. Ripostes remain attached to the actual defensive source, including a second or third opponent. The temporary defense bar describes the focused enemy. A rotating coordinator separates actual starts by at least 0.72 game seconds, allows two concurrent windups/swings, and reserves red attack windows. Selected attackers first close to real sword range. Waiting enemies seek navigable gaps around the player using unequal distances and individually refreshed goals; they keep guarding, facing, and moving with collision separation. Adaptive mode independently varies attack types, cut executions, windup, and rest per fighter. Fixed normal/heavy/red/sequence patterns remain available for timing practice. Advanced tactics and final encounter balance remain later work.

White four-point stars precede blockable sword attacks; the red star now precedes a grounded enemy front kick. The kick draws closer, visibly raises a knee with the sword guarded, extends the boot, then retracts into a longer exposed recovery. It cannot be blocked/parried and no longer uses sword collision. A clean hit retains 30 damage and shoves/staggers the player instead of automatically knocking them down. Sideways dodging or leaving boot range avoids it; a perfect dodge still earns a dashing riposte. Your K heavy sword attack is unchanged. Each fresh windup rearms both its warning and hit resolution after damage, parries, or guard breaks; interrupted attacks hide their cue immediately. Hold E to defend from all angles. Each fresh E press opens one short parry window, with a cooldown; holding never repeats it. Blocks cost guard, heavy blocks cost more, and successful parries restore guard and face the attacker. Red strikes bypass both. Guard passively recovers with block lowered after combat inactivity; ordinary movement is allowed. Empty guard causes a one-second break and restores partial guard afterward.

Space uses movement direction, or a backward step without input. A second fresh press within the follow-up window rolls along the original dodge direction. Both actions have startup/recovery vulnerability, limited evasion windows, collision-limited travel, and cannot chain continuous invulnerability. Health loss causes a flinch, stagger, or knockdown and interrupts committed attacks. Brief post-hit protection prevents unavoidable stagger loops. Death pauses practice with **Try again** to reset the drill. Temporary health/guard bars stand in for the final glass-heart interface; health regeneration and the arena restart loop are later work.

Light attacks form a three-cut chain. A fresh J press near the end of recovery buffers at most one successor; early presses are ignored. Holding J/K never repeats. Heavy attacks rotate between an overhead cut and sweeps from either side; K ends the light chain and requires the current attack to finish. Each attack locks movement and steering until recovery ends. A nearby dummy in the intended attack direction can be selected at attack start; preparation turns toward it, and the swing includes at most 0.42 units of collision-limited closing movement. No target means no lunge.

Hits use the animated blade's swept path during explicit swing windows, with one damage event per strike and line-of-sight checks against walls. Contact does not occur during preparation or recovery. E/Space can cancel attack preparation or late recovery, but cannot cancel the committed swing. Incoming hits force interruption. Pausing freezes the timeline and clears buffered follow-ups, block, and parry intent.

Sprint is available outside committed attacks. Hold Shift and move away from a focused opponent to deliberately disengage: a short backward/turning pivot blends into sprinting, and proximity alone cannot immediately reacquire focus during retreat. Release Shift or start a combat action to allow normal acquisition; a successful defensive source event or clean hit also re-engages. Enemies pursue at up to 5.6 units/second, below the player's 7.2 sprint. Scenery and other bodies still block escape routes. The straw dummy is passive, so proximity alone does not engage it, but attacking it establishes focus until distance releases it or another opponent is selected.

Requesting J/K while moving now starts a short braking slide in the current travel direction before the attack begins. Speed decreases continuously; collision can shorten the slide. Direction and requested strike are retained, extra presses are discarded during braking, and pausing cancels the pending strike. Standing attacks start immediately.

The approved small full-body pass adds a moving hilt path, distinct rising/falling/overhead preparation, torso and hip weight shifts, articulated knees, a lead-foot step, and flat-foot support during attack poses. These remain representative procedural animations. The full library (24 light and six heavy executions minimum) is approved for the final rig stage, not implemented in this prototype.

The representative cuts now use explicit wide blade arcs, starting with the tip behind the knight and sweeping through the target into follow-through. Geometry checks verify the resulting roughly 130–180 degree motion and contact at multiple sample rates. The stand-in now uses a tapered torso and rounded helmet, armor, limbs, hands, and boots. This improves the human silhouette but is not a fully skinned anatomical character: independent spine/pelvis, production hand/finger controls, and the complete rig remain final-character work.

Attack durations remain unchanged. Swing progress now accelerates from a slow load to a late fast cut, then eases into follow-through. Preparation captures and blends the complete current pose (body, sword, hips, knees, and feet); recovery blends to a continuously refreshed locomotion/idle pose. Locomotion calculations no longer overwrite the visible attack pose. Swept hit queries use the same accelerated animation samples as rendering.

The movement camera uses a low third-person view and smoothly follows the knight's travel direction outside combat. Each sustained directional input keeps its initial camera-relative movement basis, preventing automatic rotation from steering the player into circles. Changing movement input uses the current camera heading.

In combat, camera-relative movement updates as the engagement camera orbits. Acceleration and braking still apply, but facing is separate from travel. Representative side-step and backward leg motion now follow the actual local travel direction. These and hit reactions are functional animation prototypes; polished strafing clips, hit-direction variants, final rig acceptance, and the 30+ authored attack library are still pending.

Movement has gradual acceleration, braking, and sprint transitions. Turning affects the actual path with a speed-dependent steering limit: sprinting makes broader turns than walking. Actual travel drives blended leg animation and a tiny camera footstep rhythm. Wall impacts remove blocked momentum; pausing clears momentum to avoid unintended drift on resuming.

When a wall blocks the view, the camera searches for a clear side angle while preserving its following distance. Scenery fades temporarily during obstructed transitions or in confined spaces instead of pushing the camera into the knight. Group framing smoothly pulls back and rises modestly for nearby opponents while preserving the low target-driven orbit and wall fading. Directional white/red edge stars warn about active attacks outside the view. Check these framing and warning values hands-on; the camera does not guarantee that every opponent remains onscreen in every wall configuration.

Use `?quality=low` to disable shadows and limit pixel density on slower graphics devices; this is also used for headless software-rendered browser checks.

The initial dependency audit reports an advisory in Vite's transitive `picomatch` dependency. The registry currently supplies no newer patched `picomatch` release. Development and preview servers bind to localhost; revisit the advisory before sharing a development server. Production output is static.

## Checks

```sh
npm test
npm run build
npx playwright test
```

The browser checks currently use locally installed Google Chrome. A development-only state snapshot and FPS readout are available with `?debug` in the URL. Browser screenshots are written to `artifacts/`.

Architecture: `input.ts` handles held keys and fresh presses; `movement.ts` handles locomotion, collision, and engagement thresholds; `combat.ts` owns sword timelines, buffering, cancellation rules, and blade-sweep queries; `defense.ts` owns player defense and damage rules; `trainer.ts` provides guarding/pursuing practice fighters and scripted incoming cuts; `targeting.ts` owns persistent focus and rotating group attack grants; `effects.ts` supplies bounded block/parry sparks; `dummy.ts` supplies the passive target; `world.ts` defines test geometry; `knight.ts` supplies the articulated stand-in and poses; `main.ts` connects simulation, hits, rendering, camera, and pause.

Dependency documentation: [Three.js](https://threejs.org/docs/) and [Vite](https://vite.dev/guide/).

## Change history

[UPDATES.md](UPDATES.md) is the append-only project change record. Add new dated entries for subsequent work; preserve all existing entries, including corrections and superseded decisions.

## Guard-break emphasis

Enemy guard depletion triggers a localized white burst, sparks, a synthesized metallic transient, pronounced placeholder recoil, and a fractured defense-bar effect. The entire fight and its combat/reward timers hold for 0.08 real seconds; inputs during that freeze are discarded and held keys require release. Multiple contacts do not extend the freeze; punishment hits do not retrigger it. Pause freezes both the impact hold and perfect-defense timers. Drill restart clears all of these states.

The character-quality sample below now supplies the native human rig and low carry. Final mesh/rig acceptance and polished authored clips remain pending for the final animation phase; finisher systems may be prototyped with placeholder motion first.

## Character-quality sample

The player and enemies now use the native skinned human-proportioned armored sample. Open **Character & animation study** from practice, or `/?study`, for controlled front/side/back inspection, individual actions, and the connected motion sequence. Low carry and support-hand regripping are integrated into gameplay. An occasional Turning cleave adds a visual backspin during preparation on one in six heavy actions after the initial ordinary cycle; gameplay root/camera, commitment, damage, and active hit rules stay unchanged.

See CHARACTER_QUALITY.md for the visual acceptance checklist. The production execution library, final authored clips/materials, and final quality acceptance are not complete. Use the acceptance criteria in CHARACTER_QUALITY.md for review; passing mechanics checks does not by itself establish final animation quality.

## Functional finisher and passive healing — 2026-11-18

The user authorized the core-mechanics audit and first finisher prototype after the scheduling discussion. See [CORE_COMBAT_AUDIT.md](CORE_COMBAT_AUDIT.md). Waves, final UI, maps/weather, balance passes, and animation polish remain deferred.

Use actual combat to lower an opponent to 30 health or less, break its defense, then press a fresh **F** when the target prompt appears. The focused eligible opponent has priority; another nearest safe eligible enemy may be selected. Existing J/K attacks never auto-finish. Three landed 32-damage ripostes leave a full-health trainer at four health and broken defense; release prior controls and press F during a permitted recovery/ready opening.

The prototype rejects obstructed pair travel, freezes the victim's break timer, aligns continuously to 1.2m spacing, applies death once at 0.85 seconds, and returns control at 2.1 seconds. It uses temporary thrust/rise/kick/fall poses. Normal action inputs are discarded while protected; release held keys before fresh input. Escape/blur still pause. Other enemies reposition without strikes, discard prior commitments, and resume with new windups. The camera eases in/out with wall handling. Restarting/changing the drill clears execution state. This initial slice has since been expanded with the five-variant mechanics and detachment described below; final animation and blood presentation remain deferred.

Living players below half health now regenerate after four inactive seconds at five health/second, stopping at 50. Movement alone does not reset the delay. Attacks, blocks/parries, evasions, damage/reactions, and finisher activity do. No passive revival or healing above half; between-wave full healing remains deferred with waves/rewards.

## Five-variant finisher mechanics and detachable parts

Automatic selection rotates through the five planned executions, subject to the target's attached head/helmet, sword arm, held sword, and available space. The temporary **Finisher preference · practice** selector prioritizes one for testing; blocked/incompatible choices still fall back safely. It does not grant eligibility or damage an enemy. The prompt names the actual selected sequence.

Helmet Bash uses a checked route around the victim; Sword-Arm Sever steps outside; lateral cuts reserve a conservative blade envelope; Disarm offers a compact alternative when kick/surround space is blocked. Every planned player segment avoids the victim body, scenery, and other living opponents. The reservation covers all planned pair travel while bystanders reposition.

Disarm drops the sword at 0.62s; decapitation detaches the actual posed head and releases the sword at its 1.1s lethal event; Sword-Arm Sever detaches the actual posed sword arm with the held weapon at 0.95s, then kills at 1.4s. Events are once-only even if a step crosses multiple beats. Other finishers have their own lethal/recovery timings in GAME_DESIGN.md. Temporary poses distinguish broad action families; they do not complete final choreography.

The original region and its ink contour are removed together, with separation caps. Detached geometry/materials are owned snapshots; actor/shared textures are retained safely. Props bounce/settle against the floor with bounded root obstacle collision, expire after ten game seconds, and are capped at twelve. They are cosmetic debris, not combat/nav blockers or full rigid-body simulation. Pause/impact freeze follow game time. Restarting/changing the drill cancels the action, clears props/events, and restores head, arm, sword, geometry indices, and compatibility.

Final sever-site skinning/art, armor clearance through authored clips, cloth, and blood effects remain production work. No new maps, waves, balance pass, or final UI was added.

Animation/asset integration reference: src/finisher.ts owns the five definitions, paths, compatibility, and event timing. src/humanRig.ts tags native surfaces with bodyRegion (0 retained body, 1 head, 2 sword arm) and snapshots the posed region at sever time. src/knight.ts owns weapon release and temporary paired poses; src/debris.ts owns detached-object lifetime and disposal. Keep those mechanics interfaces when replacing the procedural sample with final rigged assets. Shared textures remain owned by the actor; detached geometry/material clones are owned by debris. The practice preference persists separately from target eligibility; automatic variety advances after activation and across practice restarts, while arena defeat reset restarts its order.

## Experimental footwork system (AT-007) — 2026-11-19

Off by default. Opening the game with `?footwork` lets the footwork system in `src/footwork/` drive the player's hips and legs while engaged; without the flag the object is never created.

- `legs.ts` solves the lower body from foot and pelvis placements: hips sink when a planted foot is out of reach, each knee bends over its own toes, and a pitched foot pivots on its heel or ball.
- `stances.ts` holds the guards, the lunge and the transition tuning as data.
- `controller.ts` keeps the feet in world space. `advance(dt)` runs once per simulation tick and is the only state change; `pose()` is a pure read, so the repeated posing done by blade hit sampling cannot disturb it.
- `game.ts` follows the gameplay root, lunges on the attack clock using `lungeBudget`, and snaps to a guard when blocking.
- `humanRig.update` takes an optional lower-body override and `createKnight` exposes `setLowerBody` and a `carrier` group. Both do nothing unless a caller supplies an override.

Under the flag only: engaged speed is the guard's own pace (about 1.15 forward, 0.72 sideways, 0.69 while blocking) instead of 4.2 and 1.7; E cancels an attack at any point except a riposte; the drawn upper body rides on the lowered hips while blade hit tests keep the game's own sword placement. These are open decisions, not adopted design.

`npm run footwork:dev` opens the bench on port 5175, `npm run footwork:report` prints measured travel and speed for every move, and `npm run footwork:test:browser` checks the bench page. See `Animation Testing/AT-007-FOOTWORK.md`.
