# AT-004 — Quaternius authored locomotion inspection

## Goal and scope

Use coordinated authored motion to establish a better lower-body baseline after AT-003 v2 was rejected as creeping. User specifically likes Quaternius walking, sprinting, sprint-enter and sprint-exit previews. Start on the supplied rig, with pelvis and legs only; retargeting and main-game integration are separate future tasks.

## Supplied asset

User supplied `Universal Animation Library[Standard]` in Game1. Its README distinguishes `UAL1_Standard.glb` (in place) from `UAL1_Standard_RM.glb` (root motion). Both GLBs contain 43 named clips. License.txt declares CC0 1.0 Universal. Original files untouched. The in-place GLB is copied byte-for-byte into the viewer with its license and [manifest](AT-001-Rig-Workbench/reports/quaternius-manifest.json).

Confirmed selected clips:

| Clip | Duration | Status |
| --- | --- | --- |
| Walk_Loop | 1.3333 s | Loaded; pelvis/legs mask available |
| Walk_Formal_Loop | 1.3333 s | Loaded; alternate walk mask available |
| Jog_Fwd_Loop | 0.9333 s | Loaded; mask available |
| Sprint_Loop | 0.6667 s | Loaded; mask available |
| Sprint enter / exit | — | Absent from both supplied GLB inventories; no replacement transition claimed |

## Showcase

Open http://127.0.0.1:5174 with `npm run rig:dev` running. Default reference is Quaternius and default motion is Walk_Loop filtered to pelvis/legs. Choose the corresponding Sprint_Loop entry in Animation to inspect sprint. Full supplied clips are also selectable. Use Reference rig to return to the previous Mixamo/procedural study, or `/?reference=soldier`.

Derived lower-body clips retain source root, pelvis, thigh, calf, foot, ball and leaf-joint translation/rotation/scale tracks. Upper local transforms remain in rest pose; they still inherit pelvis motion. Source timings/key values are preserved. The asset mesh and animations are supplied Quaternius work, not newly authored knight art. Hiding the upper body uses a clipping plane, not mesh surgery. Source loops play in place; procedural travel and support rings do not apply to them. Do not interpret lack of world travel as lack of authored foot motion.

## Evidence and limits

Browser checks cover default loading, four masked clips, changing pelvis/leg poses, unchanged upper local rotations, playback/scrubbing, full-body-to-mask reset, and switching back to the previous rig. Screenshots in reports/quaternius-* show side/front walk and side sprint/full-body walk. Agent screenshot inspection confirms visible articulated poses and correct lower-body isolation. This is not user acceptance, measured foot-contact validation, a motion-video quality assessment, or evidence of successful retargeting.

A synchronized side-by-side comparison, actual boot-contact traces, new gait authoring, sprint transition authoring and gameplay integration have not been implemented. Root-motion variant is inventoried but not the active viewer asset. Do not infer that sprint-enter/exit previews are free from their absence here; check creator tier contents before seeking them separately.
