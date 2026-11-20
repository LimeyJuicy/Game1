# Mesh2Motion solver subset

Source: https://github.com/Mesh2Motion/mesh2motion-app/tree/main/src/lib/solvers
Retrieved 2026-11-18. MIT, copyright 2025 Scott Petrovic; license retained. Solver sources copied with .ts import suffixes for local Node execution. Utilities.ts retains only the six solver-facing upstream methods. RigConfig.ts is a local human-only adapter. The CC0 skeleton/animations used by the rigging tool come from our separately attributed local Quaternius pack, not from this code license. No account or remote upload is used.

Local adaptations: string enums converted to equivalent const/type pairs for Node type stripping; WeightCalculator crotch guard compares vertex Y to ray-intersection Y instead of a pelvis-distance scalar. All other solver logic retained.
