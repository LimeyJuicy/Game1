"""Runs inside Blender. Inspect/export a working copy; never save the blend file."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

import bpy

parser = argparse.ArgumentParser()
parser.add_argument('--source', required=True)
parser.add_argument('--report', required=True)
parser.add_argument('--export', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
bpy.ops.wm.open_mainfile(filepath=str(Path(args.source).resolve()), load_ui=False, use_scripts=False)
armatures = [obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE']
custom_shapes = {bone.custom_shape for obj in armatures for bone in obj.pose.bones if bone.custom_shape}
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj not in custom_shapes]
report = {
    'source': args.source,
    'working_copy_sha256': hashlib.sha256(Path(args.source).read_bytes()).hexdigest(),
    'blender_version': bpy.app.version_string,
    'embedded_scripts_enabled': False,
    'scene_fps': bpy.context.scene.render.fps / bpy.context.scene.render.fps_base,
    'frame_range': [bpy.context.scene.frame_start, bpy.context.scene.frame_end],
    'armatures': [], 'meshes': [], 'actions': [],
    'notes': ['Inspection/export only: no blend file was saved.',
              'Custom UI scripts/drivers may require separate review; no external add-on was enabled.',
              'The GLB contains render meshes and skeleton/animation, not an editable Blender control-rig UI.'],
}
for obj in armatures:
    report['armatures'].append({
        'name': obj.name, 'scale': list(obj.scale),
        'bones': [{'name': bone.name, 'parent': bone.parent.name if bone.parent else None,
                   'deform': bone.use_deform, 'head': list(bone.head_local), 'tail': list(bone.tail_local)} for bone in obj.data.bones],
        'constraints': [{'bone': bone.name, 'type': constraint.type,
                         'target': getattr(getattr(constraint, 'target', None), 'name', None),
                         'subtarget': getattr(constraint, 'subtarget', '')} for bone in obj.pose.bones for constraint in bone.constraints],
    })
for obj in meshes:
    report['meshes'].append({
        'name': obj.name, 'vertices': len(obj.data.vertices), 'polygons': len(obj.data.polygons),
        'scale': list(obj.scale), 'dimensions': list(obj.dimensions),
        'vertex_groups': [group.name for group in obj.vertex_groups],
        'armature_modifiers': [modifier.object.name if modifier.object else None for modifier in obj.modifiers if modifier.type == 'ARMATURE'],
    })
for action in bpy.data.actions:
    report['actions'].append({'name': action.name, 'frame_range': list(action.frame_range), 'users': action.users})
Path(args.report).parent.mkdir(parents=True, exist_ok=True)
Path(args.report).write_text(json.dumps(report, indent=2) + '\n')
if not armatures or not meshes:
    raise RuntimeError('No armature/render-mesh pair found. Review rig-inspection.json before exporting.')
if bpy.context.object and bpy.context.object.mode != 'OBJECT':
    bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='DESELECT')
for obj in armatures + meshes:
    obj.hide_set(False)
    obj.select_set(True)
bpy.context.view_layer.objects.active = armatures[0]
Path(args.export).parent.mkdir(parents=True, exist_ok=True)
supported = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
settings = {'filepath': str(Path(args.export).resolve()), 'export_format': 'GLB',
            'use_selection': True, 'export_animations': True, 'export_skins': True,
            'export_force_sampling': True, 'export_def_bones': True,
            'export_cameras': False, 'export_lights': False}
result = bpy.ops.export_scene.gltf(**{key: value for key, value in settings.items() if key in supported})
if 'FINISHED' not in result:
    raise RuntimeError('GLB export did not finish.')
print('Rig inspection and GLB export completed. Review deformation and animation before accepting this rig.')
