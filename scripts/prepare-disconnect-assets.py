"""Copy/check unchanged public sample backgrounds; never reads installed game resources."""
from pathlib import Path
import argparse
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / '.cache/references/bedrock-samples-v1.26.60.5-full.zip'
ARCHIVE_SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'
FILES = [
    ('resource_pack/textures/ui/bg32.png', 'bg32.png', '76842acb4488a28062ca494d9150a56db94d1555704d66340ef72cd42066d6bb'),
    ('resource_pack/textures/ui/portalBg.png', 'portalBg.png', '1d985d815a28be108c2b550e32c12df8d520dfdbd3ca6515255878917e994a90'),
    ('LICENSE.md', 'LICENSE.md', 'ca18c0dede68ce24ea1cd6f9df0813579b6f9f979787983a50baec99345f975d'),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    sha = lambda data: hashlib.sha256(data).hexdigest()
    if sha(ARCHIVE.read_bytes()) != ARCHIVE_SHA:
        raise ValueError('The fixed public source archive identity differs.')
    destination = ROOT / 'src/assets/disconnect'
    assets = []
    with zipfile.ZipFile(ARCHIVE) as archive:
        for entry, filename, digest in FILES:
            data = archive.read(entry)
            if sha(data) != digest:
                raise ValueError('Unexpected original bytes: ' + entry)
            target = destination / filename
            if args.check:
                if target.read_bytes() != data:
                    raise ValueError('Prepared original differs: ' + str(target))
            else:
                destination.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
            assets.append({'source': entry, 'file': 'src/assets/disconnect/' + filename,
                           'bytes': len(data), 'sha256': digest})
    metadata = {'sourceCommit': '15701fa9c13923f12662984c32c124327e40e3d3',
                'archiveSHA256': ARCHIVE_SHA, 'modifications': 'None', 'assets': assets}
    rendered = json.dumps(metadata, indent=2) + '\n'
    manifest = ROOT / 'docs/disconnect-assets.json'
    if args.check:
        if manifest.read_text(encoding='utf-8') != rendered:
            raise ValueError('Disconnect asset metadata differs.')
    else:
        manifest.write_text(rendered, encoding='utf-8')
    print('Disconnect backgrounds and original license: unchanged bytes verified.')


if __name__ == '__main__':
    main()
