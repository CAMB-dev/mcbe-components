import { cloneElement, forwardRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import type { WorkstationPresentation } from './workstation-source-layer';
import { InventoryToolbar } from './inventory-screens';

export type InventoryScreenLayout = 'recipe-book' | 'survival';
export interface InventoryScreenFrameProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'title'> {
  title: string;
  book: ReactNode;
  children: ReactNode;
  layout?: InventoryScreenLayout;
  defaultLayout?: InventoryScreenLayout;
  onLayoutChange?: (layout: InventoryScreenLayout) => void;
  onHelp?: () => void;
  onClose?: () => void;
  helpLabel?: string;
  closeLabel?: string;
  showClose?: boolean;
}
interface InventoryScreenFrameBaseProps extends InventoryScreenFrameProps {
  /** Internal composition compatibility hook; not exposed by the public Frame. */
  partPrefix: string;
  sourceLayer?: ReactNode;
  sourcePresentation?: WorkstationPresentation;
}

const commonPrefix = 'mc-inventory-screen-frame';
const cx = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

/** Internal shared implementation; composition modules may retain their existing part hooks. */
export const InventoryScreenFrameBase = forwardRef<HTMLElement, InventoryScreenFrameBaseProps>(function InventoryScreenFrameBase({
  title, book, children, layout, defaultLayout = 'recipe-book', onLayoutChange,
  onHelp, onClose, helpLabel, closeLabel = 'Close inventory', showClose = true,
  partPrefix, sourceLayer, sourcePresentation, className, onKeyDown, onKeyDownCapture, ...props
}, ref) {
  const [internalLayout, setInternalLayout] = useState(defaultLayout);
  const currentLayout = layout ?? internalLayout;
  const part = (suffix: string) => cx(`${commonPrefix}${suffix}`, partPrefix !== commonPrefix && `${partPrefix}${suffix}`);
  const section = <section {...props} ref={ref} aria-label={props['aria-label'] ?? title}
    className={cx(part(''), className)} data-layout={currentLayout}
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
      <div className={part('__book')}>{book}</div>
      <div className={part('__fold')} aria-hidden="true"/>
    </>}
    <div className={part('__right')}>{children}</div>
    <InventoryToolbar className={part('__toolbar')} layouts={['recipe-book', 'survival']} value={currentLayout}
      onValueChange={value => {
        if (value === 'creative') return;
        if (layout === undefined) setInternalLayout(value);
        onLayoutChange?.(value);
      }} onHelp={onHelp} onClose={onClose} helpLabel={helpLabel} closeLabel={closeLabel} showClose={showClose}/>
  </section>;
  // Append the optional keyed visual after the existing semantic children so
  // toggling a profile never replaces the book, input, right pane or toolbar.
  const painted = sourceLayer ? cloneElement(section, undefined, ...section.props.children, sourceLayer) : section;
  if (!sourcePresentation) return <div className={part('-scroll')}>{painted}</div>;
  const paint = sourcePresentation;
  return <div className={cx(part('-scroll'), 'mc-inventory-screen-frame-scroll--image-profile')} style={{
    '--mc-inventory-screen-display-scale': paint.scale, '--mc-inventory-screen-left': `${paint.left}px`, '--mc-inventory-screen-top': `${paint.top}px`,
    '--mc-inventory-screen-reserved-width': `${(652 + paint.left + paint.right) * paint.scale}px`,
    '--mc-inventory-screen-reserved-height': `${(332 + paint.top + paint.bottom) * paint.scale}px`,
  } as CSSProperties}>{painted}</div>;
});

/** Inventory/workbench profile: fixed 326x166 game-pixel canvas in both layouts. */
export const InventoryScreenFrame = forwardRef<HTMLElement, InventoryScreenFrameProps>(function InventoryScreenFrame(props, ref) {
  return <InventoryScreenFrameBase {...props} ref={ref} partPrefix={commonPrefix}/>;
});
