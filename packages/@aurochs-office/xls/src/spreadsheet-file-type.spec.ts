/**
 * @file Tests for spreadsheet file type detection
 */

import { detectSpreadsheetFileType } from "./spreadsheet-file-type";

describe("detectSpreadsheetFileType", () => {
  it("detects xls by CFB signature", () => {
    const xlsBytes = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]);
    expect(detectSpreadsheetFileType(xlsBytes)).toBe("xls");
  });

  it("detects xlsx by ZIP signature", () => {
    const xlsxBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    expect(detectSpreadsheetFileType(xlsxBytes)).toBe("xlsx");
  });

  it("returns unknown for insufficient bytes", () => {
    expect(detectSpreadsheetFileType(new Uint8Array([]))).toBe("unknown");
    expect(detectSpreadsheetFileType(new Uint8Array([0x50, 0x4b]))).toBe("unknown");
  });

  it("returns unknown for other signatures", () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
    expect(detectSpreadsheetFileType(pdfBytes)).toBe("unknown");
  });
});

