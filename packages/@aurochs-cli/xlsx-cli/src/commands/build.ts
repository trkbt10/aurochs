/**
 * @file build command - build XLSX from JSON specification
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { success, error, type Result } from "@aurochs-cli/cli-core";

// =============================================================================
// Build Spec Types
// =============================================================================

export type BuildSpec = {
  readonly template: string;
  readonly output: string;
  readonly modifications?: unknown; // Reserved for future use
};

export type BuildData = {
  readonly outputPath: string;
  readonly success: boolean;
};

/**
 * Build an XLSX file from JSON specification.
 * Currently supports copying a template file.
 */
export async function runBuild(specPath: string): Promise<Result<BuildData>> {
  try {
    const specJson = await fs.readFile(specPath, "utf-8");
    const spec: BuildSpec = JSON.parse(specJson);
    const specDir = path.dirname(specPath);

    const templatePath = path.resolve(specDir, spec.template);
    const outputPath = path.resolve(specDir, spec.output);

    // Verify template exists
    await fs.access(templatePath);

    // Copy template to output
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.copyFile(templatePath, outputPath);

    return success({ outputPath: spec.output, success: true });
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
