"""Independent whole-frame scoring, including transparent color and CLI failures."""
import base64
import importlib.util
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest
import zlib

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/compare-gui-frame.py'
spec = importlib.util.spec_from_file_location('frame_comparison', SCRIPT)
comparison = importlib.util.module_from_spec(spec)
spec.loader.exec_module(comparison)
# Independently frozen PNGjs encodings of identical 4x5 RGBA using filters 0/4.
ENCODINGS = [
    'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAFCAYAAABirU3bAAAAYElEQVR4AQFVAKr/AAADBgkMDxIVGBseISQnKi0AMDM2OTw/QkVIS05RVFdaXQBgY2ZpbG9ydXh7foGEh4qNAJCTlpmcn6KlqKuusbS3ur0AwMPGyczP0tXY297h5Ofq7RR5JQkRX7bhAAAAAElFTkSuQmCC',
    'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAFCAYAAABirU3bAAAAJ0lEQVR4AU3BwQkAMAwDsUCOQsHDeP/p4qclZt9XwaGCQwWHCg6VA/P3Bfd6L//zAAAAAElFTkSuQmCC',
]


def png(width, height, rgba):
    # Independent minimal writer for explicit scoring inputs, no production decoder.
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)
    scanlines = b''.join(b'\0' + rgba[y * width * 4:(y + 1) * width * 4] for y in range(height))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(scanlines)) + chunk(b'IEND', b''))


class FrameComparisonTests(unittest.TestCase):
    def test_different_encodings_have_same_complete_rgba_identity(self):
        with tempfile.TemporaryDirectory() as directory:
            a, b = Path(directory) / 'a.png', Path(directory) / 'b.png'
            for path, encoded in zip([a, b], ENCODINGS):
                path.write_bytes(base64.b64decode(encoded))
            result = comparison.compare_frames(a, b)
            self.assertEqual(result['status'], 'EXACT_RGBA')
            self.assertEqual(result['totalPixels'], 20)
            self.assertNotEqual(result['expected']['pngSHA256'], result['actual']['pngSHA256'])
            self.assertEqual(result['expected']['rgbaSHA256'], result['actual']['rgbaSHA256'])
            self.assertIsNone(result['inclusiveBBox'])
            self.assertFalse(result['nativeProvenanceVerified'])

    def test_complete_bounds_alpha_and_transparent_rgb_are_counted(self):
        with tempfile.TemporaryDirectory() as directory:
            a, b = Path(directory) / 'a.png', Path(directory) / 'b.png'
            original = bytes([10, 20, 30, 0, 40, 50, 60, 255, 70, 80, 90, 128, 100, 110, 120, 255])
            actual = bytearray(original)
            actual[0] = 15  # Invisible RGB still participates.
            actual[15] = 253
            a.write_bytes(png(2, 2, original)); b.write_bytes(png(2, 2, actual))
            result = comparison.compare_frames(a, b)
            self.assertEqual(result['score'], {'rgbaPixels': 2, 'alphaPixels': 1, 'differentBytes': 2,
                                              'absoluteError': 7, 'maxChannelError': 5})
            self.assertEqual(result['inclusiveBBox'], [0, 0, 1, 1])
            self.assertEqual([(p['x'], p['y']) for p in result['first12']], [(0, 0), (1, 1)])

    def test_dimension_mismatch_is_not_silently_cropped_or_reshaped(self):
        with tempfile.TemporaryDirectory() as directory:
            a, b = Path(directory) / 'a.png', Path(directory) / 'b.png'
            a.write_bytes(png(2, 1, bytes(8))); b.write_bytes(png(1, 2, bytes(8)))
            with self.assertRaisesRegex(ValueError, 'dimensions differ'):
                comparison.compare_frames(a, b)

    def test_cli_exit_codes_and_existing_output_preservation(self):
        with tempfile.TemporaryDirectory() as directory:
            a, b, output = [Path(directory) / name for name in ['a.png', 'b.png', 'report.json']]
            a.write_bytes(png(1, 1, bytes([0, 0, 0, 0])))
            b.write_bytes(png(1, 1, bytes([0, 0, 0, 1])))
            def run(actual, *args):
                return subprocess.run([sys.executable, str(SCRIPT), '--expected', str(a), '--actual', str(actual), *args], capture_output=True, text=True)
            self.assertEqual(run(a).returncode, 0)
            different = run(b, '--output', str(output))
            self.assertEqual(different.returncode, 1)
            saved = output.read_bytes()
            self.assertEqual(json.loads(saved)['score']['alphaPixels'], 1)
            self.assertEqual(run(a, '--output', str(output)).returncode, 2)
            self.assertEqual(output.read_bytes(), saved)
            self.assertEqual(run(Path(directory) / 'missing.png').returncode, 2)

    def test_invalid_deflate_with_valid_chunk_crc_is_input_error_exit_two(self):
        with tempfile.TemporaryDirectory() as directory:
            good, bad = Path(directory) / 'good.png', Path(directory) / 'bad.png'
            original = png(1, 1, bytes(4))
            good.write_bytes(original)
            corrupt = bytearray(original)
            self.assertEqual(corrupt[37:41], b'IDAT')
            corrupt[41] ^= 255  # Invalid zlib header, then restore the PNG chunk CRC.
            end = 41 + struct.unpack('>I', corrupt[33:37])[0]
            corrupt[end:end + 4] = struct.pack('>I', zlib.crc32(corrupt[37:end]) & 0xffffffff)
            bad.write_bytes(corrupt)
            result = subprocess.run([sys.executable, str(SCRIPT), '--expected', str(good), '--actual', str(bad)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(json.loads(result.stderr)['status'], 'INVALID_INPUT_OR_IO')


if __name__ == '__main__':
    unittest.main()
