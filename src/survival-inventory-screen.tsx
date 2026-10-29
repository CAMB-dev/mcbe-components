import { forwardRef } from 'react';
import { InventoryScreenFrameBase } from './inventory-screen-frame';
import type { InventoryScreenFrameProps } from './inventory-screen-frame';
import { PlayerInventoryScreen } from './inventory-screens';
import type { PlayerInventoryScreenProps } from './inventory-screens';
import { RecipeBook } from './recipe-book';
import type { RecipeBookProps } from './recipe-book';

export interface SurvivalInventoryScreenProps extends Omit<InventoryScreenFrameProps, 'title' | 'book' | 'children'> {
  title?: string;
  /** The host supplies the current category, collection and recipe bindings. */
  recipeBook: RecipeBookProps;
  inventory?: Omit<PlayerInventoryScreenProps, 'title' | 'onClose' | 'closeLabel'>;
}

/** Classic full Survival inventory: source recipe book, player pane and two-mode toolbar. */
export const SurvivalInventoryScreen = forwardRef<HTMLElement, SurvivalInventoryScreenProps>(function SurvivalInventoryScreen({
  title = 'Inventory', recipeBook, inventory, onKeyDownCapture, ...props
}, ref) {
  return <InventoryScreenFrameBase {...props} ref={ref} title={title} partPrefix="mc-survival-inventory-screen" book={<RecipeBook {...recipeBook}/>}
    onKeyDownCapture={event => {
      onKeyDownCapture?.(event);
      if (event.defaultPrevented || event.nativeEvent.isComposing || event.key !== 'ArrowUp' || !(event.target instanceof HTMLButtonElement) || !event.target.classList.contains('mc-player-screen__result')) return;
      const help = event.currentTarget.querySelector<HTMLButtonElement>('.mc-inventory-toolbar__help');
      if (help && !help.disabled) { event.preventDefault(); help.focus(); }
    }}>
    <PlayerInventoryScreen {...inventory} title={title}/>
  </InventoryScreenFrameBase>;
});
