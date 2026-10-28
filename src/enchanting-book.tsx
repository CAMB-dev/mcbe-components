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
  text, atlasUrl, scale = 2, color = '#685e4a', className, style, ...props
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

export interface EnchantingBookProps extends CanvasHTMLAttributes<HTMLCanvasElement> {
  /** Actual vanilla book atlas. Defaults to Mojang's unchanged public sample. */
  textureUrl?: string;
  /** 0 is closed, 1 is open. Controlled; no invented gameplay animation. */
  open?: number;
  /** Position within a page-turn cycle. Controlled, 0–1; no animation timer. */
  pageFlip?: number;
  /** Native-PNG calibrated face lighting, or the unchanged atlas for inspection. */
  lighting?: 'calibrated' | 'unlit';
  /** Camera adjustments in degrees; the default pitch is calibrated from native PNGs. */
  yaw?: number;
  pitch?: number;
  roll?: number;
  onRendererError?: (message: string) => void;
}

type Point = readonly [number, number, number];
type Uv = readonly [number, number, number, number];

/**
 * Optional textured reconstruction, NOT the native enchanting_book_renderer.
 * Full page blocks, covers and turning leaves use Mojang's Java BookModel
 * dimensions and box UV layout. Camera pitch and face lighting are calibrated
 * against native Bedrock PNGs; native mesh extraction and exact edge raster
 * agreement remain unverified. See docs/enchanting-renderer.json.
 */
export const EnchantingBook = forwardRef<HTMLCanvasElement, EnchantingBookProps>(function EnchantingBook({
  textureUrl = new URL('./assets/enchanting/enchanting_table_book.png', import.meta.url).href,
  open = 1, pageFlip = 0, lighting = 'calibrated', yaw = -90, pitch = 20, roll = 0, width = 80, height = 80,
  onRendererError, className, 'aria-label': label = 'Enchanting book', ...props
}, forwardedRef) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const node = canvas.current; if (!node) return;
    const gl = node.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true });
    if (!gl) { onRendererError?.('WebGL is unavailable. Supply your own book renderer.'); return; }
    let disposed = false;
    const shaders: WebGLShader[] = [], buffers: WebGLBuffer[] = [];
    let program: WebGLProgram | null = null, texture: WebGLTexture | null = null;
    const shader = (type: number, source: string) => {
      const result = gl.createShader(type); if (!result) throw new Error('Cannot allocate book shader');
      shaders.push(result); gl.shaderSource(result, source); gl.compileShader(result);
      if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result) ?? 'Book shader compilation failed');
      return result;
    };
    const cleanup = () => { for (const buffer of buffers) gl.deleteBuffer(buffer); for (const entry of shaders) gl.deleteShader(entry); gl.deleteTexture(texture); gl.deleteProgram(program); };
    const image = new Image(); image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (disposed) return;
      try {
        program = gl.createProgram(); if (!program) throw new Error('Cannot allocate book program');
        gl.attachShader(program, shader(gl.VERTEX_SHADER, 'attribute vec3 p;attribute vec2 uv;attribute float shade;varying vec2 v;varying float light;void main(){gl_Position=vec4(p,1.0);v=uv;light=shade;}'));
        gl.attachShader(program, shader(gl.FRAGMENT_SHADER, 'precision mediump float;varying vec2 v;varying float light;uniform sampler2D atlas;void main(){vec4 color=texture2D(atlas,v);gl_FragColor=vec4(color.rgb*light,color.a);}'));
        gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Book program link failed');
        gl.useProgram(program);
        const coordinates: number[] = [], uvs: number[] = [], shades: number[] = [], degrees = Math.PI / 180;
        const bounded = Math.max(0, Math.min(1, open));
        const rotate = ([x, y, z]: Point, axis: 'x' | 'y' | 'z', angle: number): Point => {
          const c = Math.cos(angle), s = Math.sin(angle);
          return axis === 'x' ? [x, y*c-z*s, y*s+z*c] : axis === 'y' ? [x*c+z*s,y,-x*s+z*c] : [x*c-y*s,x*s+y*c,z];
        };
        const transform = (point: Point, fold: number, pivot: Point): Point => {
          let p = rotate(point,'y',fold);
          p = [p[0]+pivot[0], p[1]+pivot[1], p[2]+pivot[2]];
          // Java's GUI applies X(180), then Y(yaw), then X(pitch), and a
          // mirrored X scale. Keep that order rather than inventing a flat icon.
          p = rotate(p,'x',Math.PI);
          p = rotate(p,'y',(yaw-(1-bounded)*90)*degrees);
          p = [p[0]+(1-bounded)*3.2,p[1]+(1-bounded)*1.6,p[2]+(1-bounded)*4];
          p = rotate(p,'x',pitch*degrees); p = rotate(p,'z',roll*degrees);
          // 40 GUI pixels / 16 model units, at GUI scale 2, in an 80px panel.
          return [-p[0]/8,-p[1]/8,-p[2]/20];
        };
        const quad = (points: readonly Point[], uv: Uv, fold: number, pivot: Point) => {
          const [u,v,w,h] = uv;
          const corners = [[u+w,v],[u,v],[u,v+h],[u+w,v+h]];
          const a=points[0]!,b=points[1]!,c=points[2]!;
          const ab:Point=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ac:Point=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
          let normal:Point=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
          const magnitude=Math.hypot(...normal) || 1;
          normal=[normal[0]/magnitude,normal[1]/magnitude,normal[2]/magnitude];
          normal=rotate(rotate(rotate(normal,'y',fold),'x',Math.PI),'y',(yaw-(1-bounded)*90)*degrees);
          // Empirical directional weights in GUI pose space, before camera
          // pitch/roll. They fit opaque native cover, page and page-edge texels;
          // they are not a claim to have recovered the native shader equation.
          const shade=lighting==='unlit' ? 1 : .579*normal[0]**2+(normal[1]>=0 ? .995 : .614)*normal[1]**2+.72*normal[2]**2;
          for (const index of [0,1,2,0,2,3]) {
            coordinates.push(...transform(points[index]!,fold,pivot));
            uvs.push(corners[index]![0]!/64,corners[index]![1]!/32);
            shades.push(shade);
          }
        };
        // Standard unfolded box UVs, verified against the official Java
        // client's ModelPart.Cube. Thin covers still have distinct front/back
        // faces; the page blocks have real one-model-unit edges.
        const box = (origin: Point, size: Point, uv: readonly [number,number], fold: number, pivot: Point = [0,0,0]) => {
          const [x,y,z]=origin, [w,h,d]=size, [u,v]=uv;
          const p: Point[] = [[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z],
            [x,y,z+d],[x+w,y,z+d],[x+w,y+h,z+d],[x,y+h,z+d]];
          const face = (indices: number[], rect: Uv) => quad(indices.map(index=>p[index]!),rect,fold,pivot);
          face([5,4,0,1],[u+d,v,w,d]);
          face([2,3,7,6],[u+d+w,v+d,w,-d]);
          face([0,4,7,3],[u,v+d,d,h]);
          face([1,0,3,2],[u+d,v+d,w,h]);
          face([5,1,2,6],[u+d+w,v+d,d,h]);
          face([4,5,6,7],[u+2*d+w,v+d,w,h]);
        };
        const angle = 1.25 * bounded;
        const pagePivot: Point = [Math.sin(angle),0,0];
        const flip = (offset: number) => Math.max(0,Math.min(1,((pageFlip+offset)%1+1)%1*1.6-.3));
        box([-6,-5,-.005],[6,10,.005],[0,0],Math.PI+angle,[0,0,-1]);
        box([0,-5,-.005],[6,10,.005],[16,0],-angle,[0,0,1]);
        box([-1,-5,0],[2,10,.005],[12,0],Math.PI/2);
        box([0,-4,-.99],[5,8,1],[0,10],angle,pagePivot);
        box([0,-4,-.01],[5,8,1],[12,10],-angle,pagePivot);
        box([0,-4,0],[5,8,.005],[24,10],angle*(1-2*flip(.25)),pagePivot);
        box([0,-4,0],[5,8,.005],[24,10],angle*(1-2*flip(.75)),pagePivot);
        const attribute = (name: string, data: number[], size: number) => {
          const buffer = gl.createBuffer(); if (!buffer) throw new Error('Cannot allocate book buffer');
          buffers.push(buffer); gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
          const location = gl.getAttribLocation(program!,name); gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location,size,gl.FLOAT,false,0,0);
        };
        attribute('p',coordinates,3); attribute('uv',uvs,2); attribute('shade',shades,1);
        texture=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.uniform1i(gl.getUniformLocation(program,'atlas'),0);
        gl.viewport(0,0,node.width,node.height); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST); gl.drawArrays(gl.TRIANGLES,0,coordinates.length/3);
      } catch (error) { onRendererError?.(error instanceof Error ? error.message : String(error)); }
    };
    image.onerror = () => { if (!disposed) onRendererError?.('Cannot load the book atlas.'); };
    image.src = textureUrl;
    return () => { disposed=true; image.onload=null; image.onerror=null; cleanup(); };
  },[textureUrl,open,pageFlip,lighting,yaw,pitch,roll,width,height,onRendererError]);
  return <canvas {...props} ref={element => { canvas.current=element; if (typeof forwardedRef === 'function') forwardedRef(element); else if (forwardedRef) forwardedRef.current=element; }}
    role="img" aria-label={label} width={width} height={height} data-fidelity="renderer-reconstruction" data-geometry-source="java-1.21.5-book-model" data-lighting={lighting} data-calibration-source="bedrock-1.26.6005-native-png"
    className={['mc-enchanting-book',className].filter(Boolean).join(' ')}/>;
});
