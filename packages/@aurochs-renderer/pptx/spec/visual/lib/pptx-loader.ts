/**
 * @file Common PPTX file loading utilities for scripts and tests
 *
 * This module provides a shared implementation for loading PPTX files
 * using ZipPackage. It should be used by all scripts and integration tests
 * that need to load PPTX files.
 *
 * Usage:
 * ```typescript
 * import { loadPptxFile } from "../scripts/lib/pptx-loader";
 *
 * const { zipPackage, presentationFile } = await loadPptxFile("path/to/file.pptx");
 *
 * // Read files directly from zipPackage
 * const slideXml = zipPackage.readText("ppt/slides/slide1.xml");
 *
 * // Or use presentationFile for parsing
 * const presentation = openPresentation(presentationFile);
 * ```
 */

import * as fs from "node:fs/promises";
import type { ZipPackage } from "@aurochs/zip";
import { loadPptxBundleFromBuffer, type PptxFileBundle } from "@aurochs-office/pptx/app/pptx-loader";

export type FileCacheEntry = { readonly text: string; readonly buffer: ArrayBuffer };
export type FileCache = Map<string, FileCacheEntry>;
export type CachedPptxFileBundle = PptxFileBundle & { readonly cache: FileCache };

function isProbablyTextFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return (
    lower.endsWith(".xml") ||
    lower.endsWith(".rels") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".json") ||
    lower.endsWith(".vml")
  );
}

function readCachedText(zipPackage: ZipPackage, entryPath: string): string {
  if (!isProbablyTextFile(entryPath)) {
    return "";
  }
  return zipPackage.readText(entryPath) ?? "";
}

/**
 * Load a PPTX file and return the bundle containing ZipPackage and PresentationFile.
 *
 * @param filePath - Path to the PPTX file
 * @returns PptxFileBundle containing { zipPackage, presentationFile, cache }
 */
export async function loadPptxFile(filePath: string): Promise<CachedPptxFileBundle> {
  if (!filePath) {
    throw new Error("filePath is required");
  }
  const pptxBuffer = await fs.readFile(filePath);
  const bundle = await loadPptxBundleFromBuffer(pptxBuffer);

  const cache: FileCache = new Map();
  for (const entryPath of bundle.zipPackage.listFiles()) {
    const buffer = bundle.zipPackage.readBinary(entryPath) ?? new ArrayBuffer(0);
    const text = readCachedText(bundle.zipPackage, entryPath);
    cache.set(entryPath, { text, buffer });
  }

  return { ...bundle, cache };
}
