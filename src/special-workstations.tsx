import { forwardRef, useRef } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { ItemSlot, ResultSlot } from './inventory';
import type { InventoryItem, InventorySlotAction } from './inventory';
import { ProcessingArrow } from './processing';
import { WorkstationFrame } from './workstations';
import type { WorkstationFrameProps } from './workstations';

type MainPanelProps = Omit<WorkstationFrameProps, 'title' | 'children' | 'onClose' | 'closeLabel'>;
export type SmithingBaseOverlay = 'armors' | 'armors-and-tools';
export type SmithingMaterialOverlay = 'all' | 'ingot';
export interface SmithingTableProps extends MainPanelProps {
  title?: string;
  inputs?: readonly [InventoryItem | null, InventoryItem | null, InventoryItem | null];
  result?: InventoryItem | null;
  invalid?: boolean;
  invalidReason?: string;
  templateOverlay?: boolean;
  /** Defaults to null, matching the native empty table; the host supplies binding state. */
  baseOverlay?: SmithingBaseOverlay | null;
  /** Defaults to null; enable the source overlay appropriate to the supplied template. */
  materialOverlay?: SmithingMaterialOverlay | null;
  /** A fixed source UV frame; omit to run the original one-frame-per-second sequence. */
  overlayFrame?: number;
  /** Native equipment_preview_renderer replacement, in its original25x25 game-pixel box. */
  preview?: ReactNode;
  previewLabel?: string;
  onInputAction?: (index: 0 | 1 | 2, action: InventorySlotAction) => void;
  onTakeResult?: (action: InventorySlotAction) => void;
}

function move(event: KeyboardEvent<HTMLButtonElement>, target: HTMLButtonElement | null | undefined) {
  if (event.defaultPrevented || !target) return;
  event.preventDefault(); target.focus();
}

function Overlay({ kind, frame }: { kind: 'templates' | SmithingBaseOverlay | SmithingMaterialOverlay; frame?: number }) {
  const frames = { templates: 2, armors: 4, 'armors-and-tools': 12, all: 7, ingot: 1 }[kind];
  const frozen = frame !== undefined || frames === 1;
  const index = Number.isFinite(frame) ? ((Math.trunc(frame!) % frames) + frames) % frames : 0;
  return <span className={['mc-smithing__overlay', `mc-smithing__overlay--${kind}`, frozen && 'mc-smithing__overlay--static'].filter(Boolean).join(' ')}
    data-frame={frozen ? index : undefined} aria-hidden="true" style={{
      '--mc-smithing-frames': frames,
      '--mc-smithing-duration': `${frames}s`,
      '--mc-smithing-strip-width': `${frames * 32}px`,
      '--mc-smithing-frame-position': `${-index * 32}px`,
      '--mc-smithing-end-position': `${-frames * 32}px`,
    } as CSSProperties}/>;
}

/** Modern three-input Classic smithing main panel (smithing_table_2). */
export const SmithingTable = forwardRef<HTMLElement, SmithingTableProps>(function SmithingTable({
  title = 'Upgrade Gear', inputs = [null, null, null], result, invalid = false,
  invalidReason = 'Items cannot be upgraded', templateOverlay = true,
  baseOverlay = null, materialOverlay = null, overlayFrame,
  preview, previewLabel = 'Equipment preview', onInputAction, onTakeResult, className, ...props
}, ref) {
  const inputsRef = useRef<(HTMLButtonElement | null)[]>([]), resultRef = useRef<HTMLButtonElement | null>(null);
  const underlays = [templateOverlay ? <Overlay kind="templates" frame={overlayFrame}/> : null,
    baseOverlay ? <Overlay kind={baseOverlay} frame={overlayFrame}/> : null,
    materialOverlay ? <Overlay kind={materialOverlay} frame={overlayFrame}/> : null];
  return <WorkstationFrame {...props} onClose={undefined} ref={ref} title={title}
    className={['mc-smithing', className].filter(Boolean).join(' ')}>
    <span className="mc-smithing__icon" aria-hidden="true"/>
    {(['template', 'input', 'material'] as const).map((slot, index) => <ItemSlot key={slot}
      ref={node => { inputsRef.current[index] = node; }} className={`mc-smithing__${slot}`}
      label={['Smithing template', 'Equipment to upgrade', 'Upgrade material'][index]} item={inputs[index]}
      underlay={underlays[index]} onClick={() => onInputAction?.(index as 0 | 1 | 2, 'primary')}
      onSecondaryAction={() => onInputAction?.(index as 0 | 1 | 2, 'secondary')}
      onKeyDown={event => {
        if (event.key === 'ArrowLeft' && index > 0) move(event, inputsRef.current[index - 1]);
        else if (event.key === 'ArrowRight') move(event, index === 2 ? resultRef.current : inputsRef.current[index + 1]);
      }}/>)}
    <ProcessingArrow className="mc-smithing__arrow" variant="crafting"/>
    {invalid && <span className="mc-smithing__invalid" role="img" aria-label={invalidReason}
      data-native-tooltip-renderer="hover_text_renderer"/>}
    <ResultSlot ref={resultRef} className="mc-smithing__result" label="Upgraded item" item={result}
      available={!invalid} onTake={action => onTakeResult?.(action)}
      onKeyDown={event => { if (event.key === 'ArrowLeft') move(event, inputsRef.current[2]); }}/>
    <div className="mc-smithing__preview" role={preview ? 'img' : undefined} aria-label={preview ? previewLabel : undefined}
      aria-hidden={!preview || undefined} data-native-renderer="equipment_preview_renderer"
      data-renderer-unavailable={!preview || undefined}>{preview}</div>
  </WorkstationFrame>;
});

export type CartographyMode = 'none' | 'clone' | 'rename' | 'basic' | 'locator' | 'extend' | 'locked';
export interface CartographyTableProps extends MainPanelProps {
  title?: string;
  name?: string;
  onNameChange?: (name: string) => void;
  renameLabel?: string;
  renamePlaceholder?: string;
  renameDisabled?: boolean;
  renameReadOnly?: boolean;
  inputs?: readonly [InventoryItem | null, InventoryItem | null];
  result?: InventoryItem | null;
  resultAvailable?: boolean;
  mode?: CartographyMode;
  description?: string;
  onInputAction?: (index: 0 | 1, action: InventorySlotAction) => void;
  onTakeResult?: (action: InventorySlotAction) => void;
}

/** Classic cartography main panel, using the source176x220 large-viewport profile. */
export const CartographyTable = forwardRef<HTMLElement, CartographyTableProps>(function CartographyTable({
  title = 'Cartography Table', name = '', onNameChange, renameLabel = 'Map Name', renamePlaceholder = '',
  renameDisabled = false, renameReadOnly = false, inputs = [null, null], result, resultAvailable = true,
  mode = 'none', description = '', onInputAction, onTakeResult, className, ...props
}, ref) {
  const inputRef = useRef<HTMLButtonElement | null>(null), additionalRef = useRef<HTMLButtonElement | null>(null), resultRef = useRef<HTMLButtonElement | null>(null);
  return <WorkstationFrame {...props} onClose={undefined} ref={ref} title={title}
    className={['mc-cartography', className].filter(Boolean).join(' ')}>
    <label className="mc-cartography__name-label">
      <span>{renameLabel}</span>
      <span className="mc-cartography__name-field" data-disabled={renameDisabled || undefined}>
        <input className="mc-cartography__name-input" aria-label={renameLabel} value={name}
          placeholder={renamePlaceholder} maxLength={30} disabled={renameDisabled} readOnly={renameReadOnly}
          autoComplete="off" spellCheck={false} onChange={event => onNameChange?.(event.currentTarget.value)}/>
      </span>
    </label>
    <div className="mc-cartography__main">
      <ItemSlot ref={inputRef} className="mc-cartography__input" label="Map input" item={inputs[0]}
        onClick={() => onInputAction?.(0, 'primary')} onSecondaryAction={() => onInputAction?.(0, 'secondary')}
        onKeyDown={event => {
          if (event.key === 'ArrowDown') move(event, additionalRef.current);
          else if (event.key === 'ArrowRight') move(event, resultRef.current);
        }}/>
      <span className="mc-cartography__plus" aria-hidden="true"/>
      <ItemSlot ref={additionalRef} className="mc-cartography__additional" label="Additional material" item={inputs[1]}
        onClick={() => onInputAction?.(1, 'primary')} onSecondaryAction={() => onInputAction?.(1, 'secondary')}
        onKeyDown={event => {
          if (event.key === 'ArrowUp') move(event, inputRef.current);
          else if (event.key === 'ArrowRight') move(event, resultRef.current);
        }}/>
      <span className="mc-cartography__arrow mc-cartography__arrow--input" aria-hidden="true"/>
      <span className={`mc-cartography__map mc-cartography__map--${mode}`} data-mode={mode}
        role="img" aria-label={`Cartography preview: ${mode}`}/>
      <span className="mc-cartography__arrow mc-cartography__arrow--result" aria-hidden="true"/>
      <ResultSlot ref={resultRef} className="mc-cartography__result" size="large" label="Map result" item={result}
        available={resultAvailable} onTake={action => onTakeResult?.(action)}
        onKeyDown={event => { if (event.key === 'ArrowLeft') move(event, additionalRef.current); }}/>
    </div>
    <span className="mc-cartography__description" data-fidelity="stack-anchor-unverified">{description}</span>
  </WorkstationFrame>;
});
