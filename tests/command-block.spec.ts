import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';
import {createElement,createRef} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CommandBlockEditor,CommandInput,CommandOutputPanel} from '../src/command-block';
import type {CommandQASettings} from '../demo/command-block-fixture';
async function configure(page:Page,patch:Partial<CommandQASettings>){await page.evaluate(value=>window.commandQA.configure(value),patch);}
async function open(page:Page,patch:Partial<CommandQASettings>={},strict=false){await page.goto(`/demo/command-block-fixture.html${strict?'?strict':''}`);await expect.poll(()=>page.evaluate(()=>window.commandQA?.mounted)).toBe(true);await configure(page,{scale:1,viewportSize:[340,420],...patch});}
const editor=(page:Page)=>page.locator('#command-editor-host .mc-command-block');
const command=(page:Page)=>page.locator('#command-actual-text');
const action=(page:Page,name:string)=>editor(page).locator(`[data-command-action="${name}"]`);
const combo=(page:Page,name:string)=>editor(page).getByRole('combobox',{name,exact:true});

test('source fields use actual native inputs, three custom mode dropdowns and no invented Help or Back actions',async({page})=>{
  await open(page);
  await expect(editor(page).getByLabel('Hover Note',{exact:true})).toHaveAttribute('maxlength','15');
  await expect(editor(page).getByLabel('Delay in Ticks:',{exact:true})).toHaveAttribute('maxlength','5');
  await expect(command(page)).toHaveAttribute('maxlength','32500');
  expect(await command(page).evaluate(node=>({tag:node.tagName,ref:window.commandQA.refs.textarea===node}))).toEqual({tag:'TEXTAREA',ref:true});
  await expect(combo(page,'Block Type:')).toContainText('Impulse');await expect(combo(page,'Condition:')).toContainText('Unconditional');await expect(combo(page,'Redstone:')).toContainText('Needs Redstone');
  await expect(editor(page).getByRole('button',{name:/^(Help|Back|Generate)$/})).toHaveCount(0);
  await expect(editor(page).locator('.mc-command-block__helpers')).toHaveText('@s = self@p = nearest player@r = random player@a = all players@e = all entities@n = nearest entity');
  expect(await page.evaluate(()=>[window.commandQA.refs.hoverNote?.tagName,window.commandQA.refs.tickDelay?.tagName,window.commandQA.refs.blockType?.tagName])).toEqual(['INPUT','INPUT','BUTTON']);
});

test('controlled command rejection, host transforms and external values retain textarea node native selection and refs',async({page})=>{
  await open(page,{acceptance:'reject'});await command(page).evaluate(node=>{(window as unknown as{savedCommand:Node}).savedCommand=node;});
  await command(page).fill('rejected');await expect(command(page)).toHaveValue('say accepted');
  expect(await page.evaluate(()=>window.commandQA.events.filter(e=>e.kind==='value').at(-1))).toMatchObject({value:{command:'rejected'},detail:{field:'command'}});
  await configure(page,{acceptance:'accept'});await command(page).focus();await command(page).evaluate(node=>(node as HTMLTextAreaElement).setSelectionRange(4,12));await command(page).pressSequentially('road');await expect(command(page)).toHaveValue('say road');
  await command(page).evaluate(node=>(node as HTMLTextAreaElement).setSelectionRange(1,4));await configure(page,{nativeTitle:'Changed title'});await expect(command(page)).toHaveAttribute('title','Changed title');
  expect(await command(page).evaluate(node=>[node===(window as unknown as{savedCommand:Node}).savedCommand,(node as HTMLTextAreaElement).selectionStart,(node as HTMLTextAreaElement).selectionEnd])).toEqual([true,1,4]);
  const value=await page.evaluate(()=>window.commandQA.settings.value);await configure(page,{value:{...value,command:'external accepted'},acceptance:'uppercase'});await expect(command(page)).toHaveValue('external accepted');await command(page).fill('say transformed');await expect(command(page)).toHaveValue('SAY TRANSFORMED');
});

test('raw tick delay intermediate negative and invalid drafts are not parsed or clamped and hover note respects15',async({page})=>{
  await open(page,{controlled:false});const tick=page.locator('#command-tick-delay');
  for(const value of['','-','-12','1e','99999']){await tick.fill(value);await expect(tick).toHaveValue(value);}
  await tick.fill('123456');await expect(tick).toHaveValue('12345');
  await page.locator('#command-hover-note').fill('n'.repeat(22));await expect(page.locator('#command-hover-note')).toHaveValue('n'.repeat(15));
  expect(await tick.evaluate(node=>({tag:node.tagName,type:(node as HTMLInputElement).type}))).toEqual({tag:'INPUT',type:'text'});
});

test('mode dropdown order, keyboard selection and controlled refusal do not fabricate previous snapshots or icons',async({page})=>{
  await open(page,{acceptance:'reject',callerIcon:true});const block=combo(page,'Block Type:');
  await block.click();await expect(editor(page).getByRole('option')).toHaveText(['Impulse','Chain','Repeat']);await editor(page).getByRole('option',{name:'Chain',exact:true}).click();await expect(block).toContainText('Impulse');
  await configure(page,{acceptance:'accept'});await block.focus();await block.press('ArrowDown');await block.press('ArrowDown');await block.press('Enter');await expect(block).toContainText('Chain');
  for(const[name,labels]of [['Condition:',['Conditional','Unconditional']],['Redstone:',['Always Active','Needs Redstone']]]as const){await combo(page,name).click();await expect(editor(page).getByRole('option')).toHaveText([...labels]);await editor(page).getByRole('option',{name:labels[0],exact:true}).click();}
  expect(await page.evaluate(()=>window.commandQA.settings.value)).toMatchObject({blockType:'chain',condition:'conditional',redstone:'always_on'});
  await expect(editor(page).locator('[data-command-previous="blockType"]')).toContainText('Historic chain');await expect(editor(page).locator('[data-command-previous="condition"]')).toContainText('Historic conditional');await expect(editor(page).locator('#command-caller-icon')).toHaveText('HOST');
});

test('Enter is blocked outside composition while imported newlines and composing or229 Enter are not rewritten',async({page})=>{
  await open(page);await command(page).focus();await command(page).press('End');await command(page).press('Enter');await command(page).press('Shift+Enter');await expect(command(page)).toHaveValue('say accepted');
  const value=await page.evaluate(()=>window.commandQA.settings.value);await configure(page,{value:{...value,command:'imported\nline'}});await expect(command(page)).toHaveValue('imported\nline');
  expect(await command(page).evaluate(node=>node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true})))).toBe(true);
  expect(await command(page).evaluate(node=>node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',keyCode:229,bubbles:true,cancelable:true})))).toBe(true);
});

test('rejected and accepted maximize/minimize keep one textarea, accepted text, selection and no hidden extra tabstops',async({page})=>{
  await open(page,{rejectExpansion:true});await command(page).evaluate(node=>{(window as unknown as{savedCommand:Node}).savedCommand=node;(node as HTMLTextAreaElement).setSelectionRange(2,6);});
  await action(page,'maximize').click();await expect(editor(page)).toHaveAttribute('data-expanded','false');
  expect(await page.evaluate(()=>window.commandQA.events.filter(e=>e.kind==='expanded').at(-1))).toMatchObject({value:true,detail:{reason:'maximize'}});
  await configure(page,{rejectExpansion:false});await action(page,'maximize').click();await expect(editor(page)).toHaveAttribute('data-expanded','true');
  await expect(editor(page).locator('textarea')).toHaveCount(1);await expect(editor(page).getByRole('combobox')).toHaveCount(0);await expect(action(page,'maximize')).toBeHidden();
  expect(await editor(page).evaluate(root=>Array.from(root.querySelectorAll<HTMLElement>('button,input,textarea,select,[tabindex]')).filter(node=>node.tabIndex>=0&&!node.matches(':disabled')&&node.getClientRects().length>0&&getComputedStyle(node).visibility!=='hidden').map(node=>node.tagName==='TEXTAREA'?'command':node.getAttribute('data-command-action')).sort())).toEqual(['command','header-minimize','header-paste']);
  expect(await command(page).evaluate(node=>({same:node===(window as unknown as{savedCommand:Node}).savedCommand,start:(node as HTMLTextAreaElement).selectionStart,end:(node as HTMLTextAreaElement).selectionEnd,ref:window.commandQA.refs.textarea===node}))).toEqual({same:true,start:2,end:6,ref:true});
  await action(page,'header-minimize').click();await expect(editor(page)).toHaveAttribute('data-expanded','false');await expect(command(page)).toHaveValue('say accepted');
  await action(page,'maximize').click();await command(page).focus();await command(page).press('Escape');await expect(editor(page)).toHaveAttribute('data-expanded','false');
  expect(await page.evaluate(()=>window.commandQA.events.filter(e=>e.kind==='close'))).toEqual([]);
});

test('composition holds external expansion and blocks Escape close despite stopped child composition bubbling',async({page})=>{
  await open(page,{stopCompositionPropagation:true});await command(page).focus();await command(page).dispatchEvent('compositionstart',{data:''});
  await configure(page,{expanded:true});await expect(editor(page)).toHaveAttribute('data-expanded','false');await command(page).press('Escape');
  expect(await page.evaluate(()=>window.commandQA.events.filter(e=>e.kind==='close').length)).toBe(0);
  await command(page).dispatchEvent('compositionend',{data:'命'});await expect(editor(page)).toHaveAttribute('data-expanded','true');await expect(command(page)).toHaveValue('say accepted');
  await command(page).press('Escape');await expect(editor(page)).toHaveAttribute('data-expanded','false');
  expect(await page.evaluate(()=>window.commandQA.events.filter(e=>e.kind.startsWith('composition')).map(e=>e.kind))).toEqual(['composition-start','composition-end']);
});

test('Paste only requests the accepted snapshot and explicit warning or availability flags govern visible controls',async({page})=>{
  await open(page,{acceptance:'reject'});
  await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText(){throw new Error('Clipboard reads are forbidden by this callback-only contract');}}});});
  await command(page).fill('rejected');await action(page,'paste').click();
  expect(await page.evaluate(()=>window.commandQA.events.filter(e=>e.kind==='paste').at(-1))).toMatchObject({value:{command:'say accepted'}});await expect(command(page)).toHaveValue('say accepted');
  await configure(page,{pasteEnabled:false});await expect(action(page,'paste')).toBeDisabled();
  await configure(page,{pasteEnabled:true,charLimitWarning:true});await expect(command(page)).toBeDisabled();await expect(editor(page).getByRole('status')).toBeVisible();
  await configure(page,{expanded:true});await expect(action(page,'header-paste')).toBeEnabled();await action(page,'header-paste').click();
  expect(await page.evaluate(()=>window.commandQA.events.filter(e=>e.kind==='paste').length)).toBe(2);
});

test('disabled readOnly and independent field flags preserve accepted values without guessing mode conditions',async({page})=>{
  await open(page,{firstTickEnabled:false,enabled:{condition:false}});
  await expect(editor(page).locator('[data-command-field="executeFirstTick"]')).toBeDisabled();await expect(combo(page,'Condition:')).toBeDisabled();await expect(combo(page,'Block Type:')).toBeEnabled();
  const track=editor(page).locator('[data-command-field="trackOutput"]');
  await configure(page,{cancelEnabled:false,trackOutputEnabled:false});await expect(action(page,'cancel')).toBeDisabled();await expect(track).toBeDisabled();await expect(action(page,'close')).toBeEnabled();
  await command(page).focus();await command(page).press('Escape');await action(page,'close').click();
  expect(await page.evaluate(()=>window.commandQA.events.filter(e=>e.kind==='close').map(e=>(e.detail as{reason:string}).reason))).toEqual(['escape','close']);
  await configure(page,{cancelEnabled:true,trackOutputEnabled:false});await expect(action(page,'cancel')).toBeEnabled();await expect(track).toBeDisabled();
  await configure(page,{cancelEnabled:false,trackOutputEnabled:true});await expect(action(page,'cancel')).toBeDisabled();await expect(track).toBeEnabled();
  await configure(page,{disabled:true});await expect(command(page)).toBeDisabled();await expect(action(page,'close')).toBeDisabled();
  await configure(page,{disabled:false,readOnly:true,firstTickEnabled:true,enabled:{}});await expect(command(page)).toBeEditable({editable:false});await expect(combo(page,'Block Type:')).toBeDisabled();await expect(action(page,'paste')).toBeDisabled();
  await command(page).focus();await command(page).evaluate(node=>(node as HTMLTextAreaElement).setSelectionRange(0,3));expect(await command(page).evaluate(node=>[(node as HTMLTextAreaElement).selectionStart,(node as HTMLTextAreaElement).selectionEnd])).toEqual([0,3]);
  await configure(page,{readOnly:false});await expect(editor(page).locator('[data-command-field="executeFirstTick"]')).toBeEnabled();
});

test('read-only output snapshots and previous mode data stay independent when track output or current modes change',async({page})=>{
  await open(page);const output=editor(page).locator('.mc-command-output__text'),track=editor(page).locator('[data-command-field="trackOutput"]');
  await expect(output).toHaveText('[12:34] Previous accepted output\nSecond output line');expect(await output.evaluate(node=>({tag:node.tagName,tab:node.tabIndex,editable:(node as HTMLElement).isContentEditable,ref:window.commandQA.refs.output===node}))).toEqual({tag:'PRE',tab:-1,editable:false,ref:true});
  await track.click();await expect(track).not.toBeChecked();await expect(output).toContainText('Previous accepted output');
  await configure(page,{previousOutput:'Host-only next output',previousInfo:{blockType:'Host repeat',condition:'Old condition',redstone:'Old redstone'}});await expect(output).toHaveText('Host-only next output');await expect(editor(page).locator('[data-command-previous="blockType"]')).toContainText('Host repeat');
  const standalone=page.locator('#command-output-host');await standalone.getByRole('switch').click();expect(await page.evaluate(()=>window.commandQA.settings.standaloneTrack)).toBe(false);await expect(standalone.locator('pre')).toHaveText('Host-only next output');await expect(track).not.toBeChecked();
  await standalone.getByRole('switch').click();await expect(standalone.getByRole('switch')).toBeChecked();await expect(track).not.toBeChecked();
});

test('reusable CommandInput keeps an independent native draft and one textarea across its own expansion',async({page})=>{
  await open(page,{acceptance:'reject'});const root=page.locator('#command-standalone'),input=root.locator('textarea');await input.fill('rejected');await expect(input).toHaveValue('standalone accepted');
  await input.evaluate(node=>{(window as unknown as{savedStandalone:Node}).savedStandalone=node;(node as HTMLTextAreaElement).setSelectionRange(2,5);});await root.locator('[data-command-action="maximize"]').click();await expect(root.locator('.mc-command-input')).toHaveAttribute('data-expanded','true');
  expect(await input.evaluate(node=>({same:node===(window as unknown as{savedStandalone:Node}).savedStandalone,ref:window.commandQA.refs.standaloneTextarea===node}))).toEqual({same:true,ref:true});
  await root.locator('[data-command-action="expanded-paste"]').click();expect(await page.evaluate(()=>window.commandQA.events.filter(e=>e.kind==='standalone-paste').at(-1)?.value)).toBe('standalone accepted');
  await root.locator('[data-command-action="minimize"]').click();await expect(root.locator('.mc-command-input')).toHaveAttribute('data-expanded','false');await expect(command(page)).toHaveValue('say accepted');
});

test('Cancel Close and compact Escape report accepted snapshot reasons and honor caller defaultPrevented',async({page})=>{
  await open(page,{acceptance:'reject'});await command(page).fill('rejected');await action(page,'cancel').click();await action(page,'close').click();await command(page).focus();await command(page).press('Escape');
  const closes=await page.evaluate(()=>window.commandQA.events.filter(e=>e.kind==='close'));expect(closes.map(e=>(e.detail as{reason:string}).reason)).toEqual(['cancel','close','escape']);for(const entry of closes)expect(entry.value).toMatchObject({command:'say accepted'});
  await configure(page,{preventEscape:true});await command(page).press('Escape');expect(await page.evaluate(()=>window.commandQA.events.filter(e=>e.kind==='close').length)).toBe(3);await expect(editor(page)).toBeVisible();
});

test('StrictMode real refs clean up and all three public components SSR without IO warnings or leaking configuration',async({page})=>{
  await open(page,{},true);await expect(command(page)).toHaveValue('say accepted');await page.evaluate(()=>window.commandQA.unmount());expect(await page.evaluate(()=>Object.values(window.commandQA.refs).every(node=>node===null))).toBe(true);
  const oldFetch=globalThis.fetch,oldError=console.error,errors:unknown[][]=[];let io=0;globalThis.fetch=()=>{io++;throw new Error('Unexpected SSR IO');};console.error=(...args)=>{errors.push(args);};
  try{const html=renderToStaticMarkup(createElement(CommandBlockEditor,{ref:createRef<HTMLElement>(),defaultValue:{command:'accepted'},textareaRef:createRef<HTMLTextAreaElement>()}));const input=renderToStaticMarkup(createElement(CommandInput,{ref:createRef<HTMLDivElement>(),defaultValue:'standalone',textareaRef:createRef<HTMLTextAreaElement>()}));const output=renderToStaticMarkup(createElement(CommandOutputPanel,{ref:createRef<HTMLDivElement>(),previousOutput:'output',outputRef:createRef<HTMLPreElement>()}));expect(html).toContain('accepted');expect(input).toContain('standalone');expect(output).toContain('output');expect(html).not.toMatch(/viewportSize=|panelSize=|firstTickEnabled=|charLimitWarning=|textareaRef=/);expect(errors).toEqual([]);expect(io).toBe(0);}finally{globalThis.fetch=oldFetch;console.error=oldError;}
});
