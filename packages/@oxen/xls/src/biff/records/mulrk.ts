/**
 * @file BIFF MULRK record parser
 */

import { decodeRkNumber } from "./rk";
import type { XlsParseContext } from "../../parse-context";
import { warnOrThrow } from "../../parse-context";

export type MulrkCell = {
  readonly xfIndex: number;
  readonly value: number;
};

export type MulrkRecord = {
  readonly row: number;
  readonly colFirst: number;
  readonly colLast: number;
  readonly cells: readonly MulrkCell[];
};

/** Parse a BIFF MULRK (0x00BD) record payload. */
export function parseMulrkRecord(data: Uint8Array, ctx: XlsParseContext = { mode: "strict" }): MulrkRecord {
  // Minimum: row(2) + colFirst(2) + 1 rkrec(6) + colLast(2) = 12
  if (data.length < 12) {
    throw new Error(`Invalid MULRK payload length: ${data.length} (expected >= 12)`);
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const row = view.getUint16(0, true);
  const colFirst = view.getUint16(2, true);
  const declaredColLast = view.getUint16(data.length - 2, true);
  const cellBytes = data.length - 6; // row(2) + colFirst(2) + colLast(2)
  if (cellBytes < 6 || cellBytes % 6 !== 0) {
    throw new Error(`Invalid MULRK payload length: ${data.length}`);
  }
  const count = cellBytes / 6;
  const colLast = colFirst + count - 1;
  if (declaredColLast !== colLast) {
    try {
      throw new Error(`MULRK colLast mismatch: declared=${declaredColLast}, derived=${colLast}`);
    } catch (err) {
      warnOrThrow(
        ctx,
        {
          code: "MULRK_COLLAST_MISMATCH",
          where: "MULRK",
          message: `MULRK colLast mismatch; using payload-derived value: declared=${declaredColLast}, derived=${colLast}`,
          meta: { declaredColLast, derivedColLast: colLast, colFirst, count },
        },
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }

  const cells = Array.from({ length: count }, (_unused, i): MulrkCell => {
    void _unused;
    const base = 4 + i * 6;
    const xfIndex = view.getUint16(base, true);
    const rk = view.getUint32(base + 2, true);
    return { xfIndex, value: decodeRkNumber(rk) };
  });

  return { row, colFirst, colLast, cells };
}
