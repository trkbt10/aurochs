/**
 * @file Layout engine for OOXML documents
 *
 * Provides text layout, table layout, and page flow for PPTX and DOCX.
 */

export { layoutTextBody, layoutDocument } from "./engine";

export { layoutTable } from "./table-layout";
export type { TableLayoutConfig } from "./table-layout";

export {
  flowIntoPages,
  createSinglePageLayout,
  DEFAULT_PAGE_FLOW_CONFIG,
} from "./page-flow";
export type { PageFlowConfig, PageBreakHint, PageFlowInput } from "./page-flow";
