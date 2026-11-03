import hashlib,importlib.util,json,os,subprocess,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('classic_unicode_prepare',ROOT/'scripts/prepare-classic-truetype.py');tool=importlib.util.module_from_spec(spec);spec.loader.exec_module(tool)
pngspec=importlib.util.spec_from_file_location('independent_unicode_png',ROOT/'scripts/compare-crafting-candidates.py');png=importlib.util.module_from_spec(pngspec);pngspec.loader.exec_module(png)
def rows():return [{'codepoint':i,'present':False,'rect':[0,0,0,0],'offset':[0,0],'offset2':[0,0],'advance':0}for i in range(256)]
def extra(cp=256):return {'codepoint':cp,'present':True,'rect':[1,2,5,8],'offset':[1,-8],'offset2':[3,-5],'advance':4}
class UnicodePreparation(unittest.TestCase):
 def test_literal_requests_are_sorted_deduplicated_without_normalization(self):
  self.assertEqual(tool.requested_codepoints(['\u03a9A\r\n','\u0100\u03a9','e\u0301']),[65,101,256,769,937])
 def test_controls_surrogates_and_budgets_reject(self):
  for value in ['\x00','\t','\x7f','\ud800','A'*1048577,''.join(chr(i)for i in range(1000,5097))]:
   with self.subTest(value=repr(value[:8])),self.assertRaises(ValueError):tool.requested_codepoints([value])
 def test_extension_preserves_base_files_and_omits_missing_placeholders(self):
  alpha=bytes(1024*1024);basechars=rows();basechars[65].update(present=True)
  with patch.object(tool,'ALPHA_SHA',hashlib.sha256(alpha).hexdigest()):base=tool.make_files(alpha,basechars)
  extended=tool.extend_files(dict(base),basechars,[(alpha,[extra()],[256])],2)
  for name,data in base.items():self.assertEqual(extended[name],data)
  font=json.loads(extended['gui-font.json']);self.assertEqual(set(font['glyphs']),{'A','\u0100'});self.assertEqual(font['pages'],['atlas.png','atlas-unicode-0001.png']);self.assertEqual(font['glyphs']['\u0100'],{'page':1,'atlasRect':[1,2,4,6],'offset':[.125,5.5],'size':[.25,.375],'advance':.5})
  meta=json.loads(extended['unicode-cache.json']);self.assertFalse(meta['nativeExtensionCertified']);self.assertEqual(meta['guiFont']['sha256'],hashlib.sha256(extended['gui-font.json']).hexdigest());self.assertEqual(meta['additionalGlyphCount'],1)
 def test_extension_rejects_missing_records_duplicates_order_and_base_overwrites(self):
  alpha=bytes(1024*1024);basechars=rows()
  for cps,records in [([65],[extra(65)]),([256,256],[extra(),extra()]),([257,256],[extra(257),extra()]),([256],[{**extra(),'present':False}]),([256],[])]:
   with self.subTest(cps=cps),self.assertRaises(ValueError):tool.extend_files({'atlas.png':b'x'},basechars,[(alpha,records,cps)],551)
 def test_multiple_page_records_use_distinct_page_indices(self):
  alpha=bytes(1024*1024);f=tool.extend_files({'atlas.png':b'x'},rows(),[(alpha,[extra()],[256]),(alpha,[extra(257)],[257])],551);font=json.loads(f['gui-font.json']);self.assertEqual([font['glyphs'][chr(cp)]['page']for cp in[256,257]],[1,2]);self.assertEqual(len(font['pages']),3)

@unittest.skipUnless(os.environ.get('MCBE_CLASSIC_TTF')and os.environ.get('MCBE_CLASSIC_CC'),'Original caller font/compiler required for source integration, no substitute')
class OriginalUnicodeIntegration(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.font=Path(os.environ['MCBE_CLASSIC_TTF']);cls.cc=os.environ['MCBE_CLASSIC_CC'];cls.cache=(ROOT/'.cache/classic-truetype-tests').resolve();assert cls.cache.is_relative_to(ROOT.resolve());cls.cache.mkdir(parents=True,exist_ok=True)
 def test_subset_and_all_source_pages_and_repeat_check_only(self):
  with tempfile.TemporaryDirectory(dir=self.cache)as d:
   root=Path(d).resolve();assert root.is_relative_to(self.cache)
   first=root/'all';second=root/'repeat';tool.prepare(self.font,first,self.cc,all_supported=True);tool.prepare(self.font,second,self.cc,all_supported=True)
   files={p.name:p.read_bytes()for p in first.iterdir()};self.assertEqual(files,{p.name:p.read_bytes()for p in second.iterdir()});before={p.name:p.stat().st_mtime_ns for p in first.iterdir()};tool.prepare(self.font,first,self.cc,True,all_supported=True);self.assertEqual(before,{p.name:p.stat().st_mtime_ns for p in first.iterdir()})
   font=json.loads(files['gui-font.json']);meta=json.loads(files['unicode-cache.json']);self.assertEqual((len(font['glyphs']),len(font['pages']),meta['additionalGlyphCount']),(551,7,370));self.assertNotIn('中',font['glyphs']);self.assertNotIn('\x00',font['glyphs'])
   for name in font['pages']:
    w,h,rgba=png.rgba_png(first/name);self.assertEqual((w,h),(1024,1024));self.assertTrue(all(rgba[0::4]==rgba[c::4]for c in range(1,4)));expected=tool.ALPHA_SHA if name=='atlas.png'else next(p['alphaSHA256']for p in meta['pages']if p['url']==name);self.assertEqual(hashlib.sha256(rgba[0::4]).hexdigest(),expected)
   subset=root/'subset';tool.prepare(self.font,subset,self.cc,characters=['\u0100\u03a9\u0416\u20ac']);small=json.loads((subset/'gui-font.json').read_text(encoding='utf-8'));self.assertEqual(len(small['pages']),2);self.assertEqual(len(small['glyphs']),185)
   for name in['atlas.png','packed-chars.json','font-cache.json']:self.assertEqual(files[name],(subset/name).read_bytes())
 def test_missing_source_glyph_fails_without_creating_output(self):
  with tempfile.TemporaryDirectory(dir=self.cache)as d:
   out=Path(d)/'missing'
   with self.assertRaisesRegex(ValueError,r'U\+4E2D'):tool.prepare(self.font,out,self.cc,characters=['中'])
   self.assertFalse(out.exists())
 def test_cli_combined_files_reject_before_compilation_or_output(self):
  with tempfile.TemporaryDirectory(dir=self.cache)as d:
   root=Path(d).resolve();assert root.is_relative_to(self.cache)
   a=root/'a.txt';b=root/'b.txt';a.write_text('A'*600001,encoding='utf-8');b.write_text('B'*600001,encoding='utf-8');out=root/'output'
   r=subprocess.run([sys.executable,str(ROOT/'scripts/prepare-classic-truetype.py'),str(self.font),'--compiler','not-a-compiler','--text-file',str(a),'--text-file',str(b),'--output',str(out)],capture_output=True)
   self.assertEqual(r.returncode,1);self.assertIn('1,048,576',json.loads(r.stderr)['error']);self.assertFalse(out.exists())
if __name__=='__main__':unittest.main()
