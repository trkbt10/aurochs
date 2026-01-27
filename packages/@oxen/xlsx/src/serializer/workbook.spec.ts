/**
 * @file Workbook Serializer Tests
 *
 * Tests for serializing XlsxWorkbook to XML elements.
 * Verifies element ordering, attribute serialization, and namespace handling
 * per ECMA-376 specification.
 *
 * @see ECMA-376 Part 4, Section 18.2.28 (workbook)
 */

import { serializeElement } from "@oxen/xml";
import type { XlsxWorkbook, XlsxWorksheet, XlsxDefinedName } from "../domain/workbook";
import { createDefaultStyleSheet } from "../domain/style/types";
import {
  serializeWorkbook,
  serializeSheets,
  serializeDefinedNames,
  serializeRelationships,
  type XlsxRelationship,
} from "./workbook";

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a minimal worksheet for testing
 */
function createWorksheet(
  name: string,
  sheetId: number,
  state: "visible" | "hidden" | "veryHidden" = "visible",
): XlsxWorksheet {
  return {
    dateSystem: "1900",
    name,
    sheetId,
    state,
    rows: [],
    xmlPath: `xl/worksheets/sheet${sheetId}.xml`,
  };
}

/**
 * Create a minimal workbook for testing
 */
function createWorkbook(
  sheets: XlsxWorksheet[],
  options?: {
    definedNames?: XlsxDefinedName[];
  },
): XlsxWorkbook {
  return {
    dateSystem: "1900",
    sheets,
    styles: createDefaultStyleSheet(),
    sharedStrings: [],
    definedNames: options?.definedNames,
  };
}

/**
 * Create a sheet relationships map
 */
function createRelationships(count: number): Map<number, string> {
  const map = new Map<number, string>();
  for (let i = 0; i < count; i++) {
    map.set(i, `rId${i + 1}`);
  }
  return map;
}

// =============================================================================
// serializeSheets Tests
// =============================================================================

describe("serializeSheets", () => {
  it("should serialize single sheet", () => {
    const sheets = [createWorksheet("Sheet1", 1)];
    const relationships = createRelationships(1);

    const element = serializeSheets(sheets, relationships);
    const xml = serializeElement(element);

    expect(xml).toBe(
      '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>',
    );
  });

  it("should serialize multiple sheets", () => {
    const sheets = [
      createWorksheet("Sheet1", 1),
      createWorksheet("Sheet2", 2),
      createWorksheet("Sheet3", 3),
    ];
    const relationships = createRelationships(3);

    const element = serializeSheets(sheets, relationships);
    const xml = serializeElement(element);

    expect(xml).toContain('name="Sheet1"');
    expect(xml).toContain('sheetId="1"');
    expect(xml).toContain('r:id="rId1"');

    expect(xml).toContain('name="Sheet2"');
    expect(xml).toContain('sheetId="2"');
    expect(xml).toContain('r:id="rId2"');

    expect(xml).toContain('name="Sheet3"');
    expect(xml).toContain('sheetId="3"');
    expect(xml).toContain('r:id="rId3"');
  });

  it("should omit state attribute for visible sheets", () => {
    const sheets = [createWorksheet("Sheet1", 1, "visible")];
    const relationships = createRelationships(1);

    const element = serializeSheets(sheets, relationships);
    const xml = serializeElement(element);

    expect(xml).not.toContain("state=");
  });

  it("should include state attribute for hidden sheets", () => {
    const sheets = [createWorksheet("HiddenSheet", 1, "hidden")];
    const relationships = createRelationships(1);

    const element = serializeSheets(sheets, relationships);
    const xml = serializeElement(element);

    expect(xml).toContain('state="hidden"');
  });

  it("should include state attribute for veryHidden sheets", () => {
    const sheets = [createWorksheet("VeryHiddenSheet", 1, "veryHidden")];
    const relationships = createRelationships(1);

    const element = serializeSheets(sheets, relationships);
    const xml = serializeElement(element);

    expect(xml).toContain('state="veryHidden"');
  });

  it("should serialize mixed visibility sheets", () => {
    const sheets = [
      createWorksheet("Visible", 1, "visible"),
      createWorksheet("Hidden", 2, "hidden"),
      createWorksheet("VeryHidden", 3, "veryHidden"),
    ];
    const relationships = createRelationships(3);

    const element = serializeSheets(sheets, relationships);
    const xml = serializeElement(element);

    // First sheet should not have state attribute
    expect(xml).toContain('name="Visible" sheetId="1" r:id="rId1"');

    // Hidden and veryHidden sheets should have state attribute
    expect(xml).toContain('state="hidden"');
    expect(xml).toContain('state="veryHidden"');
  });

  it("should throw error for missing relationship ID", () => {
    const sheets = [createWorksheet("Sheet1", 1)];
    const relationships = new Map<number, string>(); // Empty map

    expect(() => serializeSheets(sheets, relationships)).toThrow(
      "Missing relationship ID for sheet at index 0",
    );
  });

  it("should serialize sheets with non-sequential sheetIds", () => {
    const sheets = [
      createWorksheet("Sheet1", 1),
      createWorksheet("Sheet3", 3), // Gap in sheetId
      createWorksheet("Sheet5", 5),
    ];
    const relationships = createRelationships(3);

    const element = serializeSheets(sheets, relationships);
    const xml = serializeElement(element);

    expect(xml).toContain('sheetId="1"');
    expect(xml).toContain('sheetId="3"');
    expect(xml).toContain('sheetId="5"');
  });

  it("should preserve sheet order", () => {
    const sheets = [
      createWorksheet("First", 1),
      createWorksheet("Second", 2),
      createWorksheet("Third", 3),
    ];
    const relationships = createRelationships(3);

    const element = serializeSheets(sheets, relationships);
    const xml = serializeElement(element);

    const firstIdx = xml.indexOf("First");
    const secondIdx = xml.indexOf("Second");
    const thirdIdx = xml.indexOf("Third");

    expect(firstIdx).toBeLessThan(secondIdx);
    expect(secondIdx).toBeLessThan(thirdIdx);
  });

  it("should serialize sheet attribute order correctly", () => {
    const sheets = [createWorksheet("Sheet1", 1, "hidden")];
    const relationships = createRelationships(1);

    const element = serializeSheets(sheets, relationships);
    const xml = serializeElement(element);

    // Attribute order should be: name, sheetId, state, r:id
    const nameIdx = xml.indexOf("name=");
    const sheetIdIdx = xml.indexOf("sheetId=");
    const stateIdx = xml.indexOf("state=");
    const ridIdx = xml.indexOf("r:id=");

    expect(nameIdx).toBeLessThan(sheetIdIdx);
    expect(sheetIdIdx).toBeLessThan(stateIdx);
    expect(stateIdx).toBeLessThan(ridIdx);
  });
});

// =============================================================================
// serializeDefinedNames Tests
// =============================================================================

describe("serializeDefinedNames", () => {
  it("should return undefined for empty array", () => {
    const result = serializeDefinedNames([]);
    expect(result).toBeUndefined();
  });

  it("should serialize single global defined name", () => {
    const definedNames: XlsxDefinedName[] = [
      { name: "MyRange", formula: "Sheet1!$A$1:$B$10" },
    ];

    const element = serializeDefinedNames(definedNames);
    expect(element).toBeDefined();

    const xml = serializeElement(element!);
    expect(xml).toContain("<definedNames>");
    expect(xml).toContain('name="MyRange"');
    expect(xml).toContain("Sheet1!$A$1:$B$10");
    expect(xml).not.toContain("localSheetId");
    expect(xml).toContain("</definedNames>");
  });

  it("should serialize defined name with localSheetId", () => {
    const definedNames: XlsxDefinedName[] = [
      { name: "_xlnm.Print_Area", formula: "Sheet1!$A$1:$D$10", localSheetId: 0 },
    ];

    const element = serializeDefinedNames(definedNames);
    const xml = serializeElement(element!);

    expect(xml).toContain('localSheetId="0"');
    expect(xml).toContain('name="_xlnm.Print_Area"');
  });

  it("should serialize hidden defined name", () => {
    const definedNames: XlsxDefinedName[] = [
      { name: "HiddenName", formula: "Sheet1!$A$1", hidden: true },
    ];

    const element = serializeDefinedNames(definedNames);
    const xml = serializeElement(element!);

    expect(xml).toContain('hidden="1"');
  });

  it("should not include hidden attribute when false or undefined", () => {
    const definedNames: XlsxDefinedName[] = [
      { name: "Name1", formula: "Sheet1!$A$1", hidden: false },
      { name: "Name2", formula: "Sheet1!$B$1" },
    ];

    const element = serializeDefinedNames(definedNames);
    const xml = serializeElement(element!);

    expect(xml).not.toContain("hidden=");
  });

  it("should serialize multiple defined names", () => {
    const definedNames: XlsxDefinedName[] = [
      { name: "GlobalRange", formula: "Sheet1!$A$1:$A$100" },
      { name: "_xlnm.Print_Area", formula: "Sheet1!$A$1:$D$10", localSheetId: 0 },
      { name: "_xlnm.Print_Titles", formula: "Sheet2!$1:$1", localSheetId: 1 },
      { name: "SecretName", formula: "Sheet1!$Z$1", hidden: true },
    ];

    const element = serializeDefinedNames(definedNames);
    const xml = serializeElement(element!);

    expect(xml).toContain('name="GlobalRange"');
    expect(xml).toContain('name="_xlnm.Print_Area"');
    expect(xml).toContain('name="_xlnm.Print_Titles"');
    expect(xml).toContain('name="SecretName"');
    expect(xml).toContain('localSheetId="0"');
    expect(xml).toContain('localSheetId="1"');
    expect(xml).toContain('hidden="1"');
  });

  it("should preserve defined name order", () => {
    const definedNames: XlsxDefinedName[] = [
      { name: "First", formula: "Sheet1!$A$1" },
      { name: "Second", formula: "Sheet1!$B$1" },
      { name: "Third", formula: "Sheet1!$C$1" },
    ];

    const element = serializeDefinedNames(definedNames);
    const xml = serializeElement(element!);

    const firstIdx = xml.indexOf("First");
    const secondIdx = xml.indexOf("Second");
    const thirdIdx = xml.indexOf("Third");

    expect(firstIdx).toBeLessThan(secondIdx);
    expect(secondIdx).toBeLessThan(thirdIdx);
  });

  it("should serialize complex formula values", () => {
    const definedNames: XlsxDefinedName[] = [
      { name: "MultiSheet", formula: "'Sheet 1'!$A$1:$B$10,'Sheet 2'!$C$1:$D$10" },
    ];

    const element = serializeDefinedNames(definedNames);
    const xml = serializeElement(element!);

    // Single quotes are escaped as &apos; in XML
    expect(xml).toContain("&apos;Sheet 1&apos;!$A$1:$B$10,&apos;Sheet 2&apos;!$C$1:$D$10");
  });
});

// =============================================================================
// serializeRelationships Tests
// =============================================================================

describe("serializeRelationships", () => {
  it("should serialize empty relationships", () => {
    const element = serializeRelationships([]);
    const xml = serializeElement(element);

    expect(xml).toBe(
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>',
    );
  });

  it("should serialize single relationship", () => {
    const relationships: XlsxRelationship[] = [
      {
        id: "rId1",
        type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
        target: "worksheets/sheet1.xml",
      },
    ];

    const element = serializeRelationships(relationships);
    const xml = serializeElement(element);

    expect(xml).toContain('Id="rId1"');
    expect(xml).toContain(
      'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"',
    );
    expect(xml).toContain('Target="worksheets/sheet1.xml"');
  });

  it("should serialize multiple relationships", () => {
    const relationships: XlsxRelationship[] = [
      {
        id: "rId1",
        type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
        target: "worksheets/sheet1.xml",
      },
      {
        id: "rId2",
        type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
        target: "worksheets/sheet2.xml",
      },
      {
        id: "rId3",
        type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
        target: "styles.xml",
      },
      {
        id: "rId4",
        type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings",
        target: "sharedStrings.xml",
      },
    ];

    const element = serializeRelationships(relationships);
    const xml = serializeElement(element);

    expect(xml).toContain('Id="rId1"');
    expect(xml).toContain('Id="rId2"');
    expect(xml).toContain('Id="rId3"');
    expect(xml).toContain('Id="rId4"');
    expect(xml).toContain('Target="worksheets/sheet1.xml"');
    expect(xml).toContain('Target="worksheets/sheet2.xml"');
    expect(xml).toContain('Target="styles.xml"');
    expect(xml).toContain('Target="sharedStrings.xml"');
  });

  it("should include correct namespace", () => {
    const element = serializeRelationships([]);
    const xml = serializeElement(element);

    expect(xml).toContain(
      'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"',
    );
  });

  it("should serialize relationship attribute order correctly", () => {
    const relationships: XlsxRelationship[] = [
      {
        id: "rId1",
        type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
        target: "worksheets/sheet1.xml",
      },
    ];

    const element = serializeRelationships(relationships);
    const xml = serializeElement(element);

    // Attribute order should be: Id, Type, Target
    const idIdx = xml.indexOf('Id="');
    const typeIdx = xml.indexOf('Type="');
    const targetIdx = xml.indexOf('Target="');

    expect(idIdx).toBeLessThan(typeIdx);
    expect(typeIdx).toBeLessThan(targetIdx);
  });
});

// =============================================================================
// serializeWorkbook Tests
// =============================================================================

describe("serializeWorkbook", () => {
  it("should serialize minimal workbook", () => {
    const workbook = createWorkbook([createWorksheet("Sheet1", 1)]);
    const relationships = createRelationships(1);

    const element = serializeWorkbook(workbook, relationships);
    const xml = serializeElement(element);

    // Check root element
    expect(xml).toContain("<workbook");
    expect(xml).toContain("</workbook>");

    // Check namespaces
    expect(xml).toContain(
      'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
    );
    expect(xml).toContain(
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
    );
  });

  it("should include fileVersion element", () => {
    const workbook = createWorkbook([createWorksheet("Sheet1", 1)]);
    const relationships = createRelationships(1);

    const element = serializeWorkbook(workbook, relationships);
    const xml = serializeElement(element);

    expect(xml).toContain("<fileVersion");
    expect(xml).toContain('appName="xl"');
    expect(xml).toContain('lastEdited="7"');
    expect(xml).toContain('lowestEdited="7"');
    expect(xml).toContain('rupBuild="24729"');
  });

  it("should include workbookPr element", () => {
    const workbook = createWorkbook([createWorksheet("Sheet1", 1)]);
    const relationships = createRelationships(1);

    const element = serializeWorkbook(workbook, relationships);
    const xml = serializeElement(element);

    expect(xml).toContain("<workbookPr");
    expect(xml).toContain('defaultThemeVersion="166925"');
  });

  it("should include bookViews element", () => {
    const workbook = createWorkbook([createWorksheet("Sheet1", 1)]);
    const relationships = createRelationships(1);

    const element = serializeWorkbook(workbook, relationships);
    const xml = serializeElement(element);

    expect(xml).toContain("<bookViews>");
    expect(xml).toContain("<workbookView");
    expect(xml).toContain('xWindow="0"');
    expect(xml).toContain('yWindow="0"');
    expect(xml).toContain('windowWidth="28800"');
    expect(xml).toContain('windowHeight="12300"');
    expect(xml).toContain("</bookViews>");
  });

  it("should include sheets element", () => {
    const workbook = createWorkbook([
      createWorksheet("Sheet1", 1),
      createWorksheet("Sheet2", 2),
    ]);
    const relationships = createRelationships(2);

    const element = serializeWorkbook(workbook, relationships);
    const xml = serializeElement(element);

    expect(xml).toContain("<sheets>");
    expect(xml).toContain('name="Sheet1"');
    expect(xml).toContain('name="Sheet2"');
    expect(xml).toContain("</sheets>");
  });

  it("should include calcPr element", () => {
    const workbook = createWorkbook([createWorksheet("Sheet1", 1)]);
    const relationships = createRelationships(1);

    const element = serializeWorkbook(workbook, relationships);
    const xml = serializeElement(element);

    expect(xml).toContain("<calcPr");
    expect(xml).toContain('calcId="191029"');
  });

  it("should not include definedNames when empty", () => {
    const workbook = createWorkbook([createWorksheet("Sheet1", 1)]);
    const relationships = createRelationships(1);

    const element = serializeWorkbook(workbook, relationships);
    const xml = serializeElement(element);

    expect(xml).not.toContain("<definedNames");
  });

  it("should not include definedNames when undefined", () => {
    const workbook = createWorkbook([createWorksheet("Sheet1", 1)]);
    const relationships = createRelationships(1);

    const element = serializeWorkbook(workbook, relationships);
    const xml = serializeElement(element);

    expect(xml).not.toContain("<definedNames");
  });

  it("should include definedNames when present", () => {
    const workbook = createWorkbook([createWorksheet("Sheet1", 1)], {
      definedNames: [{ name: "TestRange", formula: "Sheet1!$A$1:$B$10" }],
    });
    const relationships = createRelationships(1);

    const element = serializeWorkbook(workbook, relationships);
    const xml = serializeElement(element);

    expect(xml).toContain("<definedNames>");
    expect(xml).toContain('name="TestRange"');
    expect(xml).toContain("Sheet1!$A$1:$B$10");
    expect(xml).toContain("</definedNames>");
  });

  it("should serialize child elements in correct order", () => {
    const workbook = createWorkbook([createWorksheet("Sheet1", 1)], {
      definedNames: [{ name: "TestRange", formula: "Sheet1!$A$1" }],
    });
    const relationships = createRelationships(1);

    const element = serializeWorkbook(workbook, relationships);
    const xml = serializeElement(element);

    // Verify order: fileVersion, workbookPr, bookViews, sheets, definedNames, calcPr
    const fileVersionIdx = xml.indexOf("<fileVersion");
    const workbookPrIdx = xml.indexOf("<workbookPr");
    const bookViewsIdx = xml.indexOf("<bookViews>");
    const sheetsIdx = xml.indexOf("<sheets>");
    const definedNamesIdx = xml.indexOf("<definedNames>");
    const calcPrIdx = xml.indexOf("<calcPr");

    expect(fileVersionIdx).toBeLessThan(workbookPrIdx);
    expect(workbookPrIdx).toBeLessThan(bookViewsIdx);
    expect(bookViewsIdx).toBeLessThan(sheetsIdx);
    expect(sheetsIdx).toBeLessThan(definedNamesIdx);
    expect(definedNamesIdx).toBeLessThan(calcPrIdx);
  });

  it("should serialize child elements in correct order without definedNames", () => {
    const workbook = createWorkbook([createWorksheet("Sheet1", 1)]);
    const relationships = createRelationships(1);

    const element = serializeWorkbook(workbook, relationships);
    const xml = serializeElement(element);

    // Verify order: fileVersion, workbookPr, bookViews, sheets, calcPr
    const fileVersionIdx = xml.indexOf("<fileVersion");
    const workbookPrIdx = xml.indexOf("<workbookPr");
    const bookViewsIdx = xml.indexOf("<bookViews>");
    const sheetsIdx = xml.indexOf("<sheets>");
    const calcPrIdx = xml.indexOf("<calcPr");

    expect(fileVersionIdx).toBeLessThan(workbookPrIdx);
    expect(workbookPrIdx).toBeLessThan(bookViewsIdx);
    expect(bookViewsIdx).toBeLessThan(sheetsIdx);
    expect(sheetsIdx).toBeLessThan(calcPrIdx);
  });
});

// =============================================================================
// Complex Workbook Tests
// =============================================================================

describe("Complex workbook scenarios", () => {
  it("should serialize workbook with multiple sheets and defined names", () => {
    const workbook = createWorkbook(
      [
        createWorksheet("Data", 1, "visible"),
        createWorksheet("Summary", 2, "visible"),
        createWorksheet("Config", 3, "hidden"),
      ],
      {
        definedNames: [
          { name: "_xlnm.Print_Area", formula: "Data!$A$1:$D$100", localSheetId: 0 },
          { name: "_xlnm.Print_Area", formula: "Summary!$A$1:$F$50", localSheetId: 1 },
          { name: "DataRange", formula: "Data!$A$1:$D$100" },
          { name: "InternalCalc", formula: "Config!$A$1", hidden: true },
        ],
      },
    );
    const relationships = createRelationships(3);

    const element = serializeWorkbook(workbook, relationships);
    const xml = serializeElement(element);

    // Verify all sheets are present
    expect(xml).toContain('name="Data"');
    expect(xml).toContain('name="Summary"');
    expect(xml).toContain('name="Config"');
    expect(xml).toContain('state="hidden"');

    // Verify defined names
    expect(xml).toContain('name="_xlnm.Print_Area"');
    expect(xml).toContain('name="DataRange"');
    expect(xml).toContain('name="InternalCalc"');
    expect(xml).toContain('localSheetId="0"');
    expect(xml).toContain('localSheetId="1"');
    expect(xml).toContain('hidden="1"');
  });

  it("should produce valid XML structure for empty workbook with single sheet", () => {
    const workbook = createWorkbook([createWorksheet("Sheet1", 1)]);
    const relationships = createRelationships(1);

    const element = serializeWorkbook(workbook, relationships);
    const xml = serializeElement(element);

    // Verify it starts and ends correctly
    expect(xml).toMatch(/^<workbook xmlns="[^"]+"/);
    expect(xml).toMatch(/<\/workbook>$/);
  });

  it("should handle special characters in sheet names", () => {
    const workbook = createWorkbook([
      createWorksheet("Sheet & Data", 1),
      createWorksheet("Sheet <1>", 2),
      createWorksheet('Sheet "Quoted"', 3),
    ]);
    const relationships = createRelationships(3);

    const element = serializeWorkbook(workbook, relationships);
    const xml = serializeElement(element);

    // Special characters should be escaped in XML
    expect(xml).toContain("Sheet &amp; Data");
    expect(xml).toContain("Sheet &lt;1&gt;");
    expect(xml).toContain("Sheet &quot;Quoted&quot;");
  });
});

// =============================================================================
// Round-trip Compatibility Tests
// =============================================================================

describe("round-trip compatibility", () => {
  it("should produce consistent output for the same input", () => {
    const workbook = createWorkbook([
      createWorksheet("Sheet1", 1),
      createWorksheet("Sheet2", 2),
    ]);
    const relationships = createRelationships(2);

    const xml1 = serializeElement(serializeWorkbook(workbook, relationships));
    const xml2 = serializeElement(serializeWorkbook(workbook, relationships));

    expect(xml1).toBe(xml2);
  });

  it("should include r:id references correctly", () => {
    const workbook = createWorkbook([
      createWorksheet("Sheet1", 1),
      createWorksheet("Sheet2", 2),
    ]);
    const relationships = createRelationships(2);

    const element = serializeWorkbook(workbook, relationships);
    const xml = serializeElement(element);

    // Verify r:id uses the relationship namespace prefix
    expect(xml).toContain('r:id="rId1"');
    expect(xml).toContain('r:id="rId2"');
  });
});
