import { forwardRef, useId, useRef } from 'react';
import type { CSSProperties, HTMLAttributes, KeyboardEvent, Ref, SyntheticEvent } from 'react';
import { Image } from './image';
import { chatAssets } from './chat-assets';
import { snapshotChatDraft, snapshotChatScreen, validateChatRef } from './chat-data';
import { ChatComposerCore, planChatComposer } from './chat-composer';
import type { ChatComposerRawRequest, ChatComposerControlHandle } from './chat-composer';
import { ChatTranscript, planChatTranscript } from './chat-transcript';
import { ChatCompletionList, planChatCompletionList } from './chat-completion';
import type { ChatCompletionRequest } from './chat-completion';
import { ChatCoordinatesToolbar, planChatCoordinatesToolbar } from './chat-coordinates';
import type { ChatCoordinateDropdownHandle, ChatCoordinateSelectionRequest } from './chat-coordinates';
import { ChatSettingsPanel, snapshotChatSettingsPanel } from './chat-settings';
import type { ChatSettingsDropdownHandle } from './chat-settings';
import { ChatHostOptionsPanel, planChatHostOptions } from './chat-host';
import type { ChatHostEntryMetadata, ChatHostRequest, ChatHostSelectionRequest } from './chat-host';
import { ChatHeader, ChatNewMessages, ChatToast, planChatHeader, planChatNewMessages, planChatToast } from './chat-chrome';
import { classicModalTab, deferClassicRequest, scheduleClassicTask, useClassicLayoutEffect, useClassicModal, useClassicNodeRef } from './classic-screen-lifecycle';
import type { ChatActionDetail, ChatActionTarget, ChatComposerHandle, ChatComposerSnapshot, ChatControllerCommand, ChatControllerHandle,
  ChatDraft, ChatHostCollection, ChatHostEntry, ChatHostPlayer, ChatScreenProps, ChatScreenSnapshot, ChatSettingChange } from './chat-types';

type Native = Omit<HTMLAttributes<HTMLElement>, 'children' | 'dangerouslySetInnerHTML' | 'onChange' | 'defaultValue'>;
type Event = SyntheticEvent<HTMLElement>;
type Request = { readonly target: ChatActionTarget; readonly control: HTMLElement; readonly event?: Event;
  readonly origin?: ChatActionDetail['origin']; readonly fromButtonId?: ChatControllerCommand['fromButtonId']; readonly rawDraft?: ChatDraft;
  readonly suggestion?: ChatActionDetail['suggestion']; readonly hostEntry?: ChatHostEntryMetadata; readonly focusRequired?: boolean; readonly valid?: () => boolean; readonly accept?: () => void };
const noop = () => {};
const selectInputs = new Set<ChatControllerCommand['fromButtonId']>(['button.menu_select', 'button.menu_ok']);
const editorInputs = new Set<ChatControllerCommand['fromButtonId']>(['button.menu_select','button.menu_ok','button.menu_cancel','button.menu_clear',
  'button.menu_autocomplete','button.menu_autocomplete_back','button.menu_textedit_up','button.menu_textedit_down','button.controller_select',
  'button.controller_start','button.controller_autocomplete','button.controller_autocomplete_back','button.controller_textedit_up','button.controller_textedit_down','button.controller_secondary_select']);
const mutating = new Set<ChatActionTarget>(['button.send','button.chat_autocomplete','button.chat_autocomplete_back','button.chat_previous_message',
  'button.chat_next_message','button.click_autocomplete','button.chat_paste_coordinates','copy_coordinates_button','paste_button','button.reset_chat_settings',
  'button.menu_navigation','button.sub_command','button.teleport_clear','button.host_main','button.text_edit_box_clear']);
const ownProps = ['runKey','open','disabled','readOnly','messages','maxChildren','overflowPolicy','suggestions','suggestionGridDimensions','coordinates','settings','host',
  'bindings','capabilities','profile','history','renderText','inputProps','onAction','onSettingChange','onCoordinateChange','onHostSelectionChange','onCloseRequested',
  'toast','controllerRef','composerRef','inputRef','messageViewportRef','mode','draft','defaultDraft','onDraftChange','historyPolicy','children','dangerouslySetInnerHTML'];

function rootNative(props: ChatScreenProps, s: ChatScreenSnapshot): Native {
  const native = { ...props } as Record<string, unknown>;
  for (const name of ownProps) delete native[name];
  if (native.hidden !== undefined && typeof native.hidden !== 'boolean') throw new TypeError('ChatScreen hidden must be boolean');
  if (native.className !== undefined && typeof native.className !== 'string') throw new TypeError('ChatScreen className must be a string');
  for (const [key, value] of Object.entries(native)) if (/^on[A-Z]/.test(key) && value !== undefined && typeof value !== 'function') throw new TypeError(`ChatScreen ${key} must be a function`);
  if (native.role !== undefined && native.role !== 'dialog') throw new TypeError('ChatScreen owns its dialog role');
  if (native['aria-modal'] !== undefined && native['aria-modal'] !== true && native['aria-modal'] !== 'true') throw new TypeError('ChatScreen owns aria-modal');
  const style = native.style;
  if (style !== undefined) {
    if (!style || typeof style !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(style))) throw new TypeError('ChatScreen style must be a CSS data record');
    for (const key of Reflect.ownKeys(style)) {
      const field = Object.getOwnPropertyDescriptor(style, key);
      if (typeof key !== 'string' || ['__proto__','constructor','prototype'].includes(key) || !field?.enumerable || !('value' in field)
        || !(field.value === undefined || typeof field.value === 'string' || typeof field.value === 'number' && Number.isFinite(field.value))) throw new TypeError('ChatScreen requires finite CSS data fields');
      if (key.startsWith('--mc-chat-') || ['width','height','minWidth','minHeight','padding','border','margin','overflow','position','display'].includes(key)) throw new TypeError(`ChatScreen owns style.${key}; position its parent instead`);
    }
    native.style = Object.freeze({ ...style });
  }
  if (!(s.profile.availableSize[0] > 0 && s.profile.availableSize[1] > 50)) throw new RangeError('ChatScreen finite Web viewport requires W>0 and H>50');
  return Object.freeze(native) as Native;
}
function composerSnapshot(s: ChatScreenSnapshot): ChatComposerSnapshot {
  return Object.freeze({ runKey:s.runKey, cheatsOn:s.host.cheatsOn, disabled:s.disabled, readOnly:s.readOnly, bindings:s.bindings,
    capabilities:s.capabilities, profile:s.profile, draftMode:s.draftMode, history:s.history, inputProps:s.inputProps,
    refs:{ inputRef:s.refs.inputRef, composerRef:s.refs.composerRef }, callbacks:{ onAction:noop, onDraftChange:s.callbacks.onDraftChange, renderText:s.callbacks.renderText } });
}
/** Every sibling is validated before React enters any glyph/item callback. */
function preflight(s: ChatScreenSnapshot) {
  const common = { profile:s.profile, disabled:s.disabled, readOnly:s.readOnly, renderText:s.callbacks.renderText };
  planChatComposer(composerSnapshot(s));
  planChatTranscript({ runKey:s.runKey, messages:s.messages, bindings:s.bindings, profile:s.profile, maxChildren:100, overflowPolicy:s.overflowPolicy, renderText:s.callbacks.renderText, viewportRef:s.refs.messageViewportRef });
  planChatCompletionList({ ...common, suggestions:s.suggestions, dimensions:s.suggestionGridDimensions, onRequest:noop });
  planChatCoordinatesToolbar({ ...common, runKey:s.runKey, coordinates:s.coordinates, bindings:s.bindings, onRequest:noop, onCoordinateRequest:noop });
  snapshotChatSettingsPanel({ ...common, runKey:s.runKey, settings:s.settings, capabilities:s.capabilities, onRequest:noop, onSettingRequest:noop });
  planChatHostOptions({ ...common, host:s.host, capabilities:s.capabilities, onRequest:noop, onHostSelectionChange:noop });
  planChatHeader({ ...common, bindings:s.bindings, capabilities:s.capabilities, onRequest:noop });
  planChatNewMessages({ ...common, visible:s.bindings.hasNewMessages, onRequest:noop });
  planChatToast({ profile:s.profile, toast:s.toast, renderText:s.callbacks.renderText });
}
function hostGrid(s: ChatScreenSnapshot, collection: ChatHostCollection) {
  switch (collection) {
    case 'host_main_collection': return { grid:s.host.main, visible:s.host.mainVisible };
    case 'host_teleport_collection': return { grid:s.host.teleport, visible:s.host.teleportMainVisible };
    case 'host_time_collection': return { grid:s.host.time, visible:s.host.timeVisible };
    case 'host_weather_collection': return { grid:s.host.weather, visible:s.host.weatherVisible };
    case 'players_collection': return { grid:s.host.players, visible:s.host.teleportPlayersVisible };
  }
}
function effectiveSubCommand(collection:ChatHostCollection,entry:ChatHostEntry):unknown {
  return collection==='players_collection'?(entry as ChatHostPlayer).gamertag:entry.subCommand;
}
function settingState(s: ChatScreenSnapshot, change: ChatSettingChange, typeface: boolean) {
  const state=s.settings;
  if (change.kind==='boolean') return { value:change.field==='hide_chat'?state.hideChat:change.field==='toggle_emote_chat'?state.muteEmotes:state.tts,
    enabled:change.field==='toggle_emote_chat'?!s.capabilities.educationEdition:change.field==='toggle_tts'?!state.hideChat:true };
  if (change.kind==='typeface') return { value:change.field==='typeface_radio_mojangles'?state.mojangles.selected:state.notoSans.selected, enabled:typeface&&state.typefaceEnabled };
  if (change.kind==='slider') { const slider=change.field==='chat_font_size'?state.fontSize:state.lineSpacing; return {value:slider.value,enabled:slider.enabled&&(change.field!=='chat_font_size'||typeface)}; }
  const color=(change.field==='chat'?state.chatColors:state.mentionsColors)[change.index];
  return {value:color.selected,enabled:change.field==='chat'?state.chatColorEnabled:state.mentionsColorEnabled};
}
function plainCommand(value: ChatControllerCommand): ChatControllerCommand {
  function data(input: unknown) {
    if (!input || typeof input!=='object' || ![Object.prototype,null].includes(Object.getPrototypeOf(input))) throw new TypeError('Chat controller requires plain data');
    const result:Record<string,unknown>=Object.create(null);
    for (const key of Reflect.ownKeys(input)) { const p=Object.getOwnPropertyDescriptor(input,key); if(typeof key!=='string'||['__proto__','prototype','constructor'].includes(key)||!p?.enumerable||!('value'in p))throw new TypeError('Chat controller requires own data fields'); result[key]=p.value; }
    return result;
  }
  const v=data(value),from=v.fromButtonId;
  if(typeof from!=='string'||!new Set([...editorInputs,'button.menu_exit']).has(from as ChatControllerCommand['fromButtonId']))throw new TypeError('Unknown Chat controller input');
  const to=v.destination;
  if(typeof to==='string') {
    if(!['screen','editor','send','keyboard','settings','settings-close','settings-reset','new-messages','copy-coordinates','paste','host-toggle','host-return'].includes(to))throw new TypeError('Unknown Chat controller destination');
    return Object.freeze({fromButtonId:from,destination:to}) as ChatControllerCommand;
  }
  const d=data(to),kind=d.kind;
  if(kind==='suggestion'||kind==='host') { if(typeof d.id!=='string'||!d.id.trim()||d.id.length>256)throw new TypeError('Chat controller requires a bounded id'); }
  if(kind==='host'&&!['host_main_collection','host_teleport_collection','host_time_collection','host_weather_collection','players_collection'].includes(d.collection as string))throw new TypeError('Unknown Chat host collection');
  if(kind==='coordinate-choice'&&!['position','facing'].includes(d.field as string)||kind==='setting'&&!['hide_chat','toggle_emote_chat','toggle_tts','typeface_radio_mojangles','typeface_radio_notoSans','chat_font_size','chat_line_spacing'].includes(d.field as string)
    ||kind==='color-choice'&&(!['chat','mentions'].includes(d.field as string)||!Number.isSafeInteger(d.index)||Number(d.index)<0||Number(d.index)>6)
    ||!['suggestion','host','coordinate-choice','setting','color-choice'].includes(kind as string))throw new TypeError('Unknown Chat controller structured destination');
  return Object.freeze({fromButtonId:from,destination:Object.freeze(d)}) as unknown as ChatControllerCommand;
}

function Session({ snapshot:s, native, forwardedRef }: { snapshot:ChatScreenSnapshot; native:Native; forwardedRef:Ref<HTMLElement> }) {
  const [root,attachRoot]=useClassicNodeRef(forwardedRef),[input,attachInput]=useClassicNodeRef(s.refs.inputRef),[composer,attachComposer]=useClassicNodeRef(s.refs.composerRef),
    [viewport,attachViewport]=useClassicNodeRef(s.refs.messageViewportRef),[,attachController]=useClassicNodeRef(s.refs.controllerRef);
  const content=useRef<HTMLDivElement>(null),settingsBoundary=useRef<HTMLDivElement>(null),settingsCenter=useRef<HTMLDivElement>(null),settingsPanel=useRef<HTMLDivElement>(null);
  const coordinateDropdown=useRef<ChatCoordinateDropdownHandle>(null),settingsDropdown=useRef<ChatSettingsDropdownHandle>(null);
  const composerControls=useRef<ChatComposerControlHandle>(null);
  const current=useRef<{s:ChatScreenSnapshot;hidden:boolean}|null>(null),once=useRef<{id:string;typeface:boolean}|null>(null),composing=useRef(false);
  useClassicLayoutEffect(()=>{ current.current={s,hidden:!!native.hidden}; const id=s.settings.popup?.instanceId; if(id===undefined)once.current=null;else if(once.current?.id!==id)once.current={id,typeface:s.settings.typefaceVisibleAtInstanceCreation}; });
  useClassicLayoutEffect(()=>()=>{current.current=null;once.current=null;},[]);
  const visible=s.open&&!native.hidden,hasSettings=s.settings.popup!==null;
  useClassicModal(root,root,visible,s.runKey);
  useClassicModal(settingsBoundary,settingsCenter,visible&&hasSettings,s.settings.popup?.instanceId);
  const wasOpen=useRef(false);
  // Source text_edit_box default_focus_precedence=1. Resolve that precedence
  // once after modal ownership records the outside opener; retain the whole
  // screen as the Tab/focus boundary. Native focus still uses the Core request
  // bridge, including late veto, rather than fabricating a selected action.
  useClassicLayoutEffect(()=>{
    const opening=s.open&&!wasOpen.current;wasOpen.current=s.open;
    const control=input.current,boundary=root.current;
    if(opening&&visible&&s.settings.popup===null&&!s.disabled&&s.bindings.editorEnabled&&control?.isConnected&&boundary?.isConnected&&boundary.ownerDocument===control.ownerDocument&&boundary.contains(control)&&!control.disabled&&!control.closest('[hidden],[inert]'))control.focus({preventScroll:true});
  });
  const live=()=>current.current?.s??null;
  const active=(control:HTMLElement)=>{
    const state=current.current,boundary=root.current;
    return !!state&&state.s.open&&!state.hidden&&!state.s.disabled&&!!boundary?.isConnected&&control.isConnected
      &&boundary.ownerDocument===control.ownerDocument&&boundary.contains(control)&&!boundary.closest('[hidden],[inert]')&&!control.closest('[hidden],[inert]')&&!control.matches(':disabled');
  };
  const inSettings=(control:HTMLElement)=>!!settingsPanel.current?.contains(control);
  const scopeValid=(captured:ChatScreenSnapshot,control:HTMLElement)=>{
    const now=live();return !!now&&now.runKey===captured.runKey&&now.draftMode.mode===captured.draftMode.mode&&active(control)
      &&(now.settings.popup!==null?inSettings(control)||control===root.current:!inSettings(control));
  };
  const getDraft=()=>snapshotChatDraft(composer.current?.getDraft()??(live()?.draftMode.draft??{text:s.draftMode.defaultDraft??'',selectionStart:0,selectionEnd:0,direction:'none',revision:s.runKey+':unmounted'}));
  const allowed=(target:ChatActionTarget,control:HTMLElement)=>{
    const now=live();if(!now||!active(control)||now.readOnly&&mutating.has(target))return false;
    if(now.settings.popup!==null&&target!=='button.close_chat_settings'&&target!=='button.reset_chat_settings')return false;
    if(target==='button.close_chat_settings')return now.settings.popup!==null;
    if(target==='button.reset_chat_settings')return now.settings.popup!==null;
    if(target==='button.send')return now.bindings.sendEnabled;
    if(target==='button.keyboard_toggle')return now.bindings.keyboardButtonVisible;
    if(target==='button.host_toggle')return now.host.cheatsOn&&!now.capabilities.isPregame;
    if(target==='button.new_messages')return now.bindings.hasNewMessages;
    if(target==='copy_coordinates_button')return now.coordinates.visible&&now.coordinates.copyEnabled;
    if(target==='paste_button')return now.coordinates.visible;
    if(target==='button.host_main')return now.host.teleportMainVisible||now.host.timeVisible||now.host.weatherVisible;
    return true;
  };
  const queueAction=(request:Request):boolean=>{
    const captured=live(),control=request.control;
    if(!captured||!scopeValid(captured,control)||!allowed(request.target,control)||request.focusRequired&&control.ownerDocument.activeElement!==control||composing.current&&mutating.has(request.target)||request.event?.defaultPrevented||request.event?.nativeEvent.defaultPrevented||request.valid&&!request.valid())return false;
    const rawDraft=snapshotChatDraft(request.rawDraft??getDraft()),coordinatesText=captured.coordinates.text;
    const suggestion=request.suggestion?Object.freeze({...request.suggestion}):undefined,hostEntry=request.hostEntry?Object.freeze({...request.hostEntry}):undefined;
    const popup=captured.settings.popup?.instanceId;
    const valid=()=>scopeValid(captured,control)&&allowed(request.target,control)&&(!request.focusRequired||control.ownerDocument.activeElement===control)&&!(composing.current&&mutating.has(request.target))&&(!request.valid||request.valid())
      &&(request.target!=='button.close_chat_settings'&&request.target!=='button.reset_chat_settings'||live()?.settings.popup?.instanceId===popup);
    let accepted=false;
    const run=(event?:Event)=>{
      if(accepted||!valid())return;
      const now=live()!;
      const detail:ChatActionDetail=Object.freeze({target:request.target,origin:request.origin??'control',control,...(event?{event}:{}),runKey:captured.runKey,rawDraft,coordinatesText,
        ...(request.fromButtonId?{fromButtonId:request.fromButtonId}:{}),...(suggestion?{suggestion}:{}),...(hostEntry?{hostEntry}:{})});
      if(now.callbacks.onAction(detail)===false||event?.defaultPrevented||event?.nativeEvent.defaultPrevented||!valid())return;
      accepted=true;request.accept?.();
      if(!valid())return;
      if(request.target==='button.chat_menu_cancel')live()!.callbacks.onCloseRequested(Object.freeze({reason:'chat-menu-cancel',action:detail}));
      if(request.target==='button.new_messages'&&viewport.current?.isConnected)viewport.current.scrollTop=viewport.current.scrollHeight;
    };
    if(request.event)deferClassicRequest(request.event,control,event=>run(event),valid);else scheduleClassicTask(control,()=>run());
    return true;
  };
  const coreRequest=(raw:ChatComposerRawRequest)=>queueAction({...raw.detail,control:raw.control,event:raw.event,valid:raw.valid,accept:raw.accept});
  const queueState=(control:HTMLElement,event:Event|undefined,valid:()=>boolean,run:(state:ChatScreenSnapshot)=>void):boolean=>{
    const writable=()=>control.tagName!=='INPUT'||!(control as HTMLInputElement).readOnly;
    const focusValid=()=>!!event||control.ownerDocument.activeElement===control;
    const captured=live();if(!captured||!scopeValid(captured,control)||captured.readOnly||!writable()||!focusValid()||!valid()||event?.defaultPrevented||event?.nativeEvent.defaultPrevented)return false;
    let done=false;const activeState=()=>scopeValid(captured,control)&&!live()!.readOnly&&writable()&&focusValid()&&valid();
    const apply=()=>{if(done||!activeState())return;done=true;run(live()!);};
    if(event)deferClassicRequest(event,control,apply,activeState);else scheduleClassicTask(control,apply);return true;
  };
  const settingRequest=(change:ChatSettingChange,control:HTMLInputElement,event?:Event)=>{
    const captured=live();if(!captured?.settings.popup||!inSettings(control)||control.dataset.chatSettingsField!==change.field)return false;
    const copied=Object.freeze({...change}) as ChatSettingChange,popup=captured.settings.popup.instanceId,initial=settingState(captured,copied,!!once.current?.typeface);
    return queueState(control,event,()=>{const now=live();if(!now||now.settings.popup?.instanceId!==popup||!inSettings(control)||control.dataset.chatSettingsField!==copied.field||copied.kind==='color'&&control.dataset.chatSettingsChoice!==String(copied.index))return false;const latest=settingState(now,copied,!!once.current?.typeface);return initial.enabled&&latest.enabled&&Object.is(initial.value,latest.value);},now=>now.callbacks.onSettingChange(copied));
  };
  const coordinateRequest=(r:Omit<ChatCoordinateSelectionRequest,'event'>&{event?:Event})=>{
    const captured=live();if(!captured)return false;const initial=r.field==='coordinate_type_position'?captured.coordinates.positionSelected:captured.coordinates.facingSelected;
    return queueState(r.control,r.event,()=>{const now=live();return !!now&&now.settings.popup===null&&now.coordinates.visible&&r.control.dataset.chatCoordinateField===r.field&&!!r.control.closest('.mc-chat-coordinates')&&(r.field==='coordinate_type_position'?now.coordinates.positionSelected:now.coordinates.facingSelected)===initial;},now=>now.callbacks.onCoordinateChange(r.field,r.value));
  };
  const entryValid=(entry:ChatHostEntryMetadata,target?:ChatActionTarget)=>{
    const now=live();if(!now)return false;const set=hostGrid(now,entry.collection),item=set.grid.entries[entry.index];
    if(!set.visible||!item||item.id!==entry.id||item.navigation!==entry.navigation||effectiveSubCommand(entry.collection,item)!==entry.subCommand)return false;
    if(target==='button.menu_navigation')return entry.collection==='host_main_collection';
    if(target==='button.teleport_clear')return entry.collection==='host_teleport_collection'&&!item.teleportVisible;
    if(target==='button.sub_command')return entry.collection!=='host_main_collection'&&!(entry.collection==='host_teleport_collection'&&item.teleportVisible);
    return true;
  };
  const hostControl=(control:HTMLElement,entry:ChatHostEntryMetadata)=>control.dataset.chatHostCollection===entry.collection&&control.dataset.chatHostId===entry.id&&control.dataset.chatHostIndex===String(entry.index)&&!!control.closest('[data-source-collection]');
  const hostRequest=(r:ChatHostRequest)=>queueAction({...r,valid:()=>!r.hostEntry||hostControl(r.control,r.hostEntry)&&entryValid(r.hostEntry,r.target)});
  const hostSelection=(r:Omit<ChatHostSelectionRequest,'event'>&{event?:Event})=>{
    const captured=live(),initial=captured?.host.teleport.entries[r.index];if(!initial)return false;
    return queueState(r.control,r.event,()=>{const now=live(),item=now?.host.teleport.entries[r.index];return hostControl(r.control,r.hostEntry)&&entryValid(r.hostEntry)&&!!item&&item.teleportVisible&&item.toggleSelected===initial.toggleSelected;},now=>now.callbacks.onHostSelectionChange(Object.freeze({collection:r.collection,id:r.id,selected:r.selected})));
  };
  const completionRequest=(r:Omit<ChatCompletionRequest,'event'>&{event?:Event;origin?:ChatActionDetail['origin'];fromButtonId?:ChatControllerCommand['fromButtonId']})=>{
    const captured=live(),item=captured?.suggestions[r.suggestion.index];if(!item)return false;
    return queueAction({...r,focusRequired:r.origin==='host-controller',valid:()=>{const now=live(),latest=now?.suggestions[r.suggestion.index];if(!r.control.closest('.mc-chat-completion')||r.control.dataset.suggestionId!==item.id||!latest||!latest.isSuggestion||latest.id!==item.id||latest.text!==item.text||latest.itemIdAux!==item.itemIdAux||latest.itemVisual.kind!==item.itemVisual.kind)return false;
      return latest.itemVisual.kind==='none'||latest.itemVisual.kind==='host-item-renderer'&&item.itemVisual.kind==='host-item-renderer'&&latest.itemVisual.render===item.itemVisual.render
        ||latest.itemVisual.kind==='whole-image'&&item.itemVisual.kind==='whole-image'&&latest.itemVisual.image.src===item.itemVisual.image.src&&latest.itemVisual.image.naturalSize[0]===item.itemVisual.image.naturalSize[0]&&latest.itemVisual.image.naturalSize[1]===item.itemVisual.image.naturalSize[1];}});
  };
  const escape=(event?:Event,fromButtonId:ChatControllerCommand['fromButtonId']='button.menu_exit')=>{
    const now=live(),owner=root.current;if(!now||!owner||!active(owner))return false;
    if(now.settings.popup!==null){if(settingsDropdown.current?.isOpen())return settingsDropdown.current.dismiss(event);return queueAction({target:'button.close_chat_settings',control:settingsPanel.current??owner,event,origin:event?'keyboard':'host-controller',fromButtonId});}
    if(coordinateDropdown.current?.isOpen())return coordinateDropdown.current.dismiss(event);
    return queueAction({target:'button.chat_menu_cancel',control:owner,event,origin:event?'keyboard':'host-controller',fromButtonId});
  };
  const find=(selector:string,within:HTMLElement|null=root.current)=>within?.querySelector<HTMLElement>(selector)??null;
  const focused=(control:HTMLElement)=>control.ownerDocument.activeElement===control;
  const requestController=(raw:ChatControllerCommand):boolean=>{
    const command=plainCommand(raw),now=live(),boundary=root.current;if(!now||!boundary||!active(boundary)||composing.current)return false;
    const from=command.fromButtonId,to=command.destination;
    if(to==='editor')return now.settings.popup===null&&editorInputs.has(from)&&!!composer.current?.request({fromButtonId:from as Parameters<ChatComposerHandle['request']>[0]['fromButtonId']});
    if(to==='screen') {
      if(from==='button.menu_exit'||from==='button.menu_cancel')return escape(undefined,from);
      if(from==='button.controller_select'||from==='button.controller_start'||from==='button.controller_secondary_select'||from==='button.menu_autocomplete'||from==='button.menu_autocomplete_back'||from==='button.controller_autocomplete'||from==='button.controller_autocomplete_back')return now.settings.popup===null&&!!composer.current?.request({fromButtonId:from});
      return false;
    }
    const button=(target:ChatActionTarget,selector:string,extraValid?:()=>boolean)=>{const control=Array.from(boundary.querySelectorAll<HTMLElement>(selector)).find(focused);if(!control||!selectInputs.has(from))return false;return queueAction({target,control,origin:'host-controller',fromButtonId:from,focusRequired:true,valid:()=>Array.from(boundary.querySelectorAll(selector)).includes(control)&&(!extraValid||extraValid())});};
    if(typeof to==='string') {
      if(to==='settings-close'&&(from==='button.menu_exit'||from==='button.menu_cancel'))return now.settings.popup!==null&&escape(undefined,from);
      if(to==='send'&&(from==='button.controller_select'||from==='button.controller_start'))return now.settings.popup===null&&!!composer.current?.request({fromButtonId:from});
      if(to==='send'||to==='keyboard'||to==='settings'||to==='host-toggle') {
        if(now.settings.popup!==null||from!=='button.menu_select'&&from!=='button.menu_ok')return false;
        const target=to==='send'?'button.send':to==='keyboard'?'button.keyboard_toggle':to==='settings'?'button.open_chat_settings':'button.host_toggle';
        return composerControls.current?.request(target,from)??false;
      }
      const controls:Partial<Record<typeof to,readonly[ChatActionTarget,string]>>={'settings-close':['button.close_chat_settings','[data-chat-settings-action="button.close_chat_settings"]'],'settings-reset':['button.reset_chat_settings','[data-chat-settings-action="button.reset_chat_settings"]'],
        'new-messages':['button.new_messages','[data-source-target="button.new_messages"]'],'copy-coordinates':['copy_coordinates_button','[data-source-target="copy_coordinates_button"]'],paste:['paste_button','[data-source-target="paste_button"]'],
        'host-return':['button.host_main','[data-source-action="button.host_main"]']};
      const item=controls[to];return !!item&&button(item[0],item[1]);
    }
    if(!selectInputs.has(from))return false;
    if(to.kind==='suggestion') { const index=now.suggestions.findIndex(item=>item.id===to.id),item=now.suggestions[index],control=Array.from(boundary.querySelectorAll<HTMLButtonElement>('[data-source-target="button.click_autocomplete"]')).find(node=>node.dataset.suggestionId===to.id);return !!item&&!!control&&focused(control)&&completionRequest({target:'button.click_autocomplete',control,origin:'host-controller',fromButtonId:from,suggestion:{id:item.id,index,itemIdAux:item.itemIdAux}}); }
    if(to.kind==='coordinate-choice') {const field=to.field==='position'?'coordinate_type_position':'coordinate_type_facing',control=find(`[data-chat-coordinate-field="${field}"]`);return !!control&&focused(control)&&coordinateDropdown.current?.isOpen()===true&&coordinateRequest({field,value:to.field==='position'?!now.coordinates.positionSelected:!now.coordinates.facingSelected,control:control as HTMLInputElement});}
    if(to.kind==='setting'||to.kind==='color-choice') {
      const control=find(`[data-chat-settings-field="${to.field}"]${to.kind==='color-choice'?`[data-chat-settings-choice="${to.index}"]`:''}`,settingsPanel.current) as HTMLInputElement|null;if(!control||!focused(control))return false;
      if(to.kind==='color-choice')return settingRequest({kind:'color',field:to.field,index:to.index,value:true},control);
      if(to.field==='chat_font_size'||to.field==='chat_line_spacing')return false; // No source value/direction supplied by select/ok.
      if(to.field==='typeface_radio_mojangles'||to.field==='typeface_radio_notoSans')return settingRequest({kind:'typeface',field:to.field,value:true},control);
      return settingRequest({kind:'boolean',field:to.field,value:to.field==='hide_chat'?!now.settings.hideChat:to.field==='toggle_emote_chat'?!now.settings.muteEmotes:!now.settings.tts},control);
    }
    const set=hostGrid(now,to.collection),index=set.grid.entries.findIndex(item=>item.id===to.id),item=set.grid.entries[index];
    const control=Array.from(boundary.querySelectorAll<HTMLElement>('[data-chat-host-collection]')).find(node=>node.dataset.chatHostCollection===to.collection&&node.dataset.chatHostId===to.id);
    if(!item||!control||!focused(control))return false;
    const hostEntry={collection:to.collection,id:item.id,index,navigation:item.navigation,subCommand:effectiveSubCommand(to.collection,item)};
    if(to.collection==='host_teleport_collection'&&item.teleportVisible)return hostSelection({collection:to.collection,id:item.id,index,selected:!item.toggleSelected,control:control as HTMLInputElement,hostEntry});
    const target:ChatActionTarget=to.collection==='host_main_collection'?'button.menu_navigation':to.collection==='host_teleport_collection'?'button.teleport_clear':'button.sub_command';
    return queueAction({target,control,origin:'host-controller',fromButtonId:from,focusRequired:true,hostEntry,valid:()=>hostControl(control,hostEntry)&&entryValid(hostEntry,target)});
  };
  const handle=useRef<ChatControllerHandle>({request:requestController,focusEditor:()=>{const state=live();return !!state&&state.settings.popup===null&&!!input.current&&active(input.current)&&!!composer.current?.focusEditor();},notifyPlayerHurt:()=>{
    // Explicit Web host-lifecycle notification, independent of input/modal
    // availability. Source close_on_player_hurt is not a fabricated button.
    const captured=live(),owner=root.current;if(!captured?.open||!owner?.isConnected)return false;
    scheduleClassicTask(owner,()=>{const now=live();if(now?.open&&root.current===owner&&owner.isConnected&&now.runKey===captured.runKey&&now.draftMode.mode===captured.draftMode.mode)now.callbacks.onCloseRequested(Object.freeze({reason:'player-hurt',sourceProperty:'close_on_player_hurt'}));});return true;
  }});
  useClassicLayoutEffect(()=>{attachController(handle.current);return()=>{attachController(null);};},[attachController]);
  const onKeyDown=(event:KeyboardEvent<HTMLElement>)=>{
    native.onKeyDown?.(event);if(event.defaultPrevented||event.nativeEvent.defaultPrevented)return;
    const now=live();if(!now||composing.current||event.nativeEvent.isComposing||event.nativeEvent.keyCode===229||event.altKey||event.ctrlKey||event.metaKey)return;
    if(event.key==='Tab'){classicModalTab(event,now.settings.popup?settingsBoundary.current:root.current,now.settings.popup?settingsCenter.current:root.current);return;}
    if(event.key==='Escape'&&!event.shiftKey&&!(event.repeat&&now.profile.inputPolicy.repeat==='ignore'))escape(event);
  };
  const cs=composerSnapshot(s),core:ChatComposerSnapshot={...cs,refs:{inputRef:attachInput,composerRef:attachComposer},callbacks:{...cs.callbacks,onDraftChange:(draft,event)=>{const now=live();if(now?.runKey===s.runKey&&input.current&&active(input.current)&&now.draftMode.mode===s.draftMode.mode)now.callbacks.onDraftChange?.(draft,event);}}};
  const common={profile:s.profile,disabled:s.disabled,readOnly:s.readOnly,renderText:s.callbacks.renderText};
  const [w,h]=s.profile.availableSize,scale=s.profile.scale,filterId=`chat-root-${useId().replace(/[^a-zA-Z0-9_-]/g,'')}`;
  const {className='',style,hidden:_hidden,onKeyDown:_onKeyDown,onCompositionStart,onCompositionEnd,...rest}=native;
  return <section {...rest} ref={attachRoot} className={`mc-chat-screen ${className}`} hidden={!visible} role="dialog" aria-modal="true" aria-label={native['aria-label']??s.bindings.title} tabIndex={native.tabIndex??-1}
    data-source-control="chat.chat_screen" data-run-key={s.runKey} data-chat-mode={s.draftMode.mode} data-native-certified="false" data-source-close-on-player-hurt="true"
    data-chat-layout={JSON.stringify({messages:[2,23,w-2,h-50],commands:[0,23,w,h-50],composer:[0,h-27,w,27],header:[0,0,w,23],coordinateAnchor:'top_middle+[0,1]',newMessages:'bottom_middle+[0,-33]',profile:s.profile.sourceGeometry})}
    style={{...style,position:'relative',display:'block',boxSizing:'border-box',width:w*scale,height:h*scale,padding:0,margin:0,border:0,overflow:'clip','--mc-chat-root-unit':`${scale}px`} as CSSProperties} onKeyDown={onKeyDown}
    onCompositionStart={event=>{onCompositionStart?.(event);if(event.target===input.current)composing.current=true;}}
    onCompositionEnd={event=>{onCompositionEnd?.(event);if(event.target===input.current)composing.current=false;}}>
    <svg width="0" height="0" className="mc-chat-screen__filter" aria-hidden="true"><defs><filter id={filterId} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"/></filter></defs></svg>
    <Image className="mc-chat-screen__background" src={s.profile.whiteMaterial.src} sourceSize={s.profile.whiteMaterial.naturalSize} size={[w,h]} scale={scale} alt="" aria-hidden="true" style={{filter:`url("#${filterId}")`,opacity:.7}}/>
    <div ref={content} className="mc-chat-screen__content">
      <div className="mc-chat-screen__messages" style={{left:2*scale,top:23*scale,width:(w-2)*scale,height:(h-50)*scale}}><ChatTranscript runKey={s.runKey} messages={s.messages} bindings={s.bindings} profile={s.profile} maxChildren={100} overflowPolicy={s.overflowPolicy} renderText={s.callbacks.renderText} viewportRef={attachViewport}/></div>
      <div className="mc-chat-screen__composer" style={{top:(h-27)*scale}}><ChatComposerCore snapshot={core} controlRequestRef={composerControls} onRawRequest={coreRequest}/></div>
      <div className="mc-chat-screen__header"><ChatHeader {...common} bindings={s.bindings} capabilities={s.capabilities} onRequest={r=>queueAction(r)?undefined:false}/></div>
      <div className="mc-chat-screen__coordinates" style={{top:scale}}><ChatCoordinatesToolbar {...common} runKey={s.runKey} coordinates={s.coordinates} bindings={s.bindings} dropdownRef={coordinateDropdown} onRequest={r=>queueAction(r)?undefined:false} onCoordinateRequest={r=>coordinateRequest(r)?undefined:false}/></div>
      <div className="mc-chat-screen__new" style={{bottom:33*scale}}><ChatNewMessages {...common} visible={s.bindings.hasNewMessages} onRequest={r=>queueAction(r)?undefined:false}/></div>
      <div className="mc-chat-screen__commands" style={{top:23*scale,width:w*scale,height:(h-50)*scale}}><ChatCompletionList {...common} suggestions={s.suggestions} dimensions={s.suggestionGridDimensions} onRequest={r=>completionRequest(r)?undefined:false}/></div>
      <ChatHostOptionsPanel {...common} host={s.host} capabilities={s.capabilities} onRequest={r=>hostRequest(r)?undefined:false} onHostSelectionChange={r=>hostSelection(r)?undefined:false}/>
      <div className="mc-chat-screen__toast"><ChatToast profile={s.profile} toast={s.toast} renderText={s.callbacks.renderText}/></div>
    </div>
    {hasSettings&&<div ref={settingsBoundary} className="mc-chat-screen__settings-layer" role="dialog" aria-modal="true" aria-label={s.profile.labels['chat.settings']} data-source-factory="chat_settings.popup_factory" data-popup-instance={s.settings.popup!.instanceId}>
      <Image className="mc-chat-screen__dim" src={chatAssets['textures/ui/screen_background'].url} sourceSize={[1,1]} size={[w,h]} scale={scale} alt="" aria-hidden="true" style={{opacity:.4}}/>
      <div ref={settingsCenter} className="mc-chat-screen__settings-center" tabIndex={-1}><ChatSettingsPanel ref={settingsPanel} {...common} runKey={s.runKey} settings={s.settings} capabilities={s.capabilities} dropdownRef={settingsDropdown}
        onRequest={(target,control,event)=>queueAction({target,control,event})?undefined:false} onSettingRequest={(change,control,event)=>settingRequest(change,control,event)?undefined:false}/></div>
    </div>}
  </section>;
}

/** Full finite data-driven composition; engine providers stay host-owned. */
export const ChatScreen=forwardRef<HTMLElement,ChatScreenProps>(function ChatScreen(props,ref){
  const snapshot=snapshotChatScreen({...props}),native=rootNative(props,snapshot);validateChatRef(ref,'ChatScreen root ref');preflight(snapshot);
  return <Session key={JSON.stringify([snapshot.runKey,snapshot.draftMode.mode])} snapshot={snapshot} native={native} forwardedRef={ref}/>;
});
