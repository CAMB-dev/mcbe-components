"""Copy/check the whole fixed-source EmoteWheel dependency pack.

--check is read-only and needs no archive or private cache. Preparation requires
--reference with the pinned full official ZIP. All inputs are verified before
atomic per-file replacement. No network, image encoding, JSONC evaluation,
product build or native renderer operation is performed.
"""
from pathlib import Path, PurePosixPath
import argparse
from collections import Counter
import hashlib
import json
import os
import struct
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OWNED = ROOT / 'src/assets/emote-wheel'
MANIFEST = ROOT / 'docs/emote-wheel-assets.json'
REGISTRY = ROOT / 'src/emote-wheel-assets.ts'
ARCHIVE_SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'
COMMIT = '15701fa9c13923f12662984c32c124327e40e3d3'
LICENSE_SHA = 'ca18c0dede68ce24ea1cd6f9df0813579b6f9f979787983a50baec99345f975d'
# key: exact whole original PNG basename, logical dimensions, source LTRB slice.
SPECS = {
    'wheelBase': ('emote_wheel_updated_base', [143, 143], None),
    'wheelSelect0': ('emote_wheel_updated_select_0', [143, 143], None),
    'wheelSelect1': ('emote_wheel_updated_select_1', [143, 143], None),
    'wheelSelect2': ('emote_wheel_updated_select_2', [143, 143], None),
    'wheelSelect3': ('emote_wheel_updated_select_3', [143, 143], None),
    'iconNone': ('icon_none', [14, 14], None),
    'black': ('Black', [2, 2], 1),
    'keyboardTooltip': ('keyboard_tooltip_icon', [17, 17], [5, 3, 5, 7]),
    'gamepadPlaceholder': ('grey_gamepad_icon_button', [15, 13], None),
    'buttonLight': ('button_borderless_light', [4, 4], 1),
    'buttonLightHover': ('button_borderless_lighthover', [4, 4], 1),
    'buttonLightPressed': ('button_borderless_lightpressed', [4, 4], 1),
    'buttonLightDisabled': ('disabledButtonNoBorder', [2, 2], 1),
    'focusWhite': ('focus_border_white', [5, 5], 1),
}
SOURCE_FILES = {
    'emoteWheelScreen': 'resource_pack/ui/emote_wheel_screen.json',
    'personaCommon': 'resource_pack/ui/persona_common.json',
    'uiCommon': 'resource_pack/ui/ui_common.json',
    'uiTemplateButtons': 'resource_pack/ui/ui_template_buttons.json',
    'globalVariables': 'resource_pack/ui/_global_variables.json',
    'enUS': 'resource_pack/texts/en_US.lang',
    'zhCN': 'resource_pack/texts/zh_CN.lang',
    'uiTemplateDialogs': 'resource_pack/ui/ui_template_dialogs.json',
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def destination(record):
    expected = 'src/assets/emote-wheel/' + PurePosixPath(record['entry']).name
    if record['destination'] != expected:
        raise ValueError('Emote output must preserve its complete original basename.')
    target = ROOT / expected
    for path in [ROOT / 'src', ROOT / 'src/assets', OWNED, target]:
        if path.is_symlink() or (hasattr(path, 'is_junction') and path.is_junction()):
            raise ValueError('Owned output must not follow a symlink/junction.')
        if path.resolve() != path.absolute():
            raise ValueError('Owned output differs from its literal path.')
    if target.parent != OWNED or not target.resolve().is_relative_to(OWNED.resolve()):
        raise ValueError('Output escapes the owned EmoteWheel bank.')
    return target


def records(manifest):
    fixed = manifest['fixedSource']
    if fixed['sha256'] != ARCHIVE_SHA or fixed['commit'] != COMMIT or fixed['release'] != 'v1.26.60.5-full':
        raise ValueError('Unexpected fixed official source identity.')
    images, metadata, source = manifest['resources'], manifest['textureMetadata'], manifest['sourceFiles']
    if len(images) != 14 or [r['key'] for r in images] != list(SPECS):
        raise ValueError('Exactly 14 ordered original images are required.')
    expected_metadata = [key for key, (_, _, insets) in SPECS.items() if insets is not None]
    if len(metadata) != 7 or [r['key'] for r in metadata] != expected_metadata:
        raise ValueError('Exactly seven complete companion metadata originals are required.')
    for image in images:
        stem, size, insets = SPECS[image['key']]
        nine = None if insets is None else {'insets': insets, 'baseSize': size}
        if image['entry'] != f'resource_pack/textures/ui/{stem}.png' or image['dimensions'] != size or image.get('nineSlice') != nine:
            raise ValueError('Whole image source/dimensions/LTRB slice differs.')
        if insets is not None:
            item = next(r for r in metadata if r['key'] == image['key'])
            if (item['entry'] != f'resource_pack/textures/ui/{stem}.json' or
                    item['raw'] != {'nineslice_size': insets, 'base_size': size}):
                raise ValueError('Original companion metadata differs.')
    if len(source) != 8 or {r['key']: r['entry'] for r in source} != SOURCE_FILES:
        raise ValueError('Six whole UI and two whole locale source files are required.')
    license_record = manifest['license']
    if license_record['entry'] != 'LICENSE.md' or license_record['bytes'] != 222 or license_record['sha256'] != LICENSE_SHA:
        raise ValueError('Unmodified original Mojang EULA notice is required.')
    bundled = [*images, *metadata, *source, license_record]
    paths = [str(destination(record)) for record in bundled]
    if len(paths) != 30 or len({path.casefold() for path in paths}) != 30:
        raise ValueError('Expected 30 noncolliding whole output paths.')
    return bundled


def verify(data, record):
    if len(data) != record['bytes'] or sha(data) != record['sha256']:
        raise ValueError('Whole original bytes differ: ' + record['entry'])
    if record['entry'].endswith('.png'):
        if data[:8] != b'\x89PNG\r\n\x1a\n' or data[12:16] != b'IHDR' or len(data) < 33:
            raise ValueError('Original PNG IHDR missing.')
        if list(struct.unpack('>II', data[16:24])) != record['dimensions']:
            raise ValueError('Original PNG dimensions differ.')
    if 'raw' in record and json.loads(data.decode('utf-8-sig')) != record['raw']:
        raise ValueError('Original texture metadata differs.')


def registry_text(manifest):
    lines = ['// Whole original fixed v1.26.60.5 images; no crops or image re-encoding.',
             '// Private registry; metadata is logical LTRB, not CSS TRBL.',
             "import type { GuiImageNineSlice } from './gui-image-geometry';",
             'export const emoteWheelAssets = {']
    for image in manifest['resources']:
        width, height = image['dimensions']
        name = PurePosixPath(image['entry']).name
        nine = ', nineSlice: ' + json.dumps(image['nineSlice']) if 'nineSlice' in image else ''
        lines.append(f"  {image['key']}: {{ url: new URL('./assets/emote-wheel/{name}', import.meta.url).href, width: {width}, height: {height}, sourceSize: [{width}, {height}]{nine} }},")
    lines += ['} as const satisfies Record<string, { url: string; width: number; height: number; sourceSize: readonly [number, number]; nineSlice?: GuiImageNineSlice }>;', '']
    return '\n'.join(lines)


def replace(target, data):
    if target.exists() and target.read_bytes() == data:
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix='.emote-wheel-', suffix='.tmp', dir=target.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, 'wb') as output:
            output.write(data)
        os.replace(temporary, target)
    finally:
        if temporary.exists():
            temporary.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--reference', type=Path)
    args = parser.parse_args()
    if not args.check and not args.reference:
        parser.error('Preparation requires --reference with the fixed official full ZIP.')
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    bundled = records(manifest)
    if REGISTRY.read_text(encoding='utf-8') != registry_text(manifest):
        raise ValueError('Private registry URLs / sizes / source slices differ.')
    shared = manifest['sharedLicense']
    if shared != {'entry': 'LICENSE.md', 'path': 'src/assets/Minecraft-Sample-LICENSE.md', 'bytes': 222, 'sha256': LICENSE_SHA}:
        raise ValueError('Existing shared original license reference differs.')
    verify((ROOT / shared['path']).read_bytes(), shared)
    expected = {destination(record).name for record in bundled}
    if OWNED.exists() and any(path.name not in expected or not path.is_file() for path in OWNED.iterdir()):
        raise ValueError('Unexpected owned-bank content; no automatic cleanup is performed.')
    if args.reference:
        if args.reference.resolve().is_relative_to(OWNED.resolve()):
            raise ValueError('Reference must be outside owned outputs.')
        with args.reference.open('rb') as reference:
            if hashlib.file_digest(reference, 'sha256').hexdigest() != ARCHIVE_SHA:
                raise ValueError('Official full ZIP SHA256 differs.')
        with zipfile.ZipFile(args.reference) as archive:
            names, payloads = Counter(archive.namelist()), []
            for record in bundled:
                if names[record['entry']] != 1:
                    raise ValueError('Exact-case ZIP entry missing or duplicated.')
                info = archive.getinfo(record['entry'])
                if info.file_size != record['bytes'] or info.file_size > 2 * 1024 * 1024:
                    raise ValueError('Original entry exceeds its fixed source bound.')
                data = archive.read(info)
                verify(data, record)
                payloads.append((record, data))
            if not args.check:
                for record, data in payloads:
                    replace(destination(record), data)
    for record in bundled:
        verify(destination(record).read_bytes(), record)
    print(json.dumps({'wholePNG': 14, 'PNGBytes': sum(r['bytes'] for r in manifest['resources']),
                      'wholeTextureMetadata': 7, 'wholeUISource': 6, 'wholeLocales': 2,
                      'ownedFiles': 30, 'ownedBytes': sum(r['bytes'] for r in bundled),
                      'sharedLicenseUnchanged': True, 'readOnly': args.check,
                      'upstreamVerified': args.reference is not None,
                      'sourceJSONOrLocaleExecuted': False, 'nativePixelParityClaim': False}))


if __name__ == '__main__':
    main()
