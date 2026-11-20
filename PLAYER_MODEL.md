# Player model — current work

## Current model — supplied GLB

The user chose `/Users/tajclement/Downloads/red-herald-knight.glb` instead of the native modeled knight. The existing viewer now defaults to a byte-identical project copy at `Animation Testing/AT-001-Rig-Workbench/viewer/public/models/red-herald-knight.glb`. Original geometry, UVs and embedded base-color/metallic-roughness/normal textures are preserved. No texture recoloring or replacement heraldry applied.

Verified GLB contents: 15,359,920 bytes; one mesh, 167,063 vertices, 309,910 triangles, three embedded images, no skeleton/skin and no animation clips. Exporter metadata identifies Tripo. Bounds are normalized to height 1.0 in original file units; viewer retains this scale and centers the display. Gameplay scale and a compatible skeleton require a separate integration step. This is now the chosen model source, not a claim that it is rigged or optimized for browser combat. User-supplied provenance; independent source/license terms have not been provided. See reports/imported-knight-manifest.json for checksum and inventory.

Default review: http://127.0.0.1:5174. Motion UI stays hidden. Upper-body framing works without named bones. Previous native knight is preserved at `/?model=legacy`; earlier animation experiments remain at `/?mode=animation`.

## Earlier direction and modeling history

User paused animation authoring after rejecting AT-006 carry, and pivoted to the knight model. Reuse the existing viewer; do not create another site. Hide animation controls rather than deleting animation experiments. This file tracks modeling separately from motion acceptance.

## Review

Open http://127.0.0.1:5174 (`npm run rig:dev`). Default is a static view of the supplied GLB; the earlier native knight remains at /?model=legacy. Drag to orbit, scroll to zoom and right-drag to pan. Front/side/back/three-quarter/upper-body framing and wireframe remain visible. GLB loading is still available. No animation action, procedural walking, sword-carry solve, or ground travel runs in model mode.

Animation tools, reference assets, code and experiments are preserved at `/?mode=animation`. Existing query parameters can be combined, e.g. `/?mode=animation&carry=off` and `/?mode=animation&reference=soldier`. The rejected carry remains rejected; preserving its inspection route does not approve or resume authoring.

## Supplied armor reference and replacement geometry

User rejected the first geometry pass as a few shapes blobbed together and supplied `assets/reference/knight-red-heraldry-reference.png`. Use it for fitted human proportions, construction of the helmet/plate harness, long central split cloth, chainmail coverage, gauntlets and articulated footwear. The image is a visual reference supplied by the user; it is not used as a texture or represented as a licensed 3D asset. Keep our black bat heraldry instead of the image's lion. Rendering should retain the game's illustrated identity rather than copying every photoreal surface detail.

The preserved native review profile builds geometry in `src/knightModelGeometry.ts`. It replaces the old review primitives with explicitly sampled armor surfaces: fitted breast/back plate, gorget, crested helmet bowl and visor, shoulder caps and partial lames, tapered arm harness, shaped elbow/knee plates and outer wings, gauntlet palms and jointed fingers, waisted belt/buckle, wrapped mail, long bordered surcoat panels and tapered sabaton plates. Shoulder joints are closer to the ribcage; a relaxed static arm pose exposes the silhouette. Gameplay retains its exact original geometry path.

Metal uses a studio environment, lower ink thickness and physically lit silver; cloth/mail retain simplified shading. Static viewer rendering updates on camera/model/wireframe changes, with a cached shadow map. It does not continuously redraw a still character. Helmet visor and brow wrap toward the cheek hinges; under-mail is sized inside the plate instead of sharing intersecting radii. Exact reference matching, production topology and motion acceptance remain unproven. The reference’s fine sculpting, wear, fabric detail and production finish are still ahead.

## Earlier first geometry pass (superseded)

Built on the project's existing weighted native knight, preserving its 55-bone anatomy and material/region structure. `createHumanRig(..., { modelReview: true })` enables new geometry only for the model viewer. Ordinary gameplay callers retain the previous default appearance. No gameplay movement or combat rules changed.

- Refined breastplate profile with fitted waist and shaped chest. Front and rear red cloth conform to the armor surface.
- Longer mail hauberk: two wrapped side halves with openings at front/rear, instead of two thigh cylinders. Longer split heraldic panels.
- Layered shoulder lames, longer upper/forearm plate coverage, elbow wings, forearm straps and rivets.
- Narrow enclosed eye slit, shaped visor, helmet ridge, hinges and vents. Exact historical armet construction remains provisional pending a precise reference.
- Curved overlapping sabaton plates and a tapered boot upper, replacing the prior stacked ellipsoid footwear in this review profile.
- Bat crest follows the cloth surface, with added hooked feet/claws. Subdivided the crest before surface projection after screenshot inspection found large triangles clipping through the cloth.
- Lighter silver material palette while retaining existing toon shading and ink contours. Final illustrated textures have not been authored.

Baseline images are preserved in Animation Testing/AT-001-Rig-Workbench/reports/model-baseline. Current screenshots are reports/knight-model-{front,side,back,three-quarter}.png. They document the static review; passing checks are not visual approval.

## Remaining work

This is an initial geometry pass, not a production-ready character. Refine anatomy/armor silhouette from user feedback, then helmet construction, gauntlets/fingers, mail/cloth thickness and edges, fittings and ornament. UVs/textures, topology/weight cleanup, joint clearances, final rig/asset format and eventual animation compatibility need review. Static presentation does not establish good deformation. No new original animation is being authored. An experimental fitted derivative now includes retargeted Quaternius motion; see the rig review below.


## Experimental fitted rig — AT-009

A separate `red-herald-knight-rigged.glb` now contains a fitted 66-bone skeleton and 43 retargeted Quaternius clips. The original static GLB and all its geometry/texture bytes remain intact. Default model review still shows the original; gameplay has not been changed.

Review animation: http://127.0.0.1:5174/?mode=animation&reference=rigged-knight . Static bind pose: http://127.0.0.1:5174/?model=rigged . Select supplied clips, pause/scrub, rotate the view and optionally show the skeleton. The rejected procedural sword-carry adaptation is disabled for this rig. AT-011 now adds a separate two-handed shoulder carry using the supplied sword; see PLAYER_SWORD.md.

This is an initial body rig, not a production-ready skin or user-approved animation result. Idle, walk and sprint poses were inspected; plate bending, finger placement and cloth deformation still need cleanup. Garment follows pelvis/leg weights rather than separate simulated cloth. Other included clips have structural validation but have not all been visually reviewed. See [AT-009 rig notes](Animation%20Testing/AT-009-KNIGHT-RIG.md) for reproduction, evidence and limits.


## PR footwork bench — AT-012

The supplied knight and two-handed shoulder-carried sword are now the default at http://127.0.0.1:5175/ (`npm run footwork:dev`). All PR #1 footwork controls are retained; earlier native knight is a comparison option. Original static review and source assets are preserved. See [AT-012 notes](Animation%20Testing/AT-012-KNIGHT-FOOTWORK.md). This is bench adaptation, not new-asset combat integration or final motion acceptance.
