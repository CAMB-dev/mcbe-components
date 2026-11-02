import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { ExternalServerConfiguration } from '../demo/external-server-fixture';

// Source dimensions and Web native-input contracts; not a native screenshot or
// recovered server validation/connection behavior oracle.
const url = '/demo/external-server-fixture.html';
const primary = (page: Page) => page.locator('#external-server-primary');
const field = (page: Page, kind: 'name' | 'address' | 'port') => primary(page).locator(`[data-field-kind="${kind}"] input`);
const action = (page: Page, name: 'play' | 'save' | 'remove') => primary(page).locator(`button[data-external-server-action="${name}"]`);
async function configure(page: Page, next: Partial<ExternalServerConfiguration>) { await page.evaluate(value => window.externalServerFixture.configure(value), next); }
async function open(page: Page) {
  await page.goto(url);
  // This fixture chooses a whole integer source scale that fits its host. The
  // library does not silently rescale the caller's explicit source geometry.
  if ((page.viewportSize()?.width ?? 1280) < 656) await configure(page, { scale: 1 });
  await expect(primary(page)).toBeVisible();
}
async function clear(page: Page) { await page.evaluate(() => window.externalServerFixture.clear()); }
async function requests(page: Page) { return page.evaluate(() => window.externalServerFixture.actions); }

test('accepted controlled strings retain real field/form refs and exact port text in request snapshots', async ({ page }) => {
  await open(page); const input = field(page, 'port'), node = await input.elementHandle(), formNode = await primary(page).elementHandle();
  expect(await input.evaluate(element => element === window.externalServerFixture.inputs.port)).toBe(true);
  expect(await primary(page).evaluate(element => element === window.externalServerFixture.form)).toBe(true);
  await field(page, 'name').fill('Accepted draft'); await field(page, 'address').fill('例子.example'); await input.fill('00x1');
  await action(page, 'save').click(); await expect.poll(() => requests(page)).toEqual([{ action: 'save', value: { name: 'Accepted draft', address: '例子.example', port: '00x1' }, reason: 'button', owner: 'BUTTON' }]);
  expect(await input.evaluate((element, old) => element === old, node)).toBe(true);
  expect(await primary(page).evaluate((element, old) => element === old, formNode)).toBe(true);
  expect(await page.evaluate(() => window.externalServerFixture.changes.map(value => value.owner))).toEqual(['INPUT', 'INPUT', 'INPUT']);
});

test('rejected controlled edits never replace accepted values or actions', async ({ page }) => {
  await open(page); await configure(page, { accept: false }); await field(page, 'port').fill('000009');
  await expect(field(page, 'port')).toHaveValue('00123');
  expect(await page.evaluate(() => window.externalServerFixture.changes.at(-1)?.value.port)).toBe('000009');
  await action(page, 'play').click(); expect((await requests(page))[0]?.value.port).toBe('00123');
});

test('all four binding booleans remain independent in add/edit mode with one accessible control per action', async ({ page }) => {
  await open(page);
  for (const mode of ['add', 'edit'] as const) for (let bits = 0; bits < 16; bits++) {
    const bindings = { playEnabled: !!(bits & 1), playDisabledVisible: !!(bits & 2), saveEnabled: !!(bits & 4), saveDisabledVisible: !!(bits & 8) };
    await configure(page, { mode, bindings }); await clear(page);
    const left = mode === 'add' ? 'play' : 'remove';
    await expect(action(page, left)).toHaveCount(1); await expect(action(page, mode === 'add' ? 'remove' : 'play')).toHaveCount(0);
    await expect(primary(page).getByRole('button', { name: mode === 'add' ? 'Play' : 'Remove', exact: true })).toHaveCount(1);
    await expect(action(page, left)).toBeEnabled({ enabled: mode === 'edit' || bindings.playEnabled });
    const saveVisible = bindings.saveEnabled || bindings.saveDisabledVisible;
    await expect(action(page, 'save')).toHaveCount(saveVisible ? 1 : 0);
    if (saveVisible) {
      await expect(primary(page).getByRole('button', { name: 'Save', exact: true })).toHaveCount(1);
      await expect(action(page, 'save')).toBeEnabled({ enabled: bindings.saveEnabled });
    }
    const duplicatePaints = await primary(page).locator('.mc-external-server-action--underlay').evaluateAll(nodes => nodes.map(node => ({ tag: node.tagName, hidden: node.getAttribute('aria-hidden'), tab: (node as HTMLElement).tabIndex })));
    expect(duplicatePaints.every(item => item.tag === 'SPAN' && item.hidden === 'true' && item.tab === -1)).toBe(true);
    await action(page, left).evaluate(node => (node as HTMLButtonElement).click());
    if (saveVisible) await action(page, 'save').evaluate(node => (node as HTMLButtonElement).click());
    expect((await requests(page)).map(value => value.action)).toEqual([...(mode === 'edit' || bindings.playEnabled ? [left] : []), ...(bindings.saveEnabled ? ['save'] : [])]);
  }
});

test('overlay underpaint never adds a duplicate tab stop or accessible button', async ({ page }) => {
  await open(page); await configure(page, { bindings: { playEnabled: true, playDisabledVisible: true, saveEnabled: true, saveDisabledVisible: true } });
  await page.locator('#outside').focus(); const sequence: string[] = [];
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('Tab'); sequence.push(await page.evaluate(() => {
      const element = document.activeElement as HTMLElement; return element.getAttribute('aria-label') ?? element.id;
    }));
  }
  expect(sequence).toEqual(['Close form', 'qa-server-name', 'qa-server-address', 'qa-server-port', 'Play', 'Save', 'standalone-server-port']);
});

test('Enter requests the declared Web action and can never select Remove', async ({ page }) => {
  await open(page); await field(page, 'port').press('Enter');
  await expect.poll(() => requests(page)).toEqual([{ action: 'save', value: { name: 'Draft', address: 'host.example', port: '00123' }, reason: 'submit', owner: 'FORM' }]);
  await clear(page); await configure(page, { submitAction: 'play' }); await field(page, 'port').press('Enter');
  await expect.poll(() => page.evaluate(() => window.externalServerFixture.actions.map(value => value.action))).toEqual(['play']);
  await clear(page); await configure(page, { mode: 'edit', submitAction: 'save' }); await field(page, 'port').press('Enter');
  await expect.poll(() => page.evaluate(() => window.externalServerFixture.actions.map(value => value.action))).toEqual(['save']);
  await clear(page); await configure(page, { submitAction: 'play' }); await field(page, 'port').press('Enter');
  expect(await requests(page)).toEqual([]);
});

test('caller submit/reset/change/key cancellation precedes component defaults', async ({ page }) => {
  await open(page); await configure(page, { preventChange: true }); await field(page, 'name').fill('Rejected');
  await expect(field(page, 'name')).toHaveValue('Draft'); expect(await page.evaluate(() => window.externalServerFixture.changes)).toEqual([]);
  expect(await page.evaluate(() => window.externalServerFixture.native.some(event => event.kind === 'field-change'))).toBe(true);
  await configure(page, { preventChange: false, preventSubmit: true }); await field(page, 'name').press('Enter'); expect(await requests(page)).toEqual([]);
  await field(page, 'name').fill('Accepted'); await configure(page, { preventReset: true }); await clear(page);
  await page.evaluate(() => window.externalServerFixture.reset()); await expect(field(page, 'name')).toHaveValue('Accepted');
  expect(await page.evaluate(() => window.externalServerFixture.changes)).toEqual([]);
  await configure(page, { preventKey: true }); await field(page, 'name').press('Escape'); expect(await page.evaluate(() => window.externalServerFixture.closes)).toEqual([]);
  await configure(page, { preventKey: false, preventFieldKey: true, preventSubmit: false }); await field(page, 'name').press('Enter'); await field(page, 'name').press('Escape');
  expect(await requests(page)).toEqual([]); expect(await page.evaluate(() => window.externalServerFixture.closes)).toEqual([]);
});

test('native default prevention on the real controls is respected', async ({ page }) => {
  await open(page);
  await action(page, 'save').evaluate(element => element.addEventListener('click', event => event.preventDefault(), { once: true }));
  await action(page, 'save').click(); expect(await requests(page)).toEqual([]);
  await primary(page).evaluate(element => element.addEventListener('submit', event => event.preventDefault(), { once: true }));
  await field(page, 'port').press('Enter'); expect(await requests(page)).toEqual([]);
  await action(page, 'save').click(); expect((await requests(page)).map(value => value.action)).toEqual(['save']);
});

test('IME owns action, close, reset and submission until the real input composition ends', async ({ page }) => {
  await open(page); const control = field(page, 'name'); await control.focus(); await control.dispatchEvent('compositionstart', { data: '' });
  await action(page, 'save').click(); await page.evaluate(() => { window.externalServerFixture.submit(); window.externalServerFixture.reset(); });
  await control.press('Escape'); await primary(page).getByRole('button', { name: 'Close form', exact: true }).click();
  expect(await requests(page)).toEqual([]); expect(await page.evaluate(() => window.externalServerFixture.closes)).toEqual([]);
  expect(await page.evaluate(() => window.externalServerFixture.changes)).toEqual([]);
  await control.dispatchEvent('compositionend', { data: '' }); await action(page, 'save').click(); expect((await requests(page)).map(value => value.action)).toEqual(['save']);
  expect(await page.evaluate(() => window.externalServerFixture.native.filter(event => event.kind.includes('composition')).map(event => event.kind))).toEqual(['field-composition-start', 'form-composition-start', 'field-composition-end', 'form-composition-end']);
});

test('readOnly blocks edits and action/reset requests while retaining close; disabled also blocks close', async ({ page }) => {
  await open(page); await configure(page, { readOnly: true });
  for (const kind of ['name', 'address', 'port'] as const) await expect(field(page, kind)).toHaveAttribute('readonly', '');
  await expect(action(page, 'save')).toHaveAttribute('aria-disabled', 'true');
  // Native aria-disabled controls remain focusable. Force only this deliberate
  // disabled-semantic probe so the component's readOnly request guard is hit.
  await action(page, 'save').click({ force: true }); await page.evaluate(() => { window.externalServerFixture.submit(); window.externalServerFixture.reset(); });
  expect(await requests(page)).toEqual([]); expect(await page.evaluate(() => window.externalServerFixture.changes)).toEqual([]);
  await field(page, 'name').press('Escape'); expect(await page.evaluate(() => window.externalServerFixture.closes.map(value => value.reason))).toEqual(['escape']);
  await clear(page); await configure(page, { readOnly: false, disabled: true });
  await expect(field(page, 'name')).toBeDisabled(); await expect(action(page, 'save')).toBeDisabled();
  await expect(primary(page).getByRole('button', { name: 'Close form', exact: true })).toBeDisabled();
  await primary(page).evaluate(element => { (element as HTMLFormElement).reset(); element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
  expect(await page.evaluate(() => window.externalServerFixture.closes)).toEqual([]); expect(await page.evaluate(() => window.externalServerFixture.changes)).toEqual([]);
});

test('uncontrolled reset returns the initial default snapshot, independent of later defaultValue props', async ({ page }) => {
  await open(page); await configure(page, { controlled: false }); await field(page, 'port').fill('00x7');
  await configure(page, { defaultValue: { name: 'Later', address: 'later.invalid', port: '99999' } }); await clear(page);
  await page.evaluate(() => window.externalServerFixture.reset()); await expect(field(page, 'port')).toHaveValue('00123'); await expect(field(page, 'name')).toHaveValue('Draft');
  expect(await page.evaluate(() => window.externalServerFixture.changes)).toEqual([{ value: { name: 'Draft', address: 'host.example', port: '00123' }, reason: 'reset', owner: 'FORM' }]);
});

test('controlled reset is a request and rejected reset cannot mutate accepted input', async ({ page }) => {
  await open(page); await field(page, 'name').fill('Kept'); await configure(page, { accept: false }); await clear(page);
  await page.evaluate(() => window.externalServerFixture.reset()); await expect(field(page, 'name')).toHaveValue('Kept');
  expect(await page.evaluate(() => window.externalServerFixture.changes[0]?.reason)).toBe('reset');
  expect(await page.evaluate(() => window.externalServerFixture.changes[0]?.value.name)).toBe('Draft');
});

test('standalone Field forwards the native input ref, limits and unfiltered port edits', async ({ page }) => {
  await open(page); const standalone = page.getByLabel('Standalone port', { exact: true });
  expect(await standalone.evaluate(element => element === window.externalServerFixture.standalone)).toBe(true);
  await expect(standalone).toHaveAttribute('maxlength', '6'); await expect(standalone).toHaveAttribute('inputmode', 'numeric');
  await expect(standalone).toHaveAttribute('type', 'text'); await standalone.fill('00x-7'); await expect(standalone).toHaveValue('00x-7');
  expect(await page.evaluate(() => window.externalServerFixture.native.at(-1))).toEqual({ kind: 'standalone-change', value: '00x-7' });
  await expect(field(page, 'name')).toHaveAttribute('maxlength', '16'); await expect(field(page, 'address')).toHaveAttribute('maxlength', '256'); await expect(field(page, 'port')).toHaveAttribute('maxlength', '6');
  await field(page, 'name').fill(''); await field(page, 'name').pressSequentially('N'.repeat(20)); await expect(field(page, 'name')).toHaveValue('N'.repeat(16));
});

test('caller input ids, props, style and labels remain on the real native input', async ({ page }) => {
  await open(page); await configure(page, { custom: true }); const port = field(page, 'port');
  await expect(port).toHaveAttribute('id', 'qa-server-port'); await expect(port).toHaveClass(/caller-input/); await expect(port).toHaveAttribute('data-caller-field', 'port');
  await expect(port).toHaveAttribute('title', 'Caller port'); await expect(port).toHaveAttribute('maxlength', '12'); await expect(port).toHaveAttribute('inputmode', 'decimal');
  await expect(port).toHaveAttribute('autocomplete', 'off'); await expect(port).toHaveAttribute('placeholder', 'Enter port'); await expect(port).toHaveCSS('letter-spacing', '1px');
  await primary(page).getByText('Server port', { exact: true }).click(); await expect(port).toBeFocused();
  await port.fill('000001x234'); await expect(port).toHaveValue('000001x234');
});

test('source row/editor and 316x179 form dimensions scale explicitly without claiming native pixels', async ({ page }) => {
  await open(page);
  for (const [scale, size] of [[2, [316, 179]], [3, [400, 200]]] as const) {
    await configure(page, { scale, size });
    const dimensions = await primary(page).evaluate(element => {
      const box = element.getBoundingClientRect(), row = element.querySelector('.mc-external-server-field')!.getBoundingClientRect(), editor = element.querySelector('.mc-external-server-field__editor')!.getBoundingClientRect();
      return { form: [box.width, box.height], row: [row.width, row.height], editor: [editor.width, editor.height] };
    });
    expect(dimensions).toEqual({ form: [size[0] * scale, size[1] * scale], row: [(size[0] - 21) * scale, 38 * scale], editor: [(size[0] - 21) * scale, 25 * scale] });
  }
});

test('long caller values stay in clipped input/form boxes without introducing scrollbars', async ({ page }) => {
  await open(page); await configure(page, { long: true, scale: 2 });
  const clip = await primary(page).evaluate(element => {
    const form = element as HTMLElement, content = form.querySelector<HTMLElement>('.mc-external-server-form__content')!, input = form.querySelector<HTMLInputElement>('input')!, wrapper = input.parentElement!;
    return { formOverflow: getComputedStyle(form).overflow, contentOverflow: getComputedStyle(content).overflow, inputClip: getComputedStyle(wrapper).overflow,
      form: [form.clientWidth, form.clientHeight], scrollbar: [form.offsetWidth - form.clientWidth, form.offsetHeight - form.clientHeight],
      rawLength: input.value.length, horizontalInkOverflow: input.scrollWidth > input.clientWidth };
  });
  expect(clip.formOverflow).toBe('hidden'); expect(clip.contentOverflow).toBe('hidden'); expect(clip.inputClip).toBe('hidden');
  expect(clip.form).toEqual([632, 358]); expect(clip.scrollbar).toEqual([0, 0]);
  expect(clip.rawLength).toBe(2000); expect(clip.horizontalInkOverflow).toBe(true);
});

test('close button and Escape preserve explicit reasons and actual event owners', async ({ page }) => {
  await open(page); await primary(page).getByRole('button', { name: 'Close form', exact: true }).click(); await field(page, 'name').press('Escape');
  expect(await page.evaluate(() => window.externalServerFixture.closes)).toEqual([{ reason: 'close-button', owner: 'BUTTON' }, { reason: 'escape', owner: 'FORM' }]);
  await expect(primary(page)).toBeVisible();
});

test('caller close click capture can veto that request and releasing it restores the button action', async ({ page }) => {
  await open(page); await configure(page, { preventClick: true });
  await primary(page).getByRole('button', { name: 'Close form', exact: true }).click();
  expect(await page.evaluate(() => window.externalServerFixture.closes)).toEqual([]);
  expect(await page.evaluate(() => window.externalServerFixture.native.some(event => event.kind === 'close-click-capture'))).toBe(true);
  await field(page, 'name').press('Escape');
  expect(await page.evaluate(() => window.externalServerFixture.closes.map(value => value.reason))).toEqual(['escape']);
  await clear(page); await configure(page, { preventClick: false });
  await primary(page).getByRole('button', { name: 'Close form', exact: true }).click();
  expect(await page.evaluate(() => window.externalServerFixture.closes)).toEqual([{ reason: 'close-button', owner: 'BUTTON' }]);
});

test('native hidden props hide Form and standalone Field while preserving their real node ownership', async ({ page }) => {
  await open(page); const formNode = await primary(page).elementHandle(), port = field(page, 'port'), portNode = await port.elementHandle();
  const standalone = page.getByLabel('Standalone port', { exact: true }), standaloneNode = await standalone.elementHandle();
  await configure(page, { hidden: true, fieldHidden: true });
  await expect(primary(page)).toBeHidden(); await expect(page.locator('.qa-standalone .mc-external-server-field')).toBeHidden();
  expect(await primary(page).evaluate((node, before) => node === before && node === window.externalServerFixture.form, formNode)).toBe(true);
  expect(await page.locator('#standalone-server-port').evaluate((node, before) => node === before && node === window.externalServerFixture.standalone, standaloneNode)).toBe(true);
  await configure(page, { hidden: false, fieldHidden: false });
  await expect(primary(page)).toBeVisible(); await expect(standalone).toBeVisible();
  expect(await port.evaluate((node, before) => node === before && node === window.externalServerFixture.inputs.port, portNode)).toBe(true);
  await expect(port).toHaveValue('00123'); await expect(standalone).toHaveValue('00019');
});

test('actual source form and native standalone field retain accessible names and WCAG semantics', async ({ page }) => {
  await open(page);
  const result = await new AxeBuilder({ page }).include('#primary').include('.qa-standalone').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
});
