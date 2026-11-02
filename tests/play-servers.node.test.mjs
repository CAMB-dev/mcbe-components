import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const cache = new URL('../.cache/play-servers-implementation-20261102-01/', import.meta.url);
await mkdir(cache, { recursive: true });
const entry = fileURLToPath(new URL('../src/play-servers.tsx', import.meta.url));
const output = new URL(`source-${process.pid}.mjs`, cache);
const built = await build({ entryPoints: [entry], platform: 'node', format: 'esm', bundle: true, write: false, jsx: 'automatic', target: 'es2022', external: ['react', 'react/jsx-runtime', 'react-dom'], define: { 'import.meta.url': JSON.stringify(pathToFileURL(entry).href) } });
await writeFile(output, built.outputFiles[0].contents);
const ui = await import(output.href);
const { PlayServersContent, PlayServerRow, PlayServerDetails } = ui;
const picture = () => ({ src: 'https://host.invalid/original-server-image.png', sourceSize: [160, 90], alt: '' });
const item = (id = 'host-server') => ({ id, index: 17, name: 'Host server', selected: false, enabled: true, infoAvailable: true, screenshotVisible: false, messageVisible: false, message: 'Host provider message', concurrencyVisible: false, playerCount: 'Host count independent of rows', editVisible: false, editEnabled: true, editLabel: 'Edit host server', payload: { original: id } });
const metric = (label) => ({ label, value: '0017', iconVisible: false, valueVisible: true, progressVisible: false });
const basic = () => ({ name: 'Selected host server', online: metric('Host online'), ping: metric('Host ping'), joinLabel: 'Join selected host server', joinEnabled: true });
const section = (label) => ({ visible: false, label, text: `Host ${label} body`, collapsedVisible: true, expandedVisible: false, readMoreVisible: true, readLessVisible: false, readMoreLabel: `More ${label}`, readLessLabel: `Less ${label}`, readButtonHeight: 12 });
const featured = () => ({ ...basic(), infoAvailable: true, screenshotVisible: false, offersVisible: false, offersEnabled: true, offersLabel: 'View host offers', screenshots: { visible: false, label: 'Host screenshots', previousLabel: 'Previous host screenshot', nextLabel: 'Next host screenshot', previousEnabled: true, nextEnabled: false, selected: [false, true, true] }, description: section('Description'), news: { ...section('News'), title: 'Host news title' }, gamesVisible: false, gamesLabel: 'Host available games', games: [] });
const detail = () => ({ size: [150, 180], scale: 2, inputMode: 'mouse', label: 'Host server details', featuredVisible: false, additionalVisible: true, addVisible: false, additional: basic(), loadingLabel: 'Loading host details', loadingFrame: 3 });
const visibility = () => ({ featureServerMessageVisible: false, rightVisible: true, featuredServersVisibleAndAvailable: true, featuredServersVisible: true, loadingServersProgressVisible: false, additionalServersVisible: true, additionalLabelVisible: true, serversGridVisible: true, ignoreAddServers: false, ignoreThirdPartyServers: false, addServerEnabled: true, addServerSelected: false, crossPlatformDisabledVisible: false, internetConnectionVisible: false, multiplayerBlockedVisible: false, deviceSunsettingVisible: false, newUiSwitchVisible: false });
const content = () => ({ size: [320, 190], scale: 2, inputMode: 'mouse', label: 'Host server collection', featuredLabel: 'Host featured', additionalLabel: 'Host additional', addLabel: 'Select add-server information', loadingLabel: 'Loading host servers', loadingFrame: 1, featured: [item('featured-host')], additional: [item('additional-host')], visibility: visibility(), details: detail() });
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, { key: 'real-source-key', ref: () => {}, ...props }));
const tags = (html, fragment) => [...html.matchAll(new RegExp(`<button(?=[^>]*${fragment})[^>]*>`, 'g'))].map(match => match[0]);

test('server rows preserve actual source pitch, additional paint overlap and selection-only request', () => {
  for (const kind of ['featured', 'additional']) {
    const html = render(PlayServerRow, { kind, item: item(), width: 140, scale: 2, loadingLabel: 'Load row', loadingFrame: 0 });
    assert.match(html, new RegExp(`width:280px;height:${kind === 'featured' ? 80 : 60}px`));
    assert.ok(html.includes(`height:${kind === 'featured' ? 76 : 62}px`));
    assert.equal(tags(html, 'data-play-target="server_navigation_toggle"').length, 1);
    assert.ok(!html.includes('data-play-target="button.connect_to_third_party_server"'));
    assert.ok(!html.includes('data-play-target="button.menu_network_server_item"'));
    assert.match(html, /data-server-index="17"/);
  }
});
test('additional edit and select availability are independent real buttons and native attributes stay on the correct node', () => {
  for (const selected of [false, true]) for (const enabled of [false, true]) for (const editEnabled of [false, true]) {
    const html = render(PlayServerRow, { kind: 'additional', item: { ...item(), selected, enabled, editVisible: true, editEnabled }, width: 140, scale: 2, loadingLabel: 'Load', loadingFrame: 0, buttonProps: { name: 'select-source', 'data-native': 'select', 'aria-describedby': 'caller-description' }, editButtonProps: { name: 'edit-source', 'data-native': 'edit' } });
    const select = tags(html, 'name="select-source"')[0], edit = tags(html, 'name="edit-source"')[0];
    assert.ok(select && edit); assert.equal(select.includes('disabled=""'), !enabled); assert.equal(edit.includes('disabled=""'), !editEnabled);
    assert.equal(select.includes('aria-pressed="true"'), selected); assert.match(select, /aria-describedby="caller-description"/);
    assert.ok(!edit.includes('aria-describedby')); assert.match(edit, /data-play-target="button.menu_network_server_world_edit"/);
    assert.ok(html.includes('width:220px;height:62px')); assert.ok(html.includes('width:60px;height:62px'));
  }
});

test('textual server primary names derive from every visible string while blank loading rows keep their semantic fallback',()=>{
  for(const kind of['featured','additional'])for(let bits=0;bits<8;bits++){
    const row={...item(),infoAvailable:!!(bits&1),messageVisible:!!(bits&2),concurrencyVisible:!!(bits&4),pingIcon:picture()},p={kind,item:row,width:140,scale:2,loadingLabel:'Loading source row',loadingFrame:0};
    const html=render(PlayServerRow,p),button=html.match(/<button[^>]*class="[^"]*mc-play-server-row__select[^"]*"[^>]*>[\s\S]*?<\/button>/)[0],tag=button.match(/^<button[^>]*>/)[0];
    assert.equal(tag.includes('aria-label="Host server"'),bits===0);assert.equal(tag.includes('aria-label='),bits===0);for(const [visible,value]of[[row.infoAvailable,row.name],[row.messageVisible,row.message],[row.concurrencyVisible,row.playerCount]])if(visible)assert(button.includes(value));assert(!html.includes('labelFromContent'));
    const overridden=render(PlayServerRow,{...p,buttonProps:{'aria-label':'Host explicit server'}});assert(tags(overridden,'server_navigation_toggle')[0].includes('aria-label="Host explicit server"'));
    const labelled=render(PlayServerRow,{...p,buttonProps:{'aria-labelledby':'external-server-name'}});assert(tags(labelled,'server_navigation_toggle')[0].includes('aria-labelledby="external-server-name"'));
  }
  const empty=render(PlayServerRow,{kind:'additional',item:{...item(),infoAvailable:false,messageVisible:true,message:' ',concurrencyVisible:true,playerCount:'',pingIcon:picture(),editVisible:true},width:140,scale:2,loadingLabel:'Loading source row',loadingFrame:0});
  assert(tags(empty,'server_navigation_toggle')[0].includes('aria-label="Host server"'));assert(tags(empty,'button.menu_network_server_world_edit')[0].includes('aria-label="Edit host server"'));
});
test('all eight detail flag combinations remain independent, co-mounted and use separate join requests', () => {
  for (let bits = 0; bits < 8; bits++) {
    const html = render(PlayServerDetails, { ...detail(), featuredVisible: !!(bits & 1), additionalVisible: !!(bits & 2), addVisible: !!(bits & 4), featured: featured(), add: { title: 'Host add title', description: 'Host add explanation', isConsole: false } });
    for (const [kind, mask] of [['featured', 1], ['additional', 2], ['add', 4]]) {
      const plane = new RegExp(`<div[^>]*data-detail="${kind}"[^>]*>`).exec(html)?.[0];
      assert.ok(plane); assert.equal(plane.includes('hidden=""'), !(bits & mask));
    }
    assert.equal(tags(html, 'data-play-target="button.connect_to_third_party_server"').length, 1);
    assert.equal(tags(html, 'data-play-target="button.menu_network_server_item"').length, 1);
    assert.equal(tags(html, 'data-play-target="server_navigation_toggle"').length, 0);
    assert.match(html, /Host add explanation/);
    assert.equal((html.match(/data-source-layout="server-pane"/g) || []).length, 3);
  }
});
test('featured source sections render actual screenshot controls, games and news leaves rather than an empty host fragment', () => {
  const data = featured(); data.screenshotVisible = true; data.screenshot = picture(); data.offersVisible = true; data.screenshots.visible = true; data.screenshots.image = picture(); data.description.visible = true; data.news.visible = true; data.gamesVisible = true;
  data.games = [{ id: 'host-game', title: 'Actual host game title', subtitle: 'Actual host subtitle', description: 'Actual host game description', imageVisible: true, image: picture(), topHeight: 36 }];
  const html = render(PlayServerDetails, { ...detail(), featuredVisible: true, featured: data });
  for (const leaf of ['Actual host game title', 'Actual host subtitle', 'Actual host game description', 'Host news title', 'Host Description body', 'Host News body']) assert.ok(html.includes(leaf));
  for (const target of ['button.navigate_screenshots_left', 'button.navigate_screenshots_right', 'button.description_read_toggle', 'button.news_read_toggle', 'button.view_third_party_server_offers']) assert.equal(tags(html, `data-play-target="${target}"`).length, 1);
  assert.equal((html.match(/data-source-section=/g) || []).length, 4); assert.equal((html.match(/data-selected="true"/g) || []).length, 2);
  assert.match(html, /data-source-game-id="host-game"/); assert.match(html, /min-height:72px/); assert.ok(!html.includes('data-source-host-fragment'));
});
test('collapsed and expanded source text, read-more and read-less flags do not become an exclusive inferred state', () => {
  const data = featured(); data.description = { ...section('Description'), visible: true, collapsedVisible: true, expandedVisible: true, readMoreVisible: true, readLessVisible: true };
  const html = render(PlayServerDetails, { ...detail(), featuredVisible: true, featured: data });
  assert.equal((html.match(/Host Description body/g) || []).length, 2);
  assert.equal(tags(html, 'data-play-target="button.description_read_toggle"').length, 2);
  assert.ok(html.includes('More Description') && html.includes('Less Description'));
});
test('unavailable featured detail displays a frozen original loading frame while other independent panes remain intact', () => {
  const html = render(PlayServerDetails, { ...detail(), featuredVisible: true, featured: { ...featured(), infoAvailable: false }, loadingFrame: 8 });
  assert.ok(!html.includes('data-play-target="button.connect_to_third_party_server"')); assert.ok(html.includes('data-frame="8"'));
  assert.ok(html.includes('data-play-target="button.menu_network_server_item"')); assert.ok(!html.includes('animation:'));
});
test('fixed split uses the supplied logical dimensions and never derives an empty/auth/loading state from array length', () => {
  for (const inputMode of ['mouse', 'touch']) {
    const html = render(PlayServersContent, { ...content(), featured: [], additional: [], inputMode });
    assert.ok(html.includes('width:318px')); assert.ok(html.includes('width:312px')); assert.ok(html.includes('width:6px;height:372px'));
    assert.ok(html.includes('Host featured') && html.includes('Host additional'));
    assert.ok(!html.includes('mc-play-loading')); assert.ok(!html.includes('mc-play-status'));
    assert.ok(html.includes('data-play-target="server_navigation_toggle"')); assert.ok(html.includes('aria-pressed="false"'));
  }
});
test('server row and detail image widths lose the complete source pane1 before mouse reservation, with touch retaining its separate branch', () => {
  for (const [inputMode, rowWidth, imageWidth, paneWidth] of [['mouse', 284, 280, 316], ['touch', 302, 298, 316]]) {
    const p = content(); p.inputMode = inputMode; p.details.featuredVisible = true; p.details.featured = { ...featured(), screenshotVisible: true, screenshot: picture() };
    const html = render(PlayServersContent, p);
    const rowTag = /<div(?=[^>]*data-server-id="featured-host")[^>]*>/.exec(html)?.[0]; assert.ok(rowTag); assert.ok(rowTag.includes(`width:${rowWidth}px;height:80px`));
    const hero = /<img(?=[^>]*class="[^"]*mc-play-server-details__hero)[^>]*>/.exec(html)?.[0]; assert.ok(hero); assert.ok(hero.includes(`width="${imageWidth}"`));
    assert.match(html, new RegExp(`data-play-source-layer="pane"[^>]*width:${paneWidth}px`));
  }
});
test('read actions use the native underline source leaf with explicit host height and require that unresolved intrinsic input', () => {
  const data = featured(); data.description = { ...section('Description'), visible: true, readMoreVisible: true, readLessVisible: true };
  const html = render(PlayServerDetails, { ...detail(), featuredVisible: true, featured: data });
  const read = tags(html, 'data-play-target="button.description_read_toggle"'); assert.equal(read.length, 2);
  for (const tag of read) { assert.match(tag, /class="mc-play-server-read-button"/); assert.match(tag, /type="button"/); assert.match(tag, /data-resolved-height="12"/); assert.match(tag, /height:24px/); assert.ok(!tag.includes('mc-play-source-button') && !tag.includes('data-surface')); }
  assert.ok(html.includes('data-source-panel-height="100%c+3px"')); assert.ok(html.includes('mc-play-server-read-button__underline--default') && html.includes('mc-play-server-read-button__underline--focus'));
  delete data.description.readButtonHeight; assert.throws(() => render(PlayServerDetails, { ...detail(), featuredVisible: true, featured: data }), /description.readButtonHeight/);
});
test('source ignore flags preserve add-info selection100 and do not implicitly equate additional and featured families', () => {
  for (const ignoreAddServers of [false, true]) for (const ignoreThirdPartyServers of [false, true]) {
    const p = content(); Object.assign(p.visibility, { ignoreAddServers, ignoreThirdPartyServers }); const html = render(PlayServersContent, p);
    assert.equal(html.includes('data-server-id="featured-host"'), !ignoreThirdPartyServers);
    assert.equal(html.includes('data-server-id="additional-host"'), !ignoreAddServers && !ignoreThirdPartyServers);
    assert.equal(html.includes('Select add-server information'), !ignoreAddServers);
  }
});
test('explicit simultaneous notices and source opt-in/account actions retain independent visibility without running a service', () => {
  const p = content(); Object.assign(p.visibility, { crossPlatformDisabledVisible: true, internetConnectionVisible: true, multiplayerBlockedVisible: true, newUiSwitchVisible: true });
  p.newUiSwitch = { label: 'Host source opt-in', enabled: true };
  p.notices = { crossPlatform: { text: 'Cross-platform source text' }, internet: { text: 'Offline source text' }, blocked: { text: 'Blocked source text', action: { visible: true, label: 'Host account help', target: 'button.menu_open_uri', enabled: true } } };
  const html = render(PlayServersContent, p);
  for (const text of ['Cross-platform source text', 'Offline source text', 'Blocked source text', 'Host source opt-in']) assert.ok(html.includes(text));
  assert.ok(html.includes('button.switch_to_new_ui_servers')); assert.ok(html.includes('button.menu_open_uri')); assert.ok(!html.includes('<a '));
  p.visibility.featureServerMessageVisible = true; p.notices.featureMessage = { text: 'Host feature message', action: { visible: false, label: 'Hidden account action', target: 'button.open_account_setting_gamecore', enabled: true } };
  const changed = render(PlayServersContent, p); assert.match(changed, /class="mc-play-servers-content__split" hidden=""/); assert.ok(changed.includes('Host feature message')); assert.ok(!changed.includes('Hidden account action'));
});
test('disabled/readOnly guard every server action including joins, offers and edit without changing raw provider strings', () => {
  for (const prop of ['disabled', 'readOnly']) {
    const p = content(); p[prop] = true; p.additional[0].editVisible = true; p.details.featuredVisible = true; p.details.featured = { ...featured(), offersVisible: true };
    const html = render(PlayServersContent, p); const buttons = [...html.matchAll(/<button\b[^>]*>/g)].map(match => match[0]);
    assert.ok(buttons.length >= 6); assert.ok(buttons.every(button => button.includes('disabled=""'))); assert.ok(html.includes('0017'));
  }
});
test('missing visible dependencies, sparse dimensions and invalid flags fail clearly before any browser work', () => {
  for (const patch of [{ size: new Array(2) }, { scale: 1.5 }, { inputMode: 'auto' }, { loadingFrame: 10 }, { additionalVisible: 'false' }, { additional: undefined }, { featuredVisible: true }, { addVisible: true }]) assert.throws(() => render(PlayServerDetails, { ...detail(), ...patch }));
  const f = featured(); f.screenshots.visible = true; assert.throws(() => render(PlayServerDetails, { ...detail(), featuredVisible: true, featured: f }), /whole host source image/);
  for (const sourceSize of [new Array(2), [1, NaN], [0, 1]]) assert.throws(() => render(PlayServerRow, { kind: 'featured', item: { ...item(), screenshotVisible: true, screenshot: { src: 'host.png', sourceSize } }, width: 120, scale: 2, loadingLabel: 'load', loadingFrame: 0 }));
  const p = content(); p.visibility.featureServerMessageVisible = true; assert.throws(() => render(PlayServersContent, p), /featureMessage notice/);
});
test('real keyed React19 SSR leaves all actual refs/callbacks inert and schedules no DOM/network/clock work', () => {
  const warnings = [], previousError = console.error, originals = new Map(); let callbacks = 0;
  for (const key of ['fetch', 'Image', 'FontFace', 'createImageBitmap', 'OffscreenCanvas', 'XMLHttpRequest', 'ResizeObserver', 'MutationObserver', 'requestAnimationFrame', 'setTimeout', 'setInterval']) { originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: () => { throw Error(`Unexpected SSR ${key}`); } }); }
  console.error = (...args) => warnings.push(args);
  try { renderToStaticMarkup(React.createElement(PlayServersContent, { ...content(), key: 'real-react-key', ref: () => { callbacks++; return () => { callbacks++; }; }, onAction: () => { callbacks++; } })); } finally { console.error = previousError; for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } }
  assert.equal(callbacks, 0); assert.deepEqual(warnings, []);
});
test('existing actual React18 peer SSR supports the same public parts and keyed cleanup refs with no warnings', async t => {
  const packageFile = new URL('../.cache/consumer-react18/package.json', import.meta.url); let require;
  try { await readFile(packageFile, 'utf8'); require = createRequire(packageFile); } catch { t.skip('Existing React18 consumer absent; installing peers is owned by the package gate.'); return; }
  const R = require('react'), server = require('react-dom/server'); assert.match(R.version, /^18\./);
  const result = await build({ entryPoints: [entry], platform: 'node', format: 'cjs', bundle: true, write: false, jsx: 'automatic', target: 'es2022', define: { 'import.meta.url': JSON.stringify(pathToFileURL(entry).href) }, plugins: [{ name: 'actual-existing-peer18', setup(b) { b.onResolve({ filter: /^(react(?:\/jsx-runtime)?|react-dom)$/ }, args => ({ path: require.resolve(args.path), external: true })); } }] });
  const target = new URL(`peer18-${process.pid}.cjs`, cache); await writeFile(target, result.outputFiles[0].contents); const peers = require(fileURLToPath(target)), warnings = [], previousError = console.error; let refs = 0;
  console.error = (...args) => warnings.push(args);
  try { for (const [name, props] of [['PlayServersContent', content()], ['PlayServerDetails', detail()], ['PlayServerRow', { kind: 'additional', item: item(), width: 140, scale: 2, loadingLabel: 'load', loadingFrame: 0 }]]) { const html = server.renderToStaticMarkup(R.createElement(peers[name], { ...props, key: 'actual-18-key', ref: () => { refs++; } })); assert.ok(html.includes('classic-play')); } } finally { console.error = previousError; }
  assert.equal(refs, 0); assert.deepEqual(warnings, []);
});
test('source geometry and stylesheet assertions are bounded source contracts, not native or browser pixel certification', async () => {
  const raw = await readFile(new URL('../.cache/play-screen-source-20261102-01/original/resource_pack/ui/play_screen.json', import.meta.url));
  assert.equal(createHash('sha256').update(raw).digest('hex'), '10b1cab24aeee5cb5a875255bb6ffe266ca4056394c05f1c4d99b8cc56cf805a');
  const css = await readFile(new URL('../src/play-servers.css', import.meta.url), 'utf8');
  assert.ok(css.includes('@import \'./play-screen-parts.css\'')); assert.match(css, /__plane\{position:absolute;inset:0\}/); assert.ok(css.includes('40px * var(--mc-play-scale)'));
  assert.ok(css.includes('15px * var(--mc-play-scale)')); assert.ok(css.includes('30px * var(--mc-play-scale)')); assert.ok(!css.includes('linear-gradient') && !css.includes('border-radius:4'));
});
