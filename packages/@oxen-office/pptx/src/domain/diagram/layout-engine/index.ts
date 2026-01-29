/**
 * @file Diagram layout-engine facade (PPTX)
 *
 * The format-agnostic layout engine lives in `@oxen-office/diagram`.
 * This module keeps the existing PPTX API surface (`generateDiagramShapes`)
 * by adapting `LayoutShapeResult` into PPTX `SpShape`.
 */

export {
  generateDiagramShapes,
  type ShapeGenerationResult,
  type ShapeGenerationConfig,
} from "./shape-generator";

