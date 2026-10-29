"""Prepare private, source-verified Anvil font-role candidates.

Usage: python scripts/use-local-anvil-fonts.py [GAME_CONTENT] [--check-only]
Only .cache/local-fonts/anvil is written. Original pages/metadata stay private.
Pure Unicode/default8 roles are available separately; the proposed mixed-page
profile is deliberately isolated and is not a native metric/sampler claim.
"""
from pathlib import Path
import argparse
import importlib.util
import json
import struct
import zlib


ARCHIVE_SHA = 'cdb2c8dbfcea7e0967d5369ced0eb5f4a6fcded79769e4e4605c1f0b406c86bc'
GLOBAL_METADATA_SHA = '48c537a010ffb7c4fe5c2d6cc4b2c955758be2df184f553077080bdc2afc3b5a'
ASCII_METADATA_SHA = '1326598897eebc60e5c6835f1fdf700c175f5d2628bb4ed6a9bba959d3695793'
ASCII_PAGE_SHA = 'daf219bcd3a050c33f0f8883e12d75acc818cee918f400f5afcd7ac386b2f904'
TITLE, INVENTORY = '物品修复和命名', '物品栏'
NAME, COST, EXPENSIVE = '钻石剑', '魔咒花费：', '过于昂贵！'
PAGES = {
    'glyph_00.png': '93fb46cef268a658be542e109f0c5f9e49565afe95f160027fbc95f04b03fdfc',
    'glyph_4E.png': '54d622fae3baf59c3a1ceab94ca8a2b49015ac2bd56e68d57a73e7a34ce08489',
    'glyph_4F.png': '2c0c065f7fc8963875b0fb6833129291536e21d875b0f9456f09ae2949dffc00',
    'glyph_52.png': 'f22e4836a54185d0a79979e2bc7fcbf74b74ddd363925796e24027c6cd280cd1',
    'glyph_54.png': '3c6f13d3e4912b306711ecd5d2252f6776a4b7e3379a34afe10bd5b322ed8f8c',
    'glyph_59.png': '27cc7ae9490035d1a7be76bcc471cff1bb8ef168591b365bff741a00aa0984f7',
    'glyph_66.png': 'd9e86ffc70712129c7c5b02cad65949f50e66d2e0f29b8209c8be712a09e94db',
    'glyph_68.png': 'dd0d5e7e870632cc9d56e24413fa4cced62011b8647e72040e8f2c3b7544ce52',
    'glyph_72.png': 'eec05fada49ae84c463765cfa787040ce9cd0960b699ba596ffa43c873bbb979',
    'glyph_77.png': 'f94350ee8b78e4e9a8230cafe2a3217fd324bb73c8893c5ac9cca33d7f178e11',
    'glyph_82.png': 'b0d0c8860c92768cff58704d8ca0f74cbfccb3a8e7a83afb983dd47dffca9399',
    'glyph_8D.png': 'ecca6528c4c52ef1e3cacc39365686c4393c5abac8f3f6c66912470ced0200c3',
    'glyph_8F.png': '273bc128794cc11f425b2f8c4106b9316c8bbd027ac57ef3f43aa8bf3beb6cbc',
    'glyph_94.png': 'f3b707fcf6a23505bc28b394669b33cbf67819c679890f569ced82894fec02f2',
    'glyph_9B.png': 'ffedd03c478783ba5c37eddc18a326e45cef2305e0aea58c853dab7f052f92ca',
    'glyph_FF.png': 'cb857472b85e28a14a98672637cbbd3e9902597f9a32c3c1f8d86756ce60fcb3',
}


def helper(name, filename):
    """Load existing pure parsers without invoking either preparation main()."""
    specification = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    return module


def selected_archive(path, sha):
    data = path.read_bytes()
    if sha(data) != ARCHIVE_SHA:
        raise SystemExit('font.brarchive differs from the pinned source. Audit changed source before preparing these candidates.')
    if len(data) < 16 or data[:8] != bytes.fromhex('7d2725b1a0527026'):
        raise SystemExit('Unsupported original font archive header.')
    count, version = struct.unpack_from('<II', data, 8)
    base = 16 + count * 256
    if version != 1 or not 0 < count < 100000 or base > len(data):
        raise SystemExit('Unsupported original font archive table.')
    wanted = set(PAGES) | {'default8.png', 'default8.json', 'font_metadata.json'}
    entries, names = {}, set()
    for index in range(count):
        record = data[16 + index * 256:16 + (index + 1) * 256]
        length = record[0]
        if not 0 < length < 248:
            raise SystemExit('Invalid original font archive filename length.')
        name = record[1:1 + length].decode('utf-8')
        if name in names:
            raise SystemExit(f'Duplicate original font entry: {name}')
        names.add(name)
        offset, size = struct.unpack_from('<II', record, 248)
        if base + offset + size > len(data):
            raise SystemExit(f'Invalid original font entry bounds: {name}')
        if name in wanted:
            entries[name] = data[base + offset:base + offset + size]
    if set(entries) != wanted:
        raise SystemExit(f'Missing required original font entries: {sorted(wanted - set(entries))}')
    return data, entries, {'version': version, 'entries': count, 'payloadOffset': base}


def rgba_alpha(content, sha):
    """Validate and decode the pinned original RGBA8 page, never rewrite it."""
    if len(content) < 33 or content[:8] != b'\x89PNG\r\n\x1a\n':
        raise SystemExit('Invalid original RGBA Unicode PNG header.')
    position, packed, header, ended, chunks = 8, bytearray(), None, False, []
    while position < len(content):
        if position + 12 > len(content):
            raise SystemExit('Truncated original RGBA PNG chunk.')
        size = struct.unpack_from('>I', content, position)[0]
        if size > len(content) - position - 12:
            raise SystemExit('Invalid original RGBA PNG chunk bounds.')
        tag, payload = content[position + 4:position + 8], content[position + 8:position + 8 + size]
        if zlib.crc32(tag + payload) != struct.unpack_from('>I', content, position + 8 + size)[0]:
            raise SystemExit('Original RGBA PNG CRC mismatch.')
        chunks.append({'type': tag.decode('ascii'), 'bytes': size})
        if tag == b'IHDR':
            if position != 8 or header is not None or size != 13:
                raise SystemExit('Invalid original RGBA PNG IHDR.')
            header = struct.unpack('>IIBBBBB', payload)
        elif tag == b'IDAT':
            packed.extend(payload)
        position += size + 12
        if tag == b'IEND':
            if size or position != len(content):
                raise SystemExit('Unexpected trailing original RGBA PNG data.')
            ended = True
            break
    if not ended or header != (256, 256, 8, 6, 0, 0, 0):
        raise SystemExit('Unexpected original RGBA Unicode encoding or dimensions.')
    inflater = zlib.decompressobj()
    decoded = inflater.decompress(packed) + inflater.flush()
    stride = 256 * 4
    if not inflater.eof or inflater.unused_data or inflater.unconsumed_tail or len(decoded) != (stride + 1) * 256:
        raise SystemExit('Unexpected original RGBA PNG scanlines.')
    previous, rgba = bytearray(stride), bytearray()
    for y in range(256):
        start = y * (stride + 1)
        mode, row = decoded[start], bytearray(decoded[start + 1:start + stride + 1])
        if mode not in range(5):
            raise SystemExit('Invalid original RGBA PNG filter.')
        for x in range(stride):
            left, above, upper_left = row[x - 4] if x >= 4 else 0, previous[x], previous[x - 4] if x >= 4 else 0
            prediction = left + above - upper_left
            distances = (abs(prediction - left), abs(prediction - above), abs(prediction - upper_left))
            paeth = (left, above, upper_left)[distances.index(min(distances))]
            row[x] = (row[x] + (0, left, above, (left + above) // 2, paeth)[mode]) & 255
        rgba.extend(row)
        previous = row
    alpha = rgba[3::4]
    return alpha, {'dimensions': [256, 256], 'encoding': 'RGBA8 noninterlaced',
                   'rgbaSha256': sha(rgba), 'alphaSha256': sha(alpha),
                   'alphaValues': sorted(set(alpha)), 'chunks': chunks}


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('game_content', nargs='?', default='C:/XboxGames/Minecraft for Windows/Content')
    parser.add_argument('--check-only', action='store_true', help='Validate sources and candidate dictionaries without writing files.')
    args = parser.parse_args()
    project = Path(__file__).resolve().parent.parent
    destination = project / '.cache/local-fonts/anvil'
    unicode_helper = helper('mcbeui_anvil_unicode_parser', 'use-local-grindstone-fonts.py')
    ascii_helper = helper('mcbeui_anvil_ascii_parser', 'use-local-workstation-fonts.py')
    sha = unicode_helper.sha
    original_fonts = unicode_helper.existing_fonts(project, destination)
    archive = Path(args.game_content).resolve(strict=True) / 'data/resource_packs/vanilla/__brarchive/font.brarchive'
    data, entries, table = selected_archive(archive, sha)
    metadata_expected = {'default8.json': ASCII_METADATA_SHA, 'font_metadata.json': GLOBAL_METADATA_SHA}
    for name, expected in metadata_expected.items():
        if sha(entries[name]) != expected:
            raise SystemExit(f'{name} differs from the pinned original metadata.')
    metadata = json.loads(entries['font_metadata.json'])
    ascii_metadata = json.loads(entries['default8.json'])
    if metadata.get('version') != 1 or ascii_metadata != {'ascii_character_height': 12, 'ascii_character_y_offset': -3, 'ascii_extended': True}:
        raise SystemExit('Unexpected original font metadata.')
    alpha_pages, source_records = {}, []
    for name, expected in PAGES.items():
        if sha(entries[name]) != expected:
            raise SystemExit(f'{name} differs from the pinned original Unicode page.')
        alpha, details = rgba_alpha(entries[name], sha) if name == 'glyph_00.png' else unicode_helper.indexed_alpha(entries[name])
        alpha_pages[name] = alpha
        source_records.append({'file': 'originalpages/' + name, 'sourceEntry': name, 'bytes': len(entries[name]),
                               'sha256': expected, 'modifications': 'None; complete original PNG bytes', **details})
    if sha(entries['default8.png']) != ASCII_PAGE_SHA or struct.unpack_from('>II', entries['default8.png'], 16) != (128, 128):
        raise SystemExit('Unexpected original default8 page.')
    width, height, ascii_alpha = ascii_helper.indexed_alpha(entries['default8.png'])
    if (width, height) != (128, 128):
        raise SystemExit('Original default8 dimensions changed.')
    source_records.append({'file': 'originalpages/default8.png', 'sourceEntry': 'default8.png', 'bytes': len(entries['default8.png']),
                           'sha256': ASCII_PAGE_SHA, 'dimensions': [128, 128], 'alphaSha256': sha(ascii_alpha),
                           'modifications': 'None; complete original PNG bytes'})
    labels = ''.join(dict.fromkeys(TITLE + INVENTORY))
    characters = ''.join(dict.fromkeys(TITLE + INVENTORY + NAME + COST + EXPENSIVE))
    if len(labels) != 8 or len(characters) != 21:
        raise SystemExit('Unexpected explicit Anvil character set.')
    unicode_cells = []

    def unicode_font(text, include_empty_space=False):
        names = sorted({f'glyph_{ord(character) >> 8:02X}.png' for character in text})
        glyphs = {}
        for character in text:
            code = ord(character)
            name, x, y = f'glyph_{code >> 8:02X}.png', (code % 16) * 16, (code % 256 // 16) * 16
            ink = [(xx, yy) for yy in range(16) for xx in range(16) if alpha_pages[name][(y + yy) * 256 + x + xx]]
            space = character == ' ' and include_empty_space
            if not ink and not space:
                raise SystemExit(f'Anvil Unicode cell has no original ink: U+{code:04X}')
            glyphs[character] = {'page': names.index(name), 'x': x, 'y': y, 'width': 0 if space else 16, 'height': 0 if space else 16,
                                 'advance': 8 if space else max(p[0] for p in ink) + 3 if code < 128 else 17 if character == '：' else 18, 'offsetX': 0, 'offsetY': 0}
            if text == characters:
                unicode_cells.append({'character': character, 'codepoint': f'U+{code:04X}', 'sourceEntry': name,
                                      'sourceCell': [x, y, 16, 16], 'alphaInkPixels': len(ink),
                                      'alphaInkBounds': [min(p[0] for p in ink), min(p[1] for p in ink),
                                                        max(p[0] for p in ink) + 1, max(p[1] for p in ink) + 1]})
        return {'pages': ['./originalpages/' + name for name in names], 'pageSizes': [256] * len(names),
                'cellHeight': 16, 'lineHeight': 20, 'glyphs': glyphs}

    unicode_profile = unicode_font(characters)
    labels_profile = unicode_font(labels)
    costs_characters = ''.join(dict.fromkeys(characters + ''.join(chr(code) for code in range(32, 127))))
    costs_profile = unicode_font(costs_characters, include_empty_space=True)
    costs_ascii_cells = []
    for code in range(32, 127):
        x, y = code % 16 * 16, code // 16 * 16
        ink = [(xx, yy) for yy in range(16) for xx in range(16) if alpha_pages['glyph_00.png'][(y + yy) * 256 + x + xx]]
        costs_ascii_cells.append({'character': chr(code), 'codepoint': f'U+{code:04X}', 'sourceEntry': 'glyph_00.png',
                                  'sourceCell': [x, y, 16, 16], 'alphaInkPixels': len(ink),
                                  'alphaInkBounds': [min(p[0] for p in ink), min(p[1] for p in ink), max(p[0] for p in ink) + 1, max(p[1] for p in ink) + 1] if ink else None,
                                  'candidateAdvance': costs_profile['glyphs'][chr(code)]['advance'], 'nativeAdvanceMeasured': False})
    ascii_glyphs, ascii_cells = {}, []
    for code in range(32, 127):
        character, x, y = chr(code), code % 16 * 8, code // 16 * 12
        right = max((xx + 1 for yy in range(12) for xx in range(8) if ascii_alpha[(y + yy) * width + x + xx]), default=0)
        space = character == ' '
        ascii_glyphs[character] = {'page': 0, 'x': x, 'y': y, 'width': 0 if space else 8,
                                   'height': 0 if space else 12, 'advance': 4 if space else right + 1,
                                   'offsetX': 0, 'offsetY': -3}
        ascii_cells.append({'character': character, 'codepoint': f'U+{code:04X}', 'sourceCell': [x, y, 8, 12],
                            'alphaRightExclusive': right, 'candidateAdvance': ascii_glyphs[character]['advance']})
    ascii_profile = {'pages': ['./originalpages/default8.png'], 'pageSizes': [128], 'cellHeight': 12,
                     'lineHeight': 12, 'glyphs': ascii_glyphs}
    profiles = {'labels': labels_profile, 'unicode': unicode_profile, 'ascii': ascii_profile, 'costs': costs_profile}
    mixed_glyphs = {**ascii_glyphs, **{character: {**glyph, 'page': glyph['page'] + 1}
                                    for character, glyph in unicode_profile['glyphs'].items()}}
    mixed = {'status': 'Isolated proposed pageMetrics candidate, not current API/native certification',
             'currentApiSupported': False, 'suggestedHostFontScale': 1,
             'font': {'pages': ascii_profile['pages'] + unicode_profile['pages'],
                      'pageSizes': [128] + unicode_profile['pageSizes'], 'cellHeight': 12, 'lineHeight': 10,
                      'pageMetrics': [{'cellHeight': 12, 'scale': 1}] + [{'cellHeight': 16, 'scale': 0.5} for _ in unicode_profile['pages']],
                      'glyphs': mixed_glyphs},
             'samplingAndShader': 'Not selected. Actual Anvil same-label draw resources, shader, sampler, pen and shadow order must be verified first.',
             'boundary': 'Do not feed this draft into current GuiTextFont as an enabled native profile. Original source cells remain unchanged; no captured vertices generate glyphs.'}
    outputs = {role + '.json': json_bytes(profile) for role, profile in profiles.items()}
    outputs['gui-fonts.json'] = json_bytes(profiles)
    outputs['mixed-candidate.json'] = json_bytes(mixed)
    if unicode_helper.existing_fonts(project, destination) != original_fonts or sha(archive.read_bytes()) != ARCHIVE_SHA:
        raise SystemExit('Original font sources changed during validation; no output written.')
    if args.check_only:
        print('Checked Anvil original pages/metadata and isolated candidates; no files written.')
        return
    pages_destination = destination / 'originalpages'
    pages_destination.mkdir(parents=True, exist_ok=True)
    for name in [*PAGES, 'default8.png']:
        (pages_destination / name).write_bytes(entries[name])
    for name in metadata_expected:
        (destination / name).write_bytes(entries[name])
    for name, content in outputs.items():
        (destination / name).write_bytes(content)
    if unicode_helper.existing_fonts(project, destination) != original_fonts or sha(archive.read_bytes()) != ARCHIVE_SHA:
        raise SystemExit('Original source changed during preparation; no previous cache was written by this script.')
    provenance = {
        'status': 'Original sources verified. Actual QA uses pure Unicode costs and pure default8 name; unobserved/terminal advances remain candidates.',
        'distribution': 'Caller-owned local preview only. Original font pages/metadata stay ignored and outside Git/public assets/npm. A local site may embed optional original pages.',
        'archive': str(archive), 'archiveBytes': len(data), 'archiveSha256': ARCHIVE_SHA, 'table': table,
        'scope': {'title': TITLE, 'inventoryLabel': INVENTORY, 'originalItemName': NAME, 'costPrefix': COST,
                  'expensive': EXPENSIVE, 'unicodeCharacters': list(characters), 'asciiCharacters': 'Printable U+0020..U+007E; no extended-byte mapping inferred'},
        'roles': {'labels': {'fontFile': 'labels.json', 'glyphs': len(labels), 'suggestedHostFontScale': 0.5},
                  'unicode': {'fontFile': 'unicode.json', 'glyphs': len(characters), 'suggestedHostFontScale': 0.5},
                  'ascii': {'fontFile': 'ascii.json', 'glyphs': 95, 'suggestedHostFontScale': 1},
                  'costs': {'fontFile': 'costs.json', 'glyphs': len(costs_characters), 'suggestedHostFontScale': 0.5, 'pageKind': 'Only original256x256 Unicode pages, including glyph_00.png for ASCII/digits/space'},
                  'combinedManifest': 'gui-fonts.json', 'isolatedUnsupportedMixedCandidate': 'mixed-candidate.json'},
        'candidateMetrics': {'unicode': 'Full original16x16 cells, offset0; advance18/line20 remain finite host candidates except observed adjacent native pens below. Fullwidth colon advance17 source units reproduces observed8.5-game adjacent advance. No terminal width is certified.',
                             'costs': 'All original Unicode16x16 cells. CJK candidate advance18, fullwidth colon17 measured to following digit1. Unicode glyph_00 printableASCII/digit candidate advance=original alpha rightExclusive+2 source units, advance-only space8. For digit1 source bbox[2,4,7,14], candidate9 source units is compatible with observed anchor/width49, but terminal advance and engine algorithm are unproved. Never use default8 for this role.',
                             'ascii': 'Full original8x12 cells with source y-offset-3; candidate advance=nonzero-alpha exclusive right+1, special advance-only space4. line12 is a source-cell host profile, not measured Anvil line spacing.',
                             'mixed': 'Proposed common pen units: default8 page scale1, Unicode page scale0.5, common line10. This separate draft is not a working current API or native algorithm.',
                             'samplingAndShader': 'Unset; no global font or material is selected/registered by this script.',
                             'notCertified': ['Resource selection outside observed title/inventory/cost QA/default8-name QA runs', 'Native per-character and fullwidth punctuation advance', 'MVP/paint origin, page batching and shadow ordering', 'Native line height, wrapping, sampler/shader or whole GUI pixels']},
        'nativeObservation': {'ledger': '.cache/anvil-native-source-01/qa/font-metrics.json', 'case': 'QA CL852 RT136',
                              'labels': 'Title/inventory Unicode256 cell16 quads8game; adjacent observed pens advance9game.',
                              'cost': 'All Unicode including digit1 glyph_00[16,48,16,16]; pens0,9,18,27,36,44.5; FF1A advance17 source units.',
                              'asciiName': 'QA and ABCDEFGHIJKLMNOPQRSTUVWXYZ0123 use default8 cell8x12/y-offset-3. Observed adjacent advance6 except I-to-J4; terminal A/3 unexposed. Source-alpha candidate rule agrees with these finite adjacent observations.',
                              'longLedger': '.cache/anvil-native-source-01/long/font-metrics.json',
                              'unknown': 'All final advances, space, other digit/ASCII costs, expensive-message metrics and arbitrary mixed-name layout; original source alpha is not native metric proof.',
                              'use': 'Only finite observed advance constants; original source pages/cells are never generated from capture meshes or atlas images.'},
        'sourceMetadata': [{'file': name, 'sourceEntry': name, 'sha256': expected, 'bytes': len(entries[name])} for name, expected in metadata_expected.items()],
        'files': source_records, 'unicodeCells': unicode_cells, 'asciiCells': ascii_cells, 'costsUnicodeAsciiCells': costs_ascii_cells,
        'candidateFiles': [{'file': name, 'sha256': sha(content), 'bytes': len(content)} for name, content in outputs.items()],
        'preservedExistingFonts': {'root': '.cache/local-fonts', 'excludedNewDirectory': '.cache/local-fonts/anvil',
                                   'count': len(original_fonts), 'allBytesUnchanged': True, 'filesBeforeAndAfter': original_fonts},
        'pureParserReuse': ['use-local-grindstone-fonts.py: indexed_alpha/existing_fonts/sha only', 'use-local-workstation-fonts.py: indexed_alpha only; neither main() runs'],
        'boundaries': 'No original page is cropped/redrawn. Alpha ink does not establish Unicode advances. Captured vertices/atlas images are never dictionary inputs. No previous cache, GPU/UI/native/capture/build state is changed.',
    }
    (destination / 'provenance.json').write_bytes(json_bytes(provenance))
    print(f'Prepared{len(PAGES) + 1} unchanged original PNG pages and pure Anvil role candidates in {destination}.')
    print(f'Previous font files unchanged: {len(original_fonts)}. Unobserved/terminal advances and isolated mixed candidate remain uncertified.')


if __name__ == '__main__':
    main()
