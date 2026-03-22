/**
 * @file pptx-slide-pipeline — barrel exports for slide transform and render helpers
 * @packageDocumentation
 *
 * **pptx-slide-pipeline** — Coordinate transforms and render-time data resolution for slide shapes (logic layer).
 *
 * - Transform helpers for DOM / edit operations (`pptx-transform`)
 * - Fill and stroke extraction (`pptx-render`)
 * - Render payload collection for EditorCanvas (`pptx-render-resolver`)
 */

export {
  withUpdatedTransform,
  getAbsoluteBounds,
  hasEditableTransform,
  pptxTransformResolver,
} from "./pptx-transform";

export { getFillColor, getStrokeColor, getStrokeWidth } from "./pptx-render";

export { pptxRenderResolver, collectPptxShapeRenderData } from "./pptx-render-resolver";
