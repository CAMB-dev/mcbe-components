import { forwardRef } from 'react';
import type { CSSProperties, HTMLAttributes, ImgHTMLAttributes } from 'react';

export type ImageSize = readonly [width: number, height: number];
export interface ImageInsets { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number }

function dimension(value: number, name: string, zero = false) {
  if (!Number.isFinite(value) || (zero ? value < 0 : value <= 0)) throw new RangeError(`${name} must be ${zero ? 'non-negative' : 'positive'} and finite.`);
  return value;
}
function pixel(value: number, name: string, zero = false) {
  dimension(value,name,zero);
  if (!Number.isSafeInteger(value)) throw new RangeError(`${name} must be an integer pixel value.`);
  return value;
}
function sourceDimensions(size: ImageSize) {
  pixel(size[0],'sourceSize width'); pixel(size[1],'sourceSize height');
}
function insets(value: number | ImageInsets, name: string, source = false): ImageInsets {
  const result = typeof value === 'number' ? { left:value,top:value,right:value,bottom:value } : value;
  for (const side of ['left','top','right','bottom'] as const) {
    if (source) pixel(result[side],`${name}.${side}`,true);
    else dimension(result[side],`${name}.${side}`,true);
  }
  return result;
}
const edges = (value: ImageInsets) => `${value.top} ${value.right} ${value.bottom} ${value.left}`;
const scaledEdges = (value: ImageInsets, scale: number) => `${value.top*scale}px ${value.right*scale}px ${value.bottom*scale}px ${value.left*scale}px`;

export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'width' | 'height' | 'children' | 'dangerouslySetInnerHTML'> {
  src: string;
  /** Empty for decoration; otherwise describe the image's meaning. */
  alt: string;
  /** The actual physical PNG dimensions, independent of Bedrock base_size. */
  sourceSize: ImageSize;
  /** Display size in logical GUI pixels, before scale. Defaults to sourceSize. */
  size?: ImageSize;
  /** Positive integer GUI scale. Defaults to 1. */
  scale?: number;
}

/** A source-backed native image. No item, inventory or texture-fetching behavior. */
export const Image = forwardRef<HTMLImageElement, ImageProps>(function Image({
  src, alt, sourceSize, size = sourceSize, scale = 1, draggable = false, className, style, ...props
}, ref) {
  sourceDimensions(sourceSize); pixel(scale,'scale');
  const width=dimension(size[0]*scale,'display width'), height=dimension(size[1]*scale,'display height');
  return <img {...props} ref={ref} src={src} alt={alt} draggable={draggable} width={width} height={height}
    className={['mc-image',className].filter(Boolean).join(' ')}
    style={{ width, height, ...style }}/>;
});

export interface NineSliceProps extends Omit<HTMLAttributes<HTMLDivElement>, 'dangerouslySetInnerHTML'> {
  src: string;
  /** Actual physical PNG dimensions, not the texture JSON's logical base_size. */
  sourceSize: ImageSize;
  /** Physical source-pixel cuts. Object fields are explicitly named, never CSS-order arrays. */
  slice: number | ImageInsets;
  /** Destination edges in logical GUI pixels; defaults to slice. Multiplied by scale. */
  destinationBorder?: number | ImageInsets;
  /** Optional OUTER size in logical GUI pixels, including destination edges. */
  size?: ImageSize;
  /** Positive integer GUI scale. Defaults to 1. */
  scale?: number;
  /** Paint the source's center region. Defaults to true. */
  fill?: boolean;
  /** Names the image layer only. Empty/omitted makes it decorative; children remain accessible. */
  alt?: string;
}

/** An original-PNG frame whose source cuts and destination/content insets are explicit. */
export const NineSlice = forwardRef<HTMLDivElement, NineSliceProps>(function NineSlice({
  src, sourceSize, slice, destinationBorder = slice, size, scale = 1, fill = true, alt = '', children, className, style, ...props
}, ref) {
  sourceDimensions(sourceSize); pixel(scale,'scale');
  const cut=insets(slice,'slice',true), border=insets(destinationBorder,'destinationBorder');
  if (cut.left+cut.right>sourceSize[0] || cut.top+cut.bottom>sourceSize[1]) throw new RangeError('slice edges must not overlap beyond sourceSize.');
  const minWidth=dimension((border.left+border.right)*scale,'destination border width',true);
  const minHeight=dimension((border.top+border.bottom)*scale,'destination border height',true);
  const width=size && dimension(size[0]*scale,'display width'), height=size && dimension(size[1]*scale,'display height');
  if ((width !== undefined && width<minWidth) || (height !== undefined && height<minHeight)) throw new RangeError('size must include the destination border edges.');
  const skin: CSSProperties = {
    borderWidth:scaledEdges(border,scale), borderImageSource:`url(${JSON.stringify(src)})`,
    borderImageSlice:`${edges(cut)}${fill ? ' fill' : ''}`, borderImageWidth:1, borderImageOutset:0, borderImageRepeat:'stretch',
  };
  return <div {...props} ref={ref} className={['mc-nine-slice',className].filter(Boolean).join(' ')}
    style={{ width,height,minWidth,minHeight,padding:scaledEdges(border,scale),...style }}>
    <span className="mc-nine-slice__image" role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} style={skin}/>
    {children}
  </div>;
});
