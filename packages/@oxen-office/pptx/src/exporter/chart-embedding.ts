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

import type { ChartDataUpdate } from "@oxen-office/chart/patcher";
import { resolveEmbeddedXlsxPath, syncChartToWorkbook } from "@oxen-office/chart/patcher";
import { parseXlsxWorkbook } from "@oxen-office/xlsx/parser";
import { exportXlsx } from "@oxen-office/xlsx/exporter";
import { resolveRelationshipTargetPath } from "@oxen-office/opc";
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
export type UpdateEmbeddedXlsxOptions = {
  readonly getFileContent: GetFileContent;
  readonly setFileContent: SetFileContent;
  readonly chartPath: string;
  readonly chartData: ChartDataUpdate;
};

export async function updateEmbeddedXlsx(
  { getFileContent, setFileContent, chartPath, chartData }: UpdateEmbeddedXlsxOptions,
): Promise<void> {
  // 1. Get the chart rels file
  const relsPath = getChartRelsPath(chartPath);
  const relsContent = await getFileContent(relsPath);

  if (!relsContent) {
    console.warn(`[chart-embedding] No rels file found for chart: ${chartPath}`);
    return;
  }

  const relsXml = typeof relsContent === "string" ? relsContent : new TextDecoder().decode(relsContent);

  // 2. Resolve the embedded XLSX path
  const relativeXlsxPath = resolveEmbeddedXlsxPath(relsXml);
  if (!relativeXlsxPath) {
    console.warn(`[chart-embedding] No embedded xlsx found in rels: ${relsPath}`);
    return;
  }

  const xlsxPath = resolveRelationshipTargetPath(chartPath, relativeXlsxPath);

  // 3. Read the embedded XLSX (binary)
  const xlsxContent = await getFileContent(xlsxPath);
  if (!xlsxContent) {
    console.warn(`[chart-embedding] Embedded xlsx not found: ${xlsxPath}`);
    return;
  }

  const xlsxBuffer = xlsxContent instanceof Uint8Array ? xlsxContent : new TextEncoder().encode(xlsxContent);

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
      updateEmbeddedXlsx({ getFileContent, setFileContent, chartPath, chartData }),
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

