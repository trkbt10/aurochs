/**
 * @file BIFF8 BOUNDSHEET record parser
 */

import { parseShortUnicodeString } from "../strings/short-unicode-string";
import type { XlsParseContext } from "../../parse-context";
import { warnOrThrow } from "../../parse-context";

export type BoundsheetType =
  | "worksheet" // 0x00
  | "macroSheet" // 0x01
  | "chart" // 0x02
  | "vbModule"; // 0x06

export type BoundsheetHiddenState =
  | "visible" // 0x00
  | "hidden" // 0x01
  | "veryHidden"; // 0x02

export type BoundsheetRecord = {
  readonly streamPosition: number;
  readonly sheetType: BoundsheetType;
  readonly hiddenState: BoundsheetHiddenState;
  readonly sheetName: string;
};

function mapSheetType(dt: number): BoundsheetType {
  switch (dt) {
    case 0x00:
      return "worksheet";
    case 0x01:
      return "macroSheet";
    case 0x02:
      return "chart";
    case 0x06:
      return "vbModule";
    default:
      throw new Error(`Unknown BOUNDSHEET type: 0x${dt.toString(16)}`);
  }
}

function mapHiddenState(hsState: number): BoundsheetHiddenState {
  switch (hsState) {
    case 0x00:
      return "visible";
    case 0x01:
      return "hidden";
    case 0x02:
      return "veryHidden";
    default:
      throw new Error(`Unknown BOUNDSHEET hidden state: 0x${hsState.toString(16)}`);
  }
}

function resolveSheetType(dt: number, ctx: XlsParseContext): BoundsheetType {
  try {
    return mapSheetType(dt);
  } catch (err) {
    warnOrThrow(
      ctx,
      { code: "BOUNDSHEET_UNKNOWN_TYPE", where: "BOUNDSHEET", message: `Unknown BOUNDSHEET type; defaulting to worksheet: 0x${dt.toString(16)}`, meta: { dt } },
      err instanceof Error ? err : new Error(String(err)),
    );
    return "worksheet";
  }
}

function resolveHiddenState(hsState: number, ctx: XlsParseContext): BoundsheetHiddenState {
  try {
    return mapHiddenState(hsState);
  } catch (err) {
    warnOrThrow(
      ctx,
      {
        code: "BOUNDSHEET_UNKNOWN_HIDDEN_STATE",
        where: "BOUNDSHEET",
        message: `Unknown BOUNDSHEET hidden state; defaulting to visible: 0x${hsState.toString(16)}`,
        meta: { hsState },
      },
      err instanceof Error ? err : new Error(String(err)),
    );
    return "visible";
  }
}

/**
 * Parse a BIFF8 BOUNDSHEET (0x0085) record data payload.
 */
export function parseBoundsheetRecord(data: Uint8Array, ctx: XlsParseContext = { mode: "strict" }): BoundsheetRecord {
  if (data.length < 7) {
    throw new Error(`BOUNDSHEET payload is too short: ${data.length}`);
  }

  const decodeLegacySheetName = (bytes: Uint8Array): string => new TextDecoder("latin1").decode(bytes);

  function parseSheetName(namePayload: Uint8Array, cch: number): string {
    try {
      return parseShortUnicodeString(namePayload, cch).text;
    } catch (err) {
      warnOrThrow(
        ctx,
        {
          code: "BOUNDSHEET_NAME_FALLBACK_LEGACY",
          where: "BOUNDSHEET",
          message: "Failed to parse BIFF8 short unicode sheet name; falling back to legacy 8-bit name decoding.",
          meta: { cch, payloadLength: namePayload.length },
        },
        err instanceof Error ? err : new Error(String(err)),
      );
      // BIFF7 stores the sheet name as an 8-bit string (no unicode flags byte).
      const byteLen = Math.min(cch, namePayload.length);
      return decodeLegacySheetName(namePayload.subarray(0, byteLen));
    }
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const streamPosition = view.getUint32(0, true);
  const grbit = view.getUint16(4, true);

  const hsState = grbit & 0x0003;
  const dt = (grbit >> 8) & 0xff;

  const cch = data[6];
  const namePayload = data.subarray(7);
  const sheetName = parseSheetName(namePayload, cch);

  return {
    streamPosition,
    sheetType: resolveSheetType(dt, ctx),
    hiddenState: resolveHiddenState(hsState, ctx),
    sheetName,
  };
}
