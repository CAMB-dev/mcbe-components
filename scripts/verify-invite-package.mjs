import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Additional checks use the actual installed tar, its peers and declarations. */
export async function verifyInvitePackage({ consumer, root, major }) {
  const require = createRequire(join(consumer, 'package.json'));
  const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
  assert(React.version.startsWith(`${major}.`));
  const packageRoot = join(consumer, 'node_modules', 'mcbeui');
  const calls = [], saved = new Map();
  for (const name of ['fetch', 'Image', 'createImageBitmap', 'OffscreenCanvas', 'requestAnimationFrame', 'setTimeout']) {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, value: () => { calls.push(name); throw new Error(`Invite import/SSR invoked ${name}`); } });
  }
  const profile = { kind: 'image', src: '/caller-whole-profile.png', sourceSize: [11, 12] };
  const collections = ['online_platform_friends', 'online_linked_account_friends', 'online_xbox_live_friends', 'offline_platform_friends', 'offline_linked_account_friends', 'offline_xbox_live_friends'];
  const categories = Object.fromEntries(collections.map(collection => {
    const common = { id: '__proto__', currentGameLabel: 'Caller game', onlineVisible: false };
    const person = collection.includes('linked_account') ? { ...common, identity: 'linked-account', gamertag: 'Caller Xbox', thirdPartyTag: 'Caller linked', gamerpic: profile, thirdPartyProfile: profile }
      : collection.includes('xbox_live') ? { ...common, identity: 'xbox-live', gamertag: 'Caller Xbox', gamerpic: profile }
        : { ...common, identity: 'platform', thirdPartyTag: 'Caller platform', thirdPartyProfile: profile };
    return [collection, { collection, people: [person], grid: { columns: 1, rows: 1 }, pagination: { visible: true, previousEnabled: false, nextEnabled: true, counterLabel: 'Caller counter' }, ttsSectionHeader: 'Caller section' }];
  }));
  const labels = { title: 'Caller Invite', realmTitle: 'Caller Realm', onlinePlatform: 'Online platform', offlinePlatform: 'Offline platform', onlineCrossPlatform: 'Online cross', offlineCrossPlatform: 'Offline cross', noPlatformFriends: 'Caller empty', crossPlatformDisabled: 'Caller restriction', partyTitle: 'Caller party', partyDescription: 'Caller description', addFriend: 'Caller Add', addMember: 'Caller Member', profile: 'Caller Profile', previousPage: 'Caller Previous', nextPage: 'Caller Next', close: 'Caller Close', loading: 'Caller loading', scrollArea: 'Caller collection' };
  const data = { presentation: { sourceProfile: 'desktop', availableSize: [384, 330], scale: 2, inputMode: 'mouse', touchThumbVisible: false },
    capabilities: { isInvitingToRealm: false, canManageMembers: false, supportsAddFriend: true, useVerticalButtonStackPanel: false, isPs4: false, xboxOne: true, platformInvitesVisible: true, usePagination: true, hideErrorMessage: false, platformIcons: { visible: false } },
    bindings: { isLoading: false, crossPlatformEnabled: true, categoryVisible: Object.fromEntries(collections.map(key => [key, true])), noPlatformFriendsVisible: false, noXboxLiveFriendsVisible: true, noXboxLiveFriendsText: 'Caller Xbox empty', findCrossPlatformFriendsEnabled: true, sendButtonText: 'Caller Send', gamepadHelperVisible: false, buttonADescription: 'Caller select', closeButtonVisible: true, isPartySystemAvailable: true, canInviteToParty: true },
    categories, errorMessageText: 'Caller error', value: { selected: [{ collection: 'online_platform_friends', itemId: 'off-page' }], inviteToParty: true } };
  let ui, cases = 0;
  const effects = { callbacks: 0, refs: 0 }, callback = () => effects.callbacks++, ref = () => effects.refs++;
  const props = { ...data, labels: { ...labels, friendSelection: person => person.id }, onAction: callback, onSelectionChange: callback, ref, controllerRef: ref, viewportRef: ref, partyRef: ref };
  const before = JSON.stringify(data), warnings = [], originalError = console.error;
  console.error = (...args) => warnings.push(args.map(String).join(' '));
  try {
    ui = await import(pathToFileURL(join(packageRoot, 'dist/index.js')).href);
    for (const name of ['InviteScreen', 'InvitePersonRow', 'InviteCategory', 'InvitePagination', 'InviteFooter']) assert(ui[name], name);
    for (const name of ['inviteAssets', 'ClassicSkin', 'InviteSourceHelper', 'InviteOwnerContext', 'resolveInviteLayout']) assert(!Object.hasOwn(ui, name), `Private Invite seam leaked: ${name}`);
    const render = (Component, p) => { cases++; return renderToStaticMarkup(React.createElement(Component, p)); };
    const markup = render(ui.InviteScreen, props);
    assert(markup.includes('Caller Invite')); assert(markup.includes('Caller error'));
    for (const collection of collections) assert(markup.includes(collection));
    for (const identity of ['platform', 'linked-account', 'xbox-live']) assert(markup.includes(identity));
    assert(markup.includes('type="checkbox"')); assert(!markup.includes('isInvitingToRealm='));
    for (let bits = 0; bits < 16; bits++) {
      const html = render(ui.InviteScreen, { ...props, presentation: { ...data.presentation, sourceProfile: bits & 1 ? 'pocket' : 'desktop' }, capabilities: { ...data.capabilities, isInvitingToRealm: !!(bits & 2), canManageMembers: !!(bits & 4), useVerticalButtonStackPanel: !!(bits & 8) }, modal: true });
      assert(html.includes('Caller Send')); assert(html.includes('aria-modal="true"'));
    }
    render(ui.InvitePersonRow, { scope: { collection: collections[0], itemId: '__proto__', collectionIndex: 0 }, person: categories[collections[0]].people[0], width: 300, capabilities: data.capabilities, crossPlatformEnabled: true, labels: props.labels, selected: true, ref, selectionRef: ref, profileRef: ref, onSelectedChange: callback });
    render(ui.InviteCategory, { data: categories[collections[1]], width: 300, visible: true, capabilities: data.capabilities, crossPlatformEnabled: true, labels: props.labels, onAction: callback, ref });
    render(ui.InvitePagination, { collection: collections[0], width: 300, included: true, snapshot: categories[collections[0]].pagination, previousLabel: 'Previous', nextLabel: 'Next', previousRef: ref, nextRef: ref, onAction: callback, ref });
    render(ui.InviteFooter, { width: 300, variant: 'horizontal', capabilities: data.capabilities, findCrossPlatformFriendsEnabled: true, sendButtonText: 'Send', gamepadHelperVisible: false, labels: props.labels, onAction: callback, ref });
    for (const patch of [{ categories: {} }, { bindings: { ...data.bindings, isLoading: undefined } }, { capabilities: { ...data.capabilities, platformIcons: { visible: true } } }, { presentation: { ...data.presentation, availableSize: [384, Infinity] } }]) assert.throws(() => render(ui.InviteScreen, { ...props, ...patch }));
    assert.equal(JSON.stringify(data), before); assert.deepEqual(effects, { callbacks: 0, refs: 0 }); assert.deepEqual(calls, []); assert.deepEqual(warnings, []);
  } finally {
    console.error = originalError;
    for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }
  const manifestBytes = await readFile(join(packageRoot, 'docs/invite-assets.json'));
  assert.equal(createHash('sha256').update(manifestBytes).digest('hex'), '58a4140e7da0a28589c727bfe9bb104d16c84fe9cccbdf8eb138631a448f7347', 'Fixed Invite original asset manifest');
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.canonicalZipSha256, 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf');
  assert.equal(manifest.assets.length, 58); assert.equal(manifest.missing.length, 1); assert.equal(manifest.missing[0].texture, 'textures/ui/platform_icon');
  const bundle = await readFile(join(packageRoot, 'dist/index.js'), 'utf8');
  const bodies = [...bundle.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)].map(match => Buffer.from(match[1], 'base64'));
  const hashes = new Set(bodies.map(bytes => createHash('sha256').update(bytes).digest('hex')));
  const originalFile = async (path, expected) => { const bytes = await readFile(join(packageRoot, path.replace(/^src\//, 'dist/'))); assert.equal(bytes.length, expected.bytes, path); assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256, path); return bytes; };
  for (const asset of manifest.assets) {
    assert(hashes.has(asset.original.sha256), `Complete original absent from installed bundle: ${asset.key}`);
    if (!asset.mode.includes('embedded')) await originalFile(asset.selected.path, asset.original);
    if (asset.rawMetadata) { const bytes = await originalFile(asset.rawMetadata.selectedPath, asset.rawMetadata); assert.deepEqual(JSON.parse(bytes), asset.rawMetadata.value); }
  }
  await originalFile(manifest.license.selectedPath, manifest.license);
  const typed = `import {createRef} from 'react';
import {InviteScreen,InvitePersonRow,InviteCategory,InvitePagination,InviteFooter} from 'mcbeui';
import type {InviteScreenProps,InviteLabels,InviteIdentity,InviteCollection,InviteToggleName,InviteCheckVisual,InviteScope,InviteFocusBindings,InviteRenderContext,InviteProfileVisual,InvitePlatformIcons,InvitePerson,InviteCapabilities,InviteBindings,InvitePaginationSnapshot,InviteCategoryData,InviteSelection,InviteActionTarget,InviteActionDetail,InviteSelectionDetail,InvitePartyDetail,InviteControllerCommand,InviteControllerHandle,InvitePresentation,InvitePersonRowProps,InvitePaginationProps,InviteCategoryProps,InviteFooterProps} from 'mcbeui';
const labels:InviteLabels={...${JSON.stringify(labels)},friendSelection:person=>person.id};
const props:InviteScreenProps=${JSON.stringify(data).slice(0,-1)},labels};
const controller=createRef<InviteControllerHandle>();
const row:InvitePersonRowProps={scope:{collection:'online_platform_friends',itemId:'__proto__',collectionIndex:0},person:props.categories.online_platform_friends.people[0]!,width:300,capabilities:props.capabilities,crossPlatformEnabled:true,labels,selectionRef:createRef<HTMLInputElement>(),selectionProps:{onChange:event=>{const input:HTMLInputElement=event.currentTarget;return input.checked;}}};
export const nodes=<><InviteScreen {...props} ref={createRef<HTMLElement>()} controllerRef={controller} onSelectionChange={(next,detail)=>next.inviteToParty+detail.origin}/><InvitePersonRow {...row} ref={createRef<HTMLElement>()}/><InviteCategory data={props.categories.online_platform_friends} width={300} visible capabilities={props.capabilities} crossPlatformEnabled labels={labels}/><InvitePagination collection="online_platform_friends" width={300} included snapshot={props.categories.online_platform_friends.pagination} previousLabel="Previous" nextLabel="Next" previousRef={createRef<HTMLButtonElement>()}/><InviteFooter width={300} variant="horizontal" capabilities={props.capabilities} findCrossPlatformFriendsEnabled sendButtonText="Send" gamepadHelperVisible={false} labels={labels}/></>;
export const request=()=>controller.current?.request({fromButtonId:'button.controller_select',destination:'button.send_invites'});
// @ts-expect-error Visible missing platform art requires renderer and provenance.
const badPlatform:InvitePlatformIcons={visible:true};
// @ts-expect-error Linked identity requires both profile visuals.
const badPerson:InvitePerson={identity:'linked-account',id:'x',gamertag:'X',thirdPartyTag:'Y',currentGameLabel:'',onlineVisible:true};
// @ts-expect-error Invite checkbox type is reserved.
const badSelection:InvitePersonRowProps={...row,selectionProps:{type:'radio'}};
// @ts-expect-error Source controller mappings are explicit.
const badController:InviteControllerCommand={fromButtonId:'button.fake',destination:'button.send_invites'};
// @ts-expect-error Root requires all six collection snapshots.
const badCategories:InviteScreenProps={...props,categories:{}};
// @ts-expect-error Root binding flags are required.
const badBindings:InviteBindings={isLoading:false};
export type AllInviteTypes=[InviteIdentity,InviteCollection,InviteToggleName,InviteCheckVisual,InviteScope,InviteFocusBindings,InviteRenderContext,InviteProfileVisual,InvitePlatformIcons,InvitePerson,InviteCapabilities,InviteBindings,InvitePaginationSnapshot,InviteCategoryData,InviteSelection,InviteActionTarget,InviteActionDetail,InviteSelectionDetail,InvitePartyDetail,InviteControllerCommand,InviteControllerHandle,InvitePresentation,InvitePaginationProps,InviteCategoryProps,InviteFooterProps];
`;
  await writeFile(join(consumer, 'invite-consumer.tsx'), typed);
  execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--skipLibCheck', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2022', '--jsx', 'react-jsx', 'invite-consumer.tsx'], { cwd: consumer, encoding: 'utf8' });
  console.log(`React ${major}: actual Invite5 SSR ${cases} groups, 58 whole originals/raw metadata, typed components/refs/controller and six negative contracts PASS`);
}
