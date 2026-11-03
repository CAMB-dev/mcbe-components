"""Reproduce the named Classic Ten 64px/2x2 cache from a caller-owned original.

Requires Python 3.10+ and a C99 compiler with GCC/Clang/TinyCC command syntax.
No compiler, original font or capture is downloaded. Existing output is never
overwritten. --check-only regenerates in a temporary build directory and checks
all output bytes without changing the prepared output.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math
import shutil
import struct
import subprocess
import sys
import tempfile
import zlib

ROOT = Path(__file__).resolve().parents[1]
FONT_SHA = 'fc34c190dbfae5fe2f27adb45a93425f502388191854a6a0c2ac2f7c594a688f'
HEADER_SHA = 'ecd30b05e0dd4fea3a13c26810dd9e1992dc379049482c393d5a19e6b5090aab'
ALPHA_SHA = '77bb13ce5a27ed58642ad731c2551bbd15cc446a3460200d13d40d45b0ba8b82'
STB_COMMIT = 'd14d46f6b44456eb88beac58cba833a4135d4c89'
PARAMETERS = {'width': 1024, 'height': 1024, 'padding': 1, 'pixelHeight': 64,
              'oversample': [2, 2], 'codepointRange': [0, 255],
              'packing': 'stb-built-in-row', 'missing': 'stb-default-shared-notdef'}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def validate_source(data):
    # stb accepts unchecked offsets. Only this verified original reaches C.
    if len(data) != 127504 or digest(data) != FONT_SHA:
        raise ValueError('Unsupported original font. This profile requires Classic Minecraft Ten 2.001, SHA256 ' + FONT_SHA)


def validate_result(alpha, chars):
    if len(alpha) != 1024 * 1024 or digest(alpha) != ALPHA_SHA:
        raise ValueError('Generated alpha differs from the verified source-derived cache; retain the compiler failure and do not publish it.')
    validate_records(chars, list(range(256)))


def validate_records(chars, codepoints, require_present=False):
    if not isinstance(chars, list) or len(chars) != len(codepoints):
        raise ValueError('Unexpected packed character record count.')
    for expected, char in zip(codepoints, chars):
        if not isinstance(char, dict) or char.get('codepoint') != expected or type(char.get('present')) is not bool:
            raise ValueError('Invalid packed character identity.')
        if require_present and not char['present']:
            raise ValueError('Requested source glyph is missing: U+%04X' % expected)
        rect = char.get('rect')
        if not isinstance(rect, list) or len(rect) != 4 or any(type(v) is not int or not 0 <= v <= 1024 for v in rect) or rect[0] > rect[2] or rect[1] > rect[3]:
            raise ValueError('Invalid packed character rectangle.')
        for key in ['offset', 'offset2']:
            pair = char.get(key)
            if not isinstance(pair, list) or len(pair) != 2 or any(type(v) not in [int, float] or not math.isfinite(v) for v in pair):
                raise ValueError('Invalid packed character offset.')
        if type(char.get('advance')) not in [int, float] or not math.isfinite(char['advance']) or char['advance'] < 0:
            raise ValueError('Invalid packed character advance.')


def rgba_png(alpha):
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)
    rows = bytearray()
    for y in range(1024):
        rows.append(0)
        for a in alpha[y * 1024:(y + 1) * 1024]:
            rows.extend([a, a, a, a])
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 1024, 1024, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(rows, 9)) + chunk(b'IEND', b'')


def gui_font(chars):
    # Named 64px cache profile: source metric units / 8, ascent baseline 6.5.
    # Eight is the nominal authored line height, not recovered native leading.
    return {'pages': ['atlas.png'], 'pageSizes': [1024], 'lineHeight': 8,
            'glyphs': {chr(row['codepoint']): {
                'page': 0,
                'atlasRect': [row['rect'][0], row['rect'][1],
                              row['rect'][2] - row['rect'][0], row['rect'][3] - row['rect'][1]],
                'offset': [row['offset'][0] / 8, 6.5 + row['offset'][1] / 8],
                'size': [(row['offset2'][0] - row['offset'][0]) / 8,
                         (row['offset2'][1] - row['offset'][1]) / 8],
                'advance': row['advance'] / 8} for row in chars}}


def make_files(alpha, chars, include_gui_font=False):
    validate_result(alpha, chars)
    atlas = rgba_png(alpha)
    packed = (json.dumps(chars, ensure_ascii=False, indent=2, allow_nan=False) + '\n').encode()
    descriptor = {'format': 'mcbeui-classic-ten-stb-cache-v1',
                  'scope': 'Source font cache, not GuiTextFont or recovered native text layout.',
                  'originalFontSHA256': FONT_SHA, 'stbCommit': STB_COMMIT,
                  'stbHeaderSHA256': HEADER_SHA, 'parameters': PARAMETERS,
                  'atlas': {'url': 'atlas.png', 'width': 1024, 'height': 1024,
                            'channels': 'coverage replicated into RGBA',
                            'alphaSHA256': ALPHA_SHA, 'pngSHA256': digest(atlas)},
                  'packedCharacters': {'url': 'packed-chars.json', 'sha256': digest(packed), 'count': 256},
                  'metrics': 'Unmodified stbtt_packedchar pixel units, offsets and advance; missing entries reuse .notdef.'}
    files = {'atlas.png': atlas, 'packed-chars.json': packed,
             'font-cache.json': (json.dumps(descriptor, ensure_ascii=False, indent=2) + '\n').encode()}
    if include_gui_font:
        files['gui-font.json'] = (json.dumps(gui_font(chars), ensure_ascii=True, indent=2, allow_nan=False) + '\n').encode()
    return files


def requested_codepoints(texts):
    """Newline is layout, not a glyph; no normalization or fallback is invented."""
    result = set()
    total = 0
    for text in texts:
        if not isinstance(text, str):
            raise ValueError('Character inputs must be text.')
        total += len(text)
        if total > 1048576:
            raise ValueError('Character input exceeds 1,048,576 codepoints.')
        for char in text:
            cp = ord(char)
            if char in '\r\n':
                continue
            if cp < 32 or 0x7f <= cp < 0xa0 or 0xd800 <= cp <= 0xdfff:
                raise ValueError('Unsupported control/surrogate U+%04X' % cp)
            result.add(cp)
            if len(result) > 4096:
                raise ValueError('Character input exceeds 4096 unique glyphs.')
    return sorted(result)


def extend_files(files, base_chars, pages, available_count):
    """Keep the native-qualified base three files intact; add explicit host pages."""
    font = gui_font(base_chars)
    # Opt-in extension descriptors promise actual mapped glyphs, not .notdef.
    # The three original base-cache files keep all256 historical records.
    font['glyphs'] = {chr(row['codepoint']): font['glyphs'][chr(row['codepoint'])]
                      for row in base_chars if row['present']}
    records = []
    descriptors = []
    for page, (alpha, chars, codepoints) in enumerate(pages, 1):
        if (not 1 <= len(codepoints) <= 64 or codepoints != sorted(set(codepoints))
                or any(type(cp) is not int or not 255 < cp <= 0x10ffff or 0xd800 <= cp <= 0xdfff for cp in codepoints)):
            raise ValueError('Extended pages require1..64 ordered unique Unicode glyphs outside the base cache.')
        if len(alpha) != 1024 * 1024:
            raise ValueError('Extended alpha page must be complete1024x1024.')
        validate_records(chars, codepoints, True)
        name = 'atlas-unicode-%04d.png' % page
        png = rgba_png(alpha)
        files[name] = png
        font['pages'].append(name)
        font['pageSizes'].append(1024)
        for char, glyph in gui_font(chars)['glyphs'].items():
            if char in font['glyphs']:
                raise ValueError('Extended glyph replaces an existing source codepoint.')
            font['glyphs'][char] = {**glyph, 'page': page}
        records.extend({**row, 'page': page} for row in chars)
        descriptors.append({'url': name, 'page': page, 'width': 1024, 'height': 1024,
                            'alphaSHA256': digest(alpha), 'pngSHA256': digest(png),
                            'codepoints': codepoints})
    packed = (json.dumps(records, ensure_ascii=True, indent=2, allow_nan=False) + '\n').encode()
    gui = (json.dumps(font, ensure_ascii=True, indent=2, allow_nan=False) + '\n').encode()
    metadata = {'format': 'mcbeui-classic-ten-unicode-cache-v1',
                'scope': 'Source-generated glyphs; sorted64-glyph host pages, not recovered native Unicode cache/layout/fallback.',
                'originalFontSHA256': FONT_SHA, 'stbHeaderSHA256': HEADER_SHA,
                'baseAtlasSHA256': digest(files['atlas.png']),
                'supportedCodepointCount': available_count, 'additionalGlyphCount': len(records),
                'missingGlyphPolicy': 'omit-notdef-from-extended-gui-descriptor',
                'pageCapacity': 64, 'pixelHeight': 64, 'oversample': [2, 2], 'padding': 1,
                'pages': descriptors,
                'packedCharacters': {'url': 'packed-unicode.json', 'sha256': digest(packed)},
                'guiFont': {'url': 'gui-font.json', 'sha256': digest(gui)},
                'nativeExtensionCertified': False}
    files.update({'gui-font.json': gui, 'packed-unicode.json': packed,
                  'unicode-cache.json': (json.dumps(metadata, indent=2, allow_nan=False) + '\n').encode()})
    return files


def prepare(font, output, compiler, check_only=False, include_gui_font=False, characters=None, all_supported=False):
    requested = requested_codepoints(characters or [])
    extended = characters is not None or all_supported
    original = font.read_bytes()
    validate_source(original)
    if digest((ROOT / 'scripts/vendor/stb/stb_truetype.h').read_bytes()) != HEADER_SHA:
        raise ValueError('Vendored stb header identity changed.')
    if check_only:
        if not output.is_dir():
            raise ValueError('Prepared output directory is missing.')
    elif output.exists():
        raise ValueError('Output already exists; use --check-only or choose a new output directory.')
    resolved = shutil.which(compiler)
    if resolved is None:
        raise ValueError('C99 compiler not found; pass --compiler with a GCC, Clang or TinyCC executable.')
    build_root = (ROOT / '.cache/classic-truetype-build').resolve()
    if not build_root.is_relative_to(ROOT.resolve()):
        raise ValueError('Temporary build directory must stay inside the workspace.')
    build_root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='build-', dir=build_root) as temporary:
        build = Path(temporary).resolve()
        assert build.is_relative_to(build_root)  # Verify before automatic recursive cleanup.
        trusted = build / 'verified.ttf'
        trusted.write_bytes(original)  # Compile only the exact bytes verified above, avoiding source TOCTOU.
        exe = build / ('prepare.exe' if sys.platform == 'win32' else 'prepare')
        command = [resolved, '-o', str(exe), str(ROOT / 'scripts/prepare-classic-truetype.c')]
        if sys.platform != 'win32':
            command.append('-lm')
        compiled = subprocess.run(command, capture_output=True, timeout=60)
        if compiled.returncode:
            raise ValueError('Compiler failed: ' + compiled.stderr.decode(errors='replace')[:4000])
        generated = subprocess.run([str(exe), str(trusted)], capture_output=True, timeout=30)
        if generated.returncode:
            raise ValueError('Font generator failed with exit ' + str(generated.returncode))
        try:
            chars = json.loads(generated.stderr)
        except (ValueError, UnicodeError) as error:
            raise ValueError('Invalid generated character records.') from error
        files = make_files(generated.stdout, chars, include_gui_font or extended)
        if extended:
            listed = subprocess.run([str(exe), str(trusted), '--list'], capture_output=True, timeout=30)
            if listed.returncode:
                raise ValueError('Source glyph enumeration failed.')
            try:
                available = json.loads(listed.stdout)
            except (ValueError, UnicodeError) as error:
                raise ValueError('Invalid supported-glyph list.') from error
            if (not isinstance(available, list) or len(available) > 4096
                    or any(type(cp) is not int or not 0 <= cp <= 0x10ffff or 0xd800 <= cp <= 0xdfff for cp in available)
                    or available != sorted(set(available))):
                raise ValueError('Supported-glyph list is not bounded, dense and ordered.')
            missing = sorted(set(requested) - set(available))
            if missing:
                raise ValueError('Original font lacks requested glyphs: ' + ', '.join('U+%04X' % cp for cp in missing[:20]))
            extras = [cp for cp in (available if all_supported else requested) if cp > 255]
            pages = []
            for start in range(0, len(extras), 64):
                codepoints = extras[start:start + 64]
                request = build / 'codepoints.txt'
                request.write_text(str(len(codepoints)) + '\n' + '\n'.join(map(str, codepoints)) + '\n', encoding='ascii')
                packed = subprocess.run([str(exe), str(trusted), str(request)], capture_output=True, timeout=30)
                if packed.returncode:
                    raise ValueError('Extended glyph packing failed: ' + packed.stderr.decode(errors='replace')[:4000])
                try:
                    rows = json.loads(packed.stderr)
                except (ValueError, UnicodeError) as error:
                    raise ValueError('Invalid extended glyph records.') from error
                pages.append((packed.stdout, rows, codepoints))
            files = extend_files(files, chars, pages, len(available))
    if check_only:
        for name, data in files.items():
            if not (output / name).is_file() or (output / name).read_bytes() != data:
                raise ValueError('Prepared bytes differ: ' + name)
    else:
        output.mkdir(parents=True, exist_ok=False)
        for name, data in files.items():
            with (output / name).open('xb') as file:
                file.write(data)
    return {'status': 'CHECK_EXACT' if check_only else 'PREPARED', 'output': str(output.resolve()),
            'files': [{'name': name, 'bytes': len(data), 'sha256': digest(data)} for name, data in files.items()],
            'originalFontDistributed': False, 'nativeCaptureUsedAsGeneratorInput': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('font', type=Path)
    parser.add_argument('--compiler', default='cc')
    parser.add_argument('--output', type=Path, default=ROOT / '.cache/local-fonts/classic-ten-cache64')
    parser.add_argument('--check-only', action='store_true')
    parser.add_argument('--gui-font', action='store_true', help='Also emit gui-font.json for GuiLayer kind=truetype. Select a new output directory.')
    parser.add_argument('--characters', action='append', help='Add literal source-supported glyphs; repeatable. Also emits gui-font.json.')
    parser.add_argument('--text-file', action='append', type=Path, help='Add glyphs from bounded UTF-8 text. CR/LF are separators.')
    parser.add_argument('--all-supported', action='store_true', help='Include every glyph mapped by the verified original font; no fallback substitution.')
    args = parser.parse_args()
    try:
        texts = args.characters
        if args.text_file:
            texts = list(texts or [])
            text_count = sum(map(len, texts))
            for path in args.text_file:
                if path.stat().st_size > 1048576:
                    raise ValueError('Text file exceeds1MiB.')
                value = path.read_text(encoding='utf-8')
                text_count += len(value)
                if text_count > 1048576:
                    raise ValueError('Character input exceeds 1,048,576 codepoints.')
                texts.append(value)
        result = prepare(args.font, args.output, args.compiler, args.check_only, args.gui_font, texts, args.all_supported)
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        print(json.dumps({'status': 'FAILED', 'error': str(error)}), file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=True, indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main())
