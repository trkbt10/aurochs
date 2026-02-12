/**
 * @file Office format utilities tests
 */

import { describe, expect, it } from "vitest";
import {
  SPREADSHEET_MIME_TYPES,
  SPREADSHEET_FORMAT_DESCRIPTIONS,
  detectSpreadsheetFormat,
  getSpreadsheetMimeType,
  getSpreadsheetMimeTypeByFileName,
  getSpreadsheetFilePickerType,
  PRESENTATION_MIME_TYPES,
  PRESENTATION_FORMAT_DESCRIPTIONS,
  detectPresentationFormat,
  getPresentationMimeType,
  getPresentationMimeTypeByFileName,
  getPresentationFilePickerType,
  DOCUMENT_MIME_TYPES,
  DOCUMENT_FORMAT_DESCRIPTIONS,
  detectDocumentFormat,
  getDocumentMimeType,
  getDocumentMimeTypeByFileName,
  getDocumentFilePickerType,
} from "./office-formats";

// =============================================================================
// Spreadsheet Format Tests
// =============================================================================

describe("Spreadsheet formats", () => {
  describe("detectSpreadsheetFormat", () => {
    it("detects xlsx format", () => {
      expect(detectSpreadsheetFormat("test.xlsx")).toBe("xlsx");
      expect(detectSpreadsheetFormat("TEST.XLSX")).toBe("xlsx");
    });

    it("detects xlsm format", () => {
      expect(detectSpreadsheetFormat("test.xlsm")).toBe("xlsm");
      expect(detectSpreadsheetFormat("TEST.XLSM")).toBe("xlsm");
    });

    it("defaults to xlsx for unknown extensions", () => {
      expect(detectSpreadsheetFormat("test.xls")).toBe("xlsx");
      expect(detectSpreadsheetFormat("test.csv")).toBe("xlsx");
      expect(detectSpreadsheetFormat("test")).toBe("xlsx");
    });
  });

  describe("getSpreadsheetMimeType", () => {
    it("returns correct MIME type for xlsx", () => {
      expect(getSpreadsheetMimeType("xlsx")).toBe(SPREADSHEET_MIME_TYPES.xlsx);
    });

    it("returns correct MIME type for xlsm", () => {
      expect(getSpreadsheetMimeType("xlsm")).toBe(SPREADSHEET_MIME_TYPES.xlsm);
    });
  });

  describe("getSpreadsheetMimeTypeByFileName", () => {
    it("returns xlsx MIME type for .xlsx files", () => {
      expect(getSpreadsheetMimeTypeByFileName("test.xlsx")).toBe(SPREADSHEET_MIME_TYPES.xlsx);
    });

    it("returns xlsm MIME type for .xlsm files", () => {
      expect(getSpreadsheetMimeTypeByFileName("test.xlsm")).toBe(SPREADSHEET_MIME_TYPES.xlsm);
    });
  });

  describe("getSpreadsheetFilePickerType", () => {
    it("returns correct file picker type for xlsx", () => {
      const type = getSpreadsheetFilePickerType("xlsx");
      expect(type.description).toBe(SPREADSHEET_FORMAT_DESCRIPTIONS.xlsx);
      expect(type.accept[SPREADSHEET_MIME_TYPES.xlsx]).toEqual([".xlsx"]);
    });

    it("returns correct file picker type for xlsm", () => {
      const type = getSpreadsheetFilePickerType("xlsm");
      expect(type.description).toBe(SPREADSHEET_FORMAT_DESCRIPTIONS.xlsm);
      expect(type.accept[SPREADSHEET_MIME_TYPES.xlsm]).toEqual([".xlsm"]);
    });
  });
});

// =============================================================================
// Presentation Format Tests
// =============================================================================

describe("Presentation formats", () => {
  describe("detectPresentationFormat", () => {
    it("detects pptx format", () => {
      expect(detectPresentationFormat("test.pptx")).toBe("pptx");
      expect(detectPresentationFormat("TEST.PPTX")).toBe("pptx");
    });

    it("detects pptm format", () => {
      expect(detectPresentationFormat("test.pptm")).toBe("pptm");
      expect(detectPresentationFormat("TEST.PPTM")).toBe("pptm");
    });

    it("detects ppsm format", () => {
      expect(detectPresentationFormat("test.ppsm")).toBe("ppsm");
      expect(detectPresentationFormat("TEST.PPSM")).toBe("ppsm");
    });

    it("detects ppsx format", () => {
      expect(detectPresentationFormat("test.ppsx")).toBe("ppsx");
      expect(detectPresentationFormat("TEST.PPSX")).toBe("ppsx");
    });

    it("defaults to pptx for unknown extensions", () => {
      expect(detectPresentationFormat("test.ppt")).toBe("pptx");
      expect(detectPresentationFormat("test")).toBe("pptx");
    });
  });

  describe("getPresentationMimeType", () => {
    it("returns correct MIME type for each format", () => {
      expect(getPresentationMimeType("pptx")).toBe(PRESENTATION_MIME_TYPES.pptx);
      expect(getPresentationMimeType("pptm")).toBe(PRESENTATION_MIME_TYPES.pptm);
      expect(getPresentationMimeType("ppsm")).toBe(PRESENTATION_MIME_TYPES.ppsm);
      expect(getPresentationMimeType("ppsx")).toBe(PRESENTATION_MIME_TYPES.ppsx);
    });
  });

  describe("getPresentationMimeTypeByFileName", () => {
    it("returns correct MIME type based on filename", () => {
      expect(getPresentationMimeTypeByFileName("test.pptx")).toBe(PRESENTATION_MIME_TYPES.pptx);
      expect(getPresentationMimeTypeByFileName("test.pptm")).toBe(PRESENTATION_MIME_TYPES.pptm);
      expect(getPresentationMimeTypeByFileName("test.ppsm")).toBe(PRESENTATION_MIME_TYPES.ppsm);
      expect(getPresentationMimeTypeByFileName("test.ppsx")).toBe(PRESENTATION_MIME_TYPES.ppsx);
    });
  });

  describe("getPresentationFilePickerType", () => {
    it("returns correct file picker type for pptx", () => {
      const type = getPresentationFilePickerType("pptx");
      expect(type.description).toBe(PRESENTATION_FORMAT_DESCRIPTIONS.pptx);
      expect(type.accept[PRESENTATION_MIME_TYPES.pptx]).toEqual([".pptx"]);
    });

    it("returns correct file picker type for pptm", () => {
      const type = getPresentationFilePickerType("pptm");
      expect(type.description).toBe(PRESENTATION_FORMAT_DESCRIPTIONS.pptm);
      expect(type.accept[PRESENTATION_MIME_TYPES.pptm]).toEqual([".pptm"]);
    });

    it("returns correct file picker type for ppsm", () => {
      const type = getPresentationFilePickerType("ppsm");
      expect(type.description).toBe(PRESENTATION_FORMAT_DESCRIPTIONS.ppsm);
      expect(type.accept[PRESENTATION_MIME_TYPES.ppsm]).toEqual([".ppsm"]);
    });
  });
});

// =============================================================================
// Document Format Tests
// =============================================================================

describe("Document formats", () => {
  describe("detectDocumentFormat", () => {
    it("detects docx format", () => {
      expect(detectDocumentFormat("test.docx")).toBe("docx");
      expect(detectDocumentFormat("TEST.DOCX")).toBe("docx");
    });

    it("detects docm format", () => {
      expect(detectDocumentFormat("test.docm")).toBe("docm");
      expect(detectDocumentFormat("TEST.DOCM")).toBe("docm");
    });

    it("defaults to docx for unknown extensions", () => {
      expect(detectDocumentFormat("test.doc")).toBe("docx");
      expect(detectDocumentFormat("test")).toBe("docx");
    });
  });

  describe("getDocumentMimeType", () => {
    it("returns correct MIME type for docx", () => {
      expect(getDocumentMimeType("docx")).toBe(DOCUMENT_MIME_TYPES.docx);
    });

    it("returns correct MIME type for docm", () => {
      expect(getDocumentMimeType("docm")).toBe(DOCUMENT_MIME_TYPES.docm);
    });
  });

  describe("getDocumentMimeTypeByFileName", () => {
    it("returns docx MIME type for .docx files", () => {
      expect(getDocumentMimeTypeByFileName("test.docx")).toBe(DOCUMENT_MIME_TYPES.docx);
    });

    it("returns docm MIME type for .docm files", () => {
      expect(getDocumentMimeTypeByFileName("test.docm")).toBe(DOCUMENT_MIME_TYPES.docm);
    });
  });

  describe("getDocumentFilePickerType", () => {
    it("returns correct file picker type for docx", () => {
      const type = getDocumentFilePickerType("docx");
      expect(type.description).toBe(DOCUMENT_FORMAT_DESCRIPTIONS.docx);
      expect(type.accept[DOCUMENT_MIME_TYPES.docx]).toEqual([".docx"]);
    });

    it("returns correct file picker type for docm", () => {
      const type = getDocumentFilePickerType("docm");
      expect(type.description).toBe(DOCUMENT_FORMAT_DESCRIPTIONS.docm);
      expect(type.accept[DOCUMENT_MIME_TYPES.docm]).toEqual([".docm"]);
    });
  });
});
