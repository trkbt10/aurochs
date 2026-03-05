/**
 * @file XRef Builder Tests
 */

import {
  buildXrefTable,
  buildTrailer,
  buildFooter,
  buildXrefSection,
} from "./xref-builder";
import type { PdfObjectEntry } from "./document/object-tracker";

const decoder = new TextDecoder();
const toText = (bytes: Uint8Array) => decoder.decode(bytes);

describe("buildXrefTable", () => {
  it("builds xref table with free entry 0", () => {
    const entries: PdfObjectEntry[] = [
      { objNum: 1, gen: 0, data: new Uint8Array([]), offset: 15 },
      { objNum: 2, gen: 0, data: new Uint8Array([]), offset: 100 },
    ];

    const result = toText(buildXrefTable(entries, 3));

    expect(result).toContain("xref");
    expect(result).toContain("0 3");
    expect(result).toContain("0000000000 65535 f ");
    expect(result).toContain("0000000015 00000 n ");
    expect(result).toContain("0000000100 00000 n ");
  });

  it("pads offsets to 10 digits", () => {
    const entries: PdfObjectEntry[] = [
      { objNum: 1, gen: 0, data: new Uint8Array([]), offset: 5 },
    ];

    const result = toText(buildXrefTable(entries, 2));

    expect(result).toContain("0000000005 00000 n ");
  });

  it("handles large offsets", () => {
    const entries: PdfObjectEntry[] = [
      { objNum: 1, gen: 0, data: new Uint8Array([]), offset: 1234567890 },
    ];

    const result = toText(buildXrefTable(entries, 2));

    expect(result).toContain("1234567890 00000 n ");
  });
});

describe("buildTrailer", () => {
  it("builds trailer with Size and Root", () => {
    const result = toText(buildTrailer({ size: 5, rootObjNum: 1 }));

    expect(result).toContain("trailer");
    expect(result).toContain("/Size 5");
    expect(result).toContain("/Root 1 0 R");
  });

  it("includes Info if provided", () => {
    const result = toText(buildTrailer({ size: 5, rootObjNum: 1, infoObjNum: 3 }));

    expect(result).toContain("/Info 3 0 R");
  });
});

describe("buildFooter", () => {
  it("builds startxref and %%EOF", () => {
    const result = toText(buildFooter(1000));

    expect(result).toBe("startxref\n1000\n%%EOF\n");
  });
});

describe("buildXrefSection", () => {
  it("combines xref, trailer, and footer", () => {
    const entries: PdfObjectEntry[] = [
      { objNum: 1, gen: 0, data: new Uint8Array([]), offset: 15 },
    ];

    const result = toText(
      buildXrefSection({
        entries,
        size: 2,
        rootObjNum: 1,
        xrefOffset: 500,
      })
    );

    expect(result).toContain("xref");
    expect(result).toContain("trailer");
    expect(result).toContain("startxref");
    expect(result).toContain("500");
    expect(result).toContain("%%EOF");
  });
});
