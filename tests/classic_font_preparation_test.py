"""Synthetic-only regression for the original empty COLR paint-layer bug.

Run: python -m unittest discover -s tests -p classic_font_preparation_test.py
Requires fontTools and Brotli; no Minecraft archive, fonts, PNGs or browser.
"""
from copy import deepcopy
from io import BytesIO
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


PROJECT = Path(__file__).resolve().parent.parent
LOCAL_PYTHON = PROJECT / '.cache/python'
if LOCAL_PYTHON.is_dir():
    sys.path.insert(0, str(LOCAL_PYTHON))

from fontTools.pens.pointInsidePen import PointInsidePen
from fontTools.ttLib import TTFont


specification = importlib.util.spec_from_file_location(
    'classic_font_preparation_regression', PROJECT / 'scripts/prepare-classic-fonts.py')
preparation = importlib.util.module_from_spec(specification)
specification.loader.exec_module(preparation)


class ClassicFontPreparationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # These tiny masks and metrics are project-owned test data. None of the
        # assertions depend on the generator's returned verification summary.
        cls.records = [
            {'character': 'A', 'texelUnits': 100, 'offsetUnits': [0, 0],
             'advanceUnits': 400, 'inkPixels': 6,
             'mask': [[False, True, False], [True, True, True], [True, False, True]]},
            {'character': 'I', 'texelUnits': 50, 'offsetUnits': [0, -100],
             'advanceUnits': 200, 'inkPixels': 3,
             'mask': [[False, True, False], [False, True, False], [False, True, False]]},
            {'character': ' ', 'texelUnits': 100, 'offsetUnits': [0, 0],
             'advanceUnits': 250, 'inkPixels': 0,
             'mask': [[False, False], [False, False]]},
        ]
        cls.family = 'Synthetic Classic Regression'
        cls.raw, _ = preparation.make_font(cls.family, cls.records)

    def open_font(self):
        font = TTFont(BytesIO(self.raw))
        self.addCleanup(font.close)
        return font

    def test_actual_colr_layers_retain_nonempty_base_contours(self):
        font = self.open_font()
        self.assertEqual(font['head'].unitsPerEm, 1000)
        self.assertEqual(font['name'].getDebugName(1), self.family)
        self.assertEqual(font.getBestCmap(), {32: 'u0020', 65: 'u0041', 73: 'u0049'})
        self.assertEqual(font['COLR'].version, 0)
        for name in ('u0041', 'u0049'):
            with self.subTest(glyph=name):
                layers = font['COLR'].ColorLayers[name]
                self.assertEqual(len(layers), 1)
                self.assertEqual(layers[0].name, name + '.foreground')
                self.assertEqual(layers[0].colorID, 0xffff)
                base, paint = font['glyf'][name], font['glyf'][layers[0].name]
                # The historical bug passed base-only tests but made this0.
                self.assertGreater(paint.numberOfContours, 0)
                self.assertEqual(base.getCoordinates(font['glyf']), paint.getCoordinates(font['glyf']))

    def test_independent_point_inside_paint_and_metrics(self):
        font = self.open_font()
        self.assertEqual(font['hmtx'].metrics['u0041'], (400, 0))
        self.assertEqual(font['hmtx'].metrics['u0049'], (200, 50))  # PositiveLSB.
        self.assertEqual(font['hmtx'].metrics['u0049.foreground'], (200, 50))
        self.assertEqual(font['hmtx'].metrics['u0020'], (250, 0))
        self.assertEqual(font['hmtx'].metrics['u0020.foreground'], (250, 0))
        self.assertEqual(font['glyf']['u0020'].numberOfContours, 0)
        self.assertEqual(font['glyf']['u0020.foreground'].numberOfContours, 0)
        self.assertEqual(font['COLR'].ColorLayers['u0020'][0].colorID, 0xffff)
        expected = {
            'u0041': {
                'bounds': (0, 500, 300, 800),
                'xs': (-50, 50, 150, 250, 350),
                'ys': (450, 550, 650, 750, 850),
                'ink': {(150, 750), (50, 650), (150, 650), (250, 650), (50, 550), (250, 550)},
            },
            'u0049': {
                'bounds': (50, 750, 100, 900),
                'xs': (-25, 25, 75, 125, 175),
                'ys': (725, 775, 825, 875, 925),
                'ink': {(75, 775), (75, 825), (75, 875)},
            },
        }
        glyph_set = font.getGlyphSet()
        for base, fixture in expected.items():
            layer_name = font['COLR'].ColorLayers[base][0].name
            for name in (base, layer_name):
                with self.subTest(glyph=name):
                    glyph = font['glyf'][name]
                    self.assertEqual((glyph.xMin, glyph.yMin, glyph.xMax, glyph.yMax), fixture['bounds'])
                    # fontTools' independent outline pen also samples a blank
                    # outside border, not just points checked by make_font.
                    for x in fixture['xs']:
                        for y in fixture['ys']:
                            pen = PointInsidePen(glyph_set, (x, y), evenOdd=False)
                            glyph_set[name].draw(pen)
                            self.assertEqual(pen.getResult(), (x, y) in fixture['ink'], (name, x, y))

    def test_font_bytes_are_deterministic_without_mutating_masks(self):
        before = deepcopy(self.records)
        second, _ = preparation.make_font(self.family, self.records)
        self.assertEqual(self.raw, second)
        self.assertEqual(self.records, before)

    def test_source_input_boundary_and_external_hardlink_stays_read_only(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            owned = root / 'classic'
            owned.mkdir()
            for path in (owned / 'provenance.json', owned / 'nested/input.txt'):
                with self.subTest(input=path), self.assertRaisesRegex(ValueError, 'outside the owned Classic'):
                    preparation.source_input_path(path, owned, 'Text input')
            external = root / 'input.txt'
            external.write_bytes(b'synthetic caller input')
            target = owned / 'provenance.json'
            os.link(external, target)
            self.assertTrue(external.samefile(target))
            self.assertEqual(preparation.source_input_path(external, owned, 'Text input'), external)
            preparation.write_output(owned, 'provenance.json', b'synthetic cache output')
            self.assertEqual(external.read_bytes(), b'synthetic caller input')
            self.assertEqual(target.read_bytes(), b'synthetic cache output')

    def test_cli_check_only_rejects_owned_input_without_writes(self):
        owned = preparation.output_directory()[1]
        names = ('MCBE-Classic.woff2', 'MCBE-Classic-Unicode.woff2', 'MCBE-Classic-ASCII.woff2',
                 'font-metrics.json', 'provenance.json')

        def states():
            return {name: ((owned / name).stat().st_size, (owned / name).stat().st_mtime_ns)
                    for name in names if (owned / name).exists()}

        before = states()
        cases = (
            (['--text-file', str(owned / 'provenance.json'), '--check-only'], b'Text input'),
            (['--text-file', str(owned / 'provenance.json')], b'Text input'),
            ([str(owned / 'provenance.json'), '--check-only'], b'Original archive'),
        )
        for arguments, description in cases:
            with self.subTest(arguments=arguments):
                result = subprocess.run(
                    [sys.executable, str(PROJECT / 'scripts/prepare-classic-fonts.py'), *arguments],
                    capture_output=True, cwd=PROJECT)
                self.assertEqual(result.returncode, 1)
                self.assertIn(description + b' must remain outside the owned Classic output directory', result.stderr)
        self.assertEqual(states(), before)


if __name__ == '__main__':
    unittest.main()
