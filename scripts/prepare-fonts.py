"""Optional asset preparation; install fonttools[woff], brotli and pillow first.

Downloaded upstream archives live in .cache/fonts (see docs/FIDELITY.md).
Builds use committed woff2 files and do not require Python or network access.
"""
from pathlib import Path
import json
from collections import Counter
from shutil import copyfile
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
source = root / '.cache/fonts/monocraft/Monocraft-ttf/Monocraft.ttf'
font = TTFont(source)
if 'fvar' in font:
    from fontTools.varLib.instancer import instantiateVariableFont
    font = instantiateVariableFont(font, {'wght': 400})
font.flavor = 'woff2'
font.save(root / 'src/fonts/Monocraft-Regular.woff2')
copyfile(root / '.cache/fonts/fusion/fusion-pixel-12px-proportional-zh_hans.ttf.woff2',
         root / 'src/fonts/FusionPixel-12px-zh-hans.woff2')

# Keep upstream notices from every inherited Fusion Pixel source.
for notice in (root / '.cache/fonts/fusion').rglob('*'):
    if notice.is_file() and (notice.name.lower().startswith(('ofl', 'license'))):
        relative = notice.relative_to(root / '.cache/fonts/fusion')
        target = root / 'src/fonts/fusion-notices' / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        copyfile(notice, target)

from PIL import Image
samples = {}
for path in sorted((root / '.cache/references').glob('*.png')):
    image = Image.open(path).convert('RGBA')
    palette = Counter(image.get_flattened_data())
    samples[path.name] = {
        'size': list(image.size),
        'matrix': [['#%02x%02x%02x%02x' % image.getpixel((x, y)) for x in range(image.width)] for y in range(image.height)],
        'colors': [{'hex': '#%02x%02x%02x%02x' % color, 'pixels': count}
                   for color, count in palette.most_common(12)],
    }
(root / 'docs').mkdir(exist_ok=True)
(root / 'docs/reference-colors.json').write_text(json.dumps(samples, indent=2) + '\n', encoding='utf-8')
print(json.dumps(samples, indent=2))
fusion = TTFont(root / 'src/fonts/FusionPixel-12px-zh-hans.woff2')
assert all(ord(char) in fusion.getBestCmap() for char in '\u521b\u9020\u5c5e\u4e8e\u4f60\u7684\u4e16\u754c')
print('Chinese specimen glyph coverage: PASS')
