/**
 * @file PDF Document Writer
 *
 * Main entry point for writing PdfDocument to PDF binary format.
 */

import type { PdfDocument } from "../domain/document";
import type { PdfObject } from "../native/core/types";
import type { PdfImage } from "../domain/image";
import type { FontProvider } from "../domain/font/font-provider";
import { createFontProvider } from "../domain/font/font-provider";
import { serializePdfDict, serializeIndirectObject } from "./object-serializer";
import { buildXrefSection } from "./xref-builder";
import {
  createPdfObjectTracker,
  buildFonts,
  buildImages,
  buildPage,
} from "./document";

const encoder = new TextEncoder();

function encodeAscii(text: string): Uint8Array {
  return encoder.encode(text);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  arrays.reduce((offset, arr) => {
    result.set(arr, offset);
    return offset + arr.length;
  }, 0);
  return result;
}

/**
 * Options for writing a PDF document.
 */
export type PdfWriteOptions = {
  /** PDF version (default: "1.4") */
  readonly pdfVersion?: "1.4" | "1.5" | "1.6" | "1.7" | "2.0";
  /** Whether to compress streams (default: true) */
  readonly compress?: boolean;
  /** Producer string for /Info dictionary */
  readonly producer?: string;
  /** Creation date for /Info dictionary */
  readonly creationDate?: Date;
  /**
   * Font provider for font resolution and re-encoding.
   * When provided, edited text elements will be re-encoded through this provider.
   * When omitted, a default provider is created from the document's embedded fonts.
   */
  readonly fontProvider?: FontProvider;
};

/**
 * Build the PDF header.
 *
 * @param version - PDF version string
 * @returns Header bytes
 */
function buildHeader(version: string): Uint8Array {
  // %PDF-x.x followed by a comment with high-byte chars to indicate binary
  return encodeAscii(`%PDF-${version}\n%\x80\x81\x82\x83\n`);
}

/**
 * Format a Date as PDF date string.
 * Format: D:YYYYMMDDHHmmSSOHH'mm'
 */
function formatPdfDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `D:${year}${month}${day}${hours}${minutes}${seconds}Z`;
}

/**
 * Collect all font names from a document.
 */
function collectAllFontNames(document: PdfDocument): Set<string> {
  const fontNames = new Set<string>();

  for (const page of document.pages) {
    for (const element of page.elements) {
      if (element.type === "text") {
        fontNames.add(element.fontName);
        if (element.baseFont) {
          fontNames.add(element.baseFont);
        }
      }
    }
  }

  return fontNames;
}

/**
 * Collect all images from a document.
 */
function collectAllImages(document: PdfDocument): { page: number; index: number; image: PdfImage }[] {
  return document.pages.flatMap((page, pageIdx) => {
    const imageElements = page.elements.filter((e): e is PdfImage => e.type === "image");
    return imageElements.map((image, imageIdx) => ({ page: pageIdx, index: imageIdx, image }));
  });
}

/**
 * Write a PdfDocument to PDF binary format.
 *
 * @param document - The document to write
 * @param options - Write options
 * @returns PDF file as Uint8Array
 */
export function writePdfDocument(
  document: PdfDocument,
  options: PdfWriteOptions = {}
): Uint8Array {
  const {
    pdfVersion = "1.4",
    producer = "aurochs-pdf",
  } = options;

  const tracker = createPdfObjectTracker();

  // Create FontProvider (use provided one, or create default from embedded fonts)
  const fontProvider = options.fontProvider ?? createFontProvider({ embeddedFonts: document.embeddedFonts });

  // Phase 1: Reserve object numbers for structure
  // We need to know /Pages objNum before building pages, but we build pages before /Pages
  // So we allocate in advance

  // Reserve: Catalog (1), Pages (2), Info (3)
  const catalogObjNum = tracker.allocate();
  const pagesObjNum = tracker.allocate();
  const infoObjNum = tracker.allocate();

  // Phase 2: Build fonts
  const allFontNames = collectAllFontNames(document);
  const fontObjMap = buildFonts(document.embeddedFonts, allFontNames, tracker);

  // Phase 3: Build images (collect all, then build)
  const allImages = collectAllImages(document);
  const globalImageObjMap = new Map<string, number>(); // "page:index" -> objNum

  for (const { page, index, image } of allImages) {
    const imageObjMap = buildImages([image], tracker);
    const objNum = imageObjMap.get(0);
    if (objNum !== undefined) {
      globalImageObjMap.set(`${page}:${index}`, objNum);
    }
  }

  // Phase 4: Build pages
  const pageObjNums: number[] = [];

  for (let pageIdx = 0; pageIdx < document.pages.length; pageIdx++) {
    const page = document.pages[pageIdx];

    // Build image map for this page
    const pageImageObjMap = new Map<number, number>();
    const imageElements = page.elements.filter((e) => e.type === "image");
    for (const [imageIdx] of imageElements.entries()) {
      const objNum = globalImageObjMap.get(`${pageIdx}:${imageIdx}`);
      if (objNum !== undefined) {
        pageImageObjMap.set(imageIdx, objNum);
      }
    }

    const result = buildPage({
      page,
      pagesObjNum,
      fontObjMap,
      imageObjMap: pageImageObjMap,
      tracker,
      embeddedFonts: document.embeddedFonts,
      fontProvider,
    });
    pageObjNums.push(result.pageObjNum);
  }

  // Phase 5: Build /Pages tree
  const pagesDict = new Map<string, PdfObject>([
    ["Type", { type: "name", value: "Pages" }],
    ["Kids", {
      type: "array",
      items: pageObjNums.map((n) => ({ type: "ref", obj: n, gen: 0 })),
    }],
    ["Count", { type: "number", value: pageObjNums.length }],
  ]);
  const pagesDictBytes = serializePdfDict(pagesDict);
  tracker.set(pagesObjNum, serializeIndirectObject(pagesObjNum, 0, pagesDictBytes));

  // Phase 6: Build /Catalog
  const catalogDict = new Map<string, PdfObject>([
    ["Type", { type: "name", value: "Catalog" }],
    ["Pages", { type: "ref", obj: pagesObjNum, gen: 0 }],
  ]);
  const catalogDictBytes = serializePdfDict(catalogDict);
  tracker.set(catalogObjNum, serializeIndirectObject(catalogObjNum, 0, catalogDictBytes));

  // Phase 7: Build /Info
  const infoDict = new Map<string, PdfObject>();
  infoDict.set("Producer", {
    type: "string",
    bytes: encoder.encode(producer),
    text: producer,
  });
  if (options.creationDate) {
    const dateStr = formatPdfDate(options.creationDate);
    infoDict.set("CreationDate", {
      type: "string",
      bytes: encoder.encode(dateStr),
      text: dateStr,
    });
  }
  if (document.metadata?.title) {
    infoDict.set("Title", {
      type: "string",
      bytes: encoder.encode(document.metadata.title),
      text: document.metadata.title,
    });
  }
  if (document.metadata?.author) {
    infoDict.set("Author", {
      type: "string",
      bytes: encoder.encode(document.metadata.author),
      text: document.metadata.author,
    });
  }
  const infoDictBytes = serializePdfDict(infoDict);
  tracker.set(infoObjNum, serializeIndirectObject(infoObjNum, 0, infoDictBytes));

  // Phase 8: Assemble the file
  const header = buildHeader(pdfVersion);

  // Get all entries and calculate offsets
  const entries = tracker.getAll();
  const parts: Uint8Array[] = [header];

  // Write objects in order and record offsets
  const xrefOffset = entries.reduce((offset, entry) => {
    (entry as { offset: number }).offset = offset;
    parts.push(entry.data);
    return offset + entry.data.length;
  }, header.length);

  // Build xref section
  const xrefSection = buildXrefSection({
    entries,
    size: tracker.getSize(),
    rootObjNum: catalogObjNum,
    infoObjNum,
    xrefOffset,
  });
  parts.push(xrefSection);

  // Concatenate all parts
  return concat(...parts);
}
