/**
 * @file RenderTree module — intermediate representation between SceneGraph and backends
 */

// Types
export type {
  RenderTree,
  RenderNode,
  RenderNodeBase,
  RenderGroupNode,
  RenderFrameNode,
  RenderFrameBackground,
  RenderRectNode,
  RenderEllipseNode,
  RenderPathNode,
  RenderPathContour,
  RenderTextNode,
  RenderTextGlyphs,
  RenderTextLines,
  RenderImageNode,
  RenderDef,
  RenderGradientDef,
  RenderLinearGradientDef,
  RenderRadialGradientDef,
  RenderFilterDef,
  RenderClipPathDef,
  RenderPatternDef,
  ClipPathShape,
  ResolvedWrapperAttrs,
  ResolvedFillResult,
} from "./types";

// Resolver
export { resolveRenderTree } from "./resolve";
