/**
 * @file Primitives Index
 *
 * Re-exports all primitive components and utilities.
 */

export { useFill, resolveFillForReact, type SvgFillProps, type FillResult } from "./Fill";
export { useStroke, resolveStrokeForReact, combineShapeProps, type SvgStrokeProps } from "./Stroke";
export {
  GeometryPath,
  RectPath,
  PathElement,
  getGeometryPathData,
  type PathElementProps,
} from "./Geometry";
export { TextRenderer, extractText3DRuns, type TextRendererProps } from "./text";
