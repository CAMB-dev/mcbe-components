import { createRoot } from 'react-dom/client';
import { createPortal, flushSync } from 'react-dom';
import { ChatComposer } from '../src/chat-composer';
import { ChatTranscript } from '../src/chat-transcript';
import { ChatCoordinatesToolbar } from '../src/chat-coordinates';
import { ChatSettingsPanel } from '../src/chat-settings';
import { ChatHostOptionsPanel } from '../src/chat-host';
import { ChatHeader, ChatNewMessages, ChatToast } from '../src/chat-chrome';
import { ChatCompletionList } from '../src/chat-completion';
import { ChatScreen } from '../src/chat-screen';
import '../src/chat-screen.css';
import './chat-fixture.css';

/** Test-only observation surface; never imported by the showcase or library. */
declare global { interface Window { chatHarness: {
  reset(update?:Record<string,unknown>):void; patch(update:Record<string,unknown>):void; clear():void;
  readonly ready:boolean; readonly refs:Record<string,any>; readonly config:any;
  readonly events:any[]; readonly refEvents:any[]; readonly version:number;
  draft(text?:string,revision?:string,start?:number,end?:number,direction?:string):any;
} } }

const image=(name:string,size:readonly[number,number])=>({src:new URL(`./assets/chat/${name}.png`,import.meta.url).href,naturalSize:size,provenance:'Whole fixed official archive; explicit host Web provider choice'});
const font={family:'monospace',logicalSize:10,lineHeight:12};
const labels={ 'chat.settings':'Chat Settings','chat.settings.muteAll':'Mute All Chat','chat.settings.muteEmotes':'Mute Emotes','chat.settings.tts':'Text to Speech',
  'chat.settings.font':'Typeface','chat.settings.chatColor':'Chat Color','chat.settings.mentionsColor':'Mentions Color','options.resetSettings':'Reset Settings',
  'accessibility.button.close':'Close','accessibility.chat.tts.keyboard':'Keyboard','accessibility.chat.tts.textboxTitle':'Message','chat.newMessages':'New messages',
  'chat.coordinateTypePosition':'My Position','chat.coordinateTypeFacing':'Facing Block','copy_coordinates_button':'Copy coordinates','paste_button':'Paste',
  'chat_coordinate_dropdown':'Coordinate type','hostOption.teleport':'Teleport','hostOption.time':'Time','hostOption.weather':'Weather' };
const profile={availableSize:[Math.min(500,Math.max(160,window.innerWidth-32)),300] as const,scale:1,fonts:{chat:font,editor:font,chrome:font,smooth:font},chatFontScaleFactor:1,chatLinePadding:0,
  messageLive:'off',messageShadow:false,maxTextEditLength:64,maxLengthPolicy:'web-utf16',sourceGeometry:'finite-parent-percent-intrinsic-web-profile',labels,
  whiteMaterial:{...image('white',[15,15]),sourceTexture:'textures/ui/White'},gamepadImages:{b:image('xbox_face_button_right',[26,26]),x:image('xbox_face_button_left',[26,26]),y:image('xbox_face_button_up',[26,26])},
  inputPolicy:{submit:'web-enter',history:'web-arrows',autocomplete:'host-logical-only',escape:'topmost-layer',repeat:'ignore'}};
const bindings={chatVisible:true,titleVisible:true,title:'Chat','backText':'Back',backAccessibilityText:'Back to game',editorEnabled:true,sendEnabled:true,sendAccessibilityText:'Send',
  keyboardButtonVisible:true,keyboardInUse:false,hasNewMessages:false,forceScrollToBottom:false,messageTtsFocusEnabled:false,gamepadHelperVisible:false,usingGamepad:false,
  focus:{editorUp:'coordinate_dropdown_focus_id',editorDown:'',keyboardUp:'',keyboardDown:''}};
const coordinates={visible:true,dropdownLabel:'My Position',text:'12, 64, -3',copyEnabled:true,positionSelected:true,facingSelected:false};
const colors=()=>['White','Red','Green','Blue','Yellow','Purple','Gray'].map((label,index)=>({label,color:['#ffffff','#ff5555','#55ff55','#5555ff','#ffff55','#aa00aa','#aaaaaa'][index],selected:index===0}));
const settings={popup:null,hideChat:false,muteEmotes:false,tts:false,typefaceVisibleAtInstanceCreation:true,typefaceEnabled:true,typefaceLabel:'Mojangles',
  mojangles:{selected:true,label:'Mojangles'},notoSans:{selected:false,label:'Noto Sans'},
  fontSize:{value:12,enabled:true,min:8,max:24,step:1,steps:16,label:'Font size',valueText:'12'},lineSpacing:{value:0,enabled:true,min:0,max:8,step:1,steps:8,label:'Line spacing',valueText:'0'},
  chatColors:colors(),mentionsColors:colors(),chatColorEnabled:true,mentionsColorEnabled:true,chatColorLabel:'White',mentionsColorLabel:'White',chatPaintbrushColor:'#fff',mentionsPaintbrushColor:'#fff'};
const opaque={navigation:'opaque-navigation',command:'opaque-command'};
const entry=(id:string,text:string)=>({id,text,navigation:opaque,subCommand:opaque,glyph:null,glyphVisible:false,focusId:id,focus:{up:'',down:'',left:'',right:''},teleportVisible:true,toggleSelected:false,teleportName:'Clear'});
const host={cheatsOn:false,mainVisible:false,teleportMainVisible:false,teleportPlayersVisible:false,timeVisible:false,weatherVisible:false,
  main:{dimensions:[1,2],entries:[entry('teleport','Teleport'),entry('time','Time')]},teleport:{dimensions:[1,2],entries:[entry('who','Who'),entry('where','Where')]},
  time:{dimensions:[1,4],entries:[entry('day','Day'),entry('night','Night')]},weather:{dimensions:[1,1],entries:[entry('clear','Clear')]},
  players:{dimensions:[1,1],entries:[{...entry('player','Player'),gamertag:'Player',gamerPicture:{visible:false},localPlayerIconVisible:false,platformIcon:{visible:false}}]}};
const capabilities={sourceProfile:'desktop',touch:false,isPregame:false,educationEdition:false,platformIconsVisible:false};
const makeDraft=(text='initial',revision='r0',start=text.length,end=start,direction='none')=>({text,selectionStart:start,selectionEnd:end,direction,revision});
const initial=()=>({surface:'composer',mode:'controlled',runKey:'run-1',draft:makeDraft(),defaultDraft:'initial',historyPolicy:'host-requests',history:['older','latest'],
  disabled:false,readOnly:false,acceptDraft:true,acceptAction:true,actionAfter:'none',callbackTag:'first',shown:true,profile:structuredClone(profile),bindings:structuredClone(bindings),capabilities:structuredClone(capabilities),
  messages:[{id:'m0',text:'One message',ttsText:'First spoken message'}],suggestions:[{id:'s0',text:'/give',itemIdAux:opaque,itemVisual:{kind:'none'},isSuggestion:true},{id:'s1',text:'Hint only',itemIdAux:opaque,itemVisual:{kind:'none'},isSuggestion:false}],
  coordinates:structuredClone(coordinates),settings:structuredClone(settings),host,open:true,toast:null,emptyGlyphs:false});
const root=createRoot(document.getElementById('app')!);
let config:any=initial(),events:any[]=[],attached:any={},refEvents:any[]=[],version=0;
const handleRef=(name:string)=>(value:any)=>{attached[name]=value;refEvents.push({name,attached:!!value});if(value)return()=>{if(attached[name]===value)attached[name]=null;refEvents.push({name,cleanup:true});};};
const refs={composer:handleRef('composer'),input:handleRef('input'),root:handleRef('root'),viewport:handleRef('viewport'),controller:handleRef('controller'),coordinateDropdown:handleRef('coordinateDropdown'),settingsDropdown:handleRef('settingsDropdown')};
function record(kind:string,data:any={}){events.push({kind,...data});}
function patch(update:any){config={...config,...update};flushSync(render);}
function native(name:string){return(event:any)=>record('native',{name,type:event.type,value:event.currentTarget.value??null,tag:event.currentTarget.tagName});}
function onDraftChange(next:any,event:any){record('draft',{draft:{...next},nativeType:event?.nativeEvent?.type??null});if(config.mode==='controlled'&&config.acceptDraft)patch({draft:{...next}});}
function onAction(detail:any){record('action',{target:detail.target,origin:detail.origin,draft:{...detail.rawDraft},runKey:detail.runKey,tag:config.callbackTag,fromButtonId:detail.fromButtonId,
  suggestionId:detail.suggestion?.id,collection:detail.hostEntry?.collection,hostId:detail.hostEntry?.id,controlConnected:detail.control.isConnected});
  if(config.actionAfter==='disable')patch({disabled:true});if(config.actionAfter==='run')patch({runKey:'run-after-action'});return config.acceptAction?undefined:false;}
const inputProps={'aria-label':'Message',onChange:native('change'),onSelect:native('select'),onBeforeInput:native('beforeinput'),onKeyDown:native('keydown'),onFocus:native('focus'),onBlur:native('blur')};
function render(){
  version++;const c=config,common={runKey:c.runKey,bindings:c.bindings,profile:c.profile,capabilities:c.capabilities,disabled:c.disabled,readOnly:c.readOnly,renderText:c.emptyGlyphs?()=>null:undefined};
  const nativeInput={...inputProps,...c.inputOverrides};
  const draftProps:any=c.mode==='controlled'?{mode:'controlled',draft:c.draft,onDraftChange,historyPolicy:'host-requests'}:{mode:'uncontrolled-web',defaultDraft:c.defaultDraft,onDraftChange,historyPolicy:c.historyPolicy};
  const raw=(detail:any)=>{record('raw-leaf',{target:detail.target,field:detail.field,value:detail.value});};
  let content:any;
  switch(c.surface){
    case'composer':content=<form id="fixture-form" onReset={native('reset')} onSubmit={e=>{e.preventDefault();record('submit');}}><ChatComposer {...common} {...draftProps} cheatsOn={c.host.cheatsOn} history={c.history} inputProps={nativeInput} inputRef={refs.input} composerRef={refs.composer} ref={refs.root} onClick={native('root-click')} onAction={onAction}/></form>;break;
    case'transcript':content=<div id="transcript-frame" style={{width:c.profile.availableSize[0]*c.profile.scale,height:180*c.profile.scale}}><ChatTranscript runKey={c.runKey} messages={c.messages} bindings={c.bindings} profile={c.profile} maxChildren={100} overflowPolicy="reject" viewportRef={refs.viewport} ref={refs.root} onScrollStateChange={s=>record('scroll',s)} renderText={common.renderText}/></div>;break;
    case'coordinates':content=<ChatCoordinatesToolbar {...common} coordinates={c.coordinates} dropdownRef={refs.coordinateDropdown} ref={refs.root} onRequest={raw} onCoordinateRequest={raw}/>;break;
    case'settings':content=<ChatSettingsPanel {...common} settings={c.settings} dropdownRef={refs.settingsDropdown} ref={refs.root} onRequest={(target,control,event)=>raw({target,control,event})} onSettingRequest={(change,control,event)=>raw({...change,control,event})}/>;break;
    case'host':content=<div id="host-frame" style={{position:'relative',width:c.profile.availableSize[0]*c.profile.scale,height:c.profile.availableSize[1]*c.profile.scale}}><ChatHostOptionsPanel host={c.host} capabilities={c.capabilities} profile={c.profile} disabled={c.disabled} readOnly={c.readOnly} renderText={common.renderText} onRequest={raw} onHostSelectionChange={raw}/></div>;break;
    case'chrome':content=<><ChatHeader {...common} onRequest={raw}/><ChatNewMessages visible={c.bindings.hasNewMessages} profile={c.profile} renderText={common.renderText} onRequest={raw}/><ChatToast toast={c.toast} profile={c.profile} renderText={common.renderText}/></>;break;
    case'completion':content=<ChatCompletionList suggestions={c.suggestions} dimensions={[1,c.suggestions.length]} profile={c.profile} disabled={c.disabled} readOnly={c.readOnly} renderText={common.renderText} onRequest={raw}/>;break;
    case'screen':content=<ChatScreen {...common} {...draftProps} open={c.open} messages={c.messages} maxChildren={100} overflowPolicy="reject" suggestions={c.suggestions} suggestionGridDimensions={[1,c.suggestions.length]} coordinates={c.coordinates} settings={c.settings} host={c.host} history={c.history} inputProps={nativeInput} onClick={native('root-click')} onAction={onAction}
      onSettingChange={change=>record('setting',change)} onCoordinateChange={(field,value)=>record('coordinate',{field,value})} onHostSelectionChange={detail=>record('host-selection',detail)} onCloseRequested={detail=>record('close',{reason:detail.reason})} toast={c.toast} ref={refs.root} controllerRef={refs.controller} composerRef={refs.composer} inputRef={refs.input} messageViewportRef={refs.viewport}/>;break;
  }
  const surface=<div id="surface" data-surface={c.surface} data-empty-glyphs={c.emptyGlyphs}>{c.shown?content:null}</div>;
  root.render(c.portal?createPortal(surface,(document.getElementById('portal-fixture') as HTMLIFrameElement).contentDocument!.getElementById('portal-root')!):surface);
}
(window as any).chatHarness={patch,reset(update:any={}){config={...initial(),...update};events=[];refEvents=[];flushSync(render);},clear(){events=[];},get events(){return events;},get refs(){return attached;},get refEvents(){return refEvents;},get config(){return config;},get version(){return version;},draft:makeDraft,ready:true};
flushSync(render);
