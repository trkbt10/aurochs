/**
 * @file build command - build XLSX from JSON specification
 *
 * Supports two modes:
 * - "create": Build a complete XLSX from scratch using a workbook spec
 * - "modify": Copy a template XLSX file for editing
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { exportXlsx } from "@aurochs-builder/xlsx/exporter";
import { type XlsxBuildSpec, type XlsxCreateSpec, type XlsxModifySpec, type ModificationSpec, isCreateSpec, convertSpecToWorkbook } from "./build-spec";
import { loadXlsxWorkbook } from "../utils/xlsx-loader";
import { applyModifications } from "./apply-modifications";

// =============================================================================
// Types
// =============================================================================

export type { XlsxBuildSpec as BuildSpec };

export type BuildData = {
  readonly outputPath: string;
  readonly mode: "create" | "modify";
  readonly sheetCount: number;
  readonly totalCells: number;
};

// =============================================================================
// Build Modes
// =============================================================================

function countTotalCells(sheets: readonly { readonly rows: readonly { readonly cells: readonly unknown[] }[] }[]): number {
  return sheets.reduce((sum, sheet) => sum + sheet.rows.reduce((s, row) => s + row.cells.length, 0), 0);
}

async function runCreateBuild(spec: XlsxCreateSpec, specDir: string): Promise<Result<BuildData>> {
  const workbook = convertSpecToWorkbook(spec.workbook);
  const xlsxData = await exportXlsx(workbook);
  const outputPath = path.resolve(specDir, spec.output);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, xlsxData);

  return success({
    outputPath: spec.output,
    mode: "create",
    sheetCount: workbook.sheets.length,
    totalCells: countTotalCells(workbook.sheets),
  });
}

function resolveLegacyCellValue(value: string | number): { type: "string"; value: string } | { type: "number"; value: number } {
  if (typeof value === "string") {
    return { type: "string", value };
  }
  return { type: "number", value };
}

/**
 * Convert legacy modifications field to the new ModificationSpec format.
 */
function buildModificationSpec(spec: XlsxModifySpec): ModificationSpec | undefined {
  // New format takes precedence
  if (spec.modify) {
    return spec.modify;
  }

  // Convert legacy modifications to new format
  if (spec.modifications && spec.modifications.length > 0) {
    return {
      sheets: spec.modifications.map((mod) => ({
        name: mod.sheetName,
        cells: mod.cells.map((c) => ({
          ref: `${c.col}${c.row}`,
          value: resolveLegacyCellValue(c.value),
        })),
      })),
    };
  }

  return undefined;
}

async function runModifyBuild(spec: XlsxModifySpec, specDir: string): Promise<Result<BuildData>> {
  const templatePath = path.resolve(specDir, spec.template);
  const outputPath = path.resolve(specDir, spec.output);

  await fs.access(templatePath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  // Domain-level round-trip: parse → modify → export
  const baseWorkbook = await loadXlsxWorkbook(templatePath);
  const modSpec = buildModificationSpec(spec);
  const workbook = modSpec ? applyModifications(baseWorkbook, modSpec) : baseWorkbook;

  const xlsxData = await exportXlsx(workbook);
  await fs.writeFile(outputPath, xlsxData);

  return success({
    outputPath: spec.output,
    mode: "modify",
    sheetCount: workbook.sheets.length,
    totalCells: countTotalCells(workbook.sheets),
  });
}

// =============================================================================
// Main
// =============================================================================

/**
 * Build an XLSX file from JSON specification.
 *
 * - Create mode: builds from scratch using @aurochs-builder/xlsx
 * - Modify mode: copies a template file for editing
 */
export async function runBuild(specPath: string): Promise<Result<BuildData>> {
  try {
    const specJson = await fs.readFile(specPath, "utf-8");
    const spec = JSON.parse(specJson) as XlsxBuildSpec;
    const specDir = path.dirname(specPath);

    if (isCreateSpec(spec)) {
      return await runCreateBuild(spec, specDir);
    }
    return await runModifyBuild(spec, specDir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${(err as NodeJS.ErrnoException).path}`);
    }
    if (err instanceof SyntaxError) {
      return error("INVALID_JSON", `Invalid JSON: ${err.message}`);
    }
    return error("BUILD_ERROR", `Build failed: ${(err as Error).message}`);
  }
}
