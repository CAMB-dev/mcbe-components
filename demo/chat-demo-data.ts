import type { ChatBindings, ChatCapabilities, ChatCoordinates, ChatHostEntry, ChatHostState, ChatPresentationProfile, ChatSettingsState, ChatSevenColors } from '../src/chat-types';

export const chatDemoPixelFamily = '"MCBE Pixel", "MCBE CJK", monospace';
const image = (src: string, naturalSize: readonly [number, number]) => ({ src, naturalSize, provenance: 'Whole original fixed Bedrock archive; explicit demo host material mapping' });
const white = new URL('./assets/chat/white.png', import.meta.url).href;
const b = new URL('./assets/chat/xbox_face_button_right.png', import.meta.url).href;
const x = new URL('./assets/chat/xbox_face_button_left.png', import.meta.url).href;
const y = new URL('./assets/chat/xbox_face_button_up.png', import.meta.url).href;

export function createChatDemoProfile(width: number, height: number, scale: number, settings: ChatSettingsState): ChatPresentationProfile {
  const family = settings.notoSans.selected ? 'sans-serif' : chatDemoPixelFamily;
  const font = { family, logicalSize: settings.fontSize.value, lineHeight: settings.fontSize.value + 2 };
  return { availableSize:[width,height], scale, fonts:{chat:font, editor:font, chrome:{family:chatDemoPixelFamily,logicalSize:10,lineHeight:12}, smooth:{family:'sans-serif',logicalSize:10,lineHeight:12}},
    chatFontScaleFactor:1,chatLinePadding:settings.lineSpacing.value,messageLive:'polite',messageShadow:false,maxTextEditLength:256,
    maxLengthPolicy:'web-utf16',sourceGeometry:'finite-parent-percent-intrinsic-web-profile',
    // Source literal White is unresolved; the demo explicitly chooses whole lowercase white.png.
    whiteMaterial:{...image(white,[15,15]),sourceTexture:'textures/ui/White'},gamepadImages:{b:image(b,[26,26]),x:image(x,[26,26]),y:image(y,[26,26])},
    inputPolicy:{submit:'web-enter',history:'host-only',autocomplete:'host-logical-only',escape:'topmost-layer',repeat:'ignore'},
    labels:{'chat.settings':'聊天设置','chat.settings.muteAll':'隐藏聊天','chat.settings.muteEmotes':'隐藏表情','chat.settings.tts':'文本转语音',
      'chat.settings.font':'字体','chat.settings.chatColor':'聊天颜色','chat.settings.mentionsColor':'提及颜色','options.resetSettings':'重置设置',
      'accessibility.button.close':'关闭','accessibility.chat.tts.keyboard':'键盘','accessibility.chat.tts.textboxTitle':'消息',
      'chat.newMessages':'新消息','chat.coordinateTypePosition':'我的位置','chat.coordinateTypeFacing':'朝向方块','copy_coordinates_button':'复制坐标','paste_button':'粘贴坐标',
      'chat_coordinate_dropdown':'坐标类型','hostOption.teleport':'传送','hostOption.time':'时间','hostOption.weather':'天气','permissions.slashcommand':'/' } };
}
export function createChatDemoBindings(): ChatBindings {
  return {chatVisible:true,titleVisible:true,title:'聊天与命令',backText:'返回',backAccessibilityText:'返回，关闭聊天',editorEnabled:true,sendEnabled:true,sendAccessibilityText:'发送消息',
    keyboardButtonVisible:true,keyboardInUse:false,hasNewMessages:false,forceScrollToBottom:false,messageTtsFocusEnabled:false,gamepadHelperVisible:false,usingGamepad:false,
    focus:{editorUp:'coordinate_dropdown_focus_id',editorDown:'',keyboardUp:'',keyboardDown:''}};
}
export const chatDemoCapabilities: ChatCapabilities = {sourceProfile:'desktop',touch:false,isPregame:false,educationEdition:false,platformIconsVisible:false};
export function createChatDemoCoordinates(): ChatCoordinates { return {visible:true,dropdownLabel:'我的位置',text:'12, 64, -3',copyEnabled:true,positionSelected:true,facingSelected:false}; }
export function createChatDemoColors(): ChatSevenColors {
  return [{label:'白色',color:'#ffffff',selected:true},{label:'红色',color:'#ff5555',selected:false},{label:'绿色',color:'#55ff55',selected:false},
    {label:'蓝色',color:'#5555ff',selected:false},{label:'黄色',color:'#ffff55',selected:false},{label:'紫色',color:'#aa00aa',selected:false},{label:'灰色',color:'#aaaaaa',selected:false}];
}
export function createChatDemoSettings(): ChatSettingsState {
  return {popup:null,hideChat:false,muteEmotes:false,tts:false,typefaceVisibleAtInstanceCreation:true,typefaceEnabled:true,typefaceLabel:'像素字体',
    mojangles:{selected:true,label:'像素字体'},notoSans:{selected:false,label:'系统无衬线'},
    fontSize:{value:12,enabled:true,min:8,max:20,step:1,steps:12,label:'字体大小',valueText:'12'},lineSpacing:{value:0,enabled:true,min:0,max:8,step:1,steps:8,label:'行距',valueText:'0'},
    chatColors:createChatDemoColors(),mentionsColors:createChatDemoColors(),chatColorEnabled:true,mentionsColorEnabled:true,chatColorLabel:'白色',mentionsColorLabel:'白色',chatPaintbrushColor:'#ffffff',mentionsPaintbrushColor:'#ffffff'};
}
function entry(id:string,text:string): ChatHostEntry {
  // Dynamic command art is host-provided. No whole image means no visible glyph.
  return {id,text,navigation:id,subCommand:id,glyph:null,glyphVisible:false,focusId:'demo-'+id,focus:{up:'',down:'',left:'',right:''},teleportVisible:false,toggleSelected:false,teleportName:text};
}
export function createChatDemoHost(): ChatHostState {
  return {cheatsOn:true,mainVisible:false,teleportMainVisible:false,teleportPlayersVisible:false,timeVisible:false,weatherVisible:false,
    main:{dimensions:[1,3],entries:[entry('teleport','传送'),entry('time','时间'),entry('weather','天气')]},
    teleport:{dimensions:[1,2],entries:[{...entry('who','传送谁'),teleportVisible:true},{...entry('where','传送到'),teleportVisible:true}]},
    time:{dimensions:[1,4],entries:[entry('day','白天'),entry('noon','正午'),entry('night','夜晚'),entry('midnight','午夜')]},
    weather:{dimensions:[1,3],entries:[entry('clear','晴朗'),entry('rain','下雨'),entry('thunder','雷暴')]},
    players:{dimensions:[1,2],entries:['Alex','Steve'].map(name=>({...entry(name,name),gamertag:name,gamerPicture:{visible:false},localPlayerIconVisible:false,platformIcon:{visible:false}}))}};
}
