import { useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Button, Combobox, Switch, TextField } from '../src';
import { BookEditor, BookPage, BookPageTurnButton, BookReader } from '../src/book';
import type { BookDocumentSnapshot, BookMode, BookPageAction } from '../src/book';
import '../src/book.css';

const initialPages = [
  'Day one\n\nA small path led from the village to the river. We marked the crossing with a lantern.',
  'Day two\n\nThe bridge is ready. Bring a few torches for the return journey.',
  'Day three\n\nLeave this last page open for the next adventure.',
];
const twoReaderPages = ['A quiet morning\n\nThe garden is ready for planting.', 'Before sunset\n\nRemember to close the gate.'];
const primitivePages = ['This leaf is a reusable BookPage. Try editing this short note.', 'The page-turn buttons are reusable too. Turn back to keep writing.'];
const stackStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16, minWidth: 0 };
const controlsStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 16, minWidth: 0 };
const previewStyle: CSSProperties = { minWidth: 0, maxWidth: '100%', overflowX: 'auto', padding: '8px 0', boxSizing: 'border-box' };
const noteStyle: CSSProperties = { margin: 0, fontSize: 12, overflowWrap: 'anywhere' };
const codeStyle: CSSProperties = { margin: 0, maxWidth: '100%', overflowX: 'auto', fontSize: 12, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' };
const lastSpread = (count: number) => Math.max(0, Math.ceil(count / 2) - 1);
const keepSpread = (index: number, count: number) => Math.max(0, Math.min(index, lastSpread(count)));
const copyDocument = (snapshot: BookDocumentSnapshot): BookDocumentSnapshot => ({ ...snapshot, pages: [...snapshot.pages] });

/** Plain sample text and ordinary collection edits belong to this demo host. */
export function BookExamples({ notify }: { notify: (message: string) => void }) {
  const prefix = `book-demo-${useId()}`;
  const [pages, setPages] = useState<string[]>(() => [...initialPages]);
  const [spread, setSpread] = useState(0), [title, setTitle] = useState('River journal'), [author, setAuthor] = useState('Alex');
  const [mode, setMode] = useState<BookMode>('pages');
  const [readOnly, setReadOnly] = useState(false), [disabled, setDisabled] = useState(false);
  const [pencilActions, setPencilActions] = useState(false);
  const [editorOpen, setEditorOpen] = useState(true), [readerOpen, setReaderOpen] = useState(true);
  const [readerPreset, setReaderPreset] = useState('three'), [readerSpread, setReaderSpread] = useState(0);
  const [signRequest, setSignRequest] = useState<BookDocumentSnapshot | null>(null);
  const [signedCopy, setSignedCopy] = useState<BookDocumentSnapshot | null>(null);
  const [receipt, setReceipt] = useState('Three editable leaves are ready. Turn to the final spread to see the blank right-hand page.');
  const [leafTexts, setLeafTexts] = useState<string[]>(() => [...primitivePages]), [leafIndex, setLeafIndex] = useState(0);
  const textareas = useRef(new Map<number, HTMLTextAreaElement>());
  const report = (message: string) => { setReceipt(message); notify(message); };
  const readerPages = readerPreset === 'empty' ? [] : readerPreset === 'two' ? twoReaderPages : readerPreset === 'signed' ? signedCopy?.pages ?? [] : initialPages;
  const readerTitle = readerPreset === 'signed' ? signedCopy?.title ?? '' : readerPreset === 'two' ? 'Garden notes' : 'River journal';
  const readerAuthor = readerPreset === 'signed' ? signedCopy?.author ?? '' : 'Alex';
  const currentSpread = keepSpread(spread, pages.length), currentReaderSpread = keepSpread(readerSpread, readerPages.length);
  const editable = !readOnly && !disabled;

  function acceptPages(next: readonly string[]) {
    setPages([...next]); setSpread(previous => keepSpread(previous, next.length)); setSignRequest(null);
  }
  function pageAction(action: BookPageAction, pageIndex: number) {
    if (!editable || pageIndex < 0 || pageIndex >= pages.length) return;
    if (action === 'edit') {
      textareas.current.get(pageIndex)?.focus();
      report(`Editing leaf ${pageIndex + 1}.`); return;
    }
    const next = [...pages];
    let selected = pageIndex;
    if (action === 'insert-text-page') { selected = pageIndex + 1; next.splice(selected, 0, ''); }
    else if (action === 'delete-page') { next.splice(pageIndex, 1); selected = Math.min(pageIndex, Math.max(0, next.length - 1)); }
    else {
      const destination = pageIndex + (action === 'move-page-left' ? -1 : 1);
      if (destination < 0 || destination >= next.length) return;
      [next[pageIndex], next[destination]] = [next[destination]!, next[pageIndex]!]; selected = destination;
    }
    acceptPages(next); setSpread(Math.floor(selected / 2));
    report(action === 'insert-text-page' ? `Inserted a blank leaf after leaf ${pageIndex + 1}.`
      : action === 'delete-page' ? `Deleted leaf ${pageIndex + 1}. ${next.length} leaves remain.`
        : `Moved leaf ${pageIndex + 1} to position ${selected + 1}.`);
  }
  function reset() {
    setPages([...initialPages]); setSpread(0); setTitle('River journal'); setAuthor('Alex'); setMode('pages');
    setReadOnly(false); setDisabled(false); setPencilActions(false); setEditorOpen(true); setReaderOpen(true); setReaderPreset('three'); setReaderSpread(0);
    setSignRequest(null); setSignedCopy(null); setLeafTexts([...primitivePages]); setLeafIndex(0);
    report('Book examples restored.');
  }
  function acceptSigning() {
    if (!signRequest || !editable) return;
    const accepted = copyDocument(signRequest);
    setSignedCopy(accepted); setSignRequest(null); setReadOnly(true); setMode('pages');
    setReaderPreset('signed'); setReaderSpread(0); setReaderOpen(true);
    report(`Accepted the signing request for “${accepted.title}” by ${accepted.author}. A read-only copy is shown in the reader.`);
  }

  return <section data-book-examples aria-label="Book reader and editor examples" style={{ ...stackStyle, padding: 16, gap: 32 }}>
    <div style={stackStyle}>
      <p style={noteStyle}>Read a two-page spread, write in a book and quill, or reuse the individual page and turn buttons. This demo keeps your edits in memory.</p>
      <div><Button size="sm" onClick={reset}>Reset book examples</Button></div>
    </div>

    <section data-book-reader-example aria-labelledby={`${prefix}-reader-title`} style={stackStyle}>
      <h3 id={`${prefix}-reader-title`} style={{ margin: 0 }}>Book reader</h3>
      <div style={controlsStyle}>
        <Combobox label="Reader sample" value={readerPreset} onValueChange={value => { setReaderPreset(value); setReaderSpread(0); setReaderOpen(true); }}
          options={[{ value: 'three', label: 'Three leaves · odd final spread' }, { value: 'two', label: 'Two leaves' }, { value: 'empty', label: 'Empty book' }, { value: 'signed', label: 'Accepted signed copy', disabled: !signedCopy }]}/>
        <Button size="sm" disabled={readerOpen} onClick={() => setReaderOpen(true)}>Open reader</Button>
      </div>
      <div role="region" aria-label="Book reader preview" tabIndex={0} style={previewStyle}>
        {readerOpen ? <BookReader aria-label="Example book reader" pages={readerPages} spreadIndex={currentReaderSpread}
          title={readerTitle} author={readerAuthor} onSpreadIndexChange={setReaderSpread}
          pageNumberLabel={(page, total) => `Page ${page} of ${total}`}
          onFinish={(_snapshot, detail) => { setReaderOpen(false); report(`Reader closed (${detail.reason}).`); }}/>
          : <p style={noteStyle}>The reader is closed. Open it to keep reading.</p>}
      </div>
      <p style={noteStyle} data-book-reader-position>{readerPages.length} leaves · spread {currentReaderSpread + 1} of {lastSpread(readerPages.length) + 1}. An odd last leaf leaves the right page blank.</p>
      <pre style={codeStyle}><code>{'<BookReader pages={pages} spreadIndex={spread}\n  onSpreadIndexChange={setSpread} />'}</code></pre>
    </section>

    <section data-book-editor-example aria-labelledby={`${prefix}-editor-title`} style={stackStyle}>
      <h3 id={`${prefix}-editor-title`} style={{ margin: 0 }}>Book and quill</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 16, minWidth: 0 }}>
        <TextField label="Book title" value={title} disabled={!editable} onChange={event => { setTitle(event.target.value); setSignRequest(null); }}/>
        <TextField label="Author" value={author} disabled={!editable} onChange={event => { setAuthor(event.target.value); setSignRequest(null); }}/>
        <Combobox label="Editor spread" value={String(currentSpread)} disabled={!editorOpen || disabled}
          options={Array.from({ length: lastSpread(pages.length) + 1 }, (_, index) => ({ value: String(index), label: pages.length ? `Leaves ${index * 2 + 1}–${Math.min(index * 2 + 2, pages.length)}` : 'Empty book' }))}
          onValueChange={value => setSpread(Number(value))}/>
      </div>
      <div style={controlsStyle}>
        <Combobox label="Page actions" value={pencilActions ? 'pencil' : 'row'} disabled={!editable}
          options={[{ value: 'row', label: 'Page action row' }, { value: 'pencil', label: 'Edit pencil' }]}
          onValueChange={value => setPencilActions(value === 'pencil')}/>
        <Switch label="Read-only editor" checked={readOnly} onChange={event => { setReadOnly(event.target.checked); setSignRequest(null); }}/>
        <Switch label="Disable editor" checked={disabled} onChange={event => setDisabled(event.target.checked)}/>
        <Button size="sm" disabled={editorOpen} onClick={() => setEditorOpen(true)}>Open editor</Button>
        <Button size="sm" disabled={!editable || !editorOpen || !pages.length || mode !== 'pages'} onClick={() => pageAction('edit', currentSpread * 2)}>Edit left leaf</Button>
        <Button size="sm" disabled={!editable} onClick={() => { const next = [...pages, '']; acceptPages(next); setSpread(lastSpread(next.length)); setEditorOpen(true); setMode('pages'); report(`Added leaf ${next.length}.`); }}>Add blank leaf</Button>
        <Button size="sm" disabled={!editable || !pages.length} onClick={() => { acceptPages([]); setMode('pages'); report('The draft is empty. Add a leaf to start writing again.'); }}>Empty draft</Button>
      </div>
      <div role="region" aria-label="Book editor preview" tabIndex={0} style={previewStyle}>
        {editorOpen ? <BookEditor aria-label="Example book and quill" pages={pages} spreadIndex={currentSpread}
          title={title} author={author} mode={mode} authorEditable readOnly={readOnly} disabled={disabled}
          onPagesChange={(next, detail) => { acceptPages(next); setReceipt(`Accepted text for leaf ${detail.pageIndex + 1}. ${next.length} leaves in this draft.`); }}
          onSpreadIndexChange={setSpread} onTitleChange={value => { setTitle(value); setSignRequest(null); }}
          onAuthorChange={value => { setAuthor(value); setSignRequest(null); }}
          onModeChange={(next, detail) => { setMode(next); report(detail.reason === 'sign-open' ? 'Signing cover opened. Check the title and author before sending a request.' : 'Returned to the draft.'); }}
          textareaProps={index => ({ 'aria-label': `Draft leaf ${index + 1}`, spellCheck: false })}
          textareaRef={index => node => { if (node) textareas.current.set(index, node); else textareas.current.delete(index); }}
          pageActions={index => ({ edit: editable && pencilActions, 'insert-text-page': editable, 'delete-page': editable, 'move-page-left': editable && index > 0, 'move-page-right': editable && index < pages.length - 1 })}
          onPageAction={pageAction} finalizeEnabled={editable && !!title.trim()}
          onSign={snapshot => { setSignRequest(copyDocument(snapshot)); report(`Signing requested for “${snapshot.title}”. Accept or dismiss the request below.`); }}
          onFinish={(_snapshot, detail) => { setEditorOpen(false); report(`Editor closed (${detail.reason}); the draft is kept.`); }}/>
          : <p style={noteStyle}>The editor is closed. Your draft is kept until Reset.</p>}
      </div>
      <p style={noteStyle} data-book-editor-position>{pages.length} leaves · spread {currentSpread + 1} · {mode === 'signing' ? 'signing cover' : 'pages'} · {disabled ? 'disabled' : readOnly ? 'read-only' : 'editable'}.</p>
      <p style={noteStyle}>The page toolbar edits this ordinary list: insert a blank leaf, delete, or move a leaf one position left or right. Signing sends a request; accepting it below creates a read-only demo copy.</p>
      {signRequest && <div data-book-sign-request style={stackStyle}>
        <p style={noteStyle}>Requested: “{signRequest.title}” · {signRequest.author} · {signRequest.pages.length} leaves.</p>
        <div style={controlsStyle}>
          <Button size="sm" variant="primary" disabled={!editable} onClick={acceptSigning}>Accept signing request</Button>
          <Button size="sm" onClick={() => { setSignRequest(null); setMode('pages'); report('Signing request dismissed. The draft remains editable.'); }}>Dismiss request</Button>
        </div>
      </div>}
      <output role="status" aria-label="Book action receipt" data-book-demo-receipt style={{ ...noteStyle, display: 'block' }}>{receipt}</output>
      <pre style={codeStyle}><code>{'<BookEditor pages={pages} onPagesChange={next => setPages([...next])}\n  title={title} onTitleChange={setTitle}\n  mode={mode} onModeChange={setMode}\n  onSign={snapshot => setSignRequest(snapshot)} />'}</code></pre>
    </section>

    <section data-book-primitives-example aria-labelledby={`${prefix}-primitives-title`} style={stackStyle}>
      <h3 id={`${prefix}-primitives-title`} style={{ margin: 0 }}>Reusable page and page-turn buttons</h3>
      <div role="region" aria-label="Reusable book page preview" tabIndex={0} style={previewStyle}>
        <div style={{ display: 'flex', alignItems: 'end', gap: 16, width: 'max-content' }}>
          <BookPage side={leafIndex === 0 ? 'left' : 'right'} pageIndex={leafIndex} text={leafTexts[leafIndex] ?? ''} readOnly={false}
            pageNumber={`Leaf ${leafIndex + 1} of ${leafTexts.length}`} textareaProps={{ 'aria-label': `Reusable leaf ${leafIndex + 1}`, spellCheck: false }}
            onTextChange={text => setLeafTexts(previous => previous.map((value, index) => index === leafIndex ? text : value))}/>
          <BookPageTurnButton style={{ position: 'static', flex: 'none' }} direction="previous" available={leafIndex > 0} aria-label="Previous reusable leaf" onClick={() => setLeafIndex(index => Math.max(0, index - 1))}/>
          <BookPageTurnButton style={{ position: 'static', flex: 'none' }} direction="next" available={leafIndex < leafTexts.length - 1} aria-label="Next reusable leaf" onClick={() => setLeafIndex(index => Math.min(leafTexts.length - 1, index + 1))}/>
        </div>
      </div>
      <pre style={codeStyle}><code>{'<BookPage side="left" text={text} readOnly={false}\n  onTextChange={setText} pageNumber="Leaf 1" />\n<BookPageTurnButton direction="next" available={hasNext}\n  onClick={nextLeaf} aria-label="Next leaf" />'}</code></pre>
    </section>
  </section>;
}
