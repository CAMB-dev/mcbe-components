import { Component, StrictMode, createRef, useMemo, useState } from 'react';
import type { ErrorInfo, ReactNode, RefObject } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { BookEditor } from '../src/book';
import type { BookBodyRasterProfile, BookMode } from '../src/book';
import type { GuiTextFont } from '../src/gui-text-geometry';
import '../src/styles.css';

// Authored whole-cell test font, unrelated to the product's private fonts.
const atlas = document.createElement('canvas'); atlas.width = atlas.height = 256;
const context = atlas.getContext('2d')!; context.fillStyle = '#fff';
for (let c = 33; c < 127; c++) {
  const x = c % 16 * 16, y = Math.floor(c / 16) * 16;
  context.fillRect(x + 2, y + 2, 5 + c % 5, 5 + c % 8);
}
const sourceFont: GuiTextFont = { pages: [atlas.toDataURL()], pageSizes: [256], cellHeight: 16, lineHeight: 20,
  glyphs: Object.fromEntries(Array.from({ length: 95 }, (_, index) => {
    const c = index + 32;
    return [String.fromCharCode(c), { page: 0, x: c % 16 * 16, y: Math.floor(c / 16) * 16,
      width: c === 32 ? 0 : 16, height: c === 32 ? 0 : 16, advance: 12 }];
  })) };

export interface BookBodyConfiguration {
  enabled: boolean; mode: BookMode; readOnly: boolean; disabled: boolean; hidden: boolean; mounted: boolean;
  accept: boolean; pages: readonly string[]; spread: number; renderKey: number; fontUrl: string;
  missing: boolean; invalid: 'none' | 'frame' | 'rounding' | 'scale'; clipRounding: 'logical-stage-floor' | 'physical-floor';
  inputHeight?: number;
}
type BookId = 'a' | 'b';
interface BodyError { book: BookId; pageIndex: number; message: string }
interface InputEventLog { book: BookId; pageIndex: number; type: string; value: string }
interface BookBodyQA {
  configure(book: BookId, next: Partial<BookBodyConfiguration>): void;
  showSecond(value: boolean): void;
  readonly configurations: Record<BookId, BookBodyConfiguration>;
  readonly inputs: Record<BookId, readonly RefObject<HTMLTextAreaElement | null>[]>;
  readonly roots: Record<BookId, RefObject<HTMLElement | null>>;
  readonly changes: { book: BookId; pageIndex: number; pages: readonly string[] }[];
  readonly events: InputEventLog[];
  readonly errors: BodyError[];
  readonly boundaries: { book: BookId; message: string }[];
}
declare global { interface Window { bookBodyQA: BookBodyQA } }
const changes: BookBodyQA['changes'] = [], events: InputEventLog[] = [], errors: BodyError[] = [], boundaries: BookBodyQA['boundaries'] = [];
const configs = (): BookBodyConfiguration => ({ enabled: true, mode: 'pages', readOnly: false, disabled: false, hidden: false, mounted: true,
  accept: true, pages: ['Alpha body', 'Right body', 'Third body', 'Fourth body'], spread: 0, renderKey: 0,
  fontUrl: sourceFont.pages[0]!, missing: false, invalid: 'none', clipRounding: 'physical-floor' });
class Boundary extends Component<{ book: BookId; children: ReactNode }, { error: string | null }> {
  state: { error: string | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error: error.message }; }
  componentDidCatch(error: Error, _info: ErrorInfo) { boundaries.push({ book: this.props.book, message: error.message }); }
  render() { return this.state.error ? <p className="qa-boundary" role="alert">{this.state.error}</p> : this.props.children; }
}
function App() {
  const [configuration, setConfiguration] = useState<Record<BookId, BookBodyConfiguration>>({ a: configs(), b: configs() });
  const [second, setSecond] = useState(false);
  const inputs = useMemo(() => ({ a: Array.from({ length: 4 }, () => createRef<HTMLTextAreaElement>()), b: Array.from({ length: 4 }, () => createRef<HTMLTextAreaElement>()) }), []);
  const roots = useMemo(() => ({ a: createRef<HTMLElement>(), b: createRef<HTMLElement>() }), []);
  window.bookBodyQA = { configure(book, next) { flushSync(() => setConfiguration(previous => ({ ...previous, [book]: { ...previous[book], ...next } }))); },
    showSecond(value) { flushSync(() => setSecond(value)); }, configurations: configuration, inputs, roots, changes, events, errors, boundaries };
  const renderBook = (book: BookId) => {
    const value = configuration[book], glyphs = { ...sourceFont.glyphs }; if (value.missing) delete glyphs.Z;
    const profile: BookBodyRasterProfile = { mode: 'idle', frameSize: value.invalid === 'frame' ? [0, 600] : [900, 600], origin: [10.25, 10.25],
      renderKey: value.renderKey, font: { ...sourceFont, glyphs, pages: [value.fontUrl] },
      fontScale: value.invalid === 'scale' ? 0 : .5, sampling: 'point', shader: 'bitmap', paintOffset: [0, 1],
      clipRounding: value.invalid === 'rounding' ? 'invalid' as BookBodyRasterProfile['clipRounding'] : value.clipRounding };
    return <div className="qa-book-host" data-book={book} key={book}>
      {value.mounted && <Boundary book={book} key={`${book}:${value.invalid}`}><BookEditor ref={roots[book]} aria-label={`Book ${book}`} hidden={value.hidden}
        pages={value.pages} mode={value.mode} readOnly={value.readOnly} disabled={value.disabled} spreadIndex={value.spread}
        layout={{ unitScale: 2, bodyRaster: value.enabled ? profile : undefined }}
        textareaRef={index => inputs[book][index]} textareaProps={index => ({ 'aria-label': `${book} leaf ${index + 1}`, style: { height: value.inputHeight },
          onFocus: event => events.push({ book, pageIndex: index, type: 'focus', value: event.currentTarget.value }),
          onBlur: event => events.push({ book, pageIndex: index, type: 'blur', value: event.currentTarget.value }),
          onSelect: event => events.push({ book, pageIndex: index, type: 'select', value: event.currentTarget.value }),
          onScroll: event => events.push({ book, pageIndex: index, type: 'scroll', value: event.currentTarget.value }),
          onCompositionStart: event => events.push({ book, pageIndex: index, type: 'compositionstart', value: event.currentTarget.value }),
          onCompositionUpdate: event => events.push({ book, pageIndex: index, type: 'compositionupdate', value: event.currentTarget.value }),
          onCompositionEnd: event => events.push({ book, pageIndex: index, type: 'compositionend', value: event.currentTarget.value }),
        })}
        onPagesChange={(pages, detail) => {
          changes.push({ book, pageIndex: detail.pageIndex, pages: [...pages] });
          if (value.accept) setConfiguration(previous => ({ ...previous, [book]: { ...previous[book], pages: [...pages] } }));
        }}
        onModeChange={mode => setConfiguration(previous => ({ ...previous, [book]: { ...previous[book], mode } }))}
        onBodyRenderError={(error, pageIndex) => errors.push({ book, pageIndex, message: error.message })}/></Boundary>}
    </div>;
  };
  return <main><button id="outside">Outside book</button>{renderBook('a')}{second && renderBook('b')}
    <output aria-label="Accepted book values">{JSON.stringify(configuration)}</output></main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
