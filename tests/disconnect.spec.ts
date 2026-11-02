import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type {} from '../demo/disconnect-fixture';

async function open(page: import('@playwright/test').Page, patch: object = {}) {
  await page.goto('/demo/disconnect-fixture.html');
  await page.waitForFunction(() => !!window.disconnectQA?.configure);
  await page.evaluate(patch => window.disconnectQA.configure(patch), patch);
}
async function events(page: import('@playwright/test').Page, count: number) {
  await expect.poll(() => page.evaluate(() => window.disconnectQA.events.length)).toBe(count);
  return page.evaluate(() => window.disconnectQA.events);
}
const button = (page: import('@playwright/test').Page, name: string) => page.locator(`[data-disconnect-button="${name}"]`);

for (const [variant,names] of [
  ['disconnect',['ok']], ['realms-disconnect',['store','back']], ['realms-warning',['store','continue','cancel']],
] as const) {
  test(`${variant}: source actions, explicit extents and distinct cancel mapping`, async ({page}) => {
    await open(page,{variant}); const screen = page.locator('.mc-disconnect-screen');
    await expect(screen).toHaveAttribute('data-source-variant',variant);
    await expect(screen).toHaveCSS('width','320px'); await expect(screen).toHaveCSS('height','240px');
    for (const name of names) {
      await button(page,name).click();
      const log = await events(page,1);
      const expected = name === 'cancel' ? 'button.cancel_join_realm' : name === 'continue' ? 'button.menu_continue' : name === 'store' ? 'button.menu_check_store' : 'button.menu_leave_screen';
      expect(log[0].buttonId).toBe(expected); expect(log[0].source).toBe('button'); expect(log[0].event.ownerTag).toBe('BUTTON');
      expect(log[0].event.ownerButton).toBe(name); await page.evaluate(() => window.disconnectQA.clear());
      await expect(button(page,name)).toHaveCSS('width',name === 'cancel'?'256px':'128px');
      await expect(button(page,name)).toHaveCSS('height','26px');
    }
    await screen.focus(); await page.keyboard.press('Escape');
    const escaped = await events(page,1); expect(escaped[0].buttonId).toBe('button.menu_leave_screen');
    expect(escaped[0].source).toBe('menu-cancel'); expect(escaped[0].button).toBeNull();
  });
}

test('message retains source body/title boxes, no shadow and separate safe-zone content', async ({page}) => {
  await open(page,{inset:10,scale:2});
  const screen = page.locator('.mc-disconnect-screen'), base = (await screen.boundingBox())!;
  const message = page.locator('.mc-disconnect-message');
  expect(await message.boundingBox()).toEqual({x:base.x+20,y:base.y+20,width:600,height:440});
  const body = page.locator('.mc-disconnect-message__label').first(), title = page.locator('h2.mc-disconnect-message__label');
  expect((await body.boundingBox())!.y-base.y).toBe(110); expect((await title.boundingBox())!.y-base.y).toBe(180);
  await expect(body).toHaveCSS('height','100px'); await expect(title).toHaveCSS('height','80px');
  await expect(body).toHaveCSS('text-shadow','none'); await expect(title).toHaveCSS('font-weight','400');
  expect(await screen.evaluate(el => [el.scrollWidth,el.clientWidth,el.scrollHeight,el.clientHeight])).toEqual([640,640,480,480]);
});

test('URI is a host intent, independent of OK and with its actual 200 by 26 extent', async ({page}) => {
  await open(page,{uriVisible:true}); const href = page.url();
  await button(page,'open-account').click(); const log = await events(page,1);
  expect(log[0].buttonId).toBe('button.menu_open_uri'); expect(log[0].uri).toBe('https://aka.ms/MCMultiplayerHelp');
  expect(page.url()).toBe(href); await expect(button(page,'open-account')).toHaveCSS('width','200px');
  await expect(button(page,'ok')).toBeEnabled();
});

test('ignored Store keeps the source five-unit spacer and warning Cancel remains independent', async ({page}) => {
  await open(page,{variant:'realms-warning',storeIgnored:true});
  await expect(button(page,'store')).toHaveCount(0);
  const root = (await page.locator('.mc-disconnect-screen').boundingBox())!;
  expect((await button(page,'continue').boundingBox())!.x-root.x).toBe(98.5);
  await expect(button(page,'cancel')).toBeEnabled();
  await page.evaluate(() => window.disconnectQA.configure({hideButton:'cancel'}));
  await expect(button(page,'cancel')).toBeHidden(); await expect(button(page,'continue')).toBeEnabled();
});

test('hidden URI reserve/collapse changes only its declared source holder', async ({page}) => {
  await open(page); const before = (await button(page,'ok').boundingBox())!;
  await page.evaluate(() => window.disconnectQA.configure({hiddenSlots:'collapse'}));
  const after = (await button(page,'ok').boundingBox())!;
  expect(after).toEqual(before); // Stack bottom and fixed OK holder remain the same.
  await expect(button(page,'open-account')).toHaveCount(0);
  await page.evaluate(() => window.disconnectQA.configure({variant:'realms-disconnect',hiddenSlots:'reserve'}));
  const reserve = (await button(page,'back').boundingBox())!.y;
  await page.evaluate(() => window.disconnectQA.configure({hiddenSlots:'collapse'}));
  expect((await button(page,'back').boundingBox())!.y-reserve).toBe(-15);
});

for (const veto of ['preventLeaf','preventAncestor','preventDocument'] as const) {
  test(`late/default-sensitive ${veto} veto preserves ownership without sending an action`, async ({page}) => {
    await open(page,{[veto]:true}); await button(page,'ok').click();
    await page.waitForTimeout(40); expect(await page.evaluate(() => window.disconnectQA.events)).toEqual([]);
    await page.evaluate(veto => window.disconnectQA.configure({[veto]:false}),veto);
    await button(page,'ok').click(); await events(page,1);
  });
}

test('a source update before deferred dispatch rejects the stale request', async ({page}) => {
  await open(page,{disableOnClick:true}); await button(page,'ok').click();
  await expect(button(page,'ok')).toBeDisabled(); await page.waitForTimeout(40);
  expect(await page.evaluate(() => window.disconnectQA.events)).toEqual([]);
});

test('disabled and hidden screens cannot issue logical controller requests', async ({page}) => {
  await open(page,{disabled:true}); await expect(button(page,'ok')).toBeDisabled();
  expect(await page.evaluate(() => window.disconnectQA.controller.request('button.menu_cancel'))).toBe(false);
  await page.evaluate(() => window.disconnectQA.configure({disabled:false,hidden:true}));
  expect(await page.evaluate(() => window.disconnectQA.controller.request('button.menu_cancel'))).toBe(false);
  await page.evaluate(() => window.disconnectQA.configure({hidden:false,menuCancelEnabled:false}));
  expect(await page.evaluate(() => window.disconnectQA.controller.request('button.menu_cancel'))).toBe(false);
  await button(page,'ok').click(); await events(page,1);
});

test('nested native dialog owns Escape without also leaving its containing screen', async ({page}) => {
  await open(page,{nativeHintDialog:true});
  const dialog = page.locator('#native-hint-dialog');
  await dialog.evaluate(node => (node as HTMLDialogElement).showModal());
  expect(await page.evaluate(() => window.disconnectQA.controller.request('button.menu_cancel'))).toBe(false);
  await expect(dialog.getByRole('button')).toBeFocused(); await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible(); await page.waitForTimeout(40);
  expect(await page.evaluate(() => window.disconnectQA.events)).toEqual([]);
});

test('native inert keeps visual background while blocking standalone actions and screen input', async ({page}) => {
  await open(page,{inert:true});
  await expect(page.locator('.mc-disconnect-screen')).toHaveAttribute('inert','');
  await expect(page.locator('.mc-disconnect-background')).toBeVisible();
  expect(await page.evaluate(() => window.disconnectQA.controller.request('button.menu_cancel'))).toBe(false);
  await page.locator('#opener').focus(); await page.keyboard.press('Tab'); await expect(page.locator('#outside')).toBeFocused();
  await page.evaluate(() => window.disconnectQA.configure({part:'actions'}));
  await expect(page.locator('.mc-disconnect-actions')).toHaveAttribute('inert','');
  await button(page,'ok').dispatchEvent('click'); await page.waitForTimeout(40);
  expect(await page.evaluate(() => window.disconnectQA.events)).toEqual([]);
  await page.evaluate(() => window.disconnectQA.configure({inert:false}));
  await expect(page.locator('.mc-disconnect-actions')).not.toHaveAttribute('inert','');
  await button(page,'ok').click(); await events(page,1);
});

test('Escape respects native document veto, IME and repeated keys', async ({page}) => {
  await open(page,{preventDocument:true}); await button(page,'ok').focus(); await page.keyboard.press('Escape');
  await page.waitForTimeout(40); expect(await page.evaluate(() => window.disconnectQA.events)).toEqual([]);
  await page.evaluate(() => window.disconnectQA.configure({preventDocument:false}));
  await button(page,'ok').dispatchEvent('keydown',{key:'Escape',isComposing:true,bubbles:true});
  await button(page,'ok').dispatchEvent('keydown',{key:'Escape',repeat:true,bubbles:true});
  await page.waitForTimeout(40); expect(await page.evaluate(() => window.disconnectQA.events)).toEqual([]);
  expect(await page.evaluate(() => window.disconnectQA.controller.request('button.menu_cancel'))).toBe(true);
  await events(page,1);
});

test('modal contains Tab and returns focus; callback and controller refs clean up', async ({page}) => {
  await open(page,{strict:true}); await page.locator('#opener').click();
  await expect(button(page,'ok')).toBeFocused(); await page.keyboard.press('Tab'); await expect(button(page,'ok')).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(button(page,'ok')).toBeFocused();
  await expect(page.locator('#outside')).toHaveAttribute('inert','');
  await page.evaluate(() => window.disconnectQA.configure({modal:false})); await expect(page.locator('#opener')).toBeFocused();
  await expect(page.locator('#outside')).not.toHaveAttribute('inert','');
  await page.evaluate(() => window.disconnectQA.configure({mounted:false}));
  const refs = await page.evaluate(() => ({screen:window.disconnectQA.refs.screen,ok:window.disconnectQA.refs.ok,controller:window.disconnectQA.controller,
    clean:window.disconnectQA.refEvents.some((v:any)=>v.name==='ok'&&v.phase==='cleanup')}));
  expect(refs).toEqual({screen:null,ok:null,controller:null,clean:true});
});

test('independent message/actions parts and long labels respect explicit frame without native scrollbars', async ({page}) => {
  await open(page,{part:'message',longText:true}); await expect(page.locator('.mc-disconnect-message')).toBeVisible();
  await expect(page.locator('button[data-disconnect-button]')).toHaveCount(0);
  await page.evaluate(() => window.disconnectQA.configure({part:'actions',variant:'realms-warning'}));
  await expect(button(page,'continue')).toBeEnabled(); await button(page,'continue').click(); await events(page,1);
  await page.evaluate(() => window.disconnectQA.configure({part:'screen',longText:true}));
  expect(await page.locator('.mc-disconnect-screen').evaluate(el => [el.scrollWidth,el.clientWidth,el.scrollHeight,el.clientHeight])).toEqual([320,320,240,240]);
});

test('source skin states keep actual dimensions, one-unit press offset and forced-colors controls', async ({page}) => {
  await open(page); const ok = button(page,'ok'), before = await ok.boundingBox();
  await ok.hover(); await expect(ok.locator('.mc-disconnect-hover')).toBeVisible();
  await page.mouse.down(); await expect(ok.locator('.mc-disconnect-pressed')).toBeVisible();
  await expect(ok.locator('.mc-disconnect-button__content')).toHaveCSS('translate','0px 1px');
  expect(await ok.boundingBox()).toEqual(before); await page.mouse.up();
  await page.evaluate(() => window.disconnectQA.configure({disabled:true})); await expect(ok.locator('.mc-disconnect-locked')).toBeVisible();
  await page.emulateMedia({forcedColors:'active'}); await expect(ok).toHaveCSS('border-top-width','1px');
});

test('new source screen has named controls and no scoped serious accessibility findings', async ({page}) => {
  await open(page,{variant:'realms-warning'});
  const results = await new AxeBuilder({page}).include('.mc-disconnect-screen').analyze();
  expect(results.violations).toEqual([]);
});

test('GPU background becomes ready, falls back on context loss and releases on hidden/unmount', async ({page}) => {
  await open(page,{renderer:'gpu'}); const canvas = page.locator('.mc-disconnect-background canvas');
  await expect(canvas).toHaveAttribute('data-render-state','ready');
  await expect(page.locator('.mc-disconnect-background__css')).toHaveCSS('visibility','hidden');
  await canvas.evaluate(node => {const gl=(node as HTMLCanvasElement).getContext('webgl')!;gl.getExtension('WEBGL_lose_context')!.loseContext();});
  await expect(canvas).toHaveAttribute('data-render-state','error');
  await expect(page.locator('.mc-disconnect-background__css')).toHaveCSS('visibility','visible');
  await page.evaluate(() => window.disconnectQA.configure({hidden:true})); await expect(canvas).toHaveCount(0);
  await page.evaluate(() => window.disconnectQA.configure({hidden:false})); await expect(canvas).toHaveAttribute('data-render-state','ready');
  await page.evaluate(() => window.disconnectQA.configure({mounted:false})); await expect(canvas).toHaveCount(0);
});
