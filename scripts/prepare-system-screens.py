"""Extract unchanged official Classic resources; optionally compare a local, owned install."""
from pathlib import Path
import base64
import hashlib
import json
import re
import struct
import zipfile

ROOT = Path(__file__).resolve().parent.parent
RELEASE = '15701fa9c13923f12662984c32c124327e40e3d3'
ARCHIVE_SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'
archive = ROOT / '.cache/references/bedrock-samples-v1.26.60.5-full.zip'
assert hashlib.sha256(archive.read_bytes()).hexdigest() == ARCHIVE_SHA
GAME = Path('C:/XboxGames/Minecraft for Windows/Content/data/resource_packs/vanilla/__brarchive')
cache = ROOT / '.cache/system-screens-source'
cache.mkdir(parents=True, exist_ok=True)
references = ROOT / '.cache/references'

def parse(data):
    text = data.decode('utf-8-sig')
    text = re.sub(r'"(?:\\.|[^"\\])*"|/\*[\s\S]*?\*/|//[^\n]*', lambda m: m[0] if m[0].startswith('"') else '', text)
    return json.loads(text)

def read_entries(path):
    if not path.exists():
        return {}
    data = path.read_bytes()
    count, version = struct.unpack_from('<II', data, 8)
    assert version == 1 and 0 < count < 100000
    base = 16 + count * 256
    result = {}
    for i in range(count):
        record = data[16 + i*256:16 + (i+1)*256]
        length = record[0]
        name = record[1:1+length].decode('utf-8')
        offset, size = struct.unpack_from('<II', record, 248)
        assert base + offset + size <= len(data)
        result[name] = data[base+offset:base+offset+size]
    return result

ui = read_entries(GAME / 'ui.brarchive')
ui.update(read_entries(GAME / 'ui/settings_sections.brarchive'))
textures = read_entries(GAME / 'textures/ui.brarchive')
blocks = read_entries(GAME / 'textures/blocks.brarchive')
manifest = {'schemaVersion': 1, 'gameVersion': '1.26.6005.0', 'guiScale': 2,
    'releaseCommit': RELEASE, 'archiveSha256': ARCHIVE_SHA,
    'releaseUrl': 'https://github.com/Mojang/bedrock-samples/releases/download/v1.26.60.5/bedrock-samples-v1.26.60.5-full.zip',
    'sources': {}, 'assets': {}}
mapping = {'settings-frame': 'textures/ui/dialog_background_hollow_3',
    'settings-divider': 'textures/ui/HowToPlayDivider',
    'loading-dirt': 'textures/blocks/dirt', 'loading-classic': 'textures/ui/bg32',
    'loading-empty': 'textures/ui/experiencebarempty', 'loading-full': 'textures/ui/experiencebarfull',
    'loading-nub': 'textures/ui/experiencenub', 'loading-waveform': 'textures/ui/loading_bar',
    'loading-control': 'textures/ui/control', 'loading-title': 'textures/ui/title'}
css = ['/* Unmodified Mojang PNG bytes; see docs/system-screens-geometry.json and THIRD_PARTY_NOTICES.md. */', ':root {']
with zipfile.ZipFile(archive) as z:
    for name in ['ui_common.json', '_global_variables.json', 'progress_screen.json', 'toast_screen.json', 'achievement_screen.json', 'ui_art_assets_common.json',
                 'settings_sections/settings_common.json', 'settings_screen.json']:
        source = 'resource_pack/ui/' + name
        data = z.read(source)
        record = {'source': source, 'publicSha256': hashlib.sha256(data).hexdigest()}
        if Path(name).name in ui:
            installed = ui[Path(name).name]
            record.update(installedSha256=hashlib.sha256(installed).hexdigest(), parsedEqual=parse(data) == parse(installed))
            assert record['parsedEqual'], name
        manifest['sources'][name] = record
        (cache / Path(name).name).write_text(json.dumps(parse(data), indent=2), encoding='utf-8')
    for key, path in mapping.items():
        source = 'resource_pack/' + path + '.png'
        data = z.read(source)
        local = blocks if '/blocks/' in path else textures
        record = {'source': source, 'sha256': hashlib.sha256(data).hexdigest(),
            'pinnedUrl': f'https://raw.githubusercontent.com/Mojang/bedrock-samples/{RELEASE}/{source}',
            'dimensions': list(struct.unpack_from('>II', data, 16))}
        if Path(path).name + '.png' in local:
            record['matchesInstalledBase'] = data == local[Path(path).name + '.png']
            assert record['matchesInstalledBase'], path
        meta = 'resource_pack/' + path + '.json'
        if meta in z.namelist():
            metadata = z.read(meta)
            record['metadata'] = parse(metadata)
            record['metadataSha256'] = hashlib.sha256(metadata).hexdigest()
        manifest['assets'][key] = record
        (cache / (Path(path).name + '.png')).write_bytes(data)
        (references / (Path(path).name + '.png')).write_bytes(data)
        css.append(f'  --mc-system-{key}: url("data:image/png;base64,{base64.b64encode(data).decode()}");')
css.append('}')
manifest['facts'] = {
    'settings': {'source': 'settings_common.settings_content/dialog_titles/selector_area/content_area/section_divider',
        'sourceBackgroundNormalized': [.192,.196,.2], 'selectorWidth': '40% - 3px', 'contentWidth': '60% - 8px',
        'sourceContentOffsetGamePixels': [0,21], 'sourceDividerWidthGamePixels': 4,
        'frameSourceSliceLTRB': [8,23,8,8], 'destinationScale': 2,
        'navigation': 'NavigationList source-backed section_toggle_base, 30 GUI-pixel rows',
        'pageState': 'Hidden sections remain mounted; all settings and persistence are host owned.'},
    'loading': {'defaultProfile': 'world-modal',
        'source': 'progress.world_convert_modal_progress_screen_content/world_modal_progress_panel/fancy_progress_loading_bars; common_art.title_panel_content/title_panel_win10',
        'panelSizeGamePixels': [290,100], 'frameSourceSliceLTRB': [8,23,8,8],
        'innerControlSource': 'common.dialog_background_hollow_common; control PNG RGB9 inset4 GUI pixels at opacity .8. Original 2x2 PNG is stretched as all four pixels are identical; CSS nine-slice would have an empty 0x0 center.',
        'baseContentWidth': '100% - 12px', 'titleTopGamePixels': 9, 'messageGapGamePixels': 8,
        'insideBottomPaddingGamePixels': 14, 'buttonTopGapGamePixels': 5,
        'greenBar': {'widthOfInsideContent': '90%', 'heightGamePixels': 5,
            'emptySourceSliceLTRB': [6,1,6,1], 'fullSourceSliceLTRB': [1,0,1,0],
            'fullClip': 'Public value/max clips the already sized full image from the right; native clip_pixelperfect=false.',
            'nub': 'Original 11x5 PNG tiled across centered (bar width - 10 GUI pixels), above full and empty; never clipped with the value.'},
        'titleImage': {'source': 'common_art.title_image', 'texture': 'textures/ui/title', 'panelWidth': '55%', 'panelHeightOfWidth': '18.85%', 'topOfScreen': '10%'},
        'worldBackground': 'Transparent host scene slot. The captured panorama belongs to the render-below scene; no synthetic panorama or flattened cube face is substituted.',
        'indeterminate': {'source': 'progress.bar_animation/progress_loading_bars', 'frameCount': 10, 'frameSourcePixels': [64,8],
            'fps': 10, 'reversible': True, 'normalizedTint': [.7,.7,.7,1], 'staticFrameProp': 'loadingFrame'},
        'compactProfileSource': 'common.dirt_background; progress.world_loading_screen_background/overworld_loading_background/progress_loading_spinner/cancel_button',
        'overworldTileSourcePixels': [16,16], 'tiledScale': [2,2], 'guiScale': 2, 'webTileCssPixels': [64,64],
        'overworldGradientBlackAlpha': [.5,.7], 'classicBackground': 'common.dirt_background uses bg32 tiled; web displays it at GUI scale 2',
        'spinner': {'source': 'progress.spinner_animation', 'frames': 10, 'fps': 10, 'sourceFramePixels': [7,7], 'guiSize': [14,14]},
        'cancelSizeGamePixels': [66,26], 'textShadow': False,
        'compactDeterminate': 'Only variant=compact uses public Progress/common.empty_progress_bar/filled_progress_bar. The default world-modal uses native achievement experience textures.'},
    'achievement': {'source': 'toast_screen.popup/toast_image/toast_label/third_party_achievement_icon',
        'sourceFrame': 'textures/ui/greyBorder (existing Toast)', 'sourceIconGamePixels': [13,13], 'textShadow': False,
        'iconPolicy': 'Host artwork is optional. Source achievement_third_party is referenced in JSON but absent from this official full ZIP; no invented trophy is substituted.',
        'timing': 'Persistent by default; explicit duration uses Toast minimum 5s with hover/focus/hidden-document pause.'}}
manifest['boundaries'] = [
    'These are reusable Classic compositions, not complete native system screens or native game controllers.',
    'The installed/full-release Classic JSON parses equally where recorded; migrated Ore settings runtime coverage is unverified.',
    'The web composition adapts spacing, text wrapping, action placement and narrow layouts; no native fullscreen pixel-perfect claim.',
    'Dirt tiling and gradient belong to the optional compact/source-background profiles; the default world-modal leaves panorama/background ownership to the host.',
    'World-modal title art caps at 282 GUI pixels for very wide embedded regions; narrow panels fit available width, long messages can expand the source minimum height and optional percentages alter layout.',
    'Waveform uses the ten original frames with a 10fps reversible CSS timeline; native endpoint timing and tint byte quantization are not certified from an animation capture.',
    'Host background and achievement artwork are not source-certified by the library.',
    'No local settings, game loading, achievements, files, or user data are detected or modified.',
    'Original Mojang asset rights remain under their source terms; this manifest does not relicense them as MIT.'
]
manifest['nativeObservation'] = {
    'file': '.cache/native-system-screens/world-loading-state-native-lossless.png',
    'sha256': '8b0e92e7cad5845d1e200264f030e53b8156404c24ddcefb77d6fdb5a6d53351',
    'dimensions': [2568,1400], 'gameVersion': '1.26.6005.0', 'guiScale': 5,
    'observed': 'Stable center shows hollow3 gray frame, dark transparent interior, textured green experience bar, title PNG and scene panorama.',
    'branchEvidence': 'Classic world_convert_modal_progress_screen_content directly composes title_panel_content and world_modal_progress_panel. Local HBUI routes.json (125 routes), routes-react.json (2), routes-solid.json (2) contain no load/progress route; this does not prove engine call-stack identity.',
    'barEvidence': 'Native rows830/850 contain RGB(14,17,16) x670..1910 inclusive,1241px. Source(290-12)*.9*5 gives1251px; subtracting two1-GUI-pixel caps gives1241px.',
    'limitation': 'Transient screenshot retains prior page at top/left. Whole-frame equality is invalid; source material correspondence is separate from native runtime/frame geometry certification.',
    'font': 'This source Classic label branch is not the HBUI death Seven/Ten typography branch.'}
(ROOT / 'src/system-screens-textures.css').write_text('\n'.join(css) + '\n', encoding='utf-8')
(ROOT / 'docs/system-screens-geometry.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print('Prepared', len(mapping), 'original PNGs;', len(manifest['sources']), 'Classic source definitions.')
