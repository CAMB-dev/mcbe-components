import { forwardRef, useId } from 'react';
import type { CSSProperties, ForwardedRef, HTMLAttributes } from 'react';
import { InventoryGrid } from './inventory';
import type { InventoryItem, InventorySlotAction } from './inventory';
import { PlayerInventory } from './workstations';

const classes = (...values: (string | undefined)[]) => values.filter(Boolean).join(' ');
const finite = (value: number | undefined, fallback: number) => value !== undefined && Number.isFinite(value) ? value : fallback;
const selection = (value: number | undefined, size: number) => value === undefined ? undefined
  : Number.isInteger(value) && value >= 0 && value < size ? value : -1;

export interface ContainerFrameProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: string;
  /** Panel height in CSS pixels at GUI scale 2; minimum 212 for the player inventory. */
  height?: number;
  titleAlign?: 'start' | 'center';
  /** Top-left title offset in CSS pixels; for centered titles x is unused. */
  titleOffset?: readonly [number, number];
  inventory?: readonly (InventoryItem | null)[];
  hotbar?: readonly (InventoryItem | null)[];
  inventoryLabel?: string;
  hotbarLabel?: string;
  /** Player inventory indexes 0–26, followed by hotbar indexes 27–35. */
  inventorySelectedIndex?: number;
  onInventorySelectionChange?: (index: number) => void;
  onInventoryAction?: (index: number, action: InventorySlotAction) => void;
  onClose?: () => void;
  closeLabel?: string;
}

/** Shared Classic container panel, with its inventory anchored to the actual bottom. */
export const ContainerFrame = forwardRef<HTMLElement, ContainerFrameProps>(function ContainerFrame({
  title, height = 332, titleAlign = 'start', titleOffset = [14, 20],
  inventory, hotbar, inventoryLabel, hotbarLabel, inventorySelectedIndex,
  onInventorySelectionChange, onInventoryAction, onClose, closeLabel = 'Close container',
  children, className, style, ...props
}, ref) {
  const id = useId();
  const boundedHeight = Math.max(212, finite(height, 332));
  const frameStyle = {
    '--mc-container-height': `${boundedHeight}px`,
    '--mc-container-title-x': `${finite(titleOffset[0], 14)}px`,
    '--mc-container-title-y': `${finite(titleOffset[1], 20)}px`,
    ...style,
  } as CSSProperties;
  return <div className="mc-container-scroll"><section {...props} ref={ref}
    aria-labelledby={props['aria-labelledby'] ?? `${id}-title`}
    className={classes('mc-container', className)} style={frameStyle}>
    <h2 id={`${id}-title`} className="mc-container__title" data-align={titleAlign}>{title}</h2>
    {onClose && <button type="button" className="mc-dialog__close" aria-label={closeLabel} onClick={onClose}>
      <span className="mc-dialog__close-icon" aria-hidden="true"/>
    </button>}
    {children}
    <PlayerInventory className="mc-container__inventory" items={inventory} hotbar={hotbar}
      label={inventoryLabel} hotbarLabel={hotbarLabel} selectedIndex={selection(inventorySelectedIndex, 36)}
      onSelectionChange={onInventorySelectionChange} onSlotAction={onInventoryAction}/>
  </section></div>;
});

export interface NativeContainerProps extends Omit<ContainerFrameProps, 'title' | 'height' | 'titleAlign' | 'titleOffset' | 'children'> {
  title?: string;
  items?: readonly (InventoryItem | null)[];
  /** Controlled selection in this container, independent of player inventory selection. */
  selectedIndex?: number;
  onSelectionChange?: (index: number) => void;
  /** Empty slots are actionable: callers may place a held stack into them. */
  onSlotAction?: (index: number, action: InventorySlotAction) => void;
}
export interface ChestProps extends NativeContainerProps {
  /** Native data-driven containers support 1–6 rows. Fractions floor; nonfinite values use 3. */
  rows?: number;
}
export type ShulkerBoxProps = NativeContainerProps;
export type HopperProps = NativeContainerProps;
export type DispenserProps = NativeContainerProps;
export type DropperProps = NativeContainerProps;

interface NativeContainerLayoutProps extends NativeContainerProps {
  kind: 'chest' | 'shulker-box' | 'hopper' | 'dispenser' | 'dropper';
  height: number;
  columns: number;
  rows: number;
  title: string;
  titleAlign?: 'start' | 'center';
  titleOffset: readonly [number, number];
  gridOffset: readonly [number, number];
}
const NativeContainerLayout = forwardRef<HTMLElement, NativeContainerLayoutProps>(function NativeContainerLayout({
  kind, height, columns, rows, title, titleAlign, titleOffset, gridOffset,
  items = [], selectedIndex, onSelectionChange, onSlotAction, className, ...props
}, ref) {
  const size = columns * rows;
  return <ContainerFrame {...props} ref={ref} title={title} height={height} titleAlign={titleAlign} titleOffset={titleOffset}
    className={classes(`mc-${kind}`, className)} data-container-kind={kind} data-container-rows={rows}>
    <div className="mc-container__grid" style={{ left: gridOffset[0], top: gridOffset[1] }}>
      <InventoryGrid label={title} items={items} columns={columns} size={size}
        selectedIndex={selection(selectedIndex, size)} onSelectionChange={onSelectionChange} onSlotAction={onSlotAction}/>
    </div>
  </ContainerFrame>;
});

/** Classic chest; the 3- and 6-row variants follow chest_screen, other rows data_driven_container_screen. */
export const Chest = forwardRef<HTMLElement, ChestProps>(function Chest({ rows = 3, title, ...props }, ref) {
  const count = Math.max(1, Math.min(6, Math.floor(finite(rows, 3))));
  return <NativeContainerLayout {...props} ref={ref} kind="chest" columns={9} rows={count}
    title={title ?? (count === 6 ? 'Large Chest' : 'Chest')} height={(112 + 18 * count) * 2}
    titleOffset={[14, count === 3 ? 22 : 20]} gridOffset={[14, 42]}/>;
});

/** shulker_box_panel inherits the native small_chest_panel, with exactly 27 storage slots. */
export const ShulkerBox = forwardRef<HTMLElement, ShulkerBoxProps>(function ShulkerBox({ title = 'Shulker Box', ...props }, ref) {
  return <NativeContainerLayout {...props} ref={ref} kind="shulker-box" columns={9} rows={3}
    title={title} height={332} titleOffset={[14, 22]} gridOffset={[14, 42]}/>;
});

export const Hopper = forwardRef<HTMLElement, HopperProps>(function Hopper({ title = 'Item Hopper', ...props }, ref) {
  return <NativeContainerLayout {...props} ref={ref} kind="hopper" columns={5} rows={1}
    title={title} height={266} titleOffset={[14, 14]} gridOffset={[86, 36.5]}/>;
});

function redstoneContainer({ kind, title, ...props }: NativeContainerProps & { kind: 'dispenser' | 'dropper'; title: string }, ref: ForwardedRef<HTMLElement>) {
  return <NativeContainerLayout {...props} ref={ref} kind={kind} columns={3} rows={3}
    title={title} height={332} titleAlign="center" titleOffset={[0, 10]} gridOffset={[122, 31]}/>;
}
export const Dispenser = forwardRef<HTMLElement, DispenserProps>(function Dispenser({ title = 'Dispenser', ...props }, ref) {
  return redstoneContainer({ ...props, kind: 'dispenser', title }, ref);
});
export const Dropper = forwardRef<HTMLElement, DropperProps>(function Dropper({ title = 'Dropper', ...props }, ref) {
  return redstoneContainer({ ...props, kind: 'dropper', title }, ref);
});
