import { forwardRef, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, KeyboardEvent, ReactNode } from 'react';
import { ItemCount, ItemSlot } from './inventory';
import type { InventoryItem, ItemSlotProps } from './inventory';
import { RecipeCategoryTabs, RecipeFilterToggle, RecipeSearch } from './inventory-screens';
import type { RecipeCategory } from './inventory-screens';
import { ScrollArea } from './scroll-area';
import { CraftingRecipeViewport } from './crafting-image-layer';

export type RecipeBookAction = 'primary' | 'secondary' | 'tertiary';
/** Host-resolved recipe_book collection record, including its original background binding. */
export interface RecipeBookItem {
  id: string;
  item?: InventoryItem;
  label?: string;
  preview?: ReactNode;
  /** Recipe craftable count, independent of the represented item's inventory stack count. */
  craftableCount?: number;
  backgroundImage?: string;
  /** Original image nine-slice inset in game pixels; zero stretches the complete image. */
  backgroundSlice?: number;
  /** Optional logical original size for source nine-slicing. Unknown custom backgrounds retain DOM paint. */
  backgroundSize?: readonly [number, number];
  modifier?: 'none' | 'collapse' | 'expand';
  /** Explicit interaction policy; a red/unavailable recipe is still actionable by default. */
  disabled?: boolean;
}
export interface RecipeBookEntryProps extends Omit<ItemSlotProps, 'item' | 'count' | 'label' | 'children' | 'image' | 'durability'> {
  entry: RecipeBookItem;
  onRecipeAction?: (id: string, action: RecipeBookAction) => void;
}
export interface RecipeBookProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  title: string;
  /** Already filtered and flattened by the host; this component never changes the collection. */
  entries: readonly RecipeBookItem[];
  categories?: readonly RecipeCategory[];
  categoryId: string;
  onCategoryChange?: (id: string) => void;
  query: string;
  onQueryChange?: (query: string) => void;
  craftableOnly: boolean;
  onCraftableOnlyChange?: (craftableOnly: boolean) => void;
  selectedId?: string;
  onRecipeAction?: (id: string, action: RecipeBookAction) => void;
  /** Creative source profile hides the craftable-only toggle. */
  creative?: boolean;
  disabled?: boolean;
  searchLabel?: string;
  searchPlaceholder?: string;
  filterLabel?: string;
  categoriesLabel?: string;
  recipesLabel?: string;
  emptyLabel?: string;
}

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

/** An actual recipe slot: source background and group modifier, without inventory-count semantics. */
export const RecipeBookEntry = forwardRef<HTMLButtonElement, RecipeBookEntryProps>(function RecipeBookEntry({
  entry, onRecipeAction, disabled, selected, className, style, onClick, onSecondaryAction, onAuxClick, onMouseDown, ...props
}, ref) {
  const { item, label = item?.name ?? entry.id, preview, craftableCount, backgroundImage, backgroundSlice = 1, modifier = 'none' } = entry;
  // Native recipe craftability does not empty the item renderer, even when it is zero.
  const representedItem: InventoryItem = { ...item, name: item?.name ?? label, count: undefined, durability: undefined, image: undefined, icon: undefined, disabled: false };
  const art = preview ?? (item?.image?.trim() ? <img src={item.image} alt="" draggable={false}/> : item?.icon);
  const blocked = disabled || entry.disabled || item?.disabled;
  const amount = craftableCount === undefined ? undefined : Number.isFinite(craftableCount) ? Math.max(0, Math.floor(craftableCount)) : 0;
  const slice = Number.isFinite(backgroundSlice) ? Math.max(0, backgroundSlice) : 0;
  const entryStyle = { '--mc-recipe-entry-slice': slice, '--mc-recipe-entry-edge': `${slice * 2}px`,
    ...(backgroundImage ? { '--mc-recipe-entry-background': `url(${JSON.stringify(backgroundImage)})` } : {}), ...style } as CSSProperties;
  return <ItemSlot {...props} ref={ref} item={representedItem} label={label} selected={selected} disabled={blocked}
    aria-label={props['aria-label'] ?? [label, amount !== undefined && amount > 1 && amount].filter(Boolean).join(', ')}
    className={cx('mc-recipe-book-entry', className)} style={entryStyle} data-recipe-id={entry.id} data-modifier={modifier === 'none' ? undefined : modifier}
    onClick={event => { if (blocked) return; onClick?.(event); if (!event.defaultPrevented) onRecipeAction?.(entry.id, 'primary'); }}
    onSecondaryAction={event => { if (blocked) return; onSecondaryAction?.(event); onRecipeAction?.(entry.id, 'secondary'); }}
    onMouseDown={event => { onMouseDown?.(event); if (event.button === 1 && !event.defaultPrevented) event.preventDefault(); }}
    onAuxClick={event => { if (blocked) return; onAuxClick?.(event); if (event.button === 1 && !event.defaultPrevented) { event.preventDefault(); onRecipeAction?.(entry.id, 'tertiary'); } }}>
    <span className="mc-recipe-book-entry__art" aria-hidden="true">{art}</span>
    {modifier !== 'none' && <span className="mc-recipe-book-entry__modifier" aria-hidden="true"/>}
    <ItemCount count={craftableCount} aria-hidden="true"/>
    {selected && <span className="mc-recipe-book-entry__selected" aria-hidden="true"/>}
  </ItemSlot>;
});

/** Classic recipe book pane. The host owns recipe lookup, search, filtering and group expansion. */
export const RecipeBook = forwardRef<HTMLDivElement, RecipeBookProps>(function RecipeBook({
  title, entries, categories, categoryId, onCategoryChange, query, onQueryChange, craftableOnly, onCraftableOnlyChange,
  selectedId, onRecipeAction, creative = false, disabled, searchLabel = 'Search recipes', searchPlaceholder, filterLabel = 'Craftable recipes only',
  categoriesLabel = 'Recipe categories', recipesLabel = 'Recipes', emptyLabel = 'No matching recipes',
  id: suppliedId, className, onKeyDown, ...props
}, ref) {
  const generatedId = useId(), id = suppliedId ?? `mc-recipe-book-${generatedId}`, search = categoryId === 'search';
  const viewport = useRef<HTMLDivElement>(null), buttons = useRef(new Map<string, HTMLButtonElement>());
  const sourceViewport = useContext(CraftingRecipeViewport);
  const viewportRef = useCallback((element: HTMLDivElement | null) => { viewport.current = element; sourceViewport?.bind(element); }, [sourceViewport]);
  const [columns, setColumns] = useState(7), [focusedId, setFocusedId] = useState<string>();
  const enabled = entries.filter(entry => !disabled && !entry.disabled && !entry.item?.disabled);
  const activeId = enabled.some(entry => entry.id === focusedId) ? focusedId : enabled.some(entry => entry.id === selectedId) ? selectedId : enabled[0]?.id;
  useEffect(() => {
    const element = viewport.current; if (!element) return;
    const measure = () => setColumns(Math.max(1, Math.floor(element.clientWidth / 36)));
    measure(); const observer = new ResizeObserver(measure); observer.observe(element); return () => observer.disconnect();
  }, []);
  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event); if (event.defaultPrevented || event.nativeEvent.isComposing || disabled) return;
    const from = entries.findIndex(entry => buttons.current.get(entry.id) === event.target); if (from < 0) return;
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const direction = event.key === 'ArrowRight' ? (rtl ? -1 : 1) : event.key === 'ArrowLeft' ? (rtl ? 1 : -1) : event.key === 'ArrowDown' ? columns : event.key === 'ArrowUp' ? -columns : 0;
    let next = from;
    if (direction) {
      next += direction;
      while (next >= 0 && next < entries.length && !enabled.includes(entries[next]!)) next += direction;
    } else if (event.key === 'Home') {
      next = event.ctrlKey ? 0 : Math.floor(from / columns) * columns;
      const end = event.ctrlKey ? entries.length - 1 : Math.min(entries.length - 1, Math.floor(from / columns) * columns + columns - 1);
      while (next <= end && !enabled.includes(entries[next]!)) next++;
      if (next > end) next = from;
    } else if (event.key === 'End') {
      next = event.ctrlKey ? entries.length - 1 : Math.min(entries.length - 1, Math.floor(from / columns) * columns + columns - 1);
      const start = event.ctrlKey ? 0 : Math.floor(from / columns) * columns;
      while (next >= start && !enabled.includes(entries[next]!)) next--;
      if (next < start) next = from;
    }
    else return;
    event.preventDefault();
    const entry = entries[next];
    if (entry && enabled.includes(entry)) { event.preventDefault(); buttons.current.get(entry.id)?.focus(); }
  };
  return <div {...props} ref={ref} id={id} className={cx('mc-recipe-book', className)} data-search={search || undefined} data-creative={creative || undefined} onKeyDown={navigate}>
    <RecipeCategoryTabs id={`${id}-categories`} className="mc-recipe-book__categories" categories={categories}
      value={categoryId} onValueChange={onCategoryChange} label={categoriesLabel} disabled={disabled} panelId={`${id}-recipes`}/>
    <div className="mc-recipe-book__header">
      <h2 className="mc-recipe-book__title">{title}</h2>
      {!creative && !search && <RecipeFilterToggle className="mc-recipe-book__header-filter" craftableOnly={craftableOnly}
        onCraftableOnlyChange={onCraftableOnlyChange} label={filterLabel} disabled={disabled}/>}
    </div>
    {search && <RecipeSearch className="mc-recipe-book__search" label={searchLabel} value={query}
      placeholder={searchPlaceholder}
      onValueChange={onQueryChange} showFilter={!creative} craftableOnly={craftableOnly}
      onCraftableOnlyChange={onCraftableOnlyChange} filterLabel={filterLabel} disabled={disabled}/>}
    <ScrollArea id={`${id}-recipes`} className="mc-recipe-book__items" role="tabpanel" aria-labelledby={`${id}-categories-${encodeURIComponent(categoryId)}`}
      label={recipesLabel} variant="container" viewportRef={viewportRef} onScrollPositionChange={sourceViewport?.scroll}>
      <div role="grid" aria-label={recipesLabel} aria-rowcount={Math.ceil(entries.length / columns)} aria-colcount={columns}
        className="mc-recipe-book__grid" style={{ '--mc-recipe-book-columns': columns } as CSSProperties}>
        {Array.from({ length: Math.ceil(entries.length / columns) }, (_, row) => <div role="row" key={row}>
          {entries.slice(row * columns, (row + 1) * columns).map(entry => <div role="gridcell" aria-selected={entry.id === selectedId} key={entry.id}>
            <RecipeBookEntry ref={node => { if (node) buttons.current.set(entry.id, node); else buttons.current.delete(entry.id); }}
              entry={entry} selected={entry.id === selectedId} disabled={disabled} tabIndex={entry.id === activeId ? 0 : -1}
              onFocus={() => setFocusedId(entry.id)} onRecipeAction={onRecipeAction}/>
          </div>)}
        </div>)}
      </div>
      {!entries.length && <span className="mc-recipe-book__empty" role="status">{emptyLabel}</span>}
    </ScrollArea>
  </div>;
});
