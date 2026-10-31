import { StrictMode, createRef, useEffect, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Portfolio } from '../src/portfolio';
import type { PortfolioActionDetail, PortfolioBindings, PortfolioLabels, PortfolioLayoutResolution, PortfolioLeaf, PortfolioLeafCaptionDetail } from '../src/portfolio';
import { PortfolioPicker } from '../src/portfolio-picker';
import type { PortfolioPickerActionDetail, PortfolioPickerRow } from '../src/portfolio-picker';
import { PortfolioCaptionField, PortfolioPageTurnButton, PortfolioPhoto, PortfolioPickerItem } from '../src/portfolio-parts';
import type { PortfolioCaptionChangeDetail, PortfolioImageSource, PortfolioPickDetail, PortfolioStateImages } from '../src/portfolio-parts';
import '../src/styles.css';
import '../src/portfolio.css';
import '../src/portfolio-picker.css';
import '../src/portfolio-parts.css';
import '../src/portfolio-skin.css';
import '../src/fonts.css';

// Explicit host specimens. These are whole original Book controls, not the nine
// missing Portfolio images, and the whole lower-case White candidate is not a
// certified native alias or uniform texel. No fixture artwork is generated.
export const fixtureFrame: PortfolioImageSource = { src: new URL('./screenshot-assets/white-candidate.png', import.meta.url).href, sourceSize: [15, 15] };
export const fixtureImage: PortfolioImageSource = { src: new URL('./assets/game-lists/default_world.png', import.meta.url).href, sourceSize: [128, 128], alt: 'Whole original sample world' };
export const fixturePrevious: PortfolioStateImages = {
  normal: { src: new URL('../src/assets/book/book_pageleft_default.png', import.meta.url).href, sourceSize: [24, 24] },
  hover: { src: new URL('../src/assets/book/book_pageleft_hover.png', import.meta.url).href, sourceSize: [24, 24] },
  pressed: { src: new URL('../src/assets/book/book_pageleft_pressed.png', import.meta.url).href, sourceSize: [24, 24] },
};
export const fixtureNext: PortfolioStateImages = {
  normal: { src: new URL('../src/assets/book/book_pageright_default.png', import.meta.url).href, sourceSize: [24, 24] },
  hover: { src: new URL('../src/assets/book/book_pageright_hover.png', import.meta.url).href, sourceSize: [24, 24] },
  pressed: { src: new URL('../src/assets/book/book_pageright_pressed.png', import.meta.url).href, sourceSize: [24, 24] },
};
export const fixtureConvert: PortfolioStateImages = {
  normal: { src: new URL('../src/assets/book/book_edit_default.png', import.meta.url).href, sourceSize: [18, 16] },
  hover: { src: new URL('../src/assets/book/book_edit_hover.png', import.meta.url).href, sourceSize: [18, 16] },
  pressed: { src: new URL('../src/assets/book/book_edit_pressed.png', import.meta.url).href, sourceSize: [18, 16] },
};
export const fixtureLabels: PortfolioLabels = { title: 'Portfolio fixture', previous: 'Previous spread', next: 'Next spread', close: 'Close book', deleteLeft: 'Delete left photo', deleteRight: 'Delete right photo', convertLeft: 'Convert left photo', convertRight: 'Convert right photo', add: 'Add photo', export: 'Export portfolio', reader: 'Read portfolio', captionLeft: 'Left caption', captionRight: 'Right caption', captionPlaceholder: 'Caption placeholder', noPhotos: 'Independent no-photos alert' };
export const fixtureBindings: PortfolioBindings = { viewing: true, picking: false, previousVisible: true, nextVisible: true, leftPhotoVisible: true, rightPhotoVisible: true, exportVisible: true, noPhotosAlertVisible: false };
export const fixtureLeaves: readonly [PortfolioLeaf | null, PortfolioLeaf | null] = [{ id: '__proto__', image: fixtureImage, caption: 'Left accepted', captionEnabled: true, captionColor: '#336699', visible: true }, { id: 'constructor', image: fixtureImage, caption: 'Right accepted', captionEnabled: true, captionColor: '#663399', visible: true }];
export const fixtureRows: readonly PortfolioPickerRow[] = Array.from({ length: 5 }, (_, row) => ({ id: `row-${row}`, dividerVisible: row % 2 === 0, cells: Array.from({ length: row === 0 ? 1 : row === 1 ? 3 : 2 }, (_, column) => ({ id: row === 0 ? '__proto__' : row === 1 && column === 0 ? 'constructor' : `cell-${row}-${column}`, label: `Pick ${row}:${column}`, image: fixtureImage, visible: true })) }));
export interface PortfolioFixtureSettings {
  size: readonly [number, number]; scale: number; layout: PortfolioLayoutResolution; bindings: PortfolioBindings;
  leaves: readonly [PortfolioLeaf | null, PortfolioLeaf | null]; rows: readonly PortfolioPickerRow[];
  pageLabels: readonly [string, string]; disabled: boolean; readOnly: boolean; hidden: boolean; modal: boolean;
  accept: boolean; veto: string; standalone: boolean; standalonePicker: boolean; nested: boolean;
  inputMode: 'mouse' | 'touch'; thumb: boolean; pickerAlert: boolean; standaloneCaption: string; imageRevision: boolean;
}
const initial: PortfolioFixtureSettings = { size: [400, 260], scale: 1, layout: { kind: 'nominal', readerButtonSize: [20, 20] }, bindings: fixtureBindings, leaves: fixtureLeaves, rows: fixtureRows, pageLabels: ['Left caller label', 'Right caller label'], disabled: false, readOnly: false, hidden: false, modal: false, accept: true, veto: 'none', standalone: false, standalonePicker: false, nested: false, inputMode: 'mouse', thumb: false, pickerAlert: false, standaloneCaption: 'Standalone accepted', imageRevision: false };
const refs = { root: createRef<HTMLElement>(), left: createRef<HTMLTextAreaElement>(), right: createRef<HTMLTextAreaElement>(), viewport: createRef<HTMLDivElement>(), picker: createRef<HTMLDivElement>(), closePicker: createRef<HTMLButtonElement>(), pick: createRef<HTMLButtonElement>(), pickContainer: createRef<HTMLDivElement>(), caption: createRef<HTMLTextAreaElement>(), captionContainer: createRef<HTMLDivElement>(), photo: createRef<HTMLDivElement>(), turn: createRef<HTMLButtonElement>(), item: createRef<HTMLButtonElement>(), itemContainer: createRef<HTMLDivElement>() };
type Log = { kind: string; [key: string]: unknown };
interface QA { settings: PortfolioFixtureSettings; refs: typeof refs; events: Log[]; configure: (patch: Partial<PortfolioFixtureSettings>) => void; unmount: () => void; restoreMoved: () => void; documentVetoActive: boolean }
declare global { interface Window { portfolioInitial?: Partial<PortfolioFixtureSettings>; portfolioQA: QA } }
const root = createRoot(document.getElementById('root')!);
let moved: { node: HTMLElement; parent: Node; next: Node | null } | undefined;
const qa: QA = { settings: initial, refs, events: [], configure: () => {}, unmount: () => root.unmount(), documentVetoActive: false, restoreMoved: () => { if (moved) { moved.parent.insertBefore(moved.node, moved.next?.parentNode === moved.parent ? moved.next : null); moved = undefined; } } }; window.portfolioQA = qa;
function receipt(kind: string, detail: PortfolioActionDetail | PortfolioPickerActionDetail | PortfolioPickDetail) {
  const event = detail.event, d = detail as PortfolioActionDetail, p = detail as Extract<PortfolioPickerActionDetail, { action: 'pick' }>;
  const picked = d.pickerDetail?.action === 'pick' ? d.pickerDetail : p;
  const row: Log = { kind, action: 'action' in detail ? detail.action : 'pick', target: detail.target, side: d.side, id: d.leaf?.id ?? picked.itemId, rowId: picked.rowId, rowIndex: picked.rowIndex, columnIndex: picked.columnIndex, leaf: d.leaf, bindings: d.bindings, image: picked.image, current: event.currentTarget.tagName, controlSame: event.currentTarget === detail.control, connected: detail.control.isConnected, methods: [event.isDefaultPrevented(), event.isPropagationStopped()] };
  qa.events.push(row); queueMicrotask(() => { row.laterCurrent = event.currentTarget.tagName; });
}
function App() {
  const [s, set] = useState(() => ({ ...initial, ...window.portfolioInitial })); qa.settings = s; qa.configure = patch => set(old => ({ ...old, ...patch }));
  useEffect(() => {
    if (s.veto !== 'document') return;
    const doc = refs.root.current?.ownerDocument ?? document;
    const requestCount = () => qa.events.filter(event => ['action', 'peer', 'caption', 'standalone-caption', 'standalone-turn', 'standalone-item', 'standalone-picker'].includes(event.kind)).length;
    const nativeDocumentClick = (event: MouseEvent) => {
      const control = event.target instanceof Element ? event.target.closest('button') : null;
      const receipt: Log = { kind: 'document-click', controlId: control?.id || control?.getAttribute('data-portfolio-action'), trusted: event.isTrusted, cancelable: event.cancelable, before: event.defaultPrevented, requestsBefore: requestCount() };
      qa.events.push(receipt); event.preventDefault(); receipt.after = event.defaultPrevented;
      queueMicrotask(() => qa.events.push({ kind: 'document-microtask', prevented: event.defaultPrevented, requests: requestCount() }));
      // This timer is queued after the component's request timer. Reaching it
      // also passes the preceding request task's microtask checkpoint.
      const barrier = () => qa.events.push({ kind: 'document-task', prevented: event.defaultPrevented, requests: requestCount() });
      if (doc.defaultView) doc.defaultView.setTimeout(barrier, 0); else setTimeout(barrier, 0);
    };
    doc.addEventListener('click', nativeDocumentClick); qa.documentVetoActive = true;
    return () => { doc.removeEventListener('click', nativeDocumentClick); qa.documentVetoActive = false; };
  }, [s.veto]);
  const veto = (event: SyntheticEvent, level: string) => {
    if (level === 'leaf') qa.events.push({ kind: 'native-leaf', type: event.type, current: event.currentTarget.tagName });
    if (s.veto === level) event.preventDefault();
    if (s.veto === 'late-move' && level === 'parent' && (event.type === 'click' || event.type === 'change')) {
      const target = (event.target as HTMLElement).closest<HTMLElement>('button,textarea'), sink = document.getElementById('moved-control-sink');
      if (target?.parentNode && sink && target.closest('#portfolio')) { moved = { node: target, parent: target.parentNode, next: target.nextSibling }; sink.append(target); }
    }
    if (level === 'parent' && (event.type === 'click' || event.type === 'change') && s.veto.startsWith('late-')) flushSync(() => set(old => {
      if (s.veto === 'late-root-disabled') return { ...old, disabled: true };
      if (s.veto === 'late-root-hidden') return { ...old, hidden: true };
      if (s.veto === 'late-viewing') return { ...old, bindings: { ...old.bindings, viewing: false } };
      if (s.veto === 'late-action') return { ...old, bindings: { ...old.bindings, leftPhotoVisible: false, nextVisible: false, exportVisible: false } };
      if (s.veto === 'late-leaf-remove') return { ...old, leaves: [null, old.leaves[1]] as const };
      if (s.veto === 'late-leaf-id') return { ...old, leaves: [old.leaves[0] && { ...old.leaves[0], id: 'replacement' }, old.leaves[1]] as const };
      if (s.veto === 'late-leaf-hide' || s.veto === 'late-caption-lock') return { ...old, leaves: [old.leaves[0] && { ...old.leaves[0], visible: s.veto !== 'late-leaf-hide', captionEnabled: s.veto !== 'late-caption-lock' }, old.leaves[1]] as const };
      if (s.veto === 'late-pick-hide' || s.veto === 'late-pick-disabled') return { ...old, rows: old.rows.map(row => ({ ...row, cells: row.cells.map(cell => cell.id === '__proto__' ? { ...cell, visible: s.veto !== 'late-pick-hide', disabled: s.veto === 'late-pick-disabled' } : cell) })) };
      if (s.veto === 'late-row-remove') return { ...old, rows: old.rows.slice(1) };
      if (s.veto === 'late-row-id') return { ...old, rows: old.rows.map((row, index) => index === 0 ? { ...row, id: 'row-replaced' } : row) };
      if (s.veto === 'late-row-reorder') return { ...old, rows: [...old.rows].reverse() };
      return old;
    }));
    if (s.veto === 'unmount' && level === 'parent') root.unmount();
  };
  const caption = (side: 'left' | 'right', value: string, detail: PortfolioLeafCaptionDetail) => { qa.events.push({ kind: 'caption', side, value, current: detail.event.currentTarget.tagName, inputSame: detail.event.currentTarget === detail.input, id: detail.leaf.id, oldValue: detail.leaf.caption, bindings: detail.bindings }); if (s.accept) set(old => ({ ...old, leaves: old.leaves.map((leaf, i) => leaf && i === (side === 'left' ? 0 : 1) ? { ...leaf, caption: value } : leaf) as unknown as PortfolioFixtureSettings['leaves'] })); };
  const pickerProps = { rows: s.rows, frameMaterial: fixtureFrame, dividerMaterial: fixtureFrame, headerLabel: 'Inventory photos', headerHeight: 12, noPhotosAlertVisible: s.pickerAlert, emptyLabel: 'No inventory photos', closeLabel: 'Close picker', scrollLabel: 'Picker screenshot scroll', inputMode: s.inputMode, touchThumbVisible: s.thumb, viewportRef: refs.viewport, closeRef: refs.closePicker, itemRefs: { ['__proto__']: refs.pick }, itemContainerRefs: { ['__proto__']: refs.pickContainer }, closeProps: { onClick: (event: SyntheticEvent) => veto(event, 'leaf') } };
  const props = { size: s.size, scale: s.scale, layout: s.layout, bindings: s.bindings, leaves: s.leaves, pageLabels: s.pageLabels, labels: fixtureLabels, frameMaterial: fixtureFrame, pageMaterials: { previous: fixturePrevious, next: fixtureNext }, convertMaterials: fixtureConvert, picker: pickerProps, disabled: s.disabled, readOnly: s.readOnly, hidden: s.hidden, modal: s.modal, onClick: (event: SyntheticEvent) => veto(event, 'root'), onChange: (event: SyntheticEvent) => veto(event, 'root'), onKeyDown: (event: SyntheticEvent) => veto(event, 'root') };
  const leafClick = (event: SyntheticEvent) => veto(event, 'leaf');
  return <main id="portfolio-outer" onClick={event => veto(event, 'parent')} onChange={event => veto(event, 'parent')} onKeyDown={event => veto(event, 'parent')} ref={node => { if (node) { node.onclick = s.veto === 'native' ? event => event.preventDefault() : null; node.onchange = s.veto === 'native' ? event => event.preventDefault() : null; node.oninput = s.veto === 'native' ? event => event.preventDefault() : null; node.onbeforeinput = s.veto === 'native' ? event => { const receipt: Log = { kind: 'native-beforeinput', cancelable: event.cancelable, before: event.defaultPrevented }; qa.events.push(receipt); event.preventDefault(); receipt.after = event.defaultPrevented; } : null; node.onkeydown = s.veto === 'native' ? event => event.preventDefault() : null; } }}>
    <button id="portfolio-sink">Outside focus control</button><div id="moved-control-sink"/><div className="qa-pan"><div className="qa-host">
      <Portfolio {...props} id="portfolio" ref={refs.root} captionRefs={{ left: refs.left, right: refs.right }} captionProps={{ left: { onChange: event => veto(event, 'leaf'), onCompositionStart: () => qa.events.push({ kind: 'composition-start' }), onCompositionEnd: () => qa.events.push({ kind: 'composition-end' }) } }} buttonProps={{ previous: { onClick: leafClick }, next: { onClick: leafClick }, 'delete-left': { onClick: leafClick }, 'delete-right': { onClick: leafClick }, 'convert-left': { onClick: leafClick }, 'convert-right': { onClick: leafClick }, add: { onClick: leafClick }, export: { onClick: leafClick }, close: { onClick: leafClick }, reader: { onClick: leafClick } }} onCaptionChange={caption} onAction={detail => receipt('action', detail)} />
      {s.nested && <Portfolio {...props} id="portfolio-peer" modal={true} hidden={false} picker={{ ...pickerProps, viewportRef: undefined, closeRef: undefined, itemRefs: undefined, itemContainerRefs: undefined }} onAction={detail => receipt('peer', detail)} />}
      {s.standalonePicker && <PortfolioPicker {...pickerProps} id="standalone-picker" ref={refs.picker} disabled={s.disabled} readOnly={s.readOnly} scale={s.scale} onAction={detail => receipt('standalone-picker', detail)} />}
      {s.standalone && <div id="portfolio-parts"><PortfolioCaptionField id="standalone-caption" ref={refs.caption} containerRef={refs.captionContainer} scale={s.scale} label="Standalone caption" placeholder="Standalone placeholder" value={s.standaloneCaption} textColor="#224466" disabled={s.disabled} readOnly={s.readOnly} onValueChange={(value: string, detail: PortfolioCaptionChangeDetail) => { qa.events.push({ kind: 'standalone-caption', value, current: detail.event.currentTarget.tagName }); if (s.accept) set(old => ({ ...old, standaloneCaption: value })); }} /><PortfolioPhoto id="standalone-photo" ref={refs.photo} scale={s.scale} frameMaterial={fixtureFrame} image={s.imageRevision ? { ...fixtureImage, src: fixturePrevious.normal.src, sourceSize: [24, 24] } : fixtureImage} /><PortfolioPageTurnButton id="standalone-turn" ref={refs.turn} scale={s.scale} direction="next" label="Standalone next" materials={fixtureNext} disabled={s.disabled} readOnly={s.readOnly} onClick={leafClick} onTurn={detail => qa.events.push({ kind: 'standalone-turn', target: detail.target, current: detail.event.currentTarget.tagName })} /><PortfolioPickerItem id="standalone-item" ref={refs.item} containerRef={refs.itemContainer} scale={s.scale} itemId="standalone-item-id" label="Standalone pick" image={fixtureImage} frameMaterial={fixtureFrame} disabled={s.disabled} readOnly={s.readOnly} onClick={leafClick} onPick={detail => receipt('standalone-item', detail)} /></div>}
    </div></div><output>{JSON.stringify(s)}</output>
  </main>;
}
root.render(location.search.includes('strict') ? <StrictMode><App /></StrictMode> : <App />);
