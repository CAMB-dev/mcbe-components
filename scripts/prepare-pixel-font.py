"""Add foreground COLR layers without changing glyph outlines or advances.

Windows browsers otherwise apply colored ClearType filtering to the pixel font.
The original outlines remain for compatibility. fontTools + Brotli are required.
"""
from copy import deepcopy
from pathlib import Path
import hashlib
import json
from fontTools.ttLib import TTFont
from fontTools.colorLib.builder import buildCOLR, buildCPAL

root = Path(__file__).resolve().parent.parent

def convert(source, destination, family, duplicate_layers=True):
    font = TTFont(source)
    font.recalcTimestamp = False
    layers = {}
    for name in list(font.getGlyphOrder()):
        if name == '.notdef':
            continue
        target = name + '.mcbe_pixel' if duplicate_layers else name
        if duplicate_layers:
            font['glyf'][target] = deepcopy(font['glyf'][name])
            font['hmtx'].metrics[target] = font['hmtx'].metrics[name]
        layers[name] = [(target, 0xffff)]
    font.setGlyphOrder(list(font['glyf'].glyphs))
    font['COLR'] = buildCOLR(layers, version=0)
    font['CPAL'] = buildCPAL([[(1, 1, 1, 1)]])
    names = {1: family, 2: 'Regular', 3: family+'-Regular-0.1.0', 4: family+' Regular',
             6: family.replace(' ', '')+'-Regular', 16: family, 17: 'Regular'}
    for record in font['name'].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding(), errors='replace')
    font.flavor = 'woff2'
    destination.parent.mkdir(parents=True, exist_ok=True)
    font.save(destination)
    return {'family':family,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
            'outputSha256':hashlib.sha256(destination.read_bytes()).hexdigest(),
            'glyphLayers':len(layers),'bytes':destination.stat().st_size,
            'change':'COLR v0 foreground layers (paletteIndex=0xFFFF); unchanged outlines and advance widths; renamed family.'}

result = {}
result['openFont'] = convert(root/'src/fonts/Monocraft-Regular.woff2', root/'src/fonts/MCBEPixel-Regular.woff2', 'MCBE Pixel')
(root/'docs/pixel-font.json').write_text(json.dumps(result['openFont'],indent=2)+'\n')
result['openCjkFont'] = convert(root/'src/fonts/FusionPixel-12px-zh-hans.woff2', root/'src/fonts/MCBECJK-12px-zh-hans.woff2', 'MCBE CJK', duplicate_layers=False)
(root/'docs/pixel-cjk-font.json').write_text(json.dumps(result['openCjkFont'],indent=2)+'\n')
local = root/'.cache/local-fonts/Mojangles.ttf'
if local.exists():
    result['localGameFont'] = convert(local, root/'.cache/local-fonts/Mojangles-Pixel.woff2', 'Mojangles Pixel')
    (root/'.cache/local-fonts/pixel-font.json').write_text(json.dumps(result['localGameFont'],indent=2)+'\n')
print(json.dumps(result,indent=2))
