/**
 * @file write command - write PdfDocument to PDF binary
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { deserializePdfDocumentFromJson } from "@aurochs/pdf";
import { writePdfDocument } from "@aurochs/pdf/writer";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { getErrorCode, getErrorMessage, getErrorPath } from "./error-info";

export type WriteSpec = {
  readonly input: string;
  readonly output: string;
  readonly pdfVersion?: "1.4" | "1.5" | "1.6" | "1.7" | "2.0";
  readonly producer?: string;
};

export type WriteData = {
  readonly inputPath: string;
  readonly outputPath: string;
  readonly pageCount: number;
  readonly fileSize: number;
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

function parseWriteSpec(value: unknown): WriteSpec {
  if (!isRecord(value)) {
    throw new Error("write spec must be an object");
  }

  const pdfVersionRaw = readOptionalString(value, "pdfVersion");
  const validVersions = ["1.4", "1.5", "1.6", "1.7", "2.0"];
  if (pdfVersionRaw !== undefined && !validVersions.includes(pdfVersionRaw)) {
    throw new Error(`"pdfVersion" must be one of: ${validVersions.join(", ")}`);
  }

  return {
    input: readRequiredString(value, "input"),
    output: readRequiredString(value, "output"),
    pdfVersion: pdfVersionRaw as WriteSpec["pdfVersion"],
    producer: readOptionalString(value, "producer"),
  };
}

/**
 * Write PdfDocument JSON to PDF binary.
 *
 * Spec format:
 * {
 *   "input": "./document.json",
 *   "output": "./output.pdf",
 *   "pdfVersion": "1.4",
 *   "producer": "My App"
 * }
 */
export async function runWrite(specPath: string): Promise<Result<WriteData>> {
  try {
    const specText = await fs.readFile(specPath, "utf8");
    const spec = parseWriteSpec(JSON.parse(specText));
    const specDir = path.dirname(specPath);

    const inputPath = path.resolve(specDir, spec.input);
    const outputPath = path.resolve(specDir, spec.output);

    // Load PdfDocument from JSON
    const jsonText = await fs.readFile(inputPath, "utf8");
    const document = deserializePdfDocumentFromJson(jsonText);

    // Export to PDF
    const pdfBytes = writePdfDocument(document, {
      pdfVersion: spec.pdfVersion,
      producer: spec.producer ?? "aurochs-pdf",
    });
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, pdfBytes);

    // Get file size
    const stats = await fs.stat(outputPath);

    return success({
      inputPath,
      outputPath,
      pageCount: document.pages.length,
      fileSize: stats.size,
    });
  } catch (caughtError) {
    if (getErrorCode(caughtError) === "ENOENT") {
      const filePath = getErrorPath(caughtError) ?? specPath;
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    if (caughtError instanceof SyntaxError) {
      return error("INVALID_JSON", `Invalid JSON: ${caughtError.message}`);
    }
    return error("WRITE_ERROR", `Write failed: ${getErrorMessage(caughtError)}`);
  }
}

/**
 * Format file size for display.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format WriteData for pretty output.
 */
export function formatWritePretty(data: WriteData): string {
  const lines = [
    `Input:  ${data.inputPath}`,
    `Output: ${data.outputPath}`,
    `Pages:  ${data.pageCount}`,
    `Size:   ${formatFileSize(data.fileSize)}`,
  ];
  return lines.join("\n");
}
