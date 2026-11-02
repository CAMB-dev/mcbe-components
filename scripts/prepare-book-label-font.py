"""Prepare caller-owned whole Unicode PNG pages and a finite Book GuiTextFont.

python scripts/prepare-book-label-font.py [FONT_BRARCHIVE] [--characters TEXT]
    [--text-file UTF8_FILE] [--target labels|body] [--check-only]

Only the selected fixed .cache/local-fonts/book-labels or book-body is written.
Labels remain the default. No font registration, WOFF,
captured/native atlas input or inferred engine font routing is used. Pillow is
required; the existing project-local .cache/python may supply it.
"""
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import os
import re
import sys
import tempfile

sys.dont_write_bytecode = True
PROJECT = Path(__file__).resolve().parent.parent
ARCHIVE_SHA256 = 'cdb2c8dbfcea7e0967d5369ced0eb5f4a6fcded79769e4e4605c1f0b406c86bc'
DEFAULT_ARCHIVE = Path('C:/XboxGames/Minecraft for Windows/Content/data/resource_packs/vanilla/__brarchive/font.brarchive')
MAX_ARCHIVE_BYTES, MAX_TEXT_BYTES = 16 * 1024 * 1024, 1024 * 1024
MAX_TOTAL_TEXT_BYTES, MAX_CHARACTERS, MAX_TEXT_INPUTS = 4 * 1024 * 1024, 4096, 32
DEFAULT_CHARACTERS = ''.join(chr(c) for c in range(32, 127)) + '第页共签名'
BODY_CHARACTERS = ''.join(chr(c) for c in range(32, 127)) + '像素字体测试'
TARGETS = {'labels': ('book-labels', DEFAULT_CHARACTERS), 'body': ('book-body', BODY_CHARACTERS)}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def linked(path):
    return path.is_symlink() or getattr(path, 'is_junction', lambda: False)()


def no_links(path):
    """Check lexical ancestors before resolution, including dangling links."""
    path = Path(os.path.abspath(path))
    for part in reversed((path,) + tuple(path.parents)):
        require(not linked(part), f'Linked path is unsupported: {part}')
    return path


def _fixed_output_directory(project, target):
    require(target in TARGETS, 'Unsupported fixed Book font target.')
    project = no_links(project)
    require(project.is_dir(), 'Project root is unavailable.')
    destination = project / '.cache' / 'local-fonts' / TARGETS[target][0]
    no_links(destination)
    for part in [project / '.cache', project / '.cache/local-fonts', destination]:
        require(not part.exists() or part.is_dir(), f'Output ancestor is not a directory: {part}')
    require(destination.resolve().parent == (project / '.cache/local-fonts').resolve()
            and destination.resolve().is_relative_to(project.resolve()), 'Book-label output escapes its fixed cache directory.')
    return destination


def output_directory(target='labels'):
    return _fixed_output_directory(PROJECT, target)


def output_path(directory, name):
    require(name in ('font.json', 'provenance.json', 'font_metadata.json')
            or re.fullmatch(r'glyph_[0-9A-F]{2}\.png', name), 'Unsupported Book-label output filename.')
    selected = next((target for target, (leaf, _) in TARGETS.items() if directory.name == leaf), None)
    require(selected is not None and directory == output_directory(selected), 'Book font output directory changed.')
    target = no_links(directory / name)
    require(target.parent == directory and target.resolve().parent == directory.resolve(), 'Book-label output is redirected.')
    require(not target.exists() or target.is_file(), 'Book-label output is not a regular file.')
    return target


def read_input(path, limit, destination, description):
    path = no_links(path)
    resolved = path.resolve(strict=True)
    require(not resolved.is_relative_to(destination.resolve()), f'{description} cannot be an owned output.')
    require(resolved.is_file() and resolved.stat().st_size <= limit, f'{description} file exceeds its byte budget or is not regular.')
    raw = resolved.read_bytes()
    require(len(raw) <= limit, f'{description} grew beyond its byte budget.')
    return resolved, raw


def characters(additions, files, destination, default_characters=DEFAULT_CHARACTERS):
    require(len(additions) + len(files) <= MAX_TEXT_INPUTS, 'Too many text inputs (maximum32).')
    values, inputs, total = set(default_characters), [], 0
    for text in additions:
        raw = text.encode('utf-8')
        require(len(raw) <= MAX_TEXT_BYTES, '--characters exceeds its UTF8 byte budget.')
        total += len(raw)
        require(total <= MAX_TOTAL_TEXT_BYTES, 'Aggregate text byte budget exceeded.')
        values.update(text)
    for file in files:
        path, raw = read_input(file, MAX_TEXT_BYTES, destination, 'Text input')
        total += len(raw)
        require(total <= MAX_TOTAL_TEXT_BYTES, 'Aggregate text byte budget exceeded.')
        values.update(raw.decode('utf-8-sig'))
        inputs.append({'path': str(path), 'bytes': len(raw), 'sha256': sha(raw)})
    values.difference_update('\r\n')
    require(len(values) <= MAX_CHARACTERS, 'Requested unique character count exceeds4096.')
    for value in values:
        code = ord(value)
        require(32 <= code <= 0xffff and not 0x7f <= code <= 0x9f and not 0xd800 <= code <= 0xdfff,
                f'Unsupported control/non-BMP character: U+{code:04X}')
    return sorted(values, key=ord), inputs


def classic_module():
    dependency = PROJECT / '.cache/python'
    if dependency.is_dir():
        no_links(dependency)
        if str(dependency) not in sys.path:
            sys.path.insert(0, str(dependency))
    specification = importlib.util.spec_from_file_location('book_label_classic_source', PROJECT / 'scripts/prepare-classic-fonts.py')
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    return module


def build(args):
    target = getattr(args, 'target', 'labels')
    destination = output_directory(target)
    default_characters = TARGETS[target][1]
    wanted, text_inputs = characters(args.characters, args.text_file, destination, default_characters)
    archive_path, archive = read_input(args.archive, MAX_ARCHIVE_BYTES, destination, 'Original archive')
    require(sha(archive) == ARCHIVE_SHA256, 'font.brarchive differs from the pinned original source.')
    classic = classic_module()
    manifest_path, manifest_raw = read_input(PROJECT / 'scripts/classic-font-characters.json', MAX_TEXT_BYTES, destination, 'Classic metric manifest')
    manifest = json.loads(manifest_raw)
    require(manifest.get('schemaVersion') == 1 and manifest.get('sourceArchiveSha256') == ARCHIVE_SHA256,
            'Unsupported Classic metric manifest/source pin.')
    names = sorted({f'glyph_{ord(c) >> 8:02X}.png' for c in wanted})
    entries, table = classic.archive_entries(archive, set(names) | {'font_metadata.json'})
    require(json.loads(entries['font_metadata.json']).get('version') == 1, 'Unsupported original font metadata.')
    images, page_pins = classic.decode_pages(entries)
    require(len(images) == len(names) <= 256 and all(images[name].size == (256, 256) for name in names), 'Whole Unicode256px source pages are required.')
    records = [classic.glyph(c, 'unicode', images, manifest, 'body-bounds-v1') for c in wanted]
    pages = {name: i for i, name in enumerate(names)}
    glyphs = {}
    for record in records:
        x, y, width, height = record['sourceCell']
        if record['character'] == ' ':
            width = height = 0
        glyphs[record['character']] = {'page': pages[record['sourceEntry']], 'x': x, 'y': y,
                'width': width, 'height': height, 'advance': record['advanceSource'],
                'offsetX': record['offsetUnits'][0] / record['texelUnits'],
                'offsetY': record['offsetUnits'][1] / record['texelUnits']}
    font = {'pages': names, 'pageSizes': [256] * len(names), 'cellHeight': 16, 'lineHeight': 20, 'glyphs': glyphs}
    outputs = {name: entries[name] for name in names}
    outputs['font_metadata.json'] = entries['font_metadata.json']
    outputs['font.json'] = json_bytes(font)
    provenance = {'schemaVersion': 1, 'status': 'Finite source-derived Book ' + ('label' if target == 'labels' else 'body') + ' GuiTextFont; no native renderer certification',
        'distribution': 'Caller-owned original artwork. Private ignored output only; not a font registration or distributable bundled asset.',
        'archive': {'path': str(archive_path), 'bytes': len(archive), 'sha256': sha(archive), 'table': table},
        'metricProducer': {'path': 'scripts/prepare-classic-fonts.py', 'sha256': sha((PROJECT / 'scripts/prepare-classic-fonts.py').read_bytes()),
                           'functions': ['archive_entries', 'decode_pages', 'glyph'], 'policy': 'body-bounds-v1'},
        'metricManifest': {'path': manifest_path.relative_to(PROJECT).as_posix(), 'sha256': sha(manifest_raw)},
        'defaultCharacters': default_characters, 'characters': wanted, 'characterCount': len(wanted), 'additionalTextInputs': text_inputs,
        'originalPages': page_pins,
        'sourceMetadata': {'entry': 'font_metadata.json', 'bytes': len(entries['font_metadata.json']), 'sha256': sha(entries['font_metadata.json'])},
        'geometryPolicy': {'pages': 'Complete unmodified256x256 Unicode PNG pages; no atlas crop, packing, resize or recolor.',
            'cells': 'Complete16x16 source cells; space alone has width=height=0 and advance only.',
            'advance': 'glyph.advance=classic.glyph.advanceSource; no new advance fitting.',
            'offset': 'offsetX/Y=classic.glyph.offsetUnits/texelUnits.', 'cellHeight': 16, 'lineHeight': 20,
            'URLs': 'Relative original PNG filenames; caller resolves these against the private font.json location.'},
        'metricPolicy': classic.body_metric_policy(),
        'glyphProvenance': {r['character']: {k: v for k, v in r.items() if k not in ('character', 'mask')} for r in records},
        'notCertified': ['Native automatic font/page binding', 'Unseen Unicode glyphs, pair/terminal/space advances',
                         'Native font width algorithm, caret or shaping', 'GPU/native RGBA, shader, AA or browser fidelity'],
        'outputs': [{'file': name, 'bytes': len(raw), 'sha256': sha(raw)} for name, raw in sorted(outputs.items())]}
    outputs['provenance.json'] = json_bytes(provenance)
    require(sum(map(len, outputs.values())) <= 32 * 1024 * 1024, 'Generated Book label output exceeds32MiB.')
    # Preflight every entry even during check-only, without creating a directory.
    for name in outputs:
        output_path(destination, name)
    require(sha(read_input(archive_path, MAX_ARCHIVE_BYTES, destination, 'Original archive')[1]) == ARCHIVE_SHA256,
            'Original archive changed during preparation.')
    return destination, outputs, len(wanted), len(names)


def write_output(directory, name, content):
    target = output_path(directory, name)
    if target.exists() and target.read_bytes() == content:
        return
    descriptor, temporary = tempfile.mkstemp(prefix='.' + name + '.', suffix='.tmp', dir=directory)
    temporary = Path(temporary)
    try:
        with os.fdopen(descriptor, 'wb') as output:
            output.write(content)
        require(output_path(directory, name) == target, 'Book-label output path changed before atomic replacement.')
        os.replace(temporary, target)
    finally:
        if temporary.exists():
            temporary.unlink()


def prepare(args):
    destination, outputs, count, pages = build(args)
    if args.check_only:
        role = 'label' if getattr(args, 'target', 'labels') == 'labels' else 'body'
        print(f'Checked Book {role} GuiTextFont in memory: {count}characters, {pages}complete256px pages; no outputs or mtimes changed.')
        return
    destination.mkdir(parents=True, exist_ok=True)
    require(destination == output_directory(getattr(args, 'target', 'labels')), 'Book font output directory changed before writing.')
    for name, content in outputs.items():
        write_output(destination, name, content)
    print(f'Prepared {destination / "font.json"}: {count}characters, {pages}complete256px original PNG pages, cells16/lineHeight20.')
    print('Finite body-bounds-v1 host metrics only; native routing/spacing/shader fidelity unproved. No font registered.')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('archive', nargs='?', default=str(DEFAULT_ARCHIVE))
    parser.add_argument('--target', choices=tuple(TARGETS), default='labels', help='Fixed private output and finite default set: labels (default) or body.')
    parser.add_argument('--characters', action='append', default=[], help='Append literal characters; CR/LF are separators, other controls rejected.')
    parser.add_argument('--text-file', action='append', default=[], help='Append bounded UTF8 text; no normalization or arbitrary fallback.')
    parser.add_argument('--check-only', action='store_true', help='Validate entirely in memory without output writes or directory creation.')
    args = parser.parse_args()
    try:
        prepare(args)
    except (ValueError, OSError, KeyError, ImportError, UnicodeError, TypeError) as error:
        parser.exit(1, f'Book label font preparation failed: {error}\n')


if __name__ == '__main__':
    main()
