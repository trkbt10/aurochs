/**
 * @file presentation-slide-creation — barrel exports for canvas creation tools
 * @packageDocumentation
 *
 * **presentation-slide-creation** — Creation flow on the presentation canvas (shapes, text boxes, connectors, …).
 *
 * - Creation mode types and cursor resolution (`creation-types`)
 * - Drag-to-create and default bounds (`use-creation-drag`, `shape-factory`)
 * - Floating / embedded toolbar (`CreationToolbar`)
 */

export type {
  CreationPresetShape,
  CreationChartType,
  CreationDiagramType,
  SmoothingLevel,
  CreationMode,
} from "./creation-types";
export { createSelectMode, isSameMode, getCursorForCreationMode } from "./creation-types";

export type { ShapeBounds } from "./shape-factory";
export {
  createSpShape,
  createTextBox,
  createConnector,
  createPicShape,
  createBoundsFromDrag,
  getDefaultBoundsForMode,
  generateShapeId,
  resetShapeCounter,
  createShapeFromMode,
} from "./shape-factory";

export { useCreationDrag, type UseCreationDragOptions, type UseCreationDragResult } from "./use-creation-drag";

export { CreationToolbar, type CreationToolbarProps } from "./CreationToolbar";
