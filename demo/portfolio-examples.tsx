import { useLayoutEffect, useRef, useState } from 'react';
import { Button, Switch } from '../src/components';
import { Combobox } from '../src/combobox';
import { Portfolio } from '../src/portfolio';
import type { PortfolioActionDetail, PortfolioBindings, PortfolioLabels, PortfolioLeaf, PortfolioSide } from '../src/portfolio';
import { PortfolioCaptionField, PortfolioPageTurnButton, PortfolioPhoto, PortfolioPickerItem } from '../src/portfolio-parts';
import type { PortfolioImageSource, PortfolioStateImages } from '../src/portfolio-parts';
import { PortfolioPicker } from '../src/portfolio-picker';
import type { PortfolioPickerActionDetail, PortfolioPickerRow } from '../src/portfolio-picker';

const thumbnail: PortfolioImageSource = {
  src: new URL('./assets/game-lists/default_world.png', import.meta.url).href,
  sourceSize: [128, 128], alt: 'Complete original sample world thumbnail',
};
// This original has a transparent centre. It is an explicit host choice, not
// the unresolved source $screenshot_frame_texture or an inferred native alias.
const frameMaterial: PortfolioImageSource = {
  src: new URL('../src/assets/document-viewer/focus_border_white.png', import.meta.url).href,
  sourceSize: [5, 5],
};
const dividerMaterial: PortfolioImageSource = {
  src: new URL('./screenshot-assets/white-candidate.png', import.meta.url).href,
  sourceSize: [15, 15],
};
const hostStateImages = (direction: 'left' | 'right'): PortfolioStateImages => ({
  normal: { src: new URL(`../src/assets/book/book_page${direction}_default.png`, import.meta.url).href, sourceSize: [24, 24] },
  hover: { src: new URL(`../src/assets/book/book_page${direction}_hover.png`, import.meta.url).href, sourceSize: [24, 24] },
  pressed: { src: new URL(`../src/assets/book/book_page${direction}_pressed.png`, import.meta.url).href, sourceSize: [24, 24] },
});
const previousMaterials = hostStateImages('left'), nextMaterials = hostStateImages('right');
const pageMaterials = { previous: previousMaterials, next: nextMaterials };
const labels: PortfolioLabels = {
  title: 'Portfolio sample', previous: 'Previous portfolio spread', next: 'Next portfolio spread', close: 'Close portfolio view',
  deleteLeft: 'Request delete left photo', deleteRight: 'Request delete right photo',
  convertLeft: 'Request convert left photo', convertRight: 'Request convert right photo',
  add: 'Add Photo', export: 'Export Portfolio', reader: 'Read portfolio content',
  captionLeft: 'Left photo caption', captionRight: 'Right photo caption', captionPlaceholder: 'Caption', noPhotos: 'No photos in this host selection.',
};
const initialBindings: PortfolioBindings = {
  viewing: true, picking: false, previousVisible: true, nextVisible: true,
  leftPhotoVisible: true, rightPhotoVisible: true, exportVisible: true, noPhotosAlertVisible: false,
};
const bindingLabels: Readonly<Record<keyof PortfolioBindings, string>> = {
  viewing: 'Portfolio viewing binding', picking: 'Portfolio picking binding', previousVisible: 'Show previous control', nextVisible: 'Show next control',
  leftPhotoVisible: 'Show left photo actions', rightPhotoVisible: 'Show right photo actions', exportVisible: 'Show export and reader controls', noPhotosAlertVisible: 'Show independent no-photos label',
};
const records: readonly PortfolioLeaf[] = Array.from({ length: 6 }, (_, index) => ({
  id: `photo-${index + 1}`, image: thumbnail, caption: `Sample photo ${index + 1}`, captionEnabled: true, captionColor: '#000', visible: true,
}));

/** Explicit application state only: no camera, filesystem, export or conversion service. */
export function PortfolioExamples() {
  const host = useRef<HTMLDivElement>(null), leftCaption = useRef<HTMLTextAreaElement>(null);
  const [availableWidth, setAvailableWidth] = useState(320), [scalePreference, setScalePreference] = useState('2');
  const [bindings, setBindings] = useState<PortfolioBindings>(initialBindings);
  const [acceptedLeaves, setAcceptedLeaves] = useState<readonly [PortfolioLeaf | null, PortfolioLeaf | null]>([records[0]!, records[1]!]);
  const [spread, setSpread] = useState(0), [leafMode, setLeafMode] = useState('two'), [columns, setColumns] = useState('2');
  const [pickInto, setPickInto] = useState<PortfolioSide>('left'), [inputMode, setInputMode] = useState<'mouse' | 'touch'>('mouse');
  const [acceptActions, setAcceptActions] = useState(false), [acceptCaptions, setAcceptCaptions] = useState(true);
  const [readOnly, setReadOnly] = useState(false), [disabled, setDisabled] = useState(false), [lockedCaptions, setLockedCaptions] = useState(false);
  const [pickerAlert, setPickerAlert] = useState(false), [dividers, setDividers] = useState(true), [touchThumb, setTouchThumb] = useState(false);
  const [showStandalonePicker, setShowStandalonePicker] = useState(true), [standaloneCaption, setStandaloneCaption] = useState('Reusable caption');
  const [status, setStatus] = useState('Choose a control. Requests are recorded; host action application starts off.');
  useLayoutEffect(() => {
    const node = host.current; if (!node) return;
    const measure = () => setAvailableWidth(Math.max(1, Math.floor(node.clientWidth)));
    measure(); const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(node); return () => observer?.disconnect();
  }, []);
  const scale = scalePreference === '2' && availableWidth >= 768 ? 2 : 1;
  // The host chooses 1x on narrow pages. A local scroller contains the nominal
  //320-unit content on even smaller hosts; the library does not shrink the GUI.
  const frameSize = [Math.max(320, Math.min(384, Math.floor(availableWidth / scale))), 250] as const;
  const leaves: readonly [PortfolioLeaf | null, PortfolioLeaf | null] = [0, 1].map(index => {
    const leaf = acceptedLeaves[index];
    if (!leaf || leafMode === 'empty' || leafMode === 'odd' && index === 1) return null;
    return { ...leaf, captionEnabled: !lockedCaptions, visible: leafMode !== 'hide-right' || index !== 1,
      image: leafMode === 'no-image-left' && index === 0 ? undefined : leaf.image };
  }) as unknown as readonly [PortfolioLeaf | null, PortfolioLeaf | null];
  const columnCount = Number(columns), rows: readonly PortfolioPickerRow[] = Array.from({ length: Math.ceil(records.length / columnCount) }, (_, row) => ({
    id: `row-${row}`, dividerVisible: dividers && row < Math.ceil(records.length / columnCount) - 1,
    cells: records.slice(row * columnCount, (row + 1) * columnCount).map(photo => ({ id: photo.id, label: `Choose ${photo.caption}`, image: photo.image, visible: true })),
  }));
  const pickerProps = {
    rows, frameMaterial, dividerMaterial, headerLabel: 'Photo inventory', headerHeight: 12,
    noPhotosAlertVisible: pickerAlert, emptyLabel: 'No inventory photos (host flag).',
    inputMode, touchThumbVisible: touchThumb, minThumbSize: 5,
  };
  const applyPick = (detail: PortfolioPickerActionDetail) => {
    if (detail.action !== 'pick') return;
    const photo = records.find(record => record.id === detail.itemId); if (!photo) return;
    // A host collection record has its own ID even when both leaves reuse one
    // underlying screenshot. Keep collection identities distinct explicitly.
    const picked = { ...photo, id: `picked-${pickInto}-${photo.id}` };
    setAcceptedLeaves(value => pickInto === 'left' ? [picked, value[1]] : [value[0], picked]);
    setLeafMode('two'); setBindings(value => ({ ...value, picking: false }));
  };
  const receive = (detail: PortfolioActionDetail) => {
    setStatus(`${detail.action} → ${detail.target}${detail.leaf ? ` · ${detail.leaf.id}` : ''} · ${acceptActions ? 'host applied a local state response' : 'host retained state'}.`);
    if (!acceptActions) return;
    if (detail.action === 'previous' || detail.action === 'next') {
      const next = Math.max(0, Math.min(2, spread + (detail.action === 'next' ? 1 : -1)));
      setSpread(next); setAcceptedLeaves([records[next * 2]!, records[next * 2 + 1]!]);
    } else if (detail.action === 'add') setBindings(value => ({ ...value, picking: true }));
    else if (detail.action === 'pick' && detail.pickerDetail) applyPick(detail.pickerDetail);
    else if (detail.action === 'close' || detail.action === 'escape') setBindings(value => ({ ...value, viewing: false, picking: false }));
    // Export, conversion, deletion and Reader deliberately have no service here.
  };
  const reset = () => {
    setBindings(initialBindings); setAcceptedLeaves([records[0]!, records[1]!]); setSpread(0); setLeafMode('two');
    setReadOnly(false); setDisabled(false); setLockedCaptions(false); setAcceptActions(false); setAcceptCaptions(true);
    setPickerAlert(false); setDividers(true); setColumns('2'); setInputMode('mouse'); setTouchThumb(false); setShowStandalonePicker(true);
    setStatus('The host restored its six sample records. No content was loaded or deleted.');
  };
  return <div data-demo-portfolio="examples" style={{ display: 'grid', gap: 16, minWidth: 0 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
      <Combobox label="Portfolio preview scale preference" value={scalePreference} onValueChange={setScalePreference} options={[{ value: '1', label: '1×' }, { value: '2', label: '2× when the host fits' }]}/>
      <Combobox label="Portfolio leaf data" value={leafMode} onValueChange={setLeafMode} options={[{ value: 'two', label: 'Two supplied photos' }, { value: 'odd', label: 'Left photo only' }, { value: 'empty', label: 'No supplied leaves' }, { value: 'hide-right', label: 'Hidden right photo' }, { value: 'no-image-left', label: 'Left photo without image' }]}/>
      <Combobox label="Picker column structure" value={columns} onValueChange={setColumns} options={[{ value: '1', label: 'One explicit column' }, { value: '2', label: 'Two explicit columns' }, { value: '3', label: 'Three explicit columns; fixed cells may clip' }]}/>
      <Combobox label="Picked photo destination" value={pickInto} onValueChange={value => { if (value === 'left' || value === 'right') setPickInto(value); }} options={[{ value: 'left', label: 'Left leaf' }, { value: 'right', label: 'Right leaf' }]}/>
      <Combobox label="Portfolio scrolling input" value={inputMode} onValueChange={value => { if (value === 'mouse' || value === 'touch') setInputMode(value); }} options={[{ value: 'mouse', label: 'Mouse' }, { value: 'touch', label: 'Touch' }]}/>
      <Switch label="Apply portfolio action requests" checked={acceptActions} onChange={event => setAcceptActions(event.target.checked)}/>
      <Switch label="Accept portfolio caption edits" checked={acceptCaptions} onChange={event => setAcceptCaptions(event.target.checked)}/>
      <Switch label="Read-only portfolio" checked={readOnly} onChange={event => setReadOnly(event.target.checked)}/>
      <Switch label="Disable portfolio" checked={disabled} onChange={event => setDisabled(event.target.checked)}/>
      <Switch label="Lock source caption controls" checked={lockedCaptions} onChange={event => setLockedCaptions(event.target.checked)}/>
      <Switch label="Show picker empty alert" checked={pickerAlert} onChange={event => setPickerAlert(event.target.checked)}/>
      <Switch label="Show picker row dividers" checked={dividers} onChange={event => setDividers(event.target.checked)}/>
      <Switch label="Show portfolio touch thumb" checked={touchThumb} onChange={event => setTouchThumb(event.target.checked)}/>
      {(Object.keys(bindingLabels) as (keyof PortfolioBindings)[]).map(key => <Switch key={key} label={bindingLabels[key]} checked={bindings[key]} onChange={event => setBindings(value => ({ ...value, [key]: event.target.checked }))}/>)}
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <Button onClick={() => setBindings(value => ({ ...value, viewing: true }))}>Reopen portfolio view</Button>
      <Button onClick={() => setBindings(value => ({ ...value, picking: true }))}>Open portfolio picker</Button>
      <Button disabled={disabled || !bindings.viewing || !leaves[0]?.visible} onClick={() => leftCaption.current?.focus()}>Focus left caption</Button>
      <Button onClick={reset}>Reset portfolio host state</Button>
    </div>
    <p style={{ margin: 0 }} data-portfolio-preview-scale={scale}>Actual preview scale: {scale}×. Host spread: {spread + 1}; viewing={String(bindings.viewing)}, picking={String(bindings.picking)}. Nominal content320×231, Reader size explicitly20×20.</p>
    <div ref={host} style={{ width: '100%', minWidth: 0, maxWidth: 840, overflowX: 'auto' }}>
      <Portfolio size={frameSize} layout={{ kind: 'nominal', readerButtonSize: [20, 20] }} scale={scale} labels={labels} bindings={bindings}
        leaves={leaves} pageLabels={[`Photo ${spread * 2 + 1}`, `Photo ${spread * 2 + 2}`]} frameMaterial={frameMaterial}
        pageMaterials={pageMaterials} convertMaterials={nextMaterials} picker={pickerProps} disabled={disabled} readOnly={readOnly} modal={false}
        captionRefs={{ left: leftCaption }} onAction={receive} onCaptionChange={(side, next, detail) => {
          setStatus(`Caption ${side} request ${JSON.stringify(next)} for ${detail.leaf.id} · ${acceptCaptions ? 'host accepted' : 'host declined'}.`);
          if (acceptCaptions) setAcceptedLeaves(value => side === 'left' ? [value[0] && { ...value[0], caption: next }, value[1]] : [value[0], value[1] && { ...value[1], caption: next }]);
        }}/>
    </div>
    <p role="status" aria-live="polite" style={{ margin: 0, overflowWrap: 'anywhere' }}>{status}</p>
    <p style={{ margin: 0, color: '#b3b5b7', fontSize: 12 }}>The six host records reuse one complete original thumbnail. This host alone applies optional navigation, picker selection and visibility changes. Viewing and picking remain independent; empty data does not set an alert. Export, delete, conversion and Reader actions only record requests.</p>
    <p style={{ margin: 0, color: '#b3b5b7', fontSize: 12 }}>Nine Portfolio arrow/conversion images are absent from the fixed pack. These controls use explicitly supplied complete Book arrows for this host preview; they are not the missing Portfolio artwork. The screenshot frame is the complete original transparent-centre focus image, not a recovered screenshot-frame binding. The divider uses the complete15×15 lowercase White candidate, including black texels; native uppercase White mapping is unknown.</p>
    <p style={{ margin: 0, color: '#b3b5b7', fontSize: 12 }}>This host chooses1× below768px and contains the nominal320-unit content in its local scroller. Reader size20, header height12, caption colorblack and nominal layout are explicit host resolutions. Native font, default anchors, %x/%cm/%sm evaluation, screenshot provider and full-page pixels remain unverified.</p>
    <h3 style={{ margin: 0 }}>Reusable photo and caption</h3>
    <div style={{ overflowX: 'auto', minWidth: 0, padding: 4 }}>
      <PortfolioPhoto image={thumbnail} frameMaterial={frameMaterial} scale={scale}
        caption={<PortfolioCaptionField label="Standalone portfolio caption" placeholder="Caption" value={standaloneCaption} textColor="#000" scale={scale}
          disabled={disabled || lockedCaptions} readOnly={readOnly} onValueChange={next => { setStatus(`Standalone caption request ${JSON.stringify(next)}.`); if (acceptCaptions) setStandaloneCaption(next); }}/>} />
    </div>
    <h3 style={{ margin: 0 }}>Reusable picker item and page button</h3>
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
      <PortfolioPickerItem itemId="independent-photo" label="Choose standalone sample photo" image={thumbnail} frameMaterial={frameMaterial} scale={scale}
        disabled={disabled} readOnly={readOnly} onPick={detail => setStatus(`${detail.target} · standalone ${detail.itemId}; host retained state.`)}/>
      <PortfolioPageTurnButton direction="next" label="Standalone next portfolio page" materials={nextMaterials} scale={scale} disabled={disabled} readOnly={readOnly}
        onTurn={detail => setStatus(`${detail.target} · standalone navigation request; host retained state.`)}/>
    </div>
    <h3 style={{ margin: 0 }}>Reusable photo picker</h3>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}><Button onClick={() => setShowStandalonePicker(true)}>Reopen standalone photo picker</Button></div>
    <div style={{ overflowX: 'auto', minWidth: 0 }}>
      <PortfolioPicker {...pickerProps} label="Standalone portfolio inventory" closeLabel="Close standalone photo picker" scale={scale} hidden={!showStandalonePicker}
        disabled={disabled} readOnly={readOnly} onAction={detail => {
          setStatus(`${detail.target}${detail.action === 'pick' ? ` · ${detail.rowId}/${detail.itemId}` : ''} · standalone host request.`);
          if (acceptActions) { if (detail.action === 'close') setShowStandalonePicker(false); else applyPick(detail); }
        }}/>
    </div>
  </div>;
}
