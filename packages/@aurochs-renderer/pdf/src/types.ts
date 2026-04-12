/** @file Shared types for the PDF renderer package. */
import type { PdfBuildOptions, PdfContextRewriter, PdfParseOptions } from "@aurochs/pdf/parser/core/pdf-parser";
import type { FontProvider } from "@aurochs/pdf/domain/font";

export type PdfBinarySource = Uint8Array | ArrayBuffer;

export type PdfSvgRenderOptions = Readonly<{
  readonly width?: number | string;
  readonly height?: number | string;
  readonly backgroundColor?: string;
  readonly preserveAspectRatio?: string;
  readonly includeXmlDeclaration?: boolean;
  /** Element indices to exclude from rendering (for editing overlays). */
  readonly excludeElementIndices?: ReadonlySet<number>;
  /**
   * Font provider for font resolution.
   * When provided, font-family is resolved through the provider.
   * When omitted, a minimal provider (Standard 14 fonts only) is used internally.
   */
  readonly fontProvider?: FontProvider;
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
