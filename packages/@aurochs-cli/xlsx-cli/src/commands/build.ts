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
import { parseWorkbook } from "@aurochs-office/xlsx/workbook-parser";
import { patchWorkbook, type SheetUpdate } from "@aurochs-office/xlsx/workbook-patcher";
import { type XlsxBuildSpec, type XlsxCreateSpec, type XlsxModifySpec, isCreateSpec, convertSpecToWorkbook } from "./build-spec";

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

async function runCreateBuild(spec: XlsxCreateSpec, specDir: string): Promise<Result<BuildData>> {
  const workbook = convertSpecToWorkbook(spec.workbook);
  const xlsxData = await exportXlsx(workbook);
  const outputPath = path.resolve(specDir, spec.output);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, xlsxData);

  let totalCells = 0;
  for (const sheet of workbook.sheets) {
    for (const row of sheet.rows) {
      totalCells += row.cells.length;
    }
  }

  return success({
    outputPath: spec.output,
    mode: "create",
    sheetCount: workbook.sheets.length,
    totalCells,
  });
}

async function runModifyBuild(spec: XlsxModifySpec, specDir: string): Promise<Result<BuildData>> {
  const templatePath = path.resolve(specDir, spec.template);
  const outputPath = path.resolve(specDir, spec.output);

  await fs.access(templatePath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const templateBuffer = await fs.readFile(templatePath);
  const workbook = await parseWorkbook(templateBuffer.buffer as ArrayBuffer);

  if (spec.modifications && spec.modifications.length > 0) {
    const updates: SheetUpdate[] = spec.modifications.map((mod) => ({
      sheetName: mod.sheetName,
      cells: mod.cells.map((c) => ({ col: c.col, row: c.row, value: c.value })),
      ...(mod.dimension ? { dimension: mod.dimension } : {}),
    }));

    const result = await patchWorkbook(workbook, updates);
    await fs.writeFile(outputPath, Buffer.from(result.xlsxBuffer));

    let totalCells = 0;
    for (const update of updates) {
      totalCells += update.cells.length;
    }

    return success({
      outputPath: spec.output,
      mode: "modify",
      sheetCount: workbook.sheets.size,
      totalCells,
    });
  }

  // No modifications — just copy template
  await fs.copyFile(templatePath, outputPath);

  return success({
    outputPath: spec.output,
    mode: "modify",
    sheetCount: workbook.sheets.size,
    totalCells: 0,
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
