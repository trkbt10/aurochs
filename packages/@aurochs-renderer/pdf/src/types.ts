/** @file Shared types for the PDF renderer package. */
import type { PdfBuildOptions, PdfContextRewriter, PdfParseOptions } from "@aurochs/pdf/parser/core/pdf-parser";

export type PdfBinarySource = Uint8Array | ArrayBuffer;

export type PdfSvgRenderOptions = Readonly<{
  readonly width?: number | string;
  readonly height?: number | string;
  readonly backgroundColor?: string;
  readonly preserveAspectRatio?: string;
  readonly includeXmlDeclaration?: boolean;
  /** Element indices to exclude from rendering (for editing overlays). */
  readonly excludeElementIndices?: ReadonlySet<number>;
}>;

export type BuildPdfDocumentForRenderArgs = Readonly<{
  readonly data: PdfBinarySource;
  readonly parseOptions?: PdfParseOptions;
  readonly buildOptions?: PdfBuildOptions;
  readonly contextRewriter?: PdfContextRewriter;
}>;

export type RenderPdfSourceToSvgsArgs = Readonly<{
  readonly data: PdfBinarySource;
  readonly parseOptions?: PdfParseOptions;
  readonly buildOptions?: PdfBuildOptions;
  readonly contextRewriter?: PdfContextRewriter;
  readonly renderOptions?: PdfSvgRenderOptions;
}>;

export type RenderPdfSourcePageToSvgArgs = Readonly<{
  readonly data: PdfBinarySource;
  readonly pageNumber: number;
  readonly parseOptions?: PdfParseOptions;
  readonly buildOptions?: PdfBuildOptions;
  readonly contextRewriter?: PdfContextRewriter;
  readonly renderOptions?: PdfSvgRenderOptions;
}>;
