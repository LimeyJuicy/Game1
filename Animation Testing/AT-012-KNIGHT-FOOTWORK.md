# AT-012 — PR footwork on the supplied knight

Source: [PR #1](https://github.com/LimeyJuicy/Game1/pull/1), `andrewtheiss:footloose`, imported head `a233cf4`. Original PR research/experiment retained at [AT-007-FOOTWORK.md](AT-007-FOOTWORK.md). The original PR used the native procedural knight; this adaptation uses the approved imported knight and sword. Local branch: `testing/knight-footwork`. No GitHub merge or push performed.

## Open the bench

Run `npm run footwork:dev` and open http://127.0.0.1:5175/ . Default is your imported knight. The Model selector retains the earlier knight for comparison (`/?model=legacy`). The static model viewer on 5174 is preserved.

| Input | Result |
| --- | --- |
| 1 / 2 / 3 | En garde / low / high footwork stance |
| W / A / S / D | Advance / left / retreat / right; combine for diagonals, hold to chain |
| T / G | Passing step forward / backward |
| Space / H / J | Full / half / zero-travel lunge |
| R / F | Recover forward / backward |
| E / Q | Take guard immediately / swap lead foot |
| Left / right arrows | Turn |
| P / comma / period / X | Pause / previous tick / next tick / reset |

Proof runs play the PR's scripted guard, stepping, wall and lunge sequences. Timeline scrubs history; speed, live tuning, leg isolation, skeleton, footprints and contact markers remain available. These are testing controls, separate from game keybinds.

## Adaptation

`AT-007-Footwork/viewer/importedKnight.ts` assembles the approved 66-bone knight and supplied sword. The normalized knight is scaled to 1.8 bench metres and turned 180 degrees to match the PR's -Z forward convention. The original assets remain unchanged. Sword retains the prior 0.54 relative scale (about 1.748 bench metres) and both-hand shoulder carry.

The leg solver now accepts optional measured anatomy while defaulting to the original `LEG_RIG` values for native/game callers. Imported bone positions supply hip width/drop, thigh/shin lengths, ankle height and ball pivot. Solved joint positions/orientations are mapped into imported bind axes with frame corrections, rather than copying the old skeleton's local rotations. The upper-body reference is the existing Quaternius idle with AT-011 two-hand shoulder carry. Source upper-body world poses are applied with distributed stance counter-turn and head stabilization.

An early local-spine blend inherited compensation for the source pelvis, tilting the chest/head when the footwork replaced that pelvis. An additional mixer-cache issue let post-mixer corrections accumulate when the same paused time was drawn repeatedly. The current adapter restores/reactivates the source sample before applying an absolute stance. Regression checks cover repeated redraw at one time; pause and scrub must reproduce the same pose.

## Scope and review limits

All PR footwork families are available with the imported model: three leg guards, cardinal/diagonal/chained steps, passing steps, wall shortening, variable lunge, both recoveries, guard interrupt and lead changes. The PR does not contain full sword attacks, parry/dodge animation libraries or a sword thrust during the lunge; this integration does not claim those. The upper body currently retains the requested shoulder carry across these lower-body studies. Final combat-ready arm guards and transitions need separate authoring/review.

The imported mesh still needs finger, armor and cloth deformation cleanup. Marker/skeleton constraints are numerical checks, not proof of exact sole geometry contact or professional visual quality. Guard timing remains the PR's estimates/tuning. Asset optimization and target-device performance remain unverified. No user visual acceptance is claimed.

The complete PR's optional `?footwork` game hookup is preserved, off by default. It still uses the existing game actor, with the PR's experimental engaged pace, broader E cancellation and visual sword/hit-test offset. This task adapts the separate bench; it does not silently substitute the new asset into combat or approve those game-design changes.

## Validation and evidence

- `npm test`: PR engine/game regression tests plus new imported-anatomy integration test.
- `npm run rig:test`: retained gait and two-hand carry checks.
- `npm run build`, `npm run rig:build`, `npm run footwork:build`.
- `npm run footwork:test:browser`: imported asset, guards, real-time stepping, interruption, scrubbing, lunge/pass and native comparison.
- `node "Animation Testing/AT-007-Footwork/tools/capture.mjs" guard-engarde-side guard-low-quarter guard-high-side lunge-full-side pass-mid advance-heel-landing` writes imported-model evidence under `AT-007-Footwork/evidence/imported/`. Original PR captures are preserved separately. `--legacy` selects the earlier actor.

Final results, failures and limitations are appended to LEARNING_LOG.md and root UPDATES.md. Numeric bone/target and grip errors do not establish mesh deformation acceptance.

### Final check results — 2026-11-19

134 Node tests, seven rig tests, five bench browser cases and 38 game browser cases pass. All three builds pass with existing large-bundle advisories. Initial game run had paused-state/timeout failures and was interrupted; isolated full rerun passes without gameplay changes. Final imported en-garde/lunge side captures inspected after posture/redraw fixes. Bone/socket target errors around 1e-8 m are numerical evidence only. Local changes are uncommitted/unpushed; user visual acceptance and final deformation quality remain pending.
