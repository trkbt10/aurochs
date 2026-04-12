/** @file Shared types for the PDF renderer package. */
import type { PdfBuildOptions, PdfContextRewriter, PdfParseOptions } from "@aurochs/pdf/parser/core/pdf-parser";
import type { FontProvider } from "@aurochs/pdf/domain/font";
import type { PdfImage } from "@aurochs/pdf/domain";

export type PdfBinarySource = Uint8Array | ArrayBuffer;

/**
 * Resolves a PdfImage to a URL string for use in SVG `<image href="...">`.
 *
 * The default implementation generates a `data:` URL (Base64). Callers can
 * provide a custom resolver that returns `blob:` URLs via `URL.createObjectURL`
 * for better browser performance, or cached URLs to avoid re-encoding.
 */
export type PdfImageUrlResolver = (image: PdfImage) => string;

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
  /**
   * Custom image URL resolver.
   *
   * When provided, image elements use this to obtain the `href` value
   * instead of the default `data:` URL generation. Use `createPdfImageCache()`
   * to get a resolver that caches Object URLs for browser rendering.
   *
   * When omitted, the default `buildPdfImageDataUrl` (Base64 data URL) is used.
   */
  readonly imageUrlResolver?: PdfImageUrlResolver;
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
