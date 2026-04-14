/**
 * @file show command - display TSV content in a formatted table
 */

import * as fs from "node:fs/promises";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { parseDsv, type DsvDocument } from "@aurochs/dsv";

// =============================================================================
// Types
// =============================================================================

export type ShowData = {
  readonly headers: readonly string[] | undefined;
  readonly records: readonly (readonly string[])[];
  readonly totalRecords: number;
};

export type ShowOptions = {
  /** Maximum number of records to display */
  readonly limit?: number;
};

// =============================================================================
// Command Implementation
// =============================================================================

export async function runShow(filePath: string, options: ShowOptions = {}): Promise<Result<ShowData>> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const doc: DsvDocument = parseDsv(content, { dialect: "tsv" });

    const limit = options.limit ?? doc.records.length;
    const displayRecords = doc.records.slice(0, limit);

    return success({
      headers: doc.headers,
      records: displayRecords.map((r) => r.fields.map((f) => f.value)),
      totalRecords: doc.records.length,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse TSV: ${(err as Error).message}`);
  }
}
