import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Checkbox } from '../src/components';
import { ChatScreen } from '../src/chat-screen';
import { ChatComposer } from '../src/chat-composer';
import { ChatTranscript } from '../src/chat-transcript';
import type { ChatActionDetail, ChatComposerHandle, ChatDraft, ChatMessageRecord, ChatSettingChange, ChatSettingsState } from '../src/chat-types';
import { chatDemoCapabilities, createChatDemoBindings, createChatDemoCoordinates, createChatDemoHost, createChatDemoProfile, createChatDemoSettings } from './chat-demo-data';
import '../src/fonts.css';
import '../src/chat-screen.css';
import './chat-demo.css';

const seedMessages: readonly ChatMessageRecord[] = [{id:'welcome',text:'欢迎来到方块世界！',ttsText:'欢迎来到方块世界！'}, {id:'alex',text:'<Alex> 一起出发吧。',ttsText:'Alex：一起出发吧。'}];
const closedPanes = {mainVisible:false,teleportMainVisible:false,teleportPlayersVisible:false,timeVisible:false,weatherVisible:false};

export function ChatDemo() {
  const hostNode=useRef<HTMLDivElement>(null),composer=useRef<ChatComposerHandle>(null),sequence=useRef(0),popupSequence=useRef(0);
  const [hostWidth,setHostWidth]=useState(0),[fontsReady,setFontsReady]=useState(false),[fontError,setFontError]=useState('');
  const [open,setOpen]=useState(false),[disabled,setDisabled]=useState(false),[readOnly,setReadOnly]=useState(false);
  const [messages,setMessages]=useState(seedMessages),[history,setHistory]=useState<readonly string[]>([]);
  const [draft,setDraft]=useState<ChatDraft>({text:'',selectionStart:0,selectionEnd:0,direction:'none',revision:'demo-initial'});
  const [settings,setSettings]=useState(createChatDemoSettings),[coordinates,setCoordinates]=useState(createChatDemoCoordinates),[host,setHost]=useState(createChatDemoHost);
  const [status,setStatus]=useState('打开聊天，或试试下方可独立使用的输入框。');
  useEffect(()=>{const node=hostNode.current,view=node?.ownerDocument.defaultView;if(!node||!view)return;const measure=()=>setHostWidth(node.clientWidth);measure();const observer=new view.ResizeObserver(measure);observer.observe(node);return()=>observer.disconnect();},[]);
  useEffect(()=>{let live=true;const fonts=hostNode.current?.ownerDocument.fonts;if(!fonts){setFontError('浏览器无法加载字体。');return;}
    Promise.all([fonts.load('12px "MCBE Pixel"','Chat 123'),fonts.load('12px "MCBE CJK"','聊天设置消息')]).then(results=>{
      if(!live)return;if(results.some(faces=>faces.length===0))throw Error('Bundled font face unavailable');setFontsReady(true);
    }).catch(()=>{if(live)setFontError('像素字体加载失败，请刷新页面重试。');});return()=>{live=false;};},[]);
  const scale=hostWidth>=840?2:1,width=Math.max(280,Math.min(520,Math.floor((hostWidth||520)/scale))),height=300;
  const profile=useMemo(()=>createChatDemoProfile(width,height,scale,settings),[width,scale,settings]);
  const bindings=useMemo(()=>({...createChatDemoBindings(),chatVisible:!settings.hideChat,messageTtsFocusEnabled:settings.tts}),[settings.hideChat,settings.tts]);
  const replaceDraft=(text:string)=>setDraft({text,selectionStart:text.length,selectionEnd:text.length,direction:'none',revision:'demo-host-'+ ++sequence.current});
  const append=(text:string)=>{const next={id:'demo-message-'+ ++sequence.current,text,ttsText:text};setMessages(previous=>[...previous,next].slice(-100));};
  const send=(text:string)=>{append('<You> '+text);setHistory(previous=>[...previous,text].slice(-100));replaceDraft('');setStatus('消息已添加到预览。');};
  const selectPane=(pane:'main'|'teleport'|'players'|'time'|'weather')=>setHost(previous=>({...previous,...closedPanes,
    mainVisible:pane==='main',teleportMainVisible:pane==='teleport'||pane==='players',teleportPlayersVisible:pane==='players',timeVisible:pane==='time',weatherVisible:pane==='weather'}));
  const action=(detail:ChatActionDetail)=>{
    switch(detail.target){
      case'button.send':send(detail.rawDraft.text);break;
      case'button.open_chat_settings':setSettings(previous=>({...previous,popup:{instanceId:'demo-popup-'+ ++popupSequence.current,closeButtonVisible:true}}));break;
      case'button.close_chat_settings':setSettings(previous=>({...previous,popup:null}));break;
      case'button.reset_chat_settings':setSettings(previous=>({...createChatDemoSettings(),popup:previous.popup}));break;
      case'button.host_toggle':if(host.mainVisible||host.teleportMainVisible||host.timeVisible||host.weatherVisible)setHost(previous=>({...previous,...closedPanes}));else selectPane('main');break;
      case'button.host_main':selectPane('main');break;
      case'button.menu_navigation':if(detail.hostEntry?.id==='teleport')selectPane('teleport');else if(detail.hostEntry?.id==='time')selectPane('time');else if(detail.hostEntry?.id==='weather')selectPane('weather');break;
      case'button.sub_command':setStatus('已选择：'+String(detail.hostEntry?.subCommand??''));if(detail.hostEntry?.collection==='players_collection')setHost(previous=>({...previous,teleportPlayersVisible:false}));break;
      case'button.teleport_clear':setHost(previous=>({...previous,teleportPlayersVisible:false}));break;
      case'button.click_autocomplete':replaceDraft(detail.suggestion?.id==='help'?'/help ':'/time ');break;
      case'button.chat_autocomplete':case'button.chat_autocomplete_back':replaceDraft('/help ');break;
      case'paste_button':case'button.chat_paste_coordinates':replaceDraft(detail.rawDraft.text+detail.coordinatesText);break;
      case'copy_coordinates_button':setStatus('坐标：'+detail.coordinatesText);break;
      case'button.keyboard_toggle':composer.current?.focusEditor();break;
    }
  };
  const changeSetting=(change:ChatSettingChange)=>setSettings(previous=>{
    if(change.kind==='boolean')return {...previous,[change.field==='hide_chat'?'hideChat':change.field==='toggle_emote_chat'?'muteEmotes':'tts']:change.value};
    if(change.kind==='slider'){const key=change.field==='chat_font_size'?'fontSize':'lineSpacing';return {...previous,[key]:{...previous[key],value:change.value,valueText:String(change.value)}};}
    if(change.kind==='typeface'){const pixel=change.field==='typeface_radio_mojangles';return {...previous,mojangles:{...previous.mojangles,selected:pixel},notoSans:{...previous.notoSans,selected:!pixel},typefaceLabel:pixel?'像素字体':'系统无衬线'};}
    const key=change.field==='chat'?'chatColors':'mentionsColors',colors=previous[key].map((color,index)=>({...color,selected:index===change.index})) as unknown as ChatSettingsState[typeof key],chosen=colors[change.index];
    return {...previous,[key]:colors,[change.field==='chat'?'chatColorLabel':'mentionsColorLabel']:chosen.label,[change.field==='chat'?'chatPaintbrushColor':'mentionsPaintbrushColor']:chosen.color};
  });
  const standaloneProfile=useMemo(()=>({...profile,scale:1,availableSize:[width,180] as const}),[profile,width]);
  const displayMessages=useMemo(()=>messages.map(message=>({...message,colorRuns:[{text:message.text,color:settings.chatColors.find(color=>color.selected)?.color??'#ffffff'}]})),[messages,settings.chatColors]);
  return <div className="chat-demo" data-demo-chat="preview">
    <div className="chat-demo__controls"><Button data-testid="chat-demo-open" disabled={!fontsReady||disabled} onClick={()=>{setOpen(true);setStatus('按 Escape 返回，或打开聊天设置。');}}>打开聊天</Button>
      <Button disabled={!fontsReady} onClick={()=>append('<Alex> 新的冒险开始了。')}>添加消息</Button>
      <Checkbox label="只读" checked={readOnly} onChange={event=>setReadOnly(event.currentTarget.checked)}/><Checkbox label="禁用交互" checked={disabled} onChange={event=>setDisabled(event.currentTarget.checked)}/></div>
    {fontError&&<p className="chat-demo__font-error" role="alert">{fontError}</p>}
    <div className="chat-demo__host" data-testid="chat-demo-stage" ref={hostNode}>
      {!open&&<p className="chat-demo__empty">{fontsReady?'聊天与命令':'正在加载像素字体…'}</p>}
      {fontsReady&&<ChatScreen data-testid="chat-demo-screen" runKey="chat-demo-screen" open={open} mode="controlled" draft={draft} onDraftChange={setDraft} historyPolicy="host-requests" history={history}
        messages={displayMessages} maxChildren={100} overflowPolicy="reject" suggestions={draft.text.startsWith('/')?[{id:'help',text:'/help',itemIdAux:null,itemVisual:{kind:'none'},isSuggestion:true},{id:'time',text:'/time',itemIdAux:null,itemVisual:{kind:'none'},isSuggestion:true}]:[]} suggestionGridDimensions={[1,draft.text.startsWith('/')?2:0]}
        coordinates={coordinates} settings={settings} host={host} bindings={bindings} capabilities={chatDemoCapabilities} profile={profile} disabled={disabled} readOnly={readOnly} composerRef={composer}
        inputProps={{'aria-label':'聊天消息',placeholder:'输入消息或命令'}} onAction={action} onSettingChange={changeSetting}
        onCoordinateChange={(field,value)=>setCoordinates(previous=>({...previous,[field==='coordinate_type_position'?'positionSelected':'facingSelected']:value,dropdownLabel:field==='coordinate_type_position'?'我的位置':'朝向方块',text:field==='coordinate_type_position'?'12, 64, -3':'13, 64, -3'}))}
        onHostSelectionChange={detail=>{setHost(previous=>({...previous,teleportPlayersVisible:true,teleport:{...previous.teleport,entries:previous.teleport.entries.map(entry=>({...entry,toggleSelected:entry.id===detail.id&&detail.selected}))}}));}}
        onCloseRequested={()=>{setOpen(false);setSettings(previous=>({...previous,popup:null}));setStatus('聊天已关闭。');}} toast={null}/>}</div>
    <p className="chat-demo__status" role="status" aria-live="polite">{status}</p>
    {fontsReady&&<div className="chat-demo__parts"><h3>聊天记录</h3><div className="chat-demo__transcript" style={{width}}><ChatTranscript data-testid="chat-demo-transcript" runKey="chat-demo-transcript" messages={displayMessages} bindings={bindings} profile={standaloneProfile} maxChildren={100} overflowPolicy="reject"/></div>
      <h3>独立消息输入框</h3><div className="chat-demo__composer"><ChatComposer data-testid="chat-demo-composer" runKey="chat-demo-composer" mode="uncontrolled-web" defaultDraft="" historyPolicy="local-oldest-first-web" history={history} cheatsOn={false} bindings={bindings} capabilities={chatDemoCapabilities} profile={standaloneProfile} inputProps={{'aria-label':'独立消息输入框',placeholder:'输入一条消息'}} disabled={disabled} readOnly={readOnly}
        onAction={detail=>{if(detail.target==='button.send')append('<Preview> '+detail.rawDraft.text);else if(detail.target==='button.open_chat_settings'){setOpen(true);setSettings(previous=>({...previous,popup:{instanceId:'demo-popup-'+ ++popupSequence.current,closeButtonVisible:true}}));}}}/></div></div>}
  </div>;
}
