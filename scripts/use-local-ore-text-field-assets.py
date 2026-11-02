"""Prepare two unchanged, private OreUI text-field images for local preview only.

Writes only ignored .cache/local-ore-text-field. No library asset is created.
"""
from pathlib import Path
import argparse
import hashlib
import json
import struct


SPECS = (
    ('normal', 'baseTextField_neutral80-e77c01be83592aa681d2.png', 124,
     '4de8cfb38a90f3296237606130503c2648551e1fc9aba28c373c86293b6f910c'),
    ('disabled', 'baseTextField_disabled-00a010b73e9da6b5e060.png', 118,
     '5c3af29f159b5c9f4b85325848549b4f68f112d2cb57d134769a82149d633fb7'),
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
    destination = within(cache / 'local-ore-text-field', cache)
    records, prepared = [], []
    for role, filename, length, digest in SPECS:
        source = within(assets / filename, assets)
        content = source.read_bytes()
        if (len(content) != length or hashlib.sha256(content).hexdigest() != digest
                or content[:8] != b'\x89PNG\r\n\x1a\n'
                or struct.unpack('>II', content[16:24]) != (6, 7)):
            raise SystemExit(f'Original image identity differs: {source}')
        target = within(destination / f'{role}.png', destination)
        prepared.append((target, content))
        records.append(dict(role=role, source=str(source), sourceBasename=filename,
                            file=f'{role}.png', width=6, height=7, bytes=length,
                            sha256=digest, modifications='None; whole original PNG'))
    metadata = within(destination / 'provenance.json', destination)
    provenance = dict(schemaVersion=1, distribution='Installed private resources; local preview only; excluded from Git and npm.',
                      resources=records)
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
    print(f'{"Verified" if args.check_only else "Prepared"} two unchanged 6x7 local OreUI text-field images.')


if __name__ == '__main__':
    main()
