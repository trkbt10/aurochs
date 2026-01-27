/**
 * @file Workbook Serializer
 *
 * Serializes XlsxWorkbook to XML elements for workbook.xml generation.
 * Produces ECMA-376 compliant SpreadsheetML workbook elements.
 *
 * @see ECMA-376 Part 4, Section 18.2.28 (workbook)
 * @see ECMA-376 Part 4, Section 18.2.19 (sheet)
 * @see ECMA-376 Part 4, Section 18.2.5 (definedName)
 */

import type { XmlElement, XmlNode } from "@oxen/xml";
import { createElement } from "@oxen/xml";
import type { XlsxWorkbook, XlsxWorksheet, XlsxDefinedName } from "../domain/workbook";

// =============================================================================
// Constants
// =============================================================================

/**
 * SpreadsheetML namespace URI
 */
const SPREADSHEETML_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

/**
 * Office Document Relationships namespace URI
 */
const RELATIONSHIPS_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

// =============================================================================
// Relationship Types
// =============================================================================

/**
 * Relationship entry for serialization.
 *
 * @see ECMA-376 Part 2, Section 9.2 (Relationships)
 */
export type XlsxRelationship = {
  /** Relationship ID (e.g., "rId1") */
  readonly id: string;
  /** Relationship type URL */
  readonly type: string;
  /** Target path (e.g., "worksheets/sheet1.xml") */
  readonly target: string;
};

// =============================================================================
// FileVersion Serialization
// =============================================================================

/**
 * Serialize the fileVersion element.
 *
 * @returns XmlElement for the fileVersion
 *
 * @see ECMA-376 Part 4, Section 18.2.10 (fileVersion)
 *
 * @example
 * <fileVersion appName="xl" lastEdited="7" lowestEdited="7" rupBuild="24729"/>
 */
function serializeFileVersion(): XmlElement {
  return createElement("fileVersion", {
    appName: "xl",
    lastEdited: "7",
    lowestEdited: "7",
    rupBuild: "24729",
  });
}

// =============================================================================
// WorkbookPr Serialization
// =============================================================================

/**
 * Serialize the workbookPr element.
 *
 * @returns XmlElement for the workbookPr
 *
 * @see ECMA-376 Part 4, Section 18.2.27 (workbookPr)
 *
 * @example
 * <workbookPr defaultThemeVersion="166925"/>
 */
function serializeWorkbookPr(): XmlElement {
  return createElement("workbookPr", {
    defaultThemeVersion: "166925",
  });
}

// =============================================================================
// BookViews Serialization
// =============================================================================

/**
 * Serialize the bookViews element.
 *
 * @returns XmlElement for the bookViews
 *
 * @see ECMA-376 Part 4, Section 18.2.1 (bookViews)
 *
 * @example
 * <bookViews>
 *   <workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="12300"/>
 * </bookViews>
 */
function serializeBookViews(): XmlElement {
  const workbookView = createElement("workbookView", {
    xWindow: "0",
    yWindow: "0",
    windowWidth: "28800",
    windowHeight: "12300",
  });

  return createElement("bookViews", {}, [workbookView]);
}

// =============================================================================
// Sheet Serialization
// =============================================================================

/**
 * Serialize a single sheet element.
 *
 * @param sheet - Worksheet to serialize
 * @param relationshipId - Relationship ID for this sheet
 * @returns XmlElement for the sheet
 *
 * @see ECMA-376 Part 4, Section 18.2.19 (sheet)
 *
 * @example
 * <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
 * <sheet name="Hidden" sheetId="2" state="hidden" r:id="rId2"/>
 */
function serializeSheet(
  sheet: XlsxWorksheet,
  relationshipId: string,
): XmlElement {
  const attrs: Record<string, string> = {
    name: sheet.name,
    sheetId: String(sheet.sheetId),
  };

  // state attribute: visible is omitted, hidden/veryHidden are included
  if (sheet.state === "hidden") {
    attrs.state = "hidden";
  } else if (sheet.state === "veryHidden") {
    attrs.state = "veryHidden";
  }
  // "visible" is default, omit it

  // r:id attribute for relationship
  attrs["r:id"] = relationshipId;

  return createElement("sheet", attrs);
}

/**
 * Serialize sheets collection.
 *
 * @param sheets - Worksheets to serialize
 * @param sheetRelationships - Map from sheet index (0-based) to relationship ID
 * @returns XmlElement for the sheets collection
 *
 * @see ECMA-376 Part 4, Section 18.2.20 (sheets)
 *
 * @example
 * <sheets>
 *   <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
 *   <sheet name="Sheet2" sheetId="2" r:id="rId2"/>
 * </sheets>
 */
export function serializeSheets(
  sheets: readonly XlsxWorksheet[],
  sheetRelationships: ReadonlyMap<number, string>,
): XmlElement {
  const children: XmlNode[] = sheets.map((sheet, index) => {
    const relationshipId = sheetRelationships.get(index);
    if (relationshipId === undefined) {
      throw new Error(`Missing relationship ID for sheet at index ${index}`);
    }
    return serializeSheet(sheet, relationshipId);
  });

  return createElement("sheets", {}, children);
}

// =============================================================================
// DefinedName Serialization
// =============================================================================

/**
 * Serialize a single definedName element.
 *
 * @param definedName - Defined name to serialize
 * @returns XmlElement for the definedName
 *
 * @see ECMA-376 Part 4, Section 18.2.5 (definedName)
 *
 * @example
 * <definedName name="PrintArea" localSheetId="0">Sheet1!$A$1:$D$10</definedName>
 * <definedName name="GlobalName">Sheet1!$A$1</definedName>
 * <definedName name="HiddenName" hidden="1">Sheet1!$B$2</definedName>
 */
function serializeDefinedName(definedName: XlsxDefinedName): XmlElement {
  const attrs: Record<string, string> = {
    name: definedName.name,
  };

  // localSheetId for sheet-scoped names
  if (definedName.localSheetId !== undefined) {
    attrs.localSheetId = String(definedName.localSheetId);
  }

  // hidden attribute
  if (definedName.hidden === true) {
    attrs.hidden = "1";
  }

  // The formula/value is the text content
  const textNode: XmlNode = {
    type: "text",
    value: definedName.formula,
  };

  return {
    type: "element",
    name: "definedName",
    attrs,
    children: [textNode],
  };
}

/**
 * Serialize definedNames collection.
 *
 * Returns undefined if the array is empty (element should be omitted).
 *
 * @param definedNames - Defined names to serialize
 * @returns XmlElement for the definedNames collection, or undefined if empty
 *
 * @see ECMA-376 Part 4, Section 18.2.6 (definedNames)
 *
 * @example
 * <definedNames>
 *   <definedName name="PrintArea">Sheet1!$A$1:$D$10</definedName>
 * </definedNames>
 */
export function serializeDefinedNames(
  definedNames: readonly XlsxDefinedName[],
): XmlElement | undefined {
  if (definedNames.length === 0) {
    return undefined;
  }

  const children: XmlNode[] = definedNames.map(serializeDefinedName);
  return createElement("definedNames", {}, children);
}

// =============================================================================
// CalcPr Serialization
// =============================================================================

/**
 * Serialize the calcPr element.
 *
 * @returns XmlElement for the calcPr
 *
 * @see ECMA-376 Part 4, Section 18.2.2 (calcPr)
 *
 * @example
 * <calcPr calcId="191029"/>
 */
function serializeCalcPr(): XmlElement {
  return createElement("calcPr", {
    calcId: "191029",
  });
}

// =============================================================================
// Relationships Serialization
// =============================================================================

/**
 * Serialize a single Relationship element.
 *
 * @param relationship - Relationship to serialize
 * @returns XmlElement for the Relationship
 *
 * @see ECMA-376 Part 2, Section 9.2 (Relationships)
 *
 * @example
 * <Relationship Id="rId1" Type="..." Target="worksheets/sheet1.xml"/>
 */
function serializeRelationship(relationship: XlsxRelationship): XmlElement {
  return createElement("Relationship", {
    Id: relationship.id,
    Type: relationship.type,
    Target: relationship.target,
  });
}

/**
 * Serialize Relationships element for .rels files.
 *
 * @param relationships - Relationships to serialize
 * @returns XmlElement for the Relationships collection
 *
 * @see ECMA-376 Part 2, Section 9.2 (Relationships)
 *
 * @example
 * <Relationships xmlns="...">
 *   <Relationship Id="rId1" Type="..." Target="worksheets/sheet1.xml"/>
 * </Relationships>
 */
export function serializeRelationships(
  relationships: readonly XlsxRelationship[],
): XmlElement {
  const children: XmlNode[] = relationships.map(serializeRelationship);

  return createElement(
    "Relationships",
    { xmlns: "http://schemas.openxmlformats.org/package/2006/relationships" },
    children,
  );
}

// =============================================================================
// Workbook Serialization (Main Entry Point)
// =============================================================================

/**
 * Serialize XlsxWorkbook to an XML workbook element.
 *
 * Child element order (ECMA-376 Part 4, Section 18.2.28):
 * 1. fileVersion
 * 2. fileSharing (not implemented)
 * 3. workbookPr
 * 4. workbookProtection (not implemented)
 * 5. bookViews
 * 6. sheets
 * 7. functionGroups (not implemented)
 * 8. externalReferences (not implemented)
 * 9. definedNames
 * 10. calcPr
 *
 * @param workbook - Workbook to serialize
 * @param sheetRelationships - Map from sheet index (0-based) to relationship ID
 * @returns XmlElement for the workbook
 *
 * @see ECMA-376 Part 4, Section 18.2.28 (workbook)
 *
 * @example
 * ```typescript
 * const workbook: XlsxWorkbook = { ... };
 * const relationships = new Map([[0, "rId1"], [1, "rId2"]]);
 * serializeWorkbook(workbook, relationships)
 * // => <workbook xmlns="..." xmlns:r="...">...</workbook>
 * ```
 */
export function serializeWorkbook(
  workbook: XlsxWorkbook,
  sheetRelationships: ReadonlyMap<number, string>,
): XmlElement {
  const children: XmlNode[] = [];

  // 1. fileVersion
  children.push(serializeFileVersion());

  // 3. workbookPr
  children.push(serializeWorkbookPr());

  // 5. bookViews
  children.push(serializeBookViews());

  // 6. sheets
  children.push(serializeSheets(workbook.sheets, sheetRelationships));

  // 9. definedNames (optional)
  if (workbook.definedNames && workbook.definedNames.length > 0) {
    const definedNamesElement = serializeDefinedNames(workbook.definedNames);
    if (definedNamesElement !== undefined) {
      children.push(definedNamesElement);
    }
  }

  // 10. calcPr
  children.push(serializeCalcPr());

  return createElement(
    "workbook",
    {
      xmlns: SPREADSHEETML_NS,
      "xmlns:r": RELATIONSHIPS_NS,
    },
    children,
  );
}
