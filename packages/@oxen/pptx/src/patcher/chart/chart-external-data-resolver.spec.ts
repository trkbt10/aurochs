/**
 * @file Chart external data resolver tests
 */

import { parseXml } from "@oxen/xml";
import {
  hasExternalData,
  findExternalDataElement,
  parseFormulaSheetName,
  quoteSheetName,
  composeFormula,
} from "./chart-external-data-resolver";

describe("hasExternalData", () => {
  it("returns true when c:externalData exists", () => {
    const xml = parseXml(`
      <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
        <c:externalData r:id="rId2" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
        <c:chart/>
      </c:chartSpace>
    `);
    expect(hasExternalData(xml)).toBe(true);
  });

  it("returns false when c:externalData does not exist", () => {
    const xml = parseXml(`
      <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
        <c:chart/>
      </c:chartSpace>
    `);
    expect(hasExternalData(xml)).toBe(false);
  });

  it("returns false for invalid XML structure", () => {
    const xml = parseXml(`<other/>`);
    expect(hasExternalData(xml)).toBe(false);
  });
});

describe("findExternalDataElement", () => {
  it("returns c:externalData element when present", () => {
    const xml = parseXml(`
      <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
        <c:externalData r:id="rId2" autoUpdate="1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
        <c:chart/>
      </c:chartSpace>
    `);
    const element = findExternalDataElement(xml);
    expect(element).toBeDefined();
    expect(element?.name).toBe("c:externalData");
    expect(element?.attrs["r:id"]).toBe("rId2");
    expect(element?.attrs["autoUpdate"]).toBe("1");
  });

  it("returns undefined when not present", () => {
    const xml = parseXml(`
      <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
        <c:chart/>
      </c:chartSpace>
    `);
    expect(findExternalDataElement(xml)).toBeUndefined();
  });
});

describe("parseFormulaSheetName", () => {
  it("parses unquoted sheet name", () => {
    const result = parseFormulaSheetName("Sheet1!$A$2:$A$10");
    expect(result).toEqual({
      sheetName: "Sheet1",
      rangeRef: "$A$2:$A$10",
    });
  });

  it("parses quoted sheet name", () => {
    const result = parseFormulaSheetName("'My Sheet'!$B$1:$B$5");
    expect(result).toEqual({
      sheetName: "My Sheet",
      rangeRef: "$B$1:$B$5",
    });
  });

  it("handles escaped quotes in sheet name", () => {
    const result = parseFormulaSheetName("'Data''s Sheet'!$A$1:$A$3");
    expect(result).toEqual({
      sheetName: "Data's Sheet",
      rangeRef: "$A$1:$A$3",
    });
  });

  it("returns undefined for empty formula", () => {
    expect(parseFormulaSheetName("")).toBeUndefined();
  });

  it("returns undefined for formula without sheet reference", () => {
    expect(parseFormulaSheetName("$A$1:$A$10")).toBeUndefined();
  });
});

describe("quoteSheetName", () => {
  it("does not quote simple names", () => {
    expect(quoteSheetName("Sheet1")).toBe("Sheet1");
    expect(quoteSheetName("Data")).toBe("Data");
  });

  it("quotes names with spaces", () => {
    expect(quoteSheetName("My Sheet")).toBe("'My Sheet'");
  });

  it("quotes names with special characters", () => {
    expect(quoteSheetName("Sheet-1")).toBe("'Sheet-1'");
  });

  it("escapes single quotes", () => {
    expect(quoteSheetName("Data's")).toBe("'Data''s'");
  });

  it("quotes names starting with digits", () => {
    expect(quoteSheetName("1Sheet")).toBe("'1Sheet'");
  });
});

describe("composeFormula", () => {
  it("composes formula with unquoted sheet name", () => {
    expect(composeFormula("Sheet1", "$A$2:$A$10")).toBe("Sheet1!$A$2:$A$10");
  });

  it("composes formula with sheet name requiring quotes", () => {
    expect(composeFormula("My Sheet", "$B$1:$B$5")).toBe("'My Sheet'!$B$1:$B$5");
  });
});
