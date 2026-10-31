import { StrictMode, createRef, useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { InviteScreen } from '../src/invite-screen';
import { InvitePersonRow } from '../src/invite-person-row';
import { InviteCategory } from '../src/invite-category';
import { InvitePagination } from '../src/invite-pagination';
import { InviteFooter } from '../src/invite-footer';
import { InviteSourceHelper, InviteUnknownSourceContent } from '../src/invite-source-helpers';
import type { InviteActionDetail, InviteBindings, InviteCapabilities, InviteCategoryData, InviteCollection, InviteControllerHandle, InviteLabels, InvitePartyDetail, InvitePerson, InvitePresentation, InviteSelection, InviteSelectionDetail } from '../src/invite-types';
import '../src/styles.css';
import '../src/fonts.css';
import '../src/invite.css';
import '../src/invite-source-helpers.css';

// These are explicit host providers, never recovered native platform artwork.
const portrait = { kind: 'host-renderer' as const, render: (context: { logicalSize: readonly [number, number]; identity: string; itemId: string; collection: string; enabled: boolean; scale: number }) => <span data-host-portrait={context.identity} data-host-item={context.itemId} data-host-scope={context.collection} data-host-size={context.logicalSize.join(',')} data-host-enabled={context.enabled} style={{ display: 'block', width: '100%', height: '100%', background: '#234567' }} /> };
export const inviteCollections: readonly InviteCollection[] = ['online_platform_friends', 'online_linked_account_friends', 'online_xbox_live_friends', 'offline_platform_friends', 'offline_linked_account_friends', 'offline_xbox_live_friends'];
export const inviteLabels: InviteLabels = { title: 'Invite fixture', realmTitle: 'Realm fixture', onlinePlatform: 'Platform online heading', offlinePlatform: 'Platform offline heading', onlineCrossPlatform: 'Cross online heading', offlineCrossPlatform: 'Cross offline heading', noPlatformFriends: 'Independent platform empty', crossPlatformDisabled: 'Independent cross disabled', partyTitle: 'Invite party fixture', partyDescription: 'Party source description', addFriend: 'Add friend fixture', addMember: 'Add member fixture', profile: 'Profile fixture', previousPage: 'Previous fixture', nextPage: 'Next fixture', close: 'Close fixture', friendSelection: person => `Select ${person.identity} ${person.id}`, loading: 'Loading fixture', scrollArea: 'Invite scroll fixture' };
export const inviteCapabilities: InviteCapabilities = { isInvitingToRealm: false, canManageMembers: false, supportsAddFriend: true, useVerticalButtonStackPanel: false, isPs4: false, xboxOne: true, platformInvitesVisible: true, usePagination: true, hideErrorMessage: true, platformIcons: { visible: true, provenance: 'host-supplied-missing-platform-icon', render: context => <span data-host-platform={context.identity} data-host-size={context.logicalSize.join(',')} style={{ display: 'block', width: '100%', height: '100%', background: '#654321' }} /> } };
export const inviteBindings: InviteBindings = { isLoading: false, crossPlatformEnabled: true, categoryVisible: Object.fromEntries(inviteCollections.map(key => [key, true])) as Record<InviteCollection, boolean>, noPlatformFriendsVisible: false, noXboxLiveFriendsVisible: false, noXboxLiveFriendsText: 'Independent Xbox empty', findCrossPlatformFriendsEnabled: true, sendButtonText: 'Send fixture', gamepadHelperVisible: false, buttonADescription: 'Select source description', closeButtonVisible: true, isPartySystemAvailable: true, canInviteToParty: true };
export function invitePeople(collection: InviteCollection): readonly InvitePerson[] {
  const common = { id: '__proto__', currentGameLabel: `Game ${collection}`, onlineVisible: collection.startsWith('online'), focus: { profileIdentifier: `profile-${collection}`, up: 'host-up', down: 'host-down' } };
  return collection.includes('linked_account') ? [{ ...common, identity: 'linked-account', gamertag: 'Linked gamertag', thirdPartyTag: 'Linked platform tag', gamerpic: portrait, thirdPartyProfile: portrait }] : collection.includes('xbox_live') ? [{ ...common, identity: 'xbox-live', gamertag: 'Xbox gamertag', gamerpic: portrait }] : [{ ...common, identity: 'platform', thirdPartyTag: 'Platform tag', thirdPartyProfile: portrait }];
}
export const inviteCategories = Object.fromEntries(inviteCollections.map(collection => [collection, { collection, people: invitePeople(collection), grid: { columns: 1, rows: 1 }, pagination: { visible: true, previousEnabled: true, nextEnabled: true, counterLabel: 'Page host label' }, ttsSectionHeader: `TTS ${collection}` }])) as Record<InviteCollection, InviteCategoryData>;
export interface InviteFixtureSettings {
  presentation: InvitePresentation; capabilities: InviteCapabilities; bindings: InviteBindings;
  categories: Record<InviteCollection, InviteCategoryData>; value: InviteSelection; defaultValue: InviteSelection;
  disabled: boolean; readOnly: boolean; hidden: boolean; open: boolean; visible: boolean; modal: boolean;
  accept: boolean; controlled: boolean; veto: string; scene: 'screen' | 'row' | 'category' | 'pagination' | 'footer' | 'helpers';
  collection: InviteCollection; rowId: string; rowSelected: boolean; rowEnabled: boolean;
  footerVariant: 'horizontal' | 'vertical'; width: number; included: boolean; nested: boolean; revision: number;
  observeViewportRef?: boolean; viewportRefRevision?: number;
}
const initial: InviteFixtureSettings = { presentation: { sourceProfile: 'desktop', availableSize: [400, 600], scale: 1, inputMode: 'mouse', touchThumbVisible: false }, capabilities: inviteCapabilities, bindings: inviteBindings, categories: inviteCategories, value: { selected: [], inviteToParty: false }, defaultValue: { selected: [], inviteToParty: false }, disabled: false, readOnly: false, hidden: false, open: true, visible: true, modal: false, accept: true, controlled: true, veto: 'none', scene: 'screen', collection: 'online_xbox_live_friends', rowId: '__proto__', rowSelected: false, rowEnabled: true, footerVariant: 'horizontal', width: 240, included: true, nested: false, revision: 0 };
const refs = { root: createRef<HTMLElement>(), row: createRef<HTMLElement>(), selection: createRef<HTMLInputElement>(), profile: createRef<HTMLButtonElement>(), category: createRef<HTMLElement>(), pagination: createRef<HTMLElement>(), previous: createRef<HTMLButtonElement>(), next: createRef<HTMLButtonElement>(), footer: createRef<HTMLElement>(), addFriend: createRef<HTMLButtonElement>(), addMember: createRef<HTMLButtonElement>(), send: createRef<HTMLButtonElement>(), party: createRef<HTMLInputElement>(), close: createRef<HTMLButtonElement>(), viewport: createRef<HTMLDivElement>(), controller: createRef<InviteControllerHandle>() };
type Log = { kind: string; [key: string]: unknown };
export interface InviteQA { settings: InviteFixtureSettings; refs: typeof refs; events: Log[]; viewportRefObservations: { phase: 'attach' | 'cleanup' | 'null'; revision: number; node: HTMLDivElement | null }[]; documentVetoActive: boolean; configure(patch: Partial<InviteFixtureSettings>): void; clear(): void; reset(): void; unmount(): void; restoreMoved(): void; }
declare global { interface Window { inviteInitial?: Partial<InviteFixtureSettings>; inviteQA: InviteQA } }
const root = createRoot(document.getElementById('root')!);
let moved: { node: HTMLElement; parent: Node; next: Node | null } | undefined;
const qa: InviteQA = { settings: initial, refs, events: [], viewportRefObservations: [], documentVetoActive: false, configure: () => {}, clear: () => { qa.events.length = 0; }, reset: () => (document.getElementById('invite-form') as HTMLFormElement).reset(), unmount: () => root.unmount(), restoreMoved: () => { if (moved) { moved.parent.insertBefore(moved.node, moved.next?.parentNode === moved.parent ? moved.next : null); moved = undefined; } } };
window.inviteQA = qa;
let sequence = 0;
const nativeIds = new WeakMap<Event, number>();
const eventId = (event: Event) => { let id = nativeIds.get(event); if (!id) nativeIds.set(event, id = ++sequence); return id; };
const countRequests = () => qa.events.filter(row => ['action', 'selection', 'party', 'row-selection', 'category-selection'].includes(row.kind)).length;
// This listener is deliberately native DOCUMENT bubble, outside every React
// root. It is never moved to a component/ancestor to make a veto test pass.
for (const type of ['click', 'keydown'] as const) document.addEventListener(type, event => {
  const control = event.target instanceof Element ? event.target.closest('input,button') : null;
  if (!(control instanceof HTMLElement) || !control.closest('#invite-form') || (type === 'keydown' && (event as KeyboardEvent).key !== 'Escape')) return;
  const row: Log = { kind: `document-${type}`, eventId: eventId(event), type, trusted: event.isTrusted, cancelable: event.cancelable, before: event.defaultPrevented, control: control.id || control.getAttribute('data-invite-footer-control') || control.tagName, requestsBefore: countRequests() };
  qa.events.push(row);
  if (qa.settings.veto === 'document') event.preventDefault();
  row.after = event.defaultPrevented;
  queueMicrotask(() => qa.events.push({ kind: 'document-microtask', eventId: eventId(event), prevented: event.defaultPrevented, requests: countRequests() }));
  const ownerWindow = control.ownerDocument.defaultView;
  ownerWindow?.setTimeout(() => qa.events.push({ kind: 'document-task', eventId: eventId(event), prevented: event.defaultPrevented, requests: countRequests() }), 0);
});
function receipt(kind: string, detail: InviteActionDetail | InviteSelectionDetail | InvitePartyDetail, next?: InviteSelection) {
  const event = detail.event, current = event?.currentTarget;
  const row: Log = { kind, ...Object.fromEntries(Object.entries(detail).filter(([key]) => key !== 'event')), next, eventId: event ? eventId(event.nativeEvent) : null, current: current?.tagName, currentId: current?.id, connected: current?.isConnected, trusted: event?.nativeEvent.isTrusted, prevented: event?.nativeEvent.defaultPrevented, methods: event ? [event.isDefaultPrevented(), event.isPropagationStopped()] : null };
  qa.events.push(row);
  if (event) queueMicrotask(() => { row.laterCurrent = event.currentTarget?.tagName; row.laterCurrentId = event.currentTarget?.id; });
}
function App() {
  const [s, set] = useState(() => ({ ...initial, ...window.inviteInitial }));
  qa.settings = s; qa.documentVetoActive = s.veto === 'document';
  qa.configure = patch => flushSync(() => set(old => ({ ...old, ...patch })));
  const observedViewportRef = useMemo(() => {
    const revision = s.viewportRefRevision ?? 0;
    return (node: HTMLDivElement | null) => {
      refs.viewport.current = node;
      qa.viewportRefObservations.push({ phase: node ? 'attach' : 'null', revision, node });
      if (node) return () => {
        qa.viewportRefObservations.push({ phase: 'cleanup', revision, node });
        if (refs.viewport.current === node) refs.viewport.current = null;
      };
    };
  }, [s.viewportRefRevision]);
  const lateEvents = new WeakSet<Event>();
  const parent = (event: SyntheticEvent) => {
    if (s.veto === 'parent') event.preventDefault();
    if (!s.veto.startsWith('late-') || lateEvents.has(event.nativeEvent)) return;
    lateEvents.add(event.nativeEvent);
    const control = (event.target as Element).closest<HTMLElement>('input,button');
    if (s.veto === 'late-move' && control?.parentNode) { moved = { node: control, parent: control.parentNode, next: control.nextSibling }; document.getElementById('invite-move-sink')!.append(control); return; }
    flushSync(() => set(old => {
      if (s.veto === 'late-disabled') return { ...old, disabled: true };
      if (s.veto === 'late-readonly') return { ...old, readOnly: true };
      if (s.veto === 'late-hidden') return { ...old, hidden: true };
      if (s.veto === 'late-close') return { ...old, open: false };
      if (s.veto === 'late-root') return { ...old, revision: old.revision + 1 };
      if (s.veto === 'late-identity') return { ...old, rowId: 'replacement' };
      if (s.veto === 'late-scope') return { ...old, collection: 'offline_xbox_live_friends' };
      if (s.veto === 'late-category') return { ...old, categories: { ...old.categories, [old.collection]: { ...old.categories[old.collection], people: [] } } };
      return old;
    }));
  };
  const leaf = (event: SyntheticEvent) => { qa.events.push({ kind: 'leaf', eventId: eventId(event.nativeEvent), type: event.type, current: event.currentTarget.tagName }); if (s.veto === 'leaf') event.preventDefault(); };
  const profile = s.categories[s.collection].people[0] ?? invitePeople(s.collection)[0]!;
  const person = { ...profile, id: s.rowId, enabled: s.rowEnabled };
  const caps = s.capabilities;
  const helpers = (kind: 'a' | 'x' | 'y', context: { label: string; enabled: boolean; scale: number; sourceTextureBinding: string }) => <span data-host-helper={kind} data-host-binding={context.sourceTextureBinding} data-host-enabled={context.enabled}>{kind.toUpperCase()}</span>;
  const onAction = (detail: InviteActionDetail) => receipt('action', detail);
  const onSelection = (next: InviteSelection, detail: InviteSelectionDetail | InvitePartyDetail) => { receipt('value' in detail ? 'party' : 'selection', detail, next); if (s.accept) set(old => ({ ...old, value: next })); };
  const rootProps = { presentation: s.presentation, capabilities: caps, bindings: s.bindings, categories: s.categories, labels: inviteLabels, errorMessageText: 'Independent source error', value: s.controlled ? s.value : undefined, defaultValue: s.defaultValue, onSelectionChange: onSelection, onAction, open: s.open, visible: s.visible, modal: s.modal, disabled: s.disabled, readOnly: s.readOnly, hidden: s.hidden, renderGamepadHelper: helpers };
  const footerProps = { width: s.width, variant: s.footerVariant, capabilities: caps, findCrossPlatformFriendsEnabled: s.bindings.findCrossPlatformFriendsEnabled, sendButtonText: s.bindings.sendButtonText, gamepadHelperVisible: s.bindings.gamepadHelperVisible, renderGamepadHelper: helpers, labels: inviteLabels, scale: s.presentation.scale, disabled: s.disabled, readOnly: s.readOnly, hidden: s.hidden, onAction };
  return <><button id="invite-sink">Focus sink</button><button id="invite-outside">Outside control</button><form id="invite-form" onSubmit={event => event.preventDefault()} onClick={parent} onChange={parent} onKeyDown={parent}>
    {s.scene === 'screen' && <InviteScreen key={s.revision} {...rootProps} id="invite" ref={refs.root} viewportRef={s.observeViewportRef ? observedViewportRef : refs.viewport} partyRef={refs.party} partyProps={{ id: 'invite-party', onChange: leaf, onClick: leaf }} closeRef={refs.close} closeProps={{ id: 'invite-close', onClick: leaf }} footerControlRefs={{ addFriend: refs.addFriend, addMember: refs.addMember, send: refs.send }} controllerRef={refs.controller} />}
    {s.scene === 'row' && <InvitePersonRow key={s.revision} id="invite-row" ref={refs.row} scope={{ collection: s.collection, itemId: s.rowId, collectionIndex: 0 }} person={person} width={s.width} capabilities={caps} crossPlatformEnabled={s.bindings.crossPlatformEnabled} labels={inviteLabels} scale={s.presentation.scale} selected={s.controlled ? s.rowSelected : undefined} defaultSelected={false} disabled={s.disabled} readOnly={s.readOnly} hidden={s.hidden} selectionRef={refs.selection} selectionProps={{ id: 'invite-selection', name: 'invite-row-selection', onChange: leaf, onClick: leaf }} profileRef={refs.profile} profileProps={{ id: 'invite-profile', onClick: leaf }} onSelectedChange={detail => { receipt('row-selection', detail); if (s.accept) set(old => ({ ...old, rowSelected: detail.selected })); }} onAction={onAction} />}
    {s.scene === 'category' && <InviteCategory key={s.revision} id="invite-category" ref={refs.category} data={s.categories[s.collection]} width={s.width} visible={s.bindings.categoryVisible[s.collection]} selected={s.controlled ? s.value.selected : undefined} defaultSelected={s.defaultValue.selected} capabilities={caps} crossPlatformEnabled={s.bindings.crossPlatformEnabled} labels={inviteLabels} scale={s.presentation.scale} disabled={s.disabled} readOnly={s.readOnly} hidden={s.hidden} paginationRef={refs.pagination} onSelectedChange={detail => { receipt('category-selection', detail); if (s.accept) set(old => ({ ...old, value: { ...old.value, selected: detail.selected ? [...old.value.selected, { collection: detail.collection, itemId: detail.itemId }] : old.value.selected.filter(item => item.collection !== detail.collection || item.itemId !== detail.itemId) } })); }} onAction={onAction} />}
    {s.scene === 'pagination' && <InvitePagination key={s.revision} id="invite-pagination" ref={refs.pagination} collection={s.collection} width={s.width} included={s.included} snapshot={s.categories[s.collection].pagination} previousLabel={inviteLabels.previousPage} nextLabel={inviteLabels.nextPage} scale={s.presentation.scale} disabled={s.disabled} readOnly={s.readOnly} hidden={s.hidden} previousRef={refs.previous} nextRef={refs.next} previousProps={{ id: 'invite-previous', onClick: leaf }} nextProps={{ id: 'invite-next', onClick: leaf }} onAction={onAction} />}
    {s.scene === 'footer' && <InviteFooter key={s.revision} {...footerProps} id="invite-footer" ref={refs.footer} controlRefs={{ addFriend: refs.addFriend, addMember: refs.addMember, send: refs.send }} controlProps={{ addFriend: { id: 'invite-add-friend', onClick: leaf }, addMember: { id: 'invite-add-member', onClick: leaf }, send: { id: 'invite-send', onClick: leaf } }} />}
    {s.scene === 'helpers' && <div id="invite-helpers">
      {(['black_border_hover', 'friend_background_hover', 'friend_background_borderless', 'grey_borderless_locked'] as const).map(variant => <InviteSourceHelper key={variant} variant={variant} width={120} height={30} scale={s.presentation.scale} />)}
      <InviteSourceHelper variant="panel_text" width={120} height={30} scale={s.presentation.scale} text="Dormant panel text" />
      <InviteSourceHelper variant="loading_friends" width={120} height={30} scale={s.presentation.scale} text="Dormant loading friends" isLoading={s.bindings.isLoading} />
      <InviteSourceHelper variant="offline_image" width={20} height={20} scale={s.presentation.scale} collection={s.collection} offlineVisible />
      <InviteSourceHelper variant="hover_friend_button" width={120} height={30} scale={s.presentation.scale} collection={s.collection} hoverText="Host hover content" layout={{ source: 'invite.friend_button_layout', provenance: 'host-resolved-unknown-source', render: context => <span data-host-unknown={context.source} /> }} hoverRenderer={{ provenance: 'host-rendered-hover_text_renderer', render: context => <span data-host-hover={context.sourceRenderer} data-host-binding={context.sourceBinding} data-host-layer={context.sourceLayer}>{context.text}</span> }} />
      <InviteSourceHelper variant="linked_hover_friend_button" width={120} height={56} scale={s.presentation.scale} collection={s.collection} hoverText="Linked host hover" hoverRenderer={{ provenance: 'host-rendered-hover_text_renderer', render: context => <span data-host-hover={context.sourceRenderer}>{context.text}</span> }} />
      <InviteSourceHelper variant="friend_button_test" width={120} height={30} scale={s.presentation.scale} msaLayout={{ source: 'invite.msa_friend_button', provenance: 'host-resolved-inherited-source', render: context => <span data-host-inherited={context.source} data-host-checkbox={context.authoredCheckboxSize.join(',')} /> }} />
      <InviteUnknownSourceContent source="invite.label" width={120} height={10} scale={s.presentation.scale} resolution={{ source: 'invite.label', provenance: 'host-resolved-unknown-source', render: context => <span data-host-unknown={context.source}>Host resolved label</span> }} />
    </div>}
    {s.nested && <InviteScreen {...rootProps} id="invite-nested" modal />}
  </form><div id="invite-move-sink" /></>;
}
document.body.style.cssText = 'margin:0;background:#19232d;color:white;min-width:0';
root.render(<StrictMode><App /></StrictMode>);
