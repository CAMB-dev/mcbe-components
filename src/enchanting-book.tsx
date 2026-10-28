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
  yaw?: number;
  pitch?: number;
  roll?: number;
  onRendererError?: (message: string) => void;
}

type Point = readonly [number, number, number];
type Uv = readonly [number, number, number, number];

/**
 * Optional textured reconstruction, NOT the native enchanting_book_renderer.
 * The source atlas is exact; the native hardcoded mesh/camera remains unverified.
 */
export const EnchantingBook = forwardRef<HTMLCanvasElement, EnchantingBookProps>(function EnchantingBook({
  textureUrl = new URL('./assets/enchanting/enchanting_table_book.png', import.meta.url).href,
  open = 1, yaw = -15, pitch = -25, roll = -18, width = 80, height = 80,
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
        gl.attachShader(program, shader(gl.VERTEX_SHADER, 'attribute vec3 p;attribute vec2 uv;varying vec2 v;void main(){gl_Position=vec4(p,1.0);v=uv;}'));
        gl.attachShader(program, shader(gl.FRAGMENT_SHADER, 'precision mediump float;varying vec2 v;uniform sampler2D atlas;void main(){gl_FragColor=texture2D(atlas,v);}'));
        gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Book program link failed');
        gl.useProgram(program);
        const coordinates: number[] = [], uvs: number[] = [], degrees = Math.PI / 180;
        const bounded = Math.max(0, Math.min(1, open));
        const rotate = ([x, y, z]: Point, axis: 'x' | 'y' | 'z', angle: number): Point => {
          const c = Math.cos(angle), s = Math.sin(angle);
          return axis === 'x' ? [x, y*c-z*s, y*s+z*c] : axis === 'y' ? [x*c+z*s,y,-x*s+z*c] : [x*c-y*s,x*s+y*c,z];
        };
        const transform = (point: Point, fold: number): Point => {
          let p = rotate(point,'y',fold);
          p = rotate(p,'y',yaw*degrees); p = rotate(p,'x',pitch*degrees); p = rotate(p,'z',roll*degrees);
          return [p[0]/9,p[1]/9,-p[2]/20];
        };
        const quad = (points: readonly Point[], uv: Uv, fold: number) => {
          const [u,v,w,h] = uv;
          const corners = [[u,v+h],[u+w,v+h],[u+w,v],[u,v]];
          for (const index of [0,1,2,0,2,3]) {
            coordinates.push(...transform(points[index]!,fold));
            uvs.push(corners[index]![0]!/64,corners[index]![1]!/32);
          }
        };
        // UV rectangles are in the real 64×32 book atlas. Geometry is an
        // explicit reconstruction and must not be used as an exact-match oracle.
        const angle = (90 - bounded * 55) * degrees;
        quad([[-6,-5,0], [0,-5,0], [0,5,0], [-6,5,0]], [0,0,6,10], angle);
        quad([[0,-5,0], [6,-5,0], [6,5,0], [0,5,0]], [16,0,6,10], -angle);
        quad([[-5.4,-4,.16], [-.2,-4,.16], [-.2,4,.16], [-5.4,4,.16]], [1,11,5,8], angle);
        quad([[.2,-4,.16], [5.4,-4,.16], [5.4,4,.16], [.2,4,.16]], [7,11,5,8], -angle);
        quad([[-.25,-5,.18],[.25,-5,.18],[.25,5,.18],[-.25,5,.18]],[12,0,2,10],0);
        const attribute = (name: string, data: number[], size: number) => {
          const buffer = gl.createBuffer(); if (!buffer) throw new Error('Cannot allocate book buffer');
          buffers.push(buffer); gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
          const location = gl.getAttribLocation(program!,name); gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location,size,gl.FLOAT,false,0,0);
        };
        attribute('p',coordinates,3); attribute('uv',uvs,2);
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
  },[textureUrl,open,yaw,pitch,roll,width,height,onRendererError]);
  return <canvas {...props} ref={element => { canvas.current=element; if (typeof forwardedRef === 'function') forwardedRef(element); else if (forwardedRef) forwardedRef.current=element; }}
    role="img" aria-label={label} width={width} height={height} data-fidelity="renderer-reconstruction"
    className={['mc-enchanting-book',className].filter(Boolean).join(' ')}/>;
});
