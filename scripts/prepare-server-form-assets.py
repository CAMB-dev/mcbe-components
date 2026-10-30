"""Copy/check three whole original Server Form images from the fixed official ZIP.

--check is read-only and needs no private reference. Preparation requires
--reference. No image decoding/re-encoding, downloading or product build occurs.
"""
from pathlib import Path
import argparse
import base64
import hashlib
import json
import os
import re
import struct
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OWNED = (ROOT / 'src/assets/server-forms').resolve()
MANIFEST = ROOT / 'docs/server-form-assets.json'
REGISTRY = ROOT / 'src/server-form-image-assets.ts'
ARCHIVE_SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'
SPECS = {
    'list_item_divider_line_light': ([1, 1], {'nineslice_size': 1, 'base_size': [1, 1]}),
    'tooltip_default_chevron': ([19, 13], None),
    'tooltip_inverted_chevron': ([19, 13], None),
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def target(record):
    expected = 'src/assets/server-forms/' + Path(record['entry']).name
    if record['destination'] != expected or OWNED.parent != (ROOT / 'src/assets').resolve():
        raise ValueError('Unexpected Server Form destination.')
    result = (ROOT / expected).resolve()
    if result.parent != OWNED:
        raise ValueError('Server Form destination escapes its owned directory.')
    return result


def records(manifest):
    if manifest['archiveSha256'] != ARCHIVE_SHA or manifest['fixedSource']['sha256'] != ARCHIVE_SHA:
        raise ValueError('Unexpected fixed official source release.')
    images, metadata = manifest['resources'], manifest['textureMetadata']
    if len(images) != 3 or {r['key'] for r in images} != set(SPECS):
        raise ValueError('Exactly three whole Server Form PNGs are required.')
    expected_metadata = {key for key, (_, nine) in SPECS.items() if nine is not None}
    if len(metadata) != 1 or {r['key'] for r in metadata} != expected_metadata:
        raise ValueError('Exactly one original raw metadata file is required.')
    for key, (dimensions, nine) in SPECS.items():
        image = next(r for r in images if r['key'] == key)
        if (image['entry'] != 'resource_pack/textures/ui/' + key + '.png' or
                image['dimensions'] != dimensions or image.get('metadata') != nine):
            raise ValueError('Image dimensions or source LTRB metadata differ: ' + key)
        if nine is not None:
            companion = next(r for r in metadata if r['key'] == key)
            if (companion['entry'] != 'resource_pack/textures/ui/' + key + '.json' or
                    companion['raw'] != nine):
                raise ValueError('Companion source metadata differs: ' + key)
    license_record = manifest['license']
    if license_record['entry'] != 'LICENSE.md':
        raise ValueError('Original Mojang license is required.')
    bundled = [*images, *metadata, license_record]
    if len({target(r) for r in bundled}) != 5:
        raise ValueError('Server Form whole-file destinations collide.')
    if (manifest['sharedLicense']['path'] != 'src/assets/Minecraft-Sample-LICENSE.md' or
            manifest['sharedLicense']['entry'] != 'LICENSE.md'):
        raise ValueError('Existing shared Minecraft license reference is required.')
    ui = manifest['sourceUi']
    if len(ui) != 6 or {r['entry'] for r in ui} != {'resource_pack/ui/ui_template_buttons.json', 'resource_pack/ui/ui_common.json', 'resource_pack/ui/server_form.json', 'resource_pack/ui/settings_sections/settings_common.json', 'resource_pack/ui/progress_screen.json', 'resource_pack/ui/ui_template_dialogs.json'}:
        raise ValueError('Unexpected upstream-only source UI entries.')
    if any(r.get('bundled') is not False for r in ui):
        raise ValueError('Source UI snapshots must remain upstream-only.')
    embedded = manifest['reusedEmbedded']
    if (embedded['file'] != 'src/system-screens-textures.css' or embedded['cssVariable'] != '--mc-system-loading-waveform' or
            embedded['entry'] != 'resource_pack/textures/ui/loading_bar.png' or embedded['dimensions'] != [640, 8] or embedded.get('copied') is not False):
        raise ValueError('Original whole loading waveform must be reused, not duplicated.')
    reused_metadata = manifest['reusedMetadata']
    if (reused_metadata['entry'] != 'resource_pack/textures/ui/loading_bar.json' or reused_metadata['raw'] != {'base_size': [640, 8]} or
            reused_metadata.get('bundled') is not False):
        raise ValueError('Original waveform source metadata differs.')
    return bundled, ui, embedded, reused_metadata


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
    descriptor, name = tempfile.mkstemp(prefix='.server-forms-', suffix='.tmp', dir=target_path.parent)
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
               r"sourceSize: \[(\d+), (\d+)\](?:, metadata: (\{[^\n]*\}))? \},$")
    bindings = re.findall(pattern, registry, flags=re.MULTILINE)
    if len(bindings) != 3 or len({r[0] for r in bindings}) != 3 or registry.count('new URL(') != 3:
        raise ValueError('Registry must bind exactly three complete originals.')
    resources = {r['key']: r for r in manifest['resources']}
    if {r[0] for r in bindings} != set(resources):
        raise ValueError('Registry keys differ from original PNGs.')
    for key, relative, width, height, nine in bindings:
        if relative != './assets/server-forms/' + key + '.png' or (ROOT / 'src' / relative).resolve() != target(resources[key]):
            raise ValueError('Registry URL differs: ' + key)
        if [int(width), int(height)] != resources[key]['dimensions']:
            raise ValueError('Registry dimensions differ: ' + key)
        if (json.loads(nine) if nine else None) != resources[key].get('metadata'):
            raise ValueError('Registry source LTRB/base-size differs: ' + key)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if not args.check and not args.reference:
        parser.error('Preparation requires --reference with the fixed full ZIP.')
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    bundled, ui, embedded, reused_metadata = records(manifest)
    verify_registry(manifest)
    verify((ROOT / manifest['sharedLicense']['path']).read_bytes(), manifest['sharedLicense'])
    css = (ROOT / embedded['file']).read_text(encoding='utf-8')
    pattern = re.escape(embedded['cssVariable']) + r'\s*:\s*url\("data:image/png;base64,([A-Za-z0-9+/=]+)"\)'
    urls = re.findall(pattern, css)
    if len(urls) != 1:
        raise ValueError('Expected one existing complete loading waveform URL.')
    verify(base64.b64decode(urls[0], validate=True), embedded)
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
            for record in [*bundled, *ui, embedded, reused_metadata]:
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
        print(json.dumps({'wholePNG': 3, 'PNGBytes': sum(r['bytes'] for r in manifest['resources']),
                          'wholeTextureMetadata': 1, 'reusedWholeLoadingWaveform': True, 'license': True, 'sharedLicense': True,
                          'upstreamVerified': archive is not None, 'readOnly': args.check,
                          'physicalNineSliceApplied': False, 'nativeMappingVerified': False}))
    finally:
        if archive:
            archive.close()


if __name__ == '__main__':
    main()
