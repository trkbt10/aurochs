/**
 * @file Creation mode types
 *
 * Shared types for shape creation modes used by both pptx-editor and potx-editor.
 */

// =============================================================================
// Creation Mode Types
// =============================================================================

/**
 * Preset shape types for creation
 */
export type CreationPresetShape =
  | "rect"
  | "roundRect"
  | "ellipse"
  | "triangle"
  | "rtTriangle"
  | "diamond"
  | "pentagon"
  | "hexagon"
  | "star5"
  | "rightArrow"
  | "leftArrow"
  | "upArrow"
  | "downArrow"
  | "line";

/**
 * Chart types for creation
 */
export type CreationChartType = "bar" | "line" | "pie";

/**
 * Diagram types for creation
 */
export type CreationDiagramType = "process" | "cycle" | "hierarchy" | "relationship";

/**
 * Smoothing level for pencil tool
 */
export type SmoothingLevel = "low" | "medium" | "high";

/**
 * Creation mode - determines what happens on canvas click/drag
 */
export type CreationMode =
  | { readonly type: "select" }
  | { readonly type: "shape"; readonly preset: CreationPresetShape }
  | { readonly type: "textbox" }
  | { readonly type: "picture" }
  | { readonly type: "connector" }
  | { readonly type: "table"; readonly rows: number; readonly cols: number }
  | { readonly type: "chart"; readonly chartType: CreationChartType }
  | { readonly type: "diagram"; readonly diagramType: CreationDiagramType }
  | { readonly type: "pen" }
  | { readonly type: "pencil"; readonly smoothing: SmoothingLevel }
  | { readonly type: "path-edit" };

/**
 * Create default select mode
 */
export function createSelectMode(): CreationMode {
  return { type: "select" };
}

/**
 * Compare two creation modes for equality
 */
export function isSameMode(a: CreationMode, b: CreationMode): boolean {
  if (a.type !== b.type) {
    return false;
  }
  if (a.type === "shape" && b.type === "shape") {
    return a.preset === b.preset;
  }
  if (a.type === "table" && b.type === "table") {
    return a.rows === b.rows && a.cols === b.cols;
  }
  if (a.type === "chart" && b.type === "chart") {
    return a.chartType === b.chartType;
  }
  if (a.type === "diagram" && b.type === "diagram") {
    return a.diagramType === b.diagramType;
  }
  // For pencil mode, we only compare the type (smoothing can be different)
  // This ensures the button stays active regardless of smoothing level
  return true;
}
