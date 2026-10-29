"""Prepare a private, explicitly limited Grindstone Unicode font candidate.

Usage: python scripts/use-local-grindstone-fonts.py [GAME_CONTENT] [--check-only]
Only .cache/local-fonts/grindstone is written. Eight complete original Unicode
pages and original metadata stay private; no global font, public asset or npm
font is installed. Metrics are candidate host inputs, not native certification.
"""
from pathlib import Path
import argparse
import hashlib
import json
import struct
import zlib


ARCHIVE_SHA = 'cdb2c8dbfcea7e0967d5369ced0eb5f4a6fcded79769e4e4605c1f0b406c86bc'
METADATA_SHA = '48c537a010ffb7c4fe5c2d6cc4b2c955758be2df184f553077080bdc2afc3b5a'
CHARACTERS = '修复与祛魔物品栏'
PAGES = {
    'glyph_4E.png': '54d622fae3baf59c3a1ceab94ca8a2b49015ac2bd56e68d57a73e7a34ce08489',
    'glyph_4F.png': '2c0c065f7fc8963875b0fb6833129291536e21d875b0f9456f09ae2949dffc00',
    'glyph_54.png': '3c6f13d3e4912b306711ecd5d2252f6776a4b7e3379a34afe10bd5b322ed8f8c',
    'glyph_59.png': '27cc7ae9490035d1a7be76bcc471cff1bb8ef168591b365bff741a00aa0984f7',
    'glyph_68.png': 'dd0d5e7e870632cc9d56e24413fa4cced62011b8647e72040e8f2c3b7544ce52',
    'glyph_72.png': 'eec05fada49ae84c463765cfa787040ce9cd0960b699ba596ffa43c873bbb979',
    'glyph_79.png': '5f6a89e483273df7011c8a2d1e5ae816a6d0ab4cb035994d84697534faf65c53',
    'glyph_9B.png': 'ffedd03c478783ba5c37eddc18a326e45cef2305e0aea58c853dab7f052f92ca',
}


def sha(content):
    return hashlib.sha256(content).hexdigest()


def read_archive(path):
    data = path.read_bytes()
    if sha(data) != ARCHIVE_SHA:
        raise SystemExit('font.brarchive differs from the pinned source. Audit a changed archive before preparing this candidate.')
    if len(data) < 16 or data[:8] != bytes.fromhex('7d2725b1a0527026'):
        raise SystemExit('Unsupported font.brarchive header.')
    count, version = struct.unpack_from('<II', data, 8)
    base = 16 + count * 256
    if version != 1 or not 0 < count < 100000 or base > len(data):
        raise SystemExit('Unsupported font.brarchive table.')
    wanted = set(PAGES) | {'font_metadata.json'}
    selected, all_names = {}, set()
    for index in range(count):
        record = data[16 + index * 256:16 + (index + 1) * 256]
        length = record[0]
        if not 0 < length < 248:
            raise SystemExit('Invalid font.brarchive filename length.')
        name = record[1:1 + length].decode('utf-8')
        if name in all_names:
            raise SystemExit(f'Duplicate font archive entry: {name}')
        all_names.add(name)
        offset, size = struct.unpack_from('<II', record, 248)
        if base + offset + size > len(data):
            raise SystemExit(f'Invalid font archive bounds: {name}')
        if name in wanted:
            selected[name] = data[base + offset:base + offset + size]
    if set(selected) != wanted:
        raise SystemExit(f'Missing required original entries: {sorted(wanted - set(selected))}')
    return data, selected, {'version': version, 'entryCount': count, 'payloadOffset': base}


def indexed_alpha(content):
    """Validate the original indexed8 PNG and decode alpha without altering it."""
    if len(content) < 33 or content[:8] != b'\x89PNG\r\n\x1a\n':
        raise SystemExit('Invalid original Unicode PNG header.')
    position, packed = 8, bytearray()
    transparency, palette, header, ended = None, None, None, False
    chunks = []
    while position < len(content):
        if position + 12 > len(content):
            raise SystemExit('Truncated original Unicode PNG chunk.')
        size = struct.unpack_from('>I', content, position)[0]
        if size > len(content) - position - 12:
            raise SystemExit('Invalid original Unicode PNG chunk bounds.')
        tag = content[position + 4:position + 8]
        payload = content[position + 8:position + 8 + size]
        if zlib.crc32(tag + payload) != struct.unpack_from('>I', content, position + 8 + size)[0]:
            raise SystemExit('Original Unicode PNG CRC mismatch.')
        chunks.append({'type': tag.decode('ascii'), 'bytes': size})
        if tag == b'IHDR':
            if header is not None or position != 8 or size != 13:
                raise SystemExit('Invalid original Unicode PNG IHDR.')
            header = struct.unpack('>IIBBBBB', payload)
        elif tag == b'PLTE':
            palette = payload
        elif tag == b'tRNS':
            transparency = payload
        elif tag == b'IDAT':
            packed.extend(payload)
        position += size + 12
        if tag == b'IEND':
            if size or position != len(content):
                raise SystemExit('Unexpected trailing original PNG data.')
            ended = True
            break
    if not ended or header != (256, 256, 8, 3, 0, 0, 0):
        raise SystemExit('Unexpected original Unicode page encoding or dimensions.')
    if not palette or len(palette) % 3 or len(palette) > 768 or transparency is None or len(transparency) > len(palette) // 3:
        raise SystemExit('Invalid original Unicode palette/transparency.')
    inflater = zlib.decompressobj()
    decoded = inflater.decompress(packed) + inflater.flush()
    if not inflater.eof or inflater.unused_data or inflater.unconsumed_tail or len(decoded) != 257 * 256:
        raise SystemExit('Unexpected original Unicode PNG scanlines.')
    previous, alpha = bytearray(256), bytearray()
    for y in range(256):
        start = y * 257
        mode, row = decoded[start], bytearray(decoded[start + 1:start + 257])
        if mode not in range(5):
            raise SystemExit('Invalid original Unicode PNG filter.')
        for x in range(256):
            left, above, upper_left = row[x - 1] if x else 0, previous[x], previous[x - 1] if x else 0
            prediction = left + above - upper_left
            distances = (abs(prediction - left), abs(prediction - above), abs(prediction - upper_left))
            paeth = (left, above, upper_left)[distances.index(min(distances))]
            row[x] = (row[x] + (0, left, above, (left + above) // 2, paeth)[mode]) & 255
            if row[x] >= len(palette) // 3:
                raise SystemExit('Unicode palette index exceeds the original PLTE.')
        alpha.extend(transparency[index] if index < len(transparency) else 255 for index in row)
        previous = row
    return alpha, {'dimensions': [256, 256], 'encoding': 'indexed8 noninterlaced',
                   'paletteEntries': len(palette) // 3, 'alphaSha256': sha(alpha),
                   'alphaValues': sorted(set(alpha)), 'chunks': chunks}


def existing_fonts(project, destination):
    root = project / '.cache/local-fonts'
    if not root.exists():
        return {}
    return {path.relative_to(project).as_posix(): {'bytes': path.stat().st_size, 'sha256': sha(path.read_bytes())}
            for path in sorted(root.rglob('*')) if path.is_file() and not path.is_relative_to(destination)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('game_content', nargs='?', default='C:/XboxGames/Minecraft for Windows/Content')
    parser.add_argument('--check-only', action='store_true', help='Validate original sources and candidates without writing any files.')
    args = parser.parse_args()
    project = Path(__file__).resolve().parent.parent
    destination = project / '.cache/local-fonts/grindstone'
    old_fonts = existing_fonts(project, destination)
    archive = Path(args.game_content).resolve(strict=True) / 'data/resource_packs/vanilla/__brarchive/font.brarchive'
    data, selected, table = read_archive(archive)
    if sha(selected['font_metadata.json']) != METADATA_SHA:
        raise SystemExit('Original global font metadata differs from the pinned source.')
    metadata = json.loads(selected['font_metadata.json'])
    if metadata.get('version') != 1 or not isinstance(metadata.get('font_aliases'), list):
        raise SystemExit('Unsupported original global font metadata.')
    page_names, alpha_pages, page_records = sorted(PAGES), {}, []
    for name in page_names:
        content = selected[name]
        if sha(content) != PAGES[name]:
            raise SystemExit(f'{name} differs from the pinned original page.')
        alpha, details = indexed_alpha(content)
        alpha_pages[name] = alpha
        page_records.append({'file': 'originalpages/' + name, 'sourceEntry': name,
                             'sha256': sha(content), 'bytes': len(content), 'modifications': 'None; original bytes', **details})
    glyphs, cells = {}, []
    for character in CHARACTERS:
        code = ord(character)
        name, x, y = f'glyph_{code >> 8:02X}.png', (code % 16) * 16, ((code % 256) // 16) * 16
        ink = [(xx, yy) for yy in range(16) for xx in range(16) if alpha_pages[name][(y + yy) * 256 + x + xx]]
        if not ink:
            raise SystemExit(f'Target source cell has no original ink: U+{code:04X}')
        glyphs[character] = {'page': page_names.index(name), 'x': x, 'y': y, 'width': 16, 'height': 16,
                             'advance': 18, 'offsetX': 0, 'offsetY': 0}
        cells.append({'character': character, 'codepoint': f'U+{code:04X}', 'sourceEntry': name,
                      'sourceRect': [x, y, 16, 16], 'alphaInkPixels': len(ink),
                      'alphaInkBoundsWithinCell': [min(p[0] for p in ink), min(p[1] for p in ink),
                                                   max(p[0] for p in ink) + 1, max(p[1] for p in ink) + 1],
                      'boundsConvention': 'left/top/rightExclusive/bottomExclusive; diagnostic only, not trimmed geometry or advance'})
    font = {'pages': ['./originalpages/' + name for name in page_names], 'pageSizes': [256] * len(page_names),
            'cellHeight': 16, 'glyphs': glyphs, 'lineHeight': 20}
    font_bytes = (json.dumps(font, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    if existing_fonts(project, destination) != old_fonts or sha(archive.read_bytes()) != ARCHIVE_SHA:
        raise SystemExit('Original font sources changed during validation; no output was written.')
    if args.check_only:
        print('Checked pinned archive, eight original Unicode pages and candidate metadata; no files written.')
        return
    # Every source and candidate is checked before the first write. No old cache
    # is copied to or modified; all newly extracted artwork stays in this folder.
    pages_destination = destination / 'originalpages'
    pages_destination.mkdir(parents=True, exist_ok=True)
    for name in page_names:
        (pages_destination / name).write_bytes(selected[name])
    (destination / 'font_metadata.json').write_bytes(selected['font_metadata.json'])
    (destination / 'gui-font.json').write_bytes(font_bytes)
    if existing_fonts(project, destination) != old_fonts or sha(archive.read_bytes()) != ARCHIVE_SHA:
        raise SystemExit('An original font source changed during preparation. New font remains a candidate; previous caches were not written by this script.')
    provenance = {
        'status': 'Original source pages verified; host metrics remain an unverified Grindstone candidate',
        'distribution': 'Caller-owned local preview only. Original font pages/metadata stay ignored and must not enter Git, public source assets or npm. A local site can embed optional original resources.',
        'archive': str(archive), 'archiveSha256': ARCHIVE_SHA, 'archiveBytes': len(data), 'archiveTable': table,
        'referenceGameVersion': '1.26.6005.0; the archive fingerprint is checked, the running game version is not queried',
        'scope': {'title': '修复与祛魔', 'inventoryLabel': '物品栏', 'uniqueCharacters': list(CHARACTERS),
                  'missingGlyphPolicy': 'Only these eight characters are present; no fallback glyphs or string substitutions are generated.'},
        'sourceMetadata': {'file': 'font_metadata.json', 'sourceEntry': 'font_metadata.json',
                           'sha256': METADATA_SHA, 'bytes': len(selected['font_metadata.json']), 'version': metadata['version'],
                           'boundary': 'Global aliases reference UnicodeFont, but do not provide the measured native draw sampler, per-glyph pen, trailing advance or multiline metrics.'},
        'candidateProfile': {'file': 'gui-font.json', 'sha256': sha(font_bytes), 'bytes': len(font_bytes),
                             'type': 'GuiTextFont; direct object, not a labels wrapper', 'pageOrder': page_names,
                             'cellHeight': 16, 'pageSizes': [256] * len(page_names), 'advance': 18,
                             'offsetX': 0, 'offsetY': 0, 'lineHeight': 20, 'suggestedHostFontScale': 0.5,
                             'basis': 'The previous six-character workstation profile observed adjacent advance18 source units in two three-character runs. Reusing18, offset0 and line20 here is a host candidate, not a measurement of the four new title characters.',
                             'notCertified': ['Native Grindstone glyph order or adjacent/trailing advances', 'Native source-to-game font scale and paint origins for this screen', 'Sampler and Bitmap/Smooth shader selection', 'Native line height, wrapping or binding', 'Whole-screen or cross-GPU pixel parity'],
                             'sampling': 'Not selected by this script; a later native draw ledger must establish the screen profile.'},
        'glyphSourceCells': cells, 'files': page_records,
        'preservedExistingFonts': {'root': '.cache/local-fonts', 'excludedNewDirectory': '.cache/local-fonts/grindstone',
                                   'count': len(old_fonts), 'allBytesUnchanged': True, 'filesBeforeAndAfter': old_fonts},
        'boundaries': 'No original atlas is trimmed or redrawn. Source ink diagnostics do not determine advances. No native GPU/UI/capture, global font registration, or previous font cache update occurs.',
    }
    (destination / 'provenance.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared eight unchanged Unicode PNGs and a candidate GuiTextFont in {destination}.')
    print(f'Previous font cache files unchanged: {len(old_fonts)}. Sampling and Grindstone metrics require native-ledger verification.')


if __name__ == '__main__':
    main()
