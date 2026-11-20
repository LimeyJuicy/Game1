# Animation Testing

**Current focus:** player modeling; animation authoring paused. The existing showcase opens the user-supplied player GLB with motion controls hidden. The earlier native model remains at `/?model=legacy`. See [PLAYER_MODEL.md](../PLAYER_MODEL.md). Earlier animation inspection is preserved at `/?mode=animation`; combine prior query parameters with that mode.

An experimental workspace for learning how to animate the knight before future game integration. Created at the user's request on 2026-11-18.

The main game's current mechanics remain the baseline. Work here does not automatically become production animation or change the schedule for final animation integration. We are temporarily stepping away from the main roadmap to learn and experiment.

## Record keeping

- Append each research session, experiment, observation, decision, and unresolved question to [LEARNING_LOG.md](LEARNING_LOG.md). Preserve earlier entries; record corrections in a new entry.
- Use [EXPERIMENT_TEMPLATE.md](EXPERIMENT_TEMPLATE.md) for repeatable experiments. Give experiments stable IDs such as AT-001 and descriptive filenames.
- Record what was actually tested, which rig/asset/tool/version was used, settings, results, artifact paths, and relevance to future implementation. Separate observed results from assumptions and proposed ideas.
- Link source references and record asset provenance/reuse terms when known. Do not treat a reference image/video as an animation asset or proof of permission to reuse it.
- Keep experimental assets, scripts, and results here where practical. Record any dependencies on the main game. Integrate into the game only when that step is explicitly requested.

## Existing reference material

Preserved animation experiment (rejected; no longer the default): [AT-006 — Low sword carry](AT-006-SWORD-CARRY.md). The animation-mode route retains Quaternius walking with a derived one-handed carry and a Sword side camera. Sword carry toggles the adaptation at the same stride time; original motion and legs-only comparison remain available. [AT-005](AT-005-FULL-BODY.md) records whole-body source coordination and [AT-004](AT-004-QUATERNIUS.md) records the library inventory. Walking, formal walking, jogging and sprinting are available. Sprint enter/exit remain absent. No main-game integration.

Active showcase: [Rig workbench](AT-001-Rig-Workbench/README.md). The Reference rig selector retains the prior Mixamo/AT-003 procedural experiment for comparison. AT-003 v2 was rejected by user review as creeping; passing its numerical checks did not establish visual quality. AT-001 preserves the original .blend workspace as an archive.

- [Player movement specification](../PLAYER_MOVEMENT_SPEC.md): body mechanics for locomotion, attacks, evasions, defense, reactions, finishers, and transitions.
- [Animation inventory](../animationslist.md): coverage, clip families, reference-video observations, and unresolved attack directions.
- [Character quality criteria](../CHARACTER_QUALITY.md): visual acceptance and outstanding problems with the current sample.
- [Development notes](../DEVELOPMENT.md): current rig, gameplay timing, contact, grip, and detachable-part interfaces.

## Initial focus

Start with one complete walking stride: foot support, weight transfer, pelvis motion, spine/chest coordination, shoulder/arm swing, head stabilization, and clean looping. Review front, side, rear, and gameplay views at slow and normal speed before expanding.

The user supplied Examplerig.blend and subsequently chose not to install Blender. Use browser-ready GLB/glTF references and browser animation experiments instead. A separately attributed animated humanoid is now available in the showcase. The original .blend is preserved; no conversion or claim of testing its rig has occurred. New motion authoring remains a separate experiment from playing a supplied reference clip.


## Footwork integration — AT-012

Imported [PR #1](https://github.com/LimeyJuicy/Game1/pull/1), original experiment [AT-007 — Fencing footwork](AT-007-FOOTWORK.md). The footwork bench now adapts the supplied knight and sword; the earlier native knight remains a comparison option. Run `npm run footwork:dev`. This is isolated testing; the main game still uses its existing actor, with the PR’s optional `?footwork` hook preserved. See AT-012-KNIGHT-FOOTWORK.md for the current adaptation and limits.

## Upper-body architecture research — AT-013

[AT-013 — Upper-body and full-body architecture](AT-013-UPPER-BODY-ARCHITECTURE.md) audits the current native/game and imported/bench rigs, compares authored poses + IK, clips + blending and procedural full body, and proposes shared deterministic pose evaluation and early visual authoring. Includes ownership, weapon trajectories, combat sampling, data interfaces and staged acceptance criteria. Research proposal only; no new animation implementation or accepted demonstration.

## Upper-body rig and guard editor — AT-014

Approved AT-013 Stages 0–2 now have an implementation: http://127.0.0.1:5175/?upperbody (`npm run footwork:dev`). Edit upper-body joints on the actual knight, switch between two guards, preview/scrub transitions, calibrate the sword socket and download/load JSON. Existing footwork bench remains at /. See [AT-014 implementation and controls](AT-014-UPPER-BODY-EDITOR.md). Stages 3–5 are now implemented separately in the Phase A preview described below.

## Bounded IK and stationary extension — AT-015

[AT-015 implementation and controls](AT-015-PHASE-A.md): actual knight, bounded two-arm weapon targets, blade edge roll, stationary preparation/extension/recovery, pure final-weapon trajectory/contact queries and JSON definitions. Open http://127.0.0.1:5175/?upperbody&phaseA. Existing footwork and live combat remain unchanged. Phases B/C are pending; visual approval is still required.

## Downloaded sword/combat source library — AT-016

[AT-016 — KinemIQ library](AT-016-KinemIQ-Library/README.md) contains 175 downloaded GLB motion sources (52.55 MB), with [readable animation index](AT-016-KinemIQ-Library/INDEX.md), per-file licence/credit records, source snapshots, hashes and Three.js verification. Includes sword attacks/guards/recoveries, defense, dodges, combat footwork and reactions, with optional unarmed/shield/style references. Collection only: knight retargeting and visual review remain subsequent work; live gameplay is unchanged.

## Downloaded cut + PR footwork — AT-017

[AT-017 — Single-handed sword cut demonstration](AT-017-Cut-Footwork/README.md) is available at http://127.0.0.1:5175/?cut. Compare the downloaded cut with planted feet and a short PR attack step/recovery. The current sword is resized to about 1.10 m and held in the right hand; the left arm/fingers follow the source motion. Previous two-hand/IK studies remain accessible; live combat is unchanged.

## Expanded single-handed review library — AT-018

[AT-018 — Combat animation library](AT-018-Animation-Library/README.md) extends the same viewer at http://127.0.0.1:5175/?animations with 69 data-defined review previews. [Coverage](AT-018-Animation-Library/COVERAGE.md) records sources, roles, ownership and custom-work gaps. Includes attacks/defense, eight-way movement/evasion/guarded steps, full-body roll/fall/kick, gaits and reactions. Earlier studies remain intact; this is not completed live-game migration or final production acceptance.
