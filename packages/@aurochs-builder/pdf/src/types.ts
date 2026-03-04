/** @file Types for @aurochs-builder/pdf pipeline API */

import type {
  PdfBuildContext,
  PdfBuildOptions,
  PdfParseOptions,
  PdfParsedDocument,
  PdfContextRewriter,
} from "@aurochs/pdf/parser/core/pdf-parser";
import type { PdfDocument } from "@aurochs/pdf/domain";

export type PdfBinarySource = Uint8Array | ArrayBuffer;

export type ParsePdfSourceForBuilderArgs = Readonly<{
  readonly data: PdfBinarySource;
  readonly parseOptions?: PdfParseOptions;
}>;

export type CreatePdfBuilderContextArgs = Readonly<{
  readonly parsedDocument: PdfParsedDocument;
  readonly buildOptions?: PdfBuildOptions;
}>;

export type BuildPdfFromBuilderContextArgs = Readonly<{
  readonly context: PdfBuildContext;
}>;

export type BuildPdfArgs = Readonly<{
  readonly data: PdfBinarySource;
  readonly parseOptions?: PdfParseOptions;
  readonly buildOptions?: PdfBuildOptions;
  readonly contextRewriter?: PdfContextRewriter;
}>;

export type BuildPdfWithContextArgs = Readonly<{
  readonly context: PdfBuildContext;
  readonly contextRewriter?: PdfContextRewriter;
}>;

export type BuildPdfPipelineResult = Readonly<{
  readonly parsedDocument: PdfParsedDocument;
  readonly context: PdfBuildContext;
  readonly document: PdfDocument;
}>;
