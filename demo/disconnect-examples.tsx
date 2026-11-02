import {useLayoutEffect, useRef, useState} from 'react';
import {Combobox, Button, Checkbox, DisconnectScreen} from '../src';
import type {DisconnectVariant} from '../src';
import {createDisconnectDemoProps} from './disconnect-data';

export function DisconnectExamples() {
  const [variant,setVariant] = useState<DisconnectVariant>('disconnect');
  const [uri,setUri] = useState(false), [ignored,setIgnored] = useState(false), [gpu,setGpu] = useState(false);
  const [disabled,setDisabled] = useState(false), [status,setStatus] = useState('选择动作以查看宿主请求。');
  const host = useRef<HTMLDivElement>(null), [width,setWidth] = useState(320);
  useLayoutEffect(() => {
    const node = host.current; if (!node) return;
    const measure = () => {const next = Math.floor(node.getBoundingClientRect().width); if (next > 0) setWidth(Math.min(320,next));};
    measure(); const observer = new ResizeObserver(measure); observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const base = createDisconnectDemoProps(variant);
  let actions = {...base.actions};
  if ('openAccount' in actions) actions = {...actions,openAccount:{...actions.openAccount,visible:uri}};
  if ('storeIgnored' in actions) actions = {...actions,storeIgnored:ignored};
  return <div ref={host} data-testid="disconnect-demo" style={{display:'grid',gap:16,minWidth:0}}>
    <div style={{display:'flex',flexWrap:'wrap',gap:16,alignItems:'end'}}>
      <Combobox label="断线界面" value={variant} onValueChange={value=>setVariant(value as DisconnectVariant)} options={[
        {value:'disconnect',label:'普通断线'},{value:'realms-disconnect',label:'Realms 断线'},{value:'realms-warning',label:'Realms 警告'},
      ]}/>
      <Checkbox checked={uri} onChange={event=>setUri(event.target.checked)} disabled={variant==='realms-warning'} label="显示账号帮助"/>
      <Checkbox checked={ignored} onChange={event=>setIgnored(event.target.checked)} disabled={variant==='disconnect'} label="平台不提供商店"/>
      <Checkbox checked={gpu} onChange={event=>setGpu(event.target.checked)} label="GPU 原图背景"/>
      <Checkbox checked={disabled} onChange={event=>setDisabled(event.target.checked)} label="禁用请求"/>
    </div>
    <DisconnectScreen {...base} layout={{...base.layout,size:[width,240]}} contentRect={[0,0,width,240]}
      actions={actions} disabled={disabled} background={{...base.background,renderer:gpu?'gpu':'css'}}
      onAction={detail=>setStatus(`${detail.action} · ${detail.buttonId}`)}/>
    <output aria-live="polite">{status}</output>
    <Button size="sm" onClick={()=>setStatus('选择动作以查看宿主请求。')}>清空请求记录</Button>
    <p style={{margin:0}}>按钮和背景使用原图；布局中的引擎默认值采用明确的 Web 配置。这里仅报告请求，账号、商店和连接操作由宿主处理。</p>
  </div>;
}
