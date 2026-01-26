/**
 * @file BIFF BOOLERR record parser
 */

import type { ErrorValue } from "../../../xlsx/domain/cell/types";

export type BoolerrValue =
  | { readonly type: "boolean"; readonly value: boolean }
  | { readonly type: "error"; readonly value: ErrorValue };

export type BoolerrRecord = {
  readonly row: number;
  readonly col: number;
  readonly xfIndex: number;
  readonly value: BoolerrValue;
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
      throw new Error(`Unknown BOOLERR error code: 0x${code.toString(16)}`);
  }
}

/** Parse a BIFF BOOLERR (0x0205) record payload. */
export function parseBoolerrRecord(data: Uint8Array): BoolerrRecord {
  if (data.length < 8) {
    throw new Error(`Invalid BOOLERR payload length: ${data.length} (expected >= 8)`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const row = view.getUint16(0, true);
  const col = view.getUint16(2, true);
  const xfIndex = view.getUint16(4, true);
  const bBoolErr = data[6] ?? 0;
  const fError = data[7] ?? 0;
  if (fError !== 0 && fError !== 1) {
    throw new Error(`Invalid BOOLERR fError: ${fError} (expected 0 or 1)`);
  }

  if (fError === 0) {
    return { row, col, xfIndex, value: { type: "boolean", value: bBoolErr !== 0 } };
  }
  return { row, col, xfIndex, value: { type: "error", value: mapErrorCode(bBoolErr) } };
}
