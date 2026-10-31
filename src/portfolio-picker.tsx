import { forwardRef, useRef } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, MouseEvent, ReactNode, Ref } from 'react';
import { Image } from './image';
import { ScrollArea } from './scroll-area';
import type { ScrollAreaProps } from './scroll-area';
import { PortfolioPickerItem } from './portfolio-parts';
import type { PortfolioImageSource, PortfolioPickDetail } from './portfolio-parts';
import { portfolioAssets } from './portfolio-assets';
import { PortfolioSkin } from './portfolio-skin';
import { useClassicLayoutEffect, useClassicNodeRef } from './classic-screen-lifecycle';
import { deferPortfolioEvent } from './portfolio-event';

/** An explicit source factory cell; hidden content retains its filled slot. */
export interface PortfolioPickerCell {
  readonly id: string;
  readonly label: string;
  readonly image?: PortfolioImageSource;
  readonly imageContent?: ReactNode;
  readonly visible: boolean;
  readonly disabled?: boolean;
}
/** Explicit source row/column data, not a guessed two-column inventory provider. */
export interface PortfolioPickerRow {
  readonly id: string;
  readonly cells: readonly PortfolioPickerCell[];
  readonly dividerVisible: boolean;
}
export type PortfolioPickerActionDetail =
  | {
    readonly action: 'pick';
    readonly target: 'button.picked';
    readonly event: MouseEvent<HTMLButtonElement>;
    readonly control: HTMLButtonElement;
    readonly itemId: string;
    readonly rowId: string;
    readonly rowIndex: number;
    readonly columnIndex: number;
    readonly image?: Readonly<PortfolioImageSource>;
  }
  | {
    readonly action: 'close';
    readonly target: 'button.close_button';
    readonly event: MouseEvent<HTMLButtonElement>;
    readonly control: HTMLButtonElement;
  };

export interface PortfolioPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML' | 'inputMode'> {
  rows: readonly PortfolioPickerRow[];
  /** Complete caller-resolved screenshot frame; the source texture is dynamic. */
  frameMaterial: PortfolioImageSource;
  /** Complete host-resolved exact-White material; no automatic casefold or crop. */
  dividerMaterial: PortfolioImageSource;
  headerLabel: string;
  /** Logical header height resolving the source's native child-sum measurement. */
  headerHeight: number;
  noPhotosAlertVisible: boolean;
  emptyLabel: string;
  label?: string;
  closeLabel?: string;
  scrollLabel?: string;
  /** Explicit logical frame; default225x231, pane remains frame minus16/30 at8/21. */
  size?: readonly [number, number];
  scale?: number;
  inputMode?: 'mouse' | 'touch';
  touchThumbVisible?: boolean;
  minThumbSize?: number;
  disabled?: boolean;
  /** Blocks picking, while native scrolling and Close remain available. */
  readOnly?: boolean;
  viewportRef?: Ref<HTMLDivElement>;
  viewportProps?: ScrollAreaProps['viewportProps'];
  closeRef?: Ref<HTMLButtonElement>;
  closeProps?: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'dangerouslySetInnerHTML' | 'type' | 'disabled'>;
  itemRefs?: Readonly<Partial<Record<string, Ref<HTMLButtonElement>>>>;
  itemContainerRefs?: Readonly<Partial<Record<string, Ref<HTMLDivElement>>>>;
  onAction?: (detail: PortfolioPickerActionDetail) => void;
}

function flag(value: boolean, name: string) {
  if (typeof value !== 'boolean') throw new TypeError(`${name} must be an explicit boolean.`);
}
function text(value: string, name: string) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} must be a non-empty string.`);
}
function material(value: PortfolioImageSource, name: string) {
  if (!value || typeof value.src !== 'string' || !value.src.trim() || !Array.isArray(value.sourceSize)
    || value.sourceSize.length !== 2 || value.sourceSize.some(n => !Number.isSafeInteger(n) || n <= 0)) {
    throw new TypeError(`${name} must provide a whole image URL and its positive integer physical sourceSize.`);
  }
}
function imageSnapshot(value?: PortfolioImageSource): Readonly<PortfolioImageSource> | undefined {
  return value && Object.freeze({ ...value, sourceSize: Object.freeze([value.sourceSize[0], value.sourceSize[1]]) as readonly [number, number] });
}
function ownRef<T>(refs: Readonly<Partial<Record<string, Ref<T>>>> | undefined, id: string) {
  return refs && Object.hasOwn(refs, id) ? refs[id] : undefined;
}
type AcceptedCell = { rowId: string; visible: boolean; disabled: boolean };

/**
 * Source picker composition with a finite Web factory layout:100-unit rows,
 * equally filled explicit columns, centered viewport+4 rows and11-unit dividers.
 * No Escape mapping is installed here; the embedding screen owns that route.
 */
export const PortfolioPicker = forwardRef<HTMLDivElement, PortfolioPickerProps>(function PortfolioPicker({
  rows, frameMaterial, dividerMaterial, headerLabel, headerHeight, noPhotosAlertVisible, emptyLabel,
  label = 'Portfolio picker', closeLabel = 'Close', scrollLabel = 'Portfolio photos',
  size = [225, 231], scale = 2, inputMode = 'mouse', touchThumbVisible = false, minThumbSize,
  disabled = false, readOnly = false, viewportRef, viewportProps, closeRef, closeProps = {}, itemRefs,
  itemContainerRefs, onAction, hidden = false, className = '', style, ...native
}, forwardedRef) {
  if (!Number.isSafeInteger(scale) || scale < 1) throw new RangeError('scale must be a positive integer.');
  if (!Array.isArray(size) || size.length !== 2 || size.some(n => !Number.isFinite(n) || !Number.isFinite(n * scale) || n < 42)) {
    throw new RangeError('size must contain two finite logical dimensions of at least42 units.');
  }
  if (!Number.isFinite(headerHeight) || !Number.isFinite(headerHeight * scale) || headerHeight < 0) throw new RangeError('headerHeight must be finite and non-negative.');
  if (inputMode !== 'mouse' && inputMode !== 'touch') throw new TypeError('inputMode must be mouse or touch.');
  flag(noPhotosAlertVisible, 'noPhotosAlertVisible'); flag(disabled, 'disabled'); flag(readOnly, 'readOnly');
  flag(hidden, 'hidden'); flag(touchThumbVisible, 'touchThumbVisible');
  text(headerLabel, 'headerLabel'); text(emptyLabel, 'emptyLabel'); text(label, 'label');
  text(closeLabel, 'closeLabel'); text(scrollLabel, 'scrollLabel');
  material(frameMaterial, 'frameMaterial'); material(dividerMaterial, 'dividerMaterial');
  if (!Array.isArray(rows)) throw new TypeError('rows must be an explicit array.');
  const rowIds = new Set<string>(), cellIds = new Set<string>(), accepted = new Map<string, AcceptedCell>();
  const records = Array.from(rows).map((row: PortfolioPickerRow, rowIndex: number) => {
    if (!row || !Array.isArray(row.cells)) throw new TypeError('Each row must provide explicit cells.');
    text(row.id, 'row.id'); flag(row.dividerVisible, 'row.dividerVisible');
    if (rowIds.has(row.id)) throw new TypeError('Row IDs must be unique.'); rowIds.add(row.id);
    return { id: row.id, dividerVisible: row.dividerVisible, cells: Array.from(row.cells).map((cell: PortfolioPickerCell, columnIndex: number) => {
      if (!cell) throw new TypeError('Each picker cell must be a descriptor.');
      text(cell.id, 'cell.id'); text(cell.label, 'cell.label'); flag(cell.visible, 'cell.visible');
      if (cell.disabled !== undefined) flag(cell.disabled, 'cell.disabled');
      if (cellIds.has(cell.id)) throw new TypeError('Picker item IDs must be unique across all rows.'); cellIds.add(cell.id);
      if (cell.image) material(cell.image, 'cell.image');
      accepted.set(cell.id, { rowId: row.id, visible: cell.visible, disabled: !!cell.disabled });
      return { ...cell, image: imageSnapshot(cell.image), rowId: row.id, rowIndex, columnIndex };
    }) };
  });
  const [root, attach] = useClassicNodeRef(forwardedRef), [, attachViewport] = useClassicNodeRef(viewportRef);
  const [close, attachClose] = useClassicNodeRef(closeRef);
  const live = useRef({ active: !hidden, disabled, readOnly, accepted });
  useClassicLayoutEffect(() => { live.current = { active: !hidden, disabled, readOnly, accepted }; });
  const active = () => !!root.current?.isConnected && live.current.active
    && !root.current.closest('[hidden],[inert]');
  const receivePick = (record: typeof records[number]['cells'][number], detail: PortfolioPickDetail) => {
    const current = live.current.accepted.get(record.id);
    if (!active() || live.current.disabled || live.current.readOnly || !current?.visible || current.disabled
      || current.rowId !== record.rowId || detail.itemId !== record.id || !root.current?.contains(detail.control)
      || !detail.control.isConnected || detail.control.closest('[hidden],[inert]')
      || detail.event.defaultPrevented || detail.event.nativeEvent.defaultPrevented) return;
    // The item has already deferred through every native/React ancestor veto.
    onAction?.({ action: 'pick', target: 'button.picked', event: detail.event, control: detail.control,
      itemId: record.id, rowId: record.rowId, rowIndex: record.rowIndex, columnIndex: record.columnIndex, image: record.image });
  };
  const variables = {
    '--mc-portfolio-picker-u': `${scale}px`,
    '--mc-portfolio-picker-close-normal': `url(${JSON.stringify(portfolioAssets.close_button_default.url)})`,
    '--mc-portfolio-picker-close-hover': `url(${JSON.stringify(portfolioAssets.close_button_hover.url)})`,
    '--mc-portfolio-picker-close-pressed': `url(${JSON.stringify(portfolioAssets.close_button_pressed.url)})`,
    '--mc-skin-scroll-track': `url(${JSON.stringify(portfolioAssets.ScrollRail.url)})`,
    '--mc-skin-scroll-thumb': `url(${JSON.stringify(portfolioAssets.ScrollHandle.url)})`,
    ...style, width: size[0] * scale, height: size[1] * scale,
  } as CSSProperties;
  return <div {...native} ref={attach} hidden={hidden} role={native.role ?? 'group'}
    aria-label={native['aria-label'] ?? label} aria-disabled={disabled || native['aria-disabled']}
    data-readonly={readOnly || undefined} data-input-mode={inputMode}
    className={`mc-portfolio-picker ${className}`} style={variables}>
    <PortfolioSkin asset={portfolioAssets.book_frame} width={size[0]} height={size[1]} scale={scale} className="mc-portfolio-picker__skin"/>
    <ScrollArea className="mc-portfolio-picker__scroll" style={{ width: (size[0] - 16) * scale, height: (size[1] - 30) * scale }}
      scale={scale} variant={inputMode === 'touch' ? 'touch' : 'default'} label={scrollLabel}
      viewportRef={attachViewport} viewportProps={viewportProps} thumbVisible={inputMode === 'touch' ? touchThumbVisible : undefined} minThumbSize={minThumbSize}>
      <div className="mc-portfolio-picker__header-holder" style={{ height: headerHeight * scale }}><span className="mc-portfolio-picker__header">{headerLabel}</span></div>
      <div className="mc-portfolio-picker__rows" role="list">
        {records.map(row => <div key={row.id} className="mc-portfolio-picker__row-group" data-portfolio-row-id={row.id}>
          <div className="mc-portfolio-picker__row" data-columns={row.cells.length}>
            {row.cells.map(cell => <div key={cell.id} className="mc-portfolio-picker__slot" role="listitem" data-portfolio-slot-id={cell.id}>
              <PortfolioPickerItem ref={ownRef(itemRefs, cell.id)} containerRef={ownRef(itemContainerRefs, cell.id)}
                itemId={cell.id} label={cell.label} frameMaterial={frameMaterial} image={cell.image} imageContent={cell.imageContent}
                scale={scale} hidden={!cell.visible} disabled={disabled || cell.disabled} readOnly={readOnly}
                onPick={detail => receivePick(cell, detail)}/>
            </div>)}
          </div>
          {row.dividerVisible && <div className="mc-portfolio-picker__divider" aria-hidden="true"><Image {...dividerMaterial.nativeProps}
            src={dividerMaterial.src} sourceSize={dividerMaterial.sourceSize} alt=""
            className={`mc-portfolio-picker__divider-image ${dividerMaterial.nativeProps?.className ?? ''}`}
            style={{ ...dividerMaterial.nativeProps?.style, width: '100%', height: scale }}/></div>}
        </div>)}
      </div>
    </ScrollArea>
    <button {...closeProps} ref={attachClose} type="button" disabled={disabled}
      tabIndex={closeProps.tabIndex ?? -1} aria-label={closeProps['aria-label'] ?? closeLabel}
      className={`mc-portfolio-picker__close ${closeProps.className ?? ''}`} onClick={event => {
        closeProps.onClick?.(event); const control = close.current;
        if (!control || disabled || event.defaultPrevented || event.nativeEvent.defaultPrevented) return;
        deferPortfolioEvent(event, control, snapshot => onAction?.({ action: 'close', target: 'button.close_button', event: snapshot, control }),
          () => active() && !live.current.disabled && close.current === control && !control.closest('[hidden],[inert]'));
      }}><span aria-hidden="true"/></button>
    <p className="mc-portfolio-picker__empty" hidden={!noPhotosAlertVisible}>{emptyLabel}</p>
  </div>;
});
