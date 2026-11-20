# Player sword — supplied asset

## Current direction — single-handed, 2026-11-19

User requested switching to a single-handed sword and resizing the current model. The AT-017 cut/footwork preview uses the original approved mesh at attachment scale 0.34 (previously 0.54), measuring about 1.10 m on the 1.8 m knight instead of 1.75 m. Right-hand grip is recalibrated for the smaller handle; left arm is free. Configuration: `src/animation/assets/single-hand-sword.json`; adapter: `src/animation/singleHandSword.ts`. Original OBJ/MTL/textures/GLB bytes are preserved. Earlier two-handed studies below remain historical comparison modes. This preview scale is not yet migrated into the native live-game actor.


User supplied `Sword.obj`, `Sword.mtl` and a `Textures/` directory. Originals remain unchanged. The OBJ contains 2,461 source positions, 4,688 triangles and eight objects: blade, guards, guard end, grip wrap, grip rings, pommel and its connecting piece. One material and supplied UVs/normals.

## Browser review

Run `npm run rig:dev`, then open http://127.0.0.1:5174/?model=sword . Uses the existing static viewer with orbit, zoom, front/side/three-quarter controls and wireframe. Default knight review and animation experiments remain available. Sword has no skeleton. The AT-011 animation preview now attaches it to the knight's right hand and constrains the left hand to the same handle; combat integration remains pending.

Derived asset: `Animation Testing/AT-001-Rig-Workbench/viewer/public/models/player-sword.glb`. Rebuild with `npm run rig:sword` (Python 3 + Pillow). Inventory, source checksums and derivative checksum are in `reports/sword-import.json` under that workbench. Output is approximately 10.9 MB.

## Conversion details

The MTL refers to absolute Windows paths that do not exist here and lists a green diffuse fallback. The converter uses the supplied PBR Metallic Roughness texture set directly, with white base-color factor, rather than preserving that fallback tint or Phong material interpretation. Metallic/roughness maps are packed into blue/green channels per the [glTF specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#metallic-roughness-material). Base color, normal and combined metallic/roughness textures are embedded PNGs.

Geometry positions, normals, object groups and UV seams are retained. Faces are triangulated; texture V coordinates are inverted for glTF image coordinates. Preview-only texture derivatives are reduced from 4096 to 2048 pixels; tangent normals are renormalized after downsampling. Original texture files remain untouched, including height and alternate Unity/Unreal sets. Height is not applied as displacement. Tangent normal convention assumes the supplied PBR set uses OpenGL normals; verify appearance before final acceptance.

Blade extends along +Y. Original bounds: X -0.143882..0.144052, Y -0.319719..1.478455, Z -0.034203..0.034086. Origin is around the grip. Original scale is retained in this standalone preview; the AT-011 preview uses scale 0.54 relative to the normalized knight, producing a 0.971-unit sword for the 1.0-unit knight. Finger closure and final visual fitting remain subject to review. No animation changes, added sword rig or final-quality claim. User-supplied source; independent licensing terms have not been provided.


## Two-handed shoulder carry — AT-011

User identified this as a two-handed sword and requested **both hands, over the shoulder**. Preview: http://127.0.0.1:5174/?mode=animation&reference=rigged-knight . The carry checkbox switches between the adapted clips and supplied source motions. Idle, walking, formal walking, jogging and sprinting have shoulder-carry variants; the original 43 clips remain intact. Right hand is nearest the guard, left hand toward the pommel. Socket spacing is 0.1107 knight units, fixed on the supplied handle.

`viewer/twoHandCarry.ts` creates derived arm tracks at 60 fps while retaining source pelvis, legs, trunk, neck/head and clavicle tracks. Shared sword pose follows chest travel and torso yaw; full sprint pitch is excluded from blade orientation to keep the weapon laid back. Analytic arm solving respects original limb lengths. A fixed right-hand socket owns the actual imported sword; the left hand tracks the second grip. No changes to the earlier rejected carry implementation. Original hand/finger bind poses are retained: this is a grip-placement study, not completed finger deformation or final motion polish. Carry/guard/attack transitions, collisions and combat integration remain later work. Derived tracks/weapon assembly are constructed in the viewer, not exported into the original knight GLB.


## PR footwork bench — AT-012

The supplied knight and two-handed shoulder-carried sword are now the default at http://127.0.0.1:5175/ (`npm run footwork:dev`). All PR #1 footwork controls are retained; earlier native knight is a comparison option. Original static review and source assets are preserved. See [AT-012 notes](Animation%20Testing/AT-012-KNIGHT-FOOTWORK.md). This is bench adaptation, not new-asset combat integration or final motion acceptance.

## Expanded single-handed review library — AT-018

The same preserved mesh/0.34 attachment profile is used across the animation library at `/?animations`. Right fingers retain a closed sword grip for unarmed/full-body source motions while the left arm remains free. Source clips are selected/retargeted through shared data/evaluation. Travel-carry angle and fitted finger/armor weights remain review work, and live-game actor migration is still separate. See Animation Testing/AT-018-Animation-Library/README.md.
