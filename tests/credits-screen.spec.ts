import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function ready(page: Page) {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));
  await page.goto('/demo/credits-screen-fixture.html');
  await expect(page.locator('.mc-credits-screen')).toBeVisible();
  await page.locator('.mc-credits-screen').focus();
}
async function advance(page: Page, milliseconds: number) { await page.clock.runFor(milliseconds); }
async function escape(page: Page) { await page.keyboard.press('Escape'); await advance(page, 2); }
const offset = (page: Page) => page.locator('.mc-credits-roll').getAttribute('data-offset').then(Number);

test('fixed surface clips at explicit dimensions and retains whole background provenance', async ({ page }) => {
  await ready(page);
  expect(await page.locator('.mc-credits-screen').evaluate(node => {
    const bounds = node.getBoundingClientRect(), background = node.querySelector('.mc-credits-screen__background')!;
    return { box: [bounds.width, bounds.height], overflow: getComputedStyle(node).overflow,
      tile: getComputedStyle(background).backgroundSize, provenance: background.getAttribute('data-source-texture'), native: node.getAttribute('data-native-certified') };
  })).toEqual({ box: [300, 120], overflow: 'hidden', tile: '8px 8px', provenance: 'authored-test-2x2', native: 'false' });
  expect(await page.evaluate(() => window.__creditsScreenQA.root()?.contains(window.__creditsScreenQA.viewport()))).toBe(true);
  await expect(page.getByRole('heading', { name: 'Host section' })).toHaveCount(1);
});

test('first Escape reveals child, its five-second lifetime leaves parent exit input active', async ({ page }) => {
  await ready(page); await escape(page);
  await expect(page.getByRole('button', { name: 'Skip' })).toBeVisible();
  await advance(page, 5100);
  await expect(page.getByRole('button', { name: 'Skip' })).toHaveCount(0);
  await expect(page.locator('#lifecycle-status')).toHaveText('destroy-skip-child');
  await escape(page);
  await expect(page.locator('#action-status')).toHaveText('Close requested');
  await expect(page.locator('#lifecycle-status')).not.toContainText('credits_end');
});

test('faster changes roll distance prospectively and never accelerates button age', async ({ page }) => {
  await ready(page); await escape(page);
  await advance(page, 1000);
  await page.evaluate(() => window.__creditsScreenQA.configure({ faster: true }));
  const before = await offset(page);
  await advance(page, 1000);
  await page.evaluate(() => window.__creditsScreenQA.configure({ playing: false }));
  expect((await offset(page)) - before).toBeCloseTo(40, 0);
  await expect(page.getByRole('button', { name: 'Skip' })).toBeVisible();
  const paused = await offset(page);
  await advance(page, 6000);
  expect(await offset(page)).toBe(paused);
  await expect(page.getByRole('button', { name: 'Skip' })).toBeVisible();
});

test('natural completion emits scroll_end then three-second credits_end without a user close', async ({ page }) => {
  await ready(page); await advance(page, 10000);
  await expect(page.locator('#lifecycle-status')).toHaveText('scroll_end');
  await expect(page.locator('[data-cover="outro"]')).toHaveCount(1);
  await expect(page.locator('#action-status')).toHaveText('No action');
  await advance(page, 4000);
  await expect(page.locator('#lifecycle-status li')).toHaveText(['scroll_end', 'credits_end']);
  await advance(page, 1000);
  await expect(page.locator('#lifecycle-status li')).toHaveCount(2);
  await expect(page.locator('[data-cover="outro"]')).toHaveAttribute('data-cover-opacity', '1');
});

test('late document veto prevents reveal and a distinct positive input reveals it', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => document.addEventListener('keydown', event => event.preventDefault(), { once: true }));
  await escape(page);
  await expect(page.getByRole('button', { name: 'Skip' })).toHaveCount(0);
  await escape(page);
  await expect(page.getByRole('button', { name: 'Skip' })).toBeVisible();
});

test('host veto and disabled state reject actions; closing remains a host request', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.__creditsScreenQA.configure({ veto: true })); await escape(page);
  await expect(page.getByRole('button', { name: 'Skip' })).toHaveCount(0);
  await page.evaluate(() => window.__creditsScreenQA.configure({ veto: false })); await escape(page);
  await expect(page.getByRole('button', { name: 'Skip' })).toBeVisible();
  await page.evaluate(() => window.__creditsScreenQA.configure({ disabled: true })); await escape(page);
  await expect(page.locator('#action-status')).toHaveText('No action');
  await page.evaluate(() => window.__creditsScreenQA.configure({ disabled: false }));
  await page.getByRole('button', { name: 'Skip' }).click(); await advance(page, 2);
  await expect(page.locator('#action-status')).toHaveText('Close requested');
  await expect(page.locator('.mc-credits-screen')).toBeVisible();
});

test('controlled source keeps visibility, child existence and exit eligibility independent', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.__creditsScreenQA.configure({ mode: 'controlled-source', runKey: 'advanced', offset: 1000,
    snapshot: { introAgeMs: 1500, backgroundElapsedMs: 503000, skipButtonVisible: false, factory: {
      skipPanel: { instanceId: 'parent', exitInputActive: true, button: null }, fadeOut: { instanceId: 'fade', ageMs: 1500 } } } }));
  await expect(page.locator('[data-cover="intro"]')).toHaveAttribute('data-cover-opacity', '0.5');
  await expect(page.locator('[data-cover="outro"]')).toHaveAttribute('data-cover-opacity', '0.5');
  await expect(page.getByRole('button', { name: 'Skip' })).toHaveCount(0);
  expect(await page.evaluate(() => window.__creditsScreenQA.request({ fromButtonId: 'button.menu_cancel', destination: 'skip-panel-input' }))).toBe(true);
  await advance(page, 2);
  await expect(page.locator('#action-status')).toHaveText('Close requested');
  await advance(page, 6000);
  await expect(page.locator('[data-cover="outro"]')).toHaveAttribute('data-cover-opacity', '0.5');
  await expect(page.locator('#lifecycle-status')).not.toContainText('credits_end');
});

test('controlled child timeout requests destruction without mutating host generation', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.__creditsScreenQA.configure({ mode: 'controlled-source', runKey: 'advanced', snapshot: {
    introAgeMs: 3000, backgroundElapsedMs: 0, skipButtonVisible: true, factory: {
      skipPanel: { instanceId: 'panel', exitInputActive: false, button: { generation: 'old', ageMs: 5000 } }, fadeOut: null } } }));
  await expect(page.locator('#lifecycle-status li')).toHaveText(['destroy-skip-child']);
  await expect(page.getByRole('button', { name: 'Skip' })).toBeHidden();
  expect(await page.evaluate(() => window.__creditsScreenQA.request({ fromButtonId: 'button.menu_cancel', destination: 'skip-panel-input' }))).toBe(false);
  await advance(page, 6000);
  await expect(page.locator('#lifecycle-status li')).toHaveCount(1);
});

test('new run resets clocks, source events and parent input; unmount clears real refs/controller', async ({ page }) => {
  await ready(page); await escape(page); await advance(page, 1000);
  await page.evaluate(() => window.__creditsScreenQA.configure({ runKey: 'restart', playing: false }));
  expect(await offset(page)).toBe(0);
  await expect(page.getByRole('button', { name: 'Skip' })).toHaveCount(0);
  // This profile explicitly leaves focus to the host. A new run has a new
  // root, so restore host focus before sending the next real keyboard input.
  expect(await page.locator('.mc-credits-screen').evaluate(node => node.ownerDocument.activeElement === node)).toBe(false);
  await page.locator('.mc-credits-screen').focus();
  await escape(page); await expect(page.getByRole('button', { name: 'Skip' })).toBeVisible();
  await page.evaluate(() => window.__creditsScreenQA.unmount());
  expect(await page.evaluate(() => ({ root: window.__creditsScreenQA.root(), viewport: window.__creditsScreenQA.viewport(),
    request: window.__creditsScreenQA.request({ fromButtonId: 'button.menu_cancel', destination: 'whole-screen' }) }))).toEqual({ root: null, viewport: null, request: false });
  await advance(page, 6000);
  await expect(page.locator('#action-status')).toHaveText('No action');
});

test('queued parent exit is canceled when the same parent loses input eligibility', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    const snapshot = { introAgeMs: 3000, backgroundElapsedMs: 0, skipButtonVisible: false, factory: {
      skipPanel: { instanceId: 'parent', exitInputActive: true, button: null }, fadeOut: null } };
    window.__creditsScreenQA.configure({ mode: 'controlled-source', runKey: 'advanced', snapshot });
    document.addEventListener('keydown', () => window.__creditsScreenQA.configure({ snapshot: {
      ...snapshot, factory: { ...snapshot.factory, skipPanel: { ...snapshot.factory.skipPanel, exitInputActive: false } } } }), { once: true });
  });
  await page.locator('.mc-credits-screen').focus(); await escape(page);
  await expect(page.locator('#action-status')).toHaveText('No action');
});

test('a host action that detaches its control cannot proceed into a close relay', async ({ page }) => {
  await ready(page); await escape(page);
  await page.evaluate(() => window.__creditsScreenQA.configure({ detachOnAction: true }));
  await page.getByRole('button', { name: 'Skip' }).click(); await advance(page, 2);
  await expect(page.locator('#action-status')).toHaveText('No action');
});

test('replacing content cannot complete against the previous shorter layout', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.__creditsScreenQA.configure({ mode: 'controlled-source', runKey: 'advanced', offset: 80 }));
  await page.evaluate(() => window.__creditsScreenQA.configure({ longContent: true, offset: 100 }));
  await expect(page.locator('#lifecycle-status')).toBeEmpty();
});

test('returning from controlled source does not integrate time spent in that mode', async ({ page }) => {
  await ready(page); await advance(page, 1000);
  await page.evaluate(() => window.__creditsScreenQA.configure({ mode: 'controlled-source' }));
  await advance(page, 3000);
  await page.evaluate(() => window.__creditsScreenQA.configure({ mode: 'playback', playing: false }));
  expect(await offset(page)).toBeCloseTo(10, 0);
});

test('distinct factory identities containing colons retain distinct child notifications', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    const snapshot = { introAgeMs: 3000, backgroundElapsedMs: 0, skipButtonVisible: true, factory: {
      skipPanel: { instanceId: 'a:b', exitInputActive: true, button: { generation: 'c', ageMs: 5000 } }, fadeOut: null } };
    window.__creditsScreenQA.configure({ mode: 'controlled-source', runKey: 'advanced', snapshot });
  });
  await expect(page.locator('#lifecycle-status li')).toHaveCount(1);
  await page.evaluate(() => window.__creditsScreenQA.configure({ snapshot: { introAgeMs: 3000, backgroundElapsedMs: 0, skipButtonVisible: true, factory: {
    skipPanel: { instanceId: 'a', exitInputActive: true, button: { generation: 'b:c', ageMs: 5000 } }, fadeOut: null } } }));
  await expect(page.locator('#lifecycle-status li')).toHaveCount(2);
});

test('queued keyboard mapping respects a policy removed during native propagation', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => document.addEventListener('keydown', () => window.__creditsScreenQA.configure({ escapePolicy: 'none' }), { once: true }));
  await escape(page);
  await expect(page.getByRole('button', { name: 'Skip' })).toHaveCount(0);
});

test('accepted keyboard action rechecks a policy retired by its host callback', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.__creditsScreenQA.configure({ retirePolicyOnAction: true }));
  await escape(page);
  await expect(page.getByRole('button', { name: 'Skip' })).toHaveCount(0);
});
