/**
 * @file HTML rendering exports for @aurochs-renderer/xlsx
 *
 * Provides safe HTML-based rendering of XLSX spreadsheets.
 * Uses the `@aurochs/xml` element builder for attribute escaping.
 * Drawing overlays reuse the SVG drawing renderer pipeline.
 */

export type { SheetHtmlResult, WorkbookHtmlResult } from "./sheet-html-renderer";
export { renderWorkbookToHtml } from "./sheet-html-renderer";
