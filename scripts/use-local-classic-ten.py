"""Prepare the unchanged Classic Minecraft Ten TTF for this repository's local preview.

python scripts/use-local-classic-ten.py [PATH_TO_MINECRAFT_TEN_TTF] [--check-only]
No dependencies, game writes, font installation or public font embedding.
"""
from pathlib import Path
import argparse
import hashlib
import json
import struct

ROOT = Path(__file__).resolve().parent.parent
DESTINATION = ROOT / '.cache/local-fonts/classic-ten'
FILENAME = 'Minecraft-Ten.ttf'
FAMILY = 'MCBE Classic Ten'


def inspect_font(data):
    if not 12 <= len(data) <= 4 * 1024 * 1024 or data[:4] != b'\x00\x01\x00\x00':
        raise ValueError('Expected a nonempty Classic TrueType font, not an archive placeholder or HBUI OTF.')
    count = struct.unpack_from('>H', data, 4)[0]
    if not 1 <= count <= 256 or 12 + count * 16 > len(data):
        raise ValueError('Invalid TrueType table directory.')
    tables = {}
    for index in range(count):
        tag, _, offset, length = struct.unpack_from('>4sIII', data, 12 + index * 16)
        if tag in tables or offset > len(data) or length > len(data) - offset:
            raise ValueError('Invalid or duplicate TrueType table span.')
        tables[tag] = data[offset:offset + length]
    if not {b'head', b'name', b'cmap', b'hhea', b'hmtx', b'maxp', b'glyf', b'loca'} <= tables.keys():
        raise ValueError('Missing required Classic TrueType tables.')
    head = tables[b'head']
    if len(head) < 20 or head[12:16] != b'\x5f\x0f\x3c\xf5':
        raise ValueError('Invalid TrueType head table.')
    units = struct.unpack_from('>H', head, 18)[0]
    if not 16 <= units <= 16384:
        raise ValueError('Invalid TrueType units per em.')
    names = tables[b'name']
    if len(names) < 6:
        raise ValueError('Missing TrueType names.')
    _, records, strings = struct.unpack_from('>HHH', names)
    if 6 + records * 12 > len(names) or strings > len(names):
        raise ValueError('Invalid TrueType name directory.')
    decoded = {}
    for index in range(records):
        platform, _, language, name, length, offset = struct.unpack_from('>HHHHHH', names, 6 + index * 12)
        start = strings + offset
        if start > len(names) or length > len(names) - start:
            raise ValueError('Invalid TrueType name span.')
        if platform not in (0, 1, 3):
            continue
        value = names[start:start + length].decode('utf-16-be' if platform in (0, 3) else 'mac_roman')
        # Prefer the Windows English name when multiple localizations exist.
        if name not in decoded or platform == 3 and language == 0x409:
            decoded[name] = value
    if decoded.get(1) != 'Minecraft Ten':
        raise ValueError('Expected Classic family "Minecraft Ten"; HBUI "Minecraft Ten v2" is a separate font.')
    return {'schemaVersion': 1, 'family': FAMILY, 'sourceFamily': decoded[1], 'file': FILENAME,
            'version': decoded.get(5), 'unitsPerEm': units, 'bytes': len(data),
            'sha256': hashlib.sha256(data).hexdigest(), 'modifications': 'None'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('font', nargs='?', default='C:/XboxGames/Minecraft for Windows/Content/data/resource_packs/vanilla/font/minecraft-ten.ttf')
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args()
    try:
        source = Path(args.font).resolve(strict=True)
        data = source.read_bytes()
        metadata = inspect_font(data)
    except (OSError, ValueError, UnicodeError, struct.error) as error:
        parser.exit(1, str(error) + '\n')
    if not args.check_only:
        DESTINATION.mkdir(parents=True, exist_ok=True)
        (DESTINATION / FILENAME).write_bytes(data)
        (DESTINATION / 'font.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
        (DESTINATION / 'font-face.css').write_text(
            '@font-face{font-family:"MCBE Classic Ten";font-style:normal;font-weight:400;'
            'src:url("./Minecraft-Ten.ttf") format("truetype");font-display:swap}\n', encoding='utf-8')
    print(json.dumps({**metadata, 'checkOnly': args.check_only,
                      'destination': None if args.check_only else str(DESTINATION),
                      'distribution': 'Caller-owned local preview only; original font stays outside Git/npm.'}, indent=2))


if __name__ == '__main__':
    main()
