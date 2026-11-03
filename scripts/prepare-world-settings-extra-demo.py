"""Generate explicit Web Cloud/Debug snapshots from the committed fixed schema.
Cloud text and missing image resolution are host examples, not original zh_CN.
"""
from pathlib import Path
import argparse,hashlib,json
ROOT=Path(__file__).resolve().parent.parent
def generate():
 source=ROOT/'docs/world-settings-fields-source.json';s=json.loads(source.read_text(encoding='utf-8'))
 result={};groups=[]
 cloud_text={'menu.eduCloudStorage.caps':'云存储','options.cloudFileNameTitle':'云文件名','options.cloudFileLastChangedTitle':'上次更新','options.cloudToggleCloudSave':'启用云保存','options.cloudHelpText':'云存储帮助'}
 def walk(items):
  for n in items:
   yield n
   yield from walk(n.get('children',[]))
 for family in ['cloud','debug']:
  specs={n['key']:n for n in walk(s['groups'][family])};metrics={}
  for key,shape in s['metrics'][family].items():
   m={}
   for name,typ in shape.items():
    if typ=='number':m[name]=48 if name=='height' else 10 if name in ['labelHeight','textHeight'] else 12 if name=='controlY' else 0 if name=='descriptionHeight' else 120 if name=='popupHeight' else 124 if name=='resolvedWidth' else 114 if name=='stateWidth' else 10
    elif typ=='pair':m[name]=[112,10] if name=='labelPanelSize' else[108,10]
    elif typ=='placement':m[name]='below'
    elif typ=='string':m[name]='源选项'
    else:raise ValueError('Unknown demo metric '+typ)
   if specs[key]['kind']=='label':m.update(height=18,textHeight=10)
   if specs[key]['kind']=='toggle' and specs[key].get('oneLine'):m.update(height=22,controlY=2)
   if key.endswith('/edu_cloud_label'):m['height']=18
   if 'cloud_help_wrapper_panel' in key:
    if 'height' in m:m['height']=20
    if key.endswith('/padded_icon'):m['resolvedWidth']=20
   metrics[key]=m
  binds={k:(k.endswith('_enabled')or k.endswith('_visible'))if typ=='boolean' else 0 if typ=='number' else '' for k,typ in s['bindings'][family].items()}
  for spec in s['groups'][family]:
   if spec['kind']=='dropdown':
    choices=[{'binding':c['binding'],'label':c['label']['literal']}for c in spec['choices']]
    for i,c in enumerate(choices):binds[c['binding']]=i==0
    binds[spec['faceBinding']]=choices[0]['label'];groups.append({'faceBinding':spec['faceBinding'],'choices':choices})
  if family=='cloud':binds.update({'#cloud_file_name':'课堂世界','#cloud_file_last_changed':'宿主时间示例','#cloud_file_last_changed_enabled':False})
  else:
   for k in binds:
    if k=='#base_game_version_debug_text':binds[k]='Host base-game-version example'
  result[family]={'bindings':binds,'conditions':{k:True for k in s['conditions'][family]},'strings':cloud_text if family=='cloud' else{},'metrics':metrics,'layoutPolicy':{'unresolvedPanelAnchor':'top-left','unresolvedStackCrossAlignment':'start'}}
 text="import type{WorldCloudSettingsSnapshot,WorldDebugSettingsSnapshot,WorldCloudSettingsImage}from'../src/world-settings-fields';\n"
 text+='// Source schema SHA256 '+hashlib.sha256(source.read_bytes()).hexdigest()+'; explicit host examples only.\n'
 text+='const cloudBase='+json.dumps(result['cloud'],ensure_ascii=False,indent=2)+' as const;\n'
 text+='const debugBase='+json.dumps(result['debug'],ensure_ascii=False,indent=2)+' as const;\n'
 text+='export const worldDebugDemoChoiceGroups='+json.dumps(groups,ensure_ascii=False,indent=2)+' as const;\n'
 text+="export function createWorldSettingsExtraDemoData(image:WorldCloudSettingsImage):{cloud:WorldCloudSettingsSnapshot;debug:WorldDebugSettingsSnapshot}{return{cloud:{...cloudBase,images:{'textures/ui/icon_external_link':{...image}}},debug:debugBase};}\n"
 return text
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');a=parser.parse_args();p=ROOT/'demo/world-settings-extra-data.ts';v=generate()
 if a.check:
  if p.read_text(encoding='utf-8')!=v:raise SystemExit('World extra demo differs')
 else:p.write_text(v,encoding='utf-8')
 print('World extra demo source-owned identities, explicit host text/image: '+('CHECK'if a.check else'WRITE'))
