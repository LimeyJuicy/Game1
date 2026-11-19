# Animation Testing

An experimental workspace for learning how to animate the knight before future game integration. Created at the user's request on 2026-11-18.

The main game's current mechanics remain the baseline. Work here does not automatically become production animation or change the schedule for final animation integration. We are temporarily stepping away from the main roadmap to learn and experiment.

## Record keeping

- Append each research session, experiment, observation, decision, and unresolved question to [LEARNING_LOG.md](LEARNING_LOG.md). Preserve earlier entries; record corrections in a new entry.
- Use [EXPERIMENT_TEMPLATE.md](EXPERIMENT_TEMPLATE.md) for repeatable experiments. Give experiments stable IDs such as AT-001 and descriptive filenames.
- Record what was actually tested, which rig/asset/tool/version was used, settings, results, artifact paths, and relevance to future implementation. Separate observed results from assumptions and proposed ideas.
- Link source references and record asset provenance/reuse terms when known. Do not treat a reference image/video as an animation asset or proof of permission to reuse it.
- Keep experimental assets, scripts, and results here where practical. Record any dependencies on the main game. Integrate into the game only when that step is explicitly requested.

## Existing reference material

Current experiment: [AT-007 — Fencing footwork on the game knight](AT-007-FOOTWORK.md). Run `npm run footwork:dev` for a bench where the game's own knight takes three guards, steps, lunges and recovers with planted feet, and where a guard key interrupts anything. Ready for review; not visually accepted. The game can load it for the player with `?footwork`, off by default.

Earlier: [AT-006 — Low sword carry](AT-006-SWORD-CARRY.md) (rejected). The showcase defaults to Quaternius walking with a derived one-handed carry and a Sword side camera. Sword carry toggles the adaptation at the same stride time; original motion and legs-only comparison remain available. [AT-005](AT-005-FULL-BODY.md) records whole-body source coordination and [AT-004](AT-004-QUATERNIUS.md) records the library inventory. Walking, formal walking, jogging and sprinting are available. Sprint enter/exit remain absent. No main-game integration.

Active showcase: [Rig workbench](AT-001-Rig-Workbench/README.md). The Reference rig selector retains the prior Mixamo/AT-003 procedural experiment for comparison. AT-003 v2 was rejected by user review as creeping; passing its numerical checks did not establish visual quality. AT-001 preserves the original .blend workspace as an archive.

- [Player movement specification](../PLAYER_MOVEMENT_SPEC.md): body mechanics for locomotion, attacks, evasions, defense, reactions, finishers, and transitions.
- [Animation inventory](../animationslist.md): coverage, clip families, reference-video observations, and unresolved attack directions.
- [Character quality criteria](../CHARACTER_QUALITY.md): visual acceptance and outstanding problems with the current sample.
- [Development notes](../DEVELOPMENT.md): current rig, gameplay timing, contact, grip, and detachable-part interfaces.

## Initial focus

Start with one complete walking stride: foot support, weight transfer, pelvis motion, spine/chest coordination, shoulder/arm swing, head stabilization, and clean looping. Review front, side, rear, and gameplay views at slow and normal speed before expanding.

The user supplied Examplerig.blend and subsequently chose not to install Blender. Use browser-ready GLB/glTF references and browser animation experiments instead. A separately attributed animated humanoid is now available in the showcase. The original .blend is preserved; no conversion or claim of testing its rig has occurred. New motion authoring remains a separate experiment from playing a supplied reference clip.
