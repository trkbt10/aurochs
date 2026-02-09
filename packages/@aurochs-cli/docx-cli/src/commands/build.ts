/**
 * @file build command - build DOCX from JSON specification
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { buildDocx, getBuildData } from "@aurochs-builder/docx";
import type { DocxBuildSpec, DocxBuildData } from "@aurochs-builder/docx";

// =============================================================================
// Build Types (re-export for CLI output)
// =============================================================================

/** @deprecated Use DocxBuildSpec from @aurochs-builder/docx instead */
export type BuildSpec = DocxBuildSpec;
export type BuildData = DocxBuildData;

/**
 * Build a DOCX file from JSON specification.
 * Generates DOCX from scratch (no template needed).
 */
export async function runBuild(specPath: string): Promise<Result<BuildData>> {
  try {
    const specJson = await fs.readFile(specPath, "utf-8");
    const spec: DocxBuildSpec = JSON.parse(specJson);
    const specDir = path.dirname(specPath);

    const outputPath = path.resolve(specDir, spec.output);

    // Build DOCX from spec
    const docxData = await buildDocx(spec);

    // Write output file
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, docxData);

    return success(getBuildData(spec));
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
