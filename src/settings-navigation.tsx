import {forwardRef, useRef, useState, version as reactVersion} from 'react';
import type {CSSProperties, HTMLAttributes, Ref, SyntheticEvent} from 'react';
import type {WorldSettingsFont} from './world-settings-actions';
import {ClassicSkin} from './classic-skin';
import {Image} from './image';
import {settingsNavigationAssets} from './settings-navigation-assets';
import {deferClassicRequest, useClassicLayoutEffect, useClassicNodeRef} from './classic-screen-lifecycle';

export interface SettingsNavigationImage {
  readonly src: string; readonly sourceSize: readonly [number, number]; readonly visible: boolean;
}
interface NavigationItemBase {
  readonly id: string; readonly sourceControl: string;
  readonly ignored: boolean; readonly visible: boolean; readonly enabled: boolean;
}
export interface SettingsNavigationSection extends NavigationItemBase {
  readonly kind: 'section'; readonly label: string;
  /** Source identity is independent from controlled value and array position. */
  readonly viewBinding: string; readonly sourceIndex: number; readonly panelTitle: string;
  readonly glyph: {readonly outline: SettingsNavigationImage | null; readonly color: SettingsNavigationImage | null;
    readonly size: readonly [number, number]};
}
export interface SettingsNavigationGroup extends NavigationItemBase {
  readonly kind: 'group'; readonly label: string;
  /** Explicit host-resolved source `default` label height, not a text-length formula. */
  readonly height: number;
}
export interface SettingsNavigationSpacer extends NavigationItemBase {
  readonly kind: 'spacer'; readonly size: readonly [number | '100%', number];
}
export type SettingsNavigationItem = SettingsNavigationSection | SettingsNavigationGroup | SettingsNavigationSpacer;
export interface SettingsNavigationDetail {
  readonly id: string; readonly sourceControl: string; readonly viewBinding: string;
  readonly sourceIndex: number; readonly panelTitle: string; readonly sourceGroup: 'navigation_tab';
  readonly previousValue: string | null; readonly origin: 'activation' | 'hover';
  readonly control: HTMLButtonElement; readonly event: SyntheticEvent<HTMLButtonElement>;
}
export interface SettingsNavigationProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML' | 'onChange' | 'defaultValue'> {
  readonly children?: never; readonly dangerouslySetInnerHTML?: never; readonly defaultValue?: never; readonly inert?: boolean;
  readonly label: string; readonly width: number; readonly scale: number; readonly font: WorldSettingsFont;
  readonly items: readonly SettingsNavigationItem[]; readonly value: string | null;
  /** Retained source metadata; neither index is used to guess a selected value. */
  readonly sourceDefaultIndex: number; readonly toggleOnHover: boolean;
  readonly hoverPolicy: 'activation-only' | 'request-when-source-flag';
  readonly hiddenSlots: 'reserve' | 'collapse'; readonly disabled?: boolean;
  readonly onValueChange?: (value: string, detail: SettingsNavigationDetail) => void | false;
  readonly itemRefs?: Readonly<Record<string, Ref<HTMLButtonElement>>>;
}

type Snapshot = Pick<SettingsNavigationProps, 'width' | 'scale' | 'font' | 'items' | 'value' | 'sourceDefaultIndex' | 'toggleOnHover' | 'hoverPolicy' | 'hiddenSlots' | 'disabled' | 'onValueChange'>;
const cx = (...values: (string | undefined)[]) => values.filter(Boolean).join(' ');
function record(input: unknown, name: string): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw new TypeError(name + ' must be a plain record.');
  const descriptors = Object.getOwnPropertyDescriptors(input);
  for (const descriptor of Object.values(descriptors)) if (!('value' in descriptor)) throw new TypeError(name + ' must not contain accessors.');
  return input as Record<string, unknown>;
}
function text(input: unknown, name: string, nonempty = false): asserts input is string {
  if (typeof input !== 'string' || input.length > 1048576 || nonempty && (!input.trim() || input.length > 4096)) throw new TypeError(name + ' must be bounded host text.');
}
function flag(input: unknown, name: string): asserts input is boolean {if (typeof input !== 'boolean') throw new TypeError(name + ' must be an explicit boolean.');}
function extent(input: unknown, name: string, zero = false): asserts input is number {
  if (typeof input !== 'number' || !Number.isFinite(input) || input < (zero ? 0 : Number.MIN_VALUE) || input > 8192) throw new RangeError(name + ' must be a finite bounded logical extent.');
}
function pair(input: unknown, name: string): readonly [unknown, unknown] {
  if (!Array.isArray(input) || input.length !== 2 || !Object.hasOwn(input, 0) || !Object.hasOwn(input, 1)) throw new TypeError(name + ' requires two dense axes.');
  const descriptors = Object.getOwnPropertyDescriptors(input);
  for (const descriptor of Object.values(descriptors)) if (!('value' in descriptor)) throw new TypeError(name + ' must not contain accessors.');
  return [descriptors['0']!.value, descriptors['1']!.value];
}
function index(input: unknown, name: string): asserts input is number {
  if (typeof input !== 'number' || !Number.isSafeInteger(input) || input < -1 || input > 2147483647) throw new RangeError(name + ' must be a source index within the Web budget.');
}
function image(input: SettingsNavigationImage | null): SettingsNavigationImage | null {
  if (input === null) return null;
  const data = record(input, 'navigation glyph'); text(data.src, 'glyph URL', true); flag(data.visible, 'glyph visible'); const sourceSize = pair(data.sourceSize, 'glyph sourceSize');
  for (const axis of sourceSize) if (typeof axis !== 'number' || !Number.isSafeInteger(axis) || axis <= 0 || axis > 32768) throw new RangeError('Glyph sourceSize must contain bounded original physical pixel dimensions.');
  return Object.freeze({src: data.src, visible: data.visible, sourceSize: Object.freeze([...sourceSize]) as readonly [number, number]});
}
function snapshot(p: SettingsNavigationProps): Snapshot {
  if (p.children !== undefined || p.dangerouslySetInnerHTML !== undefined) throw new TypeError('SettingsNavigation owns its finite source children.');
  if (p.defaultValue !== undefined) throw new TypeError('SettingsNavigation accepts only an explicit controlled value.');
  text(p.label, 'navigation label', true); extent(p.width, 'navigation width');
  if (p.width < 45 || !Number.isSafeInteger(p.scale) || p.scale < 1 || p.width * p.scale > 8192) throw new RangeError('Navigation needs width>=45, integer scale and bounded physical width.');
  const font = record(p.font, 'navigation font'); text(font.family, 'font family', true); extent(font.size, 'font size'); extent(font.lineHeight, 'font lineHeight');
  if (font.size * p.scale > 8192 || font.lineHeight * p.scale > 8192) throw new RangeError('Navigation font exceeds its physical Web budget.');
  if (p.value !== null) text(p.value, 'controlled value', true);
  index(p.sourceDefaultIndex, 'source default index'); flag(p.toggleOnHover, 'toggleOnHover');
  if (p.disabled !== undefined) flag(p.disabled, 'disabled'); if (p.inert !== undefined) flag(p.inert, 'inert');
  if (!['activation-only', 'request-when-source-flag'].includes(p.hoverPolicy) || !['reserve', 'collapse'].includes(p.hiddenSlots)) throw new TypeError('Navigation requires explicit hover and hidden-slot Web policies.');
  if (p.onValueChange !== undefined && typeof p.onValueChange !== 'function') throw new TypeError('Navigation onValueChange must be a function.');
  if (p.itemRefs !== undefined) record(p.itemRefs, 'navigation itemRefs');
  if (!Array.isArray(p.items) || p.items.length > 512) throw new RangeError('Navigation needs a bounded complete item array.');
  const descriptors = Object.getOwnPropertyDescriptors(p.items);
  for (const descriptor of Object.values(descriptors)) if (!('value' in descriptor)) throw new TypeError('Navigation array must not contain accessors.');
  const ids = new Set<string>(); let height = 0;
  const items = Array.from({length: p.items.length}, (_, position): SettingsNavigationItem => {
    const input = descriptors[String(position)]?.value;
    if (!Object.hasOwn(p.items, position)) throw new TypeError('Navigation items must be dense.');
    const raw = record(input, 'navigation item'); text(raw.id, 'item id', true); text(raw.sourceControl, 'source control', true);
    if (ids.has(raw.id)) throw new TypeError('Navigation item IDs must be unique.'); ids.add(raw.id);
    for (const key of ['ignored', 'visible', 'enabled']) flag(raw[key], 'item ' + key);
    const base = {id: raw.id, sourceControl: raw.sourceControl, ignored: raw.ignored as boolean, visible: raw.visible as boolean, enabled: raw.enabled as boolean};
    let result: SettingsNavigationItem;
    if (raw.kind === 'section') {
      text(raw.label, 'section label', true); text(raw.viewBinding, 'view binding', true); text(raw.panelTitle, 'panel title'); index(raw.sourceIndex, 'source forced index');
      const glyph = record(raw.glyph, 'section glyph'), size = pair(glyph.size, 'glyph display size'); for (const axis of size) extent(axis, 'glyph display extent');
      if ((size[0] as number) * p.scale > 8192 || (size[1] as number) * p.scale > 8192) throw new RangeError('Navigation glyph exceeds its physical Web budget.');
      result = Object.freeze({...base, kind: 'section', label: raw.label, viewBinding: raw.viewBinding, sourceIndex: raw.sourceIndex, panelTitle: raw.panelTitle,
        glyph: Object.freeze({outline: image(glyph.outline as SettingsNavigationImage | null), color: image(glyph.color as SettingsNavigationImage | null), size: Object.freeze([...size]) as readonly [number, number]})});
    } else if (raw.kind === 'group') {
      text(raw.label, 'group label'); extent(raw.height, 'resolved group height'); result = Object.freeze({...base, kind: 'group', label: raw.label, height: raw.height});
    } else if (raw.kind === 'spacer') {
      const size = pair(raw.size, 'spacer size'); if (size[0] !== '100%') extent(size[0], 'spacer width', true); extent(size[1], 'spacer height', true);
      result = Object.freeze({...base, kind: 'spacer', size: Object.freeze([...size]) as readonly [number | '100%', number]});
    } else throw new TypeError('Navigation item must be section, group or spacer.');
    if (!result.ignored && (result.visible || p.hiddenSlots === 'reserve')) height += result.kind === 'section' ? 30 : result.kind === 'group' ? result.height : result.size[1];
    return result;
  });
  if (height * p.scale > 8192 || p.width * p.scale * height * p.scale > 16777216) throw new RangeError('Navigation exceeds its finite Web layout budget.');
  return Object.freeze({width: p.width, scale: p.scale, font: Object.freeze({family: font.family, size: font.size, lineHeight: font.lineHeight}),
    items: Object.freeze(items), value: p.value, sourceDefaultIndex: p.sourceDefaultIndex, toggleOnHover: p.toggleOnHover,
    hoverPolicy: p.hoverPolicy, hiddenSlots: p.hiddenSlots, disabled: p.disabled, onValueChange: p.onValueChange});
}
function available(node: HTMLButtonElement | null): node is HTMLButtonElement {
  if (!node?.isConnected || node.disabled || node.matches(':disabled') || node.closest('[hidden],[inert]') || !node.getClientRects().length || node.ownerDocument.defaultView?.getComputedStyle(node).visibility === 'hidden') return false;
  try {const modal = node.ownerDocument.querySelector('dialog:modal'); return !modal || modal.contains(node);} catch {return true;}
}
function sameIdentity(a: SettingsNavigationSection, b: SettingsNavigationSection) {
  return a.id === b.id && a.sourceControl === b.sourceControl && a.viewBinding === b.viewBinding && a.sourceIndex === b.sourceIndex && a.panelTitle === b.panelTitle;
}
interface SectionProps {item: SettingsNavigationSection; model: Snapshot; tabStop: boolean; onFocused: (id: string) => void}
const Section = forwardRef<HTMLButtonElement, SectionProps>(function Section({item, model, tabStop, onFocused}, ref) {
  const [node, attach] = useClassicNodeRef(ref), live = useRef({item, model});
  useClassicLayoutEffect(() => {live.current = {item, model};});
  const s = model.scale, checked = model.value === item.id;
  const request = (event: SyntheticEvent<HTMLButtonElement>, origin: SettingsNavigationDetail['origin']) => {
    const control = event.currentTarget, captured = live.current;
    if (captured.model.disabled || !captured.item.enabled || !captured.item.visible || captured.item.ignored || captured.model.value === captured.item.id) return;
    const valid = () => {
      const now = live.current;
      return node.current === control && available(control) && !now.model.disabled && now.item.enabled && now.item.visible && !now.item.ignored
        && now.model.value === captured.model.value && now.model.onValueChange === captured.model.onValueChange && sameIdentity(now.item, captured.item)
        && (origin !== 'hover' || now.model.hoverPolicy === 'request-when-source-flag' && now.model.toggleOnHover);
    };
    if (origin === 'hover' && !(captured.model.hoverPolicy === 'request-when-source-flag' && captured.model.toggleOnHover)) return;
    deferClassicRequest(event, control, stable => {if (valid()) captured.model.onValueChange?.(captured.item.id, Object.freeze({
      id: captured.item.id, sourceControl: captured.item.sourceControl, viewBinding: captured.item.viewBinding,
      sourceIndex: captured.item.sourceIndex, panelTitle: captured.item.panelTitle, sourceGroup: 'navigation_tab',
      previousValue: captured.model.value, origin, control, event: stable,
    }));}, valid);
  };
  return <button ref={attach} type="button" role="radio" aria-checked={checked} disabled={model.disabled || !item.enabled || !item.visible}
    aria-hidden={!item.visible || undefined} hidden={!item.visible && model.hiddenSlots === 'collapse'}
    data-settings-navigation-id={item.id} data-source-control={item.sourceControl} data-source-view-binding={item.viewBinding}
    data-source-forced-index={item.sourceIndex} data-source-panel-title={item.panelTitle}
    className="mc-settings-navigation-section" tabIndex={tabStop ? 0 : -1}
    style={{width: model.width * s, height: 30 * s, visibility: item.visible ? undefined : 'hidden'}}
    onFocus={() => onFocused(item.id)} onClick={event => request(event, 'activation')}
    onPointerEnter={event => {if (event.pointerType !== 'touch') request(event, 'hover');}}
    onKeyDown={event => {if ((event.nativeEvent.isComposing || event.keyCode === 229) && ['Enter', ' '].includes(event.key)) event.preventDefault();}}>
    <span className="mc-settings-navigation-section__paint" aria-hidden="true">
      {(['unchecked', 'checked', 'uncheckedHover', 'checkedHover', 'locked'] as const).map(state => <span key={state} className={'mc-settings-navigation-section__state mc-settings-navigation-section__state--' + state}>
        <ClassicSkin asset={settingsNavigationAssets[state]} width={model.width - 2} height={29} scale={s} baseClass="mc-settings-navigation-skin"/>
      </span>)}
      <span className="mc-settings-navigation-section__border"><ClassicSkin asset={settingsNavigationAssets.border} width={model.width} height={31} scale={s} baseClass="mc-settings-navigation-skin"/></span>
    </span>
    <span className="mc-settings-navigation-section__content">
      <span className="mc-settings-navigation-section__glyph" aria-hidden="true" style={{width: item.glyph.size[0] * s, height: item.glyph.size[1] * s}}>
        {item.glyph.outline?.visible && <Image className="mc-settings-navigation-section__outline-glyph" src={item.glyph.outline.src} sourceSize={item.glyph.outline.sourceSize} size={item.glyph.size} scale={s} alt=""/>}
        {item.glyph.color?.visible && <Image className="mc-settings-navigation-section__color-glyph" src={item.glyph.color.src} sourceSize={item.glyph.color.sourceSize} size={item.glyph.size} scale={s} alt=""/>}
      </span>
      <span className="mc-settings-navigation-section__label"><span>{item.label}</span></span>
    </span>
  </button>;
});

/** Source30-unit radio rows with31-unit state paint. No source index guesses an
 * accepted value. Roving focus/centered omitted anchors are explicit Web policy.
 * Server progress_loading_bars provider is not implemented by this finite part. */
export const SettingsNavigation = forwardRef<HTMLDivElement, SettingsNavigationProps>(function SettingsNavigation(props, ref) {
  const model = snapshot(props), {label, inert, hidden, className, style, onKeyDown, onBlur, itemRefs, ...rest} = props;
  const native = {...rest} as Record<string, unknown>;
  for (const name of ['width', 'scale', 'font', 'items', 'value', 'sourceDefaultIndex', 'toggleOnHover', 'hoverPolicy', 'hiddenSlots', 'disabled', 'onValueChange', 'children', 'dangerouslySetInnerHTML', 'defaultValue']) delete native[name];
  const [, attach] = useClassicNodeRef(ref), [focused, setFocused] = useState<string | null>(null);
  const eligible = model.items.filter((item): item is SettingsNavigationSection => item.kind === 'section' && !item.ignored && item.visible && item.enabled && !model.disabled);
  const tabStop = eligible.find(item => item.id === focused)?.id ?? eligible.find(item => item.id === model.value)?.id ?? eligible[0]?.id;
  const inertProps = {inert: inert ? Number.parseInt(reactVersion, 10) < 19 ? '' : true : undefined} as Record<string, string | boolean | undefined>;
  const frame = {width: model.width * model.scale, fontFamily: model.font.family, fontSize: model.font.size * model.scale,
    lineHeight: `${model.font.lineHeight * model.scale}px`, '--mc-settings-navigation-u': `${model.scale}px`} as CSSProperties;
  return <div {...native} {...inertProps} ref={attach} hidden={hidden} className={cx('mc-settings-navigation', className)}
    role={props.role ?? 'radiogroup'} aria-label={props['aria-label'] ?? label} aria-orientation="vertical" aria-disabled={model.disabled || props['aria-disabled']}
    data-source-group="navigation_tab" data-source-default-index={model.sourceDefaultIndex} data-source-toggle-on-hover={model.toggleOnHover}
    data-hover-policy={model.hoverPolicy} data-hidden-slots={model.hiddenSlots} data-native-certified="false" style={{...style, ...frame}}
    onBlur={event => {onBlur?.(event); if (!event.currentTarget.contains(event.relatedTarget)) setFocused(null);}}
    onKeyDown={event => {
      const owner = event.currentTarget, target = event.target as Element;
      onKeyDown?.(event);
      if (event.defaultPrevented || event.nativeEvent.defaultPrevented || event.nativeEvent.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey || !owner.contains(target) || owner.closest('[hidden],[inert]')) return;
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      const candidates = Array.from(owner.querySelectorAll<HTMLButtonElement>('button[data-settings-navigation-id]')).filter(available), at = candidates.findIndex(button => button === owner.ownerDocument.activeElement);
      if (!candidates.length) return;
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? candidates.length - 1 : at < 0 ? event.key === 'ArrowDown' ? 0 : candidates.length - 1 : (at + (event.key === 'ArrowDown' ? 1 : -1) + candidates.length) % candidates.length;
      event.preventDefault(); candidates[next]!.focus();
    }}>
    {model.items.filter(item => !item.ignored).map(item => {
      if (item.kind === 'section') return <Section key={item.id} item={item} model={model} ref={itemRefs && Object.hasOwn(itemRefs, item.id) ? itemRefs[item.id] : undefined} tabStop={item.id === tabStop} onFocused={setFocused}/>;
      const itemStyle: CSSProperties = {visibility: item.visible ? undefined : 'hidden', height: (item.kind === 'group' ? item.height : item.size[1]) * model.scale,
        width: item.kind === 'spacer' && item.size[0] !== '100%' ? item.size[0] * model.scale : model.width * model.scale};
      return <div key={item.id} data-source-control={item.sourceControl} data-source-enabled={item.enabled} data-settings-navigation-id={item.id}
        hidden={!item.visible && model.hiddenSlots === 'collapse'} aria-hidden={item.kind === 'spacer' || !item.visible || undefined}
        className={'mc-settings-navigation-' + item.kind} style={itemStyle}>{item.kind === 'group' && <span>{item.label}</span>}</div>;
    })}
  </div>;
});
