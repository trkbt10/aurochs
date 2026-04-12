/**
 * @file @aurochs-builder/fig main entry point
 *
 * High-level builder for .fig design files.
 * Provides FigDesignDocument model, CRUD operations, and export pipeline.
 */

// Types
export type {
  FigNodeId,
  FigPageId,
  FigDesignDocument,
  FigDesignNode,
  FigPage,
  AutoLayoutProps,
  LayoutConstraints,
  TextData,
  SymbolOverride,
  NodeSpec,
  BaseNodeSpec,
} from "./types";

export { DEFAULT_PAGE_BACKGROUND } from "./types";

// Context
export {
  createFigDesignDocument,
  createFigDesignDocumentFromLoaded,
  createEmptyFigDesignDocument,
} from "./context";

// Page operations
export {
  addPage,
  removePage,
  reorderPage,
  duplicatePage,
  renamePage,
} from "./page-ops";

// Node operations
export {
  addNode,
  removeNode,
  updateNode,
  reorderNode,
  moveNodeToPage,
  createNodeFromSpec,
} from "./node-ops";

// Export
export {
  exportFig,
  exportFigRoundtrip,
  type FigExportOptions,
  type FigExportResult,
} from "./export";
