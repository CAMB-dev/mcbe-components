import { forwardRef, useEffect, useRef } from 'react';
import type { CanvasHTMLAttributes, CSSProperties, HTMLAttributes } from 'react';

/** A caller-owned Bedrock `font/ascii_sga.png` atlas, not a substitute font. */
export interface EnchantingRunesProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'color'> {
  text: string;
  atlasUrl: string;
  scale?: 1 | 2 | 3 | 4;
  color?: string;
}

// Measured alpha bounds in the original 128×128 SGA atlas, A–Z/a–z cells.
const runeWidths = [5, 5, 2, 5, 5, 5, 3, 5, 1, 1, 5, 3, 5, 4, 4, 3, 5, 4, 2, 5, 5, 5, 5, 5, 3, 5];
export const EnchantingRunes = forwardRef<HTMLSpanElement, EnchantingRunesProps>(function EnchantingRunes({
  text, atlasUrl, scale = 2, color = '#685d49', className, style, ...props
}, ref) {
  return <span role="img" aria-label={text} {...props} ref={ref}
    className={['mc-enchanting-runes', className].filter(Boolean).join(' ')}
    style={{ ...style, color, lineHeight: `${8 * scale}px` }}>
    {text.split(/(\s+)/).map((word, wordIndex) => /^\s+$/.test(word)
      ? <span key={wordIndex} className="mc-enchanting-runes__space" aria-hidden="true" style={{ width: 4 * scale * word.length, height: 8 * scale }}/>
      : <span key={wordIndex} className="mc-enchanting-runes__word" aria-hidden="true">{[...word].map((char, index) => {
        const code = char.toUpperCase().charCodeAt(0), width = runeWidths[code - 65] ?? 3;
        const mask = { maskImage: `url("${atlasUrl}")`, maskSize: `${128 * scale}px ${128 * scale}px`, maskPosition: `${-(code % 16) * 8 * scale}px ${-Math.floor(code / 16) * 8 * scale}px` };
        return <span key={index} className="mc-enchanting-runes__glyph" data-rune={char}
          style={{ ...mask, WebkitMaskImage: mask.maskImage, WebkitMaskSize: mask.maskSize, WebkitMaskPosition: mask.maskPosition, width: (width + 1) * scale, height: 8 * scale } as CSSProperties}/>;
      })}</span>)}
  </span>;
});

/** Caller-owned matrices and bones, in the captured Bedrock shader's column-major convention. */
export interface EnchantingBookRendererState {
  projection: readonly number[];
  view: readonly number[];
  model: readonly number[];
  /** Seven source mesh parts; an eighth identity bone may be supplied. */
  bones: readonly (readonly number[])[];
  tileLightColor?: readonly [number, number, number, number];
  overlayColor?: readonly [number, number, number, number];
}

export interface EnchantingBookProps extends CanvasHTMLAttributes<HTMLCanvasElement> {
  /** Actual vanilla book atlas. */
  textureUrl?: string;
  /** Controlled reconstruction of openness, 0–1. Native CPU animation is not recovered. */
  open?: number;
  /** Controlled page-turn phase, 0–1. */
  pageFlip?: number;
  /** The captured directional lighting equation, or unchanged texture colors. */
  lighting?: 'calibrated' | 'unlit';
  yaw?: number;
  pitch?: number;
  roll?: number;
  /** Overrides the reconstructed pose with caller-owned original renderer matrices. */
  rendererState?: EnchantingBookRendererState;
  onRendererError?: (message: string) => void;
}

type Point = readonly [number, number, number];
type Matrix = number[];
const identity = (): Matrix => [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const multiply = (a: readonly number[], b: readonly number[]): Matrix => Array.from({length:16},(_,i)=>
  a[i%4]!*b[Math.floor(i/4)*4]!+a[i%4+4]!*b[Math.floor(i/4)*4+1]!+
  a[i%4+8]!*b[Math.floor(i/4)*4+2]!+a[i%4+12]!*b[Math.floor(i/4)*4+3]!);
const rotation = (axis: 'x'|'y'|'z', angle: number): Matrix => {
  const c=Math.cos(angle),s=Math.sin(angle);
  return axis==='x' ? [1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]
    : axis==='y' ? [c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]
      : [c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1];
};

/**
 * Seven-part Bedrock mesh and directional shader recovered from an actual GUI
 * draw in 1.26.6005.0. One caller-supplied captured renderer state reproduces
 * that draw on the tested NVIDIA backend. Default controlled animation remains
 * a reconstruction: the native CPU openness/page-turn function is not captured.
 */
export const EnchantingBook = forwardRef<HTMLCanvasElement, EnchantingBookProps>(function EnchantingBook({
  textureUrl = new URL('./assets/enchanting/enchanting_table_book.png', import.meta.url).href,
  open = 1, pageFlip = 0, lighting = 'calibrated', yaw = -90, pitch = 20, roll = 0,
  rendererState, width = 80, height = 80, onRendererError, className,
  'aria-label': label = 'Enchanting book', ...props
}, forwardedRef) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const node=canvas.current; if(!node)return;
    const gl=node.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true});
    if(!gl){onRendererError?.('WebGL is unavailable. Supply your own book renderer.');return;}
    let disposed=false;
    const shaders: WebGLShader[]=[],buffers: WebGLBuffer[]=[];
    let program:WebGLProgram|null=null,texture:WebGLTexture|null=null;
    const shader=(type:number,source:string)=>{
      const result=gl.createShader(type);if(!result)throw new Error('Cannot allocate book shader');
      shaders.push(result);gl.shaderSource(result,source);gl.compileShader(result);
      if(!gl.getShaderParameter(result,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(result)??'Book shader compilation failed');return result;
    };
    const cleanup=()=>{for(const b of buffers)gl.deleteBuffer(b);for(const s of shaders)gl.deleteShader(s);gl.deleteTexture(texture);gl.deleteProgram(program);};
    const image=new Image();image.crossOrigin='anonymous';
    image.onload=()=>{
      if(disposed)return;
      try {
        const finite=(value:number,fallback:number)=>Number.isFinite(value)?value:fallback;
        const bounded=Math.max(0,Math.min(1,finite(open,1))),phase=finite(pageFlip,0),rad=Math.PI/180;
        const angle=1.25*bounded,flip=(offset:number)=>Math.max(0,Math.min(1,((phase+offset)%1+1)%1*1.6-.3));
        const bone=(fold:number,pivot:Point=[0,0,0]):Matrix=>{
          const m=rotation('y',fold);for(let i=0;i<12;i++)m[i]=m[i]!/16;
          m[12]=pivot[0]/16;m[13]=pivot[1]/16;m[14]=pivot[2]/16;return m;
        };
        const pivot:Point=[Math.sin(angle),0,0];
        const bones=rendererState?.bones??[
          bone(Math.PI+angle,[0,0,-1]),bone(-angle,[0,0,1]),bone(angle,pivot),bone(-angle,pivot),
          bone(angle*(1-2*flip(.25)),pivot),bone(angle*(1-2*flip(.75)),pivot),bone(Math.PI/2),
        ];
        // Default local panel: 40 game units, original model scale 40. The
        // closed-state offsets remain the previous explicit reconstruction.
        let model=multiply(rotation('y',(finite(yaw,-90)-(1-bounded)*90)*rad),rotation('x',Math.PI));
        model[12]=(1-bounded)*3.2/16;model[13]=(1-bounded)*1.6/16;model[14]=(1-bounded)*4/16;
        model=multiply(rotation('z',finite(roll,0)*rad),multiply(rotation('x',finite(pitch,20)*rad),model));
        const scale=[-40,0,0,0,0,40,0,0,0,0,40,0,20,20,-100,1];
        model=multiply(scale,model);
        const state={projection:[.05,0,0,0,0,-.05,0,0,0,0,-.001,0,-1,1,0,1],view:identity(),model,...rendererState};
        const matrices=[state.projection,state.view,state.model,...bones];
        if(bones.length<7||bones.length>8||matrices.some(m=>m.length!==16||m.some(n=>!Number.isFinite(n))))throw new Error('Book renderer matrices must contain 16 finite numbers and seven or eight bones');
        const tile=rendererState?.tileLightColor??[1,1,1,1],overlay=rendererState?.overlayColor??[0,0,0,0];
        if(tile.length!==4||overlay.length!==4||[...tile,...overlay].some(n=>!Number.isFinite(n)))throw new Error('Book light uniforms must contain four finite numbers');
        program=gl.createProgram();if(!program)throw new Error('Cannot allocate book program');
        gl.attachShader(program,shader(gl.VERTEX_SHADER,`
          attribute vec4 p;attribute vec2 uv;attribute vec4 normal;attribute float boneId;
          uniform mat4 projection,view,model,bones[8];uniform vec4 tile,overlay;uniform float lit;
          varying highp vec2 v;varying highp vec3 light;
          void main(){mat4 mb=model*bones[int(boneId)];vec4 n=normalize(mb*normal);
            float l=.45-.1*n.x*n.x+.1*n.z*n.z+.35*overlay.a+.275*(1.0+n.y*tile.a);
            light=mix(vec3(1.0),vec3(l)*tile.rgb,lit);
            vec4 c=projection*view*mb*p;gl_Position=vec4(c.xy,2.0*c.z-c.w,c.w);v=uv;}`));
        gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`
          precision highp float;varying highp vec2 v;varying highp vec3 light;uniform sampler2D atlas;uniform vec4 overlay;
          void main(){vec4 c=texture2D(atlas,v);gl_FragColor=vec4(mix(c.rgb,overlay.rgb,overlay.a)*light,c.a);}`));
        gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)??'Book shader link failed');gl.useProgram(program);
        const positions:number[]=[],uvs:number[]=[],normals:number[]=[],boneIds:number[]=[];
        const uvRaw=(pixel:number,dimension:number)=>Math.trunc(pixel*65536/dimension)/65535;
        const box=(origin:Point,size:Point,uv:readonly[number,number],id:number)=>{
          const [x,y,z]=origin,[w,h,d]=size,[u,v]=uv;
          const p:Point[]=[[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z],[x,y,z+d],[x+w,y,z+d],[x+w,y+h,z+d],[x,y+h,z+d]];
          const face=(indices:number[],rect:readonly[number,number,number,number],normal:Point)=>{
            const [a,b,ww,hh]=rect,ex=ww===0?0:Math.sign(ww)/32,ey=hh===0?0:Math.sign(hh)/32;
            const corners=[[a+ww-ex,b+ey],[a+ex,b+ey],[a+ex,b+hh-ey],[a+ww-ex,b+hh-ey]];
            for(const index of [1,2,0,0,2,3]){positions.push(...p[indices[index]!]!,1);uvs.push(uvRaw(corners[index]![0]!,64),uvRaw(corners[index]![1]!,32));normals.push(...normal,0);boneIds.push(id);}
          };
          face([2,3,7,6],[u+d+w,v+d,w,-d],d===0?[0,0,0]:[0,1,0]);
          face([5,4,0,1],[u+d,v,w,d],d===0?[0,0,0]:[0,-1,0]);
          face([1,0,3,2],[u+d,v+d,w,h],[0,0,-1]);face([4,5,6,7],[u+2*d+w,v+d,w,h],[0,0,1]);
          face([5,1,2,6],[u+d+w,v+d,d,h],d===0?[0,0,0]:[1,0,0]);face([0,4,7,3],[u,v+d,d,h],d===0?[0,0,0]:[-1,0,0]);
        };
        // Actual source positions are half floats. UV box dimensions precede
        // position packing, so preserve exact one-unit UV depth separately.
        box([-6,-5,0],[6,10,0],[0,0],0);box([0,-5,0],[6,10,0],[16,0],1);
        const pageStart=positions.length;
        box([0,-4,-.99],[5,8,1],[0,10],2);box([0,-4,-.01],[5,8,1],[12,10],3);
        for(let i=pageStart;i<positions.length;i+=4){
          const z=positions[i+2]!;
          positions[i+2]=z<-.5?-.990234375:z<0?-.01000213623046875:z>.5?.990234375:.01000213623046875;
        }
        box([0,-4,0],[5,8,0],[24,10],4);box([0,-4,0],[5,8,0],[24,10],5);box([-1,-5,0],[2,10,0],[12,0],6);
        const attr=(name:string,data:number[],size:number)=>{const b=gl.createBuffer();if(!b)throw new Error('Cannot allocate book buffer');buffers.push(b);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program!,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0);};
        attr('p',positions,4);attr('uv',uvs,2);attr('normal',normals,4);attr('boneId',boneIds,1);
        const matrix=(name:string,value:readonly number[])=>gl.uniformMatrix4fv(gl.getUniformLocation(program!,name),false,new Float32Array(value));
        matrix('projection',state.projection);matrix('view',state.view);matrix('model',state.model);matrix('bones',bones.flatMap(m=>[...m]).concat(bones.length===7?identity():[]));
        gl.uniform4fv(gl.getUniformLocation(program,'tile'),new Float32Array(tile));gl.uniform4fv(gl.getUniformLocation(program,'overlay'),new Float32Array(overlay));gl.uniform1f(gl.getUniformLocation(program,'lit'),lighting==='unlit'?0:1);
        texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(program,'atlas'),0);
        gl.viewport(0,0,node.width,node.height);gl.clearColor(0,0,0,0);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.depthMask(true);gl.enable(gl.CULL_FACE);gl.cullFace(gl.FRONT);gl.frontFace(gl.CW);gl.disable(gl.BLEND);gl.drawArrays(gl.TRIANGLES,0,positions.length/4);
      }catch(error){onRendererError?.(error instanceof Error?error.message:String(error));}
    };
    image.onerror=()=>onRendererError?.('Cannot load the book atlas.');image.src=textureUrl;
    return()=>{disposed=true;image.onload=null;image.onerror=null;cleanup();};
  },[textureUrl,open,pageFlip,lighting,yaw,pitch,roll,rendererState,width,height,onRendererError]);
  return <canvas {...props} ref={element=>{canvas.current=element;if(typeof forwardedRef==='function')forwardedRef(element);else if(forwardedRef)forwardedRef.current=element;}}
    role="img" aria-label={label} width={width} height={height}
    data-fidelity="captured-mesh-reconstruction" data-geometry-source="bedrock-1.26.6005-pix-gui-book" data-lighting={lighting}
    data-lighting-source={lighting==='unlit'?'unmodified-atlas':'bedrock-1.26.6005-captured-gui-draw'}
    data-renderer-state={rendererState?'caller-supplied':'controlled-reconstruction'}
    data-calibration-source="bedrock-1.26.6005-native-png" className={['mc-enchanting-book',className].filter(Boolean).join(' ')}/>;
});
