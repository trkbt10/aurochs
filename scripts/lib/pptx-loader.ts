/**
 * @file Common PPTX file loading utilities for scripts and tests
 *
 * This module provides a shared implementation for loading PPTX files
 * using JSZip. It should be used by all scripts and integration tests
 * that need to load PPTX files.
 *
 * Usage:
 * ```typescript
 * import { loadPptxFile } from "../scripts/lib/pptx-loader";
 *
 * const { presentationFile, cache } = await loadPptxFile("path/to/file.pptx");
 * const presentation = openPresentation(presentationFile);
 * ```
 */

import * as fs from "node:fs/promises";
import { loadPptxBundleFromBuffer, type PptxFileBundle } from "../../src/pptx/app/pptx-loader";

export type { PptxFileBundle } from "../../src/pptx/app/pptx-loader";

/**
 * Load a PPTX file and return the bundle containing PresentationFile and cache.
 *
 * @param filePath - Path to the PPTX file
 * @returns PptxFileBundle containing { presentationFile, cache }
 */
export async function loadPptxFile(filePath: string): Promise<PptxFileBundle> {
  if (!filePath) {
    throw new Error("filePath is required");
  }
  const pptxBuffer = await fs.readFile(filePath);
  return loadPptxBundleFromBuffer(pptxBuffer);
}
