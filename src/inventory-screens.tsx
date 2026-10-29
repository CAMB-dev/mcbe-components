import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, KeyboardEvent, ReactNode, RefObject } from 'react';
import { InventoryGrid, ItemSlot, ResultSlot } from './inventory';
import type { InventoryItem, InventorySlotAction, ItemSlotProps } from './inventory';
import { WorkstationFrame } from './workstations';
import type { WorkstationFrameProps } from './workstations';
import { SearchField } from './settings-controls';
import type { SearchFieldProps } from './settings-controls';
import { ScrollArea } from './scroll-area';

export type ArmorSlotKind = 'helmet' | 'chestplate' | 'leggings' | 'boots' | 'offhand';
export interface ArmorSlotProps extends ItemSlotProps { kind: ArmorSlotKind }
export interface RecipeSearchProps extends Omit<SearchFieldProps, 'label'> {
  label?: ReactNode;
  showFilter?: boolean;
  craftableOnly?: boolean;
  defaultCraftableOnly?: boolean;
  onCraftableOnlyChange?: (craftableOnly: boolean) => void;
  filterLabel?: string;
}
export interface RecipeFilterToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'defaultValue' | 'onChange'> {
  craftableOnly?: boolean;
  defaultCraftableOnly?: boolean;
  onCraftableOnlyChange?: (craftableOnly: boolean) => void;
  label?: string;
  readOnly?: boolean;
}
export interface RecipeCategory { id: string; label: string; icon?: ReactNode; disabled?: boolean }
export interface RecipeCategoryTabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'defaultValue' | 'onChange'> {
  categories?: readonly RecipeCategory[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  label?: string;
  disabled?: boolean;
  panelId?: string;
}
export type InventoryLayout = 'creative' | 'recipe-book' | 'survival';
export interface InventoryToolbarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'defaultValue' | 'onChange'> {
  layouts?: readonly InventoryLayout[];
  showClose?: boolean;
  value?: InventoryLayout;
  defaultValue?: InventoryLayout;
  onValueChange?: (value: InventoryLayout) => void;
  onHelp?: () => void;
  onClose?: () => void;
  disabled?: boolean;
  label?: string;
  modeLabels?: Partial<Record<InventoryLayout, string>>;
  helpLabel?: string;
  closeLabel?: string;
}
export interface PlayerInventoryScreenProps extends Omit<WorkstationFrameProps, 'children' | 'title'> {
  title?: string;
  armor?: readonly [InventoryItem | null, InventoryItem | null, InventoryItem | null, InventoryItem | null];
  offhand?: InventoryItem | null;
  crafting?: readonly (InventoryItem | null)[];
  result?: InventoryItem | null;
  playerPreview?: ReactNode;
  playerPreviewLabel?: string;
  onArmorAction?: (kind: ArmorSlotKind, action: InventorySlotAction) => void;
  onCraftingAction?: (index: number, action: InventorySlotAction) => void;
  onTakeResult?: (action: InventorySlotAction) => void;
}
export interface CreativeInventoryProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'title'> {
  title?: string;
  /** Full native toolbar is the default; none exposes only the reusable pane. */
  chrome?: 'full' | 'none';
  layout?: InventoryLayout;
  defaultLayout?: InventoryLayout;
  /** Host switches game inventory modes; the current pane does not invent inventory data. */
  onLayoutChange?: (layout: InventoryLayout) => void;
  onHelp?: () => void;
  helpLabel?: string;
  categories?: readonly RecipeCategory[];
  categoryId?: string;
  defaultCategoryId?: string;
  onCategoryChange?: (id: string) => void;
  /** Caller supplies the item collection for the current category. */
  items: readonly InventoryItem[];
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  hotbar?: readonly (InventoryItem | null)[];
  /** Index always refers to the original items array, including after search. */
  onItemAction?: (index: number, action: InventorySlotAction) => void;
  onHotbarAction?: (index: number, action: InventorySlotAction) => void;
  onClose?: () => void;
  closeLabel?: string;
}

const cx = (...values: (string | false | undefined)[]) => values.filter(Boolean).join(' ');
const defaultCategories: readonly RecipeCategory[] = [
  { id: 'construction', label: 'Construction' }, { id: 'equipment', label: 'Equipment' },
  { id: 'items', label: 'Items' }, { id: 'nature', label: 'Nature' }, { id: 'search', label: 'Search' },
];
const armorKinds: readonly ArmorSlotKind[] = ['helmet', 'chestplate', 'leggings', 'boots'];
const inventoryLayouts: readonly InventoryLayout[] = ['creative', 'recipe-book', 'survival'];
const layoutLabels: Record<InventoryLayout, string> = { creative: 'Creative layout', 'recipe-book': 'Recipe book layout', survival: 'Survival inventory layout' };

/** Source toolbar stack: conditional layouts/close, help, and the native 21x21 close hit target. */
export const InventoryToolbar = forwardRef<HTMLDivElement, InventoryToolbarProps>(function InventoryToolbar({
  layouts = inventoryLayouts, showClose = true, value, defaultValue = 'creative', onValueChange, onHelp, onClose, disabled, label = 'Inventory toolbar', modeLabels,
  helpLabel = 'How to play', closeLabel = 'Close inventory', className, style, onKeyDown, ...props
}, ref) {
  const visibleLayouts = Array.from(new Set(layouts)).filter(layout => inventoryLayouts.includes(layout));
  const [internal, setInternal] = useState(defaultValue), selected = value ?? (visibleLayouts.includes(internal) ? internal : visibleLayouts[0]);
  const [focused, setFocused] = useState<string>(selected ?? 'help');
  const controls: string[] = [...visibleLayouts, 'help', ...(showClose ? ['close'] : [])];
  const tabStop = controls.includes(focused) ? focused : selected && controls.includes(selected) ? selected : controls[0];
  const buttons = useRef(new Map<string, HTMLButtonElement>()), removedFocus = useRef<string | null>(null);
  const remember = (id: string, node: HTMLButtonElement | null) => {
    if (node) buttons.current.set(id, node);
    else {
      const previous = buttons.current.get(id);
      if (previous && previous.ownerDocument.activeElement === previous) removedFocus.current = id;
      buttons.current.delete(id);
    }
  };
  useEffect(() => {
    const removed = removedFocus.current; removedFocus.current = null;
    if (removed && !disabled && !controls.includes(removed) && tabStop) buttons.current.get(tabStop)?.focus();
  });
  // Source stack: 8g left; creative 25g+2g; recipe book 25g+1g; survival 25g;
  // then 4g gap, 15g help, conditional 15g close, and 6g right padding.
  let cursor = 16;
  const positions = new Map<InventoryLayout, number>();
  for (const layout of visibleLayouts) { positions.set(layout, cursor); cursor += 50 + (layout === 'creative' ? 4 : layout === 'recipe-book' ? 2 : 0); }
  const helpLeft = cursor + 8, width = helpLeft + 30 + (showClose ? 30 : 0) + 12;
  return <div {...props} ref={ref} role="toolbar" aria-label={label} className={cx('mc-inventory-toolbar', className)}
    style={{ '--mc-inventory-toolbar-width': `${width}px`, '--mc-inventory-toolbar-help-left': `${helpLeft}px`, '--mc-inventory-toolbar-close-left': `${helpLeft + 24}px`, ...style } as CSSProperties}
    onKeyDown={event => {
      onKeyDown?.(event); if (disabled || event.defaultPrevented || event.nativeEvent.isComposing || !(event.target instanceof HTMLButtonElement)) return;
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      const index = buttons.indexOf(event.target); if (index < 0) return;
      const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
      const previous = rtl ? 'ArrowRight' : 'ArrowLeft', next = rtl ? 'ArrowLeft' : 'ArrowRight';
      if (![previous, next, 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); const target = event.key === 'Home' ? buttons[0] : event.key === 'End' ? buttons.at(-1) : buttons[(index + (event.key === next ? 1 : -1) + buttons.length) % buttons.length]; target?.focus();
    }}>
    {visibleLayouts.map(layout => <button ref={node => remember(layout, node)} key={layout} type="button" data-layout={layout} data-toolbar-control={layout} style={{ left: positions.get(layout) }}
      className="mc-inventory-toolbar__mode" aria-label={modeLabels?.[layout] ?? layoutLabels[layout]} aria-pressed={selected === layout}
      disabled={disabled} tabIndex={!disabled && tabStop === layout ? 0 : -1} onFocus={() => setFocused(layout)} onClick={() => {
        if (value === undefined) setInternal(layout); onValueChange?.(layout);
      }}><span aria-hidden="true" className={`mc-inventory-toolbar__icon mc-inventory-toolbar__icon--${layout}`}/></button>)}
    <button ref={node => remember('help', node)} type="button" className="mc-inventory-toolbar__help" aria-label={helpLabel} disabled={disabled} data-toolbar-control="help"
      tabIndex={!disabled && tabStop === 'help' ? 0 : -1} onFocus={() => setFocused('help')} onClick={onHelp}/>
    {showClose && <button ref={node => remember('close', node)} type="button" className="mc-inventory-toolbar__close" aria-label={closeLabel} disabled={disabled} data-toolbar-control="close"
      tabIndex={!disabled && tabStop === 'close' ? 0 : -1} onFocus={() => setFocused('close')} onClick={onClose}><span aria-hidden="true"/></button>}
  </div>;
});

/** Native 16x16 empty equipment overlays are hidden whenever ItemSlot is occupied. */
export const ArmorSlot = forwardRef<HTMLButtonElement, ArmorSlotProps>(function ArmorSlot({
  kind, label, item, image, children, count, underlay, className, ...props
}, ref) {
  const suppliedCount = count ?? item?.count;
  const amount = suppliedCount === undefined ? undefined : Number.isFinite(suppliedCount) ? Math.max(0, Math.floor(suppliedCount)) : 0;
  const occupied = amount !== 0 && !!(item || image?.trim() || children);
  return <ItemSlot {...props} ref={ref} item={item} image={image} count={count} label={label ?? kind}
    data-kind={kind} className={cx('mc-armor-slot', className)}
    underlay={<>{!occupied && <span className={`mc-armor-slot__overlay mc-armor-slot__overlay--${kind}`}/>} {underlay}</>}>
    {children}
  </ItemSlot>;
});

function useRecipeFilterState(craftableOnly: boolean | undefined, defaultCraftableOnly: boolean, button: RefObject<HTMLButtonElement | null>, visible = true) {
  const [internal, setInternal] = useState(defaultCraftableOnly);
  const selected = craftableOnly ?? internal;
  const resetState = useRef(() => {});
  resetState.current = () => { if (craftableOnly === undefined) setInternal(defaultCraftableOnly); };
  useEffect(() => {
    const doc = button.current?.ownerDocument; if (!doc) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const reset = (event: Event) => {
      if (event.target !== button.current?.form) return;
      const timer = setTimeout(() => { timers.delete(timer); if (!event.defaultPrevented) resetState.current(); }, 0); timers.add(timer);
    };
    doc.addEventListener('reset', reset, true);
    return () => { doc.removeEventListener('reset', reset, true); for (const timer of timers) clearTimeout(timer); };
  }, [button, visible]);
  return { selected, setInternal };
}

/** Original 29x17 craftable-only toggle; inventory filtering remains host-owned. */
export const RecipeFilterToggle = forwardRef<HTMLButtonElement, RecipeFilterToggleProps>(function RecipeFilterToggle({
  craftableOnly, defaultCraftableOnly = false, onCraftableOnlyChange, label = 'Craftable recipes only',
  disabled, readOnly, className, onClick, ...props
}, ref) {
  const button = useRef<HTMLButtonElement>(null);
  const { selected, setInternal } = useRecipeFilterState(craftableOnly, defaultCraftableOnly, button);
  return <button {...props} ref={node => { button.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }}
    type="button" className={cx('mc-recipe-filter-toggle', className)} aria-label={props['aria-label'] ?? label}
    aria-pressed={selected} disabled={disabled || readOnly} onClick={event => {
      onClick?.(event); if (event.defaultPrevented || disabled || readOnly) return;
      if (craftableOnly === undefined) setInternal(!selected); onCraftableOnlyChange?.(!selected);
    }}/>;
});

/** Source search edit-box and source craftable-only toggle; filtering is host-owned. */
export const RecipeSearch = forwardRef<HTMLInputElement, RecipeSearchProps>(function RecipeSearch({
  label = 'Search recipes', showFilter = true, craftableOnly, defaultCraftableOnly = false, onCraftableOnlyChange,
  filterLabel = 'Craftable recipes only', disabled, readOnly, className, maxLength = 30, ...props
}, ref) {
  const button = useRef<HTMLButtonElement>(null);
  const { selected, setInternal } = useRecipeFilterState(craftableOnly, defaultCraftableOnly, button, showFilter);
  return <div className={cx('mc-recipe-search', className)}>
    <SearchField {...props} ref={ref} label={label} disabled={disabled} readOnly={readOnly} maxLength={maxLength} className="mc-recipe-search__field"/>
    {showFilter && <RecipeFilterToggle ref={button} className="mc-recipe-search__filter" label={filterLabel}
      craftableOnly={selected} disabled={disabled} readOnly={readOnly} onCraftableOnlyChange={next => {
        if (craftableOnly === undefined) setInternal(next); onCraftableOnlyChange?.(next);
      }}/>}
  </div>;
});

/** Original top-tab PNG variants. Arrow/Home/End keys activate enabled categories. */
export const RecipeCategoryTabs = forwardRef<HTMLDivElement, RecipeCategoryTabsProps>(function RecipeCategoryTabs({
  categories = defaultCategories, value, defaultValue, onValueChange, label = 'Recipe categories', disabled, panelId,
  className, id: givenId, onKeyDown, ...props
}, ref) {
  const generatedId = useId(), id = givenId ?? generatedId;
  const enabled = categories.filter(category => !disabled && !category.disabled);
  const [internal, setInternal] = useState(defaultValue ?? enabled[0]?.id ?? '');
  const selected = value ?? (categories.some(category => category.id === internal) ? internal : enabled[0]?.id ?? '');
  const [focused, setFocused] = useState(selected);
  const tabStop = enabled.some(category => category.id === focused) ? focused : enabled.some(category => category.id === selected) ? selected : enabled[0]?.id;
  const select = (id: string) => { if (value === undefined) setInternal(id); onValueChange?.(id); };
  return <div {...props} ref={ref} id={id} className={cx('mc-recipe-categories', className)} role="tablist" aria-label={label} aria-orientation="horizontal"
    onKeyDown={event => {
      onKeyDown?.(event); if (event.defaultPrevented || event.nativeEvent.isComposing || !(event.target instanceof HTMLElement)) return;
      const current = event.target.dataset.category; if (!current) return;
      const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
      const previous = rtl ? 'ArrowRight' : 'ArrowLeft', next = rtl ? 'ArrowLeft' : 'ArrowRight';
      if (![previous, next, 'Home', 'End'].includes(event.key) || !enabled.length) return;
      event.preventDefault();
      const index = enabled.findIndex(category => category.id === current);
      const category = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1) : enabled[(index + (event.key === next ? 1 : -1) + enabled.length) % enabled.length];
      if (!category) return;
      setFocused(category.id); select(category.id);
      Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-category]')).find(button => button.dataset.category === category.id)?.focus();
    }}>
    {categories.map((category, index) => <button key={category.id} type="button" role="tab" data-category={category.id}
      data-edge={index === 0 ? 'left' : index === categories.length - 1 ? 'right' : undefined}
      id={`${id}-${encodeURIComponent(category.id)}`} aria-label={category.label} aria-selected={selected === category.id}
      aria-controls={panelId} disabled={disabled || category.disabled} tabIndex={category.id === tabStop ? 0 : -1}
      className="mc-recipe-categories__tab" onFocus={() => setFocused(category.id)} onClick={() => select(category.id)}>
      <span className={cx('mc-recipe-categories__icon', !category.icon && `mc-recipe-categories__icon--${category.id}`)} aria-hidden="true">{category.icon}</span>
    </button>)}
  </div>;
});

/** The source 176x166 survival inventory pane, without the separate native toolbar. */
export const PlayerInventoryScreen = forwardRef<HTMLElement, PlayerInventoryScreenProps>(function PlayerInventoryScreen({
  title = 'Inventory', armor = [null, null, null, null], offhand, crafting = [], result, playerPreview,
  playerPreviewLabel = 'Player preview', onArmorAction, onCraftingAction, onTakeResult, className, ...props
}, ref) {
  const armorRefs = useRef<(HTMLButtonElement | null)[]>([]), craftingRef = useRef<HTMLDivElement>(null), offhandRef = useRef<HTMLButtonElement>(null), resultRef = useRef<HTMLButtonElement>(null);
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, target: HTMLButtonElement | null | undefined) => {
    if (!target || target.disabled || event.defaultPrevented) return; event.preventDefault(); target.focus();
  };
  return <WorkstationFrame {...props} ref={ref} title={title} className={cx('mc-player-screen', className)}>
    <div className="mc-player-screen__armor" role="group" aria-label="Armor">{armorKinds.map((kind, index) => <ArmorSlot
      ref={node => { armorRefs.current[index] = node; }} key={kind} kind={kind} item={armor[index]} label={kind}
      onClick={() => onArmorAction?.(kind, 'primary')} onSecondaryAction={() => onArmorAction?.(kind, 'secondary')}
      onKeyDown={event => {
        if (event.key === 'ArrowUp') navigate(event, armorRefs.current[index - 1]);
        else if (event.key === 'ArrowDown') navigate(event, armorRefs.current[index + 1]);
        else if (event.key === 'ArrowRight') navigate(event, index === 3 ? offhandRef.current : craftingRef.current?.querySelectorAll<HTMLButtonElement>('.mc-slot')[index < 2 ? 0 : 2]);
      }}/>)}</div>
    <div className="mc-player-screen__preview" role={playerPreview ? 'img' : undefined} aria-label={playerPreview ? playerPreviewLabel : undefined} aria-hidden={!playerPreview || undefined}>
      <div className="mc-player-screen__preview-content">{playerPreview}</div>
    </div>
    <ArmorSlot ref={offhandRef} kind="offhand" item={offhand} className="mc-player-screen__offhand"
      onClick={() => onArmorAction?.('offhand', 'primary')} onSecondaryAction={() => onArmorAction?.('offhand', 'secondary')}
      onKeyDown={event => { if (event.key === 'ArrowLeft') navigate(event, armorRefs.current[3]); }}/>
    <span className="mc-player-screen__crafting-label">Crafting</span>
    <div ref={craftingRef} className="mc-player-screen__crafting"><InventoryGrid label="Crafting input" items={crafting} columns={2} size={4} onSlotAction={onCraftingAction}
      onKeyDown={event => {
        if (event.defaultPrevented) return;
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('.mc-slot'));
        const index = buttons.findIndex(button => button === event.target);
        if (event.key === 'ArrowLeft' && (index === 0 || index === 2)) { const target = armorRefs.current[index === 0 ? 0 : 2]; if (target && !target.disabled) { event.preventDefault(); target.focus(); } }
        else if (event.key === 'ArrowRight' && (index === 1 || index === 3) && resultRef.current) { event.preventDefault(); resultRef.current.focus(); }
      }}/></div>
    <span className="mc-player-screen__arrow" aria-hidden="true"/>
    <ResultSlot ref={resultRef} className="mc-player-screen__result" label="Crafting result" item={result} onTake={action => onTakeResult?.(action)}
      onKeyDown={event => { if (event.key === 'ArrowLeft') navigate(event, craftingRef.current?.querySelectorAll<HTMLButtonElement>('.mc-slot')[1]); }}/>
  </WorkstationFrame>;
});

/** Creative recipe-book pane. Category collections and inventory mutations belong to the host. */
export const CreativeInventory = forwardRef<HTMLElement, CreativeInventoryProps>(function CreativeInventory({
  title, chrome = 'full', layout, defaultLayout = 'creative', onLayoutChange, onHelp, helpLabel,
  categories = defaultCategories, categoryId, defaultCategoryId, onCategoryChange,
  items, query, defaultQuery = '', onQueryChange, hotbar = [], onItemAction, onHotbarAction, onClose,
  closeLabel = 'Close creative inventory', className, onKeyDown, onKeyDownCapture, ...props
}, ref) {
  const id = useId();
  const [internalCategory, setInternalCategory] = useState(defaultCategoryId ?? categories.find(category => !category.disabled)?.id ?? '');
  const selectedCategory = categoryId ?? (categories.some(category => category.id === internalCategory) ? internalCategory : categories.find(category => !category.disabled)?.id ?? '');
  const [internalQuery, setInternalQuery] = useState(defaultQuery), currentQuery = query ?? internalQuery;
  const [composing, setComposing] = useState(false), [committedQuery, setCommittedQuery] = useState(currentQuery);
  const search = selectedCategory === 'search', filter = (composing ? committedQuery : currentQuery).trim().toLocaleLowerCase();
  const indexed = items.map((item, index) => ({ item, index })).filter(({ item }) => !search || !filter || item.name.toLocaleLowerCase().includes(filter));
  const category = categories.find(category => category.id === selectedCategory);
  return <div className="mc-creative-inventory-scroll"><section {...props} ref={ref} className={cx('mc-creative-inventory', className)} aria-label={title ?? 'Creative inventory'} data-chrome={chrome}
    onKeyDownCapture={event => {
      onKeyDownCapture?.(event);
      if (chrome !== 'full' || event.defaultPrevented || event.nativeEvent.isComposing || !(event.target instanceof HTMLButtonElement)) return;
      const target = event.key === 'ArrowRight' && event.target.dataset.category === 'search'
        ? event.currentTarget.querySelector<HTMLButtonElement>('.mc-inventory-toolbar [data-layout="creative"]')
        : event.key === 'ArrowLeft' && event.target.dataset.layout === 'creative'
          ? event.currentTarget.querySelector<HTMLButtonElement>('.mc-recipe-categories [data-category="search"]') : null;
      if (target && !target.disabled) { event.preventDefault(); target.focus(); }
    }}
    onKeyDown={event => { onKeyDown?.(event); if (!event.defaultPrevented && !event.nativeEvent.isComposing && event.key === 'Escape' && onClose) { event.preventDefault(); onClose(); } }}>
    <RecipeCategoryTabs id={`${id}-categories`} className="mc-creative-inventory__tabs" categories={categories} value={selectedCategory} panelId={`${id}-items`}
      onValueChange={value => { if (categoryId === undefined) setInternalCategory(value); onCategoryChange?.(value); }}/>
    <h2 className="mc-creative-inventory__label">{title ?? (search ? 'All items' : category?.label ?? 'Creative inventory')}</h2>
    {chrome === 'full' ? <InventoryToolbar className="mc-creative-inventory__toolbar" value={layout} defaultValue={defaultLayout}
      onValueChange={onLayoutChange} onHelp={onHelp} helpLabel={helpLabel} onClose={onClose} closeLabel={closeLabel}/>
      : onClose && <button type="button" className="mc-dialog__close" aria-label={closeLabel} onClick={onClose}><span className="mc-dialog__close-icon" aria-hidden="true"/></button>}
    {search && <RecipeSearch className="mc-creative-inventory__search" label="Search creative inventory" showFilter={false} value={currentQuery}
      onValueChange={value => { if (query === undefined) setInternalQuery(value); onQueryChange?.(value); }}
      onCompositionStart={() => { setCommittedQuery(currentQuery); setComposing(true); }}
      onCompositionEnd={event => { setCommittedQuery(event.currentTarget.value); setComposing(false); }}/ >}
    <ScrollArea id={`${id}-items`} role="tabpanel" aria-labelledby={`${id}-categories-${encodeURIComponent(selectedCategory)}`}
      label="Creative items" className="mc-creative-inventory__items" data-search={search || undefined} variant="container">
      <InventoryGrid label="Creative items grid" items={indexed.map(entry => entry.item)} columns={17}
        onSlotAction={(index, action) => { const entry = indexed[index]; if (entry) onItemAction?.(entry.index, action); }}/>
      {!indexed.length && <p className="mc-creative-inventory__empty" role="status">No matching items</p>}
    </ScrollArea>
    <div className="mc-creative-inventory__hotbar"><InventoryGrid label="Creative hotbar" items={hotbar} size={9} onSlotAction={onHotbarAction}/></div>
  </section></div>;
});
