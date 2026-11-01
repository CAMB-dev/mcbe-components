import type { Ref } from 'react';
import type { ChatBindings, ChatCapabilities, ChatComposerProps, ChatComposerSnapshot, ChatCoordinates, ChatDraft, ChatDraftApplication, ChatDraftApplicationResult,
  ChatDraftModeSnapshot, ChatEditorMapping, ChatEditorCommand, ChatEditorInput, ChatFontSpec, ChatHistoryTransition, ChatHostEntry, ChatHostGrid, ChatHostPlayer,
  ChatHostState, ChatInputProps, ChatLocalHistoryState, ChatMessageRecord, ChatPresentationProfile, ChatRootRefs, ChatScreenProps, ChatScreenSnapshot,
  ChatSettingsState, ChatSevenColors, ChatSize, ChatSliderState, ChatSuggestion, ChatWholeImage } from './chat-types';

/** Finite Web resource guards, NOT native Chat limits. Source factory100 is
 * separately represented by maxChildren. Opaque payloads do not enter budgets. */
export const CHAT_WEB_LIMITS=Object.freeze({records:128,items:32768,array:4096,textUnits:4194304,stringUnits:1048576,imageAxis:8192,pixels:4194304});
interface Budget {units:number;items:number}
const budget=():Budget=>({units:0,items:0});
function record(value:unknown,label:string,max:number=CHAT_WEB_LIMITS.records):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new TypeError(`${label} must be a plain data record`);
  const keys=Reflect.ownKeys(value);if(keys.length>max)throw new RangeError(`${label} exceeds the finite Web${max}-property budget`);
  const copy:Record<string,unknown>=Object.create(null);
  for(const key of keys){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||['__proto__','constructor','prototype'].includes(key)||!descriptor?.enumerable||!('value'in descriptor))throw new TypeError(`${label} requires enumerable data fields without accessors, symbols or prototype keys`);copy[key]=descriptor.value;}
  return copy;
}
function array(value:unknown,label:string,max:number):unknown[]{
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)throw new TypeError(`${label} must be a dense plain array`);
  const lengthDescriptor=Object.getOwnPropertyDescriptor(value,'length'),length=lengthDescriptor&&'value'in lengthDescriptor?lengthDescriptor.value:undefined;
  if(!Number.isSafeInteger(length)||length<0||length>max)throw new RangeError(`${label} exceeds the finite Web${max}-entry budget`);
  const copy:unknown[]=[];for(let i=0;i<length;i++){const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d?.enumerable||!('value'in d))throw new TypeError(`${label}[${i}] must be an own data element`);copy.push(d.value);}
  if(Reflect.ownKeys(value).some(key=>key!=='length'&&(typeof key!=='string'||!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=length)))throw new TypeError(`${label} has extra array properties`);return copy;
}
function string(value:unknown,label:string,b:Budget,max:number=CHAT_WEB_LIMITS.stringUnits,nonempty=false):string{
  if(typeof value!=='string'||value.length>max||(nonempty&&!value.trim()))throw new TypeError(`${label} must be a${nonempty?' nonempty':''} string within${max} UTF-16 units`);
  b.units+=value.length;if(b.units>CHAT_WEB_LIMITS.textUnits)throw new RangeError('Chat snapshot exceeds the finite Web UTF-16-unit budget');return value;
}
function id(value:unknown,label:string,b:Budget):string{return string(value,label,b,256,true);}
function flag(value:unknown,label:string):boolean{if(typeof value!=='boolean')throw new TypeError(`${label} must be boolean`);return value;}
function finite(value:unknown,label:string,min=-Number.MAX_VALUE,max=Number.MAX_VALUE):number{if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new RangeError(`${label} must be finite within[${min},${max}]`);return value;}
function integer(value:unknown,label:string,min=0,max=Number.MAX_SAFE_INTEGER):number{const n=finite(value,label,min,max);if(!Number.isSafeInteger(n))throw new RangeError(`${label} must be a safe integer`);return n;}
function positive(value:unknown,label:string,max=Number.MAX_VALUE):number{const n=finite(value,label,0,max);if(n===0)throw new RangeError(`${label} must be positive`);return n;}
function member<T extends string>(value:unknown,values:readonly T[],label:string):T{if(typeof value!=='string'||!values.includes(value as T))throw new RangeError(`${label} has an unknown value`);return value as T;}
function item(b:Budget,label:string){if(++b.items>CHAT_WEB_LIMITS.items)throw new RangeError(`${label} exceeds the finite Web aggregate item budget`);}
function color(value:unknown,label:string,b:Budget):string{const c=string(value,label,b,1024,true);if(/[\u0000-\u001f\u007f;]/.test(c))throw new TypeError(`${label} must be a finite CSS color token, not a declaration`);return c;}
function pair(value:unknown,label:string,kind:'size'|'pixels'|'grid'):ChatSize{
  const v=array(value,label,2);if(v.length!==2)throw new TypeError(`${label} requires two values`);
  const read=kind==='size'?positive:integer,min=kind==='grid'?0:1;
  const a=read(v[0],label+'[0]',kind==='size'?CHAT_WEB_LIMITS.imageAxis:min),c=read(v[1],label+'[1]',kind==='size'?CHAT_WEB_LIMITS.imageAxis:min);
  if(kind==='pixels'&&(a>CHAT_WEB_LIMITS.imageAxis||c>CHAT_WEB_LIMITS.imageAxis||a*c>CHAT_WEB_LIMITS.pixels))throw new RangeError(`${label} exceeds the whole-image Web budget`);
  if(kind==='grid'&&(a>CHAT_WEB_LIMITS.array||c>CHAT_WEB_LIMITS.array||!Number.isSafeInteger(a*c)||a*c>CHAT_WEB_LIMITS.array))throw new RangeError(`${label} exceeds the finite Web grid capacity`);
  return Object.freeze([a,c] as const);
}
function extent(size:ChatSize,scale:number,label:string){if(size.some(n=>!Number.isFinite(n)||n<=0||!Number.isFinite(n*scale)||n*scale>CHAT_WEB_LIMITS.imageAxis)||size[0]*size[1]*scale*scale>CHAT_WEB_LIMITS.pixels)throw new RangeError(`${label} exceeds the scaled Web extent/canvas budget`);}
function fn<T extends Function>(value:unknown,label:string,required=false):T|undefined{if(value===undefined&&!required)return undefined;if(typeof value!=='function')throw new TypeError(`${label} must be a function`);return value as T;}
function image(value:unknown,label:string,b:Budget):ChatWholeImage{const d=record(value,label);return Object.freeze({src:string(d.src,label+'.src',b,CHAT_WEB_LIMITS.stringUnits,true),naturalSize:pair(d.naturalSize,label+'.naturalSize','pixels'),provenance:string(d.provenance,label+'.provenance',b,1024,true)});}
export function snapshotChatWholeImage(value:ChatWholeImage):ChatWholeImage{return image(value,'Chat image',budget());}
function font(value:unknown,label:string,b:Budget):ChatFontSpec{const d=record(value,label);return Object.freeze({family:string(d.family,label+'.family',b,1024,true),logicalSize:positive(d.logicalSize,label+'.logicalSize',8192),lineHeight:positive(d.lineHeight,label+'.lineHeight',8192)});}
function profile(value:unknown,b:Budget):ChatPresentationProfile{
  const d=record(value,'Chat profile'),fonts=record(d.fonts,'Chat profile.fonts'),gp=record(d.gamepadImages,'Chat profile.gamepadImages'),input=record(d.inputPolicy,'Chat profile.inputPolicy'),labels=record(d.labels,'Chat profile.labels');
  const availableSize=pair(d.availableSize,'Chat profile.availableSize','size'),scale=integer(d.scale,'Chat profile.scale',1,8192);extent(availableSize,scale,'Chat profile');
  const copiedFonts=Object.freeze({chat:font(fonts.chat,'Chat chat font',b),editor:font(fonts.editor,'Chat editor font',b),chrome:font(fonts.chrome,'Chat chrome font',b),smooth:font(fonts.smooth,'Chat smooth font',b)});
  const factor=positive(d.chatFontScaleFactor,'Chat chatFontScaleFactor',8192),linePadding=finite(d.chatLinePadding,'Chat chatLinePadding',-8192,8192);
  for(const [key,f]of Object.entries(copiedFonts))extent([f.logicalSize*(key==='chat'?factor:1),f.lineHeight*(key==='chat'?factor:1)+(key==='chat'?linePadding:0)],scale,'Chat '+key+' font');
  const copiedLabels:Record<string,string>=Object.create(null);for(const [key,v]of Object.entries(labels))copiedLabels[id(key,'Chat localization key',b)]=string(v,'Chat localized label',b,65536);
  const white=record(d.whiteMaterial,'Chat profile.whiteMaterial');if(white.sourceTexture!=='textures/ui/White')throw new RangeError('Chat White material must preserve exact sourceTexture textures/ui/White');
  return Object.freeze({availableSize,scale,fonts:copiedFonts,chatFontScaleFactor:factor,chatLinePadding:linePadding,
    messageLive:member(d.messageLive,['off','polite'],'Chat messageLive'),messageShadow:flag(d.messageShadow,'Chat messageShadow'),
    maxTextEditLength:integer(d.maxTextEditLength,'Chat maxTextEditLength',0,CHAT_WEB_LIMITS.stringUnits),maxLengthPolicy:member(d.maxLengthPolicy,['web-utf16'],'Chat maxLengthPolicy'),
    sourceGeometry:member(d.sourceGeometry,['finite-parent-percent-intrinsic-web-profile'],'Chat sourceGeometry'),labels:Object.freeze(copiedLabels),
    whiteMaterial:Object.freeze({...image(d.whiteMaterial,'Chat White material',b),sourceTexture:'textures/ui/White' as const}),
    gamepadImages:Object.freeze({b:image(gp.b,'Chat gamepad b',b),x:image(gp.x,'Chat gamepad x',b),y:image(gp.y,'Chat gamepad y',b)}),
    inputPolicy:Object.freeze({submit:member(input.submit,['web-enter','host-only'],'Chat submit'),history:member(input.history,['web-arrows','host-only'],'Chat history input'),
      autocomplete:member(input.autocomplete,['host-logical-only'],'Chat autocomplete'),escape:member(input.escape,['topmost-layer'],'Chat escape'),repeat:member(input.repeat,['ignore','accept'],'Chat repeat')})});
}
export function snapshotChatProfile(value:ChatPresentationProfile):ChatPresentationProfile{return profile(value,budget());}
function bindings(value:unknown,b:Budget):ChatBindings{
  const d=record(value,'Chat bindings'),focus=record(d.focus,'Chat focus bindings');return Object.freeze({chatVisible:flag(d.chatVisible,'chatVisible'),titleVisible:flag(d.titleVisible,'titleVisible'),title:string(d.title,'Chat title',b),
    backText:string(d.backText,'Chat backText',b),backAccessibilityText:string(d.backAccessibilityText,'Chat backAccessibilityText',b),editorEnabled:flag(d.editorEnabled,'editorEnabled'),sendEnabled:flag(d.sendEnabled,'sendEnabled'),sendAccessibilityText:string(d.sendAccessibilityText,'Chat sendAccessibilityText',b),
    keyboardButtonVisible:flag(d.keyboardButtonVisible,'keyboardButtonVisible'),keyboardInUse:flag(d.keyboardInUse,'keyboardInUse'),hasNewMessages:flag(d.hasNewMessages,'hasNewMessages'),forceScrollToBottom:flag(d.forceScrollToBottom,'forceScrollToBottom'),
    messageTtsFocusEnabled:flag(d.messageTtsFocusEnabled,'messageTtsFocusEnabled'),gamepadHelperVisible:flag(d.gamepadHelperVisible,'gamepadHelperVisible'),usingGamepad:flag(d.usingGamepad,'usingGamepad'),
    focus:Object.freeze({editorUp:string(focus.editorUp,'editorUp',b,256),editorDown:string(focus.editorDown,'editorDown',b,256),keyboardUp:string(focus.keyboardUp,'keyboardUp',b,256),keyboardDown:string(focus.keyboardDown,'keyboardDown',b,256)})});
}
export function snapshotChatBindings(value:ChatBindings):ChatBindings{return bindings(value,budget());}
function capabilities(value:unknown):ChatCapabilities{const d=record(value,'Chat capabilities');return Object.freeze({sourceProfile:member(d.sourceProfile,['desktop','pocket'],'Chat sourceProfile'),touch:flag(d.touch,'Chat touch'),isPregame:flag(d.isPregame,'Chat isPregame'),educationEdition:flag(d.educationEdition,'Chat educationEdition'),platformIconsVisible:flag(d.platformIconsVisible,'Chat platformIconsVisible')});}
export function snapshotChatCapabilities(value:ChatCapabilities):ChatCapabilities{return capabilities(value);}
function coordinates(value:unknown,b:Budget):ChatCoordinates{const d=record(value,'Chat coordinates');return Object.freeze({visible:flag(d.visible,'coordinate visible'),dropdownLabel:string(d.dropdownLabel,'coordinate dropdownLabel',b),text:string(d.text,'coordinate text',b),copyEnabled:flag(d.copyEnabled,'coordinate copyEnabled'),positionSelected:flag(d.positionSelected,'positionSelected'),facingSelected:flag(d.facingSelected,'facingSelected')});}
export function snapshotChatCoordinates(value:ChatCoordinates):ChatCoordinates{return coordinates(value,budget());}
function messages(value:unknown,maxChildren:100,overflowPolicy:'reject'|'last100-explicit-web',b:Budget):readonly ChatMessageRecord[]{
  if(maxChildren!==100)throw new RangeError('Chat source message factory maxChildren must be100');member(overflowPolicy,['reject','last100-explicit-web'],'Chat transcript overflowPolicy');
  const input=array(value,'Chat messages',CHAT_WEB_LIMITS.array);if(overflowPolicy==='reject'&&input.length>100)throw new RangeError('Chat messages exceed source100-child capacity under reject policy');const ids=new Set<string>();
  const all=input.map((entry,index)=>{item(b,'Chat messages');const d=record(entry,`Chat message[${index}]`),key=id(d.id,'Chat message id',b);if(ids.has(key))throw new RangeError('Duplicate Chat message id');ids.add(key);const text=string(d.text,'Chat message text',b),ttsText=string(d.ttsText,'Chat message ttsText',b);
    let colorRuns:ChatMessageRecord['colorRuns'];if(d.colorRuns!==undefined){const runs=array(d.colorRuns,'Chat message colorRuns',CHAT_WEB_LIMITS.array).map(run=>{item(b,'Chat colorRuns');const r=record(run,'Chat colorRun');return Object.freeze({text:string(r.text,'Chat run text',b),color:color(r.color,'Chat run color',b)});});if(runs.map(r=>r.text).join('')!==text)throw new RangeError('Chat message colorRuns must concatenate exactly to literal text');colorRuns=Object.freeze(runs);}
    return Object.freeze({id:key,text,ttsText,...(colorRuns===undefined?{}:{colorRuns})});});
  return Object.freeze(overflowPolicy==='last100-explicit-web'?all.slice(-100):all);
}
export function snapshotChatMessages(value:readonly ChatMessageRecord[],options:{maxChildren:100;overflowPolicy:'reject'|'last100-explicit-web'}):readonly ChatMessageRecord[]{const d=record(options,'Chat transcript policy');return messages(value,d.maxChildren as 100,d.overflowPolicy as 'reject'|'last100-explicit-web',budget());}
export function snapshotChatGridDimensions(value:ChatSize,count:number,label='Chat grid'):ChatSize{const dims=pair(value,label,'grid');if(integer(count,label+' entry count')>dims[0]*dims[1])throw new RangeError(`${label} entries exceed independent dimensions`);return dims;}
function suggestions(value:unknown,dimensions:ChatSize,b:Budget):readonly ChatSuggestion[]{
  const input=array(value,'Chat suggestions',CHAT_WEB_LIMITS.array);snapshotChatGridDimensions(dimensions,input.length,'Chat suggestion grid');const ids=new Set<string>();
  return Object.freeze(input.map(entry=>{item(b,'Chat suggestions');const d=record(entry,'Chat suggestion'),key=id(d.id,'Chat suggestion id',b),visual=record(d.itemVisual,'Chat itemVisual');if(ids.has(key))throw new RangeError('Duplicate Chat suggestion id');ids.add(key);let itemVisual:ChatSuggestion['itemVisual'];
    if(visual.kind==='none')itemVisual=Object.freeze({kind:'none'});
    else if(visual.kind==='whole-image')itemVisual=Object.freeze({kind:'whole-image',image:image(visual.image,'Chat suggestion whole image',b)});
    else if(visual.kind==='host-item-renderer')itemVisual=Object.freeze({kind:'host-item-renderer',render:fn<Extract<ChatSuggestion['itemVisual'],{kind:'host-item-renderer'}>['render']>(visual.render,'Chat item leaf renderer',true)!});
    else throw new RangeError('Unknown Chat itemVisual kind');
    return Object.freeze({id:key,text:string(d.text,'Chat suggestion text',b),itemIdAux:d.itemIdAux,itemVisual,isSuggestion:flag(d.isSuggestion,'Chat isSuggestion')});}));
}
export function snapshotChatSuggestions(value:readonly ChatSuggestion[],dimensions:ChatSize):readonly ChatSuggestion[]{return suggestions(value,dimensions,budget());}
function slider(value:unknown,label:string,b:Budget):ChatSliderState{const d=record(value,label),min=finite(d.min,label+'.min'),max=finite(d.max,label+'.max');if(max<=min||!Number.isFinite(max-min))throw new RangeError(`${label} requires explicit min<max`);const current=finite(d.value,label+'.value',min,max);return Object.freeze({value:current,enabled:flag(d.enabled,label+'.enabled'),min,max,step:positive(d.step,label+'.step'),steps:integer(d.steps,label+'.steps',0,1048576),label:string(d.label,label+'.label',b),valueText:string(d.valueText,label+'.valueText',b)});}
function colors(value:unknown,label:string,b:Budget):ChatSevenColors{const input=array(value,label,7);if(input.length!==7)throw new RangeError(`${label} requires the seven source choices`);return Object.freeze(input.map(entry=>{const d=record(entry,label+' choice');return Object.freeze({label:string(d.label,label+' label',b),color:color(d.color,label+' color',b),selected:flag(d.selected,label+' selected')});})) as unknown as ChatSevenColors;}
function settings(value:unknown,b:Budget):ChatSettingsState{
  const d=record(value,'Chat settings');let popup:ChatSettingsState['popup']=null;if(d.popup!==null){const p=record(d.popup,'Chat settings popup');popup=Object.freeze({instanceId:id(p.instanceId,'Chat settings popup.instanceId',b),closeButtonVisible:flag(p.closeButtonVisible,'Chat settings popup closeButtonVisible')});}
  const face=(value:unknown,label:string)=>{const f=record(value,label);return Object.freeze({selected:flag(f.selected,label+' selected'),label:string(f.label,label+' label',b)});};
  return Object.freeze({popup,hideChat:flag(d.hideChat,'hideChat'),muteEmotes:flag(d.muteEmotes,'muteEmotes'),tts:flag(d.tts,'tts'),typefaceVisibleAtInstanceCreation:flag(d.typefaceVisibleAtInstanceCreation,'typefaceVisibleAtInstanceCreation'),typefaceEnabled:flag(d.typefaceEnabled,'typefaceEnabled'),typefaceLabel:string(d.typefaceLabel,'typefaceLabel',b),
    mojangles:face(d.mojangles,'Mojangles choice'),notoSans:face(d.notoSans,'NotoSans choice'),fontSize:slider(d.fontSize,'Chat fontSize slider',b),lineSpacing:slider(d.lineSpacing,'Chat lineSpacing slider',b),
    chatColors:colors(d.chatColors,'Chat seven colors',b),mentionsColors:colors(d.mentionsColors,'Mentions seven colors',b),chatColorEnabled:flag(d.chatColorEnabled,'chatColorEnabled'),mentionsColorEnabled:flag(d.mentionsColorEnabled,'mentionsColorEnabled'),chatColorLabel:string(d.chatColorLabel,'chatColorLabel',b),mentionsColorLabel:string(d.mentionsColorLabel,'mentionsColorLabel',b),chatPaintbrushColor:color(d.chatPaintbrushColor,'chatPaintbrushColor',b),mentionsPaintbrushColor:color(d.mentionsPaintbrushColor,'mentionsPaintbrushColor',b)});
}
export function snapshotChatSettings(value:ChatSettingsState):ChatSettingsState{return settings(value,budget());}
function hostEntry(value:unknown,label:string,b:Budget):ChatHostEntry{
  const d=record(value,label),focus=record(d.focus,label+'.focus');return Object.freeze({id:id(d.id,label+'.id',b),text:string(d.text,label+'.text',b),navigation:d.navigation,subCommand:d.subCommand,glyph:d.glyph===null?null:image(d.glyph,label+'.glyph',b),glyphVisible:flag(d.glyphVisible,label+'.glyphVisible'),focusId:string(d.focusId,label+'.focusId',b,256),
    focus:Object.freeze({up:string(focus.up,label+'.up',b,256),down:string(focus.down,label+'.down',b,256),left:string(focus.left,label+'.left',b,256),right:string(focus.right,label+'.right',b,256)}),teleportVisible:flag(d.teleportVisible,label+'.teleportVisible'),toggleSelected:flag(d.toggleSelected,label+'.toggleSelected'),teleportName:string(d.teleportName,label+'.teleportName',b)});
}
function player(value:unknown,label:string,b:Budget,caps:ChatCapabilities,playersVisible:boolean):ChatHostPlayer{
  const d=record(value,label),base=hostEntry(value,label,b),picture=record(d.gamerPicture,label+'.gamerPicture'),platform=record(d.platformIcon,label+'.platformIcon');
  const pictureVisible=flag(picture.visible,label+'.gamerPicture.visible'),platformVisible=flag(platform.visible,label+'.platformIcon.visible');
  // Provided images are ALWAYS validated; only omission is conditional. Opaque
  // filesystem/texture handles are copied without traversal or freezing.
  const pictureImage=picture.image===undefined?undefined:image(picture.image,label+'.gamerPicture.image',b),platformImage=platform.image===undefined?undefined:image(platform.image,label+'.platformIcon.image',b);
  if(playersVisible&&pictureVisible&&!caps.educationEdition&&!pictureImage)throw new TypeError(`${label} effective gamer picture visibility requires a whole image`);
  if(playersVisible&&platformVisible&&caps.platformIconsVisible&&!platformImage)throw new TypeError(`${label} effective platform icon visibility requires a whole image`);
  const gamerPicture=Object.freeze({visible:pictureVisible,...(pictureImage?{image:pictureImage}:{}),...(Object.hasOwn(picture,'nativeFileSystem')?{nativeFileSystem:picture.nativeFileSystem}:{}),...(Object.hasOwn(picture,'nativeTexture')?{nativeTexture:picture.nativeTexture}:{})});
  const platformIcon=Object.freeze({visible:platformVisible,...(platformImage?{image:platformImage}:{})});
  return Object.freeze({...base,gamertag:string(d.gamertag,label+'.gamertag',b),gamerPicture,localPlayerIconVisible:flag(d.localPlayerIconVisible,label+'.localPlayerIconVisible'),platformIcon});
}
function hostGrid<T>(value:unknown,label:string,b:Budget,copy:(v:unknown,label:string,b:Budget)=>T):ChatHostGrid<T>{const d=record(value,label),input=array(d.entries,label+'.entries',CHAT_WEB_LIMITS.array),dimensions=snapshotChatGridDimensions(d.dimensions as ChatSize,input.length,label);const ids=new Set<string>();return Object.freeze({dimensions,entries:Object.freeze(input.map((v,index)=>{item(b,label);const entry=copy(v,`${label}[${index}]`,b),key=(entry as ChatHostEntry).id;if(ids.has(key))throw new RangeError(`${label} duplicate id`);ids.add(key);return entry;}))});}
function host(value:unknown,b:Budget,caps:ChatCapabilities):ChatHostState{const d=record(value,'Chat host'),playersVisible=flag(d.teleportPlayersVisible,'teleportPlayersVisible');
  const dynamicEntry=(visible:unknown)=>(value:unknown,label:string,scope:Budget)=>{const entry=hostEntry(value,label,scope);if(visible===true&&entry.glyphVisible&&entry.glyph===null)throw new TypeError(`${label} effective dynamic subcommand glyph requires a whole image`);return entry;};return Object.freeze({cheatsOn:flag(d.cheatsOn,'cheatsOn'),mainVisible:flag(d.mainVisible,'mainVisible'),teleportMainVisible:flag(d.teleportMainVisible,'teleportMainVisible'),teleportPlayersVisible:flag(d.teleportPlayersVisible,'teleportPlayersVisible'),timeVisible:flag(d.timeVisible,'timeVisible'),weatherVisible:flag(d.weatherVisible,'weatherVisible'),
  main:hostGrid(d.main,'host_main_collection',b,hostEntry),teleport:hostGrid(d.teleport,'host_teleport_collection',b,hostEntry),time:hostGrid(d.time,'host_time_collection',b,dynamicEntry(d.timeVisible)),weather:hostGrid(d.weather,'host_weather_collection',b,dynamicEntry(d.weatherVisible)),players:hostGrid(d.players,'players_collection',b,(v,label,scope)=>player(v,label,scope,caps,playersVisible))});}
export function snapshotChatHost(value:ChatHostState,caps:ChatCapabilities):ChatHostState{return host(value,budget(),capabilities(caps));}
function draft(value:unknown,label:string,b:Budget):ChatDraft{const d=record(value,label),text=string(d.text,label+'.text',b),start=integer(d.selectionStart,label+'.selectionStart',0,text.length),end=integer(d.selectionEnd,label+'.selectionEnd',start,text.length);return Object.freeze({text,selectionStart:start,selectionEnd:end,direction:member(d.direction,['forward','backward','none'],label+'.direction'),revision:id(d.revision,label+'.revision',b)});}
/** Host snapshots/applications may be longer than browser maxLength; no truncation. */
export function snapshotChatDraft(value:ChatDraft):ChatDraft{return draft(value,'Chat draft',budget());}
function history(value:unknown,b:Budget):readonly string[]{return Object.freeze(array(value,'Chat history',CHAT_WEB_LIMITS.array).map((text,index)=>{item(b,'Chat history');return string(text,`Chat history[${index}]`,b);}));}
export function snapshotChatHistory(value:readonly string[]):readonly string[]{return history(value,budget());}
export function validateChatRef<T>(value:Ref<T>|undefined,label='Chat ref'):void{if(value===undefined||value===null||typeof value==='function')return;if(typeof value!=='object')throw new TypeError(`${label} must be a React object/callback ref`);const d=Object.getOwnPropertyDescriptor(value,'current');if(!d||!('value'in d)||!d.writable)throw new TypeError(`${label}.current must be an own writable data property`);}
function refs(value:unknown):ChatRootRefs{const d=record(value,'Chat refs');for(const key of['controllerRef','composerRef','inputRef','messageViewportRef'])validateChatRef(d[key] as Ref<unknown>|undefined,'Chat '+key);return Object.freeze({...(d.controllerRef===undefined?{}:{controllerRef:d.controllerRef as ChatRootRefs['controllerRef']}),...(d.composerRef===undefined?{}:{composerRef:d.composerRef as ChatRootRefs['composerRef']}),...(d.inputRef===undefined?{}:{inputRef:d.inputRef as ChatRootRefs['inputRef']}),...(d.messageViewportRef===undefined?{}:{messageViewportRef:d.messageViewportRef as ChatRootRefs['messageViewportRef']})});}
export function snapshotChatRefs(value:ChatRootRefs):ChatRootRefs{return refs(value);}
function inputProps(value:unknown,b:Budget=budget()):ChatInputProps|undefined{
  if(value===undefined)return undefined;const d=record(value,'Chat inputProps');const copy:Record<string,unknown>=Object.create(null);
  for(const[key,v]of Object.entries(d)){
    if(['children','dangerouslySetInnerHTML','type','value','defaultValue','maxLength','disabled'].includes(key)){if(v!==undefined)throw new TypeError(`Chat inputProps.${key} is reserved`);continue;}
    if(/^on[A-Z]/.test(key)&&v!==undefined&&v!==null&&typeof v!=='function')throw new TypeError(`Chat inputProps.${key} must be a native handler function/null/undefined`);
    if(key==='style'&&v!==undefined){const style=record(v,'Chat input style');for(const item of Object.values(style))if(item!==undefined&&typeof item!=='string'&&(typeof item!=='number'||!Number.isFinite(item)))throw new TypeError('Chat input style requires finite CSS primitive values');for(const[key,value]of Object.entries(style))if(typeof value==='string')style[key]=string(value,'Chat input CSS value',b,65536);copy.style=Object.freeze(style);}
    else if(v===undefined||v===null||['string','number','boolean','function'].includes(typeof v)){if(typeof v==='number'&&!Number.isFinite(v))throw new TypeError('Chat native input number must be finite');copy[key]=typeof v==='string'?string(v,'Chat native input value',b):v;}
    else throw new TypeError(`Chat inputProps.${key} must be a native primitive/function`);
  }
  return Object.freeze(copy) as ChatInputProps;
}
export function snapshotChatInputProps(value:ChatInputProps|undefined):ChatInputProps|undefined{return inputProps(value);}
function draftMode(d:Record<string,unknown>,b:Budget):ChatDraftModeSnapshot{
  if(d.mode==='controlled'){if(d.defaultDraft!==undefined)throw new TypeError('Controlled Chat cannot accept defaultDraft');fn(d.onDraftChange,'Controlled Chat onDraftChange',true);if(d.historyPolicy!=='host-requests')throw new RangeError('Controlled Chat history is host-requests only');return Object.freeze({mode:'controlled',draft:draft(d.draft,'Chat controlled draft',b),historyPolicy:'host-requests'});}
  if(d.mode==='uncontrolled-web'){if(d.draft!==undefined)throw new TypeError('Uncontrolled Chat cannot accept draft');fn(d.onDraftChange,'Chat onDraftChange');return Object.freeze({mode:'uncontrolled-web',defaultDraft:string(d.defaultDraft,'Chat defaultDraft',b),historyPolicy:member(d.historyPolicy,['host-requests','local-oldest-first-web'],'Chat historyPolicy')});}
  throw new RangeError('Chat mode must explicitly select controlled or uncontrolled-web');
}
export function snapshotChatDraftMode(value:Pick<ChatScreenProps,'mode'|'draft'|'defaultDraft'|'onDraftChange'|'historyPolicy'>):ChatDraftModeSnapshot{return draftMode(record(value,'Chat draft mode'),budget());}
export function snapshotChatScreen(value:ChatScreenProps):ChatScreenSnapshot{
  const d=record(value,'Chat Screen'),b=budget();if(d.children!==undefined||d.dangerouslySetInnerHTML!==undefined)throw new TypeError('Chat Screen content is data-driven');
  const cap=capabilities(d.capabilities),copiedProfile=profile(d.profile,b),copiedMessages=messages(d.messages,d.maxChildren as 100,d.overflowPolicy as 'reject'|'last100-explicit-web',b),suggestionDimensions=pair(d.suggestionGridDimensions,'Chat suggestionGridDimensions','grid');
  let toast:ChatScreenSnapshot['toast']=null;if(d.toast!==null){const t=record(d.toast,'Chat toast');toast=Object.freeze({instanceId:id(t.instanceId,'Chat toast.instanceId',b),title:string(t.title,'Chat toast title',b)});}
  return Object.freeze({runKey:id(d.runKey,'Chat runKey',b),open:flag(d.open,'Chat open'),disabled:d.disabled===undefined?false:flag(d.disabled,'Chat disabled'),readOnly:d.readOnly===undefined?false:flag(d.readOnly,'Chat readOnly'),
    messages:copiedMessages,maxChildren:100,overflowPolicy:member(d.overflowPolicy,['reject','last100-explicit-web'],'Chat overflowPolicy'),suggestions:suggestions(d.suggestions,suggestionDimensions,b),suggestionGridDimensions:suggestionDimensions,
    coordinates:coordinates(d.coordinates,b),settings:settings(d.settings,b),host:host(d.host,b,cap),bindings:bindings(d.bindings,b),capabilities:cap,profile:copiedProfile,draftMode:draftMode(d,b),history:history(d.history,b),toast,
    refs:refs({controllerRef:d.controllerRef,composerRef:d.composerRef,inputRef:d.inputRef,messageViewportRef:d.messageViewportRef}),inputProps:inputProps(d.inputProps,b),
    callbacks:Object.freeze({onDraftChange:fn<ChatScreenSnapshot['callbacks']['onDraftChange']&Function>(d.onDraftChange,'Chat onDraftChange'),onAction:fn<ChatScreenSnapshot['callbacks']['onAction']>(d.onAction,'Chat onAction',true)!,onSettingChange:fn<ChatScreenSnapshot['callbacks']['onSettingChange']>(d.onSettingChange,'Chat onSettingChange',true)!,onCoordinateChange:fn<ChatScreenSnapshot['callbacks']['onCoordinateChange']>(d.onCoordinateChange,'Chat onCoordinateChange',true)!,onHostSelectionChange:fn<ChatScreenSnapshot['callbacks']['onHostSelectionChange']>(d.onHostSelectionChange,'Chat onHostSelectionChange',true)!,onCloseRequested:fn<ChatScreenSnapshot['callbacks']['onCloseRequested']>(d.onCloseRequested,'Chat onCloseRequested',true)!,renderText:fn<NonNullable<ChatScreenSnapshot['callbacks']['renderText']>>(d.renderText,'Chat renderText')})});
}
const editorInputs:readonly ChatEditorInput[]=Object.freeze(['button.menu_select','button.menu_ok','button.menu_cancel','button.menu_clear','button.menu_autocomplete','button.menu_autocomplete_back','button.menu_textedit_up','button.menu_textedit_down','button.controller_select','button.controller_start','button.controller_autocomplete','button.controller_autocomplete_back','button.controller_textedit_up','button.controller_textedit_down','button.controller_secondary_select']);
export function snapshotChatEditorCommand(value:ChatEditorCommand):ChatEditorCommand{const d=record(value,'Chat editor command');return Object.freeze({fromButtonId:member(d.fromButtonId,editorInputs,'Chat editor fromButtonId')});}
export function resolveChatDraftApplication(runKey:string,current:ChatDraft,value:ChatDraftApplication):ChatDraftApplicationResult{
  const b=budget(),run=id(runKey,'Chat current runKey',b),old=draft(current,'Chat current draft',b),d=record(value,'Chat draft application'),expectedRunKey=id(d.expectedRunKey,'expectedRunKey',b),expectedRevision=id(d.expectedRevision,'expectedRevision',b),next=draft(d,'Chat applied draft',b);
  if(expectedRunKey!==run)return Object.freeze({accepted:false,reason:'run-key-mismatch'});if(expectedRevision!==old.revision)return Object.freeze({accepted:false,reason:'revision-mismatch'});return Object.freeze({accepted:true,draft:next});
}
export function createChatLocalHistoryState():ChatLocalHistoryState{return Object.freeze({index:null,restoreDraft:null,history:Object.freeze([])});}
function historyState(value:ChatLocalHistoryState,b:Budget):ChatLocalHistoryState{const d=record(value,'Chat local history state'),entries=history(d.history,b);const index=d.index===null?null:integer(d.index,'Chat history index',0,entries.length-1),restoreDraft=d.restoreDraft===null?null:draft(d.restoreDraft,'Chat history restoreDraft',b);if((index===null)!==(restoreDraft===null))throw new TypeError('Chat history active index and restoreDraft must appear together');return Object.freeze({index,restoreDraft,history:entries});}
export function stepChatLocalHistory(value:{history:readonly string[];state:ChatLocalHistoryState;draft:ChatDraft;direction:'previous'|'next';revision:string}):ChatHistoryTransition{
  const d=record(value,'Chat local history request'),b=budget(),entries=history(d.history,b),old=historyState(d.state as ChatLocalHistoryState,b),current=draft(d.draft,'Chat history current draft',b),direction=member(d.direction,['previous','next'],'Chat history direction'),revision=id(d.revision,'Chat history revision',b);
  const same=entries.length===old.history.length&&entries.every((entry,index)=>entry===old.history[index]);let index=same?old.index:null,restore=same?old.restoreDraft:null,base=current;
  if(!same&&old.restoreDraft)base=Object.freeze({...old.restoreDraft,revision});
  const idle=()=>Object.freeze({state:Object.freeze({index:null,restoreDraft:null,history:entries}),draft:base,changed:base!==current});
  if(!entries.length)return idle();if(index===null){if(direction==='next')return idle();restore=base;index=entries.length;}
  const next=direction==='previous'?Math.max(0,index-1):index+1;
  if(next>=entries.length)return Object.freeze({state:Object.freeze({index:null,restoreDraft:null,history:entries}),draft:Object.freeze({...restore!,revision}),changed:true});
  if(next===old.index&&same)return Object.freeze({state:old,draft:current,changed:false});
  const text=entries[next]!;return Object.freeze({state:Object.freeze({index:next,restoreDraft:restore!,history:entries}),draft:Object.freeze({text,selectionStart:text.length,selectionEnd:text.length,direction:'none',revision}),changed:true});
}

/** Exact chat editor mappings, resolving only explicit common.text_edit_box defaults.
 * This table does not invent native DOM/hardware arbitration. */
export const CHAT_EDITOR_MAPPINGS:readonly ChatEditorMapping[]=Object.freeze(([
  {
    "fromButtonId": "button.menu_select",
    "target": "button.text_edit_box_selected",
    "rawTarget": "$text_edit_box_selected_to_button_id",
    "mappingType": "pressed",
    "handleSelect": true,
    "handleDeselect": false
  },
  {
    "fromButtonId": "button.menu_select",
    "target": "button.text_edit_box_selected",
    "rawTarget": "$text_edit_box_selected_to_button_id",
    "mappingType": "global",
    "handleSelect": false,
    "handleDeselect": true,
    "consumeEvent": false
  },
  {
    "fromButtonId": "button.menu_ok",
    "target": "button.text_edit_box_selected",
    "rawTarget": "$text_edit_box_selected_to_button_id",
    "mappingType": "pressed",
    "handleSelect": true,
    "handleDeselect": false
  },
  {
    "fromButtonId": "button.menu_ok",
    "target": "button.text_edit_box_selected",
    "rawTarget": "$text_edit_box_selected_to_button_id",
    "mappingType": "global",
    "handleSelect": false,
    "handleDeselect": false
  },
  {
    "fromButtonId": "button.menu_cancel",
    "target": "button.text_edit_box_deselected",
    "rawTarget": "$text_edit_box_deselected_to_button_id",
    "mappingType": "global",
    "handleSelect": false,
    "handleDeselect": true
  },
  {
    "target": "button.text_edit_box_hovered",
    "rawTarget": "$text_edit_box_hovered_button_id",
    "mappingType": "pressed"
  },
  {
    "fromButtonId": "button.menu_clear",
    "target": "button.text_edit_box_clear",
    "rawTarget": "$text_edit_box_clear_to_button_id",
    "mappingType": "focused",
    "handleSelect": false,
    "handleDeselect": false
  },
  {
    "fromButtonId": "button.menu_autocomplete",
    "target": "button.chat_autocomplete",
    "rawTarget": "button.chat_autocomplete",
    "mappingType": "global",
    "handleSelect": true,
    "handleDeselect": false
  },
  {
    "fromButtonId": "button.menu_autocomplete_back",
    "target": "button.chat_autocomplete_back",
    "rawTarget": "button.chat_autocomplete_back",
    "mappingType": "global",
    "handleSelect": true,
    "handleDeselect": false
  },
  {
    "fromButtonId": "button.menu_textedit_up",
    "target": "button.chat_previous_message",
    "rawTarget": "button.chat_previous_message",
    "mappingType": "focused",
    "handleSelect": true,
    "handleDeselect": false
  },
  {
    "fromButtonId": "button.menu_textedit_down",
    "target": "button.chat_next_message",
    "rawTarget": "button.chat_next_message",
    "mappingType": "focused",
    "handleSelect": true,
    "handleDeselect": false
  },
  {
    "fromButtonId": "button.controller_select",
    "target": "button.send",
    "rawTarget": "button.send",
    "mappingType": "global",
    "handleSelect": false,
    "handleDeselect": false
  },
  {
    "fromButtonId": "button.controller_start",
    "target": "button.send",
    "rawTarget": "button.send",
    "mappingType": "global",
    "handleSelect": false,
    "handleDeselect": false
  },
  {
    "fromButtonId": "button.controller_autocomplete",
    "target": "button.chat_autocomplete",
    "rawTarget": "button.chat_autocomplete",
    "mappingType": "global",
    "handleSelect": false,
    "handleDeselect": false
  },
  {
    "fromButtonId": "button.controller_autocomplete_back",
    "target": "button.chat_autocomplete_back",
    "rawTarget": "button.chat_autocomplete_back",
    "mappingType": "global",
    "handleSelect": false,
    "handleDeselect": false
  },
  {
    "fromButtonId": "button.controller_textedit_up",
    "target": "button.chat_previous_message",
    "rawTarget": "button.chat_previous_message",
    "mappingType": "focused",
    "handleSelect": false,
    "handleDeselect": false
  },
  {
    "fromButtonId": "button.controller_textedit_down",
    "target": "button.chat_next_message",
    "rawTarget": "button.chat_next_message",
    "mappingType": "focused",
    "handleSelect": false,
    "handleDeselect": false
  },
  {
    "fromButtonId": "button.controller_secondary_select",
    "target": "button.chat_paste_coordinates",
    "rawTarget": "button.chat_paste_coordinates",
    "mappingType": "global",
    "handleSelect": true,
    "handleDeselect": false
  }
] as const).map(mapping=>Object.freeze(mapping)));

/** Project React framework props to a plain enumerable data record first; key
 * warning accessors are not part of this data contract. Never invokes callbacks. */
export function snapshotChatComposer(value:ChatComposerProps):ChatComposerSnapshot {
  const d=record(value,'Chat Composer'),b=budget();if(d.children!==undefined||d.dangerouslySetInnerHTML!==undefined)throw new TypeError('Chat Composer content is data-driven');
  validateChatRef(d.inputRef as ChatComposerSnapshot['refs']['inputRef'],'Chat inputRef');validateChatRef(d.composerRef as ChatComposerSnapshot['refs']['composerRef'],'Chat composerRef');
  return Object.freeze({runKey:id(d.runKey,'Chat runKey',b),cheatsOn:flag(d.cheatsOn,'Chat cheatsOn'),disabled:d.disabled===undefined?false:flag(d.disabled,'Chat disabled'),readOnly:d.readOnly===undefined?false:flag(d.readOnly,'Chat readOnly'),
    bindings:bindings(d.bindings,b),capabilities:capabilities(d.capabilities),profile:profile(d.profile,b),draftMode:draftMode(d,b),history:history(d.history,b),inputProps:inputProps(d.inputProps,b),
    refs:Object.freeze({...(d.inputRef===undefined?{}:{inputRef:d.inputRef as ChatComposerSnapshot['refs']['inputRef']}),...(d.composerRef===undefined?{}:{composerRef:d.composerRef as ChatComposerSnapshot['refs']['composerRef']})}),
    callbacks:Object.freeze({onDraftChange:fn<ChatComposerSnapshot['callbacks']['onDraftChange']&Function>(d.onDraftChange,'Chat onDraftChange'),onAction:fn<ChatComposerSnapshot['callbacks']['onAction']>(d.onAction,'Chat Composer onAction',true)!,renderText:fn<NonNullable<ChatComposerSnapshot['callbacks']['renderText']>>(d.renderText,'Chat renderText')})});
}
