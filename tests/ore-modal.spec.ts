import {expect, test} from '@playwright/test';
import type {Page} from '@playwright/test';
import type {OreModalConfiguration} from '../demo/ore-modal-fixture';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {OreModal, OreModalHeader, OreModalContent, OreModalText, OreModalActions} from '../src/ore-modal';

// Browser HTML dialog and host-controlled composition contracts. These checks
// do not qualify native engine focus, fonts, input providers or whole GUI pixels.
const primary = (page: Page) => page.locator('#ore-modal-primary');
const child = (page: Page) => page.locator('#ore-modal-child');
const configure = (page: Page, value: Partial<OreModalConfiguration>) => page.evaluate(value => window.oreModalFixture.configure(value), value);
const requests = (page: Page) => page.evaluate(() => window.oreModalFixture.requests);
const clear = (page: Page) => page.evaluate(() => window.oreModalFixture.clear());
async function loaded(page: Page) {
  await page.goto('/demo/ore-modal-fixture.html?strict');
  await expect.poll(() => page.evaluate(() => window.oreModalFixture?.ready ?? false)).toBe(true);
  await expect(page.locator('#ore-modal-open')).toBeVisible();
}
async function opened(page: Page) {
  await loaded(page); await page.locator('#ore-modal-open').click(); await expect(primary(page)).toBeVisible();
}

test('five composed parts SSR without browser IO, opening a native dialog or mutating refs', () => {
  const previous = globalThis.fetch, ref = {current: null as HTMLDialogElement | null}; let calls = 0;
  globalThis.fetch = (() => {calls++; throw Error('Unexpected SSR IO');}) as typeof fetch;
  try {
    const html = renderToStaticMarkup(createElement(OreModal, {open: false, label: 'SSR modal', width: 320, height: 240, ref, onDismissRequest: () => {}},
      createElement(OreModalHeader, {hideCloseButton: true}, 'SSR title'),
      createElement(OreModalContent, null, createElement(OreModalText, null, 'Host content')),
      createElement(OreModalActions, null, createElement('button', {type: 'button'}, 'Close'))));
    expect(html).toContain('<dialog'); expect(html).toContain('Host content'); expect(html).not.toMatch(/<dialog\b[^>]*\sopen(?:=|\s|>)/);
    expect(ref.current).toBeNull(); expect(calls).toBe(0);
  } finally {globalThis.fetch = previous;}
});

test('native dialog refs, focus trap and exact opener restoration survive rerenders', async ({page}) => {
  await opened(page);
  expect(await primary(page).evaluate(node => node === window.oreModalFixture.dialog)).toBe(true);
  await expect(page.locator('#ore-modal-cancel')).toBeFocused();
  const node = await primary(page).elementHandle(); await configure(page, {revision: 1});
  expect(await primary(page).evaluate((current, previous) => current === previous, node)).toBe(true);
  await expect(page.locator('#ore-modal-cancel')).toBeFocused();
  await primary(page).getByRole('button', {name: '关闭主弹窗', exact: true}).focus();
  await page.keyboard.press('Shift+Tab'); await expect(page.locator('#ore-modal-continue')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(primary(page).getByRole('button', {name: '关闭主弹窗', exact: true})).toBeFocused();
  await page.locator('#ore-modal-after').evaluate(node => (node as HTMLElement).focus());
  expect(await primary(page).evaluate(node => node.contains(node.ownerDocument.activeElement))).toBe(true);
  await page.keyboard.press('Escape'); await expect(primary(page)).toBeHidden();
  await expect(page.locator('#ore-modal-open')).toBeFocused();
  await expect.poll(async () => (await requests(page)).map(entry => entry.reason)).toEqual(['escape']);
  await node!.dispose();
});

test('Escape veto precedes requests and repeated platform close reports native-close', async ({page}) => {
  await opened(page); await configure(page, {preventKey: true}); await page.keyboard.press('Escape');
  await expect(primary(page)).toBeVisible(); expect(await requests(page)).toEqual([]);
  await configure(page, {preventKey: false, preventCancel: true}); await page.keyboard.press('Escape');
  await expect(primary(page)).toBeVisible(); expect(await requests(page)).toEqual([]);
  await configure(page, {preventCancel: false});
  await primary(page).evaluate(node => node.addEventListener('cancel', event => event.preventDefault(), {once: true}));
  await page.keyboard.press('Escape'); await expect(primary(page)).toBeVisible(); expect(await requests(page)).toEqual([]);
  await page.keyboard.press('Escape'); await expect(primary(page)).toBeHidden();
  // CloseWatcher may make a repeated close request non-cancelable when no
  // intervening user activation remains. Observe the platform close itself;
  // the component must release its owner and never reopen against the user.
  await expect.poll(async () => (await requests(page)).map(entry => entry.reason)).toEqual(['native-close']);
});

test('native close releases ownership once and requires a host false-to-true transition to reopen', async ({page}) => {
  await opened(page); await configure(page, {acceptDismiss: false});
  await primary(page).evaluate(node => (node as HTMLDialogElement).close());
  await expect(primary(page)).toBeHidden();
  await expect.poll(async () => (await requests(page)).map(entry => entry.reason)).toEqual(['native-close']);
  await configure(page, {revision: 9}); await expect(primary(page)).toBeHidden();
  await page.locator('#ore-modal-after').focus(); await expect(page.locator('#ore-modal-after')).toBeFocused();
  await page.evaluate(() => window.oreModalFixture.setOpen(false));
  await page.evaluate(() => window.oreModalFixture.setOpen(true)); await expect(primary(page)).toBeVisible();
  await expect(page.locator('#ore-modal-cancel')).toBeFocused();
  await page.locator('#ore-modal-cancel').click(); await expect(primary(page)).toBeHidden();
  expect((await requests(page)).map(entry => entry.reason)).toEqual(['native-close']);
});

test('native close of the child releases the parent for the next Escape', async ({page}) => {
  await opened(page); await page.locator('#ore-modal-nested-open').click(); await expect(child(page)).toBeVisible();
  await child(page).evaluate(node => (node as HTMLDialogElement).close());
  await expect(child(page)).toBeHidden(); await expect(primary(page)).toBeVisible();
  await page.keyboard.press('Escape'); await expect(primary(page)).toBeHidden();
  await expect.poll(async () => (await requests(page)).map(entry => [entry.owner, entry.reason])).toEqual([['child', 'native-close'], ['primary', 'escape']]);
});

test('source default backdrop is inert; explicit host backdrop policy remains vetoable', async ({page}) => {
  await opened(page); await page.mouse.click(2, 2); await expect(primary(page)).toBeVisible(); expect(await requests(page)).toEqual([]);
  await configure(page, {closeOnBackdrop: true, preventBackdrop: true}); await page.mouse.click(2, 2);
  await expect(primary(page)).toBeVisible(); expect(await requests(page)).toEqual([]);
  await configure(page, {preventBackdrop: false}); await page.mouse.click(2, 2);
  await expect(primary(page)).toBeHidden(); await expect.poll(async () => (await requests(page)).map(entry => entry.reason)).toEqual(['backdrop']);
});

test('controlled refusal retains dialog and focus while later close requests can be accepted', async ({page}) => {
  await opened(page); await configure(page, {acceptDismiss: false});
  await primary(page).getByRole('button', {name: '关闭主弹窗', exact: true}).click();
  await expect.poll(() => requests(page)).toHaveLength(1); await expect(primary(page)).toBeVisible();
  expect(await primary(page).evaluate(node => (node as HTMLDialogElement).open)).toBe(true);
  await page.keyboard.press('Escape'); await expect.poll(() => requests(page)).toHaveLength(2); await expect(primary(page)).toBeVisible();
  await configure(page, {acceptDismiss: true}); await primary(page).getByRole('button', {name: '关闭主弹窗', exact: true}).click();
  await expect(primary(page)).toBeHidden(); await expect(page.locator('#ore-modal-open')).toBeFocused();
  expect((await requests(page)).map(entry => entry.reason)).toEqual(['close', 'escape', 'close']);
});

test('last gamepad close-button gate is independent from touch scrolling', async ({page}) => {
  await opened(page); const close = primary(page).getByRole('button', {name: '关闭主弹窗', exact: true});
  await configure(page, {touchScroll: true}); await expect(close).toBeVisible();
  await configure(page, {lastInputGamepad: true}); await expect(close).toHaveCount(0);
  await configure(page, {touchScroll: false}); await expect(close).toHaveCount(0);
  await configure(page, {lastInputGamepad: false}); await expect(close).toBeVisible();
  await page.keyboard.press('Escape'); await expect(primary(page)).toBeHidden();
});

test('explicit dimensions clip without browser scrollbars; custom scrolling is a separate usable branch', async ({page}) => {
  await loaded(page); const width = Math.min(340, (page.viewportSize()?.width ?? 393) - 24);
  await configure(page, {width, height: 240, longText: true}); await page.locator('#ore-modal-open').click();
  const panel = page.locator('#ore-modal-primary-panel'); await expect(panel).toBeVisible();
  const box = await panel.boundingBox(); expect(box!.width).toBeCloseTo(width, 0); expect(box!.height).toBeCloseTo(240, 0);
  expect(await panel.evaluate(node => ['auto', 'scroll'].includes(getComputedStyle(node).overflowY))).toBe(false);
  await expect(primary(page).getByRole('scrollbar')).toHaveCount(0);
  await configure(page, {scrollable: true}); const scrollbar = primary(page).getByRole('scrollbar'); await expect(scrollbar).toBeVisible();
  await scrollbar.focus(); await scrollbar.press('End');
  await expect.poll(() => primary(page).locator('.mc-ore-scroll__viewport').evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press('Escape'); await expect(primary(page)).toBeHidden();
});

test('nested native dialogs close only the top layer and restore the parent focus target', async ({page}) => {
  await opened(page); await page.locator('#ore-modal-nested-open').click(); await expect(child(page)).toBeVisible();
  await page.keyboard.press('Escape'); await expect(child(page)).toBeHidden(); await expect(primary(page)).toBeVisible();
  await expect(page.locator('#ore-modal-nested-open')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(primary(page)).toBeHidden(); await expect(page.locator('#ore-modal-open')).toBeFocused();
  await expect.poll(async () => (await requests(page)).map(entry => [entry.owner, entry.reason])).toEqual([['child', 'escape'], ['primary', 'escape']]);
});

test('host readonly policy disables mutation while keeping cancellation available', async ({page}) => {
  await opened(page); await configure(page, {readOnly: true}); await expect(page.locator('#ore-modal-continue')).toBeDisabled();
  await page.locator('#ore-modal-continue').evaluate(node => (node as HTMLButtonElement).click());
  expect(await page.evaluate(() => window.oreModalFixture.actions)).toEqual([]);
  await page.locator('#ore-modal-cancel').click(); await expect(primary(page)).toBeHidden();
  await expect(page.locator('#ore-modal-open')).toBeFocused();
});

test('unmounting open nested dialogs restores external state and removes ghost dismissal', async ({page}) => {
  await loaded(page); await page.evaluate(() => document.documentElement.style.setProperty('overflow', 'scroll', 'important'));
  await page.locator('#ore-modal-open').click(); await page.locator('#ore-modal-nested-open').click();
  await expect(child(page)).toBeVisible(); await clear(page); await configure(page, {mounted: false});
  await expect(primary(page)).toHaveCount(0); await expect(child(page)).toHaveCount(0);
  expect(await page.locator('#pre-inert').getAttribute('inert')).toBe('original-value');
  expect(await page.evaluate(() => [document.documentElement.style.getPropertyValue('overflow'), document.documentElement.style.getPropertyPriority('overflow')])).toEqual(['scroll', 'important']);
  await page.locator('#ore-modal-after').focus(); await expect(page.locator('#ore-modal-after')).toBeFocused(); await page.keyboard.press('Escape'); expect(await requests(page)).toEqual([]);
  expect(await page.evaluate(() => window.oreModalFixture.dialog)).toBeNull();
});

test('main gallery route exposes all three host-localized routes and returns focus after actions', async ({page}) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await page.goto('/#ore-modals');
  const demo = page.getByTestId('ore-modal-demo'); await expect(demo).toBeVisible();
  for (const [label, title, action] of [['打开未保存提示', '放弃更改？', '继续编辑'], ['打开删除提示', '删除服务器？', '删除'], ['打开错误提示', '无法添加服务器', '关闭']] as const) {
    const opener = demo.getByRole('button', {name: label, exact: true}); await opener.click(); const dialog = page.getByRole('dialog', {name: title, exact: true}); await expect(dialog).toBeVisible();
    await dialog.getByRole('button', {name: action, exact: true}).click(); await expect(dialog).toBeHidden(); await expect(opener).toBeFocused();
  }
  expect(errors).toEqual([]);
});

test('main gallery configured panel clips long content and touch mode keeps the source close button', async ({page}) => {
  await page.goto('/#ore-modals'); const demo = page.getByTestId('ore-modal-demo'); await expect(demo).toBeVisible();
  for (const [label, option] of [['弹窗宽度', '320 px'], ['弹窗高度', '240 px']] as const) {
    await demo.getByRole('combobox', {name: label, exact: true}).click(); await page.getByRole('option', {name: option, exact: true}).click();
  }
  await demo.getByRole('switch', {name: '长内容', exact: true}).check(); await demo.getByRole('switch', {name: '触控滚动', exact: true}).check();
  const opener = demo.getByRole('button', {name: '打开未保存提示', exact: true}); await opener.click();
  const dialog = page.getByRole('dialog', {name: '放弃更改？', exact: true}), panel = page.locator('#ore-modal-demo-panel'); await expect(dialog).toBeVisible();
  const available = await demo.evaluate(node => node.clientWidth), box = await panel.boundingBox(); expect(box!.width).toBeCloseTo(Math.min(320, available), 0); expect(box!.height).toBeCloseTo(240, 0);
  expect(await page.locator('#ore-modal-demo-content').evaluate(node => ['auto', 'scroll'].includes(getComputedStyle(node).overflowY))).toBe(false);
  await expect(dialog.getByRole('scrollbar')).toHaveCount(0); await expect(dialog.getByRole('button', {name: '关闭提示', exact: true})).toBeVisible();
  await page.keyboard.press('Escape'); await expect(opener).toBeFocused();
  await demo.getByRole('switch', {name: '最近使用手柄', exact: true}).check(); await opener.click();
  await expect(dialog.getByRole('button', {name: '关闭提示', exact: true})).toHaveCount(0); await dialog.getByRole('button', {name: '继续编辑', exact: true}).click(); await expect(dialog).toBeHidden();
});

test('main gallery controlled refusal has an explicit host exit without trapping the preview', async ({page}) => {
  await page.goto('/#ore-modals'); const demo = page.getByTestId('ore-modal-demo'); await expect(demo).toBeVisible();
  const accept = demo.getByRole('switch', {name: '接受关闭与操作请求', exact: true}); await accept.uncheck();
  const opener = demo.getByRole('button', {name: '打开未保存提示', exact: true}); await opener.click();
  const dialog = page.getByRole('dialog', {name: '放弃更改？', exact: true}); await dialog.getByRole('button', {name: '继续编辑', exact: true}).click(); await expect(dialog).toBeVisible();
  await dialog.getByRole('button', {name: '退出预览', exact: true}).click(); await expect(dialog).toBeHidden(); await expect(accept).toBeChecked(); await expect(opener).toBeFocused();
});
