"""Copy/check six whole original Command Block images from the fixed official ZIP.

--check is read-only and needs no private reference. Preparation requires
--reference. No image decoding/re-encoding, downloading or product build occurs.
"""
from pathlib import Path
import argparse
import hashlib
import json
import os
import re
import struct
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OWNED = (ROOT / 'src/assets/command-block').resolve()
MANIFEST = ROOT / 'docs/command-block-assets.json'
REGISTRY = ROOT / 'src/command-block-image-assets.ts'
ARCHIVE_SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'
SPECS = {
    'dialog_background_hollow_3': ([18, 33], {'insets': [8, 23, 8, 8], 'baseSize': [18, 33]}),
    'dialog_divider': ([3, 1], {'insets': [1, 0, 1, 0], 'baseSize': [3, 1]}),
    'minimize': ([16, 16], None),
    'minimizeHover': ([16, 16], None),
    'minimizePress': ([16, 16], None),
    'arrowRight': ([8, 8], None),
}
REUSED = {
    'paste': 'src/assets/gui-icons/paste.png',
    'plus': 'src/assets/gui-icons/plus.png',
    'close_button_default': 'src/assets/book/close_button_default.png',
    'close_button_hover': 'src/assets/book/close_button_hover.png',
    'close_button_pressed': 'src/assets/book/close_button_pressed.png',
    'control': 'src/assets/jigsaw/control.png',
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def target(record):
    expected = 'src/assets/command-block/' + Path(record['entry']).name
    if record['destination'] != expected or OWNED.parent != (ROOT / 'src/assets').resolve():
        raise ValueError('Unexpected Command Block destination.')
    result = (ROOT / expected).resolve()
    if result.parent != OWNED:
        raise ValueError('Command Block destination escapes its owned directory.')
    return result


def records(manifest):
    if manifest['archiveSha256'] != ARCHIVE_SHA or manifest['fixedSource']['sha256'] != ARCHIVE_SHA:
        raise ValueError('Unexpected fixed official source release.')
    images, metadata = manifest['resources'], manifest['textureMetadata']
    if len(images) != 6 or {r['key'] for r in images} != set(SPECS):
        raise ValueError('Exactly six whole Command Block PNGs are required.')
    expected_metadata = {key for key, (_, nine) in SPECS.items() if nine is not None}
    if len(metadata) != 2 or {r['key'] for r in metadata} != expected_metadata:
        raise ValueError('Exactly two original companion metadata files are required.')
    for key, (dimensions, nine) in SPECS.items():
        image = next(r for r in images if r['key'] == key)
        if (image['entry'] != 'resource_pack/textures/ui/' + key + '.png' or
                image['dimensions'] != dimensions or image.get('nineSlice') != nine):
            raise ValueError('Image dimensions or source LTRB metadata differ: ' + key)
        if nine is not None:
            companion = next(r for r in metadata if r['key'] == key)
            if (companion['entry'] != 'resource_pack/textures/ui/' + key + '.json' or
                    companion['raw'] != {'nineslice_size': nine['insets'], 'base_size': nine['baseSize']}):
                raise ValueError('Companion source metadata differs: ' + key)
    license_record = manifest['license']
    if license_record['entry'] != 'LICENSE.md':
        raise ValueError('Original Mojang license is required.')
    bundled = [*images, *metadata, license_record]
    if len({target(r) for r in bundled}) != 9:
        raise ValueError('Command Block whole-file destinations collide.')
    if (manifest['sharedLicense']['path'] != 'src/assets/Minecraft-Sample-LICENSE.md' or
            manifest['sharedLicense']['entry'] != 'LICENSE.md'):
        raise ValueError('Existing shared Minecraft license reference is required.')
    ui = manifest['sourceUi']
    if len(ui) != 2 or {r['entry'] for r in ui} != {'resource_pack/ui/command_block_screen.json', 'resource_pack/ui/ui_common.json'}:
        raise ValueError('Unexpected upstream-only source UI entries.')
    if any(r.get('bundled') is not False for r in ui):
        raise ValueError('Source UI snapshots must remain upstream-only.')
    reused = manifest['reusedOriginals']
    if len(reused) != 6 or {r['key'] for r in reused} != set(REUSED):
        raise ValueError('Exactly six existing whole-source dependencies must be reused.')
    for record in reused:
        if (record['path'] != REUSED[record['key']] or
                record['entry'] != 'resource_pack/textures/ui/' + record['key'] + '.png' or
                record.get('copied') is not False):
            raise ValueError('Unexpected shared original dependency.')
    return bundled, ui, reused


def verify(data, record):
    if len(data) != record['bytes'] or sha(data) != record['sha256']:
        raise ValueError('Whole original differs: ' + record['entry'])
    if record['entry'].endswith('.png'):
        if len(data) < 24 or data[:8] != b'\x89PNG\r\n\x1a\n' or data[12:16] != b'IHDR':
            raise ValueError('Original PNG header missing.')
        if list(struct.unpack('>II', data[16:24])) != record['dimensions']:
            raise ValueError('Original PNG dimensions differ.')
    if 'raw' in record and json.loads(data.decode('utf-8-sig')) != record['raw']:
        raise ValueError('Original companion metadata differs.')


def replace(target_path, data):
    if target_path.exists() and target_path.read_bytes() == data:
        return
    target_path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, name = tempfile.mkstemp(prefix='.command-block-', suffix='.tmp', dir=target_path.parent)
    temporary = Path(name)
    try:
        with os.fdopen(descriptor, 'wb') as output:
            output.write(data)
        # Replace the owned directory entry instead of writing through a possible
        # external hardlink. Resolved output paths are checked by target().
        os.replace(temporary, target_path)
    finally:
        if temporary.exists():
            temporary.unlink()


def verify_registry(manifest):
    registry = REGISTRY.read_text(encoding='utf-8')
    pattern = (r"^\s*(\w+): \{ url: new URL\('([^']+)', import\.meta\.url\)\.href, "
               r"sourceSize: \[(\d+), (\d+)\](?:, nineSlice: (\{[^\n]*\}))? \},$")
    bindings = re.findall(pattern, registry, flags=re.MULTILINE)
    if len(bindings) != 6 or len({r[0] for r in bindings}) != 6 or registry.count('new URL(') != 6:
        raise ValueError('Registry must bind exactly six complete originals.')
    resources = {r['key']: r for r in manifest['resources']}
    if {r[0] for r in bindings} != set(resources):
        raise ValueError('Registry keys differ from original PNGs.')
    for key, relative, width, height, nine in bindings:
        if relative != './assets/command-block/' + key + '.png' or (ROOT / 'src' / relative).resolve() != target(resources[key]):
            raise ValueError('Registry URL differs: ' + key)
        if [int(width), int(height)] != resources[key]['dimensions']:
            raise ValueError('Registry dimensions differ: ' + key)
        if (json.loads(nine) if nine else None) != resources[key].get('nineSlice'):
            raise ValueError('Registry source LTRB/base-size differs: ' + key)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if not args.check and not args.reference:
        parser.error('Preparation requires --reference with the fixed full ZIP.')
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    bundled, ui, reused = records(manifest)
    verify_registry(manifest)
    verify((ROOT / manifest['sharedLicense']['path']).read_bytes(), manifest['sharedLicense'])
    for record in reused:
        verify((ROOT / record['path']).read_bytes(), record)
    archive = None
    try:
        if args.reference:
            if args.reference.resolve().is_relative_to(OWNED):
                raise ValueError('Reference archive must remain outside owned output assets.')
            with args.reference.open('rb') as original:
                if hashlib.file_digest(original, 'sha256').hexdigest() != ARCHIVE_SHA:
                    raise ValueError('Unexpected official archive identity.')
            archive = zipfile.ZipFile(args.reference)
            # Validate all selected complete originals, source references and
            # registry before changing any output file.
            payloads = []
            for record in [*bundled, *ui, *reused]:
                info = archive.getinfo(record['entry'])
                if info.file_size != record['bytes'] or info.file_size > 1024 * 1024:
                    raise ValueError('Unexpected bounded original entry size.')
                data = archive.read(info)
                verify(data, record)
                if record in bundled:
                    payloads.append((record, data))
            if not args.check:
                for record, data in payloads:
                    replace(target(record), data)
        for record in bundled:
            verify(target(record).read_bytes(), record)
        print(json.dumps({'wholePNG': 6, 'PNGBytes': sum(r['bytes'] for r in manifest['resources']),
                          'wholeTextureMetadata': 2, 'reusedWholeOriginals': 6, 'license': True, 'sharedLicense': True,
                          'upstreamVerified': archive is not None, 'readOnly': args.check,
                          'sourceInsetsOrder': 'LTRB', 'nativeMappingVerified': False}))
    finally:
        if archive:
            archive.close()


if __name__ == '__main__':
    main()
