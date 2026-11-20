# AT-018 — Single-handed combat animation review library

Implemented 2026-11-19 after the user approved AT-017 and requested the remaining game animations. This is a reusable review library on the actual imported knight, not a claim that every production animation or live gameplay transition is finished.

## Preview

Run `npm run footwork:dev`, open <http://127.0.0.1:5175/?animations>.

Choose **Category**, choose **Animation**, then **Play animation**. Speed, scrub, orbit/front/side/hand views, foot markers, skeleton and tip trail use the existing viewer. Attack entries offer planted feet versus a short PR attack step. Guarded movement, evasions and full-body actions select their pose owner automatically. The camera follows planar root travel so sprinting, rolls and falls stay visible. Replay/Return to start explicitly resets the isolated preview.

Source assets are loaded on selection and cached; all actions share one knight, one 1.10 m right-handed sword and one scene commit. The old `/?cut`, footwork `/` and `/?upperbody&phaseA` studies remain available. The earlier IK study retains its historical two-handed setup.

## What is available

69 data-defined previews using 27 downloaded motion sources and four existing native gait/idle clips:

- Six distinct light source cuts, three heavy source cuts, and six explicit light/heavy recovery studies.
- Combat ready, high guard, held sword block, parry/redirect and block recoil. Normal/perfect parry share the movement; perfect-defense effects belong to gameplay.
- Feint/withdraw and a dash-cut counter candidate. This does not implement guaranteed hits or defense breaking.
- Eight-way PR combat movement, eight-way guarded movement and eight-way controlled evasive steps. Evasions use the unchanged PR planner at a 1.65 time scale, with planned events expressed in preview seconds.
- Eight directional roll adaptations from a forward-roll source. Side/back/diagonal entries turn into the roll; these are not eight separately authored tumbling techniques.
- Relaxed idle, walking, jogging, sprinting and acceleration/braking candidates. Travel entry/exit are blends of the authored gait, not newly sourced dedicated clips. Final carry angle, foot-phase contacts and live movement transitions still need review.
- Chest/head hit, exposed defense-break posture, grounded knockback/recovery, get-up and held death pose.
- Enemy front kick and taunt, plus a restrained sword-raise victory salute.

[Coverage and source mapping](COVERAGE.md) lists every preview, source slice/held pose and intended game role. Reused source poses and directional adaptations are explicit. These are 69 previews, not 69 unique source recordings or approved final techniques.

## Bone ownership and deterministic sampling

`src/animation/animationLibrary.ts` validates the catalogue and selects one of three existing/shared evaluation paths:

1. **Upper action:** the AT-017 composer supplies preparation/perform/recovery. Source torso/arms/head/fingers combine with PR foot constraints. Small action hip requests resolve before leg IK.
2. **PR movement:** a scratch PR planner builds an immutable 240 Hz root/foot constraint plan. Combat guard or held-block upper pose rides on the resolved pelvis. Sampling never advances a live controller.
3. **Full body:** source joint motion owns the whole skeleton for rolls, kicks, falls and travel gaits. Standing-foot IK does not compete with an airborne leg. Source/target frame and stature calibration preserve target segment lengths; planar travel is separated from pelvis height. A kinematic floor offset prevents fitted sole/body-support markers passing below the floor. This is nonpenetration correction, not a physics/contact-lock solver.

`footworkPlan.ts` is extracted from the proven AT-017 scratch planner; the original PR controller and leg solver are unchanged. `fullBodyClip.ts` reuses the same source sampler and fitted-axis conventions. Right fingers keep a closed grip for unarmed source actions; the left arm remains free. `singleHandSword.ts` and original knight/sword/source GLB bytes are preserved.

Source hip yaw is unwrapped across ±π before limiting; a representation seam must not reverse a bounded hip contribution. Bounded action hip requests are preplanned at 240 Hz using the PR hip half-life. This provides a finite response to fast source turns without integrating state during pose queries. Same time/state gives the same pose, including out-of-order sampling. Rendering and tip trails consume the same final FK weapon transform.

No live combat rules, input semantics, movement locks, damage, warning stars, invulnerability, slow motion, hit windows, enemy behavior or finisher eligibility are changed by this preview library. It does not silently migrate the live native actor onto the imported knight.

## Add or refine an animation through data

Edit `src/animation/assets/combat-library.json`:

- Pick a unique ID, human-readable name, category and source ID; retain source credits.
- Choose `upper`, `footwork` or `full` ownership.
- Set preparation/playback/recovery/settle seconds. `sourceFrom`/`sourceTo` trim normalized source time; `holdPose` samples one authored pose.
- Upper attacks can specify `stepDepth`. PR movement selects a direction and movement family, with optional `footworkSpeed`.
- Full-body actions can configure planar `travelScale`, direction `heading`, gait `velocity`/`cycles`, terminal pose hold, and `bodySupport` floor markers.
- Supply intended game roles and honest review notes. Do not relabel a mirrored/repeated source as a newly authored execution.

Then run:

```sh
node --experimental-strip-types "Animation Testing/AT-018-Animation-Library/tools/sync-library.mjs"
node --experimental-strip-types "Animation Testing/AT-018-Animation-Library/tools/sync-library.mjs" --check
```

The helper checks source files/credits and generates asset URL imports plus COVERAGE.md. Existing source motions can be reused for a new entry without new technique-specific animation logic. All 69 entries use this path. Playback editing is data-based for now; the viewer timeline scrubs motion, not a general joint/keyframe/curve editor.

The source catalogue/credits remain in AT-016. The current selection includes CC0, CC BY 3.0 and CC BY 4.0 sources; runtime source links and upstream/community credits are retained. Review UI preview status does not waive licence requirements.

## Still requires custom work

The UI's **Still needs custom animation** section and COVERAGE.md preserve explicit gaps: the complete 24-light/six-heavy execution chart; four still-undefined light paths; five paired finishers (ten character tracks plus prop/contact/gore/camera choreography); a dedicated single-handed thrust; omnidirectional blade interception; arbitrary interrupts/chains/contact outcomes; and final carry/contact/armor/finger/cloth/slope/collision polish. Eight-direction turn-and-roll previews do not finish the planned authored directional roll/transition coverage.

Get-up starts on the ground and death holds the final pose. Matching a live interrupted pose, dropping the sword, blending into a particular next action or synchronizing a finisher victim remains separate work. Source timing/retimed travel here is a visual candidate, not a balance change.

## Findings and evidence

- The exaggerated raw knockback needed a 28 cm fitted floor correction. Replaced it with the grounded community knockback/recovery source rather than accepting that result; sampled floor corrections for the final set remain below the 12 cm regression gate.
- Dense checks caught hip reversals at a source Euler seam and an excessively fast bounded hip request. Continuous yaw plus the preplanned PR response removes those snaps; no per-query smoothing/history was added.
- A sped-up source victory gesture failed the motion continuity gate. Replaced it with a restrained sword salute using an authored high pose, keeping this knight's controlled style.
- A browser pass was interrupted by hot reload while its source module was being edited; final checks run against a stable module graph. The bench keeps its own Vite optimizer cache.
- Actual model evidence is saved under `AT-007-Footwork/evidence/imported/library-*.png`. Heavy, block, dodge, roll, death, kick and sprint captures were inspected. Numerical continuity/contact checks are not final user approval or a target-device performance certification.

## Final verification and changed files

- 148 Node tests pass, including 897 sampled library poses, source/scene immutability, out-of-order reproducibility, segment/scale preservation, right-hand attachment and actual rendered weapon/ankle transforms. Dense upper-action sampling reports maximum adjacent pelvis step 0.057324 rad and joint step 0.45405 rad at 180 intervals per action. These are sample-spacing metrics, not target-device frame rates or a certificate of artistry.
- Seven retained rig tests pass. All nine workbench browser tests pass in one full run (3.1 minutes), including loading and sampling all 69 entries, representative actual-mesh captures, controls, credits/gaps and the preserved footwork/cut/IK editors.
- Workbench TypeScript/production build and generated-catalogue `--check` pass. Main-game build and whitespace checks pass; no full live-game browser suite or device performance guarantee is claimed.

New shared modules: `src/animation/animationLibrary.ts`, `fullBodyClip.ts`, `footworkPlan.ts`, `previewTypes.ts`; catalogue `assets/combat-library.json`. Reused/extended `clipRetarget.ts` and `cutDemo.ts` for continuous hip contributions, source trims/holds and shared footwork plans. Existing viewer extended through `animationLibraryPanel.ts`, generated `animationSources.ts`, `cutDemo.ts`, entry/navigation; original actor/model assets are preserved. New tests: `tests/animation-library.test.ts`, bench `tests/animation-library.spec.ts`. Sync/coverage helper and this guide live in AT-018. Existing animation inventory, development/plan/sword/workspace guides and append-only logs record scope and outstanding work.
