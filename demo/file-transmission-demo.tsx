import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Button,Checkbox,Slider,TextField,FileTransmissionScreen,FileTransmissionPanel,FileTransferProgress} from '../src';
import type {FileTransmissionAction,FileTransmissionBindings,FileTransmissionController,FileTransmissionModel,FileTransmissionPresentationProfile} from '../src';
import '../src/fonts.css';
import '../src/file-transmission.css';
import './file-transmission-demo.css';

const family='"MCBE Pixel", "MCBE CJK", monospace';
const titleURL=new URL('../src/assets/start-menu/title.png',import.meta.url).href;
const defaults:FileTransmissionBindings={singleTitle:'文件传输',leftTitle:'发送资源',rightTitle:'世界存档',message:'正在准备文件…',progressSize:'12 MB',totalSize:'30 MB',singleTitleVisible:true,dualTitleVisible:false,uploadContentVisible:true,warningContentVisible:false,messageVisible:true,progressTextVisible:true,progressVisible:true,playVisible:false,cancelVisible:true,warningButtonsVisible:false,percentage:.4};
const flagLabels=[['singleTitleVisible','单标题'],['dualTitleVisible','双标题'],['uploadContentVisible','传输内容'],['warningContentVisible','移动数据提示'],['messageVisible','消息'],['progressTextVisible','进度文字'],['progressVisible','进度条'],['playVisible','开始按钮'],['cancelVisible','取消按钮'],['warningButtonsVisible','警告按钮组']] as const;
const textLabels=[['singleTitle','单标题文字'],['leftTitle','左标题文字'],['rightTitle','右标题文字'],['message','消息文字'],['progressSize','当前大小文字'],['totalSize','总大小文字']] as const;

/** Host-authored demonstration. Source flags remain independent; presets only
 * edit this example's model. No transfer service or native provider is inferred. */
export function FileTransmissionDemo(){
  const host=useRef<HTMLDivElement>(null),canvas=useRef<HTMLDivElement>(null),controller=useRef<FileTransmissionController>(null);
  const[hostWidth,setHostWidth]=useState(0),[viewport,setViewport]=useState({width:0,height:0}),[ready,setReady]=useState(false),[open,setOpen]=useState(false),[run,setRun]=useState(0);
  const[bindings,setBindings]=useState(defaults),[readOnly,setReadOnly]=useState(false),[showTitle,setShowTitle]=useState(true),[nativeVeto,setNativeVeto]=useState(false),[nativeClicks,setNativeClicks]=useState(0),[log,setLog]=useState<readonly string[]>([]),[notice,setNotice]=useState('设置绑定后打开预览；下方部件可以独立使用。');
  useEffect(()=>{const node=host.current,view=node?.ownerDocument.defaultView;if(!node||!view)return;const measure=()=>{setHostWidth(node.clientWidth);setViewport({width:view.visualViewport?.width??view.innerWidth,height:view.visualViewport?.height??view.innerHeight});};measure();const observer=new view.ResizeObserver(measure);observer.observe(node);view.addEventListener('resize',measure);view.visualViewport?.addEventListener('resize',measure);return()=>{observer.disconnect();view.removeEventListener('resize',measure);view.visualViewport?.removeEventListener('resize',measure);};},[]);
  useEffect(()=>{let active=true;const fonts=host.current?.ownerDocument.fonts;if(!fonts)return;Promise.all([fonts.load('10px "MCBE Pixel"','Transfer 123'),fonts.load('10px "MCBE CJK"','文件传输继续取消')]).then(loaded=>{if(loaded.some(value=>!value.length))throw Error('Font unavailable');if(active)setReady(true);}).catch(()=>{if(active)setNotice('像素字体加载失败，请刷新重试。');});return()=>{active=false;};},[]);
  const scale=hostWidth>=840&&viewport.width>=832&&viewport.height>=560?2:1,width=scale===2?400:Math.max(288,Math.min(480,Math.floor((hostWidth||400)/2)*2)),height=239;
  const profile=useMemo<FileTransmissionPresentationProfile>(()=>{
    const context=host.current?.ownerDocument.createElement('canvas').getContext('2d');if(context)context.font=`10px ${family}`;
    const measure=(text:string,max:number)=>Math.max(1,Math.min(max,Math.ceil(context?.measureText(text).width??text.length*10)));
    const warning='当前使用移动数据，继续传输可能产生费用。';let rows=1,line=0;for(const char of warning){const advance=context?.measureText(char).width??10;if(line+advance>248&&line>0){rows++;line=0;}line+=advance;}
    const provenance='Demo host: loaded open Pixel/CJK font measurement; no native font, anchor or shadow claim';
    const font={family,logicalSize:10,lineHeight:10,provenance};
    return{availableSize:[width,height],scale,fonts:{title:{...font},progress:{...font},button:{...font}},measurements:{singleTitleWidth:measure(bindings.singleTitle,254),leftTitleWidth:measure(bindings.leftTitle,254),rightTitleWidth:measure(bindings.rightTitle,254),messageWidth:measure(bindings.message,248),progressSizeWidth:measure(bindings.progressSize,248),totalSizeWidth:measure(bindings.totalSize,248),warningHeight:rows*10},labels:{play:'开始',cancel:'取消',continue:'继续',mobileDataWarning:warning,progress:'文件传输进度'},bodyColor:'#ffffff',titleColor:'rgb(30% 30% 30%)',provenance,textPolicy:'explicit-host-font-no-shadow-web'};
  },[width,scale,bindings.singleTitle,bindings.leftTitle,bindings.rightTitle,bindings.message,bindings.progressSize,bindings.totalSize,ready]);
  const onAction=(detail:FileTransmissionAction)=>{const message=`${detail.origin}: ${detail.target}`;setLog(previous=>[message,...previous].slice(0,8));setNotice(message);
    if(detail.target==='button.menu_exit'||detail.target==='button.file_upload_cancel')setOpen(false);
    else if(detail.target==='button.file_upload_wifi_warning_continue')setBindings(previous=>({...previous,warningContentVisible:false,warningButtonsVisible:false,uploadContentVisible:true,cancelVisible:true}));
    else if(detail.target==='button.file_upload_play'){setBindings(previous=>({...previous,playVisible:false,cancelVisible:true,message:'已接纳开始请求'}));}
  };
  const model:FileTransmissionModel={runKey:'file-transmission-demo-'+run,disabled:false,readOnly,bindings,profile,materialPolicy:'explicit-common-hollow2-and-light-web',imageClipPolicy:'visible-fraction-web',stackLayout:{height:25,messageY:0,progressTextY:10,progressBarY:20,policy:'explicit-host-content-measurement-web',provenance:'Demo host retains all declared10+10+5 rows, including hidden rows, and chooses centered stack; not recovered native intrinsic behavior'},onAction};
  const panelModel:FileTransmissionModel={...model,runKey:'file-transmission-panel-demo',profile:{...profile,availableSize:[288,130],scale:1}};
  const nativeClick=(event:{preventDefault():void})=>{setNativeClicks(value=>value+1);if(nativeVeto)event.preventDefault();};
  const portalTarget=host.current?.ownerDocument.body;
  return <div className="file-transmission-demo">
    <div className="file-transmission-demo__controls"><Button onClick={()=>setBindings({...defaults})}>传输示例</Button><Button onClick={()=>setBindings({...defaults,singleTitle:'传输完成',message:'文件已就绪',percentage:1,playVisible:true,cancelVisible:false})}>完成示例</Button><Button onClick={()=>setBindings({...defaults,uploadContentVisible:false,warningContentVisible:true,cancelVisible:false,warningButtonsVisible:true})}>移动数据提示示例</Button>
      <Checkbox label="只读" checked={readOnly} onChange={event=>setReadOnly(event.currentTarget.checked)}/><Checkbox label="显示宿主标题图" checked={showTitle} onChange={event=>setShowTitle(event.currentTarget.checked)}/><Checkbox label="原生点击 veto" checked={nativeVeto} onChange={event=>setNativeVeto(event.currentTarget.checked)}/></div>
    <details className="file-transmission-demo__settings"><summary>独立显示绑定与文字</summary><div className="file-transmission-demo__controls">{flagLabels.map(([key,label])=><Checkbox key={key} label={label} checked={bindings[key]} onChange={event=>{const checked=event.currentTarget.checked;setBindings(previous=>({...previous,[key]:checked}));}}/>)}</div>
      <div className="file-transmission-demo__fields">{textLabels.map(([key,label])=><TextField key={key} label={label} value={bindings[key]} onChange={event=>{const text=event.currentTarget.value;setBindings(previous=>({...previous,[key]:text}));}}/>)}</div></details>
    <Slider label="显式显示比例" min={0} max={1} step={.01} value={bindings.percentage} onValueChange={percentage=>setBindings(previous=>({...previous,percentage}))}/>
    <Button data-testid="file-transmission-demo-open" disabled={!ready} onClick={()=>{setRun(value=>value+1);setOpen(true);}}>打开文件传输界面</Button>
    <div ref={host} className="file-transmission-demo__stage" data-testid="file-transmission-demo-stage"><p>{ready?'文件传输预览':'正在加载像素字体…'}</p></div>
    {ready&&open&&portalTarget&&createPortal(<div className="file-transmission-demo__overlay" data-testid="file-transmission-demo-overlay" onClick={event=>{if(canvas.current?.contains(event.target as Node))return;event.preventDefault();event.stopPropagation();controller.current?.request('button.menu_cancel');}}>
      <div className="file-transmission-demo__frame" style={{width:width*scale}}><p className="file-transmission-demo__help">点画布外空白处，或按 Escape 退出预览。</p><div ref={canvas} className="file-transmission-demo__canvas" style={{width:width*scale,height:height*scale}}>
        <FileTransmissionScreen model={model} open={open} label="文件传输界面预览" controllerRef={controller} onNativeClick={nativeClick}
          baseLayer={<div className="file-transmission-demo__host-base"/>}
          titleArt={showTitle?<img src={titleURL} alt="" aria-hidden="true" draggable={false} style={{position:'absolute',top:10*scale,left:(width-220)/2*scale,width:220*scale,height:220*333/1937*scale,imageRendering:'pixelated'}}/>:null}/>
      </div></div></div>,portalTarget)}
    <p className="file-transmission-demo__status" role="status">{notice}</p>
    {ready&&<section className="file-transmission-demo__parts" aria-label="文件传输独立部件"><h3>可复用部件</h3><div className="file-transmission-demo__part-viewport" data-testid="file-transmission-demo-panel"><FileTransmissionPanel model={panelModel} onNativeClick={nativeClick}/></div><div className="file-transmission-demo__part-viewport" data-testid="file-transmission-demo-progress"><FileTransferProgress width={248} scale={1} percentage={bindings.percentage} visible={bindings.progressVisible} imageClipPolicy="visible-fraction-web" label="独立文件传输进度"/></div></section>}
    <details><summary>请求记录与原生点击（{nativeClicks}）</summary><ol className="file-transmission-demo__log" data-testid="file-transmission-demo-log">{log.map((entry,index)=><li key={index}>{entry}</li>)}</ol></details>
  </div>;
}
