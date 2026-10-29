import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { guiIconAssets } from './gui-icon-assets';
import type { GuiIconName } from './gui-icon-assets';
export { guiIconNames } from './gui-icon-assets';
export type { GuiIconName } from './gui-icon-assets';

export interface GuiIconProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  name: GuiIconName;
  /** Original PNG pixel dimensions multiplied by this positive integer. */
  scale?: number;
  /** Omission is decorative. Standard explicit ARIA naming/visibility overrides are retained. */
  label?: string;
}

/** Complete original GUI PNGs. No usage-specific resizing, cropping or tint is inferred. */
export const GuiIcon = forwardRef<HTMLSpanElement, GuiIconProps>(function GuiIcon({ name, scale = 1, label, className, style, ...props }, ref) {
  if (typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(guiIconAssets, name)) throw new RangeError('Unknown GuiIcon name.');
  if (!Number.isSafeInteger(scale) || scale <= 0) throw new RangeError('GuiIcon scale must be a positive safe integer.');
  const icon = guiIconAssets[name], width = icon.width * scale, height = icon.height * scale;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) throw new RangeError('Scaled GuiIcon dimensions exceed the safe integer range.');
  const accessibleLabel = props['aria-label'] ?? label;
  const named = !!(accessibleLabel?.trim() || props['aria-labelledby']?.trim());
  return <span {...props} ref={ref} className={['mc-gui-icon', className].filter(Boolean).join(' ')} data-gui-icon={name}
    role={props.role ?? (named ? 'img' : undefined)} aria-label={accessibleLabel}
    aria-hidden={props['aria-hidden'] ?? (named ? undefined : true)}
    style={{ display: 'inline-block', width, height, flexShrink: 0, verticalAlign: 'middle', lineHeight: 0, imageRendering: 'pixelated', ...style }}>
    <img className="mc-gui-icon__image" src={icon.url} width={width} height={height} alt="" aria-hidden="true" draggable={false}
      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}/>
  </span>;
});
