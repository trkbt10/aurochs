/**
 * @file SVG rendering types for DOCX
 *
 * Shared types for document-level SVG rendering.
 */

import type { DocxDocument } from "@aurochs-office/docx/domain/document";
import type { PageFlowConfig } from "@aurochs-office/text-layout";
import type { DocxRenderOptions } from "../render-options";
import type { PageRenderResult } from "./page-render";

// =============================================================================
// Result Types
// =============================================================================

/**
 * Result of rendering a complete document to SVG.
 */
export type DocumentSvgResult = {
  /** Rendered pages */
  readonly pages: readonly PageRenderResult[];
  /** Total number of pages */
  readonly totalPages: number;
  /** Warnings collected during rendering */
  readonly warnings: readonly string[];
};

// =============================================================================
// Config Types
// =============================================================================

/**
 * Configuration for document SVG rendering.
 */
export type DocumentSvgConfig = {
  /** Parsed DOCX document */
  readonly document: DocxDocument;
  /** Render options (dialect, line spacing, etc.) */
  readonly options?: Partial<DocxRenderOptions>;
  /** Override page configuration derived from sectPr */
  readonly pageConfigOverride?: Partial<PageFlowConfig>;
};

// =============================================================================
// Warnings Collector
// =============================================================================

/**
 * Collector for rendering warnings.
 */
export type WarningsCollector = {
  readonly add: (message: string) => void;
  readonly getAll: () => readonly string[];
};

/**
 * Create a warnings collector.
 */
export function createWarningsCollector(): WarningsCollector {
  const warnings: string[] = [];
  return {
    add: (message: string) => {
      if (!warnings.includes(message)) {
        warnings.push(message);
      }
    },
    getAll: () => warnings,
  };
}
