"""Read-only texture sampling for cloth-region weight constraints; never edits images."""
import io, json, struct, sys
from PIL import Image
from pathlib import Path
b=Path(sys.argv[1]).read_bytes(); length=struct.unpack_from('<I',b,12)[0]; j=json.loads(b[20:20+length]); off=28+length; data=b[off:]
primitive=j['meshes'][0]['primitives'][0]
a=j['accessors'][primitive['attributes']['TEXCOORD_0']];v=j['bufferViews'][a['bufferView']]
assert a['componentType']==5126 and a['type']=='VEC2'
start=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',8)
tex=j['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index'];image=j['images'][j['textures'][tex]['source']];view=j['bufferViews'][image['bufferView']]
pic=Image.open(io.BytesIO(data[view['byteOffset']:view['byteOffset']+view['byteLength']])).convert('RGB');w,h=pic.size
pixels=pic.load(); labels=bytearray(a['count'])
for i in range(a['count']):
 u,v=struct.unpack_from('<ff',data,start+i*stride);r,g,blue=pixels[min(w-1,max(0,int(u*w))),min(h-1,max(0,int(v*h)))]
 labels[i]=int(r>35 and r-g>22 and r-blue>15 and r>g*1.38)
Path(sys.argv[2]).write_bytes(labels)
print(json.dumps({'texture_size':[w,h],'red_cloth_seed_vertices':sum(labels),'vertices':len(labels)}))
