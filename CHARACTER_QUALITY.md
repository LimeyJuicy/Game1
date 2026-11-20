# Character and animation quality sample

**Current weapon decision — 2026-11-19, AT-017 revision:** use the resized sword single-handed in the right hand; the left arm is free. The review profile uses scale 0.34 (about 1.10 m on the knight). This supersedes the earlier two-handed shoulder carry. Two-hand-specific directions below describe earlier studies, not current requirements. Single-handed travel poses and final animation polish still need review.

**Current model work:** user pivoted from animation to the player model. The existing viewer at http://127.0.0.1:5174 now opens the user-selected GLB as a static knight with animation tools hidden. The original has embedded materials but no rig; a separate experimental fitted derivative is now available for motion review (see Animation Testing/AT-009-KNIGHT-RIG.md); the previous native mesh remains available at /?model=legacy. See [PLAYER_MODEL.md](PLAYER_MODEL.md) for the supplied armor reference, rebuilt geometry and review limits. Animation tools remain preserved at /?mode=animation. Neither the rejected AT-006 carry nor this first model pass is visually accepted as final.

**Latest scheduling decision — 2026-11-18:** core gameplay/combat mechanics first using existing practice/debug UI, test arena, and placeholder motion. Waves/rewards, weather, final UI, maps, and balance are deferred until after core mechanics and before final animation production/polish. Earlier conflicting sequencing is superseded by [CODING_PLAN.md](CODING_PLAN.md#updated-production-order--2026-11-18). Existing motion remains visually unaccepted; preserve its quality requirements for the final phase. This documentation update does not itself resume coding.

Latest review, 2026-11-18: the user reports awkward duck-like legs and insufficient pelvis, torso, head, arm, and shoulder movement. The sample is not visually accepted. Player-animation refinement remains deferred to the final production phase; the later core-mechanics work was separately authorized. See [PLAYER_MOVEMENT_SPEC.md](PLAYER_MOVEMENT_SPEC.md) for the complete intended body-mechanics reference.

Approved direction: believable human anatomy with modest armor exaggeration; agile sword handling powered by body mechanics; flowing, calculated, forceful motion; swift controlled evasions; clean ink contours and broad painted shading. Ghost of Tsushima is a movement/proportion reference and Chivalry 2 an armor reference, adapted to the established silver/red bat knight. No assets from those games are included.

## Where to review

Use **Character & animation study** in the courtyard practice panel, or open `/?study` on the running local app. The study provides a connected sequence, individual actions, front/side/back views, and motion pause. Inspection views are separate from the automatic gameplay camera.

The same native skinned character is used in actual player/enemy combat. Test both the inspection view and the courtyard; a pose looking good from the side does not establish gameplay readability.

## Sample implemented

- Human-proportioned fitted armor, shaped armet and black slit, gorget, red chest cloth and bat crest, split mail panels, gauntlets, articulated greaves and boots.
- A weighted skeleton with pelvis, multiple spine segments, clavicles, shoulders/elbows/forearm twist, wrists/hands/fingers/thumbs, hips/knees/ankles/toes.
- Human-length limb solving, limited shoulder protraction, planted foot targets, and sword-grip tracking.
- One-handed travel carry with the point clear of the floor and smooth transitions into single-handed combat poses.
- Representative walk/sprint/braking, three light cuts, three heavy directions, guard/parry, controlled dodge/roll, kick, and reactions on the shared character.
- An occasional backspin-to-sweep heavy variant, also explicitly selectable in the study. Gameplay uses it once per six heavy actions after the first ordinary cycle. Timing, damage, reach, commitment, hit windows, root facing, and camera behavior remain ordinary heavy rules.
- Interrupted strikes blend back toward the current stance; cancelling a backspin retains its initial visible orientation and eases out without snapping the gameplay root.
- Clean toon shading, ink contours, restrained surface variation, and procedural mail detail. This is an original native sample, not an imported commercial animation pack.

## Acceptance review

The following are visual acceptance criteria, not a claim that tests can certify professional animation quality.

- [ ] Proportions read as a fully clothed human knight, without a chunky or disconnected-limb silhouette.
- [ ] Armor shape, helmet, and bat heraldry fit the intended character; confirm the precise helmet reference before locking production geometry.
- [ ] The right hand stays physically attached to the sword; the free arm contributes to balance and expression.
- [ ] The supporting hand joins/leaves the sword naturally during carry, guard, and attack transitions.
- [ ] Feet support the body, match travel, and stay grounded without conspicuous sliding.
- [ ] Deep load, fast blade travel, weight transfer, follow-through, and recovery feel connected and calculated.
- [ ] Swift dodges remain balanced and ready; the actor never looks as though he is scrambling.
- [ ] Backspins are stylish and occasional, and enter/exit cleanly without a camera spin or gameplay advantage.
- [ ] The enemy knee/boot telegraph remains readable from the actual close third-person view.
- [ ] Ink, silver plate, red cloth, mail, and leather read clearly in the courtyard and inspection lighting.
- [ ] Character and animation cost remains acceptable on the agreed reference device; a device/frame-rate target still needs to be chosen.

## Remaining production work

The native sample establishes a reviewable rig and representative motion. It does not complete the minimum 24-light/six-heavy final execution library, polished authored motion clips, hand/foot cleanup across every transition, final cloth motion, final material painting, or the five paired finishers. Final-asset acceptance follows the user's visual review, not merely a passing build or automated checks. See [animationslist.md](animationslist.md) for coverage and [UPDATES.md](UPDATES.md) for change history.
