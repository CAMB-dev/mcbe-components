import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Combobox } from '../src/combobox';
import { Switch } from '../src/components';
import { GuiIcon } from '../src/gui-icon';
import { DocumentHeading, DocumentParagraph, DocumentViewer } from '../src/document-viewer';
import type { DocumentGroup, DocumentTopic } from '../src/document-viewer';

const illustration = (name: string) => new URL(`../src/assets/document-viewer/${name}.png`, import.meta.url).href;
function Article({ title, paragraphs, image, height = 128 }: { title: string; paragraphs: readonly string[]; image?: string; height?: number }) {
  return <>
    <DocumentHeading>{title}</DocumentHeading>
    {paragraphs.map((paragraph, index) => <DocumentParagraph key={index} style={{ marginBottom: 'calc(var(--mc-document-unit) * 12)' }}>{paragraph}</DocumentParagraph>)}
    {image && <img src={illustration(image)} alt={title} draggable={false} style={{ display: 'block', width: '100%', height: `calc(var(--mc-document-unit) * ${height})`, marginTop: 'calc(var(--mc-document-unit) * 5)', imageRendering: 'pixelated' }}/>}
  </>;
}
const topic = (id: string, title: string, paragraphs: readonly string[], image?: string, height?: number): DocumentTopic => ({ id, title, content: <Article title={title} paragraphs={paragraphs} image={image} height={height}/> });

function sampleGroups(profile: string, input: string): readonly DocumentGroup[] {
  if (profile === 'encyclopedia') return [
    { id: 'overworld', label: 'Overworld A-Z', topics: [
      topic('nether-portals', 'Nether Portal', ['A Nether Portal allows you to travel to a different dimension.', 'If constructed correctly the Nether Portal can be lit and activated.', 'Example of a portal construction shown here:'], 'NetherPortal', 96),
      topic('scaffolding', 'Scaffolding', ['Scaffolding needs support. You can only place so many scaffolding horizontally without touching a different block. When you attempt to place too many scaffolding blocks without proper support, it will fall. Scaffolding can be placed like normal blocks, but it can also be placed on its own foundation to quickly build a tall tower.', 'When Scaffolding is broken it will also break every Scaffolding block that was being supported by that block. This allows you to quickly clear your scaffolding by breaking the supporting blocks!'], 'Scaffolding', 250),
    ] },
    { id: 'stands', label: 'Stands & Tables', topics: [
      topic('crafting-table', 'Crafting Table', ['The Crafting Table will let you craft more complicated recipes.', input === 'touch' ? 'Place it in the world, then tap the Crafting Table to use it.' : 'Place it in the world, then press your Use control on the Crafting Table to use it.']),
    ] },
  ];
  return [
    { id: 'started', label: 'Getting started', topics: [
      topic('selecting-items', 'Selecting items', ['Resources you pick up will appear in your hotbar, which you will find at the bottom of the screen.', input === 'touch' ? 'To hold an item in your hand, simply tap it in the hotbar.' : 'To hold an item in your hand, scroll the mouse wheel to select the item. You can also use a number key: 1 is the first hotbar slot and 9 is the last.'], input === 'touch' ? 'selecting_items_mobile' : 'selecting_items_desktop', 175),
      topic('inventory', 'Inventory', ['Your hotbar will fill up as you gather more resources. Your inventory has more space for everything you have collected.', input === 'touch' ? 'Tap the item of your choice, then tap the empty item slot where you would like to move it.' : 'Open your inventory, click the item of your choice, then drag it to the empty item slot where you would like to move it.'], input === 'touch' ? 'inventory_mobile' : 'inventory_desktop', 175),
    ] },
    { id: 'preparing', label: 'Preparing for the night', topics: [
      topic('first-craft', 'Your first craft', ['Use your collected materials to craft items. The recipe book helps you find available recipes.'], input === 'touch' ? 'first_craft_mobile' : 'first_craft_desktop', 175),
      topic('mining', 'Mining', ['Not all crafting materials are on the surface - some may require you to dig underground or into a mountain.'], 'mining', 200),
    ] },
    { id: 'night', label: 'Surviving the first Night', topics: [
      topic('shelter', 'Building a Shelter', ['When danger comes lurking, a sturdy shelter can protect you from the threats outside.', 'Building a shelter is critical to surviving your first night, and it does not have to be hard.', 'You can build one with anything from dirt to stone, or even close up a cave for a makeshift lodging!'], 'building_a_shelter', 200),
    ] },
  ];
}

export function DocumentViewerExamples() {
  const [profile, setProfile] = useState('how-to-play'), [input, setInput] = useState('keyboard');
  const [scale, setScale] = useState(2), [frame, setFrame] = useState('standard');
  const [value, setValue] = useState<string | null>('selecting-items'), [policy, setPolicy] = useState<'reset' | 'preserve'>('reset');
  const [accept, setAccept] = useState(true), [disabled, setDisabled] = useState(false), [hints, setHints] = useState(false);
  const [status, setStatus] = useState('Choose a topic. Arrow keys move focus; Enter or Space opens the article.');
  const navigationRef = useRef<HTMLDivElement>(null), contentRef = useRef<HTMLDivElement>(null);
  const size = (frame === 'wide' ? [512, 280] : [400, 300]) as readonly [number, number];
  return <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'end' }}>
      <Combobox label="Document profile" value={profile} options={[{ value: 'how-to-play', label: 'How to Play' }, { value: 'encyclopedia', label: 'Encyclopedia' }]} onValueChange={next => { setProfile(next); setValue(next === 'encyclopedia' ? 'nether-portals' : 'selecting-items'); }}/>
      <Combobox label="Document input" value={input} options={[{ value: 'keyboard', label: 'Keyboard' }, { value: 'touch', label: 'Touch content' }]} onValueChange={setInput}/>
      <Combobox label="Document scale" value={String(scale)} options={[1, 2, 3].map(n => ({ value: String(n), label: `${n}×` }))} onValueChange={next => setScale(Number(next))}/>
      <Combobox label="Document frame" value={frame} options={[{ value: 'standard', label: '400 × 300' }, { value: 'wide', label: '512 × 280' }]} onValueChange={setFrame}/>
      <Combobox label="Document scroll policy" value={policy} options={[{ value: 'reset', label: 'Reset article' }, { value: 'preserve', label: 'Remember each article' }]} onValueChange={next => setPolicy(next as typeof policy)}/>
      <Switch label="Accept document requests" checked={accept} onChange={event => setAccept(event.target.checked)}/>
      <Switch label="Disable document controls" checked={disabled} onChange={event => setDisabled(event.target.checked)}/>
      <Switch label="Show controller hints" checked={hints} onChange={event => setHints(event.target.checked)}/>
    </div>
    <div role="region" aria-label="Document viewer preview" tabIndex={0} style={{ maxWidth: '100%', minWidth: 0, overflowX: 'auto' }}>
      <DocumentViewer groups={sampleGroups(profile, input).map(group => ({ ...group, topics: group.topics.map(topic => ({ ...topic, sectionTitle: profile === 'how-to-play' ? `How to Play: ${topic.title}` : topic.title })) }))} label="Example documents" size={size} scale={scale} value={value} disabled={disabled} scrollPolicy={policy}
        navigationViewportRef={navigationRef} contentViewportRef={contentRef}
        previousHint={hints ? { label: 'Previous document', glyph: <GuiIcon name="gamepad-icon-left-bumper" style={{ width: 'calc(var(--mc-document-unit) * 27)', height: 'calc(var(--mc-document-unit) * 13)' } as CSSProperties}/>, description: 'Previous' } : undefined}
        nextHint={hints ? { label: 'Next document', glyph: <GuiIcon name="gamepad-icon-right-bumper" style={{ width: 'calc(var(--mc-document-unit) * 27)', height: 'calc(var(--mc-document-unit) * 13)' } as CSSProperties}/>, description: 'Next' } : undefined}
        onBack={() => setStatus('The host received a Back request.')}
        onValueChange={(id, detail) => { if (accept) setValue(id); setStatus(`${detail.reason}: ${id} · host ${accept ? 'accepted' : 'declined'}`); }}/>
    </div>
    <p role="status" aria-live="polite" style={{ margin: 0, fontSize: 12 }}>{status}</p>
    <p style={{ margin: 0, fontSize: 12 }}>Two sample topic sets reuse the same source frame, article headings and paragraphs. Original illustrations are retained. Your application supplies its topics, translations, current input bindings and navigation actions.</p>
    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 }}>{'<DocumentViewer groups={topics} label="How to Play" value={topicId}\n  onValueChange={setTopicId} size={[400, 300]} scale={2}/>\n// content: <DocumentHeading>…</DocumentHeading><DocumentParagraph>…</DocumentParagraph>'}</pre>
  </div>;
}
