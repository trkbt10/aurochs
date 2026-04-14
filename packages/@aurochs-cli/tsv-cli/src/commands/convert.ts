/**
 * @file convert command - convert TSV to XLSX
 *
 * Uses the converter pipeline:
 *   TSV text → parseDsv → DsvDocument → convertDsvToXlsx → XlsxWorkbook → exportXlsx → bytes
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { parseDsv, type DsvDocument } from "@aurochs/dsv";
import { convertDsvToXlsx } from "@aurochs-converters/interop-dsv-xlsx";
import { exportXlsx } from "@aurochs-builder/xlsx/exporter";

// =============================================================================
// Types
// =============================================================================

export type ConvertData = {
  readonly inputPath: string;
  readonly outputPath: string;
  readonly sheetName: string;
  readonly recordCount: number;
  readonly columnCount: number;
};

export type ConvertOptions = {
  /** Output file path. Defaults to input path with .xlsx extension. */
  readonly output?: string;
  /** Sheet name for the output worksheet. Defaults to "Sheet1". */
  readonly sheetName?: string;
};

// =============================================================================
// Command Implementation
// =============================================================================

export async function runConvert(filePath: string, options: ConvertOptions = {}): Promise<Result<ConvertData>> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const doc: DsvDocument = parseDsv(content, { dialect: "tsv" });

    const sheetName = options.sheetName ?? "Sheet1";
    const result = convertDsvToXlsx(doc, { sheetName });

    const xlsxData = await exportXlsx(result.data);

    const outputPath = options.output ?? filePath.replace(/\.tsv$/i, ".xlsx");
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, xlsxData);

    const columnCount = doc.headers
      ? doc.headers.length
      : doc.records[0]?.fields.length ?? 0;

    return success({
      inputPath: filePath,
      outputPath,
      sheetName,
      recordCount: doc.records.length,
      columnCount,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("CONVERT_ERROR", `Failed to convert TSV to XLSX: ${(err as Error).message}`);
  }
}
