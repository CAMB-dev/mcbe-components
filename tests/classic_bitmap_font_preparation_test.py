"""CPU-only synthetic regressions for the opt-in private paged BitmapFont.

python -m unittest discover -s tests -p classic_bitmap_font_preparation_test.py
Fixtures are project-authored indexed PNGs/archives, not original game art.
"""
from argparse import Namespace
from io import BytesIO
import importlib.util
import json
import os
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch


sys.dont_write_bytecode = True
PROJECT = Path(__file__).resolve().parent.parent
if (PROJECT / '.cache/python').is_dir():
    sys.path.insert(0, str(PROJECT / '.cache/python'))
from PIL import Image

specification = importlib.util.spec_from_file_location('classic_bitmap_preparation', PROJECT / 'scripts/prepare-classic-bitmap-font.py')
preparation = importlib.util.module_from_spec(specification)
specification.loader.exec_module(preparation)


def synthetic_sources():
    pages = [Image.new('P', (128, 128), 0) for _ in range(3)]
    for page in pages:
        page.putpalette([0, 0, 0, 255, 255, 255] + [0] * (768 - 6))
    # Hand-authored coordinates include the two sides of the160-cell boundary
    # and CP437255. Expected cells below are literal, independent of route().
    for byte in range(33, 256):
        p, slot = divmod(byte, 160)
        pages[p].putpixel(((slot % 16) * 8 + 4, (slot // 16) * 12 + 6), 1)
    for byte, p, x, y, points in (
        (159, 0, 120, 108, [(2, 3), (7, 11)]),
        (160, 1, 0, 0, [(1, 0), (6, 11)]),
        (255, 1, 120, 60, [(3, 5)]),
    ):
        for yy in range(12):
            for xx in range(8):
                pages[p].putpixel((x + xx, y + yy), 0)
        for xx, yy in points:
            pages[p].putpixel((x + xx, y + yy), 1)
    entries = {}
    for name, page in zip(preparation.PAGE_NAMES, pages):
        output = BytesIO()
        page.save(output, format='PNG', bits=8, transparency=0)
        entries[name] = output.getvalue()
    entries['default8.json'] = b'{"ascii_character_height":12,"ascii_character_y_offset":-3,"ascii_extended":true}'
    entries['font_metadata.json'] = b'{"version":1}'
    payload, records = bytearray(), bytearray()
    for name, value in entries.items():
        record = bytearray(256)
        record[0] = len(name)
        record[1:1 + len(name)] = name.encode()
        struct.pack_into('<II', record, 248, len(payload), len(value))
        records.extend(record)
        payload.extend(value)
    archive = bytes.fromhex('7d2725b1a0527026') + struct.pack('<II', len(entries), 1) + records + payload
    return bytes(archive), entries


class ClassicBitmapFontPreparationTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.patch_project = patch.object(preparation, 'PROJECT', self.root)
        self.patch_project.start()
        self.addCleanup(self.patch_project.stop)
        self.raw, self.entries = synthetic_sources()
        self.archive = self.root / 'caller-font.brarchive'
        self.archive.write_bytes(self.raw)
        self.source_pins = {name: preparation.sha(value) for name, value in self.entries.items()}
        self.patch_archive = patch.object(preparation, 'ARCHIVE_SHA', preparation.sha(self.raw))
        self.patch_members = patch.object(preparation, 'MEMBER_SHA', self.source_pins)
        self.patch_archive.start()
        self.patch_members.start()
        self.addCleanup(self.patch_archive.stop)
        self.addCleanup(self.patch_members.stop)

    def args(self, **changes):
        values = dict(archive=str(self.archive), profile='cp437-paged-candidate', characters=[], text_file=[], check_only=False)
        values.update(changes)
        return Namespace(**values)

    def test_boundary159_160_255_asymmetric_cells_metrics_and_full_rects(self):
        _, alphas, _, _ = preparation.validate_sources(self.raw)
        characters = [bytes([index]).decode('cp437') for index in (159, 160, 255)]
        font, names, records = preparation.bitmap_font(characters, alphas)
        self.assertEqual(names, ['default8.png', 'default8_1.png'])
        self.assertEqual(font['pageSizes'], [128, 128])
        self.assertEqual(font['lineHeight'], 12)
        for character, expected in zip(characters, [(0, 120, 108, 9), (1, 0, 0, 8), (1, 120, 60, 5)]):
            g = font['glyphs'][character]
            self.assertEqual((g['page'], g['x'], g['y'], g['advance']), expected)
            self.assertEqual((g['width'], g['height'], g['offsetX'], g['offsetY']), (8, 12, 0, -3))
        self.assertEqual([r['inkBBox'] for r in records], [[2, 3, 8, 12], [1, 0, 7, 12], [3, 5, 4, 6]])
        self.assertEqual([r['inkPixels'] for r in records], [2, 2, 1])

    def test_empty_nonspace_rejected_but_space_retains_whole_cell(self):
        alphas = {name: bytes(128 * 128) for name in preparation.PAGE_NAMES}
        font, _, _ = preparation.bitmap_font([' '], alphas)
        self.assertEqual(font['glyphs'][' '], {'page': 0, 'x': 0, 'y': 24, 'width': 8, 'height': 12,
                                              'advance': 4, 'offsetX': 0, 'offsetY': -3})
        with self.assertRaisesRegex(ValueError, r'Empty nonspace.*U\+00A0.*default8_1.png.*120,60,8,12'):
            preparation.bitmap_font(['\u00a0'], alphas)

    def test_literal_requests_reject_controls_nonbmp_and_unsupported(self):
        _, destination = preparation.output_layout()
        for text in ('\n', '\r', '\t', '\x00', '\x7f', '\x85', '\U0001f642', '中', '\ufeff', '\ud800'):
            with self.subTest(text=repr(text)), self.assertRaises((ValueError, UnicodeError)):
                preparation.requested_characters([text], [], destination)
        chars, _ = preparation.requested_characters(['åöóå'], [], destination)
        self.assertEqual(len(chars), 98)
        self.assertTrue(set('åöó').issubset(chars))
        with patch.object(preparation, 'MAX_TEXT_BYTES', 3), self.assertRaisesRegex(ValueError, 'limit'):
            preparation.requested_characters(['abcd'], [], destination)

    def test_text_file_is_literal_no_line_or_bom_silently_dropped(self):
        _, destination = preparation.output_layout()
        text = self.root / 'text.txt'
        for value in (b'A\n', b'A\r\n', b'\xef\xbb\xbfA', b'\xff'):
            text.write_bytes(value)
            with self.subTest(value=value), self.assertRaises((ValueError, UnicodeError)):
                preparation.requested_characters([], [text], destination)
        text.write_bytes('åó'.encode())
        chars, inputs = preparation.requested_characters([], [text], destination)
        self.assertEqual(len(chars), 97)
        self.assertEqual(inputs[0]['sha256'], preparation.sha(text.read_bytes()))

    def test_check_only_creates_no_output_tree_or_file(self):
        before = {p.relative_to(self.root).as_posix(): p.read_bytes() for p in self.root.rglob('*') if p.is_file()}
        result = preparation.prepare(self.args(check_only=True, characters=['á']))
        self.assertTrue(result['checkOnly'])
        self.assertEqual(result['glyphCount'], 96)
        self.assertEqual(result['sourcePagesChecked'], 3)
        self.assertFalse((self.root / '.cache').exists())
        self.assertEqual({p.relative_to(self.root).as_posix(): p.read_bytes() for p in self.root.rglob('*') if p.is_file()}, before)

    def test_prepare_copies_exact_whole_pages_metadata_and_preserves_old_fonts(self):
        old = self.root / '.cache/local-fonts/classic/old.woff2'
        old.parent.mkdir(parents=True)
        old.write_bytes(b'old synthetic font')
        result = preparation.prepare(self.args(characters=['á']))
        destination = preparation.output_layout()[1]
        self.assertEqual(result['wholePagesReferenced'], 2)
        self.assertEqual(result['existingFontFilesUnchanged'], 1)
        self.assertEqual(old.read_bytes(), b'old synthetic font')
        self.assertEqual(self.archive.read_bytes(), self.raw)
        for name in ('default8.png', 'default8_1.png'):
            self.assertEqual((destination / 'originalpages' / name).read_bytes(), self.entries[name])
        self.assertFalse((destination / 'originalpages/default8_2.png').exists())
        for name in ('default8.json', 'font_metadata.json'):
            self.assertEqual((destination / name).read_bytes(), self.entries[name])
        font = json.loads((destination / 'font.json').read_text(encoding='utf8'))
        self.assertEqual(font['glyphs']['á'], {'page': 1, 'x': 0, 'y': 0, 'width': 8, 'height': 12,
                                               'advance': 8, 'offsetX': 0, 'offsetY': -3})
        provenance = json.loads((destination / 'provenance.json').read_text(encoding='utf8'))
        self.assertFalse(provenance['pagination']['nativePageBindingRecovered'])
        self.assertEqual(len(provenance['sourcePagesChecked']), 3)
        for output in provenance['outputs']:
            self.assertEqual(preparation.sha((destination / output['file']).read_bytes()), output['sha256'])

    def test_source_archive_and_member_pins_are_both_required(self):
        with self.assertRaisesRegex(ValueError, 'archive differs'):
            preparation.validate_sources(self.raw + b'x')
        with patch.object(preparation, 'MEMBER_SHA', {**self.source_pins, 'default8_1.png': '0' * 64}), self.assertRaisesRegex(ValueError, 'member differs.*default8_1'):
            preparation.validate_sources(self.raw)

    def test_owned_inputs_rejected_before_any_write(self):
        destination = preparation.output_layout()[1]
        for changes in ({'archive': str(destination / 'font.json')}, {'text_file': [destination / 'nested.txt']}):
            with self.subTest(changes=changes), self.assertRaisesRegex(ValueError, 'outside the owned bitmap'):
                preparation.prepare(self.args(check_only=True, **changes))
        self.assertFalse((self.root / '.cache').exists())

    def test_output_directory_and_leaf_aliases_rejected(self):
        outside = self.root / 'outside'
        outside.mkdir()
        fonts = self.root / '.cache/local-fonts'
        fonts.mkdir(parents=True)
        destination = fonts / 'classic-bitmap'
        try:
            destination.symlink_to(outside, target_is_directory=True)
        except OSError as error:
            self.skipTest(f'OS does not permit symlinks: {error}')
        with self.assertRaisesRegex(ValueError, 'redirected'):
            preparation.output_layout()
        destination.unlink()
        destination.mkdir()
        (destination / 'originalpages').mkdir()
        target = outside / 'external.txt'
        target.write_bytes(b'untouched')
        (destination / 'font.json').symlink_to(target)
        with self.assertRaisesRegex(ValueError, 'redirected'):
            preparation.prepare(self.args(check_only=True))
        self.assertEqual(target.read_bytes(), b'untouched')

    def test_atomic_output_breaks_hardlinks_without_mutating_external_input(self):
        destination = preparation.output_layout()[1]
        destination.mkdir(parents=True)
        external = self.root / 'external.txt'
        external.write_bytes(b'caller source')
        target = destination / 'font.json'
        os.link(external, target)
        self.assertTrue(target.samefile(external))
        preparation.write_output(destination, 'font.json', b'new output')
        self.assertEqual(external.read_bytes(), b'caller source')
        self.assertEqual(target.read_bytes(), b'new output')
        self.assertFalse(target.samefile(external))

    def test_failed_atomic_replace_retains_previous_file_and_cleans_temporary(self):
        destination = preparation.output_layout()[1]
        destination.mkdir(parents=True)
        target = destination / 'font.json'
        target.write_bytes(b'previous')
        with patch.object(preparation.os, 'replace', side_effect=OSError('synthetic replace failure')), self.assertRaisesRegex(OSError, 'replace failure'):
            preparation.write_output(destination, 'font.json', b'new')
        self.assertEqual(target.read_bytes(), b'previous')
        self.assertEqual([p.name for p in destination.iterdir()], ['font.json'])

    def test_cli_requires_explicit_archive_profile_and_has_no_output_override(self):
        script = PROJECT / 'scripts/prepare-classic-bitmap-font.py'
        for args in ([], ['missing.brarchive'], ['--profile', 'cp437-paged-candidate'],
                     ['missing.brarchive', '--profile', 'cp437-paged-candidate', '--output', str(self.root)]):
            with self.subTest(args=args):
                result = subprocess.run([sys.executable, str(script), *args], capture_output=True, cwd=PROJECT)
                self.assertEqual(result.returncode, 2)
                self.assertIn(b'error:', result.stderr)


if __name__ == '__main__':
    unittest.main()
