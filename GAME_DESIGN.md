# Medieval Sword Combat — Design Foundation

**Latest scheduling decision — 2026-11-18:** core gameplay/combat mechanics first using existing practice/debug UI, test arena, and placeholder motion. Waves/rewards, weather, final UI, maps, and balance are deferred until after core mechanics and before final animation production/polish. Earlier conflicting sequencing is superseded by [CODING_PLAN.md](CODING_PLAN.md#updated-production-order--2026-11-18). Existing motion remains visually unaccepted; preserve its quality requirements for the final phase. This documentation update does not itself resume coding.

Status: planning only. No implementation or assets authorized by this document.

This document consolidates the agreed design. The game has no final title. Exact numerical values and items under “Open decisions” remain undefined; descriptive terms such as “brief” are intentional placeholders.

Animation production inventory: [animationslist.md](animationslist.md). It separates required animation coverage, current discussion changes, recommendations, and unresolved decisions; listed work is not an implementation claim.

## 1. Game direction

A 3D medieval browser combat game built with Three.js. Players fight waves across different arenas using a grounded knight and a two-handed longsword.

The experience centers on fast, intentional swordplay: reading attacks, managing defense, parrying, dodging, and exploiting openings. The knight is not a superhuman character. Skill and execution should make the player feel like a master swordsman.

There is no gathering, crafting, hunger, shelter management, or base building. Those concepts from the original survival proposal were discarded.

The current design phase focuses on the player and sword. Enemy rosters, maps, wave composition, progression, other weapons, and additional features come later.

### Design pillars

- Responsive movement, committed attacks.
- Defense that rewards precise timing without making ordinary blocking useless.
- Readable group combat with an automatic camera.
- Grounded animation and brutal, deliberate executions.
- A serious hand-drawn visual identity.

## 2. Controls

| Input | Action |
| --- | --- |
| WASD | Camera-relative movement |
| J | Light attack; riposte when a riposte opportunity is available |
| K | Heavy attack |
| Hold E | Block |
| Fresh press of E | Open a timed parry window |
| Space | Directional evasive step; backward step without movement input |
| Second Space press within the follow-up window | Transition into a longer roll |
| Hold Shift while moving | Sprint outside combat; retreat sprint when moving away from the focused enemy |
| F | Finisher against an eligible target within reach |

No manual camera control is required. Each light or heavy strike requires a fresh button press. Holding J or K never repeats attacks.

## 3. Movement and combat state

Updated movement direction: inputs respond immediately as intent, but physical movement accelerates and brakes gradually. Starting, stopping, entering sprint, and leaving sprint blend smoothly instead of instantly changing speed. Walking turns are fluid; sprinting has a tighter limit on turning speed and traces wider arcs. Sharp changes of direction reduce speed. Turning changes the actual movement path, not just the character animation. This replaces the earlier instant-speed movement proposal. Exact rates remain subject to playtesting.

- Outside combat, the knight faces the movement direction.
- While focused on an opponent, the knight can strafe and retreat while facing them.
- Combat movement and facing are independent: moving sideways or backward must not turn the knight away from the selected opponent. Continue tracking the target while idle or moving, except where committed attacks and locked reactions intentionally constrain facing. Use strafing/retreat footwork rather than a forward-running animation sliding sideways.
- Blocking slows movement.
- Parrying does not inherently require standing still.
- There is no jumping in the initial foundation.
- Close-range combat engagement begins when an enemy closes in or the player attacks an enemy, except during an actively held retreat sprint. A successful combat source event or clean incoming hit can end retreat and restore focus.
- Shift plus movement away from the focused enemy deliberately releases focus and starts a retreat sprint when no committed action or locked reaction prevents it. Nearby pursuit does not immediately reacquire focus while retreat sprinting. Attacking, blocking/parrying, successful evasion of an actual strike, or taking a clean hit re-engages combat. Releasing sprint allows normal acquisition. Pursuit speed remains below player sprint speed.
- Once the player creates enough distance from all nearby enemies, combat focus releases and the camera returns to movement-following. Holding Shift then enables sprinting away.
- Enemies continue pursuing after disengagement. Breaking away does not end the wave or reset enemies; pursuit alone does not disable sprint.
- Use a larger distance to disengage than to re-engage, preventing camera focus and sprint availability from flickering at the boundary. Exact distances remain to be tuned.

### Movement during attacks

When an attack is requested while moving, first perform a short, collision-limited braking slide along the current travel direction, then start attack preparation once the feet are planted. Faster movement takes longer to arrest; standing attacks start immediately. Preserve only that requested strike during braking, ignore extra attack presses, and prevent movement inputs from steering or accelerating the slide. Pausing or losing focus clears a pending strike. This transition precedes the attack's movement lock and small target-directed lunge; it does not allow free movement during a swing.

WASD cannot move or steer the knight during light attacks, heavy attacks, or ripostes. Attacks cannot be redirected halfway through.

Ordinary light/heavy attacks against a focused opponent include a small automatic forward lunge. It closes only a modest gap, becomes minimal when already in range, and cannot push through the opponent or guarantee contact.

Normal movement returns when attack recovery finishes. A permitted defensive cancellation replaces the attack with the defensive action; a dodge then supplies its own movement.

## 4. Sword attacks

### Light attacks

J performs one strike in a three-strike chain. The third strike is stronger and more committed, with longer recovery.

- Each strike requires a separate press.
- Only one next strike can be buffered, near the end of the current swing.
- Additional presses are discarded rather than building a long queue.
- Waiting too long resets the chain.
- Blocking, parrying, or dodging ends the chain when cancellation is allowed.
- Repeated presses do not accelerate animations or make attacks safe.

Light cuts vary across the blade's directions: rising and falling diagonals, horizontal cuts from either side, downward cuts, and upward cuts. This is the “hexagon” concept: a varied family of blade paths, selected automatically rather than through extra directional inputs.

Expanded animation requirement: 12 directed light-cut paths, with at least two distinct executions per direction (24 light animations minimum). The exact 12 paths still need a visual direction chart; the earlier examples were illustrative, not a complete enumeration. This expands animation variety, not the three-strike chain or the controls.

Animations flow naturally from the previous sword position. Variants for a given chain position should have comparable timing and reach so visual variety does not make the controls unpredictable.

### Heavy attacks

K starts one fixed-duration heavy strike immediately. Holding K does not charge it.

The animation family includes an overhead downward cut and broad swings from either side. Heavy strikes have greater commitment than light strikes. A heavy can start from neutral or after a light attack's recovery and ends the light chain.

Each of the three heavy directions needs at least two distinct executions (six heavy animations minimum). Combined with lights, the minimum target is 30 attack animations.

### Full-body attack animation standard

Cuts must clearly communicate direction through preparation, blade travel, and follow-through. Animate the whole body: planted support foot, a deliberate step into the swing, knee bend, weight transfer, hip and torso rotation, coordinated shoulders and elbows, two-handed grip, and a controlled recovery. Wrist-driven sword pivoting alone is not sufficient. Variants should differ in stance, footwork, and execution rather than only changing wrist angles.

Cuts should be very large and originate deep: bring the blade tip behind the knight during windup, carry it through a roughly 130–180 degree sweep, and continue visibly past the target. Author the blade's cut plane and arc explicitly so interpolation does not shorten the swing. Preserve the existing commitment and limited travel; a broad visual arc does not make every attack a guaranteed hit or authorize unrestricted spinning.

Larger arcs must not lengthen attack durations. Within the existing timing, load slowly, accelerate into the fast cutting portion, and settle smoothly into follow-through. Continuously blend the complete body and sword from the current neutral or prior attack pose into windup, across phase boundaries, and back to the idle/movement stance. No snapping hands, feet, torso, or blade into their starting positions. Hit queries must sample the same accelerated blade path as the visible animation.

Stepping must respect collision and the existing limited lunge; foot animation does not authorize unlimited forward travel or movement input during a strike. Animation variants within a gameplay attack must preserve readable impact windows and predictable reach. Approved sequence: improve a small representative full-body set now, then produce the complete 30+ animation set with the final rig. The prototype remains procedural and does not yet include the full directional library.

### Attack phases and cancellation

1. **Preparation:** the strike begins; block, parry, or dodge can cancel it.
2. **Committed swing:** the player must follow through; defensive cancellation is unavailable.
3. **Recovery:** defensive options return late in recovery, before another attack is available.

These restrictions concern voluntary actions. A clean enemy hit can interrupt even a committed swing.

## 5. Blocking, parrying, and guard

The guard meter represents defensive endurance. It is separate from health; no general stamina bar is planned for the initial foundation.

### Held block

- Holding E defends against blockable strikes from every direction.
- The knight visibly adjusts to intercept blows.
- Holding block alone costs no guard.
- Each blocked hit consumes guard; heavy blockable hits consume more.
- Multiple hits each apply their own cost.
- Held block pauses passive guard recovery.

### Parry

A fresh E press opens a brief parry window. Continuing to hold E transitions into ordinary blocking; it never generates additional parries. Release and press again to attempt another parry.

A successful parry deflects the strike, turns the knight toward the attacker, and restores guard. The defensive action never waits for the camera to turn.

A smaller perfect-parry window exists within the ordinary parry window, just before impact.

### Recovery and guard break

Guard gradually recovers after a short period of combat inactivity, provided block is lowered. Movement alone does not prevent recovery.

At zero guard, the knight's defense breaks and they are stunned for approximately one second. A clear animation and sound communicate the break. Some guard returns after the stun to avoid immediate repeated breaks.

Exact costs, restoration amounts, delays, and recovery rates remain to be tuned.

## 6. Dodging and rolling

Space performs a short, grounded evasive step in the WASD direction, or backward with no direction held. It has a brief damage-evasion window followed by vulnerable recovery and consumes no guard.

A second Space press within a follow-up window transitions into a longer roll. The roll covers more distance and has longer recovery, making it useful against large attacks. Neither action can be chained into continuous invulnerability.

A perfect dodge narrowly avoids a strike that would otherwise hit the player. Dodging near an enemy without evading an actual attack does not qualify.

Initial implementation rule: only the initial sidestep can earn a perfect dodge, not the follow-up roll. Check the actual weapon sweep against the pre-dodge position so empty-space dodges or moving into otherwise harmless strikes cannot earn the reward.

## 7. Perfect defenses and ripostes

Both a perfect parry and a perfect dodge trigger the following sequence:

1. The defensive animation continues while the whole fight slows for roughly half a second of real time.
2. No new player action can start during that emphasis. Inputs during it are discarded, not queued.
3. Normal speed and control return.
4. A short riposte opportunity opens.
5. A fresh J press performs a fast counterattack against the attacker just defended against.

The camera does not cut away. Slow motion emphasizes the defense; it is not a period for attacking or choosing buffered actions. The riposte window begins only after it ends.

Inputs held through or pressed during emphasis must be released before they can activate again. The current defensive animation continues with scaled game time; the half-second cinematic duration uses real time. Once emphasis ends, the earned riposte may cancel the late vulnerable part of the initial dodge's recovery, preserving the rule that no attack starts during the slow-motion defense or active evasion window.

### Riposte properties

- Deliberate rather than automatic.
- A guaranteed dashing counter against the living source attacker. Fresh J reserves that source, follows a collision-checked route to sword range, aligns the strike, and delivers one authored synchronized impact event instead of relying on a freely aimed swing; ordinary attack range and the short-lunge cap do not apply. The source holds position during alignment. Committed dash/strike is protected through impact; the opportunity window itself and post-impact recovery are not invulnerable. No teleporting through walls or bodies. If no route is currently available, retain the opportunity and show feedback rather than consuming it for a miss. A dead source invalidates the opportunity.
- Increased damage compared with an ordinary light strike; the amount is undefined.
- A landed riposte immediately breaks the target's remaining defense meter.
- The perfect defense itself does not break the enemy's defense.
- The opportunity does not stack and can be ignored.
- The riposte is separate from the light chain and does not grant general invulnerability.
- After a perfect dodge, choosing a follow-up roll instead gives up the riposte opportunity. The roll input becomes available after slow motion ends.

## 8. Attack indicators and targeting

### Indicators

A small four-point star appears briefly near the attacker's weapon before a strike:

| Indicator | Meaning | Available response |
| --- | --- | --- |
| White | Blockable and parryable | Block, parry, dodge, or leave range |
| Red | Neither blockable nor parryable | Dodge or leave range |

A heavy attack that remains blockable uses white, despite its greater guard damage. Red does not mean merely “heavy.” Red attacks can earn perfect dodges and ripostes.

The first enemy unblockable is now a grounded front push kick, not a sword cut. It has a visible weight shift and raised-knee preparation, a short forward boot extension, and a committed retraction/balance recovery. The sword stays guarded. It uses the red star, defeats both block and parry, stops tracking before the committed kick, and can miss when the player dodges or leaves its short reach. A clean hit pushes the player away with collision and briefly staggers them, rather than automatically knocking them down. A perfect dodge still earns the source-bound dashing riposte. Player K heavy sword attacks and their animation family are unchanged.

Prototype kick tuning: approach to roughly 1.05 units, 0.24-second active phase, and 0.75-second exposed recovery; boot contact is swept from the actual animated foot. Existing unblockable health damage is retained at 30. The shove travels up to 0.65 units over 0.18 seconds, shortened by walls/bodies; stagger lasts 0.65 seconds. Values remain provisional.

The cue warns of a strike; pressing parry immediately when the star appears is not automatically perfect timing. Offscreen unblockable attacks must have adequate warning.

### Focus rules

- On first engagement, select the closest enemy.
- Attacking maintains focus on the current opponent.
- Moving toward another opponent and pressing J or K deliberately transfers focus. Movement alone does not.
- Blocking, parrying, or successfully dodging/rolling through an actual incoming strike transfers focus to its source. An avoided strike threatening the pre-evasion position also qualifies. Empty-space dodges do not switch focus. Among simultaneous avoided threats, the first resolved contact determines that evasion’s source; immediate unblockable priority still applies.
- An unblockable attack threatening the player takes priority until evaded or passed.
- Among overlapping unblockables, prioritize the one due to hit first.
- Otherwise, the latest successful block or parry determines defensive focus.
- If the target dies or leaves the fight, select the closest remaining threat.

Focus may update during a committed attack, but cannot redirect the ongoing swing or lunge. The next action uses the updated target.

Group-practice implementation: closest acquisition has deterministic tie-breaking; focus is retained through small distance changes, releases at nine units, and reacquires within six. Unblockable priority chooses the earliest active warning when acquired, retains it until that threat ends to prevent flicker, then returns to the latest successful block/parry source or a newer intentional attack selection where available. The committed attack target and earned riposte source use independent stable IDs.

## 9. Automatic camera

The view is elevated third person, leaning more toward third person than isometric. It requires no player camera input.

The camera frames the knight and focused opponent while preserving awareness of nearby attackers. It pulls back and rises modestly for crowded fights, turns smoothly between targets, and avoids sudden rotations during precision actions. Camera-relative movement must remain predictable.

Lock-on means the camera's orbit follows the player-to-opponent direction as they move around each other, not merely keeping an enemy somewhere on screen. Keep the view behind the player's combat facing where terrain allows, aim into the engagement, and retain the existing obstruction avoidance and smooth transitions.

The camera should handle walls and other obstructions without losing the action, using the exploration behavior below.

In the group prototype, nearby attackers smoothly expand following distance from 7.2 up to 11.2 units, with at most one extra unit of height. A bounded group-center offset complements focused-target framing; it does not replace the target-driven orbit. Active warnings outside the view receive directional edge stars with the same white/red meanings. These are provisional practice settings.

Updated exploration-camera direction: use a lower, more third-person angle and automatically follow the direction the knight runs outside combat. Preserve directional input intent as the camera rotates. At walls, prefer a clear side angle while maintaining a comfortable following distance; temporarily fade obstructing scenery during transitions or in confined spaces instead of pushing the camera tightly against the character. Exact tuning remains subject to playtesting.

Add a very subtle footstep-linked camera bob and sway during exploration. Blend it in and out with actual movement and smooth positional following. Keep it tiny and suppress it during combat so it does not interfere with precise defense or reading attacks.

### Finisher camera

Each finisher has a fluid camera movement that glides closer and adjusts its angle without cuts. No extreme spins or lingering cinematic shot after the action. Nearby threats remain readable.

In tight spaces, use a reduced camera move. Blend back into the combat view as the animation ends; control does not wait for the camera to finish a flourish.

Finishers run at normal speed by default, distinguishing them from perfect-defense slow motion.

## 10. Damage, health, and defeat

Every clean hit punishes and interrupts the player, including committed attacks. Ordinary hits cause a brief flinch; stronger impacts can stagger or knock down. Finisher protection is the exception.

There must be a brief opportunity to regain control and defend after a hit, preventing unavoidable repeated stagger chains. The mechanism and duration remain undefined.

### Healing

- Below 50% health, the player slowly regenerates up to 50% after a period of combat inactivity.
- Attacking, blocking hits, parrying, dodging, or taking damage interrupts that inactivity.
- Movement alone does not interrupt regeneration.
- At or above 50%, no passive healing occurs.
- Full health restoration is an option in the between-wave reward-selection phase, competing with upgrades rather than occurring automatically.

Implemented inactivity prototype: after four seconds without combat activity, living players below 50 health recover five health per second up to 50. Held guard and reactions also prevent recovery; movement alone does not. These new-mechanic values are provisional.

### Defeat

Death restarts the current arena from wave one and clears that run's rewards and upgrades. Progression outside the run has not been designed.

## 11. Enemy-defense interface and finishers

These rules connect directly to player actions. The single-opponent prototype now includes basic guarding; group behavior and advanced tactics remain deferred.

Enemies have a defense meter. Breaking it opens a period where the player can punish with normal J and K attacks at their usual speed and commitment. There is no special automatic combo or faster attack chain.

Prototype enemy guard rules (provisional tuning): ready, pursuing, and early-windup opponents can block ordinary attacks while defense remains. Committed attacks, recovery, and hit reactions leave them exposed. Like player blocking, this first guard pass protects from all angles. Blocked hits deal no health damage: ordinary lights consume 24 defense, the third light consumes 32, and heavies consume 44. Blocking does not restart the enemy attack timer, so attack spam cannot keep it permanently waiting. The hit that exhausts guard opens the break without health spillover; subsequent normal attacks deal health damage.

The break lasts one second; punishment hits do not refresh it. Recovery restores 35 defense. A landed riposte bypasses an active guard, deals its normal damage, and empties remaining defense immediately. During a genuine combat lull, defense recovers at 12 per second after two seconds; attack commitment and incoming sword contact reset that delay. These are prototype values for playtesting, not final balance.

A finisher requires **both low enemy health and broken defense**, plus being within reach. F deliberately activates it; ordinary attacks and ripostes never automatically start a finisher. A small prompt identifies the eligible target. The focused opponent takes priority among eligible targets.

Once a finisher starts, the player is protected until it ends. Nearby enemies continue repositioning but hold strikes until control returns, then attack with readable windups.

Functional prototype: all five planned finishers have selection, compatibility, space checks, timing/events, and temporary paired poses. Common eligibility remains a living enemy at 30 health or less, broken defense, within 2.4m, with deliberate F. F respects allowed attack cancellation and cannot start during stun/evasion/guard, pending braking, dash, slow motion, or impact freeze. Existing protection, fresh bystander windups, and continuous camera remain.

Automatic selection rotates its preference after successful activation, retains eligible-target priority, and tries compatible alternatives when a pair cannot fit. Helmet Bash requires a head/helmet and a clear path around the victim. Disarm and Sword-Arm Sever require an attached sword arm and held weapon; decapitation requires an attached head. Broad lateral cuts check a blade envelope; the compact Disarm sequence can fit when Rising Cleave's kick landing is blocked. A practice-only preference selector lets these paths be inspected without changing eligibility; unsafe/incompatible preferences still fall back or reject.

Provisional mechanics timelines:

| Execution | Detachment / weapon event | Lethal beat | Control return |
| --- | --- | --- | --- |
| Rising Cleave | Kick displacement begins at 1.3s | 0.85s | 2.1s |
| Disarm and Dispatch | Sword released at 0.62s | 1.5s | 2.4s |
| Helmet Bash and Throat Cut | Player routes around victim; no sever | 1.55s | 2.5s |
| Sweeping Decapitation | Head and sword release at 1.1s | 1.1s | 2.15s |
| Sword-Arm Sever | Sword arm separates with held sword at 0.95s | 1.4s | 2.35s |

Detached head/arm snapshots use the current posed armor geometry, with capped separation surfaces. The original surface and its ink contour disappear together. A detached arm carries the held sword; a dropped sword cannot be duplicated. Props have bounded floor/obstacle motion, a 10-second lifetime and a global limit of 12; drill reset removes/disposes props and restores the complete character. These are mechanics prototypes; final paired clips, anatomical/armor cleanup, blood presentation, and polished physics remain deferred. See CORE_COMBAT_AUDIT.md.

### Initial five finishers

1. **Rising Cleave:** drive the sword into the chest, tear it upward and out, then kick the body away. Blood follows the rising cut. The kick ends the animation and returns control.
2. **Disarm and Dispatch:** catch an incoming blade, wrench the weapon away, deliver two quick slashes, then stab the stomach, withdraw, and let the enemy fall.
3. **Helmet Bash and Throat Cut:** slip past a swing, close in, strike the helmet with the pommel, move behind the staggered enemy, draw them against the blade, cut the throat, and release them. Requires a compatible helmeted enemy.
4. **Sweeping Decapitation:** knock the weapon aside, kick the knee to force the enemy down, then decapitate with a decisive sideways cut.
5. **Sword-Arm Sever:** trap the extended blade, step outside its reach, sever the sword arm with a downward cut, then deliver a fatal diagonal torso slash.

The catches and evasions in these sequences are execution choreography after eligibility, not automatic finisher triggers from every block or dodge. Prototype compatibility, selection, durations, and threshold are specified above; final authored choreography and tuning remain pending. More finishers can follow after the first stage is complete.

## 12. Visual and audio direction

Serious, cartoon-influenced hand-drawn 3D: believable proportions and physical movement rendered with ink contours, painted surfaces, simplified shadows, and restrained illustrative detail. No photorealistic texture direction or exaggerated comic movement.

Use irregular dark outlines, broad painted material highlights, earthy surroundings, and readable silhouettes. The exact degree of scratchy ink, crosshatching, and painterly texture remains to be established through future art direction.

### Knight appearance

Move away from the block-shaped stand-in toward a complete, human-proportioned armored figure. The final character needs an anatomically coherent, fully articulated body: pelvis, multiple spine joints, neck/head, clavicles/shoulders, upper arms, elbows, forearm twist, wrists, hands and grip-capable fingers, hips, knees, ankles, and feet/toes. Separate torso and pelvis motion, natural joint limits, and coordinated two-handed grip must support deep windups and follow-through without stretching limbs or restricting poses. Armor and cloth must accommodate these joints rather than locking them together. Human proportions and articulation do not change the concealed identity or illustrated visual style.

The current sample replaces the old broad geometric actor with a native skinned human rig, fitted armor, articulated hands/feet, low carry and regripping, and representative connected poses. Production-quality acceptance, authored clip cleanup, final material painting, and the full animation library remain dependent on visual review. See CHARACTER_QUALITY.md.

- Fully enclosed, with no visible skin or identity.
- Belgian armet as requested; pitch-black eye slit with no visible eyes or glow. A precise visual reference for the helmet is still needed before asset production.
- Silver plate: chestplate, shoulder pauldrons, arm protection, bracers, articulated gauntlets, thigh and knee protection, greaves, and armored boots.
- Chainmail underneath and at joints, extending into a long robe-like skirt with a divided hem for movement.
- Red heraldic cloth over the torso armor and part of the mail skirt; no cape.
- Dark leather straps, bracing, belt, fasteners, and visible buckles.
- A substantial but mobile silhouette with defined shoulders and fitted waist.

### Heraldry

A large black bat on the red surcoat: flared, raised wings spanning the chest, pointed ears, and feet thrust forward with hooked talons spread as if grasping prey. The silhouette is angular, broadly symmetrical, and legible from the gameplay camera.

### Sword and demeanor

A two-handed longsword with a straight, double-edged silver blade, pointed tip, simple crossguard, and dark leather grip.

The knight is silent, controlled, and practiced. Both hands hold the sword ready in combat, with measured breathing and minimal flourishes. Outside combat, the blade lowers while the knight remains alert.

### Combat effects and gore

- Blocks produce small pale sparks at contact.
- Parries produce a sharper, brighter burst and a distinct metallic sound.
- Sword trails are thin, subtle, short-lived illustrated strokes following the blade.
- Damaging cuts throw directional blood slashes along the sword's movement.
- Finishers produce substantially heavier spray, stains, and pooling.
- Dismemberment and decapitation are part of the intended gruesome tone.
- Blood remains on characters and surfaces during fights; older stains darken.
- Effects must not obscure attack indicators or the central action.

At the exact instant an enemy dies, translucent illustrated red blood briefly flashes around the screen corners. The center stays clear. Rapid kills refresh the effect rather than stacking opaque overlays. Finisher confirmation occurs on the lethal strike, not merely when its animation ends.

## 13. Player interface

### Health

A glass heart in the lower-left corner, filled with dark red ink-like blood. Losing health lowers the liquid level and increases cracks. Damage briefly jolts the heart and ripples the liquid.

The fill level communicates health precisely; cracking reinforces injury. Regeneration refills the heart and reduces its cracks.

The knight's armor becomes progressively more bloodstained as health decreases. Injury stains recede with healing, while some splashed battle blood and grime persist.

### Guard

The guard meter sits beside the heart. A slim curved bar beneath it with a hand-inked outline was proposed but its exact shape has not been approved. It should visibly drain on blocks, refill on parries, and warn before a break.

## 14. Open decisions before implementation

### Player rules and tuning

- Attack durations, chain reset, buffer windows, damage, range, and lunge distance.
- Exact cancellation boundaries and initial target/facing commitment.
- Parry and perfect-defense windows; behavior after a failed parry attempt.
- Dodge/roll distances, recovery, evasion windows, and double-press timing.
- How roll evasion interacts with perfect-dodge rewards.
- Riposte window, miss behavior, and handling focus changes after a perfect defense.
- Guard capacity, costs, recovery, parry restoration, and post-break restoration.
- Health values, recovery delay/rate, and whether holding E without receiving hits prevents health regeneration.
- Flinch, stagger, knockdown, get-up, and protection against repeated unavoidable hits.
- Disengagement and re-engagement distances, including stable focus release and sprint transitions.

### Targeting and presentation

- Target-selection range, directional tolerance, and tie-breaking in crowds.
- Exact camera height, distance, rotation limits, and obstruction handling.
- Attack-cue lead times and offscreen warning presentation.
- Finisher health threshold, reach, compatibility, duration, and selection rules.
- Enemy defense-break duration and whether subsequent hits extend it.
- Final guard-meter shape, visual effect intensity, and health-state art layers.
- Exact helmet reference and an illustrated visual style reference sheet.
- Broader sound design, pause/settings behavior, rebinding, and accessibility options.

### Intentionally deferred

Enemy types and AI, detailed map layouts, wave schedules, reward pools, upgrade balancing, campaign structure, persistent progression, other weapons, and additional modes. The level direction below is agreed, but detailed content and progression rules remain to be designed. This document does not authorize implementation.

## 15. Maps and environments

Each map is a separate level built around a contained wave-combat arena, rather than an exploration requirement. This establishes a structure for progression later; level order, unlock conditions, and rewards between levels are not yet decided.

All locations are abandoned. The player and enemies are the only inhabitants: no civilians, spectators, merchants, friendly NPCs, or wildlife. Environmental architecture and scenery still establish each setting; they do not imply a populated world. Tournament stands are empty, the king's hall has no noncombatant court, and between-wave rewards are selected through the interface rather than an in-world merchant.

### Shared arena principles

- An open main fighting space with room to dodge, roll, and circle opponents.
- Limited obstacles and elevation changes that create positioning choices without repeatedly obstructing the automatic camera.
- Visible boundaries and believable enemy entrances, with no spawning directly behind the player.
- Clear ground and lighting so characters, blood, and attack indicators remain readable.
- Detailed scenery around the fighting space, with restrained clutter inside it.
- The same serious, hand-drawn treatment as the knight.

### Planned level roster

The roster, shape assignments, and atmosphere combinations are agreed. Descriptions guide art and layout but are not final dimensions or geometry. The list does not establish progression order.

| Level | Environment direction | Layout direction |
| --- | --- | --- |
| Ruined castle courtyard | Cracked flagstones, mud, broken banners, iron gates, damaged pillars | Balanced open center and broad perimeter routes; proposed first playable level |
| Desecrated chapel | Broken pews, stained glass, vaulted stone | More constrained approaches while retaining room for defensive movement |
| Rain-soaked village square | Timber buildings, carts, muddy streets | Irregular cover and several approach routes |
| Forest ruins | Ancient masonry, roots, scattered trees | Connected fighting pockets with clear camera sightlines |
| Tournament grounds | Wooden barriers, spectator stands, heraldic banners | Broad visibility and an exposed central arena |
| Desert | Desert setting; specific architecture and scenery to be decided | To be designed |
| King's hall | Royal interior; specific architecture and scenery to be decided | To be designed |
| Snowy field | Snow-covered outdoor battlefield; specific scenery to be decided | To be designed |

### Arena shapes

Maps do not all share the same footprint. The roster should include rectangular arenas, circular arenas, and long winding strips resembling a river's course. A winding strip describes the playable ground's shape, not a requirement for water. Each map remains a wave-combat level; a winding footprint does not introduce gathering or exploration objectives.

Shape assignments are recorded below; dimensions remain open. The entire playable route stays open during waves: there are no encounter-section gates or requirements to clear one section before moving onward. The player can fight anywhere, and enemies pursue the player along navigable routes wherever the player moves. Pursuit brings enemies into combat range; it does not replace their close-range spacing, defense, or attack decisions.

Winding routes need enough width for group combat, rolls, paired finishers, and camera transitions around bends. The camera must respect the local playable space rather than trying to frame opponents through terrain or across unrelated sections of a bend.

### Sky, weather, and atmosphere

Each map has a deliberately authored weather and atmosphere identity. Across the roster, include sunny, snowy, dusty, cloudy, rainy, and ember-filled conditions. Embers are an atmospheric effect rather than literal weather.

| Level | Agreed shape | Agreed sky and atmosphere |
| --- | --- | --- |
| Ruined castle courtyard | Rectangular | Cloudy sky, cold daylight, drifting mist |
| Desecrated chapel | Long rectangle | Rain outside, broken-window light, dust inside |
| Rain-soaked village square | Irregular rectangle | Dark storm clouds, rain, puddles |
| Forest ruins | Winding strip | Overcast sky, low mist, wind through branches |
| Tournament grounds | Circular | Sunny blue sky, moving clouds, airborne dust |
| Desert | Winding strip | Harsh sunlight, sandy haze, drifting dust |
| King's hall | Long rectangle | Smoky light, burning braziers, floating embers |
| Snowy field | Broad circular arena | Pale gray sky, falling snow, windblown flurries |

Design each environment as a coordinated set: sky or visible exterior, light direction and color, cloud cover, distant scenery, fog or haze, precipitation/particles, ground response, and ambient sound. Interiors express outside weather through windows, entrances, lighting, and sound; they do not require precipitation passing through roofs.

Weather should support the illustrated style and leave enemy windups, silhouettes, and white/red attack indicators readable. Weather does not automatically change movement, damage, or defensive timing. Slippery surfaces, hazards, destructibility, dynamic weather changes, and visibility penalties remain separate undecided features.

The maps remain abandoned: atmosphere can move through the scene without introducing additional inhabitants.

## Group-practice coordination checkpoint

The prototype offers one or three opponents. Three-opponent practice uses collision separation, pursuit, guarding, and a fair rotating attack grant. Starts are separated by at least 0.72 game seconds, at most two windups/swings commit concurrently, and red attacks commit only when other strikes have passed, reserving the window until their swing ends. Waiting opponents keep guarding and can approach; already committed attacks keep their original timing. These rules provide a readable first group test, not finished encounter tactics or a guarantee of final difficulty balance.

Finisher eligibility, waves, final encounter tuning, and final animation assets remain later work. Validate the group controls and automatic camera hands-on before advancing beyond this checkpoint.

## Approved combat revision — 2026-11-18

Enemies maintain a loose, adaptive surround using available gaps, different approach distances, and individually timed repositioning. They do not share a perfect circle, fixed radius, or synchronized attack sequence. Adaptive combat selects weighted attack types and executions per fighter; fixed patterns remain selectable for timing practice. Attack coordination still avoids unreadable simultaneous impacts.

Enemy defense depletion produces a localized white blade-contact flash and sparks, a sharp metallic crack, pronounced sword/torso recoil, and a shattering defense-bar response. A provisional 0.08-second real-time impact freeze holds the entire fight, including the break/reward timers. Input is discarded during the freeze; held inputs require release before reuse. Multiple contacts do not stack or extend an existing freeze, and punishment hits do not retrigger it. A player guard break uses distinct player feedback without awarding an enemy-break celebration.

Human proportions, a fully articulated rig, and polished full-body animation remain core requirements. Prove a rigged character with a small polished movement/attack/defense sample before building finishers and the full animation library. Mechanics prototypes do not count as finished character assets. The running carry remains the proposed low, backward-angled carry pending final pose review.

## Character-quality target approved — 2026-11-18

Use believable human proportions with modest armor exaggeration for readability. Ghost of Tsushima is the anatomy/movement reference; Chivalry 2 is the armor reference, adapted to the established silver/red Belgian-armet knight, mail skirt, leather fittings, black visor slit, and bat heraldry. Rendering remains our own clean ink contours, broad painted shading, and restrained surface texture. These references do not authorize importing their assets.

The longsword feels agile; strength comes from planted feet, weight transfer, and coordinated hips/spine/shoulders/hands. Motion is flowing, calculated, forceful, and clean. Swift controlled dodges preserve balance. Outside combat, carry the sword low beside the body, angled backward with floor clearance, then regrip smoothly into two-handed guard.

Occasional stylish backspin-to-strike executions are now approved. They remain authored variants within an existing attack: identical preparation/active/recovery timing, commitment, reach, collision rules, and damage. Rotate the body through the flourish without rotating the gameplay camera or granting an extra hit, movement, or invulnerability. Ordinary execution remains more common; no every-strike spinning or uncontrolled recovery.

Build one human-rig/animation quality sample in the game and a controlled inspection view before producing the complete directional library or finishers. Judge connected run–brake–strike, cut–recovery, guard–parry, dodge–guard, and occasional backspin sequences, plus close-range enemy-kick readability. This sample requires visual review before being accepted as final production quality.
