/**
 * @file FIB (File Information Block) parser for .doc binary format
 *
 * Reference: [MS-DOC] 2.5.1 – Fib
 * The FIB is located at offset 0 of the WordDocument stream.
 */

/** Parsed FIB data we need for minimal .doc reading. */
export type Fib = {
  /** Magic number (must be 0xA5EC for Word doc) */
  readonly wIdent: number;
  /** nFib – version number */
  readonly nFib: number;
  /** Which table stream to use: false = "0Table", true = "1Table" */
  readonly fWhichTblStm: boolean;
  /** Character position of the last character of text + 1 */
  readonly ccpText: number;
  /** Character count of footnote text */
  readonly ccpFtn: number;
  /** Character count of header text */
  readonly ccpHdd: number;
  /** Character count of comment text */
  readonly ccpAtn: number;
  /** Offset of Clx in table stream */
  readonly fcClx: number;
  /** Size of Clx in table stream */
  readonly lcbClx: number;
};

/** Parse the FIB from the WordDocument stream. */
export function parseFib(data: Uint8Array): Fib {
  if (data.length < 898) {
    throw new Error(`WordDocument stream too short for FIB: ${data.length} bytes`);
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const wIdent = view.getUint16(0, true);
  if (wIdent !== 0xa5ec) {
    throw new Error(`Invalid DOC magic number: 0x${wIdent.toString(16)} (expected 0xA5EC)`);
  }

  const nFib = view.getUint16(2, true);

  // FibBase.flags at offset 0x0A (2 bytes)
  const flags = view.getUint16(0x0a, true);
  const fWhichTblStm = (flags & 0x0200) !== 0; // bit 9

  // FibRgLw97 starts at offset 0x0060 (after FibBase + padding)
  // ccpText is at FibRgLw97 offset 0x0C (absolute 0x004C)
  const ccpText = view.getInt32(0x004c, true);
  const ccpFtn = view.getInt32(0x0050, true);
  const ccpHdd = view.getInt32(0x0054, true);
  const ccpAtn = view.getInt32(0x005c, true);

  // FibRgFcLcb97 – the Clx entry
  // fcClx is at FibRgFcLcb97 offset 0x01A2 relative to stream start
  const fcClx = view.getUint32(0x01a2, true);
  const lcbClx = view.getUint32(0x01a6, true);

  return { wIdent, nFib, fWhichTblStm, ccpText, ccpFtn, ccpHdd, ccpAtn, fcClx, lcbClx };
}
