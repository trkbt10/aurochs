/**
 * @file Workbook Parser Integration Tests
 *
 * Tests for the XLSX workbook parser integration module.
 * Tests cover relationship parsing, sheet parsing, defined names,
 * and the main parseXlsxWorkbook function.
 */

import { parseXml } from "@oxen/xml";
import type { XmlElement } from "@oxen/xml";
import {
  parseRelationships,
  parseSheetElement,
  parseSheets,
  parseDefinedName,
  parseDefinedNames,
  parseWorkbookXml,
  resolveSheetPath,
  parseXlsxWorkbook,
} from "./index";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Helper to parse XML string and get the root element.
 */
function parseElement(xml: string): XmlElement {
  const doc = parseXml(xml);
  const root = doc.children.find((c): c is XmlElement => c.type === "element");
  if (!root) {
    throw new Error("No root element found");
  }
  return root;
}

// =============================================================================
// parseRelationships Tests
// =============================================================================

describe("parseRelationships", () => {
  it("should parse relationships from rels element", () => {
    const el = parseElement(`
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="worksheet"/>
        <Relationship Id="rId2" Target="worksheets/sheet2.xml" Type="worksheet"/>
        <Relationship Id="rId3" Target="styles.xml" Type="styles"/>
      </Relationships>
    `);
    const rels = parseRelationships(el);

    expect(rels.size).toBe(3);
    expect(rels.get("rId1")).toBe("worksheets/sheet1.xml");
    expect(rels.get("rId2")).toBe("worksheets/sheet2.xml");
    expect(rels.get("rId3")).toBe("styles.xml");
  });

  it("should return empty map when no relationships", () => {
    const el = parseElement(`
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      </Relationships>
    `);
    const rels = parseRelationships(el);

    expect(rels.size).toBe(0);
  });

  it("should skip relationships without Id or Target", () => {
    const el = parseElement(`
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Target="sheet1.xml"/>
        <Relationship Id="rId2"/>
        <Relationship Target="sheet3.xml"/>
        <Relationship Id="rId4" Target="sheet4.xml"/>
      </Relationships>
    `);
    const rels = parseRelationships(el);

    expect(rels.size).toBe(2);
    expect(rels.get("rId1")).toBe("sheet1.xml");
    expect(rels.get("rId4")).toBe("sheet4.xml");
  });
});

// =============================================================================
// parseSheetElement Tests
// =============================================================================

describe("parseSheetElement", () => {
  it("should parse basic sheet element", () => {
    const el = parseElement('<sheet name="Sheet1" sheetId="1" r:id="rId1"/>');
    const info = parseSheetElement(el);

    expect(info.name).toBe("Sheet1");
    expect(info.sheetId).toBe(1);
    expect(info.rId).toBe("rId1");
    expect(info.state).toBe("visible");
  });

  it("should parse sheet with rId attribute (without namespace)", () => {
    const el = parseElement('<sheet name="Data" sheetId="2" rId="rId5"/>');
    const info = parseSheetElement(el);

    expect(info.rId).toBe("rId5");
  });

  it("should parse hidden sheet state", () => {
    const el = parseElement('<sheet name="Hidden" sheetId="3" r:id="rId2" state="hidden"/>');
    const info = parseSheetElement(el);

    expect(info.state).toBe("hidden");
  });

  it("should parse veryHidden sheet state", () => {
    const el = parseElement('<sheet name="VeryHidden" sheetId="4" r:id="rId3" state="veryHidden"/>');
    const info = parseSheetElement(el);

    expect(info.state).toBe("veryHidden");
  });

  it("should use defaults for missing attributes", () => {
    const el = parseElement("<sheet/>");
    const info = parseSheetElement(el);

    expect(info.name).toBe("Sheet");
    expect(info.sheetId).toBe(1);
    expect(info.rId).toBe("");
    expect(info.state).toBe("visible");
  });
});

// =============================================================================
// parseSheets Tests
// =============================================================================

describe("parseSheets", () => {
  it("should return empty array when undefined", () => {
    const result = parseSheets(undefined);
    expect(result).toEqual([]);
  });

  it("should parse multiple sheets", () => {
    const el = parseElement(`
      <sheets>
        <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
        <sheet name="Sheet2" sheetId="2" r:id="rId2" state="hidden"/>
        <sheet name="Sheet3" sheetId="3" r:id="rId3"/>
      </sheets>
    `);
    const sheets = parseSheets(el);

    expect(sheets).toHaveLength(3);
    expect(sheets[0].name).toBe("Sheet1");
    expect(sheets[0].sheetId).toBe(1);
    expect(sheets[1].name).toBe("Sheet2");
    expect(sheets[1].state).toBe("hidden");
    expect(sheets[2].name).toBe("Sheet3");
  });

  it("should handle empty sheets element", () => {
    const el = parseElement("<sheets/>");
    const sheets = parseSheets(el);

    expect(sheets).toEqual([]);
  });
});

// =============================================================================
// parseDefinedName Tests
// =============================================================================

describe("parseDefinedName", () => {
  it("should parse basic defined name", () => {
    const el = parseElement('<definedName name="MyRange">Sheet1!$A$1:$B$10</definedName>');
    const dn = parseDefinedName(el);

    expect(dn.name).toBe("MyRange");
    expect(dn.formula).toBe("Sheet1!$A$1:$B$10");
    expect(dn.localSheetId).toBeUndefined();
    expect(dn.hidden).toBeUndefined();
  });

  it("should parse defined name with localSheetId", () => {
    const el = parseElement('<definedName name="LocalRange" localSheetId="0">Sheet1!$C$1</definedName>');
    const dn = parseDefinedName(el);

    expect(dn.name).toBe("LocalRange");
    expect(dn.localSheetId).toBe(0);
  });

  it("should parse hidden defined name", () => {
    const el = parseElement('<definedName name="_xlnm.Print_Area" hidden="1">Sheet1!$A$1:$Z$100</definedName>');
    const dn = parseDefinedName(el);

    expect(dn.name).toBe("_xlnm.Print_Area");
    expect(dn.hidden).toBe(true);
  });

  it("should handle empty defined name element", () => {
    const el = parseElement("<definedName/>");
    const dn = parseDefinedName(el);

    expect(dn.name).toBe("");
    expect(dn.formula).toBe("");
  });
});

// =============================================================================
// parseDefinedNames Tests
// =============================================================================

describe("parseDefinedNames", () => {
  it("should return empty array when undefined", () => {
    const result = parseDefinedNames(undefined);
    expect(result).toEqual([]);
  });

  it("should parse multiple defined names", () => {
    const el = parseElement(`
      <definedNames>
        <definedName name="Range1">Sheet1!$A$1</definedName>
        <definedName name="Range2" localSheetId="1">Sheet2!$B$2</definedName>
        <definedName name="_xlnm.Print_Area" hidden="1">Sheet1!$A$1:$Z$50</definedName>
      </definedNames>
    `);
    const names = parseDefinedNames(el);

    expect(names).toHaveLength(3);
    expect(names[0].name).toBe("Range1");
    expect(names[1].localSheetId).toBe(1);
    expect(names[2].hidden).toBe(true);
  });

  it("should handle empty definedNames element", () => {
    const el = parseElement("<definedNames/>");
    const names = parseDefinedNames(el);

    expect(names).toEqual([]);
  });
});

// =============================================================================
// parseWorkbookXml Tests
// =============================================================================

describe("parseWorkbookXml", () => {
  it("should parse workbook with sheets and defined names", () => {
    const el = parseElement(`
      <workbook>
        <sheets>
          <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
          <sheet name="Sheet2" sheetId="2" r:id="rId2"/>
        </sheets>
        <definedNames>
          <definedName name="TestRange">Sheet1!$A$1</definedName>
        </definedNames>
      </workbook>
    `);
    const info = parseWorkbookXml(el);

    expect(info.sheets).toHaveLength(2);
    expect(info.sheets[0].name).toBe("Sheet1");
    expect(info.sheets[1].name).toBe("Sheet2");
    expect(info.definedNames).toHaveLength(1);
    expect(info.definedNames![0].name).toBe("TestRange");
  });

  it("should handle workbook with only sheets", () => {
    const el = parseElement(`
      <workbook>
        <sheets>
          <sheet name="Data" sheetId="1" r:id="rId1"/>
        </sheets>
      </workbook>
    `);
    const info = parseWorkbookXml(el);

    expect(info.sheets).toHaveLength(1);
    expect(info.definedNames).toEqual([]);
  });

  it("should handle empty workbook", () => {
    const el = parseElement("<workbook/>");
    const info = parseWorkbookXml(el);

    expect(info.sheets).toEqual([]);
    expect(info.definedNames).toEqual([]);
  });
});

// =============================================================================
// resolveSheetPath Tests
// =============================================================================

describe("resolveSheetPath", () => {
  const relationships = new Map([
    ["rId1", "worksheets/sheet1.xml"],
    ["rId2", "worksheets/sheet2.xml"],
    ["rId3", "xl/worksheets/sheet3.xml"],
  ]);

  it("should resolve relative path with xl/ prefix", () => {
    const path = resolveSheetPath("rId1", relationships);
    expect(path).toBe("xl/worksheets/sheet1.xml");
  });

  it("should preserve absolute path starting with xl/", () => {
    const path = resolveSheetPath("rId3", relationships);
    expect(path).toBe("xl/worksheets/sheet3.xml");
  });

  it("should throw error for unknown relationship ID", () => {
    expect(() => resolveSheetPath("rId999", relationships)).toThrow("Relationship rId999 not found");
  });
});

// =============================================================================
// parseXlsxWorkbook Tests
// =============================================================================

describe("parseXlsxWorkbook", () => {
  it("should parse a complete workbook", async () => {
    const files: Record<string, string> = {
      "xl/_rels/workbook.xml.rels": `
        <Relationships>
          <Relationship Id="rId1" Target="worksheets/sheet1.xml"/>
        </Relationships>
      `,
      "xl/workbook.xml": `
        <workbook>
          <sheets>
            <sheet name="TestSheet" sheetId="1" r:id="rId1"/>
          </sheets>
        </workbook>
      `,
      "xl/worksheets/sheet1.xml": `
        <worksheet>
          <sheetData>
            <row r="1">
              <c r="A1" t="n"><v>42</v></c>
            </row>
          </sheetData>
        </worksheet>
      `,
    };

    const getFileContent = async (path: string): Promise<string | undefined> => {
      return files[path];
    };

    const workbook = await parseXlsxWorkbook(getFileContent);

    expect(workbook.sheets).toHaveLength(1);
    expect(workbook.sheets[0].name).toBe("TestSheet");
    expect(workbook.sheets[0].rows).toHaveLength(1);
    expect(workbook.sheets[0].rows[0].cells).toHaveLength(1);
    expect(workbook.sheets[0].xmlPath).toBe("xl/worksheets/sheet1.xml");
  });

  it("should throw error when workbook.xml is missing", async () => {
    await expect(parseXlsxWorkbook(async () => undefined)).rejects.toThrow("workbook.xml not found");
  });

  it("should use default stylesheet when styles.xml is missing", async () => {
    const files: Record<string, string> = {
      "xl/workbook.xml": `
        <workbook>
          <sheets>
            <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
          </sheets>
        </workbook>
      `,
      "xl/_rels/workbook.xml.rels": `
        <Relationships>
          <Relationship Id="rId1" Target="worksheets/sheet1.xml"/>
        </Relationships>
      `,
      "xl/worksheets/sheet1.xml": `
        <worksheet><sheetData/></worksheet>
      `,
    };

    const getFileContent = async (path: string): Promise<string | undefined> => {
      return files[path];
    };

    const workbook = await parseXlsxWorkbook(getFileContent);

    // Should have default stylesheet
    expect(workbook.styles).toBeDefined();
    expect(workbook.styles.fonts).toHaveLength(1);
    expect(workbook.styles.fills).toHaveLength(2);
    expect(workbook.styles.borders).toHaveLength(1);
  });

  it("should handle workbook with shared strings", async () => {
    const files: Record<string, string> = {
      "xl/workbook.xml": `
        <workbook>
          <sheets>
            <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
          </sheets>
        </workbook>
      `,
      "xl/_rels/workbook.xml.rels": `
        <Relationships>
          <Relationship Id="rId1" Target="worksheets/sheet1.xml"/>
        </Relationships>
      `,
      "xl/sharedStrings.xml": `
        <sst count="2" uniqueCount="2">
          <si><t>Hello</t></si>
          <si><t>World</t></si>
        </sst>
      `,
      "xl/worksheets/sheet1.xml": `
        <worksheet>
          <sheetData>
            <row r="1">
              <c r="A1" t="s"><v>0</v></c>
              <c r="B1" t="s"><v>1</v></c>
            </row>
          </sheetData>
        </worksheet>
      `,
    };

    const getFileContent = async (path: string): Promise<string | undefined> => {
      return files[path];
    };

    const workbook = await parseXlsxWorkbook(getFileContent);

    expect(workbook.sharedStrings).toEqual(["Hello", "World"]);
    expect(workbook.sheets[0].rows[0].cells[0].value.type).toBe("string");
    expect((workbook.sheets[0].rows[0].cells[0].value as { value: string }).value).toBe("Hello");
    expect(workbook.sheets[0].rows[0].cells[1].value.type).toBe("string");
    expect((workbook.sheets[0].rows[0].cells[1].value as { value: string }).value).toBe("World");
  });

  it("should handle workbook with defined names", async () => {
    const files: Record<string, string> = {
      "xl/workbook.xml": `
        <workbook>
          <sheets>
            <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
          </sheets>
          <definedNames>
            <definedName name="MyRange">Sheet1!$A$1:$B$10</definedName>
            <definedName name="_xlnm.Print_Area" hidden="1">Sheet1!$A$1:$Z$50</definedName>
          </definedNames>
        </workbook>
      `,
      "xl/_rels/workbook.xml.rels": `
        <Relationships>
          <Relationship Id="rId1" Target="worksheets/sheet1.xml"/>
        </Relationships>
      `,
      "xl/worksheets/sheet1.xml": `
        <worksheet><sheetData/></worksheet>
      `,
    };

    const getFileContent = async (path: string): Promise<string | undefined> => {
      return files[path];
    };

    const workbook = await parseXlsxWorkbook(getFileContent);

    expect(workbook.definedNames).toHaveLength(2);
    expect(workbook.definedNames![0].name).toBe("MyRange");
    expect(workbook.definedNames![0].formula).toBe("Sheet1!$A$1:$B$10");
    expect(workbook.definedNames![1].hidden).toBe(true);
  });

  it("should handle multiple sheets", async () => {
    const files: Record<string, string> = {
      "xl/workbook.xml": `
        <workbook>
          <sheets>
            <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
            <sheet name="Sheet2" sheetId="2" r:id="rId2" state="hidden"/>
          </sheets>
        </workbook>
      `,
      "xl/_rels/workbook.xml.rels": `
        <Relationships>
          <Relationship Id="rId1" Target="worksheets/sheet1.xml"/>
          <Relationship Id="rId2" Target="worksheets/sheet2.xml"/>
        </Relationships>
      `,
      "xl/worksheets/sheet1.xml": `
        <worksheet><sheetData/></worksheet>
      `,
      "xl/worksheets/sheet2.xml": `
        <worksheet><sheetData/></worksheet>
      `,
    };

    const getFileContent = async (path: string): Promise<string | undefined> => {
      return files[path];
    };

    const workbook = await parseXlsxWorkbook(getFileContent);

    expect(workbook.sheets).toHaveLength(2);
    expect(workbook.sheets[0].name).toBe("Sheet1");
    expect(workbook.sheets[0].state).toBe("visible");
    expect(workbook.sheets[1].name).toBe("Sheet2");
    expect(workbook.sheets[1].state).toBe("hidden");
  });

  it("should skip sheets with missing XML files", async () => {
    const files: Record<string, string> = {
      "xl/workbook.xml": `
        <workbook>
          <sheets>
            <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
            <sheet name="Sheet2" sheetId="2" r:id="rId2"/>
          </sheets>
        </workbook>
      `,
      "xl/_rels/workbook.xml.rels": `
        <Relationships>
          <Relationship Id="rId1" Target="worksheets/sheet1.xml"/>
          <Relationship Id="rId2" Target="worksheets/sheet2.xml"/>
        </Relationships>
      `,
      "xl/worksheets/sheet1.xml": `
        <worksheet><sheetData/></worksheet>
      `,
      // Note: sheet2.xml is missing
    };

    const getFileContent = async (path: string): Promise<string | undefined> => {
      return files[path];
    };

    const workbook = await parseXlsxWorkbook(getFileContent);

    // Only Sheet1 should be parsed
    expect(workbook.sheets).toHaveLength(1);
    expect(workbook.sheets[0].name).toBe("Sheet1");
  });

  it("should handle empty relationships", async () => {
    const files: Record<string, string> = {
      "xl/workbook.xml": `
        <workbook>
          <sheets>
          </sheets>
        </workbook>
      `,
      // No relationships file
    };

    const getFileContent = async (path: string): Promise<string | undefined> => {
      return files[path];
    };

    const workbook = await parseXlsxWorkbook(getFileContent);

    expect(workbook.sheets).toHaveLength(0);
    expect(workbook.sharedStrings).toEqual([]);
  });
});
