# AT-017 — Downloaded sword cut with PR footwork

2026-11-19. Isolated review demonstration. User revised the weapon from two-handed to single-handed during this session; the final preview follows that decision. Earlier footwork, guard and two-hand IK studies are retained.

## Watch it

Run `npm run footwork:dev`, open <http://127.0.0.1:5175/?cut>.

Press **Play cut**. Compare **Planted feet** and **Short attack step** using the dropdown. Use the timeline, slow playback and front/side/three-quarter/hand views. Optional skeleton, foot targets and final sword-tip trail help inspect contact. End playback stays at the ending location; Replay/Return to start explicitly resets the demonstration. No pose authoring is required to see the result.

## Sword resize

The original approved `player-sword.glb`, OBJ, MTL and textures remain byte-for-byte unchanged. `src/animation/assets/single-hand-sword.json` defines scale 0.34 instead of the previous 0.54. On the 1.8 m knight this physically measures approximately **1.10048 m**, previously **1.74783 m**. This is an actual display/attachment transform applied to the mesh, not a label or alternate placeholder shape. The right-hand socket is repositioned for the smaller handle. The left arm is free. Source grip coordinate remains Y=0.045.

This applies to the new cut preview. Archived footwork/two-hand editors retain their prior setups, and the native live-game actor has not been migrated. The canonical design direction is now single-handed; related design/movement/sword documentation has been updated. Travel carry animation selection is still pending.

## Source and composition

Cut: `AT-016-KinemIQ-Library/clips/sword_light_a.glb`, Quaternius Universal Animation Library 2, CC0 1.0, downloaded through KinemIQ. Guard: `sword_idle.glb`, Quaternius Universal Animation Library, CC0 1.0. Original provider credits/download hashes are in AT-016's manifest/CREDITS.md. No provider files are edited.

`src/animation/clipRetarget.ts` samples source tracks into scratch transforms without advancing a live mixer or writing the source scene. Humanoid joints are mapped by name; the existing fitted trunk/clavicle axes are retained while source limb orientations are mapped into the knight's frame. Source upper-body, neck/head, arm/hand and finger motion is retained; source pelvis/root/leg travel does not compete with PR footwork. The final version uses single-handed source motion directly; it does not force the left hand onto a second grip.

`importedLowerPose.ts` is a pure adapter matching the existing imported-knight footwork calibration. `cutDemo.ts` runs the unchanged PR planner on a scratch clock to construct a dense 240 Hz foot-constraint/root plan. Absolute-time queries interpolate those constraints and re-solve the legs. Bounded source hip twist/lean enters **before** leg IK; torso/limb animation is retargeted relative to that resolved pelvis. One final pose feeds rendering and the displayed weapon trajectory. Only `applyEvaluation` commits bone/socket transforms; root placement is committed beside it.

The short step reuses `lunge(0.35, 0.5)` as an authored attack step, followed by `recover(true)`. It advances the body 0.147 m during the cut and finishes 0.303 m forward after gathering the rear foot. Lead-foot plant is at 0.65 s, inside the cut (0.5–0.867 s). Preparation is 0.5 s, the source cut is played over 0.367 s, recovery 0.65 s, settle 0.3 s. These are demonstration values in `cut-demo.json`, not changes to combat timing or movement locks.

## Verification and limits

Automated checks compare the new pure leg adapter against the existing imported PR adapter with normalized quaternions, verify right-hand attachment and actual mesh length, preserve segment lengths/scales, compare actual ankle/weapon transforms to evaluated targets, and check deterministic out-of-order queries without scene/definition mutation. Across 240 intervals per mode, maximum adjacent joint step measured 0.16265 rad, with actual ankle error below 3.8e-8 m across 124 applied samples. Neither feet nor root translate in the planted mode; hips/spine still contribute to the cut. Final transforms stay finite and the free arm changes with the source motion.

Actual-mesh browser captures: `AT-007-Footwork/evidence/imported/cut-guard.png`, `cut-prepare.png`, `cut-cut.png`, `cut-follow.png`, `cut-step-side.png`. Numerical checks establish continuity/contact, not final animation artistry. Skin/armor/cloth weights and finger deformation still need visual polish. This is one retargeted cut, not a certified historically accurate technique, completed clip library or full Phase B/C implementation.

There is no live attack damage, enemy, collision-limited stepping, hit-window migration, arbitrary interruption, parry/feint or general timeline authoring in this demonstration. The existing Phase A IK system remains available separately and unchanged. Root/foot/action coordination is proven only for this scripted isolated sequence, not arbitrary gameplay sequences.

## Implementation findings

- The initial two-handed adaptation of this one-handed clip generated unacceptable reach residuals and wrist discontinuities; it was not accepted. User then requested single-handed wielding. That supersedes the two-hand constraint for this demonstration, rather than concealing its failures or relaxing IK bounds.
- The source clips include authored finger curl. Mapping those tracks as well as the arm avoids retaining the open bind hand. Fitted finger skin weights remain a separate asset limitation.
- Old imported quaternions have tiny normalization error; equivalence checks normalize both sides, avoiding false angular failures while preserving strict positional/transform checks.
- Entry modules are now included in the bench TypeScript check. This exposed two pre-existing unused editor declarations and missing Vite CSS types; these were corrected without changing editor behavior.
- Concurrent Vite servers shared the dependency cache and caused 504 Outdated Optimize Dep responses for the new route. The footwork viewer now uses its own cache directory under node_modules. No dependency was added.

Final validation: 144 Node tests and seven retained rig tests pass; game and workbench production/TypeScript builds pass with the existing bundle-size advisory. Eight distinct workbench browser scenarios pass across runs. The full browser run initially passed seven and exposed an old Phase A JSON assertion reading a pre-render pose; changing that assertion to poll the rendered result made the focused Phase A scenario pass (30.6 s). Cut screenshots were inspected after authored finger tracks were included. `git diff --check` passes. No full live-game browser rerun or target-device performance certification is claimed.

Files added: `src/animation/clipRetarget.ts`, `importedLowerPose.ts`, `cutDemo.ts`, `singleHandSword.ts`, `assets/cut-demo.json`, `assets/single-hand-sword.json`, existing viewer's `cutDemo.ts`, `tests/cut-demo.test.ts` and bench `tests/cut-demo.spec.ts`. Small supporting changes: rig profile accepts the single-hand sword node name; bench entry/navigation/config and TypeScript entry coverage; old editor unused declarations and Phase A browser frame-wait assertion. Design, movement, sword, quality and plan documents describe the new single-hand direction. Source knight/sword/animation GLBs and live combat source are unchanged this session.
