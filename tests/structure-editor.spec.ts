import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';
import {createElement,createRef} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {StructureEditor,XYZVectorInput} from '../src/structure-editor';
import type {StructureEditorMode} from '../src/structure-editor';
import type {StructureQASettings} from '../demo/structure-editor-fixture';
async function configure(page:Page,patch:Partial<StructureQASettings>){await page.evaluate(value=>window.structureQA.configure(value),patch);}
async function open(page:Page,patch:Partial<StructureQASettings>={},strict=false){await page.goto(`/demo/structure-editor-fixture.html${strict?'?strict':''}`);await expect.poll(()=>page.evaluate(()=>window.structureQA?.mounted)).toBe(true);await configure(page,{scale:1,size:[480,300],...patch});}
const root=(page:Page)=>page.locator('#structure-editor-host .mc-structure');
const input=(page:Page,field:string)=>root(page).locator(`input[data-structure-field="${field}"]:visible`);
const xyz=(page:Page,axis:string)=>page.locator(`#xyz-host [data-axis="${axis}"] input`);
const action=(page:Page,name:string)=>root(page).locator(`[data-structure-action="${name}"]:visible`);
async function mode(page:Page,next:StructureEditorMode){const value=await page.evaluate(()=>window.structureQA.settings.value);await configure(page,{value:{...value,mode:next}});await expect(root(page)).toHaveAttribute('data-mode',next);}

test('XYZ is a reusable three-native-input raw vector with labels max3 caller refs and controlled refusal',async({page})=>{
  await open(page,{acceptance:'reject'});const group=page.locator('#xyz-host fieldset');await expect(group).toHaveAccessibleName('Standalone coordinates');
  for(const axis of['x','y','z']){await expect(xyz(page,axis)).toHaveAttribute('maxlength','3');expect(await xyz(page,axis).evaluate((node,axis)=>({tag:node.tagName,type:(node as HTMLInputElement).type,ref:window.structureQA.refs.xyzInputs[axis as 'x'|'y'|'z']===node}),axis)).toEqual({tag:'INPUT',type:'text',ref:true});}
  await xyz(page,'x').fill('-');await expect(xyz(page,'x')).toHaveValue('1');expect(await page.evaluate(()=>window.structureQA.events.filter(e=>e.kind==='xyz').at(-1))).toMatchObject({value:{x:'-',y:'2',z:'3'},detail:{axis:'x'}});
  await configure(page,{acceptance:'accept'});await xyz(page,'x').fill('1e');await expect(xyz(page,'x')).toHaveValue('1e');await expect(xyz(page,'y')).toHaveValue('2');await expect(xyz(page,'x')).toHaveAttribute('id','caller-xyz-x');
});

test('uncontrolled XYZ preserves intermediate values and native selection while disabled or readOnly only restrict editing',async({page})=>{
  await open(page,{xyzControlled:false,xyzMaxLength:5});for(const[axis,value]of [['x','-1234'],['y',''],['z','NaN']]){await xyz(page,axis!).fill(value!);await expect(xyz(page,axis!)).toHaveValue(value!);}
  await xyz(page,'x').evaluate(node=>{(window as unknown as{savedXYZ:Node}).savedXYZ=node;(node as HTMLInputElement).setSelectionRange(1,3);});await configure(page,{nativeTitle:'Updated native property'});await expect(xyz(page,'x')).toHaveAttribute('title','Updated native property');
  expect(await xyz(page,'x').evaluate(node=>[node===(window as unknown as{savedXYZ:Node}).savedXYZ,(node as HTMLInputElement).selectionStart,(node as HTMLInputElement).selectionEnd])).toEqual([true,1,3]);
  await configure(page,{xyz:{x:'other',y:'other',z:'other'},readOnly:true});await expect(xyz(page,'x')).toHaveValue('-1234');await expect(xyz(page,'x')).toBeEditable({editable:false});await configure(page,{disabled:true});await expect(xyz(page,'y')).toBeDisabled();
});

test('source mode options are capability gated and uncontrolled editor changes remain raw caller drafts',async({page})=>{
  await open(page,{controlled:false});const select=root(page).getByRole('combobox',{name:'Mode:',exact:true});await select.click();await expect(root(page).getByRole('option')).toHaveText(['Save','Load','Data','Corner','3D Export']);await select.press('Escape');
  await input(page,'name').fill('not a registry id');await select.click();await root(page).getByRole('option',{name:'Load',exact:true}).click();await expect(root(page)).toHaveAttribute('data-mode','load');await expect(input(page,'name')).toHaveValue('not a registry id');
  await input(page,'seed').fill('raw!-seed');await action(page,'load').click();expect(await page.evaluate(()=>window.structureQA.events.filter(e=>e.kind==='action').at(-1))).toMatchObject({value:{mode:'load',name:'not a registry id',seed:'raw!-seed'},detail:{action:'load'}});
  await configure(page,{capabilities:{dataSupport:false,export3dSupport:false,filePickingSupported:false}});await select.click();await expect(root(page).getByRole('option')).toHaveText(['Save','Load','Corner']);await select.press('Escape');await expect(action(page,'import')).toHaveCount(0);
});

test('all five vector bindings and scalar length categories preserve invalid empty signed and fractional text independently',async({page})=>{
  await open(page);await input(page,'name').fill('raw: name with spaces');await expect(input(page,'name')).toHaveAttribute('maxlength','30');
  for(const[field,value]of [['saveSize.x','-'],['saveOffset.x','-1234']]){await input(page,field!).fill(value!);await expect(input(page,field!)).toHaveValue(value!);}
  await expect(input(page,'saveSize.x')).toHaveAttribute('maxlength','3');await expect(input(page,'saveOffset.x')).toHaveAttribute('maxlength','5');
  await root(page).locator('[data-structure-mode="save"] [data-structure-toggle="includeEntities"] input').click();await root(page).locator('[data-structure-mode="save"] [data-structure-toggle="removeBlocks"] input').click();
  await root(page).getByRole('combobox',{name:'Redstone Save Mode',exact:true}).click();await expect(root(page).getByRole('option')).toHaveText(['Save In Memory','Save To Disk']);await root(page).getByRole('option',{name:'Save To Disk',exact:true}).click();
  await mode(page,'load');for(const[field,value]of [['loadOffset.y','1e'],['integrity','NaN%'],['seed','-unparsed-seed'],['animationTime','-.e']]){await input(page,field!).fill(value!);await expect(input(page,field!)).toHaveValue(value!);}
  for(const[field,length]of [['integrity','64'],['seed','256'],['animationTime','10']])await expect(input(page,field!)).toHaveAttribute('maxlength',length!);
  await root(page).locator('[data-structure-mode="load"] [data-structure-toggle="waterlogging"] input').click();await input(page,'mirrorX').click();await input(page,'mirrorZ').click();await input(page,'rotation').focus();await input(page,'rotation').press('ArrowRight');await expect(input(page,'rotation')).toHaveValue('0.5');
  await root(page).getByRole('combobox',{name:'Animation Mode:',exact:true}).click();await expect(root(page).getByRole('option')).toHaveText(['None','Place by Layer','Place by Block']);await root(page).getByRole('option',{name:'Place by Layer',exact:true}).click();
  await mode(page,'export');await input(page,'exportSize.z').fill('');await input(page,'exportOffset.z').fill('.');await expect(input(page,'exportSize.z')).toHaveAttribute('maxlength','3');await expect(input(page,'exportOffset.z')).toHaveAttribute('maxlength','5');
  await mode(page,'data');await input(page,'data').fill('unparsed data');await expect(input(page,'data')).toHaveAttribute('maxlength','256');
  await root(page).locator('[data-structure-toggle="showBoundingBox"] input').click();
  expect(await page.evaluate(()=>window.structureQA.settings.value)).toMatchObject({name:'raw: name with spaces',saveSize:{x:'-'},saveOffset:{x:'-1234'},loadOffset:{y:'1e'},integrity:'NaN%',seed:'-unparsed-seed',animationTime:'-.e',exportSize:{z:''},exportOffset:{z:'.'},data:'unparsed data',includeEntities:false,removeBlocks:true,waterlogging:true,showBoundingBox:false,mirrorX:true,mirrorZ:true,rotation:.5,redstoneSaveMode:'disk',animationMode:'layers'});
});

test('controlled rejection external replacements and native selection retain the active field and accepted values',async({page})=>{
  await open(page,{acceptance:'reject'});const name=input(page,'name');await name.evaluate(node=>{(window as unknown as{savedStructureName:Node}).savedStructureName=node;});await name.fill('rejected');await expect(name).toHaveValue('qa:structure');
  await input(page,'saveSize.x').fill('99');await expect(input(page,'saveSize.x')).toHaveValue('16');expect(await page.evaluate(()=>window.structureQA.events.filter(e=>e.kind==='value').at(-1))).toMatchObject({value:{saveSize:{x:'99'}},detail:{field:'saveSize',axis:'x'}});
  await name.focus();await name.evaluate(node=>(node as HTMLInputElement).setSelectionRange(1,4));await configure(page,{nativeTitle:'Fresh native title'});await expect(name).toHaveAttribute('title','Fresh native title');expect(await name.evaluate(node=>[node===(window as unknown as{savedStructureName:Node}).savedStructureName,(node as HTMLInputElement).selectionStart,(node as HTMLInputElement).selectionEnd])).toEqual([true,1,4]);
  const value=await page.evaluate(()=>window.structureQA.settings.value);await configure(page,{acceptance:'accept',value:{...value,name:'external accepted',saveSize:{...value.saveSize,x:'12'}}});await expect(name).toHaveValue('external accepted');await expect(input(page,'saveSize.x')).toHaveValue('12');
});

test('five declared mode panels keep their nodes while IDs and shared field refs follow the active native control',async({page})=>{
  await open(page);await input(page,'saveSize.x').evaluate(node=>{(window as unknown as{savedSaveAxis:Node}).savedSaveAxis=node;});
  for(const next of['save','load','corner','export','data']as const){await mode(page,next);await expect(root(page).locator('[data-structure-mode]')).toHaveCount(5);await expect(root(page).locator(`[data-structure-mode="${next}"]`)).toBeVisible();
    expect(await root(page).evaluate(node=>{const ids=Array.from(node.querySelectorAll('[id]')).map(element=>element.id);return ids.length===new Set(ids).size;})).toBe(true);
    if(['save','load','corner'].includes(next))expect(await input(page,'name').evaluate(node=>window.structureQA.refs.inputs.name===node)).toBe(true);
  }
  await mode(page,'save');expect(await input(page,'saveSize.x').evaluate(node=>node===(window as unknown as{savedSaveAxis:Node}).savedSaveAxis)).toBe(true);
  await mode(page,'load');await expect(input(page,'seed')).toHaveAttribute('id','caller-structure-seed');
});

test('independent enabled fields readonly controls and explicit toggle label visibility do not rewrite boolean state',async({page})=>{
  await open(page,{enabled:{saveSize:false,includeEntities:false}});await expect(input(page,'saveSize.x')).toBeDisabled();await expect(input(page,'saveOffset.x')).toBeEnabled();
  const include=root(page).locator('[data-structure-mode="save"] [data-structure-toggle="includeEntities"]');await expect(include.getByRole('switch')).toBeDisabled();
  await configure(page,{enabled:{},toggleStateVisibility:{includeEntities:{off:true,on:false}}});await expect(include.getByRole('switch')).toBeChecked();await expect(include.locator('[data-structure-state="off"]')).toBeVisible();await expect(include.locator('[data-structure-state="on"]')).toBeHidden();expect(await page.evaluate(()=>window.structureQA.settings.value.includeEntities)).toBe(true);
  await configure(page,{readOnly:true});await expect(input(page,'name')).toBeEditable({editable:false});await input(page,'name').focus();await input(page,'name').pressSequentially('x');await expect(input(page,'name')).toHaveValue('qa:structure');await expect(action(page,'save')).toBeDisabled();await expect(action(page,'help')).toBeEnabled();
  await configure(page,{readOnly:false,disabled:true});await expect(input(page,'name')).toBeDisabled();await expect(action(page,'back')).toBeDisabled();
});

test('mode panel and footer visibility action permissions and capabilities remain independent source bindings',async({page})=>{
  await open(page,{visibility:{save:false,load:true,boundingBox:false},footerVisibility:{save:false,load:true},actionVisibility:{import:false},actionEnabled:{load:false}});
  await expect(root(page)).toHaveAttribute('data-mode','save');await expect(root(page).locator('[data-structure-mode="save"]')).toBeHidden();await expect(root(page).locator('[data-structure-mode="load"]')).toBeVisible();await expect(action(page,'load')).toBeDisabled();await expect(action(page,'save')).toHaveCount(0);await expect(action(page,'import')).toHaveCount(0);
  await configure(page,{actionEnabled:{load:true}});await action(page,'load').click();expect(await page.evaluate(()=>window.structureQA.events.filter(e=>e.kind==='action').at(-1))).toMatchObject({value:{mode:'save'},detail:{action:'load'}});
  await configure(page,{visibility:{},footerVisibility:{},actionVisibility:{},capabilities:{filePickingSupported:false,dataSupport:true,export3dSupport:true}});await expect(action(page,'save')).toBeVisible();await expect(action(page,'export')).toHaveCount(0);
  await mode(page,'corner');await expect(action(page,'reset')).toHaveCount(0);await expect(action(page,'help')).toBeVisible();
});

test('source actions only emit accepted deep snapshots while Back and Escape honor caller prevention',async({page})=>{
  await open(page,{acceptance:'reject'});await input(page,'name').fill('rejected');await action(page,'save').click();
  await page.evaluate(()=>{window.structureQA.actionSnapshots[0]!.name='tampered';window.structureQA.actionSnapshots[0]!.saveSize.x='999';});await expect(input(page,'name')).toHaveValue('qa:structure');await expect(input(page,'saveSize.x')).toHaveValue('16');
  await action(page,'reset').click();await expect(input(page,'name')).toHaveValue('qa:structure');await action(page,'help').click();
  expect(await page.evaluate(()=>window.structureQA.events.filter(e=>e.kind==='action').map(e=>(e.detail as{action:string}).action))).toEqual(['save','reset','help']);
  await action(page,'back').click();await input(page,'name').focus();await input(page,'name').press('Escape');expect(await page.evaluate(()=>window.structureQA.events.filter(e=>e.kind==='cancel').map(e=>(e.detail as{reason:string}).reason))).toEqual(['back','escape']);
  await configure(page,{preventEscape:true});await input(page,'name').press('Escape');expect(await page.evaluate(()=>window.structureQA.events.filter(e=>e.kind==='cancel').length)).toBe(2);
});

test('composition holds visible mode through external accepted changes and prevents Escape despite stopped bubbling',async({page})=>{
  await open(page,{stopCompositionPropagation:true});const name=input(page,'name');await name.focus();await name.dispatchEvent('compositionstart',{data:''});const value=await page.evaluate(()=>window.structureQA.settings.value);await configure(page,{value:{...value,mode:'load'}});
  await expect(root(page)).toHaveAttribute('data-mode','load');await expect(root(page).locator('[data-structure-mode="save"]')).toBeVisible();await name.press('Escape');expect(await page.evaluate(()=>window.structureQA.events.filter(e=>e.kind==='cancel').length)).toBe(0);
  await name.dispatchEvent('compositionend',{data:'结'});await expect(root(page).locator('[data-structure-mode="load"]')).toBeVisible();await expect(input(page,'name')).toHaveValue('qa:structure');
  expect(await page.evaluate(()=>window.structureQA.events.filter(e=>e.kind.startsWith('composition')).map(e=>e.kind))).toEqual(['composition-start','composition-end']);
});

test('caller preview stays caller-owned and pointer or keyboard turn requests never infer world geometry or rotation values',async({page})=>{
  await open(page);const preview=root(page).locator('.mc-structure__renderer');await expect(preview).toContainText('Caller-owned preview');await expect(preview.locator('canvas,svg')).toHaveCount(0);const accepted=await page.evaluate(()=>window.structureQA.settings.value);
  await preview.focus();await preview.press('ArrowRight');const box=(await preview.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+12,box.y+box.height/2+6,{steps:2});await page.mouse.up();
  const events=await page.evaluate(()=>window.structureQA.events.filter(e=>e.kind==='preview-turn').map(e=>e.detail as{phase:string;deltaX:number;deltaY:number}));expect(events.some(e=>e.phase==='keyboard'&&e.deltaX===1&&e.deltaY===0)).toBe(true);expect(events.filter(e=>e.phase==='start')).toHaveLength(1);expect(events.filter(e=>e.phase==='end')).toHaveLength(1);expect(events.filter(e=>e.phase==='move').reduce((sum,e)=>sum+e.deltaX,0)).toBe(12);expect(events.filter(e=>e.phase==='move').reduce((sum,e)=>sum+e.deltaY,0)).toBe(6);expect(await page.evaluate(()=>window.structureQA.settings.value)).toEqual(accepted);
});

test('preview overlays progress and bar visibility are independent busy host states with focus restoration',async({page})=>{
  await open(page,{visibility:{renderer:false,cornerText:true,rotationHint:false,exportDisabled:true}});await expect(root(page).locator('.mc-structure__renderer')).toBeHidden();await expect(root(page).locator('.mc-structure__corner-text')).toHaveText('Caller corner message');await expect(root(page).locator('.mc-structure__rotation-hint')).toBeHidden();await expect(root(page).locator('.mc-structure__export-disabled')).toBeVisible();
  await input(page,'name').focus();await configure(page,{visibility:{progress:true,progressBar:true,rotationHint:true,renderer:true},progress:.25});await expect(root(page)).toHaveAttribute('aria-busy','true');await expect(root(page).getByRole('progressbar')).toHaveAttribute('aria-valuenow','0.25');await expect(root(page).locator('.mc-structure__progress')).toBeFocused();
  await configure(page,{visibility:{progress:true,progressBar:false}});await expect(root(page).getByRole('progressbar')).toHaveCount(0);await expect(root(page).locator('.mc-structure__progress')).toBeVisible();
  await configure(page,{visibility:{progress:false}});await expect(input(page,'name')).toBeFocused();await expect(root(page)).not.toHaveAttribute('aria-busy','true');
  await configure(page,{visibility:{progress:true}});await expect(root(page).locator('.mc-structure__progress')).toBeFocused();await page.locator('#structure-sink').focus();await expect(page.locator('#structure-sink')).toBeFocused();
  await configure(page,{visibility:{progress:false}});await expect(page.locator('#structure-sink')).toBeFocused();
});

test('StrictMode cleanup and typed SSR preserve native refs without IO warnings or configuration leakage',async({page})=>{
  await open(page,{},true);await expect(input(page,'name')).toHaveValue('qa:structure');await page.evaluate(()=>window.structureQA.unmount());expect(await page.evaluate(()=>({editor:window.structureQA.refs.editor,xyz:window.structureQA.refs.xyz,viewport:window.structureQA.refs.viewport,preview:window.structureQA.refs.preview,inputs:Object.values(window.structureQA.refs.inputs).every(node=>node===null),xyzInputs:Object.values(window.structureQA.refs.xyzInputs).every(node=>node===null),dropdowns:Object.values(window.structureQA.refs.dropdowns).every(node=>node===null),toggles:Object.values(window.structureQA.refs.toggles).every(node=>node===null),rotation:window.structureQA.refs.rotation}))).toEqual({editor:null,xyz:null,viewport:null,preview:null,inputs:true,xyzInputs:true,dropdowns:true,toggles:true,rotation:null});
  const oldFetch=globalThis.fetch,oldError=console.error,errors:unknown[][]=[];let io=0;globalThis.fetch=()=>{io++;throw new Error('Unexpected SSR IO');};console.error=(...args)=>{errors.push(args);};try{const main=renderToStaticMarkup(createElement(StructureEditor,{ref:createRef<HTMLElement>(),defaultValue:{name:'accepted',saveSize:{x:'-'}},inputRefs:{name:createRef<HTMLInputElement>()},previewRef:createRef<HTMLDivElement>()})),vector=renderToStaticMarkup(createElement(XYZVectorInput,{ref:createRef<HTMLFieldSetElement>(),label:'SSR vector',defaultValue:{x:'-'},inputRefs:{x:createRef<HTMLInputElement>()}}));expect(main).toContain('accepted');expect(vector).toContain('value="-"');expect(main).not.toMatch(/footerVisibility=|actionEnabled=|capabilities=|inputRefs=|scrollViewportRef=/);expect(errors).toEqual([]);expect(io).toBe(0);}finally{globalThis.fetch=oldFetch;console.error=oldError;}
});
