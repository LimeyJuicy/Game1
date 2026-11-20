# Project updates

Append-only change history. Never delete or rewrite existing entries; append corrections or later decisions as new entries. Record implementation, documentation, validation, and material limitations for each work session.

## 2026-11-17 — Enemy blocking and defense pressure

- Created this append-only record at the user's request. Earlier work is described in GAME_DESIGN.md, CODING_PLAN.md, and DEVELOPMENT.md; this log begins with this session rather than inventing a retrospective history.
- Added active opponent guarding while ready, pursuing, and in early windup. Committed attacks, recovery, and hit reactions remain punishable. This initial enemy guard protects from all angles, like the player guard.
- Ordinary blocked lights consume 24 defense, chain-ending lights 32, and heavies 44, with no health damage or spillover. Blocking does not restart the attack clock.
- Guard depletion opens the existing one-second break, without extending it on follow-up hits; 35 defense returns afterward. Landed ripostes bypass active guard, damage health, and immediately break remaining defense.
- Added lull recovery (12 defense per second after two seconds without attack commitment or incoming sword contact), visible guard poses, block sparks, feedback, and a guarding readout/debug snapshot. Drill reset clears guard state.
- Updated the game design, coding roadmap, and development guide. Added targeted checks for pressure, exposed attack phases, fixed break duration, riposte bypass, recovery, death, and reset. Browser integration verification is in progress; results will be appended.
- Scope remains one practice opponent. Crowd coordination, full tactics, finishers, final animation rig, waves, and final art remain later work.

### 2026-11-17 — Persistent history instructions and test migration

- Added AGENTS.md so future work sessions discover and preserve the user's append-only history requirement.
- Updated the browser engagement check: an early light must now be blocked without health loss, followed by a deliberately timed heavy that punishes committed windup. This replaces the previous assumption that an idle opponent always takes health damage.
- Initial validation: production build passed (existing large-bundle warning remains), and all 47 logic checks passed. The initial browser run uses the previous engagement expectation; its expected failure is being replaced and rerun, with remaining regression checks continuing.

### 2026-11-17 — Browser validation follow-up

- Updated practice instructions and the opening screen to explain enemy guard pressure and attack openings. Visually inspected artifacts/enemy-block.png: the opponent remains at 100 health with 76 defense after blocking a light, with visible guarding and ENEMY BLOCKED feedback.
- Full browser run: 14 passed, with failures in the superseded unguarded-hit expectation and the narrow perfect-dodge timing check. The updated engagement test passed on rerun; all three engagement checks and the perfect-parry/input-lock/riposte check passed.
- The narrow perfect-dodge check failed again in the grouped run, then passed when isolated. Added temporary browser timing traces to investigate intermittent behavior; repeated verification is in progress. No perfect-dodge timing rules have been changed.
- Production build passed again after the practice-text update; the pre-existing bundle-size warning remains.

### 2026-11-17 — Perfect-dodge test timing diagnosis

- Temporary traces showed the intermittent dodge-test failure was a late synthetic input: on slow software-rendered frames the attack reached 1.00 seconds before Space was delivered, and the incoming blade hit while the dodge was still in its vulnerable startup. Other runs delivered the same scripted input earlier and passed.
- Removed temporary trace instrumentation. Changed only this browser check to use Playwright's controlled browser clock and frame callbacks, retaining actual keyboard listeners, simulation, animated blade contact, and the existing perfect-dodge windows. No gameplay timing values were relaxed. Repeated verification follows.

### 2026-11-17 — Completed validation

- All 47 logic checks passed, including five new enemy-defense checks. Production TypeScript/Vite build passed; the existing bundle-size warning remains.
- Updated engagement browser checks all passed: lock-on strafing/camera orbit, pursuing a retreating player, and blocking an early light followed by taking damage/stagger from an exposed heavy. Perfect parry, input suppression, source-bound riposte, and empty-space dodge checks passed.
- The controlled-clock perfect side-dodge/earned-roll test passed twice consecutively. Other movement, sword, and player-defense browser checks passed in the earlier full run. The full run initially had 14/16 passing before the old enemy-hit expectation and intermittent timing check were addressed; no claim is made of a subsequent single all-green full-suite run.
- Enemy blocking implementation is ready for hands-on tuning. Guard pressure and recovery values remain provisional, and representative procedural guard/attack poses still await the final animation pipeline. No final rig, crowds, finishers, waves, or deployment were added. Existing user deletions and other pre-existing workspace changes were preserved.

## 2026-11-17 — Missing attack-star investigation and fix

- Reproduced a missing warning after interrupting the opponent: at 0.60 seconds into its next windup, cueVisible was false. Damage, parries, and guard breaks resolved the interrupted strike, but that resolved flag persisted into the next attack. The affected swing could also animate without registering a hit.
- Reset strike resolution and previous-blade tracking when the ready timer crosses into a fresh windup. Interrupted attacks still hide their cue immediately; new attacks now regain both warning and contact resolution without waiting an extra attack cycle.
- Added seven logic regressions covering normal/heavy/unblockable cue colors, restart after flinch/stagger/guard break/parry/perfect parry, and single-hit resolution of the next swing. Added rendered browser captures for all three attack types and extended the exposed-heavy browser check to require the next warning after stagger.
- Updated DEVELOPMENT.md to document warning lifecycle. All 54 logic checks and the production build passed; the existing bundle-size warning remains. Browser checks and visual inspection are in progress.

### 2026-11-17 — Attack-star fix verified

- All four targeted browser checks passed: the post-stagger warning returns, and normal, heavy-blockable, and unblockable attacks display warnings before their swings.
- Visually inspected artifacts/indicator-normal.png, artifacts/indicator-heavy.png, and artifacts/indicator-unblockable.png. White four-point stars are visible for normal and heavy-blockable attacks; the unblockable star is visibly red.
- Final validation: 54 logic checks passed, production build passed, and git diff --check passed. Existing bundle-size warning is unchanged. No camera behavior, attack timings, damage values, or indicator color meanings were changed.

## 2026-11-17 — Group-combat foundation

- Continued the roadmap with milestone 6 crowd targeting/framing and a small milestone 7 coordination slice, rather than advancing to finishers before group controls are proven. Added an optional three-opponent practice drill; single-opponent practice remains the default.
- Generalized opponent hit resolution, collisions, focus, guard readouts, reset, and source-bound perfect-defense/riposte behavior to stable opponent IDs. Preserved the original trainer debug snapshot for existing practice checks.
- Added closest acquisition with stable ties, retained focus, explicit movement-plus-attack switching, defensive focus switching, and latched unblockable priority that restores the latest defensive focus afterward. Committed attack target/yaw/lunge and earned riposte source remain separate from camera focus.
- Added a round-robin attack coordinator: commitments begin at least 0.72 game seconds apart, at most two attacks commit together, and red attacks reserve the commitment window. Other opponents continue guarding/pursuing with collision separation. Values remain provisional.
- Added smooth, bounded group camera pullback and a small height increase while retaining the low third-person orbit and wall avoidance. Added directional edge stars for active warnings outside the camera view.
- Added five logic checks for focus, priority, fairness, real three-opponent sequencing, warnings, and camera expansion/return. All 59 logic checks passed. Added browser checks for group defensive focus, intentional switching, source-specific counters, and stop/reset. Build and full browser verification are in progress.

### 2026-11-17 — Group-combat browser and visual checks

- All three new browser checks passed: three-opponent turns and defensive focus transfer; movement-plus-attack selection with a fixed committed target; perfect parry and source-specific riposte damage/guard break against the second opponent. Starting/stopping the drill enables/disables all fighters.
- Visually inspected artifacts/group-combat.png. The low third-person camera retains the nearby fighters during a focus transition; the temporary health/guard readouts and three-opponent selector remain usable. The practice panel scrolls on small viewports. Actors still use representative procedural poses.
- The production build passed with its existing large-bundle warning. The initial browser launch was blocked by sandbox port binding (EPERM); rerunning under the existing approved Playwright execution rule allowed the local server to start. The full 22-check browser regression run is continuing.
- Updated GAME_DESIGN.md, CODING_PLAN.md, and DEVELOPMENT.md with group behavior, provisional coordinator/camera values, and the hands-on group checkpoint before finishers.

### 2026-11-17 — Full regression pass and priority refinement

- Full browser suite passed all 22 checks in one run, including group scenarios, attack stars, perfect defenses, single-opponent pursuit/guarding, movement, pause, walls, and fresh-press sword rules.
- Final review refined urgent-focus handling: block/parry events preserve an already active red priority immediately, and an intentional attack during that warning becomes the resumed focus after it ends. Added a direct logic regression for that pending attack intent. Reformatted the multi-opponent strike callback for readability. Final focused verification follows.

### 2026-11-17 — Group-combat checkpoint complete

- Final verification passed: all 60 logic checks, the production build, and all three group browser checks after the priority refinement. The preceding full browser run passed all 22 checks. The existing bundle-size warning remains.
- Clarified the design note: after an urgent red warning ends, the camera resumes the latest defensive source or a newer deliberate attack selection.
- To playtest, choose Opponents → Three · group combat and start the defense drill. Single-opponent timing practice remains the default. Group reset/stop reuses the same bounded fighter instances and clears coordinator, focus, guard/health, and perfect-defense state.
- This completes the first group-combat prototype for hands-on review. Advanced crowd tactics, final encounter balance, polished animation assets, finishers, waves/rewards, and additional maps remain later work. No deployment or commits were performed; existing user workspace changes were preserved.

## 2026-11-17 — Animation inventory; implementation remains paused

- At the user's request, created animation list.md as a production checklist for every currently designed animation situation: rig requirements; idle/locomotion/retreat; 24 light and six heavy executions; attack entry/chaining/recovery/cancels; block/parry/guard break; dodge/roll; dashing riposte; damage/death; individual enemy movement/attack variety; all five paired finishers; sword/hand/armor/cloth motion; camera, effects, UI, atmosphere, and transitions.
- Distinguished authored clips, blends, procedural adjustments, paired tracks, and presentation work so contextual instances are not incorrectly counted as separate exported clips. Preserved the 30 light/heavy execution minimum and five paired finishers (ten principal character tracks), without inventing an overall asset total.
- Recorded recent discussion requirements: loose uneven surrounding rather than a fixed circle; independently varied enemy attacks; successful-dodge focus changes; an earned guaranteed dashing riposte; localized white guard-break contact flash, brief impact freeze, pronounced recoil, and defense-bar shatter; human-proportioned rigs and professional full-body motion. These are planning notes, not implemented changes.
- Marked the suggested low running carry, Shift-retreat details, and earlier rig-quality checkpoint as proposals/recommendations rather than silently claiming final approval. Reserved four undefined light-cut paths within the requested 12-direction chart. Listed outstanding routing, timing, rig, retargeting, and finisher decisions explicitly.
- Added inventory links to GAME_DESIGN.md and CODING_PLAN.md. Existing prototype descriptions remain descriptions of implemented behavior. No game code, assets, dependencies, or runtime settings changed. Documentation validation follows; runtime tests are unnecessary for this documentation-only change.

### 2026-11-17 — Animation inventory documentation checks

- Validated the 451-line inventory and its 284 checklist entries, including transition contexts and open decisions. Confirmed 30 distinct light/heavy execution IDs and that all four linked local reference documents exist.
- Whitespace checks passed for the new inventory and updated design/roadmap documents; git diff --check also passed. No runtime tests were run because this session changed documentation only. Coding remains paused.

## 2026-11-18 — Sword Combat trailer animation reference

- Reviewed the user-linked Synty Studios Sword Combat trailer (https://www.youtube.com/watch?v=5YKHq8vAQ50), approximately 66 seconds. Retrieved video metadata and inspected actual browser-rendered footage in quarter-second samples through 59.75 seconds, with larger pose/grip frames. Browser seeking stalled near the end; final YouTube storyboards independently verified the fade/logo/black ending. Audio was not analyzed.
- Renamed animation list.md to the user-requested animationslist.md, preserving the full production checklist. Updated the living design and roadmap links; earlier history entries remain untouched.
- Appended a detailed, timestamped video-reference section covering the dungeon encounter, attack loading/cuts/thrusts/combo links, aerial attack/landing, directional guards, hit/stagger reactions, knockdown/get-up, deaths, idles/handling, evasive steps, rolls, and closing sword handling. Added clickable video timestamps, inventory mappings, and specific animation-quality lessons.
- Distinguished direct observations from proposed application. Did not claim that a short multi-actor trailer exposes all 105 advertised animation assets, their exact filenames, or gameplay mechanics. Flagged the aerial moves/cinematic cuts and stylized/one-handed examples for adaptation rather than automatic adoption into the grounded two-handed knight design.
- Browsing and footage capture required network/browser execution beyond the sandbox. Temporary reference pages, quarter-second images, and review sheets were kept under /private/tmp; no animation pack was purchased/downloaded/imported and no video frames were added to the game repository.
- Game coding remains paused. Only documentation and its filename/links changed; documentation checks follow.

### 2026-11-18 — Trailer-reference documentation validation

- Validated animationslist.md (672 lines), preserving all 284 original checklist entries and the existing attack/finisher IDs. Verified the new timestamped reference section, valid local document links, and updated design/roadmap filename references. Whitespace checks and git diff --check passed.
- Runtime tests were not run because this task changed documentation only. No game implementation resumed.

## 2026-11-18 — Combat revisions authorized; implementation resumes

- User approved continuing after the discussion/research pause. Updated GAME_DESIGN.md and CODING_PLAN.md before code changes with uneven adaptive surrounding, independent attack variation, successful-evasion focus switching, deliberate Shift retreat, guaranteed routed dashing riposte, and localized guard-break feedback.
- Concrete rules: retreat avoids immediate proximity reacquisition; successful combat actions/hits re-engage. Dashing counter holds its living source for alignment, respects obstacles, is protected only through committed impact, and retains the opportunity if no route is available. Break feedback freezes game/reward timers for 0.08 real seconds, discards input, and does not stack/retrigger from punishment hits.
- Brought the rigged human-character/polished animation sample ahead of finishers. This mechanics pass retains placeholder assets and does not claim production character/animation completion. Implementation and validation are in progress.

### 2026-11-18 — Mechanics revision implementation and initial validation

- Added encounter.ts for individually refreshed, navigable gap-seeking positions with unequal radii, irregular initial approaches, Shift-away retreat intent, and a non-stacking real-time impact freeze. Added riposte.ts for collision-checked routing to a reserved source's paired contact pose, including alternate approaches around walls and bodies.
- Added adaptive fighter profiles with independently seeded attack types, cut variants, windup/rest timings, and different initial attack choices. Fixed attack patterns remain available. Added a held counter source and coordinated approach reservation so a selected attacker walks into real sword range before winding up; waiting actors reposition while facing the player. Pursuit reaches 5.6 versus player sprint 7.2.
- Added a short backward/turning pivot into retreat sprint, suppressed proximity reacquisition during retreat, and successful ordinary/perfect evasion focus events. Empty-space evasions do not create source events. Added routed dash input locking/protection, explicit paired riposte impact, and remaining-guard depletion.
- Added a localized white burst, sparks, synthesized metallic response, 0.08-second fight/timer hold, pronounced placeholder break recoil, and a shattered defense-bar treatment. Movement while guarding preserves leg motion instead of forcing a stationary crouch.
- Initial logic verification exposed a pursuit waypoint tolerance issue: the final spacing waypoint was being discarded before reaching attack range. Reduced final-waypoint tolerance while preserving intermediate corner tolerance. All 68 logic checks now pass, including eight new revision checks. Production build passed with the existing large-bundle warning. Four new browser scenarios are in progress.

### 2026-11-18 — First browser results and documentation alignment

- Three of four new browser scenarios passed: uneven adaptive surrounding/varied initial attacks, ordinary dodge focus transfer to the second attacker without a perfect reward, and a counter from beyond 2.7 units that dashes into damage/guard break and holds game time during impact freeze. Visually inspected adaptive-surround.png and dashing-riposte-break.png.
- The retreat scenario escaped successfully but its speed assertion sampled after reaching the existing pillar at (-3, 13). Adjusted the sample to occur before that obstacle; collision should continue preventing sprinting through it. Full browser regression is running.
- Updated DEVELOPMENT.md and the roadmap with implemented mechanics and provisional values; annotated animationslist.md without marking any production animation complete. The final mesh, rig, carry, and polished clip set are still pending.

### 2026-11-18 — Full combat regression pass and footwork refinement

- Full browser regression passed all 26 scenarios in one run, including corrected retreat sampling, adaptive surrounding, ordinary evasion focus, distant guaranteed dash impact and freeze, plus all earlier defense/camera/group/indicator/perfect-defense/movement/sword checks. The production build and all 68 logic checks passed.
- Final review routed actual lateral/backward enemy displacement into the existing directional gait blend while preserving the upper-body guard. This avoids showing forward-walking feet during new flank repositioning. Focused revision checks, logic checks, and build are being rerun after that small animation adjustment.
- Updated roadmap status to implemented. The complete production-animation checklist remains unchecked because these are still procedural stand-ins.

### 2026-11-18 — Combat revision complete

- Final post-footwork verification passed: all 68 logic checks, production TypeScript/Vite build, and all four focused revision browser scenarios. The preceding full browser run passed all 26 scenarios. git diff --check passed; the existing bundle-size warning remains.
- Reviewed browser captures for adaptive surrounding, retreat sprint, and dashing-riposte guard-break feedback. The new default attack mode is Adaptive · varied combat; choose three opponents to exercise uneven surrounding. Fixed timing modes remain selectable.
- The approved mechanics revision is ready for playtesting. Next production work is the human-proportioned rig and polished representative animation sample before finishers. No final character assets, full animation library, finishers, wave/reward loop, new maps, deployment, or commits were added. Existing user workspace changes were preserved.

## 2026-11-18 — Enemy unblockable front kick

- User approved implementing now or scheduling later; chose implementation now to make red attacks visually distinct before the production-animation pass. The change applies only to enemy unblockables. Player J/K sword attacks and all 30 planned light/heavy sword executions remain unchanged.
- Added a procedural full-body push kick: supporting-leg stance, side-visible knee load, guarded sword, boot extension, retraction, and longer exposed balance recovery. Actual swept boot geometry supplies contact and perfect-dodge threat prediction; sword geometry is not used to hit during a kick.
- Enemies close to kick range (about 1.05 units), keep the red warning, stop late tracking, and expose 0.75 seconds of recovery. Retained 30 unblockable damage. A clean kick produces a brief 0.65-second stagger and collision-limited 0.65-unit shove over 0.18 seconds, replacing the automatic knockdown for this delivery. Generic future powerful strikes can still use knockdown.
- Added four logic checks for short-range boot-only contact, guarded sword stability, phase continuity, committed direction, one-hit resolution, defense bypass, shove distance, and perfect evasion. Updated the prior enemy-red browser expectation from knockdown to stagger; added browser scenarios for fresh-parry bypass/visible telegraph/shove and perfect kick avoidance into a dashing riposte.
- Updated GAME_DESIGN.md, CODING_PLAN.md, DEVELOPMENT.md, and animationslist.md. Final human-rig kick clips remain pending. Initial checks passed; final logic/build and relevant browser regressions are running.

### 2026-11-18 — Kick verification progress and reference limits

- All 72 logic checks and the production build passed. Browser checks confirmed held-block bypass with shove/stagger, visible red warning, fresh timed-parry bypass, and a perfect dodge of the actual boot path followed by a successful dashing riposte. Group targeting/source-bound counter and warning regressions passed so far.
- An existing sword-cancellation browser test failed under slow software rendering because it missed the committed-swing observation after waiting in wall time. Changed that test to controlled browser-clock frame advancement; no player attack timings or rules changed. Its focused rerun follows.
- Inspected enemy-kick-windup.png and enemy-kick-impact.png. The red warning and shove/stagger presentation are visible. In a directly aligned rear view, the current broad placeholder player can obscure parts of the enemy knee/boot. The final human-rig/animation checkpoint must review close-range telegraph visibility; this prototype is not a finished kick animation asset.

### 2026-11-18 — Enemy kick completed and checked

- Final validation: all 72 logic checks and the production build passed. The relevant browser run passed 15 scenarios; its one timing-sensitive sword-cancellation check passed after using controlled frames and advancing at least one full simulation step. All 16 selected scenarios are therefore verified across that run and the focused rerun. No player sword timings were changed.
- New kick browser cases passed for red knee-load telegraph, fresh-parry bypass, shove/stagger, and actual perfect avoidance into a source-bound dashing riposte. Existing group/counter-source/indicator/retreat/ordinary-dodge scenarios also passed. git diff --check passed. The pre-existing build-size warning remains.
- The enemy kick is available now in adaptive/sequence combat and the Unblockable kick · red practice option. Final rig/clip polish and close-camera telegraph visibility remain on the animation checklist. No new production assets, finishers, deployment, or commits were added.

## 2026-11-18 — Character-quality sample authorized

- User approved recording the settled quality standard and building the representative rigged-character sample, with occasional stylish backspin-to-strike variants. Updated the design, roadmap, and animation inventory before implementation.
- Quality direction: believable human proportions, fitted silver/red armor, fully articulated movement, flowing but forceful calculated swordplay, swift controlled dodges, low running carry, and clean illustrated rendering. Ghost of Tsushima/Chivalry 2 are design references only; no third-party game assets will be imported.
- Backspin variants retain action timing, reach, damage, commitment, and active-contact rules; camera and gameplay root do not spin with the flourish. Work in progress: native character rig, representative connected poses, inspection presentation, and verification. Final production-quality acceptance and the full animation library remain later review.

### 2026-11-18 — Native human-rig sample and inspection view

- Added humanRig.ts: a native skinned armored character with pelvis/multiple spine joints, clavicles, shoulders/elbows, forearm twist, wrists/hands, articulated fingers/thumbs, hips/knees/ankles/toes, fitted plate surfaces, split mail/cloth, a shaped armet, narrow black eye slit, and the black bat crest. Shared by player and enemies. Merged material surfaces and extruded ink contours replace the previous disconnected broad geometric actor.
- Preserved collision/foot/sword controls while solving human-length limbs onto them. Initial reach inspection exposed old hilt paths beyond human arm reach; raised/shortened the hilt loading/follow-through positions and added limited clavicle protraction rather than stretching arms. Both hands now reach their grips through the representative cuts, with existing active contacts and timings preserved by checks.
- Added a low backward/downward running carry with floor clearance, free support-hand motion, and blended regripping. Added an occasional Turning cleave backspin on one in six heavy attacks after the initial ordinary cycle. Visual body rotation completes during preparation; root/camera, damage, timing, and active sword-contact rules remain unchanged.
- Added a separate Character & animation study link and /?study inspection presentation with front/side/back views, connected movement/braking/chain/guard/dodge/backspin sequence, individual action selection, and pause. These inspection controls do not add manual gameplay-camera controls.
- Added procedural mail surface detail, restrained vertex-color variation, and clean toon/ink shading; no external character assets or animation packs were imported. Fixed the study's missing-favicon console request. Initial 72 gameplay logic checks and builds passed; new rig/grip/carry/backspin checks and browser verification are in progress.
- The current native sample still needs the user's visual quality review; this is not a claim of professional final-asset acceptance or completion of the full animation library.

### 2026-11-18 — Character rendering/performance refinement

- Initial skinned model inflated shader work by expanding indexed geometry and using dense spheres for tiny finger/hinge parts. Reduced small-part tessellation and retained shared indexed vertices. Current sample uses 55 bones, six skinned material surfaces, about 8,798 unique surface vertices and 11,822 surface triangles before ink contours.
- Intentionally interrupted two in-progress browser verification runs to address observed rendering/performance issues rather than treating them as completed suite runs. Group focus/counter and kick behavior passed their completed checks.
- Screenshot review exposed inward helmet/body shell winding and loss of the ink extrusion callback when enemy materials were cloned, producing overly black enemy surfaces. Corrected shell winding, preserved the material callback, and added an outward-facing helmet-normal check.
- Smoothed carry-to-ready targets and established attack-entry capture before locomotion refresh, keeping run/carry-to-strike transitions continuous. Final visual/browser verification follows.

### 2026-11-18 — Character sample verification and review handoff

- Reviewed fresh front, sprint-side, backspin, and courtyard kick screenshots. The native human-shaped armor, silver enemy helmet, ink contours, bat heraldry, and low backward sword carry render in the inspection/gameplay views. These screenshots establish a reviewable sample, not final professional animation acceptance.
- Fixed an additional continuity issue: interrupted attacks retain their captured body/sword pose while blending toward the current stance, and an interrupted backspin eases its residual visual turn rather than snapping to forward. New attacks capture that orientation; gameplay root facing remains independent. Added a regression check for continuity at interruption and convergence back to ready.
- Final validation: all 78 logic checks passed, TypeScript/production build passed, and git diff --check passed. The selected 14-scenario browser run covering study/group/kick/revisions/sword completed successfully before the final interruption-blend refinement. After that refinement, all five focused study/sword browser scenarios passed again, including graphics-console checks, movement commitment, running braking, separate-press chaining, and real sword contact.
- Updated CHARACTER_QUALITY.md with interruption behavior. GAME_DESIGN.md, CODING_PLAN.md, DEVELOPMENT.md, and animationslist.md record the approved quality direction and representative sample scope. Review through Character & animation study in practice or /?study. Full authored directional animation production, final cleanup/material acceptance, paired finishers, and reference-device performance acceptance remain pending.
- The existing production bundle-size warning remains (approximately 645 kB before gzip). No deployment, commits, external asset imports, or full finisher/library production occurred in this session.

### 2026-11-18 — Player movement specification; implementation remains paused

- User requested discussion of coordinated whole-body movement, reported duck-like legs and frozen upper-body motion, and then explicitly authorized recording the complete breakdown in Markdown. Game-code changes remain paused; this session changes documentation only.
- Created PLAYER_MOVEMENT_SPEC.md as the player-focused animation/programming reference. It covers standing/readiness, complete walking support/swing mechanics, sprinting, eight-direction combat movement, starts/stops/turns, light swings L01–L08 and unresolved L09–L12, heavy/backspin attacks, attack/contact transitions, directional guard/parry, eight-direction dodges/rolls, dashing riposte, hit/balance/death reactions, and player tracks for all five deferred finishers.
- Each family identifies foot support and weight transfer alongside pelvis/spine, shoulder/arm/grip, head, weapon, and equipment behavior. Added transition coverage, later programming constraints, visual review checks, biomechanics sources, and explicit distinction between proposed choreography and implemented mechanics. The six numbered light directions are inventory paths, not a claim that six light attacks exist in code; the full 12-direction/two-execution requirement remains pending.
- Linked the reference from animationslist.md, CHARACTER_QUALITY.md, and CODING_PLAN.md. Recorded that the current sample has not passed user visual acceptance and that player movement takes priority over further enemy animation work. No GLB was imported; the supplied still image is an appearance reference.
- Validation: documentation coverage and local links checked; git diff --check passed. No runtime tests were needed for documentation-only changes. No source code, gameplay, animation assets, or existing append-only history entries were modified.

### 2026-11-18 — Final animation moved to the end

- User directed that animation be finished at the very end. Updated CODING_PLAN.md with the controlling order: playable wave/reward/run loop; remaining combat/finisher systems; UI/feedback/maps/environment; integration/balance; final animation production; post-animation regression and release validation.
- Existing motion remains placeholder and visually unaccepted. Prior polished-character gates no longer block systems or temporary finisher prototypes. Only animation corrections necessary for mechanics/contact/readability testing belong before final production. The full movement standards, attack execution requirements, and paired finishers remain required.
- Added current scheduling notices to GAME_DESIGN.md, DEVELOPMENT.md, animationslist.md, CHARACTER_QUALITY.md, and PLAYER_MOVEMENT_SPEC.md; updated the animation-production sequence and removed an active before-finishers requirement from development status. Earlier discussion is preserved with its scheduling guidance explicitly superseded.
- Documentation only; no gameplay code or animation assets changed. The prior discussion pause is not treated as an instruction to start coding in this scheduling turn. Validation: git diff --check passed; runtime tests unnecessary for these changes.

### 2026-11-18 — Core mechanics before waves and presentation

- User moved waves, weather, UI, maps, and balance to the late phase before animation, prioritizing working game mechanics. This supersedes the preceding waves-first recommendation.
- Updated CODING_PLAN.md: core-combat correctness and missing behavior first; remaining finisher systems with placeholder poses next; waves/rewards, map/environment/weather and final UI/feedback afterward; balance/integration before final animation; post-animation regression validation last. Next target is a core-combat gap audit and functional finisher prototype, not waves.
- Synchronized scheduling notices in GAME_DESIGN.md, DEVELOPMENT.md, animationslist.md, CHARACTER_QUALITY.md, and PLAYER_MOVEMENT_SPEC.md. Existing arena/debug UI and diagnostic feedback remain available for testing; neither a new map nor polished UI is a prerequisite for core mechanics. Correctness fixes are distinct from the deferred numerical/difficulty balance pass.
- Documentation only. No source code, animation, gameplay values, or existing history entries changed. Coding is not resumed merely by this scheduling instruction. Validation: git diff --check passed; runtime tests unnecessary.

### 2026-11-18 — Core audit and first finisher implementation authorized

- User explicitly authorized the core-combat audit and first functional finisher. Reviewed existing action, defense, targeting, pursuit, counter, collision, input, and camera implementation/tests. Added CORE_COMBAT_AUDIT.md to distinguish working mechanics, discovered gaps, verification, and remaining production scope.
- Audit found documented passive healing was absent. Added living-player regeneration after four combat-inactive seconds, five health/second up to 50. Movement alone is not activity; combat actions/reactions and finishers interrupt healing. No passive revival or recovery above half. Values are provisional for this missing mechanic; no general balance pass occurred.
- Added finisher.ts for eligibility/selection, full planned body-path checks, continuous alignment, one-shot lethal event, timing, and reserved corridor. Rising Cleave prototype uses 30-health threshold, broken defense, 2.4m reach, 1.2m paired spacing, 0.85s lethal beat, and 2.1s control return. F is deliberate, respects action commitment, and never auto-triggers on normal attacks. Temporary prompt identifies the eligible target.
- Integrated protected action/input lock, victim reservation, bystander commitment cancellation/reposition without strikes, fresh windups on release, invalid source cancellation, pause/reset, and continuous closer/side camera using existing obstruction handling. Added temporary thrust/rise/kick and victim fall/corpse poses; final animation production remains deferred.
- Added eligibility/path/event/hold/reset/healing/camera logic checks and a combat-earned browser scenario. Initial new finisher browser check missed the second parry because the first counter closes the stance; corrected the test input timing to account for earlier real blade arrival at shorter range. No combat timing changed. Verification is ongoing; completed results follow.
- Updated GAME_DESIGN.md, CODING_PLAN.md, DEVELOPMENT.md, and animationslist.md. No waves, map/weather production, final UI redesign, difficulty pass, full finisher library, final animation, or detachable-part/gore assets were added.

### 2026-11-18 — Audit correction: repeated parry input after riposte

- The initial finisher browser failure persisted after adjusting test timing. Instrumentation and a direct blade-contact check showed the earlier timing explanation was incomplete: riposte startup unconditionally suppressed E even when it had already been released, swallowing the next fresh parry press. Fixed Input.suppressUntilRelease to add suppression only for a currently held key while retaining existing lock suppression. Added regression coverage for released, held, lock-cleared, and finisher-discarded inputs.
- This supersedes the preceding timing-only diagnosis. No attack/parry timing or balance values changed. Corrected the temporary finisher prompt's study-only CSS selector so it is not hidden globally. Final browser verification follows.
- Updated the core audit with this discovered input gap. Logic/build verification passes after the fix; final run results follow.

### 2026-11-18 — First finisher mechanics verified

- Final validation: all 89 logic checks passed and the TypeScript/production build passed. The existing bundle-size warning remains (approximately 652 kB before gzip). git diff --check passed; local documentation links checked.
- Browser results: all 13 existing selected group/kick/revisions/sword scenarios passed in the broader run. Its new finisher scenario initially failed, exposing the repeated-E suppression bug documented above. After that fix, the combat-earned finisher scenario and all three perfect-defense browser scenarios passed (four focused checks). No claim of a full browser-suite run is made.
- The finisher browser check earned eligibility through three real perfect-parry ripostes, rejected an ineligible F, checked the visible eligible prompt, activated the finisher, verified input discard/no extra attack and unchanged player health, paused/resumed mid-action, observed the lethal event and dead victim, then verified held keys stayed suppressed and fresh movement returned. Reviewed artifacts/finisher-prototype.png: paired actors and closer continuous camera render, using intentionally temporary poses. Group hold/reposition/fresh-windup and space/cancellation cases have logic coverage; final paired-motion/armor clearance and broader crowd playtesting remain necessary.
- Updated current status language to reflect authorized mechanics implementation while retaining deferred animation production. No waves, maps/weather, final UI redesign, balance pass, gore/detachment assets, or remaining four finisher clips were added. No commits/deployment performed.

### 2026-11-18 — All-five finisher mechanics and detachable parts authorized

- User authorized continuing with all-five compatible finisher selection, dismemberment/decapitation support, cleanup, and interruption/tight-space/group checks. Retained temporary animation and the mechanics-first schedule; no waves, map/weather production, balance pass, or final UI redesign.
- Added definitions/timelines for Rising Cleave, Disarm and Dispatch, Helmet Bash and Throat Cut, Sweeping Decapitation, and Sword-Arm Sever. Selection preserves eligible-target priority, rotates preference only after activation, tests structural/weapon compatibility, and falls back to safe compact alternatives. Added a diagnostic practice preference selector; it neither grants eligibility nor bypasses fit checks.
- Added checked multi-point player paths around/outside the victim, victim body avoidance, complete pair reservation, and lateral blade-envelope checks. Existing F/input protection, pause/reset, camera, victim reservation and fresh bystander windups remain.
- Added once-only drop/sever/lethal event tracks. Head/arm snapshots extract actual posed skinned armor; original triangles and shared ink contours are hidden together via reusable index buffers. Added separation caps and full reset restoration. Detached sword arm retains its held sword; weapon release cannot duplicate the source weapon.
- Added owned snapshot debris with floor settling/root obstacle collision, ten-game-second expiry, twelve-object bound, resource disposal, and reset cleanup. Shared actor resources/textures are not destroyed. These are cosmetic bounded props, not full rigid bodies or navigation blockers; final anatomical seams, blood, armor clearance and authored clips remain deferred.
- Updated GAME_DESIGN.md, CODING_PLAN.md, DEVELOPMENT.md, CORE_COMBAT_AUDIT.md, and animationslist.md. All 96 logic checks and the production build passed at this stage. Browser coverage is in progress; completed results follow.

### 2026-11-18 — Finisher crowd-reservation refinement

- Initial browser run passed the existing earned-F/pause/input-return case, Disarm release/reset, and Sword-Arm Sever/reset-before-lethal. The head case reached detachment but was invalidated by a development-server reload caused by a source change during the run; it is being rerun against stable code. The group case verified activation, protected health, input discard, living-bystander movement/hold, and fresh ready timers, then exceeded its software-rendering timeout while waiting for the next warning. No completed-pass claim is made for either interrupted/timed-out case.
- Inspection found a reservation edge case: candidate positioning probes started at the player inside the reserved execution corridor. Added an optional probe origin to LooseSurround and use each bystander's own position during a finisher. Refresh surround goals at execution entry/exit. Conservative reservation now includes the blade envelope and rejects starts that would trap a bystander inside it.
- Added regression coverage for a bystander outside an occupied player anchor. Kept automatic variation progression across practice-drill resets (arena defeat reset starts it over) so all five can be encountered across repeated practice. Added a browser Helmet Bash route check and later post-event screenshots for readable detached-part inspection. Extended only the slow group test timeout; no gameplay timings changed.
- All 97 logic checks and the production build pass after these changes. Final focused browser verification is in progress; no source edits will be made during that run.

### 2026-11-18 — Stable finisher browser reruns and paired facing

- Stable focused browser run passed Helmet Bash's checked around-target route, Sweeping Decapitation's head/sword events and reset, and the full group execution scenario. The group scenario earned eligibility through real counters, checked held/discarded player inputs, protected health, moving living bystanders with no strikes/cues, fresh ready timers on release, and a new readable windup afterward.
- Reviewed post-event decapitation capture: the actual helmet/head is visibly separated and the original head surface is absent. Reviewed arm/disarm captures; production pose/contact cleanup remains deferred.
- Final paired-position correction after that run: hold the victim's facing toward the original aligned front while the player routes behind. Previously the victim could turn to follow the player around. Added a browser-facing assertion for this case; focused verification follows. This is paired alignment, not final choreography or an animation-polish pass.

### 2026-11-18 — Five-finisher mechanics follow-up completed

- Final validation: all 97 logic checks passed; the final TypeScript/production build passed; git diff --check, changed-source whitespace, and local documentation-link checks passed. Existing bundle-size warning remains (about 660 kB before gzip).
- All six selected finisher browser scenarios are verified across completed runs: earned Rising Cleave with pause/input/control return; Disarm release/reset; Sword-Arm Sever with reset between sever/lethal; Helmet Bash route and facing; decapitation/head+sword cleanup/reset; and living-bystander group hold/movement/protection/fresh windup. The invalidated head run and initial slow group timeout were rerun successfully as documented above. The final facing correction passed its focused Helmet Bash browser rerun. This is targeted coverage, not a full browser-suite claim.
- Practice finisher preference can inspect each mechanics path while retaining health/defense/range/compatibility/space requirements. Automatic variety advances on activation and across practice restarts. Final paired clips, polished body motion/contacts, blood effects, sever-site art/armor cleanup, and full rigid-body physics remain deferred; current pose and physics presentation is explicitly a prototype.
- No wave/reward system, map/weather production, final UI redesign, numerical combat balance pass, deployment, or commits were included. All implementation and documentation changes for this session are recorded above; existing history entries were preserved.

### 2026-11-18 — Animation Testing learning workspace

- User requested a separate directory to explore animation and preserve everything learned for future implementation. Created Animation Testing/ with README.md, append-only LEARNING_LOG.md, EXPERIMENT_TEMPLATE.md, and local AGENTS.md.
- Recorded AT-000 as setup and existing context, explicitly separating prior user feedback/discussion from new experimental findings. Linked the full movement specification, animation inventory, quality criteria, and development interfaces. Proposed a single walking-stride experiment without selecting a tool, importing an asset, or claiming any new animation result.
- Added root guidance requiring animation-learning records and a roadmap note for this user-directed detour. Main-game integration remains a later, explicit step; the existing mechanics baseline and deferred final-animation schedule are preserved.
- Validation: verified workspace files and relative reference links; git diff --check passed. Documentation/setup only, so no runtime tests were necessary. No gameplay code or animation assets changed.

### 2026-11-18 — Examplerig animation-testing workbench

- User authorized creating a workspace to start testing Examplerig.blend. Read root/animation instructions and created Animation Testing/AT-001-Rig-Workbench with a checksum-verified working copy, manifest, independent Three.js viewer, Blender inspection/export scripts, browser test, and documentation. Original .blend was preserved and its checksum rechecked.
- Source header identifies Blender 2.76 (32-bit little-endian). Extracted the existing 128×128 saved-file thumbnail; did not evaluate/render the rig. Blender was absent in normal locations and the user confirmed it is not installed. No software or assets were installed/downloaded; actual Blender inspection/export remains pending.
- Added rig:dev (port 5174), rig:build, and rig:prepare commands. Viewer supports GLB/self-contained glTF, skeleton/wireframe, clip playback/scrubbing/speed, rest pose, camera presets and orbit controls. The empty state clearly awaits an export; no substitute model is presented as the user's rig. Main-game source and assets remain unchanged.
- Prepared readonly-working-file Blender reporting/export flow with embedded script auto-execution disabled, capability-filtered glTF options, and no blend save calls. Python syntax passed and missing-executable check behaved correctly; Blender script execution and source-rig compatibility have not been validated.
- Validation: independent viewer TypeScript/build passed; browser scenario passed using an explicitly synthetic skinned animation fixture, with no runtime/graphics console errors. Corrected an initial test's speed-option string and reran successfully. Reviewed empty/fixture screenshots. Local links, original/copy hashes, and git diff --check passed. Existing bundle-size warning remains for the viewer's Three.js bundle.
- Recorded findings, limitations, references, and next steps in the append-only animation learning log under AT-001; updated the animation workspace README. Next dependency for actual rig tests is Blender installation, followed by inspection/export; walking animation authoring is still pending.

### 2026-11-18 — Blender-free human animation showcase

- User declined Blender installation and requested an alternative. Researched browser-ready rig/animation sources and switched the isolated workbench to a directly loaded local GLB reference. No application installation, account, asset upload, or .blend conversion was used.
- Tested Cesium Man (Khronos sample; Cesium/CC BY 4.0), then selected the better-proportioned Mixamo human supplied in the official Three.js animation example. Preserved the first reference for comparison. Recorded model sources, applicable attribution/terms, hashes, structural/clip metadata and unchanged asset bytes; did not label the Mixamo model MIT or CC0.
- Active showcase now loads the human automatically and plays the supplied Walk. Idle, Run and TPose are selectable. Retained skeleton/wireframe, camera, speed and timeline controls, corrected this asset's front-camera convention, and clarified pause/scrub feedback. This is a motion-learning reference, not original authored animation or the final game knight.
- Updated local animation instructions, workspace READMEs, reference attribution/manifests and append-only learning log (AT-002) to preserve the no-Blender preference. Original Examplerig.blend and its working copy remain untouched/archived. Main-game source/assets and production schedule remain unchanged.
- Validation: viewer TypeScript/build and browser check passed. Browser exercised the real humanoid's automatic Walk, all four supplied clips, pause/scrub, then synthetic-rig controls and native-blend error handling, with no graphics/runtime errors. Reviewed the actual-reference screenshot. Existing viewer bundle-size warning remains. Link/hash/whitespace checks passed. No final motion-authoring or rig-quality acceptance is claimed.

- Started the isolated rig showcase on local port 5174 for review. The initial sandboxed listener was denied (EPERM); reran with the approved local-server command. This is local development hosting, not public deployment.
### 2026-11-18 — AT-003 legs-only animation experiment

- User authorized new leg-only basics in the isolated animation showcase. Read PLAYER_MOVEMENT_SPEC.md and created a new generated walking cycle on the reference skeleton: thighs/knees/ankles/toes plus minimal pelvis support translation. Kept upper-body joints unanimated and display-isolated by default. Did not copy/mask the supplied Walk as the new result or modify the game character.
- Added world-space rig calibration/two-bone solving, heel/forefoot pivots, support/swing timing, smooth knee/ankle/toe recovery, matched continuous root travel and following camera, phase readouts, support rings, lower-body isolation toggle, and source-clip comparison. The original GLB bytes and supplied animations remain unchanged.
- Added AT-003-LEGS.md, updated workspace documentation, and recorded all findings/settings/limits in the append-only animation learning log. Added rig:test and five meaningful gait/rig tests plus a browser movement/inspection check. No main-game source was changed.
- Validation: five leg math/rig tests, viewer TypeScript/build, and both isolated browser scenarios pass. First leg browser attempt failed on screenshot-related GPU ReadPixels performance notices; filtered only those specific notices and reran successfully, retaining movement assertions and other graphics/runtime/binding checks. Reviewed side/front/held-upper screenshots and recorded actual-rig measurements in reports/legs-metrics.json. Existing bundle-size warning remains.
- Support-ankle drift and IK reach errors are below a micrometre in sampled numerical checks; these do not certify exact boot-mesh contact or final animation quality. Actual user visual acceptance, mesh/armor cleanup, upper-body coordination and all other action families remain pending. No source-asset replacement, gameplay integration, balance change, deployment or commit occurred.

### 2026-11-18 — AT-003 v2 responding to gait feedback

- User rejected the first leg cycle as robotic, disconnected at the hips, too early to lift, and insufficiently extended. Preserved v1 code/captures/metrics under reports/AT-003-v1. Continued only in the animation showcase.
- Lengthened stride/cycle and grounded support, delayed toe-off, reduced foot-pitch extremes and base clearance, and replaced piecewise cubic transitions with quintic flow through support/swing boundaries. Added synchronized pelvis yaw/roll/weight transfer and a geometry-calibrated support/carry height to allow longer near-straight support. Upper local joints remain unanimated.
- Review of an intermediate solver found the swing foot was pulling hip height down again; changed reach handling to let the recovering leg fold under supported hips and added a sustained-extension check instead of relying on one straight frame. Added actual-rig hip-phase/extension metrics to browser coverage. Ten lower-body tracks now include pelvis rotation.
- Updated AT-003-LEGS.md, workspace README and append-only learning log with settings, failures, scope and limits. Six math/rig checks and viewer build pass; final browser verification follows. No source asset bytes, main-game source, gameplay values or production schedule changed.

### 2026-11-18 — AT-003 v2 verified for review

- Final revision passes six leg math/rig checks, two browser scenarios, and viewer TypeScript/build. Reviewed updated side/front captures. Browser checks include actual-reference hip/leg phase synchronization, sustained support extension, planted support, unchanged upper local rotations, and comparison/control behavior. Existing bundle-size warning remains.
- Actual gait now uses 1.07234m stride over 1.45s at 0.73954m/s. Ground support lasts 66% of the cycle; lowest sampled support knee bend is about 7.18 degrees, with about 73.64% of the designated mid-support sample window below 15 degrees. No locked/hyperextended knee was introduced. Recorded metrics in reports/legs-metrics.json and observations/limitations in the learning log.
- Final review confirmed the supporting leg is visibly more extended at passing and the hips participate in the stride. User visual acceptance remains pending. Original v1 archive and all source assets/history were preserved; only the isolated experiment/tooling/tests/docs changed. No gameplay, final animation integration, deployment or commits.

### 2026-11-18 — Gait review: reference-led approach proposed

- User rejected AT-003 v2 as creeping, requested longer heel grounding/toe-up leading and slight outward stepping, and asked how to determine a better gait instead of continuing isolated tips.
- Reviewed movement notes, experiment instructions/current code, and local source-clip metadata. Recorded v2 as visually unsuccessful despite prior numerical passes. Proposed a phase-aligned source-Walk lower-body/pelvis comparison with actual boot-contact landmarks and foot-path traces, followed by one-variable adjustments and real-footage comparison if needed.
- Updated AT-003-LEGS.md and appended findings/limits to the learning log. Did not implement another speculative gait or claim a source comparison was already performed. Documentation-only turn; no animation/game code, assets, test results, or existing log entries changed. git diff --check passed.


### 2026-11-18 — Free animation library shortlist

- Researched official Quaternius, Adobe/Mixamo and Epic/Fab sources; created Animation Testing/ANIMATION_SOURCES.md with availability, formats, source links, permissions caveats and proposed comparison steps. Appended research to the learning log.
- Recommend inspecting existing authored Walk and a free GLB candidate before further procedural gait changes. No downloads, new animation experiments, gameplay changes or integration performed; source quality and retargeting remain untested. Documentation-only; runtime tests not applicable.

### 2026-11-18 — Quaternius walk and sprint direction recorded

- Recorded user's preference for Quaternius walking, sprinting, sprint-enter and sprint-exit; documented source-rig inspection, legs/pelvis study and connected sprint-transition sequence in the animation source shortlist and learning log.
- Attempt to retrieve free Standard pack reached HTTP 429 at the generated download link. No pack acquired, clip coverage confirmed, runtime changes made or animations integrated. Public viewer HTML availability does not establish tested motion. Documentation-only session; runtime tests not applicable.

### 2026-11-18 — AT-004 Quaternius lower-body showcase

- Found user-supplied Standard library; inventoried both GLBs (43 clips each), read bundled CC0 license and root-motion notes. Preserved originals; copied in-place GLB/License into isolated viewer and recorded checksum/provenance/inventory. Walking and sprinting present; sprint-enter/exit absent.
- Showcase defaults to Quaternius authored walking with a pelvis/legs-only mask; alternate walk, jog and sprint masks plus full supplied clips selectable. Added rig selector preserving previous Mixamo/procedural study. No new procedural gait, retargeting or game changes.
- Added browser coverage and evidence captures; updated experiment/source docs and READMEs; appended learning record. Build, six procedural checks and new browser scenario pass. Full retained browser checks pending. Prior numerical passes are not visual acceptance; source native-rig playback is not final animation integration.

### 2026-11-18 — AT-004 final verification

All three browser scenarios passed, covering Quaternius source-mask inspection, retained procedural leg checks and manual rig/reference controls. Viewer TypeScript/build and six procedural math/rig tests passed. Source GLB copy checksum matches the supplied original. Documentation and evidence are recorded; main-game source unchanged. Remaining limits: no retargeting, sprint enter/exit assets, full motion-quality acceptance or integration.

### 2026-11-18 — AT-005 whole-body walking study

- Continued user-approved upper-body step in isolated showcase using supplied Quaternius full-body Walk_Loop. Default view now full body; added same-stride-time comparison with leg mask, upper-body/three-quarter cameras, and preserved source motion/playback state. Original source files and game code unchanged.
- Added joint-motion/pose-restoration browser coverage and evidence; updated workspace docs and created AT-005-FULL-BODY.md. Recorded observed source joint variation and limits in append-only learning log. This is source-motion inspection, not new animation or final knight integration; sword carry/transitions/dodges remain later.
- Viewer build passes; new browser scenario passes. Full regression result follows.

### 2026-11-18 — AT-005 final verification

All four browser scenarios passed: full-body phase comparison, retained procedural study, Quaternius lower masks and manual/reference controls. Viewer TypeScript/build and git diff --check passed. Existing bundle-size advisory remains. User review is pending; no claim of final animation quality, sword-carry implementation, transition animation, retargeting or main-game integration.

### 2026-11-18 — AT-006 one-handed sword carry

- Added isolated carry adaptation for Quaternius walk/formal walk/jog/sprint: constrained right-arm solve, hand orientation and source grip fingers, palm-attached study sword. Preserved all other source tracks and asset bytes. No game integration.
- Added same-time Sword carry toggle, remembered carry across body comparisons, Sword side camera, wrapping camera controls and explicit hidden-control handling. Original and prior experimental views remain selectable.
- Added pose-preservation, tip-clearance and control browser checks, captures/diagnostics and AT-006 documentation. Updated workspace READMEs; appended learning findings and reach/clearance limitations. Full five-scenario browser suite and build pass before final sidebar fix; targeted final verification follows. No final animation quality or continuous collision certification claimed.

### 2026-11-18 — AT-006 final verification

Final viewer build and targeted carry browser scenario pass after the sidebar layout correction; no horizontal sidebar overflow detected. The preceding full five-scenario suite passed. git diff --check passed. Captures/diagnostics updated. Review remains pending; sampled clearance and constrained-target solve checks do not certify body/armor collisions, final grip or artistic quality. Main-game source unchanged.

### 2026-11-18 — Sword-carry arm motion and upward wrist clarification

- Addressed user feedback on stiff carry: shoulder-relative source rhythm, greater visible elbow bend/swing, outward/backward blade, fixed grip/fingers. Incorporated subsequent explicit clarification: back of sword hand up, palm down in walk/sprint. Native showcase only; game/source assets unchanged.
- Archived v1 evidence/source; expanded pose checks for arm bend, swing range, wrist-up orientation, blade direction and fixed socket/fingers. Updated AT-006, player movement specification and animation inventory; appended learning findings.
- Viewer build and targeted browser scenario pass; walk/sprint hand swings ~16/22cm relative to shoulder, sampled elbow bends ~95–101 degrees. Full regression result follows. Sampled pose/clearance checks are not final visual acceptance or continuous collision validation.

### 2026-11-18 — AT-006 v2 final verification

All five browser scenarios passed after the palm-down clarification: revised carry/grip, full-body comparison, procedural legs, source lower masks and reference/manual controls. Viewer TypeScript/build and git diff --check passed. Final screenshots/diagnostics recorded. User review pending; experimental native-rig changes remain separate from the main game.

### 2026-11-18 — Carry rejected; programming stopped; source search

- Recorded user's rejection of inward-bending wrist and explicit stop-programming instruction. Marked AT-006 rejected; numerical checks did not establish visual success. No code changed or game integration.
- Researched creator-authored sword-motion alternatives: Raise Creation sword-running preview, MoCap Online free sword pack and Explosive free RPG sample. Added exact source links and verification/licensing limits to source shortlist and learning log. Exact matching carry pose remains unverified; videos could not be fetched. No downloads, implementation or runtime tests this session.

### 2026-11-18 — Prepare project commit and push

- User requested committing and pushing current work. Repository is on main with no configured remote; requested destination URL while preparing the local commit. Included current source, tests, design/history documents, supplied animation assets and preserved experiments; dependencies/generated builds remain ignored. Existing user deletions are preserved.
- Verification: all 97 game tests pass; game and showcase TypeScript/production builds pass with bundle-size advisories. Targeted secret-pattern search returned no matches; git diff --check passed. No new gameplay/model/animation implementation this session. The previously requested model-only viewer UI has not yet been implemented; the rejected carry experiment remains documented as rejected. Push requires the destination repository.

### 2026-11-18 — Local commit created; remote pending

- Created local main commit fffe7df containing the current project (153 files). Push remains pending because no remote is configured and destination URL has been requested.
- Clarification of earlier whitespace check: the initial unstaged check passed; after staging previously untracked files, Git reported whitespace/CRLF notices in supplied third-party README/license text. Preserved those vendor files unchanged. No generated dependencies/build directories or matching secret patterns were included.

### 2026-11-18 — Connect supplied GitHub repository

- User supplied https://github.com/LimeyJuicy/Game1 and authorized pushing the committed project. Configured origin; read-only check found no remote refs.
- HTTPS push could not prompt for credentials. Checked existing SSH agent identity and successfully verified read access to the same repository over SSH without changing authentication keys. Updated origin to git@github.com:LimeyJuicy/Game1.git for the push. No force push, history rewrite, gameplay changes or asset changes. Previous 97 tests and both builds remain the latest code validation.

### 2026-11-18 — Static knight viewer and first model geometry pass

- Resumed user-requested player modeling, leaving animation authoring paused. Reused existing viewer: static project knight now default, animation controls hidden, inspection controls retained; all prior experiments/assets and animation UI preserved under ?mode=animation.
- Added opt-in modelReview appearance to the existing native skinned knight: fitted breastplate/conforming cloth, longer wrapped split mail and heraldic panels, shoulder lames/elbow/forearm fittings, helmet ridge/visor details, overlapping sabatons, silver palette and clawed bat crest. Gameplay uses unchanged default profile.
- Preserved baseline captures; corrected clipping crest triangles and cylindrical shoe profile after visual inspection. Added static viewer browser scenario and updated prior cases for explicit animation mode. Created PLAYER_MODEL.md and aligned character/viewer docs; appended learning record. First geometry pass remains unaccepted as final; no new animation or motion-quality claims.
- All 97 game tests and both builds pass. Full browser regression/final capture review follows. Existing bundle-size advisory remains. Changes are local, not automatically committed/pushed.

### 2026-11-18 — AT-007 final static-model verification

All six viewer browser scenarios pass, including the static model and retained animation controls. All 97 game tests and game/viewer TypeScript/builds pass. Final model framing correction recognizes the native Pelvis bone for the upper-body view; targeted static browser scenario and viewer build passed again. Reviewed final front/three-quarter/upper captures: projected bat now remains visible on the cloth and boots use the tapered plated profile. This is agent inspection, not final user approval or a deformation-quality claim. Model work is documented in PLAYER_MODEL.md and current design/plan notices. Animation authoring remains paused; gameplay still uses its default appearance. Changes remain local.

### 2026-11-18 — Rebuild review knight from supplied armor reference

- User rejected the initial model's primitive/blobbed appearance and supplied a full-body armor reference. Preserved it in assets/reference as a visual reference; retained original bat rather than the image's lion. Updated PLAYER_MODEL.md with the rejection and current direction.
- Added custom reference-driven geometry builder for the opt-in static model: fitted torso/gorget, shaped helmet, shoulder/arm lames, elbow/knee wings, palm/finger plates, belt hardware, long bordered cloth panels, wrapping mail and tapered footwear. Narrowed shoulder placement. Default gameplay geometry remains on its original path; animation authoring remains paused.
- Added model-only silver environment shading, finer outlines and tone mapping. Fixed observed cloth intersection/overexposure; replaced continuous static rendering with render-on-change and cached shadows after first software-browser check timed out. Build passes; final browser/game verification follows. No visual-quality acceptance claimed.

### 2026-11-18 — Reference-model construction corrections

- Tightened under-mail to eliminate observed armor intrusion, wrapped visor and eye opening back toward cheek hinges with a connected brow, moved vents onto the new visor surface and extended upper red cloth toward belt.
- Updated design/quality/model documents to use the supplied armor image, preserving black bat and illustrated art direction. First static browser scenario passes after render-on-change fix; full regression and final screenshots pending. Exact reference quality/production readiness remain unclaimed.

### 2026-11-18 — Armor-reference pass final verification

All 97 gameplay tests and game/viewer TypeScript/builds pass. Five of six viewer scenarios passed in the full run; preserved carry scenario hit its 30-second timeout near the final control checks, then passed independently in 27.1 seconds with a 90-second budget. Static model, manual/reference controls and remaining animation scenarios pass. Final upper/side captures were inspected for the wrapped visor and reduced mail intrusion. These checks establish functionality, not a match to the reference’s sculpting/material quality. Bundle-size advisory remains; no target-device frame-rate certification. Reference saved in project; animation authoring still paused and review geometry remains separate from gameplay. git diff --check passed.

### 2026-11-18 — Replace default review model with supplied GLB

- User selected Downloads/a706fc1d-51ba-496f-9ce8-a73df9c7dd93.glb instead of native mesh. Copied unchanged into existing viewer public models, recorded checksum/content manifest, and made it the default static model with embedded materials intact.
- Asset is self-contained but unrigged: one mesh, 309,910 triangles, three embedded images, no skeleton or animation. Original units retained. Main combat player is not silently replaced; rigging/scaling/optimization remain separate steps.
- Preserved native knight at ?model=legacy and all animation work at ?mode=animation. Added generic upper-body framing, updated documentation and browser checks. Viewer build passes; final browser/visual verification follows. No new site, original-file edit, automatic commit/push or animation authoring.

### 2026-11-18 — AT-008 final import verification

Project GLB checksum matches supplied original. Viewer TypeScript/build and both imported-default/preserved-native browser scenarios pass. Front and three-quarter captures inspected: correct front orientation, complete visible model and embedded materials. Upper-body framing and hidden animation controls verified. No claim of rigging, final gameplay integration or target-device optimization; original scale/materials/geometry retained. Current design/plan notices aligned. git diff --check passed.

### 2026-11-18 — Rename accepted player model

User requested a clearer filename. Renamed original Downloads UUID GLB to red-herald-knight.glb and project player-knight.glb to red-herald-knight.glb. Updated viewer load URL, source manifest and current model documentation; preserved historical log paths. Both renamed files match the original SHA-256. No geometry, texture, rig, scale or animation changes. Verified asset paths and references; no runtime tests needed for this filename-only change.

### 2026-11-19 — AT-009 experimental knight rig and Quaternius retargeting

- Created separate red-herald-knight-rigged.glb with fitted 66-bone skin and 43 retargeted Quaternius clips. Preserved original approved GLB byte-for-byte and original geometry/material/image data in derivative. No Blender, account/upload, default-static replacement or gameplay integration.
- Added local rig builder, serialized artifact verifier, CPU stretch diagnostic, Mesh2Motion MIT solver subset/license and rig review routes. Added npm run rig:knight / rig:verify. Rig preview uses source clips without rejected procedural sword-carry adaptation.
- First 78-bone cloth-driver pass failed visual inspection despite valid bind data; preserved evidence. Corrected hand/thigh ownership, UV seam weights, torso/arm boundaries and fitted-axis retargeting. Removed separate cloth drivers where fused garment/body edges produced severe stretching. See append-only learning log and AT-009-KNIGHT-RIG.md for findings, reproduction and evidence.
- Checks passed: every vertex's normalized weights/joint range and serialized bind pose (max error ~5.11e-8), original binary/material preservation, all 43 clips' key validity; fitted idle/walk/sprint browser capture scenario; original static model regression; viewer TypeScript/build. Existing bundle-size advisory remains. Agent reviewed walk side and sprint front/side captures; tests are not visual acceptance.
- Remaining: rigid armor joint deformation, finger/grip cleanup, cloth stretch/segmentation, full clip review, gameplay integration and asset optimization. Default viewer still original static knight. Updated model/design/plan/quality/workbench docs; no new original animation authored, automatic commit or push.

### 2026-11-19 — AT-010 supplied sword prepared for review

- Found Sword.obj, Sword.mtl and Textures folder; kept originals intact. Source has eight named parts and 4,688 triangles. Replaced unusable absolute Windows texture references in the derived import with supplied PBR textures.
- Added reproducible Python/Pillow GLB packager and npm run rig:sword; generated player-sword.glb (~10.9 MB) with original geometry/groups, texture-coordinate conversion and 2048px derived base-color/normal/metallic-roughness maps. Full-resolution originals and alternate engine sets preserved. Checksum/inventory report retained.
- Added standalone sword route to existing viewer: http://127.0.0.1:5174/?model=sword . Default knight, preserved animations and gameplay unchanged. Documented material choices, scale/attachment limits and reproducibility in PLAYER_SWORD.md and append-only learning log.
- Validation: viewer TypeScript/build passed with existing bundle advisory; one-off browser check loaded all eight meshes, static state and no page/console errors. Front/three-quarter captures saved; agent inspected complete sword and materials. User visual acceptance, final hand fitting/scale and gameplay integration remain pending. No automatic commit/push.

### 2026-11-19 — AT-011 both-hand shoulder carry with supplied sword

- User clarified sword is two-handed and requested both hands over the shoulder. Fitted it at scale 0.54 to the normalized knight (total sword length ~0.971 units); fixed right-hand socket and left-hand grip share the actual imported handle, spaced .1107 units.
- Added separate twoHandCarry.ts with derived idle/walk/formal-walk/jog/sprint arm motion; source root/legs/pelvis/trunk/clavicle/head tracks retained. Chest-following position and yaw-following blade orientation keep sword laid back during sprint lean. Original finger bind pose retained for review; no claim of final grip deformation.
- Corrected initial upright blade pitch during sprint, one unreachable trial pose and low shoulder intersection. Two-hand constraint test samples all five clips between baked keys and verifies body-track preservation. All seven rig tests and viewer TypeScript/build pass; existing bundle advisory remains. Final browser regression/capture results follow.
- Added optional shoulder-carry controls to fitted-knight animation route; rejected old carry and original static model/assets remain preserved. Updated current design, movement, quality, animation inventory, model/sword notes and coding plan; append-only learning log records settings/failures/limits. No gameplay integration, source GLB rewrite, automatic commit or push. Finger/armor/cloth cleanup and carry-to-combat transitions remain pending visual review/production work.

### 2026-11-19 — AT-011 final verification

Seven rig tests, viewer TypeScript/build, original static-model browser regression and fitted-rig/source-motion browser regression pass. Carry-specific browser inspection reports no page/console errors. Final walk side and sprint side/weapon captures inspected for laid-back blade and raised shoulder line; sampled sprint left-hand socket error ~0.000065 normalized knight units, right hand fixed. Maximum baked analytical contact error ~2.66e-8 with no reach clamping; interpolated samples pass .0005-unit tolerance. git diff --check passes. Numeric contacts do not establish final finger closure or armor/cloth deformation; final polish, transitions, collision review and gameplay integration remain pending. No user visual acceptance claimed.


<!-- Imported PR #1 history; earlier branch dates retained below. -->

### 2026-11-19 — Fencing footwork system research (no gameplay changes)

- User asked for research on the best three ways to build a lower-body fencing-footwork rigging/animation system and any key architecture adjustment. Research and measurement only; no gameplay, model, animation, showcase or dependency changes.
- Added read-only `Animation Testing/AT-001-Rig-Workbench/tools/footwork-baseline.ts` and appended findings, sources, proposals and limits to the animation learning log. Measured on the game knight: the existing stance input does not affect the legs; no boot is ever planted in the current gait; the existing two-bone solve holds world-fixed ankles within 0.1mm inside reach, but nothing lowers the hips when reach runs out, and its fixed forward pole leaves a turned-out rear knee 91 degrees off the toes.
- Recommendation recorded as a proposal, not implemented: constraint-data stances and steps with world foot locks and analytic IK, authored on the real knight in the browser bench; clips for exploration locomotion; planner stepping only as glue; one shared pose pipeline (stateful advance once per tick, pure pose sampling). Open user decisions: guard travel speed, fencing versus longsword stepping, skeleton choice.
- Validation: 97 game tests and 6 leg tests pass; `npm install` was run locally (ignored directory). https://github.com/Harvard-Westlake/Game1 was not reachable with the available credentials; work used the local clone at db4ce28, matching origin and upstream. Nothing committed. Outstanding: no visual review of anything proposed; Mixamo catalogue and paid-pack formats unverified.

### 2026-11-19 — AT-007 fencing footwork system, bench and `?footwork` flag

- User asked for the researched footwork system to be written on a branch in the proposed order, with a guard that interrupts any animation at any time and forms very quickly from the current pose, a demo, and basic moves from the researched behaviours and speeds. Work is on local branch `footwork-rig`; nothing was pushed.
- Added `src/footwork/`: `legs.ts` (lower-body solver: hip sink on reach, knee over toes, heel/ball pivots), `stances.ts` (three guards, lunge and tuning as data), `controller.ts` (steps, chained steps, wall-shortened steps, passing step, lunge, recoveries, guard interrupt, follow mode) and `game.ts` (flagged player hookup).
- `src/humanRig.ts` `update` takes an optional lower-body override and `src/knight.ts` gains `setLowerBody` and a `carrier` group. With no override the knight is unchanged.
- `src/main.ts`: new `?footwork` URL flag, off by default. With it, the player's legs come from the footwork system while engaged; engaged pace is the guard's own (about 1.15 instead of 4.2, 0.69 while blocking); E cancels an attack at any point except a riposte; blade hit tests keep the game's own sword placement. Default gameplay rules, timings and speeds are unchanged without the flag.
- Added the AT-007 bench (`npm run footwork:dev`, port 5175) hosting the real knight, with guard keys, steps, lunges, recoveries, pause/scrub/slow motion, live tuning with JSON copy, contact markers and scripted proof runs. Added `footwork:build`, `footwork:report` and `footwork:test:browser` scripts.
- Documentation: `Animation Testing/AT-007-FOOTWORK.md` with evidence stills, a learning-log entry, an animation README pointer and a `DEVELOPMENT.md` section.
- Validation: 133 Node tests pass (97 existing, 36 new); 6 rig-bench leg tests pass; 38 game browser tests pass (35 existing, 3 new); 4 footwork-bench browser tests pass; game, rig-bench and footwork-bench TypeScript and production builds pass with the existing bundle-size advisory.
- Limitations: no user visual review yet, and numeric checks are not visual acceptance. Step durations are estimates. The upper body only rides on the hips. Under the flag the three deviations above are undecided design, enemies do not use footwork, the turning cleave keeps the built-in legs, and nothing is balanced for the slower engaged pace.

### 2026-11-19 — AT-007 branch renamed, pushed and proposed upstream

- User asked for the work to go into a branch called `footloose`, be pushed, and be proposed to the original repository as a cross-fork pull request. The local branch `footwork-rig` was renamed to `footloose` (same commits) and pushed to the fork `andrewtheiss/Game1`. Opened https://github.com/LimeyJuicy/Game1/pull/1 from `andrewtheiss:footloose` into `main`.
- This supersedes the earlier notes that the work was on `footwork-rig` and unpushed. Neither repository's `main` was changed. https://github.com/Harvard-Westlake/Game1 still does not resolve with the available credentials, so "the original" was taken to be the fork's parent, `LimeyJuicy/Game1`.
- No code, gameplay, asset or test changes in this step; the validation recorded in the previous entry is the latest. Still outstanding: no user visual review of the footwork motion, and the three `?footwork` deviations remain undecided.

### 2026-11-19 — AT-012 PR #1 imported and adapted to supplied knight

- Fetched PR #1 (andrewtheiss:footloose, a233cf4), created local testing/knight-footwork and imported footwork engine/bench/tests/evidence/optional game flag. Preserved current model/sword changes, append-only logs, package scripts and old comparison assets. No GitHub merge, push or automatic commit.
- Footwork bench default now uses approved 66-bone knight and supplied sword, both-hand shoulder carry, calibrated to 1.8 m knight height. Added measured-anatomy solver options and bind-axis adapter; legacy caller defaults retained. Original native knight stays selectable. All PR footwork families, proof runs, live tuning, timeline and controls retained. Main-game asset not silently replaced.
- Corrected source pelvis/spine frame mismatch and paused-frame AnimationMixer cache accumulation; added imported-model leg-length/contact/head/paused-redraw coverage. Captures go to evidence/imported; original PR images preserved. Added AT-012 notes and links in current model/sword/plan/workspace docs.
- Checks so far: 134 Node + seven rig checks; five bench browser scenarios; game/rig/footwork builds (existing bundle advisory). Final post-correction pose/build/browser refresh follows. Full game-browser run was interrupted after paused-state/timeout finisher failures; not recorded as a passing regression. See learning log for exact failure conditions and final results to follow.
- Remaining: user visual review, mesh-level finger/armor/cloth polish, authored upper-body combat guards and transitions, performance/collision review and future combat asset integration. PR’s optional game pacing/E-cancel/hit-test-offset decisions are not adopted as final design.

### 2026-11-19 — AT-012 final checks and review ready

- Final validation: 134 Node tests, seven rig tests, five footwork-bench browser cases and all 38 game browser cases pass. Isolated game rerun resolves the earlier paused-state/timeout run without unrelated gameplay changes. Game, rig and footwork TypeScript/production builds pass; existing bundle advisories remain. git diff --check passes.
- Reviewed final imported en-garde/lunge side captures after correcting source-world posture and paused redraw accumulation. Other saved imported captures cover low/high guard, heel landing and passing. Bone/socket errors remain around 1e-8 metres; this does not certify mesh-level skin/sole/finger quality or user animation acceptance.
- Testing bench running at http://127.0.0.1:5175/ with imported knight and two-handed shoulder-carried sword. PR controls and earlier-model comparison retained. Details in Animation Testing/AT-012-KNIGHT-FOOTWORK.md. Local testing/knight-footwork working tree remains uncommitted/unpushed; GitHub PR not merged. Final animation polish and imported-asset combat integration remain pending.

### 2026-11-19 — AT-013 upper-body and full-body architecture recommendation

- Completed requested source audit and three-approach research; saved Animation Testing/AT-013-UPPER-BODY-ARCHITECTURE.md and linked it in workspace README. Documentation only; no new animation implementation.
- Verified separate native gameplay/imported bench rigs, actual imported hierarchy, existing arm/leg IK, stateful attack sampling, footwork ownership, editor capabilities, explicit flagged render/hit sword offset and separate scripted riposte contact. Same-serial first-light resampling diagnostic returned zero blade error; did not mislabel all existing sampling as broken.
- Recommend authored joint/weapon data, bounded analytical arm IK, retained footwork and a shared deterministic final-pose evaluator. Report covers three-way tradeoffs, bone ownership/masks, modules/interfaces, weapon constraints, state progression versus sampling/events, early authoring workbench, incremental migration and tests. Smallest proposed proof: two guards + controlled extension/recovery on actual mesh with fixed feet and both grips; not implemented or accepted.
- Primary Three.js and IK research sources recorded; installed library behavior inspected. Selected existing character/combat/footwork checks: 32 passed. GLB hierarchy verified (66 joints/43 clips), native diagnostic 55 bones. git diff --check passed. No full suite/browser/performance claims for this research session; prior implementation results remain separately recorded. No commit/push.

### 2026-11-19 — AT-014 upper-body rig/editor and two guards, Stages 0–2

- Implemented approved rig profile, complete pose buffers/FK, validated joint-data library, deterministic evaluator and single skeleton/sword apply adapter in src/animation. Actual imported knight/sword, fixed existing high footwork stance. No new live target IK or attack implementation.
- Added high right / forward rising guards and authored transition keys. Final default grip residual ~0.082 mm across 481 samples; sampled actual foot mesh stays fixed. Refined a visually awkward horizontal guard after side/hand inspection; tests alone did not establish pose quality.
- Extended existing viewer at http://127.0.0.1:5175/?upperbody: bone selection/local rotation sliders, axes, guard names, timing/play/pause/reverse/scrub, limited sword-socket calibration, reset, JSON download/load and browser draft restore. Existing footwork route preserved. Definitions/evaluator shared outside editor; no competing per-frame writers.
- Added actual-GLB test fixture, upper-body Node regressions and browser editor scenario. 137 Node, seven rig and six bench browser tests pass; game/footwork builds pass with existing bundle advisory. Extended socket/reload draft check is being finalized; initial added reset assertion selected the wrong bone after reload and was corrected in the test.
- Created AT-014 implementation/controls guide; updated animation README, CODING_PLAN and append-only learning log. Initial editor bounds are not full anatomical IK limits; individual arm/socket edits can open support grip, explicitly reported. Stage 3+, asset skin cleanup and user visual acceptance remain pending. No gameplay rule/damage changes, source GLB edits, automatic commit/push.

### 2026-11-19 — AT-014 final verification and Stage 2 stop

Strengthened browser editor scenario passes, including sword calibration, JSON save/load and exact draft restore after reload. Final checks pass: 137 Node tests, seven rig tests, six bench browser cases, game/footwork TypeScript and production builds, git diff --check. Existing bundle-size advisory remains. Final default guard contact residual ~0.082 mm; 273 sampled actual foot vertices remain fixed. Actual mesh captures inspected; visual acceptance remains with the user. No new live arm IK, attacks or damage changes. Editor ready at http://127.0.0.1:5175/?upperbody; stop at Stage 2. Changes local/uncommitted/unpushed.

### 2026-11-19 — User-edited guard timing review copy

Validated supplied knight-upperbody-poses(1).json and created Animation Testing/AT-007-Footwork/saved-poses/user-guards-review.json at 2.8 seconds, as authorized. Asserted all fields except duration match the source; original Downloads file preserved. Running editor, browser draft, default poses and runtime code unchanged. Sampling shows a sharp left-wrist transition that timing alone cannot fix; existing wrist and blade-orientation concerns remain pending separate work. Findings appended to animation learning log. No commit/push.

### 2026-11-19 — AT-015 Phase A, approved Stages 3–5

- Verified and reused the existing Stages 0–2 profile, imported knight/sword, authored guards, pure pose evaluation and editor. Added shared bounded analytical arm IK, editable rigid weapon grip/pitch/yaw/edge-roll targets, elbow swivels and adjustable shoulder/elbow/wrist constraints. Actual finger landmarks calibrate opposing palms; right-hand socket remains the weapon parent. Unreachable/incompatible requests preserve link lengths and report residuals instead of stretching.
- Added serializable stationary preparation/extension/hold/recovery definition with modest spine contribution, pure absolute-time evaluation, exact recovery, final FK blade/tip trace and active-window swept-blade contact harness. Added Phase A workbench controls, one explicit action clock, playback/scrub, diagnostics and optional phaseA JSON field. Old v1 libraries remain supported; user Downloads files, review JSON and defaults are preserved. Removed per-sample Euler re-clamping, retaining input bounds and quaternion interpolation; regression covers wrist representation boundaries.
- No live-game combat/damage changes, lower-body replacement or model asset edits this session. Existing footwork remains available and regression-tested. Phase B/C not started. Wrote AT-015 implementation/controls guide and inventory; updated animation README and CODING_PLAN; appended learning findings.
- Final validation: 141 Node tests, seven rig tests and seven workbench browser cases passed. Strengthened Phase A browser check subsequently passed independently (26.3 s), including JSON reproduction, target edits, playback/pause, unreachable targets, invalid elbow range rejection and scrub-time clamping after shortened durations. Game and workbench TypeScript/production builds pass; existing bundle-size advisory persists. git diff --check passes. No full live-game browser rerun or target-device performance certification is claimed.
- Actual imported mesh tested: 273 sampled planted foot vertices unchanged; default extension target/grip errors below 1e-6 m and orientation below 1e-6 rad; maximum sampled joint step 0.03814 rad at 120 intervals. Front/side actual-mesh screenshots inspected and saved under footwork evidence/imported/phase-a-*.png. Numerical tests and captures do not constitute user visual approval.
- Initial browser attempt was blocked by sandbox server binding and rerun with approved local-server/browser permissions. First Phase A browser assertion read a stale pre-render diagnostic immediately after input; changed the assertion to await the rendered result. All final checks pass.
- Limits: approximate editable anatomical bounds, no self-collision/armor constraints, existing skin/finger/cloth deformation issues. Extreme constrained poses may lose off-hand contact or exact requested orientation, reported in HUD. Stationary-only demonstration; live gameplay pose/collision migration, moving attacks, lunges, parries, feints and full timeline authoring remain Phase B/C. No commit/push.

### 2026-11-19 — AT-016 KinemIQ sword/combat animation acquisition

- Downloaded 175 public GLB animation files from KinemIQ into Animation Testing/AT-016-KinemIQ-Library/clips, 52,551,560 bytes total, no failed downloads or identical-byte duplicates. Scope: all catalogue sword clips (33); combat attacks, defense, dodge, hit/death/recovery, guards/footwork, optional shield/lunge/acrobatic references, core locomotion and five relevant community variants. Excluded unrelated firearms, bows, spells, farming, dance and zombie actions. Source root motion and bytes preserved; no new character uploads, account/purchase/export-quota use, retargeting or live-game integration.
- Added public catalogue/community snapshots, machine-readable manifest with source URLs, hashes, root-motion/optional-reference metadata and embedded copyright, INDEX.md, per-file CREDITS.md, README and reproducible download/Three.js verification utilities. Updated animation workspace README; appended learning findings. CC0, CC BY 3.0 and CC BY 4.0 records retained, including community and upstream credits.
- Validation: all 175 pass GLB 2.0 header/chunk, embedded-buffer/index, finite animation values, monotonic key-time and sampler-size checks. All 175 decode using the installed Three.js GLTFLoader, bind all tracks, and yield finite AnimationMixer transforms at start/mid/end. Verification report: 175 passed, zero failed. Five community files use named transform hierarchies without skin declarations; remaining 170 expose skin-declared bones. These are motion files, mostly without renderable meshes, not replacement knight models. No claim of visual quality, direct knight compatibility or completed animation work.
- Acquisition failures resolved: sandbox DNS/network access required approved escalation; initial Python urllib TLS trust-chain failures were stopped and replaced with normally verified curl (no certificate bypass). Initial loader check incorrectly expected Bone objects in transform-only community files; inspected the 66 animated joint targets and strengthened binding/mixer verification to support their valid format. Final revalidation/re-run reuses the existing files without network requests and succeeds. No game regression suite rerun was needed for isolated assets/tools; no runtime changes or commit/push.

### 2026-11-19 — AT-017 downloaded cut + PR footwork; single-handed sword revision

- User approved a demonstration combining one downloaded sword cut with the PR footwork, first planted then stepping. During implementation the user changed the weapon to single-handed and requested resizing the current model. Final preview follows that revision: actual approved sword mesh at attachment scale 0.34, approximately 1.10048 m on the knight (previously 1.74783 m), secure right-hand socket, free left arm. Persistent configuration in src/animation/assets/single-hand-sword.json; original asset/source bytes preserved. This size applies in the new demo; archived two-hand studies/native live actor are preserved.
- Added shared scratch-buffer clip sampling/retargeting, pure imported lower-pose calibration matching the existing adapter, deterministic cut/footwork composition and single-hand sword configuration. Retargeted Quaternius/KinemIQ sword_light_a and sword_idle, including finger tracks. PR planner remains unchanged: short attack step via lunge(0.35, 0.5), lead plant at 0.65 s inside the cut, forward recovery, 0.147 m initial/root travel and 0.303 m final travel. Authored hip contribution resolves before leg IK; source lower/root tracks are masked. One final skeleton/socket commit and final-FK sword trail. No live damage, combat timing, movement-lock or enemy changes.
- Extended existing workbench at http://127.0.0.1:5175/?cut with Play/Pause/Replay, planted/step comparison, slow playback, scrub, camera views, skeleton/foot targets/tip trail and actual knight/sword. Existing footwork and Phase A routes remain intact. Added AT-017 guide, controls, evidence and file inventory. Updated current weapon direction in GAME_DESIGN, CODING_PLAN, DEVELOPMENT, PLAYER_SWORD, PLAYER_MOVEMENT_SPEC, CHARACTER_QUALITY, animationslist and animation README; appended learning log. Historical two-hand studies remain explicitly superseded references.
- Validation: 144 Node tests and seven rig tests pass; game and bench TypeScript/production builds pass (existing bundle advisory); diff whitespace check passes. Eight distinct bench browser cases pass across runs: full run seven passed and one old Phase A JSON test read a stale pre-render pose; fixed the assertion to poll the applied rotations, focused rerun passed in 30.6 s. New cut browser case passed in 28.3 s in the full run, with actual-model screenshots, correct size/grip, step movement, controls and no runtime errors. Actual sword mesh length is tested, not only the displayed label. Across 240 intervals/mode: max adjacent joint step 0.162643 rad, max actual ankle/target error 3.752e-8 m over 124 applied samples, exact right-grip attachment, no segment stretching or scene/source/definition mutation during queries. Actual screenshots inspected after source finger curl was included.
- Findings/failures: initial attempt to force the one-handed source onto a two-hand target yielded unacceptable 0.41 m reach residual / wrist jumps; it was not accepted and no relaxed limits were shipped. User's single-handed revision removed that conflicting constraint. Source finger tracks fix the otherwise open bind hand; mesh skin quality still needs review. Old quaternion normalization error produced a false comparison failure, corrected by comparing normalized orientations. Bench entry TypeScript coverage exposed and fixed old unused declarations/CSS typing. Shared Vite optimizer cache caused repeated new-route import 504s; isolated bench cache under node_modules resolves this. No dependencies added or original PR planner changed.
- Limits: one isolated scripted cut, source timing and early retarget/skin/armor/cloth/finger polish; user visual acceptance pending. No complete Phase B/C, collision-aware cut travel, arbitrary interruptions, new live-hit sampler, parry/feint or timeline editor. Single-handed travel/carry selection and native-game model migration remain later work. No full game browser rerun, commit or push.

### 2026-11-19 — AT-018 expanded single-handed animation review library

- User approved AT-017's appearance and requested the remaining game animations. Extended the same viewer at http://127.0.0.1:5175/?animations into a 69-entry, data-defined review library on the imported knight and preserved 1.10 m right-handed sword. Uses 27 downloaded motion sources and four existing native idle/gait clips; source/knight/sword GLB bytes unchanged. Six distinct light source cuts, three heavy cuts, six recoveries, ready/high/block/parry/recoil, feint, dash-cut candidate, eight-way PR combat/guarded/evasion movement, eight turn-and-roll adaptations, travel/gait/entry/exit studies, hit/stagger/knockback/get-up/death, enemy kick/taunt and victory salute. Reused-source variants are explicit; no claim of 69 unique recordings or final production completion.
- Added validated combat-library.json, shared library/full-body preview evaluators/types and extracted reusable immutable PR constraint plans. Original PR planner/leg solver unchanged. Source hip yaw is unwrapped across ±π, and bounded action hip requests are preplanned with the PR hip response before leg IK. Standing actions use PR feet; full-body actions own their legs with fitted frame/stature calibration and kinematic sole/body floor correction. Source action data supports trims, holds, phases, steps, direction, gait clocks, travel scaling, corpse holds and explicit body support. Evasions use the unchanged PR planner at 1.65 time scale. Final FK owns sword transforms; no per-sample live state advancement.
- Added category/action selection, lazy/cached source loading, source credits, custom-work coverage panel and root-following preview framing. Existing playback/scrub/speed/views/skeleton/markers/trails and old /?cut, / footwork, earlier IK modes are preserved. Added sync-library.mjs with --check, generated source URLs/COVERAGE.md, AT-018 guide, actual-model evidence and Node/browser regressions. Updated animationslist, CODING_PLAN, DEVELOPMENT, PLAYER_SWORD and animation README; appended learning findings.
- Final validation: 148 Node tests, seven rig tests and all nine workbench browser scenarios pass. Browser suite: 3.1 minutes, with all 69 entries selected/sampled and representative screenshots. Node library checks include 897 samples, finite/unit transforms, unchanged lengths/scales, source/scene/definition immutability, deterministic out-of-order sampling, attached right-hand sword and applied render/ankle agreement. Dense upper-action checks: max adjacent pelvis step 0.057324 rad, joint step 0.45405 rad at 180 intervals/action. Original cut regression retains max joint step ~0.162643 rad and ankle error <3.8e-8 m. Sampled floor corrections are below the 12 cm gate. Workbench/main-game builds and generated-source/whitespace checks pass; original live-game browser suite/device performance not certified.
- Findings/failures resolved: initial raw knockback required 28 cm floor correction, replaced by a more grounded community clip. Euler seam caused a ~0.56 rad bounded-hip reversal in light cut 3; continuous yaw fixes the seam, with a preplanned finite hip response taming fast source turns. A sped-up victory gesture failed continuity, replaced by a restrained raise/lower sword salute from an authored pose. First browser library pass was interrupted by an in-flight hot-reload edit; final complete run used a stable graph. Initial sync helper path depth was corrected. No game damage/mechanics changes, dependencies, source GLB edits, commit or push.
- Remaining work is explicitly listed in UI/docs: 24 individually authored light/six heavy execution chart (four light paths still undefined), five paired finishers and their prop/gore/camera tracks, dedicated one-handed thrust, omnidirectional interception, arbitrary live interruptions/chains/contact outcomes, precise turns/starts/stops/slopes/collision-aware movement, final carry/skin/armor/finger/cloth polish and broader visual authoring. Directional rolls turn into one forward-roll source. Isolated previews do not implement damage, invulnerability, perfect-defense effects, guaranteed riposte reach, sword drops, enemy behavior or full Phase B/C migration. New motions await user visual review.

### 2026-11-19 — Commit/push snapshot requested

- User requested committing and pushing the current project. Prepared the complete pending project snapshot on testing/knight-footwork: imported knight/sword assets and sources, retained rig/animation studies, PR footwork adaptation, approved animation architecture/editor/IK work, downloaded source library, single-handed cut and 69-preview library, tests, evidence and documentation. Existing user work is included; ignored dependencies/builds/browser results/local secrets remain excluded.
- Recent implementation validation remains passing: 148 Node tests, seven rig tests, all nine workbench browser scenarios, game/workbench builds and generated animation catalogue check. This session changes no runtime behavior; whitespace checks pass. Checked tracked/untracked text for credential patterns and source files against the individual 100 MiB limit; no matches or oversized files. Assets total roughly 297 MB before Git deduplication/compression.
- Publication target is origin/testing/knight-footwork in LimeyJuicy/Game1. Commit/push verification is reported in the session response; no main-branch merge, history rewrite or force push is requested.
- Staged-file validation additionally caught trailing whitespace in three newly added rigging/vendor source files and an extra final blank line in the downloaded animation index. Trimmed formatting only and adjusted the index generator to avoid reproducing the extra blank line; runtime animation behavior and source assets are unchanged.

### 2026-11-19 — Project snapshot published and verified

- Created commit 230f530443fe3dccfea112fb810b1e7bee2654be, “Add knight rig, footwork workbench and combat animation library” (408 files). Pushed successfully to origin/testing/knight-footwork with upstream tracking configured. GitHub remote ref independently verified against the full local commit hash; working tree was clean afterward.
- GitHub accepted the complete snapshot, including assets. It emitted a non-blocking large-file recommendation for the 50.49 MiB sword normal texture; no file exceeded the 100 MiB hard limit. No force push, merge to main or new runtime changes occurred. This follow-up records the completed publication after the interrupted conversation resumed.
