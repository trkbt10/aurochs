/** @file Piece table parser tests */
import { parsePieceTable } from "./piece-table";

function buildClx(pieces: { cpStart: number; cpEnd: number; fc: number }[]): {
  data: Uint8Array;
  fcClx: number;
  lcbClx: number;
} {
  const n = pieces.length;
  // Pcdt: marker(1) + size(4) + PlcPcd( (n+1)*4 CPs + n*8 PCDs )
  const pcdtPayloadSize = (n + 1) * 4 + n * 8;
  const pcdtSize = 1 + 4 + pcdtPayloadSize;
  const data = new Uint8Array(pcdtSize);
  const view = new DataView(data.buffer);

  // eslint-disable-next-line no-restricted-syntax -- offset tracks write position
  let offset = 0;

  // Pcdt marker
  data[offset] = 0x02;
  offset += 1;

  // Pcdt size
  view.setUint32(offset, pcdtPayloadSize, true);
  offset += 4;

  // CPs
  for (const piece of pieces) {
    view.setInt32(offset, piece.cpStart, true);
    offset += 4;
  }
  // Final CP
  view.setInt32(offset, pieces[pieces.length - 1].cpEnd, true);
  offset += 4;

  // PCDs (8 bytes each: 2 flags + 4 fc + 2 prm)
  for (const piece of pieces) {
    view.setUint16(offset, 0, true); // flags
    offset += 2;
    view.setUint32(offset, piece.fc, true); // fc (with compressed bit if needed)
    offset += 4;
    view.setUint16(offset, 0, true); // prm
    offset += 2;
  }

  return { data, fcClx: 0, lcbClx: pcdtSize };
}

describe("parsePieceTable", () => {
  it("throws when lcbClx is 0", () => {
    expect(() => parsePieceTable(new Uint8Array(10), 0, 0)).toThrow("Clx size is 0");
  });

  it("throws when Clx extends beyond stream", () => {
    expect(() => parsePieceTable(new Uint8Array(10), 5, 20)).toThrow("extends beyond table stream");
  });

  it("parses a single compressed piece", () => {
    const { data, fcClx, lcbClx } = buildClx([
      { cpStart: 0, cpEnd: 10, fc: 0x40000000 | 200 }, // bit 30 set = compressed
    ]);

    const pieces = parsePieceTable(data, fcClx, lcbClx);

    expect(pieces).toHaveLength(1);
    expect(pieces[0].cpStart).toBe(0);
    expect(pieces[0].cpEnd).toBe(10);
    expect(pieces[0].compressed).toBe(true);
    // For compressed: fileOffset = fc(cleared) / 2 = 200 / 2 = 100
    expect(pieces[0].fileOffset).toBe(100);
  });

  it("parses a single Unicode piece", () => {
    const { data, fcClx, lcbClx } = buildClx([
      { cpStart: 0, cpEnd: 5, fc: 300 }, // bit 30 clear = Unicode
    ]);

    const pieces = parsePieceTable(data, fcClx, lcbClx);

    expect(pieces).toHaveLength(1);
    expect(pieces[0].compressed).toBe(false);
    expect(pieces[0].fileOffset).toBe(300);
  });

  it("parses multiple pieces", () => {
    const { data, fcClx, lcbClx } = buildClx([
      { cpStart: 0, cpEnd: 10, fc: 0x40000000 | 100 },
      { cpStart: 10, cpEnd: 20, fc: 500 },
    ]);

    const pieces = parsePieceTable(data, fcClx, lcbClx);

    expect(pieces).toHaveLength(2);
    expect(pieces[0].compressed).toBe(true);
    expect(pieces[1].compressed).toBe(false);
  });
});
