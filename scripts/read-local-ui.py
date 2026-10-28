"""Read selected local Bedrock archive entries for fidelity research only.

Usage: python scripts/read-local-ui.py 'C:/XboxGames/Minecraft for Windows/Content'
Reads the install; writes ignored caches and docs/local-reference.json provenance.
"""
from pathlib import Path
import hashlib
import json
import struct
import sys
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parent.parent
game = Path(sys.argv[1]).resolve(strict=True)
archive_root = game / 'data/resource_packs/vanilla/__brarchive'
mapping = json.loads((root / 'scripts/classic-reference-map.json').read_text())
ui_names = {'_global_variables.json', 'ui_common.json', 'ui_template_buttons.json',
            'ui_template_toggles.json', 'ui_template_tabs.json', 'settings_screen.json',
            'ui_template_dialogs.json', 'popup_dialog.json', 'grindstone_screen.json', 'enchanting_screen.json',
            'inventory_screen.json', 'furnace_screen.json', 'blast_furnace_screen.json', 'smoker_screen.json'}
texture_names = {config['file'] + extension for config in mapping.values() for extension in ('.png', '.json')}

def entries(path):
    data = path.read_bytes()
    count, version = struct.unpack_from('<II', data, 8)
    assert version == 1 and 0 < count < 100000, 'Unsupported archive table'
    base = 16 + count * 256
    assert base <= len(data)
    for i in range(count):
        record = data[16 + i*256:16 + (i+1)*256]
        length = record[0]
        assert 0 < length < 248
        name = record[1:1+length].decode('utf-8')
        offset, size = struct.unpack_from('<II', record, 248)
        assert base + offset + size <= len(data)
        if Path(name).name != name:
            continue
        yield name, data[base+offset:base+offset+size]

comparison = {}
archives = []
for archive, wanted, folder in [
    (archive_root/'ui.brarchive', ui_names, root/'.cache/game-ui'),
    (archive_root/'ui/settings_sections.brarchive', {'settings_common.json'}, root/'.cache/game-ui'),
    (archive_root/'textures/ui.brarchive', texture_names, root/'.cache/current-references'),
]:
    archives.append({'path':str(archive.relative_to(game)).replace('\\','/'),'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()})
    folder.mkdir(parents=True, exist_ok=True)
    for name, data in entries(archive):
        if name not in wanted:
            continue
        target = folder/name
        if name.endswith('.json'):
            parsed = json.loads(data)
            target.write_text(json.dumps(parsed, indent=2, ensure_ascii=False), encoding='utf-8')
        else:
            target.write_bytes(data)
        reference = root/'.cache/references'/name
        if reference.exists():
            equal = json.loads(data) == json.loads(reference.read_bytes()) if name.endswith('.json') else data == reference.read_bytes()
            comparison[name] = {'equal': equal, 'sha256': hashlib.sha256(data).hexdigest()}
(root/'.cache/current-reference-comparison.json').write_text(json.dumps(comparison, indent=2), encoding='utf-8')
def definitions(name):
    return {key.split('@')[0]:value for key,value in json.loads((root/'.cache/game-ui'/name).read_text(encoding='utf-8')).items()}
common = definitions('ui_common.json')
buttons = definitions('ui_template_buttons.json')
settings = definitions('settings_common.json')
variables = definitions('_global_variables.json')
content = settings['default_options_dropdown_toggle_button_state_content']
facts = {
    'containerRootSize':common['root_panel']['size'],
    'containerSlotSize':common['container_item']['size'],
    'containerItemSize':common['container_item']['$item_renderer_size|default'],
    'containerCellTexture':common['cell_image']['texture'],
    'containerSelectedTexture':common['cell_image_selected']['texture'],
    'containerStackCountOffset':common['stack_count_label']['offset'],
    'containerDurabilitySize':common['durability_bar']['$durability_bar_size|default'],
    'containerDurabilityOffset':common['durability_bar']['$durability_bar_offset|default'],
    'containerHotbarSize':common['hotbar_grid_template']['size'],
    'containerHotbarOffset':common['hotbar_grid_template']['offset'],
    'panelTexture':common['dialog_background_opaque']['texture'],
    'dialogTexture':definitions('ui_template_dialogs.json')['main_panel_no_buttons']['$custom_background|default'],
    'dialogTitleOffset':definitions('popup_dialog.json')['modal_title_text']['$title_text_offset|default'],
    'dialogBackdropAlpha':definitions('popup_dialog.json')['modal_input_panel']['controls'][0]['black_tint_image@popup_dialog.black_tint_image']['alpha'],
    'dialogCloseHitSize':common['close_button']['size'],
    'dialogCloseImageSize':common['close_button']['$close_button_panel_size|default'],
    'progressSize':common['progress_bar']['size'],
    'progressTextureEmpty':common['empty_progress_bar']['texture'],
    'progressTextureFilled':common['filled_progress_bar']['texture'],
    'checkboxSize':common['checkbox_image']['size'],
    'radioSize':definitions('ui_template_toggles.json')['radio_on_icon']['size'],
    'sliderThumbSize':common['slider']['$slider_box_size|default'],
    'sliderTrackHeight':settings['option_slider_control']['controls'][0]['slider@common.slider']['size'][1],
    'buttonPressedOffset':buttons['light_text_button']['$button_pressed_offset|default'],
    'buttonTemplateShadow':common['new_button_label']['shadow'],
    'dropdownHeight':settings['option_dropdown_control']['$option_dropdown_size|default'][1],
    'dropdownHorizontalPadding':content['$options_dropdown_toggle_left_padding|default'][0],
    'dropdownChevronSize':content['controls'][4]['arrow_panel']['controls'][0]['dropdown_chevron_image']['size'],
    'dropdownColors':{name:variables['$dropdown_radio_background_'+name+'_color'] for name in ['unchecked','checked','hover']},
}
version = ET.parse(game/'MicrosoftGame.Config').getroot().find('Identity').attrib['Version']
summary = {'installedVersion':version,'referenceCommit':'46ba6ea985fb5a92d79a9419198f10dda14c199d',
           'archives':archives,'factsInGamePixels':facts,'assetComparison':{'entries':len(comparison),'differences':sum(not row['equal'] for row in comparison.values())}}
(root/'docs/local-reference.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
print(f'Compared {len(comparison)} local entries with pinned reference: {sum(not row["equal"] for row in comparison.values())} differences.')
