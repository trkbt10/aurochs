/**
 * @file Primitives module exports
 *
 * Format-agnostic fill and stroke rendering primitives.
 */

export {
  useFillWithDefs,
  resolveFillForReact,
  resolvedFillToResult,
  type SvgFillProps,
  type FillResult,
  type FillWithDefsResult,
} from "./Fill";

export {
  useStroke,
  resolveStrokeForReact,
  resolvedLineToProps,
  combineShapeProps,
  type SvgStrokeProps,
} from "./Stroke";
