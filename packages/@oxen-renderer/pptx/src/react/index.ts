/**
 * @file React SVG Renderer
 *
 * React component-based renderer for PPTX slides.
 * Converts Slide domain objects to React SVG elements.
 *
 * Unlike the string-based SVG renderer (svg/), this renderer:
 * - Outputs React JSX elements directly
 * - Enables conditional rendering (e.g., hiding text during editing)
 * - Integrates naturally with React state and props
 */

// Context
export {
  RenderProvider,
  useRenderContext,
  createDefaultReactRenderContext,
  type ReactRenderContext,
  type RenderProviderProps,
} from "./context";

// Hooks - SVG Defs
export {
  SvgDefsProvider,
  SvgDefsCollector,
  useSvgDefs,
  LinearGradientDef,
  RadialGradientDef,
  PatternDef,
  ClipPathDef,
} from "./hooks/useSvgDefs";

// Hooks - Animation
export type { UseAnimationPlayerOptions, UseAnimationPlayerResult } from "./hooks/useAnimationPlayer";
export { useAnimationPlayer } from "./hooks/useAnimationPlayer";

export type { UseSlideAnimationOptions, UseSlideAnimationResult } from "./hooks/useSlideAnimation";
export { useSlideAnimation } from "./hooks/useSlideAnimation";

// Hooks - Slide Transition
export type { UseSlideTransitionOptions, UseSlideTransitionResult } from "./hooks/useSlideTransition";
export { useSlideTransition } from "./hooks/useSlideTransition";

// Hooks - Lazy SVG Cache
export type { UseLazySvgCacheResult } from "./hooks/useLazySvgCache";
export { useLazySvgCache } from "./hooks/useLazySvgCache";

// SVG Content Renderer
export { SvgContentRenderer, type SvgContentRendererProps, type SvgRenderMode } from "./SvgContentRenderer";

// Primitives
export {
  useFill,
  resolveFillForReact,
  useStroke,
  resolveStrokeForReact,
  combineShapeProps,
  GeometryPath,
  RectPath,
  PathElement,
  getGeometryPathData,
  TextRenderer,
  type SvgFillProps,
  type FillResult,
  type SvgStrokeProps,
  type PathElementProps,
  type TextRendererProps,
} from "./primitives";

// Text helpers used by editor overlay
export {
  applyTextTransform,
  applyVerticalAlign,
  buildFontFamily,
  toSvgDominantBaseline,
} from "./primitives/text/text-utils";

export { createLayoutParagraphMeasurer } from "./text-measure/layout-bridge";
export { measureLayoutSpanTextWidth } from "./text-measure/span-measure";

// DrawingML helpers used by editor/tests
// NOTE: For ColorSwatch, ColorSwatchRow, getSupportedPatterns, createTextEffectsFilterDef,
// import directly from @oxen-renderer/drawing-ml

// PPTX-specific shape style hook
export { useShapeStyle, type PptxShapeStyleInput as ShapeStyleInput } from "./hooks/useShapeStylePptx";

// DrawingML adapter for shared rendering
export { createDrawingMLContext, getDrawingMLProviderProps } from "./drawing-ml-adapter";

// Shapes
export {
  SpShapeRenderer,
  PicShapeRenderer,
  CxnShapeRenderer,
  GrpShapeRenderer,
  GraphicFrameRenderer,
  buildTransformAttr,
  buildGroupTransformAttr,
  type SpShapeRendererProps,
  type PicShapeRendererProps,
  type CxnShapeRendererProps,
  type GrpShapeRendererProps,
  type GraphicFrameRendererProps,
} from "./shapes";

// Shape Renderer
export { ShapeRenderer, type ShapeRendererProps } from "./ShapeRenderer";

// Background
export {
  ResolvedBackgroundRenderer,
  BackgroundRenderer,
  type ResolvedBackgroundRendererProps,
  type BackgroundRendererProps,
} from "./Background";

// Slide Renderer
export { SlideRenderer, SlideRendererSvg, type SlideRendererProps, type SlideRendererSvgProps } from "./SlideRenderer";
