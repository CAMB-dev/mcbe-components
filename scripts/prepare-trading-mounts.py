"""Extract unchanged trading/mount PNGs and record independent provenance.

Requires the ignored official full-release ZIP and a matching user-owned install.
Normal package builds consume the committed generated CSS and JSON instead.
"""
from pathlib import Path
import base64, hashlib, json, re, struct, urllib.error, urllib.request, zipfile

root = Path(__file__).resolve().parent.parent
reference_commit = '46ba6ea985fb5a92d79a9419198f10dda14c199d'
release_commit = '15701fa9c13923f12662984c32c124327e40e3d3'
release_zip = root / '.cache/references/bedrock-samples-v1.26.60.5-full.zip'
game_archive = Path('C:/XboxGames/Minecraft for Windows/Content/data/resource_packs/vanilla/__brarchive')
target = root / '.cache/trading-mounts-source'
target.mkdir(parents=True, exist_ok=True)

def sha(data): return hashlib.sha256(data).hexdigest()
def entries(path):
    data = path.read_bytes()
    count = struct.unpack_from('<I', data, 8)[0]
    base = 16 + count * 256
    result = {}
    for i in range(count):
        row = data[16+i*256:16+(i+1)*256]
        name = row[1:1+row[0]].decode('utf-8')
        offset, size = struct.unpack_from('<II', row, 248)
        result[name] = data[base+offset:base+offset+size]
    return result
def parse(raw):
    text = raw.decode('utf-8-sig')
    text = re.sub(r'"(?:\\.|[^"\\])*"|/\*[\s\S]*?\*/|//[^\r\n]*', lambda m: m[0] if m[0].startswith('"') else '', text)
    return json.loads(re.sub(r',\s*([}\]])', r'\1', text))

names = ['arrow_dark_left_stretch', 'arrow_dark_right_stretch', 'crossout', 'lock', 'red_slash', 'experience_bar_full_blue', 'experience_bar_full_white', 'experience_bar_empty_blue', 'experience_bar_nub_blue', 'background_with_border', 'button_trade_red', 'button_trade_red_pressed', 'empty_horse_slot_saddle', 'empty_horse_slot_armor', 'empty_llama_slot_carpet', 'empty_nautilus_slot_armor', 'pocket_button_pressed', 'cell_image_red', 'recipe_back_panel', 'button_purple']

z = zipfile.ZipFile(release_zip)
native_ui = entries(game_archive/'ui.brarchive')
native_images = entries(game_archive/'textures/ui.brarchive')
ui = []
for name in ['trade_2_screen.json', 'horse_screen.json', 'ui_common.json', '_global_variables.json', 'ui_template_toggles.json', 'ui_template_buttons.json']:
    public = z.read('resource_pack/ui/'+name)
    local = native_ui[name]
    equal = parse(public) == parse(local)
    if not equal: raise ValueError('Native/public UI mismatch: '+name)
    (target/name).write_text(json.dumps(parse(local), indent=2)+'\n', encoding='utf-8')
    ui.append({'source':'resource_pack/ui/'+name, 'releaseSha256':sha(public), 'localSha256':sha(local), 'parsedEqual':equal})

css = ['/* Unmodified original PNG bytes; see docs/trading-mount-textures.json. */', ':root {']
textures = []
for name in names:
    source = 'resource_pack/textures/ui/'+name+'.png'
    public = z.read(source)
    local = native_images[name+'.png']
    pinned_url = 'https://raw.githubusercontent.com/Mojang/bedrock-samples/'+reference_commit+'/'+source
    try:
        pinned = urllib.request.urlopen(pinned_url, timeout=25).read()
        pinned_equal = pinned == public
        pinned_error = None
    except (urllib.error.URLError, TimeoutError) as error:
        pinned_equal = False
        pinned_error = str(error)
    metadata_path = 'resource_pack/textures/ui/'+name+'.json'
    metadata = parse(z.read(metadata_path)) if metadata_path in z.namelist() else None
    key = name.lower().replace('_', '-')
    (target/(name+'.png')).write_bytes(public)
    css.append('  --mc-tm-'+key+': url("data:image/png;base64,'+base64.b64encode(public).decode()+'");')
    row = {'key':key,'source':source,'sha256':sha(public),'size':list(struct.unpack_from('>II',public,16)),
           'metadata':metadata,'localEqual':local==public,'fullReleaseEqual':True,'pinnedEqual':pinned_equal,
           'pinnedUrl':pinned_url,'referenceUrl':pinned_url if pinned_equal else 'https://raw.githubusercontent.com/Mojang/bedrock-samples/'+release_commit+'/'+source}
    if pinned_error: row['pinnedVerificationError'] = pinned_error
    textures.append(row)
css.append('}')
(root/'src/trading-mount-textures.css').write_text('\n'.join(css)+'\n',encoding='utf-8')
manifest = {'source':{'release':'v1.26.60.5','releaseCommit':release_commit,'referenceCommit':reference_commit,
    'archiveUrl':'https://github.com/Mojang/bedrock-samples/releases/download/v1.26.60.5/bedrock-samples-v1.26.60.5-full.zip',
    'archiveSha256':sha(release_zip.read_bytes()),'ui':ui,'textures':textures},
    'encoding':'Original PNG bytes embedded unchanged; no generated replacement art.'}
(root/'docs/trading-mount-textures.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f'Generated{len(textures)} trading/mount textures; local equality{sum(r["localEqual"] for r in textures)}/{len(textures)}, pinned equality{sum(r["pinnedEqual"] for r in textures)}/{len(textures)}; complete UI comparisons{len(ui)}.')
