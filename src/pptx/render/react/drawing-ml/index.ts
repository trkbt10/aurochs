/**
 * @file DrawingML React rendering module
 *
 * React components and hooks for rendering DrawingML elements.
 *
 * @see ECMA-376 Part 1, Section 20.1 - DrawingML
 */

// Color module
export {
  useColor,
  resolveColorForReact,
  ColorSwatch,
  ColorSwatchRow,
  type ResolvedColorResult,
  type ColorSwatchProps,
  type ColorSwatchRowProps,
} from "./color";

// Fill module
export {
  usePatternFill,
  resolvePatternFillForReact,
  PatternDef,
  getPatternGeometry,
  isPatternSupported,
  getSupportedPatterns,
  type PatternFillResult,
  type PatternDefProps,
} from "./fill";

// Background module
export {
  useBackground,
  resolveBackgroundForReact,
  BackgroundFill,
  BackgroundFillWithDefs,
  type BackgroundResult,
} from "./background";

// Effects module
export {
  useEffects,
  resolveEffectsForReact,
  ShadowFilterDef,
  GlowFilterDef,
  SoftEdgeFilterDef,
  EffectsFilter,
  EffectsWrapper,
  EffectsFilterDef,
  directionToOffset,
  resolveShadowProps,
  resolveGlowProps,
  type EffectsResult,
  type ShadowFilterDefProps,
  type GlowFilterDefProps,
  type SoftEdgeFilterDefProps,
  type ResolvedShadowProps,
  type ResolvedGlowProps,
} from "./effects";

// Shape module
export {
  useShapeStyle,
  StyledShape,
  StyledShapeWithStyle,
  type ShapeStyleInput,
  type ShapeStyleResult,
  type ShapeSvgProps,
  type ShapeType,
} from "./shape";

// Text Fill module (ECMA-376 20.1.8 - Text Fill)
export {
  createTextGradientDef,
  createTextPatternDef,
  createTextImageFillDef,
  getTextPatternSize,
  renderTextPatternContent,
  type TextGradientDefProps,
} from "./text-fill";

// Text Effects module (ECMA-376 20.1.8 - Text Effects)
export { createTextEffectsFilterDef } from "./text-effects";

// Text 3D module (ECMA-376 20.1.5 - 3D Properties)
export {
  render3dTextEffects,
  renderTextExtrusion,
  getExtrusionOffset,
  createTextBevelFilterDef,
  getBevelOffsets,
  type BevelConfig,
} from "./text-3d";
