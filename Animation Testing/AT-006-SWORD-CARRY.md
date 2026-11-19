# AT-006 — One-handed low sword carry

**Status: rejected by user visual review. Programming paused at user request.** The hand bends unnaturally inward. Previous numerical passes did not establish anatomical or artistic correctness. Retain this experiment as a failed reference; do not integrate or keep tuning it without an agreed replacement approach. Research coordinated source motion and approve a complete static grip/arm pose before further implementation.

## Scope and source

Experimental adaptation on the native Quaternius reference rig, after user accepted whole-body walking. Source walk, formal walk, jog and sprint retain original timing, legs, pelvis, spine, clavicles, free left arm, neck and head. Right upper arm/forearm/hand rotations are derived; right finger rotations use the supplied Sword_Idle grip pose. Original asset bytes unchanged. This is a custom upper-limb adaptation of source motion, not a newly authored full-body animation or retargeted final knight.

## Implementation settings

`viewer/carry.ts` derives four carry clips at approximately 60 Hz, preserving unmodified source tracks. **Current v2** follows source hand motion relative to the moving shoulder: offset X = -0.12 + 0.12 × source offset X; Y = -0.30 + 0.06 × source offset Y; Z = -0.015 + 0.52 × source offset Z. Native rig right is negative X. A two-bone solve keeps anatomical limb lengths and constrains extension to at least 45 degrees of elbow bend; the sampled current poses bend roughly 94–101 degrees. The downward/outward/backward elbow pole is (-0.25, -1, -0.35), projected perpendicular to reach.

The blade points outward/backward approximately along (-0.42, 0, -0.89), with restrained source-pelvis yaw response. It stays approximately horizontal so the **back of the hand faces sky and the palm faces down**. Palm-side sign is inferred from the source Sword_Idle finger curl; the wrist is oriented using that anatomical basis. The sword socket and finger curl remain fixed, so blade orientation is carried by wrist/forearm motion rather than a rotating or sliding grip. Source skeleton orientation and flat ground are assumed; this is not a general retargeting solver.

A simple study sword is attached at a palm landmark, with local grip-axis calibration from index/pinky bases. Blade extends about 0.97 units from its grip center and points outward/backward; guard, leather grip and pommel are included. This geometry is an animation prop, not final weapon artwork. Right-finger grip sampled from Sword_Idle is a starting point, not a certified gauntlet fit.

## Review controls

http://127.0.0.1:5174 defaults to Walk_Loop low sword carry and Sword side camera. Choose Sprint_Loop low sword carry in Animation for sprint. Sword carry checkbox compares against original full-body motion at the same stride time, preserving paused/playing state. Full body / Legs & hips comparison remembers carry preference; sword hides for lower masks and original clips. `/?carry=off` starts the AT-005 unarmed source view. Three-quarter and Sword side views let reviewers inspect both body rhythm and the weapon arm. Skeleton overlay is optional.

## Checks, evidence and limitations

Browser comparisons sample eight phases per movement: unchanged source pelvis/left leg/spine/clavicles/free arm/neck/head transforms, changed weapon arm, same time during carry toggle, fixed socket/finger rotations, upward back-of-hand direction, visibly bent elbows and outward/backward blade direction. Walk shoulder-relative fore/aft hand range is approximately 0.157m; sprint is 0.217m. Sampled elbow bends: walk 95.4–98.8 degrees; sprint 94.4–100.7 degrees. Formal walk intentionally retains the source's smaller arm swing.

Minimum sampled blade-tip heights: walk 1.070m, sprint 0.918m, jog 0.905m, formal walk 1.077m. These are sampled flat-ground checks, not continuous blade/body/armor or uneven-ground clearance certification. Two separate diagnostics across all four clips report solve residual about 2.33e-7m and effectively zero target-reach adjustment in this revision. Native hand/prop fit still needs user review and later adaptation to final proportions/armor.

Previous v1 source, reports and captures are preserved in reports/AT-006-v1. User found its arm too straight and requested elbow motion, arm swing, an outward/backward blade with fixed grip, then explicitly specified back of hand up/palm down for walk and sprint. v2 supersedes v1 settings; the append-only logs preserve prior results.

Evidence: reports/sword-carry-checks.json and sword-carry-*.png. Screenshot review identified that the original three-quarter view hides the weapon on the far side, so Sword side was added and made the carry default. A sidebar overflow from extra camera buttons was found and corrected with a wrapping grid; hidden study controls now explicitly honor their hidden attribute.

No game integration, combat animation, hand release/regrip, guard transition, sprint-entry/exit clips, directional dodges or final rendering added. The next step after user review is movement transitions and eventually directional evasion; carrying into a two-handed guard needs separate grip choreography.
