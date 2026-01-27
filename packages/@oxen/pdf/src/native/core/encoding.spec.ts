/**
 * @file src/pdf/native/encoding.spec.ts
 */

import { decodePdfDocEncoding, decodePdfStringBytes } from "./encoding";
import { createLexer } from "../syntax/lexer";
import { parseObject } from "../syntax/object-parser";

describe("decodePdfStringBytes", () => {
  it("decodes UTF-16BE with BOM", () => {
    const bytes = new Uint8Array([0xfe, 0xff, 0x00, 0x41, 0x00, 0x42]);
    expect(decodePdfStringBytes(bytes)).toBe("AB");
  });

  it("decodes PDFDocEncoding (no BOM)", () => {
    // 0x18 is a PDFDocEncoding-specific mapping (Breve), not Latin-1.
    expect(decodePdfDocEncoding(new Uint8Array([0x18]))).toBe("\u02d8");
    // 0x8d is left double quote in PDFDocEncoding.
    expect(decodePdfStringBytes(new Uint8Array([0x8d]))).toBe("\u201c");
    // Undefined entries fall back to Latin-1 byte value (0x7f DEL).
    expect(decodePdfDocEncoding(new Uint8Array([0x7f]))).toBe("\u007f");
  });
});

describe("object-parser strings", () => {
  it("decodes hex string with UTF-16BE BOM into PdfString.text", () => {
    const pdf = new TextEncoder().encode("<FEFF00410042>");
    const parsed = parseObject({ lex: createLexer(pdf, 0) });
    expect(parsed.value.type).toBe("string");
    if (parsed.value.type === "string") {
      expect(parsed.value.text).toBe("AB");
    }
  });
});
