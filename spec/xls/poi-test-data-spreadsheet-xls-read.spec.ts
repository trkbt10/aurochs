/**
 * @file POI spreadsheet .xls fixture smoke reads
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { exportXlsx } from "../../src/xlsx/exporter";
import { parseSpreadsheetFile } from "../../src/spreadsheet/parser";

const SPREADSHEET_DIR = path.join(process.cwd(), "fixtures", "poi-test-data", "test-data", "spreadsheet");

function forceTypeFromFileName(name: string): "xls" | "xlsx" | undefined {
  const lower = name.toLowerCase();
  if (lower.endsWith(".xls")) {
    return "xls";
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xlsm")) {
    return "xlsx";
  }
  return undefined;
}

async function listSupportedSpreadsheetFiles(dir: string): Promise<readonly string[]> {
  const files = await readdir(dir);
  return files
    .filter((name) => forceTypeFromFileName(name) !== undefined)
    .sort((a, b) => a.localeCompare(b));
}

describe("POI spreadsheet fixtures: parse+export (all files)", () => {
  it("parses and exports XLSX for all supported spreadsheets under fixtures/poi-test-data/test-data/spreadsheet in name order", async () => {
    const files = await listSupportedSpreadsheetFiles(SPREADSHEET_DIR);
    if (files.length === 0) {
      throw new Error(`No supported spreadsheet files found under: ${SPREADSHEET_DIR}`);
    }

    const failures: Array<{ readonly name: string; readonly message: string }> = [];
    for (const name of files) {
      const fullPath = path.join(SPREADSHEET_DIR, name);
      const bytes = await readFile(fullPath);

      const forceType = forceTypeFromFileName(name);
      if (!forceType) {
        failures.push({ name, message: "Internal error: file extension filter mismatch" });
        continue;
      }

      try {
        const workbook = await parseSpreadsheetFile(new Uint8Array(bytes), { forceType, mode: "lenient" });
        const xlsxBytes = await exportXlsx(workbook);
        if (xlsxBytes[0] !== 0x50 || xlsxBytes[1] !== 0x4b) {
          throw new Error("exportXlsx: output is not a ZIP (missing PK signature)");
        }
      } catch (err) {
        failures.push({ name, message: err instanceof Error ? err.message : String(err) });
      }
    }

    if (failures.length > 0) {
      const list = failures.map((f) => `- ${f.name}: ${f.message}`).join("\n");
      throw new Error(`parse+export failed for ${failures.length} files:\n${list}`);
    }
  }, 600_000);
});
