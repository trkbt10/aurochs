/**
 * @file BIFF PALETTE record parser
 */

import type { XlsParseContext } from "../../parse-context";
import { warnOrThrow } from "../../parse-context";

export type PaletteRecord = {
  /**
   * Custom palette entries, typically corresponding to indexed color slots 8..63.
   *
   * Values are stored as 8-hex strings (AARRGGBB), output as `FFRRGGBB` (opaque).
   */
  readonly colors: readonly string[];
};

function toArgbFF(rgbRed: number, rgbGreen: number, rgbBlue: number): string {
  const to2 = (n: number): string => (n & 0xff).toString(16).padStart(2, "0").toUpperCase();
  return `FF${to2(rgbRed)}${to2(rgbGreen)}${to2(rgbBlue)}`;
}

/**
 * Parse a BIFF PALETTE (0x0092) record data payload.
 *
 * Record data:
 * - ccv: 2 bytes
 * - rgch: ccv * 4 bytes (rgbRed, rgbGreen, rgbBlue, unused)
 */
export function parsePaletteRecord(data: Uint8Array, ctx: XlsParseContext = { mode: "strict" }): PaletteRecord {
  if (data.length < 2) {
    throw new Error(`Invalid PALETTE payload length: ${data.length} (expected >= 2)`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const declaredCount = view.getUint16(0, true);
  const availableCount = Math.floor((data.length - 2) / 4);
  if (declaredCount > availableCount) {
    try {
      throw new Error(`Invalid PALETTE payload length: ${data.length} (need ${2 + declaredCount * 4})`);
    } catch (err) {
      warnOrThrow(
        ctx,
        {
          code: "PALETTE_COUNT_MISMATCH",
          where: "PALETTE",
          message: `PALETTE ccv exceeds available bytes; truncating: declared=${declaredCount}, available=${availableCount}`,
          meta: { declaredCount, availableCount, dataLength: data.length },
        },
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }
  const ccv = Math.min(declaredCount, availableCount);

  const colors: string[] = [];
  for (let i = 0; i < ccv; i++) {
    const base = 2 + i * 4;
    const r = data[base] ?? 0;
    const g = data[base + 1] ?? 0;
    const b = data[base + 2] ?? 0;
    colors.push(toArgbFF(r, g, b));
  }

  return { colors };
}
