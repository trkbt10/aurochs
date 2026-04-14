/**
 * @file Unified file conversion pipeline
 *
 * Converts Office documents (PPTX, XLSX, DOCX, PDF) and their legacy
 * counterparts (PPT, XLS, DOC) to various output formats (Markdown, SVG, text, PNG).
 *
 * ## Architecture
 *
 * Each input format has its own conversion path per output format:
 *
 * - **Markdown**: runPreview → mermaid renderer (shapes/rows/blocks → markdown)
 * - **SVG**: runPreview(format: "svg") → slide/sheet/section/page .svg strings
 * - **Text**: runPreview(format: "ascii") → slide/sheet/section .ascii strings
 * - **PNG**: SVG pipeline → @resvg/resvg-js rasterization
 *
 * Legacy formats (PPT, XLS, DOC) are transparently converted to their modern
 * counterparts by the loaders inside each CLI package.
 */

import { extname, dirname, basename, join } from "node:path";
import * as fs from "node:fs/promises";

// PPTX
import { runPreview as runPptxPreview } from "@aurochs-cli/pptx-cli";
import { renderSlideMermaid } from "@aurochs-renderer/pptx/mermaid";

// XLSX
import { runPreview as runXlsxPreview } from "@aurochs-cli/xlsx-cli";
import { renderSheetMermaid } from "@aurochs-renderer/xlsx/mermaid";

// DOCX
import { runPreview as runDocxPreview } from "@aurochs-cli/docx-cli";
import { renderDocxMermaid } from "@aurochs-renderer/docx/mermaid";

// PDF
import { buildPdf } from "@aurochs-builder/pdf";
import type { PdfText } from "@aurochs/pdf/domain";
import { renderPdfPageMermaid } from "@aurochs-renderer/pdf/mermaid";
import { renderPdfSourceToSvgs } from "@aurochs-renderer/pdf";

// Fig
import { parseFigFile, buildNodeTree, findNodesByType, getNodeType, safeChildren } from "@aurochs/fig/parser";
import type { FigNode } from "@aurochs/fig/types";
import { renderCanvas } from "@aurochs-renderer/fig/svg";

// DSV / XLSX interop
import { convertXlsxToDsv, convertDsvToXlsx } from "@aurochs-converters/interop-dsv-xlsx";
import { buildDsv, buildJsonl, parseDsv } from "@aurochs/dsv";
import { loadZipPackage } from "@aurochs/zip";
import { parseXlsxWorkbook } from "@aurochs-office/xlsx/parser";
import { exportXlsx } from "@aurochs-builder/xlsx/exporter";

// PNG (SVG rasterization)
import { Resvg } from "@resvg/resvg-js";

// =============================================================================
// Types
// =============================================================================

/** Supported input format, detected from file extension. */
export type InputFormat = "pptx" | "xlsx" | "docx" | "pdf" | "fig" | "csv" | "tsv";

/** Supported output format. */
export type OutputFormat = "markdown" | "svg" | "text" | "png" | "csv" | "tsv" | "jsonl" | "xlsx";

export type ConvertOptions = {
  /** Output file path. If omitted, result is returned as string (stdout). */
  readonly outputPath?: string;
};

export type ConvertResult = {
  /** The Markdown output. */
  readonly markdown: string;
  /** Detected input format. */
  readonly format: InputFormat;
  /** Whether the file was a legacy format that was transparently converted. */
  readonly isLegacy: boolean;
};

/** Result from the generalized convert function. */
export type ConvertOutput = {
  /** Output pages/slides/sheets. Each element is one logical unit. */
  readonly pages: readonly ConvertPage[];
  /** Detected input format. */
  readonly inputFormat: InputFormat;
  /** Output format used. */
  readonly outputFormat: OutputFormat;
  /** Whether the file was a legacy format that was transparently converted. */
  readonly isLegacy: boolean;
};

export type ConvertPage = {
  /** 1-indexed page/slide/sheet number. */
  readonly index: number;
  /** Label for this page (e.g. "Slide 1", "Sheet1", "Section 1", "Page 1"). */
  readonly label: string;
  /** Content as string (markdown/svg/text) or Buffer (png). */
  readonly content: string | Buffer;
};

// =============================================================================
// Format Detection
// =============================================================================

const EXTENSION_MAP: Record<string, { format: InputFormat; legacy: boolean }> = {
  ".pptx": { format: "pptx", legacy: false },
  ".ppt": { format: "pptx", legacy: true },
  ".xlsx": { format: "xlsx", legacy: false },
  ".xls": { format: "xlsx", legacy: true },
  ".docx": { format: "docx", legacy: false },
  ".doc": { format: "docx", legacy: true },
  ".pdf": { format: "pdf", legacy: false },
  ".fig": { format: "fig", legacy: false },
  ".csv": { format: "csv", legacy: false },
  ".tsv": { format: "tsv", legacy: false },
};

const OUTPUT_EXTENSION_MAP: Record<string, OutputFormat> = {
  ".md": "markdown",
  ".markdown": "markdown",
  ".svg": "svg",
  ".txt": "text",
  ".png": "png",
  ".csv": "csv",
  ".tsv": "tsv",
  ".jsonl": "jsonl",
  ".xlsx": "xlsx",
};

/**
 * Supported output formats per input format.
 *
 * If a combination is not listed here, conversion will throw an error.
 * PDF → text is not supported because there is no ASCII renderer for PDF.
 */
const SUPPORTED_CONVERSIONS: Record<InputFormat, readonly OutputFormat[]> = {
  pptx: ["markdown", "svg", "text", "png"],
  xlsx: ["markdown", "svg", "text", "png", "csv", "tsv", "jsonl"],
  docx: ["markdown", "svg", "text", "png"],
  pdf: ["markdown", "svg", "png"],
  fig: ["markdown", "svg", "png"],
  csv: ["xlsx"],
  tsv: ["xlsx"],
};

function detectInputFormat(filePath: string): { format: InputFormat; legacy: boolean } | undefined {
  const ext = extname(filePath).toLowerCase();
  return EXTENSION_MAP[ext];
}

function detectOutputFormat(filePath: string): OutputFormat | undefined {
  const ext = extname(filePath).toLowerCase();
  return OUTPUT_EXTENSION_MAP[ext];
}

function assertConversionSupported(inputFormat: InputFormat, outputFormat: OutputFormat): void {
  const supported = SUPPORTED_CONVERSIONS[inputFormat];
  if (!supported.includes(outputFormat)) {
    throw new Error(
      `Unsupported conversion: ${inputFormat} → ${outputFormat}. ` +
        `Supported output formats for ${inputFormat}: ${supported.join(", ")}`,
    );
  }
}

// =============================================================================
// Output path resolution (%d pattern, ffmpeg-style)
// =============================================================================

/**
 * Resolves output paths for multi-page output using ffmpeg-style %d pattern.
 *
 * - `output_%d.svg` with 3 pages → `output_1.svg`, `output_2.svg`, `output_3.svg`
 * - `output.svg` with 1 page → `output.svg`
 * - `output.svg` with 3 pages + concatenable format → `output.svg` (single file)
 * - `output.svg` with 3 pages + non-concatenable format → Error
 */
function resolveOutputPaths(
  outputPath: string,
  pageCount: number,
  outputFormat: OutputFormat,
): string[] {
  const hasPlaceholder = outputPath.includes("%d");

  if (hasPlaceholder) {
    return Array.from({ length: pageCount }, (_, i) =>
      outputPath.replace("%d", String(i + 1)),
    );
  }

  if (pageCount === 1) {
    return [outputPath];
  }

  // Multiple pages without %d placeholder
  const concatenableFormats: OutputFormat[] = ["markdown", "text", "csv", "tsv", "jsonl"];
  if (concatenableFormats.includes(outputFormat)) {
    // Concatenate into a single file
    return [outputPath];
  }

  // SVG/PNG cannot be meaningfully concatenated into a single file
  throw new Error(
    `Multiple pages found (${pageCount}). Use %d placeholder for multi-page output ` +
      `(e.g. -o ${insertPlaceholder(outputPath)})`,
  );
}

function insertPlaceholder(outputPath: string): string {
  const ext = extname(outputPath);
  const base = basename(outputPath, ext);
  const dir = dirname(outputPath);
  return join(dir, `${base}_%d${ext}`);
}

// =============================================================================
// Markdown converters (existing)
// =============================================================================

async function convertPptxToMarkdown(filePath: string): Promise<ConvertPage[]> {
  const result = await runPptxPreview(filePath, undefined, { width: 80 });
  if (!result.success) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }

  return result.data.slides.map((slide) => {
    const header = `## Slide ${slide.number}`;
    const markdown = renderSlideMermaid({ shapes: slide.shapes, slideNumber: slide.number });
    return {
      index: slide.number,
      label: `Slide ${slide.number}`,
      content: markdown ? `${header}\n\n${markdown}` : header,
    };
  });
}

async function convertXlsxToMarkdown(filePath: string): Promise<ConvertPage[]> {
  const result = await runXlsxPreview(filePath, undefined, { width: 80 });
  if (!result.success) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }

  return result.data.sheets.map((sheet, i) => {
    const header = `## ${sheet.name}`;
    const markdown = renderSheetMermaid({
      name: sheet.name,
      rows: sheet.rows,
      columnCount: sheet.colCount,
    });
    return {
      index: i + 1,
      label: sheet.name,
      content: markdown ? `${header}\n\n${markdown}` : header,
    };
  });
}

async function convertDocxToMarkdown(filePath: string): Promise<ConvertPage[]> {
  const result = await runDocxPreview(filePath, undefined, { width: 80 });
  if (!result.success) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }

  return result.data.sections.map((section) => {
    const header = `## Section ${section.number}`;
    const markdown = renderDocxMermaid({ blocks: section.blocks });
    return {
      index: section.number,
      label: `Section ${section.number}`,
      content: markdown ? `${header}\n\n${markdown}` : header,
    };
  });
}

function isTextElement(element: { type: string }): element is PdfText {
  return element.type === "text";
}

async function convertPdfToMarkdown(filePath: string): Promise<ConvertPage[]> {
  const data = new Uint8Array(await fs.readFile(filePath));
  const document = await buildPdf({
    data,
    buildOptions: {
      includeText: true,
      includePaths: false,
    },
  });

  return document.pages.map((page) => {
    const header = `## Page ${page.pageNumber}`;
    const textItems = page.elements.filter(isTextElement).map((el) => ({
      text: el.text,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      fontSize: el.fontSize,
      isBold: el.isBold,
      isItalic: el.isItalic,
    }));

    const markdown = renderPdfPageMermaid({
      pageNumber: page.pageNumber,
      width: page.width,
      height: page.height,
      textItems,
    });
    return {
      index: page.pageNumber,
      label: `Page ${page.pageNumber}`,
      content: markdown ? `${header}\n\n${markdown}` : header,
    };
  });
}

// =============================================================================
// Fig converters (shared loader)
// =============================================================================

async function loadFigForConvert(filePath: string) {
  const data = new Uint8Array(await fs.readFile(filePath));
  const parsed = await parseFigFile(data);
  const tree = buildNodeTree(parsed.nodeChanges);
  const canvases = findNodesByType(tree.roots, "CANVAS");
  return { parsed, tree, canvases };
}

async function convertFigToMarkdown(filePath: string): Promise<ConvertPage[]> {
  const { parsed: _parsed, tree: _tree, canvases } = await loadFigForConvert(filePath);

  return canvases.map((canvas, i) => {
    const pageName = canvas.name ?? `Page ${i + 1}`;
    const header = `## ${pageName}`;
    const lines: string[] = [];

    function walkNode(node: FigNode, depth: number): void {
      const nodeType = getNodeType(node);
      const indent = "  ".repeat(depth);

      if (nodeType === "TEXT") {
        const characters = node.textData?.characters;
        if (typeof characters === "string" && characters.length > 0) {
          lines.push(`${indent}${characters}`);
        }
      } else if (nodeType === "FRAME" || nodeType === "SECTION" || nodeType === "COMPONENT") {
        const name = node.name ?? nodeType;
        lines.push(`${indent}### ${name}`);
      }

      for (const child of safeChildren(node)) {
        walkNode(child, depth + 1);
      }
    }

    for (const child of safeChildren(canvas)) {
      walkNode(child, 0);
    }

    const content = lines.length > 0 ? `${header}\n\n${lines.join("\n")}` : header;
    return {
      index: i + 1,
      label: pageName,
      content,
    };
  });
}

async function convertFigToSvg(filePath: string): Promise<ConvertPage[]> {
  const { parsed, tree, canvases } = await loadFigForConvert(filePath);

  const pages: ConvertPage[] = [];
  for (let i = 0; i < canvases.length; i++) {
    const canvas = canvases[i]!;
    const result = await renderCanvas(canvas, {
      blobs: parsed.blobs,
      images: parsed.images,
      symbolMap: tree.nodeMap,
      normalizeRootTransform: true,
    });
    pages.push({
      index: i + 1,
      label: canvas.name ?? `Page ${i + 1}`,
      content: result.svg,
    });
  }

  return pages;
}

// =============================================================================
// SVG converters
// =============================================================================

async function convertPptxToSvg(filePath: string): Promise<ConvertPage[]> {
  const result = await runPptxPreview(filePath, undefined, { width: 80, format: "svg" });
  if (!result.success) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }

  return result.data.slides.map((slide) => ({
    index: slide.number,
    label: `Slide ${slide.number}`,
    content: slide.svg ?? "",
  }));
}

async function convertXlsxToSvg(filePath: string): Promise<ConvertPage[]> {
  const result = await runXlsxPreview(filePath, undefined, { width: 80, format: "svg" });
  if (!result.success) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }

  return result.data.sheets.map((sheet, i) => ({
    index: i + 1,
    label: sheet.name,
    content: sheet.svg ?? "",
  }));
}

async function convertDocxToSvg(filePath: string): Promise<ConvertPage[]> {
  const result = await runDocxPreview(filePath, undefined, { width: 80, format: "svg" });
  if (!result.success) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }

  return result.data.sections.map((section) => ({
    index: section.number,
    label: `Section ${section.number}`,
    content: section.svg ?? "",
  }));
}

async function convertPdfToSvg(filePath: string): Promise<ConvertPage[]> {
  const data = new Uint8Array(await fs.readFile(filePath));
  const svgs = await renderPdfSourceToSvgs({ data });

  return svgs.map((svg, i) => ({
    index: i + 1,
    label: `Page ${i + 1}`,
    content: svg,
  }));
}

// =============================================================================
// Text (ASCII) converters
// =============================================================================

async function convertPptxToText(filePath: string): Promise<ConvertPage[]> {
  const result = await runPptxPreview(filePath, undefined, { width: 80, format: "ascii" });
  if (!result.success) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }

  return result.data.slides.map((slide) => ({
    index: slide.number,
    label: `Slide ${slide.number}`,
    content: slide.ascii ?? "",
  }));
}

async function convertXlsxToText(filePath: string): Promise<ConvertPage[]> {
  const result = await runXlsxPreview(filePath, undefined, { width: 80, format: "ascii" });
  if (!result.success) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }

  return result.data.sheets.map((sheet, i) => ({
    index: i + 1,
    label: sheet.name,
    content: sheet.ascii ?? "",
  }));
}

async function convertDocxToText(filePath: string): Promise<ConvertPage[]> {
  const result = await runDocxPreview(filePath, undefined, { width: 80, format: "ascii" });
  if (!result.success) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }

  return result.data.sections.map((section) => ({
    index: section.number,
    label: `Section ${section.number}`,
    content: section.ascii ?? "",
  }));
}

// =============================================================================
// PNG converter (SVG → PNG via @resvg/resvg-js)
// =============================================================================

function svgToPngBuffer(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    font: { loadSystemFonts: true },
  });
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}

async function convertToPng(
  filePath: string,
  inputFormat: InputFormat,
): Promise<ConvertPage[]> {
  const svgConverter = getConverter(SVG_CONVERTERS, inputFormat, "png");
  const svgPages = await svgConverter(filePath);

  return svgPages.map((page) => ({
    index: page.index,
    label: page.label,
    content: svgToPngBuffer(page.content as string),
  }));
}

// =============================================================================
// DSV converters (XLSX → CSV/TSV/JSONL, CSV/TSV → XLSX)
// =============================================================================

/**
 * Load and parse an XLSX file from disk.
 */
async function loadXlsx(filePath: string) {
  const buffer = await fs.readFile(filePath);
  const pkg = await loadZipPackage(buffer);
  const getFileContent = async (path: string): Promise<string | undefined> => {
    return pkg.readText(path) ?? undefined;
  };
  return parseXlsxWorkbook(getFileContent);
}

async function convertXlsxToCsv(filePath: string): Promise<ConvertPage[]> {
  const workbook = await loadXlsx(filePath);
  return workbook.sheets.map((sheet, i) => {
    const result = convertXlsxToDsv(workbook, { sheetIndex: i, firstRowAsHeaders: true });
    const content = buildDsv(result.data, { dialect: "csv" });
    return { index: i + 1, label: sheet.name, content };
  });
}

async function convertXlsxToTsv(filePath: string): Promise<ConvertPage[]> {
  const workbook = await loadXlsx(filePath);
  return workbook.sheets.map((sheet, i) => {
    const result = convertXlsxToDsv(workbook, { sheetIndex: i, firstRowAsHeaders: true });
    const content = buildDsv(result.data, { dialect: "tsv" });
    return { index: i + 1, label: sheet.name, content };
  });
}

async function convertXlsxToJsonl(filePath: string): Promise<ConvertPage[]> {
  const workbook = await loadXlsx(filePath);
  return workbook.sheets.map((sheet, i) => {
    const result = convertXlsxToDsv(workbook, { sheetIndex: i, firstRowAsHeaders: true });
    const headers = result.data.headers;
    const objects = result.data.records.map((record) => {
      const obj: Record<string, unknown> = {};
      for (let j = 0; j < record.fields.length; j++) {
        const key = headers?.[j] ?? String(j);
        obj[key] = record.fields[j].value;
      }
      return obj;
    });
    const content = buildJsonl(objects);
    return { index: i + 1, label: sheet.name, content };
  });
}

async function convertDsvToXlsxFile(
  filePath: string,
  dialect: "csv" | "tsv",
): Promise<ConvertPage[]> {
  const text = await fs.readFile(filePath, "utf-8");
  const doc = parseDsv(text, { dialect });
  const result = convertDsvToXlsx(doc);
  const xlsxData = await exportXlsx(result.data);
  return [{ index: 1, label: "Sheet1", content: Buffer.from(xlsxData) }];
}

async function convertCsvToXlsx(filePath: string): Promise<ConvertPage[]> {
  return convertDsvToXlsxFile(filePath, "csv");
}

async function convertTsvToXlsx(filePath: string): Promise<ConvertPage[]> {
  return convertDsvToXlsxFile(filePath, "tsv");
}

// =============================================================================
// Converter registries
// =============================================================================

type PageConverter = (filePath: string) => Promise<ConvertPage[]>;

const MARKDOWN_CONVERTERS: Partial<Record<InputFormat, PageConverter>> = {
  pptx: convertPptxToMarkdown,
  xlsx: convertXlsxToMarkdown,
  docx: convertDocxToMarkdown,
  pdf: convertPdfToMarkdown,
  fig: convertFigToMarkdown,
};

const SVG_CONVERTERS: Partial<Record<InputFormat, PageConverter>> = {
  pptx: convertPptxToSvg,
  xlsx: convertXlsxToSvg,
  docx: convertDocxToSvg,
  pdf: convertPdfToSvg,
  fig: convertFigToSvg,
};

const TEXT_CONVERTERS: Partial<Record<InputFormat, PageConverter>> = {
  pptx: convertPptxToText,
  xlsx: convertXlsxToText,
  docx: convertDocxToText,
};

const CSV_CONVERTERS: Partial<Record<InputFormat, PageConverter>> = {
  xlsx: convertXlsxToCsv,
};

const TSV_CONVERTERS: Partial<Record<InputFormat, PageConverter>> = {
  xlsx: convertXlsxToTsv,
};

const JSONL_CONVERTERS: Partial<Record<InputFormat, PageConverter>> = {
  xlsx: convertXlsxToJsonl,
};

const XLSX_CONVERTERS: Partial<Record<InputFormat, PageConverter>> = {
  csv: convertCsvToXlsx,
  tsv: convertTsvToXlsx,
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Resolve the output format from explicit option, output path extension, or default.
 *
 * Priority:
 * 1. Explicit `outputFormat` (highest)
 * 2. Output file extension from `outputPath`
 * 3. Default: "markdown" (only when no outputPath — backward-compatible stdout behavior)
 */
function resolveOutputFormat(
  explicitFormat: OutputFormat | undefined,
  outputPath: string | undefined,
): OutputFormat {
  if (explicitFormat) {
    return explicitFormat;
  }
  if (outputPath) {
    const inferred = detectOutputFormat(outputPath);
    if (!inferred) {
      const ext = extname(outputPath).toLowerCase();
      const supportedOut = Object.keys(OUTPUT_EXTENSION_MAP).join(", ");
      throw new Error(
        `Cannot infer output format from extension "${ext}". Supported output extensions: ${supportedOut}`,
      );
    }
    return inferred;
  }
  // No output path, no explicit format → stdout markdown (backward-compatible default)
  return "markdown";
}

/**
 * Run the appropriate converter for the given input/output format combination.
 */
/**
 * Look up a converter from a partial registry, throwing if the combination is unsupported.
 * (assertConversionSupported is called before this, so the throw is a TypeScript guard.)
 */
function getConverter(
  registry: Partial<Record<InputFormat, PageConverter>>,
  inputFormat: InputFormat,
  outputFormat: OutputFormat,
): PageConverter {
  const converter = registry[inputFormat];
  if (!converter) {
    throw new Error(`Unsupported conversion: ${inputFormat} → ${outputFormat}`);
  }
  return converter;
}

async function runConverter(
  inputPath: string,
  inputFormat: InputFormat,
  outputFormat: OutputFormat,
): Promise<ConvertPage[]> {
  switch (outputFormat) {
    case "markdown":
      return getConverter(MARKDOWN_CONVERTERS, inputFormat, outputFormat)(inputPath);
    case "svg":
      return getConverter(SVG_CONVERTERS, inputFormat, outputFormat)(inputPath);
    case "text":
      return getConverter(TEXT_CONVERTERS, inputFormat, outputFormat)(inputPath);
    case "png":
      return convertToPng(inputPath, inputFormat);
    case "csv":
      return getConverter(CSV_CONVERTERS, inputFormat, outputFormat)(inputPath);
    case "tsv":
      return getConverter(TSV_CONVERTERS, inputFormat, outputFormat)(inputPath);
    case "jsonl":
      return getConverter(JSONL_CONVERTERS, inputFormat, outputFormat)(inputPath);
    case "xlsx":
      return getConverter(XLSX_CONVERTERS, inputFormat, outputFormat)(inputPath);
  }
}

/**
 * Write conversion results to file(s).
 */
async function writeOutput(
  outputPath: string,
  pages: readonly ConvertPage[],
  outputFormat: OutputFormat,
): Promise<void> {
  const outputPaths = resolveOutputPaths(outputPath, pages.length, outputFormat);

  if (outputPaths.length === 1 && pages.length > 1) {
    // Concatenate pages into a single file (markdown/text only, validated by resolveOutputPaths)
    const concatenated = pages.map((p) => p.content as string).join("\n\n");
    await fs.writeFile(outputPaths[0], concatenated, "utf-8");
  } else {
    await Promise.all(
      outputPaths.map(async (path, i) => {
        const page = pages[i];
        if (Buffer.isBuffer(page.content)) {
          await fs.writeFile(path, page.content);
        } else {
          await fs.writeFile(path, page.content, "utf-8");
        }
      }),
    );
  }
}

/**
 * Convert an Office document to the specified output format.
 *
 * Output format is determined by:
 * 1. Explicit `outputFormat` option (highest priority)
 * 2. Output file extension from `outputPath` (if provided)
 * 3. Default: "markdown" (only when no outputPath)
 *
 * @throws Error if the input format is unsupported
 * @throws Error if the input→output combination is unsupported
 * @throws Error if the output file extension is unrecognized
 * @throws Error if multi-page output is written to a single file without %d placeholder (for SVG/PNG)
 */
export async function convert(
  inputPath: string,
  options: {
    readonly outputPath?: string;
    readonly outputFormat?: OutputFormat;
  } = {},
): Promise<ConvertOutput> {
  const detected = detectInputFormat(inputPath);
  if (!detected) {
    const ext = extname(inputPath).toLowerCase();
    const supported = Object.keys(EXTENSION_MAP).join(", ");
    throw new Error(`Unsupported input format: "${ext}". Supported formats: ${supported}`);
  }

  const outputFormat = resolveOutputFormat(options.outputFormat, options.outputPath);
  assertConversionSupported(detected.format, outputFormat);

  const pages = await runConverter(inputPath, detected.format, outputFormat);

  if (options.outputPath) {
    await writeOutput(options.outputPath, pages, outputFormat);
  }

  return {
    pages,
    inputFormat: detected.format,
    outputFormat,
    isLegacy: detected.legacy,
  };
}

/**
 * Convert an Office document to Markdown.
 *
 * This is a convenience wrapper around `convert()` for backward compatibility.
 *
 * @param inputPath - Path to the input file (.pptx, .ppt, .xlsx, .xls, .docx, .doc, .pdf)
 * @param options - Conversion options (output path, etc.)
 * @returns The conversion result including Markdown string and metadata
 * @throws Error if the file format is unsupported or conversion fails
 */
export async function convertToMarkdown(
  inputPath: string,
  options: ConvertOptions = {},
): Promise<ConvertResult> {
  const result = await convert(inputPath, {
    outputPath: options.outputPath,
    outputFormat: "markdown",
  });

  const markdown = result.pages.map((p) => p.content as string).join("\n\n");

  return {
    markdown,
    format: result.inputFormat,
    isLegacy: result.isLegacy,
  };
}

/**
 * Get the list of supported input file extensions.
 */
export function getSupportedExtensions(): string[] {
  return Object.keys(EXTENSION_MAP);
}

/**
 * Get the list of supported output file extensions.
 */
export function getSupportedOutputExtensions(): string[] {
  return Object.keys(OUTPUT_EXTENSION_MAP);
}

/**
 * Get the supported output formats for a given input format.
 */
export function getSupportedOutputFormats(inputFormat: InputFormat): readonly OutputFormat[] {
  return SUPPORTED_CONVERSIONS[inputFormat];
}
