import {existsSync,readFileSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isAbsolute,relative,resolve} from 'node:path';

/** Demo-only caller cache loader. No original font/cache enters the library. */
export function classicTenUnicodeModule(directory:string):string {
  const unavailable='export const classicTenUnicodeGuiFont=undefined; export const classicTenUnicodeInfo=undefined;';
  if(!existsSync(resolve(directory,'unicode-cache.json')))return unavailable;
  const root=realpathSync(directory),sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
  function file(name:string){
    if(!/^(?:atlas(?:-unicode-\d{4})?\.png|(?:font-cache|packed-chars|gui-font|unicode-cache|packed-unicode)\.json)$/.test(name))throw Error('Invalid Classic Unicode cache filename.');
    const target=realpathSync(resolve(root,name)),within=relative(root,target);
    if(within==='..'||within.startsWith('../')||within.startsWith('..\\')||isAbsolute(within))throw Error('Classic Unicode cache file escapes its directory.');
    const b=readFileSync(target);if(b.length>8*1024*1024)throw Error('Classic Unicode cache file exceeds its budget.');return b;
  }
  const manifest=JSON.parse(file('unicode-cache.json').toString('utf8'));
  if(manifest.format!=='mcbeui-classic-ten-unicode-cache-v1'
    ||manifest.originalFontSHA256!=='fc34c190dbfae5fe2f27adb45a93425f502388191854a6a0c2ac2f7c594a688f'
    ||manifest.stbHeaderSHA256!=='ecd30b05e0dd4fea3a13c26810dd9e1992dc379049482c393d5a19e6b5090aab'
    ||manifest.pageCapacity!==64||manifest.pixelHeight!==64||manifest.padding!==1||JSON.stringify(manifest.oversample)!=='[2,2]'
    ||manifest.missingGlyphPolicy!=='omit-notdef-from-extended-gui-descriptor'||manifest.nativeExtensionCertified!==false
    ||!Array.isArray(manifest.pages)||manifest.pages.length>64)throw Error('Invalid Classic Unicode cache provenance.');
  const base={'atlas.png':'9402a188af40fd8a5521790d11e664656717ea0f655b79fb5b958c050b5d469b',
    'font-cache.json':'38aaa0f890ed49c59455e27e337f4b561d3944b63a67e7a7bb0ed78ed755dee9',
    'packed-chars.json':'5ef1aef751a29e43ba7efbfcd9107a5a432ae959d1c271e89946c80b76c87919'};
  for(const[name,hash]of Object.entries(base))if(sha(file(name))!==hash)throw Error('Classic Unicode base cache identity changed.');
  const guiBytes=file('gui-font.json'),packedBytes=file('packed-unicode.json');
  if(manifest.guiFont?.url!=='gui-font.json'||manifest.guiFont.sha256!==sha(guiBytes)
    ||manifest.packedCharacters?.url!=='packed-unicode.json'||manifest.packedCharacters.sha256!==sha(packedBytes))throw Error('Classic Unicode descriptor identity changed.');
  const font=JSON.parse(guiBytes.toString('utf8')),packed=JSON.parse(packedBytes.toString('utf8'));
  const baseChars=JSON.parse(file('packed-chars.json').toString('utf8')) as {codepoint:number;present:boolean}[];
  const supported=new Set(baseChars.filter(row=>row.present).map(row=>row.codepoint)),names=['atlas.png'];let extra=0;
  for(const[page,item]of manifest.pages.entries()){
    const name=`atlas-unicode-${String(page+1).padStart(4,'0')}.png`;
    if(item.url!==name||item.page!==page+1||item.width!==1024||item.height!==1024||!Array.isArray(item.codepoints)||item.codepoints.length<1||item.codepoints.length>64)throw Error('Invalid Classic Unicode page declaration.');
    const bytes=file(name);
    if(sha(bytes)!==item.pngSHA256||bytes.length<24||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.readUInt32BE(16)!==1024||bytes.readUInt32BE(20)!==1024)throw Error('Classic Unicode whole PNG identity changed.');
    for(const cp of item.codepoints){if(!Number.isSafeInteger(cp)||cp<=255||cp>0x10ffff||cp>=0xd800&&cp<=0xdfff||supported.has(cp))throw Error('Invalid Classic Unicode codepoint.');supported.add(cp);extra++;}
    names.push(name);
  }
  if(extra!==manifest.additionalGlyphCount||!Array.isArray(packed)||packed.length!==extra||font.lineHeight!==8
    ||JSON.stringify(font.pages)!==JSON.stringify(names)||JSON.stringify(font.pageSizes)!==JSON.stringify(names.map(()=>1024))
    ||!font.glyphs||typeof font.glyphs!=='object'||Object.keys(font.glyphs).length!==supported.size
    ||Object.keys(font.glyphs).some(char=>[...char].length!==1||!supported.has(char.codePointAt(0)!)))throw Error('Classic Unicode GUI descriptor differs from its declared glyph set.');
  const variables=names.map((_,i)=>`classicTenUnicodePage${i}`);
  return names.map((name,i)=>`import ${variables[i]} from ${JSON.stringify(resolve(root,name).replaceAll('\\','/')+'?url')};`).join('\n')
    +`\nexport const classicTenUnicodeGuiFont={...${JSON.stringify(font)},pages:[${variables.join(',')}]};`
    +`\nexport const classicTenUnicodeInfo=${JSON.stringify({glyphs:supported.size,pages:names.length,additionalGlyphs:extra,nativeExtensionCertified:false})};`;
}
