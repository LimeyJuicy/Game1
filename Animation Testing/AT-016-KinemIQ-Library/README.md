# AT-016 — KinemIQ sword and combat animation downloads

Downloaded public source clips for review, 2026-11-19. This collection is separate from the live game and the Phase A pose evaluator. Nothing has been retargeted, replaced or visually approved on the knight.

## Files and use

- `clips/`: unmodified GLB animation files, including their source humanoid skeletons. Most contain no visible character mesh; opening them alone may show only a skeleton. They are motion sources for a rig, not replacement knight models.
- `INDEX.md`: readable list of every selected animation, duration, category, licence and local file.
- `manifest.json`: source/download URLs, original source asset names, provider retargeting notes, root motion, hashes, byte sizes and per-file structural validation.
- `CREDITS.md`: per-animation source and licence attribution, including community contributors and upstream authors. Attribution is required for CC BY entries. Downloading preserves those obligations.
- `source/catalog.json`, `source/community.json`: public metadata snapshots used to select the collection.
- `verification.json`: actual Three.js GLTFLoader decoding results, separate from mathematical GLB validation.

The selection includes all available non-test sword attacks, sword idles, blocks, recoveries and combos; defensive blocks and dodges; hits, knockdowns and recovery; fighting stances, advancing/retreating and sideways/backwards footwork; unarmed punches/kicks and shield techniques useful as combat/finisher references. Optional aerial/spinning/shield/lunge-style clips are labelled as references. Unrelated farming, dancing, firearms, bow/spell and zombie actions are excluded. Community combat/reaction clips and two directional locomotion variants are retained separately.

Some clips overlap the project's Quaternius Universal Animation Library 1. These downloads also include Quaternius UAL2, ACCAD and 100STYLE sources and community variants. Do not assume every file is a new technique, matches the game's grounded style, uses a two-handed sword, or can be played directly on the knight without calibration. Source root motion is retained, not silently stripped. Durations and trajectories are source timing, not adopted gameplay timings.

## Reproduce and verify

From the project root:

```sh
python3 "Animation Testing/AT-016-KinemIQ-Library/tools/download.py"
node "Animation Testing/AT-016-KinemIQ-Library/tools/verify.mjs"
```

The downloader uses the saved catalogue snapshots, four concurrent public-file requests, normal TLS-verified curl, validation before writing files, and revalidates existing files without downloading them again. It requires network access only for missing clips. It does not sign in, purchase exports, upload models, publish anything or change combat rules.

Structural checks cover GLB headers/chunks, embedded buffers, indices, finite animation values, monotonic time keys and matching sampler counts. The Three.js pass checks hashes and decodes every animation/track. These checks establish asset integrity, not animation artistry, joint suitability, correct knight proportions or weapon-hand contact. Applying and previewing selected clips on our knight is subsequent work.

## Verified collection

175 GLBs downloaded, 52,551,560 bytes total (52.55 MB / 50.12 MiB); no failed downloads or identical-byte duplicates. The set contains 33 sword clips, 49 unarmed/shield clips, 36 combat footwork/guard clips, nine other blocks, nine dodges, 14 reaction/support clips, four locomotion baselines, 16 optional style references and five community variants.

All 175 pass structural/key-data checks and load through Three.js GLTFLoader. Every animation track resolves to a scene joint and AnimationMixer evaluation at start/middle/end produces finite transforms. The 170 built-in library files expose skin-declared bones. Five community files instead contain a named 66-joint transform hierarchy without a skin declaration; these load and animate, but require explicit binding/retargeting to a skinned character. This distinction is recorded in verification.json, not treated as missing animation.

Acquisition notes: Python urllib on this Mac initially failed local certificate-chain verification; the downloader uses TLS-verified curl instead (certificate verification was not disabled). The initial Three.js verification incorrectly required isBone even for valid transform-only community exports; after inspecting their named animated hierarchy, verification now checks actual joint presence, track binding and sampled animation transforms for both supported forms. No source clip was edited to satisfy validation.
