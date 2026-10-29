"""Prepare the explicitly scoped workstation font subsets from an installed game.

Usage: python scripts/use-local-workstation-fonts.py [GAME_CONTENT]
Seven original PNG pages stay in ignored .cache/local-fonts/workstation. This
does not register a global font, change the existing ten-character subset, or
copy game font artwork into Git/public/npm directories.
"""
from pathlib import Path
import argparse
import hashlib
import json
import struct


PAGES = {
    'glyph_53.png': ('59112f80c14d19b442af95c1a9169452f2a1230a28fe4ca5b8cce3a169a623fc', (256, 256)),
    'glyph_54.png': ('3c6f13d3e4912b306711ecd5d2252f6776a4b7e3379a34afe10bd5b322ed8f8c', (256, 256)),
    'glyph_68.png': ('dd0d5e7e870632cc9d56e24413fa4cced62011b8647e72040e8f2c3b7544ce52', (256, 256)),
    'glyph_72.png': ('eec05fada49ae84c463765cfa787040ce9cd0960b699ba596ffa43c873bbb979', (256, 256)),
    'glyph_96.png': ('1cb65ddba8c65ffa4db3c4660e501429b79bd87588c2da350a8ddab31aaa3e27', (256, 256)),
    'glyph_9B.png': ('ffedd03c478783ba5c37eddc18a326e45cef2305e0aea58c853dab7f052f92ca', (256, 256)),
    'default8.png': ('daf219bcd3a050c33f0f8883e12d75acc818cee918f400f5afcd7ac386b2f904', (128, 128)),
}
DEFAULT_METADATA_SHA = '1326598897eebc60e5c6835f1fdf700c175f5d2628bb4ed6a9bba959d3695793'
LEDGER_SHA = 'ae14be5484565a0d8db35709fae9e3b2a0c7f1869ba2ceff93c87d6e7282fe0f'
LABEL_CHARACTERS = '附魔台物品栏'


def sha(content):
    return hashlib.sha256(content).hexdigest()


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
    wanted = set(PAGES) | {'default8.json'}
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
            raise SystemExit(f'Duplicate font entry: {name}')
        offset, size = struct.unpack_from('<II', record, 248)
        if base + offset + size > len(data):
            raise SystemExit(f'Invalid font entry bounds: {name}')
        content = data[base + offset:base + offset + size]
        if name in PAGES:
            expected_sha, dimensions = PAGES[name]
            if len(content) < 24 or not content.startswith(b'\x89PNG\r\n\x1a\n') or struct.unpack_from('>II', content, 16) != dimensions:
                raise SystemExit(f'Unexpected original PNG dimensions: {name}')
        else:
            expected_sha = DEFAULT_METADATA_SHA
        if sha(content) != expected_sha:
            raise SystemExit(f'{name} differs from the observed 1.26.6005.0 source. Do not reuse these metrics without a new audit.')
        selected[name] = content
    if set(selected) != wanted:
        raise SystemExit(f'Missing observed font entries: {sorted(wanted - set(selected))}')
    default_metadata = json.loads(selected['default8.json'])
    if default_metadata != {'ascii_character_height': 12, 'ascii_character_y_offset': -3, 'ascii_extended': True}:
        raise SystemExit('Unexpected default8 metadata.')

    label_pages = list(PAGES)[:-1]
    labels = {
        'pages': ['./' + name for name in label_pages],
        'glyphs': {character: {
            'page': label_pages.index(f'glyph_{ord(character) >> 8:02X}.png'),
            'x': (ord(character) % 16) * 16, 'y': (ord(character) % 256 // 16) * 16,
            'width': 16, 'height': 16, 'advance': 18, 'offsetX': 0, 'offsetY': 2,
        } for character in LABEL_CHARACTERS},
        'lineHeight': 20,
    }
    # Exact observed source rectangles, NOT a guessed codepoint-to-8px-row map.
    costs = {
        'pages': ['./default8.png'],
        'glyphs': {character: {'page': 0, 'x': x, 'y': 36, 'width': 8, 'height': 12,
                               'advance': 6, 'offsetX': 0, 'offsetY': -3}
                   for character, x in [('1', 8), ('2', 16)]},
        'lineHeight': 10,
    }
    # All source hashes and dimensions are checked before the first write.
    destination = project / '.cache/local-fonts/workstation'
    destination.mkdir(parents=True, exist_ok=True)
    for name, content in selected.items():
        (destination / name).write_bytes(content)
    (destination / 'fonts.json').write_text(json.dumps({'labels': labels, 'costs': costs}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    provenance = {
        'distribution': 'Caller-owned local preview only. No original font binary belongs in Git, public source assets or npm. A local site build can embed the optional pages.',
        'observedGameVersion': '1.26.6005.0', 'archive': str(archive), 'archiveSha256': sha(data),
        'measurementReference': {'ledger': '.cache/open-clean-full-gui/text-metrics.json', 'sha256': LEDGER_SHA,
                                 'scope': 'One captured enabled-option composition; original private capture is not redistributed.'},
        'labels': {
            'characters': list(LABEL_CHARACTERS), 'source': 'Original aligned 16x16 cells on six 256x256 Unicode pages.',
            'directObservation': '16 source pixels map to 8 game pixels. Adjacent CJK pens differ by 9 game / 18 GUI2 CSS pixels in the two observed three-character runs.',
            'hostProfile': 'Use scale1 at GUI2. Uniform advance18 also assigns the last glyph a trailing advance, which was not observed. lineHeight20 is a host single-line box, not a measured multiline metric.',
            'verticalPlacement': 'offsetY2 is host centering (20px logical box minus 16px visual cell)/2, consistent with the observed +1game label inset. It is not a recovered font CPU bearing. Original label JSON does not explicitly declare that line height.',
            'sourceControls': ['enchanting.enchanting_label: top-left offset[12,-4] inside top-half offset[0,7]', 'common.inventory_panel_bottom_half_with_label: inventory_label@section_heading_label offset[7,3]'],
            'appearance': {'color': '#4c4c4c', 'shadow': False, 'sampling': 'bilinear', 'shader': 'bitmap-smooth'},
        },
        'costs': {
            'characters': ['1', '2'], 'sourceMetadata': default_metadata,
            'directObservation': 'The captured default8 atlas is 128x128. Source rectangles are digit1[8,36,8,12] and digit2[16,36,8,12]; quad bearing is y=-3 game. Only isolated costs1/2/2 were observed.',
            'hostProfile': 'Use scale2 at GUI2. advance6 is inferred from the source right anchor and the observed single-glyph pen, not adjacent-digit spacing. lineHeight10 is a host single-line 20CSS-pixel layout box, not a measured native font line height.',
            'sourceControl': 'enchanting.enchant_cost: bottom-right anchor, offset[-2,-2], shadow true.',
            'appearance': {'enabledColor': '#7fff1f', 'shadowColor': '#204008', 'shadowOffsetSource': [1, 1], 'sampling': 'point', 'shader': 'bitmap'},
            'unverified': 'No multi-digit costs, other characters, multiline metrics or disabled-state vertex color are certified.',
        },
        'files': [{'file': name, 'sourceEntry': name, 'sha256': sha(content), 'bytes': len(content), 'modifications': 'None; original bytes'} for name, content in selected.items()],
        'boundaries': 'This subset is not a full font or whole-GUI/native-AA certification. No global capture position or per-glyph fit is applied.',
    }
    (destination / 'provenance.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared seven unchanged font PNGs and two explicit subsets in {destination}.')
    print('Restart Vite for nativeWorkstationFonts. Only six label characters and cost digits1/2 are supported; no global font is changed.')


if __name__ == '__main__':
    main()
