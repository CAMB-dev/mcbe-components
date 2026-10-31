import { useLayoutEffect, useRef, useState } from 'react';
import { Button, Switch } from '../src/components';
import { Combobox } from '../src/combobox';
import { GuiIcon } from '../src/gui-icon';
import { StorageManagement, StorageItemActions, StorageSelectionFooter } from '../src/storage-management';
import type { StorageActionControl, StorageActionDetail, StorageCategoryData, StorageControlState, StorageDependencyGroup, StorageItemData, StorageManagementValue, StorageMigrationCategoryData, StorageToolbarOptions } from '../src/storage-management';

const shown: StorageControlState = { included: true, visible: true, enabled: true };
const omitted: StorageControlState = { included: false, visible: false, enabled: false };
const action = (label: string, state = shown): StorageActionControl => ({ label, state });

export function StorageExamples() {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800), [scale, setScale] = useState(2);
  const [inputMode, setInputMode] = useState<'mouse' | 'touch'>('mouse');
  const [accept, setAccept] = useState(true), [disabled, setDisabled] = useState(false), [readOnly, setReadOnly] = useState(false);
  const [developer, setDeveloper] = useState(false), [migrations, setMigrations] = useState(false), [loading, setLoading] = useState(false);
  const [options, setOptions] = useState(true), [touchThumb, setTouchThumb] = useState(false);
  const [dependencyOpen, setDependencyOpen] = useState(false), [sharingOpen, setSharingOpen] = useState(false);
  const [progress, setProgress] = useState('0.4');
  const [value, setValue] = useState<StorageManagementValue>({ location: 'appdata', multiselect: false, expandedIds: ['resources'], selectedIds: [] });
  const [status, setStatus] = useState('Choose a category or item. Data and requests belong to this preview.');
  useLayoutEffect(() => {
    const node = host.current; if (!node) return;
    const measure = () => setWidth(Math.max(1, Math.floor(node.clientWidth)));
    measure(); const observer = new ResizeObserver(measure); observer.observe(node); return () => observer.disconnect();
  }, []);
  const size = [Math.max(154, Math.floor(width / scale)), 270] as const;
  const makeItem = (id: string, name: string, kind: StorageCategoryData['kind'], dependencies = false): StorageItemData => ({
    id, name, sizeText: '12.8 MB', state: shown, checkboxVisible: value.multiselect,
    optionsVisible: options && id === 'pack-landscape',
    imageContent: <GuiIcon name={kind === 'world' || kind === 'world-template' ? 'glyph-world-template' : kind === 'skin' ? 'glyph-skin-pack' : 'glyph-resource-pack'} scale={scale}/>,
    imageVisible: true, gameTypeText: 'Creative', dateText: '10/31/26',
    versionText: '1.0.0', versionVisible: true, description: 'A host-provided resource pack.',
    signals: dependencies ? { warning: true } : undefined,
    actions: { generateTextureList: action('Generate texture list', omitted), delete: action('Delete item'), share: action('Share item', omitted), dependencies: action('Show dependencies', dependencies ? shown : omitted) },
  });
  const pack = makeItem('pack-landscape', 'Landscape resources', 'resource', true);
  const companion = makeItem('pack-companion', 'Companion resources', 'resource', true);
  const categories: StorageCategoryData[] = [
    { id: 'worlds', kind: 'world', label: 'Worlds', sizeText: '32.0 MB', state: shown, items: [makeItem('world-workshop', 'Workshop world', 'world')] },
    { id: 'templates', kind: 'world-template', label: 'World templates', sizeText: '4.0 MB', state: shown, items: [makeItem('world-template', 'Starter template', 'world-template')] },
    { id: 'resources', kind: 'resource', label: 'Resource packs', sizeText: '25.6 MB', state: shown, signals: { warning: true }, items: [pack, companion] },
    { id: 'behavior', kind: 'behavior', label: 'Behavior packs', sizeText: '3.2 MB', state: shown, items: [makeItem('behavior-demo', 'Workshop behaviors', 'behavior', true)] },
    { id: 'skins', kind: 'skin', label: 'Skin packs', sizeText: '2.0 MB', state: shown, items: [makeItem('skin-demo', 'Demo skin pack', 'skin')] },
    { id: 'cache', kind: 'cache', label: 'Cached data', sizeText: '8.0 MB', state: shown, items: [makeItem('cache-demo', 'Cached resources', 'cache')] },
  ];
  const migration = <K extends 'legacy-world' | 'retail-to-preview-world',>(kind: K, id: string): StorageMigrationCategoryData & { kind: K } => ({
    id, kind, label: kind === 'legacy-world' ? 'Legacy worlds' : 'Retail worlds', sizeText: '0 MB',
    state: { ...shown, visible: migrations }, items: [],
    migration: { sync: action(kind === 'legacy-world' ? 'Import legacy worlds' : 'Copy retail worlds'), description: 'The application supplies available worlds and their conversion state.', conversionDescription: 'Conversion details are supplied by the application.', conversionVisible: !loading, loadingVisible: loading, loadingLabel: 'Finding worlds…', loadingFrame: 0 },
  });
  const toolbar: StorageToolbarOptions = {
    state: shown,
    location: { state: shown, label: 'File storage location', externalLabel: 'External', appdataLabel: 'Application' },
    clearCache: action('Clear marketplace cache'), clearLayoutCache: action('Clear layout cache'),
    clearDownloadCache: action('Clear download cache', developer ? shown : omitted),
    clearScreenshotsCache: action('Clear screenshots cache', developer ? shown : omitted),
    deleteLocalScreenshots: action('Delete local screenshots', developer ? shown : omitted),
    multiselect: { state: shown, label: 'Multiselect' },
  };
  const groups: StorageDependencyGroup[] = [0, 1].map(index => ({
    id: `dependency-${index}`, item: { ...pack, id: `dependency-pack-${index}` }, breakLabel: 'Removing this pack affects:',
    dependents: [0, 1, 2].map(child => ({ ...companion, id: `dependent-${index}-${child}`, name: `Dependent pack ${index + 1}.${child + 1}` })),
    remove: action('Remove dependencies'),
  }));
  const receive = (detail: StorageActionDetail) => {
    setStatus(`${detail.action}: ${accept ? 'requested' : 'declined'}${detail.itemId ? ` (${detail.itemId})` : ''}`);
    if (!accept) return;
    if (detail.action === 'show-dependencies') setDependencyOpen(true);
    if (detail.action === 'dependency-cancel' || detail.action === 'dependency-continue') setDependencyOpen(false);
    if (detail.action === 'sharing-button' || detail.action === 'sharing-cancel') setSharingOpen(false);
  };
  // These rectangles are supplied by the host demo. Their two upstream button bases are absent.
  const buttonWidth = (size[0] - 20) / 2;
  return <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
      <Combobox label="Storage GUI scale" value={String(scale)} onValueChange={v => setScale(Number(v))} options={[{ value: '1', label: '1×' }, { value: '2', label: '2×' }]}/>
      <Combobox label="Storage scrolling profile" value={inputMode} onValueChange={v => { if (v === 'mouse' || v === 'touch') setInputMode(v); }} options={[{ value: 'mouse', label: 'Mouse' }, { value: 'touch', label: 'Touch' }]}/>
      <Switch label="Accept storage changes" checked={accept} onChange={e => setAccept(e.target.checked)}/>
      <Switch label="Show pack action tray" checked={options} onChange={e => setOptions(e.target.checked)}/>
      <Switch label="Show developer cache controls" checked={developer} onChange={e => setDeveloper(e.target.checked)}/>
      <Switch label="Show migration branches" checked={migrations} onChange={e => setMigrations(e.target.checked)}/>
      <Switch label="Migration loading snapshot" checked={loading} onChange={e => setLoading(e.target.checked)}/>
      <Switch label="Show accepted touch thumb" checked={touchThumb} onChange={e => setTouchThumb(e.target.checked)}/>
      <Switch label="Read-only storage" checked={readOnly} onChange={e => setReadOnly(e.target.checked)}/>
      <Switch label="Disable storage controls" checked={disabled} onChange={e => setDisabled(e.target.checked)}/>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <Button disabled={disabled || readOnly} onClick={() => setDependencyOpen(true)}>Dependency dialog</Button>
      <Button disabled={disabled || readOnly || size[0] < 268} onClick={() => setSharingOpen(true)}>Sharing progress preview</Button>
      <Combobox label="Sharing progress fraction" value={progress} onValueChange={setProgress} options={[{ value: '0', label: '0%' }, { value: '0.4', label: '40%' }, { value: '1', label: '100%' }]}/>
    </div>
    <div ref={host} style={{ minWidth: 0, maxWidth: 840, position: 'relative' }}>
      <StorageManagement label="Storage contents" size={size} scale={scale} state={shown} standardVisible categoryPanelVisible
        toolbar={toolbar} categories={categories} value={value} inputMode={inputMode} touchThumbVisible={touchThumb}
        legacyWorlds={migration('legacy-world', 'legacy')}
        retailToPreviewWorlds={migration('retail-to-preview-world', 'retail')}
        deleteControl={action('Delete selected', { ...shown, enabled: value.selectedIds.length > 0 })} disabled={disabled} readOnly={readOnly}
        onValueChange={(next, detail) => { setStatus(`${detail.field}: ${accept ? 'accepted' : 'declined'}`); if (accept) setValue(next); }} onAction={receive}
        dependencyDialog={{ open: dependencyOpen, frame: size, profile: 'available-frame', title: 'Pack dependencies', description: 'Review dependent packs before continuing.', groups, inputMode, touchThumbVisible: touchThumb,
          continueScrollLabel: 'Scroll to continue', continueButton: { ...action('Continue'), target: 'host.storage.continue', rect: [0, 0, buttonWidth, 30] }, cancelButton: { ...action('Cancel'), target: 'host.storage.cancel', rect: [buttonWidth + 2, 0, buttonWidth, 30] } }}
        sharingProgress={{ open: sharingOpen, frame: size, title: 'Sharing', currentLabel: 'Preparing pack', totalLabel: '1 / 1', progressLabel: 'Sharing progress', progress: Number(progress), button: action('Cancel') }}/>
    </div>
    <p role="status" aria-live="polite" style={{ margin: 0, overflowWrap: 'anywhere' }}>{status}</p>
    <p style={{ margin: 0, color: '#b3b5b7', fontSize: 12 }}>The application supplies this Settings content frame, item data, capabilities and icon nodes. Header and categories share a scroll viewport; the selection footer stays outside it. Popup button rectangles are explicit demo inputs. Use 1× for the 268-unit progress popup on narrow previews.</p>
    <div style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
      <h3 style={{ margin: 0 }}>Reusable item actions and selection footer</h3>
      <div style={{ position: 'relative', width: '100%' }}><StorageItemActions width={200} itemId="standalone-item" controls={pack.actions} visible scale={1} onAction={receive}/></div>
      <StorageSelectionFooter visible deleteControl={action('Delete selected')} scale={1} onAction={receive}/>
    </div>
  </div>;
}
