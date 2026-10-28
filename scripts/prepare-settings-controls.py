"""Prepare original settings/search images and provenance; no image redrawing."""
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
ARCHIVE_SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'
archive = ROOT / '.cache/references/bedrock-samples-v1.26.60.5-full.zip'
assert hashlib.sha256(archive.read_bytes()).hexdigest() == ARCHIVE_SHA

def parse(data):
    text = data.decode('utf-8-sig')
    text = re.sub(r'"(?:\\.|[^"\\])*"|/\*[\s\S]*?\*/|//[^\n]*', lambda m: m[0] if m[0].startswith('"') else '', text)
    return json.loads(text)

def entries(path):
    data = path.read_bytes()
    count, version = struct.unpack_from('<II', data, 8)
    assert version == 1 and 0 < count < 100000
    base = 16 + count * 256
    for i in range(count):
        record = data[16 + i*256:16 + (i+1)*256]
        length = record[0]
        name = record[1:1+length].decode('utf-8')
        offset, size = struct.unpack_from('<II', record, 248)
        assert base + offset + size <= len(data)
        yield name, data[base+offset:base+offset+size]

local = dict(entries(GAME/'ui.brarchive'))
local.update(entries(GAME/'ui/settings_sections.brarchive'))
textures = dict(entries(GAME/'textures/ui.brarchive'))
manifest = {'schemaVersion': 1, 'gameVersion': '1.26.6005.0', 'guiScale': 2,
    'archiveSha256': ARCHIVE_SHA, 'releaseCommit': RELEASE, 'sources': {}, 'assets': {}}
cache = ROOT/'.cache/settings-source'
cache.mkdir(parents=True, exist_ok=True)
mapping = {'search-icon': 'magnifying_glass', 'search-clear': 'close_X_button',
    'search-clear-hover': 'close_X_button_hover', 'key-label': 'text_label_box', 'key-reset': 'undoArrow'}
css = ['/* Unmodified Mojang original PNGs. See docs/settings-controls-geometry.json. */', ':root {']
with zipfile.ZipFile(archive) as z:
    for name in ['ui_common.json', 'ui_template_toggles.json', 'ui_template_buttons.json', '_global_variables.json',
                 'settings_sections/settings_common.json', 'settings_sections/controls_section.json']:
        public = z.read('resource_pack/ui/'+name)
        installed = local[Path(name).name]
        assert parse(public) == parse(installed), name
        manifest['sources'][name] = {'publicSha256': hashlib.sha256(public).hexdigest(),
            'installedSha256': hashlib.sha256(installed).hexdigest(), 'parsedEqual': True}
        (cache/Path(name).name).write_text(json.dumps(parse(public), indent=2), encoding='utf-8')
    for key, name in mapping.items():
        source = 'resource_pack/textures/ui/'+name+'.png'
        data = z.read(source)
        assert data == textures[name+'.png'], name
        (cache/(name+'.png')).write_bytes(data)
        manifest['assets'][key] = {'source': source, 'pinnedUrl': f'https://raw.githubusercontent.com/Mojang/bedrock-samples/{RELEASE}/{source}',
            'sha256': hashlib.sha256(data).hexdigest(), 'dimensions': list(struct.unpack_from('>II',data,16)), 'matchesInstalledBase': True}
        css.append(f'  --mc-setting-{key}: url("data:image/png;base64,{base64.b64encode(data).decode()}");')
css.append('}')
manifest['facts'] = {
    'toggle': {'source': 'common_toggles.light_text_toggle/light_template_toggle',
        'unchecked': 'button_borderless_light', 'checked': 'button_borderless_lightpressednohover',
        'uncheckedHover': 'button_borderless_lighthover', 'checkedHover': 'button_borderless_lightpressed',
        'locked': 'disabledButtonNoBorder', 'checkedTextNormalized': [.1216,.1216,.1216]},
    'navigation': {'source': 'settings_common.section_toggle_base/toggle_button_control',
        'rowHeightGamePixels': 30, 'surfaceHeightGamePixels': 31, 'glyphOffsetGamePixels': [5,0], 'labelOffsetGamePixels': [34,0]},
    'search': {'source': 'common.text_edit_control/common.text_edit_box', 'magnifierGamePixels': [8,8],
        'magnifierOffsetGamePixels': [0,-.5], 'centeringPaddingGamePixels': [3,2], 'clearGamePixels': [15,15],
        'clearOffsetGamePixels': [2,0], 'textOffsetGamePixels': [10,0]},
    'settingRow': {'source': 'settings_common.option_generic_core', 'stackGapGamePixels': 1, 'bottomGapGamePixels': 4,
        'inlineLabelOffsetGamePixels': [34,3], 'descriptionNormalizedColor': [.7,.7,.7],
        'descriptionWebColor': '#b2b2b2', 'descriptionNativeQuantizationVerified': False},
    'keybinding': {'source': 'controls_section.keymapping_item/arrow_reset', 'rowHeightGamePixels': 35,
        'controlHeightGamePixels': 31, 'labelColorNormalized': [1,1,1], 'bindingWidth': '40% + 1px', 'resetWidth': '15% + 1px', 'resetImageGamePixels': [16,16]}}
manifest['boundaries'] = ['Source skins and JSON dimensions are verified; native whole-settings screenshot equality is not claimed.',
    'The existing project preference keeps Text/Input hard shadows, whereas native common.text_edit_box defaults shadow=false.',
    'Web keyboard code chords, Escape cancellation, Tab traversal, Delete-to-clear and host conflict policy are web behavior, not extracted native input-engine logic.',
    'SettingRow render props explicitly connect the host control ID and description; native font defaults/baselines remain unverified.']
(ROOT/'src/settings-control-textures.css').write_text('\n'.join(css)+'\n', encoding='utf-8')
(ROOT/'docs/settings-controls-geometry.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
print('Prepared', len(mapping), 'original images; verified', len(manifest['sources']), 'native/public JSON objects.')
