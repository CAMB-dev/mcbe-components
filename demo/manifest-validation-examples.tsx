import {useState} from 'react';
import {Button,Combobox,Switch} from '../src';
import {ManifestValidationScreen} from '../src/manifest-validation-screen';
import {ManifestValidationButton,ManifestPackSummary,ManifestValidationIssue,ManifestValidationIssues,ManifestValidationContent} from '../src/manifest-validation-parts';
import type {ManifestValidationActionDetail,ManifestValidationButtonProps} from '../src/manifest-validation-parts';
import {createManifestValidationDemoProps} from './manifest-validation-data';
import '../src/manifest-validation-screen.css';
import '../src/manifest-validation-parts.css';

const variants:ManifestValidationButtonProps['variant'][]=['copy','delete-text','refresh-text','delete-icon','refresh-icon'];
/** All records are supplied host snapshots. This gallery does not scan packs,
 * delete files or write the clipboard when a source request is received. */
export function ManifestValidationExamples(){
  const [open,setOpen]=useState(false),[scale,setScale]=useState(2),[frame,setFrame]=useState(0),[touch,setTouch]=useState(false);
  const [isWorking,setWorking]=useState(false),[isDeleting,setDeleting]=useState(false),[isDoneValidating,setDone]=useState(true),[hasErrorsOrWarnings,setErrors]=useState(true);
  const [showSize,setSize]=useState(true),[showRefresh,setRefresh]=useState(true),[showDelete,setDelete]=useState(true),[disabled,setDisabled]=useState(false),[readOnly,setReadOnly]=useState(false),[accept,setAccept]=useState(true);
  const [part,setPart]=useState('summary'),[status,setStatus]=useState('操作仅记录宿主请求，不执行资源包扫描、删除或复制。');
  const base=createManifestValidationDemoProps(),state={isWorking,isDeleting,isDoneValidating},summary={...base.content.summary,visibility:{size:showSize,refresh:showRefresh,delete:showDelete}};
  const onAction=(detail:ManifestValidationActionDetail)=>{setStatus(`${accept?'收到':'宿主拒绝'} ${detail.target}${detail.issue?` · ${detail.issue.id}`:''}；未执行服务。`);return accept?undefined:false;};
  const common={identity:base.content.identity,state,scale,disabled,readOnly,loadingFrame:frame,lowMemoryDevice:false,onAction};
  const content={...base.content,...common,inputMode:touch?'touch' as const:'mouse' as const,summary,hasErrorsOrWarnings};
  const issue={...common,width:332,entry:base.content.entries[0]!,hasErrorsOrWarnings,issueLabel:base.content.issueLabel,copyLabel:'Copy issue'};
  return <div className="mc-manifest-demo" style={{minWidth:0,display:'grid',gridTemplateColumns:'minmax(0,1fr)',gap:16}}>
    <style>{'.mc-manifest-demo .mc-field{max-width:100%;min-width:0}.mc-manifest-demo .mc-switch-row{max-width:100%;min-width:0}.mc-manifest-demo .mc-switch-row>.mc-choice__text{min-width:0;overflow-wrap:anywhere}.mc-manifest-demo__stage{max-width:100%;min-width:0;overflow:auto;scrollbar-width:none}.mc-manifest-demo__stage::-webkit-scrollbar{display:none}.mc-manifest-demo output{overflow-wrap:anywhere}'}</style>
    <p>Classic 验证报告 · 源绑定彼此独立。高度与文字宽度为显式宿主预算；原生引擎字体、服务与动画时钟尚未认证。</p>
    <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'end'}}>
      <Combobox label="GUI 比例" value={String(scale)} options={[1,2,3].map(value=>({value:String(value),label:String(value)}))} onValueChange={value=>setScale(Number(value))}/>
      <Combobox label="显式加载帧（无时钟）" value={String(frame)} options={Array.from({length:10},(_,value)=>({value:String(value),label:String(value)}))} onValueChange={value=>setFrame(Number(value))}/>
      <Switch label="isWorking" checked={isWorking} onChange={event=>setWorking(event.currentTarget.checked)}/><Switch label="isDeleting" checked={isDeleting} onChange={event=>setDeleting(event.currentTarget.checked)}/><Switch label="isDoneValidating" checked={isDoneValidating} onChange={event=>setDone(event.currentTarget.checked)}/>
      <Switch label="全局 hasErrorsOrWarnings" checked={hasErrorsOrWarnings} onChange={event=>setErrors(event.currentTarget.checked)}/><Switch label="显示尺寸" checked={showSize} onChange={event=>setSize(event.currentTarget.checked)}/><Switch label="显示刷新" checked={showRefresh} onChange={event=>setRefresh(event.currentTarget.checked)}/><Switch label="显示删除" checked={showDelete} onChange={event=>setDelete(event.currentTarget.checked)}/>
      <Switch label="触控内容" checked={touch} onChange={event=>setTouch(event.currentTarget.checked)}/><Switch label="禁用" checked={disabled} onChange={event=>setDisabled(event.currentTarget.checked)}/><Switch label="只读" checked={readOnly} onChange={event=>setReadOnly(event.currentTarget.checked)}/><Switch label="宿主接受请求" checked={accept} onChange={event=>setAccept(event.currentTarget.checked)}/>
    </div>
    <Button onClick={()=>setOpen(true)}>打开验证报告</Button>
    <div className="mc-manifest-demo__stage"><ManifestValidationScreen {...base} open={open} scale={scale} disabled={disabled} readOnly={readOnly} content={content} onCloseRequest={()=>{setStatus(accept?'收到关闭报告请求。':'宿主拒绝关闭请求。');if(accept)setOpen(false);return accept?undefined:false;}}/></div>
    <p>独立按钮定义（默认报告不会实例化图标删除、图标刷新或其加载条）：</p>
    <div className="mc-manifest-demo__stage" style={{display:'flex',gap:12,alignItems:'center'}}>{variants.map(variant=>{const shared={identity:common.identity,state,scale,disabled,readOnly,loadingFrame:frame,onAction,key:variant,label:variant};return variant==='copy'?<ManifestValidationButton {...shared} variant="copy" issue={{id:'standalone-issue',index:0,collection:'pack_errors'}}/>:variant==='delete-text'||variant==='refresh-text'?<ManifestValidationButton {...shared} variant={variant} width={80}/>:<ManifestValidationButton {...shared} variant={variant}/>;})}</div>
    <Combobox label="独立可复用部件" value={part} options={[['summary','包摘要'],['issue','单条问题'],['issues','问题集合'],['content','滚动内容']].map(([value,label])=>({value:value!,label:label!}))} onValueChange={setPart}/>
    <div className="mc-manifest-demo__stage">
      {part==='summary'&&<ManifestPackSummary {...common} width={332} data={summary}/>}
      {part==='issue'&&<ManifestValidationIssue {...issue}/>}
      {part==='issues'&&<ManifestValidationIssues {...common} width={332} entries={base.content.entries} capacity={base.content.capacity} hasErrorsOrWarnings={hasErrorsOrWarnings} issueLabel={base.content.issueLabel} copyLabel="Copy issue"/>}
      {part==='content'&&<ManifestValidationContent {...content} size={[354,219]}/>}
    </div>
    <output aria-live="polite">{status}</output>
  </div>;
}
