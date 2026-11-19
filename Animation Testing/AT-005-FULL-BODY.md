# AT-005 — Whole-body walking study

## Scope

User chose upper-body coordination before directional dodges. This step exposes and inspects the supplied Quaternius Walk_Loop on its native rig. It does not author a new walk, alter source keyframes, retarget onto the knight, add sword carrying, create sprint transitions, or integrate animation into gameplay.

## Controls

Open http://127.0.0.1:5174 with `npm run rig:dev`. Default is full-body Walk_Loop, skeleton hidden, three-quarter view. Full body / Legs & hips buttons switch between the original full clip and its lower-track mask while preserving stride time and play/pause state. The lower-body joints retain the same sampled transforms; upper local transforms return to rest in the masked view. This instantaneous comparison is an inspection tool, not a gameplay transition animation.

Upper body camera button frames pelvis through head and restores full-body motion if a lower mask is selected. Three-quarter, front, side and back views remain available. Compare at quarter speed or pause/scrub. The lower-body visibility checkbox applies to lower-mask/procedural modes; unchecking it alone does not activate upper-body motion. `/?body=legs` opens the previous default; Reference rig still exposes the archived procedural experiment.

## What to inspect

- Chest rotation relative to pelvis, rather than a rigid torso or identical rotation at all joints.
- Clavicle/shoulder participation and opposite-arm rhythm, including natural elbow movement.
- Neck/head local movement and the resulting steadiness in world space. Small local motion alone does not prove gaze stabilization.
- Continuity through the source loop and the relationship to existing foot support and hip transfer.

## Evidence

Browser samples at 0, 0.333, 0.667 and 1.0 seconds confirm source upper-arm, clavicle, upper-spine, neck and head local rotations vary. Lower spine_01 is effectively fixed locally in these samples; motion is not required at every joint. Reported sampled maximum differences from the first pose are about 31 degrees per upper arm, 5/9 degrees at the clavicles, 9 degrees at spine_03 and 6 degrees at neck/head. These describe the supplied reference, not tuning targets or full-cycle extrema.

Test verifies identical sampled pelvis/left leg transforms across full/masked modes, restored full-body pose on return, and retained paused/playing state. reports/full-body-checks.json records joint data; reports/full-body-walk-{three-quarter,upper,side}.png record stills. Agent inspected three-quarter and upper screenshots for framing and visible body/limbs. User visual acceptance and full motion-quality review remain pending.

## Next after review

Adapt one-handed low sword carry while preserving the accepted torso/leg coordination and free-arm balance. Sword-carry posture, hand grip, blade clearance and walk/sprint variants require their own experiment. Start/stop and sprint-entry/exit remain separate, especially because this Standard pack has no sprint-enter/exit clips. Directional dodges follow the locomotion/stance work.
