import { forwardRef, useState } from 'react';
import type { HTMLAttributes } from 'react';
import { CraftingTable } from './processing';
import type { CraftingTableProps } from './processing';
import { InventoryToolbar } from './inventory-screens';
import { RecipeBook } from './recipe-book';
import type { RecipeBookProps } from './recipe-book';

export type CraftingLayout = 'recipe-book' | 'survival';
export interface CraftingScreenProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'title'> {
  title?: string;
  /** The host supplies the current recipe collection and its native bindings. */
  recipeBook: RecipeBookProps;
  crafting?: Omit<CraftingTableProps, 'title'>;
  layout?: CraftingLayout;
  defaultLayout?: CraftingLayout;
  onLayoutChange?: (layout: CraftingLayout) => void;
  onHelp?: () => void;
  onClose?: () => void;
  helpLabel?: string;
  closeLabel?: string;
  showClose?: boolean;
}

/** Classic 326x166 workbench composition, including its source layout toggles. */
export const CraftingScreen = forwardRef<HTMLElement, CraftingScreenProps>(function CraftingScreen({
  title = 'Crafting', recipeBook, crafting, layout, defaultLayout = 'recipe-book', onLayoutChange,
  onHelp, onClose, helpLabel, closeLabel = 'Close crafting table', showClose = true,
  className, onKeyDown, onKeyDownCapture, ...props
}, ref) {
  const [internalLayout, setInternalLayout] = useState(defaultLayout);
  const currentLayout = layout ?? internalLayout;
  return <div className="mc-crafting-screen-scroll"><section {...props} ref={ref} aria-label={props['aria-label'] ?? title}
    className={['mc-crafting-screen', className].filter(Boolean).join(' ')} data-layout={currentLayout}
    onKeyDownCapture={event => {
      onKeyDownCapture?.(event);
      if (event.defaultPrevented || event.nativeEvent.isComposing || !(event.target instanceof HTMLButtonElement)) return;
      const target = event.key === 'ArrowRight' && event.target.dataset.category === 'search'
        ? event.currentTarget.querySelector<HTMLButtonElement>('.mc-inventory-toolbar [data-layout="recipe-book"]')
        : currentLayout === 'recipe-book' && event.key === 'ArrowLeft' && event.target.dataset.layout === 'recipe-book'
          ? event.currentTarget.querySelector<HTMLButtonElement>('.mc-recipe-categories [data-category="search"]') : null;
      if (target && !target.disabled) { event.preventDefault(); target.focus(); }
    }}
    onKeyDown={event => {
      onKeyDown?.(event);
      if (!event.defaultPrevented && !event.nativeEvent.isComposing && event.key === 'Escape' && onClose) { event.preventDefault(); onClose(); }
    }}>
    {currentLayout === 'recipe-book' && <>
      <RecipeBook {...recipeBook} className={['mc-crafting-screen__book', recipeBook.className].filter(Boolean).join(' ')}/>
      <div className="mc-crafting-screen__fold" aria-hidden="true"/>
    </>}
    <div className="mc-crafting-screen__right"><CraftingTable {...crafting} title={title}/></div>
    <InventoryToolbar className="mc-crafting-screen__toolbar" layouts={['recipe-book', 'survival']} value={currentLayout}
      onValueChange={value => {
        if (value === 'creative') return;
        if (layout === undefined) setInternalLayout(value);
        onLayoutChange?.(value);
      }} onHelp={onHelp} onClose={onClose} helpLabel={helpLabel} closeLabel={closeLabel} showClose={showClose}/>
  </section></div>;
});
