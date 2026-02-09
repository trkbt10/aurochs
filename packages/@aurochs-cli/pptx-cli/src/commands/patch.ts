/**
 * @file patch command - patch existing PPTX with JSON specification
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { patchPptx, getPatchData } from "@aurochs-builder/pptx";
import type { PptxPatchSpec, PptxPatchData } from "@aurochs-builder/pptx";

export type PatchData = PptxPatchData;

/**
 * Patch an existing PPTX file from JSON specification.
 */
export async function runPatch(specPath: string): Promise<Result<PatchData>> {
  try {
    const specJson = await fs.readFile(specPath, "utf-8");
    const spec: PptxPatchSpec = JSON.parse(specJson);
    const specDir = path.dirname(specPath);

    const sourcePath = path.resolve(specDir, spec.source);
    const outputPath = path.resolve(specDir, spec.output);

    const sourceData = await fs.readFile(sourcePath);
    const pptxData = await patchPptx(spec, new Uint8Array(sourceData), specDir);

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, pptxData);

    return success(getPatchData(spec));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${(err as NodeJS.ErrnoException).path}`);
    }
    if (err instanceof SyntaxError) {
      return error("INVALID_JSON", `Invalid JSON: ${err.message}`);
    }
    return error("PATCH_ERROR", `Patch failed: ${(err as Error).message}`);
  }
}
