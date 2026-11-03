import {forwardRef, useRef, useState, version as reactVersion} from 'react';
import type {CSSProperties, HTMLAttributes, KeyboardEvent, ReactNode, Ref, SyntheticEvent} from 'react';
import type {SourceSettingsNavigationNode,SourceSettingsNavigationProps,SourceSettingsNavigationPlan,SourceSettingsNavigationPlanEntry} from './settings-navigation-source-model';
export type {SourceSettingsNavigationNode,SourceSettingsNavigationProps,SourceSettingsNavigationSection,SourceSettingsNavigationStack,SourceSettingsNavigationSlot,SourceSettingsNavigationPlan,SourceSettingsNavigationPlanEntry} from './settings-navigation-source-model';
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
interface SectionProps {item: SettingsNavigationSection; model: Snapshot; tabStop: boolean; onFocused: (id: string) => void; glyphContent?:ReactNode; sourceLabelMaxInset?:readonly[number,number]}
const Section = forwardRef<HTMLButtonElement, SectionProps>(function Section({item, model, tabStop, onFocused, glyphContent, sourceLabelMaxInset}, ref) {
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
        {glyphContent!==undefined ? glyphContent : <>
        {item.glyph.outline?.visible && <Image className="mc-settings-navigation-section__outline-glyph" src={item.glyph.outline.src} sourceSize={item.glyph.outline.sourceSize} size={item.glyph.size} scale={s} alt=""/>}
        {item.glyph.color?.visible && <Image className="mc-settings-navigation-section__color-glyph" src={item.glyph.color.src} sourceSize={item.glyph.color.sourceSize} size={item.glyph.size} scale={s} alt=""/>}
        </>}
      </span>
      <span className="mc-settings-navigation-section__label" style={sourceLabelMaxInset?{width:`calc(100% - ${sourceLabelMaxInset[0]*s}px)`}:undefined}><span style={sourceLabelMaxInset?{maxHeight:(25-sourceLabelMaxInset[1])*s}:undefined}>{item.label}</span></span>
    </span>
  </button>;
});

/** Shared keyboard kernel. Public flat behavior stays unchanged; private
 * trees only handle their actual radio owners, never host slot controls. */
function navigationKeyDown(event:KeyboardEvent<HTMLDivElement>,onKeyDown:SettingsNavigationProps['onKeyDown'],sourceTree=false){
  const owner=event.currentTarget,target=event.target as Element;
  onKeyDown?.(event);
  if(event.defaultPrevented||event.nativeEvent.defaultPrevented||event.nativeEvent.isComposing||event.keyCode===229||event.altKey||event.ctrlKey||event.metaKey||!owner.contains(target)||owner.closest('[hidden],[inert]'))return;
  if(!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
  if(sourceTree&&target!==owner){
    const radio=target.closest('button[data-settings-navigation-id]');
    if(!radio||radio.closest('.mc-settings-navigation')!==owner||radio.closest('[data-source-settings-slot]')||!available(radio as HTMLButtonElement))return;
  }
  const candidates=Array.from(owner.querySelectorAll<HTMLButtonElement>('button[data-settings-navigation-id]')).filter(button=>available(button)&&(!sourceTree||button.closest('.mc-settings-navigation')===owner&&!button.closest('[data-source-settings-slot]'))),at=candidates.findIndex(button=>button===owner.ownerDocument.activeElement);
  if(!candidates.length)return;
  const next=event.key==='Home'?0:event.key==='End'?candidates.length-1:at<0?event.key==='ArrowDown'?0:candidates.length-1:(at+(event.key==='ArrowDown'?1:-1)+candidates.length)%candidates.length;
  event.preventDefault();candidates[next]!.focus();
}

/** Source30-unit radio rows with31-unit state paint. No source index guesses an
 * accepted value. Roving focus/centered omitted anchors are explicit Web policy.
 * Server progress_loading_bars provider is not implemented by this finite part. */
export const SettingsNavigation = forwardRef<HTMLDivElement, SettingsNavigationProps>(function SettingsNavigation(props, ref) {
  const model = snapshot(props), {label, inert, hidden, className, style, onKeyDown, onBlur, itemRefs, ...rest} = props;
  const native = {...rest} as Record<string, unknown>;
  for (const name of ['width', 'scale', 'font', 'items', 'value', 'sourceDefaultIndex', 'toggleOnHover', 'hoverPolicy', 'hiddenSlots', 'disabled', 'onValueChange', 'children', 'dangerouslySetInnerHTML', 'defaultValue', 'nodes', 'nodeRefs']) delete native[name];
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
      navigationKeyDown(event,onKeyDown);
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


interface SourceTreeNode {
  readonly source:SourceSettingsNavigationNode;readonly children:readonly SourceTreeNode[];
  readonly item:SettingsNavigationItem|null;readonly height:number;
  readonly visible:boolean;readonly enabled:boolean;readonly ignored:boolean;
}
function sourceTree(p:SourceSettingsNavigationProps):{model:Snapshot;nodes:readonly SourceTreeNode[]}{
  if(p.nodeRefs!==undefined)record(p.nodeRefs,'source nodeRefs');
  const leaves:SettingsNavigationItem[]=[],ids=new Set<string>();let count=0;
  const visit=(input:unknown,ancestor:{ignored:boolean;visible:boolean;enabled:boolean},depth:number):SourceTreeNode=>{
    if(++count>512||depth>24)throw new RangeError('Source settings navigation supports512 nodes and24 levels.');
    const raw=record(input,'source navigation node');text(raw.id,'source node id',true);text(raw.sourceControl,'source node control',true);
    if(ids.has(raw.id))throw new TypeError('Source navigation IDs must be unique across wrappers and leaves.');ids.add(raw.id);
    for(const key of ['ignored','visible','enabled'])flag(raw[key],'source node '+key);
    const ignored=ancestor.ignored||raw.ignored===true,visible=ancestor.visible&&raw.visible===true,enabled=ancestor.enabled&&raw.enabled===true;
    const inherited={ignored,visible,enabled},base={id:raw.id,sourceControl:raw.sourceControl,ignored:raw.ignored as boolean,visible:raw.visible as boolean,enabled:raw.enabled as boolean};
    let source:SourceSettingsNavigationNode,children:readonly SourceTreeNode[]=[],item:SettingsNavigationItem|null=null,height=0;
    if(raw.kind==='source-stack'){
      children=visitArray(raw.children,inherited,depth+1);
      source=Object.freeze({...base,kind:'source-stack',children:Object.freeze(children.map(child=>child.source))});
      height=children.reduce((total,child)=>total+child.height,0);
    }else if(raw.kind==='source-slot'){
      extent(raw.height,'source slot height',true);if(!Object.hasOwn(raw,'content'))throw new TypeError('Source slot needs explicit host content.');
      source=Object.freeze({...base,kind:'source-slot',height:raw.height,content:raw.content as ReactNode});height=raw.height;
    }else{
      // Reuse the public leaf validator; only effective ancestor capability is
      // flattened. The private tree and its original flags remain independent.
      const {glyphContent,sourceLabelMaxInset,...leaf}=raw;
      let labelInset:readonly[number,number]|undefined;
      if(sourceLabelMaxInset!==undefined){const axes=pair(sourceLabelMaxInset,'source label max inset');for(const axis of axes)extent(axis,'source label max inset',true);if((axes[0]as number)>=p.width-6||(axes[1]as number)>25)throw new RangeError('Source label max insets exceed the finite content box.');labelInset=Object.freeze([...axes])as readonly[number,number];}
      const checked=snapshot({...p,items:[{...leaf,...inherited}as unknown as SettingsNavigationItem]});
      item=checked.items[0]!;leaves.push(item);
      source=Object.freeze({...item,...base,...(item.kind==='section'&&Object.hasOwn(raw,'glyphContent')?{glyphContent:glyphContent as ReactNode}:{}),...(item.kind==='section'&&labelInset?{sourceLabelMaxInset:labelInset}:{})});
      height=item.kind==='section'?30:item.kind==='group'?item.height:item.size[1];
    }
    if(ignored||!visible&&p.hiddenSlots==='collapse')height=0;
    return Object.freeze({source,children,item,height,visible,enabled,ignored});
  };
  const visitArray=(input:unknown,ancestor:{ignored:boolean;visible:boolean;enabled:boolean},depth:number):readonly SourceTreeNode[]=>{
    if(!Array.isArray(input)||input.length>512)throw new RangeError('Source navigation requires bounded complete node arrays.');
    const descriptors=Object.getOwnPropertyDescriptors(input);
    for(const descriptor of Object.values(descriptors))if(!('value'in descriptor))throw new TypeError('Source node arrays must not contain accessors.');
    return Object.freeze(Array.from({length:input.length},(_,at)=>{if(!Object.hasOwn(input,at))throw new TypeError('Source node arrays must be dense.');return visit(descriptors[String(at)]!.value,ancestor,depth);}));
  };
  const nodes=visitArray(p.nodes,{ignored:false,visible:true,enabled:true},0),model=snapshot({...p,items:leaves}),height=nodes.reduce((total,node)=>total+node.height,0);
  if(height*model.scale>8192||model.width*model.scale*height*model.scale>16777216)throw new RangeError('Source navigation tree exceeds its finite layout budget.');
  return {model,nodes};
}
/** Private, pure geometry view of the same validated sourceTree used by React.
 * Coordinates remain logical; no DOM/font/paint quantization or child callbacks.
 * Inactive records are retained with zero allocation rather than invented sizes. */
export function planSourceSettingsNavigation(props:SourceSettingsNavigationProps):SourceSettingsNavigationPlan {
  const {model,nodes}=sourceTree(props),entries:SourceSettingsNavigationPlanEntry[]=[];
  const visit=(siblings:readonly SourceTreeNode[],y:number):number=>{
    let cursor=y;
    for(const node of siblings){
      const item=node.item,width=item?.kind==='spacer'&&item.size[0]!=='100%'?item.size[0]:model.width;
      entries.push(Object.freeze({id:node.source.id,sourceControl:node.source.sourceControl,kind:node.source.kind,
        box:Object.freeze([0,cursor,width,node.height])as readonly[number,number,number,number],
        ignored:node.ignored,visible:node.visible,enabled:node.enabled&&!model.disabled}));
      if(node.source.kind==='source-stack')visit(node.children,cursor);
      cursor+=node.height;
    }
    return cursor;
  };
  const height=visit(nodes,0);
  return Object.freeze({width:model.width,scale:model.scale,height,entries:Object.freeze(entries)});
}
const SourceWrapper=forwardRef<HTMLDivElement,{node:SourceTreeNode;model:Snapshot;children:ReactNode}>(function SourceWrapper({node,model,children},ref){
  const[,attach]=useClassicNodeRef(ref),s=model.scale;
  const inert=!node.visible||!node.enabled||!!model.disabled;
  const inertProps={inert:inert?Number.parseInt(reactVersion,10)<19?'':true:undefined}as Record<string,string|boolean|undefined>;
  return <div {...inertProps} ref={attach} data-source-control={node.source.sourceControl} data-source-settings-node={node.source.id}
    data-source-settings-slot={node.source.kind==='source-slot'?'true':undefined} data-source-visible={node.source.visible} data-source-enabled={node.source.enabled}
    data-effective-visible={node.visible} data-effective-enabled={node.enabled} aria-hidden={!node.visible||undefined} aria-disabled={!node.enabled||model.disabled||undefined}
    hidden={!node.visible&&model.hiddenSlots==='collapse'} style={{position:'relative',display:'flex',flexDirection:'column',flex:'none',minWidth:0,width:model.width*s,height:node.height*s,visibility:node.visible?undefined:'hidden'}}>{children}</div>;
});

/** Private source-preserving composition; never added to the public barrel.
 * Slots are host-owned and must additionally pass explicit current capabilities
 * into their children. Native inert is not a synthetic-callback security gate. */
export const SourceSettingsNavigation=forwardRef<HTMLDivElement,SourceSettingsNavigationProps>(function SourceSettingsNavigation(props,ref){
  const{model,nodes}=sourceTree(props),{label,inert,hidden,className,style,onKeyDown,onBlur,itemRefs,nodeRefs,...rest}=props;
  const native={...rest}as Record<string,unknown>;
  for(const key of ['width','scale','font','items','nodes','nodeRefs','value','sourceDefaultIndex','toggleOnHover','hoverPolicy','hiddenSlots','disabled','onValueChange','children','dangerouslySetInnerHTML','defaultValue'])delete native[key];
  const[,attach]=useClassicNodeRef(ref),[focused,setFocused]=useState<string|null>(null);
  const eligible=model.items.filter((item):item is SettingsNavigationSection=>item.kind==='section'&&!item.ignored&&item.visible&&item.enabled&&!model.disabled);
  const tabStop=eligible.find(item=>item.id===focused)?.id??eligible.find(item=>item.id===model.value)?.id??eligible[0]?.id;
  const inertProps={inert:inert?Number.parseInt(reactVersion,10)<19?'':true:undefined}as Record<string,string|boolean|undefined>;
  const frame={width:model.width*model.scale,fontFamily:model.font.family,fontSize:model.font.size*model.scale,lineHeight:`${model.font.lineHeight*model.scale}px`,'--mc-settings-navigation-u':`${model.scale}px`}as CSSProperties;
  const renderNode=(node:SourceTreeNode):ReactNode=>{
    if(node.ignored)return null;
    const source=node.source,item=node.item;
    if(source.kind==='source-stack'||source.kind==='source-slot')return <SourceWrapper key={source.id} node={node} model={model} ref={nodeRefs&&Object.hasOwn(nodeRefs,source.id)?nodeRefs[source.id]:undefined}>{source.kind==='source-slot'?source.content:node.children.map(renderNode)}</SourceWrapper>;
    if(item?.kind==='section')return <Section key={item.id} item={item} model={model} ref={itemRefs&&Object.hasOwn(itemRefs,item.id)?itemRefs[item.id]:undefined} tabStop={item.id===tabStop} onFocused={setFocused} glyphContent={source.kind==='section'?source.glyphContent:undefined} sourceLabelMaxInset={source.kind==='section'?source.sourceLabelMaxInset:undefined}/>;
    if(!item)return null;
    const itemStyle:CSSProperties={visibility:node.visible?undefined:'hidden',height:node.height*model.scale,width:item.kind==='spacer'&&item.size[0]!=='100%'?item.size[0]*model.scale:model.width*model.scale};
    return <div key={source.id} data-source-control={source.sourceControl} data-source-enabled={source.enabled} data-settings-navigation-id={source.id}
      hidden={!node.visible&&model.hiddenSlots==='collapse'} aria-hidden={item.kind==='spacer'||!node.visible||undefined} className={'mc-settings-navigation-'+item.kind} style={itemStyle}>{item.kind==='group'&&<span>{item.label}</span>}</div>;
  };
  return <div {...native} {...inertProps} ref={attach} hidden={hidden} className={cx('mc-settings-navigation',className)} role={props.role??'radiogroup'} aria-label={props['aria-label']??label} aria-orientation="vertical" aria-disabled={model.disabled||props['aria-disabled']}
    data-source-group="navigation_tab" data-source-default-index={model.sourceDefaultIndex} data-source-toggle-on-hover={model.toggleOnHover} data-hover-policy={model.hoverPolicy} data-hidden-slots={model.hiddenSlots} data-native-certified="false" data-source-settings-tree="true" style={{...style,...frame}}
    onBlur={event=>{onBlur?.(event);if(!event.currentTarget.contains(event.relatedTarget))setFocused(null);}} onKeyDown={event=>navigationKeyDown(event,onKeyDown,true)}>{nodes.map(renderNode)}</div>;
});
