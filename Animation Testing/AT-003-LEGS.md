# AT-003 — Legs-only walking foundation

Scope: use the browser reference and PLAYER_MOVEMENT_SPEC.md to implement only the legs first. This is a new experimental cycle, not the supplied Walk with upper tracks removed. No main-game integration or animation-quality acceptance is implied.

**Current revision: v2 — Flow and extension.** User review rejected the first pass as robotic, disconnected at the hips, too quick to pick up the feet, and insufficiently extended. The first-pass code, captures and measurements are preserved under [AT-003-v1](AT-001-Rig-Workbench/reports/AT-003-v1/).

**Latest review: v2 is also visually rejected.** The user describes creeping, insufficient heel grounding/toe-up lead, and overly linear stepping; requests a slight outward gait. Passing contact/reach/extension checks did not establish a convincing walk. Before further curve tuning, the proposed next experiment is a phase-aligned comparison with the supplied Walk's lower body and pelvis, including actual boot-contact markers and foot-path traces. This comparison has not been implemented or accepted yet.

## Open and inspect

Run `npm run rig:dev` and open http://127.0.0.1:5174/. The default is **AT-003 v2 · Flow and extension**, with lower-body isolation and travel enabled. Supplied Idle/Run/TPose/Walk remain separate comparison choices.

- Side view: knee bend, heel contact, clearance, and toe-off. Front/back: width and knee alignment.
- Pause, scrub, or use half/quarter speed. Green rings indicate supporting feet; labels identify support/swing phases.
- Keep **Travel across ground** enabled to judge planting. The character advances and the camera follows, with no travel reset at the clip loop. In-place mode intentionally leaves stance feet moving backward relative to the stationary root.
- Turn off **Isolate lower body** to see the held source upper pose. No torso/shoulder/head/arm animation is authored in this pass; the pelvis passively carries that unchanged pose.

## Implemented motion

| Part | Foundation |
| --- | --- |
| Thigh/knee | Two-bone solving against ankle targets; forward knee pole and unchanged lengths, with sustained near-straight support instead of a constant crouch. |
| Support foot | Heel-first pitch, settling toward flat, then heel rise about the forefoot. Virtual contact pivots guide ankle placement. |
| Swing foot | Clearance and forward recovery, then extension/deceleration into the next contact. |
| Toes | Counter-articulation during heel rise and gradual release after toe-off. |
| Pelvis | Synchronized yaw/roll and lateral weight transfer. Height follows contact reach and a broad support-carry interval; swing-leg recovery does not force extra hip dips. |
| Root | Forward -Z travel cancels backward stance-foot movement; progress accumulates across loops. |
| Upper body | No active spine, head, neck, shoulder, or arm tracks. |

## Authoring details

- [legs.ts](AT-001-Rig-Workbench/viewer/legs.ts) generates the cycle on the actual reference skeleton.
- 1.45s per complete left-leg cycle; opposite leg offset by half a cycle. Each foot has 66% support and 34% swing. This lengthens ground support from 0.72s to 0.957s per cycle.
- Stride is 1.22 times average thigh-plus-shin length, up from 1.05; speed is stride/duration. The steps are physically longer, not merely slower playback. Solve using actual link lengths rather than stretching.
- Contact: approximately 8 degrees toe-up, settling by phase 0.14. Heel rise begins around 0.52, reaching approximately 18 degrees toe-down at toe-off (0.66).
- Quintic swing/pitch curves match position, velocity, and acceleration through support boundaries. A low delayed lift envelope peaks around 57% through swing, with zero endpoint derivatives. Base clearance is 6.5% of leg length, reduced from 12%; reach-aware knee folding can add necessary clearance. Toe articulation releases gradually after push-off.
- Pelvis yaw is about ±4.5 degrees with the advancing leg; roll is about ±1.6 degrees and lateral transfer about 2.1% of leg length. Height is calibrated from contact reach, rises into a broad support interval, then settles into the next landing. Smooth constraints and load compression avoid sudden switches. These are authoring settings, not final measured human-gait values.
- Bake 201 samples into eight leg quaternion tracks plus pelvis position and rotation (ten tracks). Other local joint rotations stay unchanged; original GLB bytes/clips remain untouched.
- Reversible waist clipping isolates the lower body for inspection. It does not cut/edit the actual asset. The source upper rest/T-pose is held when unclipped.

## Checks and evidence

- [Math/rig tests](AT-001-Rig-Workbench/tests/legs.test.ts), run with `npm run rig:test`: virtual sole contact, swing clearance, stance-pivot stability, phase/loop continuity, fixed limb lengths, upper-joint exclusion, unsupported-rig rejection.
- [Browser checks](AT-001-Rig-Workbench/tests/legs.spec.ts): actual rig, nine-track scope, reach, support-ankle drift, unchanged upper rotations, phase captures, isolation and supplied/custom mode switching.
- [Measurements](AT-001-Rig-Workbench/reports/legs-metrics.json): bone-target measurements, not a mesh collision/artistic-quality certificate.
- Captures: [contact](AT-001-Rig-Workbench/reports/legs-contact.png), [passing](AT-001-Rig-Workbench/reports/legs-passing.png), [opposite contact](AT-001-Rig-Workbench/reports/legs-opposite-contact.png), [opposite passing](AT-001-Rig-Workbench/reports/legs-opposite-passing.png), [front](AT-001-Rig-Workbench/reports/legs-front.png), [held upper pose](AT-001-Rig-Workbench/reports/legs-upper-frozen.png).

Consult LEARNING_LOG.md for completed verification and visual observations.

## Limits and next review

This deliberately isolates lower-body mechanics. Coordinated upper-body motion, carry, starts/stops, turns, sprinting, directional combat travel, dodges and attacks are outside this pass. Pelvis rotation is now included to connect the lower body.

Calibrated to this reference's topology, scale, and forward -Z orientation. Matching bone names does not establish correct retargeting to another model. Unsupported topologies receive no substitute animation.

Contact checks use calibrated virtual heel/forefoot points and actual bone targets. Final boot-sole shape, skin deformation, mesh-ground clearance across every frame, armor, slopes and gameplay collision need separate review. The waist cut is an inspection aid, not final art. Review both real speed and slow front/side views before accepting or refining the motion.

## Extension and flow review

Check sustained extension rather than a single minimum knee-bend frame. The recorded extension fraction measures how many samples in phase 0.2–0.48 have less than 15 degrees of bend; it does not describe all stance frames or certify artistic quality. Loading and recovery still bend the knees; no locked/hyperextended support is intended.

An intermediate revision exposed another lesson: using the recovering foot as a strict low target could pull the pelvis down twice per step. The current solve prioritizes a smooth support-carry height and lets the recovering leg fold under it, blending reach constraints at release/landing. Review the full loop, not only isolated successful contact poses.
