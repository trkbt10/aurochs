/**
 * @file Piece table parser for .doc binary format
 *
 * Reference: [MS-DOC] 2.8.35 – Clx, 2.8.36 – Pcdt, 2.8.37 – PlcPcd
 *
 * The Clx (Complex) structure in the table stream contains:
 * - Optional RgPrc records (grpprl pre-processor, identified by 0x01 marker)
 * - A Pcdt record (identified by 0x02 marker) containing the PlcPcd (piece table)
 *
 * The PlcPcd maps character positions (CPs) to file offsets (FCs) in the
 * WordDocument stream, indicating whether text is stored as compressed (1-byte)
 * or Unicode (2-byte) characters.
 */

/** A single piece descriptor – maps a character range to a file offset. */
export type PieceDescriptor = {
  /** Starting character position */
  readonly cpStart: number;
  /** Ending character position (exclusive) */
  readonly cpEnd: number;
  /** Raw file offset (fc). Bit 30 set = compressed (cp1252). */
  readonly fc: number;
  /** Whether the text is compressed (single-byte cp1252) */
  readonly compressed: boolean;
  /** Byte offset in WordDocument stream where text data starts */
  readonly fileOffset: number;
};

/** Parse the Clx structure to extract piece descriptors from the table stream. */
export function parsePieceTable(tableStream: Uint8Array, fcClx: number, lcbClx: number): readonly PieceDescriptor[] {
  if (lcbClx === 0) {
    throw new Error("Clx size is 0 – no piece table present");
  }

  if (fcClx + lcbClx > tableStream.length) {
    throw new Error(
      `Clx extends beyond table stream: offset ${fcClx} + size ${lcbClx} > stream length ${tableStream.length}`,
    );
  }

  const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);
  // eslint-disable-next-line no-restricted-syntax -- offset is mutated while skipping RgPrc entries
  let offset = fcClx;
  const clxEnd = fcClx + lcbClx;

  // Skip RgPrc entries (marker 0x01)
  while (offset < clxEnd && tableStream[offset] === 0x01) {
    // cbGrpprl is a 2-byte size following the marker
    const cbGrpprl = view.getUint16(offset + 1, true);
    offset += 1 + 2 + cbGrpprl; // marker + size + data
  }

  // Next must be Pcdt (marker 0x02)
  if (offset >= clxEnd || tableStream[offset] !== 0x02) {
    throw new Error(`Expected Pcdt marker (0x02) at offset ${offset}, got 0x${(tableStream[offset] ?? 0).toString(16)}`);
  }
  offset += 1; // skip marker

  // Pcdt size (4 bytes, little-endian)
  const pcdtSize = view.getUint32(offset, true);
  offset += 4;

  // The PlcPcd follows. It consists of:
  //   (n+1) CPs (4 bytes each) + n PCD entries (8 bytes each)
  // where n = number of pieces
  // Total size: (n+1)*4 + n*8 = 4 + 12*n
  // So n = (pcdtSize - 4) / 12
  const n = (pcdtSize - 4) / 12;
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`Invalid PlcPcd: pcdtSize=${pcdtSize} does not yield integer piece count (n=${n})`);
  }

  // Read CPs
  const cps: number[] = [];
  for (let i = 0; i <= n; i++) {
    cps.push(view.getInt32(offset + i * 4, true));
  }

  // Read PCDs (each 8 bytes, starting after CPs)
  const pcdBase = offset + (n + 1) * 4;
  const pieces: PieceDescriptor[] = [];

  for (let i = 0; i < n; i++) {
    const pcdOffset = pcdBase + i * 8;
    // PCD structure: 2 bytes flags (ABCDaaaa) + 4 bytes fc + 2 bytes prm
    // We skip the first 2 bytes (flags not needed for text extraction)
    const rawFc = view.getUint32(pcdOffset + 2, true);

    // Bit 30 indicates compressed (cp1252) text
    const compressed = (rawFc & 0x40000000) !== 0;

    // Clear bit 30 to get actual FC
    const fc = rawFc & ~0x40000000;

    // For compressed text, the actual byte offset is fc / 2
    const fileOffset = compressed ? fc / 2 : fc;

    pieces.push({
      cpStart: cps[i],
      cpEnd: cps[i + 1],
      fc: rawFc,
      compressed,
      fileOffset,
    });
  }

  return pieces;
}
