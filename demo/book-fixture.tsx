import { StrictMode, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { BookEditor, BookPage, BookPageTurnButton, BookReader } from '../src/book';
import type { BookDocumentSnapshot, BookFontMode, BookMode, BookNavigationControl, BookPageAction, BookSkinSources } from '../src/book';
import '../src/styles.css';
import '../src/fonts.css';
import '../src/book.css';

export interface BookQASettings {
  pages: string[]; readerPages: string[]; spreadIndex: number; readerSpread: number;
  title: string; author: string; mode: BookMode;
  acceptance: 'accept' | 'reject' | 'uppercase'; rejectNavigation: boolean; rejectMode: boolean;
  controlled: boolean; disabled: boolean; readOnly: boolean; actions: boolean;
  finalizeEnabled: boolean; authorEditable: boolean; showFirst: boolean; showSecond: boolean;
  scale: number; maxPageLength: number; maxTitleLength: number; standaloneText: string;
  stopCompositionPropagation: boolean; preventEscape: boolean;
  skinProbe: 'normal' | 'back-only' | 'crease-only' | 'cover-only' | 'crease-pattern';
  asyncNavigation: boolean;
  actionView: 'row' | 'edit';
  fontProbe: boolean; editorFontMode: BookFontMode; fontModeInput: 'scalar' | 'per-page';
  pageFontModes: Partial<Record<number, BookFontMode>>; pageStyleFamilies: Partial<Record<number, string>>;
  standaloneFontMode: BookFontMode; standaloneInputFamily?: string; standaloneReadOnly: boolean;
  trackFontCalls: boolean;
  hostNavigation: boolean; hostPreviousAvailable: boolean; hostNextAvailable: boolean;
  mutateNavigationSnapshot: boolean; preventHostTurn: boolean;
}
interface QAEvent { kind: string; value?: unknown; detail?: unknown }
interface BookQA {
  mounted: boolean; events: QAEvent[]; signs: BookDocumentSnapshot[]; finishes: BookDocumentSnapshot[];
  fontModeCalls: number[];
  configure: (patch: Partial<BookQASettings>) => void; unmount: () => void;
  refs: { editor: HTMLElement | null; reader: HTMLElement | null; page: HTMLDivElement | null; turn: HTMLButtonElement | null; title: HTMLInputElement | null; author: HTMLInputElement | null; standaloneTextarea: HTMLTextAreaElement | null; textareas: Map<number, HTMLTextAreaElement> };
}
declare global { interface Window { bookQA: BookQA } }
const qa: BookQA = { mounted: false, events: [], signs: [], finishes: [], fontModeCalls: [], configure: () => {}, unmount: () => {}, refs: { editor: null, reader: null, page: null, turn: null, title: null, author: null, standaloneTextarea: null, textareas: new Map() } };
window.bookQA = qa;
const initial: BookQASettings = {
  pages: ['Leaf one', 'Leaf two', 'Leaf three', 'Leaf four', 'Leaf five'], readerPages: ['Reader one', 'Reader two', 'Reader three'],
  spreadIndex: 0, readerSpread: 0, title: 'QA journal', author: 'Alex', mode: 'pages', acceptance: 'accept', rejectNavigation: false, rejectMode: false,
  controlled: true, disabled: false, readOnly: false, actions: false, finalizeEnabled: true, authorEditable: true, showFirst: true, showSecond: true,
  scale: 2, maxPageLength: 64, maxTitleLength: 16, standaloneText: 'Standalone',
  stopCompositionPropagation: false, preventEscape: false,
  skinProbe: 'normal', asyncNavigation: false,
  actionView: 'row',
  fontProbe: false, editorFontMode: 'auto', fontModeInput: 'scalar', pageFontModes: {}, pageStyleFamilies: {},
  standaloneFontMode: 'auto', standaloneReadOnly: false, trackFontCalls: false,
  hostNavigation: false, hostPreviousAvailable: false, hostNextAvailable: true,
  mutateNavigationSnapshot: false, preventHostTurn: false,
};
// Independent transparent whole PNGs, generated from zero RGBA bytes without
// Canvas2D; dimensions intentionally match the original sources they replace.
const clear = {
  back: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAYAAAByDd+UAAAAGklEQVR4Ae3BMQEAAADCIPunXglPYAAAAAcBDFwAAVU5HIYAAAAASUVORK5CYII=',
  spine: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAABCAYAAADjAO9DAAAACklEQVR4AWMgBAAAIQABluTOzgAAAABJRU5ErkJggg==',
  crease: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAG4AAAAOCAYAAADOrymhAAAAHElEQVR4Ae3BAQEAAACCoP6vdkjAAAAAAACAMwEYHgABDQtZKwAAAABJRU5ErkJggg==',
  edge: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAB4CAYAAACAcLCaAAAAKElEQVR4Ae3BAQEAAACCoP6vdkjAAAAAAAAAAAAAAAAAAAAAAAAA4EBLeAABUgoGJgAAAABJRU5ErkJggg==',
  hover: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAC0lEQVR4AWOgAgAAAEQAAZ+iuIQAAAAASUVORK5CYII=',
  turn: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAGElEQVR4Ae3BAQ0AAADCIPun/mYOYAAAXAkYAAHpgbOwAAAAAElFTkSuQmCC',
  close: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAAEElEQVR4AWMYBaNgFAwmAAADkwABsNU+9QAAAABJRU5ErkJggg==',
};
// Known nonuniform source texels [x,y*9,255-x,255] over the whole110x14 image.
// This isolates captured Book's nine-slice stretch contract, including its
// collapsed source middle row; it is synthetic test data, not game artwork.
const creasePattern = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAG4AAAAOCAYAAADOrymhAAAAq0lEQVR4Ae3BwQnAMAADMRnyyf4DX+coRBo1mUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPJZDKZTCaTyWQymUwmk8lkMplMJpPjen7ouJ4fOq7nh47r+aHjen7ouJ4fOq7nh47r+aHjen7ouJ4fOq7nh47r+aHjen7oA5Wgb6kAtSvFAAAAAElFTkSuQmCC';
function probeSkin(mode: BookQASettings['skinProbe']): Partial<BookSkinSources> | undefined {
  if (mode === 'normal') return undefined;
  const skin: Partial<BookSkinSources> = { background: clear.back, cover: clear.back, spine: clear.spine, creaseLeft: clear.crease, creaseRight: clear.crease,
    edgeLeft: clear.edge, edgeRight: clear.edge, hoverText: clear.hover, previous: [clear.turn, clear.turn, clear.turn], next: [clear.turn, clear.turn, clear.turn], close: [clear.close, clear.close, clear.close] };
  if (mode === 'back-only') delete skin.background;
  if (mode === 'cover-only') delete skin.cover;
  if (mode === 'crease-only') delete skin.creaseLeft;
  if (mode === 'crease-pattern') skin.creaseLeft = creasePattern;
  return skin;
}
function App() {
  const [settings, setSettings] = useState(initial);
  const editorRef = useRef<HTMLElement | null>(null);
  const readerRef = useRef<HTMLElement | null>(null);
  qa.configure = patch => setSettings(previous => ({ ...previous, ...patch }));
  const accepted = (text: string) => settings.acceptance === 'uppercase' ? text.toUpperCase() : text;
  const pageActions = (_index: number): Partial<Record<BookPageAction, boolean>> => ({ edit: settings.actionView === 'edit', 'insert-text-page': true, 'delete-page': true, 'move-page-left': true, 'move-page-right': true });
  const fontMode: BookFontMode | ((index: number) => BookFontMode) = settings.fontModeInput === 'scalar' ? settings.editorFontMode : index => {
    if (settings.trackFontCalls) qa.fontModeCalls.push(index);
    return settings.pageFontModes[index] ?? settings.editorFontMode;
  };
  const fontProbeStyle = settings.fontProbe ? { '--mc-font': 'monospace', '--mc-font-unicode': 'serif' } as CSSProperties : undefined;
  const navigation = (target: 'editor' | 'reader'): BookNavigationControl | undefined => settings.hostNavigation ? {
    previousAvailable: settings.hostPreviousAvailable, nextAvailable: settings.hostNextAvailable,
    onTurnRequest: (direction, snapshot, event) => {
      qa.events.push({ kind: 'host-turn', value: target, detail: { direction, snapshot: structuredClone(snapshot), eventType: event.type, buttonDirection: event.currentTarget.dataset.direction } });
      if (settings.mutateNavigationSnapshot) {
        Reflect.set(snapshot.pages, '0', 'Host mutated snapshot');
        snapshot.title = 'Host mutated title'; snapshot.spreadIndex = 99;
      }
    },
  } : undefined;
  const onFinish = (snapshot: BookDocumentSnapshot, detail: unknown) => { qa.finishes.push(structuredClone(snapshot)); qa.events.push({ kind: 'finish', value: snapshot, detail }); };
  qa.mounted = true;
  return <main data-skin-probe={settings.skinProbe} data-pages={JSON.stringify(settings.pages)}>
    <button id="focus-sink">Outside book</button>
    <section id="primary">
      {settings.showFirst && <BookEditor ref={node => { editorRef.current = node; qa.refs.editor = node; }} aria-label="QA editor"
        {...(settings.controlled ? { pages: settings.pages } : { defaultPages: settings.pages })}
        spreadIndex={settings.spreadIndex} title={settings.title} author={settings.author} mode={settings.mode}
        navigation={navigation('editor')}
        onClickCapture={event => { if (settings.preventHostTurn && event.target instanceof Element && event.target.closest('.mc-book__turn')) event.preventDefault(); }}
        layout={{ unitScale: settings.scale }} skin={probeSkin(settings.skinProbe)} disabled={settings.disabled} readOnly={settings.readOnly} style={fontProbeStyle}
        fontMode={fontMode}
        maxPageLength={settings.maxPageLength} maxTitleLength={settings.maxTitleLength}
        finalizeEnabled={settings.finalizeEnabled} authorEditable={settings.authorEditable}
        titleInputRef={node => { qa.refs.title = node; }} authorInputRef={node => { qa.refs.author = node; }}
        textareaProps={index => ({ 'aria-label': `Leaf ${index + 1}`,
          ...(settings.pageStyleFamilies[index] ? { style: { fontFamily: settings.pageStyleFamilies[index] } } : {}),
          onCompositionStart: event => { qa.events.push({ kind: 'composition-start', value: index }); if (settings.stopCompositionPropagation) event.stopPropagation(); },
          onCompositionEnd: event => { qa.events.push({ kind: 'composition-end', value: index }); if (settings.stopCompositionPropagation) event.stopPropagation(); },
          onKeyDown: event => { if (settings.preventEscape && event.key === 'Escape') event.preventDefault(); },
        })}
        textareaRef={index => node => { if (node) qa.refs.textareas.set(index, node); else qa.refs.textareas.delete(index); }}
        onPagesChange={(pages, detail) => {
          qa.events.push({ kind: 'pages', value: [...pages], detail: { reason: detail.reason, pageIndex: detail.pageIndex, eventType: detail.event.type } });
          if (settings.acceptance !== 'reject') setSettings(previous => ({ ...previous, pages: pages.map(accepted) }));
        }}
        onSpreadIndexChange={(spreadIndex, detail) => { qa.events.push({ kind: 'spread', value: spreadIndex, detail }); if (!settings.rejectNavigation) {
          const accept = () => setSettings(previous => ({ ...previous, spreadIndex }));
          if (settings.asyncNavigation) setTimeout(accept, 25); else accept();
        } }}
        onTitleChange={title => { qa.events.push({ kind: 'title', value: title }); if (settings.acceptance !== 'reject') setSettings(previous => ({ ...previous, title: accepted(title) })); }}
        onAuthorChange={author => { qa.events.push({ kind: 'author', value: author }); if (settings.acceptance !== 'reject') setSettings(previous => ({ ...previous, author: accepted(author) })); }}
        onModeChange={(mode, detail) => { qa.events.push({ kind: 'mode', value: mode, detail }); if (!settings.rejectMode) setSettings(previous => ({ ...previous, mode })); }}
        {...(settings.actions ? { pageActions, onPageAction: (action: BookPageAction, pageIndex: number) => qa.events.push({ kind: 'page-action', value: action, detail: pageIndex }) } : {})}
        onSign={snapshot => { qa.signs.push(structuredClone(snapshot)); qa.events.push({ kind: 'sign', value: snapshot }); }} onFinish={onFinish}/>}
    </section>
    <section id="secondary">{settings.showSecond && <BookReader ref={node => { readerRef.current = node; qa.refs.reader = node; }} aria-label="QA reader" style={fontProbeStyle} pages={settings.readerPages} spreadIndex={settings.readerSpread}
      navigation={navigation('reader')}
      onClickCapture={event => { if (settings.preventHostTurn && event.target instanceof Element && event.target.closest('.mc-book__turn')) event.preventDefault(); }}
      onSpreadIndexChange={readerSpread => setSettings(previous => ({ ...previous, readerSpread }))} onFinish={onFinish}/>}</section>
    {settings.skinProbe !== 'normal' && settings.skinProbe !== 'cover-only' && <section id="skin-probe"><BookReader pages={[]} skin={probeSkin(settings.skinProbe)} aria-label="Isolated skin reader"/></section>}
    <section id="standalone">
      <BookPage ref={node => { qa.refs.page = node; }} side="left" pageIndex={0} text={settings.standaloneText} readOnly={settings.standaloneReadOnly} pageNumber="Standalone page"
        fontMode={settings.standaloneFontMode} style={fontProbeStyle} textareaRef={node => { qa.refs.standaloneTextarea = node; }}
        textareaProps={{ 'aria-label': 'Standalone text', ...(settings.standaloneInputFamily ? { style: { fontFamily: settings.standaloneInputFamily } } : {}) }} onTextChange={standaloneText => { qa.events.push({ kind: 'standalone', value: standaloneText }); if (settings.acceptance !== 'reject') setSettings(previous => ({ ...previous, standaloneText })); }}/>
      <BookPageTurnButton ref={node => { qa.refs.turn = node; }} direction="next" aria-label="Standalone next" onClick={() => qa.events.push({ kind: 'standalone-turn' })}/>
      <BookPageTurnButton direction="previous" aria-label="Standalone previous"/>
    </section>
  </main>;
}
const root = createRoot(document.getElementById('book-root')!);
qa.unmount = () => { qa.mounted = false; root.unmount(); };
root.render(new URLSearchParams(location.search).has('strict') ? <StrictMode><App/></StrictMode> : <App/>);
