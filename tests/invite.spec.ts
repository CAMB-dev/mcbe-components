import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import type { InviteCollection } from '../src/invite-types';
import type { InviteFixtureSettings } from '../demo/invite-fixture';

const collections: readonly InviteCollection[] = ['online_platform_friends', 'online_linked_account_friends', 'online_xbox_live_friends', 'offline_platform_friends', 'offline_linked_account_friends', 'offline_xbox_live_friends'];
async function open(page: Page, initial: Partial<InviteFixtureSettings> = {}) { await page.addInitScript(value => { window.inviteInitial = value; }, initial); await page.goto('/demo/invite-fixture.html'); await expect(page.locator('#invite-form')).toBeVisible(); await barrier(page); }
async function configure(page: Page, patch: Partial<InviteFixtureSettings>) { await page.evaluate(value => window.inviteQA.configure(value), patch); await barrier(page); }
// Read only after the control's own Window task queue and its microtask checkpoint.
// Assertions below are snapshots; no polling until a desired callback appears.
async function barrier(page: Page) { await page.locator('#invite-form').evaluate(node => new Promise<void>(resolve => node.ownerDocument.defaultView!.setTimeout(() => node.ownerDocument.defaultView!.setTimeout(resolve, 0), 0))); }
async function logs(page: Page, kind?: string) { await barrier(page); return page.evaluate(value => window.inviteQA.events.filter(row => !value || row.kind === value), kind); }
async function clear(page: Page) { await barrier(page); await page.evaluate(() => window.inviteQA.clear()); }
async function flags(page: Page, patch: Record<string, unknown>) { await page.evaluate(value => window.inviteQA.configure({ capabilities: { ...window.inviteQA.settings.capabilities, ...value } }), patch); await barrier(page); }
async function bindings(page: Page, patch: Record<string, unknown>) { await page.evaluate(value => window.inviteQA.configure({ bindings: { ...window.inviteQA.settings.bindings, ...value } }), patch); await barrier(page); }
async function action(page: Page, control: Locator, expected: string) { await clear(page); await control.click(); const rows = await logs(page, 'action'); expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ target: expected, origin: 'control', current: 'BUTTON', laterCurrent: 'BUTTON', trusted: true, connected: true, methods: [false, false] }); return rows[0]!; }
async function dimensions(node: Locator) { return node.evaluate(element => { const b = element.getBoundingClientRect(); return [b.width, b.height]; }); }

test('all six original scopes and three identities coexist with composite prototype-safe IDs', async ({ page }) => {
  await open(page); const root = page.locator('#invite');
  expect(await root.locator('.mc-invite-category').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-invite-collection')))).toEqual(collections);
  expect(await root.locator('.mc-invite-person').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-identity')))).toEqual(['platform', 'linked-account', 'xbox-live', 'platform', 'linked-account', 'xbox-live']);
  const inputs = root.locator('.mc-invite-person__selection'); expect(await inputs.count()).toBe(6);
  await inputs.nth(0).click(); await barrier(page); await inputs.nth(3).click();
  const rows = await logs(page, 'selection'); expect(rows).toHaveLength(2); expect(rows.map(row => [row.collection, row.itemId, row.collectionIndex, row.selected])).toEqual([[collections[0], '__proto__', 0, true], [collections[3], '__proto__', 0, true]]);
  expect(await page.evaluate(() => window.inviteQA.settings.value.selected)).toEqual([{ collection: collections[0], itemId: '__proto__' }, { collection: collections[3], itemId: '__proto__' }]);
});
test('real checkbox carries source toggle/binding provenance and stable delayed event currentTarget', async ({ page }) => {
  await open(page, { scene: 'row' }); await page.locator('#invite-selection').click();
  const rows = await logs(page, 'row-selection'); expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ collection: 'online_xbox_live_friends', itemId: '__proto__', collectionIndex: 0, selected: true, toggleName: 'toggle_xbox_live_invite_online', sourceBinding: '#toggle_invite_state', authoredPressedButtonName: 'button.menu_friend_select', origin: 'native-input', current: 'INPUT', currentId: 'invite-selection', laterCurrent: 'INPUT', laterCurrentId: 'invite-selection', trusted: true, connected: true, methods: [false, false] });
  const doc = (await logs(page, 'document-click'))[0]!; expect(doc).toMatchObject({ trusted: true, cancelable: true, before: false, after: false, requestsBefore: 0 }); expect(rows[0]!.eventId).toBe(doc.eventId);
  expect(await page.locator('#invite-selection').isChecked()).toBe(true);
});
test('controlled refusal restores native checkbox and emits only the requested snapshot', async ({ page }) => {
  await open(page, { scene: 'row', accept: false }); await page.locator('#invite-selection').click();
  expect(await logs(page, 'row-selection')).toHaveLength(1); expect(await page.locator('#invite-selection').isChecked()).toBe(false);
  expect(await page.evaluate(() => window.inviteQA.settings.rowSelected)).toBe(false);
});
test('uncontrolled selection commits both directions and form reset restores default without semantic requests', async ({ page }) => {
  await open(page, { scene: 'row', controlled: false }); const input = page.locator('#invite-selection');
  await input.click(); await barrier(page); expect(await input.isChecked()).toBe(true); await input.click(); await barrier(page); expect(await input.isChecked()).toBe(false);
  expect((await logs(page, 'row-selection')).map(row => row.selected)).toEqual([true, false]);
  await input.click(); await barrier(page); await clear(page); await page.evaluate(() => window.inviteQA.reset()); await barrier(page);
  expect(await input.isChecked()).toBe(false); expect(await logs(page, 'row-selection')).toEqual([]);
});
test('controlled value survives native form reset and canceled reset preserves uncontrolled state', async ({ page }) => {
  await open(page, { scene: 'row', rowSelected: true }); await clear(page); await page.evaluate(() => window.inviteQA.reset()); await barrier(page); expect(await page.locator('#invite-selection').isChecked()).toBe(true); expect(await logs(page, 'row-selection')).toEqual([]);
  await configure(page, { controlled: false, revision: 1 }); await page.locator('#invite-selection').click(); await barrier(page);
  await page.locator('#invite-form').evaluate(node => node.addEventListener('reset', event => event.preventDefault(), { once: true })); await clear(page); await page.evaluate(() => window.inviteQA.reset()); await barrier(page);
  expect(await page.locator('#invite-selection').isChecked()).toBe(true); expect(await logs(page, 'row-selection')).toEqual([]);
});
test('trusted DOCUMENT click veto cancels checkbox semantic request and restores visual state after owner tasks', async ({ page }) => {
  await open(page, { scene: 'row' }); await page.locator('#invite-selection').click(); expect(await logs(page, 'row-selection')).toHaveLength(1);
  await configure(page, { rowSelected: false, veto: 'document' }); await clear(page); await page.locator('#invite-selection').click();
  expect(await logs(page, 'row-selection')).toEqual([]); expect(await page.locator('#invite-selection').isChecked()).toBe(false);
  const doc = (await logs(page, 'document-click'))[0]!; expect(doc).toMatchObject({ trusted: true, cancelable: true, before: false, after: true, requestsBefore: 0 });
  expect(await logs(page, 'document-task')).toEqual([{ kind: 'document-task', eventId: doc.eventId, prevented: true, requests: 0 }]);
});
for (const veto of ['leaf', 'parent'] as const) test(`${veto} veto runs before semantic checkbox commit`, async ({ page }) => { await open(page, { scene: 'row', veto }); await page.locator('#invite-selection').click(); expect(await logs(page, 'row-selection')).toEqual([]); expect(await page.locator('#invite-selection').isChecked()).toBe(false); });
test('Space activates native checkbox once and DOCUMENT click veto also cancels keyboard default activation', async ({ page }) => {
  await open(page, { scene: 'row' }); const input = page.locator('#invite-selection'); await input.focus(); await page.keyboard.press('Space'); expect(await logs(page, 'row-selection')).toHaveLength(1); expect(await input.isChecked()).toBe(true);
  await configure(page, { rowSelected: false, veto: 'document' }); await clear(page); await input.focus(); await page.keyboard.press('Space'); expect(await logs(page, 'row-selection')).toEqual([]); expect(await input.isChecked()).toBe(false); expect((await logs(page, 'document-click'))[0]).toMatchObject({ trusted: true, cancelable: true, after: true });
});
test('readOnly checkbox preserves state while disabled checkbox is a native disabled control', async ({ page }) => {
  await open(page, { scene: 'row', readOnly: true }); const input = page.locator('#invite-selection'); expect(await input.isDisabled()).toBe(false); expect(await input.getAttribute('aria-readonly')).toBe('true'); await input.click(); expect(await logs(page, 'row-selection')).toEqual([]); expect(await input.isChecked()).toBe(false);
  await configure(page, { readOnly: false, disabled: true }); expect(await input.isDisabled()).toBe(true); await clear(page); await input.focus(); await page.keyboard.press('Space'); expect(await logs(page, 'row-selection')).toEqual([]);
});
test('cross-platform lock is independent of platform collections and individual person enabled flag', async ({ page }) => {
  await open(page, { scene: 'row' }); await bindings(page, { crossPlatformEnabled: false }); expect(await page.locator('#invite-selection').isDisabled()).toBe(true);
  await configure(page, { collection: 'online_platform_friends' }); expect(await page.locator('#invite-selection').isDisabled()).toBe(false);
  await configure(page, { rowEnabled: false }); expect(await page.locator('#invite-selection').isDisabled()).toBe(true);
});
test('separate Xbox profile button requests profile without changing selection', async ({ page }) => {
  await open(page, { scene: 'row' }); expect(await page.locator('#invite-profile').evaluate(node => !!node.closest('label'))).toBe(false);
  const row = await action(page, page.locator('#invite-profile'), 'button.view_profile'); expect(row).toMatchObject({ collection: 'online_xbox_live_friends', itemId: '__proto__', collectionIndex: 0 }); expect(await logs(page, 'row-selection')).toEqual([]); expect(await page.locator('#invite-selection').isChecked()).toBe(false);
  await flags(page, { xboxOne: false }); expect(await page.locator('#invite-profile').count()).toBe(0);
});
test('trusted DOCUMENT profile and footer veto retain positive exact-once controls', async ({ page }) => {
  await open(page, { scene: 'row' }); await action(page, page.locator('#invite-profile'), 'button.view_profile'); await configure(page, { veto: 'document' }); await clear(page); await page.locator('#invite-profile').click(); expect(await logs(page, 'action')).toEqual([]); expect((await logs(page, 'document-click'))[0]).toMatchObject({ trusted: true, after: true, requestsBefore: 0 });
  await configure(page, { scene: 'footer', veto: 'none' }); await action(page, page.locator('#invite-send'), 'button.send_invites'); await configure(page, { veto: 'document' }); await clear(page); await page.locator('#invite-send').click(); expect(await logs(page, 'action')).toEqual([]); expect((await logs(page, 'document-task'))[0]).toMatchObject({ prevented: true, requests: 0 });
});
test('pagination inclusion visibility counter and independent enable bindings do not derive from records', async ({ page }) => {
  await open(page, { scene: 'pagination' }); expect(await page.locator('#invite-previous').getAttribute('data-invite-button-kind')).toBe('glyph'); expect(await page.locator('#invite-next').getAttribute('data-invite-button-kind')).toBe('content');
  expect(await page.locator('.mc-invite-pagination__counter').textContent()).toBe('Page host label');
  await page.evaluate(() => { const q = window.inviteQA, c = q.settings.collection; q.configure({ categories: { ...q.settings.categories, [c]: { ...q.settings.categories[c], people: [], pagination: { visible: true, previousEnabled: false, nextEnabled: true, counterLabel: '999 of host' } } } }); }); await barrier(page);
  expect(await page.locator('#invite-previous').isDisabled()).toBe(true); expect(await page.locator('#invite-next').isDisabled()).toBe(false); expect(await page.locator('.mc-invite-pagination__counter').textContent()).toBe('999 of host');
  await configure(page, { included: false }); expect(await page.locator('#invite-pagination').count()).toBe(0); expect(await page.evaluate(() => window.inviteQA.refs.pagination.current)).toBeNull();
});
test('trusted DOCUMENT page veto leaves counter and records unchanged after exact-once normal request', async ({ page }) => {
  await open(page, { scene: 'pagination' }); const row = await action(page, page.locator('#invite-next'), 'button.next_friends_page'); expect(row.collection).toBe('online_xbox_live_friends');
  expect(await page.locator('.mc-invite-pagination__counter').textContent()).toBe('Page host label'); await configure(page, { veto: 'document' }); await clear(page); await page.locator('#invite-next').click(); expect(await logs(page, 'action')).toEqual([]); expect((await logs(page, 'document-click'))[0]).toMatchObject({ trusted: true, cancelable: true, after: true });
});
test('all realm manage support and layout combinations preserve independent footer capability formulas', async ({ page }) => {
  await open(page, { scene: 'footer' });
  for (const realm of [false, true]) for (const manage of [false, true]) for (const support of [false, true]) for (const variant of ['horizontal', 'vertical'] as const) {
    await flags(page, { isInvitingToRealm: realm, canManageMembers: manage, supportsAddFriend: support }); await configure(page, { footerVariant: variant });
    expect(await page.locator('[data-invite-footer-control=addFriend]').count()).toBe(Number(!realm && support)); expect(await page.locator('[data-invite-footer-control=addMember]').count()).toBe(Number(manage));
    const adds = Number(!realm && support) + Number(manage), addWidth = variant === 'vertical' || realm && !manage ? 240 : 119, spacer = !realm || manage ? 2 : 0;
    expect(await dimensions(page.locator('#invite-send'))).toEqual([variant === 'vertical' ? 240 : 240 - adds * addWidth - spacer, 30]);
    expect(await dimensions(page.locator('#invite-footer'))).toEqual([240, variant === 'horizontal' ? 30 : 62]);
  }
});
test('send remains enabled with no selection and add-friend enable is an independent binding', async ({ page }) => {
  await open(page, { scene: 'footer' }); await bindings(page, { findCrossPlatformFriendsEnabled: false }); expect(await page.locator('#invite-add-friend').isDisabled()).toBe(true); expect(await page.locator('#invite-send').isDisabled()).toBe(false); await action(page, page.locator('#invite-send'), 'button.send_invites');
});
test('category resolved three-column dimensions preserve30 and56 source row heights without inferring capacity', async ({ page }) => {
  await open(page, { scene: 'category', collection: 'online_platform_friends' });
  await page.evaluate(() => { const q = window.inviteQA, c = q.settings.collection, person = q.settings.categories[c].people[0]!; q.configure({ width: 600, categories: { ...q.settings.categories, [c]: { ...q.settings.categories[c], people: [person, { ...person, id: 'constructor' }, { ...person, id: 'third' }, { ...person, id: 'fourth' }], grid: { columns: 3, rows: 3 } } } }); }); await barrier(page);
  expect(await dimensions(page.locator('.mc-invite-category__grid'))).toEqual([600, 90]); expect(await dimensions(page.locator('.mc-invite-person').first())).toEqual([193, 30]);
  const positions = await page.locator('.mc-invite-category__cell').evaluateAll(nodes => nodes.map(node => [(node as HTMLElement).style.left, (node as HTMLElement).style.top])); expect(positions).toEqual([['3px', '0px'], ['203px', '0px'], ['403px', '0px'], ['3px', '30px']]);
  await configure(page, { collection: 'online_linked_account_friends' }); expect(await dimensions(page.locator('.mc-invite-person'))).toEqual([593, 56]); expect(await dimensions(page.locator('.mc-invite-category__grid'))).toEqual([600, 56]);
});
test('off-page controlled selections remain scoped and rejected requests never discard host state', async ({ page }) => {
  await open(page, { scene: 'screen', accept: false, value: { selected: [{ collection: 'offline_xbox_live_friends', itemId: 'off-page' }], inviteToParty: true } });
  await page.locator('#invite .mc-invite-person__selection').first().click(); const row = (await logs(page, 'selection'))[0]!; expect(row.next).toEqual({ selected: [{ collection: 'offline_xbox_live_friends', itemId: 'off-page' }, { collection: 'online_platform_friends', itemId: '__proto__' }], inviteToParty: true });
  expect(await page.evaluate(() => window.inviteQA.settings.value)).toEqual({ selected: [{ collection: 'offline_xbox_live_friends', itemId: 'off-page' }], inviteToParty: true }); expect(await page.locator('#invite .mc-invite-person__selection').first().isChecked()).toBe(false);
});
for (const veto of ['late-disabled', 'late-readonly', 'late-hidden', 'late-root', 'late-identity', 'late-scope', 'late-move'] as const) test(`${veto} rejects stale standalone selection after propagation`, async ({ page }) => { await open(page, { scene: 'row', veto }); await page.locator('#invite-selection').click(); expect(await logs(page, 'row-selection')).toEqual([]); await page.evaluate(() => window.inviteQA.restoreMoved()); });
test('late category removal rejects root selection and late root close rejects footer action', async ({ page }) => {
  await open(page, { veto: 'late-category', collection: 'online_xbox_live_friends' }); await page.locator('#invite [data-invite-collection=online_xbox_live_friends] .mc-invite-person__selection').click(); expect(await logs(page, 'selection')).toEqual([]);
  await configure(page, { veto: 'late-close' }); await clear(page); await page.locator('#invite [data-invite-footer-control=send]').click(); expect(await logs(page, 'action')).toEqual([]);
});
test('party uses its own source bindings and64x32 hit area with30x16 original image', async ({ page }) => {
  await open(page); expect(await dimensions(page.locator('#invite-party'))).toEqual([64, 32]); expect(await dimensions(page.locator('#invite .mc-invite-party__image:visible'))).toEqual([30, 16]);
  await page.locator('#invite-party').click(); const rows = await logs(page, 'party'); expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ value: true, toggleName: 'invite_to_party', stateBinding: '#invite_to_party', optionBinding: '#invite_to_party_binding', origin: 'native-input', current: 'INPUT', laterCurrent: 'INPUT', trusted: true });
});
test('trusted DOCUMENT party veto restores both native and controlled state and party availability is independent', async ({ page }) => {
  await open(page); await page.locator('#invite-party').click(); expect(await logs(page, 'party')).toHaveLength(1); await configure(page, { value: { selected: [], inviteToParty: false }, veto: 'document' }); await clear(page); await page.locator('#invite-party').click(); expect(await logs(page, 'party')).toEqual([]); expect(await page.locator('#invite-party').isChecked()).toBe(false); expect((await logs(page, 'document-click'))[0]).toMatchObject({ trusted: true, after: true });
  await bindings(page, { canInviteToParty: false }); expect(await page.locator('#invite-party').isDisabled()).toBe(true); await bindings(page, { isPartySystemAvailable: false }); expect(await page.locator('#invite .mc-invite-party:visible').count()).toBe(0);
});
test('loading preserves selection and independent empty error and cross-header flags', async ({ page }) => {
  await open(page); await page.locator('#invite .mc-invite-person__selection').first().click(); await barrier(page); await bindings(page, { isLoading: true, noPlatformFriendsVisible: true, noXboxLiveFriendsVisible: true }); expect(await page.locator('#invite [role=status]').count()).toBe(1); expect(await page.locator('#invite .mc-invite-person:visible').count()).toBe(0);
  await bindings(page, { isLoading: false }); expect(await page.locator('#invite .mc-invite-person__selection').first().isChecked()).toBe(true); expect(await page.locator('#invite').getByText('Independent platform empty', { exact: true }).isVisible()).toBe(true); expect(await page.locator('#invite').getByText('Independent Xbox empty', { exact: true }).isVisible()).toBe(true);
  await flags(page, { hideErrorMessage: false }); expect(await page.locator('#invite').getByText('Independent source error', { exact: true }).isVisible()).toBe(true);
  await bindings(page,{crossPlatformEnabled:false});
  // Fixed original Invite disable_text inherits global
  // $dark_button_default_text_color=[1,1,1], independently pinned in fidelity CPU.
  expect(await page.locator('#invite .mc-invite-screen__cross-disabled').getByText('Independent cross disabled',{exact:true}).evaluate(node=>getComputedStyle(node).color)).toBe('rgb(255, 255, 255)');
  await page.evaluate(() => { const q = window.inviteQA; q.configure({ bindings: { ...q.settings.bindings, categoryVisible: { ...q.settings.bindings.categoryVisible, online_xbox_live_friends: false, online_linked_account_friends: true } } }); }); await barrier(page); expect(await page.locator('#invite').getByText('Cross online heading', { exact: true }).isVisible()).toBe(false); expect(await page.locator('#invite [data-invite-collection=online_linked_account_friends].mc-invite-category').isVisible()).toBe(true);
});
test('real refs attach native controls and cleanup on scene removal without leaking source props into DOM', async ({ page }) => {
  await open(page, { scene: 'row' }); expect(await page.evaluate(() => { const r = window.inviteQA.refs; return [r.row.current?.tagName, r.selection.current?.tagName, r.selection.current?.type, r.profile.current?.tagName, r.selection.current === document.getElementById('invite-selection')]; })).toEqual(['SECTION', 'INPUT', 'checkbox', 'BUTTON', true]);
  const attributes = await page.locator('#invite-row').evaluate(node => node.getAttributeNames()); expect(attributes.filter(name => ['scope', 'person', 'capabilities', 'crossplatformenabled', 'selected', 'readonly', 'onaction'].includes(name))).toEqual([]);
  await configure(page, { scene: 'pagination' }); expect(await page.evaluate(() => [window.inviteQA.refs.row.current, window.inviteQA.refs.selection.current, window.inviteQA.refs.profile.current])).toEqual([null, null, null]); expect(await page.evaluate(() => window.inviteQA.refs.pagination.current?.tagName)).toBe('DIV');
});
test('host profile platform and helper renderers receive explicit finite context without native asset substitution', async ({ page }) => {
  await open(page, { scene: 'row', collection: 'online_linked_account_friends' }); expect(await page.locator('[data-host-portrait]').count()).toBe(2); expect(await page.locator('[data-host-platform]').getAttribute('data-host-size')).toBe('13,13'); expect(await page.locator('[data-host-portrait]').first().getAttribute('data-host-scope')).toBe('online_linked_account_friends');
  await configure(page, { scene: 'footer' }); await bindings(page, { gamepadHelperVisible: true }); expect(await page.locator('[data-host-helper=y]').getAttribute('data-host-binding')).toBe('#controller_face_up_icon'); expect(await page.locator('[data-host-helper=x]').getAttribute('data-host-binding')).toBe('#controller_face_left_icon');
});
test('close click and Escape are host requests with no automatic close and native DOCUMENT can cancel each', async ({ page }) => {
  await open(page); await action(page, page.locator('#invite-close'), 'button.menu_exit'); expect(await page.locator('#invite').isVisible()).toBe(true); await clear(page); await page.locator('#invite-close').focus(); await page.keyboard.press('Escape'); const normal = await logs(page, 'action'); expect(normal).toHaveLength(1); expect(normal[0]).toMatchObject({ target: 'button.menu_exit', origin: 'escape', trusted: true });
  await configure(page, { veto: 'document' }); await clear(page); await page.locator('#invite-close').click(); expect(await logs(page, 'action')).toEqual([]); await clear(page); await page.locator('#invite-close').focus(); await page.keyboard.press('Escape'); expect(await logs(page, 'action')).toEqual([]); expect((await logs(page, 'document-keydown'))[0]).toMatchObject({ trusted: true, cancelable: true, before: false, after: true });
});
test('explicit host controller validates mapping and scoped identity without polling or social IO', async ({ page }) => {
  await open(page); await clear(page); const returns = await page.evaluate(() => { const h = window.inviteQA.refs.controller.current!; return [h.request({ fromButtonId: 'button.menu_select', destination: 'friend-toggle', collection: 'online_platform_friends', itemId: '__proto__' }), h.request({ fromButtonId: 'button.menu_cancel', destination: 'button.send_invites' }), h.request({ fromButtonId: 'button.menu_select', destination: 'friend-toggle', collection: 'online_platform_friends', itemId: 'absent' })]; }); expect(returns).toEqual([true, false, false]); const rows = await logs(page, 'selection'); expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ origin: 'host-controller', collection: 'online_platform_friends', itemId: '__proto__', selected: true, eventId: null });
});
test('nested modal confines Tab to top root and restores outer focus and external inert state', async ({ page }) => {
  await open(page, { modal: true }); await page.locator('#invite-close').focus(); await configure(page, { nested: true }); const nested = page.locator('#invite-nested'); expect(await nested.isVisible()).toBe(true); await nested.locator('button').first().focus(); for (const key of ['Tab', 'Shift+Tab']) { await page.keyboard.press(key); expect(await nested.evaluate(node => node.contains(document.activeElement))).toBe(true); }
  await configure(page, { nested: false }); expect(await page.locator('#invite').evaluate(node => node.contains(document.activeElement))).toBe(true); await configure(page, { open: false }); expect(await page.locator('#invite-outside').evaluate(node => node.closest('[inert]') !== null)).toBe(false);
});
test('all six category visibility flags and both empty notices are independent of people and headers', async ({ page }) => {
  await open(page); for(const collection of collections){await page.evaluate(value=>{const q=window.inviteQA;q.configure({bindings:{...q.settings.bindings,categoryVisible:{...q.settings.bindings.categoryVisible,[value]:false}}});},collection);await barrier(page);expect(await page.locator(`#invite section.mc-invite-category[data-invite-collection=${collection}]`).isVisible()).toBe(false);}
  await bindings(page,{noPlatformFriendsVisible:true,noXboxLiveFriendsVisible:true}); expect(await page.locator('#invite [data-invite-empty=platform]').isVisible()).toBe(true);expect(await page.locator('#invite [data-invite-empty=xbox-live]').isVisible()).toBe(true);
  expect(await page.locator('#invite [data-invite-header]:visible').count()).toBe(0);
  await page.evaluate(()=>{const q=window.inviteQA;q.configure({bindings:{...q.settings.bindings,categoryVisible:{...q.settings.bindings.categoryVisible,online_linked_account_friends:true,offline_linked_account_friends:true}}});});await barrier(page);expect(await page.locator('#invite [data-invite-header]:visible').count()).toBe(0);
});
test('root vertical selection follows explicit context formula rather than viewport width', async ({page})=>{
  await open(page);for(const requested of[false,true])for(const realm of[false,true])for(const manage of[false,true]){await flags(page,{useVerticalButtonStackPanel:requested,isInvitingToRealm:realm,canManageMembers:manage});expect(await page.locator('#invite').getAttribute('data-invite-variant')).toBe(requested&&(!realm||manage)?'vertical':'horizontal');}
});
test('uncontrolled root retains offpage defaults and reset restores composite selection and party atomically',async({page})=>{
  const defaults={selected:[{collection:'offline_xbox_live_friends' as const,itemId:'offpage-default'}],inviteToParty:true};await open(page,{controlled:false,defaultValue:defaults});await page.locator('#invite .mc-invite-person__selection').first().click();const row=(await logs(page,'selection'))[0]!;expect(row.next).toEqual({selected:[...defaults.selected,{collection:'online_platform_friends',itemId:'__proto__'}],inviteToParty:true});
  await page.locator('#invite-party').click();expect((await logs(page,'party'))[0]!.next).toEqual({selected:[...defaults.selected,{collection:'online_platform_friends',itemId:'__proto__'}],inviteToParty:false});await clear(page);await page.evaluate(()=>window.inviteQA.reset());await barrier(page);expect(await page.locator('#invite .mc-invite-person__selection').first().isChecked()).toBe(false);expect(await page.locator('#invite-party').isChecked()).toBe(true);expect(await logs(page,'selection')).toEqual([]);expect(await logs(page,'party')).toEqual([]);
});
test('readOnly blocks profile page footer and party requests while close remains available',async({page})=>{
  await open(page,{scene:'row',readOnly:true});
  const exercise=async(control:Locator,id:string)=>{
    // aria-disabled is an application guard. It does not make the native
    // button disabled; Playwright's normal click would wait for aria enablement.
    expect(await control.evaluate(node=>(node as HTMLButtonElement).disabled)).toBe(false);expect(await control.getAttribute('aria-disabled')).toBe('true');
    for(const input of['pointer','Space']){await clear(page);if(input==='pointer')await control.click({force:true});else{await control.focus();await page.keyboard.press('Space');}expect(await logs(page,'action')).toEqual([]);const doc=await logs(page,'document-click');expect(doc).toHaveLength(1);expect(doc[0]).toMatchObject({control:id,trusted:true,cancelable:true,requestsBefore:0});expect((await logs(page,'document-task'))[0]).toMatchObject({requests:0});}
  };
  await exercise(page.locator('#invite-profile'),'invite-profile');await configure(page,{scene:'pagination'});await exercise(page.locator('#invite-next'),'invite-next');await configure(page,{scene:'footer'});await exercise(page.locator('#invite-send'),'invite-send');
  await configure(page,{scene:'screen'});await clear(page);expect(await page.locator('#invite-party').evaluate(node=>(node as HTMLInputElement).disabled)).toBe(false);await page.locator('#invite-party').click();expect(await logs(page,'party')).toEqual([]);expect((await logs(page,'document-click'))[0]).toMatchObject({trusted:true,requestsBefore:0});await action(page,page.locator('#invite-close'),'button.menu_exit');
});
test('late footer identity ownership and enable changes reject queued requests after native propagation',async({page})=>{
  await open(page,{scene:'footer'});for(const veto of['late-disabled','late-readonly','late-hidden','late-root','late-move']){await configure(page,{disabled:false,readOnly:false,hidden:false,veto});await clear(page);await page.locator('#invite-send').click();expect(await logs(page,'action')).toEqual([]);await page.evaluate(()=>window.inviteQA.restoreMoved());}
});
test('dormant profiles are opt-in and unknown source slots carry explicit host provenance',async({page})=>{
  await open(page);expect(await page.locator('[data-invite-source-helper]').count()).toBe(0);await configure(page,{scene:'helpers'});expect(await page.locator('[data-invite-source-helper]').count()).toBe(10);expect(await page.locator('[data-host-unknown="invite.friend_button_layout"]').count()).toBe(1);expect(await page.locator('[data-host-unknown="invite.label"]').count()).toBe(1);expect(await page.locator('[data-host-inherited]').getAttribute('data-host-checkbox')).toBe('100%,100%');expect(await page.locator('[data-host-hover]').first().getAttribute('data-host-layer')).toBe('30');expect(await page.locator('[data-invite-source-helper=loading_friends]').isVisible()).toBe(false);await bindings(page,{isLoading:true});expect(await page.locator('[data-invite-source-helper=loading_friends]').isVisible()).toBe(true);
});
test('hidden platform art capability removes host icon and source focus overrides remain metadata',async({page})=>{
  await open(page,{scene:'row',collection:'online_platform_friends'});await flags(page,{platformIcons:{visible:false}});expect(await page.locator('.mc-invite-person__platform').count()).toBe(0);expect(await page.locator('#invite-selection').getAttribute('data-focus-up')).toBe('host-up');expect(await page.locator('#invite-selection').getAttribute('data-focus-down')).toBe('host-down');
  await page.locator('#invite-sink').focus();await page.keyboard.press('Tab');await page.keyboard.press('Tab');expect(await page.locator('#invite-selection').evaluate(node=>document.activeElement===node)).toBe(true);
});
test('viewport callback ref cleanup follows real attachment replacement object-ref restoration and root unmount',async({page})=>{
  await open(page);
  const snapshot=()=>page.evaluate(()=>{const q=window.inviteQA,first=q.viewportRefObservations[0]?.node;return{rows:q.viewportRefObservations.map(row=>({phase:row.phase,revision:row.revision,tag:row.node?.tagName,sameNode:row.node===first})),currentMatchesDOM:q.refs.viewport.current===document.querySelector('#invite .mc-scroll-area__viewport'),currentNull:q.refs.viewport.current===null,observedNodesConnected:q.viewportRefObservations.every(row=>row.node?.isConnected),semanticEvents:q.events.length};});
  expect(await snapshot()).toMatchObject({rows:[],currentMatchesDOM:true,currentNull:false,semanticEvents:0});
  await configure(page,{observeViewportRef:true,viewportRefRevision:0});
  const attach0={phase:'attach',revision:0,tag:'DIV',sameNode:true},cleanup0={...attach0,phase:'cleanup'};
  expect(await snapshot()).toEqual({rows:[attach0],currentMatchesDOM:true,currentNull:false,observedNodesConnected:true,semanticEvents:0});
  // A normal rerender retains the same callback and real viewport node.
  await configure(page,{readOnly:true});
  expect((await snapshot()).rows).toEqual([attach0]);
  await configure(page,{viewportRefRevision:1});
  const attach1={...attach0,revision:1},cleanup1={...cleanup0,revision:1};
  expect(await snapshot()).toEqual({rows:[attach0,cleanup0,attach1],currentMatchesDOM:true,currentNull:false,observedNodesConnected:true,semanticEvents:0});
  // Restore the public object ref through React's actual ref replacement.
  await configure(page,{observeViewportRef:false});
  expect(await snapshot()).toEqual({rows:[attach0,cleanup0,attach1,cleanup1],currentMatchesDOM:true,currentNull:false,observedNodesConnected:true,semanticEvents:0});
  await configure(page,{observeViewportRef:true,viewportRefRevision:2});
  const attach2={...attach0,revision:2},cleanup2={...cleanup0,revision:2};
  expect((await snapshot()).rows).toEqual([attach0,cleanup0,attach1,cleanup1,attach2]);
  await page.evaluate(async()=>{const q=window.inviteQA,ownerWindow=q.refs.viewport.current!.ownerDocument.defaultView!;q.unmount();await new Promise<void>(resolve=>ownerWindow.setTimeout(()=>ownerWindow.setTimeout(resolve,0),0));});
  expect(await snapshot()).toEqual({rows:[attach0,cleanup0,attach1,cleanup1,attach2,cleanup2],currentMatchesDOM:true,currentNull:true,observedNodesConnected:false,semanticEvents:0});
  expect(await page.locator('#invite').count()).toBe(0);
});
test('footer renders visible source action labels and dynamic send text independently of aria labels',async({page})=>{
  await open(page,{scene:'footer'});
  const visibleText=async(selector:string,label:string)=>{const button=page.locator(selector),content=button.locator('.mc-invite-light__content');expect(await content.isVisible()).toBe(true);expect((await dimensions(content))[0]).toBeGreaterThan(0);expect(await content.innerText()).toBe(label);expect(await button.innerText()).toBe(label);};
  await visibleText('#invite-add-friend','Add friend fixture');await visibleText('#invite-send','Send fixture');
  await flags(page,{isInvitingToRealm:true,canManageMembers:true});await bindings(page,{sendButtonText:'Updated send label'});await visibleText('#invite-add-member','Add member fixture');await visibleText('#invite-send','Updated send label');
  await configure(page,{footerVariant:'vertical'});await visibleText('#invite-add-member','Add member fixture');await visibleText('#invite-send','Updated send label');
  await configure(page,{scene:'screen'});await visibleText('#invite [data-invite-footer-control=addMember]','Add member fixture');await visibleText('#invite [data-invite-footer-control=send]','Updated send label');
  await bindings(page,{gamepadHelperVisible:true});
  const helperLabel=async(selector:string,label:string,glyph:'X'|'Y')=>{const button=page.locator(selector),ownLabel=button.locator('.mc-invite-footer__helper-label');expect(await ownLabel.count()).toBe(1);expect(await ownLabel.isVisible()).toBe(true);expect(await ownLabel.innerText()).toBe(label);expect((await dimensions(ownLabel))[0]).toBeGreaterThan(0);expect(await button.locator('[data-host-helper]').innerText()).toBe(glyph);expect((await button.innerText()).split(label)).toHaveLength(2);};
  await helperLabel('#invite [data-invite-footer-control=addMember]','Add member fixture','Y');await helperLabel('#invite [data-invite-footer-control=send]','Updated send label','X');
  const primaryHelper=page.locator('#invite .mc-invite-screen__helper'),primaryLabel=primaryHelper.locator('[data-source-binding="#button_a_description"]');expect(await primaryLabel.isVisible()).toBe(true);expect(await primaryLabel.innerText()).toBe('Select source description');expect(await primaryHelper.locator('[data-host-helper]').innerText()).toBe('A');expect((await primaryHelper.innerText()).split('Select source description')).toHaveLength(2);expect(await primaryLabel.evaluate(node=>getComputedStyle(node).textShadow)).not.toBe('none');
  await configure(page,{scene:'footer',footerVariant:'horizontal'});await flags(page,{isInvitingToRealm:false,canManageMembers:false});await helperLabel('#invite-add-friend','Add friend fixture','Y');await helperLabel('#invite-send','Updated send label','X');
  await configure(page,{footerVariant:'vertical'});await helperLabel('#invite-add-friend','Add friend fixture','Y');await helperLabel('#invite-send','Updated send label','X');
});
test('standalone Category form reset restores uncontrolled scoped defaults and respects canceled reset and controlled authority',async({page})=>{
  const collection='online_xbox_live_friends' as const,offpage={collection,itemId:'offpage-category-default'};
  await open(page,{scene:'category',controlled:false,defaultValue:{selected:[offpage],inviteToParty:false}});const input=page.locator('#invite-category .mc-invite-person__selection');
  await input.click();expect((await logs(page,'category-selection')).map(row=>row.selected)).toEqual([true]);expect(await input.isChecked()).toBe(true);
  await clear(page);await page.evaluate(()=>window.inviteQA.reset());await barrier(page);expect(await input.isChecked()).toBe(false);expect(await logs(page,'category-selection')).toEqual([]);
  await input.click();await barrier(page);expect(await input.isChecked()).toBe(true);await page.locator('#invite-form').evaluate(node=>node.addEventListener('reset',event=>event.preventDefault(),{once:true}));await clear(page);await page.evaluate(()=>window.inviteQA.reset());await barrier(page);expect(await input.isChecked()).toBe(true);expect(await logs(page,'category-selection')).toEqual([]);
  await page.evaluate(()=>window.inviteQA.reset());await barrier(page);expect(await input.isChecked()).toBe(false);
  await page.evaluate(()=>{const q=window.inviteQA,c=q.settings.collection,category=q.settings.categories[c],person=category.people[0]!;q.configure({categories:{...q.settings.categories,[c]:{...category,people:[{...person,id:'offpage-category-default'}]}}});});await barrier(page);expect(await input.isChecked()).toBe(true);
  await configure(page,{controlled:true,accept:false,value:{selected:[offpage],inviteToParty:false}});await clear(page);await input.click();expect((await logs(page,'category-selection')).map(row=>row.selected)).toEqual([false]);expect(await input.isChecked()).toBe(true);await clear(page);await page.evaluate(()=>window.inviteQA.reset());await barrier(page);expect(await input.isChecked()).toBe(true);expect(await logs(page,'category-selection')).toEqual([]);
});
