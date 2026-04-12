/**
 * @file XLSX Renderer
 *
 * Converts an XLSX file buffer into HTML tables for webview display.
 * Delegates to @aurochs-renderer/xlsx/html for safe HTML generation
 * (all values escaped via the @aurochs/xml element builder).
 */

import { loadZipPackage } from "@aurochs/zip";
import { parseXlsxWorkbook } from "@aurochs-office/xlsx/parser";
import { renderWorkbookToHtml, type WorkbookHtmlResult } from "@aurochs-renderer/xlsx/html";

/**
 * Render an XLSX file to HTML tables (one per sheet).
 *
 * Images embedded in drawings are resolved from the XLSX package
 * and rendered as SVG overlays via the SVG drawing pipeline.
 */
export async function renderXlsxHtml(data: Uint8Array): Promise<WorkbookHtmlResult> {
  const pkg = await loadZipPackage(data);
  const getFileContent = async (path: string): Promise<string | undefined> => {
    return pkg.readText(path) ?? undefined;
  };
  const readBinary = (path: string): ArrayBuffer | null => {
    return pkg.readBinary(path);
  };
  const workbook = await parseXlsxWorkbook(getFileContent, { readBinary });
  return renderWorkbookToHtml(workbook);
}
