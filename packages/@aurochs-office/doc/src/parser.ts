/**
 * @file DOC parser entry point
 */

import { openCfb, type CfbWarning } from "@aurochs-office/cfb";
import type { DocParseContext, DocParseMode } from "./parse-context";
import { isStrict } from "./parse-context";
import type { DocWarningSink, DocWarning, DocWarningCode } from "./warnings";
import { createDocWarningCollector } from "./warnings";
import { parseFib } from "./stream/fib";
import { parsePieceTable } from "./stream/piece-table";
import { extractDocDocument } from "./extractor";
import type { DocDocument } from "./domain/types";

export type ParseDocOptions = {
  readonly mode?: DocParseMode;
  readonly onWarning?: DocWarningSink;
};

export type ParseDocResult = {
  readonly document: DocDocument;
  readonly warnings: readonly DocWarning[];
};

function createCfbWarningSink(warn?: DocWarningSink) {
  if (!warn) {
    return undefined;
  }
  return (warning: CfbWarning): void => {
    const base = {
      where: `CFB:${warning.where}`,
      message: warning.message,
      ...(warning.meta ? { meta: warning.meta } : {}),
    };
    const codeMapping: Record<string, DocWarningCode> = {
      FAT_CHAIN_INVALID: "CFB_FAT_CHAIN_INVALID",
      FAT_CHAIN_TOO_SHORT: "CFB_FAT_CHAIN_TOO_SHORT",
      FAT_CHAIN_LENGTH_MISMATCH: "CFB_FAT_CHAIN_LENGTH_MISMATCH",
      FAT_SECTOR_READ_FAILED: "CFB_FAT_SECTOR_READ_FAILED",
      MINIFAT_CHAIN_INVALID: "CFB_MINIFAT_CHAIN_INVALID",
      MINIFAT_CHAIN_TOO_SHORT: "CFB_MINIFAT_CHAIN_TOO_SHORT",
      MINIFAT_CHAIN_LENGTH_MISMATCH: "CFB_MINIFAT_CHAIN_LENGTH_MISMATCH",
      MINISTREAM_TRUNCATED: "CFB_MINISTREAM_TRUNCATED",
    };
    const code = codeMapping[warning.code];
    if (code) {
      warn({ code, ...base });
    }
  };
}

function createContext(options?: ParseDocOptions): DocParseContext {
  return {
    mode: options?.mode ?? "strict",
    ...(options?.onWarning ? { warn: options.onWarning } : {}),
  };
}

function readStreamSafe(cfb: ReturnType<typeof openCfb>, path: string[]): Uint8Array | undefined {
  try {
    return cfb.readStream(path);
  } catch {
    return undefined;
  }
}

function parseDocFromBytes(bytes: Uint8Array, ctx: DocParseContext): DocDocument {
  const cfbWarningSink = createCfbWarningSink(ctx.warn);
  const strict = isStrict(ctx);

  const cfb = openCfb(bytes, { strict, ...(cfbWarningSink ? { onWarning: cfbWarningSink } : {}) });

  // Read WordDocument stream (required)
  const wordDocStream = readStreamSafe(cfb, ["WordDocument"]);
  if (!wordDocStream) {
    throw new Error("WordDocument stream not found in CFB container");
  }

  // Parse FIB
  const fib = parseFib(wordDocStream);

  // Determine table stream name
  const tableStreamName = fib.fWhichTblStm ? "1Table" : "0Table";
  const tableStream = readStreamSafe(cfb, [tableStreamName]);
  if (!tableStream) {
    throw new Error(`Table stream "${tableStreamName}" not found in CFB container`);
  }

  // Parse piece table from Clx
  const pieces = parsePieceTable(tableStream, fib.fcClx, fib.lcbClx);

  // Read Data stream (optional, used for inline images)
  const dataStream = readStreamSafe(cfb, ["Data"]);

  // Extract domain model
  return extractDocDocument({ wordDocStream, tableStream, fib, pieces, ctx, dataStream });
}

/** Parse a DOC file and return the document data with collected warnings. */
export function parseDocWithReport(bytes: Uint8Array, options?: Omit<ParseDocOptions, "onWarning">): ParseDocResult {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error("parseDocWithReport: bytes must be a Uint8Array");
  }

  const collector = createDocWarningCollector();
  const ctx = createContext({
    ...(options?.mode ? { mode: options.mode } : {}),
    onWarning: collector.warn,
  });

  const document = parseDocFromBytes(bytes, ctx);
  return { document, warnings: collector.warnings };
}

/** Parse a DOC file and return the DocDocument domain model. */
export function parseDoc(bytes: Uint8Array, options?: ParseDocOptions): DocDocument {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error("parseDoc: bytes must be a Uint8Array");
  }
  const ctx = createContext(options);
  return parseDocFromBytes(bytes, ctx);
}
