import {expect, test} from '@playwright/test';
import type {Page} from '@playwright/test';
import type {} from '../demo/external-server-fixture';

async function open(page:Page) {
  await page.goto('/demo/external-server-fixture.html');
  await page.waitForFunction(()=>!!window.externalServerFixture);
  if ((page.viewportSize()?.width ?? 1440) < 656) await page.evaluate(()=>window.externalServerFixture.configure({scale:1}));
  return page.locator('#external-server-primary');
}
const paintedStates = (control:import('@playwright/test').Locator) => control.evaluate(node=>
  [...node.querySelectorAll('.mc-external-server-action__state')]
    .filter(state=>getComputedStyle(state).display!=='none')
    .map(state=>state.className.split('--').at(-1)));

test('real keyboard focus and Space select exactly one source action state; readonly and disabled fields keep their distinct skins',async({page})=>{
  const form=await open(page),save=form.locator('button[data-external-server-action="save"]'),name=form.locator('input[name="name"]');
  // Enter and leave through actual keyboard navigation to establish focus-visible.
  await save.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(save).toBeFocused();
  expect(await paintedStates(save)).toEqual(['hover']);
  await page.keyboard.down('Space');expect(await paintedStates(save)).toEqual(['pressed']);
  await page.keyboard.up('Space');expect(await paintedStates(save)).toEqual(['hover']);
  await page.evaluate(()=>window.externalServerFixture.configure({readOnly:true}));await name.focus();
  const skin=()=>name.evaluate(node=>{const editor=node.closest('.mc-external-server-field__editor')!;return [...editor.querySelectorAll('.mc-external-server-field__skin')].map(image=>({kind:image.className.split('--').at(-1),shown:getComputedStyle(image).display!=='none',opacity:getComputedStyle(image).opacity}));});
  expect((await skin()).filter(s=>s.shown).map(s=>s.kind)).toEqual(['hover']);
  await page.evaluate(()=>window.externalServerFixture.configure({readOnly:false,disabled:true}));
  expect((await skin()).filter(s=>s.shown)).toEqual([{kind:'normal',shown:true,opacity:'0.5'}]);
  expect(await paintedStates(save)).toEqual(['locked']);await expect(name).toBeDisabled();
});

test('forced-colors replaces source images and retains real keyboard focus indicators',async({page})=>{
  await page.emulateMedia({forcedColors:'active'});const form=await open(page),save=form.locator('button[data-external-server-action="save"]'),name=form.locator('input[name="name"]');
  await save.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(save).toBeFocused();
  const focus=await save.evaluate(node=>{const s=getComputedStyle(node);return{outline:s.outlineStyle,width:parseFloat(s.outlineWidth),border:s.borderTopStyle};});
  expect(focus.outline).toBe('solid');expect(focus.width).toBeGreaterThanOrEqual(2);expect(focus.border).toBe('solid');
  await name.focus();await expect(name).toBeFocused();
  const input=await name.evaluate(node=>{const s=getComputedStyle(node);return{outline:s.outlineStyle,width:parseFloat(s.outlineWidth),color:s.color,skins:[...node.closest('.mc-external-server-field__editor')!.querySelectorAll('.mc-external-server-field__skin')].map(n=>getComputedStyle(n).display)};});
  expect(input.outline).toBe('solid');expect(input.width).toBeGreaterThanOrEqual(1);expect(input.color).not.toBe('rgba(0, 0, 0, 0)');expect(input.skins).toEqual(['none','none']);
});
