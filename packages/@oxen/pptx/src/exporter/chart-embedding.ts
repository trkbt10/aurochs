/**
 * @file Chart Embedding Exporter
 *
 * Provides functions for updating embedded Excel workbooks in PPTX charts during export.
 * When chart data is modified, the embedded XLSX must be updated to maintain synchronization.
 *
 * OPC Package Structure:
 * ```
 * ppt/
 * ├── charts/
 * │   ├── chart1.xml
 * │   └── _rels/
 * │       └── chart1.xml.rels
 * └── embeddings/
 *     └── Microsoft_Excel_Worksheet1.xlsx
 * ```
 *
 * @see ECMA-376 Part 1, Section 21.2 (DrawingML - Charts)
 * @see src/pptx/patcher/chart/chart-workbook-syncer.ts - Chart/Workbook synchronization
 * @see src/xlsx/parser/index.ts - XLSX parsing
 * @see src/xlsx/exporter.ts - XLSX serialization
 */

import type { ChartDataUpdate } from "../patcher/chart/chart-workbook-syncer";
import { resolveEmbeddedXlsxPath, syncChartToWorkbook } from "../patcher/chart/chart-workbook-syncer";
import { parseXlsxWorkbook } from "@oxen/xlsx/parser";
import { exportXlsx } from "@oxen/xlsx/exporter";
import { loadZipPackage } from "@oxen/zip";

// =============================================================================
// Types
// =============================================================================

/**
 * Function type for reading file content from a PPTX package.
 */
export type GetFileContent = (path: string) => Promise<string | Uint8Array | undefined>;

/**
 * Function type for writing file content to a PPTX package.
 */
export type SetFileContent = (path: string, content: Uint8Array) => void;

// =============================================================================
// Path Resolution
// =============================================================================

/**
 * Resolve a relative path from a base path.
 *
 * Handles "../" segments to navigate up the directory tree.
 *
 * @param basePath - The base path (e.g., "ppt/charts/chart1.xml")
 * @param relativePath - The relative path (e.g., "../embeddings/Microsoft_Excel_Worksheet1.xlsx")
 * @returns The resolved absolute path (e.g., "ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx")
 *
 * @example
 * ```typescript
 * resolveRelativePath("ppt/charts/chart1.xml", "../embeddings/file.xlsx");
 * // => "ppt/embeddings/file.xlsx"
 * ```
 */
export function resolveRelativePath(basePath: string, relativePath: string): string {
  // Get the directory of the base path
  const baseDir = basePath.substring(0, basePath.lastIndexOf("/"));
  const baseSegments = baseDir.split("/");

  // Process the relative path
  const relSegments = relativePath.split("/");

  for (const segment of relSegments) {
    if (segment === "..") {
      baseSegments.pop();
    } else if (segment !== "." && segment !== "") {
      baseSegments.push(segment);
    }
  }

  return baseSegments.join("/");
}

/**
 * Get the rels file path for a chart.
 *
 * @param chartPath - Path to the chart XML (e.g., "ppt/charts/chart1.xml")
 * @returns Path to the rels file (e.g., "ppt/charts/_rels/chart1.xml.rels")
 */
export function getChartRelsPath(chartPath: string): string {
  const lastSlash = chartPath.lastIndexOf("/");
  const dir = chartPath.substring(0, lastSlash);
  const filename = chartPath.substring(lastSlash + 1);
  return `${dir}/_rels/${filename}.rels`;
}

// =============================================================================
// Embedded XLSX Update
// =============================================================================

/**
 * Update a single chart's embedded XLSX workbook.
 *
 * This function:
 * 1. Resolves the embedded XLSX path from chart.xml.rels
 * 2. Reads the embedded XLSX (binary)
 * 3. Parses it using ZipPackage and parseXlsxWorkbook
 * 4. Updates with chart data using syncChartToWorkbook
 * 5. Re-serializes using exportXlsx
 * 6. Writes back to the PPTX package
 *
 * @param getFileContent - Function to read files from the PPTX package
 * @param setFileContent - Function to write files to the PPTX package
 * @param chartPath - Path to the chart XML (e.g., "ppt/charts/chart1.xml")
 * @param chartData - The updated chart data to sync to the workbook
 *
 * @example
 * ```typescript
 * await updateEmbeddedXlsx(
 *   pkg.readFile,
 *   pkg.writeFile,
 *   "ppt/charts/chart1.xml",
 *   { categories: ["Q1", "Q2"], series: [{ name: "Sales", values: [100, 200] }] }
 * );
 * ```
 */
export async function updateEmbeddedXlsx(
  getFileContent: GetFileContent,
  setFileContent: SetFileContent,
  chartPath: string,
  chartData: ChartDataUpdate,
): Promise<void> {
  // 1. Get the chart rels file
  const relsPath = getChartRelsPath(chartPath);
  const relsContent = await getFileContent(relsPath);

  if (!relsContent) {
    console.warn(`[chart-embedding] No rels file found for chart: ${chartPath}`);
    return;
  }

  const relsXml = typeof relsContent === "string"
    ? relsContent
    : new TextDecoder().decode(relsContent);

  // 2. Resolve the embedded XLSX path
  const relativeXlsxPath = resolveEmbeddedXlsxPath(relsXml);
  if (!relativeXlsxPath) {
    console.warn(`[chart-embedding] No embedded xlsx found in rels: ${relsPath}`);
    return;
  }

  const xlsxPath = resolveRelativePath(chartPath, relativeXlsxPath);

  // 3. Read the embedded XLSX (binary)
  const xlsxContent = await getFileContent(xlsxPath);
  if (!xlsxContent) {
    console.warn(`[chart-embedding] Embedded xlsx not found: ${xlsxPath}`);
    return;
  }

  const xlsxBuffer = xlsxContent instanceof Uint8Array
    ? xlsxContent
    : new TextEncoder().encode(xlsxContent);

 try {
    // 4. Parse the XLSX using ZipPackage
    const pkg = await loadZipPackage(xlsxBuffer);

    // Create a file content getter for parseXlsxWorkbook
    const xlsxGetFile = async (path: string): Promise<string | undefined> =>
      pkg.readText(path) ?? undefined;

    // 5. Parse the workbook
    const workbook = await parseXlsxWorkbook(xlsxGetFile);

    // 6. Sync chart data to workbook
    const updatedWorkbook = syncChartToWorkbook(workbook, chartData);

    // 7. Export the updated workbook
    const updatedXlsxBuffer = await exportXlsx(updatedWorkbook);

    // 8. Write back to the PPTX package
    setFileContent(xlsxPath, updatedXlsxBuffer);
  } catch (error) {
    // On error, maintain the original file (safety)
    console.warn(
      `[chart-embedding] Failed to update embedded xlsx: ${xlsxPath}`,
      error instanceof Error ? error.message : error,
    );
  }
}

// =============================================================================
// Batch Chart Embedding Update
// =============================================================================

/**
 * Update all chart embeddings in a PPTX package.
 *
 * Processes multiple chart updates, updating each chart's embedded XLSX workbook.
 * Errors for individual charts are logged and skipped, allowing other charts to be processed.
 *
 * @param getFileContent - Function to read files from the PPTX package
 * @param setFileContent - Function to write files to the PPTX package
 * @param chartUpdates - Map of chart paths to their updated data
 *
 * @example
 * ```typescript
 * const chartUpdates = new Map([
 *   ["ppt/charts/chart1.xml", { categories: ["Q1", "Q2"], series: [...] }],
 *   ["ppt/charts/chart2.xml", { categories: ["A", "B"], series: [...] }],
 * ]);
 *
 * await syncAllChartEmbeddings(pkg.readFile, pkg.writeFile, chartUpdates);
 * ```
 */
export async function syncAllChartEmbeddings(
  getFileContent: GetFileContent,
  setFileContent: SetFileContent,
  chartUpdates: ReadonlyMap<string, ChartDataUpdate>,
): Promise<void> {
  const updatePromises: Promise<void>[] = [];

  for (const [chartPath, chartData] of chartUpdates) {
    updatePromises.push(
      updateEmbeddedXlsx(getFileContent, setFileContent, chartPath, chartData),
    );
  }

  await Promise.all(updatePromises);
}

// =============================================================================
// Embedded XLSX Listing
// =============================================================================

/**
 * List all embedded XLSX files in a PPTX package.
 *
 * Scans the file list for paths matching the embeddings pattern.
 * Embedded XLSX files are typically located at:
 * - ppt/embeddings/*.xlsx
 *
 * @param pptxFileList - List of all file paths in the PPTX package
 * @returns Array of paths to embedded XLSX files
 *
 * @example
 * ```typescript
 * const fileList = ["ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx", "ppt/slides/slide1.xml", ...];
 * const xlsxFiles = listEmbeddedXlsx(fileList);
 * // => ["ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx"]
 * ```
 */
export function listEmbeddedXlsx(
  pptxFileList: readonly string[],
): readonly string[] {
  return pptxFileList.filter((path) =>
    path.toLowerCase().endsWith(".xlsx") &&
    path.includes("embeddings/"),
  );
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export type { ChartDataUpdate } from "../patcher/chart/chart-workbook-syncer";
