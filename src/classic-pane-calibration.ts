import type {GuiCuboidModelOptions, GuiModelFace, GuiModelProjection} from './gui-model-geometry';

type Uv = readonly [number, number];
const quad = (a: Uv, b: Uv, c: Uv, d: Uv): GuiModelFace['uv'] => Object.freeze([
  Object.freeze(a), Object.freeze(b), Object.freeze(c), Object.freeze(d),
]);
const color = (shade: number) => Object.freeze([shade, shade, shade, 0] as const);

/**
 * Explicit finite Classic glass-pane reference calibration for GUI4/5 at DPR1.
 * Call createGuiCuboidModel(min, max, options), then supply whole edge/body
 * textures and this projection. The referenceAtlas contains placement metadata,
 * never captured texture pixels. Only up/east/south are native-qualified;
 * opposite faces are conventional authored counterparts. Not automatic fitting
 * or a recovered engine camera/UV rule. See CLASSIC_PANE_CALIBRATION.md.
 */
export const classicPaneModelCalibration = Object.freeze({
  min: Object.freeze([0, 0, 7] as const),
  max: Object.freeze([16, 16, 9] as const),
  options: Object.freeze({
    textures: Object.freeze({up: 'edge', down: 'edge', east: 'edge', west: 'edge', south: 'body', north: 'body'}),
    colors: Object.freeze({up: color(255), down: color(255), east: color(127), west: color(255), south: color(186), north: color(255)}),
    uvs: Object.freeze({
      up: quad([5.8,16], [5.8,0], [3.8,0], [3.8,16]),
      down: quad([5.8,0], [5.8,16], [3.8,16], [3.8,0]),
      east: quad([3.8,0], [3.8,16], [5.8,16], [5.8,0]),
      west: quad([3.8,0], [5.8,0], [5.8,16], [3.8,16]),
      south: quad([16,0], [0,0], [0,16], [16,16]),
      north: quad([0,0], [16,0], [16,16], [0,16]),
    }),
  } satisfies GuiCuboidModelOptions),
  projection: Object.freeze({
    yaw: 45, pitch: 30, scale: 0.75,
    offset: Object.freeze([7.782169914110089, 9.085484312880716] as const),
    originQuantization: 'physical-floor',
  } satisfies GuiModelProjection),
  referenceAtlas: Object.freeze({
    width: 1024, height: 512,
    origins: Object.freeze({body: Object.freeze([816,224] as const), edge: Object.freeze([832,224] as const)}),
  }),
});
