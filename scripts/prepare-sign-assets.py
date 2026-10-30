"""Copy/check whole original Sign images from the fixed official full ZIP.

--check is read-only without private inputs. Preparation requires --reference.
No image conversion, download, captured pixels or product build is used.
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
OWNED = (ROOT / 'src/assets/sign').resolve()
MANIFEST = ROOT / 'docs/sign-assets.json'
ARCHIVE_SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def target(record):
    expected = 'src/assets/sign/' + Path(record['entry']).name
    if record['destination'] != expected:
        raise ValueError('Unexpected Sign destination.')
    result = (ROOT / expected).resolve()
    if result.parent != OWNED:
        raise ValueError('Sign destination escapes its owned directory.')
    return result


def verify(data, record):
    if len(data) != record['bytes'] or sha(data) != record['sha256']:
        raise ValueError('Whole original differs: ' + record['entry'])
    if record['entry'].endswith('.png'):
        if data[:8] != b'\x89PNG\r\n\x1a\n' or list(struct.unpack('>II', data[16:24])) != record['dimensions']:
            raise ValueError('Original PNG dimensions differ.')


def replace(target_path, data):
    if target_path.exists() and target_path.read_bytes() == data:
        return
    target_path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, name = tempfile.mkstemp(prefix='.sign-', suffix='.tmp', dir=target_path.parent)
    temporary = Path(name)
    try:
        with os.fdopen(descriptor, 'wb') as output:
            output.write(data)
        os.replace(temporary, target_path)
    finally:
        if temporary.exists():
            temporary.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    if manifest['archiveSha256'] != ARCHIVE_SHA:
        raise ValueError('Unexpected source release.')
    images = manifest['resources']
    if len(images) != 26 or len({r['key'] for r in images}) != 26 or manifest['textureMetadata']:
        raise ValueError('Expected26 whole source PNGs without invented metadata.')
    for r in images:
        if not re.fullmatch(r'[a-z0-9_]+', r['key']) or r['entry'] != 'resource_pack/textures/ui/' + r['key'] + '.png':
            raise ValueError('Unexpected source image entry.')
    if manifest['license']['entry'] != 'LICENSE.md':
        raise ValueError('Original upstream license required.')
    bundled = [*images, manifest['license']]
    if len({target(r) for r in bundled}) != 27:
        raise ValueError('Sign destinations collide.')
    if not args.check and not args.reference:
        parser.error('Preparation requires --reference with the fixed full ZIP.')
    archive = None
    try:
        if args.reference:
            if args.reference.resolve().is_relative_to(OWNED):
                raise ValueError('Reference archive must be outside owned outputs.')
            with args.reference.open('rb') as source_file:
                if hashlib.file_digest(source_file, 'sha256').hexdigest() != ARCHIVE_SHA:
                    raise ValueError('Unexpected official archive identity.')
            archive = zipfile.ZipFile(args.reference)
        for r in bundled:
            output = target(r)
            if archive:
                data = archive.read(r['entry'])
                verify(data, r)
                if not args.check:
                    replace(output, data)
            verify(output.read_bytes(), r)
        if archive:
            for r in manifest['sourceUi']:
                verify(archive.read(r['entry']), r)
        registry = (ROOT / 'src/sign-assets.ts').read_text(encoding='utf-8')
        bindings = re.findall(r"(\w+): \{ src: new URL\('\./assets/sign/([^']+)', import.meta.url\)\.href, sourceSize: \[(\d+), (\d+)\] as const \}", registry)
        if len(bindings) != 26 or len({x[0] for x in bindings}) != 26:
            raise ValueError('Registry must bind exactly26 complete originals.')
        keyed = {r['key']: r for r in images}
        for key, filename, width, height in bindings:
            if filename != key + '.png' or [int(width), int(height)] != keyed[key]['dimensions']:
                raise ValueError('Registry binding differs.')
        print(json.dumps({'wholePNG': 26, 'PNGBytes': sum(r['bytes'] for r in images),
                          'license': True, 'upstreamVerified': archive is not None,
                          'readOnly': args.check, 'nativeMappingVerified': False}))
    finally:
        if archive:
            archive.close()


if __name__ == '__main__':
    main()
