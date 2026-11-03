"""Prepare/check finite World selector originals without repainting or aliases."""
from pathlib import Path
import argparse
import base64
import binascii
import hashlib
import json
import re
import struct
import zipfile

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / '.cache/references/bedrock-samples-v1.26.60.5-full.zip'
ARCHIVE_SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'
COMMIT = '15701fa9c13923f12662984c32c124327e40e3d3'
SOURCE_PINS = {
 'settings_screen.json': 'c7b429f87f79a68cf8f8d3eeecf0706a9e410bb73420580500e5b31e56ec9b5c',
 'settings_sections/world_section.json': '775671e146ce34d82ca655271fd679f2a654db9b503918a2c0c398270fd4edb4',
 'settings_sections/settings_common.json': '36863803c56e42d31b915aa9df13cf88cc43a528eb40c76cbf26c911ef7b3ecf',
 'ui_common.json': '0aae480d123b2c8667463776f8b0eabad665bc0378b287acd0babcf41d8083a6',
 'ui_template_buttons.json': '3e250faef134965386ced074d73c998d2a363c79fed14ec928668cb7ff70ea96',
 'ui_template_toggles.json': 'efe2bf9fab47aa5e29d7116a2aa705a964a42b0ef86c947c4e46188be9ac2a01',
 'ui_template_dialogs.json': 'de7b2ec43530715c797ab7ed2476965f9dc53962b88bc8c39a207582bee97264',
 '_global_variables.json': 'ea39206de2c7b6f157def5cdf1662767c0ccd9560dfafb1378c3c364b236f69b',
 '_ui_defs.json': 'b4f7f25b6ee4246b3582eb78a031ecc93793fdb2cf09f77b886d73f4038cb270',
 'store_common.json': '306f9f7e4bf69ebdeb3cccf4a76cc01aa26102d96273623ae5d7f99d81006557',
 'progress_screen.json': '2453144b1e4d98bcc56d63c014034dae50172f5e15989589a8dca2676599ee80',
 'server_form.json': 'ca718a8626eb0d0496c1e2b3e23695d10f3220211f2d3f1260b7f2123ad48c34',
 'resource_packs_screen.json': 'c73819a074d90e63268f9b52e86ce32179f10989288aefdd18a66c6ba394f3ae',
 'permissions_screen.json': '5b79e3daf11c0dceb1e878e437c52e9eee1f7d76500dcaa7449e18615d3560d8',
}
MATERIALS = [
 ('controller_glyph', 'src/assets/gui-icons/controller-glyph.png'),
 ('controller_glyph_color', 'src/assets/gui-icons/controller-glyph-color.png'),
 ('controller_glyph_switch', None), ('controller_glyph_color_switch', None),
 ('multiplayer_glyph', 'src/assets/gui-icons/multiplayer-glyph.png'),
 ('multiplayer_glyph_color', 'src/assets/gui-icons/multiplayer-glyph-color.png'),
 ('bookshelf_flat_border', None), ('bookshelf_flat', None),
 ('debug_glyph', None), ('debug_glyph_color', None),
 ('BannersTransparent', None), ('loading_bar', 'progressAssets'),
]
MISSING = ['onedrive_pixel_logo_stroke', 'onedrive_pixel_logo', 'White']
METADATA_REUSE = {'BannersTransparent': 'src/assets/player-permissions/button_borderless_dark.json',
                  'loading_bar': 'src/assets/storage-management/loading_bar.json'}
LICENSE_SHA = 'ca18c0dede68ce24ea1cd6f9df0813579b6f9f979787983a50baec99345f975d'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def png_size(data):
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('Source is not a PNG.')
    index = 8
    saw_ihdr = False
    while index < len(data):
        if index + 12 > len(data):
            raise ValueError('Truncated PNG chunk.')
        length = struct.unpack_from('>I', data, index)[0]
        end = index + 12 + length
        if end > len(data):
            raise ValueError('Truncated PNG payload.')
        if binascii.crc32(data[index + 4:end - 4]) & 0xffffffff != struct.unpack_from('>I', data, end - 4)[0]:
            raise ValueError('PNG CRC differs.')
        kind = data[index + 4:index + 8]
        if index == 8:
            if kind != b'IHDR' or length != 13:
                raise ValueError('PNG first chunk must be an IHDR.')
            saw_ihdr = True
        if kind == b'IEND':
            if end != len(data) or length != 0 or not saw_ihdr:
                raise ValueError('PNG does not end at a valid IEND.')
            return list(struct.unpack_from('>II', data, 16))
        index = end
    raise ValueError('PNG IEND missing.')


def prepare():
    if sha(ARCHIVE.read_bytes()) != ARCHIVE_SHA:
        raise ValueError('Fixed whole archive SHA differs; no outputs written.')
    outputs, assets, missing, source_pins = {}, {}, {}, []
    lines = ["import type {ClassicSkinAsset} from './classic-skin';",
             "import {progressAssets} from './progress-assets';", '',
             '/** Private exact public originals. Missing exact-case literals are not aliases.',
             ' * PNG physical dimensions are independent of the source control display size. */',
             'export const worldNavigationAssets = Object.freeze({']
    with zipfile.ZipFile(ARCHIVE) as archive:
        names = set(archive.namelist())
        for suffix, expected in SOURCE_PINS.items():
            file = 'resource_pack/ui/' + suffix
            data = archive.read(file)
            if sha(data) != expected:
                raise ValueError('Whole source pin differs: ' + file)
            source_pins.append({'file': file, 'bytes': len(data), 'sha256': expected})
        for stem, reuse in MATERIALS:
            key = 'textures/ui/' + stem
            source = 'resource_pack/' + key + '.png'
            png = archive.read(source)
            dimensions = png_size(png)
            metadata_source = source[:-4] + '.json'
            metadata_raw = archive.read(metadata_source) if metadata_source in names else None
            metadata = json.loads(metadata_raw) if metadata_raw is not None else None
            entry = {'source': source, 'bytes': len(png), 'sha256': sha(png),
                     'dimensions': dimensions, 'pngAllChunkCRCs': 'verified',
                     'pinnedUrl': 'https://raw.githubusercontent.com/Mojang/bedrock-samples/' + COMMIT + '/' + source}
            if reuse == 'progressAssets':
                code = (ROOT / 'src/progress-assets.ts').read_text(encoding='utf-8')
                match = re.search(r'"textures/ui/loading_bar":\s*\{ url: "data:image/png;base64,([^"]+)", width: (\d+), height: (\d+), metadata: (\{[^\n]+\}) \},', code)
                if not match or base64.b64decode(match[1], validate=True) != png or [int(match[2]), int(match[3])] != dimensions or json.loads(match[4]) != metadata:
                    raise ValueError('Existing whole progress original differs.')
                lines.append('  ' + json.dumps(key) + ': progressAssets[' + json.dumps(key) + '],')
                entry.update({'distribution': 'reuse-existing-whole-byte-embedded-original', 'file': 'src/progress-assets.ts', 'export': 'progressAssets', 'key': key})
            else:
                target = reuse or ('src/assets/world-navigation/' + stem + '.png')
                if reuse:
                    if (ROOT / target).read_bytes() != png:
                        raise ValueError('Existing whole physical original differs: ' + target)
                else:
                    outputs[target] = png
                url = './' + str(Path(target).relative_to('src')).replace('\\', '/')
                line = '  ' + json.dumps(key) + ': {url: new URL(' + json.dumps(url) + ', import.meta.url).href, width: ' + str(dimensions[0]) + ', height: ' + str(dimensions[1])
                if metadata is not None:
                    line += ', metadata: ' + json.dumps(metadata, separators=(',', ':'))
                lines.append(line + '},')
                entry.update({'distribution': 'reuse-existing-whole-physical-original' if reuse else 'copy-unchanged-whole-original', 'file': target})
            if metadata_raw is None:
                entry['metadata'] = {'status': 'absent-in-fixed-archive', 'source': metadata_source, 'value': None}
            else:
                raw_target = METADATA_REUSE.get(stem)
                if raw_target:
                    if (ROOT / raw_target).read_bytes() != metadata_raw:
                        raise ValueError('Existing raw metadata differs: ' + raw_target)
                else:
                    raw_target = 'src/assets/world-navigation/' + stem + '.json'
                    outputs[raw_target] = metadata_raw
                entry['metadata'] = {'status': 'exact-raw-metadata', 'source': metadata_source,
                                     'file': raw_target, 'bytes': len(metadata_raw), 'sha256': sha(metadata_raw), 'value': metadata}
            assets[key] = entry
        for stem in MISSING:
            key = 'textures/ui/' + stem
            file = 'resource_pack/' + key
            if file + '.png' in names or file + '.json' in names:
                raise ValueError('Previously missing exact literal changed; review before adding: ' + key)
            missing[key] = {'png': file + '.png', 'pngPresent': False,
                            'metadata': file + '.json', 'metadataPresent': False,
                            'resolution': 'explicit-host-provider-or-alias-required; no material inserted in this bank'}
        license_raw = archive.read('LICENSE.md')
    if sha(license_raw) != LICENSE_SHA:
        raise ValueError('Original public source license differs.')
    outputs['src/assets/world-navigation/LICENSE.md'] = license_raw
    lines += ['} as const satisfies Readonly<Record<string,ClassicSkinAsset>>);', '']
    outputs['src/world-navigation-assets.ts'] = '\n'.join(lines).encode('utf-8')
    ledger = {'schemaVersion': 1, 'sourceCommit': COMMIT, 'archiveSHA256': ARCHIVE_SHA,
              'status': 'finite-whole-original-identity-verified-native-rendering-unqualified',
              'sourceFiles': source_pins, 'assets': assets, 'missingExactLiterals': missing,
              'counts': {'registryKeys': len(assets), 'reusedPhysicalPNGs': 4, 'reusedEmbeddedPNGs': 1, 'newWholePNGs': 7,
                         'rawMetadataPresent': 2, 'rawMetadataAbsent': 10, 'rawMetadataReused': 2, 'newRawMetadata': 0, 'missingExactLiterals': 3},
              'sourceDisplayContracts': {
                  'game': {'outline': 'textures/ui/controller_glyph', 'color': 'textures/ui/controller_glyph_color', 'size': [21, 14]},
                  'switch-game': {'outline': 'textures/ui/controller_glyph_switch', 'color': 'textures/ui/controller_glyph_color_switch', 'size': [21, 14], 'provenance': 'selector_pane_content.switch_game_button instance overrides the game_button base textures'},
                  'multiplayer': {'outline': 'textures/ui/multiplayer_glyph', 'color': 'textures/ui/multiplayer_glyph_color', 'size': [22, 12]},
                  'classroom': {'outline': 'textures/ui/bookshelf_flat_border', 'color': 'textures/ui/bookshelf_flat', 'size': [21, 14], 'physicalPNGSize': [15, 15]},
                  'cloud': {'outline': 'textures/ui/onedrive_pixel_logo_stroke', 'color': 'textures/ui/onedrive_pixel_logo', 'size': [20, 14], 'availability': 'both-exact-literals-missing'},
                  'debug': {'outline': 'textures/ui/debug_glyph', 'color': 'textures/ui/debug_glyph_color', 'size': [15, 15]},
                  'server': {'size': [21, 14], 'outlineBinding': '#server_outline_icon', 'colorBinding': '#server_icon', 'filesystemBinding': '#server_icon_file_system', 'staticDefault': 'empty strings; no fabricated icon'},
                  'packs': {'borderTexture': 'textures/ui/White', 'borderSize': [17, 17], 'providerIconSize': [15, 15], 'kind': 'cycling-provider-icon-plus-border; not-outline-color-pair'},
                  'loading': {'wholePNGSize': [640, 8], 'uvSize': [64, 8], 'frames': 10, 'frameStep': 64, 'explicitFrameIndexDomain': [0, 9],
                              'baseSize': [64, 8], 'baseOffset': [0, 24], 'serverInstanceSize': [21, 14], 'serverInstanceOffset': [5, 0], 'clock': 'not implemented; source animation declaration is evidence only'}},
              'license': {'source': 'LICENSE.md', 'file': 'src/assets/world-navigation/LICENSE.md', 'bytes': len(license_raw), 'sha256': LICENSE_SHA},
              'limitations': ['No PNG resized, recolored, painted, optimized or synthesized.',
                              'Source control display geometry is not replaced by physical PNG dimensions.',
                              'No case-folding aliases for missing OneDrive or uppercase White literals.',
                              'Whole identity and metadata do not prove native GUI sampling, alpha, color, focus or provider behavior.']}
    outputs['docs/world-navigation-assets.json'] = (json.dumps(ledger, indent=2) + '\n').encode('utf-8')
    return outputs, ledger


def main():
    command = argparse.ArgumentParser(description=__doc__)
    command.add_argument('--check', action='store_true')
    args = command.parse_args()
    outputs, ledger = prepare()
    for name, data in outputs.items():
        target = ROOT / name
        if args.check:
            if not target.is_file() or target.read_bytes() != data:
                raise ValueError('Prepared output differs: ' + name)
        else:
            if name.startswith('src/assets/') and target.exists() and target.read_bytes() != data:
                raise ValueError('Refusing to replace a differing asset: ' + name)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
    print(json.dumps({'status': 'CHECK_PASS' if args.check else 'PREPARED', **ledger['counts']}))


if __name__ == '__main__':
    main()
