/**
 * @file BIFF DATEMODE record parser
 */

import type { XlsxDateSystem } from "../../../xlsx/domain/date-system";

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
export function parseDatemodeRecord(data: Uint8Array): DatemodeRecord {
  if (data.length !== 2) {
    throw new Error(`Invalid DATEMODE payload length: ${data.length} (expected 2)`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const f1904 = view.getUint16(0, true);
  if (f1904 !== 0 && f1904 !== 1) {
    throw new Error(`Invalid DATEMODE value: ${f1904} (expected 0 or 1)`);
  }
  return { dateSystem: f1904 === 1 ? "1904" : "1900" };
}

