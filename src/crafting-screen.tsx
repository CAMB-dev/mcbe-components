import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { CraftingTable } from './processing';
import type { CraftingTableProps } from './processing';
import { InventoryScreenFrameBase } from './inventory-screen-frame';
import type { InventoryScreenLayout } from './inventory-screen-frame';
import { RecipeBook } from './recipe-book';
import type { RecipeBookProps } from './recipe-book';

export type CraftingLayout = InventoryScreenLayout;
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
  return <InventoryScreenFrameBase {...props} ref={ref} title={title} partPrefix="mc-crafting-screen"
    layout={layout} defaultLayout={defaultLayout} onLayoutChange={onLayoutChange}
    onHelp={onHelp} onClose={onClose} helpLabel={helpLabel} closeLabel={closeLabel} showClose={showClose}
    className={className} onKeyDown={onKeyDown} onKeyDownCapture={onKeyDownCapture} book={<RecipeBook {...recipeBook}/>}>
    <CraftingTable {...crafting} title={title}/>
  </InventoryScreenFrameBase>;
});
