import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Button } from './components';
import { startMenuAssets } from './start-menu-assets';
import type { StartMenuAsset } from './start-menu-assets';
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, KeyboardEvent, MouseEvent, ReactNode, Ref, SyntheticEvent } from 'react';

/** The application has already resolved native ignored/visible/enabled bindings. */
export interface StartMenuControlState {
  /** false: source ignored, do not construct this node or reserve its footprint. */
  included: boolean;
  /** false: retain this DOM node and its ref, but remove paint, interaction and layout flow with display:none. */
  visible: boolean;
  enabled: boolean;
}
export interface StartMenuFrame { readonly size: readonly [number, number]; scale?: number }
export type StartMenuTitleProfile = 'win10' | 'osx' | 'education-desktop' | 'education-mobile' | 'pocket-console';
export type StartMenuActionId =
  | 'play' | 'featured-world' | 'settings' | 'store' | 'realms' | 'buy-game' | 'editions'
  | 'get-started' | 'main-menu' | 'education-lesson' | 'education-featured' | 'education-unlock'
  | 'sign-in' | 'feedback' | 'achievements' | 'inbox' | 'profile' | 'dressing-room' | 'manage-account'
  | 'gathering' | 'friends' | 'external-browser' | 'external-popup-close';
export interface StartMenuActionDetail {
  action: StartMenuActionId;
  /** Source callback target, e.g. button.menu_settings. Play target must be supplied explicitly. */
  target: string;
  /** Final receiving part/root event, after native caller handlers have had a veto. */
  event: MouseEvent<HTMLElement>;
  button: HTMLButtonElement;
}
export type StartMenuActionHandler = (detail: StartMenuActionDetail) => void;
export interface StartMenuImageSource { readonly src: string; readonly sourceSize: readonly [number, number]; alt?: string }
export interface StartMenuImageStates { normal: StartMenuImageSource; hover?: StartMenuImageSource; pressed?: StartMenuImageSource; disabled?: StartMenuImageSource }
export interface StartMenuButton {
  state: StartMenuControlState;
  label: string;
  /** Caller content replaces the source content template, not the semantic button. */
  content?: ReactNode;
  action: StartMenuActionId;
  target: string;
  ref?: Ref<HTMLButtonElement>;
  /** onClick runs first and may preventDefault before the local action request. */
  nativeProps?: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'dangerouslySetInnerHTML' | 'disabled' | 'type'>;
}
export interface StartMenuDynamicBanner {
  state: StartMenuControlState;
  image: StartMenuImageSource;
  /** Caller-resolved source #banner_nineslice_size; absent means whole-image stretch, not guessed corners. */
  insets?: readonly [number, number, number, number];
  text: ReactNode;
  textColor?: string;
}
/** The caller owns GIF decoding and clock: these nodes are only positioned in the actual source art slots. */
export interface StartMenuButtonArt {
  state: StartMenuControlState;
  normalBackground?: ReactNode;
  hoverBackground?: ReactNode;
  normalForeground?: ReactNode;
  hoverForeground?: ReactNode;
  label?: ReactNode;
}
export interface StartMenuButtonRow {
  state: StartMenuControlState;
  button: StartMenuButton;
}
export interface StartMenuArtButtonRow extends StartMenuButtonRow {
  art?: StartMenuButtonArt;
  banner?: StartMenuDynamicBanner;
}
export interface StartMenuStoreRow extends StartMenuArtButtonRow {
  updateBadge?: { state: StartMenuControlState; content?: ReactNode };
  newOffersBadge?: {
    state: StartMenuControlState;
    /** Source intrinsic tag label; omitted uses the original en_US "New". */
    label?: ReactNode;
    /** Optional complete caller renderer replacing the tag, including its background. */
    content?: ReactNode;
  };
}
export interface StartMenuNormalRows {
  /** Fixed source order; omitted properties explicitly mean not constructed, never auto-derived from account state. */
  play?: StartMenuArtButtonRow;
  featuredWorld?: StartMenuButtonRow;
  trialSettingsStore?: {
    state: StartMenuControlState;
    settings: StartMenuButton;
    store?: Pick<StartMenuStoreRow, 'state' | 'button' | 'updateBadge' | 'newOffersBadge'>;
  };
  educationLesson?: StartMenuButtonRow & { newTag?: ReactNode };
  educationFeatured?: StartMenuButtonRow;
  settingsEditions?: {
    state: StartMenuControlState;
    /** The source has separate split and full-width settings children, each with its own runtime visibility. */
    split: StartMenuControlState;
    singleSettings: StartMenuControlState;
    settings: StartMenuButton;
    editions: StartMenuButton;
  };
  settings?: StartMenuButtonRow;
  realms?: StartMenuButtonRow;
  educationUnlock?: StartMenuButtonRow;
  store?: StartMenuStoreRow;
  buyGame?: StartMenuButtonRow;
  editions?: StartMenuButtonRow;
}
export interface StartMenuNewPlayerRows {
  trialInfo?: { state: StartMenuControlState; content: ReactNode };
  /** Source trial spacer is20x20 and ignored independently of the runtime text node. */
  trialSpacerIncluded: boolean;
  getStarted: StartMenuButtonRow;
  mainMenu: StartMenuButtonRow;
}
export interface StartMenuActionStackProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML'> {
  normal: { state: StartMenuControlState; rows: StartMenuNormalRows; alpha?: number };
  newPlayer: { state: StartMenuControlState; rows: StartMenuNewPlayerRows; alpha?: number };
  scale?: number;
  disabled?: boolean;
  onAction?: StartMenuActionHandler;
}

export interface StartMenuTitleProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML'> {
  /** Full logical source frame used by the declared Web % resolver; never inferred from the browser. */
  size: readonly [number, number];
  profile: StartMenuTitleProfile;
  /** Source title PNG is the ordinary default; missing education logos require a caller source/content. */
  logo?: StartMenuImageSource;
  logoContent?: ReactNode;
  /** Complete splash renderer, never a copied corpus or an inferred native font/clock. */
  splash?: ReactNode;
  splashVisible?: boolean;
  /** Exact resolved geometry override when embedding a different engine/source profile. */
  layout?: { width: number; height: number; offset: readonly [number, number] };
  scale?: number;
}

export interface StartMenuInbox {
  button: StartMenuButton;
  /** Literal source branch selector:0 animated bell,1 static bell,2 mail. */
  iconState: 0 | 1 | 2;
  /** Required in state0. Caller supplies a whole-frame image/renderer; component does not guess frame_step semantics. */
  animatedBell?: ReactNode;
  unread: { state: StartMenuControlState; content?: ReactNode };
}
export interface StartMenuProfileButton {
  button: StartMenuButton;
  showGamerpic: boolean;
  gamerpic?: ReactNode;
  /** Source fallback is whole icon_alex, not a generated actor. */
  fallbackIcon?: ReactNode;
}
export interface StartMenuGathering {
  state: StartMenuControlState;
  badge: { state: StartMenuControlState; content: ReactNode };
  caption: ReactNode;
  button: StartMenuButton;
  alpha?: number;
}
export interface StartMenuAuxiliaryActionsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML'>, StartMenuFrame {
  state: StartMenuControlState;
  alpha?: number;
  gathering?: StartMenuGathering;
  upper: {
    state: StartMenuControlState;
    /** Explicit resolved platform branch, not inferred from browser/OS/account. */
    signInProfile: 'standard' | 'nx-ps';
    signIn: StartMenuButton;
    gamertag: { state: StartMenuControlState; gamerpic?: ReactNode; text: ReactNode };
  };
  lower: {
    state: StartMenuControlState;
    feedback?: { button: StartMenuButton; profile: 'release' | 'preview' | 'education'; icon?: ReactNode };
    signInProgress?: { state: StartMenuControlState; text: ReactNode };
    achievements?: StartMenuButton;
    inbox?: StartMenuInbox;
    profileA?: StartMenuProfileButton;
  };
  disabled?: boolean;
  onAction?: StartMenuActionHandler;
}

export interface StartMenuPortraitRequest {
  /** Raw host gesture in CSS pixels; component never converts this into a claimed native angle/camera. */
  deltaX: number;
  phase: 'start' | 'move' | 'end' | 'cancel';
  event: SyntheticEvent;
}
export interface StartMenuProfileProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML'>, StartMenuFrame {
  viewer: {
    state: StartMenuControlState;
    portrait: { state: StartMenuControlState; content: ReactNode };
    loading?: ReactNode;
    nameTag?: ReactNode;
    onTurnRequest?: (detail: StartMenuPortraitRequest) => void;
  };
  controls: {
    state: StartMenuControlState;
    alpha?: number;
    dressingRoom: { button: StartMenuButton; profile: 'text' | 'education-glyph'; icon?: ReactNode };
    switchAccount?: StartMenuButton;
    profileB?: StartMenuProfileButton;
  };
  disabled?: boolean;
  onAction?: StartMenuActionHandler;
}
export interface StartMenuFooterProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML'> {
  width: number;
  copyright: ReactNode;
  version: ReactNode;
  development: { state: StartMenuControlState; text: ReactNode };
  scale?: number;
}
export interface StartMenuExternalPopup {
  state: StartMenuControlState;
  title: string;
  body: ReactNode;
  close: { state: StartMenuControlState; label: string };
  externalButton: StartMenuButton;
  backButton: StartMenuButton;
  /** Explicit resolved host geometry override; absence uses the bounded source form-fit Web policy. */
  layout?: { panelSize: readonly [number, number]; bodyWidth?: number };
  onCloseRequest?: (event: SyntheticEvent) => void;
}
export interface StartMenuProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'dangerouslySetInnerHTML' | 'title'>, StartMenuFrame {
  label: string;
  /** Source #screen_needs_rebuild resolved by host; hidden frame retains its declared size. */
  visible: boolean;
  title: Omit<StartMenuTitleProps, 'size' | 'scale'>;
  actions: Omit<StartMenuActionStackProps, 'scale' | 'disabled' | 'onAction'>;
  auxiliary: Omit<StartMenuAuxiliaryActionsProps, 'size' | 'scale' | 'disabled' | 'onAction'>;
  profile: Omit<StartMenuProfileProps, 'size' | 'scale' | 'disabled' | 'onAction'>;
  footer: Omit<StartMenuFooterProps, 'width' | 'scale'>;
  background?: ReactNode;
  controllerHints?: ReactNode;
  friends?: { state: StartMenuControlState; button: StartMenuButton; content?: ReactNode };
  externalPopup?: StartMenuExternalPopup;
  disabled?: boolean;
  canQuit: boolean;
  onAction?: StartMenuActionHandler;
  onExitRequest?: (event: KeyboardEvent<HTMLElement>) => void;
  /** Display only. Browser has no controller_select transport and no automatic offline operation is installed. */
  offlineHint?: ReactNode;
}

/* INTERNAL ONLY: common source button shared by both implementation modules.
   Keep this and its helper/render exports out of src/index.ts. */
interface StartSourceButtonProps {
  config: StartMenuButton;
  scale: number;
  disabled?: boolean;
  role: 'light-text' | 'dark-text' | 'light-content' | 'light-glyph' | 'underline';
  geometry:
    | { kind: 'main-row' }
    | { kind: 'fixed'; size: readonly [number, number] }
    | { kind: 'form-fitting'; height: number; extraWidth?: number; pressedAlpha?: number }
    | { kind: 'profile-content' };
  className?: string;
  style?: CSSProperties;
  onAction?: StartMenuActionHandler;
}
interface StartSourceStateProps {
  state: StartMenuControlState;
  /** Main/panel wrapper geometry must be supplied before applying visibility. */
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

const imageUrl = (value: string) => `url(${JSON.stringify(value)})`;
const sourceImages = Object.fromEntries(Object.entries(startMenuAssets).map(([key, asset]) => [`--mc-start-${key}`, imageUrl(asset.url)])) as CSSProperties;
const Interaction = createContext({ blocked: false, deferred: false });
type Intent = { config: StartMenuButton; button: HTMLButtonElement };
const intents = new WeakMap<Event, Intent>();
const turnIntents = new WeakMap<Event, { callback: NonNullable<StartMenuProfileProps['viewer']['onTurnRequest']>; detail: StartMenuPortraitRequest; cancel?: () => void }>();
const actionIds = new Set<StartMenuActionId>(['play', 'featured-world', 'settings', 'store', 'realms', 'buy-game', 'editions', 'get-started', 'main-menu', 'education-lesson', 'education-featured', 'education-unlock', 'sign-in', 'feedback', 'achievements', 'inbox', 'profile', 'dressing-room', 'manage-account', 'gathering', 'friends', 'external-browser', 'external-popup-close']);
function finite(value: number, name: string, minimum = 0) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= minimum) throw new RangeError(`${name} must be finite and greater than ${minimum}`);
  return value;
}
function unit(scale = 2) {
  if (!Number.isInteger(scale) || scale <= 0) throw new RangeError('scale must be a positive integer');
  return scale;
}
function frame(size: readonly [number, number], name = 'size') {
  if (!Array.isArray(size) || size.length !== 2) throw new TypeError(`${name} must be a pair`);
  finite(size[0], `${name}[0]`); finite(size[1], `${name}[1]`);
  return size;
}
function state(value: StartMenuControlState) {
  if (!value || typeof value !== 'object' || ['included', 'visible', 'enabled'].some(key => typeof value[key as keyof StartMenuControlState] !== 'boolean')) throw new TypeError('state requires included, visible and enabled booleans');
  return value;
}
function alpha(value: number | undefined) {
  if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > 1)) throw new RangeError('alpha must be between 0 and 1');
  return value;
}
function source(value: StartMenuImageSource) {
  if (!value || typeof value.src !== 'string' || !value.src) throw new TypeError('image src must be a nonempty string');
  frame(value.sourceSize, 'sourceSize');
  if (!value.sourceSize.every(Number.isInteger)) throw new RangeError('sourceSize must contain integers');
  return value;
}
function button(value: StartMenuButton) {
  if (!value || typeof value.label !== 'string' || !value.label.trim() || !actionIds.has(value.action) || typeof value.target !== 'string' || !value.target.trim()) throw new TypeError('button requires a label, source action and target');
  state(value.state); return value;
}
function presentation(scale: number, style?: CSSProperties): CSSProperties { return { ...sourceImages, '--mc-start-unit': `${scale}px`, ...style } as CSSProperties; }
function dispatch(event: MouseEvent<HTMLElement>, handler?: StartMenuActionHandler) {
  const intent = intents.get(event.nativeEvent);
  intents.delete(event.nativeEvent);
  if (!event.defaultPrevented && intent && !intent.button.disabled && intent.button.isConnected) handler?.({ action: intent.config.action, target: intent.config.target, button: intent.button, event });
}
function useOwnerClick(onClick: HTMLAttributes<HTMLElement>['onClick'], onAction: StartMenuActionHandler | undefined, disabled: boolean) {
  const parent = useContext(Interaction);
  return (event: MouseEvent<HTMLElement>) => {
    onClick?.(event);
    if (!parent.deferred && !parent.blocked && !disabled) dispatch(event, onAction);
  };
}
function StartSourceState({ state: value, className, style, children }: StartSourceStateProps) {
  state(value);
  const parent = useContext(Interaction);
  if (!value.included) return null;
  return <Interaction.Provider value={{ ...parent, blocked: parent.blocked || !value.visible || !value.enabled }}><div className={className} style={style} hidden={!value.visible} data-start-visible={value.visible}>{children}</div></Interaction.Provider>;
}
function Asset({ asset, size, className }: { asset: StartMenuAsset; size: readonly [number, number]; className?: string }) {
  return <img className={className} src={asset.url} alt="" aria-hidden="true" draggable={false} style={{ width: `calc(${size[0]} * var(--mc-start-unit))`, height: `calc(${size[1]} * var(--mc-start-unit))` }} />;
}
function StartSourceButton({ config, scale, disabled = false, role, geometry, className, style }: StartSourceButtonProps) {
  button(config); unit(scale);
  if (geometry.kind === 'fixed') frame(geometry.size, 'button.size');
  if (geometry.kind === 'form-fitting') finite(geometry.height, 'button.height');
  const parent = useContext(Interaction);
  if (!config.state.included) return null;
  const { onClick, ...native } = config.nativeProps ?? {};
  const locked = disabled || parent.blocked || !config.state.visible || !config.state.enabled;
  const sizing: CSSProperties = geometry.kind === 'fixed'
    ? { width: geometry.size[0] * scale, height: geometry.size[1] * scale }
    : geometry.kind === 'form-fitting'
      ? { height: geometry.height * scale, '--mc-start-extra-width': `${(geometry.extraWidth ?? 0) * scale}px`, '--mc-start-pressed-alpha': geometry.pressedAlpha ?? 1 } as CSSProperties
      : {};
  return <Button {...native} ref={config.ref} type="button" aria-label={native['aria-label'] ?? config.label} disabled={locked} hidden={!config.state.visible} className={`mc-start-button mc-start-button--${role} mc-start-button--${geometry.kind} ${config.action === 'realms' ? 'mc-start-button--realms' : ''} ${className ?? ''} ${native.className ?? ''}`} style={{ ...sizing, ...native.style, ...style }} data-start-action={config.action} data-start-target={config.target} onClick={event => {
    onClick?.(event);
    if (!event.defaultPrevented && !locked) intents.set(event.nativeEvent, { config, button: event.currentTarget });
  }}>{config.content ?? config.label}</Button>;
}
function Banner({ banner }: { banner?: StartMenuDynamicBanner }) {
  if (!banner) return null;
  state(banner.state); source(banner.image);
  const cuts = banner.insets;
  if (cuts && (!Array.isArray(cuts) || cuts.length !== 4 || [...cuts].some(n => !Number.isFinite(n) || n < 0) || cuts[0] + cuts[2] > banner.image.sourceSize[0] || cuts[1] + cuts[3] > banner.image.sourceSize[1])) throw new RangeError('banner insets must fit sourceSize');
  const imageStyle: CSSProperties = cuts ? { borderImageSource: imageUrl(banner.image.src), borderImageSlice: `${cuts[1]} ${cuts[2]} ${cuts[3]} ${cuts[0]} fill`, borderWidth: [cuts[1], cuts[2], cuts[3], cuts[0]].map(n => `calc(${n} * var(--mc-start-unit))`).join(' ') } : { backgroundImage: imageUrl(banner.image.src) };
  return <StartSourceState state={banner.state} className="mc-start-action-stack__banner"><span className="mc-start-action-stack__banner-skin" style={imageStyle} aria-hidden="true"/><span className="mc-start-action-stack__banner-label" style={{ color: banner.textColor }}>{banner.text}</span></StartSourceState>;
}
function Art({ art, store = false }: { art?: StartMenuButtonArt; store?: boolean }) {
  if (!art) return null;
  return <StartSourceState state={art.state} className={`mc-start-action-stack__art ${store ? 'mc-start-action-stack__art--store' : ''}`}><span className="mc-start-action-stack__art-normal mc-start-action-stack__art-background">{art.normalBackground}</span><span className="mc-start-action-stack__art-hover mc-start-action-stack__art-background">{art.hoverBackground}</span><span className="mc-start-action-stack__art-normal mc-start-action-stack__art-foreground">{art.normalForeground}</span><span className="mc-start-action-stack__art-hover mc-start-action-stack__art-foreground">{art.hoverForeground}</span><span className="mc-start-action-stack__art-label">{art.label}</span></StartSourceState>;
}
function Badges({ row }: { row: StartMenuStoreRow }) {
  return <>{row.updateBadge && <StartSourceState state={row.updateBadge.state} className="mc-start-action-stack__update">{row.updateBadge.content ?? <Asset asset={startMenuAssets.update} size={[15 * .5238, 15]}/>}</StartSourceState>}{row.newOffersBadge && <StartSourceState state={row.newOffersBadge.state} className={`mc-start-action-stack__offers ${row.newOffersBadge.content !== undefined ? 'mc-start-action-stack__offers--custom' : ''}`}>{row.newOffersBadge.content !== undefined ? row.newOffersBadge.content : <><span className="mc-start-action-stack__offers-skin" aria-hidden="true"/><span className="mc-start-action-stack__offers-label">{row.newOffersBadge.label === undefined ? 'New' : row.newOffersBadge.label}</span></>}</StartSourceState>}</>;
}
function MainRow({ row, scale, kind = 'plain', name }: { row?: StartMenuButtonRow; scale: number; kind?: 'plain' | 'art' | 'store' | 'underline'; name: string }) {
  if (!row) return null;
  const decorated = row as StartMenuStoreRow;
  return <StartSourceState state={row.state} className={`mc-start-action-stack__row mc-start-action-stack__row--${name}`}><StartSourceButton config={row.button} scale={scale} role={kind === 'underline' ? 'underline' : row.button.action === 'realms' ? 'dark-text' : 'light-text'} geometry={{ kind: 'main-row' }} className={name === 'education-featured' ? 'mc-start-button--stationary' : undefined}/>{(kind === 'art' || kind === 'store') && <><Art art={decorated.art} store={kind === 'store'}/><Banner banner={decorated.banner}/></>}{kind === 'store' && <Badges row={decorated}/>}</StartSourceState>;
}
function sharedSettings(config: StartMenuButton, selected: boolean, branch: string): StartMenuButton {
  return { ...config, ref: selected ? config.ref : undefined, nativeProps: { ...config.nativeProps, id: config.nativeProps?.id && !selected ? `${config.nativeProps.id}-start-${branch}` : config.nativeProps?.id } };
}

/** Fixed source factory rows; hidden groups keep their nodes and exit layout flow. */
export const StartMenuActionStack = forwardRef<HTMLDivElement, StartMenuActionStackProps>(function StartMenuActionStack({ normal, newPlayer, scale = 2, disabled = false, onAction, onClick, className, style, ...props }, ref) {
  const s = unit(scale); state(normal.state); state(newPlayer.state); alpha(normal.alpha); alpha(newPlayer.alpha);
  const click = useOwnerClick(onClick, onAction, disabled);
  const parent = useContext(Interaction); const n = normal.rows; const flow = newPlayer.rows;
  if (typeof flow.trialSpacerIncluded !== 'boolean') throw new TypeError('trialSpacerIncluded must be boolean');
  return <Interaction.Provider value={{ ...parent, blocked: parent.blocked || disabled }}><div {...props} ref={ref} className={`mc-start-action-stack ${className ?? ''}`} style={presentation(s, style)} onClick={click}>
    <StartSourceState state={normal.state} className="mc-start-action-stack__normal" style={{ opacity: normal.alpha }}>
      <MainRow row={n.play} name="play" kind="art" scale={s}/><MainRow row={n.featuredWorld} name="featured-world" scale={s}/>
      {n.trialSettingsStore && <StartSourceState state={n.trialSettingsStore.state} className="mc-start-action-stack__row mc-start-action-stack__pair"><div className="mc-start-action-stack__column"><StartSourceButton config={n.trialSettingsStore.settings} scale={s} role="light-text" geometry={{ kind: 'main-row' }}/></div>{n.trialSettingsStore.store && <StartSourceState state={n.trialSettingsStore.store.state} className="mc-start-action-stack__column"><StartSourceButton config={n.trialSettingsStore.store.button} scale={s} role="light-content" geometry={{ kind: 'main-row' }}/><Badges row={n.trialSettingsStore.store}/></StartSourceState>}</StartSourceState>}
      {n.educationLesson && <div className="mc-start-action-stack__education-lesson"><MainRow row={n.educationLesson} name="education-lesson" scale={s}/>{n.educationLesson.state.included && <span className="mc-start-action-stack__new-tag" hidden={!n.educationLesson.state.visible}>{n.educationLesson.newTag}</span>}</div>}
      <MainRow row={n.educationFeatured} name="education-featured" scale={s}/>
      {n.settingsEditions && <StartSourceState state={n.settingsEditions.state} className="mc-start-action-stack__row mc-start-action-stack__legacy"><StartSourceState state={n.settingsEditions.split} className="mc-start-action-stack__pair"><div className="mc-start-action-stack__column"><StartSourceButton config={sharedSettings(n.settingsEditions.settings, n.settingsEditions.split.included && n.settingsEditions.split.visible, 'split')} scale={s} role="light-text" geometry={{ kind: 'main-row' }}/></div><div className="mc-start-action-stack__column"><StartSourceButton config={n.settingsEditions.editions} scale={s} role="light-text" geometry={{ kind: 'main-row' }}/></div></StartSourceState><StartSourceState state={n.settingsEditions.singleSettings} className="mc-start-action-stack__single-settings"><StartSourceButton config={sharedSettings(n.settingsEditions.settings, !(n.settingsEditions.split.included && n.settingsEditions.split.visible), 'single')} scale={s} role="light-text" geometry={{ kind: 'main-row' }}/></StartSourceState></StartSourceState>}
      <MainRow row={n.settings} name="settings" scale={s}/><MainRow row={n.realms} name="realms" scale={s}/><MainRow row={n.educationUnlock} name="education-unlock" scale={s}/><MainRow row={n.store} name="store" kind="store" scale={s}/><MainRow row={n.buyGame} name="buy-game" scale={s}/><MainRow row={n.editions} name="editions" scale={s}/>
    </StartSourceState>
    <StartSourceState state={newPlayer.state} className="mc-start-action-stack__new-player" style={{ opacity: newPlayer.alpha }}>{flow.trialInfo && <StartSourceState state={flow.trialInfo.state} className="mc-start-action-stack__row mc-start-action-stack__trial-info"><span className="mc-start-action-stack__trial-label">{flow.trialInfo.content}</span></StartSourceState>}{flow.trialSpacerIncluded && <div className="mc-start-action-stack__trial-spacer"/>}<MainRow row={flow.getStarted} name="get-started" scale={s}/><MainRow row={flow.mainMenu} name="main-menu" kind="underline" scale={s}/></StartSourceState>
  </div></Interaction.Provider>;
});

/** Ordinary contain/center and self-relative offsets are a bounded normal-profile Web mapping. */
export const StartMenuTitle = forwardRef<HTMLDivElement, StartMenuTitleProps>(function StartMenuTitle({ size, profile, logo, logoContent, splash, splashVisible = true, layout, scale = 2, className, style, ...props }, ref) {
  const s = unit(scale); const [w] = frame(size);
  if (!['win10', 'osx', 'education-desktop', 'education-mobile', 'pocket-console'].includes(profile)) throw new TypeError('unknown title profile');
  const education = profile.startsWith('education-');
  const hasLogoContent = logoContent != null && typeof logoContent !== 'boolean' && !(typeof logoContent === 'string' && !logoContent.trim());
  if (education && !logo && !hasLogoContent) throw new TypeError('Education title requires the caller supplied missing logo or logoContent');
  if (logo) source(logo);
  const width = layout ? finite(layout.width, 'layout.width') : education ? w : w * .55;
  const height = layout ? finite(layout.height, 'layout.height') : education ? 62 : width * (profile === 'osx' ? .1937 : .1885);
  const offset = layout?.offset ?? [0, height * (education ? .025 : profile === 'pocket-console' ? .05 : .1)];
  if (!Array.isArray(offset) || offset.length !== 2 || ![...offset].every(Number.isFinite)) throw new TypeError('title offset must be finite');
  const image = logo ?? { src: startMenuAssets.title.url, sourceSize: startMenuAssets.title.sourceSize };
  return <div {...props} ref={ref} className={`mc-start-title ${className ?? ''}`} data-title-profile={profile} style={presentation(s, { width: w * s, height: height * s, ...style })}><div className="mc-start-title__panel" style={{ width: width * s, height: height * s, transform: `translate(${offset[0] * s}px,${offset[1] * s}px)` }}><div className={`mc-start-title__logo ${education ? 'mc-start-title__logo--education' : ''}`}>{education ? hasLogoContent ? logoContent : <img src={image.src} alt={image.alt ?? ''} draggable={false}/> : logoContent ?? <img src={image.src} alt={image.alt ?? ''} draggable={false}/>}<span className="mc-start-title__splash" hidden={!splashVisible} data-splash-profile={profile}>{splash}</span></div></div></div>;
});

function content(config: StartMenuButton, fallback: ReactNode): StartMenuButton { return { ...config, content: config.content ?? fallback }; }
function ProfileContent({ value }: { value: StartMenuProfileButton }) {
  if (typeof value.showGamerpic !== 'boolean') throw new TypeError('showGamerpic must be boolean');
  return <span className="mc-start-profile-content"><span className="mc-start-profile-content__gamerpic">{value.showGamerpic ? value.gamerpic : value.fallbackIcon ?? <Asset asset={startMenuAssets.alex} size={[16, 16]}/>}<span className="mc-start-profile-content__border"/></span><span className="mc-start-profile-content__label">{value.button.label}</span></span>;
}
function ProfileButton({ value, scale }: { value: StartMenuProfileButton; scale: number }) {
  return <StartSourceButton config={content(value.button, <ProfileContent value={value}/>)} role="light-content" geometry={{ kind: 'profile-content' }} scale={scale}/>;
}

export const StartMenuAuxiliaryActions = forwardRef<HTMLDivElement, StartMenuAuxiliaryActionsProps>(function StartMenuAuxiliaryActions({ size, state: rootState, alpha: rootAlpha, gathering, upper, lower, disabled = false, scale = 2, onAction, onClick, className, style, ...props }, ref) {
  const [w, h] = frame(size); finite(w, 'auxiliary frame width', 150); const s = unit(scale);
  state(rootState); state(upper.state); state(lower.state); alpha(rootAlpha);
  if (!['standard', 'nx-ps'].includes(upper.signInProfile)) throw new TypeError('unknown sign-in profile');
  if (lower.inbox && (![0, 1, 2].includes(lower.inbox.iconState) || (lower.inbox.iconState === 0 && lower.inbox.animatedBell == null))) throw new TypeError('inbox state 0 requires animatedBell; valid states are 0, 1 and 2');
  if (lower.feedback && !['release', 'preview', 'education'].includes(lower.feedback.profile)) throw new TypeError('unknown feedback profile');
  if (lower.feedback?.profile === 'education' && lower.feedback.icon == null && lower.feedback.button.content == null) throw new TypeError('Education feedback requires the caller supplied missing icon/content');
  const click = useOwnerClick(onClick, onAction, disabled); const parent = useContext(Interaction); const captionTint = useId();
  return <Interaction.Provider value={{ ...parent, blocked: parent.blocked || disabled }}><div {...props} ref={ref} className={`mc-start-auxiliary ${className ?? ''}`} style={presentation(s, { width: w * s, height: h * s, ...style })} onClick={click}><StartSourceState state={rootState} className="mc-start-auxiliary__stack" style={{ opacity: rootAlpha }}>
    {gathering && <StartSourceState state={gathering.state} className="mc-start-auxiliary__gathering" style={{ opacity: alpha(gathering.alpha) }}><svg width="0" height="0" aria-hidden="true" className="mc-start-auxiliary__filter"><defs><filter id={captionTint} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values=".871 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"/></filter></defs></svg><div className="mc-start-auxiliary__gathering-caption"><span className="mc-start-auxiliary__caption-bubble"><span className="mc-start-auxiliary__caption-skin" aria-hidden="true" style={{ filter: `url("#${captionTint}")` }}/><span className="mc-start-auxiliary__caption-text">{gathering.caption}</span></span></div><StartSourceState state={gathering.badge.state} className="mc-start-auxiliary__gathering-badge">{gathering.badge.content}</StartSourceState><StartSourceButton config={gathering.button} scale={s} role="light-text" geometry={{ kind: 'fixed', size: [100, 25] }}/><div className="mc-start-auxiliary__gathering-pad" hidden={!upper.state.included || !upper.state.visible}/></StartSourceState>}
    <StartSourceState state={upper.state} className="mc-start-auxiliary__upper"><div className="mc-start-auxiliary__upper-row" data-sign-in-profile={upper.signInProfile}>
      {upper.signInProfile === 'standard' ? <><span className="mc-start-auxiliary__sign-in-pad" hidden={!upper.signIn.state.visible || !upper.signIn.state.included}/><div className="mc-start-auxiliary__sign-in-frame" hidden={!upper.signIn.state.visible || !upper.signIn.state.included}><StartSourceButton config={upper.signIn} scale={s} role="light-text" geometry={{ kind: 'form-fitting', height: 25 }} className="mc-start-auxiliary__sign-in"/></div></> : <><div className="mc-start-auxiliary__platform-sign-in"><StartSourceButton config={upper.signIn} scale={s} role="light-text" geometry={{ kind: 'main-row' }}/></div><StartSourceState state={upper.gamertag.state} className="mc-start-auxiliary__gamertag"><span className="mc-start-auxiliary__gamerpic">{upper.gamertag.gamerpic}</span><span className="mc-start-auxiliary__gamertag-label">{upper.gamertag.text}</span></StartSourceState></>}
    </div></StartSourceState>
    <StartSourceState state={lower.state} className="mc-start-auxiliary__lower"><div className="mc-start-auxiliary__lower-row">
      {lower.feedback && <div className="mc-start-auxiliary__icon-entry" hidden={!lower.feedback.button.state.visible || !lower.feedback.button.state.included}><StartSourceButton config={content(lower.feedback.button, lower.feedback.icon ?? <Asset asset={startMenuAssets.feedback} size={[16, 16]}/>)} scale={s} role="light-content" geometry={{ kind: 'fixed', size: lower.feedback.profile === 'education' ? [25, 25] : [24, 24] }} className="mc-start-button--stationary"/></div>}
      {lower.signInProgress && <StartSourceState state={lower.signInProgress.state} className="mc-start-auxiliary__progress">{lower.signInProgress.text}</StartSourceState>}
      {lower.achievements && <div className="mc-start-auxiliary__icon-entry" hidden={!lower.achievements.state.visible || !lower.achievements.state.included}><StartSourceButton config={content(lower.achievements, <Asset asset={startMenuAssets.achievements} size={[16, 16]}/>)} scale={s} role="light-content" geometry={{ kind: 'fixed', size: [24, 24] }} className="mc-start-button--stationary"/></div>}
      {lower.inbox && <div className="mc-start-auxiliary__icon-entry mc-start-auxiliary__inbox" hidden={!lower.inbox.button.state.visible || !lower.inbox.button.state.included}><StartSourceButton config={content(lower.inbox.button, lower.inbox.iconState === 0 ? lower.inbox.animatedBell : <Asset asset={lower.inbox.iconState === 1 ? startMenuAssets.bell : startMenuAssets.mail} size={[16, 16]}/>)} scale={s} role="light-content" geometry={{ kind: 'fixed', size: [24, 24] }} className="mc-start-button--stationary"/><StartSourceState state={lower.inbox.unread.state} className="mc-start-auxiliary__unread">{lower.inbox.unread.content ?? <Asset asset={startMenuAssets.redDot} size={[7, 8]}/>}</StartSourceState></div>}
      {lower.profileA && <div className="mc-start-auxiliary__profile-a" hidden={!lower.profileA.button.state.visible || !lower.profileA.button.state.included}><ProfileButton value={lower.profileA} scale={s}/></div>}
    </div></StartSourceState>
  </StartSourceState></div></Interaction.Provider>;
});

export const StartMenuProfile = forwardRef<HTMLDivElement, StartMenuProfileProps>(function StartMenuProfile({ size, viewer, controls, disabled = false, scale = 2, onAction, onClick, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture, className, style, ...props }, ref) {
  const [w, h] = frame(size); finite(w, 'profile frame width', 150); const s = unit(scale);
  state(viewer.state); state(viewer.portrait.state); state(controls.state); alpha(controls.alpha);
  if (!['text', 'education-glyph'].includes(controls.dressingRoom.profile)) throw new TypeError('unknown dressing room profile');
  const click = useOwnerClick(onClick, onAction, disabled); const parent = useContext(Interaction);
  const viewerRef = useRef<HTMLDivElement>(null); const gesture = useRef<{ id: number; x: number; owner: HTMLDivElement } | null>(null);
  const active = !disabled && !parent.blocked && viewer.state.included && viewer.state.visible && viewer.state.enabled;
  const emit = (detail: StartMenuPortraitRequest) => { if (!viewer.onTurnRequest) return; if (parent.deferred) turnIntents.set(detail.event.nativeEvent, { callback: viewer.onTurnRequest, detail, cancel: detail.phase === 'start' ? release : undefined }); else viewer.onTurnRequest(detail); };
  const release = () => { const old = gesture.current; gesture.current = null; if (old?.owner.hasPointerCapture?.(old.id)) old.owner.releasePointerCapture(old.id); return old; };
  const finish = (event: React.PointerEvent<HTMLDivElement>, phase: 'end' | 'cancel') => {
    const old = gesture.current;
    if (!old || old.id !== event.pointerId) return;
    release();
    if (!event.defaultPrevented && active) emit({ deltaX: event.clientX - old.x, phase, event });
  };
  useEffect(() => { if (!active) release(); return () => { release(); }; }, [active]);
  return <Interaction.Provider value={{ ...parent, blocked: parent.blocked || disabled }}><div {...props} ref={ref} className={`mc-start-profile ${className ?? ''}`} style={presentation(s, { width: w * s, height: h * s, ...style })} onClick={click}
    onPointerDown={event => { onPointerDown?.(event); if (event.defaultPrevented || gesture.current || !active || !viewerRef.current?.contains(event.target as Node) || event.button !== 0) return; gesture.current = { id: event.pointerId, x: event.clientX, owner: event.currentTarget }; event.currentTarget.setPointerCapture?.(event.pointerId); emit({ deltaX: 0, phase: 'start', event }); }}
    onPointerMove={event => { onPointerMove?.(event); const old = gesture.current; if (!event.defaultPrevented && active && old?.id === event.pointerId) emit({ deltaX: event.clientX - old.x, phase: 'move', event }); }}
    onPointerUp={event => { onPointerUp?.(event); finish(event, 'end'); }} onPointerCancel={event => { onPointerCancel?.(event); finish(event, 'cancel'); }} onLostPointerCapture={event => { onLostPointerCapture?.(event); finish(event, 'cancel'); }}>
    <div className="mc-start-profile__stack"><StartSourceState state={viewer.state} className="mc-start-profile__viewer"><div className="mc-start-profile__gesture" ref={viewerRef}><div className="mc-start-profile__paper-doll"><StartSourceState state={viewer.portrait.state} className="mc-start-profile__portrait">{viewer.portrait.content}</StartSourceState><div className="mc-start-profile__loading" hidden={viewer.portrait.state.included && viewer.portrait.state.visible}>{viewer.loading}</div></div><div className="mc-start-profile__name-tag">{viewer.nameTag}</div></div></StartSourceState><div className="mc-start-profile__centering"><StartSourceState state={controls.state} className="mc-start-profile__controls" style={{ opacity: controls.alpha }}>
      <StartSourceButton config={controls.dressingRoom.profile === 'education-glyph' ? content(controls.dressingRoom.button, controls.dressingRoom.icon ?? <Asset asset={startMenuAssets.hangar} size={[32, 16]}/>) : controls.dressingRoom.button} role={controls.dressingRoom.profile === 'education-glyph' ? 'light-glyph' : 'light-text'} geometry={controls.dressingRoom.profile === 'education-glyph' ? { kind: 'fixed', size: [25, 25] } : { kind: 'form-fitting', height: 25, extraWidth: 2, pressedAlpha: .65 }} scale={s} className="mc-start-profile__dressing-room" style={{ '--mc-start-pressed-alpha': .65 } as CSSProperties}/>
      {controls.switchAccount && <div className="mc-start-profile__account" hidden={!controls.switchAccount.state.included || !controls.switchAccount.state.visible}><StartSourceButton config={content(controls.switchAccount, <Asset asset={startMenuAssets.profile} size={[11, 12]}/>)} role="light-content" geometry={{ kind: 'fixed', size: [25, 25] }} scale={s} style={{ '--mc-start-pressed-alpha': .65 } as CSSProperties}/></div>}
      {controls.profileB && <div className="mc-start-profile__profile-b" hidden={!controls.profileB.button.state.included || !controls.profileB.button.state.visible}><ProfileButton value={controls.profileB} scale={s}/></div>}
    </StartSourceState></div></div>
  </div></Interaction.Provider>;
});

export const StartMenuFooter = forwardRef<HTMLDivElement, StartMenuFooterProps>(function StartMenuFooter({ width, copyright, version, development, scale = 2, className, style, ...props }, ref) {
  finite(width, 'footer width'); const s = unit(scale); state(development.state);
  return <div {...props} ref={ref} className={`mc-start-footer ${className ?? ''}`} style={presentation(s, { width: width * s, ...style })}><div className="mc-start-footer__copyright"><span className="mc-start-footer__text">{copyright}</span></div><StartSourceState state={development.state} className="mc-start-footer__development"><span className="mc-start-footer__text">{development.text}</span></StartSourceState><div className="mc-start-footer__version"><span className="mc-start-footer__text">{version}</span></div></div>;
});

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const closeIntents = new WeakSet<Event>();
const focusableSelector = 'button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])';
function focusable(root: HTMLElement) { return Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter(node => !node.closest('[hidden],[inert]') && node.getClientRects().length > 0); }
function Popup({ value, scale, active, disabled, rootRef, dialogRef }: { value?: StartMenuExternalPopup; scale: number; active: boolean; disabled: boolean; rootRef: Ref<HTMLDivElement>; dialogRef: React.RefObject<HTMLDivElement | null> }) {
  const id = useId();
  const [measured, setMeasured] = useState<readonly [number, number]>([230, 180]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  if (value) { state(value.state); state(value.close.state); if (typeof value.title !== 'string' || typeof value.close.label !== 'string' || !value.close.label.trim()) throw new TypeError('popup title and close label must be strings'); if (value.layout) { frame(value.layout.panelSize, 'popup.panelSize'); if (value.layout.bodyWidth !== undefined) finite(value.layout.bodyWidth, 'popup.bodyWidth'); } }
  useClientLayoutEffect(() => {
    if (!active || value?.layout || !bodyRef.current) return;
    const node = bodyRef.current;
    const update = () => { const next: readonly [number, number] = [Math.max(node.offsetWidth / scale + 16, (titleRef.current?.offsetWidth ?? 0) / scale + 15 + 16), node.offsetHeight / scale + 40 + 84]; setMeasured(old => old[0] === next[0] && old[1] === next[1] ? old : next); };
    update(); const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update); observer?.observe(node); if (titleRef.current) observer?.observe(titleRef.current);
    return () => observer?.disconnect();
  }, [active, value?.layout, scale]);
  useClientLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!active || !dialog) return;
    const document = dialog.ownerDocument; const before = document.activeElement as HTMLElement | null;
    const changed = new Map<HTMLElement, boolean>();
    let layer: HTMLElement = dialog.parentElement!;
    while (layer.parentElement) { for (const node of Array.from(layer.parentElement.children)) if (node !== layer && node instanceof HTMLElement) { changed.set(node, node.inert); node.inert = true; } layer = layer.parentElement; if (layer === document.body) break; }
    const owns = (event: FocusEvent) => { const target = event.target; if (target instanceof Node && !dialog.contains(target)) (focusable(dialog)[0] ?? dialog).focus({ preventScroll: true }); };
    document.addEventListener('focusin', owns);
    (focusable(dialog)[0] ?? dialog).focus({ preventScroll: true });
    return () => { document.removeEventListener('focusin', owns); for (const [node, was] of changed) node.inert = was; const focused = document.activeElement; if ((focused === document.body || (focused instanceof Node && dialog.contains(focused))) && before?.isConnected && !before.closest('[hidden],[inert]')) before.focus({ preventScroll: true }); };
  }, [active, dialogRef]);
  if (!value?.state.included) return null;
  const panel = value.layout?.panelSize ?? measured;
  return <div className="mc-start-menu__popup-overlay" hidden={!active} ref={rootRef}><div className="mc-start-menu__popup" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} style={{ width: panel[0] * scale, height: panel[1] * scale }}>
    <span className="mc-start-menu__popup-skin" aria-hidden="true"/><h2 id={id} className="mc-start-menu__popup-title"><span ref={titleRef}>{value.title}</span></h2><div className="mc-start-menu__popup-body" ref={bodyRef} style={{ width: (value.layout?.bodyWidth ?? 214) * scale }}><div className="mc-start-menu__popup-shrink-wrap">{value.body}</div></div>
    {value.close.state.included && <button type="button" className="mc-start-menu__popup-close" aria-label={value.close.label} hidden={!value.close.state.visible} disabled={disabled || !value.state.enabled || !value.close.state.enabled} onClick={event => { if (!event.defaultPrevented) closeIntents.add(event.nativeEvent); }}><span/></button>}
    <Interaction.Provider value={{ deferred: true, blocked: disabled || !value.state.enabled }}><div className="mc-start-menu__popup-buttons"><StartSourceButton config={content(value.externalButton, <span className="mc-start-menu__external-content"><span>{value.externalButton.label}</span><span className="mc-start-menu__external-icon" data-start-missing-asset="textures/ui/icon_external_link" aria-hidden="true"/></span>)} scale={scale} role="light-content" geometry={{ kind: 'fixed', size: [panel[0] - 14, 31] }}/><div className="mc-start-menu__popup-button-gap"/><StartSourceButton config={value.backButton} scale={scale} role="light-text" geometry={{ kind: 'fixed', size: [panel[0] - 14, 31] }}/></div></Interaction.Provider>
  </div></div>;
}

/** Resolved Classic Start composition; no platform, account, renderer or network state is inferred. */
export const StartMenu = forwardRef<HTMLElement, StartMenuProps>(function StartMenu({ size, scale = 2, label, visible, title, actions, auxiliary, profile, footer, background, controllerHints, friends, externalPopup, disabled = false, canQuit, onAction, onExitRequest, offlineHint, onClick, onKeyDown, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture, onCompositionStartCapture, onCompositionEndCapture, className, style, ...props }, ref) {
  const [w, h] = frame(size); finite(w, 'StartMenu width', 150); const s = unit(scale);
  if (typeof label !== 'string' || !label.trim() || typeof visible !== 'boolean' || typeof canQuit !== 'boolean') throw new TypeError('StartMenu requires a label and resolved visible/canQuit booleans');
  const rootRef = useRef<HTMLElement>(null); const dialogRef = useRef<HTMLDivElement>(null); const popupRef = useRef<HTMLDivElement>(null);
  const composing = useRef(new Set<EventTarget>());
  const attach = useCallback((node: HTMLElement | null) => { rootRef.current = node; if (typeof ref === 'function') return ref(node); else if (ref) ref.current = node; }, [ref]);
  const popupActive = !!(visible && externalPopup?.state.included && externalPopup.state.visible);
  const turn = (event: React.PointerEvent<HTMLElement>, caller?: HTMLAttributes<HTMLElement>['onPointerDown']) => {
    caller?.(event); const intent = turnIntents.get(event.nativeEvent); turnIntents.delete(event.nativeEvent);
    if (!intent) return; if (event.defaultPrevented || disabled || !visible) { intent.cancel?.(); return; }
    intent.callback({ ...intent.detail, event });
  };
  const isComposing = (event: KeyboardEvent<HTMLElement>) => {
    for (const target of composing.current) if (!(target instanceof Node) || !target.isConnected || !rootRef.current?.contains(target)) composing.current.delete(target);
    return event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || composing.current.size > 0;
  };
  return <Interaction.Provider value={{ deferred: true, blocked: disabled || !visible }}><section {...props} ref={attach} role={props.role ?? 'region'} aria-label={props['aria-label'] ?? label} hidden={!visible} className={`mc-start-menu ${className ?? ''}`} style={presentation(s, { width: w * s, height: h * s, ...style })}
    onCompositionStartCapture={event => { onCompositionStartCapture?.(event); composing.current.add(event.target); }} onCompositionEndCapture={event => { onCompositionEndCapture?.(event); composing.current.delete(event.target); }}
    onPointerDown={event => turn(event, onPointerDown)} onPointerMove={event => turn(event, onPointerMove)} onPointerUp={event => turn(event, onPointerUp)} onPointerCancel={event => turn(event, onPointerCancel)} onLostPointerCapture={event => turn(event, onLostPointerCapture)}
    onClick={event => { onClick?.(event); if (disabled || !visible || event.defaultPrevented) { intents.delete(event.nativeEvent); closeIntents.delete(event.nativeEvent); return; } if (closeIntents.has(event.nativeEvent)) { closeIntents.delete(event.nativeEvent); externalPopup?.onCloseRequest?.(event); } else dispatch(event, onAction); }}
    onKeyDown={event => { onKeyDown?.(event); if (event.defaultPrevented || !visible || isComposing(event) || event.altKey || event.ctrlKey || event.metaKey) return;
      if (popupActive && event.key === 'Tab') { const dialog = dialogRef.current; if (!dialog) return; const nodes = focusable(dialog); const current = dialog.ownerDocument.activeElement; const index = nodes.indexOf(current as HTMLElement); const next = event.shiftKey ? index <= 0 ? nodes.at(-1) : nodes[index - 1] : index < 0 || index === nodes.length - 1 ? nodes[0] : nodes[index + 1]; (next ?? dialog).focus({ preventScroll: true }); event.preventDefault(); return; }
      if (event.key !== 'Escape' || disabled || event.shiftKey) return;
      if (popupActive) { if (externalPopup!.state.enabled) externalPopup?.onCloseRequest?.(event); } else if (canQuit) onExitRequest?.(event); else return;
      event.preventDefault(); event.stopPropagation();
    }}>
    <div className="mc-start-menu__background">{background}</div><div className="mc-start-menu__surface"><div className="mc-start-menu__main-stack"><div className="mc-start-menu__title-pad"/><StartMenuTitle {...title} size={size} scale={s}/><div className="mc-start-menu__fill"/><StartMenuActionStack {...actions} scale={s} disabled={disabled}/><div className="mc-start-menu__fill mc-start-menu__hint-fill">{controllerHints}{offlineHint}</div><div className="mc-start-menu__bottom-pad"/></div>
      <StartMenuAuxiliaryActions {...auxiliary} size={size} scale={s} disabled={disabled}/><StartMenuProfile {...profile} size={size} scale={s} disabled={disabled}/><div className="mc-start-menu__footer"><StartMenuFooter {...footer} width={w - 2} scale={s}/></div>
      {friends && <StartSourceState state={friends.state} className="mc-start-menu__friends"><StartSourceButton config={content(friends.button, friends.content ?? friends.button.label)} scale={s} role="light-content" geometry={{ kind: 'form-fitting', height: 25 }}/></StartSourceState>}
    </div><Popup value={externalPopup} scale={s} active={popupActive} disabled={disabled} rootRef={popupRef} dialogRef={dialogRef}/>
  </section></Interaction.Provider>;
});
