import { forwardRef, useCallback, useRef, useState } from 'react';
import type { HTMLAttributes } from 'react';
import { CraftingTable } from './processing';
import type { CraftingTableProps } from './processing';
import { InventoryScreenFrameBase } from './inventory-screen-frame';
import type { InventoryScreenLayout } from './inventory-screen-frame';
import { RecipeBook } from './recipe-book';
import type { RecipeBookProps } from './recipe-book';
import { CraftingRecipeViewport, useCraftingScreenImageLayer } from './crafting-image-layer';
import type { CraftingScreenImageRenderProfile } from './crafting-image-layer';
export type { CraftingScreenImageRenderProfile, CraftingScreenTextStyle, CraftingScreenInputTextStyle } from './crafting-image-layer';

export type CraftingLayout = InventoryScreenLayout;
export interface CraftingScreenProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'title'> {
  title?: string;
  /** The host supplies the current recipe collection and its native bindings. */
  recipeBook: RecipeBookProps;
  crafting?: Omit<CraftingTableProps, 'title'>;
  /** Optional complete326x166 source composition; semantic controls remain mounted. */
  imageRender?: CraftingScreenImageRenderProfile;
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
  title = 'Crafting', recipeBook, crafting, imageRender, layout, defaultLayout = 'recipe-book', onLayoutChange,
  onHelp, onClose, helpLabel, closeLabel = 'Close crafting table', showClose = true,
  className, onKeyDown, onKeyDownCapture, ...props
}, ref) {
  const root = useRef<HTMLElement | null>(null), [internalLayout, setInternalLayout] = useState(defaultLayout);
  const currentLayout = layout ?? internalLayout;
  const rootRef = useCallback((node: HTMLElement | null) => { root.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }, [ref]);
  const paint = useCraftingScreenImageLayer(imageRender, root, { layout: currentLayout, title, recipeBook, crafting, showClose });
  return <CraftingRecipeViewport.Provider value={paint.bridge}><InventoryScreenFrameBase {...props} ref={rootRef} title={title} partPrefix="mc-crafting-screen"
    layout={currentLayout} defaultLayout={defaultLayout} onLayoutChange={next => { if (layout === undefined) setInternalLayout(next); onLayoutChange?.(next); }}
    sourceLayer={paint.layer} sourcePresentation={paint.presentation}
    onHelp={onHelp} onClose={onClose} helpLabel={helpLabel} closeLabel={closeLabel} showClose={showClose}
    className={className} onKeyDown={onKeyDown} onKeyDownCapture={onKeyDownCapture} book={<RecipeBook {...recipeBook}/>}>
    <CraftingTable {...crafting} title={title}/>
  </InventoryScreenFrameBase></CraftingRecipeViewport.Provider>;
});
