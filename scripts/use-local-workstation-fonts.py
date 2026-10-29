"""Prepare the explicitly scoped workstation font subsets from an installed game.

Usage: python scripts/use-local-workstation-fonts.py [GAME_CONTENT]
The seven existing original PNG pages and one additional SGA page stay in
ignored .cache/local-fonts/workstation. The separate gui-fonts.json contains
complete-cell GuiTextFont profiles; fonts.json retains its old BitmapText
profiles. This does not register a global font, change the existing ten-character
subset, or copy game font artwork into Git/public/npm directories.
"""
from pathlib import Path
import argparse
import hashlib
import json
import struct
import zlib


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
GUI_EXTRA = {
    'ascii_sga.png': ('624678abe1122a56f343812782f1d6542c2414ad7e94360cbf8f1d50c1415c8a', (128, 128)),
    'ascii_sga.json': ('619313a4e15f0250246f252f8686805d43738a3287744607ed09112068f3ba4d', None),
}


def sha(content):
    return hashlib.sha256(content).hexdigest()


def indexed_alpha(content):
    """Read the pinned indexed8 font's original alpha without re-encoding it."""
    width, height, depth, kind, compression, filtering, interlace = struct.unpack_from('>IIBBBBB', content, 16)
    if (depth, kind, compression, filtering, interlace) != (8, 3, 0, 0, 0):
        raise SystemExit('Unexpected original indexed8 font encoding; audit before deriving advances.')
    pos, packed, transparency = 8, bytearray(), b''
    while pos < len(content):
        size = struct.unpack_from('>I', content, pos)[0]
        tag, payload = content[pos + 4:pos + 8], content[pos + 8:pos + 8 + size]
        if zlib.crc32(tag + payload) != struct.unpack_from('>I', content, pos + 8 + size)[0]:
            raise SystemExit('Original font PNG CRC mismatch.')
        if tag == b'IDAT':
            packed.extend(payload)
        elif tag == b'tRNS':
            transparency = payload
        pos += size + 12
        if tag == b'IEND':
            break
    decoded = zlib.decompress(packed)
    if len(decoded) != (width + 1) * height:
        raise SystemExit('Unexpected original font PNG scanline size.')
    previous, alpha = bytearray(width), bytearray()
    for y in range(height):
        start = y * (width + 1)
        mode, row = decoded[start], bytearray(decoded[start + 1:start + width + 1])
        if mode not in range(5):
            raise SystemExit('Invalid original font PNG filter.')
        for x in range(width):
            a, b, c = row[x - 1] if x else 0, previous[x], previous[x - 1] if x else 0
            prediction = a + b - c
            distances = (abs(prediction - a), abs(prediction - b), abs(prediction - c))
            paeth = (a, b, c)[distances.index(min(distances))]
            row[x] = (row[x] + (0, a, b, (a + b) // 2, paeth)[mode]) & 255
        alpha.extend(transparency[index] if index < len(transparency) else 255 for index in row)
        previous = row
    return width, height, alpha


def gui_fonts(labels, selected):
    native_labels = {**labels, 'pageSizes': [256] * len(labels['pages']), 'cellHeight': 16,
                     'glyphs': {character: {**glyph, 'offsetY': 0} for character, glyph in labels['glyphs'].items()}}
    measurements = {}

    def ascii_font(name, codes, height, y_offset):
        width, _, alpha = indexed_alpha(selected[name])
        glyphs, cells = {}, []
        for code in codes:
            character, x, y = chr(code), (code % 16) * 8, (code // 16) * height
            # Exclusive right boundary plus one spacing pixel, never trim the
            # full source quad. Empty cells retain advance1, including period.
            right = max((xx + 1 for yy in range(height) for xx in range(8)
                         if alpha[(y + yy) * width + x + xx]), default=0)
            space = character == ' '
            glyphs[character] = {'page': 0, 'x': x, 'y': y, 'width': 0 if space else 8,
                                 'height': 0 if space else height, 'advance': 4 if space else right + 1,
                                 'offsetX': 0, 'offsetY': y_offset}
            cells.append({'character': character, 'codepoint': code, 'sourceRect': [x, y, 8, height],
                          'alphaRightExclusive': right, 'advance': glyphs[character]['advance']})
        measurements[name] = {'alphaSha256': sha(alpha), 'cells': cells}
        return {'pages': ['./' + name], 'pageSizes': [128], 'cellHeight': height,
                'glyphs': glyphs, 'lineHeight': height}

    runes = ascii_font('ascii_sga.png', range(32, 127), 8, 0)
    costs = ascii_font('default8.png', range(ord('0'), ord('9') + 1), 12, -3)
    if runes['glyphs']['.']['advance'] != 1 or runes['glyphs']['.']['width'] != 8:
        raise SystemExit('The observed empty SGA period must retain its complete cell and advance1.')
    return {'labels': native_labels, 'runes': runes, 'costs': costs}, measurements


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
    original_wanted = set(PAGES) | {'default8.json'}
    wanted = original_wanted | set(GUI_EXTRA)
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
        if name in PAGES or name in GUI_EXTRA:
            expected_sha, dimensions = (PAGES | GUI_EXTRA)[name]
        else:
            expected_sha, dimensions = DEFAULT_METADATA_SHA, None
        if dimensions is not None:
            if len(content) < 24 or not content.startswith(b'\x89PNG\r\n\x1a\n') or struct.unpack_from('>II', content, 16) != dimensions:
                raise SystemExit(f'Unexpected original PNG dimensions: {name}')
        if sha(content) != expected_sha:
            raise SystemExit(f'{name} differs from the observed 1.26.6005.0 source. Do not reuse these metrics without a new audit.')
        selected[name] = content
    if set(selected) != wanted:
        raise SystemExit(f'Missing observed font entries: {sorted(wanted - set(selected))}')
    default_metadata = json.loads(selected['default8.json'])
    if default_metadata != {'ascii_character_height': 12, 'ascii_character_y_offset': -3, 'ascii_extended': True}:
        raise SystemExit('Unexpected default8 metadata.')
    if json.loads(selected['ascii_sga.json']) != {'ascii_character_height': 8, 'ascii_character_y_offset': 0}:
        raise SystemExit('Unexpected ascii_sga metadata.')

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
    gui, measurements = gui_fonts(labels, selected)
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
        'files': [{'file': name, 'sourceEntry': name, 'sha256': sha(content), 'bytes': len(content), 'modifications': 'None; original bytes'} for name, content in selected.items() if name in original_wanted],
        'boundaries': 'This subset is not a full font or whole-GUI/native-AA certification. No global capture position or per-glyph fit is applied.',
    }
    (destination / 'provenance.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (destination / 'gui-fonts.json').write_text(json.dumps(gui, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    gui_provenance = {
        'distribution': provenance['distribution'], 'observedGameVersion': '1.26.6005.0',
        'archive': str(archive), 'archiveSha256': sha(data),
        'virtualExport': 'nativeGuiWorkstationFonts; optional caller-owned data, not a package/global provider',
        'labels': {
            'characters': list(LABEL_CHARACTERS), 'pageSizes': [256] * len(label_pages), 'cellHeight': 16,
            'hostFontScale': 0.5, 'offsetY': 0,
            'evidence': 'Original complete16x16 Unicode cells; adjacent pen18 source units was measured in two three-character runs. offsetY0 deliberately excludes the old DOM-centering inset.',
            'unverified': 'Uniform final trailing advance18 and lineHeight20 are host profile choices, not measured multiline/terminal advances.',
        },
        'runes': {
            'characters': 'Printable ASCII U+0020..U+007E only; all other codes are absent and the renderer must report a missing glyph.',
            'cellHeight': 8, 'sourceMetadata': json.loads(selected['ascii_sga.json']),
            'metrics': 'Complete8x8 cell at[(code%16)*8,floor(code/16)*8]; advance=original nonzero-alpha exclusive right boundary+1. Empty cells keep a completequad and advance1, including period. Space alone is advance-only0x0+4.',
            'ownership': 'The host supplies rune strings; no captured vertex buffer, invented word or fallback glyph generates this dictionary.',
            'unverified': 'Source-derived advances and lineHeight8 are not a native certification for every printable ASCII string.',
        },
        'costs': {
            'characters': list('0123456789'), 'cellHeight': 12, 'sourceMetadata': default_metadata,
            'metrics': 'Complete8x12 original cells at[(code%16)*8,floor(code/16)*12], offsetY-3, advance=original nonzero-alpha exclusive right boundary+1. Source-cell lineHeight12 is a host single-line profile, not recovered native line spacing.',
            'observed': 'Only isolated digits1/2/2, their complete source rectangles and y-bearing-3 were captured. The remaining digits and all multi-digit advances are source-derived, not native-certified.',
        },
        'measurements': measurements,
        'files': [{'file': name, 'sourceEntry': name, 'sha256': sha(content), 'bytes': len(content), 'modifications': 'None; original bytes'} for name, content in selected.items()],
        'boundaries': 'Original fonts.json/default host metrics and seven existing PNG bytes remain unchanged. This separate profile does not certify the complete native GUI or fonts beyond the explicitly declared subset.',
    }
    (destination / 'gui-provenance.json').write_text(json.dumps(gui_provenance, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared seven unchanged font PNGs and two explicit subsets in {destination}.')
    print('Restart Vite for nativeWorkstationFonts. Only six label characters and cost digits1/2 are supported; no global font is changed.')
    print('Separate nativeGuiWorkstationFonts adds offset0 labels, original printable-ASCII SGA and source-derived cost digits0..9; no original page is modified.')


if __name__ == '__main__':
    main()
