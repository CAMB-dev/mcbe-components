/** Private finite NPC portrait material. Existing GUI kernels are separate. */
export function guiEntityVertexShader(bones: number): string {
  if (!Number.isSafeInteger(bones) || bones < 1 || bones > 32) throw new RangeError('Entity shader palette must contain 1 to 32 bones.');
  const select = Array.from({ length: bones }, (_, index) => `${index ? 'else ' : ''}if (boneIndex == ${index}.0) skin = bonePalette[${index}];`).join('\n');
  return `
attribute vec3 position;
attribute vec2 packedUv;
attribute vec4 normal;
attribute float boneIndex;
uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;
uniform mat4 bonePalette[${bones}];
uniform vec4 tileLightColor;
uniform vec3 fogControl;
uniform vec3 fogColor;
uniform vec4 uvAnimation;
uniform vec2 subPixelOffset;
varying highp vec2 uv;
varying highp vec3 lightRgb;
varying highp vec4 fog;
void main() {
  mat4 skin = bonePalette[0];
  ${select}
  mat4 combined = model * skin;
  vec3 world = (combined * vec4(position, 1.0)).xyz;
  vec4 viewPosition = view * vec4(world, 1.0);
  mat4 adjustedProjection = projection;
  adjustedProjection[2].x += subPixelOffset.x;
  adjustedProjection[2].y -= subPixelOffset.y;
  vec4 originalClip = adjustedProjection * viewPosition;
  gl_Position = vec4(originalClip.xy, 2.0 * originalClip.z - originalClip.w, originalClip.w);
  vec4 n = combined * vec4(normal.xyz, 0.0);
  float reciprocalLength = inversesqrt(dot(n, n));
  float nx = n.x * reciprocalLength;
  float nz = n.z * reciprocalLength;
  float ny = (n.y * tileLightColor.w) * reciprocalLength;
  float brightness = ((0.44999998807907104 - nx * nx * 0.10000000149011612)
    + nz * nz * 0.10000000149011612) + (ny + 1.0) * 0.2750000059604645;
  lightRgb = brightness * tileLightColor.rgb;
  fog = vec4(fogColor, clamp((originalClip.z / fogControl.z - fogControl.x)
    / (fogControl.y - fogControl.x), 0.0, 1.0));
  uv = packedUv * uvAnimation.zw + uvAnimation.xy;
}`;
}

export const GUI_ENTITY_FRAGMENT_SHADER = `
precision highp float;
uniform sampler2D source;
uniform vec4 materialColor;
varying highp vec2 uv;
varying highp vec3 lightRgb;
varying highp vec4 fog;
void main() {
  vec4 value = texture2D(source, uv) * materialColor;
  if (value.a < 0.5) discard;
  vec3 rgb = value.rgb * lightRgb;
  rgb = rgb + (fog.rgb - rgb) * fog.a;
  gl_FragColor = vec4(rgb, 1.0);
}`;
