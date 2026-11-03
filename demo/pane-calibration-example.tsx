import {useState} from 'react';
import {classicPaneModelCalibration as pane, Combobox, createGuiCuboidModel, GuiLayer} from '../src';
import type {GuiLayerCommand, GuiModelFace, GuiTextureAtlasSource} from '../src';

const atlas: GuiTextureAtlasSource = {
  kind: 'atlas', width: pane.referenceAtlas.width, height: pane.referenceAtlas.height,
  tiles: [
    {origin: pane.referenceAtlas.origins.body, size: [16,16], texture: new URL('./assets/pane-calibration/glass_red.png', import.meta.url).href},
    {origin: pane.referenceAtlas.origins.edge, size: [16,16], texture: new URL('./assets/pane-calibration/glass_pane_top_red.png', import.meta.url).href},
  ],
};
const model = createGuiCuboidModel(pane.min, pane.max, pane.options);
const faces = model.faces.map(face => {
  const origin = face.texture === 'edge' ? pane.referenceAtlas.origins.edge : pane.referenceAtlas.origins.body;
  const move = ([u,v]: readonly [number,number]): readonly [number,number] => [u+origin[0],v+origin[1]];
  const uv: GuiModelFace['uv'] = [move(face.uv[0]),move(face.uv[1]),move(face.uv[2]),move(face.uv[3])];
  return {...face, texture: 'atlas', uv};
});
const commands: GuiLayerCommand[] = [{kind:'model', model:{faces}, origin:[4,4], projection:pane.projection,
  textureSizes:{atlas:[pane.referenceAtlas.width,pane.referenceAtlas.height]}, textures:{atlas}}];

export function PaneCalibrationExample() {
  const [open,setOpen] = useState(false), [scale,setScale] = useState('4');
  const [renderError,setRenderError] = useState<string>();
  return <details onToggle={event=>setOpen(event.currentTarget.open)}><summary>Calibrated glass pane</summary>{open&&<div data-testid="pane-calibration-demo" data-gui-scale={scale} data-render-error={renderError} style={{display:'grid',gap:12,marginTop:12,minWidth:0}}>
    <Combobox label="Glass pane GUI scale" value={scale} onValueChange={setScale} options={[{value:'4',label:'GUI 4'},{value:'5',label:'GUI 5'}]}/>
    <div style={{background:'#d64747',width:'fit-content',maxWidth:'100%'}}><GuiLayer width={128} height={128} guiScale={Number(scale)} commands={commands} label="Calibrated red glass pane" style={{maxWidth:'100%',imageRendering:'pixelated'}} onReady={()=>setRenderError(undefined)} onRenderError={error=>setRenderError(error.message)}/></div>
    {renderError&&<p role="status" style={{margin:0}}>预览暂不可用，请重新展开或切换比例。</p>}
    <p style={{margin:0,fontSize:12}}>原始玻璃材质与透明度；当前视角使用有限参考校准。</p>
  </div>}</details>;
}
