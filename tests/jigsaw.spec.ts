import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createElement, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JigsawEditor, JigsawPriorityFields } from '../src/jigsaw';
import type { JigsawQASettings } from '../demo/jigsaw-fixture';

async function configure(page:Page,patch:Partial<JigsawQASettings>){await page.evaluate(value=>window.jigsawQA.configure(value),patch);}
async function open(page:Page,patch:Partial<JigsawQASettings>={},strict=false){
  await page.goto(`/demo/jigsaw-fixture.html${strict?'?strict':''}`);
  await expect.poll(()=>page.evaluate(()=>window.jigsawQA?.mounted)).toBe(true);
  await configure(page,{scale:1,size:[300,230],...patch});
}
const input=(page:Page,field:string,standalone=false)=>page.locator(`#${standalone?'pair':'editor'}-${field}`);
const action=(page:Page,name:string)=>page.locator(`#jigsaw-editor-host [data-jigsaw-action="${name}"]`);

test('all six labelled fields remain real single-line inputs with source max40 and caller refs',async({page})=>{
  await open(page);
  const expected=[['targetPool','Target Pool:'],['name','Name:'],['target','Target Name:'],['finalBlock','Turns Into:'],['selectionPriority','Selection Priority:'],['placementPriority','Placement Priority:']] as const;
  for(const [field,label]of expected){
    await expect(page.locator('#jigsaw-editor-host').getByLabel(label,{exact:true})).toHaveAttribute('id',`editor-${field}`);
    expect(await input(page,field).evaluate((node,field)=>({tag:node.tagName,type:(node as HTMLInputElement).type,max:(node as HTMLInputElement).maxLength,ref:window.jigsawQA.refs.inputs[field as keyof typeof window.jigsawQA.refs.inputs]===node}),field)).toEqual({tag:'INPUT',type:'text',max:40,ref:true});
  }
  await input(page,'name').fill('x'.repeat(55));await expect(input(page,'name')).toHaveValue('x'.repeat(40));
  await expect(page.locator('#jigsaw-editor-host textarea')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/generate/i})).toHaveCount(0);
});

test('controlled rejection and external replacement preserve accepted document and the actual input node',async({page})=>{
  await open(page,{acceptance:'reject'});
  await input(page,'name').evaluate(node=>{(window as unknown as{jigsawSaved:Node}).jigsawSaved=node;});
  await input(page,'name').fill('rejected');await expect(input(page,'name')).toHaveValue('minecraft:street');
  expect(await page.evaluate(()=>window.jigsawQA.events.filter(e=>e.kind==='value').at(-1)?.value)).toMatchObject({name:'rejected',selectionPriority:'-7',joint:'rollable'});
  const value=await page.evaluate(()=>window.jigsawQA.settings.value);
  await configure(page,{value:{...value,name:'external:accepted'},acceptance:'accept'});
  await expect(input(page,'name')).toHaveValue('external:accepted');
  expect(await input(page,'name').evaluate(node=>node===(window as unknown as{jigsawSaved:Node}).jigsawSaved)).toBe(true);
  await configure(page,{acceptance:'uppercase'});await input(page,'name').fill('host-transform');await expect(input(page,'name')).toHaveValue('HOST-TRANSFORM');
});

test('native selection, keyboard editing and caller properties survive unrelated rerenders',async({page})=>{
  await open(page);const name=input(page,'name');await name.focus();
  await name.evaluate(node=>{(node as HTMLInputElement).setSelectionRange(10,16);(window as unknown as{jigsawSaved:Node}).jigsawSaved=node;});
  await name.pressSequentially('road');await expect(name).toHaveValue('minecraft:road');
  await name.evaluate(node=>(node as HTMLInputElement).setSelectionRange(2,6));
  await configure(page,{nativeTitle:'New caller title'});await expect(name).toHaveAttribute('title','New caller title');
  expect(await name.evaluate(node=>({same:node===(window as unknown as{jigsawSaved:Node}).jigsawSaved,start:(node as HTMLInputElement).selectionStart,end:(node as HTMLInputElement).selectionEnd,active:document.activeElement===node}))).toEqual({same:true,start:2,end:6,active:true});
  expect(await page.evaluate(()=>window.jigsawQA.events.some(e=>e.kind==='native-change'&&(e.detail as {field:string}).field==='name'))).toBe(true);
});

test('uncontrolled six-field drafts update independently without identifier resolution or int32 clamping',async({page})=>{
  await open(page,{controlled:false});
  for(const[field,value]of [['targetPool','not a registry identifier'],['name',''],['target','custom:target'],['finalBlock','unknown:block'],['selectionPriority','-'],['placementPriority','2147483648']]){
    await input(page,field!).fill(value!);await expect(input(page,field!)).toHaveValue(value!);
  }
  await action(page,'done').click();
  expect(await page.evaluate(()=>window.jigsawQA.events.find(e=>e.kind==='done')?.value)).toMatchObject({targetPool:'not a registry identifier',name:'',target:'custom:target',finalBlock:'unknown:block',selectionPriority:'-',placementPriority:'2147483648'});
});

test('reusable paired priorities retain raw signed intermediate text and isolate the full editor',async({page})=>{
  await open(page);
  for(const value of ['','-','-0','-2147483648','2147483648','12e']){await input(page,'selectionPriority',true).fill(value);await expect(input(page,'selectionPriority',true)).toHaveValue(value);}
  await expect(input(page,'selectionPriority')).toHaveValue('-7');await expect(input(page,'placementPriority',true)).toHaveValue('34');
  await configure(page,{acceptance:'reject'});await input(page,'placementPriority',true).fill('rejected');await expect(input(page,'placementPriority',true)).toHaveValue('34');
  expect(await page.evaluate(()=>window.jigsawQA.refs.pair?.tagName)).toBe('FIELDSET');
  expect(await input(page,'placementPriority',true).evaluate(node=>window.jigsawQA.refs.pairInputs.placementPriority===node)).toBe(true);
});

test('disabled and readOnly protect editing while accepted text remains selectable',async({page})=>{
  await open(page,{disabled:true});
  for(const field of ['targetPool','name','target','finalBlock','selectionPriority','placementPriority'])await expect(input(page,field)).toBeDisabled();
  await configure(page,{disabled:false,readOnly:true});await expect(input(page,'name')).toBeEditable({editable:false});await input(page,'name').focus();
  await input(page,'name').evaluate(node=>(node as HTMLInputElement).setSelectionRange(0,9));
  expect(await input(page,'name').evaluate(node=>[(node as HTMLInputElement).selectionStart,(node as HTMLInputElement).selectionEnd])).toEqual([0,9]);
  await input(page,'name').pressSequentially('x');await expect(input(page,'name')).toHaveValue('minecraft:street');
  await action(page,'help').click();expect(await page.evaluate(()=>window.jigsawQA.events.filter(e=>e.kind==='help').length)).toBe(1);
});

test('joint enum changes use explicit Web checked mapping with controlled rejection and disabled joint',async({page})=>{
  await open(page,{acceptance:'reject'});
  const joint=page.locator('#jigsaw-editor-host input[role="switch"]');await expect(joint).not.toBeChecked();
  await joint.click();await expect(joint).not.toBeChecked();
  expect(await page.evaluate(()=>window.jigsawQA.events.filter(e=>e.kind==='value').at(-1))).toMatchObject({value:{joint:'aligned'},detail:{field:'joint'}});
  expect(await page.evaluate(()=>window.jigsawQA.settings.value.joint)).toBe('rollable');
  await configure(page,{acceptance:'accept'});await joint.focus();await joint.press('Space');await expect(joint).toBeChecked();
  expect(await page.evaluate(()=>window.jigsawQA.settings.value.joint)).toBe('aligned');
  await configure(page,{jointEnabled:false});await expect(joint).toBeDisabled();
  await configure(page,{jointEnabled:true});await joint.uncheck();expect(await page.evaluate(()=>window.jigsawQA.settings.value.joint)).toBe('rollable');
});

test('Help Done Back and Escape emit accepted snapshots without implicit generation or closing',async({page})=>{
  await open(page,{acceptance:'reject'});await input(page,'name').fill('temporary rejected');
  await action(page,'help').click();await action(page,'done').click();await action(page,'back').click();
  await input(page,'name').focus();await input(page,'name').press('Escape');
  const events=await page.evaluate(()=>window.jigsawQA.events.filter(e=>['help','done','cancel'].includes(e.kind)));
  expect(events.map(e=>e.kind)).toEqual(['help','done','cancel','cancel']);
  expect(events.slice(2).map(e=>e.detail)).toEqual([{reason:'back',eventType:'click'},{reason:'escape',eventType:'keydown'}]);
  for(const event of events)expect(event.value).toMatchObject({name:'minecraft:street',joint:'rollable'});
  await expect(page.locator('#jigsaw-editor-host .mc-jigsaw')).toBeVisible();
});

test('synthetic composition and caller defaultPrevented Escape guard cancellation even with stopped bubbling',async({page})=>{
  await open(page,{stopCompositionPropagation:true});const name=input(page,'name');await name.focus();
  await name.dispatchEvent('compositionstart',{data:''});await name.dispatchEvent('compositionupdate',{data:'拼'});await name.press('Escape');
  expect(await page.evaluate(()=>window.jigsawQA.events.filter(e=>e.kind==='cancel').length)).toBe(0);
  await name.dispatchEvent('compositionend',{data:'拼'});await configure(page,{preventEscape:true});await name.press('Escape');
  expect(await page.evaluate(()=>window.jigsawQA.events.filter(e=>e.kind==='cancel').length)).toBe(0);
  await configure(page,{preventEscape:false});await name.press('Escape');
  expect(await page.evaluate(()=>window.jigsawQA.events.filter(e=>e.kind==='cancel').length)).toBe(1);
  expect(await page.evaluate(()=>window.jigsawQA.events.filter(e=>e.kind.startsWith('composition')).map(e=>e.kind))).toEqual(['composition-start','composition-end']);
});

test('small logical viewport scrolls content while footer stays outside and StrictMode cleanup clears native refs',async({page})=>{
  await open(page,{size:[280,180]},true);
  const viewport=page.locator('#jigsaw-editor-host .mc-scroll-area__viewport');
  expect(await viewport.evaluate(node=>node.scrollHeight>node.clientHeight)).toBe(true);
  const before=await action(page,'done').boundingBox();await viewport.evaluate(node=>{node.scrollTop=node.scrollHeight;});
  await expect(input(page,'placementPriority')).toBeVisible();expect(await action(page,'done').boundingBox()).toEqual(before);
  expect(await page.evaluate(()=>window.jigsawQA.refs.viewport?.scrollTop)).toBeGreaterThan(0);
  await page.evaluate(()=>window.jigsawQA.unmount());
  expect(await page.evaluate(()=>({editor:window.jigsawQA.refs.editor,pair:window.jigsawQA.refs.pair,joint:window.jigsawQA.refs.joint,viewport:window.jigsawQA.refs.viewport,inputs:Object.values(window.jigsawQA.refs.inputs),pairInputs:Object.values(window.jigsawQA.refs.pairInputs)}))).toEqual({editor:null,pair:null,joint:null,viewport:null,inputs:[null,null,null,null,null,null],pairInputs:[null,null]});
});

test('public components render SSR with typed refs without warnings IO or configuration attribute leakage',async()=>{
  const errors:unknown[][]=[],oldError=console.error,oldFetch=globalThis.fetch;let io=0;
  console.error=(...args)=>{errors.push(args);};globalThis.fetch=(..._args)=>{io++;throw new Error('Unexpected SSR fetch');};
  try{
    const editor=renderToStaticMarkup(createElement(JigsawEditor,{ref:createRef<HTMLElement>(),value:{targetPool:'',name:'accepted',target:'',finalBlock:'',selectionPriority:'-',placementPriority:'0',joint:'rollable'},inputRefs:{name:createRef<HTMLInputElement>()},jointRef:createRef<HTMLInputElement>()}));
    const pair=renderToStaticMarkup(createElement(JigsawPriorityFields,{ref:createRef<HTMLFieldSetElement>(),defaultValue:{selectionPriority:'-7',placementPriority:'0'},inputRefs:{selectionPriority:createRef<HTMLInputElement>()}}));
    expect(editor).toContain('value="accepted"');expect(pair).toContain('value="-7"');expect(editor.match(/maxlength="40"/gi)).toHaveLength(6);expect(pair.match(/maxlength="40"/gi)).toHaveLength(2);
    expect(editor).not.toMatch(/priorityFieldHeight=|jointEnabled=|scrollViewportRef=|inputRefs=|defaultValue=/);expect(errors).toEqual([]);expect(io).toBe(0);
  }finally{console.error=oldError;globalThis.fetch=oldFetch;}
});
