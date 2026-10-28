"""Extract unchanged advanced-workstation PNGs and record independent provenance.

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
target = root / '.cache/advanced-source'
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

names = [
    'recipe_back_panel', 'recipe_book_pane_bg', 'Banners', 'loom_banner_empty', 'loom_dye_empty', 'loom_pattern_item_empty',
    'effect_background', 'middle_strip', 'pyramid_level_1', 'pyramid_level_2', 'pyramid_level_3', 'pyramid_level_4',
    'item_seperator', 'beacon_button_default', 'beacon_button_hover', 'beacon_button_pressed', 'beacon_button_locked',
    'speed_effect', 'haste_effect', 'resistance_effect', 'jump_boost_effect', 'strength_effect', 'regeneration_effect',
    'confirm', 'cancel', 'slot_enabled', 'slot_disabled', 'slot_enabled_hover', 'crafter_item_border',
    'redstone_arrow_unpowered', 'redstone_arrow_powered',
]
z = zipfile.ZipFile(release_zip)
native_ui = entries(game_archive/'ui.brarchive')
native_images = entries(game_archive/'textures/ui.brarchive')
ui = []
for name in ['stonecutter_screen.json', 'loom_screen.json', 'beacon_screen.json', 'redstone_screen.json', 'ui_common.json', '_global_variables.json']:
    public = z.read('resource_pack/ui/'+name)
    local = native_ui[name]
    equal = parse(public) == parse(local)
    if not equal: raise ValueError('Native/public UI mismatch: '+name)
    (target/name).write_text(json.dumps(parse(local), indent=2)+'\n', encoding='utf-8')
    ui.append({'source':'resource_pack/ui/'+name, 'releaseSha256':sha(public), 'localSha256':sha(local), 'parsedEqual':equal})

css = ['/* Unmodified original PNG bytes; see docs/advanced-workstation-textures.json. */', ':root {']
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
    css.append('  --mc-advanced-'+key+': url("data:image/png;base64,'+base64.b64encode(public).decode()+'");')
    row = {'key':key,'source':source,'sha256':sha(public),'size':list(struct.unpack_from('>II',public,16)),
           'metadata':metadata,'localEqual':local==public,'fullReleaseEqual':True,'pinnedEqual':pinned_equal,
           'pinnedUrl':pinned_url,'referenceUrl':pinned_url if pinned_equal else 'https://raw.githubusercontent.com/Mojang/bedrock-samples/'+release_commit+'/'+source}
    if pinned_error: row['pinnedVerificationError'] = pinned_error
    textures.append(row)
css.append('}')
(root/'src/advanced-workstation-textures.css').write_text('\n'.join(css)+'\n',encoding='utf-8')
manifest = {'source':{'release':'v1.26.60.5','releaseCommit':release_commit,'referenceCommit':reference_commit,
    'archiveUrl':'https://github.com/Mojang/bedrock-samples/releases/download/v1.26.60.5/bedrock-samples-v1.26.60.5-full.zip',
    'archiveSha256':sha(release_zip.read_bytes()),'ui':ui,'textures':textures},
    'encoding':'Original PNG bytes embedded unchanged; no generated replacement art.'}
(root/'docs/advanced-workstation-textures.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f'Generated{len(textures)} advanced textures; local equality{sum(r["localEqual"] for r in textures)}/{len(textures)}, pinned equality{sum(r["pinnedEqual"] for r in textures)}/{len(textures)}; complete UI comparisons{len(ui)}.')
