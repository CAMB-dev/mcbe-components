import {useLayoutEffect,useRef,useState} from 'react';
import {Checkbox,Combobox,WorldLaunchActions,WorldSettingsActionButton} from '../src';
import type {WorldLaunchModel,WorldSettingsMode} from '../src';

export function WorldSettingsActionsExamples(){
  const [edition,setEdition]=useState<'bedrock'|'education'>('bedrock'),[mode,setMode]=useState<WorldSettingsMode>('create');
  const [editor,setEditor]=useState(false),[visible,setVisible]=useState(true),[disabled,setDisabled]=useState(false);
  const [status,setStatus]=useState('选择操作以查看源请求。'),[width,setWidth]=useState(260),host=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{const node=host.current;if(!node)return;const measure=()=>{const w=Math.floor(node.getBoundingClientRect().width);if(w>4)setWidth(Math.min(260,w));};measure();const observer=new ResizeObserver(measure);observer.observe(node);return()=>observer.disconnect();},[]);
  const edit=mode==='edit',font={family:'var(--mc-font, monospace)',size:10,lineHeight:10};
  const model:WorldLaunchModel=edition==='bedrock'?{edition,mode,pregame:true,editor,primary:{label:edit?(editor?'游玩项目':'游玩'):'创建',enabled:true,labelMaxHeight:20},realms:{label:edit?'在 Realms 上游玩':'在 Realms 上创建',enabled:true,visible,labelMaxHeight:25}}:
    {edition,mode,pregame:true,play:{label:edit?'游玩':'创建',enabled:true,labelMaxHeight:10},host:{label:'主持',enabled:true,labelMaxHeight:10}};
  return <div ref={host} data-testid="world-settings-actions-demo" style={{display:'grid',gap:16,minWidth:0}}>
    <div style={{display:'flex',flexWrap:'wrap',gap:16}}>
      <Combobox label="世界设置版本" value={edition} options={[{value:'bedrock',label:'Bedrock'},{value:'education',label:'Education'}]} onValueChange={value=>setEdition(value as typeof edition)}/>
      <Combobox label="世界设置模式" value={mode} options={[{value:'create',label:'创建世界'},{value:'template-create',label:'从模板创建'},{value:'edit',label:'编辑世界'}]} onValueChange={value=>setMode(value as WorldSettingsMode)}/>
      <Checkbox label="编辑器模式" checked={editor} disabled={edition==='education'} onChange={event=>setEditor(event.target.checked)}/>
      <Checkbox label="显示 Realms" checked={visible} disabled={edition==='education'||editor} onChange={event=>setVisible(event.target.checked)}/>
      <Checkbox label="禁用操作" checked={disabled} onChange={event=>setDisabled(event.target.checked)}/>
    </div>
    <WorldLaunchActions aria-label="启动世界操作" width={width} scale={1} font={font} model={model} hiddenSlots="collapse" disabled={disabled}
      onAction={detail=>setStatus(`${detail.target}${detail.shouldHost===undefined?'':` · should_host=${detail.shouldHost}`}`)}/>
    <WorldSettingsActionButton size={[width,30]} scale={1} font={font} tone="light" label="复制世界" labelMaxHeight={10} target="copy_world_button" disabled={disabled} onAction={detail=>setStatus(detail.target)}/>
    <output aria-live="polite">{status}</output>
    <p style={{margin:0}}>原版世界设置的可复用操作区。创建、连接和文件操作由宿主处理；完整设置框架与字段尚在接入。</p>
  </div>;
}
