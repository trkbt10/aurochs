/**
 * @file XLS parser entry point
 */

import { CfbFormatError, openCfb } from "../cfb";
import type { CfbWarning } from "../cfb/warnings";
import { createDefaultStyleSheet } from "../xlsx/domain/style/types";
import type { XlsxWorkbook, XlsxWorksheet } from "../xlsx/domain/workbook";
import type { XlsParseContext, XlsParseMode } from "./parse-context";
import { isStrict, warnOrThrow } from "./parse-context";
import type { XlsWarningSink, XlsWarning } from "./warnings";
import { createXlsWarningCollector } from "./warnings";
import { parseWorkbookStream } from "./biff/workbook-stream";
import { convertXlsToXlsx } from "./converter";
import { extractXlsWorkbook } from "./extractor";

export type ParseXlsOptions = {
  readonly mode?: XlsParseMode;
  readonly onWarning?: XlsWarningSink;
};

export type ParseXlsResult = {
  readonly workbook: XlsxWorkbook;
  readonly warnings: readonly XlsWarning[];
};

function errorToMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

function createFallbackWorkbook(): XlsxWorkbook {
  const dateSystem: XlsxWorkbook["dateSystem"] = "1900";
  const sheet: XlsxWorksheet = {
    dateSystem,
    name: "Sheet1",
    sheetId: 1,
    state: "visible",
    rows: [],
    xmlPath: "xl/worksheets/sheet1.xml",
  };
  return {
    dateSystem,
    sheets: [sheet],
    styles: createDefaultStyleSheet(),
    sharedStrings: [],
  };
}

function createCfbWarningSink(warn?: XlsWarningSink) {
  if (!warn) {
    return undefined;
  }
  return (warning: CfbWarning): void => {
    const base = { where: `CFB:${warning.where}`, message: warning.message, ...(warning.meta ? { meta: warning.meta } : {}) };
    switch (warning.code) {
      case "FAT_CHAIN_INVALID":
        warn({ code: "CFB_FAT_CHAIN_INVALID", ...base });
        break;
      case "FAT_CHAIN_TOO_SHORT":
        warn({ code: "CFB_FAT_CHAIN_TOO_SHORT", ...base });
        break;
      case "FAT_CHAIN_LENGTH_MISMATCH":
        warn({ code: "CFB_FAT_CHAIN_LENGTH_MISMATCH", ...base });
        break;
      case "FAT_SECTOR_READ_FAILED":
        warn({ code: "CFB_FAT_SECTOR_READ_FAILED", ...base });
        break;
      case "MINIFAT_CHAIN_INVALID":
        warn({ code: "CFB_MINIFAT_CHAIN_INVALID", ...base });
        break;
      case "MINIFAT_CHAIN_TOO_SHORT":
        warn({ code: "CFB_MINIFAT_CHAIN_TOO_SHORT", ...base });
        break;
      case "MINIFAT_CHAIN_LENGTH_MISMATCH":
        warn({ code: "CFB_MINIFAT_CHAIN_LENGTH_MISMATCH", ...base });
        break;
      case "MINISTREAM_TRUNCATED":
        warn({ code: "CFB_MINISTREAM_TRUNCATED", ...base });
        break;
    }
  };
}

function createContext(options?: ParseXlsOptions): XlsParseContext {
  return { mode: options?.mode ?? "strict", ...(options?.onWarning ? { warn: options.onWarning } : {}) };
}

function readWorkbookStreamFromCfb(bytes: Uint8Array, ctx: XlsParseContext): Uint8Array {
  const cfbWarningSink = createCfbWarningSink(ctx.warn);

  function tryOpenCfb(strict: boolean) {
    try {
      return openCfb(bytes, { strict, ...(cfbWarningSink ? { onWarning: cfbWarningSink } : {}) });
    } catch (err) {
      if (err instanceof CfbFormatError && /signature/i.test(err.message)) {
        warnOrThrow(
          ctx,
          { code: "XLS_RAW_BIFF_FALLBACK", where: "openCfb", message: "CFB signature missing; treating file as raw BIFF stream." },
          err,
        );
        return undefined;
      }
      throw err;
    }
  }

  const tryRead = (strict: boolean): Uint8Array => {
    const cfb = tryOpenCfb(strict);
    if (!cfb) {
      return bytes;
    }
    try {
      return cfb.readStream(["Workbook"]);
    } catch (err) {
      if (err instanceof CfbFormatError && err.message.includes("Path not found")) {
        return cfb.readStream(["Book"]);
      }
      throw err;
    }
  };

  if (isStrict(ctx)) {
    return tryRead(true);
  }

  try {
    return tryRead(true);
  } catch (err) {
    if (err instanceof CfbFormatError) {
      warnOrThrow(
        ctx,
        { code: "CFB_NON_STRICT_RETRY", where: "openCfb", message: "CFB strict read failed; retrying with non-strict reader.", meta: { error: err.message } },
        err,
      );
      return tryRead(false);
    }
    throw err;
  }
}

/** Parse an XLS file into an `XlsxWorkbook`, collecting warnings for reporting. */
export function parseXlsWithReport(bytes: Uint8Array, options?: Omit<ParseXlsOptions, "onWarning">): ParseXlsResult {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error("parseXlsWithReport: bytes must be a Uint8Array");
  }

  const collector = createXlsWarningCollector();
  const ctx = createContext({ ...(options?.mode ? { mode: options.mode } : {}), onWarning: collector.warn });

  try {
    const workbookStreamBytes = readWorkbookStreamFromCfb(bytes, ctx);
    const parsed = parseWorkbookStream(workbookStreamBytes, ctx);
    const xls = extractXlsWorkbook(parsed);
    const workbook = convertXlsToXlsx(xls, ctx);
    return { workbook, warnings: collector.warnings };
  } catch (err) {
    if (isStrict(ctx)) {
      throw err;
    }

    warnOrThrow(
      ctx,
      {
        code: "XLS_PARSE_FAILED_FALLBACK",
        where: "parseXlsWithReport",
        message: "Failed to parse XLS; returning an empty workbook as fallback.",
        meta: { error: errorToMessage(err) },
      },
      err instanceof Error ? err : new Error(errorToMessage(err)),
    );

    return { workbook: createFallbackWorkbook(), warnings: collector.warnings };
  }
}

/** Parse an XLS file into an `XlsxWorkbook`. In lenient mode, `onWarning` is required. */
export function parseXls(bytes: Uint8Array, options?: ParseXlsOptions): XlsxWorkbook {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error("parseXls: bytes must be a Uint8Array");
  }
  const ctx = createContext(options);
  try {
    const workbookStreamBytes = readWorkbookStreamFromCfb(bytes, ctx);
    const parsed = parseWorkbookStream(workbookStreamBytes, ctx);
    const xls = extractXlsWorkbook(parsed);
    return convertXlsToXlsx(xls, ctx);
  } catch (err) {
    if (isStrict(ctx)) {
      throw err;
    }
    warnOrThrow(
      ctx,
      {
        code: "XLS_PARSE_FAILED_FALLBACK",
        where: "parseXls",
        message: "Failed to parse XLS; returning an empty workbook as fallback.",
        meta: { error: errorToMessage(err) },
      },
      err instanceof Error ? err : new Error(errorToMessage(err)),
    );
    return createFallbackWorkbook();
  }
}
