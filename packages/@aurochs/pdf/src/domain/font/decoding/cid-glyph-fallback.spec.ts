/**
 * @file CID glyph fallback tests.
 */

import { buildCmapTable } from "../truetype-table-builders";
import {
  buildCidCodeToUnicodeFallbackMap,
  extractGlyphIdToUnicodeFromCmapTable,
  extractGlyphIdToUnicodeFromTrueTypeLikeFont,
} from "./cid-glyph-fallback";

function buildMinimalTrueTypeWithCmap(cmap: Uint8Array): Uint8Array {
  const tableOffset = 12 + 16;
  const totalLength = tableOffset + cmap.length;
  const bytes = new Uint8Array(totalLength);
  const view = new DataView(bytes.buffer);

  // sfnt header
  view.setUint32(0, 0x00010000, false);
  view.setUint16(4, 1, false); // numTables
  view.setUint16(6, 16, false); // searchRange
  view.setUint16(8, 0, false); // entrySelector
  view.setUint16(10, 0, false); // rangeShift

  // table record for "cmap"
  bytes[12] = 0x63; // c
  bytes[13] = 0x6d; // m
  bytes[14] = 0x61; // a
  bytes[15] = 0x70; // p
  view.setUint32(16, 0, false); // checksum
  view.setUint32(20, tableOffset, false);
  view.setUint32(24, cmap.length, false);

  bytes.set(cmap, tableOffset);
  return bytes;
}

describe("cid-glyph-fallback", () => {
  it("extracts glyphId -> Unicode from cmap table bytes", () => {
    const cmap = buildCmapTable(new Map([
      [0x0041, 3],
      [0x3042, 42],
    ]));
    const glyphIdToUnicode = extractGlyphIdToUnicodeFromCmapTable(cmap);

    expect(glyphIdToUnicode.get(3)).toBe("A");
    expect(glyphIdToUnicode.get(42)).toBe("あ");
  });

  it("extracts glyphId -> Unicode from minimal TrueType wrapper", () => {
    const cmap = buildCmapTable(new Map([
      [0x4e00, 512],
      [0x4e8c, 513],
    ]));
    const font = buildMinimalTrueTypeWithCmap(cmap);
    const glyphIdToUnicode = extractGlyphIdToUnicodeFromTrueTypeLikeFont(font);

    expect(glyphIdToUnicode.get(512)).toBe("一");
    expect(glyphIdToUnicode.get(513)).toBe("二");
  });

  it("builds CID fallback map for identity CIDToGIDMap", () => {
    const fallback = buildCidCodeToUnicodeFallbackMap({
      cidToGid: { kind: "identity" },
      glyphIdToUnicode: new Map([
        [10, "十"],
        [11, "日"],
      ]),
    });

    expect(fallback.get(10)).toBe("十");
    expect(fallback.get(11)).toBe("日");
  });

  it("builds CID fallback map for stream CIDToGIDMap", () => {
    // CID 0 -> GID 5, CID 1 -> GID 0 (notdef), CID 2 -> GID 9
    const cidToGidBytes = new Uint8Array([
      0x00, 0x05,
      0x00, 0x00,
      0x00, 0x09,
    ]);
    const fallback = buildCidCodeToUnicodeFallbackMap({
      cidToGid: { kind: "table", bytes: cidToGidBytes },
      glyphIdToUnicode: new Map([
        [5, "法"],
        [9, "令"],
      ]),
    });

    expect(fallback.get(0)).toBe("法");
    expect(fallback.has(1)).toBe(false);
    expect(fallback.get(2)).toBe("令");
  });
});
