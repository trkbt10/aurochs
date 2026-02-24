/**
 * @file CFF CID charset parser tests.
 */

import { parseCffCidCharset } from "./cff-cid-parser";

function encodeShortInt(value: number): readonly number[] {
  const normalized = Math.trunc(value);
  return [0x1c, (normalized >> 8) & 0xff, normalized & 0xff];
}

function buildStringIndex(strings: readonly string[]): readonly number[] {
  if (strings.length === 0) {
    return [0x00, 0x00];
  }
  const encoded = strings.map((value) => Array.from(value).map((char) => char.charCodeAt(0) & 0xff));
  const offsets = [1];
  for (const item of encoded) {
    offsets.push(offsets[offsets.length - 1]! + item.length);
  }

  if (offsets[offsets.length - 1]! > 0xff) {
    throw new Error("test fixture string index too large for offSize=1");
  }

  const countHi = (strings.length >> 8) & 0xff;
  const countLo = strings.length & 0xff;
  return [
    countHi,
    countLo,
    0x01, // offSize
    ...offsets,
    ...encoded.flat(),
  ];
}

function buildCffWithCharset(args: {
  readonly glyphCount: number;
  readonly charsetBytes: readonly number[];
  readonly ros?: Readonly<{
    registry: string;
    ordering: string;
    supplement: number;
  }>;
}): Uint8Array {
  const { glyphCount, charsetBytes, ros } = args;
  const charStringsOffset = 0x80;
  const charsetOffset = 0xc0;
  const header = [0x01, 0x00, 0x04, 0x04];
  const nameIndex = [0x00, 0x01, 0x01, 0x01, 0x02, 0x41]; // one name: "A"

  const customStrings = ros ? [ros.registry, ros.ordering] : [];
  const stringIndex = buildStringIndex(customStrings);
  const rosTopDict: number[] = [];
  if (ros) {
    rosTopDict.push(
      ...encodeShortInt(391),
      ...encodeShortInt(392),
      ...encodeShortInt(ros.supplement),
      0x0c, 0x1e, // ROS operator
    );
  }

  // Top DICT (single object):
  //  28 <charsetOffset> 15
  //  28 <charStringsOffset> 17
  const topDictData = [
    ...rosTopDict,
    ...encodeShortInt(charsetOffset), 0x0f,
    ...encodeShortInt(charStringsOffset), 0x11,
  ];
  const topDictIndex = [0x00, 0x01, 0x01, 0x01, topDictData.length + 1, ...topDictData];

  const globalSubrIndex = [0x00, 0x00];

  const charStringsOffsets = Array.from({ length: glyphCount + 1 }, (_, i) => i + 1);
  const charStringsData = Array.from({ length: glyphCount }, () => 0x0e); // endchar per glyph
  const charStringsIndex = [
    (glyphCount >> 8) & 0xff,
    glyphCount & 0xff,
    0x01, // offSize
    ...charStringsOffsets,
    ...charStringsData,
  ];

  const bytes = new Uint8Array(charsetOffset + charsetBytes.length + 8);
  const state = { cursor: 0 };
  for (const n of header) { bytes[state.cursor++] = n; }
  for (const n of nameIndex) { bytes[state.cursor++] = n; }
  for (const n of topDictIndex) { bytes[state.cursor++] = n; }
  for (const n of stringIndex) { bytes[state.cursor++] = n; }
  for (const n of globalSubrIndex) { bytes[state.cursor++] = n; }
  if (state.cursor > charStringsOffset) {
    throw new Error("test fixture preamble exceeded charStringsOffset");
  }

  // CharStrings INDEX at configured offset.
  bytes.set(charStringsIndex, charStringsOffset);
  // charset at configured offset.
  bytes.set(charsetBytes, charsetOffset);

  return bytes;
}

describe("parseCffCidCharset", () => {
  it("parses charset format 0", () => {
    const cff = buildCffWithCharset({
      glyphCount: 3,
      charsetBytes: [
        0x00, // format 0
        0x00, 0x64, // GID 1 -> CID 100
        0x00, 0x65, // GID 2 -> CID 101
      ],
    });

    const parsed = parseCffCidCharset(cff);
    expect(parsed).toBeTruthy();
    expect(parsed?.glyphCount).toBe(3);
    expect(parsed?.gidToCid.get(0)).toBe(0);
    expect(parsed?.gidToCid.get(1)).toBe(100);
    expect(parsed?.gidToCid.get(2)).toBe(101);
  });

  it("parses charset format 1", () => {
    const cff = buildCffWithCharset({
      glyphCount: 4,
      charsetBytes: [
        0x01, // format 1
        0x00, 0xc8, 0x01, // first=200, nLeft=1 -> GID1:200, GID2:201
        0x01, 0x2c, 0x00, // first=300, nLeft=0 -> GID3:300
      ],
    });

    const parsed = parseCffCidCharset(cff);
    expect(parsed).toBeTruthy();
    expect(parsed?.glyphCount).toBe(4);
    expect(parsed?.gidToCid.get(1)).toBe(200);
    expect(parsed?.gidToCid.get(2)).toBe(201);
    expect(parsed?.gidToCid.get(3)).toBe(300);
  });

  it("parses charset format 2", () => {
    const cff = buildCffWithCharset({
      glyphCount: 5,
      charsetBytes: [
        0x02, // format 2
        0x01, 0x90, 0x00, 0x01, // first=400, nLeft=1 -> GID1:400, GID2:401
        0x01, 0xf4, 0x00, 0x01, // first=500, nLeft=1 -> GID3:500, GID4:501
      ],
    });

    const parsed = parseCffCidCharset(cff);
    expect(parsed).toBeTruthy();
    expect(parsed?.glyphCount).toBe(5);
    expect(parsed?.gidToCid.get(1)).toBe(400);
    expect(parsed?.gidToCid.get(2)).toBe(401);
    expect(parsed?.gidToCid.get(3)).toBe(500);
    expect(parsed?.gidToCid.get(4)).toBe(501);
  });

  it("returns null for invalid CFF bytes", () => {
    expect(parseCffCidCharset(new Uint8Array([0x00, 0x01, 0x02]))).toBeNull();
  });

  it("extracts ROS ordering from custom string INDEX", () => {
    const cff = buildCffWithCharset({
      glyphCount: 2,
      charsetBytes: [
        0x00, // format 0
        0x01, 0x23, // GID 1 -> CID 291
      ],
      ros: {
        registry: "Adobe",
        ordering: "Japan1",
        supplement: 7,
      },
    });

    const parsed = parseCffCidCharset(cff);
    expect(parsed).toBeTruthy();
    expect(parsed?.ros?.registrySid).toBe(391);
    expect(parsed?.ros?.orderingSid).toBe(392);
    expect(parsed?.ros?.supplement).toBe(7);
    expect(parsed?.ros?.registry).toBe("Adobe");
    expect(parsed?.ros?.ordering).toBe("Japan1");
  });
});
