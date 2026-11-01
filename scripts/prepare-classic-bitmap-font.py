"""Prepare an opt-in, caller-owned paged CP437 BitmapFont candidate.

python scripts/prepare-classic-bitmap-font.py FONT_BRARCHIVE \
    --profile cp437-paged-candidate [--characters TEXT] [--text-file UTF8_FILE] \
    [--check-only]

Only .cache/local-fonts/classic-bitmap is written. Requests include95 printable
ASCII by default. Text is literal: unsupported characters and all controls,
including CR/LF, are errors. No character normalization or silent omission.
Original pages stay whole and private; no font registration or default change.
Pagination is an explicit host candidate, not recovered native font binding.
"""
from pathlib import Path
import argparse
import importlib.util
import json
import os
import tempfile
import unicodedata
import sys


sys.dont_write_bytecode = True  # --check-only also avoids helper .pyc writes.
PROJECT = Path(__file__).resolve().parent.parent
PROFILE = 'cp437-paged-candidate'
MAX_ARCHIVE_BYTES = 16 * 1024 * 1024
MAX_TEXT_BYTES = 1024 * 1024
MAX_CACHE_BYTES = 128 * 1024 * 1024
ARCHIVE_SHA = 'cdb2c8dbfcea7e0967d5369ced0eb5f4a6fcded79769e4e4605c1f0b406c86bc'
MEMBER_SHA = {
    'default8.png': 'daf219bcd3a050c33f0f8883e12d75acc818cee918f400f5afcd7ac386b2f904',
    'default8_1.png': '027a54733f3f06cd1fa73a9ce11597e98d8c0e3633a84edb53954453063be3e7',
    'default8_2.png': 'a775497f2c7ad00cd72442ee17310e77b8eee5e3cfb452d86dd3d247f0ab3d96',
    'default8.json': '1326598897eebc60e5c6835f1fdf700c175f5d2628bb4ed6a9bba959d3695793',
    'font_metadata.json': '48c537a010ffb7c4fe5c2d6cc4b2c955758be2df184f553077080bdc2afc3b5a',
}
PAGE_NAMES = ('default8.png', 'default8_1.png', 'default8_2.png')


def helper(name, filename):
    """Reuse existing pure archive/PNG parsers; never call old producers."""
    specification = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    return module


common = helper('classic_bitmap_common', 'prepare-classic-fonts.py')
png = helper('classic_bitmap_png', 'use-local-workstation-fonts.py')
require = common.require
sha = common.sha
json_bytes = common.json_bytes


def linked(path):
    return path.is_symlink() or getattr(path, 'is_junction', lambda: False)()


def output_layout():
    """Fixed private destination; reject aliases even within the workspace."""
    project = PROJECT.resolve(strict=True)
    chain = [project / '.cache']
    chain += [chain[0] / 'local-fonts', chain[0] / 'local-fonts/classic-bitmap']
    for path in chain + [chain[-1] / 'originalpages']:
        require(not linked(path) and path.resolve() == path, f'Private bitmap output directory is redirected: {path}')
        require(not path.exists() or path.is_dir(), f'Private bitmap output is not a directory: {path}')
    return chain[1], chain[2]


def output_path(destination, relative):
    allowed = {'font.json', 'provenance.json', 'default8.json', 'font_metadata.json'} | {
        'originalpages/' + name for name in PAGE_NAMES}
    require(relative in allowed, f'Unsupported bitmap output name: {relative}')
    _, current = output_layout()
    require(current == destination, 'Private bitmap output directory changed.')
    target = destination / relative
    require(not linked(target) and target.resolve() == target, f'Private bitmap output file is redirected: {target}')
    require(not target.exists() or target.is_file(), f'Private bitmap output is not a regular file: {target}')
    return target


def input_path(path, destination, description):
    resolved = Path(path).resolve()
    require(not resolved.is_relative_to(destination), f'{description} must remain outside the owned bitmap output directory: {resolved}')
    return resolved


def requested_characters(additions, files, destination):
    values = set(chr(code) for code in range(32, 127))
    inputs, total = [], 0
    for text in additions:
        require(len(text) <= MAX_TEXT_BYTES, '--characters exceeds the text limit.')
        raw = text.encode('utf-8')
        total += len(raw)
        require(total <= MAX_TEXT_BYTES, 'Combined requested text exceeds the byte limit.')
        values.update(text)
    for filename in files:
        path, raw = common.read_file(input_path(filename, destination, 'Text input'), MAX_TEXT_BYTES)
        input_path(path, destination, 'Text input')
        total += len(raw)
        require(total <= MAX_TEXT_BYTES, 'Combined requested text exceeds the byte limit.')
        # UTF8 is literal: BOM/line separators are not silently removed.
        text = raw.decode('utf-8')
        values.update(text)
        inputs.append({'path': str(path), 'bytes': len(raw), 'sha256': sha(raw)})
    require(len(values) <= 256, 'Requested set exceeds the finite256 CP437 characters.')
    result = sorted(values, key=ord)
    for character in result:
        code = ord(character)
        require(code <= 0xffff and not unicodedata.category(character).startswith('C'),
                f'Unsupported control/non-BMP character: U+{code:04X}')
        try:
            encoded = character.encode('cp437')
        except UnicodeEncodeError as error:
            raise ValueError(f'Character is not literal CP437: U+{code:04X}') from error
        require(len(encoded) == 1 and encoded[0] >= 32 and code != 127,
                f'Unsupported CP437 control character: U+{code:04X}')
    return result, inputs


def route(character):
    """Explicit hypothetical source paging; no native lookup/alias recovery."""
    encoded = character.encode('cp437')
    require(len(encoded) == 1, 'Expected one literal CP437 byte.')
    byte = encoded[0]
    page, slot = divmod(byte, 160)
    return byte, page, (slot % 16) * 8, (slot // 16) * 12


def validate_sources(raw):
    require(sha(raw) == ARCHIVE_SHA, 'Original font archive differs from the pinned source.')
    entries, table = common.archive_entries(raw, MEMBER_SHA)
    for name, expected in MEMBER_SHA.items():
        require(sha(entries[name]) == expected, f'Original member differs from pinned source: {name}')
    metadata = json.loads(entries['default8.json'])
    require(metadata == {'ascii_character_height': 12, 'ascii_character_y_offset': -3, 'ascii_extended': True},
            'Unexpected original default8 metadata.')
    require(json.loads(entries['font_metadata.json']).get('version') == 1, 'Unexpected original font metadata.')
    alphas, pins = {}, []
    for name in PAGE_NAMES:
        width, height, alpha = png.indexed_alpha(entries[name])
        require((width, height) == (128, 128) and len(alpha) == 128 * 128,
                f'Unexpected original page dimensions: {name}')
        alphas[name] = alpha
        pins.append({'member': name, 'bytes': len(entries[name]), 'sha256': sha(entries[name]),
                     'dimensions': [128, 128], 'alphaSha256': sha(alpha), 'alphaValues': sorted(set(alpha))})
    return entries, alphas, table, pins


def bitmap_font(characters, alphas):
    used = sorted({route(character)[1] for character in characters})
    names = [PAGE_NAMES[index] for index in used]
    glyphs, records = {}, []
    for character in characters:
        byte, source_page, x, y = route(character)
        require(x + 8 <= 128 and y + 12 <= 128, 'Complete source cell exceeds original page.')
        alpha = alphas[PAGE_NAMES[source_page]]
        require(len(alpha) == 128 * 128, 'Unexpected source alpha size.')
        cell = bytes(alpha[(y + yy) * 128 + x + xx] for yy in range(12) for xx in range(8))
        ink = [(xx, yy) for yy in range(12) for xx in range(8) if cell[yy * 8 + xx]]
        require(ink or character == ' ',
                f'Empty nonspace source cell for U+{ord(character):04X} in {PAGE_NAMES[source_page]} at[{x},{y},8,12]; select an explicit host font/fallback.')
        right = max((xx + 1 for xx, _ in ink), default=0)
        advance = 4 if character == ' ' else right + 1
        glyphs[character] = {'page': used.index(source_page), 'x': x, 'y': y, 'width': 8, 'height': 12,
                             'advance': advance, 'offsetX': 0, 'offsetY': -3}
        bounds = [min(xx for xx, _ in ink), min(yy for _, yy in ink), right,
                  max(yy for _, yy in ink) + 1] if ink else None
        records.append({'character': character, 'unicode': f'U+{ord(character):04X}', 'cp437ByteCandidate': byte,
                        'sourceMember': PAGE_NAMES[source_page], 'sourceRect': [x, y, 8, 12],
                        'sourceCellAlphaSha256': sha(cell), 'inkPixels': len(ink), 'inkBBox': bounds,
                        'advance': advance, 'advanceProvenance': 'space4 explicit Web policy' if character == ' ' else 'original alpha rightExclusive+1'})
    return {'pages': ['./originalpages/' + name for name in names], 'pageSizes': [128] * len(names),
            'glyphs': glyphs, 'lineHeight': 12}, names, records


def existing_fonts(root, excluded):
    """Bounded whole-byte snapshot; no directory/file aliases are followed."""
    result, total = {}, 0
    if not root.exists():
        return result
    for current, directories, files in os.walk(root, followlinks=False):
        current = Path(current)
        kept = []
        for name in directories:
            path = current / name
            if path == excluded:
                continue
            require(not linked(path) and path.resolve() == path, 'Existing font-cache directory is redirected.')
            kept.append(name)
        directories[:] = kept
        for name in sorted(files):
            path = current / name
            require(not linked(path) and path.resolve() == path and path.is_file(), 'Existing font-cache file is redirected.')
            total += path.stat().st_size
            require(len(result) < 4096 and total <= MAX_CACHE_BYTES, 'Existing font-cache snapshot exceeds the audit limit.')
            _, raw = common.read_file(path, MAX_ARCHIVE_BYTES)
            result[path.relative_to(root).as_posix()] = {'bytes': len(raw), 'sha256': sha(raw)}
    return dict(sorted(result.items()))


def write_output(destination, name, raw):
    """Atomic directory-entry replacement; never truncate an existing hardlink."""
    target = output_path(destination, name)
    descriptor, temporary = tempfile.mkstemp(prefix='.' + target.name + '.', suffix='.tmp', dir=target.parent)
    temporary = Path(temporary)
    try:
        with os.fdopen(descriptor, 'wb') as output:
            output.write(raw)
        require(output_path(destination, name) == target, 'Bitmap output changed before atomic replacement.')
        os.replace(temporary, target)
    finally:
        if temporary.exists():
            temporary.unlink()


def prepare(args):
    require(args.profile == PROFILE, 'An explicit cp437-paged-candidate profile is required.')
    fonts_root, destination = output_layout()
    archive_input = input_path(args.archive, destination, 'Original archive')
    # All path and literal-input validation precedes optional output creation.
    characters, texts = requested_characters(args.characters, args.text_file, destination)
    planned = ['font.json', 'provenance.json', 'default8.json', 'font_metadata.json'] + [
        'originalpages/' + PAGE_NAMES[index] for index in sorted({route(c)[1] for c in characters})]
    targets = {name: output_path(destination, name) for name in planned}
    before = existing_fonts(fonts_root, destination)
    archive_path, raw = common.read_file(archive_input, MAX_ARCHIVE_BYTES)
    input_path(archive_path, destination, 'Original archive')
    entries, alphas, table, page_pins = validate_sources(raw)
    font, names, records = bitmap_font(characters, alphas)
    outputs = {'originalpages/' + name: entries[name] for name in names}
    outputs.update({name: entries[name] for name in ('default8.json', 'font_metadata.json')})
    outputs['font.json'] = json_bytes(font)
    provenance = {
        'schemaVersion': 1, 'profile': PROFILE, 'status': 'Finite private original-page BitmapFont candidate; opt-in only',
        'distribution': 'Caller-owned original game font artwork stays in ignored cache, outside Git/public/npm. No font registration.',
        'sourceArchive': {'path': str(archive_path), 'bytes': len(raw), 'sha256': sha(raw), **table},
        'sourceMembers': [{'member': name, 'bytes': len(entries[name]), 'sha256': sha(entries[name])} for name in MEMBER_SHA],
        'sourcePagesChecked': page_pins, 'sourceMetadata': json.loads(entries['default8.json']),
        'requestedCharacters': characters, 'textFiles': texts, 'glyphs': records,
        'pagination': {'encoding': 'Python strict literal CP437 codec; controls rejected', 'columns': 16,
                       'completeRows': 10, 'capacity': 160, 'page': 'floor(CP437byte/160)',
                       'slot': 'CP437byte%160', 'cell': '[(slot%16)*8,floor(slot/16)*12,8,12]',
                       'nativePageBindingRecovered': False},
        'lineHeight': {'value': 12, 'provenance': 'Original source cell height; declared BitmapFont line policy, not native Credits row spacing'},
        'sourceModification': 'None. Complete original PNGs and raw metadata copied byte-for-byte; full8x12 cells including blank rows retained.',
        'limitations': ['Suffix page lookup is an explicit host hypothesis, not recovered engine font binding.',
                        'Finite literal CP437 coverage only; no Unicode/CJK/system-font fallback or silently omitted characters.',
                        'Empty nonspace source cells are rejected; host must select an explicit font/fallback. Space retains its whole8x12 cell and chosen Web advance4.',
                        'No native automatic route, all-character advance/terminal/kerning, line spacing, shader/sampler/RGB or whole GUI certification.',
                        'Only current referenced pages are copied. Prior unreferenced files in this owned cache are not garbage-collected.',
                        'Files are individually atomically replaced; this is not a multi-file transactional publication.'],
        'preservedExistingFonts': {'count': len(before), 'excluded': '.cache/local-fonts/classic-bitmap',
                                   'allBytesUnchanged': True, 'filesBeforeAndAfter': before},
        'outputs': [{'file': name, 'bytes': len(value), 'sha256': sha(value)} for name, value in sorted(outputs.items())],
    }
    outputs['provenance.json'] = json_bytes(provenance)
    require(existing_fonts(fonts_root, destination) == before, 'Existing font files changed during preparation; no output written.')
    require(sha(common.read_file(archive_path, MAX_ARCHIVE_BYTES)[1]) == ARCHIVE_SHA,
            'Original archive changed during preparation; no output written.')
    if not args.check_only:
        destination.mkdir(parents=True, exist_ok=True)
        (destination / 'originalpages').mkdir(exist_ok=True)
        require(output_layout()[1] == destination, 'Bitmap output directory changed before writing.')
        for name, value in outputs.items():
            require(output_path(destination, name) == targets[name], 'Bitmap output path changed before writing.')
            write_output(destination, name, value)
        require(existing_fonts(fonts_root, destination) == before, 'Existing font files changed; only the bitmap candidate directory was written.')
    return {'profile': PROFILE, 'checkOnly': args.check_only, 'destination': str(destination),
            'glyphCount': len(characters), 'sourcePagesChecked': len(page_pins), 'wholePagesReferenced': len(names),
            'existingFontFilesUnchanged': len(before), 'outputHashes': provenance['outputs']}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('archive', help='Explicit caller-owned font.brarchive, read-only; no default installation path.')
    parser.add_argument('--profile', required=True, choices=(PROFILE,))
    parser.add_argument('--characters', action='append', default=[], help='Literal additional CP437 text; repeatable, no normalization/control removal.')
    parser.add_argument('--text-file', action='append', default=[], help='Literal UTF8 text; BOM, CR/LF and unsupported/control characters are rejected.')
    parser.add_argument('--check-only', action='store_true', help='Validate in memory without creating or writing any files.')
    args = parser.parse_args()
    try:
        print(json.dumps(prepare(args), ensure_ascii=False, indent=2))
    except (ValueError, OSError, UnicodeError) as error:
        parser.exit(1, f'{error}\n')


if __name__ == '__main__':
    main()
