"""Download selected public KinemIQ clips; retain source bytes and provenance. No account/export quotas used."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import collections, hashlib, json, math, re, struct, time, subprocess

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://kinemiq.app/'
FALLBACK = {'credit': 'Universal Animation Library - Quaternius', 'licence': 'CC0 1.0',
            'licence_url': 'https://creativecommons.org/publicdomain/zero/1.0/',
            'url': 'https://quaternius.itch.io/universal-animation-library'}


def selection(c):
    """Keep all sword/combat techniques, plus usable support actions; omit unrelated styles/tasks."""
    ident, name, cat = c['id'], c.get('name_en', c.get('name', '')).lower(), c.get('category')
    if c.get('test'):
        return None
    if ident.startswith('sword_'):
        return 'sword'
    if cat in ('block', 'evade', 'hit_reaction', 'death'):
        return {'block': 'defense', 'evade': 'dodge', 'hit_reaction': 'reaction', 'death': 'reaction'}[cat]
    if cat == 'attack' and not ident.startswith('zombie_'):
        return 'unarmed-and-shield'
    if ident.startswith(('melee_', 'shield_')) or name.startswith('punch -'):
        return 'unarmed-and-shield'
    if any(word in name for word in ('fighting', 'advance', 'retreat')) or ident.startswith('male2_d'):
        return 'combat-footwork-and-guards'
    if ident.startswith(('shielded', 'lunge_')) or ident == 'sprint_shield_loop':
        return 'optional-style-reference'
    if ident.startswith('male2_b') or ident.startswith('male2_c'):
        return 'combat-footwork-and-guards'
    if ident.startswith('liftair') or ident in ('laytoidle', 'kipup', 'bandage_loop', 'hit_chest', 'hit_head', 'hit_knockback'):
        return 'reaction'
    if ident in ('idle_loop', 'walk_loop', 'walk_fwd_loop', 'run_loop', 'sprint_loop', 'sprint_enter', 'sprint_exit', 'turn_left', 'turn_right'):
        return 'locomotion-baseline'
    return None


def read_glb(data):
    if len(data) < 28 or struct.unpack_from('<4sII', data) != (b'glTF', 2, len(data)):
        raise ValueError('Not an intact GLB 2.0 file')
    pos, document, binary = 12, None, None
    while pos < len(data):
        length, kind = struct.unpack_from('<II', data, pos)
        pos += 8
        if pos + length > len(data) or length % 4:
            raise ValueError('Invalid GLB chunk length')
        chunk = data[pos:pos + length]
        if kind == 0x4E4F534A:
            document = json.loads(chunk)
        elif kind == 0x004E4942:
            binary = chunk
        pos += length
    if not document or binary is None or not document.get('animations'):
        raise ValueError('Missing embedded animation data')
    if any(b.get('uri') for b in document.get('buffers', [])) or document['buffers'][0]['byteLength'] > len(binary):
        raise ValueError('Non-self-contained buffer')
    nodes = document.get('nodes', [])
    for n in nodes:
        if any(i < 0 or i >= len(nodes) for i in n.get('children', [])):
            raise ValueError('Invalid hierarchy index')
    for skin in document.get('skins', []):
        if any(i < 0 or i >= len(nodes) for i in skin['joints']):
            raise ValueError('Invalid skin joint index')

    def floats(index):
        a = document['accessors'][index]
        if a['componentType'] != 5126 or 'sparse' in a:
            raise ValueError('Unexpected animation accessor')
        components = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[a['type']]
        view = document['bufferViews'][a['bufferView']]
        stride = view.get('byteStride', components * 4)
        offset = view.get('byteOffset', 0) + a.get('byteOffset', 0)
        end = offset + (a['count'] - 1) * stride + components * 4
        if a['count'] < 1 or end > view.get('byteOffset', 0) + view['byteLength'] or end > len(binary):
            raise ValueError('Accessor outside embedded buffer')
        values = [struct.unpack_from('<' + 'f' * components, binary, offset + i * stride) for i in range(a['count'])]
        if not all(math.isfinite(v) for frame in values for v in frame):
            raise ValueError('Nonfinite animation keys')
        return values

    animations, checked = [], {}
    for animation in document['animations']:
        duration = 0
        for channel in animation['channels']:
            target = channel['target']
            if not 0 <= target['node'] < len(nodes):
                raise ValueError('Invalid animation target')
            sampler = animation['samplers'][channel['sampler']]
            for key in ('input', 'output'):
                index = sampler[key]
                if index not in checked:
                    checked[index] = floats(index)
            times = [v[0] for v in checked[sampler['input']]]
            if times[0] < 0 or any(b <= a for a, b in zip(times, times[1:])):
                raise ValueError('Non-increasing key times')
            multiplier = 3 if sampler.get('interpolation') == 'CUBICSPLINE' else 1
            if len(checked[sampler['output']]) != len(times) * multiplier:
                raise ValueError('Animation input/output count mismatch')
            duration = max(duration, times[-1])
        animations.append({'name': animation.get('name', ''), 'duration_seconds': duration, 'channels': len(animation['channels'])})
    return {'animations': animations, 'nodes': len(nodes), 'skins': [len(s['joints']) for s in document.get('skins', [])],
            'meshes': len(document.get('meshes', [])), 'embedded_copyright': document.get('asset', {}).get('copyright')}


def entries():
    catalog = json.loads((ROOT / 'source/catalog.json').read_text())
    result = []
    for c in catalog['clips']:
        group = selection(c)
        if not group:
            continue
        path = c['file']
        if not re.fullmatch(r'clips/[a-zA-Z0-9_.-]+\.glb', path):
            raise ValueError('Unexpected public asset path')
        licence = c.get('licence') or FALLBACK
        result.append({'id': c['id'], 'name': c.get('name_en', c['name']), 'group': group,
                       'path': f'clips/{c["id"]}.glb', 'download_url': SITE + 'wp-content/kinemiq-app/library/' + path,
                       'page_url': SITE + 'animations/?a=k%3A' + c['id'], 'licences': [licence],
                       'catalog_source': c.get('source'), 'catalog_duration': c.get('duration'),
                       'travel': c.get('travel'), 'in_place': c.get('in_place'),
                       'optional_reference': group == 'optional-style-reference' or any(w in c['id'] for w in ('aerial', 'groundpound', 'spin', 'capoeira', 'doublekick'))})
    for c in json.loads((ROOT / 'source/community.json').read_text())['items']:
        if c['cat'] not in ('combat', 'reaction') and c['id'] not in ('c4', 'c8'):
            continue
        licence = {'credit': c['by'], 'licence': 'CC BY 4.0' if c['lic'] == 'by' else 'CC0 1.0',
                   'licence_url': 'https://creativecommons.org/licenses/by/4.0/' if c['lic'] == 'by' else 'https://creativecommons.org/publicdomain/zero/1.0/'}
        result.append({'id': 'community_' + c['id'], 'name': c['n'], 'group': 'community-' + c['cat'],
                       'path': f'clips/community_{c["id"]}.glb',
                       'download_url': SITE + 'kq-ajax/?action=kinemiq_comm_file&f=glb&id=' + c['id'],
                       'page_url': SITE + 'animations/?a=' + c['id'], 'licences': [licence] + c.get('cr', []),
                       'catalog_duration': c.get('dur'), 'optional_reference': True})
    return result


def acquire(entry):
    path = ROOT / entry['path']
    for attempt in range(3):
        try:
            if path.exists():
                data = path.read_bytes()
            else:
                data = subprocess.run(['curl', '--fail', '--location', '--silent', '--show-error', '--max-time', '60', entry['download_url']], check=True, capture_output=True).stdout
            details = read_glb(data)
            if not path.exists():
                path.write_bytes(data)
            return {**entry, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'validation': details}
        except Exception:
            if attempt == 2:
                raise
            time.sleep(attempt + 1)


def main():
    selected, success, failures = entries(), [], []
    print(f'Selected {len(selected)} public sword/combat/support clips', flush=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        jobs = {pool.submit(acquire, e): e for e in selected}
        for future in as_completed(jobs):
            entry = jobs[future]
            try:
                success.append(future.result())
            except Exception as error:
                failures.append({'id': entry['id'], 'url': entry['download_url'], 'error': str(error)})
                print(f'FAILED {entry["id"]}: {error}', flush=True)
            if (len(success) + len(failures)) % 20 == 0:
                print(f'Validated {len(success)}/{len(selected)}; failures {len(failures)}', flush=True)
    manifest = {'experiment': 'AT-016', 'retrieved_utc': datetime.now(timezone.utc).isoformat(), 'site': SITE,
                'catalog_url': SITE + 'studio/data/catalog.json',
                'community_url': SITE + 'kq-ajax/?action=kinemiq_comm_list',
                'selection': 'All non-test sword clips; attacks except zombies; blocks/dodges/hits/death; combat stances, footwork, recoveries, backward/side locomotion, shield/lunge style references and relevant community variants. No firearms, bows, spells, farming, dances or zombie moves.',
                'selected': len(selected), 'downloaded': len(success), 'bytes': sum(e['bytes'] for e in success),
                'groups': dict(collections.Counter(e['group'] for e in success)), 'clips': sorted(success, key=lambda x: x['id']), 'failures': failures}
    (ROOT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    rows = ['# KinemIQ animation sources and credits', '', 'Source GLBs are preserved byte-for-byte. Licence entries below come from the public catalogue/community records; embedded source credits are also retained. No knight retargeting or edits have been made. CC BY clips require the listed credits when distributed. See manifest.json for file hashes, source URLs and complete metadata.', '']
    for e in manifest['clips']:
        rows += [f'## {e["name"]} (`{e["path"]}`)', '', e['page_url'], '']
        for licence in e['licences']:
            rows.append(f'- {licence.get("credit", "Unknown author")} — {licence.get("licence", "Unknown licence")} ({licence.get("licence_url", "")}); source: {licence.get("url", e["page_url"])}. Changes by Game1: none. Source-provider changes: {licence.get("changes", "not specified")}.')
        rows += ['']
    (ROOT / 'CREDITS.md').write_text('\n'.join(rows))
    index = ['# Downloaded sword and combat animation index', '', f'{len(success)} GLBs; source motion retained. See CREDITS.md before distributing CC BY clips. Optional references are not automatically approved fighting styles.', '']
    for group in sorted(manifest['groups']):
        index += ['## ' + group, '', '| Animation | Seconds | Licence | Optional style reference |', '|---|---:|---|---|']
        for e in sorted((e for e in success if e['group'] == group), key=lambda e: e['name']):
            licences = ', '.join(sorted(set(l['licence'] for l in e['licences'])))
            duration = e['validation']['animations'][0]['duration_seconds']
            name = e['name'].replace('|', '/')
            index.append(f'| [{name}](<{e["path"]}>) | {duration:.3f} | {licences} | {"Yes" if e["optional_reference"] else ""} |')
        index.append('')
    (ROOT / 'INDEX.md').write_text('\n'.join(index).rstrip() + '\n')
    print(json.dumps({k: manifest[k] for k in ('selected', 'downloaded', 'bytes', 'groups', 'failures')}, indent=2), flush=True)
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
