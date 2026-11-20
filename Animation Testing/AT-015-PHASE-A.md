# AT-015 — Bounded arm IK and stationary extension (Stages 3–5)

Implemented 2026-11-19. Experimental workbench integration only. Phases B/C are not started.

## Reused foundation

Verified Stages 0–2: actual 66-bone knight, imported two-handed sword, captured reference/bind poses, fixed high footwork stance, two authored guards, quaternion evaluation, one scene commit, joint/socket editor and version-1 JSON. Existing footwork and gameplay controllers are preserved.

## Preview and author

Run `npm run footwork:dev`; open <http://127.0.0.1:5175/?upperbody&phaseA>.

- **Stationary target**: edit right-hand grip XYZ in bench metres (forward −Z), blade pitch/yaw and cutting-edge roll in degrees. Roll 0 presents the cutting edge in the vertical attack plane. Gold arrow shows the actual edge direction.
- Each arm has an elbow swivel. Joint bounds are under the expandable controls. Invalid or inverted bend ranges are rejected/reverted.
- **Prepared extension**: play/pause or scrub action seconds. Edit preparation, extension, hold, recovery, extension distance, drawback and small torso contributions. The end returns exactly to the starting IK guard. This is a stationary technique, not a moving lunge.
- Choose the authored seed guard. Existing bone controls still author that guard, but the IK layer owns upper arm, forearm and hand corrections while enabled. Spine/clavicle/head remain authored. Guard selector/transition buttons switch back to Stage-2 preview.
- **Download JSON** includes optional `phaseA` definition alongside both guards. Load JSON and Restore saved draft use the same validation/evaluator. Old pose libraries still load. No Downloads files or user-authored defaults are overwritten. Reset Phase A resets just the technique; Reset all restores the original library.
- Blue line is the final evaluated tip path. Magenta/gold markers distinguish requested/actual grip. The green sphere is a preview contact probe; HUD reports contact using the existing swept-blade test at 240 Hz, during the demonstration's active phase only. It does not apply damage.

## Shared runtime code

`src/animation/upperBodyIK.ts`: stateless analytical two-link solves; measured link lengths; shared rigid weapon goal projected into both arms' reachable shells; preferred elbow directions; quaternion swing/twist wrist/shoulder bounds; geometric elbow bend limits; calibrated palm frames from the actual finger landmarks. The left hand follows the actual final right-hand weapon transform. No bone translations/scales are changed. Conflicting reach/orientation constraints may leave visible residuals rather than stretching bones.

`src/animation/extension.ts`: editable serializable definition, bounded validation, absolute-time preparation/extension/hold/recovery evaluation, torso contribution, trajectory and contact sampling. Queries do not advance clocks, mutate definitions, or write the scene. The workbench clock advances once per frame; `applyEvaluation` remains the only skeleton/socket writer. Render, trace and contact expose the same final FK blade endpoints. Live gameplay migration is Phase B.

`evaluate.ts`: extracted shared final-pose/weapon resolution. Removed Euler re-clamping after quaternion interpolation; authored inputs remain bounded. This avoids discontinuous wrist changes at Euler representation boundaries.

## Validation and limits

Automated checks use the actual imported skinned mesh. The default extension reaches position/orientation within 0.001 mm / 0.001°, keeps both grips within 0.001 mm, and leaves 273 sampled foot vertices unchanged. At 120 motion intervals the maximum upper-joint step measured 0.0382 radians. Tests cover finite unreachable solves, tightened shoulder/elbow bounds, unchanged segment lengths/scales, repeated out-of-order evaluation, exact recovery, JSON reproduction, trajectory/render transforms and active/inactive contact queries. Existing guard/footwork regressions are retained.

These numerical checks do not certify animation artistry. Inspect front/side captures in `AT-007-Footwork/evidence/imported/phase-a-*.png`. Existing armor weights, fingers, rigid plates and cloth can still deform imperfectly. Joint cones are editable approximations, not a medically calibrated model. There is no body/armor self-collision solver; extreme targets, rolled grips or incompatible constraints may open the support hand or alter requested orientation. HUD reports grip/target errors and clamps. Feet/pelvis stay fixed; no balance, locomotion or action interruption integration is claimed. Only stationary extension is implemented, without live combat rules/damage changes, parries, feints or general timeline editing.

## Session file inventory

- Added: `src/animation/upperBodyIK.ts`, `src/animation/extension.ts`.
- Modified: `src/animation/evaluate.ts`, `src/animation/definitions.ts`.
- Workbench: modified `AT-007-Footwork/viewer/upperbody/editor.ts`; added `upperbody/phaseA.ts`.
- Tests: added `tests/upper-body-ik.test.ts` (repository root) and `AT-007-Footwork/tests/upper-body-ik.spec.ts`.
- Evidence: `AT-007-Footwork/evidence/imported/phase-a-target.png`, `phase-a-extension.png`, `phase-a-side.png`; retained browser suite refreshes existing evidence captures.
- Documentation: this guide, `Animation Testing/README.md`, `CODING_PLAN.md`, and append-only `UPDATES.md` / `Animation Testing/LEARNING_LOG.md`.
