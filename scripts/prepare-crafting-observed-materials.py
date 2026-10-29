"""Copy/check complete original textures for the demo-only observed36 collection.

Preparation requires --reference with the pinned official full ZIP. --check
verifies existing files without a ZIP; add --reference to also verify upstream
entries. No network, image conversion, capture data or product build is used.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'demo/assets/crafting-observed/provenance.json'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def checked_path(name):
    path = (ROOT / name).resolve()
    if not path.is_relative_to(ROOT.resolve()):
        raise ValueError('Destination escapes the repository: ' + name)
    return path


def verify(data, record):
    if sha(data) != record['sha256']:
        raise ValueError('Original bytes differ: ' + record.get('entry', 'license'))
    if 'bytes' in record and len(data) != record['bytes']:
        raise ValueError('Original byte length differs: ' + record['entry'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    if not args.check and not args.reference:
        parser.error('Preparation requires --reference with the pinned full ZIP.')
    records = [*manifest['resources'], manifest['license']]
    archive = None
    try:
        if args.reference:
            with args.reference.open('rb') as reference_file:
                reference_sha = hashlib.file_digest(reference_file, 'sha256').hexdigest()
            if reference_sha != manifest['archiveSha256']:
                raise ValueError('Reference ZIP hash does not match the pinned release.')
            archive = zipfile.ZipFile(args.reference)
        for record in records:
            target = checked_path(record['destination'])
            if archive:
                original = archive.read(record['entry'])
                verify(original, record)
                if not args.check and record.get('newDemoOriginal', record is manifest['license']):
                    if not target.is_relative_to((ROOT / 'demo/assets/crafting-observed').resolve()):
                        raise ValueError('Preparation may only write its owned demo assets.')
                    target.parent.mkdir(parents=True, exist_ok=True)
                    if not target.exists() or target.read_bytes() != original:
                        target.write_bytes(original)
            verify(target.read_bytes(), record)
        registry = (ROOT / 'demo/crafting-observed-materials.ts').read_text(encoding='utf-8')
        if '/.cache/' in registry:
            raise ValueError('Private source URL in public demo registry.')
        bindings = re.findall(r"(\w+): \{ src: new URL\('([^']+)', import.meta.url\)\.href, width: (\d+), height: (\d+) \}", registry)
        if len(bindings) != len(manifest['resources']):
            raise ValueError('Material registry must bind all whole originals exactly once.')
        keyed = {record['key']: record for record in manifest['resources']}
        for key, relative, width, height in bindings:
            record = keyed[key]
            if (ROOT / 'demo' / relative).resolve() != checked_path(record['destination']):
                raise ValueError('Registry URL differs: ' + key)
            if [int(width), int(height)] != record['dimensions']:
                raise ValueError('Registry dimensions differ: ' + key)
        print(json.dumps({'checkedWholeOriginals': len(manifest['resources']),
                          'newDemoOriginals': sum(r['newDemoOriginal'] for r in manifest['resources']),
                          'reusedOriginals': sum(not r['newDemoOriginal'] for r in manifest['resources']),
                          'licenseChecked': True, 'upstreamArchiveChecked': archive is not None,
                          'readOnly': args.check}))
    finally:
        if archive:
            archive.close()


if __name__ == '__main__':
    main()
