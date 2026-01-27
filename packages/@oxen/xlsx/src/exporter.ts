/**
 * @file XLSX Exporter
 *
 * Generates XLSX (Office Open XML SpreadsheetML) packages from XlsxWorkbook.
 * Creates OPC-compliant ZIP packages with proper content types and relationships.
 *
 * @see ECMA-376 Part 2 (OPC - Open Packaging Conventions)
 * @see ECMA-376 Part 2, Section 10.1.2.1 (Content Types)
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 * @see ECMA-376 Part 4 (SpreadsheetML)
 */

import type { XmlElement, XmlNode } from "@oxen/xml";
import { serializeElement, createElement } from "@oxen/xml";
import { createEmptyZipPackage } from "@oxen/zip";
import type { XlsxWorkbook } from "./domain/workbook";
import { serializeWorkbook, type XlsxRelationship, serializeRelationships } from "./serializer/workbook";
import { serializeStyleSheet } from "./serializer/styles";
import { serializeWorksheet } from "./serializer/worksheet";
import type { SharedStringTable } from "./serializer/cell";

// =============================================================================
// Constants
// =============================================================================

/**
 * XML declaration for all XML files
 */
const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/**
 * Content type namespaces and types
 */
const CONTENT_TYPES = {
  namespace: "http://schemas.openxmlformats.org/package/2006/content-types",
  rels: "application/vnd.openxmlformats-package.relationships+xml",
  xml: "application/xml",
  workbook: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
  worksheet: "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
  styles: "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
  sharedStrings: "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml",
} as const;

/**
 * Relationship type URIs
 */
const RELATIONSHIP_TYPES = {
  officeDocument: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
  worksheet: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
  styles: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
  sharedStrings: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings",
} as const;

/**
 * SpreadsheetML namespace URI
 */
const SPREADSHEETML_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Serialize an XmlElement to string with XML declaration.
 */
function serializeWithDeclaration(element: XmlElement): string {
  return XML_DECLARATION + serializeElement(element);
}

// =============================================================================
// Shared String Table Builder
// =============================================================================

/**
 * Build a SharedStringTable implementation that tracks string indices.
 */
export function createSharedStringTableBuilder(): SharedStringTable & {
  getStrings(): readonly string[];
} {
  const stringToIndex = new Map<string, number>();
  const strings: string[] = [];

  return {
    getIndex(value: string): number | undefined {
      return stringToIndex.get(value);
    },

    addString(value: string): number {
      const existing = stringToIndex.get(value);
      if (existing !== undefined) {
        return existing;
      }
      const index = strings.length;
      strings.push(value);
      stringToIndex.set(value, index);
      return index;
    },

    getStrings(): readonly string[] {
      return strings;
    },
  };
}

/**
 * Collect all string values from a workbook and build shared string table.
 *
 * @param workbook - The workbook to collect strings from
 * @returns SharedStringTable builder with all strings indexed
 */
export function collectSharedStrings(
  workbook: XlsxWorkbook,
): SharedStringTable & { getStrings(): readonly string[] } {
  const builder = createSharedStringTableBuilder();

  for (const sheet of workbook.sheets) {
    for (const row of sheet.rows) {
      for (const cell of row.cells) {
        if (cell.value.type === "string") {
          builder.addString(cell.value.value);
        }
      }
    }
  }

  return builder;
}

// =============================================================================
// Content Types Generation
// =============================================================================

/**
 * Generate [Content_Types].xml element.
 *
 * @param workbook - The workbook to generate content types for
 * @returns XmlElement for [Content_Types].xml
 *
 * @see ECMA-376 Part 2, Section 10.1.2.1 (Content Types)
 */
export function generateContentTypes(workbook: XlsxWorkbook): XmlElement {
  const children: XmlNode[] = [];

  // Default extensions
  children.push(
    createElement("Default", {
      Extension: "rels",
      ContentType: CONTENT_TYPES.rels,
    }),
  );
  children.push(
    createElement("Default", {
      Extension: "xml",
      ContentType: CONTENT_TYPES.xml,
    }),
  );

  // Override for workbook
  children.push(
    createElement("Override", {
      PartName: "/xl/workbook.xml",
      ContentType: CONTENT_TYPES.workbook,
    }),
  );

  // Override for each worksheet
  workbook.sheets.forEach((_, index) => {
    children.push(
      createElement("Override", {
        PartName: `/xl/worksheets/sheet${index + 1}.xml`,
        ContentType: CONTENT_TYPES.worksheet,
      }),
    );
  });

  // Override for styles
  children.push(
    createElement("Override", {
      PartName: "/xl/styles.xml",
      ContentType: CONTENT_TYPES.styles,
    }),
  );

  // Override for sharedStrings
  children.push(
    createElement("Override", {
      PartName: "/xl/sharedStrings.xml",
      ContentType: CONTENT_TYPES.sharedStrings,
    }),
  );

  return createElement(
    "Types",
    { xmlns: CONTENT_TYPES.namespace },
    children,
  );
}

// =============================================================================
// Root Relationships Generation
// =============================================================================

/**
 * Generate _rels/.rels element (root relationships).
 *
 * @returns XmlElement for _rels/.rels
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export function generateRootRels(): XmlElement {
  const relationships: XlsxRelationship[] = [
    {
      id: "rId1",
      type: RELATIONSHIP_TYPES.officeDocument,
      target: "xl/workbook.xml",
    },
  ];

  return serializeRelationships(relationships);
}

// =============================================================================
// Workbook Relationships Generation
// =============================================================================

/**
 * Generate xl/_rels/workbook.xml.rels element.
 *
 * @param workbook - The workbook to generate relationships for
 * @returns XmlElement for xl/_rels/workbook.xml.rels
 *
 * @see ECMA-376 Part 2, Section 9.2 (Relationships)
 */
export function generateWorkbookRels(workbook: XlsxWorkbook): XmlElement {
  const relationships: XlsxRelationship[] = [];
  const state = { rIdCounter: 1 };
  const nextRelationshipId = (): string => {
    const id = `rId${state.rIdCounter}`;
    state.rIdCounter += 1;
    return id;
  };

  // Relationships for each worksheet
  for (let i = 0; i < workbook.sheets.length; i++) {
    relationships.push({
      id: nextRelationshipId(),
      type: RELATIONSHIP_TYPES.worksheet,
      target: `worksheets/sheet${i + 1}.xml`,
    });
  }

  // Relationship for styles
  relationships.push({
    id: nextRelationshipId(),
    type: RELATIONSHIP_TYPES.styles,
    target: "styles.xml",
  });

  // Relationship for sharedStrings
  relationships.push({
    id: nextRelationshipId(),
    type: RELATIONSHIP_TYPES.sharedStrings,
    target: "sharedStrings.xml",
  });

  return serializeRelationships(relationships);
}

// =============================================================================
// Shared Strings Generation
// =============================================================================

/**
 * Generate xl/sharedStrings.xml element.
 *
 * @param sharedStrings - Array of unique shared strings
 * @returns XmlElement for xl/sharedStrings.xml
 *
 * @see ECMA-376 Part 4, Section 18.4.9 (sst - Shared String Table)
 */
export function generateSharedStrings(sharedStrings: readonly string[]): XmlElement {
  const children: XmlNode[] = sharedStrings.map((str) =>
    createElement("si", {}, [
      createElement("t", {}, [{ type: "text", value: str }]),
    ]),
  );

  return createElement(
    "sst",
    {
      xmlns: SPREADSHEETML_NS,
      count: String(sharedStrings.length),
      uniqueCount: String(sharedStrings.length),
    },
    children,
  );
}

// =============================================================================
// Build Sheet Relationship Map
// =============================================================================

/**
 * Build mapping from sheet index to relationship ID.
 *
 * @param workbook - The workbook to build relationships for
 * @returns Map from sheet index (0-based) to relationship ID
 */
function buildSheetRelationships(workbook: XlsxWorkbook): Map<number, string> {
  const map = new Map<number, string>();
  for (let i = 0; i < workbook.sheets.length; i++) {
    map.set(i, `rId${i + 1}`);
  }
  return map;
}

// =============================================================================
// Main Export Function
// =============================================================================

/**
 * Export an XlsxWorkbook to a XLSX package (ZIP archive).
 *
 * This is the main entry point for XLSX export.
 *
 * Export order:
 * 1. Build SharedStrings table from all sheet string cells
 * 2. Generate xl/sharedStrings.xml
 * 3. Generate xl/styles.xml
 * 4. Generate each xl/worksheets/sheet*.xml
 * 5. Generate xl/workbook.xml
 * 6. Generate xl/_rels/workbook.xml.rels
 * 7. Generate _rels/.rels
 * 8. Generate [Content_Types].xml
 * 9. Write all files to ZIP package
 *
 * @param workbook - The workbook to export
 * @returns Uint8Array containing the XLSX file data
 *
 * @see ECMA-376 Part 2 (OPC)
 * @see ECMA-376 Part 4 (SpreadsheetML)
 *
 * @example
 * ```typescript
 * const workbook: XlsxWorkbook = { ... };
 * const xlsxData = await exportXlsx(workbook);
 * // xlsxData is Uint8Array of the XLSX file
 * ```
 */
export async function exportXlsx(workbook: XlsxWorkbook): Promise<Uint8Array> {
  const pkg = createEmptyZipPackage();

  // 1. Build SharedStrings table from all sheet string cells
  const sharedStringsBuilder = collectSharedStrings(workbook);
  const sharedStrings = sharedStringsBuilder.getStrings();

  // 2. Generate xl/sharedStrings.xml
  const sharedStringsXml = generateSharedStrings(sharedStrings);
  pkg.writeText("xl/sharedStrings.xml", serializeWithDeclaration(sharedStringsXml));

  // 3. Generate xl/styles.xml
  const stylesXml = serializeStyleSheet(workbook.styles);
  pkg.writeText("xl/styles.xml", serializeWithDeclaration(stylesXml));

  // 4. Generate each xl/worksheets/sheet*.xml
  for (let i = 0; i < workbook.sheets.length; i++) {
    const sheet = workbook.sheets[i];
    const worksheetXml = serializeWorksheet(sheet, sharedStringsBuilder);
    pkg.writeText(
      `xl/worksheets/sheet${i + 1}.xml`,
      serializeWithDeclaration(worksheetXml),
    );
  }

  // 5. Generate xl/workbook.xml
  const sheetRelationships = buildSheetRelationships(workbook);
  const workbookXml = serializeWorkbook(workbook, sheetRelationships);
  pkg.writeText("xl/workbook.xml", serializeWithDeclaration(workbookXml));

  // 6. Generate xl/_rels/workbook.xml.rels
  const workbookRelsXml = generateWorkbookRels(workbook);
  pkg.writeText(
    "xl/_rels/workbook.xml.rels",
    serializeWithDeclaration(workbookRelsXml),
  );

  // 7. Generate _rels/.rels
  const rootRelsXml = generateRootRels();
  pkg.writeText("_rels/.rels", serializeWithDeclaration(rootRelsXml));

  // 8. Generate [Content_Types].xml
  const contentTypesXml = generateContentTypes(workbook);
  pkg.writeText("[Content_Types].xml", serializeWithDeclaration(contentTypesXml));

  // 9. Write ZIP package
  const buffer = await pkg.toArrayBuffer({ compressionLevel: 6 });
  return new Uint8Array(buffer);
}
