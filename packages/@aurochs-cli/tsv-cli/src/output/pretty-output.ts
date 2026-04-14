/**
 * @file Pretty output formatters for TSV CLI
 */

import type { InfoData } from "../commands/info";
import type { ShowData } from "../commands/show";
import type { ConvertData } from "../commands/convert";

/**
 * Format TSV info for pretty display.
 */
export function formatInfoPretty(data: InfoData): string {
  const lines = [
    `File: ${data.filePath}`,
    `Size: ${data.fileSize} bytes`,
    `Records: ${data.recordCount}`,
    `Columns: ${data.columnCount}`,
  ];

  if (data.headers) {
    lines.push(`Headers: ${data.headers.join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Format TSV content for pretty display as an aligned table.
 */
export function formatShowPretty(data: ShowData): string {
  const allRows: string[][] = [];

  if (data.headers) {
    allRows.push([...data.headers]);
  }
  for (const record of data.records) {
    allRows.push([...record]);
  }

  if (allRows.length === 0) {
    return "(empty)";
  }

  // Calculate column widths
  const colCount = Math.max(...allRows.map((r) => r.length));
  const widths: number[] = Array.from({ length: colCount }, () => 0);
  for (const row of allRows) {
    for (let i = 0; i < row.length; i++) {
      widths[i] = Math.max(widths[i], row[i].length);
    }
  }

  const lines: string[] = [];
  for (let rowIdx = 0; rowIdx < allRows.length; rowIdx++) {
    const row = allRows[rowIdx];
    const padded = row.map((val, i) => val.padEnd(widths[i]));
    lines.push(padded.join("  "));

    // Separator after header row
    if (rowIdx === 0 && data.headers) {
      lines.push(widths.map((w) => "-".repeat(w)).join("  "));
    }
  }

  if (data.totalRecords > data.records.length) {
    lines.push(`\n... (${data.totalRecords - data.records.length} more records)`);
  }

  return lines.join("\n");
}

/**
 * Format conversion result for pretty display.
 */
export function formatConvertPretty(data: ConvertData): string {
  return [
    `Converted: ${data.inputPath} -> ${data.outputPath}`,
    `Sheet: ${data.sheetName}`,
    `Records: ${data.recordCount}`,
    `Columns: ${data.columnCount}`,
  ].join("\n");
}
