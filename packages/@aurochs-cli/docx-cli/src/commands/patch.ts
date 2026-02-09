/**
 * @file patch command - patch existing DOCX with JSON specification
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { patchDocx, getPatchData } from "@aurochs-builder/docx";
import type { DocxPatchSpec, DocxPatchData } from "@aurochs-builder/docx";

export type PatchData = DocxPatchData;

/**
 * Patch an existing DOCX file from JSON specification.
 */
export async function runPatch(specPath: string): Promise<Result<PatchData>> {
  try {
    const specJson = await fs.readFile(specPath, "utf-8");
    const spec: DocxPatchSpec = JSON.parse(specJson);
    const specDir = path.dirname(specPath);

    const sourcePath = path.resolve(specDir, spec.source);
    const outputPath = path.resolve(specDir, spec.output);

    const sourceData = await fs.readFile(sourcePath);
    const docxData = await patchDocx(spec, new Uint8Array(sourceData));

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, docxData);

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
