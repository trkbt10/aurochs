/**
 * @file STYLE record parser tests
 */

import { parseStyleRecord } from "./style";
import { createXlsWarningCollector } from "../../warnings";

describe("xls/biff/records/style", () => {
  it("parses built-in style record", () => {
    const data = new Uint8Array(4);
    const view = new DataView(data.buffer);
    view.setUint16(0, 0x8000 | 0x0003, true); // built-in + ixfe=3
    data[2] = 0x00; // Normal
    data[3] = 0x00;
    expect(parseStyleRecord(data)).toEqual({
      kind: "builtIn",
      styleXfIndex: 3,
      builtInStyleId: 0,
      outlineLevel: 0,
    });
  });

  it("parses user-defined style record", () => {
    const name = "Test";
    const data = new Uint8Array(4 + name.length);
    const view = new DataView(data.buffer);
    view.setUint16(0, 0x0005, true); // ixfe=5
    data[2] = name.length;
    data[3] = 0x00; // grbit: compressed
    data.set(Array.from(name).map((c) => c.charCodeAt(0)), 4);
    expect(parseStyleRecord(data)).toEqual({ kind: "userDefined", styleXfIndex: 5, name: "Test" });
  });

  it("falls back to BIFF5/7-style 8-bit names when unicode parsing fails", () => {
    const name = "Test";
    const data = new Uint8Array(3 + name.length);
    const view = new DataView(data.buffer);
    view.setUint16(0, 0x0005, true); // ixfe=5
    data[2] = name.length;
    data.set(Array.from(name).map((c) => c.charCodeAt(0)), 3); // no grbit byte
    const collector = createXlsWarningCollector();
    expect(parseStyleRecord(data, { mode: "lenient", warn: collector.warn })).toEqual({ kind: "userDefined", styleXfIndex: 5, name: "Test" });
    expect(collector.warnings.map((w) => w.code)).toContain("STYLE_NAME_FALLBACK_LEGACY");
  });

  it("tolerates trailing padding bytes after a user-defined style name", () => {
    const name = "Test";
    const data = new Uint8Array(4 + name.length + 1);
    const view = new DataView(data.buffer);
    view.setUint16(0, 0x0005, true); // ixfe=5
    data[2] = name.length;
    data[3] = 0x00; // grbit: compressed
    data.set(Array.from(name).map((c) => c.charCodeAt(0)), 4);
    data[data.length - 1] = 0x00; // padding
    expect(parseStyleRecord(data)).toEqual({ kind: "userDefined", styleXfIndex: 5, name: "Test" });
  });
});
