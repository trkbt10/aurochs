/**
 * @file BOUNDSHEET record parser tests
 */

import { parseBoundsheetRecord } from "./boundsheet";
import { createXlsWarningCollector } from "../../warnings";

function encodeShortUnicodeString(text: string, highByte: boolean): { cch: number; bytes: Uint8Array } {
  const cch = text.length;
  if (highByte) {
    const bytes = new Uint8Array(1 + cch * 2);
    bytes[0] = 0x01; // fHighByte
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < cch; i++) {
      view.setUint16(1 + i * 2, text.charCodeAt(i), true);
    }
    return { cch, bytes };
  }

  const bytes = new Uint8Array(1 + cch);
  bytes[0] = 0x00; // compressed
  for (let i = 0; i < cch; i++) {
    const codeUnit = text.charCodeAt(i);
    if (codeUnit > 0xff) {
      throw new Error(`encodeShortUnicodeString: non-ASCII code unit 0x${codeUnit.toString(16)}`);
    }
    bytes[1 + i] = codeUnit;
  }
  return { cch, bytes };
}

describe("xls/biff/records/boundsheet", () => {
  it("parses a visible worksheet boundsheet with ASCII name (compressed)", () => {
    const name = "Sheet1";
    const cch = name.length;
    const nameBytes = new Uint8Array([0x00, ...Array.from(name).map((c) => c.charCodeAt(0))]);

    const data = new Uint8Array(7 + nameBytes.length);
    const view = new DataView(data.buffer);
    view.setUint32(0, 0x11223344, true); // lbPlyPos
    view.setUint16(4, 0x0000, true); // hsState=visible, dt=worksheet
    data[6] = cch;
    data.set(nameBytes, 7);

    const record = parseBoundsheetRecord(data);
    expect(record.streamPosition).toBe(0x11223344);
    expect(record.hiddenState).toBe("visible");
    expect(record.sheetType).toBe("worksheet");
    expect(record.sheetName).toBe("Sheet1");
  });

  it("parses a worksheet boundsheet with a Japanese name (uncompressed)", () => {
    const name = "日本語";
    const encoded = encodeShortUnicodeString(name, true);

    const data = new Uint8Array(7 + encoded.bytes.length);
    const view = new DataView(data.buffer);
    view.setUint32(0, 0, true);
    view.setUint16(4, 0x0000, true);
    data[6] = encoded.cch;
    data.set(encoded.bytes, 7);

    const record = parseBoundsheetRecord(data);
    expect(record.sheetType).toBe("worksheet");
    expect(record.sheetName).toBe(name);
  });

  it("parses a boundsheet with a 31-character name", () => {
    const name = "A".repeat(31);
    const encoded = encodeShortUnicodeString(name, false);

    const data = new Uint8Array(7 + encoded.bytes.length);
    const view = new DataView(data.buffer);
    view.setUint32(0, 0, true);
    view.setUint16(4, 0x0000, true);
    data[6] = encoded.cch;
    data.set(encoded.bytes, 7);

    const record = parseBoundsheetRecord(data);
    expect(record.sheetName).toBe(name);
  });

  it("parses a boundsheet with special characters in the name", () => {
    const name = "A&B<>\"";
    const encoded = encodeShortUnicodeString(name, false);

    const data = new Uint8Array(7 + encoded.bytes.length);
    const view = new DataView(data.buffer);
    view.setUint32(0, 0, true);
    view.setUint16(4, 0x0000, true);
    data[6] = encoded.cch;
    data.set(encoded.bytes, 7);

    const record = parseBoundsheetRecord(data);
    expect(record.sheetName).toBe(name);
  });

  it("parses hidden state and sheet type from grbit", () => {
    const nameBytes = new Uint8Array([0x00, 0x41]); // "A"
    const data = new Uint8Array(7 + nameBytes.length);
    const view = new DataView(data.buffer);
    view.setUint32(0, 0, true);
    // hsState=1 (hidden), dt=2 (chart)
    view.setUint16(4, (0x02 << 8) | 0x01, true);
    data[6] = 1;
    data.set(nameBytes, 7);

    const record = parseBoundsheetRecord(data);
    expect(record.hiddenState).toBe("hidden");
    expect(record.sheetType).toBe("chart");
    expect(record.sheetName).toBe("A");
  });

  it("parses veryHidden and vbModule boundsheet types", () => {
    const nameBytes = new Uint8Array([0x00, 0x41]); // "A"
    const data = new Uint8Array(7 + nameBytes.length);
    const view = new DataView(data.buffer);
    view.setUint32(0, 0, true);
    // hsState=2 (veryHidden), dt=6 (vbModule)
    view.setUint16(4, (0x06 << 8) | 0x02, true);
    data[6] = 1;
    data.set(nameBytes, 7);

    const record = parseBoundsheetRecord(data);
    expect(record.hiddenState).toBe("veryHidden");
    expect(record.sheetType).toBe("vbModule");
  });

  it("falls back to BIFF7-style sheet name when unicode parsing fails", () => {
    const name = "Sheet";
    const nameBytes = new Uint8Array([...Array.from(name).map((c) => c.charCodeAt(0))]); // no grbit byte

    const data = new Uint8Array(7 + nameBytes.length);
    const view = new DataView(data.buffer);
    view.setUint32(0, 0, true);
    view.setUint16(4, 0x0000, true);
    data[6] = name.length;
    data.set(nameBytes, 7);

    const collector = createXlsWarningCollector();
    const record = parseBoundsheetRecord(data, { mode: "lenient", warn: collector.warn });
    expect(record.sheetName).toBe(name);
    expect(collector.warnings.map((w) => w.code)).toContain("BOUNDSHEET_NAME_FALLBACK_LEGACY");
  });

  it("throws on too-short payload", () => {
    expect(() => parseBoundsheetRecord(new Uint8Array(6))).toThrow(/too short/);
  });

  it("warns and defaults unknown sheet type in lenient mode", () => {
    const nameBytes = new Uint8Array([0x00, 0x41]); // "A"
    const data = new Uint8Array(7 + nameBytes.length);
    const view = new DataView(data.buffer);
    view.setUint32(0, 0, true);
    // hsState=visible, dt=unknown
    view.setUint16(4, (0xff << 8) | 0x00, true);
    data[6] = 1;
    data.set(nameBytes, 7);

    const collector = createXlsWarningCollector();
    const record = parseBoundsheetRecord(data, { mode: "lenient", warn: collector.warn });
    expect(record.sheetType).toBe("worksheet");
    expect(collector.warnings.map((w) => w.code)).toContain("BOUNDSHEET_UNKNOWN_TYPE");
  });

  it("throws on unknown sheet type in strict mode", () => {
    const nameBytes = new Uint8Array([0x00, 0x41]); // "A"
    const data = new Uint8Array(7 + nameBytes.length);
    const view = new DataView(data.buffer);
    view.setUint32(0, 0, true);
    view.setUint16(4, (0xff << 8) | 0x00, true);
    data[6] = 1;
    data.set(nameBytes, 7);
    expect(() => parseBoundsheetRecord(data, { mode: "strict" })).toThrow(/Unknown BOUNDSHEET type/);
  });

  it("warns and defaults unknown hidden state in lenient mode", () => {
    const nameBytes = new Uint8Array([0x00, 0x41]); // "A"
    const data = new Uint8Array(7 + nameBytes.length);
    const view = new DataView(data.buffer);
    view.setUint32(0, 0, true);
    // hsState=unknown, dt=worksheet
    view.setUint16(4, (0x00 << 8) | 0x03, true);
    data[6] = 1;
    data.set(nameBytes, 7);

    const collector = createXlsWarningCollector();
    const record = parseBoundsheetRecord(data, { mode: "lenient", warn: collector.warn });
    expect(record.hiddenState).toBe("visible");
    expect(collector.warnings.map((w) => w.code)).toContain("BOUNDSHEET_UNKNOWN_HIDDEN_STATE");
  });

  it("throws on unknown hidden state in strict mode", () => {
    const nameBytes = new Uint8Array([0x00, 0x41]); // "A"
    const data = new Uint8Array(7 + nameBytes.length);
    const view = new DataView(data.buffer);
    view.setUint32(0, 0, true);
    view.setUint16(4, (0x00 << 8) | 0x03, true);
    data[6] = 1;
    data.set(nameBytes, 7);
    expect(() => parseBoundsheetRecord(data, { mode: "strict" })).toThrow(/Unknown BOUNDSHEET hidden state/);
  });
});
