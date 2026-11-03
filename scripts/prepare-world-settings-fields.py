"""Finite source-owned Game69 / Multiplayer8 / Cloud5 / Debug7 schema; no game/provider/native layout inference."""
from pathlib import Path
import argparse,hashlib,importlib.util,json,zipfile
ROOT=Path(__file__).resolve().parent.parent
s=importlib.util.spec_from_file_location('topology',ROOT/'scripts/prepare-world-settings-source.py');g=importlib.util.module_from_spec(s);s.loader.exec_module(g)

def generate():
 archive=ROOT/'.cache/references/bedrock-samples-v1.26.60.5-full.zip'
 if hashlib.sha256(archive.read_bytes()).hexdigest()!=g.ARCHIVE_SHA:raise ValueError('Fixed ZIP changed')
 lookup={};files={};used=set()
 with zipfile.ZipFile(archive)as z:
  for name in z.namelist():
   if name.startswith('resource_pack/ui/')and name.endswith('.json'):
    raw=z.read(name)
    try:p=json.loads(g.jsonc(raw.decode('utf-8-sig')))
    except (ValueError,UnicodeError):continue
    ns=p.get('namespace')
    if ns:
     for k,v in p.items():
      if k!='namespace':lookup[ns+'.'+k.split('@')[0]]=(name,k,v)
     files[name]={'sourceFile':name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
 def chain(base,ns):
  out=[];seen=set()
  while base:
   b=base if '.'in base else ns+'.'+base
   if b not in lookup:raise ValueError('Unresolved '+b)
   if b in seen:raise ValueError('Cycle '+b)
   seen.add(b);used.add(b);f,k,v=lookup[b];out.insert(0,(b,v));base=k.partition('@')[2];ns=b.split('.')[0]
  return out
 def merged(base,raw,ns):
  records=chain(base,ns)if base else[];e={};variables=[]
  for _,v in records+[('',raw)]:
   for k,value in v.items():
    if k=='variables':variables.extend(value if isinstance(value,list)else[value])
    elif k.endswith('|default'):e.setdefault(k[:-8],value)
    else:e[k]=value
  return e,variables,[n for n,_ in records]
 core,_c,_=merged('settings_common.option_generic_core',{},'settings_common')
 def resolve(value,scope,seen=()):
  if isinstance(value,str)and value.startswith('$')and value in scope and value not in seen:return resolve(scope[value],scope,seen+(value,))
  if isinstance(value,list):return[resolve(v,scope,seen)for v in value]
  return value
 groups={};allBindings={};allStrings={};allConditions={};allMetrics={}
 def group(name,source):
  binds={};strings=set();conditions=set();metrics={};nodes=[]
  def binding(value,kind):
   if not isinstance(value,str)or not value.startswith('#'):raise ValueError('Unresolved binding '+str(value))
   if value in binds and binds[value]!=kind:raise ValueError('Binding kind conflict '+value)
   binds[value]=kind;return value
  def text(value):
   if not isinstance(value,str):raise ValueError('Unresolved text '+str(value))
   if value.startswith('#'):binding(value,'string')
   elif value:
    if name=='debug':return {'literal':value}
    strings.add(value)
   return value
  def condition(v):
   if not isinstance(v,bool):
    if not isinstance(v,str):raise ValueError('Invalid source condition '+str(v))
    conditions.add(v)
   return v
  def node(key,raw,owner,scope,forceIgnored=None):
   literal,_,base=key.partition('@');literal=literal or '$slot[0]';path=owner+'/'+literal
   e,variables,ancestors=merged(base,raw,'world_section');local={k:v for k,v in e.items()if k.startswith('$')};vs={k:v for k,v in core.items()if k.startswith('$')};vs.update(scope)
   # Local explicit variables override inherited defaults, while inherited defaults do not shadow parent variables.
   for a in ancestors:
    for k,v in lookup[a][2].items():
     if k.startswith('$'):
      if k.endswith('|default'):vs.setdefault(k[:-8],v)
      else:vs[k]=v
   for k,v in raw.items():
    if k.startswith('$'):
     if k.endswith('|default'):vs.setdefault(k[:-8],v)
     else:vs[k]=v
   # Core defaults are inherited by option_generic's referenced control, not its root chain.
   for k,v in local.items():vs.setdefault(k,v)
   if path.endswith('/option_text_edit_0')or path.endswith('/option_text_edit_1'):
    # Literal alternate localization follows the actual game_section conditional variable.
    vs['$world_name_label']={'condition':'$is_editor_mode_enabled','yes':'selectWorld.editor.enterName','no':'selectWorld.enterName'};conditions.add('$is_editor_mode_enabled');strings.update(['selectWorld.editor.enterName','selectWorld.enterName'])
   def r(k,default=None):return resolve(e.get(k,vs.get(k,default)),vs)
   def rv(k,default=None):return resolve(vs.get(k,default),vs)
   typ=e.get('type');names=ancestors+[base];kind=None
   if literal=='experimental_toggles':kind='experiments'
   elif literal=='player_waypoints_selector':kind='radio'
   elif rv('$dropdown_content')=='permissions.permission_level_dropdown_content':kind='permissions'
   else:
    for token,knd in [('option_text_edit_with','text-action'),('option_text_edit_mock_with','text-action'),('option_text_edit','text'),('option_dropdown','dropdown'),('option_slider','slider'),('option_toggle','toggle'),('option_info_label','info')]:
     if any(token in a for a in names):kind=knd;break
   if not kind:
    if typ=='label':kind='label'
    elif base=='edu_common.underline_button':kind='underline-action'
    elif typ=='image':kind='divider'if'divider'in literal else'image'
    elif any('action_button'in a for a in names)or base in ['world_section.export_world_button','world_section.delete_world_button','world_section.copy_world_button','world_section.export_template_button','play.open_account_setting_button']:kind='action'
    elif typ=='stack_panel':kind='stack'
    elif typ=='panel':kind='panel'if e.get('controls')else'spacer'
    else:raise ValueError('Unsupported '+path+' '+str(typ)+' '+str(base))
   option=any(a=='settings_common.option_generic'for a in names)
   state={k:condition(r(k,default))for k,default in [('ignored',False),('visible',True),('enabled',True)]}
   if forceIgnored is not None:state['ignored']=condition(forceIgnored)
   textOverride=None
   for b in resolve(e.get('bindings',[]),vs):
    if not isinstance(b,dict):raise ValueError('Unresolved bindings '+path+' '+str(b))
    dest=b.get('binding_name_override')
    if dest=='#text'and b.get('binding_type','global')!='none':textOverride=binding(resolve(b['binding_name'],vs),'string')
    if dest in ['#visible','#enabled']and b.get('binding_type','global')not in ['view','none']:
     state[dest[1:]]=binding(resolve(b['binding_name'],vs),'boolean')
   enabled=rv('$option_enabled_binding_name','')
   if option and enabled:state['enabled']=binding(enabled,'boolean')
   sourceControl=path
   for prefix,origin in [('/button_panel/editor/content','world_section.editor_edit_world_manipulation_buttons_content'),('/button_panel/editor','world_section.editor_edit_world_manipulation_buttons'),('/button_panel/normal','world_section.edit_world_manipulation_buttons')]:
    marker='world_section.game_section'+prefix
    if path.startswith(marker):sourceControl=origin+path[len(marker):];break
   prop={'key':path,'id':path,'sourceControl':sourceControl,'kind':kind,'sourceType':typ,'sourceKey':key,'origins':ancestors,'state':state,'size':r('size',['100%','100%c']),'offset':r('offset',[0,0]),'anchor':r('anchor_from',None),'option':option}
   metric={}
   size=prop['size']
   if not isinstance(size,list):size=['100%','100%c'];prop['size']=size
   if not isinstance(size[1],(int,float)) and not(isinstance(size[1],str)and __import__('re').fullmatch(r'[0-9.]+(?:px)?',size[1])):metric['height']='number'
   if not(isinstance(size[0],(int,float))or isinstance(size[0],str)and __import__('re').fullmatch(r'[0-9.]+(?:px|%\s*(?:[+-]\s*[0-9.]+px)?)?',size[0])):metric['resolvedWidth']='number'
   if option:
    metric.update(labelHeight='number',descriptionHeight='number',controlY='number')
    label=rv('$option_label','')
    for conditional in variables:
     if '$option_label'in conditional:
      condition(conditional['requires']);yes=resolve(conditional['$option_label'],vs);text(yes)
      if not isinstance(label,str):raise ValueError('Nested option label conditional '+path)
      text(label);label={'condition':conditional['requires'],'yes':yes,'no':label}
    if isinstance(label,dict):prop['label']=label
    else:prop['label']=text(label)
    prop.update(showLabel=rv('$show_option_label',True),description=text(rv('$option_description',''))if rv('$has_option_description',False)else None,oneLine=kind=='toggle',labelAlignment=rv('$option_label_alignment','left'))
    if kind=='toggle':conditions.add('$desktop_screen')
   if kind=='label':
    prop['color']='rgb(70% 70% 70%)'if r('color')=='$option_description_text_color'else'#fff';prop.update(text=text(textOverride or r('text',rv('$text',''))),profile='header'if any('header'in a for a in names)else'group'if any('group_label'in a for a in names)else'plain');metric['textHeight']='number'
   elif kind=='underline-action':
    prop.update(text=text(rv('$single_line_label_text','')),target=rv('$pressed_button_name'),profile='education-cloud');metric.update(stateWidth='number',labelPanelSize='pair',labelSize='pair');used.update(['edu_common.underline_text','common.single_line_label','common.underline'])
   elif kind=='image':
    if r('texture')!='textures/ui/icon_external_link':raise ValueError('Unsupported image source '+str(r('texture')))
    prop['texture']=r('texture')
   elif kind=='info':
    prop['binding']=binding(rv('$container_text_binding_name'),'string');metric.update(textHeight='number',panelHeight='number')
   elif kind=='divider':prop['inset']=15 if size[0]=='100% - 30px' else 0
   elif kind=='toggle':
    prop.update(binding=binding(rv('$option_binding_name'),'boolean'),toggleName=rv('$toggle_name'),bindingCondition=rv('$toggle_binding_condition','once'))
    if not prop['toggleName']:raise ValueError('Missing toggleName '+path)
   elif kind in ['text','text-action']:
    prop.update(binding=binding(rv('$option_binding_name'),'string'),placeholder=text(rv('$option_place_holder_text','')),textBoxName=rv('$text_box_name','#text_box_name'),maxLength=rv('$max_text_edit_length',30),sourceTextType=rv('$text_edit_box_text_type','ExtendedASCII'),allowDataBinding=rv('$allow_data_binding',True))
    if kind=='text-action':prop.update(target=rv('$pressed_button_name'),actionLabel=text(rv('$button_text',rv('$button_tts_header',''))),presentation='text'if'with_text_button'in str(base)else'mock-arrow'if'mock'in str(base)else'arrow',textFraction=.5 if rv('$option_text_edit_control_size')==['50%','100%']else.85);metric['labelMaxHeight']='number'
   elif kind in ['dropdown','permissions','radio']:
    prop['choices']=[]
    if kind=='radio':
     content=lookup['world_section.player_waypoints_option_control'][2];used.add('world_section.player_waypoints_option_control');choices=content['controls'][0]['player_waypoints_toggle_row']['controls'];choices=[x for x in choices if '@'in next(iter(x))];metric.update(visuals='radioVisuals',descriptionHeights='pair',labelShadow='shadow');prop['descriptionKeys']=[next(iter(x.values()))['text']for x in content['controls']if next(iter(x))in['player_waypoints_off_description','player_waypoints_everyone_description']];
     if len(prop['descriptionKeys'])!=2:raise ValueError('Waypoints descriptions require exact source keys')
     strings.update(prop['descriptionKeys'])
    else:
     prop.update(dropdownName=rv('$dropdown_name'),faceBinding=binding(rv('$options_dropdown_toggle_label_binding'),'string'),scrolling=not any('no_scroll'in a for a in names),highlightOffset=rv('$selection_highlight_offset',[0,0]),highlightExtraSize=[0,1]if rv('$selection_highlight_size')==['100%','100% + 1px']else[0,0]);metric.update(popupHeight='number',popupPlacement='placement',popupLabel='string')
     ref=rv('$dropdown_content');used.add(ref);choices=lookup[ref][2]['$radio_buttons']
     if kind=='permissions':
      choices=[x for x in choices if next(iter(x)).split('@')[0].endswith('_settings')];metric.update(choiceHeights='permissionHeights',descriptionHeights='permissionHeights',faceIcon='imageOrNull');strings.update(['permissions.title.settings','permissions.level.visitor','permissions.level.member','permissions.level.operator','permissions.level.custom','permissions.description.visitors','permissions.description.members','permissions.description.operators']);prop['binding']=prop['faceBinding']
    for i,c in enumerate(choices):
     ck,cv=next(iter(c.items()));ce,_,_=merged(ck.partition('@')[2],cv,'world_section');cvs={**vs,**{k:v for k,v in ce.items()if k.startswith('$')}};cr=lambda k,d=None:resolve(ce.get(k,d),cvs);cs={'ignored':condition(cr('ignored',False)),'visible':condition(cr('visible',True)),'enabled':condition(cr('enabled',True))}
     cid=ck.split('@')[0]or'$slot['+str(i)+']';cp=path+'/$choices/'+cid
     # permissions settings branch is selected by the known $is_world_settings:true instance.
     if kind=='permissions':cs['ignored']=False;conditions.discard('(not $is_world_settings)')
     prop['choices'].append({'key':cp,'id':cid,'sourceControl':cp,'binding':binding(cr('$toggle_state_binding_name'),'boolean'),'label':text(cr('$radio_label_text','')),'state':cs})
   elif kind=='slider':
    prop.update(binding=binding(rv('$slider_value_binding_name'),'number'),sliderName=rv('$slider_name'),stepsBinding=binding(rv('$slider_steps_binding_name'),'number'),textBinding=binding(rv('$slider_tts_text_value'),'string'));metric['web']='sliderWeb'
   elif kind=='action':
    prop.update(target=rv('$pressed_button_name'),text=text(rv('$button_text','')),tone='light');metric['labelMaxHeight']='number'
    if base=='play.open_account_setting_button':prop['uri']='https://aka.ms/MCMultiplayerHelp'
    if not prop['target']:raise ValueError('Missing target '+path)
   elif kind=='experiments':
    binding('#experimental_toggle_count','number');prop.update(collectionName='experimental_toggles',countBinding='#experimental_toggle_count')
   if kind in ['stack','panel']:
    prop['orientation']=e.get('orientation','vertical');prop['children']=[]
    if path.endswith('/button_panel'):
     for branch,ref,ignored in [('normal','world_section.edit_world_manipulation_buttons','$is_editor_mode_enabled'),('editor','world_section.editor_edit_world_manipulation_buttons','(not $is_editor_mode_enabled)')]:prop['children'].append(node(branch+'@'+ref,{},path,vs,ignored))
    elif base=='world_section.editor_edit_world_manipulation_buttons':
     metric['panelHeight']='number';prop['children']=[node('content@world_section.editor_edit_world_manipulation_buttons_content',{},path,vs)]
    else:
     for c in e.get('controls',[]):
      ck,cv=next(iter(c.items()));prop['children'].append(node(ck,cv,path,vs))
   if option:prop['auxiliary']={'tooltipBindingType':rv('$option_tooltip_binding_type','none'),'tooltipTextBinding':rv('$option_tooltip_text_binding_name',''),'tooltipVisibleBinding':rv('$option_tooltip_visible_binding_name','#default_visibility'),'tooltipIcon':rv('$option_tooltip_icon','textures/ui/infobulb')}
   metrics[path]=metric;return prop
  raw=lookup[source][2];used.add(source);scope={k[:-8]if k.endswith('|default')else k:v for k,v in raw.items()if k.startswith('$')}
  for c in raw['controls']:
   key,value=next(iter(c.items()));nodes.append(node(key,value,source,scope))
  assert len(nodes)=={'game':69,'multiplayer':8,'cloud':5,'debug':7}[name]
  groups[name]=nodes;allBindings[name]=dict(sorted(binds.items()));allStrings[name]=sorted(strings);allConditions[name]=sorted(conditions);allMetrics[name]=metrics
 group('game','world_section.game_section');group('multiplayer','world_section.multiplayer_section');group('cloud','world_section.edu_cloud_section');group('debug','world_section.debug_section')
 doc={'schemaVersion':1,'sourceCommit':g.COMMIT,'archiveSHA256':g.ARCHIVE_SHA,'groups':groups,'bindings':allBindings,'strings':allStrings,'conditions':allConditions,'metrics':allMetrics,'sources':[files[f]for f in sorted({lookup[k][0]for k in used})],'usedDefinitions':{k:{'sourceFile':lookup[k][0],'sourceKey':lookup[k][1],'value':lookup[k][2]}for k in sorted(used)},'policy':'Canonical identity/order/static variables owned by library. Dynamic source conditions are explicit host-resolved booleans; source precedence/native layout/typography not certified.'}
 materials=[]
 with zipfile.ZipFile(archive)as bank:
  for key,dest in [('textures/ui/underline','src/assets/progress/ui/underline.png'),('textures/ui/underline_focus','src/assets/start-menu/underline_focus.png')]:
   raw=bank.read('resource_pack/'+key+'.png')
   if (ROOT/dest).read_bytes()!=raw:raise ValueError('Whole original material differs: '+key)
   if bank.getinfo('resource_pack/'+key+'.png').file_size!=len(raw):raise ValueError('Material size differs')
   materials.append({'texture':key,'file':dest,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'sourceSize':[1,1],'metadata':'absent'if 'resource_pack/'+key+'.json'not in bank.namelist()else'present'})
  if 'resource_pack/textures/ui/icon_external_link.png'in bank.namelist():raise ValueError('Fixed missing-material assertion differs')
 doc['cloudMaterials']={'wholeOriginals':materials,'unresolved':['textures/ui/icon_external_link'],'policy':'Missing exact texture requires explicit whole host image. Differently named external_link.png is not an alias.'}
 with zipfile.ZipFile(archive)as closure:
  localeBytes=closure.read('resource_pack/texts/zh_CN.lang');locale={}
  for line in localeBytes.decode('utf-8-sig').splitlines():
   if '='in line and not line.startswith('##'):
    k,v=line.split('=',1);locale[k]=v.split('##',1)[0].rstrip()
  doc['cloudLocaleClosure']={'sourceFile':'resource_pack/texts/zh_CN.lang','sha256':hashlib.sha256(localeBytes).hexdigest(),'missingKeys':[k for k in allStrings['cloud']if k not in locale],'policy':'Host-resolved Education localization; no invented vanilla translation.'}
  globalBytes=closure.read('resource_pack/ui/_global_variables.json');globals=json.loads(g.jsonc(globalBytes.decode('utf-8-sig')))
  doc['cloudPaletteRaw']={'sourceFile':'resource_pack/ui/_global_variables.json','sha256':hashlib.sha256(globalBytes).hexdigest(),'values':{k:globals[k]for k in ['$dark_button_default_text_color','$f_color_format','$body_text_color']},'hoverAndPressed':lookup['edu_common.underline_text'][2]['$text_color|default']}

 assetModule='// Generated by scripts/prepare-world-settings-fields.py. Whole originals only; no icon substitution.\nexport const worldSettingsCloudAssets = Object.freeze({\n'
 for material in materials:
  relative=material['file'].replace('src/','./',1);assetModule+=json.dumps(material['texture'])+':Object.freeze({url:new URL('+json.dumps(relative)+',import.meta.url).href,width:1,height:1}),\n'
 assetModule+='});\nexport const worldSettingsCloudMissingMaterials = Object.freeze([\"textures/ui/icon_external_link\"] as const);\n'
 j=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':'))
 ts='// Generated by scripts/prepare-world-settings-fields.py; do not edit.\nfunction freezeSource<T>(value:T):T {if(value!==null&&typeof value===\"object\"){for(const child of Object.values(value))freezeSource(child);Object.freeze(value);}return value;}\nexport const worldSettingsFieldsSchema = freezeSource('+j({k:doc[k]for k in ['groups','bindings','strings','conditions','metrics']})+' as const);\n'
 ts+='export interface WorldSettingsFieldsBindingTypes {\n'
 for name,b in allBindings.items():ts+=' readonly '+name+':{'+''.join('readonly '+j(k)+':'+v+';'for k,v in b.items())+'};\n'
 ts+='}\nexport interface WorldSettingsFieldsMetricKinds {\n'
 for name,ms in allMetrics.items():ts+=' readonly '+name+':{'+''.join('readonly '+j(k)+':{'+''.join('readonly '+j(f)+':'+j(t)+';'for f,t in m.items())+'};'for k,m in ms.items())+'};\n'
 ts+='}\n'
 return {'src/world-settings-cloud-assets.ts':assetModule,'src/world-settings-fields-schema.ts':ts,'docs/world-settings-fields-source.json':json.dumps(doc,ensure_ascii=False,indent=2)+'\n'}
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
 for path,text in generate().items():
  target=ROOT/path;data=text.encode()
  if args.check:
   if not target.exists()or target.read_bytes()!=data:raise ValueError('Generated output differs: '+path)
  else:target.write_bytes(data)
 print('World Settings fields source schema: Game69 / Multiplayer8 / Cloud5 / Debug7; fixed whole ZIP / finite source structure verified; '+('CHECK'if args.check else'PREPARED'))
