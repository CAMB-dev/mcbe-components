import { useState } from 'react';
import { ItemGlint, ItemSlot, Slider, Text } from '../src';
import type { ItemGlintUniforms } from '../src';

const sword=new URL('./assets/minecraft/diamond_sword.png',import.meta.url).href;
const webProfile:ItemGlintUniforms={uvOffset:[.125,-.2],uvScale:[1.5,.75],uvRotation:[.35,-.6],glintColor:[.3,.1,.5]};
const additive={source:'one',destination:'one'} as const;

export function ItemGlintExamples(){
  const [offset,setOffset]=useState(.125);
  const uniforms={...webProfile,uvOffset:[offset,-.2] as const};
  return <div className="demo-stack" style={{padding:24}}>
    <div style={{display:'flex',flexWrap:'wrap',alignItems:'end',gap:28}}>
      <div><Text as="p">Original item</Text><img src={sword} alt="Diamond sword without glint" width={64} height={64} style={{imageRendering:'pixelated'}}/></div>
      <div><Text as="p">Point sampling</Text><ItemGlint imageSrc={sword} uniforms={uniforms} glintSampler="point-repeat" blend={additive} width={64} height={64} label="Diamond sword with controlled point glint"/></div>
      <div><Text as="p">Bilinear sampling</Text><ItemGlint imageSrc={sword} uniforms={uniforms} glintSampler="bilinear-repeat" blend={additive} width={64} height={64} label="Diamond sword with controlled bilinear glint"/></div>
      <div><Text as="p">Inside ItemSlot</Text><ItemSlot item={{name:'Diamond sword',enchanted:true}}><ItemGlint imageSrc={sword} uniforms={uniforms} glintSampler="bilinear-repeat" blend={additive} width={32} height={32} aria-hidden="true"/></ItemSlot></div>
    </div>
    <Slider label="Glint first-layer UV offset" min={0} max={1} step={.025} value={offset} onChange={event=>setOffset(Number(event.target.value))} formatValue={value=>value.toFixed(3)}/>
    <Text>Original item-glint texture and source shader math. These examples use explicit Web test parameters; native timing and draw-state bindings remain unverified. Move the slider to change the phase.</Text>
  </div>;
}
