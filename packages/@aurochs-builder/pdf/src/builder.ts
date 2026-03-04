/** @file PDF builder pipeline wrapper built on top of @aurochs/pdf */

import {
  createPdfContext,
  parsePdfSource,
  rewritePdfContext,
  savePdfDocumentAsJson,
  type PdfBuildContext,
  type PdfParsedDocument,
} from "@aurochs/pdf/parser/core/pdf-parser";
import type { PdfDocument } from "@aurochs/pdf/domain";
import type {
  BuildPdfArgs,
  BuildPdfFromBuilderContextArgs,
  BuildPdfPipelineResult,
  BuildPdfWithContextArgs,
  CreatePdfBuilderContextArgs,
  ParsePdfSourceForBuilderArgs,
  PdfBinarySource,
} from "./types";
import { buildPdfDocumentFromContext } from "./pdf-document-builder";

function isPdfBinarySource(value: unknown): value is PdfBinarySource {
  return value instanceof Uint8Array || value instanceof ArrayBuffer;
}

function assertPdfBinarySource(value: unknown, path: string): asserts value is PdfBinarySource {
  if (!isPdfBinarySource(value)) {
    throw new Error(`${path} must be Uint8Array or ArrayBuffer`);
  }
}

function assertNonNull<T>(value: T | null | undefined, path: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`${path} is required`);
  }
}

/** Parser stage: parse PDF bytes into source-level artifacts for builder usage. */
export async function parsePdfSourceForBuilder(
  args: ParsePdfSourceForBuilderArgs,
): Promise<PdfParsedDocument> {
  assertNonNull(args, "args");
  assertPdfBinarySource(args.data, "args.data");
  return await parsePdfSource(args.data, args.parseOptions ?? {});
}

/** Context stage: create explicit build context from parsed source and build options. */
export function createPdfBuilderContext(args: CreatePdfBuilderContextArgs): PdfBuildContext {
  assertNonNull(args, "args");
  assertNonNull(args.parsedDocument, "args.parsedDocument");
  return createPdfContext(args.parsedDocument, args.buildOptions ?? {});
}

/** Builder stage: build final PdfDocument from explicit build context. */
export function buildPdfFromBuilderContext(args: BuildPdfFromBuilderContextArgs): PdfDocument {
  assertNonNull(args, "args");
  assertNonNull(args.context, "args.context");
  return buildPdfDocumentFromContext(args.context);
}

/**
 * Build stage with optional context rewrite.
 * This keeps rewrite responsibility explicit while preserving parser/context/build boundaries.
 */
export function buildPdfWithContext(args: BuildPdfWithContextArgs): PdfDocument {
  assertNonNull(args, "args");
  assertNonNull(args.context, "args.context");

  const context = args.contextRewriter ? rewritePdfContext(args.context, args.contextRewriter) : args.context;
  return buildPdfDocumentFromContext(context);
}

/**
 * Run parser -> context -> builder and return all intermediate artifacts.
 * Useful when callers need both the final document and inspectable pipeline state.
 */
export async function runPdfBuildPipeline(args: BuildPdfArgs): Promise<BuildPdfPipelineResult> {
  assertNonNull(args, "args");
  assertPdfBinarySource(args.data, "args.data");

  const parsedDocument = await parsePdfSourceForBuilder({
    data: args.data,
    parseOptions: args.parseOptions,
  });

  const context = createPdfBuilderContext({
    parsedDocument,
    buildOptions: args.buildOptions,
  });

  const document = buildPdfWithContext({
    context,
    contextRewriter: args.contextRewriter,
  });

  return {
    parsedDocument,
    context,
    document,
  };
}

/** Convenience API for callers that only need the final PdfDocument. */
export async function buildPdf(args: BuildPdfArgs): Promise<PdfDocument> {
  const result = await runPdfBuildPipeline(args);
  return result.document;
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
