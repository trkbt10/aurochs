/**
 * @file Client-side PPTX loader using JSZip.
 *
 * Loads and parses PPTX files directly in the browser without any backend.
 */

import JSZip from "jszip";
import { openPresentation } from "./open-presentation";
import type { PresentationFile } from "../domain";

export type PptxFileCacheEntry = { text: string; buffer: ArrayBuffer };
export type PptxFileCache = Map<string, PptxFileCacheEntry>;

export type LoadedPresentation = {
  presentation: ReturnType<typeof openPresentation>;
  presentationFile: PresentationFile;
};

export type PptxFileBundle = {
  cache: PptxFileCache;
  filePaths: string[];
  presentationFile: PresentationFile;
};

export type PptxBufferInput = ArrayBuffer | Uint8Array;

/**
 * Preload all files from the ZIP into memory
 */
async function preloadZipFiles(jszip: JSZip): Promise<PptxFileCache> {
  const cache: PptxFileCache = new Map();
  const files = Object.keys(jszip.files);

  for (const filePath of files) {
    const file = jszip.file(filePath);
    if (file !== null && !file.dir) {
      const buffer = await file.async("arraybuffer");
      const text = new TextDecoder().decode(buffer);
      cache.set(filePath, { text, buffer });
    }
  }

  return cache;
}

/**
 * Create a PresentationFile interface from the cached files
 */
export function createPresentationFile(cache: PptxFileCache): PresentationFile {
  return {
    readText(filePath: string): string | null {
      const entry = cache.get(filePath);
      return entry?.text ?? null;
    },
    readBinary(filePath: string): ArrayBuffer | null {
      const entry = cache.get(filePath);
      return entry?.buffer ?? null;
    },
    exists(filePath: string): boolean {
      return cache.has(filePath);
    },
  };
}

/**
 * Load a PPTX file from an ArrayBuffer and return the cached bundle.
 */
export async function loadPptxBundleFromBuffer(buffer: PptxBufferInput): Promise<PptxFileBundle> {
  if (!buffer) {
    throw new Error("buffer is required");
  }
  const jszip = await JSZip.loadAsync(buffer);
  const cache = await preloadZipFiles(jszip);
  return {
    cache,
    filePaths: Array.from(cache.keys()),
    presentationFile: createPresentationFile(cache),
  };
}

/**
 * Load a PPTX file from an ArrayBuffer
 */
export async function loadPptxFromBuffer(buffer: ArrayBuffer): Promise<LoadedPresentation> {
  const { presentationFile } = await loadPptxBundleFromBuffer(buffer);
  const presentation = openPresentation(presentationFile);

  return { presentation, presentationFile };
}

/**
 * Load a PPTX file from a File object (from file input)
 */
export async function loadPptxFromFile(file: File): Promise<LoadedPresentation> {
  const buffer = await file.arrayBuffer();
  return loadPptxFromBuffer(buffer);
}

/**
 * Load a PPTX file from a URL
 */
export async function loadPptxFromUrl(url: string): Promise<LoadedPresentation> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PPTX: ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return loadPptxFromBuffer(buffer);
}
