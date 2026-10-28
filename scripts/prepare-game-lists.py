"""Extract unmodified Classic JSON UI list textures and verify installed sources."""
from pathlib import Path
import base64
import hashlib
import json
import re
import struct
import zipfile

ROOT = Path(__file__).resolve().parent.parent
GAME = Path('C:/XboxGames/Minecraft for Windows/Content/data/resource_packs/vanilla/__brarchive')
RELEASE = '15701fa9c13923f12662984c32c124327e40e3d3'
SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'
archive = ROOT/'.cache/references/bedrock-samples-v1.26.60.5-full.zip'
assert hashlib.sha256(archive.read_bytes()).hexdigest() == SHA

def parse(data):
    # Preserve comment markers inside quoted strings (for example URLs).
    text = data.decode('utf-8-sig')
    text = re.sub(r'"(?:\\.|[^"\\])*"|/\*[\s\S]*?\*/|//[^\n]*', lambda m: m[0] if m[0].startswith('"') else '', text)
    return json.loads(text)

def entries(path):
    data = path.read_bytes()
    count, version = struct.unpack_from('<II', data, 8)
    assert version == 1 and 0 < count < 100000
    base = 16 + count*256
    for i in range(count):
        row = data[16+i*256:16+(i+1)*256]
        length = row[0]
        assert 0 < length < 248
        name = row[1:1+length].decode('utf-8')
        offset, size = struct.unpack_from('<II', row, 248)
        assert base+offset+size <= len(data)
        yield name, data[base+offset:base+offset+size]

local = dict(entries(GAME/'ui.brarchive'))
textures = dict(entries(GAME/'textures/ui.brarchive'))
manifest = {'schemaVersion': 1, 'profile': 'bedrock-classic-json-ui', 'gameVersion': '1.26.6005.0',
    'guiScale': 2, 'archiveSha256': SHA, 'releaseCommit': RELEASE, 'sources': {}, 'assets': {}}
cache = ROOT/'.cache/game-lists-source'
cache.mkdir(parents=True, exist_ok=True)
mapping = {'dark': 'button_borderless_dark', 'dark-hover': 'button_borderless_darkhover',
    'dark-pressed': 'button_borderless_darkpressed', 'disabled': 'disabledButtonNoBorder',
    'indent': 'default_indent', 'screenshot-focus': 'world_screenshot_focus_border',
    'focus': 'focus_border_white', 'edit': 'editIcon', 'trash': 'trash_light',
    'online': 'online', 'offline': 'offline', 'up': 'up_arrow', 'down': 'down_arrow',
    'plus': 'plus', 'minus': 'minus', 'permissions': 'permissions_member_star', 'player-border': 'pause_screen_border',
    'demo-world': 'default_world', 'demo-pack': 'missing_pack_icon', 'pack-actions-border': 'packs_border', 'pack-actions-middle': 'packs_middle'}
css = ['/* Unmodified Mojang PNGs; provenance: docs/game-lists-geometry.json. */', ':root {']
with zipfile.ZipFile(archive) as z:
    parsed = {}
    for name in ['play_screen.json', 'resource_packs_screen.json', 'pause_screen.json', 'ui_template_buttons.json',
                 'ui_template_toggles.json', '_global_variables.json']:
        data = z.read('resource_pack/ui/'+name)
        installed = local[name]
        assert parse(data) == parse(installed), name
        parsed[name] = parse(data)
        manifest['sources'][name] = {'publicSha256': hashlib.sha256(data).hexdigest(),
            'installedSha256': hashlib.sha256(installed).hexdigest(), 'parsedEqual': True}
        (cache/name).write_text(json.dumps(parse(data), indent=2), encoding='utf-8')
        (cache/(name+'.public.jsonc')).write_bytes(data)
    for key, name in mapping.items():
        source = 'resource_pack/textures/ui/'+name+'.png'
        data = z.read(source)
        assert data == textures[name+'.png'], name
        asset = {'source': source, 'pinnedUrl': f'https://raw.githubusercontent.com/Mojang/bedrock-samples/{RELEASE}/{source}',
            'sha256': hashlib.sha256(data).hexdigest(), 'dimensions': list(struct.unpack_from('>II', data, 16)), 'matchesInstalledBase': True}
        json_path = 'resource_pack/textures/ui/'+name+'.json'
        if json_path in z.namelist():
            metadata = z.read(json_path)
            assert parse(metadata) == parse(textures[name+'.json'])
            asset['metadata'] = parse(metadata)
            asset['metadataSha256'] = hashlib.sha256(metadata).hexdigest()
        manifest['assets'][key] = asset
        (cache/(name+'.png')).write_bytes(data)
        if key.startswith('demo-'):
            demo = ROOT/'demo/assets/game-lists'
            demo.mkdir(parents=True, exist_ok=True)
            (demo/(name+'.png')).write_bytes(data)
        css.append(f'  --mc-list-{key}: url("data:image/png;base64,{base64.b64encode(data).decode()}");')
css.append('}')
manifest['facts'] = {
    'world': {'source': 'play.local_world_item/local_world_text_panel/collection_world_screenshot',
        'rowStride': 29, 'surfaceHeight': 30, 'thumbnailHeightInset': 2, 'thumbnailWidthPercentOfHeight': 173.91,
        'buttonContentInset': 6, 'contentHeight': 24, 'thumbnailImage': [38.2602,22], 'thumbnailBorder': [40.2602,24],
        'thumbnailWidthBasis': '173.91%y uses the image own height of 22, not parent height 24; corrected by independent native Loading-logo cross-axis evidence.',
        'editGlyph': [22,16], 'deleteGlyph': [22,16], 'textLineHeight': 10, 'textShadow': False},
    'server': {'source': 'play.network_world_item/network_world_item_button_content', 'rowStride': 30, 'surfaceHeight': 31,
        'statusIcon': [8,8], 'statusContainer': [10,10], 'textLineHeight': 10},
    'player': {'source': 'pause.player_grid_item/player_button_content/player_gamer_pic/player_permission_button',
        'rowStride': 27, 'surfaceHeight': 28, 'contentInset': [4,4], 'portrait': [18,18], 'portraitPanelWidth': 20,
        'permissionWidth': 28, 'permissionGlyph': [15,15]},
    'pack': {'source': 'resource_packs.selected_pack_panel/available_pack_panel/selected_pack_button_layout/selected_text_panel',
        'minimumPanelHeight': 50, 'icon': [42,42], 'iconOffset': [1,0], 'textWidthInset': 48,
        'nameLineHeight': 10, 'descriptionDefaultHeight': 32, 'descriptionWidthInsetFromTextPanel': 60,
        'actionPanelHeight': 24, 'actionHeight': 18, 'actionHorizontalInset': 4, 'movementButton': [18,18],
        'movementGlyph': [14,14], 'onlineGlyph': [7,7]}}
manifest['boundaries'] = [
    'Classic JSON UI source profile. Current Play-screen migration to Ore is not emulated or claimed as native runtime appearance.',
    'Original texture bytes and parsed public/installed JSON are verified. Whole-screen native screenshot and font-baseline equality are unverified; sizecm and percentage-layout rounding have not been captured from the native engine.',
    'The earlier parent-height interpretation of thumbnail %y was withdrawn. Self-height cross-axis semantics are corroborated independently by a native Loading-logo capture; native world-thumbnail fractional snapping is still unverified.',
    'WorldList uses local-world rows; ServerList uses external/network-world rows, not featured-server navigation cards.',
    'Caller supplies thumbnails, dates, file sizes, server status/counts, pack data and skin/avatar rendering. No networking or world filesystem operations.',
    'Selection persistence, keyboard roving, host callback policy, delete action placement, visible selected focus and responsive wrapping are web adaptations.',
    'PlayerCard uses the compact pause-player row. A caller skin renderer is a slot, not an implementation of native paper_doll_renderer.',
    'Pack descriptions declare font_type=smooth in JSON. The shared Web font is not certified against the native smooth-text rasterizer.',
    'Pack read-more, warnings/errors and proprietary marketplace/permissions workflows are not implemented. Pack data and reorder callbacks are caller-owned.'
]
(ROOT/'src/game-list-textures.css').write_text('\n'.join(css)+'\n', encoding='utf-8')
(ROOT/'docs/game-lists-geometry.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
print('Verified', len(manifest['sources']), 'source files and', len(mapping), 'original list images.')
