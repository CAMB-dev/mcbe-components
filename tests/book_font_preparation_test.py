"""CPU regressions for the two fixed Book font preparation targets.

python -m unittest discover -s tests -p book_font_preparation_test.py
Actual original-source checks skip if the caller-owned archive is unavailable.
No browser, GPU, output font mutation or native/captured atlas input is used.
"""
from argparse import Namespace
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
specification = importlib.util.spec_from_file_location('book_font_preparation', ROOT / 'scripts/prepare-book-label-font.py')
preparation = importlib.util.module_from_spec(specification)
specification.loader.exec_module(preparation)


class BookFontPreparationTest(unittest.TestCase):
    def temporary_project(self):
        cache = ROOT / '.cache/book-body-font-preparer-01/test-fixtures'
        cache.mkdir(parents=True, exist_ok=True)
        temporary = tempfile.TemporaryDirectory(dir=cache)
        self.addCleanup(temporary.cleanup)
        return Path(temporary.name)

    def test_default_and_body_character_sets(self):
        for target, total, extra in [('labels', 100, '第页共签名'), ('body', 101, '像素字体测试')]:
            values, inputs = preparation.characters([], [], preparation.output_directory(target), preparation.TARGETS[target][1])
            self.assertEqual(len(values), total)
            self.assertEqual(set(values), set(chr(c) for c in range(32, 127)) | set(extra))
            self.assertEqual(inputs, [])
        self.assertEqual(preparation.output_directory(), preparation.output_directory('labels'))

    def test_fixed_output_roots_and_unknown_target(self):
        project = self.temporary_project()
        for target, leaf in [('labels', 'book-labels'), ('body', 'book-body')]:
            destination = preparation._fixed_output_directory(project, target)
            self.assertEqual(destination, project / '.cache/local-fonts' / leaf)
            self.assertFalse(destination.exists())
        for bad in ['', '../other', '/tmp', 'book-body', 'BODY']:
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                preparation._fixed_output_directory(project, bad)
        with self.assertRaises(ValueError):
            preparation.output_path(project / '.cache/local-fonts/book-body', 'font.json')
        for target in ['labels', 'body']:
            with self.assertRaises(ValueError):
                preparation.output_path(preparation.output_directory(target), '../outside.json')

    def test_controls_and_input_budgets_apply_to_both_targets(self):
        invalid = ['\t', '\0', '\x7f', '\ud800', '😀']
        for target in ['labels', 'body']:
            destination, defaults = preparation.output_directory(target), preparation.TARGETS[target][1]
            for text in invalid:
                with self.subTest(target=target, text=repr(text)), self.assertRaises((ValueError, UnicodeError)):
                    preparation.characters([text], [], destination, defaults)
            for additions in [['A' * (preparation.MAX_TEXT_BYTES + 1)], ['A' * preparation.MAX_TEXT_BYTES] * 5,
                              ['A'] * 33, [''.join(chr(c) for c in range(0x100, 0x1200))]]:
                with self.subTest(target=target, budget=True), self.assertRaises(ValueError):
                    preparation.characters(additions, [], destination, defaults)

    def test_utf8_literal_files_and_crlf_are_not_normalized_glyphs(self):
        project = self.temporary_project()
        text = project / 'body.txt'
        text.write_bytes('像素\r\n字体\n测试\r'.encode('utf-8'))
        values, inputs = preparation.characters(['AB\r\n'], [text], preparation.output_directory('body'), preparation.BODY_CHARACTERS)
        self.assertNotIn('\r', values)
        self.assertNotIn('\n', values)
        self.assertEqual(set(values), set(preparation.BODY_CHARACTERS))
        self.assertEqual(inputs[0]['sha256'], hashlib.sha256(text.read_bytes()).hexdigest())
        text.write_bytes(b'\xff\xfe')
        with self.assertRaises(UnicodeError):
            preparation.characters([], [text], preparation.output_directory('body'), preparation.BODY_CHARACTERS)

    def test_output_junction_or_symlink_is_rejected_for_both_targets(self):
        project = self.temporary_project()
        (project / '.cache/local-fonts').mkdir(parents=True)
        outside = project / 'sentinel'
        outside.mkdir()
        sentinel = outside / 'not-touched.txt'
        sentinel.write_bytes(b'original')
        for target, leaf in [('labels', 'book-labels'), ('body', 'book-body')]:
            redirect = project / '.cache/local-fonts' / leaf
            if os.name == 'nt':
                import _winapi
                _winapi.CreateJunction(str(outside), str(redirect))
            else:
                redirect.symlink_to(outside, target_is_directory=True)
            try:
                with self.subTest(target=target), self.assertRaises(ValueError):
                    preparation._fixed_output_directory(project, target)
                self.assertEqual(sentinel.read_bytes(), b'original')
            finally:
                if redirect.is_symlink():
                    redirect.unlink()
                else:
                    os.rmdir(redirect)

    @unittest.skipUnless(preparation.DEFAULT_ARCHIVE.is_file(), 'Caller-owned original font.brarchive is unavailable')
    def test_original_source_targets_and_legacy_namespace_are_deterministic(self):
        common = {'archive': str(preparation.DEFAULT_ARCHIVE), 'characters': [], 'text_file': [], 'check_only': True}
        old_destination, old_outputs, old_count, old_pages = preparation.build(Namespace(**common))
        label_destination, label_outputs, label_count, label_pages = preparation.build(Namespace(**common, target='labels'))
        self.assertEqual((old_destination, old_outputs, old_count, old_pages),
                         (label_destination, label_outputs, label_count, label_pages))
        self.assertEqual(hashlib.sha256(label_outputs['font.json']).hexdigest(),
                         '56d972f29a192b8116fcbeac1eb8a1ac3c943376b0da27610d9243b8098dc2ed')
        self.assertEqual((label_count, label_pages), (100, 5))
        # If labels already exist, preparing either target in memory must leave
        # their complete original output byte contract untouched.
        for name, raw in label_outputs.items():
            existing = label_destination / name
            if existing.exists():
                self.assertEqual(existing.read_bytes(), raw)
        body_destination, body_outputs, body_count, body_pages = preparation.build(Namespace(**common, target='body'))
        self.assertEqual(body_destination, preparation.output_directory('body'))
        self.assertEqual((body_count, body_pages), (101, 7))
        self.assertEqual(hashlib.sha256(body_outputs['font.json']).hexdigest(),
                         '99dc5371edc9a420e883cfa44fc5d0a9658a08b20fbee98d034dda6c72159b42')
        body = json.loads(body_outputs['font.json'])
        self.assertEqual(body['pageSizes'], [256] * 7)
        self.assertEqual((body['cellHeight'], body['lineHeight']), (16, 20))
        self.assertEqual(set(body['glyphs']), set(preparation.BODY_CHARACTERS))
        self.assertEqual((body['glyphs'][' ']['width'], body['glyphs'][' ']['height']), (0, 0))
        provenance = json.loads(body_outputs['provenance.json'])
        for page in provenance['originalPages']:
            self.assertEqual(hashlib.sha256(body_outputs[page['entry']]).hexdigest(), page['fileSha256'])
        for character, record in provenance['glyphProvenance'].items():
            glyph = body['glyphs'][character]
            self.assertEqual(glyph['advance'], record['advanceSource'])
            self.assertEqual([glyph['offsetX'], glyph['offsetY']],
                             [value / record['texelUnits'] for value in record['offsetUnits']])


if __name__ == '__main__':
    unittest.main()
