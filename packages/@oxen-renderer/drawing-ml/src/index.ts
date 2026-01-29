/**
 * @file DrawingML Renderer Package
 *
 * Shared React+SVG rendering package for DrawingML elements.
 * Usable by PPTX, DOCX, and XLSX renderers.
 *
 * @see ECMA-376 Part 1, Section 20.1 - DrawingML
 */

// Context
export {
  DrawingMLProvider,
  DrawingMLContext,
  useDrawingMLContext,
  useOptionalDrawingMLContext,
  type DrawingMLProviderProps,
  type DrawingMLRenderContext,
  type SvgDefsManager,
  type WarningCollector,
} from "./context";

// Hooks
export {
  useSvgDefs,
  SvgDefsProvider,
  SvgDefsCollector,
  LinearGradientDef,
  RadialGradientDef,
  PatternDef as SvgPatternDef,
  ClipPathDef,
} from "./hooks";

// Color
export {
  useColor,
  resolveColorForReact,
  ColorSwatch,
  ColorSwatchRow,
  type ResolvedColorResult,
  type ColorSwatchProps,
  type ColorSwatchRowProps,
} from "./color";

// Fill
export {
  PatternDef,
  usePatternFill,
  resolvePatternFillForReact,
  getPatternGeometry,
  isPatternSupported,
  getSupportedPatterns,
  type PatternDefProps,
  type PatternFillResult,
} from "./fill";

// Gradient
export {
  ooxmlAngleToSvgLinearGradient,
  fillToRectToRadialCenter,
  getRadialGradientCoords,
  type LinearGradientCoords,
  type RadialGradientCoords,
} from "./gradient";

// Effects
export {
  ShadowFilterDef,
  GlowFilterDef,
  SoftEdgeFilterDef,
  EffectsFilter,
  EffectsWrapper,
  EffectsFilterDef,
  useEffects,
  resolveEffectsForReact,
  resolveShadowProps,
  resolveGlowProps,
  directionToOffset,
  type ShadowFilterDefProps,
  type GlowFilterDefProps,
  type SoftEdgeFilterDefProps,
  type EffectsResult,
  type ShadowAlignment,
  type ResolvedShadowProps,
  type ResolvedGlowProps,
  type Effects,
  type ShadowEffect,
  type GlowEffect,
  type SoftEdgeEffect,
  type ReflectionEffect,
} from "./effects";

// Text Fill
export {
  createTextGradientDef,
  createTextPatternDef,
  createTextImageFillDef,
  getTextPatternSize,
  renderTextPatternContent,
  type TextGradientDefProps,
  type TextFillConfig,
  type TextGradientFillConfig,
  type TextGradientStop,
  type TextSolidFillConfig,
  type TextNoFillConfig,
  type TextPatternFillConfig,
  type TextImageFillConfig,
} from "./text-fill";

// Text Effects
export {
  createTextEffectsFilterDef,
  type TextEffectsConfig,
  type TextShadowConfig,
  type TextGlowConfig,
  type TextSoftEdgeConfig,
  type TextReflectionConfig,
} from "./text-effects";

// Text 3D
export {
  render3dTextEffects,
  renderTextExtrusion,
  createTextBevelFilterDef,
  getExtrusionOffset,
  getBevelOffsets,
  calculateCameraTransform,
  type BevelConfig,
  type BevelOffset,
  type BevelOffsets,
  type ExtrusionOffset,
  type Scene3d,
  type Shape3d,
  type Bevel3d,
  type Camera3d,
  type LightRig,
  type LightRigDirection,
  type PresetCameraType,
  type CameraTransformResult,
} from "./text-3d";
