/**
 * @file Shape factory functions
 *
 * Creates new shapes with default properties for the editor.
 * Adds pptx-editor-specific factories (table/chart/diagram) on top of ooxml-components.
 */

import type { Shape } from "@aurochs-office/pptx/domain";
import type { CreationMode } from "@aurochs-ui/ooxml-components";
import type { ShapeBounds } from "@aurochs-ui/ooxml-components";
import {
  createShapeFromMode as baseCreateShapeFromMode,
  generateShapeId,
} from "@aurochs-ui/ooxml-components";
import { createTableGraphicFrame, createChartGraphicFrame, createDiagramGraphicFrame } from "../graphic-frame/factory";

// Re-export createCustomGeometryShape (pptx-specific)
export { createCustomGeometryShape } from "./custom-geometry-factory";

// =============================================================================
// Create Shape from Mode (extended version with table/chart/diagram)
// =============================================================================

/**
 * Create a shape based on the current creation mode.
 *
 * Extends the base createShapeFromMode from ooxml-components
 * with pptx-editor-specific graphic frame types (table/chart/diagram).
 */
export function createShapeFromMode(mode: CreationMode, bounds: ShapeBounds): Shape | undefined {
  // Try base factory first (shape/textbox/connector)
  const base = baseCreateShapeFromMode(mode, bounds);
  if (base) {return base;}

  // Handle pptx-editor-specific graphic frame types
  const id = generateShapeId();

  switch (mode.type) {
    case "table":
      return createTableGraphicFrame({ id, bounds, rows: mode.rows, cols: mode.cols });
    case "chart":
      return createChartGraphicFrame(id, bounds, mode.chartType);
    case "diagram":
      return createDiagramGraphicFrame(id, bounds, mode.diagramType);
    default:
      return undefined;
  }
}
