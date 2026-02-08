/**
 * @file BIFF MERGECELLS record parser
 */

import type { XlsParseContext } from "../../parse-context";
import { warnOrThrow } from "../../parse-context";

export type MergeCellRef = {
  readonly firstRow: number;
  readonly lastRow: number;
  readonly firstCol: number;
  readonly lastCol: number;
};

export type MergeCellsRecord = {
  readonly refs: readonly MergeCellRef[];
};

/** Parse a BIFF MERGECELLS (0x00E5) record payload. */
export function parseMergeCellsRecord(data: Uint8Array, ctx: XlsParseContext = { mode: "strict" }): MergeCellsRecord {
  if (data.length < 2) {
    throw new Error(`Invalid MERGECELLS payload length: ${data.length} (expected >= 2)`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const declaredCount = view.getUint16(0, true);
  const maxCountByLength = Math.floor((data.length - 2) / 8);
  if (declaredCount > maxCountByLength) {
    try {
      throw new Error(`Invalid MERGECELLS payload length: ${data.length} (need ${2 + declaredCount * 8})`);
    } catch (err) {
      warnOrThrow(
        ctx,
        {
          code: "MERGECELLS_COUNT_MISMATCH",
          where: "MERGECELLS",
          message: `MERGECELLS count exceeds available bytes; truncating: declared=${declaredCount}, maxByLength=${maxCountByLength}`,
          meta: { declaredCount, maxCountByLength, dataLength: data.length },
        },
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }
  const count = Math.min(declaredCount, maxCountByLength);

  const refs = Array.from({ length: count }, (_unused, i): MergeCellRef => {
    void _unused;
    const base = 2 + i * 8;
    return {
      firstRow: view.getUint16(base, true),
      lastRow: view.getUint16(base + 2, true),
      firstCol: view.getUint16(base + 4, true),
      lastCol: view.getUint16(base + 6, true),
    };
  });

  return { refs };
}
