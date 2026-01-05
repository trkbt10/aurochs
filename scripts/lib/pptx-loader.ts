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
 * const presentationFile = await loadPptxFile("path/to/file.pptx");
 * const presentation = openPresentation(presentationFile);
 * ```
 */

import * as fs from "node:fs";
import type { PresentationFile } from "../../src/pptx";
import { loadPptxBundleFromBuffer, type PptxFileBundle } from "../../src/pptx/app/pptx-loader";

/**
 * Load a PPTX file and return a PresentationFile interface.
 *
 * This function reads the PPTX file, extracts all contents using the shared loader,
 * and returns an object implementing the PresentationFile interface.
 *
 * @param filePath - Path to the PPTX file
 * @returns PresentationFile interface for use with openPresentation()
 */
export async function loadPptxFile(filePath: string): Promise<PresentationFile> {
  if (!filePath) {
    throw new Error("filePath is required");
  }
  const pptxBuffer = fs.readFileSync(filePath);
  const { presentationFile } = await loadPptxBundleFromBuffer(pptxBuffer);
  return presentationFile;
}

/**
 * Load a PPTX file and return the cached bundle.
 */
export async function loadPptxFileBundle(filePath: string): Promise<PptxFileBundle> {
  if (!filePath) {
    throw new Error("filePath is required");
  }
  const pptxBuffer = fs.readFileSync(filePath);
  return loadPptxBundleFromBuffer(pptxBuffer);
}

/**
 * Load a PPTX file synchronously by first reading from disk,
 * then asynchronously processing with JSZip.
 *
 * This is a convenience wrapper that checks if the file exists
 * before attempting to load it.
 *
 * @param filePath - Path to the PPTX file
 * @returns PresentationFile or null if file doesn't exist
 */
export async function tryLoadPptxFile(filePath: string): Promise<PresentationFile | null> {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return loadPptxFile(filePath);
}
