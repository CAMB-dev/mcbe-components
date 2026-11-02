import type {SettingsFieldRow,SettingsFieldsProps,SettingsFieldsTypography} from './settings-fields-model';
import type {WorldSettingsFont} from './world-settings-actions';

const fail=(message:string):never=>{throw new TypeError(`SettingsFields ${message}`);};
function text(value:unknown,name:string,empty=true):asserts value is string {
  if(typeof value!=='string'||value.length>1048576||(!empty&&!value.trim()))fail(`${name} must be bounded ${empty?'':'nonempty '}text.`);
}
function number(value:unknown,name:string,zero=false,max=8192):asserts value is number {
  if(typeof value!=='number'||!Number.isFinite(value)||value<(zero?0:Number.MIN_VALUE)||value>max)throw new RangeError(`SettingsFields ${name} must be finite ${zero?'nonnegative':'positive'} within${max}.`);
}
function bool(value:unknown,name:string):asserts value is boolean {if(typeof value!=='boolean')fail(`${name} must be boolean.`);}
function pair(value:unknown,name:string,positive=false):asserts value is readonly[number,number] {
  if(!Array.isArray(value)||value.length!==2||!Object.hasOwn(value,0)||!Object.hasOwn(value,1))fail(`${name} needs two dense axes.`);
  for(const axis of value as unknown[]){if(typeof axis!=='number'||!Number.isFinite(axis)||Math.abs(axis)>8192||positive&&axis<=0)fail(`${name} has invalid axes.`);}
}
function font(value:WorldSettingsFont){if(!value)fail('font is required.');text(value.family,'font family',false);if(value.family.length>4096||/[\u0000-\u001f\u007f]/.test(value.family))fail('font family must be bounded without control characters.');number(value.size,'font size');number(value.lineHeight,'font line height');}
/** Copy data only, rejecting accessors before reading them; refs and native callbacks are not part of a model. */
function data<T>(value:T,depth=0):T {
  if(depth>48)throw new RangeError('SettingsFields model nesting exceeds48.');
  if(value===undefined||value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number')return value;
  if(typeof value!=='object')fail('models may contain only plain data.');
  const object=value as object;
  if(!Array.isArray(object)&&Object.getPrototypeOf(object)!==Object.prototype&&Object.getPrototypeOf(object)!==null)fail('models must be plain records.');
  if(Object.getOwnPropertySymbols(object).length)fail('symbol model keys are unsupported.');
  const result:unknown[]=[],record:Record<string,unknown>={};
  for(const key of Object.keys(object)){
    const descriptor=Object.getOwnPropertyDescriptor(object,key)!;
    if(!('value'in descriptor))fail('model accessors are unsupported.');
    const copied=data(descriptor.value,depth+1);
    if(Array.isArray(object))result[Number(key)]=copied;else Object.defineProperty(record,key,{value:copied,enumerable:true});
  }
  if(Array.isArray(object)&&result.length!==(object as unknown[]).length)fail('sparse model arrays are unsupported.');
  if(Array.isArray(object))for(let i=0;i<result.length;i++)if(!Object.hasOwn(result,i))fail('sparse model arrays are unsupported.');
  return Object.freeze(Array.isArray(object)?result:record)as T;
}
export interface SettingsFieldsSnapshot {
  readonly width:number;readonly scale:number;readonly typography:SettingsFieldsTypography;
  readonly rows:readonly SettingsFieldRow[];readonly hiddenSlots:'reserve'|'collapse';
  readonly disabled:boolean;readonly readOnly:boolean;readonly inert:boolean;readonly hidden:boolean;
}
/** Private preflight for source compositions, including all ignored/hidden rows before any DOM work. */
export function snapshotSettingsFields(p:SettingsFieldsProps):SettingsFieldsSnapshot {
  number(p.width,'width');if(!Number.isSafeInteger(p.scale)||p.scale<1||p.scale>32)throw new RangeError('SettingsFields scale must be integer1..32.');
  number(p.width*p.scale,'physical width');
  if(p.hiddenSlots!=='reserve'&&p.hiddenSlots!=='collapse')fail('hiddenSlots must be reserve or collapse.');
  const typography=data(p.typography);if(!typography)fail('typography is required.');
  for(const role of ['label','description','control']as const){font(typography[role]);number(typography[role].size*p.scale,'physical font size');number(typography[role].lineHeight*p.scale,'physical line height');}
  for(const key of ['disabled','readOnly','inert','hidden']as const)if(p[key]!==undefined)bool(p[key],key);
  if(p.popupHost!==undefined&&p.popupHost!==null){const host=p.popupHost,view=host.ownerDocument?.defaultView;if(!view||!(host instanceof (view as Window&typeof globalThis).HTMLElement)||!host.isConnected)fail('popupHost must be a connected same-owner HTML overlay.');}
  const rows=data(p.rows);if(!Array.isArray(rows))fail('rows must be a complete array.');
  const ids=new Set<string>(),buttonIds=new Set<string>();let count=0;
  const buttonKey=(id:string)=>{if(buttonIds.has(id))fail(`ambiguous button reference key ${id}.`);buttonIds.add(id);};
  const validate=(row:SettingsFieldRow,parentWidth:number,depth:number)=>{
    if(++count>4096||depth>32)throw new RangeError('SettingsFields supports at most4096 rows and32 stack levels.');
    if(!row||typeof row!=='object')fail('row must be a record.');
    text(row.id,'row id',false);if(ids.has(row.id))fail(`duplicate row id ${row.id}.`);ids.add(row.id);
    text(row.sourceControl,'source control',false);if(row.binding!==undefined)text(row.binding,'binding',false);if(row.enabledBinding!==undefined)text(row.enabledBinding,'enabled binding',false);
    for(const key of ['ignored','visible','enabled']as const)bool(row[key],key);
    number(row.height,'row height',true);number(row.height*p.scale,'physical row height',true);
    const width=row.width??parentWidth;number(width,'row width');number(width*p.scale,'physical row width');
    if(row.offset!==undefined)pair(row.offset,'row offset');
    if(row.typography)for(const role of ['label','description','control']as const)if(row.typography[role]){font(row.typography[role]);number(row.typography[role]!.size*p.scale,'row physical font size');number(row.typography[role]!.lineHeight*p.scale,'row physical line height');}
    if(row.collection){text(row.collection.name,'collection name',false);text(row.collection.id,'collection id',false);if(!Number.isSafeInteger(row.collection.index)||row.collection.index<0)fail('collection index must be a nonnegative integer.');}
    if('option'in row&&row.option!==undefined){const o=row.option;if(!o||!['one-line','two-line'].includes(o.mode))fail('option mode is required.');text(o.label,'option label');bool(o.showLabel,'showLabel');number(o.labelHeight,'label height',true);number(o.descriptionHeight,'description height',true);number(o.controlY,'control Y',true);if(o.description!==null)text(o.description,'description');if(o.labelAlignment!=='left'&&o.labelAlignment!=='center')fail('option alignment is required.');if(o.mode==='one-line'&&row.kind!=='toggle')fail('one-line profile is limited to the authored16-high toggle.');}
    switch(row.kind){
      case 'stack':if(!['vertical','horizontal'].includes(row.orientation)||!Array.isArray(row.rows))fail('stack needs an orientation and ordered rows.');if(row.orientation==='horizontal'&&row.rows.some(child=>child.width===undefined))fail('horizontal stack widths must be resolved explicitly.');row.rows.forEach(child=>validate(child,width,depth+1));break;
      case 'experiments':{
        if(row.collectionName!=='experimental_toggles'||row.countBinding!=='#experimental_toggle_count'||!Number.isSafeInteger(row.count)||row.count<0||row.count>4096||!Array.isArray(row.rows)||row.rows.length!==row.count)fail('experiments need an explicit complete source count.');
        row.rows.forEach((child,index)=>{if(child.kind!=='toggle'||child.collection?.name!=='experimental_toggles'||child.collection.index!==index||!child.collection.id)fail('experiment rows need exact collection/index/identity.');validate(child,width,depth+1);});break;
      }
      case 'label':text(row.text,'label text');if(!['plain','group','header'].includes(row.profile))fail('unknown label profile.');number(row.textHeight,'text height',true);break;
      case 'info':text(row.text,'info text');text(row.textBinding,'info binding',false);number(row.textHeight,'info text height',true);if(row.height<=0||width<=8)fail('info image needs positive resolved image/text dimensions.');if(row.option)number(row.panelHeight,'option info panel height');else if(row.panelHeight!==undefined)number(row.panelHeight,'leaf info panel height');break;
      case 'spacer':break;
      case 'divider':number(row.inset,'divider inset',true);if(width<=row.inset*2)fail('divider inset exceeds width.');break;
      case 'toggle':text(row.binding,'toggle binding',false);text(row.toggleName,'toggle name',false);bool(row.checked,'checked');if(!['once','visible','always_when_visible'].includes(row.bindingCondition))fail('unknown toggle binding condition.');break;
      case 'text':case 'text-action':{
        text(row.binding,'text binding',false);text(row.value,'accepted text');text(row.placeholder,'placeholder');text(row.textBoxName,'text box name',false);bool(row.allowDataBinding,'allowDataBinding');
        if(!Number.isSafeInteger(row.maxLength)||row.maxLength<0||row.maxLength>1048576)fail('maxLength must be a finite source integer.');if(!['ExtendedASCII','NumberChars'].includes(row.sourceTextType))fail('unknown source text type.');
        if(row.kind==='text-action'){number(row.textFraction,'text fraction',false,1);if(row.textFraction>=1||width*row.textFraction<=6||width*(1-row.textFraction)<=2)fail('text-action needs positive resolved source control widths.');text(row.action?.label,'action label');text(row.action?.target,'action target',false);bool(row.action?.enabled,'action enabled');number(row.action?.labelMaxHeight,'action label max height');if(!['text','arrow','mock-arrow'].includes(row.action.presentation))fail('unknown text-action presentation.');buttonKey(`${row.id}:action`);if(row.action.presentation==='mock-arrow')buttonKey(row.id);}break;
      }
      case 'dropdown':{
        buttonKey(row.id);text(row.dropdownName,'dropdown name',false);text(row.faceLabel,'dropdown face');text(row.faceLabelBinding,'face binding',false);if(!Array.isArray(row.choices)||row.choices.length>4096)fail('dropdown needs finite source choices.');const choices=new Set<string>();
        row.choices.forEach(c=>{text(c.id,'choice id',false);if(choices.has(c.id))fail('duplicate choice id.');choices.add(c.id);text(c.sourceControl,'choice source control',false);text(c.binding,'choice binding',false);text(c.label,'choice label');for(const k of ['checked','enabled','visible','ignored']as const)bool(c[k],k);buttonKey(`${row.id}:${c.id}`);});
        const popup=row.popup;if(!popup)fail('popup profile is required.');bool(popup.scrolling,'popup scrolling');number(popup.height,'popup height');text(popup.label,'popup label',false);if(!['above','below'].includes(popup.placement)||!['mouse','touch'].includes(popup.inputMode))fail('popup placement/input mode is required.');pair(popup.highlightOffset,'highlight offset');pair(popup.highlightExtraSize,'highlight extra size');break;
      }
      case 'radio':{
        if(row.profile!=='waypoints'||!Array.isArray(row.choices)||row.choices.length!==2||!Array.isArray(row.visuals)||row.visuals.length!==2||!Array.isArray(row.descriptions)||row.descriptions.length!==2)fail('waypoint radio requires its complete two-choice source profile.');
        const choiceIds=new Set<string>();row.choices.forEach((choice,index)=>{text(choice.id,'radio id',false);if(choiceIds.has(choice.id))fail('duplicate radio id.');choiceIds.add(choice.id);text(choice.sourceControl,'radio source control',false);text(choice.binding,'radio binding',false);text(choice.label,'radio label');for(const k of ['ignored','visible','enabled','checked']as const)bool(choice[k],k);buttonKey(`${row.id}:${choice.id}`);const visual=row.visuals[index]!;number(visual.height,'radio paint height');number(visual.labelHeight,'radio natural label height',true);if(!Number.isFinite(visual.y)||Math.abs(visual.y)>8192)fail('radio visual Y must be bounded.');text(row.descriptions[index]!.text,'radio description');number(row.descriptions[index]!.height,'radio description height',true);});
        pair(row.labelShadow?.offset,'radio label shadow offset');text(row.labelShadow?.color,'radio label shadow color',false);break;
      }
      case 'slider':{
        text(row.binding,'slider binding',false);text(row.sliderName,'slider name',false);text(row.stepsBinding,'steps binding',false);text(row.textValue,'slider text value');text(row.textValueBinding,'text value binding',false);
        if(!Number.isFinite(row.sourceValue)||!Number.isFinite(row.sourceSteps))fail('source slider value/steps must be finite without inferred domain.');
        const web=row.web;if(!web||![web.value,web.min,web.max,web.step].every(Number.isFinite)||web.max<web.min||web.step<=0||web.value<web.min||web.value>web.max||Math.abs((web.value-web.min)/web.step-Math.round((web.value-web.min)/web.step))>1e-7)fail('slider requires an accepted explicit Web domain.');
        if(!Array.isArray(web.markers)||web.markers.length>4096)fail('slider markers need finite explicit offsets.');web.markers.forEach(marker=>{number(marker.offset,'marker offset',true);bool(marker.progress,'marker progress');});break;
      }
      case 'permissions':{
        text(row.binding,'permission binding',false);text(row.faceLabel,'permission face');if(row.value!==null&&!['visitor','member','operator','custom'].includes(row.value))fail('unknown permission value.');
        for(const role of ['label','visitor','member','operator','custom','visitorDescription','memberDescription','operatorDescription']as const)text(row.labels?.[role],'permission label');
        for(const role of ['visitor','member','operator']as const){text(row.choiceBindings?.[role],'permission radio binding',false);number(row.choiceHeights?.[role],'permission choice height');number(row.descriptionHeights?.[role],'permission description height',true);if(row.choiceHeights[role]<18+row.descriptionHeights[role])fail('permission row must fit title16, resolved description and padding2.');buttonKey(`${row.id}:${role}`);}
        const popup=row.popup;if(!popup)fail('permission popup profile is required.');number(popup.height,'permission popup height');bool(popup.scrolling,'permission popup scrolling');text(popup.label,'permission popup label',false);if(!['above','below'].includes(popup.placement)||!['mouse','touch'].includes(popup.inputMode))fail('permission popup placement/input mode is required.');pair(popup.highlightOffset,'permission highlight offset');pair(popup.highlightExtraSize,'permission highlight extra size');
        if(row.faceIcon){text(row.faceIcon.src,'permission icon URL',false);pair(row.faceIcon.sourceSize,'permission original size',true);}buttonKey(row.id);break;
      }
      case 'action':text(row.label,'action label');text(row.target,'action target',false);if(!['light','dark','realms'].includes(row.tone))fail('unknown action tone.');number(row.labelMaxHeight,'label max height');if(width<=2||row.height<=2)fail('action size must exceed source skin inset.');buttonKey(row.id);break;
      default:fail('unknown row kind.');
    }
    if('option'in row&&row.option!==undefined){const controlHeight=row.kind==='info'?row.panelHeight!:row.kind==='radio'?18+row.descriptions.reduce((sum,d,index)=>sum+(row.choices[index]!.checked||p.hiddenSlots==='reserve'?d.height:0),0)+2:row.kind==='toggle'?16:row.kind==='slider'?16:30,minWidth=row.option.mode==='one-line'?34:row.kind==='slider'?20:row.kind==='radio'?44:6;if(width<=minWidth||row.height<row.option.controlY+controlHeight+4)throw new RangeError('SettingsFields option budget must fit its actual source control and trailing4 spacer.');}
  };
  rows.forEach(row=>validate(row,p.width,0));
  return Object.freeze({width:p.width,scale:p.scale,typography,rows,hiddenSlots:p.hiddenSlots,disabled:p.disabled??false,readOnly:p.readOnly??false,inert:p.inert??false,hidden:p.hidden??false});
}
export function allocatedSettingsRow(row:SettingsFieldRow,hiddenSlots:'reserve'|'collapse'):boolean{return !row.ignored&&(row.visible||hiddenSlots==='reserve');}
