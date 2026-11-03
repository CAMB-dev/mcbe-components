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
    if not isinstance(chars, list) or len(chars) != 256:
        raise ValueError('Expected 256 packed character records.')
    for index, char in enumerate(chars):
        if not isinstance(char, dict) or char.get('codepoint') != index or type(char.get('present')) is not bool:
            raise ValueError('Invalid packed character identity.')
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


def prepare(font, output, compiler, check_only=False, include_gui_font=False):
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
        files = make_files(generated.stdout, chars, include_gui_font)
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
    args = parser.parse_args()
    try:
        result = prepare(args.font, args.output, args.compiler, args.check_only, args.gui_font)
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        print(json.dumps({'status': 'FAILED', 'error': str(error)}), file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=True, indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main())
