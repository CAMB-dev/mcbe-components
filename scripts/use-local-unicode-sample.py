"""Prepare the measured ten-character Unicode bitmap sample from an installed game.

Usage: python scripts/use-local-unicode-sample.py 'C:/XboxGames/Minecraft for Windows/Content'
Only reads vanilla/font.brarchive. Eight unchanged atlas pages and the measured
subset metrics stay in ignored .cache/local-fonts/unicode, outside Git and npm.
This is not a full Unicode font and does not infer metrics for other characters.
"""
from pathlib import Path
import argparse
import hashlib
import json
import struct


PAGE_HASHES = {
    '00': '93fb46cef268a658be542e109f0c5f9e49565afe95f160027fbc95f04b03fdfc',
    '4F': '2c0c065f7fc8963875b0fb6833129291536e21d875b0f9456f09ae2949dffc00',
    '51': '98d40d25b192d121c395b53e490d03e2e4cd134744e2b1a901433c5abd7dd0fc',
    '52': 'f22e4836a54185d0a79979e2bc7fcbf74b74ddd363925796e24027c6cd280cd1',
    '5B': '3d6dcbaff2bc677029824f498a6a297897d80927a96c697be04ef13f62a8d516',
    '65': '18b5a0ffbdd77df7010e003269cbd9edadd52b67dab40d65fa7062ecac309d34',
    '77': 'f94350ee8b78e4e9a8230cafe2a3217fd324bb73c8893c5ac9cca33d7f178e11',
    '94': 'f3b707fcf6a23505bc28b394669b33cbf67819c679890f569ced82894fec02f2',
}
# Exact measured GUI2 design/metrics. Atlas page order follows PAGE_HASHES.
# Original cells are 16x16, with no inferred crop, bearing or advance.
MEASURED_GLYPHS = {
    '钻': (7, 176, 176, 18),
    '石': (6, 48, 240, 18),
    '剑': (3, 16, 80, 18),
    '攻': (5, 176, 48, 18),
    '击': (2, 176, 240, 18),
    '伤': (1, 64, 32, 18),
    '害': (4, 48, 176, 18),
    '+': (0, 176, 32, 9),
    '7': (0, 112, 48, 8),
    ' ': (0, 0, 32, 8),
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('game_content', nargs='?', default='C:/XboxGames/Minecraft for Windows/Content')
    args = parser.parse_args()
    project = Path(__file__).resolve().parent.parent
    archive = Path(args.game_content).resolve(strict=True) / 'data/resource_packs/vanilla/__brarchive/font.brarchive'
    data = archive.read_bytes()
    if len(data) < 16 or data[:8] != bytes.fromhex('7d2725b1a0527026'):
        raise SystemExit('Unsupported font.brarchive header.')
    count, version = struct.unpack_from('<II', data, 8)
    base = 16 + count * 256
    if version != 1 or not 0 < count < 100000 or base > len(data):
        raise SystemExit('Unsupported font.brarchive table.')
    wanted = {f'glyph_{page}.png': sha for page, sha in PAGE_HASHES.items()}
    selected = {}
    for index in range(count):
        record = data[16 + index * 256:16 + (index + 1) * 256]
        length = record[0]
        if not 0 < length < 248:
            raise SystemExit('Invalid font.brarchive filename length.')
        name = record[1:1 + length].decode('utf-8')
        if name not in wanted:
            continue
        if name in selected:
            raise SystemExit(f'Duplicate atlas page: {name}')
        offset, size = struct.unpack_from('<II', record, 248)
        if base + offset + size > len(data):
            raise SystemExit(f'Invalid atlas bounds: {name}')
        content = data[base + offset:base + offset + size]
        if not content.startswith(b'\x89PNG\r\n\x1a\n') or len(content) < 24 or struct.unpack_from('>II', content, 16) != (256, 256):
            raise SystemExit(f'Expected original 256x256 PNG page: {name}')
        actual = hashlib.sha256(content).hexdigest()
        if actual != wanted[name]:
            raise SystemExit(f'{name} differs from the measured 1.26.6005.0 sample; metrics cannot be assumed for this install.')
        selected[name] = content
    if set(selected) != set(wanted):
        raise SystemExit(f'Missing measured atlas pages: {sorted(set(wanted) - set(selected))}')

    # Validate everything before writing, so a different install cannot mix profiles.
    destination = project / '.cache/local-fonts/unicode'
    destination.mkdir(parents=True, exist_ok=True)
    records = []
    for page, sha in PAGE_HASHES.items():
        name = f'glyph_{page}.png'
        content = selected[name]
        (destination / name).write_bytes(content)
        records.append({'page': page, 'file': name, 'source': f'{archive}:{name}', 'sha256': sha, 'bytes': len(content), 'modifications': 'None'})
    font = {
        'pages': [f'./glyph_{page}.png' for page in PAGE_HASHES],
        'glyphs': {
            char: {'page': page, 'x': x, 'y': y, 'width': 16, 'height': 16, 'advance': advance, 'offsetX': 0, 'offsetY': 0}
            for char, (page, x, y, advance) in MEASURED_GLYPHS.items()
        },
        'lineHeight': 20,
    }
    (destination / 'font.json').write_text(json.dumps(font, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (destination / 'provenance.json').write_text(json.dumps({
        'distribution': 'Local preview only; original atlas pages excluded from Git and npm.',
        'scope': 'Measured ten-character subset: seven CJK characters, plus sign, digit 7 and space. Not a full Unicode font.',
        'archive': str(archive), 'archiveSha256': hashlib.sha256(data).hexdigest(),
        'profile': 'scale1 reproduces the measured 16px Unicode cell at GUI2; CJKadvance18, plus9, digit7andspace8, lineHeight20.',
        'verification': 'Source design and measured geometry only; native AA/RGBA equivalence and unmeasured glyph metrics are not certified.',
        'characters': list(MEASURED_GLYPHS), 'pages': records,
    }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared {len(records)} unchanged atlas pages and {len(MEASURED_GLYPHS)} measured character mappings in {destination}.')
    print('Restart Vite to enable nativeBitmapFont. This subset does not change global fonts or include unmeasured characters.')


if __name__ == '__main__':
    main()
