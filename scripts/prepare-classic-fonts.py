"""Build caller-owned Classic DOM fonts from pinned original bitmap cells.

python scripts/prepare-classic-fonts.py [FONT_BRARCHIVE] [--characters TEXT]
    [--text-file UTF8_FILE] [--check-only]
Requires fontTools, Brotli and Pillow (a local .cache/python installation is also
supported). Only .cache/local-fonts/classic is written. No font is registered.
These are finite source-derived host fonts for20px; native shader/AA/RGBA and
arbitrary string metrics are not certified. Original-derived fonts stay private.
"""
from pathlib import Path
from io import BytesIO
from copy import deepcopy
import argparse
import hashlib
import json
import os
import struct
import sys
import tempfile


PROJECT = Path(__file__).resolve().parent.parent
MANIFEST = Path(__file__).with_name('classic-font-characters.json')
DEFAULT_ARCHIVE = Path('C:/XboxGames/Minecraft for Windows/Content/data/resource_packs/vanilla/__brarchive/font.brarchive')
MAX_FILE_BYTES = 16 * 1024 * 1024
MAX_TEXT_BYTES = 1024 * 1024
MAX_CHARACTERS = 4096
FAMILIES = {'classic': ('MCBE Classic', 'MCBE-Classic.woff2'),
            'unicode': ('MCBE Classic Unicode', 'MCBE-Classic-Unicode.woff2'),
            'ascii': ('MCBE Classic ASCII', 'MCBE-Classic-ASCII.woff2')}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(content):
    return hashlib.sha256(content).hexdigest()


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def read_file(path, limit):
    """Caller-selected input files may be external, but are read-only and bounded."""
    resolved = path.resolve(strict=True)
    require(resolved.is_file() and resolved.stat().st_size <= limit, f'Unsupported input file or size: {resolved}')
    content = resolved.read_bytes()
    require(len(content) <= limit, f'Input grew beyond the byte limit: {resolved}')
    return resolved, content


def output_directory():
    project = PROJECT.resolve(strict=True)
    cache = (project / '.cache').resolve()
    fonts = (cache / 'local-fonts').resolve()
    destination = (fonts / 'classic').resolve()
    require(cache.is_relative_to(project) and fonts.is_relative_to(cache), 'Private font output root escapes the project cache.')
    require(destination.parent == fonts and destination.name == 'classic', 'Private Classic output directory is redirected.')
    return fonts, destination


def output_path(directory, name):
    path = (directory / name).resolve()
    require(path.parent == directory and path.name == name, f'Classic output file is redirected: {name}')
    require(not path.exists() or path.is_file(), f'Classic output is not a regular file: {name}')
    return path


def source_input_path(path, owned_directory, description):
    # Resolve aliases even for a currently absent leaf, so preflight can reject
    # an owned output before dependencies, source reads or directory creation.
    resolved = Path(path).resolve()
    require(not resolved.is_relative_to(owned_directory),
            f'{description} must remain outside the owned Classic output directory: {resolved}')
    return resolved


def write_output(directory, name, content):
    """Replace this directory entry; never write through an existing hardlink."""
    target = output_path(directory, name)
    descriptor, temporary = tempfile.mkstemp(prefix='.' + name + '.', suffix='.tmp', dir=directory)
    temporary = Path(temporary).resolve()
    require(temporary.parent == directory, 'Temporary Classic output escaped its directory.')
    try:
        with os.fdopen(descriptor, 'wb') as output:
            output.write(content)
        require(output_path(directory, name) == target, 'Classic output changed before atomic replacement.')
        os.replace(temporary, target)
    finally:
        if temporary.exists():
            temporary.unlink()


def old_fonts(root, excluded):
    """Bounded snapshot; never follow a link/junction outside the font cache."""
    result, total = {}, 0
    if not root.exists():
        return result
    for current, directories, files in os.walk(root, followlinks=False):
        here = Path(current).resolve()
        require(here.is_relative_to(root), 'Existing font-cache directory escapes its root.')
        kept = []
        for name in directories:
            path = Path(current) / name
            if path.resolve() == excluded:
                continue
            require(not path.is_symlink() and not getattr(path, 'is_junction', lambda: False)(), 'Linked existing font-cache directory is unsupported.')
            kept.append(name)
        directories[:] = kept
        for name in sorted(files):
            path = (Path(current) / name).resolve(strict=True)
            require(path.is_relative_to(root) and path.is_file(), 'Existing font-cache file escapes its root.')
            size = path.stat().st_size
            total += size
            require(len(result) < 4096 and total <= 128 * 1024 * 1024, 'Existing font-cache snapshot exceeds the audit limit.')
            content = path.read_bytes()
            result[path.relative_to(PROJECT).as_posix()] = {'bytes': len(content), 'sha256': sha(content)}
    return dict(sorted(result.items()))


def archive_entries(content, wanted):
    require(len(content) >= 16 and content[:8] == bytes.fromhex('7d2725b1a0527026'), 'Unsupported font archive header.')
    count, version = struct.unpack_from('<II', content, 8)
    base = 16 + count * 256
    require(version == 1 and 0 < count <= 4096 and base <= len(content), 'Unsupported font archive table.')
    result, seen = {}, set()
    for index in range(count):
        row = content[16 + index * 256:16 + (index + 1) * 256]
        require(0 < row[0] < 248, 'Invalid archive entry name length.')
        name = row[1:1 + row[0]].decode('utf-8')
        require(name not in seen, f'Duplicate archive entry: {name}')
        seen.add(name)
        offset, size = struct.unpack_from('<II', row, 248)
        require(base + offset + size <= len(content), f'Invalid archive bounds: {name}')
        if name in wanted:
            result[name] = content[base + offset:base + offset + size]
    require(set(result) == set(wanted), f'Missing original source pages: {sorted(set(wanted) - set(result))}')
    return result, {'version': version, 'entries': count, 'payloadOffset': base}


def characters(manifest, additions, files, owned_directory=None):
    if owned_directory is None:
        owned_directory = output_directory()[1]
    values = set(chr(code) for code in range(32, 127)) | set(manifest['unicodeCharacters'])
    inputs = []
    for text in additions:
        require(len(text.encode('utf-8')) <= MAX_TEXT_BYTES, '--characters text exceeds the byte limit.')
        values.update(text)
    for file in files:
        path, raw = read_file(source_input_path(file, owned_directory, 'Text input'), MAX_TEXT_BYTES)
        source_input_path(path, owned_directory, 'Text input')
        inputs.append({'path': str(path), 'sha256': sha(raw), 'bytes': len(raw)})
        values.update(raw.decode('utf-8-sig'))
    values.difference_update('\r\n')  # Text-file line separators are not glyphs.
    require(len(values) <= MAX_CHARACTERS, 'Requested unique character count exceeds4096.')
    for value in values:
        code = ord(value)
        require(32 <= code <= 0xffff and not 0x7f <= code <= 0x9f and not 0xd800 <= code <= 0xdfff,
                f'Unsupported control/non-BMP character: U+{code:04X}')
    return sorted(values, key=ord), inputs


def decode_pages(entries):
    from PIL import Image
    images, pins = {}, []
    for name, raw in sorted(entries.items()):
        if not name.endswith('.png'):
            continue
        with Image.open(BytesIO(raw)) as original:
            size = 128 if name == 'default8.png' else 256
            require(original.format == 'PNG' and original.size == (size, size), f'Unsupported original PNG size/type: {name}')
            image = original.convert('RGBA')
        images[name] = image
        pins.append({'entry': name, 'fileBytes': len(raw), 'fileSha256': sha(raw), 'size': [size, size],
                     'completeRgbaSha256': sha(image.tobytes()), 'sourceModification': 'None; complete original PNG decoded read-only'})
    return images, pins


def glyph(character, kind, images, manifest):
    code = ord(character)
    if kind == 'default8':
        name, width, height, unit, offset_y = 'default8.png', 8, 12, 100, -300
        x, y = code % 16 * 8, code // 16 * 12
    else:
        name, width, height, unit, offset_y = f'glyph_{code >> 8:02X}.png', 16, 16, 50, 0
        x, y = code % 16 * 16, code % 256 // 16 * 16
    image = images[name]
    require(x + width <= image.width and y + height <= image.height, f'Source cell out of bounds: U+{code:04X}')
    mask, ink = [], []
    for row in range(height):
        line = []
        for column in range(width):
            red, green, blue, alpha = image.getpixel((x + column, y + row))
            require(alpha in (0, 255), f'Nonbinary original glyph alpha: U+{code:04X} in {name}')
            require(alpha == 0 or (red, green, blue) == (255, 255, 255), f'Nonwhite original glyph ink: U+{code:04X} in {name}')
            line.append(bool(alpha))
            if alpha:
                ink.append((column, row))
        mask.append(line)
    require(ink or character == ' ', f'No supported visible source glyph: U+{code:04X} in {name}')
    right = max((point[0] + 1 for point in ink), default=0)
    observed = manifest['observedAdvances'][kind].get(character)
    host_override = manifest.get('hostAdvanceOverrides', {}).get(kind, {}).get(character)
    if host_override:
        advance = host_override['advanceSource']
        provenance = {'kind': 'host-candidate', **host_override,
                      'method': 'Chosen split of a measured combined advance; individual widths unproved'}
    elif character in (' ', '7'):
        advance = 4 if character == ' ' and kind == 'default8' else 8 if character == ' ' else right + (1 if kind == 'default8' else 2)
        provenance = {'kind': 'host-candidate', 'method': 'Special space or separate digit7 width candidate',
                      'note': 'Space/digit7 and terminal advances were not independently identified; combined older text constraints are not separate width proof.'}
    elif observed:
        advance = observed['advanceSource']
        provenance = {'kind': 'observed-adjacent', **observed}
    else:
        advance = right + 1 if kind == 'default8' else right + 2 if code < 256 else width + 2
        provenance = {'kind': 'source-alpha-candidate',
                      'method': 'Original alpha rightExclusive+1' if kind == 'default8' else 'Original alpha rightExclusive+2' if code < 256 else 'Full source16cell +2; cell-normalized candidate, not an inferred Unicode engine rule',
                      'note': 'Unmeasured host advance; source pixels do not prove native spacing, terminals or arbitrary string layout.'}
    bounds = [min(p[0] for p in ink), min(p[1] for p in ink), max(p[0] for p in ink) + 1, max(p[1] for p in ink) + 1] if ink else None
    return {'character': character, 'codepoint': f'U+{code:04X}', 'sourceKind': kind, 'sourceEntry': name,
            'sourceCell': [x, y, width, height], 'texelUnits': unit, 'offsetUnits': [0, offset_y],
            'advanceSource': advance, 'advanceUnits': int(advance * unit), 'advanceCss20': advance * unit / 50,
            'advanceProvenance': provenance, 'inkBounds': bounds, 'inkPixels': len(ink), 'mask': mask}


def make_font(family, records):
    from fontTools.fontBuilder import FontBuilder
    from fontTools.pens.ttGlyphPen import TTGlyphPen
    from fontTools.colorLib.builder import buildCOLR, buildCPAL
    from fontTools.ttLib import TTFont
    glyphs, metrics, layers, cmap, ys = {}, {'.notdef': (500, 0)}, {}, {}, []
    glyphs['.notdef'] = TTGlyphPen(None).glyph()
    names = ['.notdef'] + [f'u{ord(record["character"]):04X}' for record in records]
    for name, record in zip(names[1:], records):
        pen, xs = TTGlyphPen(None), []
        unit, offset_y = record['texelUnits'], record['offsetUnits'][1]
        for y, line in enumerate(record['mask']):
            x = 0
            while x < len(line):
                if not line[x]:
                    x += 1
                    continue
                end = x + 1
                while end < len(line) and line[end]:
                    end += 1
                left, right = x * unit, end * unit
                top = 800 - offset_y - y * unit
                bottom = top - unit
                pen.moveTo((left, bottom)); pen.lineTo((left, top)); pen.lineTo((right, top)); pen.lineTo((right, bottom)); pen.closePath()
                xs.extend([left, right]); ys.extend([top, bottom]); x = end
        glyphs[name] = pen.glyph()
        layer = name + '.foreground'
        glyphs[layer] = deepcopy(glyphs[name])
        metrics[name] = (record['advanceUnits'], min(xs, default=0))
        metrics[layer] = metrics[name]
        layers[name] = [(layer, 0xffff)]
        cmap[ord(record['character'])] = name
    order = names + [name + '.foreground' for name in names[1:]]
    builder = FontBuilder(1000, isTTF=True)
    builder.setupGlyphOrder(order); builder.setupCharacterMap(cmap); builder.setupGlyf(glyphs)
    builder.setupHorizontalMetrics(metrics); builder.setupHorizontalHeader(ascent=900, descent=-100, lineGap=0)
    builder.setupNameTable({'familyName': family, 'styleName': 'Regular', 'uniqueFontIdentifier': family.replace(' ', '') + '-SourceCandidate1',
                            'fullName': family, 'psName': family.replace(' ', '') + '-Regular', 'version': 'Version 0.001; source-derived host profile',
                            'licenseDescription': 'Caller-owned original-derived font artwork; not covered by mcbeui source code license.'})
    builder.setupOS2(sTypoAscender=900, sTypoDescender=-100, sTypoLineGap=0, usWinAscent=max(900, max(ys, default=900)), usWinDescent=max(100, -min(ys, default=-100)))
    builder.setupPost(); builder.setupMaxp()
    font = builder.font
    font['head'].created = font['head'].modified = 2082844800
    font.recalcTimestamp = False
    font['COLR'] = buildCOLR(layers, version=0); font['CPAL'] = buildCPAL([[(1, 1, 1, 1)]])
    font.flavor = 'woff2'
    output = BytesIO(); font.save(output); raw = output.getvalue()
    actual = TTFont(BytesIO(raw))
    require(actual.getBestCmap() == cmap, f'Generated cmap differs: {family}')
    checks, nonempty = {'base': 0, 'paint': 0}, 0
    for name, record in zip(names[1:], records):
        require(actual['hmtx'].metrics[name] == metrics[name], f'Generated hmtx differs: {family}/{name}')
        paints = actual['COLR'].ColorLayers[name]
        require(len(paints) == 1 and paints[0].colorID == 0xffff, f'Generated COLR foreground differs: {family}/{name}')
        nonempty += actual['glyf'][paints[0].name].numberOfContours > 0
        for role, target in [('base', name), ('paint', paints[0].name)]:
            coordinates, ends, flags = actual['glyf'][target].getCoordinates(actual['glyf'])
            require(all(flag & 1 for flag in flags), 'Generated bitmap font has curved outlines.')
            polygons, start = [], 0
            for end in ends:
                polygons.append(list(coordinates[start:end + 1])); start = end + 1
            for y, line in enumerate(record['mask']):
                for x, source in enumerate(line):
                    px = (x + .5) * record['texelUnits']; py = 800 - record['offsetUnits'][1] - (y + .5) * record['texelUnits']
                    winding = 0
                    for polygon in polygons:
                        for (x1, y1), (x2, y2) in zip(polygon, polygon[1:] + polygon[:1]):
                            cross = (x2 - x1) * (py - y1) - (px - x1) * (y2 - y1)
                            if y1 <= py < y2 and cross > 0: winding += 1
                            elif y2 <= py < y1 and cross < 0: winding -= 1
                    require(bool(winding) == source, f'Generated {role} cell coverage differs: {family}/{name}')
                    checks[role] += 1
    require(nonempty == sum(record['inkPixels'] > 0 for record in records), f'Generated nonempty COLR layer count differs: {family}')
    return raw, {'cmapAndHmtxExact': True, 'paintEntries': len(records), 'nonemptyPaintGlyphs': nonempty,
                 'sourceCellSamplesCompared': checks, 'baseAndPaintMismatchSamples': 0, 'foregroundOnly': True}


def prepare(args):
    fonts_root, destination = output_directory()
    archive_input = source_input_path(args.archive, destination, 'Original archive')
    text_files = [source_input_path(path, destination, 'Text input') for path in args.text_file]
    # Optional development dependencies are local to the project; standard
    # Python installations with these packages work without this fallback.
    dependency_path = (PROJECT / '.cache/python').resolve()
    if dependency_path.is_relative_to(PROJECT) and dependency_path.is_dir():
        sys.path.insert(0, str(dependency_path))
    try:
        import PIL  # noqa: F401
        import fontTools  # noqa: F401
    except ImportError as error:
        raise ValueError('Install fontTools, Brotli and Pillow before preparing Classic fonts.') from error
    manifest_path, manifest_raw = read_file(MANIFEST, MAX_TEXT_BYTES)
    manifest = json.loads(manifest_raw)
    require(manifest.get('schemaVersion') == 1 and len(set(manifest['unicodeCharacters'])) == 94, 'Unsupported default Classic character manifest.')
    wanted, text_inputs = characters(manifest, args.characters, text_files, destination)
    original_fonts = old_fonts(fonts_root, destination)
    archive_path, archive_raw = read_file(archive_input, MAX_FILE_BYTES)
    require(not archive_path.is_relative_to(destination), 'Original archive must remain outside the output directory.')
    require(sha(archive_raw) == manifest['sourceArchiveSha256'], 'font.brarchive differs from the pinned source; audit a changed archive before using this profile.')
    needed = {'default8.png', 'default8.json', 'font_metadata.json'} | {f'glyph_{ord(c) >> 8:02X}.png' for c in wanted}
    entries, table = archive_entries(archive_raw, needed)
    ascii_metadata = json.loads(entries['default8.json'])
    require(ascii_metadata == {'ascii_character_height': 12, 'ascii_character_y_offset': -3, 'ascii_extended': True}, 'Unexpected original default8 metadata.')
    require(json.loads(entries['font_metadata.json']).get('version') == 1, 'Unexpected original font metadata.')
    images, page_pins = decode_pages(entries)
    ascii_records = [glyph(chr(code), 'default8', images, manifest) for code in range(32, 127)]
    unicode_records = [glyph(c, 'unicode', images, manifest) for c in wanted]
    records = {'ascii': ascii_records, 'unicode': unicode_records,
               'classic': ascii_records + [record for record in unicode_records if ord(record['character']) >= 127]}
    outputs, family_metadata = {}, {}
    for role, (family, filename) in FAMILIES.items():
        raw, verification = make_font(family, records[role])
        outputs[filename] = raw
        family_metadata[role] = {'family': family, 'file': filename, 'sha256': sha(raw), 'bytes': len(raw),
                                 'glyphCount': len(records[role]), 'validation': verification,
                                 'glyphs': {record['character']: {k: v for k, v in record.items() if k not in ('character', 'mask')} for record in records[role]}}
    font_metrics = {'schemaVersion': 1, 'status': 'Source-derived finite host font candidates; native raster/AA and arbitrary layout unproved',
                    'em': 1000, 'fontSize': 20, 'lineHeight': 20, 'baselineGame': 8, 'families': family_metadata,
                    'glyphConstructionBaselineGame': 8, 'typographicAscenderGame': 9, 'typographicDescenderGame': 1,
                    'normalLineModel': 'Uniform10game host line:8game source glyph cell with1game top/bottom room. Glyph construction remains anchored at800units; typography uses900/-100. Source normal-line height10 and paintOffset[0,1] support this host model, not a unique native engine algorithm or all-control fidelity.',
                    'observedAdvanceGroups': manifest.get('observedAdvanceGroups', {}),
                    'rolePolicy': 'Classic uses default8ASCII+Unicode nonASCII by codepoint. Unicode uses the whole original Unicode run. ASCII intentionally covers printableASCII only. Whole-run native selection is not recovered.',
                    'shadowPolicy': 'Foreground only. Supply shared hard CSS shadow roles; no fixed shadow is baked into the font.',
                    'fallbackBoundary': 'Only listed characters are covered. Caller text additions require source cells and explicit advance provenance. Browser/system fallback is not native coverage.',
                    'notCertified': ['Space/digit7 independent advances or terminal split', 'General Unicode/CJK/Latin width algorithm', 'GUI5 bilinear+BitmapSmooth nonlinear alpha/RGBA', 'Browser/DPR/IME/selection/line-box layout', 'Arbitrary text fallback or native automatic whole-run font binding']}
    outputs['font-metrics.json'] = json_bytes(font_metrics)
    provenance = {'schemaVersion': 1, 'status': 'Source-only private generated font resources; no automatic registration',
                  'distribution': 'Original-derived artwork is caller-owned; output stays ignored, outside Git/npm/public assets. Enabling a local site font may embed these private resources.',
                  'archive': {'path': str(archive_path), 'bytes': len(archive_raw), 'sha256': sha(archive_raw), 'table': table},
                  'defaultCharacterManifest': {'path': manifest_path.relative_to(PROJECT).as_posix(), 'sha256': sha(manifest_raw), 'source': manifest['characterSource']},
                  'characters': wanted, 'characterCount': len(wanted), 'additionalTextInputs': text_inputs,
                  'sourceMetadata': [{'entry': name, 'bytes': len(entries[name]), 'sha256': sha(entries[name])} for name in ['default8.json', 'font_metadata.json']],
                  'originalPages': page_pins, 'observationPins': manifest['observationPins'],
                  'determinism': 'Fixed glyph order/names, unchanged binary source pixels, EM1000, fixed1970font timestamps, no runtime paths/timestamps in WOFF2. Native operation order is not implied.',
                  'pixelValidation': 'Every requested glyph source cell must have only white visible ink and binaryalpha. Actual reopened base and COLR foreground contours are independently sampled at every original cell center.',
                  'typography': {'glyphConstructionBaselineGame': 8, 'typographicAscenderGame': 9, 'typographicDescenderGame': 1,
                                 'lineHeightGame': 10, 'fontSizeCss': 20, 'lineHeightCss': 20,
                                 'model': 'Uniform1+8+1 host normal-line model; source glyph coordinates/advances are independent of typographic ascender. Native unique line selection and every control remain unproved.'},
                  'preservedExistingFonts': {'count': len(original_fonts), 'excludedOutputDirectory': '.cache/local-fonts/classic', 'allBytesUnchanged': True, 'filesBeforeAndAfter': original_fonts},
                  'outputs': [{'file': name, 'bytes': len(raw), 'sha256': sha(raw)} for name, raw in sorted(outputs.items())]}
    outputs['provenance.json'] = json_bytes(provenance)
    require(old_fonts(fonts_root, destination) == original_fonts, 'Previous font files changed during validation; no output written.')
    require(sha(read_file(archive_path, MAX_FILE_BYTES)[1]) == manifest['sourceArchiveSha256'], 'Original archive changed during preparation; no output written.')
    targets = {name: output_path(destination, name) for name in outputs}
    if args.check_only:
        print(f'Checked Classic source/fonts in memory: {len(wanted)}characters, {len(page_pins)}original pages; no files written.')
        return
    destination.mkdir(parents=True, exist_ok=True)
    require(output_directory()[1] == destination, 'Classic output directory changed before writing.')
    for name, raw in outputs.items():
        require(output_path(destination, name) == targets[name], 'Classic output path changed before writing.')
        write_output(destination, name, raw)
    require(old_fonts(fonts_root, destination) == original_fonts, 'Previous font files changed during preparation; this script only writes its Classic directory.')
    print(f'Prepared MCBE Classic/Unicode/ASCII in {destination}; {len(wanted)}characters, {len(page_pins)}original pages. Previous{len(original_fonts)}font files unchanged.')
    print('Source-derived20px host candidates only; no native shader/AA/RGBA certification or automatic font registration.')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('archive', nargs='?', default=str(DEFAULT_ARCHIVE), help='Caller-owned original font.brarchive (read-only).')
    parser.add_argument('--characters', action='append', default=[], help='Append characters to the finite default set; repeatable, no normalization.')
    parser.add_argument('--text-file', action='append', default=[], help='Append UTF8 text-file characters; CR/LF are separators, TAB/other controls are rejected.')
    parser.add_argument('--check-only', action='store_true', help='Build and validate all font bytes in memory without writing files or changing mtimes.')
    args = parser.parse_args()
    try:
        prepare(args)
    except (ValueError, OSError, KeyError, ImportError) as error:
        parser.exit(1, f'Classic font preparation failed: {error}\n')


if __name__ == '__main__':
    main()
