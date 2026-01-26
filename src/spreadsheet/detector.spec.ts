/**
 * @file Tests for spreadsheet file type detection
 */

import { detectSpreadsheetFileType } from "./detector";
import { CFB_SIGNATURE } from "../cfb/constants";

describe("detectSpreadsheetFileType", () => {
  describe("XLS detection (CFB signature)", () => {
    it("detects XLS from CFB signature", () => {
      const xlsBytes = new Uint8Array([
        ...CFB_SIGNATURE,
        0x00, 0x00, 0x00, 0x00, // some padding
      ]);
      expect(detectSpreadsheetFileType(xlsBytes)).toBe("xls");
    });

    it("detects XLS with exact signature length", () => {
      const xlsBytes = new Uint8Array(CFB_SIGNATURE);
      expect(detectSpreadsheetFileType(xlsBytes)).toBe("xls");
    });
  });

  describe("XLSX detection (ZIP signature)", () => {
    it("detects XLSX from ZIP signature", () => {
      const xlsxBytes = new Uint8Array([
        0x50, 0x4b, 0x03, 0x04, // ZIP signature
        0x00, 0x00, 0x00, 0x00, // some padding
      ]);
      expect(detectSpreadsheetFileType(xlsxBytes)).toBe("xlsx");
    });

    it("detects XLSX with exact signature length", () => {
      const xlsxBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      expect(detectSpreadsheetFileType(xlsxBytes)).toBe("xlsx");
    });
  });

  describe("unknown file type", () => {
    it("returns unknown for empty bytes", () => {
      expect(detectSpreadsheetFileType(new Uint8Array([]))).toBe("unknown");
    });

    it("returns unknown for bytes shorter than signature", () => {
      expect(detectSpreadsheetFileType(new Uint8Array([0x50, 0x4b]))).toBe("unknown");
    });

    it("returns unknown for unrecognized signature", () => {
      const unknownBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
      expect(detectSpreadsheetFileType(unknownBytes)).toBe("unknown");
    });

    it("returns unknown for PDF-like signature", () => {
      // %PDF
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
      expect(detectSpreadsheetFileType(pdfBytes)).toBe("unknown");
    });
  });

  describe("priority", () => {
    it("CFB signature takes priority over partial ZIP match", () => {
      // Full CFB signature
      const xlsBytes = new Uint8Array(CFB_SIGNATURE);
      expect(detectSpreadsheetFileType(xlsBytes)).toBe("xls");
    });
  });
});
