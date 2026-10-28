"""Prepare unmodified original inventory/category/search source images and provenance."""
from pathlib import Path
import base64
import hashlib
import json
import re
import struct
import zipfile

ROOT = Path(__file__).resolve().parent.parent
GAME = Path('C:/XboxGames/Minecraft for Windows/Content/data/resource_packs/vanilla/__brarchive')
RELEASE = '15701fa9c13923f12662984c32c124327e40e3d3'
SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'
archive = ROOT/'.cache/references/bedrock-samples-v1.26.60.5-full.zip'
assert hashlib.sha256(archive.read_bytes()).hexdigest() == SHA

def parse(data):
    text = data.decode('utf-8-sig')
    text = re.sub(r'"(?:\\.|[^"\\])*"|/\*[\s\S]*?\*/|//[^\n]*', lambda m: m[0] if m[0].startswith('"') else '', text)
    return json.loads(text)

def entries(path):
    data = path.read_bytes()
    count, version = struct.unpack_from('<II', data, 8)
    assert version == 1 and 0 < count < 100000
    base = 16 + count*256
    for i in range(count):
        row = data[16+i*256:16+(i+1)*256]
        length = row[0]
        assert 0 < length < 248
        name = row[1:1+length].decode('utf-8')
        offset, size = struct.unpack_from('<II', row, 248)
        assert base+offset+size <= len(data)
        yield name, data[base+offset:base+offset+size]

local = dict(entries(GAME/'ui.brarchive'))
textures = dict(entries(GAME/'textures/ui.brarchive'))
manifest = {'schemaVersion': 1, 'profile': 'bedrock-classic-json-ui', 'gameVersion': '1.26.6005.0', 'guiScale': 2,
    'archiveSha256': SHA, 'releaseCommit': RELEASE, 'sources': {}, 'assets': {}}
cache = ROOT/'.cache/inventory-screen-source'
cache.mkdir(parents=True, exist_ok=True)
mapping = {kind: 'empty_armor_slot_'+name for kind, name in [('helmet','helmet'),('chestplate','chestplate'),('leggings','leggings'),('boots','boots'),('offhand','shield')]}
mapping.update({'category-'+kind: 'icon_recipe_'+name for kind,name in [('construction','construction'),('equipment','equipment'),('items','item'),('nature','nature')]})
mapping.update({'category-search':'magnifyingGlass', 'preview':'player_preview_border', 'black':'Black', 'arrow':'arrow',
    'search':'edit_box_indent', 'search-hover':'edit_box_indent_hover', 'filter-off':'craft_toggle_off',
    'filter-on':'craft_toggle_on', 'filter-off-hover':'craft_toggle_off_hover', 'filter-on-hover':'craft_toggle_on_hover',
    'creative-hotbar':'dialog_background_opaque_overlap_bottom', 'recipe-cell':'recipe_book_item_bg',
    'recipe-pane':'recipe_book_pane_bg','white':'white'})
mapping.update({'toolbar':'toolbar_background','toolbar-creative':'creative_icon','toolbar-recipe-book':'recipe_book_icon',
    'toolbar-survival':'inventory_icon','toolbar-off':'recipe_book_button_borderless_light',
    'toolbar-on':'recipe_book_button_borderless_lightpressednohover','toolbar-off-hover':'recipe_book_button_borderless_lighthover',
    'toolbar-on-hover':'recipe_book_button_borderless_lightpressed','toolbar-locked':'disabledButtonNoBorder',
    'toolbar-border':'focus_border_white','toolbar-help':'how_to_play_button_default_light',
    'toolbar-help-hover':'how_to_play_button_hover_light','toolbar-help-pressed':'how_to_play_button_pressed_light',
    'toolbar-close':'close_button_default_light','toolbar-close-hover':'close_button_hover_light','toolbar-close-pressed':'close_button_pressed_light'})
for side, suffix in [('', ''),('-left','LeftMost'),('-right','RightMost')]:
    for state, name in [('back','Back'),('front','Front')]:
        mapping['tab-'+state+side] = 'TabTop'+name+suffix
        mapping['tab-'+state+side+'-hover'] = 'TabTop'+name+suffix+'Hover'
css = ['/* Original Mojang PNG bytes; see docs/inventory-screens-geometry.json. */', ':root {']
with zipfile.ZipFile(archive) as z:
    language=z.read('resource_pack/texts/en_US.lang')
    all_items_label=next(row.split('=',1)[1] for row in language.decode('utf-8-sig').splitlines() if row.startswith('craftingScreen.tab.allItems='))
    manifest['localization']={'source':'resource_pack/texts/en_US.lang','publicSha256':hashlib.sha256(language).hexdigest(),
        'key':'craftingScreen.tab.allItems','value':all_items_label}
    for name in ['inventory_screen.json','ui_common.json','ui_template_tabs.json','ui_template_toggles.json','ui_template_buttons.json','_global_variables.json']:
        data=z.read('resource_pack/ui/'+name)
        assert parse(data)==parse(local[name]), name
        manifest['sources'][name]={'publicSha256':hashlib.sha256(data).hexdigest(),'installedSha256':hashlib.sha256(local[name]).hexdigest(),'parsedEqual':True}
        (cache/name).write_text(json.dumps(parse(data),indent=2),encoding='utf-8')
    for key,name in mapping.items():
        source='resource_pack/textures/ui/'+name+'.png'
        data=z.read(source)
        assert data==textures[name+'.png'],name
        asset={'source':source,'pinnedUrl':f'https://raw.githubusercontent.com/Mojang/bedrock-samples/{RELEASE}/{source}',
            'sha256':hashlib.sha256(data).hexdigest(),'dimensions':list(struct.unpack_from('>II',data,16)),'matchesInstalledBase':True}
        metadata_source='resource_pack/textures/ui/'+name+'.json'
        if metadata_source in z.namelist():
            metadata=z.read(metadata_source)
            assert parse(metadata)==parse(textures[name+'.json']),name
            asset['metadata']=parse(metadata)
            asset['metadataSha256']=hashlib.sha256(metadata).hexdigest()
        manifest['assets'][key]=asset
        (cache/(name+'.png')).write_bytes(data)
        css.append(f'  --mc-inv-screen-{key}: url("data:image/png;base64,{base64.b64encode(data).decode()}");')
css.append('}')
manifest['facts']={
    'armor':{'source':'crafting.player_armor_panel/armor_overlay/offhand_overlay','slot':[18,18],'overlay':[16,16],
        'armorGrid':[7,7,18,72],'offhand':[79,61,18,18],'emptyOverlayOpacity':1},
    'player':{'source':'crafting.survival_panel_top_half/player_inventory/common.inventory_panel',
        'root':[176,166],'previewBorder':[25,7,54,72],'previewBlack':[26,8,52,70],
        'craftInput':[96,18,36,36],'craftOutput':[152,26,18,18],'craftArrow':[134,29,16,13],
        'inventory':[7,86,162,54],'hotbar':[7,143,162,18],'craftingLabel':[81,7,66,10],
        'inventoryLabelVisible':False,'screenTitleVisible':False},
    'recipeSearch':{'source':'crafting.tab_content/search_and_filter_panel/common.text_edit_control/crafting.filter_toggle',
        'inputHeight':16,'filterSize':[29,17],'maxLength':30,'magnifier':[8,8],'magnifierOffset':[0,-.5],
        'centeringInset':[3,2],'textOffset':[10,0],'clearSize':[15,15],'clearOffset':[2,0],'textShadow':False},
    'categories':{'source':'crafting.tab_navigation_panel_layout/common_tabs.tab_top',
        'panelWidth':146,'panelHeight':23,'overlapHeight':4,'tabWidth':25,'surfaceHeight':27,'icon':[17,17],
        'nineSlice':4,'defaultOrder':['construction','equipment','items','nature','search']},
    'creative':{'source':'crafting.recipe_inventory_screen_content/recipe_book/tab_content/creative_hotbar_panel',
        'root':[326,166],'categoryTabs':[0,-23,146,27],'contentInset':6,'label':[9,8,309,10],
        'labelAlignment':'right','labelBinding':'#tab_label_text','searchLabelEnglish':all_items_label,'searchInput':[6,19,314,16],
        'itemsTop':21,'searchItemsTop':37,'hotbarBackground':[76,161,174,28],'hotbar':[82,165,162,18],
        'columnsAtBaseWidth':17,'paneBackground':'recipe_book_pane_bg','topShadowHeight':2,'topShadowAlpha':.5,
        'topOverlayHeight':1,'topOverlayColor':[.75,.75,.75],'scrollingGridFirstSlotX':7,'gridHorizontalAlignment':'center'},
    'toolbar':{'source':'crafting.toolbar_panel/common.layout_toggle/common.layout_template_toggle/common.help_button/common.light_close_button',
        'root':[126,20],'background':[0,-3,126,28],'creativePlacement':[200,-20],
        'modeBoxes':[[8,1,25,18],[35,1,25,18],[61,1,25,18]],'modeOrder':['creative','recipe-book','survival'],
        'modeGlyph':[19,13],'firstModeGlyphOffset':[11,3],'help':[90,2.5,15,15],
        'closeTarget':[102,-.5,21,21],'closeGlyph':[105,2.5,15,15]}}
manifest['nativeVerification']={'playerInventory':{'evidence':'User-owned local GUI-scale-5 lossless capture; not packaged or published.',
    'verifiedRegions':['armor/offhand grid placement','2x2 crafting and output placement','crafting arrow placement','inventory/hotbar placement'],
    'wholeFramePixelEquality':False},'creativeInventory':{'nativeCaptureVerified':True,
    'captureSha256':'87e291c862392affb9e1e797d506450759a19ede96374254baa87345e25be9d9',
    'captureGuiScale':5,'captureViewport':[2568,1400],'approximateRootOrigin':[476,282],
    'verifiedRegions':['326x166 body','17-column recipe grid','source toolbar placement','search input width','centered overlapping hotbar'],
    'wholeFramePixelEquality':False}}
manifest['boundaries']=[
    'Classic JSON UI source profile; no Ore runtime appearance claim.',
    'Textures are unmodified originals. Player preview is a caller-owned rendering slot; native live_player_renderer is not reconstructed.',
    'InventoryToolbar is a reusable original-source control. CreativeInventory includes full source chrome by default; chrome=none exposes the pane. PlayerInventoryScreen retains the separate survival pane with accessible hidden title/inventory label.',
    'Toolbar layout state and callbacks are real controls. The host owns switching inventory modes, help content and closing; this module does not invent missing inventory collections or game logic.',
    'CreativeInventory composes the source creative recipe-book pane, source toolbar and hotbar. The host supplies the current category item collection; client search filters only item names and preserves source indices in callbacks.',
    'Native GUI5 captures corroborate the documented geometry. Whole native screenshot RGBA equality, native font baselines, controller navigation and help/close disabled alpha are not certified; Web keyboard roving and help/close disabled alpha are explicit adaptations.',
    'ItemSlot item PNGs are caller-owned. Native 3D block, player, glint, flying-item, recipe-group and touch-mode renderers are not replaced by invented imagery.',
    'No inventory mutation or recipe eligibility engine is implemented; all slot actions and craftable filter state are host callbacks.'
]
(ROOT/'src/inventory-screen-textures.css').write_text('\n'.join(css)+'\n',encoding='utf-8')
(ROOT/'docs/inventory-screens-geometry.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('Verified',len(manifest['sources']),'JSON sources and',len(mapping),'inventory PNGs against the installed game.')
