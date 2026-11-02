import{useLayoutEffect,useRef,useState}from'react';
import{SettingsFrame,layoutSettingsFrame,SettingsNavigation,SettingsFields,WorldLaunchActions,Checkbox}from'../src';
import type{SettingsFieldsRequest}from'../src';
import{resourcePackAssets}from'../src/resource-pack-assets';
import{settingsDemoLayout,settingsDemoNavigation,settingsDemoRows,settingsDemoTypography}from'./settings-data';

export function SettingsExamples(){
 const[parentWidth,setParentWidth]=useState(520),host=useRef<HTMLDivElement>(null),[popupHost,setPopupHost]=useState<HTMLDivElement|null>(null);
 const[page,setPage]=useState<'game'|'multiplayer'>('game'),[touch,setTouch]=useState(false),[showBar,setShowBar]=useState(true),[disabled,setDisabled]=useState(false);
 const[values,setValues]=useState<Record<string,string|number|boolean|null>>({}),[status,setStatus]=useState('修改字段以查看原始绑定请求。');
 useLayoutEffect(()=>{const node=host.current;if(!node)return;const measure=()=>{const w=Math.floor(node.getBoundingClientRect().width);if(w>80)setParentWidth(Math.min(640,w));};measure();const observer=new ResizeObserver(measure);observer.observe(node);return()=>observer.disconnect();},[]);
 const layout={...settingsDemoLayout(parentWidth,340),inputMode:touch?'touch' as const:'mouse' as const,selectorScrollbarVisible:showBar,contentScrollbarVisible:showBar},geometry=layoutSettingsFrame(layout),navigationWidth=geometry.selector!.contentWidth;
 const request=(detail:SettingsFieldsRequest)=>{setStatus(`${detail.target}${detail.proposedValue===undefined?'':` → ${String(detail.proposedValue)}`}`);if(detail.proposedValue!==undefined)setValues(previous=>({...previous,[detail.target]:detail.proposedValue!,...(detail.target==='#world_game_mode_creative'?{modeLabel:detail.proposedValue?'创造':'生存'}:{})}));};
 return<div ref={host} data-testid="settings-source-demo" style={{display:'grid',gap:16,minWidth:0}}>
  <div style={{display:'flex',flexWrap:'wrap',gap:16}}><Checkbox label="触控滚动分支" checked={touch} onChange={event=>setTouch(event.target.checked)}/><Checkbox label="显示滚动条" checked={showBar} onChange={event=>setShowBar(event.target.checked)}/><Checkbox label="禁用控件" checked={disabled} onChange={event=>setDisabled(event.target.checked)}/></div>
  <SettingsFrame label="原版设置部件示例" layout={layout} background={{src:resourcePackAssets['textures/ui/White'].url,sourceSize:[2,2],resolution:'host-resolved'}} font={settingsDemoTypography.control} titleFont={settingsDemoTypography.control} titleShadow={false} titleVerticalAlignment="center" dialogTitleAlignment="left" dialogTitle="创建世界" sectionTitle={page==='game'?'游戏设置':'多人游戏设置'} back={{visible:true,enabled:true,label:'返回',box:[4,1,16,16],paintBox:[0,0,16,16],glyphOffset:[6,4]}} disabled={disabled}
    selectorScrollLabel="导航滚动区" contentScrollLabel="设置滚动区" popupHostRef={setPopupHost} onRequest={detail=>setStatus(detail.target)}
    selectorContent={<><WorldLaunchActions width={navigationWidth} scale={1} font={settingsDemoTypography.control} hiddenSlots="collapse" disabled={disabled} model={{edition:'bedrock',mode:'create',pregame:true,editor:false,primary:{label:'创建',enabled:true,labelMaxHeight:20},realms:{label:'Realms',enabled:true,visible:true,labelMaxHeight:25}}} onAction={detail=>setStatus(detail.target)}/><div style={{height:8}}/><SettingsNavigation label="世界设置导航" width={navigationWidth} scale={1} font={settingsDemoTypography.control} items={settingsDemoNavigation()} value={page} sourceDefaultIndex={0} toggleOnHover={false} hoverPolicy="activation-only" hiddenSlots="collapse" disabled={disabled} onValueChange={next=>setPage(next as typeof page)}/></>}
    content={<SettingsFields width={geometry.content.contentWidth} scale={1} typography={settingsDemoTypography} rows={settingsDemoRows(values,page,geometry.content.contentWidth)} hiddenSlots="collapse" popupHost={popupHost} disabled={disabled} onRequest={request}/>}/>
  <output aria-live="polite">{status}</output>
  <p style={{margin:0}}>这里展示真实设置框架、导航和字段部件。示例的字体、尺寸预算与值由宿主明确提供；完整世界设置的命名快照仍在组装。</p>
 </div>;
}
