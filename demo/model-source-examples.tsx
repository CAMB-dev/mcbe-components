import {useMemo,useState} from 'react';
import {Combobox} from '../src/combobox';
import {GuiLayer} from '../src/gui-layer-component';
import type {GuiLayerCommand} from '../src/gui-layer-component';
import {modelSourceExamples} from './model-source-data';

export function ModelSourceExamples(){
 const [open,setOpen]=useState(false),[selected,setSelected]=useState(modelSourceExamples[0]!.id),model=modelSourceExamples.find(x=>x.id===selected)!;
 const commands=useMemo<GuiLayerCommand[]>(()=>[{kind:'model',...model.item,origin:[24,24]}],[model]);
 return <details onToggle={event=>setOpen(event.currentTarget.open)}><summary>Original geometry models</summary>{open&&<div data-testid="model-source-demo" style={{display:'grid',gap:12,minWidth:0,marginTop:12}}>
  <Combobox label="Original geometry model" value={selected} onValueChange={value=>setSelected(value as typeof selected)} options={modelSourceExamples.map(x=>({value:x.id,label:x.label}))}/>
  <GuiLayer width={192} height={128} guiScale={4} commands={commands} label={`Original geometry: ${model.label}`} style={{maxWidth:'100%',imageRendering:'pixelated'}}/>
  <p style={{margin:0}}>{model.sourceCubeCount} source cubes · {model.sourceFaceCount} source faces · <a href={model.geometryURL}>Original geometry JSON</a> · <a href={model.textureURL}>Original texture PNG</a></p>
  <p style={{margin:0,fontSize:12}}>完整原始模型和纹理；观察角度为演示设置，尚未核对原版物品栏的自动缩放。</p>
 </div>}</details>;
}
