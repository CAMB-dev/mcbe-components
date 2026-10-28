"""Verify installed / full-release / pinned Bedrock HUD overlay PNGs, preserve original bytes."""
import base64
import concurrent.futures
import hashlib
import json
from pathlib import Path
import struct
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
GAME = Path('C:/XboxGames/Minecraft for Windows/Content')
COMMIT = '46ba6ea985fb5a92d79a9419198f10dda14c199d'
CACHE = ROOT / '.cache/hud-overlays-source'
CACHE.mkdir(parents=True, exist_ok=True)

def archive(path):
    data = path.read_bytes()
    count = struct.unpack_from('<I', data, 8)[0]
    base = 16 + count * 256
    result = {}
    for index in range(count):
        record = data[16 + index * 256:16 + (index + 1) * 256]
        name = record[1:1 + record[0]].decode()
        offset, size = struct.unpack_from('<II', record, 248)
        result[name] = data[base + offset:base + offset + size]
    return result

def digest(data):
    return hashlib.sha256(data).hexdigest()

native = archive(GAME / 'data/resource_packs/vanilla/__brarchive/textures/ui.brarchive')
ui = archive(GAME / 'data/resource_packs/vanilla/__brarchive/ui.brarchive')
release_path = ROOT / '.cache/references/bedrock-samples-v1.26.60.5-full.zip'
release = zipfile.ZipFile(release_path)
chosen = {
    'black': 'Black.png', 'boss-empty': 'empty_progress_bar.png', 'boss-filled': 'filled_progress_bar.png',
    'tooltip-background': 'hud_tip_text_background.png', 'effect-background': 'hud_mob_effect_background.png',
    'effect-background-ambient': 'hud_mob_ambient_effect_background.png',
}
for name, data in native.items():
    if name.endswith('_effect.png') and struct.unpack_from('>II', data, 16) == (18, 18):
        chosen['effect-' + name.removesuffix('_effect.png').replace('_', '-')] = name

def verify(pair):
    key, filename = pair
    data = native[filename]
    source = 'resource_pack/textures/ui/' + filename
    public = release.read(source)
    if data != public:
        raise ValueError(f'Installed/full-release mismatch: {filename}')
    url = f'https://raw.githubusercontent.com/Mojang/bedrock-samples/{COMMIT}/{source}'
    with urllib.request.urlopen(url, timeout=45) as response:
        pinned = response.read()
        status = response.status
    if data != pinned:
        raise ValueError(f'Installed/pinned mismatch: {filename}')
    (CACHE / filename).write_bytes(data)
    (ROOT / '.cache/references' / filename).write_bytes(data)
    return key, {
        'file': filename, 'source': source, 'size': list(struct.unpack_from('>II', data, 16)),
        'sha256': digest(data), 'pinnedUrl': url, 'pinnedHttpStatus': status,
        'pinnedSha256': digest(pinned), 'matchesPinned': True,
        'matchesInstalledGame': True, 'matchesFullRelease': True, 'fullReleaseSha256': digest(public),
    }

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
    assets = dict(executor.map(verify, chosen.items()))

css = ['/* Original Mojang PNG bytes; provenance and renderer limits: docs/hud-overlays-geometry.json. */', ':root {']
for key, info in assets.items():
    css.append('  --mc-hud-overlay-texture-' + key + ': url("data:image/png;base64,' + base64.b64encode(native[info['file']]).decode() + '");')
css.append('}')
(ROOT / 'src/hud-overlay-textures.css').write_text('\n'.join(css) + '\n', encoding='utf-8')

manifest_path = ROOT / 'docs/hud-overlays-geometry.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {'schemaVersion': 1}
manifest['referenceCommit'] = COMMIT
manifest['assets'] = assets
manifest['provenance'] = {
    'installedRoot': str(GAME),
    'nativeUiArchive': 'data/resource_packs/vanilla/__brarchive/ui.brarchive',
    'nativeTextureArchive': 'data/resource_packs/vanilla/__brarchive/textures/ui.brarchive',
    'fullReleaseArchive': {'file': release_path.name, 'sha256': digest(release_path.read_bytes())},
    'nativeDefinitions': {name: {'sha256': digest(ui[name]), 'fullReleaseSource': 'resource_pack/ui/' + name,
        'fullReleaseSha256': digest(release.read('resource_pack/ui/' + name))}
        for name in ['hud_screen.json', 'ui_common.json', 'scoreboards.json', 'mob_effect_screen.json', '_global_variables.json']},
    'verification': 'Every PNG matches installed archive, full release and actual HTTP 200 pinned raw file bytes. CSS preserves those original bytes without re-encoding.',
}
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print('Verified and embedded', len(assets), 'original HUD overlay PNGs.')
