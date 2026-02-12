/**
 * @file DOCX Drawing Context Module
 *
 * Exports context types and adapter for DOCX drawing rendering.
 */

// Types
export type {
  DocxResourceResolver,
  DocxRenderWarning,
  DocxWarningCollector,
  DocxPageSize,
  DocxPageMargins,
  DocxDrawingRenderContext,
} from "./types";

// Adapter
export {
  createDrawingMLContextFromDocx,
  createEmptyDocxResourceResolver,
  createDocxResourceResolver,
  createEmptyColorContext,
  createDefaultDocxDrawingContext,
} from "./docx-drawing-ml-adapter";
