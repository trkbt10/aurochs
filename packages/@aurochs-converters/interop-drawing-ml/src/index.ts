/**
 * @file @aurochs-converters/interop-drawing-ml
 *
 * Bidirectional conversion between Figma domain types and
 * ECMA-376 DrawingML domain types.
 *
 * DrawingML serves as the canonical intermediate representation
 * for all OOXML↔Fig conversions. Both fig-to-pptx and pptx-to-fig
 * converters delegate to this module for color, fill, stroke,
 * effects, and transform conversions.
 */

export {
  figColorToColor,
  figColorToHex,
  figFillsToDml,
  figStrokeToDml,
  figEffectsToDml,
  figTransformToDml,
} from "./fig-to-dml";

export {
  dmlColorToFig,
  dmlFillToFig,
  dmlLineTofig,
  dmlEffectsToFig,
  dmlTransformToFig,
  diagramShapesToFig,
  chartToFigNodes,
  type FigStrokeResult,
  type FigTransformResult,
} from "./dml-to-fig";
