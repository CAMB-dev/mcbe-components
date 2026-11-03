import type { GuiModelProjection } from './gui-model-geometry';

/**
 * Explicit reference calibration for the observed Classic inventory block
 * profiles in Bedrock 1.26.6005.0, GUI4/5 at DPR1. This is not an inferred
 * engine default or automatic fitting rule. Geometry, source atlas placement,
 * face colors and the host origin are separate inputs. See the calibration QA.
 */
export const classicBlockModelCalibration: Readonly<GuiModelProjection> = Object.freeze({
  yaw: 45,
  pitch: 30,
  scale: 0.625,
  offset: Object.freeze([1 + 10 / Math.sqrt(2), 8.945084636506264] as const),
  originQuantization: 'physical-floor',
});
