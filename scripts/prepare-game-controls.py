"""Verify installed/full/pinned originals used by game-controls, preserving PNG bytes."""
import base64
import concurrent.futures
import hashlib
import json
from pathlib import Path
import struct
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
INSTALL = Path('C:/XboxGames/Minecraft for Windows/Content')
COMMIT = '15701fa9c13923f12662984c32c124327e40e3d3'
cache = ROOT / '.cache/game-controls-source'
cache.mkdir(parents=True, exist_ok=True)

def archive(path):
    raw = path.read_bytes()
    count = struct.unpack_from('<I', raw, 8)[0]
    start = 16 + count * 256
    result = {}
    for index in range(count):
        row = raw[16 + index * 256:16 + (index + 1) * 256]
        name = row[1:1 + row[0]].decode()
        offset, size = struct.unpack_from('<II', row, 248)
        result[name] = raw[start + offset:start + offset + size]
    return result

def sha(data):
    return hashlib.sha256(data).hexdigest()

native = archive(INSTALL / 'data/resource_packs/vanilla/__brarchive/textures/ui.brarchive')
ui = archive(INSTALL / 'data/resource_packs/vanilla/__brarchive/ui.brarchive')
full_path = ROOT / '.cache/references/bedrock-samples-v1.26.60.5-full.zip'
full = zipfile.ZipFile(full_path)
chosen = {
    'dark-default': 'button_borderless_dark.png', 'dark-hover': 'button_borderless_darkhover.png',
    'dark-pressed': 'button_borderless_darkpressed.png', 'dark-pressed-nohover': 'button_borderless_darkpressednohover.png',
    'player-banner': 'MainBannersHover.png', 'pause-border': 'pause_screen_border.png',
    'menu-background': 'menubackground.png', 'screen-background': 'screen_background.png',
    'lan-icon': 'lan_icon.png', 'joystick-frame': 'joystick_frame.png', 'joystick-knob': 'joystick_knob.png',
    'achievements': 'achievements_pause_menu_icon.png', 'how-to-play': 'how_to_play_button_default.png', 'screenshot': 'camera-yo.png',
}
for action, filename in [('jump', 'jump'), ('attack', 'attack'), ('interact', 'interact'), ('sneak', 'sneak'), ('sprint', 'sprint'), ('ascend', 'flyingascend'), ('descend', 'flyingdescend')]:
    chosen[action] = filename + '.png'
    chosen[action + '-pressed'] = filename + '_pressed.png'
chosen['sprint-disabled'] = 'sprint_disable.png'

def verify(pair):
    key, name = pair
    data = native[name]
    source = 'resource_pack/textures/ui/' + name
    if full.read(source) != data:
        raise ValueError('Installed/full mismatch: ' + name)
    url = f'https://raw.githubusercontent.com/Mojang/bedrock-samples/{COMMIT}/{source}'
    with urllib.request.urlopen(url, timeout=45) as response:
        pinned = response.read()
        status = response.status
    if pinned != data:
        raise ValueError('Installed/pinned mismatch: ' + name)
    (cache / name).write_bytes(data)
    (ROOT / '.cache/references' / name).write_bytes(data)
    return key, {'file': name, 'source': source, 'sha256': sha(data), 'pinnedUrl': url,
        'size': list(struct.unpack_from('>II', data, 16)), 'pinnedHttpStatus': status,
        'matchesInstalledGame': True, 'matchesFullRelease': True, 'matchesPinned': True,
        'fullReleaseSha256': sha(full.read(source)), 'pinnedSha256': sha(pinned)}

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
    assets = dict(executor.map(verify, chosen.items()))
demo_assets = dict(verify(pair) for pair in [('logo', 'title.png'), ('avatar', 'gamerpic.png')])
for key, info in demo_assets.items():
    (ROOT / 'demo/assets/minecraft' / ('game-controls-' + key + '.png')).write_bytes(native[info['file']])
css = ['/* Original Mojang PNG bytes. Provenance and renderer boundaries: docs/game-controls-geometry.json. */', ':root {']
for key, asset in assets.items():
    css.append('  --mc-game-texture-' + key + ': url("data:image/png;base64,' + base64.b64encode(native[asset['file']]).decode() + '");')
css.append('}')
(ROOT / 'src/game-control-textures.css').write_text('\n'.join(css) + '\n', encoding='utf-8')
path = ROOT / 'docs/game-controls-geometry.json'
manifest = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {'schemaVersion': 1}
manifest['referenceCommit'] = COMMIT
manifest['assets'] = assets
manifest['demoAssets'] = demo_assets
manifest['provenance'] = {'installedRoot': str(INSTALL),
    'nativeUiArchive': 'data/resource_packs/vanilla/__brarchive/ui.brarchive',
    'nativeTextureArchive': 'data/resource_packs/vanilla/__brarchive/textures/ui.brarchive',
    'fullReleaseArchive': {'file': full_path.name, 'sha256': sha(full_path.read_bytes())},
    'definitions': {name: {'nativeSha256': sha(ui[name]), 'publicSha256': sha(full.read('resource_pack/ui/' + name)), 'source': 'resource_pack/ui/' + name}
        for name in ['pause_screen.json', 'death_screen.json', 'hud_screen.json', 'scoreboards.json', 'ui_common.json', 'ui_template_buttons.json', 'ui_art_assets_common.json', '_global_variables.json']}}
path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Verified and embedded', len(assets), 'original game-control PNGs.')
