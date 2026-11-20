# AT-009 — Supplied knight body rig

Status: first fitted body rig, available for review. Not integrated into combat or visually accepted by the user.

## Review

Run `npm run rig:dev` at the project root, then open:

- Motion: http://127.0.0.1:5174/?mode=animation&reference=rigged-knight
- Static fitted bind pose: http://127.0.0.1:5174/?model=rigged
- Original static model: http://127.0.0.1:5174/

Use clip selection, pause, timeline, playback speed and the view buttons. Toggle skeleton/wireframe to inspect weights. The rejected AT-006 carry is not applied. AT-011 now adds an optional two-handed shoulder carry using the supplied sword; disable the carry checkbox or select a supplied clip to inspect the original motion. No additional site or Blender installation is needed.

## Assets and reproduction

Under `AT-001-Rig-Workbench/viewer/public/models/`:

- `red-herald-knight.glb`: user-approved original; unchanged, no skeleton.
- `red-herald-knight-rigged.glb`: separate derivative with 66 bones and 43 fitted Quaternius clips.

`npm run rig:knight` rebuilds the derivative and `reports/knight-rigging-report.json`. `npm run rig:verify` checks the serialized artifact and writes `reports/knight-rig-verification.json`. These run locally without uploading the model. Source motion is the existing `public/reference/Quaternius-UAL1-Standard.glb`.

The builder fits named anatomical guides, calculates weights, restricts anatomical regions, applies continuous torso/arm and lower-body weight fields and welds coincident UV seam influences. It writes new skin attributes, inverse bind matrices and retargeted animation channels while retaining the original binary data, materials, images, UVs and geometry accessors. Source world motion is sampled at 30 fps with compensation for fitted bone axes and scaled root/pelvis translation. This is actual skinning and animation data in the GLB, not a screenshot or shader illusion.

## Evidence and limitations

Structural verification checks every vertex's normalized weights/joint indices and bind-pose reconstruction, the unchanged original SHA-256 and original binary prefix/materials, all 43 clips' finite channels, increasing key times and normalized rotations. Maximum reconstructed bind error: approximately 5.11e-8 original units across 167,063 vertices. Browser case verifies static loading and supplied idle/walk/sprint clip selection and captures front/side poses without page errors. Viewer build passes. These checks do not certify deformation quality.

Agent-inspected walking and sprinting captures show major early arm/hip spikes resolved. Remaining issues include bending of rigid plate near elbows/shoulders, fingers needing grip review, and cloth stretched between leg influences in wide strides. The source is a dense single mesh with UV chart islands, not clean separate armor/cloth pieces. Continuous garment weighting prevents incompatible cloth/body transforms but is not cloth simulation. Independent garment motion needs deliberate mesh separation and cleanup. Other clips are structurally checked but not all visually reviewed. AT-011 provides sword attachment in the isolated viewer; combat animation integration and final asset optimization remain future steps.

Early failed 78-bone cloth-driver pass is documented in `reports/AT-009-first-pass/`; it is not the current output. Current rig has 66 bones. Stretch diagnostics are reproducible with `node "Animation Testing/AT-001-Rig-Workbench/tools/rigging/inspect-rig.mjs" Sprint_Loop 0.2`. It flags triangle-edge elongation, including expected joint/garment deformation, and is a diagnostic rather than a pass/fail quality test.

## Sources

- [Mesh2Motion](https://github.com/Mesh2Motion/mesh2motion-app): local initial skin solver subset, MIT ©2025 Scott Petrovic. License and local adaptations retained under `tools/rigging/vendor/mesh2motion/`. No external account or service used.
- [Quaternius Universal Animation Library](https://quaternius.itch.io/universal-animation-library): existing local CC0 source skeleton and motion. Motions are retargeted reference clips, not newly authored original animations.
- Knight: user-supplied Tripo GLB. Independent asset license terms have not been supplied; no new licensing claim made.
