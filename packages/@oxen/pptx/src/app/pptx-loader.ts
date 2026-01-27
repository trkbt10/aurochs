/**
 * @file Client-side PPTX loader
 *
 * Loads and parses PPTX files directly in the browser without any backend.
 * Uses ZipPackage for unified ZIP handling (shared with pptx-exporter).
 *
 * @see @oxen/zip - Shared ZIP abstraction
 * @see src/pptx/exporter/pptx-exporter.ts - Corresponding export functionality
 */

import { loadZipPackage, type ZipPackage } from "@oxen/zip";
import { openPresentation } from "./open-presentation";
import type { PresentationFile } from "../domain";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of loading a PPTX file.
 */
export type LoadedPresentation = {
  /** Parsed presentation data */
  readonly presentation: ReturnType<typeof openPresentation>;
  /** File access interface for the loaded package */
  readonly presentationFile: PresentationFile;
};

/**
 * Bundle containing the loaded package and file access.
 * Provides direct access to the ZipPackage for read/write operations.
 */
export type PptxFileBundle = {
  /** The underlying ZIP package (supports both read and write) */
  readonly zipPackage: ZipPackage;
  /** File access interface (read-only view) */
  readonly presentationFile: PresentationFile;
};

/**
 * Accepted input types for loading PPTX from buffer.
 */
export type PptxBufferInput = ArrayBuffer | Uint8Array;

// =============================================================================
// Main Loading Functions
// =============================================================================

/**
 * Load a PPTX file from an ArrayBuffer and return the bundle.
 *
 * Use this when you need access to the underlying ZipPackage
 * for later modification or export.
 *
 * @example
 * ```typescript
 * const bundle = await loadPptxBundleFromBuffer(buffer);
 *
 * // Read files directly
 * const xml = bundle.zipPackage.readText("ppt/presentation.xml");
 *
 * // Modify and export
 * bundle.zipPackage.writeText("ppt/slides/slide1.xml", newXml);
 * const blob = await bundle.zipPackage.toBlob();
 * ```
 */
export async function loadPptxBundleFromBuffer(
  buffer: PptxBufferInput,
): Promise<PptxFileBundle> {
  if (!buffer) {
    throw new Error("buffer is required");
  }
  const zipPackage = await loadZipPackage(buffer);

  return {
    zipPackage,
    presentationFile: zipPackage.asPresentationFile(),
  };
}

/**
 * Load a PPTX file from an ArrayBuffer.
 *
 * This is the main loading function for most use cases.
 *
 * @example
 * ```typescript
 * const { presentation, presentationFile } = await loadPptxFromBuffer(buffer);
 * const slides = presentation.slides;
 * ```
 */
export async function loadPptxFromBuffer(
  buffer: PptxBufferInput,
): Promise<LoadedPresentation> {
  const { presentationFile } = await loadPptxBundleFromBuffer(buffer);
  const presentation = openPresentation(presentationFile);

  return { presentation, presentationFile };
}

/**
 * Load a PPTX file from a File object (from file input).
 *
 * @example
 * ```typescript
 * const input = document.querySelector('input[type="file"]');
 * input.onchange = async (e) => {
 *   const file = e.target.files[0];
 *   const { presentation } = await loadPptxFromFile(file);
 * };
 * ```
 */
export async function loadPptxFromFile(file: File): Promise<LoadedPresentation> {
  const buffer = await file.arrayBuffer();
  return loadPptxFromBuffer(buffer);
}

/**
 * Load a PPTX file from a URL.
 *
 * @example
 * ```typescript
 * const { presentation } = await loadPptxFromUrl("/templates/blank.pptx");
 * ```
 */
export async function loadPptxFromUrl(url: string): Promise<LoadedPresentation> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PPTX: ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return loadPptxFromBuffer(buffer);
}
