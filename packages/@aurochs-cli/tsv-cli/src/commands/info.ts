/**
 * @file info command - display TSV file metadata
 */

import * as fs from "node:fs/promises";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { parseDsv, type DsvDocument } from "@aurochs/dsv";

// =============================================================================
// Types
// =============================================================================

export type InfoData = {
  readonly filePath: string;
  readonly fileSize: number;
  readonly recordCount: number;
  readonly columnCount: number;
  readonly headers: readonly string[] | undefined;
};

// =============================================================================
// Command Implementation
// =============================================================================

export async function runInfo(filePath: string): Promise<Result<InfoData>> {
  try {
    const [stat, content] = await Promise.all([
      fs.stat(filePath),
      fs.readFile(filePath, "utf-8"),
    ]);

    const doc: DsvDocument = parseDsv(content, { dialect: "tsv" });

    const columnCount = doc.headers
      ? doc.headers.length
      : doc.records[0]?.fields.length ?? 0;

    return success({
      filePath,
      fileSize: stat.size,
      recordCount: doc.records.length,
      columnCount,
      headers: doc.headers,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse TSV: ${(err as Error).message}`);
  }
}
