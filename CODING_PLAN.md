# Coding Plan — Medieval Sword Combat

Planning document only. This roadmap does not start or authorize implementation.

Design source: [GAME_DESIGN.md](GAME_DESIGN.md). Work in the order below, advancing when each milestone's exit criteria are satisfied. Numerical settings remain adjustable until playtesting establishes good values.

Animation inventory: [animationslist.md](animationslist.md). Use it to break down the human-character rig, full-body animation, transitions, paired finishers, and presentation work. The recommended rig-quality checkpoint and recent discussion items are documented there; implementation resumed on 2026-11-18 after the user approved continuing with the recorded combat revisions.

## Current implementation status

Current detour: the user requested an [Animation Testing workspace](<Animation Testing/README.md>) to learn and experiment before future integration. Record findings in its append-only learning log. This detour does not bring final animation production forward or automatically authorize changes to the main game; the mechanics-first production order below remains the baseline when main development resumes.

Current priority, 2026-11-18: finish core gameplay mechanics first using the current test arena and placeholder motion. The user has now authorized implementation of the core audit and first finisher prototype. Waves/rewards, weather, final UI, maps, and balance are deferred until after core mechanics and before final animation; player-animation approval does not gate systems or finisher prototypes. Use [PLAYER_MOVEMENT_SPEC.md](PLAYER_MOVEMENT_SPEC.md) during the final animation phase. The sample remains visually unaccepted. Implementation resumed only after the subsequent explicit go-ahead for this mechanics slice.

- Milestone 1: browser foundation complete.
- Milestone 2: movement and baseline exploration camera complete, including fluid acceleration, braking, sprint steering, subtle camera steps, and wall handling.
- Milestone 3: sword foundation implemented with three light cuts, three heavy variants, attack phases, one-input buffering, movement lock, collision-limited lunge, and swept blade contact against a passive dummy. Representative procedural poses stand in for final animations.
- Milestone 4: basic defense implemented with a configurable training opponent, white/red cues, E block/parry, guard consumption/recovery/break, sidestep/roll, damage reactions, brief anti-stagger protection, defensive attack cancels, temporary vitals, and practice reset. Final animations and the glass-heart UI remain later work.
- Parts of milestones 6–7 brought forward following playtest feedback: persistent single-opponent focus, independent strafing/facing, target-driven camera orbit, basic pursuit with obstacle waypoints, damageable opponent, light/heavy hit interruptions, and parry interruption. The initial group-practice slice below now extends these systems to three opponents; advanced crowd tactics remain incomplete.
- Milestone 5: perfect parry and narrowly timed initial-dodge detection, half-second real-time slow motion, input suppression, source-bound riposte opportunities, fresh-J ripostes, and landed-riposte defense breaks are implemented. Opponent defense is displayed and active enemy blocking/guard pressure are now implemented as an early milestone 7 slice; broader guard tactics remain later work.
- Milestone 7 slice: the opponent guards while ready, pursuing, and in early windup; blocked lights/heavies drain defense without health damage, depleted defense opens a fixed one-second punishment window, and ripostes bypass guard and break it. Guard poses, sparks, temporary HUD feedback, lull recovery, and reset behavior are implemented. Advanced crowd tactics remain incomplete; first-finisher eligibility is now implemented in the mechanics slice below.
- Milestone 6 prototype: optional three-opponent practice, stable target IDs and closest acquisition, retained focus, movement-plus-attack switching, defensive switching, latched unblockable priority, independent committed targets/riposte sources, modest group camera expansion, and directional offscreen stars are implemented.
- Milestone 7 group slice: collision separation and a provisional round-robin coordinator permit staggered dual windups and reserve red attacks. Advanced spacing tactics and encounter balance remain later work.
- Implemented combat revision: adaptive uneven surrounding, varied enemy choices, successful-evasion focus, deliberate retreat sprinting, guaranteed routed dashing ripostes, and localized guard-break flash/freeze/recoil. A native human-rig sample is available; final production acceptance and authored animation assets remain pending.
- Enemy unblockable readability: the red attack is now a distinct front kick with boot collision, close spacing, raised-knee preparation, longer exposed recovery, and a collision-limited shove/stagger. Player K retains heavy sword attacks. Final kick clips remain production work.
- Current mechanics slice: core-combat gap audit and first-finisher eligibility, deliberate activation, safe paired alignment, protection, camera, and control return are implemented. This follow-up adds compatibility/selection across all five finishers plus detachable head/arm/weapon support and cleanup; observed correctness issues remain the next mechanics priority. Use existing practice/debug UI and arena. Waves/rewards, weather, final UI, maps, and balance follow core mechanics; final animation follows those. All five finisher mechanics timelines now use compatible/safe selection and temporary poses; head/arm/weapon detachment and bounded cleanup are implemented. Final production clips remain pending. The character sample is not visually accepted.
- Deferred final animation sequence: approve a polished full-body representative pass, then produce the complete minimum of 24 light animations (12 directions × 2) and six heavy animations (3 directions × 2) with the final rig. The prototype now includes run-to-attack braking, moving hands/arms, torso rotation, weight transfer, articulated knees, and a lead-foot step. The full 30+ animation library is not implemented.

## Intended first playable stage

One browser-playable arena with the specified knight and longsword, readable group combat, all player actions, five finishers, the illustrated visual treatment, and a complete wave/reward/death/restart loop.

The first stage needs enough waves to exercise the mechanics; the wave count and reward pool require a later design decision. Additional maps, weapon types, enemy rosters, and persistent progression follow afterward. Each map is a separate level; the planned roster and shared environment principles are recorded in GAME_DESIGN.md, section 15. Level order and unlocks remain undefined.

The initial coding milestone is much smaller: move a placeholder knight around a plain test area with an automatic camera. Build outward from that rather than attempting the complete game at once.

## 1. Establish the browser foundation

### Build

- Set up a small Three.js application. Proposed supporting setup: TypeScript and a lightweight development/build tool; choose exact dependencies when implementation begins.
- Create the renderer, scene, basic lighting, floor, and placeholder character.
- Add resize handling, asset-loading/error states, and a basic performance display available in development.
- Establish separate simulation and rendering updates with a fixed simulation step.
- Track real elapsed time separately from scaled game time from the start. Perfect-defense emphasis later needs a real-time duration while combat runs slowly.
- Capture held inputs and fresh presses independently. Ignore browser key-repeat for attack/parry presses.
- Handle pause, tab suspension, and lost keyboard focus without stuck keys or catch-up simulation bursts. Consume gameplay keys only while the game has focus.

### Exit criteria

The scene loads and resizes reliably. Input distinguishes a fresh press from a held key. Returning to the tab does not make the character jump forward or execute old inputs.

## 2. Prove movement and the baseline camera

### Build

- Camera-relative WASD intent, normalized diagonal input, gradual acceleration/braking and sprint transitions, speed-limited turning, and ground collision. Sprinting turns more slowly than walking; physical motion follows the gradual heading change.
- Shift sprint outside close-range combat, with a nearest-threat distance input ready for later integration.
- Apply the updated distance-based engagement rule: enough separation releases focus and enables sprint despite ongoing pursuit; approaching or attacking re-engages. Use different entry and exit distances. Before enemies exist, use an isolated distance function for verification rather than adding enemy content early.
- A smooth elevated third-person camera requiring no mouse control.
- Wall collision and camera obstruction handling in a plain arena containing a few test obstacles.
- Stable directional controls while the camera follows and turns.

### Exit criteria

Movement feels fluid, with smooth starts/stops and wider sprint turns; the character cannot cross walls, and automatic camera rotation does not cause unexpected changes of direction. Sprint reliably switches off in close-range combat. Add tiny distance-driven camera steps with a smooth movement envelope.

## 3. Build the player action system and sword attacks

### Build

- An explicit action system for locomotion, attack phases, block/parry, dodge/roll, hit reactions, guard break, riposte, finisher, and death. Implement the attack states first and reserve the others for later milestones.
- A separate combat-engagement flag; being in combat is not itself an animation state.
- Three light strikes, one per J press, with a stronger third strike.
- A heavy strike on K that ends the light chain.
- Preparation, committed swing, and recovery phases; phase-specific defensive cancellation rules.
- One buffered light input near the chain transition. Discard extra presses.
- Attack movement lock and a short collision-limited automatic lunge toward a stationary dummy.
- Basic animation blending on a simple rig. Start with a small representative set of cuts; add the complete directional family after timing works.
- Run-to-attack transition: preserve one requested strike, decelerate in the current travel direction with collision, plant the feet, then enter preparation. Extra presses cannot queue more strikes during braking.
- Explicit impact windows and swept blade collision sampling so fast cuts do not skip targets between updates. Prevent repeated damage from the same strike to the same target.

### Exit criteria

Holding J/K never repeats attacks. Mashing does not queue a whole combo. WASD cannot steer a swing. The sword registers contact consistently at different rendering frame rates, and the small lunge stops before obstacles and the target.

## 4. Add a scripted attack-testing rig and basic defense

This is a test fixture, not the start of the enemy roster. The player needs repeatable incoming attacks before defense can be evaluated.

### Build

- A simple attacker with repeatable normal, heavy-blockable, and unblockable strikes, adjustable timing, and attacks from different directions.
- White and red four-point cues driven by the same attack timeline that controls impact.
- E press-to-parry followed by held block, with release required before another parry attempt.
- All-angle blocking, guard consumption, parry restoration, passive recovery, and guard break.
- Space sidestep, backward default, and second-press roll with distinct recovery.
- Player health, interruption of committed swings, flinch/stagger/knockdown, and a recovery rule preventing unavoidable repeated stagger chains.
- Temporary health/guard readouts and timing overlays for tuning.

### Exit criteria

Normal and heavy-blockable strikes behave differently at guard impact. Red attacks defeat both block and parry. Guard recovery and break work, dodge/roll cannot provide uninterrupted protection, and damage interrupts attacks as designed.

## 5. Implement perfect defense and ripostes

### Build

- Separate ordinary and perfect parry windows.
- Perfect-dodge detection that confirms a genuinely avoided incoming strike, including the attack path that would have hit without evasion. Proximity alone is insufficient.
- Approximately half a second of real-time slow-motion emphasis for the whole fight.
- A temporary input lock that discards actions rather than buffering them. Inputs held through the lock must not create a fresh press when control returns.
- A riposte window beginning after emphasis ends, associated with the attacker actually defended against rather than whichever target the camera later selects.
- Fresh J for the fast riposte; follow-up Space for the roll after a perfect dodge, forfeiting the riposte.
- A landed riposte breaks a dummy's defense meter. A miss does not.

### Exit criteria

Slow motion lasts consistently in real time, cannot be extended by overlapping triggers, and does not allow attacks during emphasis. A pre-held J does not trigger a riposte. The reward works only against an actual defensive success and respects range.

## 6. Resolve targeting and multi-opponent camera behavior

### Build

- Several scripted opponents to exercise crowded situations without full AI.
- Closest-target acquisition, movement-plus-attack switching, block/parry switching, and unblockable-threat priority.
- Stable tie-breaking and target retention so focus does not flicker between similar candidates.
- Separate selected focus, committed attack target, riposte source, and camera framing. Changing one must not silently redirect the others.
- Wider group framing, smooth transitions, threat visibility, and obstruction fallback.
- Real engagement and disengagement rules replacing the development combat toggle.

### Exit criteria

A player can deliberately switch targets, defend against a second attacker, and react to overlapping threats without manual camera input. Focus changes do not bend committed swings, and unblockable priority cannot cause rapid camera oscillation.

**Player-foundation checkpoint:** stop expanding systems until movement, attacks, defense, ripostes, and camera work together and feel good. Use representative animations and minimal effects. Do not wait for finished art to discover control problems.

## 7. Add the minimum real enemy combat

Before this milestone, design the first enemy's behavior, health/defense values, break duration, and finisher threshold.

### Build

- One sword-wielding enemy using the established attack and damage rules.
- Approach, spacing, facing, attacking, guarding, hit reactions, defense break, and death.
- Broken defense creates an opening for ordinary attacks; low health plus broken defense enables execution.
- Basic navigation and separation around the player and arena obstacles.
- Enemies pursue the player throughout the playable map, following routes around bends and obstacles rather than moving straight through scenery. Winding levels remain fully open during waves, without encounter-section gates. Switch from pursuit to combat spacing when in range.
- A group coordinator that permits pressure and selected overlapping attacks without unavoidable combinations.
- Post-hit recovery and clear offscreen warnings.

### Exit criteria

One-on-one combat rewards timing. Small-group combat is harder but readable, without permanent stagger loops, overlapping bodies, or enemies stacking unavoidable strikes.

## 8. Prototype one complete finisher

### Build

- F eligibility, prompt, range checks, and focused-target priority.
- Reserve and align the paired characters in a clear location before committing. If there is insufficient space, do not start an animation that clips through a wall.
- Build one representative finisher on a simple rig, including protection, nearby enemy strike suppression, exact lethal event, and control return.
- A continuous camera path and safe fallback for tight spaces.
- Resume surrounding attacks with readable windups.
- Prototype the asset setup for a removable head or limb before producing every final character.

### Exit criteria

The sequence begins only when eligible, does not teleport through scenery, registers death exactly once, and returns control smoothly. Other enemies cannot damage the protected player or instantly hit them when protection ends.

## 9. Establish the final art and animation pipeline

### Build

- Confirm helmet reference, knight proportions, bat crest, and a small illustrated visual reference sheet before producing final assets.
- Replace the placeholder with a rigged silver/red knight and two-handed longsword.
- Establish export scale, skeleton conventions, weapon attachment, animation event markers, and collision alignment.
- Replace the block-shaped stand-in with a complete human-proportioned knight. Build independent pelvis/spine/neck, clavicle/shoulder, arm/elbow/forearm-twist, wrist/hand/finger, hip/knee, and ankle/foot/toe articulation, with natural limits and two-handed grip controls. Check deep attack poses for stretching and armor/cloth interference before authoring the complete animation library.
- Add all light-cut directions and the three heavy variants, preserving each attack's timing contract.
- Expanded final animation target: 12 light directions with at least two full-body executions each, plus three heavy directions with at least two executions each (30 minimum). Confirm the 12-direction chart before authoring the full set. Require clear cut direction, stepping, weight transfer, hip/torso motion, coordinated arms, and recovery. Preserve collision-limited travel and recheck blade contacts after animation changes. The user approved completing this full library with the final rig after a small representative pass now.
- Deep-cut criterion: the tip begins behind the player, follows an authored approximately 130–180 degree arc, and finishes well beyond contact. Verify the actual blade trajectory as well as the full-body silhouette; quaternion interpolation must not take an unintended shortcut.
- Timing and continuity: preserve attack duration while accelerating from a slow load into a fast cut. Blend the complete entry/current pose through windup, swing, recovery, and idle/chain transitions; locomotion updates must not reset attack joints underneath the blend. Validate phase-boundary continuity and resample actual blade contact after changing animation curves.
- Prototype ink outlines, painted shading, chainmail treatment, and health-driven stain layers on one character and a small environment sample.
- Prepare compatible enemy meshes with authored sever points and capped interiors where needed for finishers. Do not depend on arbitrary runtime mesh slicing.
- Establish a browser performance target on an agreed reference device before expanding visual complexity.

### Exit criteria

The knight matches the design, attacks read clearly from the gameplay camera, and final animation does not change gameplay timing accidentally. A representative scene meets the chosen performance budget.

## 10. Complete finishers, feedback, and the player interface

### Build

- All five agreed finishers, added one at a time using the proven paired-animation system.
- Animation-specific compatibility, death moments, severing, blood direction, and camera paths.
- Block/parry sparks, subtle sword lines, directional blood, surface stains, and death-corner flashes.
- Bloodstained armor that tracks injury while retaining a separate layer of battle grime.
- The lower-left glass heart: fill level, cracks, damage response, and healing transitions.
- The approved guard-meter shape, recovery feedback, and break warning.
- Sword impact, armor, movement, parry, and execution audio.
- Bounded particle/stain/body lifetimes or counts so repeated combat does not grow memory use indefinitely.

### Exit criteria

Every finisher and its death flash occur at the correct moment. Health and guard remain readable. Gore and camera movement do not obscure attack cues. Extended fights remain responsive.

## 11. Build the first complete arena run

Before coding rewards or map content, decide the initial wave sequence, small upgrade pool, arena layout, and full-heal reward availability.

### Build

- One arena with controlled spawn locations and navigation; the ruined castle courtyard is the proposed first level.
- Keep level configuration separate from the wave/run systems so later maps can supply their own geometry, camera boundaries, navigation, and entrances without duplicating combat logic.
- Support rectangular, circular, and winding-strip footprints through level geometry and navigation rather than assuming every arena is a rectangular floor. Prove winding-route camera behavior with a simple test layout before producing a finished winding level.
- Give each level an environment configuration for sky/exterior backdrop, lighting, haze, weather particles, surface appearance, and ambient sound. Build the first level's approved atmosphere here; add the other weather treatments with their respective maps. Keep precipitation out of covered interiors and bound weather effect costs.
- Wave start, combat, wave completion, reward selection, and next-wave transitions.
- Partial passive healing up to 50%, with the agreed inactivity rules.
- A full-heal reward that competes with upgrades.
- Run-owned upgrades and clean reset behavior.
- Death, results, restart from wave one, pause, and basic control explanations.
- A first-stage completion condition, to be defined with the wave structure.

### Exit criteria

A complete attempt can be played from start through rewards to victory or defeat. Death clears run upgrades. Restart restores every system, including time scale, input locks, camera, particles, enemy state, and UI.

## 12. Tune, verify, and prepare the first release

- Tune attack rhythms, perfect windows, guard pressure, recovery, and encounter density through playtesting.
- Verify keyboard behavior, focus loss, pause, slow motion, and restart across the chosen desktop browsers.
- Check performance at multiple screen sizes, including sustained group combat and repeated finishers.
- Add graphics/effect settings, blood and flash controls, rebinding, and other agreed accessibility options.
- Complete asset loading/error handling, sound activation, and a production build smoke test.
- Make a shareable build only when publishing is separately requested.

### Exit criteria

The first arena is understandable, stable, and rewarding to replay. All player mechanics are represented, no major camera/control problems remain, and the build meets the agreed device/browser targets.

## Architecture boundaries

Keep these responsibilities distinct without building a general-purpose engine:

| Component | Responsibility |
| --- | --- |
| Input | Held state, fresh presses, buffering, lock/discard rules |
| Simulation clock | Fixed updates, real time, scaled time, pause |
| Character actions | States, attack phases, cancellation, movement locks |
| Combat resolution | Hit queries, damage, guard, defense outcomes, death |
| Targeting | Selection, intent, threat priority |
| Camera | Smooth framing, obstruction, finisher paths |
| Animation | Visual playback/blending tied to action timing |
| Presentation | UI, audio, particles, blood, kill confirmation |
| Arena run | Waves, rewards, upgrades, defeat/reset |

Use shared attack definitions for timing windows, range, damage, guard pressure, animation variants, and indicator type. Keep tuning values outside scattered input or rendering code. Presentation responds to explicit events such as block, perfect defense, health change, and death; it must not decide whether an attack succeeded.

## Verification strategy

Add focused automated checks for consequential rules: fresh-press attacks, one-input buffering, cancellation boundaries, guard break/recovery, regeneration cap, slow-motion input discard, riposte timing, finisher eligibility, and run reset. Use scripted attacks for repeatable integration checks.

Judge camera comfort, attack feel, animation transitions, and visual readability through hands-on browser playtests. Do not replace those judgments with tests that merely mirror the implementation.

## Work deliberately saved for later

Additional arenas, enemy classes and bosses, other player weapons, more executions, persistent unlocks, multiplayer, and any return to survival/resource systems. Expand only after the first arena proves the core combat loop.

## Updated production order — 2026-11-18

Latest user decision: get the game mechanics working first. Waves, weather, UI, maps, and balance move to the later phase immediately before final animation. This supersedes the preceding waves-first order and earlier polished-animation gates. Numbered milestones elsewhere remain scope inventories, not the execution order where they conflict with this section.

1. **Core mechanics first:** verify player attacks/commitment, defense and breaks, dodge/roll, perfect defenses and counters, targeting/camera behavior, enemy pursuit/defense/group decisions, damage/healing/defeat/reset, and their interruption/obstruction/source-validity edge cases. Fix correctness and missing behavior using the current test arena, temporary UI, and placeholder motion. Do not spend this phase on difficulty or numerical balance passes.
2. **Finish remaining combat systems:** prototype finisher eligibility, deliberate activation, selection, paired alignment, space checks, protection, action/lethal events, automatic camera, and return of control with simple temporary poses. Validate enemy hold/resume behavior and invalid/obstructed/dead-target cases. Final paired clips, visual gore polish, and final animation remain deferred.
3. **Late systems/content/presentation phase:** waves, clear detection, between-wave rewards/full-heal option, run completion/progression required for the first stage; planned map layouts; weather/environment; final UI and remaining feedback/audio. Keep existing diagnostic indicators so core mechanics remain testable before this phase. Additional content beyond the agreed first stage remains later scope.
4. **Balance and integration before animation:** tune difficulty, enemy pressure, damage, timings, rewards, and pacing across the complete playable feature set; verify maps/navigation/camera and performance.
5. **Final animation phase:** settle final character/rig and asset workflow; polish a representative player movement sample; produce locomotion, attacks, defenses, evasions, reactions, transitions, enemy retargeting/variation, all five paired finishers, and secondary motion using the recorded standards.
6. **Final verification:** revalidate blade/boot contacts, timings, foot placement, camera readability, paired alignment, and performance after animation integration, then prepare release. Fix regressions introduced by final assets; this does not move the planned balance pass out of step 4.

User authorized this mechanics phase on 2026-11-18. The initial core audit found and added missing passive healing; a first functional Rising Cleave finisher now covers F eligibility, space reservation/alignment, protection, lethal timing, enemy hold/resume, and continuous camera. See CORE_COMBAT_AUDIT.md and UPDATES.md for scope and verification. The subsequent authorized follow-up adds all-five compatibility/selection, event timelines, detached head/arm/weapon snapshots, capped stumps, bounded debris cleanup, and reset restoration. Final choreography remains deferred; waves and animation polish have not started.

Only minimal placeholder animation fixes needed to test mechanics or keep contact/readability functional belong before step 5. Defer duck-walk cleanup, full-body polish, the full execution library, and final authored finisher clips. Animation remains a final quality requirement, not a removed feature. See PLAYER_MOVEMENT_SPEC.md and animationslist.md.

## Deferred character-quality sample — 2026-11-18

Replace the broad geometric actor with an articulated human-proportioned armored rig shared by player and enemies. Establish separate pelvis/spine, jointed limbs and hands, fitted armor and helmet, an identifiable bat crest, clean illustrated materials, low running carry/regrip, connected representative poses, and an occasional authored backspin variant. Provide an inspection view and verify gameplay timing/contact against the same mesh. Final clip production and visual acceptance are deferred to the last production phase. Systems and temporary finisher prototypes may proceed before that review.

Character sample review: [CHARACTER_QUALITY.md](CHARACTER_QUALITY.md) documents the implemented native skeleton, fitted armor, carry/regrip, representative motion, occasional backspin, and visual acceptance criteria. Review it in the courtyard and `/?study` before marking final character/animation work complete.
