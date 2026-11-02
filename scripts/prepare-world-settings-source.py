"""Generate a private, finite World Settings topology from pinned whole JSON.

No provider flags, ignored expressions, font metrics, slider domains or native
layout are evaluated. --check verifies byte-for-byte reproducible outputs.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / '.cache/references/bedrock-samples-v1.26.60.5-full.zip'
ARCHIVE_SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'
COMMIT = '15701fa9c13923f12662984c32c124327e40e3d3'
ORIGINAL = ROOT / '.cache/world-settings-source-study-20261103-01/original'
PINS = {
 'settings_screen.json': 'c7b429f87f79a68cf8f8d3eeecf0706a9e410bb73420580500e5b31e56ec9b5c',
 'settings_sections/world_section.json': '775671e146ce34d82ca655271fd679f2a654db9b503918a2c0c398270fd4edb4',
 'settings_sections/settings_common.json': '36863803c56e42d31b915aa9df13cf88cc43a528eb40c76cbf26c911ef7b3ecf',
 'ui_common.json': '0aae480d123b2c8667463776f8b0eabad665bc0378b287acd0babcf41d8083a6',
 'ui_template_buttons.json': '3e250faef134965386ced074d73c998d2a363c79fed14ec928668cb7ff70ea96',
 'ui_template_toggles.json': 'efe2bf9fab47aa5e29d7116a2aa705a964a42b0ef86c947c4e46188be9ac2a01',
 'ui_template_dialogs.json': 'de7b2ec43530715c797ab7ed2476965f9dc53962b88bc8c39a207582bee97264',
 '_global_variables.json': 'ea39206de2c7b6f157def5cdf1662767c0ccd9560dfafb1378c3c364b236f69b',
 '_ui_defs.json': 'b4f7f25b6ee4246b3582eb78a031ecc93793fdb2cf09f77b886d73f4038cb270',
 'store_common.json': '306f9f7e4bf69ebdeb3cccf4a76cc01aa26102d96273623ae5d7f99d81006557',
 'progress_screen.json': '2453144b1e4d98bcc56d63c014034dae50172f5e15989589a8dca2676599ee80',
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def jsonc(text):
    """Remove only comments/trailing commas, keeping character offsets intact."""
    chars = list(text)
    index = 0
    while index < len(text):
        if text[index] == '"':
            index += 1
            while index < len(text):
                if text[index] == '\\':
                    index += 2
                elif text[index] == '"':
                    index += 1
                    break
                else:
                    index += 1
        elif text.startswith('//', index) or text.startswith('/*', index):
            end = text.find('\n', index) if text.startswith('//', index) else text.find('*/', index + 2)
            if end < 0:
                if text.startswith('/*', index):
                    raise ValueError('Unterminated source comment.')
                end = len(text)
            elif text.startswith('/*', index):
                end += 2
            for pos in range(index, end):
                if chars[pos] not in '\r\n':
                    chars[pos] = ' '
            index = end
        else:
            index += 1
    clean = ''.join(chars)
    index = 0
    while index < len(clean):
        if clean[index] == '"':
            index += 1
            while index < len(clean):
                if clean[index] == '\\':
                    index += 2
                elif clean[index] == '"':
                    index += 1
                    break
                else:
                    index += 1
        elif clean[index] == ',':
            following = index + 1
            while following < len(clean) and clean[following].isspace():
                following += 1
            if following < len(clean) and clean[following] in '}]':
                chars[index] = ' '
            index += 1
        else:
            index += 1
    return ''.join(chars)


def pairs(entries):
    result = {}
    for key, value in entries:
        if key in result:
            raise ValueError('Duplicate original object key: ' + key)
        result[key] = value
    return result


def definitions(text, file):
    clean = jsonc(text)
    decoder = json.JSONDecoder(object_pairs_hook=pairs)
    value = decoder.decode(clean)
    index = clean.index('{') + 1
    nodes = {}
    while True:
        while clean[index].isspace() or clean[index] == ',':
            index += 1
        if clean[index] == '}':
            break
        start = index
        key, index = decoder.raw_decode(clean, index)
        while clean[index].isspace() or clean[index] == ':':
            index += 1
        _, end = decoder.raw_decode(clean, index)
        raw = text[start:end]
        nodes[key] = {'sourceFile': file, 'sourceKey': key,
                      'startByte': len(text[:start].encode('utf-8')),
                      'endByte': len(text[:end].encode('utf-8')),
                      'startLine': text.count('\n', 0, start) + 1,
                      'endLine': text.count('\n', 0, end) + 1,
                      'rawSHA256': sha(raw.encode('utf-8')), 'raw': raw, 'value': value[key]}
        index = end
    return value, nodes


def generate():
    if sha(ARCHIVE.read_bytes()) != ARCHIVE_SHA:
        raise ValueError('Fixed whole ZIP identity differs; no output written.')
    files, lookup, all_nodes = [], {}, {}
    with zipfile.ZipFile(ARCHIVE) as archive:
        for suffix, expected in PINS.items():
            file = 'resource_pack/ui/' + suffix
            raw = archive.read(file)
            if sha(raw) != expected or (ORIGINAL / file).read_bytes() != raw:
                raise ValueError('Whole original JSON mismatch: ' + file)
            value, nodes = definitions(raw.decode('utf-8'), file)
            namespace = value.get('namespace')
            files.append({'sourceFile': file, 'bytes': len(raw), 'sha256': expected,
                          'definitions': len(value) - int('namespace' in value)})
            if namespace:
                for key, node in nodes.items():
                    if key != 'namespace':
                        identity = namespace + '.' + key.split('@')[0]
                        if identity in lookup:
                            raise ValueError('Duplicate source definition: ' + identity)
                        lookup[identity] = node
                        all_nodes[identity] = node

    visited, unresolved = set(), set()

    def chain(base, namespace):
        result, seen = [], set()
        while base:
            qualified = base if '.' in base or base.startswith('$') else namespace + '.' + base
            if qualified.startswith('$') or qualified not in lookup:
                unresolved.add(qualified)
                result.append({'sourceControl': qualified, 'resolved': False})
                break
            if qualified in seen:
                raise ValueError('Source inheritance cycle: ' + qualified)
            seen.add(qualified)
            visited.add(qualified)
            node = lookup[qualified]
            result.append({'sourceControl': qualified, 'resolved': True,
                           'sourceKey': node['sourceKey'], 'sourceFile': node['sourceFile'],
                           'value': node['value']})
            base = node['sourceKey'].partition('@')[2]
            namespace = qualified.split('.')[0]
        return result

    def field_kind(source_id, base, value, ancestors, navigation=False):
        names = [base] + [x['sourceControl'] for x in ancestors]
        if navigation and any('section_toggle_base' in name for name in names):
            return 'navigation'
        if source_id == 'experimental_toggles':
            return 'experiments'
        if source_id == 'world_snapshot_image':
            return 'thumbnail'
        if navigation and source_id in ['play_or_create_panel', 'play_or_host_panel']:
            return 'launch'
        if value.get('$dropdown_content') == 'permissions.permission_level_dropdown_content':
            return 'permissions'
        if any('option_text_edit_' in name and ('with_button' in name or 'with_text_button' in name) for name in names):
            return 'text-action'
        for token, kind in [('option_text_edit', 'text'), ('option_dropdown', 'dropdown'),
                            ('option_slider', 'slider'), ('option_toggle', 'toggle'),
                            ('option_info_label', 'info'), ('cross_platform_warning_label', 'info'),
                            ('action_button', 'action'), ('option_group_label', 'label'),
                            ('selector_group_label', 'label')]:
            if any(token in name for name in names):
                return kind
        if base == 'play.open_account_setting_button':
            return 'action'
        if source_id == 'player_waypoints_selector':
            return 'radio'
        if any('radio_item_with_label' in name or 'radio_with_label' in name for name in names):
            return 'toggle'
        declared_type = value.get('type')
        if declared_type is None:
            declared_type = next((a['value'].get('type') for a in ancestors if a['resolved'] and 'type' in a['value']), None)
        if declared_type == 'label':
            return 'label'
        if declared_type == 'image':
            return 'divider' if 'divider' in source_id else 'unsupported'
        if declared_type in ['panel', 'stack_panel'] or value.get('controls') or base == 'common.empty_panel':
            if value.get('controls') or declared_type == 'stack_panel' or base in ['world_section.selector_pane_content', 'world_section.addons_selector_panel']:
                return 'stack'
            return 'spacer'
        return 'unsupported'

    def descriptors(controls, owner, file, path, navigation=False, list_name='controls'):
        output = []
        for index, wrapped in enumerate(controls):
            if not isinstance(wrapped, dict) or len(wrapped) != 1:
                raise ValueError('Source control wrapper must have one literal key.')
            key, value = next(iter(wrapped.items()))
            source_id, _, base = key.partition('@')
            identity = source_id or '$slot[' + str(index) + ']'
            control = owner + '/' + identity
            ancestors = chain(base, owner.split('.')[0])
            # Values below retain declared spellings, including |default. This
            # is provenance, not a variable evaluator or an engine merge model.
            declared = []
            for origin, record in [(control, value)] + [(a['sourceControl'], a['value']) for a in ancestors if a['resolved']]:
                binding_values = {k: v for k, v in record.items() if 'binding' in k and k != 'bindings'}
                if binding_values:
                    declared.append({'sourceControl': origin, 'values': binding_values})
            bindings = value.get('bindings', [])
            item = {'id': identity, 'sourceControl': control, 'sourceKey': key,
                    'order': index, 'kind': field_kind(source_id, base, value, ancestors, navigation),
                    'base': base or None}
            if declared:
                item['declaredBindings'] = declared
            if bindings:
                item['bindings'] = bindings
            for attribute in ['ignored', 'visible', 'enabled', 'variables']:
                if attribute in value:
                    item[attribute] = value[attribute]
            inherited_conditions = []
            for ancestor in ancestors:
                if ancestor['resolved']:
                    conditions = {k: ancestor['value'][k] for k in ['ignored', 'visible', 'enabled', 'variables'] if k in ancestor['value']}
                    if conditions:
                        inherited_conditions.append({'sourceControl': ancestor['sourceControl'], 'values': conditions})
            if inherited_conditions:
                item['inheritedConditions'] = inherited_conditions
            references = {}
            for prop in ['$control_name', '$dropdown_content', '$world_manipulation_controls|default']:
                if prop in value:
                    references[prop] = value[prop]
            for a in ancestors:
                if a['resolved']:
                    for prop in ['$control_name', '$dropdown_content']:
                        if prop in a['value'] and prop not in references:
                            references[prop] = a['value'][prop]
            if references:
                item['controlReferences'] = references
            # selectorStack supplies only the outer order/inclusion contract;
            # its world/addon targets have their own finite arrays below. The
            # unrelated controls/settings subtree is audited raw, not bundled.
            outer_navigation = navigation and owner == 'settings.selector_stack_panel'
            if 'controls' in value and not outer_navigation and item['kind'] not in ['thumbnail', 'navigation']:
                item['children'] = descriptors(value['controls'], control, file, path + [list_name, index, key], navigation)
            elif item['kind'] in ['launch', 'stack'] and not outer_navigation and source_id != 'player_waypoints_selector':
                for ancestor in ancestors:
                    if ancestor['resolved'] and ancestor['value'].get('controls'):
                        node = lookup[ancestor['sourceControl']]
                        item['children'] = descriptors(ancestor['value']['controls'], control, node['sourceFile'], [node['sourceKey']], navigation)
                        break
            ref = references.get('$control_name') if source_id == 'player_waypoints_selector' else references.get('$dropdown_content')
            if ref and ref in lookup:
                visited.add(ref)
                node = lookup[ref]
                if '$radio_buttons' in node['value']:
                    item['choices'] = descriptors(node['value']['$radio_buttons'], control + '/$radio_buttons', node['sourceFile'], [node['sourceKey']], list_name='$radio_buttons')
                elif source_id == 'player_waypoints_selector':
                    row_key = 'player_waypoints_toggle_row'
                    radios = node['value']['controls'][0][row_key]['controls']
                    # Preserve the actual instance names/order; the four-unit
                    # interstitial spacer is not a radio choice.
                    item['choices'] = [c for c in descriptors(radios, control + '/' + row_key, node['sourceFile'], [node['sourceKey'], 'controls', 0, row_key]) if c['kind'] == 'toggle']
            elif ref:
                unresolved.add(ref)
            if source_id == 'experimental_toggles':
                item['factory'] = value['factory']
                item['collectionName'] = value['collection_name']
                visited.add('world_section.experimental_toggle')
            evidence.append({'sourceControl': control, 'sourceFile': file,
                             'sourcePath': path + [list_name, index, key],
                             'literalId': source_id, 'raw': value, 'inheritance': ancestors,
                             'kind': item['kind']})
            output.append(item)
        return output

    evidence = []

    def group(identity, navigation=False):
        visited.add(identity)
        node = lookup[identity]
        return descriptors(node['value']['controls'], identity, node['sourceFile'], [node['sourceKey']], navigation)

    game = group('world_section.game_section')
    multiplayer = group('world_section.multiplayer_section')
    nav = {'selectorStack': group('settings.selector_stack_panel', True),
           'worldSelector': group('world_section.selector_pane_content', True),
           'addonsSelector': group('world_section.addons_selector_panel', True)}
    profile_map = {'create': 'settings.screen_world_create', 'template-create': 'settings.screen_template_create',
                   'edit': 'settings.screen_world_edit'}
    profiles = {}
    for name, identity in profile_map.items():
        node = lookup[identity]
        visited.add(identity)
        ancestors = chain(node['sourceKey'].partition('@')[2], 'settings')
        profiles[name] = {'sourceControl': identity, 'sourceKey': node['sourceKey'],
                          'variables': node['value'], 'base': 'settings.settings_screen_base'}
    assert len(game) == 69 and len(multiplayer) == 8
    assert len({x['id'] for x in game}) == 69
    assert [x['id'] for x in game[17]['choices']] == ['world_survival_mode_toggle', 'world_creative_mode_toggle', 'world_adventure_mode_toggle']
    assert game[20]['choices'][0]['id'] == '$slot[0]'
    assert game[33]['kind'] == 'radio' and game[49]['kind'] == 'experiments'
    assert multiplayer[2]['ignored'] == '(not $is_xboxlive_enabled)'
    data = {'profiles': profiles, 'navigation': nav, 'game': game, 'multiplayer': multiplayer}
    # These source declarations are audited without expanding the public
    # implementation scope or pretending their host-driven state is resolved.
    supplementary = {name: group('world_section.' + name) for name in ['edu_cloud_section', 'debug_section']}
    referenced_subtrees = {name: group('world_section.' + name) for name in
                           ['edit_world_manipulation_buttons', 'editor_edit_world_manipulation_buttons_content',
                            'player_waypoints_option_control']}
    # All 43 authored world templates remain raw audit evidence, including
    # literal control-reference alternatives. They do not enlarge runtime data.
    for identity, node in lookup.items():
        if identity.startswith('world_section.'):
            visited.add(identity)
            chain(node['sourceKey'].partition('@')[2], 'world_section')
    for name in ['section_content_panels', 'section_header_panels', 'section_footer_panels']:
        visited.add('settings.' + name)
    unresolved.add('classroom_settings.classroom_section')
    manifest = {'schemaVersion': 1, 'sourceCommit': COMMIT, 'archiveSHA256': ARCHIVE_SHA,
                'status': 'fixed-source-topology-only-native-and-provider-resolution-unqualified',
                'sources': files, 'counts': {'gameDirect': 69, 'multiplayerDirect': 8,
                                           'worldSelectorDirect': 17, 'addonsSelectorDirect': 5},
                'identityPolicy': 'definition/instance path; @base retained separately as sourceKey; empty literal IDs use $slot[index], not invented native IDs',
                'kindPolicy': 'Semantic adapter to SettingsFieldRow kinds, not an assertion that its kernel supports every source subtree. Composite containers remain stack; unknown paint stays unsupported.',
                'variablePolicy': 'Original values/expressions/|default spelling only. No truth evaluation, host geometry, localization, native font, game-rule or slider domain defaults.',
                'childPolicy': 'Authored inline children, inherited structural container children, dropdown radio declarations, and explicit Waypoints content. Generic field state-paint subtrees remain in inheritance evidence.',
                'unresolvedReferences': sorted(unresolved), 'topology': data,
                'supplementaryDirectControls': supplementary, 'referencedSubtrees': referenced_subtrees,
                'controls': evidence,
                'definitions': {key: all_nodes[key] for key in sorted(visited) if key in all_nodes},
                'boundaries': ['Non-world settings branches in selectorStack are preserved as declarations, not implemented by this module.',
                               'Permissions, pause warning-label and play account-button bases outside the 11-file source set remain explicit external references.',
                               'Conditional Education, Editor, Debug, template, platform and provider branches are not filtered out by create/edit names.',
                               'Commented spectator/world-mode declarations are excluded by JSONC parsing. No engine expression is executed.',
                               'All hidden/ignored/enabled decisions and resolved intrinsic sizes must come from a complete explicit host snapshot.']}
    types = '''// Generated by scripts/prepare-world-settings-source.py; do not edit.
// Private finite topology. Complete raw source and inheritance: docs/world-settings-source.json.
export type WorldSettingsSourceJson = null | boolean | number | string | readonly WorldSettingsSourceJson[] | {readonly [key:string]:WorldSettingsSourceJson};
export type WorldSettingsSourceKind = 'label'|'info'|'spacer'|'divider'|'stack'|'toggle'|'radio'|'text'|'text-action'|'dropdown'|'slider'|'permissions'|'action'|'experiments'|'unsupported'|'navigation'|'thumbnail'|'launch';
export interface WorldSettingsSourceControl {
  readonly id:string; readonly sourceControl:string; readonly sourceKey:string; readonly order:number;
  readonly kind:WorldSettingsSourceKind; readonly base:string|null;
  readonly declaredBindings?:readonly {readonly sourceControl:string;readonly values:Readonly<Record<string,WorldSettingsSourceJson>>}[];
  readonly bindings?:readonly WorldSettingsSourceJson[];
  readonly ignored?:WorldSettingsSourceJson; readonly visible?:WorldSettingsSourceJson; readonly enabled?:WorldSettingsSourceJson;
  readonly variables?:WorldSettingsSourceJson;
  readonly inheritedConditions?:readonly {readonly sourceControl:string;readonly values:Readonly<Record<string,WorldSettingsSourceJson>>}[];
  readonly controlReferences?:Readonly<Record<string,string>>;
  readonly children?:readonly WorldSettingsSourceControl[]; readonly choices?:readonly WorldSettingsSourceControl[];
  readonly factory?:WorldSettingsSourceJson; readonly collectionName?:string;
}
export interface WorldSettingsSourceProfile {
  readonly sourceControl:string;readonly sourceKey:string;readonly variables:Readonly<Record<string,WorldSettingsSourceJson>>;readonly base:string;
}
export interface WorldSettingsSourceTopology {
  readonly profiles:Readonly<Record<'create'|'template-create'|'edit',WorldSettingsSourceProfile>>;
  readonly navigation:Readonly<Record<'selectorStack'|'worldSelector'|'addonsSelector',readonly WorldSettingsSourceControl[]>>;
  readonly game:readonly WorldSettingsSourceControl[];readonly multiplayer:readonly WorldSettingsSourceControl[];
}
function freezeSource<T>(value:T):T {
  if(value!==null&&typeof value==='object') { for(const child of Object.values(value)) freezeSource(child); Object.freeze(value); }
  return value;
}
export const worldSettingsSource:WorldSettingsSourceTopology = freezeSource<WorldSettingsSourceTopology>('''
    module = types + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ''');
export const worldSettingsGameControls:readonly WorldSettingsSourceControl[] = worldSettingsSource.game;
export const worldSettingsMultiplayerControls:readonly WorldSettingsSourceControl[] = worldSettingsSource.multiplayer;
export const worldSettingsNavigation = worldSettingsSource.navigation;
'''
    return {'src/world-settings-source.ts': module.encode('utf-8'),
            'docs/world-settings-source.json': (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode('utf-8')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    outputs = generate()
    for name, data in outputs.items():
        path = ROOT / name
        if args.check:
            if not path.is_file() or path.read_bytes() != data:
                raise ValueError('Generated source output differs: ' + name)
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
    print(json.dumps({'status': 'CHECK_PASS' if args.check else 'GENERATED',
                      'archiveSHA256': ARCHIVE_SHA,
                      'outputs': {name: {'bytes': len(data), 'sha256': sha(data)} for name, data in outputs.items()}}))


if __name__ == '__main__':
    main()
