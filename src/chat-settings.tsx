import { forwardRef, useId, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, FormEvent, KeyboardEvent, MouseEvent, ReactNode, Ref, SyntheticEvent } from 'react';
import { chatAssets } from './chat-assets';
import { snapshotChatCapabilities, snapshotChatProfile, snapshotChatSettings, validateChatRef } from './chat-data';
import { ClassicSkin } from './classic-skin';
import { ScrollArea } from './scroll-area';
import { ChatGlyph } from './chat-text';
import { deferClassicRequest, scheduleClassicTask, useClassicLayoutEffect, useClassicNodeRef } from './classic-screen-lifecycle';
import type { ChatCapabilities, ChatPresentationProfile, ChatSettingChange, ChatSettingsState, ChatTextRenderer } from './chat-types';

/** Private leaf. The root owns the sole deferred semantic task, latest model,
 * membership checks, modal/focus manager and dim layer. No host state is accepted
 * optimistically here. Local dropdown expansion is a finite Web view policy. */
export interface ChatSettingsPanelProps {
  readonly runKey: string;
  readonly settings: ChatSettingsState;
  readonly profile: ChatPresentationProfile;
  readonly capabilities: ChatCapabilities;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly renderText?: ChatTextRenderer;
  readonly dropdownRef?: Ref<ChatSettingsDropdownHandle>;
  readonly onRequest: (target: 'button.reset_chat_settings' | 'button.close_chat_settings', control: HTMLElement, event: SyntheticEvent<HTMLElement>) => void | false;
  readonly onSettingRequest: (change: ChatSettingChange, control: HTMLInputElement, event: SyntheticEvent<HTMLInputElement>) => void | false;
  readonly nativeHandlers?: {
    readonly onClick?: (event: MouseEvent<HTMLElement>) => void;
    readonly onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    readonly onInput?: (event: FormEvent<HTMLInputElement>) => void;
    readonly onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  };
}
export interface ChatSettingsDropdownHandle {
  isOpen(): boolean;
  dismiss(event?: SyntheticEvent<HTMLElement>): boolean;
}

type Model = Readonly<{
  settings: ChatSettingsState; profile: ChatPresentationProfile; capabilities: ChatCapabilities;
  disabled: boolean; readOnly: boolean; renderText?: ChatTextRenderer;
  runKey: string; dropdownRef?: Ref<ChatSettingsDropdownHandle>;
  onRequest: ChatSettingsPanelProps['onRequest']; onSettingRequest: ChatSettingsPanelProps['onSettingRequest'];
  native: NonNullable<ChatSettingsPanelProps['nativeHandlers']>;
}>;
type AssetKey = keyof typeof chatAssets;
const asset = (name: string) => chatAssets[('textures/ui/' + name) as AssetKey];
const sourceLabels = ['chat.settings', 'chat.settings.muteAll', 'chat.settings.muteEmotes', 'chat.settings.tts',
  'chat.settings.font', 'chat.settings.chatColor', 'chat.settings.mentionsColor', 'options.resetSettings', 'accessibility.button.close'] as const;

/** Pure root preflight: no hook, callback invocation, ref assignment or IO. */
export function snapshotChatSettingsPanel(props: ChatSettingsPanelProps): Model {
  const settings = snapshotChatSettings(props.settings), profile = snapshotChatProfile(props.profile), capabilities = snapshotChatCapabilities(props.capabilities);
  const disabled = props.disabled ?? false, readOnly = props.readOnly ?? false;
  if (typeof disabled !== 'boolean' || typeof readOnly !== 'boolean') throw new TypeError('Chat settings disabled/readOnly must be boolean.');
  const runKey = props.runKey, dropdownRef = props.dropdownRef;
  if (typeof runKey !== 'string' || runKey.length > 256 || !runKey.trim()) throw new TypeError('Chat settings requires a finite nonempty runKey.');
  validateChatRef(dropdownRef, 'Chat settings dropdown ref');
  const native = Object.freeze({ onClick: props.nativeHandlers?.onClick, onChange: props.nativeHandlers?.onChange,
    onInput: props.nativeHandlers?.onInput, onKeyDown: props.nativeHandlers?.onKeyDown });
  const renderText = props.renderText, onRequest = props.onRequest, onSettingRequest = props.onSettingRequest;
  if (typeof onRequest !== 'function' || typeof onSettingRequest !== 'function'
    || (renderText !== undefined && typeof renderText !== 'function') || Object.values(native).some(fn => fn !== undefined && typeof fn !== 'function'))
    throw new TypeError('Chat settings requires callable requests and optional native/glyph callbacks.');
  const s = profile.scale;
  if (settings.popup !== null && (252 * s > 8192 || 160 * s > 8192 || 252 * 160 * s * s > 4194304))
    throw new RangeError('Chat settings popup exceeds the finite Web extent budget.');
  // Validate latent once-visible labels too: the pure root cannot inspect a
  // previously committed instance's once sample before rendering its header.
  if (settings.popup !== null) for (const key of sourceLabels)
    if (typeof profile.labels[key] !== 'string') throw new RangeError(`Chat settings requires profile.labels[${JSON.stringify(key)}].`);
  return Object.freeze({ settings, profile, capabilities, disabled, readOnly, renderText, onRequest, onSettingRequest, native, runKey, dropdownRef });
}

function Skin({ name, width, height, scale, className = '' }: { name: string; width: number; height: number; scale: number; className?: string }) {
  return <ClassicSkin asset={asset(name)} width={width} height={height} scale={scale} baseClass="mc-chat-settings-skin" className={className} errorName="Chat settings" />;
}

function Text({ value, model, id, color = 'rgb(100% 100% 100%)', shadow = false, smooth = false, factor = 1, currentChatFamily = false }: {
  value: string; model: Model; id: string; color?: string; shadow?: boolean; smooth?: boolean; factor?: number; currentChatFamily?: boolean;
}) {
  const sourceFont = smooth ? model.profile.fonts.smooth : model.profile.fonts.chrome;
  const font = Object.freeze({ ...sourceFont, ...(currentChatFamily ? { family: model.profile.fonts.chat.family } : {}), logicalSize: sourceFont.logicalSize * factor });
  return <span className="mc-chat-settings__text"><ChatGlyph text={value} role="settings-label" profile={model.profile} renderText={model.renderText} color={color} shadow={shadow} font={font} id={id} /></span>;
}

function Paintbrush({ color, size, scale }: { color: string; size: number; scale: number }) {
  const filterId = useId() + '-paintbrush-tint';
  return <span aria-hidden="true" className="mc-chat-settings__paintbrush" style={{ width: size * scale, height: size * scale }}>
    <svg width="0" height="0" aria-hidden="true"><defs><filter id={filterId} colorInterpolationFilters="sRGB" x="0" y="0" width="1" height="1">
      <feFlood floodColor={color} result="tint" /><feComposite in="SourceGraphic" in2="tint" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" />
    </filter></defs></svg>
    <img src={asset('text_color_paintbrush').url} alt="" draggable={false} />
    <img src={asset('text_color_paintbrush_overlay').url} alt="" draggable={false} style={{ filter: `url(${JSON.stringify('#' + filterId)})` }} />
  </span>;
}

function StateText({ value, model, id, checked = false, typeface = false }: { value: string; model: Model; id: string; checked?: boolean; typeface?: boolean }) {
  return <span aria-hidden="true" className="mc-chat-settings__state-text">
    {(['normal', 'hover', 'pressed', 'locked'] as const).map(state => <span key={state} className={'mc-chat-settings__state-' + state}>
      <Text value={value} model={model} id={id + '-' + state} color={state === 'hover' || state === 'pressed' ? 'rgb(100% 100% 100%)' : state === 'normal' && checked ? 'rgb(12.16% 12.16% 12.16%)' : 'rgb(30% 30% 30%)'} factor={typeface ? 1.04 : 1} currentChatFamily={typeface} />
    </span>)}
  </span>;
}

/** Four deep source layers: full focus border, inset1 body, inset3 content;
 * state textures follow light_text_button or light_template_toggle separately. */
function ButtonArt({ width, height = 22, scale, dropdown = false, checked = false }: { width: number; height?: number; scale: number; dropdown?: boolean; checked?: boolean }) {
  const normal = dropdown && checked ? 'button_borderless_lightpressednohover' : 'button_borderless_light';
  const hover = dropdown && checked ? 'button_borderless_lightpressed' : 'button_borderless_lighthover';
  return <>
    <Skin name="focus_border_white" width={width} height={height} scale={scale} className="mc-chat-settings__button-border" />
    <span className="mc-chat-settings__button-body">
      <Skin name={normal} width={width - 2} height={height - 2} scale={scale} className="mc-chat-settings__state-normal" />
      <Skin name={hover} width={width - 2} height={height - 2} scale={scale} className="mc-chat-settings__state-hover" />
      <Skin name={dropdown ? hover : 'button_borderless_lightpressed'} width={width - 2} height={height - 2} scale={scale} className="mc-chat-settings__state-pressed" />
      <Skin name="disabledButtonNoBorder" width={width - 2} height={height - 2} scale={scale} className="mc-chat-settings__state-locked" />
    </span>
  </>;
}

function nativeClick(model: Model, event: MouseEvent<HTMLElement>, readonly = false) {
  try { model.native.onClick?.(event); } catch (error) { event.preventDefault(); throw error; }
  if (model.disabled || readonly || event.defaultPrevented || (event.currentTarget as HTMLInputElement).disabled) { event.preventDefault(); return false; }
  return true;
}

function submitSetting(model: Model, event: ChangeEvent<HTMLInputElement>, change: ChatSettingChange, restore: () => void, enabled = true) {
  const control = event.currentTarget;
  try { model.native.onChange?.(event); }
  finally { restore(); }
  if (event.defaultPrevented || model.disabled || model.readOnly || !enabled || control.disabled || control.readOnly) return;
  if (model.onSettingRequest(Object.freeze(change), control, event) === false) event.preventDefault();
}

function Toggle({ model, label, field, value, enabled = true }: { model: Model; label: string; field: 'hide_chat' | 'toggle_emote_chat' | 'toggle_tts'; value: boolean; enabled?: boolean }) {
  const s = model.profile.scale, locked = model.disabled || !enabled;
  const prefix = value ? 'toggle_on' : 'toggle_off';
  return <label className="mc-chat-settings__toggle" data-locked={locked || undefined} data-chat-setting={field}>
    <input type="checkbox" name={field} data-chat-settings-field={field} checked={value} disabled={locked} readOnly={model.readOnly} aria-label={label} aria-readonly={model.readOnly || undefined}
      onClick={event => { nativeClick(model, event, model.readOnly); }}
      onInput={event => { const control = event.currentTarget; let completed = false; try { model.native.onInput?.(event); completed = true; } finally { if (!completed || model.readOnly || locked || event.defaultPrevented) control.checked = value; } }}
      onKeyDown={event => {
        model.native.onKeyDown?.(event);
        if (field === 'hide_chat' && event.key === 'ArrowUp' && !event.defaultPrevented && !locked && !event.altKey && !event.ctrlKey && !event.metaKey) {
          event.preventDefault(); event.currentTarget.closest('.mc-chat-settings')?.querySelector<HTMLButtonElement>('[data-chat-settings-action="button.reset_chat_settings"]')?.focus();
        }
      }}
      onChange={event => { const control = event.currentTarget, next = control.checked; submitSetting(model, event, { kind: 'boolean', field, value: next }, () => { control.checked = value; }, enabled); }} />
    <span aria-hidden="true" className="mc-chat-settings__toggle-art">
      <img src={asset(prefix).url} alt="" draggable={false} style={{ width: 30 * s, height: 16 * s }} />
      <img className="mc-chat-settings__toggle-hover" src={asset(prefix + '_hover').url} alt="" draggable={false} style={{ width: 30 * s, height: 16 * s }} />
    </span>
    <span className="mc-chat-settings__toggle-label"><Text value={label} model={model} id={field} /></span>
  </label>;
}

interface Choice { readonly label: string; readonly selected: boolean; readonly color?: string; readonly smooth?: boolean }
function Choices({ model, rows, group, label, enabled, onChoice }: { model: Model; rows: readonly Choice[]; group: string; label: string; enabled: boolean; onChoice: (index: number) => ChatSettingChange }) {
  const s = model.profile.scale, first = Math.max(0, rows.findIndex(row => row.selected));
  const filterId = useId() + '-radio-background';
  function keys(event: KeyboardEvent<HTMLInputElement>, index: number) {
    model.native.onKeyDown?.(event);
    if (event.defaultPrevented || model.disabled || !enabled || event.altKey || event.ctrlKey || event.metaKey) return;
    const delta = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (delta) {
      event.preventDefault();
      const parent = event.currentTarget.closest('[data-chat-settings-radio-group]');
      const controls = parent?.querySelectorAll<HTMLInputElement>('input[type="radio"]');
      controls?.[(index + delta + rows.length) % rows.length]?.focus();
    }
  }
  return <div className="mc-chat-settings__choices" data-chat-settings-radio-group={group} role="radiogroup" aria-label={label}>
    <svg width="0" height="0" aria-hidden="true"><defs>
      <filter id={filterId + '-off'} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values=".43 0 0 0 0 0 .43 0 0 0 0 0 .43 0 0 0 0 0 1 0" /></filter>
      <filter id={filterId + '-on'} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values=".29 0 0 0 0 0 .29 0 0 0 0 0 .29 0 0 0 0 0 1 0" /></filter>
      <filter id={filterId + '-hover'} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values=".12 0 0 0 0 0 .48 0 0 0 0 0 0 0 0 0 0 0 1 0" /></filter>
    </defs></svg>
    {rows.map((row, index) => <label key={index} className="mc-chat-settings__radio" data-selected={row.selected || undefined} data-locked={model.disabled || !enabled || undefined}>
      <input type="radio" name={`${group}-${index}`} checked={row.selected} disabled={model.disabled || !enabled} readOnly={model.readOnly}
        aria-label={row.label} aria-readonly={model.readOnly || undefined} tabIndex={first === index ? 0 : -1} data-chat-settings-choice={index} data-chat-settings-field={onChoice(index).field}
        onKeyDown={event => keys(event, index)} onClick={event => { nativeClick(model, event, model.readOnly); }}
        onInput={event => { const control = event.currentTarget; let completed = false; try { model.native.onInput?.(event); completed = true; } finally { if (!completed || model.readOnly || model.disabled || !enabled || event.defaultPrevented) control.checked = row.selected; } }}
        onChange={event => { const control = event.currentTarget; submitSetting(model, event, onChoice(index), () => { control.checked = row.selected; }, enabled); }} />
      <span aria-hidden="true" className="mc-chat-settings__radio-background">
        <img src={model.profile.whiteMaterial.src} alt="" draggable={false} style={{ filter: `url(${JSON.stringify('#' + filterId + (row.selected ? '-on' : '-off'))})` }} />
        <img src={model.profile.whiteMaterial.src} alt="" draggable={false} style={{ filter: `url(${JSON.stringify('#' + filterId + '-hover')})` }} />
      </span>
      <span aria-hidden="true" className="mc-chat-settings__radio-art">
        <img src={asset(row.selected ? 'radio_on' : 'radio_off').url} alt="" draggable={false} />
        <img className="mc-chat-settings__radio-hover" src={asset(row.selected ? 'radio_on_hover' : 'radio_off_hover').url} alt="" draggable={false} />
      </span>
      {row.color !== undefined && <Paintbrush color={row.color} size={19} scale={s} />}
      <Text value={row.label} model={model} id={`${group}-${index}`} shadow smooth={row.smooth} />
    </label>)}
  </div>;
}

function Dropdown({ model, label, value, name, width, open, onToggle, disclosure, paintbrush, children, typeface = false, enabled }: {
  model: Model; label: string; value: string; name: string; width: number; open: boolean; onToggle: (event: MouseEvent<HTMLButtonElement>) => void; disclosure: string;
  paintbrush?: string; children: ReactNode; typeface?: boolean; enabled: boolean;
}) {
  const s = model.profile.scale, locked = model.disabled || !enabled;
  return <div className="mc-chat-settings__option" data-chat-setting={name} data-locked={locked || undefined}>
    <div className="mc-chat-settings__option-label"><Text value={label} model={model} id={name + '-label'} /></div>
    <div className="mc-chat-settings__dropdown">
      <button type="button" className="mc-chat-settings__button mc-chat-settings__dropdown-toggle" disabled={locked} aria-label={`${label}: ${value}`}
        aria-expanded={open} aria-controls={name + '-content'} data-checked={open || undefined} data-chat-settings-dropdown={name} data-chat-settings-disclosure={disclosure}
        onKeyDown={event => { model.native.onKeyDown?.(event); }}
        onClick={event => { if (nativeClick(model, event, model.readOnly)) onToggle(event); }}>
        <ButtonArt width={width} scale={s} dropdown checked={open} />
        <span className="mc-chat-settings__button-content" data-paintbrush={paintbrush !== undefined || undefined}>
          {paintbrush !== undefined && <Paintbrush color={paintbrush} size={16} scale={s} />}
          <StateText value={value} model={model} id={name + '-value'} checked={open} typeface={typeface} />
          <span aria-hidden="true" className="mc-chat-settings__chevron"><img src={asset('dropdown_chevron').url} alt="" draggable={false} /><img src={asset('chevron_white_down').url} alt="" draggable={false} /></span>
        </span>
      </button>
      <div id={name + '-content'} className={`mc-chat-settings__dropdown-content ${typeface ? 'mc-chat-settings__dropdown-content--typeface' : ''}`} hidden={!open}>
        <Skin name="dropdown_background" width={width} height={typeface ? 50 : 110} scale={s} />{children}
      </div>
    </div>
  </div>;
}

function Slider({ model, state, field, width }: { model: Model; state: ChatSettingsState['fontSize']; field: 'chat_font_size' | 'chat_line_spacing'; width: number }) {
  const s = model.profile.scale, fraction = (state.value - state.min) / (state.max - state.min), track = width - 10, locked = model.disabled || !state.enabled;
  return <label className="mc-chat-settings__option" data-chat-setting={field} data-locked={locked || undefined}>
    <span className="mc-chat-settings__option-label"><Text value={state.label} model={model} id={field + '-label'} /></span>
    <span className="mc-chat-settings__slider" data-locked={locked || undefined} style={{ '--mc-chat-settings-progress': fraction } as CSSProperties}>
      <span className="mc-chat-settings__slider-track">
        <Skin name="slider_border" width={track} height={10} scale={s} className="mc-chat-settings__slider-border" />
        <span className="mc-chat-settings__slider-inner">
          <Skin name="slider_background" width={track - 2} height={8} scale={s} className="mc-chat-settings__state-normal" />
          <Skin name="slider_background_hover" width={track - 2} height={8} scale={s} className="mc-chat-settings__state-hover" />
          <span className="mc-chat-settings__slider-progress"><Skin name="slider_progress" width={track - 2} height={8} scale={s} className="mc-chat-settings__state-normal" /><Skin name="slider_progress_hover" width={track - 2} height={8} scale={s} className="mc-chat-settings__state-hover" /></span>
        </span>
        {locked && <Skin name="slider_locked_transparent_fade" width={track} height={10} scale={s} className="mc-chat-settings__slider-fade" />}
      </span>
      <span aria-hidden="true" className="mc-chat-settings__slider-thumb">
        <Skin name={locked ? 'slider_button_locked' : 'slider_button_default'} width={10} height={16} scale={s} className="mc-chat-settings__state-normal" />
        {!locked && <><Skin name="slider_button_hover" width={10} height={16} scale={s} className="mc-chat-settings__state-hover" /><Skin name="slider_button_indent" width={10} height={16} scale={s} className="mc-chat-settings__state-pressed" /></>}
      </span>
      <input type="range" name={field} data-chat-settings-field={field} min={state.min} max={state.max} step={state.step} value={state.value} disabled={locked} readOnly={model.readOnly}
        aria-label={state.label} aria-valuetext={state.valueText} aria-readonly={model.readOnly || undefined} data-source-steps={state.steps}
        onClick={event => { nativeClick(model, event, model.readOnly); }} onKeyDown={event => model.native.onKeyDown?.(event)}
        onInput={event => { const control = event.currentTarget; let completed = false; try { model.native.onInput?.(event); completed = true; } finally { if (!completed || model.disabled || model.readOnly || event.defaultPrevented || !state.enabled) control.value = String(state.value); } }}
        onChange={event => { const control = event.currentTarget, value = control.valueAsNumber; submitSetting(model, event, { kind: 'slider', field, value }, () => { control.value = String(state.value); }, state.enabled && Number.isFinite(value) && value >= state.min && value <= state.max); }} />
    </span>
  </label>;
}

function SettingsInstance({ model, forwardedRef }: { model: Model; forwardedRef: Ref<HTMLDivElement> }) {
  const [typefaceVisible] = useState(model.settings.typefaceVisibleAtInstanceCreation);
  type Disclosure = 'typeface' | 'chat' | 'mentions';
  const [open, setOpen] = useState<Disclosure | null>(null);
  const [node, attach] = useClassicNodeRef<HTMLDivElement>(forwardedRef);
  const latest = useRef<Model | null>(null), committedOpen = useRef<Disclosure | null>(null), openGeneration = useRef(0);
  const disclosureEvents = useRef(new WeakSet<object>());
  const popupInstance = model.settings.popup!.instanceId, runKey = model.runKey;
  const enabled = (value: Model, name: Disclosure) => name === 'typeface' ? typefaceVisible && value.settings.typefaceEnabled : name === 'chat' ? value.settings.chatColorEnabled : value.settings.mentionsColorEnabled;
  function live() {
    const current = latest.current, owner = node.current;
    return current && owner && owner.isConnected && !owner.closest('[hidden],[inert],[aria-hidden="true"]')
      && current.runKey === runKey && current.settings.popup?.instanceId === popupInstance ? { current, owner } : null;
  }
  function disclosure(name: Disclosure, event?: SyntheticEvent<HTMLElement>, control?: HTMLElement, dismiss = false): boolean {
    // Dismiss only releases an existing local view; readonly/enable gates
    // still guard opening and host mutation, never trap an already-open view.
    const value = live(); if (!value || (!dismiss && (value.current.disabled || value.current.readOnly || !enabled(value.current, name)))
      || (control && (!value.owner.contains(control) || !control.isConnected || control.matches(':disabled') || control.closest('[hidden],[inert]')))
      || event?.defaultPrevented || event?.nativeEvent.defaultPrevented || (dismiss && committedOpen.current !== name)) return false;
    const eventKey = event?.nativeEvent ?? event;
    if (eventKey && disclosureEvents.current.has(eventKey)) return false;
    if (eventKey) disclosureEvents.current.add(eventKey);
    const generation = openGeneration.current;
    const active = () => {
      const next = live(); return Boolean(next && next.owner === value.owner && (dismiss || (!next.current.disabled && !next.current.readOnly && enabled(next.current, name)))
        && (!control || (next.owner.contains(control) && control.isConnected && !control.matches(':disabled') && !control.closest('[hidden],[inert]')))
        && (!dismiss || (committedOpen.current === name && openGeneration.current === generation)));
    };
    const apply = () => {
      if (!active()) return;
      openGeneration.current++;
      setOpen(previous => dismiss ? previous === name ? null : previous : previous === name ? null : name);
      if (dismiss) value.owner.querySelector<HTMLButtonElement>(`[data-chat-settings-disclosure="${name}"]`)?.focus({ preventScroll: true });
    };
    if (event) deferClassicRequest<HTMLElement, SyntheticEvent<HTMLElement>>(event, value.owner, apply, active); else scheduleClassicTask(value.owner, apply);
    return true;
  }
  const handle = useRef<ChatSettingsDropdownHandle>({
    isOpen: () => Boolean(live() && committedOpen.current !== null),
    dismiss: event => { const name = committedOpen.current; return name === null ? false : disclosure(name, event, undefined, true); },
  });
  const [, attachHandle] = useClassicNodeRef<ChatSettingsDropdownHandle>(model.dropdownRef);
  useClassicLayoutEffect(() => { latest.current = model; committedOpen.current = open; });
  useClassicLayoutEffect(() => { attachHandle(handle.current); return () => { attachHandle(null); }; }, [attachHandle]);
  useClassicLayoutEffect(() => () => { latest.current = null; committedOpen.current = null; }, []);
  const instance = useId(), settings = model.settings, s = model.profile.scale, width = model.capabilities.touch ? 236 : 226;
  const labels = Object.freeze(Object.fromEntries(sourceLabels.map(key => [key, model.profile.labels[key]])));
  const needed = sourceLabels.filter(key => (key !== 'chat.settings.muteEmotes' || !model.capabilities.educationEdition)
    && (key !== 'chat.settings.font' || typefaceVisible) && (key !== 'accessibility.button.close' || settings.popup?.closeButtonVisible));
  for (const key of needed) if (typeof labels[key] !== 'string') throw new RangeError(`Chat settings requires profile.labels[${JSON.stringify(key)}].`);
  const localized = (key: typeof sourceLabels[number]): string => {
    const value = labels[key]; if (typeof value !== 'string') throw new RangeError(`Chat settings requires profile.labels[${JSON.stringify(key)}].`); return value;
  };
  const titleId = instance + '-title';
  const dividerId = instance + '-divider-tint';
  function action(target: 'button.reset_chat_settings' | 'button.close_chat_settings', event: MouseEvent<HTMLButtonElement>) {
    if (!nativeClick(model, event, target === 'button.reset_chat_settings' && model.readOnly)) return;
    if (model.onRequest(target, event.currentTarget, event) === false) event.preventDefault();
  }
  const style = { '--mc-chat-settings-unit': `${s}px`,
    '--mc-skin-scroll-track': `url(${JSON.stringify(asset('ScrollRail').url)})`, '--mc-skin-scroll-thumb': `url(${JSON.stringify(asset('ScrollHandle').url)})`,
    width: 252 * s, height: 160 * s, fontFamily: model.profile.fonts.chrome.family,
    fontSize: model.profile.fonts.chrome.logicalSize * s, lineHeight: `${model.profile.fonts.chrome.lineHeight * s}px` } as CSSProperties;
  return <div ref={attach} className="mc-chat-settings" role="group" aria-labelledby={titleId} style={style}
    data-popup-instance={settings.popup!.instanceId} data-source-geometry="finite-parent-percent-intrinsic-web-profile" data-readonly={model.readOnly || undefined}>
    <span className="mc-chat-settings__window-fill"><Skin name="control_gray" width={244} height={152} scale={s} /></span>
    <Skin name="dialog_background_hollow_3" width={252} height={160} scale={s} />
    <svg width="0" height="0" aria-hidden="true"><defs><filter id={dividerId} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values=".37 0 0 0 0 0 .4 0 0 0 0 0 .41 0 0 0 0 0 1 0" /></filter></defs></svg>
    <h2 id={titleId} className="mc-chat-settings__title"><Text value={localized('chat.settings')} model={model} id={titleId} color="rgb(30% 30% 30%)" /></h2>
    {settings.popup!.closeButtonVisible && <button type="button" className="mc-chat-settings__close" aria-label={localized('accessibility.button.close')} disabled={model.disabled}
      data-chat-settings-action="button.close_chat_settings" onClick={event => action('button.close_chat_settings', event)} onKeyDown={event => model.native.onKeyDown?.(event)}>
      <span aria-hidden="true" className="mc-chat-settings__close-art"><img src={asset('close_button_default').url} alt="" draggable={false} /><img src={asset('close_button_hover').url} alt="" draggable={false} /><img src={asset('close_button_pressed').url} alt="" draggable={false} /></span>
    </button>}
    <ScrollArea className="mc-chat-settings__scroll" variant={model.capabilities.touch ? 'touch' : 'default'} scale={s} scrollbarVisibility="always" label={localized('chat.settings')}>
      <div className="mc-chat-settings__content">
        <Toggle model={model} label={localized('chat.settings.muteAll')} field="hide_chat" value={settings.hideChat} />
        {!model.capabilities.educationEdition && <Toggle model={model} label={localized('chat.settings.muteEmotes')} field="toggle_emote_chat" value={settings.muteEmotes} />}
        <Toggle model={model} label={localized('chat.settings.tts')} field="toggle_tts" value={settings.tts} enabled={!settings.hideChat} />
        <span className="mc-chat-settings__divider" style={{ filter: `url(${JSON.stringify('#' + dividerId)})` }}><Skin name="list_item_divider_line_light" width={width} height={1} scale={s} /></span>
        {typefaceVisible && <Dropdown model={model} label={localized('chat.settings.font')} value={settings.typefaceLabel} name={instance + '-typeface'} width={width} typeface enabled={settings.typefaceEnabled} open={open === 'typeface'} disclosure="typeface" onToggle={event => { disclosure('typeface', event, event.currentTarget); }}>
          <Choices model={model} group={instance + '-typeface'} label={localized('chat.settings.font')} rows={[settings.mojangles, { ...settings.notoSans, smooth: true }]} enabled={settings.typefaceEnabled}
            onChoice={index => ({ kind: 'typeface', field: index === 0 ? 'typeface_radio_mojangles' : 'typeface_radio_notoSans', value: true })} />
        </Dropdown>}
        {typefaceVisible && <Slider model={model} state={settings.fontSize} field="chat_font_size" width={width} />}
        <Slider model={model} state={settings.lineSpacing} field="chat_line_spacing" width={width} />
        <span className="mc-chat-settings__divider" style={{ filter: `url(${JSON.stringify('#' + dividerId)})` }}><Skin name="list_item_divider_line_light" width={width} height={1} scale={s} /></span>
        {(['chat', 'mentions'] as const).map(field => {
          const colors = field === 'chat' ? settings.chatColors : settings.mentionsColors, enabled = field === 'chat' ? settings.chatColorEnabled : settings.mentionsColorEnabled;
          const label = localized(field === 'chat' ? 'chat.settings.chatColor' : 'chat.settings.mentionsColor');
          return <Dropdown key={field} model={model} label={label} value={field === 'chat' ? settings.chatColorLabel : settings.mentionsColorLabel}
            name={instance + '-' + field} width={width} enabled={enabled} open={open === field} disclosure={field} onToggle={event => { disclosure(field, event, event.currentTarget); }}
            paintbrush={field === 'chat' ? settings.chatPaintbrushColor : settings.mentionsPaintbrushColor}>
            <ScrollArea className="mc-chat-settings__color-scroll" variant="document" scale={s} scrollbarVisibility="always" label={label}>
              <Choices model={model} group={instance + '-' + field} label={label} rows={colors} enabled={enabled} onChoice={index => ({ kind: 'color', field, index: index as 0 | 1 | 2 | 3 | 4 | 5 | 6, value: true })} />
            </ScrollArea>
          </Dropdown>;
        })}
        <button type="button" className="mc-chat-settings__button mc-chat-settings__reset" disabled={model.disabled || model.readOnly} data-chat-settings-action="button.reset_chat_settings" aria-label={localized('options.resetSettings')}
          onClick={event => action('button.reset_chat_settings', event)} onKeyDown={event => {
            model.native.onKeyDown?.(event);
            if (event.key === 'ArrowDown' && !event.defaultPrevented && !model.disabled && !model.readOnly && !event.altKey && !event.ctrlKey && !event.metaKey) {
              event.preventDefault(); event.currentTarget.closest('.mc-chat-settings')?.querySelector<HTMLInputElement>('[data-chat-settings-field="hide_chat"]')?.focus();
            }
          }}>
          <ButtonArt width={width} scale={s} /><span className="mc-chat-settings__button-content"><StateText value={localized('options.resetSettings')} model={model} id="reset-chat-settings" /></span>
        </button>
      </div>
    </ScrollArea>
  </div>;
}

export const ChatSettingsPanel = forwardRef<HTMLDivElement, ChatSettingsPanelProps>(function ChatSettingsPanel(props, ref) {
  const model = snapshotChatSettingsPanel(props);
  return model.settings.popup === null ? null : <SettingsInstance key={JSON.stringify([model.runKey, model.settings.popup.instanceId])} model={model} forwardedRef={ref} />;
});
