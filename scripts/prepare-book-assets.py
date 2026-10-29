"""Copy/check complete original ordinary Book assets from a fixed official ZIP.

--check is read-only and needs no private cache or reference archive. Add
--reference to verify the pinned upstream bytes too. Preparation requires that
archive and only replaces files owned by src/assets/book. No image conversion,
network, captured pixels or product build is used.
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
OWNED = (ROOT / 'src/assets/book').resolve()
MANIFEST = ROOT / 'docs/book-assets.json'
REGISTRY = ROOT / 'src/book-assets.ts'
ARCHIVE_SHA256 = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def destination(record):
    entry = record['entry']
    expected = 'src/assets/book/' + Path(entry).name
    if record['destination'] != expected:
        raise ValueError('Book destination differs from the complete original filename: ' + entry)
    target = (ROOT / expected).resolve()
    if not target.is_relative_to(OWNED) or target.parent != OWNED:
        raise ValueError('Book destination escapes its owned directory: ' + expected)
    return target


def records(manifest):
    images, metadata = manifest['resources'], manifest['textureMetadata']
    if len(images) != 32 or len(metadata) != 8:
        raise ValueError('Expected exactly32 PNGs and8 companion metadata originals.')
    for group, extension in [(images, '.png'), (metadata, '.json')]:
        for record in group:
            key = record['key']
            if not re.fullmatch(r'[a-z0-9_]+', key) or record['entry'] != 'resource_pack/textures/ui/' + key + extension:
                raise ValueError('Unexpected ordinary Book source entry: ' + record['entry'])
    if len({r['key'] for r in images}) != 32 or len({r['key'] for r in metadata}) != 8:
        raise ValueError('Duplicate Book asset key.')
    if not {r['key'] for r in metadata}.issubset({r['key'] for r in images}):
        raise ValueError('Companion metadata has no original image.')
    license_record = manifest['license']
    if license_record['entry'] != 'LICENSE.md':
        raise ValueError('Original Mojang license notice is required.')
    bundled = [*images, *metadata, license_record]
    targets = [destination(record) for record in bundled]
    if len(set(targets)) != 41:
        raise ValueError('Book whole-file destinations collide.')
    source_ui = manifest['sourceUi']
    if {r['entry'] for r in source_ui} != {'resource_pack/ui/book_screen.json', 'resource_pack/ui/_global_variables.json'} or len(source_ui) != 2:
        raise ValueError('Unexpected upstream-only Book source snapshots.')
    if manifest['archiveSha256'] != ARCHIVE_SHA256 or manifest['fixedSource']['sha256'] != ARCHIVE_SHA256:
        raise ValueError('Manifest does not describe the fixed official release.')
    return bundled, source_ui


def verify(data, record):
    if len(data) != record['bytes'] or sha(data) != record['sha256']:
        raise ValueError('Complete original bytes differ: ' + record['entry'])
    if record['entry'].endswith('.png'):
        if len(data) < 24 or data[:8] != b'\x89PNG\r\n\x1a\n' or data[12:16] != b'IHDR':
            raise ValueError('Original PNG header missing: ' + record['entry'])
        if list(struct.unpack('>II', data[16:24])) != record['dimensions']:
            raise ValueError('Original PNG dimensions differ: ' + record['entry'])
    if 'raw' in record and json.loads(data.decode('utf-8-sig')) != record['raw']:
        raise ValueError('Raw companion metadata differs: ' + record['entry'])


def replace_bytes(target, data):
    if target.exists() and target.read_bytes() == data:
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    # Replacing a directory entry preserves an external read-only hardlink;
    # writing through an existing file could modify an unrelated source inode.
    descriptor, temporary_name = tempfile.mkstemp(prefix='.book-', suffix='.tmp', dir=target.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, 'wb') as output:
            output.write(data)
        os.replace(temporary, target)
    finally:
        if temporary.exists():
            temporary.unlink()


def verify_registry(manifest):
    registry = REGISTRY.read_text(encoding='utf-8')
    if '/.cache/' in registry:
        raise ValueError('Private source URL in Book registry.')
    pattern = (r"^\s*'([a-z0-9_]+)': \{ url: new URL\('([^']+)', import\.meta\.url\)\.href, "
               r"width: (\d+), height: (\d+)(?:, metadata: (\{[^\n]*\}))? \},$")
    bindings = re.findall(pattern, registry, flags=re.MULTILINE)
    if len(bindings) != 32 or registry.count('new URL(') != 32:
        raise ValueError('Registry must bind all32 complete Book PNGs exactly once.')
    resources = {r['key']: r for r in manifest['resources']}
    metadata = {r['key']: r['raw'] for r in manifest['textureMetadata']}
    if {key for key, *_ in bindings} != set(resources):
        raise ValueError('Registry keys differ from whole source images.')
    for key, relative, width, height, raw in bindings:
        record = resources[key]
        if (ROOT / 'src' / relative).resolve() != destination(record):
            raise ValueError('Registry URL differs: ' + key)
        if [int(width), int(height)] != record['dimensions']:
            raise ValueError('Registry source dimensions differ: ' + key)
        if (json.loads(raw) if raw else None) != metadata.get(key):
            raise ValueError('Registry raw metadata differs: ' + key)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if not args.check and not args.reference:
        parser.error('Preparation requires --reference with the pinned full ZIP.')
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    bundled, source_ui = records(manifest)
    archive = None
    try:
        if args.reference:
            reference = args.reference.resolve()
            if reference.is_relative_to(OWNED):
                raise ValueError('Read-only reference archive must be outside owned output assets.')
            with reference.open('rb') as original:
                reference_sha = hashlib.file_digest(original, 'sha256').hexdigest()
            if reference_sha != ARCHIVE_SHA256:
                raise ValueError('Reference ZIP differs from the pinned official release.')
            archive = zipfile.ZipFile(reference)
            for record in [*bundled, *source_ui]:
                original = archive.read(record['entry'])
                verify(original, record)
                if not args.check and record in bundled:
                    replace_bytes(destination(record), original)
        for record in bundled:
            verify(destination(record).read_bytes(), record)
        expected = {destination(record) for record in bundled}
        actual = {path.resolve() for path in OWNED.rglob('*') if path.is_file()}
        if actual != expected:
            raise ValueError('Owned Book directory must contain only its41 complete original files.')
        verify_registry(manifest)
        print(json.dumps({'checkedWholeOriginalPng': 32, 'checkedWholeTextureMetadata': 8,
                          'licenseChecked': True, 'wholeBundledFiles': 41,
                          'upstreamOnlySourceUi': 2, 'upstreamArchiveChecked': archive is not None,
                          'registryBindings': 32, 'rawMetadataUnchanged': True,
                          'readOnly': args.check}))
    finally:
        if archive:
            archive.close()


if __name__ == '__main__':
    main()
