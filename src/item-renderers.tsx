import { forwardRef, useEffect, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, Ref } from 'react';
import { bannerBaseUrl, bannerPatternIds, bannerPatternUrls, blockTextureUrls } from './item-renderer-assets';
import type { BannerPatternId } from './item-renderer-assets';
import { blockMesh, clothPixels, composeBanner, cuboid, loadTexture, rasterize } from './item-renderer-engine';
import type { ItemCamera, ItemLighting, ItemMesh, PixelTexture } from './item-renderer-engine';
export { bannerPatternIds };
export type { BannerPatternId, ItemCamera, ItemLighting, ItemMesh };
export type { ItemMeshFace, Vec3, Uv } from './item-renderer-engine';

export type BlockKind = 'stone' | 'stone-bricks' | 'stone-slab' | 'stone-stairs';
/** Initial Web dye profile; callers may supply exact RGB values for their game. */
export const bannerDyeColors = {
  white: '#f0f0f0', orange: '#f9801d', magenta: '#c74ebd', 'light-blue': '#3ab3da', yellow: '#fed83d', lime: '#80c71f',
  pink: '#f38baa', gray: '#474f52', 'light-gray': '#9d9d97', cyan: '#169c9c', purple: '#8932b8', blue: '#3c44aa',
  brown: '#835432', green: '#5e7c16', red: '#b02e26', black: '#1d1d21',
} as const;
export type BannerDye = keyof typeof bannerDyeColors;
export type RendererColor = BannerDye | `#${string}` | readonly [number, number, number];
export interface BannerPatternLayer { id: BannerPatternId; color: RendererColor; texture?: string }

/** Observed32 normal patterns in the calibration capture, not a public engine registry. */
export const loomPatternIds = [
  'border','circle','cross','diagonal-up-left','diagonal-up-right','diagonal-left','diagonal-right',
  'gradient','gradient-up','half-horizontal','half-horizontal-bottom','half-vertical','half-vertical-right','rhombus',
  'small-stripes','square-bottom-left','square-bottom-right','square-top-left','square-top-right','straight-cross','stripe-bottom',
  'stripe-center','stripe-downleft','stripe-downright','stripe-left','stripe-middle','stripe-right','stripe-top',
  'triangle-bottom','triangle-top','triangles-bottom','triangles-top',
] as const satisfies readonly BannerPatternId[];

function dimension(value:number, name:string) {
  if(!Number.isInteger(value)||value<1||value>1024)throw new RangeError(`${name} must be an integer from1 to1024.`);
  return value;
}
function colorRgb(value:RendererColor):readonly [number,number,number] {
  if(typeof value!=='string') {
    if(value.length!==3||value.some(channel=>!Number.isFinite(channel)))throw new RangeError('Invalid renderer RGB color.');
    return value.map(channel=>Math.max(0,Math.min(255,Math.round(channel)))) as unknown as readonly [number,number,number];
  }
  const hex=(bannerDyeColors as Record<string,string>)[value]??value;
  if(!/^#[\da-f]{6}$/i.test(hex))throw new RangeError('Use a named dye, six-digit hex color, or RGB tuple.');
  return [Number.parseInt(hex.slice(1,3),16),Number.parseInt(hex.slice(3,5),16),Number.parseInt(hex.slice(5,7),16)];
}
function assignRef<T>(ref:Ref<T>, value:T|null) { if(typeof ref==='function')ref(value);else if(ref)ref.current=value; }
function draw(canvas:HTMLCanvasElement,data:Uint8ClampedArray,width:number,height:number) {
  const context=canvas.getContext('2d');if(!context)throw new Error('Canvas2D unavailable.');
  canvas.width=width;canvas.height=height;const image=context.createImageData(width,height);image.data.set(data);context.putImageData(image,0,0);
}
function calibratedBlockMesh(kind:'cube'|'slab'|'stairs'):ItemMesh {
  const mesh=blockMesh(kind);
  return {...mesh,faces:mesh.faces.map(face=>{
    const vertices=(kind==='stairs'?face.vertices.map(([x,y,z])=>[16-z,y,x]):face.vertices) as unknown as typeof face.vertices;
    const normal=kind==='stairs'?[-face.normal![2],face.normal![1],face.normal![0]] as const:face.normal!;
    const uv=vertices.map(([x,y,z])=>{
      const u=normal[1]?x:normal[0]?z:16-x,v=normal[1]?z:16-y;
      return Math.abs(normal[1])>.5?[16-v,u]:[16-u,v];
    }) as unknown as typeof face.uv;
    return {...face,vertices,normal,uv};
  })};
}
interface RenderCanvasProps extends Omit<HTMLAttributes<HTMLCanvasElement>, 'children'> {
  label?: string;
  decorative?: boolean;
  onReady?: () => void;
  onRenderError?: (error:Error) => void;
}
export interface BlockPreviewProps extends RenderCanvasProps {
  block?: BlockKind;
  /** CSS dimensions. The item area is32x32 at GUI scale2 by default. */
  size?: number;
  /** Internal square raster resolution, independent of CSS dimensions. */
  resolution?: number;
  model?: ItemMesh;
  /** Source image URLs. Custom meshes may name additional texture keys. */
  textures?: Readonly<Record<string,string>>;
  camera?: ItemCamera;
  lighting?: ItemLighting;
}
/** Original block textures on a configurable reconstructed item mesh. */
export const BlockPreview=forwardRef<HTMLCanvasElement,BlockPreviewProps>(function BlockPreview({
  block='stone',size=32,resolution=size,model,textures,camera,lighting,label,decorative=false,onReady,onRenderError,className,style,...props
},ref){
  dimension(size,'size');dimension(resolution,'resolution');
  const canvas=useRef<HTMLCanvasElement|null>(null),callbacks=useRef({onReady,onRenderError});callbacks.current={onReady,onRenderError};
  const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
  useEffect(()=>{
    let cancelled=false;setState('loading');
    const source=textures?.all??(block==='stone-bricks'?blockTextureUrls['stone-bricks']:blockTextureUrls.stone);
    const urls={all:source,side:source,top:source,bottom:source,...textures};
    void Promise.all(Object.entries(urls).map(async([key,url])=>[key,await loadTexture(url)] as const)).then(entries=>{
      if(cancelled||!canvas.current)return;
      const mesh=model??calibratedBlockMesh(block==='stone-slab'?'slab':block==='stone-stairs'?'stairs':'cube');
      // Empirical item profile trained on native stone input1; brick output1
      // was reserved as a different-texture holdout. These are approximations,
      // not a recovered Bedrock camera or shader implementation.
      const view=model?camera:{yaw:45.25,pitch:29.75,zoom:1.0355,padding:resolution*.025,offsetX:.4*resolution/80,offsetY:.9*resolution/80,...camera};
      const light=model?lighting:{top:.9960302161,left:.7286712762,right:.4958237484,...lighting};
      draw(canvas.current,rasterize(mesh,Object.fromEntries(entries),resolution,resolution,view,light),resolution,resolution);
      setState('ready');callbacks.current.onReady?.();
    }).catch(reason=>{if(!cancelled){setState('error');callbacks.current.onRenderError?.(reason instanceof Error?reason:new Error(String(reason)));}});
    return()=>{cancelled=true;};
  },[block,resolution,model,textures,camera,lighting]);
  return <canvas {...props} ref={node=>{canvas.current=node;assignRef(ref,node);}} width={resolution} height={resolution}
    role={decorative?undefined:props.role??'img'} aria-label={decorative?undefined:props['aria-label']??label??block.replaceAll('-',' ')} aria-hidden={decorative||props['aria-hidden']||undefined}
    data-renderer="block" data-render-state={state} data-block={block} data-fidelity="renderer-reconstruction"
    className={['mc-block-preview',className].filter(Boolean).join(' ')} style={{width:size,height:size,...style} as CSSProperties}/>
});

export interface BannerPreviewProps extends RenderCanvasProps {
  /** cloth is the20x40 native banner-pattern area; item includes untinted pole/bar. */
  view?: 'cloth'|'item';
  width?: number;
  height?: number;
  baseColor?: RendererColor;
  patterns?: readonly BannerPatternLayer[];
  /** Original64x64 source texture URL. */
  baseTexture?: string;
  /** Item patterns retain the source cloth weave; the native flat GUI preview does not. */
  fabricShading?: boolean;
  model?: ItemMesh;
  camera?: ItemCamera;
  lighting?: ItemLighting;
}
const bannerItemMesh:ItemMesh={bounds:[[-10,0,-1],[10,44,1]],faces:[
  ...cuboid([-1,0,-1],[1,42,1],'base',[44,0]),
  ...cuboid([-10,42,-1],[10,44,1],'base',[0,42]),
  ...cuboid([-10,4,0],[10,44,1],'cloth',[0,0]).map(face=>face.normal?.[2]===1?{...face,uv:face.uv.map(([u,v])=>[22-u,v]) as unknown as typeof face.uv}:face),
]};
const noPatterns:readonly BannerPatternLayer[]=[];
/** Source atlas UVs, tint and alpha composition; native pose/lighting remain configurable. */
export const BannerPreview=forwardRef<HTMLCanvasElement,BannerPreviewProps>(function BannerPreview({
  view='cloth',width=view==='cloth'?40:32,height=view==='cloth'?80:32,baseColor='white',patterns=noPatterns,baseTexture=bannerBaseUrl,
  fabricShading=view==='item',model,camera,lighting,label='Banner',decorative=false,onReady,onRenderError,className,style,...props
},ref){
  dimension(width,'width');dimension(height,'height');
  if(patterns.length>64)throw new RangeError('A banner preview supports at most64 pattern layers.');
  const tint=colorRgb(baseColor);patterns.forEach(layer=>colorRgb(layer.color));
  const canvas=useRef<HTMLCanvasElement|null>(null),callbacks=useRef({onReady,onRenderError});callbacks.current={onReady,onRenderError};
  const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
  const composition=JSON.stringify({tint,patterns});
  useEffect(()=>{
    let cancelled=false;setState('loading');
    void Promise.all([loadTexture(baseTexture),...patterns.map(layer=>loadTexture(layer.texture??bannerPatternUrls[layer.id]))]).then(images=>{
      if(cancelled||!canvas.current)return;
      const base=images[0]!;if(base.width!==64||base.height!==64)throw new Error('Banner base must retain its original64x64 atlas.');
      const texture=composeBanner(base,patterns.map((layer,index)=>({texture:images[index+1]!,color:colorRgb(layer.color)})),tint,fabricShading);
      const pose=model?camera:{yaw:-29.8,pitch:22.6,zoom:1.036,padding:Math.min(width,height)*.025,offsetX:3.4*width/80,offsetY:-.8*height/80,...camera};
      const pixels=view==='cloth'&&!model?clothPixels(texture,width,height):rasterize(model??bannerItemMesh,{base,cloth:texture},width,height,pose,{top:1,left:1,right:.97,bottom:1,...lighting});
      draw(canvas.current,pixels,width,height);setState('ready');callbacks.current.onReady?.();
    }).catch(reason=>{if(!cancelled){setState('error');callbacks.current.onRenderError?.(reason instanceof Error?reason:new Error(String(reason)));}});
    return()=>{cancelled=true;};
  // JSON compares public layer/color values; recreating equivalent arrays does
  // not keep refetching/repainting all32 selector previews on unrelated input.
  },[view,width,height,composition,baseTexture,fabricShading,model,camera,lighting]);
  return <canvas {...props} ref={node=>{canvas.current=node;assignRef(ref,node);}} width={width} height={height}
    role={decorative?undefined:props.role??'img'} aria-label={decorative?undefined:props['aria-label']??label} aria-hidden={decorative||props['aria-hidden']||undefined}
    data-renderer="banner" data-render-state={state} data-banner-view={view} data-pattern-count={patterns.length} data-fidelity="renderer-reconstruction"
    className={['mc-banner-preview',className].filter(Boolean).join(' ')} style={{width,height,...style} as CSSProperties}/>
});

/** Exposed for custom renderer adapters and independent source-pixel tests. */
export type { PixelTexture };
