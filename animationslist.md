# Animation list

**Latest scheduling decision — 2026-11-18:** core gameplay/combat mechanics first using existing practice/debug UI, test arena, and placeholder motion. Waves/rewards, weather, final UI, maps, and balance are deferred until after core mechanics and before final animation production/polish. Earlier conflicting sequencing is superseded by [CODING_PLAN.md](CODING_PLAN.md#updated-production-order--2026-11-18). Existing motion remains visually unaccepted; preserve its quality requirements for the final phase. This documentation update does not itself resume coding.

Player body-mechanics reference: [PLAYER_MOVEMENT_SPEC.md](PLAYER_MOVEMENT_SPEC.md). Use its action-by-action choreography, directional coverage, transition matrix, and review checks while authoring/programming player animation. The current player sample has not passed visual acceptance; animation production is deferred; core-mechanics work later resumed with explicit authorization on 2026-11-18.

Planning inventory for the player, sword enemies, paired finishers, props, camera, and visual feedback. This covers the currently designed game; future enemy classes or weapons will extend it. The inventory itself does not authorize implementation; mechanics implementation resumed with the user's approval on 2026-11-18.

The current procedural characters and poses are placeholders. A listed animation is not a completed production asset. Every unchecked item below needs production work or validation against the final rig.

Related documents: [game design](GAME_DESIGN.md), [coding plan](CODING_PLAN.md), [current prototype](DEVELOPMENT.md), [append-only history](UPDATES.md).

Video analysis: [Synty Sword Combat trailer observations](#17-video-reference--synty-sword-combat-trailer).

## How to read this inventory

- **Clip:** an authored skeletal animation, either a loop or a one-shot action.
- **Blend:** a required transition or combination of clips. It needs deliberate setup and review, but does not necessarily need another exported animation.
- **Procedural:** foot placement, grip correction, look direction, secondary motion, or another controlled adjustment layered onto animation.
- **Paired:** coordinated player and victim tracks, plus any moving weapon/prop tracks.
- **Presentation:** animated camera, UI, particles, materials, or sound timing rather than a character clip.
- **Conditional:** required if that situation is supported; it does not introduce a new gameplay mechanic by itself.

Directional families must cover the stated directions. They can share suitable blends rather than duplicating every diagonal as an independent clip. Distinct attack executions must be genuinely authored variants; mirroring alone does not establish the required variety.

## 1. Quality standard and rig prerequisites

- [ ] Human proportions and a natural silhouette for both player and enemies; replace chunky/block-shaped final characters.
- [ ] A complete clothed body with fitted armor, rather than disconnected armor pieces pretending to be limbs.
- [ ] Independently articulated pelvis, spine, chest, neck/head, clavicles, shoulders, elbows, forearm twist, wrists, hands/fingers, hips, knees, ankles, feet, and toes.
- [ ] Reliable one-handed and two-handed sword attachments; grip controls for both hands, including release and regrip.
- [ ] Coordinated full-body weight transfer, support-foot placement, balance, and believable armor weight.
- [ ] Clean skinning and joint limits through deep windups, crouches, rolls, and finisher poses.
- [ ] Armor, mail skirt, and heraldic cloth that accommodate movement without locking the body or clipping through it.
- [ ] Consistent scale, skeleton conventions, ground height, weapon dimensions, and animation export settings.
- [ ] Foot planting and grip correction that preserve authored motion instead of stretching limbs.
- [ ] Continuous entry and exit poses, without snapping between locomotion, guard, attacks, and reactions.
- [ ] Blade contacts aligned with the visible blade trajectory; actor travel respects collision.
- [ ] A review scene showing the same poses from the actual low third-person combat camera.

These are core production requirements. Recommended production order: prove the rig and a small polished animation sample before producing finishers or the full directional library. This changes the proposed work order, not the game's implemented state.

## 2. Standing, walking, running, and retreat

| Check | ID | Instance | Delivery / coverage |
| --- | --- | --- | --- |
| [ ] | LOC-01 | Relaxed but alert standing outside combat | Clip loop; restrained breathing and weight shifts |
| [ ] | LOC-02 | Standing in combat ready guard | Clip loop; two-handed sword, alert footwork |
| [ ] | LOC-03 | Walk forward outside combat | Clip loop |
| [ ] | LOC-04 | Faster running between walk and full sprint | Clip or speed blend, only if a distinct gait is needed |
| [ ] | LOC-05 | Full sprint | Clip loop; grounded stride and armor weight |
| [ ] | LOC-06 | Combat advance | Clip loop facing the selected enemy |
| [ ] | LOC-07 | Combat backward retreat | Clip loop; do not run forward while sliding backward |
| [ ] | LOC-08 | Combat strafe left and right | Directional loops |
| [ ] | LOC-09 | Four diagonal combat movement directions | Blend coverage with correct feet, hips, and facing |
| [ ] | LOC-10 | Guarded advance, retreat, and side steps | Moving lower body plus guarded upper body; diagonal coverage |
| [ ] | LOC-11 | Start walking from rest | Clip/blend with weight transfer before the first full step |
| [ ] | LOC-12 | Walk into run and sprint | Acceleration blends; no instant full-speed stride |
| [ ] | LOC-13 | Sprint down to run/walk | Deceleration blend |
| [ ] | LOC-14 | Stop from walking or combat movement | Foot-phase-aware stopping and settling |
| [ ] | LOC-15 | Stop from sprinting | Stronger braking and final planted stance |
| [ ] | LOC-16 | Walking turns left/right, shallow through sharp | Turn blend and footwork |
| [ ] | LOC-17 | Sprinting curves left/right | Bank/stride adjustment with limited turning speed |
| [ ] | LOC-18 | Reverse direction and turn around | Brake, reposition feet, accelerate; no instant 180-degree slide |
| [ ] | LOC-19 | Turn in place toward an acquired enemy | Small and large left/right turns |
| [ ] | LOC-20 | Change focused enemy while standing or moving | Head/chest anticipation followed by hips and feet |
| [ ] | LOC-21 | Combat retreat into disengaged running | Turn out of guard, adopt running carry, accelerate |
| [ ] | LOC-22 | Re-enter combat from a run | Brake/turn into ready guard, preserving momentum continuity |
| [ ] | LOC-23 | Movement blocked by a wall or another body | Shorten stride and plant; no running in place or forced stumble |
| [ ] | LOC-24 | Adjust foot placement on supported slopes/uneven ground | Procedural; conditional on final arena surfaces |
| [ ] | LOC-25 | Left/right foot support variants for starts and stops | Phase matching or authored alternatives as needed |

**Confirmed carry direction:** one-handed sword carry beside the body while walking/running/sprinting, blade point outward and backward and clear of the ground. Sword arm bends and visibly swings; the wrist/forearm carry the blade without changing the closed grip. During walking and sprinting the back of the hand faces sky, palm down. Free arm and torso keep their coordinated source motion. Combat retains a two-handed guard, with release/regrip transitions still requiring authoring. No over-the-shoulder locomotion carry is required. Native-rig showcase AT-006 tests this direction; final game animation remains separate.

**Retreat discussion:** running away must work. Shift plus movement away to disengage was proposed, along with pursuers being slightly slower than the player's sprint. Exact activation, re-engagement, and interruption rules still need agreement; LOC-21/22 reserve the visual transitions without claiming those controls are implemented.

## 3. Light attacks — 24 distinct executions minimum

Each row needs an **A and B execution**. Each execution contains entry/preparation, the committed cut, follow-through, and recovery. They may be exported as one clip with phase markers rather than four separate clips.

Directions describe blade travel relative to the performer's body and target-facing plane, not screen coordinates. The familiar eight paths below come from the discussion. Four additional paths remain undefined; do not silently replace the requested 12-direction family with eight paths or invent four duplicates.

| Check | Direction slot | Blade path | Required execution IDs |
| --- | --- | --- | --- |
| [ ] | L01 | Upper left to lower right, falling diagonal | LIGHT-L01-A, LIGHT-L01-B |
| [ ] | L02 | Upper right to lower left, falling diagonal | LIGHT-L02-A, LIGHT-L02-B |
| [ ] | L03 | Lower left to upper right, rising diagonal | LIGHT-L03-A, LIGHT-L03-B |
| [ ] | L04 | Lower right to upper left, rising diagonal | LIGHT-L04-A, LIGHT-L04-B |
| [ ] | L05 | Left to right, horizontal | LIGHT-L05-A, LIGHT-L05-B |
| [ ] | L06 | Right to left, horizontal | LIGHT-L06-A, LIGHT-L06-B |
| [ ] | L07 | High to low, vertical | LIGHT-L07-A, LIGHT-L07-B |
| [ ] | L08 | Low to high, vertical | LIGHT-L08-A, LIGHT-L08-B |
| [ ] | L09 | Additional directed path — chart decision required | LIGHT-L09-A, LIGHT-L09-B |
| [ ] | L10 | Additional directed path — chart decision required | LIGHT-L10-A, LIGHT-L10-B |
| [ ] | L11 | Additional directed path — chart decision required | LIGHT-L11-A, LIGHT-L11-B |
| [ ] | L12 | Additional directed path — chart decision required | LIGHT-L12-A, LIGHT-L12-B |

### Required light-attack instances beyond the direction chart

- [ ] First strike from idle, ready guard, and a planted movement stop.
- [ ] Second strike from a compatible previous cut, preserving the blade's actual ending position.
- [ ] Third, stronger chain-ending strike with stronger weight transfer and its established recovery commitment.
- [ ] Return to neutral after each chain position when no next input arrives.
- [ ] Reset after the combo continuation window expires.
- [ ] Windup and late-recovery exits into permitted block/parry/dodge actions.
- [ ] Forced interruption by damage or guard break, including during committed swing.
- [ ] Successful contact, blocked contact, and a miss all complete a physically coherent follow-through.
- [ ] Point-blank execution and short target-closing execution without exaggerated foot sliding.
- [ ] Free-space swing without a selected enemy or closing lunge.

These are transition/contact contexts for the 24 executions, not an automatic multiplication into 24 clips for every chain position. Variant-to-chain mapping still needs to be authored and checked.

## 4. Heavy attacks — six distinct executions minimum

| Check | Direction | Required execution IDs | Coverage |
| --- | --- | --- | --- |
| [ ] | Overhead downward cut | HEAVY-OVERHEAD-A, HEAVY-OVERHEAD-B | Deep loading, step, powerful downward follow-through |
| [ ] | Broad swing from the left | HEAVY-LEFT-A, HEAVY-LEFT-B | Whole-body lateral weight transfer |
| [ ] | Broad swing from the right | HEAVY-RIGHT-A, HEAVY-RIGHT-B | Distinct stance/footwork and lateral follow-through |

- [ ] Heavy from idle and ready guard.
- [ ] Heavy after a light attack has recovered; terminate the light chain cleanly.
- [ ] Heavy after running deceleration and foot planting.
- [ ] Heavy hit, enemy block, guard-breaking contact, and miss follow-throughs.
- [ ] Allowed defensive exits and forced damage interruptions.
- [ ] Recovery to standing guard or intended locomotion.

**Shared attack standard:** 30 authored light/heavy executions minimum. The blade starts deep, with its tip behind the character, follows approximately 130–180 degrees of clear travel, and finishes well past contact. Load slowly, cut fast, and settle smoothly without extending gameplay attack durations. Use feet, knees, pelvis, spine, shoulders, elbows, and hands together. Large arcs do not permit unrestricted spinning or movement steering.

## 5. Running into an attack and other attack transitions

| Check | ID | Instance | Delivery / coverage |
| --- | --- | --- | --- |
| [ ] | AT-01 | Walk/run into light attack | Collision-limited braking, planted feet, carry-to-windup blend |
| [ ] | AT-02 | Sprint into light attack | Stronger momentum arrest without an instant stop |
| [ ] | AT-03 | Walk/run/sprint into heavy attack | Braking and a heavier loading stance |
| [ ] | AT-04 | Strafing/backpedaling into an attack | Arrest the actual travel direction before stepping into the cut |
| [ ] | AT-05 | Neutral/low carry into deep windup | Continuous full-body and sword transition |
| [ ] | AT-06 | Attack into the next compatible light | Blade path, hands, and feet remain continuous |
| [ ] | AT-07 | Attack recovery into movement, guard, parry, or evasion | Phase-aware blends |
| [ ] | AT-08 | Attack interrupted by light/heavy damage, knockdown, or death | Reaction entry matched to current pose |
| [ ] | AT-09 | Attack while camera focus changes to another enemy | Keep the committed blade path and closing motion unchanged |
| [ ] | AT-10 | Automatic closing step shortened by an obstacle | Adapt stride to actual collision-limited displacement |

These are animation connections, not new attacks or permission to move during committed swings.

## 6. Blocking and parrying — player and compatible enemies

| Check | ID | Instance | Delivery / coverage |
| --- | --- | --- | --- |
| [ ] | DEF-01 | Raise sword into held guard | Clip/blend from idle, carry, or allowed recovery |
| [ ] | DEF-02 | Hold stationary guard | Clip loop; balanced two-handed stance |
| [ ] | DEF-03 | Lower guard | Blend back to combat ready or low carry |
| [ ] | DEF-04 | Guard while advancing, retreating, or strafing | Upper/lower-body layers with planted feet |
| [ ] | DEF-05 | Intercept normal attacks | High/low, left/right, frontal/diagonal contact coverage |
| [ ] | DEF-06 | Defend against side/rear attacks | Fast upper-body interception and an appropriate turn; mechanics cannot wait for camera rotation |
| [ ] | DEF-07 | Absorb a heavy blockable strike | Stronger recoil and supporting-foot adjustment |
| [ ] | DEF-08 | Absorb successive blocks from different enemies | Reposition sword without restarting the same static pose |
| [ ] | DEF-09 | Fresh parry attempt | Short intercept motion into success, held block, or recovery |
| [ ] | DEF-10 | Successful ordinary parry | Redirect incoming blade, recoil, and settle into ready guard |
| [ ] | DEF-11 | Perfect parry | Particularly clear contact pose; may share a polished parry with timing/presentation layers |
| [ ] | DEF-12 | Failed/early parry attempt | Recover into held guard or ready stance; no automatic repeated parry |
| [ ] | DEF-13 | React to being parried | Sword knocked off line, short attacker recoil, recover |
| [ ] | DEF-14 | Low-defense strain | Restrained stance/impact variation; never hide telegraphs or change timing accidentally |
| [ ] | DEF-15 | Defense actually breaks | Sword knocked wide, pronounced upper-body recoil, feet recover balance |
| [ ] | DEF-16 | Remain vulnerable during broken defense | Exposed stance compatible with incoming punishment hits |
| [ ] | DEF-17 | Regain guard after break | Re-establish feet and sword as the break ends |
| [ ] | DEF-18 | Normal attack hits an enemy's guard | Attacker contact/recoil layer; still complete the correct recovery |
| [ ] | DEF-19 | Red attack hits through a guard/parry attempt | Enter the proper damage reaction; never show a successful block |

An omnidirectional block needs convincing interception coverage. It must not make the entire character instantly snap toward each attacker. The final animation can share directional clips and procedural aim adjustments.

## 7. Dodges, rolls, and focus changes

| Check | ID | Instance | Delivery / coverage |
| --- | --- | --- | --- |
| [ ] | EVA-01 | Forward evasive step | Startup, travel, and recovery |
| [ ] | EVA-02 | Backward evasive step, including no-direction default | Startup, travel, and recovery |
| [ ] | EVA-03 | Left/right evasive steps | Side-step footwork with guarded upper body |
| [ ] | EVA-04 | Four diagonal evasive steps | Authored/blended directional coverage |
| [ ] | EVA-05 | Evasion from standing, moving, and a permitted attack cancel | Entry blends preserve body momentum |
| [ ] | EVA-06 | Recover from a step into guard, movement, or an earned riposte | No skipped vulnerable recovery except where the rules allow cancellation |
| [ ] | EVA-07 | Second-press transition from step into roll | Match original dodge direction and current body position |
| [ ] | EVA-08 | Forward/backward/left/right rolls | Full-body tuck, safe sword position, grounded contact |
| [ ] | EVA-09 | Diagonal rolls | Directional blend coverage, not a floating rotated body |
| [ ] | EVA-10 | Roll exit into crouch/foot plant and standing guard | One continuous recovery; no ground-to-standing snap |
| [ ] | EVA-11 | Perfect initial dodge | Readable avoidance silhouette through slow motion; may reuse the ordinary step |
| [ ] | EVA-12 | Earned post-perfect-dodge roll | Clean transition even if the step already finished; forfeits the counter |
| [ ] | EVA-13 | Dodge/roll shortened by walls or bodies | Collision-aware travel and feet/body placement |
| [ ] | EVA-14 | Damage during vulnerable dodge/roll startup or recovery | Pose-matched flinch/stagger/knockdown/death transition |
| [ ] | EVA-15 | Successful dodge turns focus toward the avoided attacker | Recover body facing and camera smoothly; ordinary and perfect dodge coverage |

Discussion direction: successful avoidance should select the source attacker, even for an ordinary dodge. Empty-space dodges should not switch focus. This focus-source behavior is now implemented in the mechanics prototype; polished animation coverage remains pending. Follow-up-roll focus behavior and ambiguous simultaneous avoided strikes still need precise resolution rules.

## 8. Dashing riposte

The latest requested design replaces the old short, range-limited counter: after perfect defense, fresh J during the reward window initiates a **dashing riposte that reaches and hits its source attacker**, then breaks their remaining defense. It starts after slow motion ends. The mechanics prototype now uses a routed dash and paired impact in place of the earlier limited lunge; production dash/strike clips remain pending.

| Check | ID | Instance | Delivery / coverage |
| --- | --- | --- | --- |
| [ ] | RIP-01 | Ready counter pose after perfect parry | Blend from actual parry recovery |
| [ ] | RIP-02 | Ready counter pose after perfect dodge | Blend from late permitted step recovery |
| [ ] | RIP-03 | Dash anticipation and push-off | Strong supporting-foot drive; no teleport |
| [ ] | RIP-04 | Closing dash across different earned distances | Dedicated travel phase and adaptable stride |
| [ ] | RIP-05 | Short-distance/point-blank counter | Avoid unnecessary overshoot or a huge dash into the victim |
| [ ] | RIP-06 | Alignment toward the source attacker | Continuous body/sword alignment, independent of another camera focus |
| [ ] | RIP-07 | Dash braking and planted impact | Reach a believable sword-contact distance |
| [ ] | RIP-08 | Fast decisive riposte strike | Contact pose, follow-through, and recovery |
| [ ] | RIP-09 | Victim hit and immediate defense-break reaction | Coordinated with the riposte's actual impact moment |
| [ ] | RIP-10 | Recovery into ordinary J/K punishment, guard, or movement | Preserve attack commitment and balance |
| [ ] | RIP-11 | Decline or let the opportunity expire | Return to ready/movement without an involuntary attack |
| [ ] | RIP-12 | Obstructed approach or victim-position change | Conditional route/alignment/travel solution; avoid passing through walls or bodies |

Guaranteed reach is the design goal, but obstacle routing, maximum earned separation, interruption/protection, source death, and whether a moving victim is briefly constrained need agreement before implementation. Do not quietly reinstate a distance miss or teleport through scenery to make the animation connect. A guarantee against a living valid source does not imply reviving a dead one.

## 9. Damage, loss of balance, death, and bodies

| Check | ID | Instance | Delivery / coverage |
| --- | --- | --- | --- |
| [ ] | HIT-01 | Ordinary clean hit | Short, readable full-body flinch |
| [ ] | HIT-02 | Heavy clean hit | Larger stagger with backward/sideways balance recovery |
| [ ] | HIT-03 | Knockdown from a supported powerful/unblockable hit | Loss of footing, descent, ground contact |
| [ ] | HIT-04 | Front/rear/left/right hit directions | Directional family; diagonal blending |
| [ ] | HIT-05 | High/torso/low contact variation where supported | Pose layer matched to actual contact, not a new targeting system |
| [ ] | HIT-06 | Damage while standing, moving, attacking, guarding, or evading | Reaction blends from current pose |
| [ ] | HIT-07 | Damage during already broken defense | Punishment reaction that does not restart the break timer |
| [ ] | HIT-08 | Recover balance from flinch/stagger | Settle into a usable guard/movement state |
| [ ] | HIT-09 | Prone/supine grounded reaction and get-up | As required by authored knockdowns; maintain sword ownership |
| [ ] | HIT-10 | Fatal hit and collapse | Front/rear/side coverage without identical synchronized falls |
| [ ] | HIT-11 | Death during a sprint, swing, dodge, roll, or knockdown | Pose/velocity-aware authored or blended handoff |
| [ ] | HIT-12 | Final death settle and persistent corpse pose | Bounded secondary motion or authored settle |
| [ ] | HIT-13 | Sword release/drop on death when applicable | Prop track/physics handoff, not a second sword appearing |
| [ ] | HIT-14 | Severed head/arm and dropped equipment motion | Conditional on the compatible lethal animation; authored detachment plus bounded physics |
| [ ] | HIT-15 | Ragdoll handoff or alternative authored death continuation | Production choice; no requirement to build a full ragdoll system |
| [ ] | HIT-16 | Player defeat collapse and end pose | Coordinate with defeat UI/control loss |
| [ ] | HIT-17 | Reset to starting stance | State reset, not an animated resurrection |

Every clean hit should visibly punish the character. Brief post-hit protection prevents unavoidable chains; it does not need an exaggerated invincibility pose. Do not add persistent limping or slower attacks merely because health is low: no injury-based movement penalty has been agreed.

## 10. Enemy positioning, individual behavior, and attack variety

Player and compatible sword enemies can share retargeted locomotion, blocks, reactions, and sword clips. Shared assets must fit enemy timing and body proportions. Enemies still need individually varied selections and phases; three actors playing the same loop in sync is not sufficient.

| Check | ID | Instance | Delivery / coverage |
| --- | --- | --- | --- |
| [ ] | EN-01 | Alert stationary guard while waiting | Stance/weight-shift alternatives with offset loop phases |
| [ ] | EN-02 | Approach at walk, faster approach, and pursuit run | Gait/speed transitions; not a sliding held-guard pose |
| [ ] | EN-03 | Slow down into attack distance | Plant feet and settle guard |
| [ ] | EN-04 | Small forward/backward spacing adjustments | Short deliberate steps, not constant oscillation |
| [ ] | EN-05 | Flank left/right while facing the player | Lateral/diagonal combat footwork |
| [ ] | EN-06 | Reposition to an open approach around the player | Turn, move to the gap, then turn into guard |
| [ ] | EN-07 | Yield space to another enemy or avoid a collision | Short side/back steps; no clipping or synchronized shuffle |
| [ ] | EN-08 | Follow bends around arena obstacles | Natural path turns and speed adjustment |
| [ ] | EN-09 | Stop short when the player changes direction or retreats | Replant and adjust approach |
| [ ] | EN-10 | Normal sword attacks | Distinct readable preparations, cuts, follow-throughs, recoveries |
| [ ] | EN-11 | Heavy blockable attacks | Weightier authored attacks with white cue timing |
| [ ] | EN-12 | Unblockable front push kick | Shift weight onto the support leg, raise the knee clearly, keep sword guarded, extend boot, retract and regain balance; red cue and boot contact timing |
| [ ] | EN-13 | Alternative executions and attack choices per enemy | Reuse the appropriate sword library without a shared fixed attack sequence |
| [ ] | EN-14 | Track player during allowed preparation, then commit | Turn/aim blend that stops tracking at the gameplay commitment point |
| [ ] | EN-15 | Resume guard or spacing after a hit, block, parry, or miss | Follow the actual combat outcome |
| [ ] | EN-16 | Guard break, punishment, and guard restoration | Reuse DEF/HIT families with enemy timing |
| [ ] | EN-17 | Wait/reposition while another enemy attacks | Remain active and alert without fake attack swings |
| [ ] | EN-18 | Nearby player finisher starts | Settle/keep repositioning and hold attacks |
| [ ] | EN-19 | Resume combat after a finisher | Fresh readable windup, not an instant resumed hit |
| [ ] | EN-20 | Arena entry through a supported entrance | Conditional walk/run into combat; no spawn flourish required |

Latest requested behavior: maintain a loose, uneven surround with varied distances, angles, decisions, and attack choices. There must be no perfect circle, shared radius, synchronized formation, or identical repeating attack order. This requires behavior changes as well as animation; making three different walk clips alone cannot fix the current pursuit logic. Scripted uniform attack patterns can remain in timing practice.

No feint, shove, shield, unarmed attack, weapon pickup, or weapon swap is implied by this list. Those would need separate design approval.

## 11. Five paired finishers

Each finisher needs **one complete player track and one complete victim track**: five pairs / ten principal character tracks minimum. The beats below are required animation instances inside those tracks, not a requirement to export a new clip for every beat.

### FIN-01 — Rising Cleave

- [ ] Safe approach, mutual alignment, and entry from eligible guard-break poses.
- [ ] Player chest thrust; victim contact and torso recoil.
- [ ] Player's rising extraction/cleave; victim follows the physical force.
- [ ] Player kick and recovery of support-foot balance.
- [ ] Victim separation, backward fall, impact, and final settle.
- [ ] Sword and both hands remain aligned through extraction and recovery.
- [ ] Player exits into the actual ready/movement stance.

### FIN-02 — Disarm and Dispatch

- [ ] Choreographed incoming victim swing, player catch/block, blade engagement.
- [ ] Player leverage/disarm; victim grip releases; enemy sword follows a prop track.
- [ ] First slash and matching victim reaction.
- [ ] Second slash and matching victim reaction.
- [ ] Stomach thrust and matching victim fold/recoil.
- [ ] Withdrawal without hand/weapon snapping.
- [ ] Victim collapse/settle; player recovers stance.

### FIN-03 — Helmet Bash and Throat Cut

- [ ] Choreographed victim swing and player evasive entry.
- [ ] Close-in step and pommel/helmet impact with paired recoil.
- [ ] Player moves into the controlling position; victim is drawn into place continuously.
- [ ] Holding-hand placement and blade alignment at the throat.
- [ ] Controlled blade draw across the throat and matching victim reaction.
- [ ] Release and victim fall/settle.
- [ ] Player steps clear and regains two-handed guard.

### FIN-04 — Sweeping Decapitation

- [ ] Player knocks the victim's weapon aside; victim opens guard.
- [ ] Knee kick, victim loss of balance, and drop into the intended low pose.
- [ ] Player loads and executes the decisive sideways cut.
- [ ] Head detaches at the authored lethal event; head/helmet continue with an appropriate prop motion.
- [ ] Victim body collapses and settles; held weapon releases if needed.
- [ ] Player's follow-through and recovery.

### FIN-05 — Sword-Arm Sever

- [ ] Trap the victim's extended blade with coordinated hand/weapon positions.
- [ ] Player steps outside the reach while the victim remains physically connected to the exchange.
- [ ] Downward severing cut and matching victim recoil.
- [ ] Arm, hand, and weapon detach/release in the authored order.
- [ ] Fatal diagonal torso cut and paired reaction.
- [ ] Victim collapse/settle; player recovery.

### Requirements shared by every finisher

- [ ] Eligibility pose and prompt context: low enemy health plus broken defense, in reach, deliberate F input.
- [ ] Short entry/alignment with no visible teleport, foot slide, or body overlap.
- [ ] Role-specific hands, grips, foot contact, and victim support poses.
- [ ] Accurate weapon-body contacts, wound positions, and any required capped sever points.
- [ ] Authored lethal event, detach events, sword release/regrip, and blood emitters at the correct beats.
- [ ] Space checks and a tight-space selection/fallback policy before entry; never force a pair through a wall.
- [ ] Continuous camera entry, tracking, and return to the real gameplay view.
- [ ] Nearby-enemy hold/reposition and readable return to attacks.
- [ ] Player protection ends at the agreed control-return event.
- [ ] Corpse and detached prop settling with bounded lifetimes.

No finisher automatically triggers merely because a normal parry/dodge animation resembles its opening choreography.

## 12. Sword, hands, armor, cloth, and secondary motion

- [ ] Low carry to two-handed guard, and guard back to low carry.
- [ ] Running-carry to windup, block, parry, dodge, and retreat transitions.
- [ ] Left-hand release/regrip wherever the chosen carry or choreography requires it.
- [ ] Finger closure, grip changes, and forearm twist without floating palms.
- [ ] Wrist alignment and both-hand grip through the full 130–180-degree cut.
- [ ] Sword contact deflection and restrained blade vibration/settling.
- [ ] Sword placement during roll, knockdown, get-up, and collapse so it does not pass through the body or floor.
- [ ] Dropped/disarmed swords and finisher-specific head/arm/helmet motion.
- [ ] Shoulder plates, elbow/knee armor, straps, and gauntlet articulation through extreme poses.
- [ ] Mail skirt and heraldic cloth sway during standing, running, turns, swings, stops, rolls, and falls.
- [ ] Secondary motion recovery after abrupt stops, parries, and guard breaks.
- [ ] Cloth/armor collision or authored correction around legs, hands, blade, and ground.
- [ ] Restrained breathing/body motion beneath the fully closed armor; no facial animation or visible eyes required.

Choose authored secondary motion, bones, or bounded simulation according to browser performance. A full cloth simulation is not required by the design. A cape, scabbard, draw/sheath system, or weapon flourish is not currently required.

## 13. Perfect defense, guard break, camera, and effects

These are animation/presentation tasks, but should not be counted as skeletal clips.

| Check | ID | Instance | Required result |
| --- | --- | --- | --- |
| [ ] | FX-01 | Ordinary block contact | Small pale sparks at the real blade contact |
| [ ] | FX-02 | Ordinary/perfect parry contact | Sharper contact flash/sparks and timed metal response |
| [ ] | FX-03 | Perfect-defense emphasis | Approximately half-second real-time slow motion; defensive motion continues, input remains locked |
| [ ] | FX-04 | Exit perfect-defense emphasis | Smooth return to speed and readable earned-riposte opportunity |
| [ ] | FX-05 | Defense-break white contact flash | Localized hand-drawn flash where the blades actually meet, plus sparks |
| [ ] | FX-06 | Defense-break impact freeze | Approximately 0.08 seconds proposed; pause fight and break timer together, once per break |
| [ ] | FX-07 | Defense-break impact marks and sound | Brief pale drawn lines and a sharp metallic crack, synchronized to recoil |
| [ ] | FX-08 | Enemy defense bar shatters | Clear empty/broken state, then appropriate recovery; do not replay on punishment hits |
| [ ] | FX-09 | Player guard-break UI response | Player-specific warning and recovery; exact flash/freeze sharing with enemy breaks needs a decision |
| [ ] | FX-10 | Sword swing lines | Subtle directional illustrated trails aligned with the real cut |
| [ ] | FX-11 | Directional blood from a hit | Follow the cut/contact direction; adapt to ordinary, heavy, riposte, and lethal hits |
| [ ] | FX-12 | Finisher blood and sever effects | Beat-specific emitters for each finisher, with capped body sections where applicable |
| [ ] | FX-13 | Armor injury staining | More bloodstained as player health decreases; separate persistent battle grime if used |
| [ ] | FX-14 | Enemy death confirmation | Subtle red blood flash around screen corners at the exact lethal moment |
| [ ] | FX-15 | Glass-heart health display | Ink-blood fill loss, increasing cracks with damage, healing/restoration transitions |
| [ ] | FX-16 | Guard meter loss/recovery/warning | Readable animated state changes; final shape still undecided |
| [ ] | FX-17 | White/red four-point warning stars | Appear before the actual attack, hide on resolution/interruption, rearm for each new attack |
| [ ] | FX-18 | Offscreen warnings and focus marker | Track the true source; smooth target switch presentation |
| [ ] | FX-19 | Footsteps, armor movement, sword whooshes, impacts | Authored event timing matched to foot plants and contact |
| [ ] | CAM-01 | Exploration follow and turns | Low third-person travel-following with very small footstep bob/sway |
| [ ] | CAM-02 | Enter/leave combat and retreat sprint | Continuous transition between movement-following and focused framing |
| [ ] | CAM-03 | Attack, block, parry, and successful-dodge target changes | Smooth orbit; no cuts or committed-attack redirection |
| [ ] | CAM-04 | Nearby group expands/contracts | Modest distance/height adjustment, retaining the third-person feel |
| [ ] | CAM-05 | Wall/obstruction response | Smooth side-angle adjustment and scenery fade rather than character-close zoom |
| [ ] | CAM-06 | Dashing riposte | Track closing movement, keep impact readable, return without a snap |
| [ ] | CAM-07 | Defense-break emphasis | Restrained camera response; do not hide surrounding attackers |
| [ ] | CAM-08 | Each of the five finishers | Authored continuous follow path, tight-space fallback, and gameplay handback |
| [ ] | CAM-09 | Player death and arena reset | Coordinate with defeat and reset; exact cinematic treatment remains undesigned |

Guard-break flash/freeze/recoil/bar-shatter treatment is implemented at prototype quality, including a real-time 0.08-second fight/timer hold; final animation polish remains pending. Slow motion and a freeze are different events: the perfect-defense pose continues slowly; the break freeze briefly holds the fight at contact. Animation events must not deal damage twice when time stops/resumes. Input buffering during break freeze and chained-break handling remain open implementation decisions.

## 14. Arena atmosphere, healing, and session transitions

- [ ] Sunny-map sky/cloud and ambient dust movement where appropriate.
- [ ] Rain, puddle/ripple response, and wet-surface presentation where used.
- [ ] Snowfall and windblown flurries on the snowy field.
- [ ] Desert dust, blowing sand, and heat-haze presentation where used.
- [ ] Mist/fog and restrained wind through forest/ruin scenery where present.
- [ ] Smoke, embers, and fire/brazier motion in the king's hall or appropriate ruined areas.
- [ ] Chainmail/cloth response to supported environmental wind, secondary to combat readability.
- [ ] Blood particles, droplets, surface marks, corpses, and detached parts settling/fading or being cleaned up within bounded budgets.
- [ ] Between-wave reward UI entry/selection/exit and full-heal heart restoration.
- [ ] Passive healing below half health: heart fill/crack presentation; no healing gesture or potion animation is currently required.
- [ ] Wave start/completion, pause/resume, defeat, arena restart, and stage completion presentation once those flows are designed.

Covered interiors must not receive outdoor precipitation through the roof. No animal, civilian, gathering, crafting, climbing, jumping, swimming, or resource animations belong to the current scope. No victory emote or scripted intro cinematic has been agreed.

## 15. Transition and production acceptance checklist

Apply these checks across the families above instead of exporting a bespoke clip for every possible state pair.

- [ ] Idle ↔ locomotion ↔ guard uses coherent hands, sword, hips, and planted feet.
- [ ] Standing/walking/running/sprinting transitions preserve acceleration and stopping behavior.
- [ ] Target switches preserve travel intent and use turn footwork instead of instant root rotation.
- [ ] All attack entries, chain links, recoveries, and permitted cancels preserve complete-body continuity.
- [ ] Every supported action can transition into its legal damage, knockdown, guard-break, and death outcomes.
- [ ] Defensive interception from any angle stays responsive without waiting for camera movement.
- [ ] Evasion can transition into recovery, earned dash counter, earned roll, or a legal hit reaction.
- [ ] Dashing riposte preserves source identity and reaches a valid source without teleporting through obstacles.
- [ ] Paired finishers align both rigs/props and return control at a defined event.
- [ ] Feet match actual displacement and grounded contact on supported surfaces; no sliding or floating.
- [ ] Both hands remain on the intended grips, except for deliberately authored releases.
- [ ] Attack reach, active hit windows, and defensive windows remain consistent across visual variants and rendering frame rates.
- [ ] Slow motion, impact freeze, pause/resume, and reset do not skip contacts, duplicate events, or strand a pose.
- [ ] No fresh player action occurs during perfect-defense emphasis; its existing animation continues slowly.
- [ ] Shared enemy assets are retargeted cleanly, with independent variant selection and animation phases.
- [ ] The concealed black eye slit, fitted armor silhouette, bat heraldry, and illustrated style survive animation poses.
- [ ] Exported assets, blending, secondary motion, and effects meet a measured browser performance budget.

## 16. Production sequence and unresolved decisions

Current sequence: complete systems/content using placeholders first; follow CODING_PLAN.md for the full order. During the final animation phase:

1. Confirm human proportions, rig, helmet, grip/carry, and asset workflow.
2. Polish and review a representative player movement/action sample against PLAYER_MOVEMENT_SPEC.md.
3. Resolve missing attack directions and produce the full light/heavy library and transitions.
4. Complete directional defenses/evasions, riposte, reactions/deaths, and enemy retargeting/variation.
5. Produce all five paired finishers and secondary motion.
6. Recheck contacts, timings, camera, performance, and gameplay after integrating final clips.

Still to decide before locking production:

- [ ] Four additional light-cut paths and the full 12-direction visual chart.
- [ ] Exact differences between A/B executions and their allowed chain positions.
- [ ] Final carry pose, one- or two-handed running grip, and whether an optional shoulder-rest idle is wanted.
- [ ] Final character/rig/animation asset source and the permitted retargeting workflow.
- [ ] Required directional clip counts versus procedural/blended coverage on the chosen rig.
- [ ] Exact retreat activation/re-engagement and successful-dodge focus arbitration, including rolls.
- [ ] Dashing-riposte obstacle solution, distance handling, protection/interruption, and moving/dead-source edge cases.
- [ ] Guard-break freeze duration, input handling, stacked events, and whether the player uses the same flash/freeze treatment.
- [ ] Finisher thresholds, animation compatibility, durations, selection, tight-space behavior, and source of the choreographed opening attack.
- [ ] Authored death versus ragdoll coverage, sever compatibility, and corpse/prop cleanup rules.
- [ ] Reference hardware, frame-rate target, animation/secondary-motion budget, and visual-quality acceptance sample.

There is deliberately no claimed grand total: 30 light/heavy executions and ten principal finisher tracks are firm minimums, while directional families, blends, shared enemy clips, reaction alternatives, and procedural motion still need a production breakdown. Count actual exported assets after those decisions, not every contextual row as a separate clip.

## 17. Video reference — Synty Sword Combat trailer

Reviewed 2026-11-18. Source: [ANIMATION Sword Combat (Trailer), Synty Studios](https://www.youtube.com/watch?v=5YKHq8vAQ50), approximately 66 seconds. The creator's [product page](https://syntystore.com/products/animation-sword-combat) provides package context; the motion descriptions below come from visual inspection of the trailer, not a reconstruction from its asset names.

### Review coverage and limits

The review uses timestamped video frames at quarter-second intervals from 0:00 through 0:59.75, with larger individual frames inspected for grip and pose detail. YouTube's final storyboard frames verify the remaining fade/logo/black ending. Seeking stalled at points near the end, so those ending frames were checked separately. Times below are approximate locating ranges, not measured clip lengths or exact hit-frame boundaries.

The trailer shows several demonstrations at once and cuts between camera angles. This catalog describes each visible motion family, its meaningful variations, and its transitions. It cannot identify every exported asset, hidden angle, finger key, or sub-frame contact. Although the creator describes a 105-animation package, this short trailer does not expose 105 individually named clips. Do not treat the observations as a verified full package manifest.

**Observed** means visible pose or movement. **Application** means a proposed lesson for our game. Neither means an animation has been imported, implemented, or approved as a new mechanic. No audio timing analysis was performed.

### A. Chronological breakdown

#### [0:00–0:06.5](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=0s) — Intro branding

A logo fades into and out of a black background. There is no character movement to add to the production inventory. This is trailer presentation, not an in-game character introduction requirement.

#### [0:06.5–0:08.5](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=6s) — Opponents establish their positions

An elevated dungeon view establishes the sword-wielding hunter and armored skeletal opponent. Their bodies remain oriented into the encounter, with weapons carried below the head and enough space between them for a readable exchange. Small readiness and approach adjustments establish the fight before the close shots.

**Application:** LOC-02, EN-01/02/03. Even a waiting fighter should look engaged through stance and weapon position. The shot alone does not demonstrate a surrounding system or group AI.

#### [0:08.5–0:10.75](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=8s) — Ready stance, short weapon preparation, and first exchange

The camera moves closer. The hunter holds the sword in one hand with the other arm available for balance; the opponent carries the glowing weapon low across its front. Knees remain flexed, feet offset, and the chest aimed toward the opponent. The hunter raises the blade across the front into a higher line, then lowers it through a cutting/guard-return motion. The opponent extends and turns its weapon side as the exchange develops.

The body participates: shoulders rotate, elbows change their distance from the torso, and weight moves between the feet. The sword does not simply pivot around an immobile wrist. The end of a motion remains connected to the next ready position.

**Application:** LIGHT families, AT-05/06/07, LOC-02. Adapt the whole-body coordination to our two-handed longsword rather than copying the hunter's one-handed grip.

#### [0:10.75–0:12.75](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=10s) — High attack preparation and defensive interception

The opponent lifts its weapon above/alongside the head, widening its stance and turning the upper body before driving the blade downward/across the engagement. The hunter brings the sword up toward head height to meet the high line. The defender's arms, shoulders, and torso brace together. The opponent's weapon travels beyond its high starting position into a lower follow-through, then returns toward another raised preparation.

A subsequent close shot emphasizes the attacker's weapon near shoulder/head height. The camera edit makes the loaded pose and weapon silhouette especially legible. It does not establish exact parry windows or prove that a game input triggered a parry.

**Application:** HEAVY-OVERHEAD, DEF-05/07/09/10, DEF-13. Build distinct loading, interception, recoil, and recovery phases; avoid treating a static high guard as the entire animation.

#### [0:12.75–0:14.25](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=12s) — Low body adjustment against another high attack

The hunter lowers and shifts the torso while the opponent holds/reloads its weapon high. The hunter's knees bend and the upper body moves off the previous line; the sword stays connected to the moving arm and torso. The opponent continues through a large upper-body preparation rather than snapping straight into contact.

**Application:** EVA entry and recovery coverage, high/low defensive variation, and attack commitment. The edited exchange reads as an evasive/defensive adjustment, but it does not prove an invulnerability window, perfect-dodge reward, or dodge-to-focus rule.

#### [0:14.25–0:16.25](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=14s) — Broad attack, answering cut, and recoil

A wider shot shows the opponent raising its weapon and bringing it across/down, while the hunter answers with a large body-level sword motion. The hunter steps and rotates through the cut, extending the weapon arm and carrying the blade beyond the opponent's near side. As the strike completes, the opponent's chest and head move backward rather than remaining rigid. The hunter's blade passes into a lower finishing position while the feet stabilize underneath.

**Application:** wide light/heavy paths, AT-06/07, HIT-01/02. The victim reaction must accompany the attacker's contact: a convincing cut needs both halves of the exchange.

#### [0:16.25–0:18.25](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=16s) — Straight thrust/extension and sustained victim reaction

The hunter extends the sword into the opponent's upper-torso line. In close view, the blade remains comparatively straight between the weapon hand and the contact area, instead of drawing a broad slash arc. The opponent's shoulders and head move, and the upper body turns/recoils while the hunter holds the extended line briefly. The free arm helps balance the attacker's forward-facing posture.

**Application:** a reference for point alignment and paired contact in RIP-08/09 or a compatible finisher beat. A sustained contact pose can make a stab readable. This does not add ordinary thrust controls to J/K, establish a guaranteed dash, or identify the sequence as one of our five finishers.

#### [0:18.25–0:21.5](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=18s) — Follow-up cut, collapse, and return to a low carry

In the wider side view, the hunter moves the sword through further finishing motion, including a raised preparation and a downward/across-body follow-through. The opponent loses its upright stance, folds down, and settles onto the floor. The hunter remains balanced, rises out of the lower attacking posture, and returns the sword to a lower, relaxed carry near the body.

The sequence has a complete ending: the victim reaches a settled body pose, while the surviving actor visibly exits attack commitment. The actor does not remain frozen in the strike's final pose.

**Application:** HIT-10/12, AT-07, and finisher recovery standards. Reference the transition from a forceful action into controlled stillness. No clearly verified dismemberment or decapitation is shown here.

#### [0:21.75–0:24.25](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=21s) — Traveling aerial sword attack and low landing

A single yellow mannequin begins standing, compresses through the legs, and launches across the demonstration floor. Its body rises, changes orientation in the air, and travels forward while the sword moves with the action. The descent leads into a very low landing: one leg extends away, the other bends deeply, the torso drops, and the free hand comes close to the ground. The sword remains stretched out from the body rather than disappearing into the landing pose. The actor then pushes back upward into a standing carry.

Distinct instances visible in this short sequence are anticipation, takeoff, airborne travel/rotation, descending weapon motion, landing compression, and stand recovery.

**Application:** landing compression, support-leg drive, balance, and recovery are useful references. The aerial attack itself is outside the current grounded/no-jump player design. It must not quietly become our dashing riposte.

#### [0:24.25–0:27.5](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=24s) — Shorter sword attacks and return-to-idle examples

Three mannequins demonstrate attacks with staggered timing. The front actor uses a wide stance, turns through a fast cutting motion, and finishes with the weapon across the front before lowering it. Another execution extends the sword forward along a more direct line, with the arm and shoulder following the point. A later actor loads the weapon higher and drives a stronger high-to-low motion before recovering.

The visible contrast is between compact/direct actions and larger loading/follow-through, not merely a different sword color. Free arms move for balance in the one-handed examples. The hips and knees participate, while the return poses consistently bring the actor back to a usable ready/carry state.

**Application:** LIGHT A/B variants, HEAVY loading, AT-05/07, RIP impact alignment. Reuse principles of weight transfer and recovery. The trailer's group label combines light/heavy examples; it does not identify the exact exported file for every actor.

#### [0:27.5–0:30.0](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=27s) — Higher, two-handed loading and linked cuts

A multi-actor lineup demonstrates larger attacks. In the overhead poses, both hands visibly support the hilt above/near the head. Elbows bend, the chest turns, and the stance changes under the weapon. The blade then descends or sweeps across the front into a lower finishing line. Following actions reload from shoulder-side positions rather than always restarting from a neutral sword-down pose.

The repeated lifted-knee/stepping and wide-foot poses help transfer force into the cut. The different actors reach different preparation and recovery positions at different times, making variant silhouettes easy to compare.

**Application:** HEAVY-OVERHEAD/LEFT/RIGHT, full-body light-chain links, and AT-06. This is especially relevant to the desired two-handed knight: make the second hand a working grip and make the hips/feet support the high sword position.

#### [0:30.0–0:33.5](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=30s) — Continued combo phases, high-side loads, and rotational variation

The lineup continues into further linked actions. Visible positions include a blade raised upright above the head, a high side/shoulder load with both hands near the face, a cross-body cutting follow-through, and a lowered recovery. Some actors continue attacking while others have already settled. A more expansive execution turns the body and briefly lifts a leg/changes balance before folding into its finishing cut.

The important distinction is between the weapon's path and the actor's body mechanics: the torso coils before the blade accelerates, then unwinds as the feet reposition. Recovery returns the weapon to a coherent stance instead of reversing the swing mechanically back along the same route.

**Application:** compare A/B execution variety and compatible combo handoffs. Do not copy a rotating or airborne embellishment if it undermines our grounded swordplay. Multiple mannequin demonstrations do not establish a playable combo buffer or cancellation system.

#### [0:34.5–0:36.5](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=34s) — Flourish-like handling and committed forward extension

Two actors demonstrate contrasting motions. One brings the sword through a handling/flourish-like rotation, raising the weapon around the head/shoulder line and then returning it. The other takes a deeper forward stance and sends the sword outward along a more direct attacking line, with the free arm extending for counterbalance and the front knee taking the weight. The torso follows the advance, then the actor withdraws to a lower ready position.

**Application:** the direct forward extension and planted finish can inform RIP-07/08. The flourish can inform sword control and grip continuity, but flourishes are not a required new combat mechanic. Keep efficient functional motion for the disciplined knight unless an expressive idle is separately chosen.

#### [0:36.75–0:38.5](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=36s) — Multi-direction guard/interception lineup

Several mannequins hold and move through distinct defensive lines, with a neutral/lower-carry pose available for comparison. Clearly visible examples include a sword held across the chest, a higher horizontal/diagonal blade near the face, and raised side guards with the hands near one shoulder. Many of these grips use both hands. The feet are spread and the knees soften so the guard is supported from the ground.

Short motions take the hands and blade away from a settled guard and then return them, reading as interception/recoil/recovery variants. The upper body turns with the guard rather than treating every incoming direction as the same front-facing pose.

**Application:** DEF-01/02/05/06/07/08/10/13. Build a family of defensible contact positions with transitions between them. A lineup of poses alone does not prove all-angle blocking or a guard-meter mechanic.

#### [0:38.75–0:40.25](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=38s) — Compact directional hit reactions

The lineup changes to reactions. One actor folds forward through the torso and drops the head/shoulders; another moves the chest backward; another tilts sideways with the weapon arm displaced. These actions primarily disturb upper-body balance while the feet remain near the original stance. Each actor then returns toward upright readiness.

**Application:** HIT-01/04/06/08. Use different impact directions. A single identical backward jerk for every contact would lose this variety.

#### [0:40.25–0:42.0](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=40s) — Larger torso recoil and balance loss

The next reaction set has stronger chest/head displacement. One figure bends sharply forward, another arches or twists back, and another pitches sideways while its sword arm follows the loss of balance. Knees flex and the recovery takes the actor through a more compromised posture before standing again.

**Application:** HIT-02/04/08 and a reference for DEF-15. These are visible reactions, not proof of a stun duration, armor penetration rule, or actual defense depletion.

#### [0:42.0–0:43.75](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=42s) — Additional directional stagger/recovery variants

The actors repeat and vary impacts with different body orientations: sideways lean, forward hinge, and recoil with the sword pulled away from the original guard. The torso is not simply translated as one rigid object; head, chest, hips, and arms reach different offsets. The poses then settle toward the same general grounded stance.

**Application:** enemy reaction alternatives and player high/side hit coverage. Keep legal recovery timing consistent when the visual reaction changes.

#### [0:44.0–0:46.75](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=44s) — Knockdown, grounded hold, and get-up

One mannequin drops to the floor while another remains upright as a visual comparison. The falling actor reaches a side/back grounded position with bent legs and its sword arm away from the torso. It holds on the ground before starting to recover. The body lifts into a seated/partially upright posture, gathers the legs beneath it, passes through a crouched support position, and rises.

This sequence explicitly contains a recovery from the floor, distinguishing it from the later fatal-collapse lineup. The sword and hand still need a coherent position during ground contact and the push to stand.

**Application:** HIT-03/09, EVA-14, and sword-ground clearance. Build separate descent, grounded vulnerability, get-up, and usable-control-return phases where the combat rules require them.

#### [0:47.0–0:49.5](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=47s) — Multiple fatal collapse and settling directions

Several mannequins lose balance in different ways and remain down. Visible paths include a backward/sideward fall with the chest opening and legs leaving their planted stance, a forward fold that ends stretched along the floor, and a lower side collapse with bent limbs. The bodies reach different final orientations rather than all landing in a shared symmetrical pose. Arms and swords follow each body into the final settle.

**Application:** HIT-10/11/12/13. Death variety should come from contact direction, momentum, and body balance. The video does not establish a ragdoll implementation; these may be authored motions, so record the appearance without claiming a physics system.

#### [0:49.5–0:53.5](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=49s) — Idles, low carry, and short weapon-handling variations

Four actors show upright, planted stances with different sword-hand positions. Some hold the blade lower beside the thigh; others lift or turn it during a short readying/handling motion. The foreground actor passes the weapon across its front and raises the arm toward shoulder/head height before returning to a lower position. Weight rests unevenly between the legs and shifts without turning the idle into a full walk.

The left hand may hang free or move toward the waist in the one-handed examples. The sword remains visibly held during the gestures. No clearly verified scabbard interaction is established from these views, so these notes do not label the motions as specific draw/sheath clips.

**Application:** LOC-01/02, carry-to-guard blending, and subtle idle variation. The low carry is a useful visual reference for the proposed running/walking carry, but this section does not demonstrate a sustained running cycle.

#### [0:53.5–0:54.75](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=53s) — Short directional evasive steps

Four actors make short, low directional weight shifts and steps. The knees compress first; the body moves laterally/back or forward along the demonstrated orientation; then the feet gather back into guard. The sword-bearing arm moves with the torso and stays clear of the legs. The body remains comparatively upright instead of completing a somersault.

**Application:** EVA-01/02/03/04/06. The key is a decisive push-off, clear travel direction, and planted recovery. The gallery's placements and camera angle are insufficient to verify an entire eight-direction asset set by filename.

#### [0:54.75–0:55.75](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=54s) — Low rolls in several directions

The actors lower their centers of mass, fold the torso, and transition onto the shoulder/back line. During the roll, feet lift, the body turns over, and the weapon travels around with the hand rather than staying fixed in space. The demonstrations return to standing readiness after the ground phase.

**Application:** EVA-07/08/09/10. Make the tuck and ground contact legible, then give the actor a believable standing exit. The video does not establish dodge invulnerability, the second-press rule, or perfect-dodge eligibility.

#### [0:56.0–0:57.25](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=56s) — More extended dive-to-roll variations

A further set begins with a more stretched, outward-reaching body pose before the actors rotate down onto the ground. The chest and arms project farther than in the compact step, followed by a tuck/rolling phase with lifted legs. The actors then gather back toward their feet and standing stance.

**Application:** reference the difference between a short step and an escape that commits the whole body. Keep our longer roll grounded and readable; a more acrobatic diving variant remains a choice, not an approved new dodge or jump ability.

#### [0:57.25–0:59.75](https://www.youtube.com/watch?v=5YKHq8vAQ50&t=57s) — Closing cinematic sword handling

The hunter returns in the dungeon. The sword sweeps outward, crosses the front of the body, and rises into another expressive handling/ready pose while the torso turns. The camera changes its framing and moves toward a low/upward view at the end. Clothing and the character's free arm continue to follow the body turns.

**Application:** reference coordinated sword/torso recovery and secondary cloth motion. Trailer cuts and low-angle hero shots should not replace our continuous automatic combat camera. Flourish and cinematic posing are optional expression, not required attack-chain steps.

#### Approximately 1:00–1:06 — Fade, logo, and black ending

The final storyboard frames show the scene fading out, then the logo and black frames. No additional character-animation family is visible in that ending. This portion was verified through the final storyboards rather than quarter-second playback captures.

### B. What this adds to the production checklist

These are reference annotations to existing requirements, not automatic scope additions.

| Existing inventory | Visible lesson to preserve | Adaptation for our game |
| --- | --- | --- |
| LOC-01/02; sword carry | Idle includes uneven weight, small body movement, and meaningful weapon placement | Use the enclosed human knight and controlled demeanor; avoid a rigid mannequin idle |
| LIGHT/HEAVY; AT-05/06 | Load, step, rotate, cut, follow through, then recover; linked attacks inherit useful weapon positions | Preserve our large arcs, fixed action timing, fresh-press chain, and two-handed grip |
| DEF-05/06/08 | Different interception lines produce different whole-body guard shapes | Support all-angle defense without snapping the root or delaying mechanics for the camera |
| DEF-15/16/17; HIT-02 | Compromised posture can be shown through displaced blade, torso recoil, and balance recovery | Add our agreed contact flash/freeze and broken-meter treatment; they are not demonstrated as mechanics in the trailer |
| EVA-01–10 | Steps, compact rolls, and more extended escapes have visibly different commitment | Keep the initial step and follow-up roll rules; do not infer perfect timing or invulnerability from a showreel |
| RIP-03–10 | Forward extension, foot plant, aligned sword point, and a complete recovery sell an attack that closes space | Our guaranteed dashing riposte needs dedicated travel/contact logic and animation; the trailer does not prove that mechanic |
| HIT-01–12 | Front, back, and side reactions affect different body parts; knockdown/get-up differs from fatal collapse | Preserve distinct player/enemy reactions and the existing protection against unavoidable hit chains |
| EN-01/13 | Variant silhouettes and offset phases prevent identical-looking actors | Use independent choices and uneven surrounding behavior; never place enemies in the trailer's demonstration grid |
| Finisher families | Attacker and victim must visibly agree on contact and recovery | The staged dungeon kill is contact reference only; all five of our finisher choreographies still need production |
| CAM and secondary motion | Clothing, weapon, actor recovery, and framing support action readability | Keep our uninterrupted low third-person camera, fitted armor, mail/cloth clearance, and bounded browser cost |

### C. Specific animation direction to carry forward

1. **Give the feet a job.** A loaded cut needs a supporting leg, a direction of weight transfer, and a final stance. Treat the sword path and footwork as one action.
2. **Let the torso lead and follow.** Shoulders and hips turn into preparation, support the fast blade travel, then settle after the blade has passed. Do not solve the swing with wrists alone.
3. **Author the ending.** A low carry, braced guard, or balanced ready stance is part of the animation, not a hard cut back to idle.
4. **Keep contact reciprocal.** Show the defender bracing, redirecting, recoiling, losing balance, or collapsing at the correct point in the attacker's motion.
5. **Vary the mechanics of execution.** Stance, hand height, support foot, loading side, and recovery can differ even when an action serves the same gameplay role.
6. **Separate reaction severity.** A short flinch, a larger stagger, a recoverable floor knockdown, and death should remain visibly distinct.
7. **Use restrained secondary motion.** Free-arm balance, clothing lag, and weapon settling help the body feel connected. Our armor/mail must achieve the same coherence with a different silhouette.
8. **Adapt the reference instead of changing the game to match it.** Human anatomy, fully enclosed knight armor, grounded combat, the two-handed longsword, intentional controls, and the agreed camera remain the targets.

### D. Not established by this video

- Exact clip names/counts, skeleton hierarchy, joint limits, retargeting setup, or root-motion implementation.
- A complete 12-direction, two-executions-per-direction library for our light attacks.
- Sprint/retreat locomotion, loose surrounding AI, or independent enemy attack selection in a playable encounter.
- Our perfect-defense input lock, guaranteed dashing-riposte reach, or defense-meter rules.
- Our guard-break flash/freeze/bar shatter, five paired finishers, or production dismemberment system.
- Permission or technical readiness to import commercial animation assets. No purchase, download of the animation pack, or integration has been performed.

The reference supports an animation-quality conversation. It does not mark any final game animation as completed. Mechanics implementation separately resumed with the user's approval on 2026-11-18.

### Mechanics status after approval to continue — 2026-11-18

Adaptive surrounding/attack choices, successful-evasion focus, Shift-away retreat, routed guaranteed dashing counters, and guard-break emphasis now have mechanics implementations. Every production-animation checkbox remains unchecked: these changes use placeholder procedural characters and poses. The human-proportioned rig, polished animation sample, final carry, full attack library, and paired finisher clips remain production work. Earlier discussion/open-decision entries should be read alongside GAME_DESIGN.md for the concrete mechanics rules selected for this prototype.

### Enemy unblockable kick — 2026-11-18

The user clarified this change concerns enemy unblockables, not the player's K attack. The prototype now has a front push kick with boot-based contact and a shove/stagger reaction. The 24-light/six-heavy player sword requirement is preserved. Production kick animation remains unchecked, with the following coverage required:

- [ ] Ready guard into close-in spacing and a planted supporting leg.
- [ ] Visible weight transfer, raised knee, and sword withdrawn into guard, without a sword-cut windup.
- [ ] Committed forward boot extension toward the torso, with no late homing.
- [ ] Contact and miss variations leading into leg retraction and balance recovery.
- [ ] Player shove and directional stagger with collision-limited displacement, without a compulsory knockdown.
- [ ] Legal interruption by damage/defense break and transition from a perfectly avoided kick into the earned dashing counter.

The mechanics and a representative procedural pose are implemented; this does not mark the final human-rig kick asset complete.

Kick readability review: test the final human proportions and pose from the actual locked third-person view. In direct rear alignment, the present broad player placeholder can obscure the enemy's knee/boot despite the red cue. Ensure the final knee-load/support-leg silhouette remains legible in that case; do not judge it only from an unobstructed animation-editor side view.

### Quality direction approved — 2026-11-18

Believable human proportions with modest armor exaggeration; flowing, strong, calculated motion; swift controlled dodges; an agile longsword; low backward-angled running carry; clean ink outlines and broad painted shading with restrained texture. Ghost of Tsushima informs anatomy/motion; Chivalry 2 informs armor. Occasional authored backspin strikes are approved within existing attack timings and commitment, with no camera spin or extra active contacts. Add backspin entry/pivot/cut/recovery and connected carry-to-grip review to the representative sample. Production checkboxes remain pending visual acceptance of the rig and animation quality.

### Native character-quality sample implemented — 2026-11-18

The player/enemies now use a 55-bone weighted human-proportioned sample with fitted armor, articulated hands/feet, spine and forearm twist, low running carry and blended regripping, and representative connected poses. Character & animation study (`/?study`) provides controlled inspection. An occasional heavy backspin is an authored visual variant with ordinary gameplay timing and reach. See CHARACTER_QUALITY.md for visual acceptance; production checkboxes remain pending that acceptance and final authored-clip work.

### Functional finisher mechanics — 2026-11-18

After explicit authorization to resume the mechanics slice, one Rising Cleave execution path now has deliberate F eligibility/prompt, safe alignment/space reservation, protected input lock, exact lethal timing, enemy hold/reposition/fresh-windup return, pause/reset, continuous camera, and temporary player/victim poses. Production FIN-01 and all animation-quality checkboxes remain unchecked. The other four choreographies, final gore/detachable-part assets, and authored clips remain later work. See CORE_COMBAT_AUDIT.md and DEVELOPMENT.md.

### All-five finisher mechanics and detachable parts — 2026-11-18

The authorized mechanics follow-up adds safe/compatible selection among all five executions; per-sequence event timelines; checked surround/outside-step paths; sword release; actual posed head/arm extraction; capped separation; bounded prop motion/lifetime/count/disposal; and full character restoration on reset. A practice preference selector supports inspection while retaining eligibility/space checks. Production animation checkboxes remain unchecked: these are temporary poses, not final clips, blood effects, or final sever-site/armor cleanup. See GAME_DESIGN.md, DEVELOPMENT.md and CORE_COMBAT_AUDIT.md.
