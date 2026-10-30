import { StrictMode, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { DocumentViewer, DocumentHeading, DocumentParagraph } from '../src/document-viewer';
import '../src/styles.css';
import '../src/fonts.css';

type Props = ComponentProps<typeof DocumentViewer>;
export interface DocumentQASettings {
  size: readonly [number, number]; scale: number; controlled: boolean; value: string | null | undefined; defaultValue?: string | null;
  accept: boolean; disabled: boolean; empty: boolean; removeSelected: boolean; longLabels: boolean; scrollPolicy: NonNullable<Props['scrollPolicy']>;
  hints: boolean; skinOnly: boolean; preventKeys: string[]; preventCaptureKeys: string[]; show: boolean;
}
interface EventRecord { kind: string; value?: unknown; detail?: unknown }
interface QA {
  settings: DocumentQASettings; events: EventRecord[]; ref: HTMLElement | null; navigationRef: HTMLDivElement | null; contentRef: HTMLDivElement | null;
  topicRefs: Record<string, HTMLButtonElement | null>; configure(patch: Partial<DocumentQASettings>): void; unmount(): void;
}
declare global { interface Window { documentQA: QA; documentQAInitial?: Partial<DocumentQASettings> } }
const initial: DocumentQASettings = { size: [320, 240], scale: 1, controlled: true, value: 'intro', accept: true, disabled: false, empty: false, removeSelected: false, longLabels: false, scrollPolicy: 'reset', hints: true, skinOnly: false, preventKeys: [], preventCaptureKeys: [], show: true, ...window.documentQAInitial };
const events: EventRecord[] = [];
const info = (event: { type: string; defaultPrevented: boolean; currentTarget: EventTarget | null }) => ({ type: event.type, defaultPrevented: event.defaultPrevented, currentTarget: (event.currentTarget as HTMLElement | null)?.id });
const qa: QA = { settings: initial, events, ref: null, navigationRef: null, contentRef: null, topicRefs: {}, configure: () => {}, unmount: () => {} };
window.documentQA = qa;
const rootRef = (node: HTMLElement | null) => { qa.ref = node; };
const navRef = (node: HTMLDivElement | null) => { qa.navigationRef = node; };
const contentRef = (node: HTMLDivElement | null) => { qa.contentRef = node; };
const refs = Object.fromEntries(['intro', 'locked', 'second', ...Array.from({ length: 12 }, (_, i) => `extra-${i}`)].map(id => [id, (node: HTMLButtonElement | null) => { qa.topicRefs[id] = node; }]));
function article(name: string): ReactNode {
  return <><DocumentHeading data-testid="article-heading">{name} heading</DocumentHeading>
    <DocumentParagraph data-testid="article-paragraph">Selectable {name} documentation. Host text remains live and can wrap across multiple lines without becoming a canvas.</DocumentParagraph>
    <DocumentParagraph linePadding={6} data-testid="article-paragraph-six">Explicit six unit line padding.</DocumentParagraph>
    <input aria-label="Document editable note" defaultValue="abc" />
    <button onClick={() => events.push({ kind: 'article-action', value: name })}>Host article action</button>
    {Array.from({ length: 36 }, (_, i) => <DocumentParagraph key={i}>{name} paragraph {i}: selectable host content for independent scroll coverage.</DocumentParagraph>)}
  </>;
}
function App() {
  const [settings, setSettings] = useState(initial);
  qa.settings = settings; qa.configure = patch => setSettings(old => ({ ...old, ...patch })); qa.unmount = () => setSettings(old => ({ ...old, show: false }));
  const long = '很长的本地化分类与文章标题 Localized documentation title that wraps';
  const groups: Props['groups'] = settings.empty ? [] : [
    { id: 'basics', label: settings.longLabels ? long : 'Basics category', topics: [
      ...(!settings.removeSelected ? [{ id: 'intro', label: 'Introduction', title: settings.skinOnly ? '' : settings.longLabels ? long : 'Introduction', content: article('Introduction') }] : []),
      { id: 'locked', label: 'Locked topic', title: settings.skinOnly ? '' : 'Locked topic', content: article('Locked'), disabled: true },
      { id: 'second', label: 'Second article', title: settings.skinOnly ? '' : settings.longLabels ? long : 'Second article', sectionTitle: 'How to Play: Second article', content: article('Second'), showArrow: !settings.skinOnly },
    ] },
    { id: 'more', label: 'More category', topics: Array.from({ length: 12 }, (_, i) => ({ id: `extra-${i}`, title: `Extra topic ${i}`, content: article(`Extra ${i}`) })) },
  ];
  return <div className="document-qa-host">
    {settings.show && <DocumentViewer id="qa-document-viewer" ref={rootRef} label="Caller document viewer" size={settings.size} scale={settings.scale} groups={groups}
      {...(settings.controlled ? { value: settings.value } : { defaultValue: settings.defaultValue })}
      disabled={settings.disabled} scrollPolicy={settings.scrollPolicy} emptyContent={<p data-testid="empty-content">Host empty content</p>}
      previousHint={settings.hints ? { label: 'Previous document', glyph: 'LB', description: 'Caller previous description' } : undefined}
      nextHint={settings.hints ? { label: 'Next document', glyph: 'RB', description: 'Caller next description' } : undefined}
      navigationViewportRef={navRef} contentViewportRef={contentRef} topicRefs={refs}
      onValueChange={(value, detail) => { events.push({ kind: 'value', value, detail: { reason: detail.reason, event: info(detail.event) } }); if (settings.accept) setSettings(old => ({ ...old, value })); }}
      onBack={event => events.push({ kind: 'back', detail: info(event) })}
      onScrollPositionChange={(pane, position) => events.push({ kind: 'scroll', value: pane, detail: position })}
      onKeyDownCapture={event => { events.push({ kind: 'capture-key', value: event.key, detail: info(event) }); if (settings.preventCaptureKeys.includes(event.key)) event.preventDefault(); }}
      onKeyDown={event => { events.push({ kind: 'key', value: event.key, detail: info(event) }); if (settings.preventKeys.includes(event.key)) event.preventDefault(); }} />}
    <output aria-label="Document fixture status">{settings.value ?? 'none'}</output>
  </div>;
}
const root = createRoot(document.getElementById('document-qa-root')!);
root.render(new URLSearchParams(location.search).has('strict') ? <StrictMode><App /></StrictMode> : <App />);
