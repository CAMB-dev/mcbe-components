import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
def module(name, file):
    spec=importlib.util.spec_from_file_location(name, ROOT/file)
    value=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value

prepare=module('classic_truetype_prepare','scripts/prepare-classic-truetype.py')
png=module('independent_png','scripts/compare-crafting-candidates.py')


class ClassicTrueTypePreparation(unittest.TestCase):
    def records(self):
        return [{'codepoint':i,'present':False,'rect':[0,0,0,0],
                 'offset':[0,0],'offset2':[0,0],'advance':0} for i in range(256)]

    def test_unknown_same_size_font_is_rejected_before_native_parser(self):
        data=b'\x00\x01\x00\x00'+bytes(127500)
        with self.assertRaisesRegex(ValueError,'Unsupported original font'):
            prepare.validate_source(data)

    def test_generated_alpha_integrity_is_mandatory(self):
        for data in [b'',bytes(1024*1024),bytes(1024*1024+1)]:
            with self.subTest(length=len(data)),self.assertRaisesRegex(ValueError,'alpha differs'):
                prepare.validate_result(data,self.records())

    def test_invalid_character_identity_bounds_and_nonfinite_metrics_are_rejected(self):
        alpha=bytes(1024*1024)
        with patch.object(prepare,'ALPHA_SHA',hashlib.sha256(alpha).hexdigest()):
            for key,value in [('codepoint',9),('present',1),('rect',[-1,0,1,1]),('rect',[2,0,1,1]),
                              ('rect',[0,0,1025,1]),('offset',[float('nan'),0]),('offset2',[0]),('advance',float('inf'))]:
                rows=self.records();rows[0][key]=value
                with self.subTest(key=key,value=value),self.assertRaises(ValueError):
                    prepare.validate_result(alpha,rows)

    def test_source_rgba_coverage_and_png_crc_roundtrip(self):
        # Project-owned byte pattern, not Minecraft art or a native golden.
        alpha=bytes(range(256))*4096
        directory=(ROOT/'.cache/classic-truetype-tests').resolve()
        self.assertTrue(directory.is_relative_to(ROOT.resolve()));directory.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=directory) as temporary:
            path=Path(temporary).resolve();self.assertTrue(path.is_relative_to(directory))
            image=path/'coverage.png';image.write_bytes(prepare.rgba_png(alpha))
            width,height,rgba=png.rgba_png(image)
            self.assertEqual((width,height),(1024,1024))
            for channel in range(4):self.assertEqual(rgba[channel::4],alpha)

    def test_artifact_links_hashes_and_serialization_are_deterministic(self):
        alpha=bytes(1024*1024)
        with patch.object(prepare,'ALPHA_SHA',hashlib.sha256(alpha).hexdigest()):
            files=prepare.make_files(alpha,self.records())
            self.assertEqual(files,prepare.make_files(alpha,self.records()))
        descriptor=json.loads(files['font-cache.json'])
        self.assertEqual(descriptor['atlas']['pngSHA256'],hashlib.sha256(files['atlas.png']).hexdigest())
        self.assertEqual(descriptor['packedCharacters']['sha256'],hashlib.sha256(files['packed-chars.json']).hexdigest())
        self.assertEqual(descriptor['parameters']['oversample'],[2,2])
        self.assertIn('not GuiTextFont',descriptor['scope'])

    def test_upstream_header_and_license_are_present(self):
        self.assertEqual(hashlib.sha256((ROOT/'scripts/vendor/stb/stb_truetype.h').read_bytes()).hexdigest(),prepare.HEADER_SHA)
        self.assertIn('Permission is hereby granted',(ROOT/'scripts/vendor/stb/LICENSE.txt').read_text(encoding='utf-8'))

    def test_optional_gui_metrics_keep_default_three_files_byte_identical(self):
        alpha=bytes(1024*1024);rows=self.records()
        rows[48].update(rect=[769,1,821,75],offset=[2.25,-36.75],offset2=[28.25,0.25],advance=31.5)
        with patch.object(prepare,'ALPHA_SHA',hashlib.sha256(alpha).hexdigest()):
            base=prepare.make_files(alpha,rows);extended=prepare.make_files(alpha,rows,True)
        self.assertEqual(set(extended),set(base)|{'gui-font.json'})
        for name in base:self.assertEqual(base[name],extended[name])
        font=json.loads(extended['gui-font.json'])
        self.assertEqual(font['glyphs']['0'],{'page':0,'atlasRect':[769,1,52,74],
            'offset':[.28125,1.90625],'size':[3.25,4.625],'advance':3.9375})
        self.assertEqual((font['pageSizes'],font['lineHeight']),([1024],8))
        self.assertEqual(len(font['glyphs']),256)


if __name__=='__main__':unittest.main()
