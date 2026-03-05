/**
 * @file build command - build PdfDocument JSON from a PDF file
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { runPdfBuildPipeline } from "@aurochs-builder/pdf";
import { getPdfPageCount, serializePdfDocumentAsJson } from "@aurochs/pdf";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadPdfBinary } from "./loader";
import { parseOptionalPageSelection } from "./page-selection";
import { getErrorCode, getErrorMessage, getErrorPath } from "./error-info";

export type BuildSpec = {
  readonly input: string;
  readonly output: string;
  readonly pages?: string;
  readonly includeText?: boolean;
  readonly includePaths?: boolean;
  readonly minPathComplexity?: number;
};

export type BuildData = {
  readonly inputPath: string;
  readonly outputPath: string;
  readonly processedPages: number;
  readonly textCount: number;
  readonly pathCount: number;
  readonly imageCount: number;
};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function readRequiredString(value: Readonly<Record<string, unknown>>, key: string): string {
  const raw = value[key];
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error(`"${key}" must be a non-empty string`);
  }
  return raw;
}

function readOptionalString(value: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const raw = value[key];
  if (raw === undefined) {
    return undefined;
  }
  if (typeof raw !== "string") {
    throw new Error(`"${key}" must be a string`);
  }
  return raw;
}

function readOptionalBoolean(value: Readonly<Record<string, unknown>>, key: string): boolean | undefined {
  const raw = value[key];
  if (raw === undefined) {
    return undefined;
  }
  if (typeof raw !== "boolean") {
    throw new Error(`"${key}" must be a boolean`);
  }
  return raw;
}

function readOptionalNumber(value: Readonly<Record<string, unknown>>, key: string): number | undefined {
  const raw = value[key];
  if (raw === undefined) {
    return undefined;
  }
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    throw new Error(`"${key}" must be a finite number`);
  }
  return raw;
}

function parseBuildSpec(value: unknown): BuildSpec {
  if (!isRecord(value)) {
    throw new Error("build spec must be an object");
  }
  return {
    input: readRequiredString(value, "input"),
    output: readRequiredString(value, "output"),
    pages: readOptionalString(value, "pages"),
    includeText: readOptionalBoolean(value, "includeText"),
    includePaths: readOptionalBoolean(value, "includePaths"),
    minPathComplexity: readOptionalNumber(value, "minPathComplexity"),
  };
}

function countElements(document: Awaited<ReturnType<typeof runPdfBuildPipeline>>["document"]): Readonly<{
  textCount: number;
  pathCount: number;
  imageCount: number;
}> {
  const textCount = document.pages.flatMap((page) => page.elements).filter((element) => element.type === "text").length;
  const pathCount = document.pages.flatMap((page) => page.elements).filter((element) => element.type === "path").length;
  const imageCount = document.pages.flatMap((page) => page.elements).filter((element) => element.type === "image").length;
  return { textCount, pathCount, imageCount };
}

async function runBuildPipeline(args: {
  readonly data: Uint8Array;
  readonly selectedPages: readonly number[] | undefined;
  readonly includeText: boolean;
  readonly includePaths: boolean;
  readonly minPathComplexity: number;
}) {
  if (args.selectedPages === undefined) {
    return await runPdfBuildPipeline({
      data: args.data,
      buildOptions: {
        includeText: args.includeText,
        includePaths: args.includePaths,
        minPathComplexity: args.minPathComplexity,
      },
    });
  }
  return await runPdfBuildPipeline({
    data: args.data,
    parseOptions: { pages: args.selectedPages },
    buildOptions: {
      includeText: args.includeText,
      includePaths: args.includePaths,
      minPathComplexity: args.minPathComplexity,
    },
  });
}

/**
 * Build `PdfDocument` JSON from a build spec.
 *
 * Spec format:
 * {
 *   "input": "./input.pdf",
 *   "output": "./output.json",
 *   "pages": "1,3-5",
 *   "includeText": true,
 *   "includePaths": true,
 *   "minPathComplexity": 0
 * }
 */
export async function runBuild(specPath: string): Promise<Result<BuildData>> {
  try {
    const specText = await fs.readFile(specPath, "utf8");
    const spec = parseBuildSpec(JSON.parse(specText));
    const specDir = path.dirname(specPath);

    const inputPath = path.resolve(specDir, spec.input);
    const outputPath = path.resolve(specDir, spec.output);

    const data = await loadPdfBinary(inputPath);
    const pageCount = await getPdfPageCount(data);
    const selectedPages = parseOptionalPageSelection(spec.pages, pageCount);

    const includeText = spec.includeText ?? true;
    const includePaths = spec.includePaths ?? true;
    const minPathComplexity = spec.minPathComplexity ?? 0;

    const result = await runBuildPipeline({
      data,
      selectedPages,
      includeText,
      includePaths,
      minPathComplexity,
    });

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, serializePdfDocumentAsJson(result.document, 2));

    const counts = countElements(result.document);

    return success({
      inputPath,
      outputPath,
      processedPages: result.document.pages.length,
      textCount: counts.textCount,
      pathCount: counts.pathCount,
      imageCount: counts.imageCount,
    });
  } catch (caughtError) {
    if (getErrorCode(caughtError) === "ENOENT") {
      const filePath = getErrorPath(caughtError) ?? specPath;
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    if (caughtError instanceof SyntaxError) {
      return error("INVALID_JSON", `Invalid JSON: ${caughtError.message}`);
    }
    return error("BUILD_ERROR", `Build failed: ${getErrorMessage(caughtError)}`);
  }
}
