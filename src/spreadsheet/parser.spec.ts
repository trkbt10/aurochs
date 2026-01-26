/**
 * @file Tests for unified spreadsheet parser
 */

import { parseSpreadsheetFile, SpreadsheetParseError } from "./parser";
import { CFB_SIGNATURE } from "../cfb/constants";

describe("parseSpreadsheetFile", () => {
  describe("error handling", () => {
    it("throws SpreadsheetParseError for unknown file type", async () => {
      const unknownBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);

      await expect(parseSpreadsheetFile(unknownBytes)).rejects.toThrow(SpreadsheetParseError);
      await expect(parseSpreadsheetFile(unknownBytes)).rejects.toThrow(
        "Unknown file format. Expected XLS or XLSX file.",
      );
    });

    it("throws SpreadsheetParseError with fileType for unknown", async () => {
      const unknownBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);

      try {
        await parseSpreadsheetFile(unknownBytes);
        throw new Error("Expected error to be thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(SpreadsheetParseError);
        const err = e as SpreadsheetParseError;
        expect(err.fileType).toBe("unknown");
      }
    });

    it("returns a workbook for invalid XLS content by default (lenient)", async () => {
      // Valid CFB signature but invalid content
      const invalidXls = new Uint8Array([
        ...CFB_SIGNATURE,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);

      const workbook = await parseSpreadsheetFile(invalidXls);
      expect(workbook.sheets.length).toBeGreaterThan(0);
    });

    it("throws SpreadsheetParseError for invalid XLS content in strict mode", async () => {
      // Valid CFB signature but invalid content
      const invalidXls = new Uint8Array([
        ...CFB_SIGNATURE,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);

      await expect(parseSpreadsheetFile(invalidXls, { mode: "strict" })).rejects.toThrow(SpreadsheetParseError);

      try {
        await parseSpreadsheetFile(invalidXls, { mode: "strict" });
        throw new Error("Expected error to be thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(SpreadsheetParseError);
        const err = e as SpreadsheetParseError;
        expect(err.fileType).toBe("xls");
        expect(err.cause).toBeDefined();
      }
    });

    it("throws SpreadsheetParseError for invalid XLSX content", async () => {
      // Valid ZIP signature but not a valid XLSX
      const invalidXlsx = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);

      await expect(parseSpreadsheetFile(invalidXlsx)).rejects.toThrow(SpreadsheetParseError);

      try {
        await parseSpreadsheetFile(invalidXlsx);
        throw new Error("Expected error to be thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(SpreadsheetParseError);
        const err = e as SpreadsheetParseError;
        expect(err.fileType).toBe("xlsx");
        expect(err.cause).toBeDefined();
      }
    });
  });

  describe("forceType option", () => {
    it("respects forceType option for XLS", async () => {
      // Content that looks like XLSX but force as XLS
      const xlsxBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);

      await expect(parseSpreadsheetFile(xlsxBytes, { forceType: "xls", mode: "strict" })).rejects.toThrow(SpreadsheetParseError);

      try {
        await parseSpreadsheetFile(xlsxBytes, { forceType: "xls", mode: "strict" });
        throw new Error("Expected error to be thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(SpreadsheetParseError);
        const err = e as SpreadsheetParseError;
        expect(err.fileType).toBe("xls");
      }
    });

    it("respects forceType option for XLSX", async () => {
      // Content that looks like XLS but force as XLSX
      const xlsBytes = new Uint8Array([
        ...CFB_SIGNATURE,
        0x00, 0x00, 0x00, 0x00,
      ]);

      try {
        await parseSpreadsheetFile(xlsBytes, { forceType: "xlsx" });
        throw new Error("Expected error to be thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(SpreadsheetParseError);
        const err = e as SpreadsheetParseError;
        expect(err.fileType).toBe("xlsx");
      }
    });

    it("forceType unknown throws error", async () => {
      const validXlsx = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

      await expect(parseSpreadsheetFile(validXlsx, { forceType: "unknown" })).rejects.toThrow(
        "Unknown file format. Expected XLS or XLSX file.",
      );
    });
  });

  describe("input types", () => {
    it("accepts Uint8Array", async () => {
      const unknownBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      await expect(parseSpreadsheetFile(unknownBytes)).rejects.toThrow(SpreadsheetParseError);
    });

    it("accepts ArrayBuffer", async () => {
      const buffer = new ArrayBuffer(8);
      await expect(parseSpreadsheetFile(buffer)).rejects.toThrow(SpreadsheetParseError);
    });
  });
});

describe("SpreadsheetParseError", () => {
  it("has correct name", () => {
    const error = new SpreadsheetParseError("test", "xls");
    expect(error.name).toBe("SpreadsheetParseError");
  });

  it("stores fileType", () => {
    const error = new SpreadsheetParseError("test", "xlsx");
    expect(error.fileType).toBe("xlsx");
  });

  it("stores cause", () => {
    const cause = new Error("original error");
    const error = new SpreadsheetParseError("test", "xls", cause);
    expect(error.cause).toBe(cause);
  });

  it("is instanceof Error", () => {
    const error = new SpreadsheetParseError("test", "xls");
    expect(error).toBeInstanceOf(Error);
  });
});
