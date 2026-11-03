import {useState} from 'react';
import {Combobox, GuiLayer, TextField, Switch} from '../src';
import {classicTenGuiFont,classicTenUnicodeGuiFont,classicTenUnicodeInfo} from 'virtual:mcbeui-game-font';

export function TrueTypeExample() {
  const [open,setOpen]=useState(false),[text,setText]=useState('Minecraft Bedrock 0123456789');
  const [scale,setScale]=useState('4'),[shadow,setShadow]=useState(true),[error,setError]=useState<string>();
  const[extended,setExtended]=useState(false),usingExtended=!!classicTenUnicodeGuiFont&&(extended||!classicTenGuiFont),font=usingExtended?classicTenUnicodeGuiFont:classicTenGuiFont;
  const supported=[...text].every(char=>char==='\n'||char==='\r'||Object.hasOwn(font?.glyphs??{},char));
  return <details onToggle={event=>setOpen(event.currentTarget.open)}><summary>Original Classic TrueType atlas</summary>{open&&<div data-testid="truetype-demo" data-gui-scale={scale} data-render-error={error} style={{display:'grid',gap:12,marginTop:12,minWidth:0}}>
    {font?<>
      <TextField label="TrueType preview text" value={text} onChange={event=>setText(event.target.value)}/>
      <Switch label="Extended original glyphs" checked={usingExtended} disabled={!classicTenUnicodeGuiFont||!classicTenGuiFont} onChange={event=>setExtended(event.target.checked)}/>
      {usingExtended&&classicTenUnicodeInfo&&<output aria-label="Original font coverage">{classicTenUnicodeInfo.glyphs} glyphs / {classicTenUnicodeInfo.pages} pages</output>}
      <Combobox label="TrueType GUI scale" value={scale} onValueChange={setScale} options={[{value:'4',label:'GUI 4'},{value:'5',label:'GUI 5'}]}/>
      <Switch label="TrueType text shadow" checked={shadow} onChange={event=>setShadow(event.target.checked)}/>
      {supported?<GuiLayer width={640} height={112} guiScale={Number(scale)} rasterOrigin="top-left" background={{kind:'solid',color:[.25,.25,.25,1]}}
        commands={[{kind:'truetype',font:font!,text,origin:[4,4],projectionScale:1.5,color:[255,255,255,255],shadow:shadow?{offset:[1,1],tint:[0,0,0,1]}:undefined}]}
        label="Original Classic TrueType text" style={{maxWidth:'100%',imageRendering:'pixelated'}} onReady={()=>setError(undefined)} onRenderError={failure=>setError(failure.message)}/>
        :<p role="status" style={{margin:0}}>{usingExtended?'原始字体缺少这些字符；请提供合适的字体或选择已映射字符。':'此缓存只包含U+0000…U+00FF；请使用当前范围内的文字。'}</p>}
      {supported&&error&&<p role="status" style={{margin:0}}>文字预览暂不可用，请重新展开。</p>}
      <p style={{margin:0,fontSize:12}}>原始TTF生成的完整图集与可变字形，保留实际RGBA覆盖值。阴影可单独切换。</p>
    </>:<p style={{margin:0,fontSize:12}}>本地未准备原始字体缓存。使用prepare-classic-truetype.py的--gui-font选项准备后重启预览。</p>}
  </div>}</details>;
}
