"""Run from the repository with npm run rig:prepare (requires installed Blender)."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

base = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--blender', help='Blender executable path; BLENDER_BIN is also supported')
parser.add_argument('--check', action='store_true', help='Check availability without opening/exporting the rig')
args = parser.parse_args()
candidates = [args.blender, os.environ.get('BLENDER_BIN'), shutil.which('blender'),
              '/Applications/Blender.app/Contents/MacOS/Blender',
              str(Path.home() / 'Applications/Blender.app/Contents/MacOS/Blender')]
binary = next((str(Path(value).expanduser()) for value in candidates if value and Path(value).expanduser().is_file()), None)
if not binary:
    print('Blender is not installed/found. The working copy and browser viewer are ready.')
    print('After installing Blender, rerun npm run rig:prepare, or pass -- --blender /path/to/blender.')
    sys.exit(0 if args.check else 2)
print('Blender executable:', binary)
if not args.check:
    command = [binary, '--background', '--disable-autoexec', '--python-exit-code', '1',
               '--python', str(base / 'tools/inspect_export.py'), '--',
               '--source', str(base / 'working/Examplerig-testing.blend'),
               '--report', str(base / 'reports/rig-inspection.json'),
               '--export', str(base / 'viewer/public/rig.glb')]
    completed = subprocess.run(command, check=False)
    if completed.returncode:
        sys.exit(completed.returncode)
    exported = base / 'viewer/public/rig.glb'
    if not exported.is_file() or exported.read_bytes()[:4] != b'glTF':
        raise RuntimeError('Blender did not produce a valid GLB header.')
    manifest_path = base / 'viewer/public/workbench.json'
    manifest = json.loads(manifest_path.read_text())
    manifest.update(blender_available=True, export_available=True,
                    inspection_status='Export generated; review reports/rig-inspection.json and inspect deformation in the viewer.')
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    print('Export ready. Start npm run rig:dev to inspect it. No .blend file was saved or overwritten.')
