"""Check unchanged Classic navigation skins and prepare the private reuse map."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import struct
import zipfile
import binascii
ROOT = Path(__file__).resolve().parent.parent
ARCHIVE_SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'
COMMIT = '15701fa9c13923f12662984c32c124327e40e3d3'
PINS = [{'key': 'unchecked', 'stem': 'button_borderless_light', 'png': {'sha256': '313b607889ba3d224cf599420087876ccb3f4572b304dc1ba6c25825f7d2c376', 'bytes': 131}, 'json': {'sha256': '622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65', 'bytes': 60}}, {'key': 'checked', 'stem': 'button_borderless_lightpressednohover', 'png': {'sha256': 'c3e928f9c58b6cf42399686ba71f5656de59a2dadcdd6cee9b26111ec5200c52', 'bytes': 155}, 'json': {'sha256': '622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65', 'bytes': 60}}, {'key': 'uncheckedHover', 'stem': 'button_borderless_lighthover', 'png': {'sha256': 'e4cdc816ebbfae2bea1e870fbde0c59effd680cdec388ba1e66424645573aea8', 'bytes': 85}, 'json': {'sha256': '622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65', 'bytes': 60}}, {'key': 'checkedHover', 'stem': 'button_borderless_lightpressed', 'png': {'sha256': '47f6ed1760ae8e407cdbb6b7207a5ee45b8a0db861f16f0696c5cf61c9961983', 'bytes': 84}, 'json': {'sha256': '622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65', 'bytes': 60}}, {'key': 'locked', 'stem': 'disabledButtonNoBorder', 'png': {'sha256': '5a04f3b69f14cd1750b6c818310964e91f4962afc38cfe7bef41ad3c0fb4b27f', 'bytes': 88}, 'json': {'sha256': '97fdfacd4bf3d22a981aceec2cbc74876d7f9166f34064b6ecbdf293de1b7989', 'bytes': 60}}, {'key': 'border', 'stem': 'focus_border_white', 'png': {'sha256': 'bbf995d02bd710bed1ffef07d128e140e57b018d37ed34e050a995f1c500a5d8', 'bytes': 105}, 'json': {'sha256': 'd41fce86c98c18b03d8cb349ea5b50e4648c0cbf4b739b2ad7b6d236a83b3407', 'bytes': 60}}]

GLYPHS = [
    ('controller', 'controller_glyph', 'controller-glyph', '00abbfb7d92fa35635979bfbabad0b3276e72e86e4d0640f1717d7a4a63fe931'),
    ('controllerColor', 'controller_glyph_color', 'controller-glyph-color', '3c165bb7cbbe3af4ca7416faecc3dbab507bc71ca45de99730ca0866f02eb2b2'),
    ('multiplayer', 'multiplayer_glyph', 'multiplayer-glyph', 'da14f4600757df01ee448e6d13e870d3e6b250ec68f1a09b2dc2e93f19534c16'),
    ('multiplayerColor', 'multiplayer_glyph_color', 'multiplayer-glyph-color', 'd9e0c1c36d0fb6512be303c1960b0b4c2d203e776165242b4d97d5320f8bd129'),
]

def sha(data):
    return hashlib.sha256(data).hexdigest()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    archive = ROOT / '.cache/references/bedrock-samples-v1.26.60.5-full.zip'
    if sha(archive.read_bytes()) != ARCHIVE_SHA:
        raise ValueError('Fixed source ZIP differs.')
    bank = (ROOT / 'src/resource-pack-assets.ts').read_text(encoding='utf-8')
    lines = ["import type {ClassicSkinAsset} from './classic-skin';", "import {resourcePackAssets} from './resource-pack-assets';", '',
             '/** Private unchanged source states for settings_common.section_toggle_base. */',
             'export const settingsNavigationAssets = Object.freeze({']
    assets = {}
    with zipfile.ZipFile(archive) as z:
        for pin in PINS:
            key, stem = pin['key'], pin['stem']
            texture = 'textures/ui/' + stem
            image, raw = z.read('resource_pack/' + texture + '.png'), z.read('resource_pack/' + texture + '.json')
            if sha(image) != pin['png']['sha256'] or sha(raw) != pin['json']['sha256']:
                raise ValueError('Original source pin drift: ' + stem)
            width, height = struct.unpack_from('>II', image, 16)
            if image[:8] != b'\x89PNG\r\n\x1a\n':
                raise ValueError('Missing PNG signature.')
            at = 8
            while at < len(image):
                length = struct.unpack_from('>I', image, at)[0]
                end = at + 12 + length
                if end > len(image) or binascii.crc32(image[at + 4:end - 4]) & 0xffffffff != struct.unpack_from('>I', image, end - 4)[0]:
                    raise ValueError('Original PNG CRC mismatch.')
                at = end
            if at != len(image):
                raise ValueError('Malformed PNG length.')
            target = 'src/assets/document-viewer/' + stem
            if (ROOT / (target + '.png')).read_bytes() != image or (ROOT / (target + '.json')).read_bytes() != raw:
                raise ValueError('Existing reuse differs; not overwritten: ' + target)
            line = next(line for line in bank.splitlines() if "'" + texture + "':" in line)
            url = re.search(r"new URL\(['\"]([^'\"]+)", line)
            if not url or (ROOT / 'src' / url.group(1)).resolve() != (ROOT / (target + '.png')).resolve():
                raise ValueError('Resource bank URL no longer resolves to pinned whole PNG.')
            metadata = json.loads(raw)
            bank_meta = json.JSONDecoder().raw_decode(line.split('metadata:', 1)[1].lstrip())[0]
            if bank_meta != metadata:
                raise ValueError('Resource bank raw metadata differs.')
            lines.append("  " + key + ": resourcePackAssets['" + texture + "'],")
            assets[key] = {'source': 'resource_pack/' + texture + '.png', 'file': target + '.png', 'bytes': len(image),
                           'sha256': sha(image), 'dimensions': [width, height],
                           'metadata': {'source': 'resource_pack/' + texture + '.json', 'file': target + '.json', 'bytes': len(raw), 'sha256': sha(raw), 'value': metadata},
                           'distribution': 'existing-whole-original-via-resourcePackAssets',
                           'pinnedUrl': 'https://raw.githubusercontent.com/Mojang/bedrock-samples/' + COMMIT + '/resource_pack/' + texture + '.png'}
        for key, stem, reuse_name, expected in GLYPHS:
            entry = 'resource_pack/textures/ui/' + stem + '.png'
            image = z.read(entry)
            target = 'src/assets/gui-icons/' + reuse_name + '.png'
            if sha(image) != expected or (ROOT / target).read_bytes() != image:
                raise ValueError('Whole original glyph/reuse differs: ' + stem)
            if entry[:-4] + '.json' in z.namelist():
                raise ValueError('Original glyph now has unexpected metadata.')
            if image[:8] != b'\x89PNG\r\n\x1a\n':
                raise ValueError('Invalid original glyph PNG.')
            at = 8
            while at < len(image):
                length = struct.unpack_from('>I', image, at)[0]
                end = at + 12 + length
                if end > len(image) or binascii.crc32(image[at + 4:end - 4]) & 0xffffffff != struct.unpack_from('>I', image, end - 4)[0]:
                    raise ValueError('Original glyph CRC mismatch.')
                at = end
            if at != len(image):
                raise ValueError('Unexpected glyph PNG length.')
            width, height = struct.unpack_from('>II', image, 16)
            url = './assets/gui-icons/' + reuse_name + '.png'
            lines.append('  ' + key + ': {url: new URL(' + json.dumps(url) + ', import.meta.url).href, width: ' + str(width) + ', height: ' + str(height) + '},')
            assets[key] = {'source': entry, 'file': target, 'bytes': len(image), 'sha256': sha(image), 'dimensions': [width, height],
                           'metadata': None, 'metadataAbsentInFixedArchive': True, 'distribution': 'existing-whole-original-gui-icon',
                           'licenseFile': 'src/assets/gui-icons/LICENSE.md',
                           'pinnedUrl': 'https://raw.githubusercontent.com/Mojang/bedrock-samples/' + COMMIT + '/' + entry}
        original_license = z.read('LICENSE.md')
    license_file = ROOT / 'src/assets/document-viewer/LICENSE.md'
    if license_file.read_bytes() != original_license or (ROOT / 'src/assets/gui-icons/LICENSE.md').read_bytes() != original_license:
        raise ValueError('Existing source license differs.')
    lines += ['} as const satisfies Readonly<Record<string, ClassicSkinAsset>>);', '']
    manifest = {'schemaVersion': 1, 'status': 'source-materials-checked-runtime-native-unqualified', 'sourceCommit': COMMIT,
                'archiveSHA256': ARCHIVE_SHA, 'assets': assets,
                'license': {'source': 'LICENSE.md', 'file': 'src/assets/document-viewer/LICENSE.md', 'bytes': len(original_license), 'sha256': sha(original_license)},
                'sourceStates': {'unchecked': {'texture': 'button_borderless_light', 'text': [.3, .3, .3], 'glyph': [0, 0, 0], 'border': [.075, .075, .075]},
                                 'checked': {'texture': 'button_borderless_lightpressednohover', 'text': [.1216, .1216, .1216], 'glyph': [0, 0, 0], 'border': [.075, .075, .075]},
                                 'uncheckedHover': {'texture': 'button_borderless_lighthover', 'text': [1, 1, 1], 'glyph': [1, 1, 1], 'border': [1, 1, 1]},
                                 'checkedHover': {'texture': 'button_borderless_lightpressed', 'text': [1, 1, 1], 'glyph': [1, 1, 1], 'border': [1, 1, 1]},
                                 'locked': {'texture': 'disabledButtonNoBorder', 'text': [.3, .3, .3], 'glyph': [0, 0, 0], 'border': [.075, .075, .075]}},
                'geometry': {'rowHeight': 30, 'statePaintHeight': 31, 'statePaintOffsetY': -.5, 'boardImageInset': 1, 'boardContentInset': 3, 'glyphContentX': 5, 'textContentX': 34, 'rootGlyphX': 8, 'rootTextX': 37, 'groupLabelX': 15},
                'boundaries': ['Centered omitted content anchors and half-phase are explicit Web policy, not native placement proof.',
                               'Native hover evaluator, font metrics/wrapping and provider/forced-index activation are not recovered.',
                               'The optional server progress_loading_bars glyph provider is not implemented by this finite component.',
                               'No glyph is drawn or inferred; callers provide complete original image URL/physical dimensions and explicit visibility.',
                               'Six existing skin PNG/JSON pairs and four whole glyph PNGs reused read-only; no new PNG or hidden private font.']}
    outputs = {'src/settings-navigation-assets.ts': '\n'.join(lines).encode('utf-8'),
               'docs/settings-navigation-assets.json': (json.dumps(manifest, indent=2) + '\n').encode('utf-8')}
    for name, value in outputs.items():
        target = ROOT / name
        if args.check:
            if target.read_bytes() != value:
                raise ValueError('Prepared output differs: ' + name)
        else:
            target.write_bytes(value)
    print(json.dumps({'status': 'PASS_CHECK' if args.check else 'PREPARED', 'wholePNGsReused': 10, 'rawMetadataReused': 6, 'glyphsWithNoMetadata': 4, 'newPNGs': 0}))

if __name__ == '__main__':
    main()
