/**
 * @file BIFF FORMULA record parser
 */

import type { ErrorValue } from "../../../xlsx/domain/cell/types";
import type { XlsParseContext } from "../../parse-context";
import { warnOrThrow } from "../../parse-context";

export type FormulaCachedValue =
  | { readonly type: "number"; readonly value: number }
  | { readonly type: "boolean"; readonly value: boolean }
  | { readonly type: "error"; readonly value: ErrorValue }
  | { readonly type: "empty" }
  | { readonly type: "string" };

export type FormulaRecord = {
  readonly row: number;
  readonly col: number;
  readonly xfIndex: number;
  readonly cached: FormulaCachedValue;
  readonly flags: {
    readonly alwaysCalc: boolean;
    readonly calcOnLoad: boolean;
    readonly isSharedFormula: boolean;
  };
  readonly tokens: Uint8Array;
};

function mapErrorCode(code: number): ErrorValue {
  switch (code) {
    case 0x00:
      return "#NULL!";
    case 0x07:
      return "#DIV/0!";
    case 0x0f:
      return "#VALUE!";
    case 0x17:
      return "#REF!";
    case 0x1d:
      return "#NAME?";
    case 0x24:
      return "#NUM!";
    case 0x2a:
      return "#N/A";
    default:
      throw new Error(`Unknown FORMULA error code: 0x${code.toString(16)}`);
  }
}

function parseCachedValue(numBytes: Uint8Array): FormulaCachedValue {
  if (numBytes.length !== 8) {
    throw new Error(`FORMULA num field must be 8 bytes, got ${numBytes.length}`);
  }
  const view = new DataView(numBytes.buffer, numBytes.byteOffset, numBytes.byteLength);

  // If the formula evaluates to a non-number, bytes 6..7 are 0xFFFF.
  const fExprO = view.getUint16(6, true);
  if (fExprO !== 0xffff) {
    return { type: "number", value: view.getFloat64(0, true) };
  }

  const ot = numBytes[0] ?? 0;
  switch (ot) {
    case 0: // string: value is in following STRING record
      return { type: "string" };
    case 1: { // bool
      const f = numBytes[2] ?? 0;
      return { type: "boolean", value: f !== 0 };
    }
    case 2: { // error
      const err = numBytes[2] ?? 0;
      return { type: "error", value: mapErrorCode(err) };
    }
    case 3: // empty (observed in the wild; treat as blank cached result)
      return { type: "empty" };
    default:
      throw new Error(`Unknown FORMULA num ot: ${ot}`);
  }
}

/**
 * Parse a BIFF FORMULA (0x0006) record data payload.
 */
export function parseFormulaRecord(data: Uint8Array, ctx: XlsParseContext = { mode: "strict" }): FormulaRecord {
  if (data.length < 20) {
    throw new Error(`Invalid FORMULA payload length: ${data.length} (expected >= 20)`);
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const row = view.getUint16(0, true);
  const col = view.getUint16(2, true);
  const xfIndex = view.getUint16(4, true);

  const numBytes = data.subarray(6, 14);
  const cached = parseCachedValue(numBytes);

  const grbit = view.getUint16(14, true);
  // chn is ignored for reads; writers must set 0.
  const tokensStart = 22;
  const declaredCce = data.length >= 22 ? view.getUint16(20, true) : 0;
  const available = Math.max(0, data.length - tokensStart);
  const cce = Math.min(declaredCce, available);
  if (declaredCce > available) {
    try {
      throw new Error(`Invalid FORMULA payload length: ${data.length} (need ${tokensStart + declaredCce})`);
    } catch (err) {
      warnOrThrow(
        ctx,
        {
          code: "FORMULA_CCE_TRUNCATED",
          where: "FORMULA",
          message: `FORMULA cce exceeds available bytes; truncating tokens: declared=${declaredCce}, available=${available}`,
          meta: { declaredCce, available, dataLength: data.length },
        },
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }
  const tokens = data.subarray(tokensStart, tokensStart + cce);

  return {
    row,
    col,
    xfIndex,
    cached,
    flags: {
      alwaysCalc: (grbit & 0x0001) !== 0,
      calcOnLoad: (grbit & 0x0002) !== 0,
      isSharedFormula: (grbit & 0x0008) !== 0,
    },
    tokens,
  };
}
