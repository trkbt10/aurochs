/**
 * @file Unified file-to-Markdown conversion pipeline
 *
 * Converts Office documents (PPTX, XLSX, DOCX, PDF) and their legacy
 * counterparts (PPT, XLS, DOC) to Markdown output. This is the core logic
 * behind the `aurochs -i <file>` interface.
 *
 * ## Architecture
 *
 * Each format has its own conversion path:
 *
 * - **PPTX/PPT**: runPreview → renderSlideMermaid (shapes → markdown/mermaid)
 * - **XLSX/XLS**: runPreview → renderSheetMermaid (rows → markdown table)
 * - **DOCX/DOC**: runPreview → renderDocxMermaid (blocks → markdown)
 * - **PDF**: buildPdf (text extraction) → renderPdfPageMermaid (text items → markdown)
 *
 * Legacy formats (PPT, XLS, DOC) are transparently converted to their modern
 * counterparts by the loaders inside each CLI package.
 */

import { extname } from "node:path";
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

// =============================================================================
// Types
// =============================================================================

/** Supported input format, detected from file extension. */
export type InputFormat = "pptx" | "xlsx" | "docx" | "pdf";

export type ConvertOptions = {
  /** Output file path. If omitted, result is returned as string. */
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
};

function detectFormat(filePath: string): { format: InputFormat; legacy: boolean } | undefined {
  const ext = extname(filePath).toLowerCase();
  return EXTENSION_MAP[ext];
}

// =============================================================================
// PPTX/PPT → Markdown
// =============================================================================

async function convertPptxToMarkdown(filePath: string): Promise<string> {
  // runPreview handles .ppt → .pptx conversion transparently via its loader
  const result = await runPptxPreview(filePath, undefined, { width: 80 });
  if (!result.success) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }

  const sections: string[] = [];
  for (const slide of result.data.slides) {
    const header = `## Slide ${slide.number}`;
    const markdown = renderSlideMermaid({ shapes: slide.shapes, slideNumber: slide.number });
    sections.push(markdown ? `${header}\n\n${markdown}` : header);
  }

  return sections.join("\n\n");
}

// =============================================================================
// XLSX/XLS → Markdown
// =============================================================================

async function convertXlsxToMarkdown(filePath: string): Promise<string> {
  // runPreview handles .xls → .xlsx conversion transparently via its loader
  const result = await runXlsxPreview(filePath, undefined, { width: 80 });
  if (!result.success) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }

  const sections: string[] = [];
  for (const sheet of result.data.sheets) {
    const header = `## ${sheet.name}`;
    const markdown = renderSheetMermaid({
      name: sheet.name,
      rows: sheet.rows,
      columnCount: sheet.colCount,
    });
    sections.push(markdown ? `${header}\n\n${markdown}` : header);
  }

  return sections.join("\n\n");
}

// =============================================================================
// DOCX/DOC → Markdown
// =============================================================================

async function convertDocxToMarkdown(filePath: string): Promise<string> {
  // runPreview handles .doc → .docx conversion transparently via its loader
  const result = await runDocxPreview(filePath, undefined, { width: 80 });
  if (!result.success) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }

  const sections: string[] = [];
  for (const section of result.data.sections) {
    const header = `## Section ${section.number}`;
    const markdown = renderDocxMermaid({ blocks: section.blocks });
    sections.push(markdown ? `${header}\n\n${markdown}` : header);
  }

  return sections.join("\n\n");
}

// =============================================================================
// PDF → Markdown
// =============================================================================

function isTextElement(element: { type: string }): element is PdfText {
  return element.type === "text";
}

async function convertPdfToMarkdown(filePath: string): Promise<string> {
  const data = new Uint8Array(await fs.readFile(filePath));
  const document = await buildPdf({
    data,
    buildOptions: {
      includeText: true,
      includePaths: false,
    },
  });

  const sections: string[] = [];
  for (const page of document.pages) {
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
    sections.push(markdown ? `${header}\n\n${markdown}` : header);
  }

  return sections.join("\n\n");
}

// =============================================================================
// Public API
// =============================================================================

const FORMAT_CONVERTERS: Record<InputFormat, (filePath: string) => Promise<string>> = {
  pptx: convertPptxToMarkdown,
  xlsx: convertXlsxToMarkdown,
  docx: convertDocxToMarkdown,
  pdf: convertPdfToMarkdown,
};

/**
 * Convert an Office document to Markdown.
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
  const detected = detectFormat(inputPath);
  if (!detected) {
    const ext = extname(inputPath).toLowerCase();
    const supported = Object.keys(EXTENSION_MAP).join(", ");
    throw new Error(`Unsupported file format: "${ext}". Supported formats: ${supported}`);
  }

  const converter = FORMAT_CONVERTERS[detected.format];
  const markdown = await converter(inputPath);

  if (options.outputPath) {
    await fs.writeFile(options.outputPath, markdown, "utf-8");
  }

  return {
    markdown,
    format: detected.format,
    isLegacy: detected.legacy,
  };
}

/**
 * Get the list of supported file extensions.
 */
export function getSupportedExtensions(): string[] {
  return Object.keys(EXTENSION_MAP);
}
