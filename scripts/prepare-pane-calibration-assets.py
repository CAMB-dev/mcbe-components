"""Preserve whole original demo textures for the explicit pane calibration."""
from pathlib import Path
import argparse
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE_SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'


def prepare(check=False):
    archive = ROOT / '.cache/references/bedrock-samples-v1.26.60.5-full.zip'
    assert hashlib.sha256(archive.read_bytes()).hexdigest() == ARCHIVE_SHA, 'Fixed original ZIP identity'
    records = []
    with zipfile.ZipFile(archive) as source:
        for name, entry in [('glass_red.png', 'resource_pack/textures/blocks/glass_red.png'),
                            ('glass_pane_top_red.png', 'resource_pack/textures/blocks/glass_pane_top_red.png'),
                            ('Minecraft-Sample-LICENSE.md', 'LICENSE.md')]:
            data = source.read(entry)
            destination = 'demo/assets/pane-calibration/' + name
            path = ROOT / destination
            if check:
                assert path.read_bytes() == data, 'Original bytes changed: ' + destination
            else:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
            records.append({'sourceEntry': entry, 'destination': destination,
                            'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    manifest = {'sourceRelease': 'v1.26.60.5', 'sourceCommit': '15701fa9c13923f12662984c32c124327e40e3d3',
                'archiveSHA256': ARCHIVE_SHA, 'wholeOriginalsUnmodified': True, 'resources': records}
    path = ROOT / 'docs/pane-calibration-assets.json'
    data = (json.dumps(manifest, indent=2) + '\n').encode()
    if check:
        assert path.read_bytes() == data, 'Source manifest changed'
    else:
        path.write_bytes(data)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    prepare(args.check)
    print('Two whole pane PNGs and original license: ' + ('CHECK' if args.check else 'PREPARED'))
