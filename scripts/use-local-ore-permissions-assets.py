"""Copy unchanged optional OreUI permission icons from a locally owned install.

Only ignored .cache/local-ore-permissions is written. The library accepts host
resources; these installed game resources are never included in its npm package.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import struct


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('game_content', nargs='?', default='C:/XboxGames/Minecraft for Windows/Content')
    parser.add_argument('--check-only', action='store_true', help='Verify prepared files without changing them.')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    assets = Path(args.game_content) / 'data/gui/dist/hbui/assets'
    destination = root / '.cache/local-ore-permissions'
    specifications = [(role, rf'permission-{role}@0\.5x\.icon-[0-9a-f]+\.png', (12, 12), 0.5)
                      for role in ('visitor', 'member', 'operator', 'custom')]
    specifications += [
        ('avatar', r'no-player-profile-[0-9a-f]+\.png', (48, 48), None),
        ('back', r'arrowBack-[0-9a-f]+\.png', (8, 16), None),
        ('backDisabled', r'arrowBackDisabled-[0-9a-f]+\.png', (8, 16), None),
        ('close', r'crossWhite-[0-9a-f]+\.png', (14, 14), None),
        ('check', r'checkWhite-[0-9a-f]+\.png', (16, 12), None),
        ('chevron', r'chevron-down@0\.5x\.icon-[0-9a-f]+\.png', (7, 4), 0.5),
        ('switchOn', r'onImage-[0-9a-f]+\.png', (8, 42), None),
        ('switchOff', r'offImage-[0-9a-f]+\.png', (12, 12), None),
        # Two differently shaped online-badge assets exist in this build. This
        # exact binding is the one used by the permission player-card route.
        ('onlineBadge', r'online-badge-e3691049d5f11f7faedc\.png', (12, 16), None),
    ]
    records = []
    prepared = []
    for role, expression, expected_size, scale in specifications:
        pattern = re.compile(expression)
        matches = sorted(p for p in assets.glob('*.png') if pattern.fullmatch(p.name))
        if len(matches) != 1:
            raise SystemExit(f'Expected one original {role} icon in {assets}; found {len(matches)}.')
        source = matches[0]
        content = source.read_bytes()
        if content[:8] != b'\x89PNG\r\n\x1a\n' or len(content) < 24:
            raise SystemExit(f'Not a PNG: {source}')
        dimensions = struct.unpack('>II', content[16:24])
        if dimensions != expected_size:
            raise SystemExit(f'Unexpected original {role} dimensions: {dimensions}')
        target = destination / f'{role}.png'
        if args.check_only:
            if not target.is_file() or target.read_bytes() != content:
                raise SystemExit(f'Prepared icon differs or is absent: {target}')
        prepared.append((target, content))
        records.append(dict(role=role, source=str(source), file=str(target.relative_to(root)).replace('\\', '/'),
                            width=dimensions[0], height=dimensions[1], declaredScale=scale, bytes=len(content),
                            sha256=hashlib.sha256(content).hexdigest(), modifications='None'))
    provenance = dict(distribution='Local preview only; excluded from Git and npm.', resources=records)
    metadata = destination / 'provenance.json'
    if args.check_only:
        if not metadata.is_file() or json.loads(metadata.read_text(encoding='utf-8')) != provenance:
            raise SystemExit('Prepared provenance is absent or differs from installed originals.')
    else:
        destination.mkdir(parents=True, exist_ok=True)
        for target, content in prepared:
            if not target.is_file() or target.read_bytes() != content:
                target.write_bytes(content)
        encoded = json.dumps(provenance, indent=2) + '\n'
        if not metadata.is_file() or metadata.read_text(encoding='utf-8') != encoded:
            metadata.write_text(encoded, encoding='utf-8')
    print(f'{"Verified" if args.check_only else "Prepared"} {len(records)} unchanged local OreUI permission icons.')


if __name__ == '__main__':
    main()
