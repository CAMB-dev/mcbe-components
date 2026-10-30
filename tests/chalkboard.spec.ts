import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ChalkboardEditor,ChalkboardTextField,ChalkboardLock} from '../src/chalkboard';
import type {ChalkboardQASettings} from '../demo/chalkboard-fixture';

const editor=(p:Page)=>p.locator('#qa-chalkboard');
const text=(p:Page)=>p.getByRole('textbox',{name:'Chalkboard text',exact:true});
const lock=(p:Page)=>p.getByRole('checkbox',{name:'Lock editing',exact:true});
async function open(p:Page,initial:Partial<ChalkboardQASettings>={}){await p.addInitScript(value=>{window.chalkboardQAInitial=value},initial);await p.goto('/demo/chalkboard-fixture.html?strict');await expect.poll(()=>p.evaluate(()=>!!window.chalkboardQA?.configure)).toBe(true)}
async function set(p:Page,value:Partial<ChalkboardQASettings>){await p.evaluate(value=>window.chalkboardQA.configure(value),value)}
async function events(p:Page,kind:string){return p.evaluate(kind=>window.chalkboardQA.events.filter(e=>e.kind===kind),kind)}
async function clear(p:Page){await p.evaluate(()=>{window.chalkboardQA.events.length=0})}

test('three parts SSR preserve native multiline/checkbox semantics and perform no IO',()=>{
 const fetch=globalThis.fetch;let calls=0;globalThis.fetch=(()=>{calls++;throw Error('unexpected SSR IO')}) as typeof fetch;
 try{const markup=renderToStaticMarkup(createElement(ChalkboardEditor,{panelSize:[280,180],textBoxSize:[264,120],maxLength:37,title:'Host title',textEnabled:true,lockVisible:true,lockLabel:'Lock editing',closeVisible:true,defaultValue:{text:'Literal <raw>\nSecond',locked:true}}));expect(markup).toContain('&lt;raw&gt;');expect(markup).toContain('maxLength="37"');expect(markup).toContain('textarea');expect(markup).not.toContain('<canvas');
 expect(renderToStaticMarkup(createElement(ChalkboardTextField,{size:[120,60],label:'Standalone',maxLength:9,textEnabled:true,defaultValue:'Seed'}))).toContain('Seed');expect(renderToStaticMarkup(createElement(ChalkboardLock,{label:'Lock',defaultChecked:true}))).toContain('checked');expect(calls).toBe(0);
 }finally{globalThis.fetch=fetch}
});

test('real textarea keeps selection Enter newline node identity and typed refs',async({page})=>{
 await open(page);const input=text(page);await expect(input).toHaveAttribute('maxlength','37');await expect(input).toHaveAttribute('title','Caller native title');await input.focus();await input.evaluate(n=>{Reflect.set(window,'savedChalkboardInput',n);(n as HTMLTextAreaElement).setSelectionRange(6,10)});await input.pressSequentially('QA');await expect(input).toHaveValue('Alpha QA');await input.press('Enter');await input.pressSequentially('Next');await expect(input).toHaveValue('Alpha QA\nNext');
 expect(await input.evaluate(n=>({same:n===Reflect.get(window,'savedChalkboardInput'),ref:n===window.chalkboardQA.refs.textarea,start:(n as HTMLTextAreaElement).selectionStart,end:(n as HTMLTextAreaElement).selectionEnd}))).toEqual({same:true,ref:true,start:13,end:13});expect(await events(page,'close')).toEqual([]);
});

test('controlled text and lock requests preserve the independent accepted bit when rejected or accepted',async({page})=>{
 await open(page,{acceptance:'reject',value:{text:'Accepted',locked:false}});await text(page).fill('Rejected');await expect(text(page)).toHaveValue('Accepted');await lock(page).click();await expect(lock(page)).not.toBeChecked();expect((await events(page,'value')).map(e=>({value:e.value,field:(e.detail as {field:string}).field}))).toEqual([{value:{text:'Rejected',locked:false},field:'text'},{value:{text:'Accepted',locked:true},field:'locked'}]);
 await set(page,{acceptance:'accept'});await editor(page).getByText('Lock editing',{exact:true}).click();await expect(lock(page)).toBeChecked();await text(page).fill('Still editable');await expect(text(page)).toHaveValue('Still editable');await expect(lock(page)).toBeChecked();
});

test('native maxLength restricts fresh typing without truncating a longer host accepted value; uncontrolled seed stays local',async({page})=>{
 await open(page,{value:{text:'Long accepted text',locked:false},maxLength:5});await expect(text(page)).toHaveValue('Long accepted text');await text(page).focus();await text(page).press('End');await text(page).pressSequentially('x');await expect(text(page)).toHaveValue('Long accepted text');await set(page,{value:{text:'',locked:false}});await text(page).pressSequentially('1234567');await expect(text(page)).toHaveValue('12345');
 // Explicitly unmount this instance before assigning a new uncontrolled seed.
 await set(page,{show:false,controlled:false,value:{text:'Seed',locked:false},maxLength:37});await set(page,{show:true});await text(page).fill('Local draft');await set(page,{value:{text:'External default only',locked:true}});await expect(text(page)).toHaveValue('Local draft');await expect(lock(page)).not.toBeChecked();
});

test('textEnabled locked lock visibility readonly and disabled remain independent host capabilities',async({page})=>{
 await open(page,{value:{text:'Text',locked:true}});await text(page).fill('Locked is state');await expect(text(page)).toHaveValue('Locked is state');await set(page,{textEnabled:false});await expect(text(page)).toBeDisabled();await expect(lock(page)).toBeEnabled();await lock(page).click();await expect(lock(page)).not.toBeChecked();await set(page,{textEnabled:true,lockVisible:false});await expect(lock(page)).toBeHidden();await expect(text(page)).toBeEnabled();
 await set(page,{lockVisible:true,readOnly:true});await expect(text(page)).toHaveAttribute('readonly');await text(page).focus();await text(page).press('End');await text(page).pressSequentially('x');await expect(text(page)).toHaveValue('Locked is state');await clear(page);await lock(page).click();await expect(lock(page)).not.toBeChecked();expect(await events(page,'value')).toEqual([]);await editor(page).getByRole('button',{name:/close/i}).click();expect(await events(page,'close')).toHaveLength(1);
 await set(page,{readOnly:false,disabled:true});await expect(text(page)).toBeDisabled();await expect(lock(page)).toBeDisabled();await expect(editor(page).getByRole('button',{name:/close/i})).toBeDisabled();await editor(page).focus();await page.keyboard.press('Escape');expect(await events(page,'close')).toHaveLength(1);
});

test('composition modifiers and caller veto guard Escape; first selected Escape deselects and second requests exit',async({page})=>{
 await open(page,{stopCompositionPropagation:true});const input=text(page);await input.focus();await input.dispatchEvent('compositionstart',{data:''});await input.dispatchEvent('keydown',{key:'Escape',keyCode:229,isComposing:true,bubbles:true});await input.dispatchEvent('compositionend',{data:'牌'});await expect(input).toBeFocused();expect(await events(page,'close')).toEqual([]);expect(await events(page,'composition-start')).toHaveLength(1);expect(await events(page,'composition-end')).toHaveLength(1);
 await set(page,{preventKeys:['Escape']});await input.press('Escape');await expect(input).toBeFocused();await set(page,{preventKeys:[],preventCaptureKeys:['Escape']});await input.press('Escape');await expect(input).toBeFocused();await set(page,{preventCaptureKeys:[]});await input.press('Control+Escape');await expect(input).toBeFocused();expect(await events(page,'close')).toEqual([]);
 await input.press('Escape');await expect(editor(page)).toBeFocused();expect(await events(page,'close')).toEqual([]);await page.keyboard.press('Escape');expect((await events(page,'close')).map(e=>e.detail)).toEqual([{reason:'escape',eventType:'keydown'}]);
  // A host disabling the composing native field may never deliver its end event.
  await page.evaluate(()=>{window.chalkboardQA.events.length=0});await input.focus();await input.dispatchEvent('compositionstart',{data:''});await set(page,{textEnabled:false});await expect(input).toBeDisabled();await editor(page).focus();await page.keyboard.press('Escape');expect((await events(page,'close')).map(e=>e.detail)).toEqual([{reason:'escape',eventType:'keydown'}]);
});

test('close uses the latest accepted mixed snapshot without executing or modifying text; hidden Close leaves Escape',async({page})=>{
 await open(page,{acceptance:'reject',value:{text:'Accepted\ntext',locked:true}});await text(page).fill('Unaccepted');await lock(page).click();await editor(page).getByRole('button',{name:/close/i}).click();expect((await events(page,'close'))[0]?.value).toEqual({text:'Accepted\ntext',locked:true});await expect(editor(page)).toBeVisible();await set(page,{preventClose:true});await editor(page).getByRole('button',{name:/close/i}).click();expect(await events(page,'close')).toHaveLength(1);
 await set(page,{preventClose:false,value:{text:'External',locked:false},closeVisible:false});await expect(editor(page).getByRole('button',{name:/close/i})).toBeHidden();await text(page).focus();await text(page).press('Escape');await page.keyboard.press('Escape');expect((await events(page,'close')).at(-1)?.value).toEqual({text:'External',locked:false});
});

test('standalone field and lock work without an invented dialog toolbar; touch/label activation emits one request',async({page,isMobile})=>{
 await open(page,{mode:'lock'});const control=lock(page);if(isMobile)await control.tap();else await control.press('Space');await expect(control).toBeChecked();expect(await events(page,'value')).toHaveLength(1);await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:/save|done|cancel/i})).toHaveCount(0);
 await set(page,{mode:'field'});await expect(text(page)).toBeVisible();await text(page).fill('Standalone');await expect(text(page)).toHaveValue('Standalone');await expect(page.getByRole('checkbox')).toHaveCount(0);
});

test('independent instances and layout updates preserve input/ref selection; unmount clears all external refs',async({page})=>{
 await open(page,{second:true,hint:true});await expect(page.getByTestId('host-confirm-hint')).toHaveText('Host confirm hint');const first=text(page),second=page.getByRole('textbox',{name:'Second chalkboard'});await first.focus();await first.evaluate(n=>{Reflect.set(window,'resizeChalkboardNode',n);(n as HTMLTextAreaElement).setSelectionRange(1,4)});await set(page,{panelSize:[320,200],textBoxSize:[300,130],scale:1,nativeTitle:'Updated native title'});expect(await first.evaluate(n=>[n===Reflect.get(window,'resizeChalkboardNode'),(n as HTMLTextAreaElement).selectionStart,(n as HTMLTextAreaElement).selectionEnd])).toEqual([true,1,4]);await expect(first).toBeFocused();await second.fill('Other instance');await expect(first).toHaveValue('Alpha beta');await expect(second).toHaveValue('Other instance');await page.evaluate(()=>window.chalkboardQA.unmount());expect(await page.evaluate(()=>Object.values(window.chalkboardQA.refs))).toEqual([null,null,null,null,null]);
});

test('forced colors keeps real textarea and checkbox usable with visible keyboard focus',async({page})=>{
 await open(page);await page.emulateMedia({forcedColors:'active'});await text(page).focus();expect(await text(page).evaluate(n=>{const c=getComputedStyle(n.closest('.mc-chalkboard-text-field')!);return[c.outlineStyle,c.outlineWidth]})).toEqual(['solid','1px']);await text(page).press('End');await text(page).pressSequentially('x');await expect(text(page)).toHaveValue('Alpha betax');await lock(page).focus();await lock(page).press('Space');await expect(lock(page)).toBeChecked();await expect(lock(page)).toHaveAccessibleName('Lock editing');await expect(lock(page)).toHaveCSS('opacity','1');expect(await lock(page).evaluate(n=>getComputedStyle(n).appearance)).not.toBe('none');expect(await lock(page).evaluate(n=>n===document.activeElement)).toBe(true);await expect(editor(page)).not.toHaveCSS('display','none');
});
