import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PNG } from 'pngjs';

const field = (page: Page, name: string) => page.locator(`[data-select-case="${name}"]`);
const warnings = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const messages: string[] = [];warnings.set(page, messages);
  page.on('console', message => { if (message.type() === 'error' || message.type() === 'warning') messages.push(message.text()); });
  await page.goto('/demo/select-consistency-fixture.html');await page.evaluate(() => document.fonts.ready);
});
async function equalPixels(a: Locator, b: Locator, label: string) {
  const first = PNG.sync.read(await a.screenshot()), second = PNG.sync.read(await b.screenshot());
  samePixels(first, second, label);
}
function samePixels(first: PNG, second: PNG, label: string) {
  expect([second.width, second.height], label + ' complete dimensions').toEqual([first.width, first.height]);
  expect(second.data.equals(first.data), label + ' every RGBA channel, no mask/tolerance').toBe(true);
}

test('Select and Combobox render identical complete trigger and popup skins in matching interaction states', async ({ page }) => {
  const single = field(page, 'single'), combo = field(page, 'combo');
  const a = single.getByRole('combobox'), b = combo.getByRole('combobox');
  await page.mouse.move(0, 0);await equalPixels(a, b, 'default trigger');
  const focused: Buffer[] = [];
  for (const trigger of [a, b]) {
    await trigger.focus();await trigger.press('Tab');await trigger.press('Shift+Tab');await page.mouse.move(0, 0);
    focused.push(PNG.sync.read(await trigger.screenshot()).data);
  }
  expect(focused[0]!.equals(focused[1]!)).toBe(true);
  const triggers: PNG[] = [], popups: PNG[] = [];
  for (const container of [single, combo]) {
    // A fractional screenshot clip includes an extra outside row whose
    // underlying form controls differ. Render each complete component at the
    // same integer plane; do not trim that row or mask any component pixels.
    const control = container.locator('.mc-combobox'), oldStyle = await control.getAttribute('style');
    await control.evaluate(node => Object.assign((node as HTMLElement).style, { position: 'fixed', left: '20px', top: '100px', width: '280px', zIndex: '9999' }));
    const trigger = container.getByRole('combobox');await trigger.focus();await trigger.press('ArrowDown');await page.mouse.move(0, 0);
    const list = container.getByRole('listbox');await expect(list).toBeVisible();
    await expect(list.getByRole('option', { name: 'Normal', exact: true })).toHaveAttribute('aria-selected', 'true');
    await trigger.press('End');
    await expect(list.getByRole('option', { name: 'Hard', exact: true })).toHaveAttribute('data-active', 'true');
    triggers.push(PNG.sync.read(await trigger.screenshot()));popups.push(PNG.sync.read(await list.screenshot()));
    await trigger.press('Escape');
    await control.evaluate((node, value) => value === null ? node.removeAttribute('style') : node.setAttribute('style', value), oldStyle);
  }
  samePixels(triggers[0]!, triggers[1]!, 'expanded trigger');samePixels(popups[0]!, popups[1]!, 'complete popup');
  await page.mouse.move(0, 0);
  await equalPixels(field(page, 'select-disabled').getByRole('combobox'), field(page, 'combo-disabled').getByRole('combobox'), 'disabled trigger');
});

test('Select keyboard navigation separates active and selected state, skips disabled rows and cancels with Escape', async ({ page }) => {
  const container = field(page, 'single'), trigger = container.getByRole('combobox');
  await trigger.focus();await trigger.press('ArrowDown');await trigger.press('ArrowUp');
  const peaceful = container.getByRole('option', { name: 'Peaceful', exact: true });
  await expect(trigger).toHaveAttribute('aria-activedescendant', await peaceful.getAttribute('id') ?? '');
  await expect(container.getByRole('option', { name: 'Normal', exact: true })).toHaveAttribute('aria-selected', 'true');
  await trigger.press('Enter');await expect(trigger).toHaveText('Peaceful');
  await trigger.press('End');await trigger.press('Escape');await expect(trigger).toHaveText('Peaceful');await expect(trigger).toBeFocused();
  await trigger.press('h');await trigger.press('Enter');await expect(trigger).toHaveText('Hard');
  await trigger.click();const disabled = container.getByRole('option', { name: 'Easy', exact: true });
  await expect(disabled).toHaveAttribute('aria-disabled', 'true');
  const bounds = await disabled.boundingBox();await page.mouse.click(bounds!.x + 12, bounds!.y + 12);
  await expect(trigger).toHaveText('Hard');await expect(trigger).toHaveAttribute('aria-expanded', 'true');
});

test('native Select ref, real input/change targets, native methods, FormData and canceled resets remain compatible', async ({ page }) => {
  const container = field(page, 'single'), native = container.locator('select'), trigger = container.getByRole('combobox');
  await expect(native).toHaveAttribute('id', 'consumer-select');await expect(native).toHaveAttribute('data-consumer', 'native-attributes');
  await expect(native).toHaveAttribute('aria-hidden', 'true');await expect(native).toHaveCSS('opacity', '0');
  // A pristine reset must retain defaultValue even though no commit has yet
  // scheduled a new React value. Read both DOM and native FormData afterward.
  await expect(native).toHaveValue('normal');await expect(trigger).toHaveText('Normal');
  await page.getByRole('button', { name: 'Reset single', exact: true }).click();
  await expect(native).toHaveValue('normal');await expect(trigger).toHaveText('Normal');
  await page.getByRole('button', { name: 'Save single', exact: true }).click();
  await expect(page.getByLabel('Single FormData')).toHaveText('[["difficulty","normal"]]');
  await page.getByRole('button', { name: 'Focus native ref', exact: true }).click();await expect(trigger).toBeFocused();
  await trigger.press('End');await trigger.press('Enter');await expect(native).toHaveValue('hard');
  const events = JSON.parse(await page.getByLabel('Native change events').textContent() ?? '[]');
  expect(events).toEqual([{ type: 'input' }, { type: 'change', value: 'hard', currentTargetIsRef: true, targetIsRef: true, nativeTargetIsRef: true, tag: 'SELECT' }]);
  await page.getByRole('button', { name: 'Save single', exact: true }).click();await expect(page.getByLabel('Single FormData')).toHaveText('[["difficulty","hard"]]');
  await page.getByRole('checkbox', { name: 'Cancel reset', exact: true }).check();
  await page.getByRole('button', { name: 'Reset single', exact: true }).click();await expect(native).toHaveValue('hard');await expect(trigger).toHaveText('Hard');
  await page.getByRole('checkbox', { name: 'Cancel reset', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Reset single', exact: true }).click();await expect(native).toHaveValue('normal');await expect(trigger).toHaveText('Normal');
  await native.selectOption('peaceful', { force: true });await expect(trigger).toHaveText('Peaceful');
});

test('controlled selection stays caller-owned and external forms submit exactly one associated control', async ({ page }) => {
  const controlled = field(page, 'controlled'), trigger = controlled.getByRole('combobox');
  await trigger.press('End');await trigger.press('Enter');
  await expect(page.getByLabel('Attempted controlled value')).toHaveText('hard');await expect(trigger).toHaveText('Normal');
  await expect(controlled.locator('select')).toHaveValue('normal');
  await page.getByRole('button', { name: 'Reset controlled', exact: true }).click();await expect(controlled.locator('select')).toHaveValue('normal');await expect(trigger).toHaveText('Normal');
  await page.getByRole('button', { name: 'Approve controlled hard', exact: true }).click();await expect(trigger).toHaveText('Hard');await expect(controlled.locator('select')).toHaveValue('hard');
  await page.getByRole('button', { name: 'Reset controlled', exact: true }).click();await expect(controlled.locator('select')).toHaveValue('hard');await expect(trigger).toHaveText('Hard');
  await page.getByRole('button', { name: 'Save controlled', exact: true }).click();await expect(page.getByLabel('Controlled FormData')).toHaveText('[["controlled","hard"]]');
  const external = field(page, 'external'), externalTrigger = external.getByRole('combobox');
  await externalTrigger.press('End');await externalTrigger.press('Enter');
  await page.getByRole('button', { name: 'Save external', exact: true }).click();await expect(page.getByLabel('External FormData')).toHaveText('[["external","hard"]]');
  await page.getByRole('button', { name: 'Reset external', exact: true }).click();await expect(externalTrigger).toHaveText('Normal');
});

test('multiple Select preserves popup multi-selection, selectedOptions and repeated form names', async ({ page }) => {
  const multiple = field(page, 'multiple'), trigger = multiple.getByRole('combobox');
  await page.getByRole('button', { name: 'Reset multiple', exact: true }).click();await expect(trigger).toHaveText('Normal');
  await page.getByRole('button', { name: 'Save multiple', exact: true }).click();await expect(page.getByLabel('Multiple FormData')).toHaveText('[["choices","normal"]]');
  await trigger.click();const list = multiple.getByRole('listbox');await expect(list).toHaveAttribute('aria-multiselectable', 'true');
  await list.getByRole('option', { name: 'Hard', exact: true }).click();await expect(list).toBeVisible();
  await expect(list.getByRole('option', { name: 'Normal', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(list.getByRole('option', { name: 'Hard', exact: true })).toHaveAttribute('aria-selected', 'true');
  expect(await multiple.locator('select').evaluate(node => [...(node as HTMLSelectElement).selectedOptions].map(option => option.value))).toEqual(['normal', 'hard']);
  await page.getByRole('button', { name: 'Save multiple', exact: true }).click();await expect(page.getByLabel('Multiple FormData')).toHaveText('[["choices","normal"],["choices","hard"]]');
  await page.getByRole('button', { name: 'Reset multiple', exact: true }).click();await expect(trigger).toHaveText('Normal');
  await trigger.click();await list.getByRole('option', { name: 'Normal', exact: true }).click();await expect(trigger).toHaveText('');
  expect(await multiple.locator('select').evaluate(node => (node as HTMLSelectElement).selectedOptions.length)).toBe(0);
});

test('required validation focuses the painted trigger, legacy capture events fire and hidden Select stays hidden', async ({ page }) => {
  const required = field(page, 'required'), trigger = required.getByRole('combobox');
  await page.getByRole('button', { name: 'Validate required', exact: true }).click();await expect(trigger).toBeFocused();await expect(trigger).toHaveAttribute('aria-invalid', 'true');
  await trigger.press('End');await trigger.press('Enter');await expect(trigger).not.toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'Validate required', exact: true }).click();await expect(page.getByLabel('Required FormData')).toHaveText('[["required","hard"]]');
  const single = field(page, 'single');await single.getByRole('combobox').click();
  await expect(page.getByLabel('Native capture events')).toHaveText('pointerdown:capture|pointerdown|mousedown:capture|mousedown|click:capture|click');
  await expect(field(page, 'hidden').getByRole('combobox')).toHaveCount(0);
  await expect(field(page, 'hidden').locator('.mc-combobox')).not.toBeVisible();
  await expect(field(page, 'select-disabled').getByRole('combobox')).toBeDisabled();
  await expect(field(page, 'select-disabled').locator('select')).toBeDisabled();
  const axe = await new AxeBuilder({ page }).include('[data-select-case="single"]').analyze();
  expect(axe.violations.filter(violation => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([]);
  expect(warnings.get(page)?.filter(message => /controlled or uncontrolled|both.*value.*defaultValue/i.test(message))).toEqual([]);
});
