/** Private, byte-preserved UI image/packed-cell font shader kernels. */

export const GUI_IMAGE_VERTEX_SHADER = `
attribute vec2 position;
attribute vec2 packedUv;
uniform mat4 mvp;
varying highp vec2 uv;
void main() {
  gl_Position = mvp * vec4(position, 0.0, 1.0);
  uv = packedUv;
}`;

export const GUI_IMAGE_FRAGMENT_SHADER = `
precision highp float;
uniform sampler2D source;
uniform vec4 tint;
uniform float hudOpacity;
varying highp vec2 uv;
void main() {
  vec4 value = texture2D(source, uv);
  gl_FragColor = vec4(value.rgb * tint.rgb, (value.a * tint.a) * hudOpacity);
}`;

export const GUI_COPY_VERTEX_SHADER = `
attribute vec2 position;
varying highp vec2 uv;
void main() { gl_Position = vec4(position, 0.0, 1.0); uv = (position + 1.0) * 0.5; }`;

export const GUI_COPY_FRAGMENT_SHADER = `
precision highp float;
uniform sampler2D source;
varying highp vec2 uv;
void main() { gl_FragColor = texture2D(source, uv); }`;

export const GUI_BITMAP_CELL_VERTEX_SHADER = `
attribute vec3 position;
attribute vec2 packedUv;
attribute vec4 color;
uniform mat4 mvp;
uniform float glyphHeight;
uniform float halfTexel;
varying highp vec2 uv;
varying highp vec4 bounds;
varying highp vec4 ink;
void main() {
  int corner = int(position.z);
  float dx = (corner == 1 || corner == 2) ? 0.0625 : 0.0;
  float dy = corner < 2 ? glyphHeight : 0.0;
  uv = packedUv + vec2(dx, dy);
  bounds = vec4(packedUv + halfTexel, packedUv + vec2(0.0625, glyphHeight) - halfTexel);
  vec4 clip = position.x * mvp[0] + position.y * mvp[1] + mvp[3];
  gl_Position = vec4(clip.xy, 0.0, clip.w);
  ink = color;
}`;

export const GUI_BITMAP_FRAGMENT_SHADER = `
precision highp float;
uniform sampler2D atlas;
uniform vec4 tint;
uniform float hudOpacity;
uniform bool smoothBitmap;
varying highp vec2 uv;
varying highp vec4 bounds;
varying highp vec4 ink;
void main() {
  vec4 value = texture2D(atlas, clamp(uv, bounds.xy, bounds.zw));
  if (smoothBitmap) {
    vec4 t = clamp((value - 0.300000011920928955078125) * 5.000000476837158203125, 0.0, 1.0);
    value = t * t * (3.0 - 2.0 * t);
  }
  gl_FragColor = value * ink * tint;
  gl_FragColor.a *= hudOpacity;
}`;
