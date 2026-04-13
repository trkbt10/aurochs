/** @file PDF rendering pipeline — parse, build, and render to SVG. */
// eslint-disable-next-line custom/no-builder-import-in-renderer -- buildPdf constructs the PdfDocument domain model from raw bytes; this is required by the render pipeline before SVG output can be produced
import { buildPdf } from "@aurochs-builder/pdf";
import type { PdfDocument } from "@aurochs/pdf/domain";
import { renderPdfDocumentPageToSvg, renderPdfDocumentToSvgs } from "./svg";
import type {
  BuildPdfDocumentForRenderArgs,
  PdfBinarySource,
  RenderPdfSourcePageToSvgArgs,
  RenderPdfSourceToSvgsArgs,
} from "./types";

function isPdfBinarySource(value: unknown): value is PdfBinarySource {
  return value instanceof Uint8Array || value instanceof ArrayBuffer;
}

function assertNonNull<T>(value: T | null | undefined, path: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`${path} is required`);
  }
}

function assertPdfBinarySource(value: unknown, path: string): asserts value is PdfBinarySource {
  if (!isPdfBinarySource(value)) {
    throw new Error(`${path} must be Uint8Array or ArrayBuffer`);
  }
}

/** Build `PdfDocument` from raw PDF bytes for rendering. */
export async function buildPdfDocumentForRender(args: BuildPdfDocumentForRenderArgs): Promise<PdfDocument> {
  assertNonNull(args, "args");
  assertPdfBinarySource(args.data, "args.data");

  return await buildPdf({
    data: args.data,
    parseOptions: args.parseOptions,
    buildOptions: args.buildOptions,
    contextRewriter: args.contextRewriter,
  });
}

/** Parse/build PDF bytes and render all pages into SVG strings. */
export async function renderPdfSourceToSvgs(args: RenderPdfSourceToSvgsArgs): Promise<readonly string[]> {
  assertNonNull(args, "args");
  assertPdfBinarySource(args.data, "args.data");

  const document = await buildPdfDocumentForRender({
    data: args.data,
    parseOptions: args.parseOptions,
    buildOptions: args.buildOptions,
    contextRewriter: args.contextRewriter,
  });

  return renderPdfDocumentToSvgs(document, args.renderOptions);
}

/** Parse/build PDF bytes and render a single 1-indexed page into SVG. */
export async function renderPdfSourcePageToSvg(args: RenderPdfSourcePageToSvgArgs): Promise<string> {
  assertNonNull(args, "args");
  assertPdfBinarySource(args.data, "args.data");

  const document = await buildPdfDocumentForRender({
    data: args.data,
    parseOptions: args.parseOptions,
    buildOptions: args.buildOptions,
    contextRewriter: args.contextRewriter,
  });

  return renderPdfDocumentPageToSvg(document, args.pageNumber, args.renderOptions);
}
