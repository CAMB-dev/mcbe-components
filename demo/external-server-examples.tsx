import {useEffect,useRef,useState} from 'react';
import {Button,Combobox,Switch,ExternalServerForm,ExternalServerField} from '../src';
import type {ExternalServerAction,ExternalServerBindings,ExternalServerLabels,ExternalServerValues} from '../src';
import '../src/external-server-form.css';

const initial:ExternalServerValues={name:'示例',address:'play.example.invalid',port:'19132'};
const labels:ExternalServerLabels={name:'服务器名称',address:'服务器地址',port:'端口',play:'连接',save:'保存',remove:'删除',close:'关闭服务器表单'};

export function ExternalServerExamples(){
  const host=useRef<HTMLDivElement>(null),openButton=useRef<HTMLButtonElement>(null);
  const[available,setAvailable]=useState(0),[mode,setMode]=useState<'add'|'edit'>('add'),[values,setValues]=useState<ExternalServerValues>({...initial});
  const[readOnly,setReadOnly]=useState(false),[disabled,setDisabled]=useState(false),[formOpen,setFormOpen]=useState(true),[standalonePort,setStandalonePort]=useState('19132');
  const[saved,setSaved]=useState<ExternalServerValues|null>(null),[status,setStatus]=useState('编辑示例服务器，或切换添加与编辑模式。');
  useEffect(()=>{const node=host.current,view=node?.ownerDocument.defaultView;if(!node||!view)return;const measure=()=>setAvailable(node.clientWidth);measure();const observer=new view.ResizeObserver(measure);observer.observe(node);return()=>observer.disconnect();},[]);
  useEffect(()=>{if(!formOpen)openButton.current?.focus({preventScroll:true});},[formOpen]);
  const scale=available>=632?2:1,width=Math.min(316,Math.max(28,Math.floor((available||316)/scale)));
  // This demo host owns this validation choice; the library accepts independent
  // booleans and never rewrites, trims or parses the controlled string values.
  const valid=values.name.trim().length>0&&values.address.trim().length>0&&/^\d{1,6}$/.test(values.port)&&Number(values.port)>=1&&Number(values.port)<=65535;
  const bindings:ExternalServerBindings={playEnabled:valid,playDisabledVisible:!valid,saveEnabled:valid,saveDisabledVisible:!valid};
  const request=(action:ExternalServerAction,current:ExternalServerValues)=>{
    if(action==='save'){setSaved({...current});setStatus(`已保留预览记录：${current.name} · ${current.address}:${current.port}`);}
    else if(action==='remove'){setSaved(null);setStatus(`已移除预览记录：${current.name}`);}
    else setStatus(`已接纳连接请求：${current.address}:${current.port}；此预览不会连接网络。`);
  };
  return <section data-testid="external-server-demo" aria-label="外部服务器示例" style={{display:'grid',gap:16,minWidth:0,maxWidth:'100%'}}>
    <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:12,minWidth:0,maxWidth:'100%'}}>
      <div style={{width:220,maxWidth:'100%',minWidth:0}}><Combobox label="表单模式" value={mode} options={[{value:'add',label:'添加服务器'},{value:'edit',label:'编辑服务器'}]} onValueChange={value=>setMode(value as 'add'|'edit')}/></div>
      <Switch label="只读表单" checked={readOnly} onChange={event=>setReadOnly(event.currentTarget.checked)}/>
      <Switch label="禁用表单" checked={disabled} onChange={event=>setDisabled(event.currentTarget.checked)}/>
      <Button ref={openButton} disabled={formOpen} onClick={()=>{setFormOpen(true);setStatus('服务器表单已打开。');}}>重新打开表单</Button>
      <Button onClick={()=>{setValues({...initial});setSaved(null);setReadOnly(false);setDisabled(false);setFormOpen(true);setStatus('示例内容已恢复。');}}>恢复示例</Button>
    </div>
    <div ref={host} data-testid="external-server-demo-stage" style={{width:'100%',maxWidth:'100%',minWidth:0,overflow:'clip',background:'#203040'}}>
      <div hidden={!formOpen}>
        <ExternalServerForm data-testid="external-server-demo-form" title={mode==='add'?'添加服务器':'编辑服务器'} mode={mode} labels={labels} bindings={bindings}
          value={values} onValueChange={next=>setValues(next)} onAction={request} onClose={()=>{setFormOpen(false);setStatus('服务器表单已关闭。');}}
          size={[width,179]} scale={scale} readOnly={readOnly} disabled={disabled}
          fieldProps={{name:{placeholder:'给服务器起个名字'},address:{placeholder:'play.example.invalid'},port:{inputMode:'numeric'}}}/>
      </div>
      {!formOpen&&<p style={{padding:16,margin:0}}>表单已关闭。</p>}
    </div>
    <p data-testid="external-server-demo-status" role="status" style={{margin:0,fontSize:14,overflowWrap:'anywhere'}}>{status}</p>
    <output data-testid="external-server-demo-saved" aria-label="已保留的预览记录" style={{fontSize:13,overflowWrap:'anywhere'}}>{saved?`${saved.name} · ${saved.address}:${saved.port}`:'尚未保留预览记录'}</output>
    <section aria-label="独立端口输入框" style={{display:'grid',gap:8,minWidth:0,maxWidth:'100%'}}>
      <h3 style={{margin:0,fontSize:'1em'}}>独立字段</h3>
      <div data-testid="external-server-demo-standalone" style={{maxWidth:'100%',minWidth:0,overflow:'clip'}}><ExternalServerField kind="port" label="独立端口" scale={scale} width={Math.min(295,width)} value={standalonePort} onChange={event=>setStandalonePort(event.currentTarget.value)}/></div>
      <output data-testid="external-server-demo-port-value" style={{fontSize:13,overflowWrap:'anywhere'}}>输入内容：{standalonePort}</output>
    </section>
    <details><summary>关于这个示例</summary><p style={{fontSize:13,overflowWrap:'anywhere'}}>本页要求名称、地址非空，端口为 1–65535 的数字字符串，才启用连接和保存。这是示例宿主的校验选择；组件本身不校验地址、不转换端口，也不会保存或连接服务器。切换添加与编辑模式会保留输入内容。独立端口字段仍允许原生文本编辑。</p></details>
  </section>;
}
