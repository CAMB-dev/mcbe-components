import { useLayoutEffect, useRef, useState } from 'react';
import { Button, Switch } from '../src/components';
import { Combobox } from '../src/combobox';
import { InviteScreen } from '../src/invite-screen';
import { InvitePersonRow } from '../src/invite-person-row';
import { InviteCategory } from '../src/invite-category';
import { InvitePagination } from '../src/invite-pagination';
import { InviteFooter } from '../src/invite-footer';
import './invite-examples.css';
import type { InviteActionDetail, InviteBindings, InviteCapabilities, InviteCategoryData, InviteCollection, InviteControllerHandle, InviteLabels, InvitePerson, InviteSelection } from '../src/invite-types';

const collectionOrder: readonly InviteCollection[] = ['online_platform_friends', 'online_linked_account_friends', 'online_xbox_live_friends', 'offline_platform_friends', 'offline_linked_account_friends', 'offline_xbox_live_friends'];
// A complete original profile glyph is supplied by this application. It is not
// a resolved gamerpic or the original profile_image_renderer provider.
const profile = { kind: 'image' as const, src: new URL('../src/assets/start-menu/profile_glyph_combined.png', import.meta.url).href, sourceSize: [11, 12] as const };
const labels: InviteLabels = {
  title: 'Invite to Game', realmTitle: 'Invite to Realm', onlinePlatform: 'Online platform friends', offlinePlatform: 'Offline platform friends',
  onlineCrossPlatform: 'Online cross-platform friends', offlineCrossPlatform: 'Offline cross-platform friends',
  noPlatformFriends: 'No platform friends', crossPlatformDisabled: 'Cross-platform play is disabled',
  partyTitle: 'Invite to party', partyDescription: 'Include a party invitation', addFriend: 'Add Friend', addMember: 'Add Member', profile: 'View Profile',
  previousPage: 'Previous friends page', nextPage: 'Next friends page', close: 'Close invite preview', friendSelection: person => `Select ${person.identity === 'platform' ? person.thirdPartyTag : person.gamertag}`,
  loading: 'Loading friends', scrollArea: 'Invite friends collection',
};
function makeCategories(page: number): Record<InviteCollection, InviteCategoryData> {
  const result = {} as Record<InviteCollection, InviteCategoryData>;
  for (const collection of collectionOrder) {
    const online = collection.startsWith('online_'), common = { id: `sample-${page}`, currentGameLabel: online ? 'Minecraft' : 'Last seen yesterday', onlineVisible: online };
    const person: InvitePerson = collection.includes('linked_account')
      ? { ...common, identity: 'linked-account', gamertag: `Casey ${page}`, thirdPartyTag: `Casey · linked ${page}`, gamerpic: profile, thirdPartyProfile: profile }
      : collection.includes('xbox_live')
        ? { ...common, identity: 'xbox-live', gamertag: `Morgan ${page}`, gamerpic: profile }
        : { ...common, identity: 'platform', thirdPartyTag: `Sam ${page}`, thirdPartyProfile: profile };
    result[collection] = { collection, people: [person], grid: { columns: 1, rows: 1 }, pagination: { visible: true, previousEnabled: page > 1, nextEnabled: page < 2, counterLabel: `${page} / 2` }, ttsSectionHeader: collection.replaceAll('_', ' ') };
  }
  return result;
}
const initialVisibility: Record<InviteCollection, boolean> = {
  online_platform_friends: true, online_linked_account_friends: true, online_xbox_live_friends: true,
  offline_platform_friends: true, offline_linked_account_friends: true, offline_xbox_live_friends: true,
};
const initialFlags = { realm: false, canManage: false, addFriend: true, vertical: false, xboxOne: true, ps4: false, pagination: true, loading: false, crossPlatform: true, party: true, partyEnabled: true, readOnly: false, disabled: false, accept: true, noPlatform: false, noXbox: false, close: true };
type Flags = typeof initialFlags;

export function InviteExamples() {
  const host = useRef<HTMLDivElement>(null), controller = useRef<InviteControllerHandle>(null);
  const [hostWidth, setHostWidth] = useState(320), [scalePreference, setScalePreference] = useState('2');
  const [profilePreference, setProfilePreference] = useState('auto'), [inputMode, setInputMode] = useState<'mouse' | 'touch'>('mouse');
  const [flags, setFlags] = useState<Flags>(initialFlags), [categoryVisible, setCategoryVisible] = useState(initialVisibility);
  const [open, setOpen] = useState(true), [page, setPage] = useState(1);
  const [selection, setSelection] = useState<InviteSelection>({ selected: [], inviteToParty: false });
  const [status, setStatus] = useState('Select friends. This preview only records local requests.');
  useLayoutEffect(() => {
    const node = host.current; if (!node) return;
    const measure = () => setHostWidth(Math.max(1, Math.floor(node.clientWidth)));
    measure(); const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure); observer?.observe(node);
    return () => observer?.disconnect();
  }, []);
  const scale = scalePreference === '2' && hostWidth >= 768 ? 2 : 1;
  const sourceProfile = profilePreference === 'pocket' || (profilePreference === 'auto' && hostWidth < 317 * scale) ? 'pocket' : 'desktop';
  const capabilities: InviteCapabilities = {
    isInvitingToRealm: flags.realm, canManageMembers: flags.canManage, supportsAddFriend: flags.addFriend, useVerticalButtonStackPanel: flags.vertical,
    isPs4: flags.ps4, xboxOne: flags.xboxOne, platformInvitesVisible: true, usePagination: flags.pagination, hideErrorMessage: true, platformIcons: { visible: false },
  };
  const bindings: InviteBindings = {
    isLoading: flags.loading, crossPlatformEnabled: flags.crossPlatform, categoryVisible, noPlatformFriendsVisible: flags.noPlatform,
    noXboxLiveFriendsVisible: flags.noXbox, noXboxLiveFriendsText: 'No Xbox friends supplied', findCrossPlatformFriendsEnabled: true,
    sendButtonText: 'Send Invites', gamepadHelperVisible: false, buttonADescription: 'Select friend', closeButtonVisible: flags.close,
    isPartySystemAvailable: flags.party, canInviteToParty: flags.partyEnabled,
  };
  const categories = makeCategories(page);
  const receive = (detail: InviteActionDetail) => {
    setStatus(`${detail.target}${'collection' in detail ? ` · ${detail.collection}` : ''} · ${flags.accept ? 'host accepted' : 'host declined'}.`);
    if (!flags.accept) return;
    if (detail.target === 'button.menu_exit') setOpen(false);
    if (detail.target === 'button.previous_friends_page') setPage(1);
    if (detail.target === 'button.next_friends_page') setPage(2);
  };
  const toggle = (key: keyof Flags, label: string) => <Switch key={key} label={label} checked={flags[key]} onChange={event => setFlags(current => ({ ...current, [key]: event.target.checked }))}/>;
  return <div data-demo-invite="examples" style={{ display: 'grid', gap: 16, minWidth: 0 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
      <Combobox label="Invite preview scale preference" value={scalePreference} onValueChange={setScalePreference} options={[{ value: '1', label: '1×' }, { value: '2', label: '2× when the host fits' }]}/>
      <Combobox label="Invite source layout profile" value={profilePreference} onValueChange={setProfilePreference} options={[{ value: 'auto', label: 'Host chooses Desktop / Pocket' }, { value: 'desktop', label: 'Desktop' }, { value: 'pocket', label: 'Pocket' }]}/>
      <Combobox label="Invite scrolling input" value={inputMode} onValueChange={value => { if (value === 'mouse' || value === 'touch') setInputMode(value); }} options={[{ value: 'mouse', label: 'Mouse' }, { value: 'touch', label: 'Touch' }]}/>
      {toggle('accept', 'Accept invite requests')}{toggle('readOnly', 'Read-only invite')}{toggle('disabled', 'Disable invite')}
      {toggle('realm', 'Invite to Realm')}{toggle('canManage', 'Can manage members')}{toggle('vertical', 'Use vertical invite footer')}
      {toggle('crossPlatform', 'Cross-platform enabled')}{toggle('loading', 'Loading friends')}{toggle('party', 'Party system available')}
    </div>
    <details><summary>Independent source bindings</summary><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, paddingTop: 12 }}>
      {toggle('xboxOne', 'Xbox One profile action')}{toggle('ps4', 'PS4 row profile')}{toggle('addFriend', 'Add friend supported')}{toggle('pagination', 'Include friend pagination')}
      {toggle('partyEnabled', 'Party toggle enabled')}{toggle('noPlatform', 'Show platform-empty notice')}{toggle('noXbox', 'Show Xbox-empty notice')}{toggle('close', 'Show invite close button')}
      {collectionOrder.map(collection => <Switch key={collection} label={`Show ${collection.replaceAll('_', ' ')}`} checked={categoryVisible[collection]} onChange={event => setCategoryVisible(current => ({ ...current, [collection]: event.target.checked }))}/>)}
    </div></details>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <Button onClick={() => setOpen(true)}>Reopen invite preview</Button>
      <Button onClick={() => { setFlags(initialFlags); setCategoryVisible(initialVisibility); setOpen(true); setPage(1); setSelection({ selected: [], inviteToParty: false }); setStatus('The host reset the sample records and selection.'); }}>Reset invite host state</Button>
      <Button onClick={() => { const accepted = controller.current?.request({ fromButtonId: 'button.controller_select', destination: 'button.send_invites' }); if (!accepted) setStatus('The host-controller send request is unavailable.'); }}>Host-controller send request</Button>
    </div>
    <p style={{ margin: 0 }}>Preview: {scale}× · {sourceProfile} · page {page} · {selection.selected.length} scoped selections · party {selection.inviteToParty ? 'on' : 'off'}.</p>
    <div ref={host} style={{ width: '100%', minWidth: 0, maxWidth: 800, overflowX: 'auto' }}>
      <InviteScreen presentation={{ sourceProfile, availableSize: [Math.min(420, Math.max(320, hostWidth / scale)), 330], scale, inputMode, touchThumbVisible: false }}
        capabilities={capabilities} bindings={bindings} categories={categories} labels={labels} errorMessageText="" value={selection}
        onSelectionChange={(next, detail) => { setStatus(`${'collection' in detail ? detail.collection : detail.toggleName} · ${flags.accept ? 'host accepted' : 'host declined'} selection.`); if (flags.accept) setSelection(next); }}
        onAction={receive} controllerRef={controller} open={open} disabled={flags.disabled} readOnly={flags.readOnly} modal={false}/>
    </div>
    <p role="status" aria-live="polite" style={{ margin: 0, overflowWrap: 'anywhere' }}>{status}</p>
    <p style={{ margin: 0, fontSize: 12, color: '#b3b5b7' }}>Six independent sample collections reuse a complete original profile glyph supplied by this host. It is not a gamerpic provider. Selection and page changes stay local; no invitations, accounts or parties are accessed. The host chooses 1× below 768px, keeps at least 320 logical viewport units and uses the Pocket profile when Desktop does not fit. Smaller hosts scroll this preview locally.</p>
    <div data-invite-demo-parts style={{ display: 'grid', gap: 12, minWidth: 0, overflowX: 'auto' }}>
      <h3 style={{ margin: 0 }}>Reusable person row</h3>
      <InvitePersonRow scale={scale} scope={{ collection: 'online_xbox_live_friends', itemId: 'standalone', collectionIndex: 0 }} person={{ id: 'standalone', identity: 'xbox-live', gamertag: 'Standalone friend', currentGameLabel: 'Minecraft', onlineVisible: true, gamerpic: profile }} width={300} capabilities={capabilities} crossPlatformEnabled={flags.crossPlatform} labels={labels} disabled={flags.disabled} readOnly={flags.readOnly} onAction={receive} onSelectedChange={detail => setStatus(`Standalone friend · ${detail.selected ? 'selected' : 'unselected'}.`)}/>
      <h3 style={{ margin: 0 }}>Reusable category</h3>
      <InviteCategory scale={scale} data={categories.online_linked_account_friends} width={300} visible={true} capabilities={capabilities} crossPlatformEnabled={flags.crossPlatform} labels={labels} disabled={flags.disabled} readOnly={flags.readOnly} onAction={receive}/>
      <h3 style={{ margin: 0 }}>Reusable pagination</h3>
      <InvitePagination scale={scale} collection="online_platform_friends" width={300} included={flags.pagination} snapshot={{ visible: true, previousEnabled: page > 1, nextEnabled: page < 2, counterLabel: `${page} / 2` }} previousLabel={labels.previousPage} nextLabel={labels.nextPage} disabled={flags.disabled} readOnly={flags.readOnly} onAction={receive}/>
      <h3 style={{ margin: 0 }}>Reusable footer</h3>
      <InviteFooter scale={scale} width={300} variant={flags.vertical && (!flags.realm || flags.canManage) ? 'vertical' : 'horizontal'} capabilities={capabilities} findCrossPlatformFriendsEnabled={true} sendButtonText="Send Invites" gamepadHelperVisible={false} labels={labels} disabled={flags.disabled} readOnly={flags.readOnly} onAction={receive}/>
    </div>
  </div>;
}
