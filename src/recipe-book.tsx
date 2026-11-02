import { forwardRef } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { ItemCount, ItemSlot } from './inventory';
import type { InventoryItem, ItemSlotProps } from './inventory';
import type { RecipeCategory } from './inventory-screens';
import { useRecipeBookView } from './recipe-book-core';
import type { RecipeBookViewParts } from './recipe-book-core';

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

const recipeBookParts: RecipeBookViewParts = { renderEntry: props => <RecipeBookEntry {...props}/> };

/** Classic recipe book pane. The host owns recipe lookup, search, filtering and group expansion. */
export const RecipeBook = forwardRef<HTMLDivElement, RecipeBookProps>(function RecipeBook(props, ref) {
  return useRecipeBookView(props, ref, recipeBookParts);
});
