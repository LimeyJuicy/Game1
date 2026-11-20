"""Package the user-supplied OBJ + PBR textures into a local browser-review GLB.

Original files remain unchanged. Geometry/UV seams and eight object groups are
retained. Preview textures are 2048px PNG derivatives; normals are renormalized
following downsampling. No displacement is applied to the original geometry.
Material packing follows https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html .
Requires Pillow, already available in the project environment.
"""
from pathlib import Path
from collections import OrderedDict
import hashlib
import io
import json
import math
import struct
from PIL import Image

HERE = Path(__file__).resolve().parent
WORKBENCH = HERE.parent.parent
ROOT = WORKBENCH.parent.parent
TEXTURES = ROOT / 'Textures/PBR Metallic Roughness'
OUTPUT = WORKBENCH / 'viewer/public/models/player-sword.glb'
REPORT = WORKBENCH / 'reports/sword-import.json'
LIMIT = 2048

vertices, normals, uvs = [], [], []
groups = OrderedDict()
current = 'Sword'
source_obj = ROOT / 'Sword.obj'
for line in source_obj.read_text().splitlines():
    s = line.split()
    if not s or s[0].startswith('#'):
        continue
    if s[0] == 'v': vertices.append(tuple(map(float, s[1:4])))
    elif s[0] == 'vn': normals.append(tuple(map(float, s[1:4])))
    elif s[0] == 'vt': uvs.append(tuple(map(float, s[1:3])))
    elif s[0] == 'o': current = ' '.join(s[1:])
    elif s[0] == 'f':
        corners = []
        for corner in s[1:]:
            ids = corner.split('/')
            assert len(ids) == 3 and all(ids), 'Expected supplied position/UV/normal corners'
            corners.append(tuple(int(n) - 1 if int(n) > 0 else length + int(n)
                                 for n, length in zip(ids, [len(vertices), len(uvs), len(normals)])))
        group = groups.setdefault(current, [])
        for i in range(1, len(corners) - 1): group.extend([corners[0], corners[i], corners[i+1]])

j = {'asset': {'version': '2.0', 'generator': 'Game1 sword OBJ/PBR packager'},
     'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'name': 'PlayerSword', 'children': []}],
     'meshes': [], 'accessors': [], 'bufferViews': [], 'buffers': [],
     'images': [], 'textures': [], 'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]}
data = bytearray()
def buffer_view(raw, target=None):
    data.extend(b'\0' * (-len(data) % 4))
    view = {'buffer': 0, 'byteOffset': len(data), 'byteLength': len(raw)}
    if target: view['target'] = target
    j['bufferViews'].append(view)
    data.extend(raw)
    return len(j['bufferViews']) - 1

def accessor(values, width, kind, component=5126, bounds=False):
    flat = [x for row in values for x in row] if width > 1 else values
    assert all(math.isfinite(x) for x in flat)
    raw = struct.pack('<' + ('f' if component == 5126 else 'H') * len(flat), *flat)
    a = {'bufferView': buffer_view(raw, 34963 if kind == 'SCALAR' else 34962),
         'componentType': component, 'count': len(values), 'type': kind}
    if bounds:
        a['min'] = [min(row[i] for row in values) for i in range(width)]
        a['max'] = [max(row[i] for row in values) for i in range(width)]
    j['accessors'].append(a)
    return len(j['accessors']) - 1

parts = []
for name, corners in groups.items():
    lookup = {}; ps = []; ns = []; ts = []; indices = []
    for key in corners:
        if key not in lookup:
            vi, ti, ni = key
            lookup[key] = len(ps); ps.append(vertices[vi]); ns.append(normals[ni]); ts.append((uvs[ti][0], 1 - uvs[ti][1]))
        indices.append(lookup[key])
    assert max(indices) < 65536
    attributes = {'POSITION': accessor(ps, 3, 'VEC3', bounds=True),
                  'NORMAL': accessor(ns, 3, 'VEC3'), 'TEXCOORD_0': accessor(ts, 2, 'VEC2')}
    j['meshes'].append({'name': name, 'primitives': [{'attributes': attributes, 'indices': accessor(indices, 1, 'SCALAR', 5123), 'material': 0}]})
    j['nodes'][0]['children'].append(len(j['nodes']))
    j['nodes'].append({'name': name, 'mesh': len(j['meshes']) - 1})
    parts.append({'name': name, 'vertices': len(ps), 'triangles': len(indices)//3})

def load(name, mode):
    with Image.open(TEXTURES / name) as source:
        image = source.convert(mode)
        image.thumbnail((LIMIT, LIMIT), Image.Resampling.LANCZOS)
        return image

def embed(image, name):
    out = io.BytesIO(); image.save(out, format='PNG', compress_level=6)
    j['images'].append({'name': name, 'mimeType': 'image/png', 'bufferView': buffer_view(out.getvalue())})
    j['textures'].append({'source': len(j['images']) - 1, 'sampler': 0})
    return len(j['textures']) - 1

base = embed(load('Sword_BaseColor.png', 'RGB'), 'Sword base color')
rough = load('Sword_Roughness.png', 'L'); metal = load('Sword_Metallic.png', 'L')
mr = embed(Image.merge('RGB', (Image.new('L', rough.size, 255), rough, metal)), 'Sword metallic roughness')
normal = load('Sword_Normal.png', 'RGB')
# Restore unit-length tangent normals after resampling rather than treating them as colors.
normal.putdata([tuple(round((c / max(math.sqrt(sum(q*q for q in v)), 1e-8) + 1) * 127.5) for c in v)
                for v in (tuple(c / 127.5 - 1 for c in pixel) for pixel in normal.getdata())])
nm = embed(normal, 'Sword normal')
j['materials'] = [{'name': 'Sword PBR', 'pbrMetallicRoughness': {
    'baseColorFactor': [1, 1, 1, 1], 'baseColorTexture': {'index': base},
    'metallicFactor': 1, 'roughnessFactor': 1, 'metallicRoughnessTexture': {'index': mr}},
    'normalTexture': {'index': nm}}]
j['nodes'][0]['extras'] = {'gripSocket': [0, 0, 0], 'bladeDirection': '+Y', 'note': 'Original OBJ coordinates; final knight-relative scale and grip fitting pending'}
j['buffers'] = [{'byteLength': len(data)}]
text = json.dumps(j, separators=(',', ':'), ensure_ascii=True).encode(); text += b' ' * (-len(text) % 4)
data.extend(b'\0' * (-len(data) % 4))
body = struct.pack('<I4s', len(text), b'JSON') + text + struct.pack('<I4s', len(data), b'BIN\0') + data
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_bytes(struct.pack('<4sII', b'glTF', 2, 12 + len(body)) + body)
source_files = [source_obj, ROOT/'Sword.mtl'] + sorted(TEXTURES.glob('*.png'))
report = {'sourceFiles': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in source_files},
          'output': str(OUTPUT.relative_to(ROOT)), 'outputBytes': OUTPUT.stat().st_size,
          'outputSha256': hashlib.sha256(OUTPUT.read_bytes()).hexdigest(), 'parts': parts,
          'triangles': sum(p['triangles'] for p in parts), 'originalPositionCount': len(vertices),
          'bounds': [[min(p[i] for p in vertices), max(p[i] for p in vertices)] for i in range(3)],
          'textureSize': LIMIT, 'notes': ['Original files unchanged; supplied PBR maps replace broken absolute Windows MTL paths.',
          '2048px derived textures. Base color in sRGB; metallic/roughness in B/G channels; tangent normal assumed OpenGL from PBR set. No height displacement.',
          'UV V inverted for glTF texture origin. Original geometry, object groups and normals retained. No skin needed for rigid hand attachment.',
          'Grip origin near supplied handle; physical scale/hand fit not validated. User-supplied asset; no independent licensing claim.']}
REPORT.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'output': report['output'], 'bytes': report['outputBytes'], 'parts': len(parts), 'triangles': report['triangles']}, indent=2))
