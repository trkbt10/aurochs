/**
 * @file Diagram shape generator (PPTX adapter)
 *
 * Delegates layout calculation to `@aurochs-office/diagram` and converts the
 * format-agnostic `LayoutShapeResult` outputs into PPTX `SpShape`.
 */

import type {
  DiagramColorsDefinition,
  DiagramDataModel,
  DiagramLayoutDefinition,
  DiagramStyleDefinition,
} from "@aurochs-office/diagram/domain";
import {
  generateDiagramLayoutResults,
  type ShapeGenerationConfig as DiagramShapeGenerationConfig,
  type LayoutBounds,
} from "@aurochs-office/diagram/layout-engine";
import type { SpShape } from "../../shape";
import { convertLayoutResultToSpShape } from "../../../adapters/diagram-to-shape";
import type { DiagramTreeBuildResult } from "@aurochs-office/diagram/layout-engine";

export type ShapeGenerationResult = {
  readonly shapes: readonly SpShape[];
  readonly bounds: LayoutBounds;
  readonly treeResult: DiagramTreeBuildResult;
};

export type ShapeGenerationConfig = DiagramShapeGenerationConfig;

export type GenerateDiagramShapesOptions = {
  readonly dataModel: DiagramDataModel;
  readonly layoutDefinition: DiagramLayoutDefinition | undefined;
  readonly styleDefinition: DiagramStyleDefinition | undefined;
  readonly colorDefinition: DiagramColorsDefinition | undefined;
  readonly config: ShapeGenerationConfig;
};

/** Generate PPTX SpShape array from diagram definitions */
export function generateDiagramShapes({
  dataModel,
  layoutDefinition,
  styleDefinition,
  colorDefinition,
  config,
}: GenerateDiagramShapesOptions): ShapeGenerationResult {
  const result = generateDiagramLayoutResults(dataModel, layoutDefinition, styleDefinition, colorDefinition, config);

  return {
    shapes: result.shapes.map(convertLayoutResultToSpShape),
    bounds: result.bounds,
    treeResult: result.treeResult,
  };
}
