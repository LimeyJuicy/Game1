# Player movement and animation specification

**Latest scheduling decision — 2026-11-18:** core gameplay/combat mechanics first using existing practice/debug UI, test arena, and placeholder motion. Waves/rewards, weather, final UI, maps, and balance are deferred until after core mechanics and before final animation production/polish. Earlier conflicting sequencing is superseded by [CODING_PLAN.md](CODING_PLAN.md#updated-production-order--2026-11-18). Existing motion remains visually unaccepted; preserve its quality requirements for the final phase. This documentation update does not itself resume coding.

Discussion and authoring reference — 2026-11-18. Player only. Player-animation production remains deferred. After the discussion pause, the user separately authorized the core-mechanics audit and first finisher prototype; this motion reference does not itself authorize additional implementation. It records intended motion, not completed animations.

The current sample has not passed visual acceptance: the user reports awkward duck-like legs, insufficient pelvis/chest/head motion, and insufficient arm/shoulder swing. A skeleton and passing mechanics tests do not establish believable animation. Rework the player's movement quality before extending enemy animation or producing more variants.

Related sources: [animation coverage and IDs](animationslist.md), [game rules](GAME_DESIGN.md), [quality review](CHARACTER_QUALITY.md), [implementation status](DEVELOPMENT.md), [history](UPDATES.md).

## 1. How to use this document

For each action, author **entry → load → action/contact → follow-through → recovery/exit**. For locomotion, author the complete repeating support/swing cycle plus starts, stops, and turns. Decide which foot supports the body at each beat before posing the arms or sword.

Left/right describe the player's own sides. Blade direction is viewed in the player's target-facing plane, not screen coordinates. Camera movement must not redefine a cut or dodge. Forward/backward dodges are relative to the chosen movement/facing convention; preserve the actual selected world-space travel when focus changes.

Light 1–6 below map to inventory L01–L06, not six attacks currently implemented in the prototype. Current code has three light chain entries. The production request remains 12 directions with two executions each, plus three heavy directions with two executions each. L07/L08 are defined below; L09–L12 remain unresolved. This document does not silently invent those missing four paths or reduce the production count.

Choreography below is a proposed authoring baseline. Exact lead foot, stance, and execution variations must be fitted to the final rig and reviewed. Preserve established gameplay durations, active windows, damage, distances, and permitted cancels; do not lengthen an attack to accommodate a larger pose.

## 2. Shared whole-body rules

| Region | Required behavior | Failure to avoid |
| --- | --- | --- |
| Root / travel | Match actual collision-limited displacement and action commitment. | Actor glides while planted feet appear stationary relative to the body. |
| Feet / toes | Clear support and swing phases; heel/forefoot/toe articulation where appropriate; grounded pivots. | Flat rigid paddles, dragging toes, hovering, skating, or a foot twisting while locked to the floor. |
| Knees | Compress for weight acceptance, support the body, bend for clearance, extend before landing. | Permanent squat, backward bend, identical knee bend throughout the cycle. |
| Hips / pelvis | Translate over support, rotate, rise/fall, and tilt modestly with weight transfer. | Legs rotating beneath an immobile block or excessive side-to-side waddling. |
| Spine / chest | Distribute twist and flexion across the back; respond to pelvis and action forces. | All rotation concentrated at one waist hinge; chest frozen through movement. |
| Clavicles / shoulders | Reach, retract, and rotate with arm action; preserve anatomical spacing. | Arms hinged from fixed shoulder points or armor locking the shoulders. |
| Elbows / forearms | Bend naturally, rotate to maintain grip, follow coordinated shoulder motion. | Rigid elbows, stretched limbs, wrist-only sword swings. |
| Wrists / fingers | Maintain believable grips; release/regrip visibly when required. | Floating palms, weapon passing through hands, fist snapping open/closed. |
| Neck / head | Small independent motion and gaze stabilization; anticipate deliberate turns. | Helmet welded to the chest or exaggerated nodding with each step. |
| Armor / mail / cloth | Plates follow their anatomical region; flexible layers lag and settle. | Solid armor deforming like rubber, plate intersections, cloth driving the body. |

Powerful motion should read through coordinated feet, pelvis, chest, shoulders, and hands. Do not rotate every joint by the same amount at the same instant. Conversely, small timing offsets should not make the body look loose or uncoordinated. The knight remains controlled and forceful.

The head stays comparatively steady during straight travel. During intentional turns it may anticipate the new direction, followed by chest, pelvis, and repositioned feet. This is an animation direction, not permission for instant root or camera rotation.

## 3. Standing and readiness — LOC-01/02

| Instance | Feet, legs, and pelvis | Chest, arms, head, and sword |
| --- | --- | --- |
| Relaxed alert idle | Comfortable staggered feet, unlocked knees, subtle uneven weight and occasional restrained redistribution. | Quiet breathing through torso/shoulders; low sword carry; free hand relaxed; helmet attentive without constant scanning. |
| Combat ready | Stable narrower fighting stance rather than an exaggerated squat; weight available for either-direction movement. | Two-handed guard, soft elbows, slight chest angle, gaze toward focus; blade settles naturally. |
| Idle → ready | Shift weight and reposition a foot if needed; pelvis turns under the chest. | Head acknowledges threat, sword rises, support hand reaches and closes on grip continuously. |
| Ready → low carry | Release tension and settle stance without dropping posture. | Support hand releases visibly; sword lowers along a clear path; shoulders relax. |
| Inactivity / passive healing | Use the appropriate ordinary idle. | No invented healing gesture, potion, or magical breathing animation; health regeneration alone does not create a new action. |

## 4. Walking cycle — LOC-03

Follow one foot from contact to its next contact. The opposite leg is in its complementary phase. These phases are not evenly timed sine-wave poses.

| Beat | Support leg / foot | Pelvis and torso | Arms / head |
| --- | --- | --- | --- |
| Contact | Foot reaches forward, usually heel first; knee approaches extension without locking. | Body arrives smoothly rather than teleporting over the new foot. | Opposite arm is forward; head remains controlled. |
| Weight acceptance | Knee softens; foot lowers; load transfers onto the leg. | Pelvis shifts toward support and lowers slightly; torso absorbs the landing. | Shoulders and arms continue through the transfer rather than pausing. |
| Mid-support / passing | Body advances over planted foot; support leg lengthens; other foot clears ground with bent knee. | Pelvis rises modestly and rotates with advancing leg; chest responds with restrained counterrotation. | Arms pass near their middle position; elbows remain relaxed. |
| Late support | Supporting heel rises as body travels ahead. | Weight progresses toward the next support; avoid holding hips behind the feet. | Shoulder motion stays connected to trunk rotation. |
| Push-off / toe-off | Forefoot/toes provide final contact; ankle extends; knee begins folding into swing. | Body progresses forward; no exaggerated upward launch. | Arms reverse smoothly near the ends of their arcs. |
| Early / middle swing | Knee bends for clearance; thigh advances; ankle positions toes clear of floor. | Other leg now supports the body. | Opposite arm advances; head filters torso movement. |
| Late swing | Knee extends and foot prepares for contact; leg decelerates before landing. | Pelvis and chest prepare the next transfer. | Arm approaches forward extent without a rigid stop. |

Use a natural step width and modest foot turnout, not a broad outward-pointing duck stance. Do not force perfectly parallel feet either. Check hip/knee/ankle alignment from the front, and full clearance/support from the side. The planted foot should hold its world position until its intended roll, pivot, or lift.

Sword carry is asymmetric: sword beside the body, point directed outward and backward with floor clearance. During walking and sprinting, the back of the sword hand faces the sky and the palm faces down. Keep the grip fixed while the wrist/forearm orient the blade; the weapon arm remains bent and swings with restrained but visible motion. The free arm participates naturally. Do not freeze the chest and both shoulders to hold the sword still.

## 5. Running, sprinting, and movement directions — LOC-04–10

| Instance | Lower body | Upper body and weapon |
| --- | --- | --- |
| Faster travel / jog, if needed | Transition into a distinct running rhythm rather than speeding up the walking loop indefinitely. | Coordinated arm action and modest forward inclination; preserve carry clearance. |
| Sprint forward | Stronger support-leg drive, faster recovery of swing leg, greater knee travel; feet land beneath a believable moving body. An airborne phase may occur in a true run. | Lean comes from whole-body alignment rather than folding only the waist. Shoulder/chest rotation increases appropriately; free elbow bends more; sword arm remains controlled. |
| Combat advance | Shorter measured steps with forward weight transfer; avoid shuffling both feet together. | Maintain target-facing chest/head and usable two-handed sword guard. |
| Combat retreat | Reach a foot backward, accept weight, then reposition the other; controlled limited travel. | Chest remains available to the opponent; do not use a reversed forward-walk clip. |
| Strafe left | Left foot opens space, right follows; adjust order for current support phase. Avoid habitual crossed feet. | Head/chest remain oriented toward focus; pelvis accommodates side travel; hands remain in guard. |
| Strafe right | Right foot opens space, left follows, adapted to support phase. | Same controlled guard with anatomically appropriate shoulder adjustment. |
| Forward-left / forward-right | Blend advancing support with lateral placement; pelvis follows actual travel without pulling chest fully away from target. | Guard remains usable; avoid a forward walk simply rotated under a fixed torso. |
| Back-left / back-right | Diagonal retreat with clear support and limited crossing. | Watch focus, keep balance, avoid leaning backward beyond support. |
| Guarded travel in all eight directions | Use appropriate directional stepping; shorten stride for stable balance. | Guarded shoulder/elbow posture replaces free arm swing, but breathing, pelvis/chest coordination, and head stabilization remain. |

Walk and sprint must change cadence and stride with actual speed, including collision-limited speed. Do not play a full sprint while the root barely moves.

## 6. Starts, stops, turns, and restrictions — LOC-11–25

| Instance | Required whole-body sequence |
| --- | --- |
| Start walking | Shift weight off the first moving foot, initiate body travel, then take the first step. Shoulders and carry join smoothly. |
| Accelerate to sprint | Build forward inclination, drive, cadence, and stride across successive support contacts; no immediate maximum stride from rest. |
| Slow sprint to walk | Reduce drive and inclination, shorten stride, transfer into walking support rhythm. |
| Stop walking | Finish a useful support step, absorb remaining travel through ankle/knee/hip, bring other foot into a stable stance. |
| Stop sprinting | Deceleration steps and deeper controlled compression arrest momentum; chest and sword settle after the legs brake. A brief intentional skid must still show traction and end in a plant. |
| Walking curve left/right | Head anticipates; chest/pelvis turn gradually; inner/outer steps adjust length and placement. |
| Sprint curve left/right | Whole-body inward bank with repositioned support; limited turn rate. Do not rotate forward-facing feet independently of their supports. |
| Sharp reversal | Brake, place a turning foot, rotate through hips/chest with safe pivots or replacement steps, then accelerate. |
| Turn in place | Small foot adjustments for small angles; multiple repositioned contacts for large angles. No swivel on two glued feet. |
| Acquire/change target | Head/chest acknowledge first, then hips/feet establish the new guard. Respect the currently committed attack trajectory. |
| Retreat → disengaged sprint | Move away, turn out of guarded travel with suitable steps, release support-hand grip, lower sword, accelerate. |
| Run → engagement | Brake into fighting distance, turn with footwork, bring support hand onto sword, settle into ready guard or permitted attack entry. |
| Wall/body stops travel | Shorten the next step and settle using actual displacement; do not keep pumping full strides into the obstruction. |
| Supported slope/uneven surface | Adapt foot height/angle, knees and pelvis within anatomical reach; conditional on supported terrain. |
| Left/right support variants | Starts, stops, and pivots must work from either support foot; choose/blend a compatible entry rather than reset the gait phase visibly. |

## 7. Light swings 1–6 — L01–L06

All strikes use two-handed grip, a deep blade load with the tip behind the player, approximately 130–180 degrees of readable travel, fast committed blade motion, and controlled follow-through. Preserve timing: make the load slower and the cut faster, not the overall action longer. Authored attack footwork is allowed; player-controlled movement/steering is locked during commitment. A small target-closing step must respect obstacles and reach.

The following stance choices are proposals, not mandatory historical fencing forms. Fit them to the actual previous pose and hand dominance.

| Swing | Entry / load | Cut / weight transfer | Follow-through / exit |
| --- | --- | --- | --- |
| Light 1: upper-left → lower-right | Weight gathers on left/rear support; hands rise toward left shoulder; chest and pelvis coil modestly; blade tip trails behind. Knees soften; head continues watching target. | Support leg drives a short step/transfer. Pelvis turns, chest/shoulders carry the hands diagonally across the target. Elbows extend comfortably without locking; wrists preserve edge line. | Hands finish low-right and blade passes beyond contact. Receiving knee absorbs weight; rear foot adjusts/pivots. Recover from this actual low-right position. |
| Light 2: upper-right → lower-left | Gather on right/rear support; hands load near right shoulder; shoulders and pelvis prepare the opposite rotation. | Drive/step toward support on the other side; connected hips/chest/arms send the blade down-left. Head stays comparatively stable. | Finish low-left; decelerate through torso and legs, then recover or link a compatible rising cut. Do not require a mirrored duplicate of Light 1 as its only production variant. |
| Light 3: lower-left → upper-right | Lower hands to left, blade extending behind/low with floor clearance; compress knees slightly and coil through pelvis/chest. | Legs extend moderately as hips/chest rotate; hands carry the blade upward-right. Shoulder blades move with arm elevation; no shrug-driven wrist flick. | Blade finishes high-right; retain soft elbows and grounded balance. Settle raised shoulders and transfer into guard or another useful loading position. |
| Light 4: lower-right → upper-left | Load low-right with compact knee/hip compression and a clear support leg. | Opposite diagonal drive and rotation lift the cut across target; hands remain connected to sword and shoulders. | Finish high-left, dissipate rotation, regain a stable stance. No backward arch to manufacture reach. |
| Light 5: left → right horizontal | Hands and sword load to left around torso height; pelvis/chest coil, supporting foot established, blade deep behind. | Supporting leg and pelvis initiate a broad lateral sweep; chest follows and arms carry the blade through a readable level band. Use a step or pivot appropriate to distance. | Blade continues right beyond contact; torso/legs arrest rotation. Hands retain usable reach rather than wrapping unnaturally around the back. |
| Light 6: right → left horizontal | Load right with balanced feet and modest torso twist. | Reverse lateral rotation/transfer, with coordinated shoulders, elbow bend, and forearm rotation through the two-handed grip. | Finish left, absorb momentum through receiving leg and torso, then settle or enter the next compatible action. |

### Additional required light paths

- **L07 high → low vertical:** raise hands above/in front of the head with anatomical shoulder motion and a rearward blade load; supporting legs drive the descending cut; hips/chest incline modestly; finish low with controlled knees and blade clearance. Do not collapse at the waist.
- **L08 low → high vertical:** load low with bent knees and blade clearance; coordinated leg extension and shoulders lift the blade in front; end high without jumping, overextending the back, or striking the helmet.
- **L09–L12:** unresolved direction-chart slots. Require a design decision before assigning production clips.
- **A/B executions for every approved direction:** genuinely vary lead/support foot, loading pose, step/pivot, hand route, or recovery while preserving the directional identity and gameplay envelope. Mirroring alone is insufficient.

## 8. Heavy attacks and occasional backspin

| Action | Load | Execution | Recovery |
| --- | --- | --- | --- |
| Heavy overhead | Broader stable support, deeper knee/hip compression, hands rise with shoulders; blade loads behind head without intersection. | Legs and torso drive into a powerful downward cut; modest forward body transfer, clear lead-foot support, coordinated hands. | Knees absorb, sword clears legs/floor, chest returns from follow-through without snapping upright. |
| Heavy from left | More pronounced left-side coil and weight preparation than light horizontal; shoulders remain anatomical. | Large left-to-right sweep driven by support and hip/chest rotation; arms transmit force. | Stronger rotation arrest and deliberate guard recovery; no automatic extra step beyond permitted travel. |
| Heavy from right | Distinct opposite-side stance and loading route. | Powerful right-to-left sweep with correct supports and continuous blade grip. | Finish and settle on the actual receiving leg; keep the ending different where useful. |
| Occasional backspin into cut | Begin from a compatible stance; initiate turn with planted/repositioned feet and pelvis, not a root swivel. Head reacquires target as the turn completes. | Compact sword placement during turn; reconnect into the ordinary committed cut before contact. Supporting feet pivot or replace naturally; no spinning on glued soles. | Arrest rotation and recover into guard. Cancel/interruption must preserve the visible starting pose and blend out safely. |

Two authored executions per heavy direction remain required. Backspin is occasional and must fit ordinary attack timing, reach, damage, and contact rules. It is not camera rotation, an extra hit, or permission for uncontrolled full-body spinning.

## 9. Attack connections and contact outcomes — AT / LIGHT / HEAVY

| Instance | Required motion |
| --- | --- |
| First strike from ready or low carry | Capture actual starting pose; support hand joins before two-handed force; route blade continuously into load. |
| Walk/run/sprint → attack | Brake actual travel with footwork, settle support, then cut. Increase braking effort with speed; do not instantly freeze or let a full swing slide forward. |
| Strafe/retreat → attack | Arrest lateral/backward momentum first; use appropriate foot placement before forward transfer. |
| Small attack-closing step | Drive from support, move body with stepping foot, land before/around the intended force beat; shorten step if obstructed. |
| Light → next light | Inherit previous blade, hand, torso, and foot positions. A low-right finish can feed a suitable low-right load without passing through neutral. |
| Chain end | Stronger transfer/follow-through, then established recovery; no extra automatic strike. Each strike still needs a fresh input. |
| No follow-up input / combo expires | Decelerate and return to ready, carrying the actual ending pose through recovery. |
| Hit | Brief physical response at contact, then coherent travel/recovery; no excessive blade penetration or arbitrary hand separation. |
| Blocked by enemy | Blade/arms respond to resistance; elbows and shoulders absorb, feet support. Respect existing action/recovery rules. |
| Enemy defense breaks | Continue the player's coherent follow-through while the victim loses guard. Contact flash/freeze emphasizes the event; it does not replace body motion. |
| Miss | Follow through without a false impact recoil; decelerate using torso, shoulders, arms, and planted legs. |
| Permitted cancel | Blend from current pose into defense/evasion, including partly loaded hips and feet; never reset to neutral first. |
| Forced interruption | Incoming reaction overrides the action from its actual pose and momentum. No final-frame snap or phantom continued sword contact. |
| Focus changes mid-commitment | Eyes/head may acknowledge only as appropriate; do not redirect the committed cut to a new target. |

## 10. Blocking and parrying — DEF-01–19

| Instance | Whole-body direction |
| --- | --- |
| Raise guard | Weight settles between available supports; sword rises via shoulders/elbows; support hand grips continuously; head remains attentive. |
| Hold guard | Soft knees/elbows, restrained breathing and weight shifts. A held pose must remain alive without distracting swaying. |
| Lower guard | Ease shoulder tension and sword height; release support hand only when returning to one-handed carry. |
| Front/high/low/left/right interception | Route sword to the incoming line with shoulder/forearm motion; chest/pelvis participate within balance. Provide real contact coverage rather than one universal static pose. |
| Side/rear block | Rapid interception plus anatomically possible chest turn and foot adjustment. Omnidirectional protection must remain mechanically immediate; do not wait for camera/root alignment. No neck twisting through impossible angles. |
| Block impact | Blade/arms yield slightly, elbows/shoulders absorb, knees/pelvis brace; recover toward a usable guard. |
| Strong block impact | Greater compression/recoil and, if displacement allows, a balance-recovery step; no unapproved gameplay knockback. |
| Repeated blocks / changing attackers | Transition from the last interception to the next; vary direction and support, not a repeated neutral-pose reset. |
| Fresh parry attempt | Small deliberate interception, not a huge attack swing; hands and shoulders redirect while legs maintain balance. |
| Successful parry | Show contact, controlled deflection, torso/support adjustment, and recovery with sword ready to act. |
| Perfect parry | Same credible contact mechanics with especially clear silhouette. Slow motion emphasizes existing motion; no extra controllable attack during emphasis. |
| Early/failed attempt | Complete the attempt into held guard or recovery as allowed; no automatic repeated parry. |
| Player is parried | Sword knocked off intended line; wrists/elbows/shoulders yield; chest/feet regain balance before recovery completes. |
| Low defense | Optional restrained strain in stance/contact absorption, without new movement penalties or hidden timing changes. |
| Player defense breaks | Hands/blade displaced, torso recoils, knees/feet recover support; visibly exposed for the existing stun duration. |
| Break recovery | Re-establish support and bring sword back to guard continuously. Punishment hits must not visually reset the entire break sequence/timer. |
| Unblockable hits attempted guard | Enter actual damage/shove reaction; never show a successful catch or parry. |

## 11. Dodge in every direction — EVA-01–06 / 11 / 13–15

Shared shape: brief load through the supporting leg → decisive push → low, controlled displacement → receiving-foot plant → recovery step/guard. Torso inclination supports actual travel; head stays aware of the threat. Keep sword compact and clear of body/ground. A dodge is deliberate footwork, not a standing body sliding horizontally.

| Direction | Feet / pelvis | Torso / arms / head |
| --- | --- | --- |
| Forward | Rear support drives a short advancing evasive step; leading foot receives; other foot restores stance. | Compact forward alignment, guarded sword, head remains aware; not automatically a deep duck or shoulder charge. |
| Backward | Front support pushes away; rear foot reaches and receives, front follows to guard. | Hips travel back while chest stays available; avoid reclining like falling into a chair. |
| Left | Right support drives; left foot opens/receives; right follows without habitual crossing. | Slight travel-aligned inclination, compact sword, shoulders/head remain responsive to attacker. |
| Right | Left support drives; right foot opens/receives; left follows. | Corresponding controlled inclination and weapon clearance. |
| Forward-left | Rear/right-biased support drives diagonal step; left/front receiving placement, phase-adapted. | Mix forward and lateral alignment; preserve target awareness without locking pelvis square. |
| Forward-right | Rear/left-biased support drives; right/front reception. | Opposite diagonal alignment and compact guarded arms. |
| Back-left | Front/right support drives away-left; left/rear reception, then stance restoration. | Keep head/chest available to threat while lower body carries retreat. |
| Back-right | Front/left support drives away-right; right/rear reception. | Corresponding controlled retreat, no crossed-leg stumble. |

Support choices adapt to the current foot phase; do not teleport feet to satisfy a fixed left/right rule. No-direction dodge uses the agreed backward behavior. Starting from movement or a permitted attack cancel must inherit actual momentum and pose.

Perfect dodge uses a readable moment from the same avoidance: blade narrowly passes, body balanced, feet still working. Slow motion slows the continuing defensive action and locks input; it must not freeze a floating pose or permit a mid-dodge strike. Recovery then exposes the earned riposte opportunity.

An actual successful dodge can change focus to its source. Preserve the selected dodge travel and finish its support contacts while turning toward that source. Empty-space dodges do not invent a new target. Walls/bodies shorten travel; adapt reception to actual displacement instead of skating to the nominal endpoint.

## 12. Rolls in every direction — EVA-07–10 / 12–14

Second-press roll continues the original dodge direction under current rules. Do not instantly reset feet/body before rolling. Use a compact tuck, staged body-ground contacts, safe sword placement, leg unfolding, planted recovery, and continuous rise into guard. The rigid sword must stay outside the body and floor.

| Direction | Authoring direction |
| --- | --- |
| Forward | Lower with the receiving leg, enter a diagonal shoulder/back roll rather than rolling directly over helmet/neck, bring feet under pelvis, rise. |
| Backward | Compress from backward travel, round through back/shoulder with protected head, place feet and rise without an instant upright snap. |
| Left | Lower into leftward shoulder/side travel, turn/tuck body to keep head and sword clear, unfold into left-side reception. |
| Right | Equivalent rightward travel with appropriate weapon-hand clearance; cannot be blindly mirrored if that places blade under body. |
| Forward-left / forward-right | Orient shoulder-roll path diagonally; use actual diagonal contacts and matching exit feet, not a front-roll clip slid sideways. |
| Back-left / back-right | Orient backward shoulder/back path diagonally, then unfold over correct receiving support. |

If perfect-defense slow motion or the step has already completed, any allowed follow-up roll must start from the current recovery pose. It forfeits the counter under existing rules. Walls and vulnerable-phase hits need compatible interruption/shortened-travel poses. Exact armored roll choreography needs visual review for helmet, shoulder plate, mail, and sword clearance.

## 13. Dashing riposte — RIP-01–12

1. **Entry after perfect defense:** inherit parry/dodge exit; acquire source with head/chest and align supports. No attack during slow-motion input lock.
2. **Load and launch:** compress supporting knee/ankle, establish forward inclination, drive off ground; hands prepare a compact fast cut.
3. **Travel:** feet/strides match routed actual distance. Longer approach uses additional travel, not stretched limbs or sliding planted feet. Sword remains controlled.
4. **Brake and impact:** receiving foot supports body at valid striking distance; pelvis/chest/shoulders drive the fast sword action with both hands attached.
5. **Follow-through:** stop travel without overshooting through victim; complete decisive blade path and coordinated defense-break response.
6. **Exit:** recover to usable guard or permitted punishment attack from actual final pose.

Point-blank riposte uses minimal closing motion. Routes around obstacles must fit stride/alignment; do not teleport through walls. Living valid source receives the guaranteed hit under existing mechanics, but source death/invalid route follows actual game rules. Animation must not introduce a distance miss or an unrelated victim. Riposte choreography must be distinguished from an ordinary light while retaining its established fast timing.

## 14. Damage, balance, falling, and death — HIT-01–17

| Instance | Player motion |
| --- | --- |
| Light clean hit | Local contact reaction propagates into chest/pelvis with a short whole-body flinch; knees absorb; sword/arms respond while feet preserve or recover support. |
| Strong hit / shove | Larger displacement of balance, matching recovery step(s), shoulders/head respond to torso; never upright root sliding with static feet. |
| Front hit | Body reacts away from actual force/contact; torso folds or recoils appropriately, then supports recover. No single universal backward lean for every wound. |
| Rear hit | Forward disturbance and forward support recovery where needed; arms/weapon react without passing through chest. |
| Left / right / diagonal hit | Directional torso rotation/side displacement and a suitable catching foot; head follows with restrained lag. |
| High / torso / low contact | Adjust local emphasis only where supported: head/shoulder recoil, torso compression, or leg/support disturbance. No new targeted-injury mechanics implied. |
| Hit while walking/sprinting | Inherit gait support and velocity; shorten or redirect next contact to recover. |
| Hit while attacking/defending/evading | Begin from actual sword, spine, and limb pose; do not return to neutral before flinching. Preserve weapon ownership and interrupt gameplay contact correctly. |
| Knockdown, when applicable | Support genuinely fails; knees/hips fold, body descends, staged ground contact, weapon clear; no whole mannequin simply rotating onto floor. Enemy kick currently causes shove/stagger rather than mandatory knockdown. |
| Grounded recovery | Brief bracing/reorientation from authored front/back landing, draw a knee/foot under body, push up with available supports while accounting for held sword. |
| Stand after knockdown | Rise through crouch/half-kneel with weight over planted foot, then recover sword guard and straighten. No floor-to-standing snap. |
| Fatal hit / defeat | Lose active balance from current pose/velocity, descend with appropriate contacts, settle into final body pose. Head and limbs follow credible momentum. |
| Death during sprint/swing/roll | Compatible continuation/handoff from current movement rather than forced upright death-start pose. |
| Final settle / sword release | Small residual limb/equipment motion; track held versus released sword explicitly. Avoid duplicate weapons. Full ragdoll simulation is optional. |
| Arena restart | Reset state and starting stance; no resurrection animation required. |

All hits punish visibly. Do not add persistent limping, slower attacks, or forced clutching wounds at low health: those penalties were not agreed. Armor bloodstaining and the glass-heart UI communicate health without changing locomotion by themselves.

## 15. Player tracks for the five finishers — FIN-01–05

Deferred production, included for complete player coverage. These are coordinated paired actions; this document concentrates on the player's body. Victim tracks must eventually agree with every contact. Existing finisher choreography remains in animationslist.md.

| Finisher | Player movement beats |
| --- | --- |
| FIN-01 Rising Cleave | Controlled entry and stance alignment; planted forward thrust; legs/hips/chest power the rising blade action; transfer onto a supporting leg for the kick; retract kicking foot and regain balanced guard. |
| FIN-02 Disarm and Dispatch | Brace and intercept; use feet/hips/forearms together for leverage and disarm; connect successive cuts from their actual endings; plant for thrust, withdraw with coordinated body travel, recover. |
| FIN-03 Helmet Bash and Throat Cut | Evasive step; close with balance and controlled weapon-hand impact; reposition feet around victim; release/reposition support hand into control; execute final blade action; release, step clear, regrip. |
| FIN-04 Sweeping Decapitation | Deflect weapon with supported torso rotation; shift to one-leg support for low kick; replant; load and execute lateral cut; arrest momentum and regain guard. |
| FIN-05 Sword-Arm Sever | Supported blade engagement; outside step with coordinated hips/chest; downward cut; connect follow-up diagonal cut; settle and recover without grip/stance reset. |

Every finisher needs continuous approach/alignment, appropriate space, believable reach/support, precise hand changes, safe sword clearance, and a complete exit. Do not teleport the player into the pair. The automatic camera follows the action fluidly but cannot conceal broken body mechanics. No finisher is implemented by writing this specification.

## 16. Weapon, hands, armor, and secondary motion

- **Low carry ↔ two-handed guard:** route sword naturally while free hand reaches/releases; fingers close after physical contact, not before a floating grip arrives.
- **Two-handed cuts:** preserve palm position and wrist alignment across deep loads and follow-through; distribute twist into forearms, elbows, shoulders, chest, and feet instead of stretching arms.
- **One-handed carry:** small arm swing responds to weapon weight; free arm counterbalances. Keep tip clear during walking, sprinting, braking, turns, and uneven support.
- **Impact response:** restrained hand/arm recoil and blade settling at real contact; no arbitrary sword wobble detached from hands.
- **Rigid plate:** helmet follows head, chestplate follows chest, shoulder armor accommodates humeral motion, elbow/knee assemblies articulate with joints, greaves follow shins.
- **Flexible layers:** mail, heraldic cloth, belts, and straps lag body accelerations, swing after turns, and settle after stops. Clear thighs, sword, and ground in crouches/rolls.
- **Breathing:** subtle coordinated chest/shoulder movement in idle and recovery; not chestplate ballooning or large rhythmic helmet nodding.
- **No extra systems implied:** no jump, climb, swim, crouch control, player kick attack, draw/sheath, weapon pickup/swap, potion use, or flourish button is added. Required finisher kicks do not turn K into a kick; player K stays a heavy sword attack.

## 17. Transition checklist for animation programming

| From | Required connections |
| --- | --- |
| Idle / ready | Walk, turn, guard/parry, every permitted attack, all directional dodges, hit/death. |
| Walk / directional combat travel | Stop, speed change, turn/reverse, guard travel, attack braking, dodge, hit/death. |
| Sprint | Decelerate, curve, reverse after braking, engage/guard, attack braking, permitted dodge, hit/death. |
| Attack preparation | Committed swing, permitted parry/block/dodge cancel, forced reaction/death. |
| Committed swing | Contact/miss follow-through or forced interruption; no voluntary movement steering or forbidden cancel. |
| Attack recovery | Chain if eligible, guard/parry/dodge when allowed, idle/locomotion; no neutral-pose reset between actions. |
| Block/parry | Success/failure, next interception, guard release, movement, break/hit, earned counter. |
| Dodge | Receiving-foot recovery, movement/guard, allowed follow-up roll, perfect-defense emphasis, earned counter, vulnerable-phase hit. |
| Roll | Ground contacts, unfold/get-up, guard/movement, eligible reaction; no direct floor-to-upright blend. |
| Perfect-defense emphasis | Continue defensive motion at slowed time with input locked, then recover/reveal opportunity or allow expiry. |
| Riposte | Routed launch/travel/brake/contact, guard-breaking impact, recovery into permitted action; handle invalid source/route per mechanics. |
| Stagger / broken defense | Supported recovery, permitted incoming punishment, restored guard at existing timing, death. |
| Knockdown | Grounded pose, get-up, ready; or death. |
| Finisher | Valid entry alignment, paired sequence, continuous return to usable stance/control. |
| Pause / resume | Preserve current pose and action phase; do not visibly replay entry or advance animation while game is paused. |

Programming notes for later implementation:

1. Treat existing gameplay state/timing as authoritative. Tag animation beats such as foot contact/release, grip/release, active sword contact, roll contacts, and recovery readiness; do not derive hit rules from guessed visual frames.
2. Choose one owner for world travel. If clips contain root motion, reconcile it with collision-limited movement; never apply both gameplay displacement and the full clip translation a second time.
3. Match stride/cadence to actual travel, and choose phase-compatible starts/stops. Layer upper-body guard only while retaining coordinated pelvis/chest motion.
4. Preserve current joint pose and velocity continuity through blends. Foot constraints and grip correction should refine authored motion, not stretch limbs or replace choreography.
5. Separate gameplay facing from visual anticipation and camera focus. Respect committed strike/dodge directions during target changes.
6. Retain safe joint limits and rigid armor behavior through every blend. Test support-foot changes and both left/right entries, not only one hand-picked pose.
7. Slow-motion and impact freeze must synchronize skeletal motion, travel, secondary motion, and gameplay timing as intended; input lock remains a gameplay rule.
8. Cosmetic variation cannot alter contact windows, movement lock, reach, invulnerability, or recovery advantage unless the design explicitly changes.

## 18. Review procedure and acceptance

Review a single slow complete walking stride before adding variants. Inspect front, side, rear, and actual gameplay camera; then review at real speed. Check walking, sprinting, and directional combat travel separately.

- [ ] Can we identify the supporting foot and see the body transfer weight over it?
- [ ] Do feet maintain convincing ground contact, toe clearance, and natural width/turnout without skating or waddling?
- [ ] Do knees change behavior between landing, support, push-off, swing, and the next contact?
- [ ] Does the pelvis translate/rotate/tilt while the chest responds independently?
- [ ] Do shoulders, elbows, and free arm participate; does the sword arm remain controlled without freezing the body?
- [ ] Does the head stabilize naturally, move subtly, and anticipate turns without being welded or bobbling?
- [ ] Does acceleration/braking change support and posture, not merely playback speed?
- [ ] For each cut, can we see load, leg drive, pelvis/chest rotation, blade travel, receiving support, and complete recovery?
- [ ] Are both hands attached, limbs unstretched, and blade/armor clear of body and floor?
- [ ] Do all eight dodge directions and roll exits show physical push-off and reception?
- [ ] Do abrupt inputs, allowed cancels, hits, walls, focus changes, and pause/resume preserve continuity?
- [ ] Do hit/block/miss outcomes look different while preserving rules and timings?

Passing automated tests establishes mechanical constraints, not animation quality. The next quality checkpoint should focus on the player; do not mark the old sample accepted or expand enemy production based only on its test results.

## 19. Reference basis and remaining decisions

The user's armored-knight image informs fitted anatomy, human silhouette, layered plates, and joint clearance. It is not a walking reference and does not supply a usable model, rig, animation, or reuse license. A reference GLB is optional and still being prepared; no external asset is required to discuss choreography.

Biomechanics sources consulted during this discussion:

- [Dynamic arm swinging in human walking](https://pmc.ncbi.nlm.nih.gov/articles/PMC2817299/): coordinated arm swing and rotational momentum.
- [Impulsive ankle push-off powers leg swing in human walking](https://pubmed.ncbi.nlm.nih.gov/24363410/): ankle push-off and swing initiation; avoid describing push-off as simply straightening the knee.
- [Head stabilization strategies during locomotor tasks](https://pubmed.ncbi.nlm.nih.gov/15132026/): head stabilization relative to moving trunk.
- [Head/body reorientation during steering](https://pubmed.ncbi.nlm.nih.gov/11521154/): head orientation and coordinated changes in walking direction.

These support locomotion principles. Combat, armored-roll, and finisher descriptions above are proposed game choreography, not scientific findings from those papers.

Decisions still pending: L09–L12 blade paths; precise A/B execution choreography; final rig/mesh/reference assets; exact footwork and armor-safe roll solutions; final animation tool/export workflow; reference device/frame-rate target. None requires changing existing gameplay mechanics merely to improve body motion.
