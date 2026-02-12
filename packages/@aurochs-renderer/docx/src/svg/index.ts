/**
 * @file SVG rendering utilities for DOCX
 *
 * Provides string-based SVG output for testing and server-side rendering.
 */

// Types
export { type PageRenderResult, type DocumentRenderResult } from "./page-render";
export { type DocumentSvgResult, type DocumentSvgConfig, type WarningsCollector, createWarningsCollector } from "./types";

// Low-level page rendering
export { renderPageToSvg, renderDocumentToSvgs } from "./page-render";

// High-level document rendering (main entry point)
export { renderDocumentToSvg } from "./document-render";
