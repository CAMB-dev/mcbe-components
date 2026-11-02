import {StrictMode, useCallback, useEffect, useState} from 'react';
import type {CSSProperties} from 'react';
import {createRoot} from 'react-dom/client';
import {PlayScreen} from '../src/play-screen';
import type {PlayScreenProps} from '../src/play-screen';
import type {PlayTabId} from '../src/play-screen-frame';
import {createPlayDemoProps, playDemoWorld} from './play-screen-data';
import {hasGameFont} from 'virtual:mcbeui-game-font';
import '../src/styles.css';
import '../src/fonts.css';

export interface PlayFixtureConfiguration {
  mounted: boolean; tab: PlayTabId; viewportWidth: number; viewportHeight: number; scale: number; fontSize: number;
  inputMode: 'mouse' | 'touch'; exitButtonVisible: boolean; readOnly: boolean; disabled: boolean;
  acceptTab: boolean; acceptCode: boolean; acceptClose: boolean; preventClick: boolean; preventKey: boolean;
  unmountOnClick: boolean; localLabelVisible: boolean; longWorlds: boolean; separateStorage: boolean;
  loadingLegacy: boolean; noFriendsMessage: boolean; rightVisible: boolean; allDetails: boolean;
  featureMessage: boolean; joinOpen: boolean; highOpen: boolean; revision: number;
}
interface Request {target: string; collection?: string; id?: string; index?: number; value?: string; nativeType?: string; controlTag?: string}
export interface PlayFixtureAPI {
  configure: (patch: Partial<PlayFixtureConfiguration>) => void;
  clear: () => void; ready: boolean; root: HTMLDivElement | null; panel: HTMLDivElement | null; content: HTMLDivElement | null;
  panes: Partial<Record<PlayTabId, HTMLDivElement | null>>; input: HTMLInputElement | null;
  requests: Request[]; refs: string[]; code: string;
}
declare global {interface Window {playScreenFixture: PlayFixtureAPI}}
const api: PlayFixtureAPI = {configure: () => {}, clear: () => {api.requests.length = 0;}, ready: false,
  root: null, panel: null, content: null, panes: {}, input: null, requests: [], refs: [], code: ''};
window.playScreenFixture = api;
const defaults: PlayFixtureConfiguration = {mounted: true, tab: 'worlds', viewportWidth: 360, viewportHeight: 300, scale: 2, fontSize: 18,
  inputMode: 'mouse', exitButtonVisible: false, readOnly: false, disabled: false, acceptTab: true, acceptCode: true, acceptClose: true,
  preventClick: false, preventKey: false, unmountOnClick: false, localLabelVisible: true, longWorlds: false, separateStorage: false,
  loadingLegacy: false, noFriendsMessage: false, rightVisible: true, allDetails: false, featureMessage: false,
  joinOpen: false, highOpen: false, revision: 0};

function Fixture() {
  const [config, setConfig] = useState(defaults), [code, setCode] = useState(''), [selected, setSelected] = useState('featured-1');
  api.configure = patch => setConfig(old => ({...old, ...patch})); api.code = code;
  const rootRef = useCallback((node: HTMLDivElement | null) => {api.root = node; if (!node) return;
    api.refs.push('root:attach'); return () => {api.root = null; api.refs.push('root:cleanup');};}, []);
  const panelRef = useCallback((node: HTMLDivElement | null) => {api.panel = node;}, []);
  const contentRef = useCallback((node: HTMLDivElement | null) => {api.content = node;}, []);
  const inputRef = useCallback((node: HTMLInputElement | null) => {api.input = node;}, []);
  const worldRef = useCallback((node: HTMLDivElement | null) => {api.panes.worlds = node;}, []);
  const friendsRef = useCallback((node: HTMLDivElement | null) => {api.panes.friends = node;}, []);
  const serversRef = useCallback((node: HTMLDivElement | null) => {api.panes.servers = node;}, []);
  useEffect(() => {let active = true;
    Promise.all([document.fonts.load('18px "MCBE Pixel"'), document.fonts.load('18px "MCBE CJK"'),
      ...(hasGameFont ? [document.fonts.load('18px "Mojangles Pixel"'), document.fonts.load('18px "Mojangles"')] : [])])
      .then(() => document.fonts.ready).then(() => {if (active) api.ready = true;}).catch(() => {if (active) api.ready = true;});
    return () => {active = false;};
  }, []);
  const p: {-readonly [Key in keyof PlayScreenProps]: PlayScreenProps[Key]} = createPlayDemoProps();
  p.id = 'play-fixture-screen'; p.viewportSize = [config.viewportWidth, config.viewportHeight]; p.scale = config.scale; p.inputMode = config.inputMode;
  p.exitButtonVisible = config.exitButtonVisible; p.panelRef = panelRef; p.contentRef = contentRef;
  p.paneRefs = {worlds: worldRef, friends: friendsRef, servers: serversRef};
  p.navigation = {...p.navigation, value: config.tab, disabled: config.disabled, onValueChange: next => {
    api.requests.push({target: 'navigation_tab', value: next}); if (config.acceptTab) setConfig(old => ({...old, tab: next}));
  }};
  const onAction = (detail: Parameters<NonNullable<typeof p.worlds.onAction>>[0]) => {
    api.requests.push({target: detail.target, ...(detail.collection === undefined ? {} : {collection: detail.collection}),
      ...(detail.id === undefined ? {} : {id: detail.id}), ...(detail.index === undefined ? {} : {index: detail.index}),
      nativeType: detail.event.type, controlTag: detail.event.currentTarget.tagName});
    if (detail.target === 'server_navigation_toggle' && detail.id) setSelected(detail.id);
    if (detail.target === 'button.menu_network_join_by_code') setConfig(old => ({...old, joinOpen: true}));
  };
  const items = config.longWorlds ? Array.from({length: 28}, (_, i) => playDemoWorld('long-' + i, 'Local world ' + i)) : p.worlds.localWorlds.items;
  p.worlds = {...p.worlds, disabled: config.disabled, readOnly: config.readOnly, onAction,
    provider: {...p.worlds.provider, legacyWorldsShareStorage: config.separateStorage},
    flags: {...p.worlds.flags, localWorldsVisible: config.localLabelVisible, loadingLegacyWorldsVisible: config.loadingLegacy},
    localWorlds: {items, rowCount: items.length}};
  p.friends = {...p.friends, disabled: config.disabled, readOnly: config.readOnly, onAction, flags: {...p.friends.flags, noFriendsMessageVisible: config.noFriendsMessage}};
  const featured = selected.startsWith('featured');
  p.servers = {...p.servers, disabled: config.disabled, readOnly: config.readOnly, onAction,
    featured: p.servers.featured.map(item => ({...item, selected: item.id === selected})),
    additional: p.servers.additional.map(item => ({...item, selected: item.id === selected})),
    visibility: {...p.servers.visibility, rightVisible: config.rightVisible, featureServerMessageVisible: config.featureMessage},
    details: {...p.servers.details, featuredVisible: config.allDetails || featured, additionalVisible: config.allDetails || !featured, addVisible: config.allDetails}};
  const popupClose = (target: string, owner: 'join' | 'high') => {api.requests.push({target}); if (config.acceptClose) setConfig(old => ({...old, ...(owner === 'join' ? {joinOpen: false} : {highOpen: false})}));};
  const join = p.popups!.joinByCode!, high = p.popups!.highPing!;
  p.popups = {
    joinByCode: {...join, open: config.joinOpen, value: code, disabled: config.disabled, readOnly: config.readOnly, inputRef,
      onValueChange: value => {api.requests.push({target: '#join_by_code_text_edit', value}); if (config.acceptCode) setCode(value);},
      onClose: detail => popupClose(detail.target, 'join'), onAction: detail => api.requests.push({target: detail.target, value: detail.value})},
    highPing: {...high, open: config.highOpen, disabled: config.disabled, readOnly: config.readOnly,
      onClose: detail => popupClose(detail.target, 'high'), onAction: detail => {api.requests.push({target: detail.target}); if (detail.action === 'cancel' && config.acceptClose) setConfig(old => ({...old, highOpen: false}));}},
  };
  p.onExitRequest = detail => {api.requests.push({target: detail.target, nativeType: detail.event.type, controlTag: detail.event.currentTarget.tagName});};
  return <main>
    <button id="play-fixture-opener" onClick={() => setConfig(old => ({...old, joinOpen: true}))}>Open code</button>
    <button id="play-fixture-warning" onClick={() => setConfig(old => ({...old, highOpen: true}))}>Open warning</button>
    <button id="play-fixture-after">Outside</button>
    <div id="play-fixture-host" style={{maxWidth: '100%', overflowX: 'auto', position: 'relative'}}
      onClick={event => {if (config.preventClick) event.preventDefault(); if (config.unmountOnClick) setConfig(old => ({...old, mounted: false}));}}
      onKeyDown={event => {if (config.preventKey) event.preventDefault();}}>
      {config.mounted && <PlayScreen {...p} key={config.revision} ref={rootRef} style={{
        '--mc-font': hasGameFont ? '"Mojangles Pixel","Mojangles","MCBE CJK",monospace' : '"MCBE Pixel","MCBE CJK",monospace',
        '--mc-play-font-size': config.fontSize + 'px', '--mc-font-size': config.fontSize + 'px',
      } as CSSProperties}/>}
    </div>
  </main>;
}
createRoot(document.getElementById('play-fixture-root')!).render(<StrictMode><Fixture/></StrictMode>);
