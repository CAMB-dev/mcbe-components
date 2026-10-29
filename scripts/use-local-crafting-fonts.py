"""Prepare optional Crafting labels from the user's original font.brarchive.

Usage: python scripts/use-local-crafting-fonts.py [GAME_CONTENT] [--check-only]
       python scripts/use-local-crafting-fonts.py --archive PATH [--check-only]

Only .cache/local-fonts/crafting-ui is written. Complete original Unicode pages
stay private; no global font, library asset or npm font is installed. Requires
the source repository and Python standard library, including the tracked pure
PNG parser in use-local-grindstone-fonts.py. UI role metrics remain caller inputs.
Restart the demo after preparation; cache changes are not watched automatically.
"""
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import os
import struct
import sys

sys.dont_write_bytecode = True
ARCHIVE_SHA = 'cdb2c8dbfcea7e0967d5369ced0eb5f4a6fcded79769e4e4605c1f0b406c86bc'
ARCHIVE_BYTES = 1254618
METADATA_SHA = '48c537a010ffb7c4fe5c2d6cc4b2c955758be2df184f553077080bdc2afc3b5a'
DEFAULT_CONTENT = Path('C:/XboxGames/Minecraft for Windows/Content')
LABELS = ('建筑', '装备', '物品', '自然', '全部配方', '合成', '物品栏', '搜索')
CHARACTERS = ''.join(dict.fromkeys(''.join(LABELS)))
PAGES = tuple(sorted({f'glyph_{ord(character) >> 8:02X}.png' for character in CHARACTERS}))


def sha(content):
    return hashlib.sha256(content).hexdigest()


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def source_parser():
    """Import only pure helpers; the previous preparation main() never runs."""
    path = Path(__file__).with_name('use-local-grindstone-fonts.py')
    spec = importlib.util.spec_from_file_location('mcbeui_crafting_source_parser', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module, path


def output_path(project, relative):
    destination = project / '.cache/local-fonts/crafting-ui'
    target = destination / relative
    for directory in (project / '.cache', project / '.cache/local-fonts', destination, target.parent):
        if directory.is_symlink() or not directory.resolve().is_relative_to(project):
            raise SystemExit('Crafting output directories must stay inside this source checkout without symlinks.')
    if target.is_symlink() or not target.resolve().is_relative_to(destination.resolve()):
        raise SystemExit('Crafting output path is outside its owned cache.')
    return target


def read_archive(path):
    if path.stat().st_size != ARCHIVE_BYTES:
        raise SystemExit('font.brarchive size differs from the pinned source. Audit this game version before preparing Crafting labels.')
    content = path.read_bytes()
    if sha(content) != ARCHIVE_SHA:
        raise SystemExit('font.brarchive differs from the pinned source. Audit this game version before preparing Crafting labels.')
    if len(content) < 16 or content[:8] != bytes.fromhex('7d2725b1a0527026'):
        raise SystemExit('Unsupported original font archive header.')
    count, version = struct.unpack_from('<II', content, 8)
    payload = 16 + count * 256
    if version != 1 or not 0 < count < 100000 or payload > len(content):
        raise SystemExit('Unsupported original font archive table.')
    wanted = set(PAGES) | {'font_metadata.json'}
    entries, names = {}, set()
    for index in range(count):
        record = content[16 + index * 256:16 + (index + 1) * 256]
        length = record[0]
        if not 0 < length < 248:
            raise SystemExit('Invalid original font entry name length.')
        name = record[1:1 + length].decode('utf-8')
        offset, size = struct.unpack_from('<II', record, 248)
        if name in names or payload + offset + size > len(content):
            raise SystemExit('Duplicate or out-of-bounds original font entry.')
        names.add(name)
        if name in wanted:
            entries[name] = content[payload + offset:payload + offset + size]
    if entries.keys() != wanted:
        raise SystemExit(f'Missing required original font entries: {sorted(wanted - entries.keys())}')
    return content, entries, {'version': version, 'entries': count, 'payloadOffset': payload}


def prepare(project, archive):
    destination = project / '.cache/local-fonts/crafting-ui'
    # Validate ownership before reading the caller's source or creating outputs.
    output_path(project, 'labels.json')
    archive = archive.resolve(strict=True)
    if archive.is_relative_to(destination.resolve()):
        raise SystemExit('The original font archive must be outside the owned Crafting output directory.')
    parser, parser_path = source_parser()
    previous = parser.existing_fonts(project, destination)
    content, entries, table = read_archive(archive)
    if sha(entries['font_metadata.json']) != METADATA_SHA:
        raise SystemExit('Original font metadata differs from the pinned source.')
    metadata = json.loads(entries['font_metadata.json'])
    if metadata.get('version') != 1 or not isinstance(metadata.get('font_aliases'), list):
        raise SystemExit('Unsupported original font metadata.')
    if len(CHARACTERS) != 17 or len(PAGES) != 16:
        raise SystemExit('The explicit gallery label character set changed; audit the new scope.')
    alpha_pages, page_records = {}, []
    for name in PAGES:
        alpha, details = parser.indexed_alpha(entries[name])
        alpha_pages[name] = alpha
        page_records.append({'file': 'originalpages/' + name, 'sourceEntry': name,
                             'bytes': len(entries[name]), 'sha256': sha(entries[name]),
                             'modifications': 'None; complete original PNG bytes', **details})
    glyphs, cells = {}, []
    for character in CHARACTERS:
        code = ord(character)
        name, x, y = f'glyph_{code >> 8:02X}.png', code % 16 * 16, code % 256 // 16 * 16
        ink = [(xx, yy) for yy in range(16) for xx in range(16)
               if alpha_pages[name][(y + yy) * 256 + x + xx]]
        if not ink:
            raise SystemExit(f'Required original label cell has no ink: U+{code:04X}')
        glyphs[character] = {'page': PAGES.index(name), 'x': x, 'y': y, 'width': 16, 'height': 16,
                             'advance': 18, 'offsetX': 0, 'offsetY': 0}
        cells.append({'character': character, 'codepoint': f'U+{code:04X}', 'sourceEntry': name,
                      'sourceRect': [x, y, 16, 16], 'alphaInkPixels': len(ink),
                      'alphaInkBounds': [min(p[0] for p in ink), min(p[1] for p in ink),
                                         max(p[0] for p in ink) + 1, max(p[1] for p in ink) + 1],
                      'advanceSource': 'Chosen full-cell16 plus spacing2 host candidate; not source metadata or native certification',
                      'bearingSource': 'Original full-cell origin, not a recovered CPU bearing'})
    font = {'pages': ['./originalpages/' + name for name in PAGES], 'pageSizes': [256] * len(PAGES),
            'cellHeight': 16, 'lineHeight': 16, 'glyphs': glyphs}
    outputs = {'labels.json': json_bytes(font), 'gui-fonts.json': json_bytes({'labels': font}),
               'font_metadata.json': entries['font_metadata.json']}
    for name in PAGES:
        outputs['originalpages/' + name] = entries[name]
    provenance = {
        'status': 'Original source pages verified; finite Crafting label candidates only.',
        'archive': {'path': str(archive), 'bytes': len(content), 'sha256': ARCHIVE_SHA, 'table': table},
        'labels': list(LABELS), 'characters': list(CHARACTERS), 'uniqueCharacters': len(CHARACTERS),
        'font': {'file': 'labels.json', 'type': 'GuiTextFont', 'manifest': 'gui-fonts.json',
                 'cellHeight': 16, 'pageSizes': [256] * len(PAGES), 'lineHeight': 16,
                 'scope': 'lineHeight16 is intrinsic-cell fallback metadata, not a native UI role line height.'},
        'metricScope': {'advance': 'Every glyph uses candidate18; original alpha bounds are diagnostics, not native advance proof.',
                        'offset': 'Full-cell offset0; no role paint adjustment is baked into the source font.',
                        'externalCallerInputs': ['fontScale', 'sampling', 'shader', 'role lineHeight', 'paintOffset', 'shadow', 'origin', 'scissor'],
                        'unverified': 'Unmeasured label strings, terminal advances, wrapping, role selection and full GUI/browser pixels.',
                        'missingGlyphPolicy': 'Only the17explicit label characters are provided; ASCII/query/count/placeholder roles are not selected.'},
        'sourceMetadata': {'file': 'font_metadata.json', 'sourceEntry': 'font_metadata.json',
                           'bytes': len(entries['font_metadata.json']), 'sha256': METADATA_SHA},
        'sourcePages': page_records, 'sourceCells': cells,
        'generator': {'file': Path(__file__).name, 'sha256': sha(Path(__file__).read_bytes()),
                      'pureParser': parser_path.name, 'pureParserSHA256': sha(parser_path.read_bytes())},
        'preservedOtherFonts': {'count': len(previous), 'allBytesUnchanged': True, 'filesBeforeAndAfter': previous},
        'outputFiles': [{'file': name, 'bytes': len(data), 'sha256': sha(data)} for name, data in sorted(outputs.items())],
        'distribution': 'Caller-owned local/site resources only. Complete original pages/metadata stay ignored; not library dist/npm assets or global font registration.',
        'captureInputUsed': False,
    }
    outputs['provenance.json'] = json_bytes(provenance)
    if parser.existing_fonts(project, destination) != previous or sha(archive.read_bytes()) != ARCHIVE_SHA:
        raise SystemExit('Another font or the original source changed during preparation; refusing outputs.')
    return outputs, previous, parser, archive


def main():
    argument_parser = argparse.ArgumentParser(description=__doc__)
    argument_parser.add_argument('game_content', nargs='?', type=Path)
    argument_parser.add_argument('--archive', type=Path, help='Direct original font.brarchive path instead of GAME_CONTENT.')
    argument_parser.add_argument('--check-only', action='store_true', help='Validate sources/output identity without writing files or updating mtimes.')
    args = argument_parser.parse_args()
    if args.archive is not None and args.game_content is not None:
        argument_parser.error('Use GAME_CONTENT or --archive, not both.')
    archive = args.archive or (args.game_content or DEFAULT_CONTENT) / 'data/resource_packs/vanilla/__brarchive/font.brarchive'
    project = Path(__file__).resolve().parent.parent
    destination = project / '.cache/local-fonts/crafting-ui'
    outputs, previous, parser, archive = prepare(project, archive)
    targets = {name: output_path(project, name) for name in outputs}
    if args.check_only:
        present = [name for name, target in targets.items() if target.exists()]
        differing = [name for name in present if targets[name].read_bytes() != outputs[name]]
        if differing:
            raise SystemExit(f'Prepared Crafting outputs differ; rerun preparation: {differing}')
        print(json.dumps({'status': 'checked-no-writes', 'existingOutputsMatched': len(present),
                          'expectedOutputs': len(outputs), 'otherFontsUnchanged': len(previous)}))
        return
    for name, target in targets.items():
        temporary = target.with_name(target.name + '.crafting-tmp')
        if temporary.exists() or temporary.is_symlink():
            raise SystemExit('Refusing an existing temporary Crafting output path.')
        target.parent.mkdir(parents=True, exist_ok=True)
        try:
            temporary.write_bytes(outputs[name])
            os.replace(temporary, target)
        finally:
            if temporary.exists():
                temporary.unlink()
    if parser.existing_fonts(project, destination) != previous or sha(archive.read_bytes()) != ARCHIVE_SHA:
        raise SystemExit('Another font/source changed during writing; previous caches were not written by this script.')
    print(json.dumps({'status': 'prepared-local-crafting-labels', 'uniqueCharacters': len(CHARACTERS),
                      'originalPages': len(PAGES), 'outputs': len(outputs), 'otherFontsUnchanged': len(previous),
                      'destination': str(destination)}))


if __name__ == '__main__':
    main()
