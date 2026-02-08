/** @file Font table parser tests */
import { parseFontTable, buildFontLookup } from "./font-table";

function buildSttbfFfn(fontNames: string[]): Uint8Array {
  // Build a minimal SttbfFfn structure
  const entries: Uint8Array[] = [];

  for (const name of fontNames) {
    // Build FFN entry
    // Layout: cbFfnM1(1B) + flags(1B) + wWeight(2B) + chs(1B) + ixchSzAlt(1B)
    //         + panose(10B) + fs(24B) = 40 fixed bytes
    //         + name (UTF-16LE null-terminated)
    const nameBytes = new Uint8Array(name.length * 2 + 2); // +2 for null terminator
    for (let i = 0; i < name.length; i++) {
      const code = name.charCodeAt(i);
      nameBytes[i * 2] = code & 0xff;
      nameBytes[i * 2 + 1] = (code >> 8) & 0xff;
    }
    // null terminator already 0

    const ffnSize = 40 + nameBytes.length;
    const ffn = new Uint8Array(ffnSize);
    ffn[0] = ffnSize - 1; // cbFfnM1
    ffn.set(nameBytes, 40);

    // Entry: cbData(2B) + FFN data
    const entry = new Uint8Array(2 + ffn.length);
    const entryView = new DataView(entry.buffer);
    entryView.setUint16(0, ffn.length, true);
    entry.set(ffn, 2);

    entries.push(entry);
  }

  // STTB header: fExtend(2B=0xFFFF) + cData(2B) + cbExtra(2B=0)
  const headerSize = 6;
  const totalEntrySize = entries.reduce((sum, e) => sum + e.length, 0);
  const data = new Uint8Array(headerSize + totalEntrySize);
  const view = new DataView(data.buffer);

  view.setUint16(0, 0xffff, true); // fExtend
  view.setUint16(2, fontNames.length, true); // cData
  view.setUint16(4, 0, true); // cbExtra

  // eslint-disable-next-line no-restricted-syntax
  let offset = headerSize;
  for (const entry of entries) {
    data.set(entry, offset);
    offset += entry.length;
  }

  return data;
}

describe("parseFontTable", () => {
  it("returns empty for lcb=0", () => {
    expect(parseFontTable(new Uint8Array(10), 0, 0)).toEqual([]);
  });

  it("throws for out-of-bounds data", () => {
    expect(() => parseFontTable(new Uint8Array(10), 5, 20)).toThrow("extends beyond");
  });

  it("parses a single font", () => {
    const data = buildSttbfFfn(["Arial"]);
    const fonts = parseFontTable(data, 0, data.length);
    expect(fonts).toHaveLength(1);
    expect(fonts[0].index).toBe(0);
    expect(fonts[0].name).toBe("Arial");
  });

  it("parses multiple fonts", () => {
    const data = buildSttbfFfn(["Times New Roman", "Arial", "Calibri"]);
    const fonts = parseFontTable(data, 0, data.length);
    expect(fonts).toHaveLength(3);
    expect(fonts[0].name).toBe("Times New Roman");
    expect(fonts[1].name).toBe("Arial");
    expect(fonts[2].name).toBe("Calibri");
  });

  it("returns empty for non-extended STTB", () => {
    const data = new Uint8Array(10);
    const view = new DataView(data.buffer);
    view.setUint16(0, 0x0000, true); // Not 0xFFFF
    expect(parseFontTable(data, 0, data.length)).toEqual([]);
  });
});

describe("buildFontLookup", () => {
  it("builds index→name map", () => {
    const fonts = [
      { index: 0, name: "Arial" },
      { index: 1, name: "Times New Roman" },
      { index: 2, name: "Calibri" },
    ];
    const lookup = buildFontLookup(fonts);
    expect(lookup.get(0)).toBe("Arial");
    expect(lookup.get(1)).toBe("Times New Roman");
    expect(lookup.get(2)).toBe("Calibri");
    expect(lookup.get(99)).toBeUndefined();
  });
});
