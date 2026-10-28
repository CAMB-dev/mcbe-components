"""Independent glyph + shadow raster from the user's local Mojangles outlines.
Requires fontTools and Pillow; writes only .cache/font-oracle.
"""
from pathlib import Path
import hashlib
import json
import math
from PIL import Image
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
source = root / '.cache/local-fonts/Mojangles.ttf'
font = TTFont(source)
text = 'Minecraft'
scale = 20 / font['head'].unitsPerEm
pen = 0
polygons = []
for char in text:
    name = font.getBestCmap()[ord(char)]
    glyph = font['glyf'][name]
    coordinates, ends, flags = glyph.getCoordinates(font['glyf'])
    assert all(flag & 1 for flag in flags), 'The pixel specimen must have straight contours'
    start = 0
    for end in ends:
        polygons.append([((x + pen) * scale, y * scale) for x, y in coordinates[start:end+1]])
        start = end + 1
    pen += font['hmtx'].metrics[name][0]

def winding(x, y, polygon):
    result = 0
    for (x1,y1),(x2,y2) in zip(polygon, polygon[1:] + polygon[:1]):
        cross = (x2-x1)*(y-y1) - (x-x1)*(y2-y1)
        if y1 <= y < y2 and cross > 0:
            result += 1
        elif y2 <= y < y1 and cross < 0:
            result -= 1
    return result

left = math.floor(min(x for polygon in polygons for x,y in polygon))
right = math.ceil(max(x for polygon in polygons for x,y in polygon))
bottom = math.floor(min(y for polygon in polygons for x,y in polygon))
top = math.ceil(max(y for polygon in polygons for x,y in polygon))
width, height = right-left, top-bottom
mask = []
for y in range(height):
    for x in range(width):
        if sum(winding(left+x+.5,top-y-.5,polygon) for polygon in polygons):
            mask.append((x,y))
output = root / '.cache/font-oracle'
output.mkdir(parents=True,exist_ok=True)
for shadow in [False,True]:
    image = Image.new('RGBA',(width+(2 if shadow else 0),height+(2 if shadow else 0)),(40,41,42,255))
    if shadow:
        for x,y in mask: image.putpixel((x+2,y+2),(63,63,63,255))
    for x,y in mask: image.putpixel((x,y),(255,255,255,255))
    image.save(output / ('mojangles-shadow.png' if shadow else 'mojangles-plain.png'))
input_image = Image.new('RGBA',(width+2,height+2),(94,94,94,255))
for x,y in mask: input_image.putpixel((x+2,y+2),(63,63,63,255))
for x,y in mask: input_image.putpixel((x,y),(255,255,255,255))
input_image.save(output / 'mojangles-input-shadow.png')
metrics = {'text':text,'fontFamily':font['name'].getDebugName(1),'fontSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
           'fontSize':20,'advancePx':pen*scale,'inkBoundsPx':[left,bottom,right,top],'shadowOffset':[2,2],
           'method':'Nonzero winding at pixel centers, from original TTF contours; shadow then foreground.'}
(output/'metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')
print(json.dumps(metrics,indent=2))
