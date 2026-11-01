import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import type {} from '../demo/chat-fixture';

async function task(page:Page){await page.evaluate(()=>new Promise<void>(resolve=>setTimeout(resolve,0)));}
async function open(page:Page,update:Record<string,unknown>={}){await page.goto('/demo/chat-fixture.html');await page.waitForFunction(()=>window.chatHarness?.ready);await page.evaluate(update=>window.chatHarness.reset(update),update);await task(page);await page.evaluate(()=>window.chatHarness.clear());}
const editor=(page:Page)=>page.getByRole('textbox',{name:'Message',exact:true});

test('controlled caret updates and rejected edits settle back to host text and selection',async({page})=>{
 await open(page,{draft:{text:'abcdef',selectionStart:1,selectionEnd:3,direction:'backward',revision:'host'}});
 await page.evaluate(()=>{const h=window.chatHarness;h.patch({draft:h.draft('abcdef','host',2,5,'forward')});});
 expect(await editor(page).evaluate((n:HTMLInputElement)=>[n.selectionStart,n.selectionEnd,n.selectionDirection])).toEqual([2,5,'forward']);
 await page.evaluate(()=>window.chatHarness.patch({acceptDraft:false}));await editor(page).fill('rejected');await task(page);
 await expect(editor(page)).toHaveValue('abcdef');expect(await editor(page).evaluate((n:HTMLInputElement)=>[n.selectionStart,n.selectionEnd])).toEqual([2,5]);
});

test('raw Unicode send preserves the draft and honors a late document veto',async({page})=>{
 await open(page,{mode:'uncontrolled-web',defaultDraft:'  /say 你好 😀  '});const send=page.locator('[data-source-action="button.send"]');
 await page.evaluate(()=>document.addEventListener('click',e=>e.preventDefault(),{once:true}));await send.click();await task(page);
 expect(await page.evaluate(()=>window.chatHarness.events.filter(e=>e.kind==='action'&&e.target==='button.send'))).toHaveLength(0);
 await send.click();await task(page);expect(await page.evaluate(()=>window.chatHarness.events.find(e=>e.kind==='action'&&e.target==='button.send').draft.text)).toBe('  /say 你好 😀  ');await expect(editor(page)).toHaveValue('  /say 你好 😀  ');
});

test('host extreme tokens cannot exhaust later editors and old async replies cannot overwrite new edits',async({page})=>{
 await open(page,{draft:{text:'a',selectionStart:1,selectionEnd:1,direction:'forward',revision:'mcchat:web:'+'f'.repeat(32)}});
 const old=await page.evaluate(()=>window.chatHarness.refs.composer.getDraft());await editor(page).fill('new');await task(page);
 expect(await page.evaluate(old=>window.chatHarness.refs.composer.applyDraft({expectedRunKey:'run-1',expectedRevision:old.revision,text:'stale',selectionStart:5,selectionEnd:5,direction:'none',revision:'reply'}),old)).toBe(false);
 await expect(editor(page)).toHaveValue('new');await page.evaluate(()=>window.chatHarness.reset({runKey:'another',mode:'uncontrolled-web',defaultDraft:'separate'}));await expect(editor(page)).toHaveValue('separate');
});

test('native form reset survives stopPropagation and restores the mount default without semantic send',async({page})=>{
 await open(page,{mode:'uncontrolled-web',defaultDraft:'initial'});await editor(page).fill('edited');
 await page.evaluate(()=>{window.chatHarness.clear();const form=document.querySelector('form')!;form.addEventListener('reset',e=>e.stopPropagation(),{once:true});form.reset();});await task(page);await expect(editor(page)).toHaveValue('initial');
 expect(await page.evaluate(()=>window.chatHarness.events.filter(e=>e.kind==='draft'||e.kind==='action'&&e.target==='button.send'))).toHaveLength(0);
});

test('Escape dismisses coordinate and settings disclosures before requesting screen closure',async({page})=>{
 await open(page,{surface:'screen',suggestions:[]});const coordinate=page.locator('.mc-chat-coordinates__trigger');await coordinate.click();await expect(coordinate).toHaveAttribute('aria-expanded','true');
 await page.keyboard.press('Escape');await expect(coordinate).toHaveAttribute('aria-expanded','false');await task(page);expect(await page.evaluate(()=>window.chatHarness.events.filter(e=>e.kind==='close'))).toHaveLength(0);
 await page.evaluate(()=>{const h=window.chatHarness;h.patch({settings:{...h.config.settings,popup:{instanceId:'p1',closeButtonVisible:true}}});});
 const dropdown=page.locator('[data-chat-settings-disclosure="typeface"]');await dropdown.click();await expect(dropdown).toHaveAttribute('aria-expanded','true');await page.keyboard.press('Escape');await expect(dropdown).toHaveAttribute('aria-expanded','false');await task(page);
 expect(await page.evaluate(()=>window.chatHarness.events.filter(e=>e.kind==='action'&&e.target==='button.close_chat_settings'))).toHaveLength(0);
 await page.keyboard.press('Escape');await task(page);expect(await page.evaluate(()=>window.chatHarness.events.filter(e=>e.kind==='action'&&e.target==='button.close_chat_settings'))).toHaveLength(1);
});

test('focused controller actions require their real control and drop after focus changes',async({page})=>{
 await open(page,{surface:'screen',suggestions:[]});
 const requested=await page.evaluate(()=>{const h=window.chatHarness;const absent=h.refs.controller.request({fromButtonId:'button.menu_select',destination:'send'});(document.querySelector('[data-source-action="button.send"]') as HTMLElement).focus();const queued=h.refs.controller.request({fromButtonId:'button.menu_select',destination:'send'});h.refs.input.focus();return{absent,queued};});await task(page);
 expect(requested).toEqual({absent:false,queued:true});expect(await page.evaluate(()=>window.chatHarness.events.filter(e=>e.kind==='action'&&e.target==='button.send'))).toHaveLength(0);
});

test('root modal traps Tab and returns focus; player-hurt lifecycle remains independent of disabled input',async({page})=>{
 await open(page,{surface:'screen',open:false,suggestions:[]});await page.locator('#opener').focus();await page.evaluate(()=>window.chatHarness.patch({open:true}));await expect(editor(page)).toBeFocused();
 await page.evaluate(()=>{const h=window.chatHarness;h.patch({settings:{...h.config.settings,popup:{instanceId:'p1',closeButtonVisible:true}}});});
 for(let i=0;i<14;i++)await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('.mc-chat-screen__settings-layer'))).toBe(true);
 await page.evaluate(()=>window.chatHarness.patch({disabled:true,readOnly:true}));expect(await page.evaluate(()=>window.chatHarness.refs.controller.notifyPlayerHurt())).toBe(true);await task(page);
 expect(await page.evaluate(()=>window.chatHarness.events.filter(e=>e.kind==='close'&&e.reason==='player-hurt'))).toHaveLength(1);
 await page.evaluate(()=>window.chatHarness.patch({open:false}));await expect(page.locator('#opener')).toBeFocused();
});

test('transcript updates jump to bottom even when new-message and force-scroll flags are false',async({page})=>{
 await open(page,{surface:'screen',suggestions:[],messages:Array.from({length:80},(_,i)=>({id:'m'+i,text:'Message '+i,ttsText:'Message '+i}))});
 await page.evaluate(()=>{const h=window.chatHarness;h.refs.viewport.scrollTop=0;h.patch({messages:[...h.config.messages,{id:'extra',text:'Extra',ttsText:'Extra'}]});});await task(page);
 const state=await page.evaluate(()=>{const v=window.chatHarness.refs.viewport;return{top:v.scrollTop,max:v.scrollHeight-v.clientHeight};});expect(state.max).toBeGreaterThan(0);expect(Math.abs(state.top-state.max)).toBeLessThanOrEqual(1);
});
