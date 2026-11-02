"""Prepare unchanged private OreUI edit icons for ignored local preview only."""
from pathlib import Path
import argparse
import hashlib
import json
import struct


SPECS = (
    ('delete', 'delete-dc0125fecc577e27a106.png', 24, 124,
     'd30675e649aec73785d2c6d1f55ad051bf00877d1f7dbc7b0ee0fb89adaf893a'),
    ('save', 'save-285144e32caffa7cf437.png', 12, 130,
     '6a43dff56720fcfb5c06d4c8ed0f7fbb6ce9033326810d4b5aeab3141dd85ba8'),
)


def within(path, directory):
    resolved = path.resolve()
    if not resolved.is_relative_to(directory.resolve()):
        raise SystemExit(f'Path escapes its permitted directory: {path}')
    return resolved


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('game_content', nargs='?', default='C:/XboxGames/Minecraft for Windows/Content')
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    assets = (Path(args.game_content) / 'data/gui/dist/hbui/assets').resolve(strict=True)
    cache = within(root / '.cache', root)
    destination = within(cache / 'local-ore-external-server', cache)
    records, prepared = [], []
    for role, filename, size, length, digest in SPECS:
        source = within(assets / filename, assets)
        content = source.read_bytes()
        if (len(content) != length or hashlib.sha256(content).hexdigest() != digest
                or content[:8] != b'\x89PNG\r\n\x1a\n'
                or struct.unpack('>II', content[16:24]) != (size, size)):
            raise SystemExit(f'Original image identity differs: {source}')
        target = within(destination / f'{role}.png', destination)
        prepared.append((target, content))
        records.append(dict(role=role, source=str(source), sourceBasename=filename,
                            file=f'{role}.png', width=size, height=size, bytes=length,
                            sha256=digest, modifications='None; whole original PNG'))
    metadata = within(destination / 'provenance.json', destination)
    provenance = dict(schemaVersion=1, distribution='Installed private resources; local preview only; excluded from Git and npm.', resources=records)
    if args.check_only:
        for target, content in prepared:
            if not target.is_file() or target.read_bytes() != content:
                raise SystemExit(f'Prepared image absent or changed: {target}')
        if not metadata.is_file() or json.loads(metadata.read_text(encoding='utf-8')) != provenance:
            raise SystemExit('Prepared provenance is absent or differs.')
    else:
        destination.mkdir(parents=True, exist_ok=True)
        for target, content in prepared:
            if not target.is_file() or target.read_bytes() != content:
                target.write_bytes(content)
        metadata.write_text(json.dumps(provenance, indent=2) + '\n', encoding='utf-8')
    print(f'{"Verified" if args.check_only else "Prepared"} two unchanged local OreUI external-server edit icons.')


if __name__ == '__main__':
    main()
