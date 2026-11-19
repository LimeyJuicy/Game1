# Animation source shortlist

Researched 2026-11-18. Research only: no new assets downloaded, retargeted, loaded, or visually approved. Goal: compare coordinated authored walking against AT-003 before further procedural tuning. No Blender installation required for the proposed browser experiment.

| Source | Verified availability | Practical fit / outstanding checks |
| --- | --- | --- |
| [Quaternius Universal Animation Library](https://quaternius.itch.io/universal-animation-library) | Free Standard download; Pro/Source tiers paid. Creator lists CC0, humanoid motion, Mixamo compatibility, GLB Unreal exports and root-motion / in-place variants. Advertised 120+ count describes the library; exact free subset not inspected. | First download candidate for browser inspection. Verify Standard contents, walk quality, skeleton mapping, scale, and foot contacts on our rig before adoption. GLB format does not guarantee drop-in compatibility. |
| [Mixamo](https://www.mixamo.com/) / [Adobe FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) | Free Adobe ID required; Adobe permits royalty-free use of animations/characters in personal and commercial games. | Existing Soldier reference already uses a Mixamo rig. Good candidate for alternate authored walks/runs; login and actual downloaded clip inspection still required. Existing rig compatibility is a useful starting point, not proof of exact mapping. |
| [Epic Game Animation Sample](https://www.fab.com/listings/880e319a-a59e-4ed2-b268-b32dac7fa016) | Official listing: Free, 500+ animations, walk/run/jump/fall and motion matching; included format Unreal Engine. [Official current overview](https://www.unrealengine.com/tech-blog/download-the-latest-game-animation-sample-project-now-updated-for-ue-5-8). | Strong locomotion study candidate, but delivered as an Unreal project, not browser-ready GLB. Export/retarget workflow and applicable terms must be resolved before asset use. Listing displays “Allows usage with AI: No”; do not assume this authorizes AI-assisted asset processing. No project acquired or processed. |

## Proposed comparison

First inspect the existing local Walk with only pelvis/legs active. Then inspect a free Quaternius Standard walk if available. Compare identical rig, camera, playback phase and cadence, using visible heel/forefoot contacts, knee extension, pelvis transfer and recovery arcs. Select for observed motion quality rather than library size. Preserve source attribution and distinguish retargeted clips from newly authored motion. Upper-body animation and main-game integration remain outside this experiment.

## Selected locomotion direction — 2026-11-18

User specifically likes the Quaternius walking, sprinting, sprint-enter and sprint-exit animations. Treat these as the preferred source-motion candidates, pending inspection and confirmation of download-tier availability. This is approval of the creator previews, not approval of a retargeted result in our workspace.

Next experiment: inspect these clips on their supplied rig first, then isolate pelvis/legs for the initial study. Establish the walk loop before sprint. Subsequently test sprint entry → sprint loop → sprint exit, preserving authored weight transfer and testing pose continuity, foot contacts, facing, scale and root-motion policy at each transition. Do not substitute a longer/slower walk for sprint entry or simply crossfade arbitrary clip endpoints without checking contacts. Main-game integration and final upper-body work remain separate.

Download attempt: official itch.io free-download endpoint returned a link, but following that link returned HTTP 429. No Standard ZIP or new animation assets were acquired. Public creator viewer HTML was reachable, but does not establish the Standard ZIP contents or clip quality on our rig. Stop download attempts for this session; a user-supplied Standard ZIP can unblock local inspection. No claim that the four selected clips are all in the free edition yet.

## Supplied Standard edition inspected — AT-004

User supplied the library locally, resolving the download obstacle. Both bundled GLBs inventory 43 clips. Walk_Loop, Walk_Formal_Loop, Jog_Fwd_Loop and Sprint_Loop are present; sprint-enter/exit are absent from both inventories. Bundled README confirms root-motion and in-place variants; bundled license confirms CC0. In-place asset now loads in the isolated showcase with derived pelvis/legs-only clips; see AT-004-QUATERNIUS.md and reports/quaternius-manifest.json. No retargeting or main-game integration yet. This supersedes earlier unknown local availability, not the recorded HTTP 429 history.

## Sword-carry replacement research after AT-006 rejection

User rejected procedural carry as anatomically broken and explicitly stopped programming. Research only; code unchanged and rejected viewer still exists. No claim that an exact replacement has been visually verified.

- [Raise Creation — Sword Running Animations preview](https://www.youtube.com/watch?v=wdtLFecpuNk): creator describes 38 sword/melee running animations, 30fps. Paid offering; exact price/license/download package not verified. Most directly targeted running reference located. Video content could not be fetched by browsing tool, so no claim of having watched or approved the wrist pose.
- [MoCap Online — free T.C. Sword pack](https://mocaponline.itch.io/free-3d-sword-animation-pack): official 55MB ZIP listing, sword-motion pack, FBX and other formats. [Vendor product](https://mocaponline.com/collections/free-mocap-animations/products/tc-sword) confirms $0 and describes licensing; specifically requires AI Usage Permit for AI applications. Do not assume unrestricted AI-assisted processing. Collection describes one-handed sword movement, but exact free locomotion inventory and desired carry pose remain unverified. [Creator-linked preview](https://www.youtube.com/watch?v=dIg4gYjR0BY) could not be fetched. Candidate/reference only, not downloaded or processed.
- [Explosive — free RPG sample](https://www.explosive.ws/products/rpg-character-mecanim-animation-pack-free): 88-clip evaluation pack; update history confirms two-handed sword animations. Publisher explicitly says videos include clips absent from free edition. Lower priority for the desired one-handed carry; neither exact movement inventory nor browser suitability verified.

Do not replace a confirmed visual target with a long generic asset list. Next decision is reference/pose selection, with natural wrist continuity and fixed grip judged together with elbow/shoulder motion. Existing Quaternius source walk remains the accepted unmodified locomotion baseline. No downloads, signups, purchases, messages or animation/code changes this research session.
