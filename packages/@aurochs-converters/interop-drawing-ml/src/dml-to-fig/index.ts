/**
 * @file DrawingML → Fig conversion functions
 *
 * Converts ECMA-376 DrawingML domain types to Figma domain types.
 * These are the canonical conversions shared by all OOXML→Fig pipelines.
 */

export { dmlColorToFig } from "./color";
export { dmlFillToFig } from "./fill";
export { dmlLineTofig, type FigStrokeResult } from "./line";
export { dmlEffectsToFig } from "./effects";
export { dmlTransformToFig, type FigTransformResult } from "./transform";
