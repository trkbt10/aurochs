/**
 * @file Text 3D module exports
 *
 * SVG rendering for DrawingML 3D text effects.
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */

export type {
  BevelConfig,
  BevelOffset,
  BevelOffsets,
  ExtrusionOffset,
  Scene3d,
  Shape3d,
  Bevel3d,
  Camera3d,
  LightRig,
  LightRigDirection,
  PresetCameraType,
} from "./types";

export { render3dTextEffects } from "./render-3d-effects";
export { renderTextExtrusion, getExtrusionOffset } from "./extrusion";
export { createTextBevelFilterDef, getBevelOffsets } from "./bevel-filter";
export { calculateCameraTransform, type CameraTransformResult } from "./camera-transform";
