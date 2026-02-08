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
  ImageFill,
  Stroke,
  Effect,
  DropShadowEffect,
  InnerShadowEffect,
  LayerBlurEffect,
  BackgroundBlurEffect,
  PathCommand,
  PathContour,
  ClipShape,
  RectClip,
  PathClip,
  MaskNode,
  FallbackTextData,
  FallbackTextLine,
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

// Converters
export * as convert from "./convert";
