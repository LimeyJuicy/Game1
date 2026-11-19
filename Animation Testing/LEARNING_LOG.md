# Animation learning log

Append-only record. Never delete or rewrite previous learning entries. Correct or supersede a conclusion with a new dated entry and reference its original ID. Record findings even when an experiment fails; label unverified ideas clearly.

## 2026-11-18 — AT-000: Workspace and starting knowledge

**Activity:** Created this learning workspace. No animation experiment has been performed here yet; no new rig, clip, asset, or tool was installed/imported.

**Established direction from the user:** Human proportions and fully coordinated body motion; flowing, forceful, calculated combat; swift controlled evasions; low running sword carry. Occasional stylish backspin strikes are allowed. Main-game finisher mechanics have been playtested successfully; current animations remain placeholders.

**Known visual feedback:** The current player's legs look awkward and duck-like; hips/torso/head and shoulders/arms do not participate convincingly. An articulated skeleton alone did not resolve movement quality. The current sample is not visually accepted.

**Previously discussed principles, still needing implementation validation:** Walking must coordinate support and swing phases, knee/ankle/toe articulation, weight transfer, pelvis rotation/tilt, trunk response, opposite arm swing, and comparatively stable head motion. Weapon carrying introduces asymmetry without freezing the upper body. See PLAYER_MOVEMENT_SPEC.md in the repository root for the full movement breakdown and biomechanics sources.

**Available references:** User-supplied still image of a fully armored knight for anatomy, silhouette, armor fit, and joint clearance. A still does not establish gait timing or provide a rig. Existing animation inventory contains video reference observations. A possible reference GLB is being prepared; none has been supplied or imported for this workspace.

**Next experiment candidate:** AT-001, one complete walking stride. Select the tool/rig approach with the user before treating a workflow as settled. No coding or animation creation is implied by this candidate.

**Integration status:** Research/experiments only. Final animation production and integration remain later work; this detour does not alter existing game mechanics.

## 2026-11-18 — AT-001: Examplerig workbench setup

**Question:** Establish an isolated workspace to inspect/test the supplied rig before any main-game integration.

**Files:** AT-001-Rig-Workbench/README.md; working/Examplerig-testing.blend; reports/source-manifest.json; reports/embedded-preview.png; viewer/; tools/; tests/.

**Source and preservation:** User supplied Examplerig.blend in Game1. Created a working copy without replacing the original. Source and working-copy SHA-256 values match and are recorded in the manifest; both were rechecked after setup. File is 845,404 bytes. Binary header is BLENDER_v276: version 2.76, 32-bit pointers, little endian. The block scan consumed the whole file and found an existing 128×128 TEST thumbnail. Extracted that saved thumbnail as PNG; it appears to show an unarmored humanoid in side view on a small base. This is a saved-file preview, not a new render, skeleton inventory, or proof of deformation quality.

**Environment:** Blender was not found on the command path or in normal application locations. The user confirmed it is not installed. No Blender executable, add-on, or external model was downloaded/installed. Existing project Three.js/Vite/Playwright dependencies are reused for the separate browser viewer.

**Workspace implementation:** npm run rig:dev opens a separate viewer on port 5174. It can load GLB/self-contained glTF, show skeleton/wireframe, select clips, play/pause/restart, scrub time, change speed, and inspect front/side/back or orbit/pan/zoom. Asset scale is retained; only a display wrapper centers/grounds the model. No example rig is silently substituted for Examplerig. The initial empty state explicitly awaits an export.

**Prepared Blender path:** npm run rig:prepare -- --check reports executable availability. After installation, rig:prepare can run a project-owned inspection/export script against the working copy, with embedded auto-execution disabled. It is designed to report bones, constraints, mesh bindings/group names, transforms, actions, frame range and version, then export a GLB without saving either blend file. The script is syntax-checked but has NOT run inside Blender or against this rig. Bone inventory, skin weights, IK/FK controls, drivers, clips, export compatibility and deformation are all unverified. glTF carries the runtime skeleton/animation, not Blender's editable control-rig UI.

**Verification:** Viewer TypeScript/production build passed. Browser test passed with an explicitly synthetic two-joint skinned-triangle/one-clip fixture: empty state, loading, skeleton/clip statistics, playback, timeline scrubbing, speed selection, camera views, overlays, rest-pose return, and clear native-blend rejection. Checked for browser graphics/runtime errors. Saved workbench-empty.png and workbench-fixture.png; the latter is a test fixture, not the user's rig. An initial test run used a nonmatching playback-speed option string; corrected the test and the rerun passed. Python scripts passed syntax parsing; availability check correctly reported missing Blender. No Blender execution/export result is claimed.

**Sources:** Official Blender glTF exporter API, file-compatibility guidance, and script-execution controls are linked in the workbench README. User-supplied asset origin/reuse terms remain unrecorded; setup is not production-use approval.

**Limits / next step:** Install or provide Blender, then run inspection/export and compare actual rig deformation in Blender and the viewer. Review legacy conversion before accepting the rig. Once the control/skin setup is understood, the walking-stride experiment can be AT-002. This supersedes AT-000's proposed use of AT-001 for walking: AT-001 is now the rig workbench. No animation authored, main-game character replaced, or gameplay code changed.

## 2026-11-18 — AT-002: Browser-first humanoid reference, no Blender required

**User decision:** The user does not plan to install Blender. This supersedes AT-001's suggested next dependency. Keep the .blend/working copy archived and use browser-ready models and browser animation experiments instead.

**Alternatives checked:** Ready-made animated GLB assets can be loaded directly with the existing Three.js GLTFLoader. Considered browser rigging services, but they add accounts/upload workflows and do not solve the immediate need for a visible reference as directly as a ready-made local GLB. No account or online conversion was used.

**First reference:** Downloaded unmodified CesiumMan.glb from the Khronos sample-asset repository (438,044 bytes). It has one mesh, 19 skin joints, one two-second animation and 57 animation channels. Recorded CC BY 4.0/Cesium attribution and a checksum. Browser loading/playback worked, but screenshot review showed an exaggerated logo head, making this less useful as an anatomy reference. Retained the file and cesium-reference-manifest.json for comparison; it is not the active default.

**Selected reference:** Soldier.glb from the official Three.js skeletal-animation example, which credits Mixamo. Asset is 2,160,468 bytes, two meshes, two skins with 49 and two joint references sharing nodes (49 unique joint nodes overall). Contains named finger chains. Supplied clips are Idle (~1.967s), Run (0.7s), TPose (~0.033s), and Walk (~1.033s), each with 156 channels. The supplied clip is a reference, not a new animation authored by this project. It is not the final medieval knight.

**Sources / terms:** https://threejs.org/examples/webgl_animation_skinning_blending.html and its official GitHub asset; Adobe's Mixamo FAQ https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html. Do not infer the model is MIT/CC0 from the library's software license. Detailed source addresses, checksum, clip statistics and provenance are in reports/reference-manifest.json and viewer/public/reference/ATTRIBUTION.md.

**Showcase changes:** The human reference loads locally and starts Walk automatically, without Blender or conversion. Existing controls inspect Idle/Run/TPose/Walk, skeleton, wireframe, speed, timeline and camera views. Preserved original asset bytes. The display wrapper centers the model without changing its scale. Screenshot review showed the first front-view convention was facing the model's back; set its camera front direction to negative Z in metadata. This changes camera framing, not asset geometry/animation. Updated playback/scrubbing status and attribution display.

**Evidence:** Viewer TypeScript/build passed. Browser check passed with the actual reference: automatic loading, four clips, Walk playback, pause/scrub, selection/evaluation of all four clips, and captured reports/workbench-reference.png. Existing synthetic-rig replacement/playback/view/rest-pose/error tests also passed, with no graphics/runtime console errors. Reviewed the captured model and corrected its front framing. Both reference assets and the original .blend checksums are recorded/verified. No main-game source or character asset was replaced.

**Limits / next experiment:** No new walk/run/combat clip has been authored or retargeted. Reference suitability and final animation quality are not accepted by automated checks. Next, examine the supplied walk at slow speed from front/side/back, identify support/swing, pelvis/spine/shoulder coordination, and compare against PLAYER_MOVEMENT_SPEC.md before modifying motion. This experiment removes the Blender dependency from the active showcase, not from all possible .blend conversion methods.

## 2026-11-18 — AT-003: New legs-only walking foundation

**User scope:** Use the reference rig and recorded animation descriptions, isolate leg movement, and implement the basics for just the legs. Work stays in the showcase; no main-game integration or full-body polish.

**Reference and approach:** Read PLAYER_MOVEMENT_SPEC.md, especially shared support/foot/knee rules and the walking cycle. The active Soldier/Mixamo GLB remains unchanged. Added viewer/legs.ts to generate a new 1.2s lower-body cycle rather than mask/copy the supplied Walk. The supplied clips remain separate comparisons.

**Rig-space lesson:** The source has centimeter-like local bone coordinates under a scaled/rotated armature: e.g. original hip local Z near 106 corresponds to world Y near 1.06m. Local Euler/Y assumptions would misdirect the legs. Calibrate thigh/shin/ankle/toe positions in world space, solve there, then convert desired rotations/hip position back through the actual parent transforms. Imported node names are sanitized (e.g. mixamorigHips).

**Implemented:** Two-bone thigh/shin solving with forward knee poles; calibrated ankle paths; 60% support/40% swing with opposite leg half-cycle offset; heel contact and lowering; forefoot pivot/heel rise; smooth swing clearance and landing; toe counter-articulation during push-off and gradual release afterward. Small pelvis translation supports compression/rise and lateral weight transfer, without pelvis rotation. Nine tracks total: Hips position plus thigh/knee/ankle/toe quaternions on each leg. No spine, arm, shoulder, head, or neck tracks. The unchanged upper rest/T-pose passively moves with the pelvis and is clipped away by default.

**Contact/loop lesson:** An in-place backward-moving stance foot looks like skating against a static floor. Match forward root speed to the support trajectory and accumulate travel across loop boundaries, following the root with the inspection camera. Virtual heel/forefoot pivots keep the appropriate contact point fixed while the ankle rolls. Turning travel off is only an in-place inspection mode. Cubic swing endpoints match support position/velocity; toe release must blend through toe-off rather than instantly reset. Upper-body animation is intentionally excluded at this stage.

**Inspection UI:** AT-003 is the default, lower body isolated, actual travel enabled, side view fitted to legs. Supporting-foot rings and per-leg phase readouts aid review; existing timeline, speed, skeleton/wireframe and front/side/back controls remain. The reversible waist plane is a display cut, not a geometry/sever operation. Disabling isolation reveals the held upper pose. Selecting a supplied clip restores full-body display and removes experiment travel.

**Verification:** Five dedicated math/rig tests pass for virtual sole support, clearance, world-pivot planting, toe/ankle/loop continuity, fixed link lengths, track scope, and unsupported-rig handling. Viewer TypeScript/build passes. Two browser scenarios pass: actual reference rig leg scope/reach/upper-joint stability/support-foot planting/phase captures, and existing reference/manual-fixture controls. First leg browser run failed only because it counted screenshot-driver ReadPixels performance notices as animation warnings; retained all movement assertions and filtered only that specific notice on the successful rerun. Other runtime/graphics/binding warnings/errors still fail the leg check.

**Measured on actual rig:** New cycle speed approximately 0.7691m/s. Maximum solved ankle-target error about 7.22e-8m; support-ankle world-Z drift across sampled flat support about 1.02e-8m. These are bone-target/numerical measurements, not guarantees of exact boot-mesh contact or artistic gait quality. See reports/legs-metrics.json for exact sampled values/tracks.

**Visual review:** Viewed side contact/passing/opposite-contact, front and upper-pose captures. Knees bend forward, each foot follows its own support/swing phase, the stance narrows to the rig's anatomical width without forced outward turnout, and upper rotations stay unchanged. This is an initial controlled foundation, not user-approved final animation. Capture paths and further limits are in AT-003-LEGS.md.

**Remaining:** Review real-time/slow motion with the user; refine weight acceptance and boot-sole/skin contact if needed. No pelvis rotation, coordinated torso/arms/head, starts/stops, turning, sprinting, combat locomotion, dodges or attacks were authored. The solver assumes this reference's axes/topology, not a universal retargeting solution. Main-game motion, source GLBs/.blend, and deferred final-production schedule are unchanged.

## 2026-11-18 — AT-003 v2: Flow, connected hips, and leg extension

**User feedback:** The first pass looked robotic/geometrical rather than purposeful and forward flowing; phases did not connect convincingly; hips looked disconnected; feet picked up too early; strides should feel elongated. Follow-up emphasized insufficient leg extension. Prior passing numerical checks did not establish visual acceptance.

**Preservation:** Archived first-pass legs.ts text, screenshots and measurements under reports/AT-003-v1 before revising. Original source model bytes and supplied clips remain unchanged.

**Changes:** Increased full cycle from 1.2s to 1.45s, stride from 1.05 to 1.22 times leg length, and support from 60% to 66%. Actual ground-support duration increases from 0.72s to 0.957s. Kept average forward speed comparable rather than only slowing playback. Delayed heel rise to phase 0.52 and toe-off to 0.66, reduced contact/push-off pitch to about +8/-18 degrees, and lowered/delayed the extra swing-clearance envelope (6.5% rather than 12% of leg length).

**Connected movement:** Added pelvis yaw with the advancing leg, subtle roll/lateral load transfer, and geometry-calibrated support height. Removed the constantly lowered/crouched hip target. Added a broad rising/carry/settling support interval, so a supporting leg can straighten for a useful portion of the step. Eight leg rotations plus pelvis position/rotation now make ten tracks. Upper local joint transforms remain unanimated; they inherit pelvis motion when revealed.

**Flow lesson:** Matching only endpoint position/velocity was not enough for a flowing leg cycle. Quintic swing/pitch curves now match acceleration too, and the low lift envelope has zero endpoint derivatives. Toe recovery stays connected through release/landing. These are authoring choices, not a declaration of biomechanical accuracy.

**Additional failure caught in review:** An intermediate hip solver let the low recovering foot constrain pelvis height, producing an extra dip and renewed knee bend. Changed it so support/carry sets body height, while the swing leg folds enough to stay reachable; constraint influence blends at toe-off/landing. A minimum knee angle alone missed this issue, so added sustained-extension coverage over the mid-support window as well as hip/leg phase tests.

**Coordinate lesson:** worldToLocal mutates its input vector. Preserve the intended world pelvis target with a clone when calculating it in more than one stage. World solving and conversion through the actual scaled/rotated parent remain necessary for this reference.

**Checks:** Six math/rig checks pass, including prolonged support, gradual early swing lift, lower base clearance, hip-leading-leg synchronization, nonstretching links, loop continuity, and sustained mid-support extension. Viewer build passes. Final actual-rig browser captures/measurements and review results are recorded in the project update log after completion.

**Scope and limits:** Still the isolated lower-body experiment. No active spine/shoulder/arm/head animation, gameplay changes or integration. Virtual contact and skeleton measures do not certify boot-mesh ground contact, final gait quality, or user acceptance. Review both normal speed and slow side/front views before choosing the next refinement.

### AT-003 v2 — Actual-rig review and verification

Six math/rig tests, both browser scenarios, and the viewer TypeScript/production build passed on the final revision. Reviewed side contact/passing/opposite-contact and front captures. The support leg is visibly straighter at passing, the step reaches farther, and pelvis orientation now changes with the advancing leg. This is agent inspection, not user acceptance.

Actual-reference measurements: stride 1.07234m (was approximately 0.92291m), cycle 1.45s (was 1.2s), speed 0.73954m/s (was 0.76910m/s). Support knee bend reaches about 7.18 degrees without locking; 73.64% of samples in the defined mid-support window (phase 0.2–0.48) have less than 15 degrees of bend. That percentage is not the entire stance phase. Sampled support-ankle Z drift was about 0.014mm, and maximum generated ankle-target error about 1.10e-7m. Both are numerical/bone checks, not final mesh-ground collision checks.

The final carry envelope has one rise, an extended support interval, and one settling transition per step. Reach-aware swing folding prevents an extra dip; release/landing constraints blend in/out so a foot-state switch does not abruptly change hip height. Preserved lower-body scope and upper local pose. Await further user review of actual playback; no main-game integration or claim of final animation quality.

## 2026-11-18 — AT-003 v2 rejected; proposed reference-led investigation

**User review:** v2 looks like creeping. User suggests keeping heel contact longer, raising toes as a step leads, and giving recovery a slight outward path rather than linear stepping. User asks for a better way to determine the motion, recognizing that individual tips may be insufficient. This explicitly supersedes any impression that the previous agent screenshot review established visual success.

**Diagnosis limit:** The procedural ankle/virtual-sole constraints and numerical extension measures cannot establish a believable weight-transfer rhythm or visible boot contact. The current authored foot trajectory has no lateral recovery arc. Existing checks measured a virtual pivot and ankle position, not the actual heel/forefoot surface on the boot. No claim is made that one parameter adjustment has been proven to cause or solve the creeping.

**Proposed next experiment (not implemented this turn):** Isolate the source Walk's pelvis and leg tracks while holding upper local transforms; compare it alongside the custom cycle on the same rig, at matched phase/cadence/camera. Mark representative contact, load, passing, heel-rise, toe-off and recovery frames. Add heel/forefoot landmarks calibrated to the visible boot and traces from side/front views. Measure contact timing, knee extension/recovery, pelvis lead/weight transfer, and lateral foot travel together.

**Authoring direction:** Start with the supplied coordinated motion as an inspection baseline, then change one feature at a time. Test toe-up leading contact and heel settling against actual mesh landmarks; add a small outward recovery arc while retaining aligned planted feet/knees. Do not create exaggerated turnout or fix perceived creeping merely by increasing stance time again. If the supplied clip is itself unsuitable, inspect real walking footage before treating it as the target. Derived source-clip experiments must be labeled as such, not represented as newly authored gait.

**Status:** Method discussion and documentation only. Source Walk/Idle/Run/TPose presence and durations were confirmed in the local reference manifest. No new motion, comparison instrumentation, asset edits, or test result is claimed. Main-game and prior experimental code remain unchanged. No Blender installation is required for the proposed browser comparison.

## 2026-11-18 — Free animation source research

User asked about free Unreal and other online animation templates. Verified primary creator/vendor pages and recorded the shortlist in ANIMATION_SOURCES.md: Quaternius Standard (free, CC0, GLB exports), Mixamo (free Adobe ID, game-use permissions), and Epic Game Animation Sample (free Unreal-format sample, 500+ animations). Full-library counts must not be represented as verified free Quaternius subset contents. Epic listing also displays an AI-use restriction; its asset use/export permissions require clarification before processing.

Recommendation remains a source-motion comparison, beginning with the existing local Walk and then a browser-friendly free Quaternius candidate. No new files downloaded from these libraries, no new clips inspected in motion, and no retargeting, runtime changes or visual acceptance claimed. Browser suitability and quality remain untested. Documentation-only; runtime tests not applicable.

## 2026-11-18 — Quaternius locomotion selected; download unavailable

User approved the research direction and specifically selected Quaternius walk, sprint, sprint-enter and sprint-exit as preferred motion examples. Updated ANIMATION_SOURCES.md with the source-first inspection and transition sequence. Preserve leg/pelvis-first scope; approval of previews does not imply successful retargeting or game integration.

Attempted ordinary public free-download workflow: creator page and itch.io purchase HTML retrieved; free download_url endpoint returned a link, but its destination returned HTTP 429. No ZIP, GLB, FBX or animation asset acquired. Creator public viewer HTML was reachable; no motion playback or downloaded clip inspection performed. Exact free-edition coverage of the selected clips remains unknown. Do not treat website access as evidence of working retargeting. User-supplied Standard ZIP is a practical alternative.

Documentation only; procedural v2 and main game unchanged. No runtime tests warranted. No new animation or visual acceptance claimed.

## 2026-11-18 — AT-004: supplied Quaternius library loaded

**Input:** User placed Universal Animation Library[Standard] in Game1. Inspected bundled README/License and both GLB inventories: 43 clips each, in-place and root-motion versions. CC0 confirmed locally. Walk_Loop (1.3333s), Walk_Formal_Loop (1.3333s), Jog_Fwd_Loop (0.9333s), Sprint_Loop (0.6667s) present. Sprint enter/exit absent; do not claim transitions were loaded or authored. Original files untouched. Copied the in-place asset/License into viewer public reference; recorded SHA-256 and full inventory in reports/quaternius-manifest.json.

**Experiment:** Default showcase now uses source Quaternius rig, Walk_Loop, hidden upper body, 36 derived lower-body tracks (root/pelvis and five joints per leg, three transform channels each). Preserve source timing and values; no gait curves retuned. Upper local transforms rest while inheriting pelvis. Four lower-body clips plus all supplied full-body clips selectable. Added reference selector preserving previous Mixamo/procedural experiment, accessible via ?reference=soldier. In-place source playback does not use invented forward speed or procedural support rings. User-approved source previews remain distinct from retargeting approval.

**Verification:** Viewer build passes (existing bundle-size advisory); six procedural checks pass. New browser test passes all four lower masks, changed pelvis/leg poses, frozen upper locals and restoration after full source playback, playback/scrubbing and rig switching. Agent inspected captured side walk/sprint stills: visible articulated source poses and lower isolation. Screenshots do not establish cadence quality, contact accuracy or user acceptance. Browser first attempt could not reach local server under sandbox (EPERM); elevated server attempt found existing port in use; elevated browser checks reused that running showcase successfully.

**Limits:** Native source rig only; no retargeting, synchronized side-by-side, boot-contact traces, final character artwork, transition authoring or game integration. AT-004-QUATERNIUS.md records workflow and evidence; source shortlist/READMEs updated. Full browser regression result follows separately.

### 2026-11-18 — AT-004 final verification

All three browser scenarios passed, covering Quaternius source-mask inspection, retained procedural leg checks and manual rig/reference controls. Viewer TypeScript/build and six procedural math/rig tests passed. Source GLB copy checksum matches the supplied original. Documentation and evidence are recorded; main-game source unchanged. Remaining limits: no retargeting, sprint enter/exit assets, full motion-quality acceptance or integration.

## 2026-11-18 — AT-005: full-body walking coordination

**Authorization/direction:** User accepted upper-body coordination before dodging. Began the first recommended step: inspect complete walking using accepted source-motion approach. Sword carry, start/stop and dodge authoring remain later steps, not silently claimed complete.

**Changes:** Showcase defaults to full supplied Quaternius Walk_Loop, skeleton hidden and three-quarter view. Added same-time Full body / Legs & hips comparison, preserving play/pause state and source pose time; added upper-body and three-quarter camera buttons. Upper camera restores full motion when invoked from a lower mask. Existing masks and prior rig retained; ?body=legs retains earlier startup mode. Source bytes/keyframes untouched. Upper-body motion already exists in supplied clip; this is reference playback/inspection tooling, not original animation authoring.

**Evidence/learning:** Four source-walk sample phases show approximately 31-degree upper-arm changes, clavicle variation ~5/9 degrees, spine_03 ~9 degrees, neck/head ~6 degrees relative to first sample. spine_01 remains essentially fixed locally. This demonstrates distributed source motion without requiring every joint to rotate; does not prove anatomical correctness, world gaze stabilization or whole-loop extrema. Full/masked comparison preserves tested pelvis/leg pose and restores full upper pose; comparison is intentionally instantaneous for inspection. Screenshots reviewed for whole/upper framing, not treated as user acceptance or a video-quality review.

**Validation:** Viewer TypeScript/build passes with existing bundle-size advisory. New browser scenario passes moving upper-joint checks, phase-matched lower pose, pose restoration, and paused/playing comparison state. Captures and joint data stored in reports/full-body-*. Full browser regression result recorded below. No main-game changes, sword adaptation, sprint transitions, retargeting or dodges.

### 2026-11-18 — AT-005 final verification

All four browser scenarios passed: full-body phase comparison, retained procedural study, Quaternius lower masks and manual/reference controls. Viewer TypeScript/build and git diff --check passed. Existing bundle-size advisory remains. User review is pending; no claim of final animation quality, sword-carry implementation, transition animation, retargeting or main-game integration.

## 2026-11-18 — AT-006: low sword carry adaptation

**Direction:** User accepted whole-body walking and requested continuation. Implemented next agreed step: one-handed low carry in the showcase, preserving source coordination. Read movement specification: weapon beside body, backward angle/ground clearance, restrained weapon arm, participating free arm/chest.

**Implementation:** Added carry.ts derivation of four source locomotion clips, sampled ~60Hz. Replaces only right arm/forearm/hand and finger quaternion tracks; retains remaining source keyframes. Two-bone solve constrains reach without stretching, mixes 12% of source hand travel, and uses outward/backward elbow pole. Calibrated grip/socket from palm landmarks; sampled source Sword_Idle fingers. Added simple study sword prop. Native rig right is negative X; solver targets explicitly corrected for this convention before browser review. No final character or weapon artwork claimed.

**Controls:** Carry default, checkbox for same-time original comparison, remembered carry when returning from leg mask, Sword side camera default for weapon visibility. Original animation selections and archived rig retained. ?carry=off preserves AT-005 startup for reference tests. Camera-button overflow found in capture and corrected with grid layout; hidden controls honor hidden attribute.

**Evidence:** First dedicated carry browser scenario and subsequent full five-scenario browser suite pass. Eight sampled phases per movement preserve tested lower/free-arm/torso/head source poses and keep blade tip above flat ground. Minimum sampled tip heights: walk 0.587m, sprint 0.485m, jog 0.429m, formal walk 0.598m. Solve residual ~3.77e-7m to constrained target; separately recorded unconstrained preferred-target reach adjustment up to 0.135m. Earlier development diagnostic mixed those quantities; final report explicitly distinguishes them. Reach adjustment is not evidence of ideal hand placement. Captured/reviewed walk/sprint poses and weapon-side grip; no claim of user motion acceptance, continuous collision safety, or final glove fit.

**Limits:** Source rig and flat ground only, original bytes untouched. No retargeting, hand-release/guard choreography, sprint transitions, dodges or game integration. AT-006-SWORD-CARRY.md records settings, evidence and remaining review. Build passes with existing bundle-size advisory; final sidebar correction browser result follows.

### 2026-11-18 — AT-006 final verification

Final viewer build and targeted carry browser scenario pass after the sidebar layout correction; no horizontal sidebar overflow detected. The preceding full five-scenario suite passed. git diff --check passed. Captures/diagnostics updated. Review remains pending; sampled clearance and constrained-target solve checks do not certify body/armor collisions, final grip or artistic quality. Main-game source unchanged.

## 2026-11-18 — AT-006 v2: bent swinging arm and palm-down carry

**User review:** v1 looks better, but weapon arm should bend/swing rather than stay straight. Sword should point outward/backward, wrist carrying that direction without regripping. Subsequent clarification while working: back/top of wrist faces sky during walking and sprinting (palm down). Latest clarification incorporated into current revision.

**Changes/settings:** Archived v1 carry source/report/captures in reports/AT-006-v1. Replaced near-fixed hip-relative target with source-phase shoulder-relative motion: (-0.12 + 0.12*x, -0.30 + 0.06*y, -0.015 + 0.52*z), where x/y/z are original hand offsets from shoulder. Two-bone solve limits extension to at least 45-degree bend; elbow pole (-0.25,-1,-0.35). Blade direction (-0.42,0,-0.89) with restrained source yaw. Blade made horizontal for upward dorsal surface/palm-down carry. Anatomical dorsal sign inferred opposite source finger-curl direction, and wrist uses that frame. Grip socket/finger curl are constant; blade is not rotated independently in the hand. Source body/free arm/legs remain unmodified.

**Investigation:** An initial bent-arm revision aligned palm with forearm; superseded by explicit palm-down clarification before completion. Final screenshots reviewed for visible elbow bend, exposed outward/backward blade and hand orientation. Numerical checks measure orientation and pose; they do not substitute for user visual acceptance or glove/armor clearance.

**Results:** Targeted browser scenario passes all four carry clips over eight phases, including fixed grip/socket, upward back-of-hand (>0.995 vertical component), outward/backward blade, sampled floor clearance and preserved source joints. Walk hand fore/aft range ~0.157m, elbow ~95.4–98.8 degrees; sprint range ~0.217m, elbow ~94.4–100.7 degrees. Minimum sampled tip heights walk 1.070m/sprint 0.918m/jog 0.905m/formal walk 1.077m. Solve residual ~2.33e-7m, reachable target adjustment effectively zero. These are native flat-ground sampled results, not continuous collisions or final artistic acceptance.

**Records:** Updated AT-006 current settings, PLAYER_MOVEMENT_SPEC and animation inventory with clarified grip direction. Build passes with existing bundle-size advisory; final full browser regression follows. Main game and original asset bytes unchanged.

### 2026-11-18 — AT-006 v2 final verification

All five browser scenarios passed after the palm-down clarification: revised carry/grip, full-body comparison, procedural legs, source lower masks and reference/manual controls. Viewer TypeScript/build and git diff --check passed. Final screenshots/diagnostics recorded. User review pending; experimental native-rig changes remain separate from the main game.

## 2026-11-18 — AT-006 rejected; authored sword-motion research only

**User finding:** hand bends into itself; carry is completely broken. User requested stop programming and explained repeated trial-and-error wastes tokens. Marked AT-006 rejected; earlier numerical passes are not validation of believable wrist/arm anatomy. Proposed complete source-motion/static-pose approval before further authoring; user authorized searching for an existing animation.

**Research:** Official creator sources located Raise Creation Sword Running Animations (38 advertised clips, paid; video fetch unavailable), MoCap Online free T.C. Sword pack (55MB, FBX plus other formats; AI-use permit requirement on vendor page; exact desired locomotion/pose unverified), and Explosive free 88-clip sample (two-handed sword content; videos explicitly exceed free subset). Added links/limits to ANIMATION_SOURCES.md. No claim of having watched inaccessible videos or found an exact matching wrist pose.

**Decision/status:** Keep programming stopped. Research and status documentation only. No runtime changes, asset downloads, purchases/accounts or retargeting; no runtime tests applicable. Failed procedural carry remains in existing viewer, explicitly rejected in experiment notes; no silent change or integration. Next useful step is visual selection of coordinated sword-carry source rather than another solver adjustment.

## 2026-11-19 — Fencing footwork system research and knight-rig baseline

**Request:** Research only. The user asked for the best three ways to build a skeletal rigging/animation system for fencer-like lower-body footwork (stances, advance/retreat, stance-dependent side steps, later lunges and other step types, eventually the full body) within the current architecture, plus any key architecture adjustment. No implementation was requested. This is an independent pass; the user also supplied another assistant's answer to the same question, whose findings are not otherwise recorded in this log.

**Source state:** Local clone at db4ce28, identical to origin (andrewtheiss/Game1) and upstream (LimeyJuicy/Game1) after a fetch. https://github.com/Harvard-Westlake/Game1 returned "not found" with the available credentials; any newer commits there were not read.

**Tested (bone/numeric facts on the main-game knight rig, not visual acceptance):** npm test 97/97 and npm run rig:test 6/6 pass. Added read-only AT-001-Rig-Workbench/tools/footwork-baseline.ts (run command in its header); it changes no game or showcase behavior. Results:

- Stance input: toggling only combatReady across forward/back/left/right travel at 1.7 and 4.2 units/s (480 paired samples) leaves the pelvis and all eight leg bones identical (position difference 0, rotation difference 6e-8 rad); the free hand moves up to 0.646m. The only existing stance input does not reach the legs.
- Foot planting: the current gait never holds a boot still. Slowest ankle ground speed is 23% of body speed advancing at 4.2, 42% strafing at 4.2, and 34% / 50% at guarded 1.7. Retreat crosses zero only momentarily (2.6% of samples below 5% of body speed).
- Existing two-bone solve in humanRig.ts, with foot controls parented to the world rather than the character: both ankles hold world targets within 0.1mm while the pelvis travels, until reach runs out. For a sample guard (ankles ±0.24 fore-aft, ±0.10 lateral) the pelvis can travel 0.00m at hip height 0.94, 0.21m at 0.84, 0.33m at 0.74 and 0.42m at 0.64 before the rear leg is fully extended. 0.42 equals the lungeBudget cap. Beyond reach the solver clamps and the ankle leaves its target; nothing lowers the hips.
- Knee direction: with the rear boot yawed 90 degrees the boot follows (0.0 degrees error) but the knee points 91 degrees from the toes, because the leg pole vector is fixed at (0,0,-1) in rig.update.
- Reach table (thigh 0.43 + shin 0.39; ankle joint taken as 0.15 above the sole from boot geometry): hip height 0.94 / 0.86 / 0.78 / 0.70 / 0.62 / 0.54 allows a planted ankle up to 0.22 / 0.41 / 0.52 / 0.61 / 0.67 / 0.72m from under the hip.

**Read from code (not separately measured):** knight.ts drives the legs through a proxy puppet (hip 0.72, leg length 0.56 against the skinned 0.82) whose feet are positioned in the character's local frame, so nothing is fixed in world space. humanRig.update scales the body offset by 0.7 / 0.75 / 0.5 before it reaches the pelvis and has no heel/ball pivot. Attack stepping moves both feet relative to the body while the root lunges (at most 0.42, during the swing only), and main.ts reports actualSpeed 0 during attacks. The root is never moved back after an attack. sampleSwordHit re-poses the knight several times inside one tick, and poseAttack and poseDefense each re-solve the rig, so stateful foot contact must advance once per tick and pose sampling must stay pure. Poses change only on simulation ticks, including during slowed time. The workbench loads GLB reference rigs only; nothing has been shown there on the game knight. Installed three 0.187.0 ships AnimationMixer, AnimationUtils.subclip/makeClipAdditive, SkeletonUtils.retarget/retargetClip, CCDIKSolver, TransformControls, GLTFExporter and lil-gui; it has no pole-vector leg IK, masks/layers or state machine.

**Web research (two delegated passes; several items were seen only as search snippets and are marked):**

- Sport fencing: advance = front foot first, landing on the heel, rear foot follows; retreat = rear foot first; both end in guard. Advance distance 46.3±2.0cm (Chida 2023, https://www.mdpi.com/2673-7078/3/3/31, snippet only). Lunge movement time about 0.54s (https://www.jssm.org/jssm-13-66.xml-Fulltext); lunge length 1.0–1.4m and peak centre-of-mass velocity 1.7–3.4m/s depending on method (review: https://pmc.ncbi.nlm.nih.gov/articles/PMC5302478); rear foot stays flat, front heel lands first. Guard about two foot-lengths heel to heel; rear foot 68–100 degrees. Forward recovery (rear foot gathers up into guard) is a recognised action. Step duration/cadence and guard knee angles were not found.
- Longsword: the lead foot changes with passing steps, usually with each cut; gathering steps keep the lead; rear foot about 45 degrees (Meyer 1570 via Wiktenauer; https://myarmoury.com/feature_arms_gls.html).
- Techniques: IK-goal poses (Bereznyak, GDC 2016, https://gdcvault.com/play/1022984/IK-Rig-Procedural-Pose); few-keyframe procedural animation (Rosen, GDC 2014, https://www.gdcvault.com/play/1020583/Animation-Bootcamp-An-Indie-Approach); inertialization and dead blending (https://theorangeduck.com/page/dead-blending); stride/orientation/motion warping and foot placement (Unreal documentation); threshold and predictive step planners (https://weaverdev.io/projects/bonehead-procedural-animation/; Valve, SIGGRAPH 2021); analytic two-joint IK (https://theorangeduck.com/page/simple-two-joint).
- Tools: Theatre.js is frozen at 0.7.2 (2024) and its studio is AGPL-3.0. Cascadeur's free plan page says it exports .casc only and is non-commercial. Mesh2Motion (MIT code, CC0 clips, GLB export) is a clip library/retargeter, not a keyframe editor. Small maintained helpers exist (animouse: state machine/blend trees; three-zoo: TwoBoneIK), both pinned to three <0.188.
- Clips: no free fencing footwork was found. The supplied Quaternius Standard GLB has forward-only locomotion and no advance/retreat/lunge (43 names in reports/quaternius-manifest.json). One paid seven-clip in-place pack exists ("Fencing Foil Animated", Unity Asset Store, Epic skeleton; FBX availability unverified). CMU mocap has no fencing. The AGH Fencing Footwork Dataset is Kinect joint positions with no stated licence. "PlayerMotion", named in the other assistant's answer, could not be found. The Mixamo catalogue was not inspected.

**Proposals (not implemented, not tested):**

1. Recommended for combat footwork: stances and steps stored as constraint data (foot placement and yaw, hip height and bias, contact timing, swing arcs) in a stance frame; feet locked in world space while planted; analytic two-bone IK with a knee-over-toes pole, hip lowering when reach runs out, and heel/ball roll; authored on the actual knight in the browser bench with gizmos, sliders and a scrub bar, saved as data the game also loads. This uses the same kind of machinery as AT-003 (authored foot paths plus IK). What differs is the motion (pose-to-pose steps rather than a continuous gait) and who sets the look (the user through direct controls rather than an agent tuning numbers).
2. Baked AnimationClips through AnimationMixer (sourced, retargeted or hand-keyed) with IK cleanup. Suits the exploration walk/sprint the user already likes and later full-body set pieces. No fencing source exists, the custom rig needs retargeting, and each stance multiplies the clip count.
3. Planner-generated stepping (ideal-foot error triggers, predicted landings, spring pelvis). Most adaptive and least art-directable. Use as glue beneath (1) for arbitrary directions and interruptions, not as the look.

Architecture adjustment: replace the proxy puppet and captured-pose blending with one pose pipeline that writes to the skinned skeleton, split into a once-per-tick stateful advance (world foot plants) and a pure pose sample; share that module and its data between bench and game; treat lunges, and later steps, as moves on the action clock with collision-granted travel.

Open decisions for the user: guard travel speed (4.2 units/s would need about nine 0.46m advances per second and exceeds measured peak lunge body speed; blocking already uses 1.7); fixed-lead fencing steps first versus longsword passing steps; skeleton choice if library clips should play natively. Because the root is never moved back after an attack, a lunge needs a forward recovery unless gameplay changes.

Proposed proof order: real knight legs in the bench with the three solver gaps closed; two saved guards; one advance and one retreat in both; side steps, chained steps at the capped speed and a wall-shortened step; lunge with forward recovery at full, half and zero travel; game hookup behind a flag. Each rung needs the user's visual sign-off; numeric checks only guard regressions.

**Limits:** Geometry figures depend on the script's sample guard and the 0.15 ankle height. No visual review, no bench or game change, no assets added to the project, no dependency added. The next free experiment ID was AT-007 at the time of writing; it is not claimed by this entry.

## 2026-11-19 — AT-007: fencing footwork built on the game knight

Record: [AT-007-FOOTWORK.md](AT-007-FOOTWORK.md). Branch `footwork-rig`, local commits only.

**Request.** Build the system from the 2026-11-19 research on a branch, in the proof order proposed there. A guard must interrupt any animation at any time and form very quickly from the current animation, stance and place. Provide a demo and some basic moves using the researched behaviours and speeds.

**Built, in order.**

1. Leg solver on the real knight (`src/footwork/legs.ts`): hips sink when a planted foot is out of reach, knee over the toes of its own foot, heel and ball pivots. The rig takes an optional lower-body override; without one nothing changes.
2. Three guards as data (`src/footwork/stances.ts`): en garde, low, high. Lead/rear terms, so either foot can lead.
3. Advance and retreat in each guard (`src/footwork/controller.ts`), scrubbable through exact snapshots.
4. Side and diagonal steps, chained steps at the guard's own pace, wall-shortened steps, a passing step that swaps the lead.
5. Lunge at any depth with the rear foot planted; forward and backward recovery.
6. `?footwork` game flag (`src/footwork/game.ts`), player only, off by default.

The guard interrupt is part of the controller: `guard()` drops the current move, the body stops within a few centimetres, each foot not already in place goes straight to the guard, and the hips spring to it. Default 0.14 s.

**Tested results.**

- Planted-foot movement is 0 in every move, guard and tick tested; no missed foot target; no leg above 99.9% extension.
- En garde: 0.46 m advance in 0.40 s, 1.14 m/s chained. Low: 0.36 m in 0.52 s, 0.69 m/s. High: 0.50 m in 0.44 s, 1.13 m/s.
- Full lunge: 0.42 m hip travel in 0.50 s, peak 1.99 m/s (research range 1.7 to 3.4). Low guard reaches 0.36 m because the rear leg runs out.
- Guard interrupt from 11 moves × 45 ticks × 9 guard pairs: after 0.15 s both feet are down within 2 cm and the hips within 1 cm; the body moves under 10 cm after the key.
- A step, a side step and a lunge end in the same place at 60 and 144 ticks per second.
- 133 Node tests (97 existing unchanged), 6 rig-bench leg tests, 4 footwork-bench browser tests and 38 game browser tests (35 existing, 3 new) pass. Game, rig-bench and footwork-bench builds pass.
- Without the flag: the footwork object is null and E still cannot cancel a committed swing (browser test).

**Looked at, not accepted.** The assistant viewed stills of the guards, an advance, a lunge, a recovery, a pass, a side step, the wall stop and the guard interrupt, in the bench and in the flagged game. They show plausible fencing shapes. Stills do not show timing or weight. The user has not reviewed anything; this is not visual acceptance.

**Problems met.**

- Chained steps dipped in speed for one tick at each join when a step's length was not a whole number of ticks. Fixed by letting the rest of the tick go to the next move.
- A step toward a wall landed the lead foot long and then corrected. Fixed by asking how far the body can get before the foot lands.
- `moveWithCollision` advances in sub-steps of half the radius (30 cm at the bench's clearance), so it reported the last 16 cm before a wall as unreachable. The bench queries it 2 cm at a time. The function is unchanged.
- First guard-interrupt measurement had the hips 2.4 cm off at the guard time because the hips were still swaying toward the support foot. The guard snap now skips the sway.
- Interrupting a passing step dragged both feet back to the old lead (a joint moved up to 27 cm in one tick). The guard now leads with the nearer foot.
- Releasing a held direction used to finish the current step and take one more. It now stops within the current step.

**Choices the assistant made without asking.** These are the assistant's, not the user's, and each is easy to change.

- Fixed-lead fencing steps are the default; the longsword passing step exists as a separate move.
- The guard forms where the body is, rather than completing the step in progress.
- Guard time 0.14 s. It is a slider in the bench.
- In the game flag: en garde while engaged and the low guard while blocking; engaged pace follows the guard (about 1.15 instead of 4.2); E cancels an attack at any point except a riposte; hit tests keep the game's sword height while the drawn body rides on the hips.

**Not tested or uncertain.**

- Whether any of it looks right in motion.
- Step durations: no cadence data was found; they are estimates.
- Upper body: arms and sword only ride on the hips.
- The high guard dips about 6 cm per step.
- Slopes, turning while stepping, enemies, and gameplay balance at the slower engaged pace.

**Integration implications.** The engine is shared by the bench and the game, so a guard tuned in the bench is the guard the flag uses. `advance` once per tick and a pure `pose()` mean the repeated posing in blade hit sampling cannot move the legs. Full adoption would need the user's decisions on engaged speed and on cancelling swings, plus an upper body that takes part.

### 2026-11-19 — AT-007 branch and review location

Correction to the entry above: the branch is now `footloose`, pushed to `andrewtheiss/Game1`, with a pull request open at https://github.com/LimeyJuicy/Game1/pull/1. Nothing else changed. Still not visually reviewed.
