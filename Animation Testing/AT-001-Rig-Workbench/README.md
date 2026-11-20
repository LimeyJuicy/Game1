# AT-001 — Examplerig workbench

**Default now: static knight modeling.** Open http://127.0.0.1:5174 to inspect the supplied player GLB without animation controls. The previous native knight is preserved at `/?model=legacy`. See [PLAYER_MODEL.md](../../PLAYER_MODEL.md). Animation work below is preserved at `/?mode=animation`; previous query parameters must include that mode. Animation authoring remains paused after user rejection of the carry. No separate site was created.

Isolated browser animation showcase. The user chose not to install Blender, so the default reference is the user-supplied Quaternius Standard GLB. The prior Mixamo reference and procedural study remain selectable. The original Examplerig.blend and its working copy remain archived unchanged. No main-game assets are replaced.

## Active browser-first workflow

Latest experiment: [AT-006 low sword carry](../AT-006-SWORD-CARRY.md). Whole-body reference study: [AT-005](../AT-005-FULL-BODY.md). Source inventory: [AT-004](../AT-004-QUATERNIUS.md). Run `npm run rig:dev` from Game1 and open http://127.0.0.1:5174. The viewer defaults to derived Quaternius Walk_Loop low sword carry in Sword side view. Sword carry toggles back to original full-body source at the same stride time; ?carry=off opens the unmodified AT-005 view. Full body / Legs & hips compares the two versions at the same stride time and preserves playback state. Upper body frames the torso/head; ?body=legs restores the previous startup view. Select Sprint_Loop, Jog_Fwd_Loop or Walk_Formal_Loop to inspect other lower-body clips, or a supplied full-body clip. Source loops play in place. Sprint enter/exit are absent from the supplied Standard library. No Blender, conversion or account is needed for local playback.

Reference rig switches to the archived Mixamo/procedural study; `/?reference=soldier` opens it directly. AT-003 v2 was visually rejected as creeping and is retained for comparison. New animations are not integrated into the game. [Asset attribution](viewer/public/reference/ATTRIBUTION.md) records separate Quaternius and Mixamo terms.

## Archived .blend status

- Original: `../../Examplerig.blend` relative to this directory.
- Working copy: [working/Examplerig-testing.blend](working/Examplerig-testing.blend).
- Original and working copy have matching SHA-256 checksums in [reports/source-manifest.json](reports/source-manifest.json).
- The file header identifies Blender format version **2.76**. This does not establish whether the rig, weights, constraints, or animations work in a newer version.
- An existing [128×128 saved-file thumbnail](reports/embedded-preview.png) was extracted without opening Blender. It appears to show an unarmored humanoid in side view; it does not verify rig behavior or represent a new render.
- Blender was not found in normal app/executable locations; the user confirmed it is not installed. Actual Blender inspection, conversion, deformation, and animation testing remain pending.
- The browser now intentionally loads the separately attributed GLB reference rather than claiming to display Examplerig. The original native file remains uninspected in Blender.

## Open the browser workspace

Run from Game1:

```sh
npm run rig:dev
```

Open `http://127.0.0.1:5174`. The viewer supports model loading/drop, skeleton overlay, wireframe, front/side/back views, orbit/pan/zoom, clip selection, play/pause, restart, timeline scrubbing, and speed control. It retains the asset's original scale and centers only the display origin. A browser cannot load the native .blend through this glTF viewer.

## Archived optional .blend inspection path

The user does not plan to install Blender. These prepared commands are retained only as documentation for the original file and are not required by the active showcase.

```sh
npm run rig:prepare -- --check
npm run rig:prepare
```

For a nonstandard installation:

```sh
npm run rig:prepare -- --blender /path/to/blender
```

The launcher opens the working copy in background mode, with embedded script auto-execution disabled. The project-owned inspection script writes `reports/rig-inspection.json` and exports `viewer/public/rig.glb`; it does not save either .blend file. The viewer loads that export automatically on its next page load. No Blender installation/download is performed by these commands.

The report records bones/parenting/deform flags, constraints, meshes/weights group names, armature modifiers, scales, actions, frame range, and Blender version. Export samples animation and excludes custom-shape display meshes. Control rig behavior, legacy constraints/material conversion, drivers, and action export must be checked in the actual installed Blender version. This prepared script has not run against Examplerig yet.

## Original-file checklist (deferred; active reference tests are recorded in the learning log)

- [ ] Open the working copy and inventory the actual rig/controls.
- [ ] Check rest pose, orientation, dimensions, transforms, and mesh bindings.
- [ ] Identify hips/spine/head, shoulders/elbows/wrists, knees/ankles/toes, and IK/FK controls.
- [ ] Test one limb at a time for joint direction, skin weights, and range limits.
- [ ] Inspect existing clips if any; do not assume the source includes a walk.
- [ ] Check exported skeleton/deformation/animation against Blender, including constrained joints.
- [ ] Only then author a slow complete walking stride using PLAYER_MOVEMENT_SPEC.md.
- [ ] Record settings, failures, evidence, and acceptance in the append-only learning log.

Asset provenance/reuse terms are not yet recorded. No claim of production readiness or permission to ship the model is made by creating a working copy.

## Reference sources

- [Blender glTF export API](https://docs.blender.org/api/current/bpy.ops.export_scene.html): exporter options; prepared script checks available properties.
- [Blender file compatibility guidance](https://developer.blender.org/docs/handbook/guidelines/compatibility_handling_for_blend_files/): legacy files require practical validation.
- [Blender scripting controls](https://docs.blender.org/manual/en/5.0/advanced/scripting/security.html): embedded script execution is kept disabled during initial inspection.


## Supplied knight rig review — AT-009

The original supplied model remains the default static view. A separate fitted derivative is available at http://127.0.0.1:5174/?mode=animation&reference=rigged-knight (66 bones, 43 retargeted Quaternius clips). Static fitted rest pose: /?model=rigged. The rejected sword-carry adaptation is disabled on this asset. Initial body rig only: armor/fingers/cloth need deformation cleanup; no main-game integration or user acceptance implied. See [AT-009 notes](../AT-009-KNIGHT-RIG.md). Rebuild with `npm run rig:knight`; validate serialized geometry/skin/motion with `npm run rig:verify`.

## Supplied sword review — AT-010

Open http://127.0.0.1:5174/?model=sword for the standalone textured sword. Rebuild from the supplied OBJ/PBR maps using `npm run rig:sword` (Python/Pillow). Originals remain untouched. See [PLAYER_SWORD.md](../../PLAYER_SWORD.md) for material conversion, inventory and pending hand fitting. Default knight and animation experiments remain unchanged.

## Two-hand shoulder carry — AT-011

The fitted knight animation route now loads the supplied sword at scale 0.54 and defaults to both-hand shoulder carry: http://127.0.0.1:5174/?mode=animation&reference=rigged-knight . Right hand near the guard, left toward the pommel, blade laid backward over the right shoulder. Select Idle/Walk/Formal Walk/Jog/Sprint carry variants, or disable the carry checkbox for supplied motion. Original static model/asset files and earlier experiments are preserved. `npm run rig:test` checks shared grip contact between animation keys and retained source body/leg tracks; visual acceptance remains separate. See PLAYER_SWORD.md.
