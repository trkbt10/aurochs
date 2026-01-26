/**
 * @file BIFF DATEMODE record parser
 */

import type { XlsxDateSystem } from "../../../xlsx/domain/date-system";
import type { XlsParseContext } from "../../parse-context";
import { warnOrThrow } from "../../parse-context";

export type DatemodeRecord = {
  /** Workbook date system (1900/1904) that affects date serial interpretation */
  readonly dateSystem: XlsxDateSystem;
};

/**
 * Parse a BIFF DATEMODE (0x0022) record data payload.
 *
 * - 0: 1900 date system
 * - 1: 1904 date system
 */
export function parseDatemodeRecord(data: Uint8Array, ctx: XlsParseContext = { mode: "strict" }): DatemodeRecord {
  if (data.length !== 2) {
    throw new Error(`Invalid DATEMODE payload length: ${data.length} (expected 2)`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const f1904 = view.getUint16(0, true);
  if (f1904 !== 0 && f1904 !== 1) {
    try {
      throw new Error(`Invalid DATEMODE value: ${f1904} (expected 0 or 1)`);
    } catch (err) {
      warnOrThrow(
        ctx,
        { code: "DATEMODE_NON_BOOLEAN", where: "DATEMODE", message: `DATEMODE has non-boolean value; using bit0 as boolean: ${f1904}`, meta: { f1904 } },
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }
  return { dateSystem: (f1904 & 0x0001) === 1 ? "1904" : "1900" };
}
