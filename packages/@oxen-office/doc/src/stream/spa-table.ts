/**
 * @file PlcSpaMom parser for shape anchor positions in .doc format
 *
 * PlcSpaMom is a PLC (Plex) structure containing:
 *   CPs[n+1] (4B each, int32 LE) + FSPAs[n] (26B each)
 *
 * FSPA (File Shape Address) structure (26 bytes):
 *   spid(4B) + xaLeft(4B) + yaTop(4B) + xaRight(4B) + yaBottom(4B) + flags(2B)
 *
 * Flags (2 bytes):
 *   bits 0-3:   wr (text wrapping mode)
 *   bits 4-7:   wrk (wrapping restriction)
 *   bit 8:      fRcaSimple
 *   bit 9:      fBelowText
 *   bit 10:     fAnchorLock
 *   bits 11-14: cTxbx (textbox count)
 *   bit 15:     reserved
 *
 * @see [MS-DOC] 2.8.37 (PlcSpaMom) and 2.9.87 (FSPA)
 */

import type { DocShapeAnchor } from "../domain/types";

/** Size of a single FSPA structure in bytes. */
const FSPA_SIZE = 26;

/**
 * Parse PlcSpaMom from the table stream to extract shape anchor positions.
 *
 * @param tableStream - Table stream bytes
 * @param fc - Offset to PlcSpaMom in the table stream
 * @param lcb - Size of PlcSpaMom in bytes
 * @returns Array of shape anchors with CP positions and bounding rectangles
 */
export function parsePlcSpaMom(
  tableStream: Uint8Array,
  fc: number,
  lcb: number,
): readonly DocShapeAnchor[] {
  if (lcb === 0) return [];

  // PlcSpaMom: CPs[n+1] + FSPAs[n]
  // Total = (n+1)*4 + n*26
  // lcb = 4*(n+1) + 26*n = 4n + 4 + 26n = 30n + 4
  // n = (lcb - 4) / 30
  const n = (lcb - 4) / 30;
  if (n <= 0 || !Number.isInteger(n)) return [];
  if (fc + lcb > tableStream.length) return [];

  const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);
  const cpArrayEnd = fc + (n + 1) * 4;
  const results: DocShapeAnchor[] = [];

  for (let i = 0; i < n; i++) {
    const cp = view.getInt32(fc + i * 4, true);
    const fspaOffset = cpArrayEnd + i * FSPA_SIZE;

    if (fspaOffset + FSPA_SIZE > tableStream.length) break;

    const spid = view.getInt32(fspaOffset, true);
    const xaLeft = view.getInt32(fspaOffset + 4, true);
    const yaTop = view.getInt32(fspaOffset + 8, true);
    const xaRight = view.getInt32(fspaOffset + 12, true);
    const yaBottom = view.getInt32(fspaOffset + 16, true);
    const flags = view.getUint16(fspaOffset + 20, true);

    const wrapping = flags & 0x0f;
    const fBelowText = (flags & 0x0200) !== 0;
    const fAnchorLock = (flags & 0x0400) !== 0;

    results.push({
      cp,
      spid,
      xaLeft,
      yaTop,
      xaRight,
      yaBottom,
      wrapping,
      fBelowText,
      fAnchorLock,
    });
  }

  return results;
}
