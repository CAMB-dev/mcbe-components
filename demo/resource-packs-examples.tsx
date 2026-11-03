import {classicTenGuiFont} from 'virtual:mcbeui-game-font';
import {useEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import {Button,Switch} from '../src/components';
import {Combobox} from '../src/combobox';
import {ScrollArea} from '../src/scroll-area';
import {ResourcePackManager,ResourcePackSection} from '../src/resource-packs';
import type {ResourcePackManagerActionDetail,ResourcePackProfile,ResourcePackManagerProps,ResourcePackManagerRecord,ResourcePackCollectionData} from '../src/resource-packs';
import {PackSettingsScreen} from '../src/pack-settings';
import {createResourcePackDemoProps} from './resource-pack-data';
import {createPackSettingsDemoProps} from './pack-settings-data';
import {hasGameFont,hasClassicTenFont} from 'virtual:mcbeui-game-font';
import '../src/fonts.css';

function mapCollections(collections:ResourcePackManagerProps['collections'],map:(item:ResourcePackManagerRecord)=>ResourcePackManagerRecord):ResourcePackManagerProps['collections']{
  const apply=(collection:ResourcePackCollectionData)=>({...collection,items:collection.items.map(map)});
  return {selected:apply(collections.selected),available:apply(collections.available),realms:apply(collections.realms),unowned:apply(collections.unowned),invalid:apply(collections.invalid)};
}

export function ResourcePacksExamples(){
  const [model,setModel]=useState(()=>createResourcePackDemoProps('global'));
  const [settings,setSettings]=useState(createPackSettingsDemoProps);
  const [scale,setScale]=useState(2),[fontSize,setFontSize]=useState(18);
  const [accept,setAccept]=useState(true),[readOnly,setReadOnly]=useState(false),[disabled,setDisabled]=useState(false);
  const [allDiagnostics,setAllDiagnostics]=useState(false),[touch,setTouch]=useState(false),[ready,setReady]=useState(false);
  const [status,setStatus]=useState('本地宿主示例；操作只提交界面请求。');
  const [headerText,setHeaderText]=useState(false),[headerImages,setHeaderImages]=useState(false),[headerExpanded,setHeaderExpanded]=useState(false);
  const settingsRoot=useRef<HTMLDivElement>(null);
  useEffect(()=>{let active=true;Promise.all([document.fonts.load('18px "MCBE Pixel"'),document.fonts.load('18px "MCBE CJK"'),...(hasGameFont?[document.fonts.load('18px "Mojangles Pixel"')]:[]),...(hasClassicTenFont?[document.fonts.load('18px "MCBE Classic Ten"')]:[])]).then(()=>document.fonts.ready).then(()=>{if(active)setReady(true);}).catch(()=>{if(active)setReady(true);});return()=>{active=false;};},[]);
  useEffect(()=>{if(settings.open)settingsRoot.current?.scrollIntoView({block:'center'});},[settings.open]);
  const chooseProfile=(profile:ResourcePackProfile)=>{setModel(createResourcePackDemoProps(profile));setStatus('已切换宿主配置：'+profile);};
  const request=(detail:ResourcePackManagerActionDetail)=>{
    setStatus(detail.action+' → '+detail.target);
    if(!accept)return false;
    if(detail.action==='options')setSettings(previous=>({...previous,open:true}));
    if(detail.action==='select')setModel(previous=>({...previous,collections:mapCollections(previous.collections,item=>{
      const selected=item.id===detail.id;
      return {...item,bindings:{...item.bindings,isSelected:selected},actions:item.actions?{...item.actions,bindings:{...item.actions.bindings,isSelected:selected}}:undefined};
    })}));
    return undefined;
  };
  const collections=allDiagnostics?mapCollections(model.collections,item=>({...item,
    diagnostics:{...item.diagnostics,hasErrors:true,hasWarnings:true,hasExpired:true,errorFree:true,reportGenerating:true},
    layout:{...item.layout,expandedTextHeight:Math.max(60,item.layout.expandedTextHeight)},
    actions:item.actions?{...item.actions,diagnostics:{...item.actions.diagnostics,hasErrors:true,hasWarnings:true,hasExpired:true,errorFree:true,reportGenerating:true}}:undefined,
  })):model.collections;
  const font={'--mc-font':hasGameFont?'"Mojangles Pixel","Mojangles","MCBE CJK",monospace':'"MCBE Pixel","MCBE CJK",monospace',
    ...(hasClassicTenFont?{'--mc-font-ten':'"MCBE Classic Ten",var(--mc-font)'}:{}),
    '--mc-resource-pack-font-size':fontSize+'px','--mc-pack-settings-font-size':fontSize+'px','--mc-font-size':fontSize+'px'} as CSSProperties;
  return <div data-testid="resource-packs-demo" data-font-ready={ready} data-classic-ten-font={hasClassicTenFont} style={{display:'grid',gap:16,minWidth:0,...font}}>
    <p style={{margin:0}}>全局资源、世界资源与附加包三种设置内容。标题计数和条目独立；本地示例不安装、购买或扫描资源包。</p>
    <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'end'}}>
      <Combobox label="资源包配置" value={model.profile} options={[{value:'global',label:'全局资源'},{value:'level',label:'世界资源'},{value:'addon',label:'附加包'}]} onValueChange={value=>chooseProfile(value as ResourcePackProfile)}/>
      <Combobox label="资源包 GUI scale" value={String(scale)} options={[1,2,3].map(value=>({value:String(value),label:String(value)}))} onValueChange={value=>setScale(Number(value))}/>
      <Combobox label="资源包文字尺寸" value={String(fontSize)} options={[18,20].map(value=>({value:String(value),label:value+' px'}))} onValueChange={value=>setFontSize(Number(value))}/>
      <Switch label="接受宿主修改" checked={accept} onChange={event=>setAccept(event.currentTarget.checked)}/>
      <Switch label="资源包只读" checked={readOnly} onChange={event=>setReadOnly(event.currentTarget.checked)}/>
      <Switch label="禁用资源包操作" checked={disabled} onChange={event=>setDisabled(event.currentTarget.checked)}/>
      <Switch label="并存诊断标记" checked={allDiagnostics} onChange={event=>setAllDiagnostics(event.currentTarget.checked)}/>
      <Switch label="设置使用触控滚动" checked={touch} onChange={event=>setTouch(event.currentTarget.checked)}/>
    </div>
    <div role="region" aria-label="资源包内容预览" tabIndex={0} style={{maxWidth:'100%',overflowX:'auto',scrollbarWidth:'none',background:'#101010'}}>
      <div style={{width:model.width*scale+9*scale}}><ScrollArea label="资源包宿主滚动区" variant="document" scale={scale} style={{height:300*scale,width:'100%'}}>
        <ResourcePackManager {...model} id="resource-pack-gallery-manager" collections={collections} scale={scale} disabled={disabled} readOnly={readOnly} onAction={request} style={font}/>
      </ScrollArea></div>
    </div>
    <div id="resource-pack-header-sampling" data-testid="resource-pack-header-sampling" style={{display:'grid',gap:12,justifyItems:'start',maxWidth:'100%'}}>
      <Switch label="启用原版标题计数" checked={headerText && !!classicTenGuiFont} disabled={!classicTenGuiFont} onChange={event=>setHeaderText(event.currentTarget.checked)}/>
      <Switch label="启用标题图标采样" checked={headerImages} onChange={event=>setHeaderImages(event.currentTarget.checked)}/>
      <ResourcePackSection kind="unowned" profile="global" width={140} scale={2} title="图标采样" titleVisible expanded={headerExpanded}
        collection={{capacity:0,count:'0',items:[]}} noPacks viewMoreLabel="更多" disabled={disabled} readOnly={readOnly}
        headerTextProfile={headerText && classicTenGuiFont ? {frame:{width:1200,height:900,guiScale:2},font:classicTenGuiFont,origin:[160.25,60],projectionScale:1.5,paintOffset:[0,-2]}:undefined}
        headerImageProfile={headerImages?{frame:{width:1200,height:900,guiScale:2},toggleOrigin:[180.25,60],expandedPaintRect:[180.25,63.5,10,3]}:undefined}
        onAction={detail=>{if(accept&&detail.action==='expand-unowned')setHeaderExpanded(value=>!value);return accept?undefined:false;}}/>
      <p style={{margin:0}}>切换图标采样，再展开标题可预览加号与细条减号。此独立示例不代表原版整页布局已完成。</p>
    </div>
    <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'center'}}>
      <Button onClick={()=>setSettings(previous=>({...previous,open:true}))}>打开包设置</Button>
      <Switch label="设备支持当前内容等级" checked={settings.content.tier.contentTierSupported} onChange={event=>{const supported=event.currentTarget.checked;setSettings(previous=>({...previous,content:{...previous.content,tier:{...previous.content.tier,contentTierSupported:supported}}}));}}/>
      <Switch label="包提供内容等级" checked={settings.content.tier.hasContentTiering} onChange={event=>{const has=event.currentTarget.checked;setSettings(previous=>({...previous,content:{...previous.content,tier:{...previous.content.tier,hasContentTiering:has}}}));}}/>
    </div>
    <div style={{maxWidth:'100%',overflowX:'auto',scrollbarWidth:'none',background:'#101010'}}>
      <PackSettingsScreen {...settings} id="pack-settings-gallery-screen" ref={settingsRoot} scale={scale} readOnly={readOnly} disabled={disabled} style={font}
        content={{...settings.content,inputMode:touch?'touch':'mouse',tier:{...settings.content.tier,onValueChange:(value,detail)=>{
          setStatus(detail.target+' → Web '+value+'；原始值 '+detail.sourceValue+'，steps '+detail.sourceSteps);
          if(accept)setSettings(previous=>({...previous,content:{...previous.content,tier:{...previous.content.tier,web:{...previous.content.tier.web,value}}}}));
          return accept?undefined:false;
        }}}}
        onCloseRequest={detail=>{setStatus(detail.target);if(accept)setSettings(previous=>({...previous,open:false}));return accept?undefined:false;}}/>
    </div>
    <output data-testid="resource-packs-status" role="status">{status}</output>
    <p style={{margin:0}}>质量滑块保留原始绑定，同时由宿主明确指定 Web 数值域。设备不兼容时显示原因，滑块仍可操作。源字体、引擎固有尺寸、动态素材和原生整页像素尚未认证。</p>
  </div>;
}
