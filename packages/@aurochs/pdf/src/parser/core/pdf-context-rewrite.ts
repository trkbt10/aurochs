/**
 * @file Context rewrite and persistence utilities for PDF parser pipeline.
 */

import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { PdfDocument, PdfImage } from "../../domain";
import type { ParsedElement } from "../operator";
import { buildPdfDocumentFromContext, type PdfBuildContext } from "./pdf-parser.native";

export type ParsedElementRewriteArgs = Readonly<{
  readonly element: ParsedElement;
  readonly elementIndex: number;
  readonly pageNumber: number;
  readonly pageWidth: number;
  readonly pageHeight: number;
}>;

export type ExtractedImageRewriteArgs = Readonly<{
  readonly image: PdfImage;
  readonly imageIndex: number;
  readonly pageNumber: number;
  readonly pageWidth: number;
  readonly pageHeight: number;
}>;

export type ParsedElementRewriter =
  (args: ParsedElementRewriteArgs) => ParsedElement | readonly ParsedElement[] | null | undefined;

export type ExtractedImageRewriter =
  (args: ExtractedImageRewriteArgs) => PdfImage | readonly PdfImage[] | null | undefined;

export type PdfContextRewriter = Readonly<{
  readonly rewriteParsedElement?: ParsedElementRewriter;
  readonly rewriteExtractedImage?: ExtractedImageRewriter;
}>;

function asArray<T>(value: T | readonly T[] | null | undefined): readonly T[] {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value as readonly T[];
  }
  return [value as T];
}

/**
 * Rewrite parse-stage context data before builder conversion.
 *
 * This allows low-level editing of parsed elements (path/text/image operators)
 * and extracted image payloads.
 */
export function rewritePdfContext(
  context: PdfBuildContext,
  rewriter: PdfContextRewriter,
): PdfBuildContext {
  if (!context) {
    throw new Error("context is required");
  }
  if (!rewriter) {
    throw new Error("rewriter is required");
  }

  const rewriteParsedElement = rewriter.rewriteParsedElement;
  const rewriteExtractedImage = rewriter.rewriteExtractedImage;

  const rewrittenPages = context.parsedDocument.pages.map((page) => {
    const rewrittenParsedElements = page.parsedElements.flatMap((element, elementIndex) => {
      if (!rewriteParsedElement) {
        return [element];
      }
      return asArray(
        rewriteParsedElement({
          element,
          elementIndex,
          pageNumber: page.pageNumber,
          pageWidth: page.width,
          pageHeight: page.height,
        }),
      );
    });

    const rewrittenExtractedImages = page.extractedImages.flatMap((image, imageIndex) => {
      if (!rewriteExtractedImage) {
        return [image];
      }
      return asArray(
        rewriteExtractedImage({
          image,
          imageIndex,
          pageNumber: page.pageNumber,
          pageWidth: page.width,
          pageHeight: page.height,
        }),
      );
    });

    return {
      ...page,
      parsedElements: rewrittenParsedElements,
      extractedImages: rewrittenExtractedImages,
    };
  });

  return {
    ...context,
    parsedDocument: {
      ...context.parsedDocument,
      pages: rewrittenPages,
    },
  };
}

type Uint8ArrayMarker = Readonly<{
  readonly __aurochsType: "Uint8Array";
  readonly base64: string;
}>;

function toUint8ArrayMarker(value: Uint8Array): Uint8ArrayMarker {
  return {
    __aurochsType: "Uint8Array",
    base64: Buffer.from(value).toString("base64"),
  };
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Uint8Array) {
    return toUint8ArrayMarker(value);
  }
  return value;
}

function jsonReviver(_key: string, value: unknown): unknown {
  if (
    typeof value === "object" &&
    value !== null &&
    "__aurochsType" in value &&
    (value as { readonly __aurochsType?: unknown }).__aurochsType === "Uint8Array" &&
    "base64" in value &&
    typeof (value as { readonly base64?: unknown }).base64 === "string"
  ) {
    return new Uint8Array(Buffer.from((value as Uint8ArrayMarker).base64, "base64"));
  }
  return value;
}

function ensurePdfDocumentLike(value: unknown): PdfDocument {
  if (
    typeof value !== "object" ||
    value === null ||
    !("pages" in value) ||
    !Array.isArray((value as { readonly pages?: unknown }).pages)
  ) {
    throw new Error("Invalid PDF document JSON payload");
  }
  return value as PdfDocument;
}

/** Serialize `PdfDocument` as JSON with typed-array safe encoding. */
export function serializePdfDocumentAsJson(document: PdfDocument, indent: number = 2): string {
  if (!document) {
    throw new Error("document is required");
  }
  if (!Number.isInteger(indent) || indent < 0) {
    throw new Error(`indent must be a non-negative integer: ${indent}`);
  }

  return JSON.stringify(document, jsonReplacer, indent);
}

/** Deserialize `PdfDocument` JSON created by `serializePdfDocumentAsJson`. */
export function deserializePdfDocumentFromJson(jsonText: string): PdfDocument {
  if (typeof jsonText !== "string" || jsonText.length === 0) {
    throw new Error("jsonText is required");
  }
  const parsed = JSON.parse(jsonText, jsonReviver);
  return ensurePdfDocumentLike(parsed);
}

/** Save `PdfDocument` JSON to file. */
export async function savePdfDocumentAsJson(
  document: PdfDocument,
  outputPath: string,
  indent: number = 2,
): Promise<void> {
  if (!document) {
    throw new Error("document is required");
  }
  if (typeof outputPath !== "string" || outputPath.length === 0) {
    throw new Error("outputPath is required");
  }

  const serialized = serializePdfDocumentAsJson(document, indent);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serialized, "utf8");
}

/** Load `PdfDocument` JSON from file. */
export async function loadPdfDocumentFromJson(inputPath: string): Promise<PdfDocument> {
  if (typeof inputPath !== "string" || inputPath.length === 0) {
    throw new Error("inputPath is required");
  }
  const content = await readFile(inputPath, "utf8");
  return deserializePdfDocumentFromJson(content);
}

/** Build final document from context and save it as JSON. */
export async function buildAndSavePdfContextAsJson(
  context: PdfBuildContext,
  outputPath: string,
  indent: number = 2,
): Promise<PdfDocument> {
  if (!context) {
    throw new Error("context is required");
  }
  if (typeof outputPath !== "string" || outputPath.length === 0) {
    throw new Error("outputPath is required");
  }

  const document = buildPdfDocumentFromContext(context);
  await savePdfDocumentAsJson(document, outputPath, indent);
  return document;
}
