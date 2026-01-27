/**
 * @file BIFF MULBLANK record parser
 */

import type { XlsParseContext } from "../../parse-context";
import { warnOrThrow } from "../../parse-context";

export type MulblankRecord = {
  readonly row: number;
  readonly colFirst: number;
  readonly colLast: number;
  readonly xfIndexes: readonly number[];
};

/** Parse a BIFF MULBLANK (0x00BE) record payload. */
export function parseMulblankRecord(data: Uint8Array, ctx: XlsParseContext = { mode: "strict" }): MulblankRecord {
  if (data.length < 8) {
    throw new Error(`Invalid MULBLANK payload length: ${data.length} (expected >= 8)`);
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const row = view.getUint16(0, true);
  const colFirst = view.getUint16(2, true);
  const declaredColLast = view.getUint16(data.length - 2, true);

  const xfBytes = data.length - 6; // row(2) + colFirst(2) + colLast(2)
  if (xfBytes < 2 || xfBytes % 2 !== 0) {
    throw new Error(`Invalid MULBLANK payload length: ${data.length}`);
  }
  const count = xfBytes / 2;
  const colLast = colFirst + count - 1;
  if (declaredColLast !== colLast) {
    try {
      throw new Error(`MULBLANK colLast mismatch: declared=${declaredColLast}, derived=${colLast}`);
    } catch (err) {
      warnOrThrow(
        ctx,
        {
          code: "MULBLANK_COLLAST_MISMATCH",
          where: "MULBLANK",
          message: `MULBLANK colLast mismatch; using payload-derived value: declared=${declaredColLast}, derived=${colLast}`,
          meta: { declaredColLast, derivedColLast: colLast, colFirst, count },
        },
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }

  const xfIndexes = Array.from({ length: count }, (_unused, i) => {
    void _unused;
    return view.getUint16(4 + i * 2, true);
  });

  return { row, colFirst, colLast, xfIndexes };
}
