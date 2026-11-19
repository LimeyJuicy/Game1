# Core combat audit — 2026-11-18

Scope: correctness and missing core behavior, followed by functional finisher mechanics and their authorized all-five/detachment extension. Uses the existing practice arena, diagnostic UI, and temporary poses. Waves, reward selection, weather, maps, final UI, balance passes, and final animation remain deferred under CODING_PLAN.md.

This audit is not a claim that the whole game or professional animation is complete. Existing player movement quality feedback remains unresolved for the final animation phase.

| System | Evidence / behavior checked | Outcome |
| --- | --- | --- |
| Sword input and commitment | Fresh presses, bounded light buffer, three-strike chain, heavy recovery, permitted cancels, movement lock, run braking. | Existing implementation retained; logic/browser regression checks. Full directional clips remain later. |
| Repeated defense input after counter | The first finisher browser scenario earned one counter but its next fresh E was ignored. | Fixed suppressUntilRelease so an already released key does not swallow its next press. Still-held and lock-suppressed keys retain release requirements; added input regression coverage. |
| Sword contact | Swept blade, broad cuts, one contact per target/strike, collision-limited approach, blocked/exposed damage. | Existing checks retained. Final clips need contact revalidation. |
| Player defense | All-angle held block, fresh parry, unblockable bypass, guard recovery, guard-break stun. | Existing implementation retained; logic and group/kick browser regression. |
| Dodge/roll and perfect rewards | Vulnerable phases, threat-origin check, ordinary/perfect avoidance, slow-motion input lock, source-bound opportunity and roll forfeiture. | Existing checks retained; final directional motion deferred. |
| Riposte | Obstacle/body routing, source retention, guaranteed contact, defense break, invalid route preserves opportunity. | Existing implementation retained; source-bound and distant-counter checks. |
| Targeting/camera/retreat | Stable selection, attack intent, defensive switching, urgent red priority, Shift-away escape, obstructions. | Existing implementation retained; camera/group/retreat checks. |
| Enemies | Pursuit, unequal surround goals, independent choices, guard pressure, fixed break window, warning rearming. | Existing implementation retained; difficulty tuning deferred. |
| Damage/death | Interruptions, reaction states, brief protection from unavoidable hit chains, death/reset. | Existing implementation retained; final reactions are placeholder. |
| Passive healing | Design specified recovery below half after inactivity; inspection found no implementation. | Added living-player recovery after 4 inactive seconds at 5 health/second, capped at 50. Movement alone does not interrupt. Provisional new-mechanic values, not a general balance pass. |
| Finisher | Low health + broken defense + reach + deliberate F was designed but absent. | Added Rising Cleave, then all-five safe/compatible selection, event timelines and detachment; details and update below. |

## First functional finisher

- Living enemy, **30 or less health**, currently broken defense, within **2.4m**. Fresh F deliberately activates; normal attacks never auto-execute. A temporary prompt appears by the eligible target.
- Prefer eligible focus; otherwise nearest safe eligible enemy with deterministic ties. If the preferred pair cannot fit, try another safe pair. No space means no activation/state consumption.
- Reject overlapping starts, blocked alignment, obstacles between the pair, blocked victim displacement, and other living bodies in the action corridor. Check the complete planned body travel before activating. Final sword/armor mesh-clearance validation remains a final-asset task.
- No activation during player death/stun/evasion, held guard/fresh parry, committed swing, pending braking, dash, slow motion, or impact freeze. Preparation/late-recovery cancellation obeys existing commitment rules.
- Provisional timing: 0.28s continuous alignment to 1.2m spacing; one lethal event at 0.85s; kick/separation at 1.3s; control returns at 2.1s. Temporary thrust/rise/kick and victim-fall poses establish mechanics, not final clips.
- Normal movement/attack/defense input is discarded during the action; held inputs require release. Escape/blur still pause; no action time advances while paused. Drill changes/reset clear the pair.
- Victim break timer is reserved during execution. Source death/invalidity before lethal cancels safely; the action's own lethal event does not cancel the remainder. Damage/death applies once.
- Clear all bystander commitments/warnings/contact state on entry. Living bystanders keep repositioning around a reserved collision corridor without striking. Exit gives fresh ready timers/new windups, never a resumed stale hit.
- Camera blends closer with a small side angle using existing wall-orbit/fade handling, then eases out; no cut/manual camera input.
- Executed target stays dead in a temporary final pose; reset clears corpse/hold state. This initial limitation is superseded by the all-five mechanics/detachment update below; final authored sequences and blood presentation remain deferred.

## Verification and remaining work

Logic checks cover eligibility, focus priority, blocked paths, reservation lifecycle, continuous alignment, one-shot lethal timing, invalid/dead-source cancellation, bystander movement/hold/fresh windup, corpse/reset, camera continuity, and passive healing's activity/cap/death rules. Browser checks exercise actual input and combat-earned activation alongside existing combat regressions. Consult UPDATES.md for completed run results and limitations.

All-five compatibility/selection and detachable-part mechanics are now implemented as described below; final choreography remains deferred. Final player movement, clips/rig/materials, gore presentation, and paired animation cleanup remain deferred. Waves/rewards and production UI/maps/weather have not begun in this audit.

## All-five selection and detachment follow-up

The authorized follow-up adds ordered compatibility-aware selection with stable prompt polling and preference advancement only after activation. Checked multi-point paths support the Helmet Bash route around the target and Sword-Arm Sever's outside step; every player path avoids the victim collider. Lateral cuts require a conservative blade corridor, and tight spaces can fall back to compact Disarm. Invalid body/weapon configurations cannot select incompatible variants.

Definitions own event timelines: drop sword, sever head, sever arm, lethal, and control return. Each event is consumed once; cancellation clears pending events; death from the action's lethal beat does not cancel its recovery. The head/arm snapshot is extracted from the current skinned pose, with matching original/ink removal and separation caps. Detached arm retains its held weapon; disarm/drop cannot duplicate it.

A shared debris manager owns cloned geometry/materials, floor settling/root obstacle motion, a ten-second game-time lifetime, a twelve-object limit, and disposal on reset/expiry/eviction. Reset restores character regions, caps, weapon, compatibility and action events. Final animation/mesh seam cleanup and blood presentation remain deferred.

Extended tests cover all five open-space paths/events, compatibility exclusions, tight-space fallback, rotation stability, pre-lethal cancellation, actual posed geometry/weapon ownership, cap/reset, floor settling, lifetime/limit/disposal, and browser input/crowd scenarios. See UPDATES.md for completed results.

Crowd reservation refinement: reserve broad-cut blade space as well as body routes, reject entries enclosing a living bystander, refresh positioning goals at action entry/exit, and probe candidate paths from each bystander rather than the player inside the reserved area. Default non-finisher surrounding keeps its existing behavior. This prevents execution reservations from making all new positioning probes look blocked.
