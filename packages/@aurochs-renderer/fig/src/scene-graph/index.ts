/**
 * @file Scene graph module
 *
 * Format-agnostic intermediate representation for Figma rendering.
 */

// Types
export type {
  SceneNodeId,
  Point,
  AffineMatrix,
  Color,
  GradientStop,
  Fill,
  SolidFill,
  LinearGradientFill,
  RadialGradientFill,
  AngularGradientFill,
  DiamondGradientFill,
  ImageFill,
  Stroke,
  StrokeLayer,
  Effect,
  DropShadowEffect,
  InnerShadowEffect,
  LayerBlurEffect,
  BackgroundBlurEffect,
  PathCommand,
  PathContour,
  CornerRadius,
  ArcData,
  ClipShape,
  RectClip,
  PathClip,
  MaskNode,
  TextLineLayout,
  TextLineBounds,
  SceneNodeBase,
  GroupNode,
  FrameNode,
  RectNode,
  EllipseNode,
  PathNode,
  TextNode,
  ImageNode,
  SceneNode,
  SceneGraph,
  BlendMode,
} from "./types";

export { createNodeId } from "./types";

// Builder
export { buildSceneGraph, type BuildSceneGraphOptions } from "./builder";

// Diff
export {
  diffSceneGraphs,
  hasDiffOps,
  type DiffOp,
  type AddOp,
  type RemoveOp,
  type UpdateOp,
  type ReorderOp,
  type SceneGraphDiff,
} from "./diff";

// Render — shared SoT for SceneGraph → SVG attribute resolution
// Both SVG string and React renderers MUST consume these exclusively.
export {
  colorToHex,
  uint8ArrayToBase64,
  matrixToSvgTransform,
  contourToSvgD,
  resolveFill,
  resolveTopFill,
  resolveStroke,
  resolveEffects,
  type ResolvedFill,
  type ResolvedFillAttrs,
  type ResolvedFillDef,
  type ResolvedGradientStop,
  type ResolvedLinearGradient,
  type ResolvedRadialGradient,
  type ResolvedImagePattern,
  type ResolvedStrokeAttrs,
  type ResolvedFilter,
  type ResolvedFilterPrimitive,
  type IdGenerator,
} from "./render";

// RenderTree — intermediate representation for SVG/React/WebGL backends
export {
  resolveRenderTree,
  type RenderTree,
  type RenderNode,
  type RenderNodeBase,
  type RenderGroupNode,
  type RenderFrameNode,
  type RenderFrameBackground,
  type RenderRectNode,
  type RenderEllipseNode,
  type RenderPathNode,
  type RenderPathContour,
  type RenderTextNode,
  type RenderTextGlyphs,
  type RenderTextLines,
  type RenderImageNode,
  type RenderDef,
  type RenderGradientDef,
  type RenderLinearGradientDef,
  type RenderRadialGradientDef,
  type RenderFilterDef,
  type RenderClipPathDef,
  type RenderPatternDef,
  type ClipPathShape,
  type ResolvedWrapperAttrs,
  type ResolvedFillResult,
} from "./render-tree";

// Converters
export {
  figColorToSceneColor,
  convertPaintToFill,
  convertPaintsToFills,
  convertStrokeToSceneStroke,
  convertEffectsToScene,
  parseSvgPathD,
  decodeGeometryToContours,
  convertVectorPathsToContours,
  convertTextNode,
  type TextConversionResult,
} from "./convert";
