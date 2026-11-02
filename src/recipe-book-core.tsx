import { useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ForwardedRef, KeyboardEvent, ReactNode, RefAttributes } from 'react';
import { RecipeCategoryTabs, RecipeFilterToggle, RecipeSearch } from './inventory-screens';
import type { RecipeCategoryTabsProps, RecipeFilterToggleProps } from './inventory-screens';
import { ScrollArea } from './scroll-area';
import { CraftingRecipeViewport } from './crafting-image-layer';
import type { RecipeBookEntryProps, RecipeBookProps } from './recipe-book';

/** Private paint seam. Call renderers directly so they do not add React component/ID boundaries. */
export interface RecipeBookViewParts {
  renderEntry: (props: RecipeBookEntryProps & RefAttributes<HTMLButtonElement>) => ReactNode;
  renderCategories?: (props: RecipeCategoryTabsProps) => ReactNode;
  renderFilter?: (props: RecipeFilterToggleProps) => ReactNode;
  profile?: 'furnace';
  /** False opts out of the crafting image viewport bridge, without conditional hooks. */
  sourceContext?: boolean;
}
const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');
const renderDefaultCategories = (props: RecipeCategoryTabsProps) => <RecipeCategoryTabs {...props}/>;
const renderDefaultFilter = (props: RecipeFilterToggleProps) => <RecipeFilterToggle {...props}/>;

/** Private shared view; the caller supplies only paint renderers, never a second grid engine. */
export function useRecipeBookView({
  title, entries, categories, categoryId, onCategoryChange, query, onQueryChange, craftableOnly, onCraftableOnlyChange,
  selectedId, onRecipeAction, creative = false, disabled, searchLabel = 'Search recipes', searchPlaceholder, filterLabel = 'Craftable recipes only',
  categoriesLabel = 'Recipe categories', recipesLabel = 'Recipes', emptyLabel = 'No matching recipes',
  id: suppliedId, className, onKeyDown, ...props
}: RecipeBookProps, ref: ForwardedRef<HTMLDivElement>, parts: RecipeBookViewParts) {
  const generatedId = useId(), id = suppliedId ?? `mc-recipe-book-${generatedId}`, search = categoryId === 'search';
  const viewport = useRef<HTMLDivElement>(null), buttons = useRef(new Map<string, HTMLButtonElement>());
  const inheritedSourceViewport = useContext(CraftingRecipeViewport);
  const sourceViewport = parts.sourceContext === false ? undefined : inheritedSourceViewport;
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
  return <div {...props} ref={ref} id={id} className={cx('mc-recipe-book', className)} data-recipe-profile={parts.profile} data-search={search || undefined} data-creative={creative || undefined} onKeyDown={navigate}>
    {(parts.renderCategories ?? renderDefaultCategories)({ id: `${id}-categories`, className: 'mc-recipe-book__categories', categories,
      value: categoryId, onValueChange: onCategoryChange, label: categoriesLabel, disabled, panelId: `${id}-recipes` })}
    <div className="mc-recipe-book__header">
      <h2 className="mc-recipe-book__title">{title}</h2>
      {!creative && !search && (parts.renderFilter ?? renderDefaultFilter)({ className: 'mc-recipe-book__header-filter', craftableOnly,
        onCraftableOnlyChange, label: filterLabel, disabled })}
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
            {parts.renderEntry({ ref: node => { if (node) buttons.current.set(entry.id, node); else buttons.current.delete(entry.id); },
              entry, selected: entry.id === selectedId, disabled, tabIndex: entry.id === activeId ? 0 : -1,
              onFocus: () => setFocusedId(entry.id), onRecipeAction })}
          </div>)}
        </div>)}
      </div>
      {!entries.length && <span className="mc-recipe-book__empty" role="status">{emptyLabel}</span>}
    </ScrollArea>
  </div>;
}
