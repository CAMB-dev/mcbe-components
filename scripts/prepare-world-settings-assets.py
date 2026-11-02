"""Prepare/check a private World Settings material map from unchanged public ZIP bytes.

The six complete PNG/JSON pairs already exist in other committed asset families;
they are verified read-only and referenced rather than copied or repainted.
"""
from pathlib import Path
import argparse
import binascii
import hashlib
import json
import struct
import zipfile

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / '.cache/references/bedrock-samples-v1.26.60.5-full.zip'
ARCHIVE_SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'
COMMIT = '15701fa9c13923f12662984c32c124327e40e3d3'
METADATA_SHA = '622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65'
LICENSE_SHA = 'ca18c0dede68ce24ea1cd6f9df0813579b6f9f979787983a50baec99345f975d'
ASSETS = [
    ('dark', 'button_borderless_dark', 'player-permissions', 'fc332fee4a0f800491f1e6ad4925e175e556bcfcba5d587678dc1731f1780548'),
    ('darkHover', 'button_borderless_darkhover', 'player-permissions', '40c380b48b04c5a9b222b0f9f95ecaa7fb97295d2e776f1094a323886d4f849b'),
    ('darkPressed', 'button_borderless_darkpressed', 'player-permissions', 'f2037494b69a14f90f008cc0d5f74c8280bac9bc2bfba9f4405ead8c103c9532'),
    ('realms', 'realmsContent', 'play-screen', '7d27d0ab86682f65d6cec8a8825224aafdce9043d8beca066464a56f76ef2950'),
    ('realmsHover', 'realmsContentHover', 'play-screen', '276867950cb819f53616056f0bc1ffea0a5349923fbf7fad3fe441baf787e15e'),
    ('realmsPressed', 'realmsContentPressed', 'play-screen', '11a087be7187232de7db572afbcf1d6b27c75bfb96ea0e482517c6ec80ed32ea'),
]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def png_size(data):
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('Original is not a PNG.')
    offset = 8
    while offset < len(data):
        if offset + 12 > len(data):
            raise ValueError('Truncated PNG chunk.')
        length = struct.unpack_from('>I', data, offset)[0]
        end = offset + 12 + length
        if end > len(data):
            raise ValueError('Truncated PNG payload.')
        if binascii.crc32(data[offset + 4:end - 4]) & 0xffffffff != struct.unpack_from('>I', data, end - 4)[0]:
            raise ValueError('Original PNG CRC mismatch.')
        if data[offset + 4:offset + 8] == b'IEND':
            if end != len(data):
                raise ValueError('Unexpected bytes after PNG IEND.')
            return list(struct.unpack_from('>II', data, 16))
        offset = end
    raise ValueError('PNG IEND is missing.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if sha(ARCHIVE.read_bytes()) != ARCHIVE_SHA:
        raise ValueError('Fixed public ZIP SHA256 differs; no output was written.')
    lines = ["import type {ClassicSkinAsset} from './classic-skin';", '',
             '/** Private source materials. Whole PNGs and raw metadata are reused unchanged.',
             ' * Physical PNG dimensions and metadata base_size are deliberately not normalized. */',
             'export const worldActionAssets = Object.freeze({']
    assets = {}
    with zipfile.ZipFile(ARCHIVE) as archive:
        for key, stem, folder, expected in ASSETS:
            source = 'resource_pack/textures/ui/' + stem
            png, raw = archive.read(source + '.png'), archive.read(source + '.json')
            if sha(png) != expected or sha(raw) != METADATA_SHA:
                raise ValueError('Unexpected original material identity: ' + stem)
            dimensions = png_size(png)
            metadata = json.loads(raw)
            if metadata != {'nineslice_size': 1, 'base_size': [4, 4]}:
                raise ValueError('Unexpected raw source metadata.')
            target = 'src/assets/' + folder + '/' + stem
            if (ROOT / (target + '.png')).read_bytes() != png or (ROOT / (target + '.json')).read_bytes() != raw:
                raise ValueError('Existing reused whole asset differs; preserved without overwrite: ' + target)
            url = './assets/' + folder + '/' + stem + '.png'
            lines.append('  ' + key + ': {url: new URL(' + json.dumps(url) + ', import.meta.url).href, width: ' + str(dimensions[0]) + ', height: ' + str(dimensions[1]) + ', metadata: ' + json.dumps(metadata, separators=(',', ':')) + '},')
            assets[key] = {'source': source + '.png', 'file': target + '.png', 'bytes': len(png),
                           'sha256': expected, 'dimensions': dimensions,
                           'metadata': {'source': source + '.json', 'file': target + '.json',
                                        'bytes': len(raw), 'sha256': METADATA_SHA, 'value': metadata},
                           'distribution': 'reuse-existing-whole-original-png-and-raw-json',
                           'pinnedUrl': 'https://raw.githubusercontent.com/Mojang/bedrock-samples/' + COMMIT + '/' + source + '.png'}
        license_bytes = archive.read('LICENSE.md')
    if len(license_bytes) != 222 or sha(license_bytes) != LICENSE_SHA:
        raise ValueError('Original sample license differs.')
    lines += ['} as const satisfies Readonly<Record<string, ClassicSkinAsset>>);', '']
    manifest = {'schemaVersion': 1, 'sourceCommit': COMMIT, 'archiveSHA256': ARCHIVE_SHA,
                'status': 'whole-public-source-materials-verified-native-rendering-unqualified',
                'modifications': 'None; no PNG duplicated/repainted/resized and no raw metadata normalized.',
                'assets': assets, 'license': {'source': 'LICENSE.md', 'file': 'src/assets/world-settings/LICENSE.md',
                                             'bytes': 222, 'sha256': LICENSE_SHA},
                'sourceContracts': {'dark': 'settings_common.action_button_dark_text -> common_buttons.dark_text_button -> dark_button_assets; button_borderless_dark/default-hover-pressed',
                                    'realms': 'world_section.play_or_create_stack_bedrock.play_on_realm_button overrides only default/hover/pressed with realmsContent series; locked remains disabledButtonNoBorder'},
                'scope': 'Private six-key material map only. Source image/metadata identity does not prove native GUI, layout, font, alpha or sampling parity.'}
    outputs = {'src/world-settings-assets.ts': '\n'.join(lines).encode('utf-8'),
               'docs/world-settings-assets.json': (json.dumps(manifest, indent=2) + '\n').encode('utf-8'),
               'src/assets/world-settings/LICENSE.md': license_bytes}
    for relative, data in outputs.items():
        target = ROOT / relative
        if args.check:
            if target.read_bytes() != data:
                raise ValueError('Prepared output differs: ' + relative)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
    print(json.dumps({'status': 'PASS_CHECK' if args.check else 'PREPARED', 'keys': list(assets),
                      'wholePNGsReused': 6, 'rawJSONReused': 6, 'newPNGs': 0, 'licenseSHA256': LICENSE_SHA}))


if __name__ == '__main__':
    main()
