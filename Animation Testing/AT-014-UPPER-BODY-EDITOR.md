# AT-014 — Upper-body rig and guard editor, Stages 0–2

Implementation for the approved AT-013 architecture. Stops at Stage 2: no new live arm IK, attacks, damage integration or moving-footwork/action layering.

## Launch

From Game1: `npm run footwork:dev`, then open **http://127.0.0.1:5175/?upperbody**. The original footwork bench stays at http://127.0.0.1:5175/ and now links to the editor. The model/animation viewer at 5174 is preserved.

Uses the actual `red-herald-knight-rigged.glb` and `player-sword.glb`. Existing imported-actor setup establishes a fixed high footwork stance and reference at source idle time zero. It runs once during initialization; the new evaluator/adapter exclusively writes the skeleton and sword afterward. No background footwork controller or animation mixer advances the editor actor.

## Implemented

### Stage 0 — Rig and pose foundation

Shared code under `src/animation/`:

- `rigProfile.ts`: actual 66-bone hierarchy/parents, bind/reference local transforms, upper-body mask, initial editor rotation bounds, root-parent coordinate transform, measured palm centers and sword socket. Source knight remains normalized; presentation uses existing 1.8 metric scale and 180-degree facing correction. Blade local axis is +Y; editor actor faces -Z. Translations and bone lengths are locked in this stage.
- `pose.ts`: complete local pose buffers, cloning/capture, forward kinematics and scene application. Footwork's existing fixed reference is retained for lower-body bones.
- `definitions.ts`: versioned library and strict import validation, two named guards, authored transition keys, timing and limited socket calibration. Rejects unsupported profile/reference, non-finite values, out-of-range edits, lower-body channels, malformed key times and invalid socket changes.
- `evaluate.ts`: pure absolute-time guard evaluation, reference-relative quaternion blending, endpoint-edit corrections, editor bounds, complete FK matrices, weapon transform/tip and grip residuals. `applyEvaluation` commits one resulting pose and sword socket. No gameplay state or live node mutations occur while sampling.
- `assets/default-guards.json`: two default guard definitions and 121 saved joint-key samples. This is shared source data, not a second editor-only animation implementation.

The imported rig has separate clavicles, upper/lower arms, neck/head and three spine segments. `hand_l/r` serve wrist/hand rotation; there is no separate weighted forearm-twist bone. The limits here are editor ranges around the reference, not a complete anatomical swing/twist or self-collision model. Stage 3 must add the more restrictive solver constraints; broad Euler authoring ranges do not certify physical validity of every possible edit.

### Stage 1 — Independent visual controls

Select one of 13 upper-body joints (spine segments, clavicles, upper/lower arms, hands, neck/head). The selector displays each parent, with selected joint axes and a visible marker. Rotate local X/Y/Z using sliders; descendants follow the parent naturally, while unrelated local joints and the lower body remain unchanged. Editing switches to the selected guard endpoint explicitly.

Sword position/orientation controls are **fine socket offsets** in right-hand local space. The sword always remains parented to hand_r. Position calibration is limited to ±.015 original hand units (~27 mm at current scale), angle offsets to ±20 degrees. An offset of .001 corresponds to ~1.8 mm. Use the hand/arm sliders for larger motion. Arbitrarily positioning a weapon in world space and automatically fitting both arms is deferred to Stage 3.

### Stage 2 — Two authored guards and transition

- **High right guard:** hands beside the upper torso, sword carried back over the right shoulder.
- **Forward rising guard:** hands lower and forward, blade directed upward and forward, with different torso/spine/clavicle and arm rotations.

The lower-body high stance stays fixed through both guards and the entire transition. Defaults include a calibrated joint-space bridge rather than naive endpoint blending; FK playback requires no live IK. Joint keys were prepared offline using the existing two-link geometry as a pose-calibration aid. The delivered source of truth is saved rotation data: there is no shipped arbitrary-target arm solver or IK editing mode in this stage.

Guard edits alter endpoint data; the evaluator distributes endpoint corrections over the saved bridge. Torso edits generally preserve the common two-hand relationship. Editing a single arm, wrist or socket may open the supporting grip; the HUD measures it and warns above 5 mm. Stage 2 does not silently reposition the other arm. This is the explicit limited-control alternative to implementing Stage 3 prematurely.

## Editing workflow

1. Select the guard to edit. Names are editable.
2. Select an upper-body bone and adjust Rotate X/Y/Z. Sliders show degrees relative to the saved reference; edits show that guard endpoint.
3. Use Front, Side, ¾ or Hands views, orbit/zoom/pan, skeleton, selected axes and wireframe to inspect the mesh.
4. Play transition, Pause, Reverse or drag Transition. Set duration from 0.2–10 seconds and playback speed from quarter to normal.
5. Check the HUD's right/left grip residuals after arm or socket edits. Manual grip repair is possible by posing the supporting arm; automatic target fitting remains Stage 3.
6. Reset this bone, selected guard, sword attachment or all changes as needed.

## Saving and loading

**Download JSON** exports the complete current library: both guards, endpoint edits, authored bridge, duration, socket calibration and profile/reference identifiers. **Load JSON** imports it; invalid files display an error and preserve the current valid library. Download and copy the file into your project/asset workflow when ready; browser interaction does not silently overwrite repository source assets.

Edits also save a browser-local draft under `game1-upperbody-v1`. **Restore saved draft** explicitly restores it after reload. **Reset all changes** returns defaults and clears that draft. A browser draft is local to this origin/browser; downloaded JSON is the portable backup.

Keep the downloaded file for subsequent sessions. The schema references the exact Stage 0 reference (`red-herald-knight-upper-v1`, `high-stance-idle-0`); different rig/reference versions are rejected rather than silently misapplied.

## Validation and visual investigation

Regression coverage uses actual GLB geometry/skin data in CPU fixtures and the actual textured model in Chrome:

- All upper-body controls change their intended local joint without changing other local rotations.
- Pure same-time/out-of-order evaluation preserves inputs and live bones.
- Both grips through 481 transition samples; latest maximum error approximately **0.082 mm**.
- Constant local translations/segment lengths, normalized output rotations, angular continuity and distinct weapon endpoints.
- **273 actual foot-mesh vertices** sampled through the transition remain fixed within 1e-6 metric units.
- FK weapon transform equals the actual applied sword matrix.
- JSON round-trip reproduces pose buffers exactly; incompatible references, lower-body edits and out-of-range values are rejected.
- Browser controls cover guard selection, bone sliders, renamed poses, timing, play/pause, scrub, download/load and invalid JSON.

Early attempts exposed an unreachable low hand position, excessive wrist rotation and a visually high elbow even when grip tests passed. Adjusted the authored hand path/blade orientation and changed the second guard to forward rising; reviewed side/hand close-ups. Raw local Euler components can wrap near 180 degrees even where quaternion motion stays continuous, so editor ranges are not described as anatomical hinge limits. An initial round-trip angle comparison also exposed slightly non-unit float32 reference quaternions; angular comparison now normalizes inputs and reproduction is checked by exact pose data equality.

Captured evidence is under `AT-007-Footwork/evidence/imported/upper-*`. Some filenames retain “middle” from the earlier intermediate guard; the final forward-rising title is visible in the refreshed captures. Agent inspection is not user acceptance. Source armor/hand skinning still shows its known deformation limits; this stage does not claim a production-quality mesh or universal collision-free posing.

Final test/build totals are recorded in the append-only learning log and UPDATES.md.

## Stage 3 boundary

Still to implement after visual approval: movable hand/weapon targets, analytical arm IK in the shared evaluator, authored elbow-pole controls, anatomical swing/twist limits and unreachable-target handling, coordinated two-hand target correction, and eventual bounded torso reach adjustments. Finger/armor weight cleanup is an asset task where needed. Attack phases, thrusts, damage, parries, full-body moving attacks and live-game integration are outside this implementation.

## Files

Created: `src/animation/{rigProfile,pose,definitions,evaluate}.ts`, `src/animation/assets/default-guards.json`, `AT-007-Footwork/viewer/entry.ts`, `viewer/upperbody/{editor.ts,style.css}`, `AT-007-Footwork/tests/upper-body.spec.ts`, `tests/helpers/importedAssets.ts`, `tests/upper-body.test.ts`, this implementation guide and pose evidence.

Modified: footwork viewer `index.html` for routing/navigation; animation workspace README, CODING_PLAN.md and append-only LEARNING_LOG.md/UPDATES.md for records. Existing footwork/controller/leg solver and gameplay combat/damage code are not modified by this stage.

### Final results

137 Node tests, seven retained rig tests and all six bench browser cases pass. The extended editor case additionally passes after a real reload, reproducing the entire saved draft including socket settings. Game and footwork TypeScript/production builds pass; existing bundle advisories remain. git diff --check passes. No outstanding test failure. User visual approval and source mesh deformation polish remain pending. Implementation stops at Stage 2; work remains local/uncommitted/unpushed.
