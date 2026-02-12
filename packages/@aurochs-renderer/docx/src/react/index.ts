/**
 * @file React components for DOCX rendering
 */

export { type PageRendererProps, PageRenderer } from "./PageRenderer";
export { type DocumentRendererProps, DocumentRenderer } from "./DocumentRenderer";
export {
  type DocumentLayoutMode,
  type UseDocumentLayoutOptions,
  type DocumentLayoutResult,
  useDocumentLayout,
  createParagraphKey,
  haveParagraphsChanged,
} from "./hooks";

// Context - DOCX Drawing Render Context and Adapter
export {
  type DocxResourceResolver,
  type DocxRenderWarning,
  type DocxWarningCollector,
  type DocxPageSize,
  type DocxPageMargins,
  type DocxDrawingRenderContext,
  createDrawingMLContextFromDocx,
  createEmptyDocxResourceResolver,
  createDocxResourceResolver,
  createEmptyColorContext,
  createDefaultDocxDrawingContext,
} from "./context";

// Drawing - DrawingML rendering components
export {
  Picture,
  type PictureProps,
  InlineDrawing,
  type InlineDrawingProps,
  AnchorDrawing,
  type AnchorDrawingProps,
  FloatingImageOverlay,
  type FloatingImageOverlayProps,
  WordprocessingShape,
  type WordprocessingShapeProps,
  ChartPlaceholder,
  type ChartPlaceholderProps,
} from "./drawing";
