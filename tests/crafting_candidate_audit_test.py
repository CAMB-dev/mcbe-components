"""Frozen PNGjs encodings independently exercise the stdlib audit decoder."""
import base64
import importlib.util
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

spec=importlib.util.spec_from_file_location('crafting_audit',Path(__file__).resolve().parents[1]/'scripts/compare-crafting-candidates.py')
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
PNG_FILTERS=[
'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAFCAYAAABirU3bAAAAYElEQVR4AQFVAKr/AAADBgkMDxIVGBseISQnKi0AMDM2OTw/QkVIS05RVFdaXQBgY2ZpbG9ydXh7foGEh4qNAJCTlpmcn6KlqKuusbS3ur0AwMPGyczP0tXY297h5Ofq7RR5JQkRX7bhAAAAAElFTkSuQmCC',
'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAFCAYAAABirU3bAAAAL0lEQVR4AWNkYGbj5EECjAbGZpY8SIAxITktkwcJME6YPG0mDxJgPHD42EkeJAAAcE0KsAZVVsAAAAAASUVORK5CYII=',
'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAFCAYAAABirU3bAAAAJ0lEQVR4AWNiYGbj5OEXEpWQllNUUdfSZTJAA0wGaIDJAA0wGaABAAIJDXOFYY83AAAAAElFTkSuQmCC',
'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAFCAYAAABirU3bAAAAN0lEQVR4AWNmYGbj5OHjFxQSERWXkJKWZTYwMjaVQwLMHl7evnJIgDkhKTlVDgkwV1RV18ohAQC8HgwgzNFHbAAAAABJRU5ErkJggg==',
'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAFCAYAAABirU3bAAAAJ0lEQVR4AU3BwQkAMAwDsUCOQsHDeP/p4qclZt9XwaGCQwWHCg6VA/P3Bfd6L//zAAAAAElFTkSuQmCC']

class CandidateAuditTests(unittest.TestCase):
    def decode(self,data):
        with tempfile.TemporaryDirectory(prefix='mcbe-candidate-audit-') as directory:
            p=Path(directory)/'fixture.png';p.write_bytes(data);return audit.rgba_png(p)

    def test_five_frozen_independent_encodings_preserve_all_rgba_bytes(self):
        expected=bytes((i*3)%256 for i in range(80))
        for kind,encoded in enumerate(PNG_FILTERS):
            with self.subTest(filter=kind):self.assertEqual(self.decode(base64.b64decode(encoded)),(4,5,expected))

    def test_crc_corruption_is_rejected(self):
        data=bytearray(base64.b64decode(PNG_FILTERS[0]));data[45]^=1
        with self.assertRaisesRegex(ValueError,'CRC'):self.decode(data)

    def test_signature_truncation_and_extra_bytes_are_rejected(self):
        data=base64.b64decode(PNG_FILTERS[0])
        for bad in [b'not a PNG',data[:-1],data+b'extra']:
            with self.subTest(size=len(bad)),self.assertRaises(ValueError):self.decode(bad)

    def replace_header(self,**changes):
        data=bytearray(base64.b64decode(PNG_FILTERS[0]));fields=list(struct.unpack('>IIBBBBB',data[16:29]))
        for key,value in changes.items():fields[{'width':0,'color':3}[key]]=value
        data[16:29]=struct.pack('>IIBBBBB',*fields);data[29:33]=struct.pack('>I',zlib.crc32(data[12:29])&0xffffffff);return data

    def test_unqualified_color_format_is_rejected(self):
        with self.assertRaisesRegex(ValueError,'RGBA8'):self.decode(self.replace_header(color=2))

    def test_framebuffer_budget_precedes_inflation(self):
        with self.assertRaisesRegex(ValueError,'budget'):self.decode(self.replace_header(width=9000))

    def test_score_counts_alpha_and_color_changes_across_complete_inputs(self):
        self.assertEqual(audit.score([0,0xffffffff,0xff010203],[0xff000000,0xff010203,0xff010203]),{'rgbaPixels':2,'alphaPixels':1,'differentBytes':4,'absoluteError':1014,'maxChannelError':255})

if __name__=='__main__':unittest.main()
