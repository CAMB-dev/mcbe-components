import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, Ref, SyntheticEvent } from 'react';
import { ClassicSkin } from './classic-skin';
import { Image } from './image';
import { chatAssets } from './chat-assets';
import { deferClassicRequest, scheduleClassicTask, useClassicLayoutEffect, useClassicNodeRef } from './classic-screen-lifecycle';
import { CHAT_EDITOR_MAPPINGS, createChatLocalHistoryState, resolveChatDraftApplication, snapshotChatComposer, snapshotChatDraft, snapshotChatEditorCommand, stepChatLocalHistory, validateChatRef } from './chat-data';
import type { ChatComposerActionDetail, ChatComposerActionTarget, ChatComposerHandle, ChatComposerProps, ChatComposerSnapshot, ChatDraft, ChatDraftApplication, ChatEditorCommand, ChatEditorInput, ChatLocalHistoryState, ChatTextRenderContext } from './chat-types';

export type { ChatComposerProps, ChatComposerHandle, ChatComposerActionDetail } from './chat-types';
export interface ChatComposerRawRequest {
  readonly detail:ChatComposerActionDetail;readonly control:HTMLElement;readonly event?:SyntheticEvent<HTMLElement>;
  readonly valid:()=>boolean;readonly accept:()=>void;
}
export type ChatComposerButtonTarget='button.send'|'button.keyboard_toggle'|'button.open_chat_settings'|'button.host_toggle';
export interface ChatComposerControlHandle {
  request(target:ChatComposerButtonTarget,fromButtonId:'button.menu_select'|'button.menu_ok'):boolean;
}
export interface ChatComposerCoreProps {
  readonly snapshot:ChatComposerSnapshot;readonly onRawRequest:(request:ChatComposerRawRequest)=>boolean;
  readonly nativeProps?:Omit<HTMLAttributes<HTMLDivElement>,'children'|'dangerouslySetInnerHTML'>;
  readonly controlRequestRef?:Ref<ChatComposerControlHandle>;
}
export interface ChatComposerPlan {
  readonly width:number;readonly height:27;readonly scale:number;readonly editorWidth:number;
  readonly keyboardVisible:boolean;readonly hostVisible:boolean;readonly hostWidth:23;readonly sendWidth:50;
  readonly labels:Readonly<Record<'keyboard'|'host'|'settings'|'send'|'editor',string>>;
  readonly trace:readonly string[];
}
/** Pure preflight for owners that must validate every sibling before rendering glyphs.
 * The snapshot has already passed the shared model validation; intrinsic widths are
 * the explicit finite Web resolution of the source's unresolved %c evaluator. */
export function planChatComposer(snapshot:ChatComposerSnapshot,nativeProps:ChatComposerCoreProps['nativeProps']={},controlRequestRef?:Ref<ChatComposerControlHandle>):ChatComposerPlan {
  const native=nativeProps as HTMLAttributes<HTMLDivElement>;
  for(const key of Reflect.ownKeys(native)){
    const d=Object.getOwnPropertyDescriptor(native,key)!;
    if(!('value'in d))throw new TypeError('Chat Composer native props must use data properties');
    if(typeof key==='string'&&key.startsWith('on')&&d.value!==undefined&&typeof d.value!=='function')throw new TypeError(`Chat Composer ${key} must be a function`);
  }
  if(native.children!==undefined||native.dangerouslySetInnerHTML!==undefined)throw new TypeError('Chat Composer Core owns its data-driven contents');
  validateChatRef(controlRequestRef,'Chat Composer private button control ref');
  validateChatRef(snapshot.refs.inputRef,'Chat Composer input ref');validateChatRef(snapshot.refs.composerRef,'Chat Composer handle ref');
  for(const key of ['onAction','onDraftChange','renderText'] as const){const value=snapshot.callbacks[key];if(value!==undefined&&typeof value!=='function')throw new TypeError(`Chat Composer ${key} must be a function`);}
  const width=snapshot.profile.availableSize[0],scale=snapshot.profile.scale,keyboardVisible=snapshot.bindings.keyboardButtonVisible,hostVisible=snapshot.cheatsOn&&!snapshot.capabilities.isPregame;
  const editorWidth=width-(keyboardVisible?27:0)-(hostVisible?23:0)-27-50;
  if(!Number.isFinite(width)||!Number.isFinite(scale)||scale<=0||!Number.isFinite(editorWidth)||editorWidth<=6)throw new RangeError('Chat Composer computed editor fill must exceed6 logical units after visible source controls');
  const labels=Object.freeze({keyboard:snapshot.profile.labels['accessibility.chat.tts.keyboard']??'accessibility.chat.tts.keyboard',host:snapshot.profile.labels['permissions.slashcommand']??'/',settings:snapshot.profile.labels['chat.settings']??'chat.settings',send:snapshot.bindings.sendAccessibilityText,editor:snapshot.inputProps?.['aria-label']??snapshot.profile.labels['accessibility.chat.tts.textboxTitle']??'accessibility.chat.tts.textboxTitle'});
  return Object.freeze({width,height:27,scale,editorWidth,keyboardVisible,hostVisible,hostWidth:23,sendWidth:50,labels,
    trace:Object.freeze(['source:chat.chat_bottom_panel height27; keyboard/settings27; send offset[-20,0]','explicit-Web:%c host17+6=23; send44+6=50; editor=available-visible-controls','native:%c intrinsic evaluator and keyboard platform adapter remain unqualified'])});
}
// Opaque Web revisions are independent of host runKey length. A scalar high
// watermark reserves every observed token in this namespace without a per-edit
// Set. Exhaustion is explicit rather than wrapping/reusing a prior revision.
const revisionPattern=/^mcchat:web:([0-9a-f]{32})$/;
const revisionLimit=(1n<<128n)-1n;
let revisionWatermark=0n;
function observeRevision(revision:string|undefined){
  const match=revision===undefined?null:revisionPattern.exec(revision);
  if(match){const value=BigInt('0x'+match[1]);if(value>revisionWatermark)revisionWatermark=value;}
}
function allocateRevision(){
  if(revisionWatermark===revisionLimit)throw new RangeError('Chat Web revision token space exhausted; it cannot wrap');
  return 'mcchat:web:'+(++revisionWatermark).toString(16).padStart(32,'0');
}
const mutating=new Set<ChatComposerActionTarget>(['button.send','button.chat_autocomplete','button.chat_autocomplete_back','button.chat_previous_message','button.chat_next_message','button.chat_paste_coordinates','button.text_edit_box_clear']);
const editorOnly=new Set<ChatComposerActionTarget>(['button.chat_autocomplete','button.chat_autocomplete_back','button.chat_previous_message','button.chat_next_message','button.chat_paste_coordinates','button.text_edit_box_selected','button.text_edit_box_deselected','button.text_edit_box_hovered','button.text_edit_box_clear']);
const focusedHistory=new Set<ChatComposerActionTarget>(['button.chat_previous_message','button.chat_next_message','button.text_edit_box_clear']);
const states=[{id:'normal',asset:'textures/ui/button_borderless_light',border:.075},{id:'hover',asset:'textures/ui/button_borderless_lighthover',border:1},
  {id:'pressed',asset:'textures/ui/button_borderless_lightpressed',border:1},{id:'locked',asset:'textures/ui/disabledButtonNoBorder',border:.075}] as const;

function Session({snapshot,onRawRequest,nativeProps={},controlRequestRef,forwardedRef}:ChatComposerCoreProps&{forwardedRef:React.ForwardedRef<HTMLDivElement>}){
  validateChatRef(forwardedRef,'Chat Composer div ref');
  if(typeof onRawRequest!=='function')throw new TypeError('Chat Composer Core requires its request owner sink');
  const plan=planChatComposer(snapshot,nativeProps,controlRequestRef);
  const [root,attachRoot]=useClassicNodeRef(forwardedRef),[input,attachInput]=useClassicNodeRef(snapshot.refs.inputRef),[,attachHandle]=useClassicNodeRef(snapshot.refs.composerRef);
  const [,attachButtonHandle]=useClassicNodeRef(controlRequestRef);
  const buttonControls=useRef(new Map<ChatComposerActionTarget,HTMLButtonElement>());
  const textVersion=useRef(0),editVersion=useRef(0),composing=useRef(false),suppressFocus=useRef(false);
  const [initial]=useState<ChatDraft>(()=>snapshot.draftMode.mode==='controlled'?snapshot.draftMode.draft!:snapshotChatDraft({text:snapshot.draftMode.defaultDraft!,selectionStart:snapshot.draftMode.defaultDraft!.length,selectionEnd:snapshot.draftMode.defaultDraft!.length,direction:'none',revision:allocateRevision()}));
  const [local,setLocal]=useState<ChatDraft>(initial),[editing,setEditing]=useState<ChatDraft|null>(null);
  const mountInitial=useRef(initial);
  const liveDraft=useRef(initial),history=useRef<ChatLocalHistoryState>(createChatLocalHistoryState());
  const pendingSelection=useRef<ChatDraft|null>(initial),programmaticSelection=useRef<{start:number;end:number;direction:ChatDraft['direction']}|null>(null);
  const committed=useRef({snapshot,onRawRequest});
  const nextRevision=()=>{
    observeRevision(committed.current.snapshot.draftMode.draft?.revision);observeRevision(liveDraft.current.revision);observeRevision(history.current.restoreDraft?.revision);
    return allocateRevision();
  };
  const controlled=snapshot.draftMode.mode==='controlled',accepted=controlled?snapshot.draftMode.draft!:local;
  const display=editing??accepted;
  useClassicLayoutEffect(()=>{committed.current={snapshot,onRawRequest};observeRevision(snapshot.draftMode.draft?.revision);});
  const restoreSelection=(node:HTMLInputElement,next:ChatDraft)=>{
    node.setSelectionRange(next.selectionStart,next.selectionEnd,next.direction);
    // Chromium normalizes a collapsed "none" to "forward". Suppress only the
    // actual range written, never a stale requested direction from the model.
    programmaticSelection.current={start:node.selectionStart??next.selectionStart,end:node.selectionEnd??next.selectionEnd,direction:node.selectionDirection??next.direction};
  };
  useClassicLayoutEffect(()=>{
    if(controlled&&!composing.current){
      const next=snapshot.draftMode.draft!,old=liveDraft.current;
      if(old.text!==next.text||old.revision!==next.revision||old.selectionStart!==next.selectionStart||old.selectionEnd!==next.selectionEnd||old.direction!==next.direction){liveDraft.current=next;pendingSelection.current=next;textVersion.current++;editVersion.current++;}
      setEditing(null);
    }
  },[controlled,snapshot.draftMode.draft?.text,snapshot.draftMode.draft?.revision,snapshot.draftMode.draft?.selectionStart,snapshot.draftMode.draft?.selectionEnd,snapshot.draftMode.draft?.direction]);
  useClassicLayoutEffect(()=>{
    const node=input.current,next=pendingSelection.current;
    if(node&&next&&!composing.current&&node.value===next.text){restoreSelection(node,next);pendingSelection.current=null;}
  });
  const active=(control:HTMLElement)=>{
    const p=committed.current.snapshot,boundary=root.current;
    return !!boundary&&boundary.isConnected&&boundary.contains(control)&&control.isConnected&&!boundary.closest('[hidden],[inert]')&&!control.closest('[hidden],[inert]')&&!p.disabled;
  };
  const readDraft=():ChatDraft=>{
    const node=input.current,current=liveDraft.current;
    if(!node||node.value!==current.text)return snapshotChatDraft(current);
    return snapshotChatDraft({...current,selectionStart:node.selectionStart??current.selectionStart,selectionEnd:node.selectionEnd??current.selectionEnd,direction:node.selectionDirection??current.direction});
  };
  const inputAvailable=()=>!!input.current&&active(input.current)&&committed.current.snapshot.bindings.editorEnabled&&!input.current.disabled;
  const readonly=()=>committed.current.snapshot.readOnly||!!input.current?.readOnly;
  const focus=(selected:boolean)=>{
    const node=input.current;if(!node||!inputAvailable())return false;
    suppressFocus.current=true;try{if(selected)node.focus({preventScroll:true});else node.blur();}finally{suppressFocus.current=false;}return true;
  };
  const write=(next:ChatDraft,event?:SyntheticEvent<HTMLInputElement>,resetHistory=true)=>{
    const p=committed.current.snapshot;observeRevision(next.revision);
    if(resetHistory)history.current=createChatLocalHistoryState();
    if(p.draftMode.mode==='uncontrolled-web'){liveDraft.current=next;pendingSelection.current=next;textVersion.current++;editVersion.current++;setLocal(next);}
    p.callbacks.onDraftChange?.(snapshotChatDraft(next),event);
  };
  const settle=(node:HTMLInputElement,version:number)=>{
    scheduleClassicTask(node,()=>{
      if(!active(node)||input.current!==node||version!==editVersion.current||composing.current)return;
      const p=committed.current.snapshot;if(p.draftMode.mode!=='controlled')return;
      const next=p.draftMode.draft!;liveDraft.current=next;pendingSelection.current=next;setEditing(null);
      if(node.value===next.text){restoreSelection(node,next);pendingSelection.current=null;}
    });
  };
  // Native reset is not a semantic Chat action or a fabricated input/change.
  // Observe the document so changing an input's associated form needs no render.
  useClassicLayoutEffect(()=>{
    const node=input.current,doc=node?.ownerDocument;if(!node||!doc)return;
    const reset=(event:Event)=>{
      const form=node.form,version=editVersion.current,session=committed.current.snapshot.runKey;
      if(!form||event.target!==form)return;
      scheduleClassicTask(node,()=>{
        const boundary=root.current,p=committed.current.snapshot;
        if(event.defaultPrevented||input.current!==node||!node.isConnected||!boundary?.isConnected||!boundary.contains(node)||node.form!==form||p.runKey!==session||editVersion.current!==version)return;
        const next=p.draftMode.mode==='controlled'?p.draftMode.draft!:snapshotChatDraft({...mountInitial.current,revision:nextRevision()});
        composing.current=false;history.current=createChatLocalHistoryState();editVersion.current++;textVersion.current++;liveDraft.current=next;pendingSelection.current=null;
        node.value=next.text;restoreSelection(node,next);setEditing(null);if(p.draftMode.mode==='uncontrolled-web')setLocal(next);
      });
    };
    doc.addEventListener('reset',reset,true);return()=>doc.removeEventListener('reset',reset,true);
  });
  const allowed=(target:ChatComposerActionTarget,control:HTMLElement,origin:ChatComposerActionDetail['origin'],from?:ChatEditorInput)=>{
    const p=committed.current.snapshot;
    if(!active(control))return false;
    if(control.tagName==='BUTTON'&&((control as HTMLButtonElement).disabled||buttonControls.current.get(target)!==control))return false;
    if(control.tagName!=='BUTTON'&&input.current!==control)return false;
    if(target==='button.keyboard_toggle'&&!p.bindings.keyboardButtonVisible)return false;
    if(target==='button.host_toggle'&&(!p.cheatsOn||p.capabilities.isPregame))return false;
    if(target==='button.send'&&!p.bindings.sendEnabled)return false;
    if(mutating.has(target)&&(p.readOnly||readonly()||composing.current))return false;
    if(editorOnly.has(target)&&!inputAvailable())return false;
    if(focusedHistory.has(target)&&input.current?.ownerDocument.activeElement!==input.current)return false;
    if(origin==='host-controller'&&from&&control===input.current&&!inputAvailable())return false;
    return true;
  };
  const queue=(target:ChatComposerActionTarget,origin:ChatComposerActionDetail['origin'],control:HTMLElement,event?:SyntheticEvent<HTMLElement>,fromButtonId?:ChatEditorInput,selectionEffect?:'focus'|'blur',requireButtonFocus=false)=>{
    if(event&&(event.defaultPrevented||event.nativeEvent.defaultPrevented))return false;
    if(!allowed(target,control,origin,fromButtonId)||requireButtonFocus&&control.ownerDocument.activeElement!==control)return false;
    const p=committed.current.snapshot,rawDraft=readDraft(),version=textVersion.current,acceptedRevision=p.draftMode.draft?.revision;
    const valid=()=>allowed(target,control,origin,fromButtonId)&&(!requireButtonFocus||control.ownerDocument.activeElement===control)&&committed.current.snapshot.runKey===p.runKey&&committed.current.snapshot.draftMode.mode===p.draftMode.mode;
    const detail:ChatComposerActionDetail=Object.freeze({runKey:p.runKey,target,origin,control,event,rawDraft,...(fromButtonId?{fromButtonId}:{})});
    let applied=false;
    const accept=()=>{
      if(applied||!valid()||event?.defaultPrevented||event?.nativeEvent.defaultPrevented)return;applied=true;
      if(selectionEffect){focus(selectionEffect==='focus');return;}
      const now=committed.current.snapshot;
      if(textVersion.current!==version||(now.draftMode.mode==='controlled'&&now.draftMode.draft?.revision!==acceptedRevision))return;
      if(target==='button.text_edit_box_clear'){const next=snapshotChatDraft({text:'',selectionStart:0,selectionEnd:0,direction:'none',revision:nextRevision()});write(next);}
      else if((target==='button.chat_previous_message'||target==='button.chat_next_message')&&now.draftMode.mode==='uncontrolled-web'&&now.draftMode.historyPolicy==='local-oldest-first-web'){
        const result=stepChatLocalHistory({history:now.history,state:history.current,draft:readDraft(),direction:target==='button.chat_previous_message'?'previous':'next',revision:nextRevision()});
        history.current=result.state;if(result.changed)write(result.draft,undefined,false);
      }
    };
    return committed.current.onRawRequest({detail,control,event,valid,accept});
  };
  const editorRequest=(command:ChatEditorCommand)=>{
    const parsed=snapshotChatEditorCommand(command),node=input.current;if(!node||!inputAvailable())return false;
    const candidates=CHAT_EDITOR_MAPPINGS.filter(mapping=>mapping.fromButtonId===parsed.fromButtonId),selected=node.ownerDocument.activeElement===node;
    const mapping=candidates.find(value=>selected?value.handleSelect!==true:value.handleDeselect!==true)??candidates[0];if(!mapping)return false;
    const selectionEffect=parsed.fromButtonId==='button.menu_cancel'?'blur':parsed.fromButtonId==='button.menu_select'?(selected?'blur':'focus'):parsed.fromButtonId==='button.menu_ok'&&!selected?'focus':undefined;
    return queue(mapping.target,'host-controller',node,undefined,parsed.fromButtonId,selectionEffect);
  };
  const requestButton=(target:ChatComposerButtonTarget,fromButtonId:'button.menu_select'|'button.menu_ok')=>{
    if(!['button.send','button.keyboard_toggle','button.open_chat_settings','button.host_toggle'].includes(target)||!['button.menu_select','button.menu_ok'].includes(fromButtonId))return false;
    const control=buttonControls.current.get(target);if(!control)return false;
    return queue(target,'host-controller',control,undefined,fromButtonId,undefined,true);
  };
  useImperativeHandle(attachButtonHandle,():ChatComposerControlHandle=>({request:requestButton}),[]);
  const apply=(application:ChatDraftApplication)=>{
    const p=committed.current.snapshot;if(!inputAvailable()||readonly()||composing.current)return false;
    const result=resolveChatDraftApplication(p.runKey,readDraft(),application);if(!result.accepted)return false;write(result.draft);return true;
  };
  useImperativeHandle(attachHandle,():ChatComposerHandle=>({getDraft:readDraft,focusEditor:()=>focus(true),request:editorRequest,applyDraft:apply}),[]);
  const current=snapshot,{scale,keyboardVisible,hostVisible,width,sendWidth,hostWidth,editorWidth}=plan;
  const {className='',style,onKeyDown,...native}=nativeProps;
  const inputProps=current.inputProps??{};
  const small=(kind:'keyboard'|'settings'|'host'|'send',buttonWidth:number,target:ChatComposerActionTarget,content:(state:string)=>React.ReactNode)=>{
    const disabled=current.disabled||kind==='send'&&(!current.bindings.sendEnabled||current.readOnly);
    const label=plan.labels[kind];
    return <button ref={node=>{if(node)buttonControls.current.set(target,node);else buttonControls.current.delete(target);}} type="button" disabled={disabled} className={`mc-chat-composer__button mc-chat-composer__button--${kind}`} data-source-action={target}
      data-source-button={kind==='send'||kind==='host'?'common_buttons.light_text_form_fitting_button':'common_buttons.light_content_button'}
      data-source-offset={kind==='send'?'-20,0':'0,0'} aria-label={label} style={{width:buttonWidth*scale,height:27*scale}}
      onClick={event=>{queue(target,'control',event.currentTarget,event);}}>
      {states.map(state=><span key={state.id} className={`mc-chat-composer__state mc-chat-composer__state--${state.id}`} aria-hidden="true">
        <span className="mc-chat-composer__face" style={{left:scale,top:scale,width:(buttonWidth-2)*scale,height:25*scale}}><ClassicSkin asset={chatAssets[state.asset]} width={buttonWidth-2} height={25} scale={scale} baseClass="mc-chat-composer-skin" errorName="Chat Composer"/></span>
        <span className="mc-chat-composer__border" style={{filter:`brightness(${state.border})`}}><ClassicSkin asset={chatAssets['textures/ui/focus_border_white']} width={buttonWidth} height={27} scale={scale} baseClass="mc-chat-composer-skin" errorName="Chat Composer"/></span>
        <span className="mc-chat-composer__content" style={{transform:state.id==='pressed'?`translateY(${scale}px)`:undefined}}>{content(state.id)}</span>
      </span>)}
    </button>;
  };
  const originalImage=(key:keyof typeof chatAssets,size:readonly[number,number],className?:string)=>{const asset=chatAssets[key];return <Image className={className} src={asset.url} sourceSize={[asset.width,asset.height]} size={size} scale={scale} alt=""/>;};
  const glyph=(text:string,state:string)=>{const color=state==='normal'||state==='locked'?'rgb(30% 30% 30%)':'#fff',context:ChatTextRenderContext=Object.freeze({role:'chrome',font:Object.freeze({...current.profile.fonts.chrome}),scale,color,shadow:false,id:'host-toggle'});
    return <span style={{color,fontFamily:context.font.family,fontSize:context.font.logicalSize*scale,lineHeight:`${context.font.lineHeight*scale}px`,textShadow:'none'}}>{current.callbacks.renderText?<><span aria-hidden="true">{current.callbacks.renderText(text,context)}</span><span className="mc-chat-composer__sr">{text}</span></>:text}</span>;};
  return <div {...native} ref={attachRoot} className={`mc-chat-composer ${className}`} data-run-key={current.runKey} data-mode={current.draftMode.mode}
    data-source-control="chat.chat_bottom_panel" data-layout-policy="finite-parent-percent-intrinsic-web-profile" data-native-certified="false"
    style={{...style,position:'relative',display:'flex',boxSizing:'border-box',width:width*scale,height:27*scale,minHeight:27*scale,padding:0,margin:0,border:0,'--mc-chat-composer-unit':`${scale}px`} as CSSProperties} onKeyDown={onKeyDown}>
    {keyboardVisible&&small('keyboard',27,'button.keyboard_toggle',state=>current.bindings.keyboardInUse?<span className={`mc-chat-composer__down mc-chat-composer__down--${state}`}>{originalImage('textures/ui/chat_down_arrow',[12,8])}</span>:originalImage(state==='hover'||state==='pressed'?'textures/ui/chat_keyboard_hover':'textures/ui/chat_keyboard',[9,7]))}
    {hostVisible&&small('host',hostWidth,'button.host_toggle',state=><span style={{width:17*scale,height:17*scale,display:'grid',placeItems:'center'}}>{glyph('/',state)}</span>)}
    {small('settings',27,'button.open_chat_settings',()=>originalImage('textures/ui/gear',[14,14]))}
    <div className="mc-chat-composer__editor" data-locked={String(!!current.disabled||!current.bindings.editorEnabled)} style={{width:editorWidth*scale,height:27*scale}}>
      <span className="mc-chat-composer__editor-skin mc-chat-composer__editor-skin--normal" aria-hidden="true"><ClassicSkin asset={chatAssets['textures/ui/edit_box_indent']} width={editorWidth} height={27} scale={scale} baseClass="mc-chat-composer-skin" errorName="Chat editor"/></span>
      <span className="mc-chat-composer__editor-skin mc-chat-composer__editor-skin--hover" aria-hidden="true"><ClassicSkin asset={chatAssets['textures/ui/edit_box_indent_hover']} width={editorWidth} height={27} scale={scale} baseClass="mc-chat-composer-skin" errorName="Chat editor"/></span>
      <div className="mc-chat-composer__input-clip" style={{left:3*scale,top:2*scale,width:(editorWidth-6)*scale,height:23*scale}}>
        <input {...inputProps} ref={attachInput} type="text" value={display.text} disabled={!!current.disabled||!current.bindings.editorEnabled} readOnly={!!current.readOnly||inputProps.readOnly}
          maxLength={current.profile.maxTextEditLength} aria-label={plan.labels.editor}
          className={`mc-chat-composer__input ${inputProps.className??''}`} data-source-control="chat.text_edit_box" data-source-text-type="ExtendedASCII-unrecovered-web-unicode" data-max-length-policy="web-utf16"
          autoComplete={inputProps.autoComplete??'off'} spellCheck={inputProps.spellCheck??false}
          style={{...inputProps.style,boxSizing:'border-box',width:'100%',height:'100%',margin:0,padding:0,border:0,borderRadius:0,fontFamily:current.profile.fonts.editor.family,fontSize:current.profile.fonts.editor.logicalSize*scale,lineHeight:`${current.profile.fonts.editor.lineHeight*scale}px`,color:'#fff',textShadow:'none',background:'transparent'}}
          onChange={event=>{
            inputProps.onChange?.(event);const node=event.currentTarget;if(input.current!==node||!active(node)||!inputAvailable()||readonly()||event.defaultPrevented||event.nativeEvent.defaultPrevented){if(controlled){setEditing(null);liveDraft.current=committed.current.snapshot.draftMode.draft!;}return;}
            const next=snapshotChatDraft({text:node.value,selectionStart:node.selectionStart??node.value.length,selectionEnd:node.selectionEnd??node.value.length,direction:node.selectionDirection??'none',revision:nextRevision()});
            liveDraft.current=next;textVersion.current++;history.current=createChatLocalHistoryState();const version=++editVersion.current;
            const p=committed.current.snapshot;if(p.draftMode.mode==='controlled'){setEditing(next);p.callbacks.onDraftChange?.(snapshotChatDraft(next),event);settle(node,version);}
            else{setLocal(next);p.callbacks.onDraftChange?.(snapshotChatDraft(next),event);}
          }}
          onInput={inputProps.onInput} onBeforeInput={event=>{inputProps.onBeforeInput?.(event);if(!inputAvailable()||readonly())event.preventDefault();}}
          onSelect={event=>{
            inputProps.onSelect?.(event);const node=event.currentTarget;if(input.current!==node||!active(node)||!inputAvailable()||event.defaultPrevented||event.nativeEvent.defaultPrevented)return;const start=node.selectionStart??0,end=node.selectionEnd??start,direction=node.selectionDirection??'none',suppressed=programmaticSelection.current;
            programmaticSelection.current=null;
            if(suppressed&&suppressed.start===start&&suppressed.end===end&&suppressed.direction===direction)return;
            const old=liveDraft.current;if(old.text!==node.value||old.selectionStart===start&&old.selectionEnd===end&&old.direction===direction)return;
            const next=snapshotChatDraft({...old,selectionStart:start,selectionEnd:end,direction,revision:nextRevision()});liveDraft.current=next;const version=++editVersion.current;
            if(committed.current.snapshot.draftMode.mode==='uncontrolled-web')setLocal(next);committed.current.snapshot.callbacks.onDraftChange?.(next,event);
            if(committed.current.snapshot.draftMode.mode==='controlled')settle(node,version);
          }}
          onCompositionStart={event=>{inputProps.onCompositionStart?.(event);if(input.current===event.currentTarget&&inputAvailable())composing.current=true;}}
          onCompositionEnd={event=>{inputProps.onCompositionEnd?.(event);if(input.current!==event.currentTarget)return;composing.current=false;if(committed.current.snapshot.draftMode.mode==='controlled')settle(event.currentTarget,++editVersion.current);}}
          onFocus={event=>{inputProps.onFocus?.(event);if(!suppressFocus.current)queue('button.text_edit_box_selected','control',event.currentTarget,event);}}
          onBlur={event=>{inputProps.onBlur?.(event);if(!suppressFocus.current)queue('button.text_edit_box_deselected','control',event.currentTarget,event);}}
          onPointerEnter={event=>{inputProps.onPointerEnter?.(event);queue('button.text_edit_box_hovered','control',event.currentTarget,event);}}
          onKeyDown={event=>{
            inputProps.onKeyDown?.(event);if(event.defaultPrevented||event.nativeEvent.defaultPrevented||composing.current||event.nativeEvent.isComposing||event.nativeEvent.keyCode===229||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
            const p=committed.current.snapshot;if(event.repeat&&p.profile.inputPolicy.repeat==='ignore')return;
            if(event.key==='Enter'&&p.profile.inputPolicy.submit==='web-enter')queue('button.send','keyboard',event.currentTarget,event);
            else if((event.key==='ArrowUp'||event.key==='ArrowDown')&&p.profile.inputPolicy.history==='web-arrows')queue(event.key==='ArrowUp'?'button.chat_previous_message':'button.chat_next_message','keyboard',event.currentTarget,event,event.key==='ArrowUp'?'button.menu_textedit_up':'button.menu_textedit_down');
          }}/>
      </div>
    </div>
    {small('send',sendWidth,'button.send',()=> <span className="mc-chat-composer__send-panel" style={{width:44*scale,height:17*scale}}><span className="mc-chat-composer__send-icon">{originalImage('textures/ui/chat_send',[21,18])}</span>
      <span className="mc-chat-composer__helper-x" style={{visibility:current.bindings.gamepadHelperVisible?'visible':'hidden'}}><Image src={current.profile.gamepadImages.x.src} sourceSize={current.profile.gamepadImages.x.naturalSize} size={[26,26]} scale={scale} alt=""/></span></span>)}
  </div>;
}

/** Private rendering/editing core. Its owner receives raw synchronous requests
 * and alone performs semantic scheduling. Input-only controlled draft settlement
 * uses a guarded owner task; it never emits an action or calls an event sink. */
export const ChatComposerCore=forwardRef<HTMLDivElement,ChatComposerCoreProps>(function ChatComposerCore(props,ref){
  return <Session key={`${props.snapshot.runKey}:${props.snapshot.draftMode.mode}`} {...props} forwardedRef={ref}/>;
});
/** Standalone owner: one task bridge, native DOCUMENT veto, latest callback and
 * acceptance guard. The Root Screen uses Core and owns this bridge itself. */
export const ChatComposer=forwardRef<HTMLDivElement,ChatComposerProps>(function ChatComposer(props,ref){
  const snapshot=snapshotChatComposer({...props});const latest=useRef(snapshot);useClassicLayoutEffect(()=>{latest.current=snapshot;});
  const {runKey:_,cheatsOn:__,history:___,bindings:____,capabilities:_____,profile:______,disabled:_______,readOnly:________,renderText:_________,onAction:__________,inputRef:___________,composerRef:____________,inputProps:_____________,mode:______________,draft:_______________,defaultDraft:________________,onDraftChange:_________________,historyPolicy:__________________,...native}=props;
  const sink=(request:ChatComposerRawRequest)=>{
    if(!request.valid())return false;const run=(event?:SyntheticEvent<HTMLElement>)=>{
      if(!request.valid())return;const now=latest.current;if(now.runKey!==request.detail.runKey)return;
      if(now.callbacks.onAction(Object.freeze({...request.detail,event}))===false||event?.defaultPrevented||event?.nativeEvent.defaultPrevented||!request.valid())return;request.accept();
    };
    if(request.event)deferClassicRequest(request.event,request.event.currentTarget,accepted=>run(accepted),request.valid);else scheduleClassicTask(request.control,()=>run());return true;
  };
  return <ChatComposerCore snapshot={snapshot} nativeProps={native} onRawRequest={sink} ref={ref}/>;
});
