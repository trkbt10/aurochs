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
  RenderAngularGradientDef,
  RenderDiamondGradientDef,
  RenderFilterDef,
  RenderClipPathDef,
  RenderPatternDef,
  RenderMaskDef,
  RenderStrokeMaskDef,
  RenderMask,
  ClipPathShape,
  ResolvedWrapperAttrs,
  ResolvedFillResult,
  ResolvedFillLayer,
  RenderBackgroundBlur,
  StrokeRendering,
  StrokeShape,
} from "./types";

// Wrapper field registry (SoT for ResolvedWrapperAttrs exhaustiveness)
export { WRAPPER_ATTRS_FIELDS } from "./types";

// Resolver
export { resolveRenderTree } from "./resolve";
