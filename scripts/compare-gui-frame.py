"""Compare two complete RGBA8 PNG frames without resampling or tolerance.

Exit 0: byte-exact RGBA; 1: actual pixel differences; 2: invalid input or IO.
This measures supplied images, not their native/source provenance.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import zlib

_spec = importlib.util.spec_from_file_location(
    'gui_png_audit', Path(__file__).with_name('compare-crafting-candidates.py'))
_audit = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_audit)


def compare_frames(expected, actual):
    expected, actual = Path(expected), Path(actual)
    original_hashes = {path: hashlib.sha256(path.read_bytes()).hexdigest()
                       for path in [expected, actual]}
    ew, eh, reference = _audit.rgba_png(expected)
    aw, ah, rendered = _audit.rgba_png(actual)
    if (ew, eh) != (aw, ah):
        raise ValueError(f'Frame dimensions differ: expected {ew}x{eh}, actual {aw}x{ah}')
    result = _audit.score(_audit.pixels(rendered), _audit.pixels(reference))
    first = []
    bounds = [ew, eh, -1, -1]
    for index in range(ew * eh):
        offset = index * 4
        if rendered[offset:offset + 4] == reference[offset:offset + 4]:
            continue
        x, y = index % ew, index // ew
        bounds = [min(bounds[0], x), min(bounds[1], y),
                  max(bounds[2], x), max(bounds[3], y)]
        if len(first) < 12:
            first.append({'x': x, 'y': y,
                          'actual': list(rendered[offset:offset + 4]),
                          'expected': list(reference[offset:offset + 4])})

    def identity(path, rgba):
        if hashlib.sha256(path.read_bytes()).hexdigest() != original_hashes[path]:
            raise ValueError(f'PNG input changed during comparison: {path}')
        return {'path': str(path.resolve()),
                'pngSHA256': original_hashes[path],
                'rgbaSHA256': hashlib.sha256(rgba).hexdigest()}

    return {'status': 'EXACT_RGBA' if result['rgbaPixels'] == 0 else 'DIFFERENT_RGBA',
            'width': ew, 'height': eh, 'totalPixels': ew * eh,
            'expected': identity(expected, reference),
            'actual': identity(actual, rendered), 'score': result,
            'inclusiveBBox': bounds if result['rgbaPixels'] else None,
            'first12': first, 'nativeProvenanceVerified': False,
            'scope': 'All supplied RGBA pixels, including transparent RGB. No mask, threshold, resize, color or alpha conversion.'}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--expected', required=True, type=Path)
    parser.add_argument('--actual', required=True, type=Path)
    parser.add_argument('--output', type=Path, help='Optional new JSON file; existing files are never overwritten.')
    args = parser.parse_args(argv)
    try:
        result = compare_frames(args.expected, args.actual)
        serialized = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
        if args.output:
            with args.output.open('x', encoding='utf-8') as out:
                out.write(serialized)
        print(serialized, end='')
        return 0 if result['status'] == 'EXACT_RGBA' else 1
    except (ValueError, OSError, zlib.error) as error:
        print(json.dumps({'status': 'INVALID_INPUT_OR_IO', 'error': str(error)}), file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
