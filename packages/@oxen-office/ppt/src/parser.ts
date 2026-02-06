/**
 * @file PPT parser entry point
 */

import { CfbFormatError, openCfb, type CfbWarning } from "@oxen-office/cfb";
import type { ZipPackage } from "@oxen/zip";
import type { PptParseContext, PptParseMode } from "./parse-context";
import { isStrict, warnOrThrow } from "./parse-context";
import type { PptWarningSink, PptWarning } from "./warnings";
import { createPptWarningCollector } from "./warnings";
import { parsePptDocumentStream } from "./stream/ppt-stream";
import { parsePicturesStream } from "./stream/pictures-stream";
import { extractPptPresentation } from "./extractor";
import { convertPptToPptx } from "./converter";
import type { PptPresentation } from "./domain/types";

export type ParsePptOptions = {
  readonly mode?: PptParseMode;
  readonly onWarning?: PptWarningSink;
};

export type ParsePptResult = {
  readonly presentation: PptPresentation;
  readonly pkg: ZipPackage;
  readonly warnings: readonly PptWarning[];
};

function createCfbWarningSink(warn?: PptWarningSink) {
  if (!warn) return undefined;
  return (warning: CfbWarning): void => {
    const base = { where: `CFB:${warning.where}`, message: warning.message, ...(warning.meta ? { meta: warning.meta } : {}) };
    const codeMapping: Record<string, string> = {
      FAT_CHAIN_INVALID: "CFB_FAT_CHAIN_INVALID",
      FAT_CHAIN_TOO_SHORT: "CFB_FAT_CHAIN_TOO_SHORT",
      FAT_CHAIN_LENGTH_MISMATCH: "CFB_FAT_CHAIN_LENGTH_MISMATCH",
      FAT_SECTOR_READ_FAILED: "CFB_FAT_SECTOR_READ_FAILED",
      MINIFAT_CHAIN_INVALID: "CFB_MINIFAT_CHAIN_INVALID",
      MINIFAT_CHAIN_TOO_SHORT: "CFB_MINIFAT_CHAIN_TOO_SHORT",
      MINIFAT_CHAIN_LENGTH_MISMATCH: "CFB_MINIFAT_CHAIN_LENGTH_MISMATCH",
      MINISTREAM_TRUNCATED: "CFB_MINISTREAM_TRUNCATED",
    };
    const code = codeMapping[warning.code] as PptWarning["code"] | undefined;
    if (code) warn({ code, ...base });
  };
}

function createContext(options?: ParsePptOptions): PptParseContext {
  return { mode: options?.mode ?? "strict", ...(options?.onWarning ? { warn: options.onWarning } : {}) };
}

function readStreamSafe(cfb: ReturnType<typeof openCfb>, path: string[]): Uint8Array | undefined {
  try {
    return cfb.readStream(path);
  } catch {
    return undefined;
  }
}

function parsePptFromBytes(bytes: Uint8Array, ctx: PptParseContext): { presentation: PptPresentation; pkg: ZipPackage } {
  const cfbWarningSink = createCfbWarningSink(ctx.warn);
  const strict = isStrict(ctx);

  const cfb = openCfb(bytes, { strict, ...(cfbWarningSink ? { onWarning: cfbWarningSink } : {}) });

  // Read PowerPoint Document stream (required)
  const docStream = readStreamSafe(cfb, ["PowerPoint Document"]);
  if (!docStream) {
    throw new Error("PowerPoint Document stream not found in CFB container");
  }

  // Read Current User stream (optional)
  const currentUserStream = readStreamSafe(cfb, ["Current User"]);

  // Read Pictures stream (optional)
  const picturesStream = readStreamSafe(cfb, ["Pictures"]);

  // Parse the document stream
  const parsed = parsePptDocumentStream(docStream, currentUserStream, ctx);

  // Parse embedded images
  const images = picturesStream ? parsePicturesStream(picturesStream) : [];

  // Extract domain model
  const presentation = extractPptPresentation(parsed, images, ctx);

  // Convert to PPTX
  const { pkg } = convertPptToPptx(presentation, ctx);

  return { presentation, pkg };
}

/** Parse a PPT file and return the PPTX package + presentation data with collected warnings. */
export function parsePptWithReport(bytes: Uint8Array, options?: Omit<ParsePptOptions, "onWarning">): ParsePptResult {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error("parsePptWithReport: bytes must be a Uint8Array");
  }

  const collector = createPptWarningCollector();
  const ctx = createContext({ ...(options?.mode ? { mode: options.mode } : {}), onWarning: collector.warn });

  const { presentation, pkg } = parsePptFromBytes(bytes, ctx);
  return { presentation, pkg, warnings: collector.warnings };
}

/** Parse a PPT file and return the PPTX ZipPackage. */
export function parsePpt(bytes: Uint8Array, options?: ParsePptOptions): ZipPackage {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error("parsePpt: bytes must be a Uint8Array");
  }
  const ctx = createContext(options);
  const { pkg } = parsePptFromBytes(bytes, ctx);
  return pkg;
}
