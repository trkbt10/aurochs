/**
 * @file Diagram shape generator (PPTX adapter)
 *
 * Delegates layout calculation to `@oxen-office/diagram` and converts the
 * format-agnostic `LayoutShapeResult` outputs into PPTX `SpShape`.
 */

import type {
  DiagramColorsDefinition,
  DiagramDataModel,
  DiagramLayoutDefinition,
  DiagramStyleDefinition,
} from "@oxen-office/diagram/domain";
import {
  generateDiagramLayoutResults,
  type ShapeGenerationConfig as DiagramShapeGenerationConfig,
  type LayoutBounds,
} from "@oxen-office/diagram/layout-engine";
import type { SpShape } from "../../shape";
import { convertLayoutResultToSpShape } from "../../../adapters/diagram-to-shape";
import type { DiagramTreeBuildResult } from "@oxen-office/diagram/layout-engine";

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

export function generateDiagramShapes(
  { dataModel, layoutDefinition, styleDefinition, colorDefinition, config }: GenerateDiagramShapesOptions,
): ShapeGenerationResult {
  const result = generateDiagramLayoutResults(
    dataModel,
    layoutDefinition,
    styleDefinition,
    colorDefinition,
    config
  );

  return {
    shapes: result.shapes.map(convertLayoutResultToSpShape),
    bounds: result.bounds,
    treeResult: result.treeResult,
  };
}
