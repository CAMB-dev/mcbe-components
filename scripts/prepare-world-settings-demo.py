"""Build explicit Web demonstration snapshots, not Minecraft defaults.

Canonical identities come from the generated source schema. Localization comes
from the pinned whole official lang file. No native intrinsic is measured here.
"""
from pathlib import Path
import ast, argparse, hashlib, json, re, zipfile

ROOT=Path(__file__).resolve().parent.parent
ARCHIVE=ROOT/'.cache/references/bedrock-samples-v1.26.60.5-full.zip'
ARCHIVE_SHA='d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'
LANG='resource_pack/texts/zh_CN.lang'
LANG_SHA='bb7a3ebfc5d655b4f77c88fff837f7e604d2767c67e7f268c408d5e216d58c89'

def sha(b):return hashlib.sha256(b).hexdigest()
def dumps(x):return json.dumps(x,ensure_ascii=False,indent=2)
def walk(nodes):
    for n in nodes:
        yield n
        yield from walk(n.get('children',[]))

def conditions(expressions,flags):
    def visit(node):
        if isinstance(node,ast.Name):return flags[node.id]
        if isinstance(node,ast.UnaryOp) and isinstance(node.op,ast.Not):return not visit(node.operand)
        if isinstance(node,ast.BoolOp) and isinstance(node.op,(ast.And,ast.Or)):
            values=[visit(n) for n in node.values]
            return all(values) if isinstance(node.op,ast.And) else any(values)
        raise ValueError('Demo fixture condition is outside the audited boolean subset.')
    return {expr:visit(ast.parse(re.sub(r'\$([a-z_]+)',r'\1',expr),mode='eval').body) for expr in expressions}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    assert sha(ARCHIVE.read_bytes())==ARCHIVE_SHA
    with zipfile.ZipFile(ARCHIVE) as z:
        raw=z.read(LANG)
        artwork={name:z.read('resource_pack/textures/ui/'+name) for name in ['WorldDemoScreen.png','missing_pack_icon.png']}
        artwork['LICENSE.md']=z.read('LICENSE.md')
    assert sha(raw)==LANG_SHA
    localized={}
    for line in raw.decode('utf-8-sig').splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            key,value=line.split('=',1);localized[key]=value.split('##',1)[0].rstrip().replace('\\n','\n')
    source=ROOT/'docs/world-settings-fields-source.json';schema=json.loads(source.read_text(encoding='utf-8'))
    missing={f:[k for k in schema['strings'][f] if k not in localized] for f in ['game','multiplayer']}
    def metric(shape,spec):
        result={}
        for key,kind in shape.items():
            if kind=='number':result[key]=120 if key=='popupHeight' else 12 if key=='controlY' else 0 if key=='descriptionHeight' else 100 if key=='resolvedWidth' else 10
            elif kind=='string':result[key]='原版可选项'
            elif kind=='placement':result[key]='below'
            elif kind=='sliderWeb':result[key]={'value':4,'min':0,'max':8,'step':1,'markers':[]}
            elif kind=='radioVisuals':result[key]=[{'height':14,'y':1.5,'labelHeight':10}]*2
            elif kind=='pair':result[key]=[24,24]
            elif kind=='shadow':result[key]={'offset':[1,1],'color':'#000'}
            elif kind=='permissionHeights':result[key]={role:50 if key=='choiceHeights' else 30 for role in ['visitor','member','operator']}
            elif kind=='imageOrNull':result[key]=None
            else:raise ValueError(kind)
        if spec.get('oneLine') and spec['kind']=='toggle':result['controlY']=2
        if spec.get('kind')=='info':result.update(textHeight=24,panelHeight=30)
        if spec.get('kind')=='label' and any(t in spec['key'] for t in ['panel_text','header_description','experimental_toggles_label_info']):result['textHeight']=24
        return result
    bases={};conds={}
    for family in ['game','multiplayer']:
        specs={n['key']:n for n in walk(schema['groups'][family])}
        metrics={key:metric(shape,specs[key]) for key,shape in schema['metrics'][family].items()}
        def estimate(spec):
            m=metrics[spec['key']];kind=spec['kind'];children=spec.get('children',[])
            child_heights=[estimate(c) for c in children]
            if spec.get('option'):
                control=16 if kind in ['toggle','slider'] else 68 if kind=='radio' else m.get('panelHeight',30) if kind in ['panel','info'] else 30
                if kind=='panel':m['panelHeight']=max([32,*child_heights]);control=m['panelHeight']
                height=m['controlY']+control+4
            elif kind=='label':height=m['textHeight']
            elif kind=='action':height=30
            elif kind=='info':height=m['textHeight']+6
            elif kind=='experiments':height=0
            elif kind in ['panel','stack']:
                height=sum(child_heights) if kind=='stack' and spec.get('orientation')=='vertical' else max([0,*child_heights])
                source_y=spec['size'][1] if len(spec['size'])>1 else None
                extra=re.search(r'%c\s*\+\s*([0-9.]+)px',str(source_y));height+=float(extra[1]) if extra else 0
            else:height=4
            source_y=spec['size'][1] if len(spec['size'])>1 else None
            if isinstance(source_y,(int,float)):height=source_y
            if 'height' in m:m['height']=height
            return height
        for item in schema['groups'][family]:estimate(item)
        bindings={k:(k.endswith('_enabled') or k.endswith('_enabled_on')) if typ=='boolean' else '' if typ=='string' else 0 for k,typ in schema['bindings'][family].items()}
        if family=='game':
            overrides={'#world_name':'像素世界','#world_seed':'12345','#random_tick_speed':'1','#respawn_radius':'10','#minimum_template_version':'1.0.0',
                '#player_game_mode_dropdown_visible':True,'#show_permissions_dropdown':True,'#world_game_mode_radio_survival':True,'#player_game_mode_radio_default':True,'#world_type_radio_infinite':True,'#world_difficulty_radio_normal':True,'#permission_level_radio_member':True,'#player_waypoints_everyone':True,
                '#server_sim_distance':4,'#server_sim_distance_steps':4,'#server_sim_distance_text_value':'4','#server_sim_distance_slider_label':'模拟距离',
                '#player_sleep_percentage':4,'#player_sleep_percentage_steps':4,'#player_sleep_percentage_text_value':'100%','#player_sleep_percentage_slider_label':'玩家睡眠百分比',
                '#world_game_mode_dropdown_toggle_label':localized['createWorldScreen.gameMode.survival'],'#player_game_mode_dropdown_toggle_label':localized['createWorldScreen.gameMode.serverDefault'],
                '#world_difficulty_dropdown_toggle_label':'普通','#world_type_dropdown_toggle_label':'无限','#player_permissions_dropdown_toggle_label':localized['permissions.level.member']}
        else:
            overrides={'#multiplayer_game':True,'#server_visible':True,'#can_be_server_visible':True,'#xbl_show_broadcast_dropdown':True,'#xbl_broadcast_friends_only':True,'#platform_broadcast_friends_only':True,
                '#xbl_broadcast_dropdown_toggle_label':'好友','#platform_broadcast_dropdown_toggle_label':'好友'}
        for key,value in overrides.items():
            if key in bindings:bindings[key]=value
        base={'bindings':bindings,'strings':{key:localized.get(key,'宿主文本缺失：'+key) for key in schema['strings'][family]},'metrics':metrics,
              'layoutPolicy':{'unresolvedPanelAnchor':'top-left','unresolvedStackCrossAlignment':'start'}}
        if family=='game':
            base['experiments']=[{'id':f'host-example-{i}','index':i,'#experimental_toggle_value':False,'#experimental_toggle_enabled':True,'#show_experimental_toggle':True,'#experimental_toggle_text':f'宿主实验示例 {i+1}',
                'metrics':{'height':24,'labelHeight':10,'descriptionHeight':0,'controlY':2}} for i in range(2)]
            bindings['#experimental_toggle_count']=2
            metrics['world_section.game_section/experimental_toggles']['height']=48
        bases[family]=base;conds[family]={}
        for mode in ['create','template-create','edit']:
            flags=dict(desktop_screen=True,education_edition=False,is_editor_mode_enabled=False,is_publish=True,is_world_create=mode=='create',is_seeds_enabled=True,is_pregame=True,is_world_edit=mode=='edit',trial=False,pocket_edition=False,education_ios=False,file_picking_supported=True,export_disabled=False,is_mp_client=False,export_template_disabled=False,nx_os=False,is_ps4=False,is_xboxlive_enabled=True)
            conds[family][mode]=conditions(schema['conditions'][family],flags)
    text="// Generated by scripts/prepare-world-settings-demo.py. Explicit Web examples, never game defaults.\n"
    text+=f"// Whole zh_CN SHA256 {LANG_SHA}; source schema SHA256 {sha(source.read_bytes())}.\n"
    text+="import type{WorldGameSettingsSnapshot,WorldMultiplayerSettingsSnapshot}from'../src/world-settings-fields-model';\nimport type{WorldSettingsMode}from'../src/world-settings-actions';\n"
    for family,name,typ in [('game','gameBase','WorldGameSettingsSnapshot'),('multiplayer','multiplayerBase','WorldMultiplayerSettingsSnapshot')]:
        text+=f"const {name}={dumps(bases[family])} satisfies Omit<{typ},'conditions'>;\n"
        text+=f"const {family}Conditions={dumps(conds[family])} satisfies Readonly<Record<WorldSettingsMode,{typ}['conditions']>>;\n"
    groups={f:[{'faceBinding':n.get('faceBinding'), 'choices':[{'binding':c['binding'],'label':bases[f]['strings'][c['label']]} for c in n.get('choices',[])]} for n in walk(schema['groups'][f]) if n['kind'] in ['dropdown','radio','permissions']] for f in ['game','multiplayer']}
    sliders=[{'binding':n['binding'],'key':n['key'],'textBinding':n['textBinding']} for n in walk(schema['groups']['game']) if n['kind']=='slider']
    text+=f"export const worldSettingsDemoChoiceGroups={dumps(groups)} as const;\nexport const worldSettingsDemoSliders={dumps(sliders)} as const;\n"
    text+="export function createWorldSettingsDemoData(mode:WorldSettingsMode):{game:WorldGameSettingsSnapshot;multiplayer:WorldMultiplayerSettingsSnapshot}{return{game:{...gameBase,bindings:{...gameBase.bindings},conditions:gameConditions[mode]},multiplayer:{...multiplayerBase,bindings:{...multiplayerBase.bindings},conditions:multiplayerConditions[mode]}};}\n"
    target=ROOT/'demo/world-settings-model-data.ts';data=text.encode('utf-8')
    if args.check:assert target.read_bytes()==data
    else:target.write_bytes(data)
    art_dir=ROOT/'demo/assets/world-settings'
    if not args.check:art_dir.mkdir(parents=True,exist_ok=True)
    for name,payload in artwork.items():
        destination=art_dir/name
        if args.check:assert destination.read_bytes()==payload
        else:destination.write_bytes(payload)
    print(dumps({'status':'PASS_CHECK' if args.check else 'GENERATED_WEB_EXAMPLE_DATA','missingLocalization':missing,'bytes':len(data),'sha256':sha(data),'nativeDefaults':False}))

if __name__=='__main__':main()
