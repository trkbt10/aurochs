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

// Hooks
export {
  SvgDefsProvider,
  SvgDefsCollector,
  useSvgDefs,
  LinearGradientDef,
  RadialGradientDef,
  PatternDef,
  ClipPathDef,
} from "./hooks/useSvgDefs";

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
export {
  SlideRenderer,
  SlideRendererSvg,
  type SlideRendererProps,
  type SlideRendererSvgProps,
} from "./SlideRenderer";
