import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';
import {createElement,createRef} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ServerActionForm,ServerCustomForm} from '../src/server-forms';
import type {ServerFormsQASettings} from '../demo/server-forms-fixture';
async function configure(page:Page,patch:Partial<ServerFormsQASettings>){await page.evaluate(value=>window.serverFormsQA.configure(value),patch);}
async function open(page:Page,patch:Partial<ServerFormsQASettings>={},strict=false){await page.goto(`/demo/server-forms-fixture.html${strict?'?strict':''}`);await expect.poll(()=>page.evaluate(()=>window.serverFormsQA?.mounted)).toBe(true);await configure(page,{scale:1,...patch});}
const action=(page:Page)=>page.locator('#server-action-host .mc-server-action-form');
const custom=(page:Page)=>page.locator('#server-custom-host .mc-server-custom-form');
const name=(page:Page)=>custom(page).getByRole('textbox',{name:'Player name',exact:true});
async function events(page:Page,kind:string){return page.evaluate(kind=>window.serverFormsQA.events.filter(event=>event.kind===kind),kind);}

test('action rows preserve semantic order and emit isolated row IDs indices and snapshots on real keyboard activation',async({page})=>{
  await open(page);const button=action(page).getByRole('button',{name:'Plain action',exact:true});await button.focus();await button.press('Enter');
  expect(await events(page,'action')).toMatchObject([{value:'plain',detail:{index:2,row:{id:'plain',type:'button',text:'Plain action'}}}]);
  await page.evaluate(()=>{(window.serverFormsQA.snapshots[0] as {text:string}).text='tampered';});await expect(button).toHaveText('Plain action');
  await expect(action(page).getByRole('button',{name:'Locked action',exact:true})).toBeDisabled();expect(await action(page).locator('[data-server-row-id]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-server-row-id')))).toEqual(['info','section','plain','ready','loading','locked','separator']);
});

test('explicit none loading ready and failed icon states do not fetch magic loading URLs or replace action nodes',async({page})=>{
  const requested:string[]=[];page.on('request',request=>requested.push(request.url()));await page.route('**/qa-broken-icon.png',route=>route.fulfill({status:404,body:'missing'}));await open(page);
  const button=action(page).getByRole('button',{name:'Loading action',exact:true});await button.evaluate(node=>{(window as unknown as{savedAction:Node}).savedAction=node;});
  expect(requested.some(url=>/\/loading(?:[?#]|$)/.test(url))).toBe(false);expect(await action(page).locator('[data-server-row-id="loading"] img').count()).toBe(0);
  const rows=await page.evaluate(()=>window.serverFormsQA.settings.rows);await expect(action(page).locator('.mc-server-action-form__loading')).toBeVisible();await configure(page,{rows:rows.map(row=>row.id==='loading'&&row.type==='button'?{...row,icon:{state:'loading',visible:false}}:row)});await expect(action(page).locator('.mc-server-action-form__loading')).toBeHidden();await expect(action(page).locator('[data-server-row-id="loading"] .mc-server-action-form__icon')).toBeVisible();await configure(page,{rows:rows.map(row=>row.id==='loading'&&row.type==='button'?{...row,icon:{state:'ready',url:'/qa-broken-icon.png'}}:row)});
  await expect.poll(()=>events(page,'icon-error')).toContainEqual({kind:'icon-error',value:'loading'});expect(await button.evaluate(node=>node===(window as unknown as{savedAction:Node}).savedAction)).toBe(true);await button.click();expect((await events(page,'action')).at(-1)).toMatchObject({value:'loading'});
});

test('all nine schema kinds render and submit a typed accepted payload excluding informational IDs',async({page})=>{
  await open(page,{showAction:false});expect(await custom(page).locator('[data-server-field-id]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-server-field-type')))).toEqual(['label','header','input','toggle','slider','step_slider','dropdown','multiselect','divider']);
  await name(page).fill('Player');await custom(page).getByRole('switch',{name:'Enabled',exact:true}).click();await custom(page).getByRole('button',{name:'Submit form',exact:true}).click();
  expect((await events(page,'submit')).at(-1)?.value).toEqual({name:'Player',enabled:false,amount:1,stage:'second',difficulty:'easy',features:['a']});
  await page.evaluate(()=>{const snapshot=window.serverFormsQA.snapshots.at(-1) as {features:string[];name:string};snapshot.features.push('tampered');snapshot.name='mutated';});await expect(name(page)).toHaveValue('Player');expect(await page.evaluate(()=>window.serverFormsQA.settings.value.features)).toEqual(['a']);
});

test('controlled refusal reports attempted text and toggle values while submit and cancel retain accepted state',async({page})=>{
  await open(page,{showAction:false,acceptance:'reject'});await name(page).fill('Rejected');await expect(name(page)).toHaveValue('QA');const toggle=custom(page).getByRole('switch',{name:'Enabled',exact:true});await toggle.click();await expect(toggle).toBeChecked();
  expect(await events(page,'value')).toMatchObject([{value:{name:'Rejected'},detail:{id:'name',type:'input'}},{value:{enabled:false},detail:{id:'enabled',type:'toggle'}}]);
  await custom(page).getByRole('button',{name:'Submit form',exact:true}).click();await name(page).focus();await name(page).press('Escape');
  expect((await events(page,'submit')).at(-1)?.value).toMatchObject({name:'QA',enabled:true});expect((await events(page,'custom-cancel')).at(-1)).toMatchObject({value:{name:'QA',enabled:true},detail:{reason:'escape'}});
});

test('uncontrolled input remains raw max100 and survives unrelated prop changes without resetting native state',async({page})=>{
  await open(page,{showAction:false,controlled:false});await expect(name(page)).toHaveAttribute('maxlength','100');await name(page).fill('0- raw unicode 名');await configure(page,{nativeTitle:'Changed caller title',value:{name:'ignored default',enabled:false,amount:4,stage:'last',difficulty:'hard',features:[]}});await expect(name(page)).toHaveValue('0- raw unicode 名');await expect(name(page)).toHaveAttribute('title','Changed caller title');
  await name(page).fill('x'.repeat(100));await name(page).pressSequentially('y');expect((await name(page).inputValue()).length).toBe(100);
});

test('numeric slider uses explicit min max step and step slider exposes stable string IDs rather than numeric indices',async({page})=>{
  await open(page,{showAction:false});const amount=custom(page).getByRole('slider',{name:'Amount',exact:true}),stage=custom(page).getByRole('slider',{name:'Stage',exact:true});await expect(amount).toHaveAttribute('min','-2');await expect(amount).toHaveAttribute('max','6');await expect(amount).toHaveAttribute('step','0.5');await amount.focus();await amount.press('ArrowRight');expect(await page.evaluate(()=>window.serverFormsQA.settings.value.amount)).toBe(1.5);
  await stage.focus();await stage.press('ArrowRight');expect(await page.evaluate(()=>window.serverFormsQA.settings.value.stage)).toBe('last');await expect(stage).toHaveAttribute('aria-valuetext','Last');await stage.press('Home');expect(await page.evaluate(()=>window.serverFormsQA.settings.value.stage)).toBe('first');
});

test('dropdown separates active and selected options and keyboard skips disabled choices with Escape cancellation',async({page})=>{
  await open(page,{showAction:false});const combo=custom(page).getByRole('combobox',{name:'Difficulty',exact:true});await combo.click();await expect(custom(page).getByRole('option',{name:'Easy',exact:true})).toHaveAttribute('aria-selected','true');await expect(custom(page).getByRole('option',{name:'Locked',exact:true})).toHaveAttribute('aria-disabled','true');await combo.press('End');await combo.press('Escape');await expect(combo).toHaveText('Easy');await expect(combo).toBeFocused();
  await combo.press('ArrowDown');await combo.press('End');await combo.press('Enter');await expect(combo).toHaveText('Hard');expect(await page.evaluate(()=>window.serverFormsQA.settings.value.difficulty)).toBe('hard');
});

test('multiselect expansion is independent of selected array and controlled expansion refusal preserves accepted checks',async({page})=>{
  await open(page,{showAction:false});let fields=await page.evaluate(()=>window.serverFormsQA.settings.fields);await configure(page,{fields:fields.map(field=>field.id==='features'&&field.type==='multiselect'?{...field,expanded:false}:field)});const header=custom(page).getByRole('button',{name:'Features',exact:true});await header.click();await expect(header).toHaveAttribute('aria-expanded','false');expect((await events(page,'expanded')).at(-1)).toMatchObject({value:true,detail:{id:'features'}});
  await configure(page,{acceptExpanded:true});await header.click();await expect(header).toHaveAttribute('aria-expanded','true');const alpha=custom(page).getByRole('checkbox',{name:'Alpha',exact:true}),beta=custom(page).getByRole('checkbox',{name:'Beta',exact:true});await expect(alpha).toBeChecked();await beta.click();expect(await page.evaluate(()=>window.serverFormsQA.settings.value.features)).toEqual(['a','b']);await expect(custom(page).getByRole('checkbox',{name:'Gamma',exact:true})).toBeDisabled();expect(await beta.evaluate(node=>window.serverFormsQA.refs.options.features?.b===node)).toBe(true);
  await configure(page,{acceptance:'reject'});await alpha.click();await expect(alpha).toBeChecked();expect((await events(page,'value')).at(-1)?.value).toMatchObject({features:['b']});fields=await page.evaluate(()=>window.serverFormsQA.settings.fields);await configure(page,{fields:fields.map(field=>field.id==='features'&&field.type==='multiselect'?{...field,expanded:false}:field)});expect(await page.evaluate(()=>window.serverFormsQA.settings.value.features)).toEqual(['a','b']);
});

test('schema edits preserve keyed live inputs exclude orphan static keys and include hidden disabled editable values without emitting changes',async({page})=>{
  await open(page,{showAction:false});await name(page).evaluate(node=>{(window as unknown as{savedName:Node}).savedName=node;});const fields=await page.evaluate(()=>window.serverFormsQA.settings.fields),value=await page.evaluate(()=>window.serverFormsQA.settings.value);await configure(page,{fields:[...fields.slice().reverse(),{id:'extra',type:'input',label:'Extra field',defaultValue:'fallback',visible:false,disabled:true}],value:{...value,extra:'hidden accepted',orphan:'ignore',intro:'not editable'}});
  expect(await name(page).evaluate(node=>node===(window as unknown as{savedName:Node}).savedName)).toBe(true);expect(await events(page,'value')).toEqual([]);await custom(page).getByRole('button',{name:'Submit form',exact:true}).click();expect((await events(page,'submit')).at(-1)?.value).toEqual({...value,extra:'hidden accepted'});
  await configure(page,{fields:fields.map(field=>field.id==='difficulty'&&field.type==='dropdown'?{...field,options:field.options.filter(option=>option.value!=='hard')}:field),value:{...value,difficulty:'hard'}});expect(await events(page,'value')).toEqual([]);await custom(page).getByRole('button',{name:'Submit form',exact:true}).click();expect((await events(page,'submit')).at(-1)?.value).toMatchObject({difficulty:'hard'});
  await configure(page,{fields:fields.filter(field=>field.id!=='difficulty')});await custom(page).getByRole('button',{name:'Submit form',exact:true}).click();expect((await events(page,'submit')).at(-1)?.value).not.toHaveProperty('difficulty');
});

test('external accepted values preserve real input node caller refs selection and native props',async({page})=>{
  await open(page,{showAction:false});await name(page).focus();await name(page).evaluate(node=>{const input=node as HTMLInputElement;input.setSelectionRange(0,1);(window as unknown as{savedName:Node}).savedName=node;});await configure(page,{nativeTitle:'External paint unchanged'});expect(await name(page).evaluate(node=>({same:node===(window as unknown as{savedName:Node}).savedName,ref:window.serverFormsQA.refs.inputs.name===node,start:(node as HTMLInputElement).selectionStart,end:(node as HTMLInputElement).selectionEnd}))).toEqual({same:true,ref:true,start:0,end:1});await expect(name(page)).toHaveAttribute('id','qa-server-name');
  const fields=await page.evaluate(()=>window.serverFormsQA.settings.fields);await configure(page,{fields:fields.map(field=>field.id==='name'?{...field,tooltip:'Caller tooltip added'}:field)});expect(await name(page).evaluate(node=>({same:node===(window as unknown as{savedName:Node}).savedName,start:(node as HTMLInputElement).selectionStart,end:(node as HTMLInputElement).selectionEnd,active:document.activeElement===node}))).toEqual({same:true,start:0,end:1,active:true});
  const value=await page.evaluate(()=>window.serverFormsQA.settings.value);await configure(page,{value:{...value,name:'Accepted external'}});await expect(name(page)).toHaveValue('Accepted external');expect(await name(page).evaluate(node=>node===(window as unknown as{savedName:Node}).savedName)).toBe(true);
});

test('composition and key229 suppress Escape despite stopped bubbling while default prevented key requests remain caller-owned',async({page})=>{
  await open(page,{showAction:false,stopCompositionPropagation:true});await name(page).focus();await name(page).dispatchEvent('compositionstart',{data:''});await configure(page,{nativeTitle:'Rerender during preedit'});await expect(name(page)).toHaveAttribute('title','Rerender during preedit');await name(page).press('Escape');expect(await events(page,'custom-cancel')).toEqual([]);await name(page).dispatchEvent('compositionend',{data:'字'});await name(page).dispatchEvent('keydown',{key:'Escape',keyCode:229,bubbles:true});expect(await events(page,'custom-cancel')).toEqual([]);
  await configure(page,{preventEscape:true});await name(page).press('Escape');expect(await events(page,'custom-cancel')).toEqual([]);await configure(page,{preventEscape:false});await name(page).press('Escape');expect(await events(page,'custom-cancel')).toHaveLength(1);expect((await events(page,'composition-start')).length).toBe(1);expect((await events(page,'composition-end')).length).toBe(1);
});

test('disabled readonly submit visibility and close permission remain explicit independent host guards',async({page})=>{
  await open(page,{readOnly:true});await expect(name(page)).toBeEditable({editable:false});await expect(custom(page).getByRole('button',{name:'Submit form',exact:true})).toBeDisabled();await expect(action(page).getByRole('button',{name:'Plain action',exact:true})).toBeDisabled();await action(page).getByRole('button',{name:'Close',exact:true}).click();expect(await events(page,'action-cancel')).toHaveLength(1);
  await configure(page,{readOnly:false,disabled:true});await expect(name(page)).toBeDisabled();await expect(custom(page).getByRole('combobox')).toBeDisabled();await expect(custom(page).getByRole('button',{name:'Close',exact:true})).toBeDisabled();await custom(page).dispatchEvent('keydown',{key:'Escape',bubbles:true});expect(await events(page,'custom-cancel')).toEqual([]);await configure(page,{disabled:false,submitVisible:false,closeEnabled:false});await expect(custom(page).getByRole('button',{name:'Submit form',exact:true})).toHaveCount(0);await expect(custom(page).getByRole('button',{name:'Close',exact:true})).toBeDisabled();await configure(page,{closeVisible:false});await expect(custom(page).getByRole('button',{name:'Close',exact:true})).toHaveCount(0);
});

test('source information tooltip supports focus pointer pinning viewport flip Escape isolation and listener cleanup',async({page})=>{
  await page.addInitScript(()=>{
    const records=new Map<string,Set<EventListenerOrEventListenerObject>>();const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
    const tracked=(target:EventTarget,type:string)=>target===document&&['pointerdown','focusin','keydown'].includes(type);
    const key=(type:string,options?:boolean|EventListenerOptions)=>`${type}:${(typeof options==='boolean'?options:!!options?.capture)?'capture':'bubble'}`;
    EventTarget.prototype.addEventListener=function(type,listener,options){if(listener&&tracked(this,type)){const phase=key(type,options),set=records.get(phase)??new Set();set.add(listener);records.set(phase,set);}return add.call(this,type,listener,options);};
    EventTarget.prototype.removeEventListener=function(type,listener,options){if(listener&&tracked(this,type))records.get(key(type,options))?.delete(listener);return remove.call(this,type,listener,options);};
    (window as unknown as{serverListenerCounts:()=>Record<string,number>}).serverListenerCounts=()=>{const counts=Object.fromEntries([...records].map(([phase,set])=>[phase,set.size]));for(const type of['pointerdown','focusin','keydown'])counts[type]=(counts[`${type}:capture`]??0)+(counts[`${type}:bubble`]??0);return counts;};
  });
  await open(page,{showAction:false,fields:[{id:'name',type:'input',label:'Player name',tooltip:'Source information'}]});const counts=()=>page.evaluate(()=>(window as unknown as{serverListenerCounts:()=>Record<string,number>}).serverListenerCounts());const baseline=await counts();
  const host=page.locator('#server-custom-host'),info=custom(page).getByRole('button',{name:'Player name information',exact:true}),tip=page.getByRole('tooltip');await host.evaluate(node=>Object.assign((node as HTMLElement).style,{position:'fixed',top:'0',left:'0',margin:'0'}));await info.focus();await expect(tip).toBeVisible();await expect(tip).toHaveAttribute('data-side','below');await expect(info).toHaveAttribute('aria-describedby',(await tip.getAttribute('id'))!);
  await info.press('Escape');await expect(tip).toHaveCount(0);expect(await events(page,'custom-cancel')).toEqual([]);await info.press('Escape');expect(await events(page,'custom-cancel')).toHaveLength(1);
  await page.locator('#server-forms-sink').focus();await host.evaluate(node=>{(node as HTMLElement).style.top='300px';});await info.focus();await expect(tip).toHaveAttribute('data-side','above');await expect(tip).toBeVisible();
  await info.hover();await info.click();await expect(tip).toBeVisible();await info.click();await expect(tip).toHaveCount(0);await page.locator('#server-forms-sink').focus();await page.mouse.move(390,10);await info.hover();await expect(tip).toBeVisible();await tip.hover();await page.waitForTimeout(150);await expect(tip).toBeVisible();await page.locator('#server-forms-sink').click();await expect(tip).toHaveCount(0);await expect(page.locator('#server-forms-sink')).toBeFocused();
  await configure(page,{readOnly:true});await info.focus();await expect(tip).toBeVisible();await expect(name(page)).toBeEditable({editable:false});await configure(page,{disabled:true});
  // Source option_generic_tooltip focus enabled=$tooltip_two_line_layout, independent of field enabled.
  // Web disabled blocks host requests while explanatory information remains readable.
  await expect(info).toBeVisible();await expect(info).toBeEnabled();await expect(tip).toBeVisible();await expect(name(page)).toBeDisabled();await expect(custom(page).getByRole('button',{name:'Submit form',exact:true})).toBeDisabled();await expect(custom(page).getByRole('button',{name:'Close',exact:true})).toBeDisabled();
  const protectedEvents=await page.evaluate(()=>window.serverFormsQA.events.filter(event=>['value','submit','custom-cancel'].includes(event.kind)));await info.click();await expect(tip).toBeVisible();await info.click();await expect(tip).toHaveCount(0);await info.click();await expect(tip).toBeVisible();expect(await page.evaluate(()=>window.serverFormsQA.events.filter(event=>['value','submit','custom-cancel'].includes(event.kind)))).toEqual(protectedEvents);
  const fields=await page.evaluate(()=>window.serverFormsQA.settings.fields);await configure(page,{fields:fields.map(field=>({...field,visible:false}))});await expect(info).toBeHidden();await expect(tip).toHaveCount(0);
  await configure(page,{disabled:false,readOnly:false,fields});await info.focus();await expect(tip).toBeVisible();const active=await counts();for(const type of['pointerdown','focusin','keydown'])expect(active[type]).toBe((baseline[type]??0)+1);await page.evaluate(()=>window.serverFormsQA.unmount());await expect(tip).toHaveCount(0);const after=await counts();for(const phase of new Set([...Object.keys(baseline),...Object.keys(after)]))expect(after[phase]??0).toBe(baseline[phase]??0);expect(await page.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})))).toBe(true);
});

test('two instances and StrictMode cleanup isolate values refs and event listeners',async({page})=>{
  await open(page,{showAction:false,showSecond:true},true);const second=page.locator('#server-second-host').getByRole('textbox',{name:'Second player',exact:true});await second.fill('Second changed');await expect(name(page)).toHaveValue('QA');await name(page).fill('First changed');await expect(second).toHaveValue('Second changed');await name(page).focus();await name(page).press('Escape');expect(await events(page,'custom-cancel')).toHaveLength(1);
  await page.evaluate(()=>window.serverFormsQA.unmount());await expect(page.locator('.mc-server-custom-form')).toHaveCount(0);expect(await page.evaluate(()=>({custom:window.serverFormsQA.refs.custom,input:window.serverFormsQA.refs.inputs.name,viewport:window.serverFormsQA.refs.customViewport}))).toEqual({custom:null,input:null,viewport:null});
});

test('typed refs and SSR do not perform IO or silently coerce invalid schema values',()=>{
  const oldFetch=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unexpected SSR IO');};try{const ref=createRef<HTMLElement>(),inputRef=createRef<HTMLInputElement>();const html=renderToStaticMarkup(createElement(ServerCustomForm,{ref,title:'SSR form',fields:[{id:'name',type:'input',label:'SSR name',defaultValue:'raw'}],inputRefs:{name:inputRef},value:{name:'kept'}}));expect(html).toContain('SSR form');expect(html).toContain('kept');expect(html).toContain('maxLength="100"');expect(renderToStaticMarkup(createElement(ServerActionForm,{title:'SSR actions',rows:[{id:'load',type:'button',text:'Loading',icon:{state:'loading'}}]}))).toContain('Loading');expect(calls).toBe(0);expect(()=>renderToStaticMarkup(createElement(ServerCustomForm,{title:'Invalid',fields:[{id:'x',type:'toggle',label:'Bad'}],value:{x:'not boolean'}}))).toThrow();}finally{globalThis.fetch=oldFetch;}
});
