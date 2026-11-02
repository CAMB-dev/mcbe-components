import { forwardRef, useRef } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode, Ref } from 'react';
import { Image } from './image';
import { ClassicSkin } from './classic-skin';
import { deferClassicRequest, useClassicLayoutEffect, useClassicNodeRef } from './classic-screen-lifecycle';
import { playScreenAssets, playScreenAssets as playScreenContentAssets } from './play-screen-assets';
import { planPlaySourceScrollGeometry, PlayLoading, PlaySourceButton, PlaySourceScroll, PlayStatus, PlayWarning } from './play-screen-parts';
import { progressAssets } from './progress-assets';
import type { PlayActionHandler, PlaySourceImage } from './play-screen-parts';

type NativeDiv = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML' | 'inputMode'>;
type NativeButton = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type' | 'disabled'>;
type DataAttributes = { [key: `data-${string}`]: string | number | boolean | undefined };
export type PlayServerKind = 'featured' | 'additional';
export interface PlayServerImage extends PlaySourceImage {}
/** These are raw provider values, not results of pinging or querying a server. */
export interface PlayServerItem {
  id: string;
  index: number;
  name: string;
  selected: boolean;
  enabled: boolean;
  infoAvailable: boolean;
  screenshotVisible: boolean;
  screenshot?: PlayServerImage;
  messageVisible: boolean;
  message: string;
  concurrencyVisible: boolean;
  playerCount: string;
  pingIcon?: PlayServerImage;
  editVisible: boolean;
  editEnabled: boolean;
  editLabel: string;
  payload?: unknown;
}
export interface PlayServerRowProps extends NativeDiv, DataAttributes {
  kind: PlayServerKind;
  item: PlayServerItem;
  width: number;
  scale: number;
  readOnly?: boolean;
  loadingLabel: string;
  loadingFrame: number;
  onAction?: PlayActionHandler;
  buttonProps?: NativeButton & DataAttributes;
  buttonRef?: Ref<HTMLButtonElement>;
  editButtonProps?: NativeButton & DataAttributes;
  editButtonRef?: Ref<HTMLButtonElement>;
}
export interface PlayServerMetric {
  label: string;
  value: string;
  iconVisible: boolean;
  icon?: PlayServerImage;
  valueVisible: boolean;
  progressVisible: boolean;
}
export interface PlayServerTextSection {
  visible: boolean;
  label: string;
  text: string;
  /** News has an additional source title above its text. */
  title?: string;
  collapsedVisible: boolean;
  expandedVisible: boolean;
  readMoreVisible: boolean;
  readLessVisible: boolean;
  readMoreLabel: string;
  readLessLabel: string;
  /** Required for a visible read action: host-resolved100%c button height, not a recovered engine intrinsic. */
  readButtonHeight?: number;
}
export interface PlayServerScreenshots {
  visible: boolean;
  label: string;
  image?: PlayServerImage;
  previousLabel: string;
  nextLabel: string;
  previousEnabled: boolean;
  nextEnabled: boolean;
  /** Independent source collection selection flags, never inferred from image URL. */
  selected: readonly boolean[];
}
export interface PlayServerGame {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  imageVisible: boolean;
  image?: PlayServerImage;
  /** Explicit resolved cm/sm top-row extent; source gives a minimum of30. */
  topHeight: number;
}
export interface PlayServerDetailData {
  name: string;
  online: PlayServerMetric;
  ping: PlayServerMetric;
  joinLabel: string;
  joinEnabled: boolean;
  payload?: unknown;
}
export interface PlayFeaturedServerDetail extends PlayServerDetailData {
  infoAvailable: boolean;
  screenshotVisible: boolean;
  screenshot?: PlayServerImage;
  offersVisible: boolean;
  offersEnabled: boolean;
  offersLabel: string;
  screenshots: PlayServerScreenshots;
  description: PlayServerTextSection;
  gamesVisible: boolean;
  gamesLabel: string;
  games: readonly PlayServerGame[];
  news: PlayServerTextSection;
}
export interface PlayAddServerDetail { title: string; description: string; isConsole: boolean }
export interface PlayServerDetailsProps extends NativeDiv, DataAttributes {
  size: readonly [number, number];
  scale: number;
  inputMode: 'mouse' | 'touch';
  label: string;
  featuredVisible: boolean;
  additionalVisible: boolean;
  addVisible: boolean;
  featured?: PlayFeaturedServerDetail;
  additional?: PlayServerDetailData;
  add?: PlayAddServerDetail;
  loadingLabel: string;
  loadingFrame: number;
  disabled?: boolean;
  readOnly?: boolean;
  onAction?: PlayActionHandler;
}
export interface PlayServerNotice { text: string; action?: { visible: boolean; label: string; target: 'button.menu_open_uri' | 'button.open_account_setting_gamecore'; enabled: boolean } }
export interface PlayServersVisibility {
  featureServerMessageVisible: boolean;
  rightVisible: boolean;
  featuredServersVisibleAndAvailable: boolean;
  featuredServersVisible: boolean;
  loadingServersProgressVisible: boolean;
  additionalServersVisible: boolean;
  additionalLabelVisible: boolean;
  serversGridVisible: boolean;
  ignoreAddServers: boolean;
  ignoreThirdPartyServers: boolean;
  addServerEnabled: boolean;
  addServerSelected: boolean;
  crossPlatformDisabledVisible: boolean;
  internetConnectionVisible: boolean;
  multiplayerBlockedVisible: boolean;
  deviceSunsettingVisible: boolean;
  newUiSwitchVisible: boolean;
}
export interface PlayServersContentProps extends NativeDiv, DataAttributes {
  size: readonly [number, number];
  scale: number;
  inputMode: 'mouse' | 'touch';
  label: string;
  featuredLabel: string;
  additionalLabel: string;
  addLabel: string;
  loadingLabel: string;
  loadingFrame: number;
  featured: readonly PlayServerItem[];
  additional: readonly PlayServerItem[];
  visibility: PlayServersVisibility;
  details: Omit<PlayServerDetailsProps, keyof NativeDiv | 'size' | 'scale' | 'inputMode' | 'onAction' | 'disabled' | 'readOnly' | 'loadingLabel' | 'loadingFrame'>;
  notices?: Partial<Record<'crossPlatform' | 'internet' | 'blocked' | 'featureMessage', PlayServerNotice>>;
  sunsetting?: { text: string; moreInfoLabel: string; moreInfoWidth: number; height: number };
  newUiSwitch?: { label: string; enabled: boolean };
  disabled?: boolean;
  readOnly?: boolean;
  onAction?: PlayActionHandler;
}

function text(value: unknown, name: string): asserts value is string { if (typeof value !== 'string') throw new TypeError(`${name} must be a string.`); }
function flag(value: unknown, name: string): asserts value is boolean { if (typeof value !== 'boolean') throw new TypeError(`${name} must be a boolean.`); }
function optionalFlag(value: unknown, name: string) { if (value !== undefined) flag(value, name); }
function number(value: unknown, name: string, minimum = 0): asserts value is number { if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > 8192) throw new RangeError(`${name} must be finite and between${minimum} and8192.`); }
function geometry(size: readonly [number, number], scale: number, minimum = 16) {
  if (!Array.isArray(size) || size.length !== 2) throw new TypeError('size must be a logical width/height pair.');
  number(size[0], 'size width', minimum); number(size[1], 'size height', minimum);
  if (!Number.isSafeInteger(scale) || scale < 1 || scale > 32 || size[0] * scale > 8192 || size[1] * scale > 8192 || size[0] * size[1] * scale * scale > 16777216) throw new RangeError('scale must be a positive integer with a finite display extent.');
}
function frame(value: number) { if (!Number.isSafeInteger(value) || value < 0 || value > 9) throw new RangeError('loadingFrame must be an integer from0 through9.'); }
function image(value: PlayServerImage | undefined, name: string, required: boolean) {
  if (!value) { if (required) throw new TypeError(`${name} requires a whole host source image.`); return; }
  text(value.src, `${name}.src`); if (!value.src.trim()) throw new TypeError(`${name}.src must not be blank.`);
  if (!Array.isArray(value.sourceSize) || value.sourceSize.length !== 2 || ![value.sourceSize[0], value.sourceSize[1]].every(v => Number.isSafeInteger(v) && v > 0)) throw new TypeError(`${name}.sourceSize must contain two positive pixel dimensions.`);
}
function sourceImage(value: PlayServerImage, width: number, height: number, scale: number, className?: string) {
  return <Image src={value.src} sourceSize={value.sourceSize} alt={value.alt ?? ''} size={[width, height]} scale={scale} className={className} />;
}
function itemPlan(item: PlayServerItem) {
  if (!item || typeof item !== 'object') throw new TypeError('item must be a source server record.');
  for (const key of ['id', 'name', 'message', 'playerCount', 'editLabel'] as const) text(item[key], `item.${key}`);
  if (!Number.isSafeInteger(item.index) || item.index < 0) throw new RangeError('item.index must be a nonnegative source index.');
  for (const key of ['selected', 'enabled', 'infoAvailable', 'screenshotVisible', 'messageVisible', 'concurrencyVisible', 'editVisible', 'editEnabled'] as const) flag(item[key], `item.${key}`);
  image(item.screenshot, 'item.screenshot', item.screenshotVisible); image(item.pingIcon, 'item.pingIcon', item.concurrencyVisible);
}
const classes = (...values: (string | undefined | false)[]) => values.filter(Boolean).join(' ');
const appearance = (scale: number): CSSProperties => ({ '--mc-play-scale': scale, '--mc-play-divider-image': `url(${JSON.stringify(playScreenContentAssets['textures/ui/divider3'].url)})` } as CSSProperties);
function loading(label: string, scale: number, height: number, loadingFrame: number) { return <PlayLoading label={label} scale={scale} height={height} frame={loadingFrame} barsVisible placeholderRows={0} />; }
function Bars({ label, scale, width, height, currentFrame }: { label: string; scale: number; width: number; height: number; currentFrame: number }) {
  const asset = progressAssets['textures/ui/loading_bar'];
  return <span role="img" aria-label={label} className="mc-play-server-details__bars" data-frame={currentFrame} style={{ width: width * scale, height: height * scale }}><Image src={asset.url} sourceSize={[asset.width, asset.height]} alt="" size={[width * 10, height]} scale={scale} style={{ left: -currentFrame * width * scale }} /></span>;
}
function rowAppearance(scale: number): CSSProperties { return { ...appearance(scale), ...Object.fromEntries([
  ['--mc-play-server-unchecked', 'textures/ui/button_borderless_dark'], ['--mc-play-server-checked', 'textures/ui/button_borderless_darkpressednohover'],
  ['--mc-play-server-hover', 'textures/ui/button_borderless_darkhover'], ['--mc-play-server-checked-hover', 'textures/ui/button_borderless_darkpressed'],
].map(([variable, path]) => [variable, `url(${JSON.stringify(playScreenContentAssets[path! as keyof typeof playScreenContentAssets].url)})`])) }; }

/** Classic source row. Activation requests selection; joining exists only in the details pane. */
export const PlayServerRow = forwardRef<HTMLDivElement, PlayServerRowProps>(function PlayServerRow({ kind, item, width, scale, loadingLabel, loadingFrame, readOnly, onAction, buttonProps, buttonRef, editButtonProps, editButtonRef, className, style, ...native }, forwarded) {
  if (kind !== 'featured' && kind !== 'additional') throw new TypeError('kind must be featured or additional.');
  geometry([width, 40], scale); itemPlan(item); text(loadingLabel, 'loadingLabel'); frame(loadingFrame); optionalFlag(readOnly, 'readOnly');
  const [, attach] = useClassicNodeRef(forwarded), collection = kind === 'featured' ? 'third_party_server_network_worlds' : 'servers_network_worlds';
  const height = kind === 'featured' ? 40 : 30, edit = kind === 'additional' && item.editVisible, mainWidth = width - (edit ? 30 : 0);
  const featuredTitleWidth = mainWidth - 12 - (item.screenshotVisible ? 26.8892 : 0);
  if (mainWidth < 10) throw new RangeError('Server row must include the source edit hitbox and main button.');
  return <div {...native} ref={attach} className={classes('mc-play-server-row', `mc-play-server-row--${kind}`, className)} data-source-profile="classic-play" data-default-anchor-policy={kind === 'featured' ? 'center-web' : 'top-left-stack'} data-server-id={item.id} data-server-index={item.index} data-collection={collection} style={{ ...rowAppearance(scale), ...style, width: width * scale, height: height * scale }}>
    <PlaySourceButton {...buttonProps} ref={buttonRef} label={buttonProps?.['aria-label'] ?? item.name} labelFromContent={!!((item.infoAvailable&&item.name.trim())||(item.messageVisible&&item.message.trim())||(item.concurrencyVisible&&item.playerCount.trim()))} target="server_navigation_toggle" scale={scale} selected={item.selected} disabled={!item.enabled} readOnly={readOnly} collection={collection} index={item.index} itemId={item.id} payload={item.payload} onAction={onAction} className={classes('mc-play-server-row__select', buttonProps?.className)} style={{ ...buttonProps?.style, width: mainWidth * scale, height: (kind === 'additional' ? 31 : 38) * scale }}>
      <span className="mc-play-server-row__content">
        <span className="mc-play-server-row__top">
          {kind === 'featured' && item.screenshotVisible && <span className="mc-play-server-row__logo" data-cross-axis-policy="resolved-height-web"><ClassicSkin asset={playScreenContentAssets['textures/ui/default_indent']} width={26.8892} height={16} scale={scale} className="mc-play-server-row__logo-idle" /><ClassicSkin asset={playScreenAssets['textures/ui/world_screenshot_focus_border']} width={26.8892} height={16} scale={scale} className="mc-play-server-row__logo-hover" />{sourceImage(item.screenshot!, 24.8892, 14, scale)}</span>}
          {kind === 'featured' && <span aria-hidden="true" className="mc-play-server-row__title-gap" />}
          <span className="mc-play-server-row__title">{item.infoAvailable ? item.name : <Bars label={loadingLabel} scale={scale} width={Math.max(1, (kind === 'featured' ? featuredTitleWidth : mainWidth - 6) - 8)} height={12} currentFrame={loadingFrame} />}</span>
        </span>
        {item.messageVisible && <span className="mc-play-server-row__message">{item.message}</span>}
        {item.concurrencyVisible && <span className="mc-play-server-row__concurrency"><span>{item.playerCount}</span>{sourceImage(item.pingIcon!, 8, 8, scale)}</span>}
      </span>
    </PlaySourceButton>
    {edit && <PlaySourceButton {...editButtonProps} ref={editButtonRef} label={editButtonProps?.['aria-label'] ?? item.editLabel} target="button.menu_network_server_world_edit" scale={scale} disabled={!item.editEnabled} readOnly={readOnly} collection={collection} index={item.index} itemId={item.id} payload={item.payload} onAction={onAction} className={classes('mc-play-server-row__edit', editButtonProps?.className)} style={{ ...editButtonProps?.style, width: 30 * scale, height: 31 * scale }}><Image src={playScreenAssets['textures/ui/editIcon'].url} sourceSize={[22, 16]} alt="" size={[22, 16]} scale={scale} /></PlaySourceButton>}
  </div>;
});

function metricPlan(value: PlayServerMetric, name: string) {
  if (!value) throw new TypeError(`${name} must be supplied.`);
  text(value.label, `${name}.label`); text(value.value, `${name}.value`);
  for (const key of ['iconVisible', 'valueVisible', 'progressVisible'] as const) flag(value[key], `${name}.${key}`);
  image(value.icon, `${name}.icon`, value.iconVisible);
}
function Metric({ value, scale, ping, loadingLabel, loadingFrame }: { value: PlayServerMetric; scale: number; ping?: boolean; loadingLabel: string; loadingFrame: number }) {
  return <div className="mc-play-server-details__metric"><span>{value.label}</span><span className="mc-play-server-details__metric-value">{value.iconVisible && sourceImage(value.icon!, ping ? 8 : 5, ping ? 8 : 5, scale)}{value.valueVisible && <span>{value.value}</span>}</span>{value.progressVisible && <Bars label={loadingLabel} scale={scale} width={20} height={10} currentFrame={loadingFrame} />}</div>;
}
function textSectionPlan(value: PlayServerTextSection, name: string) {
  if (!value) throw new TypeError(`${name} section flags must be supplied.`);
  for (const key of ['visible', 'collapsedVisible', 'expandedVisible', 'readMoreVisible', 'readLessVisible'] as const) flag(value[key], `${name}.${key}`);
  for (const key of ['label', 'text', 'readMoreLabel', 'readLessLabel'] as const) text(value[key], `${name}.${key}`);
  if (name === 'news' && value.visible) text(value.title, 'news.title');
  if (value.readButtonHeight !== undefined || value.visible && (value.readMoreVisible || value.readLessVisible)) number(value.readButtonHeight, `${name}.readButtonHeight`, Number.MIN_VALUE);
}
function detailPlan(value: PlayServerDetailData | undefined, name: string) {
  if (!value) throw new TypeError(`${name} data is required for its visible pane.`);
  text(value.name, `${name}.name`); text(value.joinLabel, `${name}.joinLabel`); flag(value.joinEnabled, `${name}.joinEnabled`); metricPlan(value.online, `${name}.online`); metricPlan(value.ping, `${name}.ping`);
}
function featuredPlan(value: PlayFeaturedServerDetail | undefined) {
  if (!value) throw new TypeError('featured data is required for its visible pane.'); detailPlan(value, 'featured');
  for (const key of ['infoAvailable', 'screenshotVisible', 'offersVisible', 'offersEnabled', 'gamesVisible'] as const) flag(value[key], `featured.${key}`);
  text(value.offersLabel, 'featured.offersLabel'); text(value.gamesLabel, 'featured.gamesLabel'); image(value.screenshot, 'featured.screenshot', value.screenshotVisible);
  textSectionPlan(value.description, 'description'); textSectionPlan(value.news, 'news');
  if (!value.screenshots) throw new TypeError('featured.screenshots flags must be supplied.');
  const shots = value.screenshots; for (const key of ['visible', 'previousEnabled', 'nextEnabled'] as const) flag(shots[key], `screenshots.${key}`);
  for (const key of ['label', 'previousLabel', 'nextLabel'] as const) text(shots[key], `screenshots.${key}`);
  image(shots.image, 'screenshots.image', shots.visible);
  if (!Array.isArray(shots.selected)) throw new TypeError('screenshots.selected must be source selection flags.'); for (const selected of shots.selected) flag(selected, 'screenshots.selected');
  if (!Array.isArray(value.games)) throw new TypeError('featured.games must be an array.');
  for (const game of value.games) { for (const key of ['id', 'title', 'subtitle', 'description'] as const) text(game[key], `game.${key}`); flag(game.imageVisible, 'game.imageVisible'); image(game.image, 'game.image', game.imageVisible); number(game.topHeight, 'game.topHeight', 30); }
}
function Surface({ width, children }: { width: number; children: ReactNode }) { return <div className="mc-play-server-details__surface" style={{ width }}><span aria-hidden="true" className="mc-play-server-details__surface-art" style={{ backgroundImage: `url(${JSON.stringify(playScreenContentAssets['textures/ui/screen_background'].url)})` }} />{children}</div>; }
/** Existing common_buttons.read_button/underline_button leaf. Width uses the
 * browser's actual glyph intrinsic; the host supplies the unresolved cm height. */
function ReadSourceButton({ label, name, height, scale, disabled, readOnly, onAction, payload }: { label: string; name: 'description' | 'news'; height: number; scale: number; disabled?: boolean; readOnly?: boolean; onAction?: PlayActionHandler; payload?: unknown }) {
  const target = `button.${name}_read_toggle`, [, attach] = useClassicNodeRef<HTMLButtonElement>(), latest = useRef({ disabled, readOnly, onAction, target, payload });
  useClassicLayoutEffect(() => { latest.current = { disabled, readOnly, onAction, target, payload }; });
  return <button ref={attach} type="button" disabled={disabled || readOnly} aria-label={label} className="mc-play-server-read-button" data-play-target={target} data-source-path="common_buttons.read_button/underline_button" data-intrinsic-policy="host-height-web-glyph-width" data-resolved-height={height} style={{ height: height * scale }}
    onKeyDown={event => { if ((event.nativeEvent.isComposing || event.keyCode === 229) && ['Enter', ' '].includes(event.key)) event.preventDefault(); }}
    onClick={event => {
      if (disabled || readOnly || event.defaultPrevented || event.nativeEvent.defaultPrevented) return;
      const owner = event.currentTarget;
      deferClassicRequest(event, owner, snapshot => latest.current.onAction?.({ target, control: owner, event: snapshot, payload }), () => {
        const current = latest.current; return !current.disabled && !current.readOnly && current.target === target && current.payload === payload && !owner.closest('[hidden],[inert]');
      });
    }}><span className="mc-play-server-read-button__panel" data-source-panel-height="100%c+3px"><span className="mc-play-server-read-button__label">{label}<span aria-hidden="true" className="mc-play-server-read-button__underline mc-play-server-read-button__underline--default" style={{ backgroundImage: `url(${JSON.stringify(playScreenAssets['textures/ui/underline'].url)})` }} /><span aria-hidden="true" className="mc-play-server-read-button__underline mc-play-server-read-button__underline--focus" style={{ backgroundImage: `url(${JSON.stringify(playScreenAssets['textures/ui/underline_focus'].url)})` }} /></span></span></button>;
}
function TextSection({ value, name, width, scale, disabled, readOnly, onAction, payload }: { value: PlayServerTextSection; name: 'description' | 'news'; width: number; scale: number; disabled?: boolean; readOnly?: boolean; onAction?: PlayActionHandler; payload?: unknown }) {
  return <section className={`mc-play-server-details__section mc-play-server-details__section--${name}`} hidden={!value.visible} data-source-section={name}>
    <h3>{value.label}</h3><Surface width={width * scale}>
      <div className="mc-play-server-details__text-stack">{name === 'news' && <><div className="mc-play-server-details__news-title">{value.title}</div><div className="mc-play-server-details__news-divider" /></>}
        <div hidden={!value.collapsedVisible} className="mc-play-server-details__copy mc-play-server-details__copy--collapsed">{value.text}</div><div hidden={!value.expandedVisible} className="mc-play-server-details__copy">{value.text}</div>
      </div>
      <span className="mc-play-server-details__read-actions">{value.visible && value.readMoreVisible && <ReadSourceButton label={value.readMoreLabel} name={name} height={value.readButtonHeight!} scale={scale} disabled={disabled} readOnly={readOnly} onAction={onAction} payload={payload} />}{value.visible && value.readLessVisible && <ReadSourceButton label={value.readLessLabel} name={name} height={value.readButtonHeight!} scale={scale} disabled={disabled} readOnly={readOnly} onAction={onAction} payload={payload} />}</span>
    </Surface>
  </section>;
}

/** Three independent source detail planes. No selection or visibility is derived from arrays. */
export const PlayServerDetails = forwardRef<HTMLDivElement, PlayServerDetailsProps>(function PlayServerDetails({ size, scale, inputMode, label, featuredVisible, additionalVisible, addVisible, featured, additional, add, loadingLabel, loadingFrame, disabled, readOnly, onAction, className, style, ...native }, forwarded) {
  geometry(size, scale); if (inputMode !== 'mouse' && inputMode !== 'touch') throw new TypeError('inputMode must be mouse or touch.');
  text(label, 'label'); text(loadingLabel, 'loadingLabel'); frame(loadingFrame); for (const [name, value] of Object.entries({ featuredVisible, additionalVisible, addVisible })) flag(value, name); optionalFlag(disabled, 'disabled'); optionalFlag(readOnly, 'readOnly');
  if (featuredVisible || featured) featuredPlan(featured); if (additionalVisible || additional) detailPlan(additional, 'additional'); if (addVisible || add) { if (!add) throw new TypeError('add data is required for its visible pane.'); text(add.title, 'add.title'); text(add.description, 'add.description'); flag(add.isConsole, 'add.isConsole'); }
  const [, attach] = useClassicNodeRef(forwarded), innerWidth = planPlaySourceScrollGeometry(size, scale, inputMode, 'server-pane').contentWidth - 2;
  const actions = (data: PlayServerDetailData, kind: PlayServerKind) => <><h2>{data.name}</h2><Metric value={data.online} scale={scale} loadingLabel={loadingLabel} loadingFrame={loadingFrame} /><Metric value={data.ping} scale={scale} ping loadingLabel={loadingLabel} loadingFrame={loadingFrame} /><PlaySourceButton label={data.joinLabel} target={kind === 'featured' ? 'button.connect_to_third_party_server' : 'button.menu_network_server_item'} scale={scale} surface="light" disabled={disabled || !data.joinEnabled} readOnly={readOnly} onAction={onAction} payload={data.payload} className="mc-play-server-details__join" /></>;
  return <div {...native} ref={attach} className={classes('mc-play-server-details', className)} aria-label={native['aria-label'] ?? label} data-source-profile="classic-play" style={{ ...appearance(scale), ...style, width: size[0] * scale, height: size[1] * scale }}>
    <div className="mc-play-server-details__plane" data-detail="featured" hidden={!featuredVisible}>
      <PlaySourceScroll size={size} sourceLayout="server-pane" scale={scale} inputMode={inputMode} label={`${label}: ${featured?.name ?? ''}`}>
        {featured && <div className="mc-play-server-details__stack mc-play-server-details__stack--featured">{featured.infoAvailable ? <>{featured.screenshotVisible && sourceImage(featured.screenshot!, innerWidth, innerWidth * .5625, scale, 'mc-play-server-details__hero')}{actions(featured, 'featured')}
          {featured.offersVisible && <PlaySourceButton label={featured.offersLabel} target="button.view_third_party_server_offers" scale={scale} surface="light" disabled={disabled || !featured.offersEnabled} readOnly={readOnly} onAction={onAction} payload={featured.payload} className="mc-play-server-details__offers" />}
          <section className="mc-play-server-details__section" hidden={!featured.screenshots.visible} data-source-section="screenshots"><h3>{featured.screenshots.label}</h3>{featured.screenshots.image && sourceImage(featured.screenshots.image, innerWidth, innerWidth * .5625, scale)}<div className="mc-play-server-details__screenshot-nav">
            <PlaySourceButton label={featured.screenshots.previousLabel} target="button.navigate_screenshots_left" scale={scale} surface="light" disabled={disabled || !featured.screenshots.previousEnabled} readOnly={readOnly} onAction={onAction} payload={featured.payload}>{sourceImage({ src: playScreenContentAssets['textures/ui/arrow_left_white'].url, sourceSize: [playScreenContentAssets['textures/ui/arrow_left_white'].width, playScreenContentAssets['textures/ui/arrow_left_white'].height] }, 7, 7, scale)}</PlaySourceButton>
            <span className="mc-play-server-details__indicators" aria-hidden="true" style={{ backgroundImage: `url(${JSON.stringify(playScreenContentAssets['textures/ui/Black'].url)})` }}>{featured.screenshots.selected.map((selected, index) => <span key={index} data-selected={selected} style={{ maskImage: `url(${JSON.stringify(playScreenContentAssets['textures/ui/white_background'].url)})` }} />)}</span>
            <PlaySourceButton label={featured.screenshots.nextLabel} target="button.navigate_screenshots_right" scale={scale} surface="light" disabled={disabled || !featured.screenshots.nextEnabled} readOnly={readOnly} onAction={onAction} payload={featured.payload}>{sourceImage({ src: playScreenContentAssets['textures/ui/arrow_right_white'].url, sourceSize: [playScreenContentAssets['textures/ui/arrow_right_white'].width, playScreenContentAssets['textures/ui/arrow_right_white'].height] }, 7, 7, scale)}</PlaySourceButton>
          </div></section>
          <TextSection value={featured.description} name="description" width={innerWidth} scale={scale} disabled={disabled} readOnly={readOnly} onAction={onAction} payload={featured.payload} />
          <section className="mc-play-server-details__section" hidden={!featured.gamesVisible} data-source-section="games"><h3>{featured.gamesLabel}</h3>{featured.games.map(game => <div key={game.id} className="mc-play-server-details__game" data-source-game-id={game.id}><Surface width={innerWidth * scale}><div className="mc-play-server-details__game-top" style={{ minHeight: game.topHeight * scale }}><span className="mc-play-server-details__game-image">{game.imageVisible && sourceImage(game.image!, (innerWidth - 8) / 2, game.topHeight, scale)}</span><div><div>{game.title}</div><div className="mc-play-server-details__small">{game.subtitle}</div></div></div><div className="mc-play-server-details__game-description mc-play-server-details__small">{game.description}</div></Surface></div>)}</section>
          <TextSection value={featured.news} name="news" width={innerWidth} scale={scale} disabled={disabled} readOnly={readOnly} onAction={onAction} payload={featured.payload} />
        </> : <Bars label={loadingLabel} scale={scale} width={Math.max(1, innerWidth - 8)} height={15} currentFrame={loadingFrame} />}</div>}
      </PlaySourceScroll>
    </div>
    <div className="mc-play-server-details__plane" data-detail="additional" hidden={!additionalVisible}><PlaySourceScroll size={size} sourceLayout="server-pane" scale={scale} inputMode={inputMode} label={`${label}: ${additional?.name ?? ''}`}>{additional && <div className="mc-play-server-details__stack">{actions(additional, 'additional')}</div>}</PlaySourceScroll></div>
    <div className="mc-play-server-details__plane" data-detail="add" hidden={!addVisible}><PlaySourceScroll size={size} sourceLayout="server-pane" scale={scale} inputMode={inputMode} label={add?.title ?? label}>{add && <div className="mc-play-server-details__stack mc-play-server-details__stack--add" hidden={add.isConsole}><h2>{add.title}</h2><p className="mc-play-server-details__small">{add.description}</p></div>}</PlaySourceScroll></div>
  </div>;
});

function noticePlan(value: PlayServerNotice | undefined, name: string) { if (!value) throw new TypeError(`${name} notice is required when visible.`); text(value.text, `${name}.text`); if (value.action) { text(value.action.label, `${name}.action.label`); if (!['button.menu_open_uri', 'button.open_account_setting_gamecore'].includes(value.action.target)) throw new TypeError('Notice action must be a source account-settings request.'); flag(value.action.enabled, `${name}.action.enabled`); flag(value.action.visible, `${name}.action.visible`); } }
function Notice({ notice, scale, disabled, readOnly, onAction }: { notice: PlayServerNotice; scale: number; disabled?: boolean; readOnly?: boolean; onAction?: PlayActionHandler }) { return <><PlayStatus text={notice.text} scale={scale} surface="dark" />{notice.action?.visible && <PlaySourceButton label={notice.action.label} target={notice.action.target} scale={scale} surface="light" disabled={disabled || !notice.action.enabled} readOnly={readOnly} onAction={onAction} payload={notice.action.target === 'button.menu_open_uri' ? { hyperlink: 'https://aka.ms/MCMultiplayerHelp' } : undefined} style={{ width: '100%', height: 30 * scale }} />}</>; }

/** Default Classic Play server split, without networking, authentication or purchase services. */
export const PlayServersContent = forwardRef<HTMLDivElement, PlayServersContentProps>(function PlayServersContent({ size, scale, inputMode, label, featuredLabel, additionalLabel, addLabel, loadingLabel, loadingFrame, featured, additional, visibility, details, notices, sunsetting, newUiSwitch, disabled, readOnly, onAction, className, style, ...native }, forwarded) {
  geometry(size, scale, 64); if (inputMode !== 'mouse' && inputMode !== 'touch') throw new TypeError('inputMode must be mouse or touch.');
  for (const [name, value] of Object.entries({ label, featuredLabel, additionalLabel, addLabel, loadingLabel })) text(value, name); frame(loadingFrame); optionalFlag(disabled, 'disabled'); optionalFlag(readOnly, 'readOnly');
  if (!visibility || typeof visibility !== 'object') throw new TypeError('visibility requires the explicit source flag snapshot.');
  for (const key of ['featureServerMessageVisible', 'rightVisible', 'featuredServersVisibleAndAvailable', 'featuredServersVisible', 'loadingServersProgressVisible', 'additionalServersVisible', 'additionalLabelVisible', 'serversGridVisible', 'ignoreAddServers', 'ignoreThirdPartyServers', 'addServerEnabled', 'addServerSelected', 'crossPlatformDisabledVisible', 'internetConnectionVisible', 'multiplayerBlockedVisible', 'deviceSunsettingVisible', 'newUiSwitchVisible'] as const) flag(visibility[key], `visibility.${key}`);
  if (!Array.isArray(featured) || !Array.isArray(additional)) throw new TypeError('featured and additional must be ordered source arrays.'); for (const item of [...featured, ...additional]) itemPlan(item);
  if (!details || typeof details !== 'object') throw new TypeError('details must supply independent detail flags.');
  for (const [active, key] of [[visibility.crossPlatformDisabledVisible, 'crossPlatform'], [visibility.internetConnectionVisible, 'internet'], [visibility.multiplayerBlockedVisible, 'blocked'], [visibility.featureServerMessageVisible, 'featureMessage']] as const) if (active) noticePlan(notices?.[key], key);
  if (visibility.deviceSunsettingVisible) { if (!sunsetting) throw new TypeError('sunsetting data is required for the source warning.'); text(sunsetting.text, 'sunsetting.text'); text(sunsetting.moreInfoLabel, 'sunsetting.moreInfoLabel'); number(sunsetting.moreInfoWidth, 'sunsetting.moreInfoWidth', 1); number(sunsetting.height, 'sunsetting.height', 1); }
  const warningHeight = visibility.deviceSunsettingVisible ? sunsetting!.height : 0, height = size[1] - warningHeight;
  if (height < 32) throw new RangeError('Sunsetting source fragment leaves no room for the server split.');
  const leftWidth = size[0] / 2 - 1, rightWidth = size[0] / 2 - 4, rowWidth = planPlaySourceScrollGeometry([leftWidth, height], scale, inputMode, 'server-pane').contentWidth - 3;
  if (visibility.newUiSwitchVisible) { if (!newUiSwitch) throw new TypeError('newUiSwitch data is required when visible.'); text(newUiSwitch.label, 'newUiSwitch.label'); flag(newUiSwitch.enabled, 'newUiSwitch.enabled'); }
  const [, attach] = useClassicNodeRef(forwarded);
  const notice = (key: 'crossPlatform' | 'internet' | 'blocked' | 'featureMessage') => <Notice notice={notices![key]!} scale={scale} disabled={disabled} readOnly={readOnly} onAction={onAction} />;
  return <div {...native} ref={attach} className={classes('mc-play-servers-content', className)} aria-label={native['aria-label'] ?? label} data-source-profile="classic-play" data-source-route="default-servers-finite" style={{ ...appearance(scale), ...style, width: size[0] * scale, height: size[1] * scale }}>
    {visibility.deviceSunsettingVisible && <PlayWarning {...sunsetting!} scale={scale} disabled={disabled} readOnly={readOnly} onAction={onAction} />}
    <div className="mc-play-servers-content__split" hidden={visibility.featureServerMessageVisible} style={{ height: height * scale }}>
      <div className="mc-play-servers-content__left" style={{ width: leftWidth * scale }}><PlaySourceScroll size={[leftWidth, height]} sourceLayout="server-pane" scale={scale} inputMode={inputMode} label={label} className="mc-play-servers-content__scroll">
        <div className="mc-play-servers-content__list">
          {visibility.crossPlatformDisabledVisible && notice('crossPlatform')}{visibility.internetConnectionVisible && notice('internet')}{visibility.multiplayerBlockedVisible && !visibility.ignoreAddServers && !visibility.ignoreThirdPartyServers && notice('blocked')}
          {visibility.newUiSwitchVisible && <div className="mc-play-servers-content__new-ui"><PlaySourceButton label={newUiSwitch!.label} target="button.switch_to_new_ui_servers" scale={scale} surface="light" disabled={disabled || !newUiSwitch!.enabled} readOnly={readOnly} onAction={onAction} style={{ width: (rowWidth - 1) * scale, height: 30 * scale }} /></div>}
          {!visibility.ignoreThirdPartyServers && visibility.featuredServersVisibleAndAvailable && <section className="mc-play-servers-content__featured">{visibility.loadingServersProgressVisible && loading(loadingLabel, scale, 40, loadingFrame)}<h2>{featuredLabel}</h2><div hidden={!visibility.featuredServersVisible}>{featured.map(item => <PlayServerRow key={item.id} kind="featured" item={disabled ? { ...item, enabled: false, editEnabled: false } : item} width={rowWidth} scale={scale} loadingLabel={loadingLabel} loadingFrame={loadingFrame} readOnly={readOnly} onAction={onAction} />)}</div></section>}
          <div className="mc-play-servers-content__horizontal-divider" />
          {!visibility.ignoreAddServers && !visibility.ignoreThirdPartyServers && visibility.additionalServersVisible && <section className="mc-play-servers-content__additional"><h2 hidden={!visibility.additionalLabelVisible}>{additionalLabel}</h2><div>{additional.map(item => <PlayServerRow key={item.id} kind="additional" item={disabled ? { ...item, enabled: false, editEnabled: false } : item} width={rowWidth} scale={scale} loadingLabel={loadingLabel} loadingFrame={loadingFrame} readOnly={readOnly} onAction={onAction} />)}</div><div className="mc-play-servers-content__grid-padding" hidden={!visibility.serversGridVisible} /></section>}
          {!visibility.ignoreAddServers && <PlaySourceButton label={addLabel} target="server_navigation_toggle" scale={scale} surface="light" selected={visibility.addServerSelected} disabled={disabled || !visibility.addServerEnabled} readOnly={readOnly} index={100} onAction={onAction} className="mc-play-servers-content__add" />}
        </div>
      </PlaySourceScroll></div>
      <div aria-hidden="true" className="mc-play-servers-content__divider" style={{ width: 3 * scale, height: (height - 4) * scale, backgroundImage: `url(${JSON.stringify(playScreenContentAssets['textures/ui/HowToPlayDivider'].url)})`, backgroundSize: `${3 * scale}px auto` }} />
      <div className="mc-play-servers-content__right" hidden={!visibility.rightVisible} style={{ width: rightWidth * scale }}><PlayServerDetails {...details} size={[rightWidth, height]} scale={scale} inputMode={inputMode} disabled={disabled} readOnly={readOnly} onAction={onAction} loadingLabel={loadingLabel} loadingFrame={loadingFrame} /></div>
    </div>
    <div className="mc-play-servers-content__feature-message" hidden={!visibility.featureServerMessageVisible}>{visibility.featureServerMessageVisible && <><h2>{featuredLabel}</h2>{notice('featureMessage')}</>}</div>
  </div>;
});
