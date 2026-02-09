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

import type { XmlElement, XmlNode } from "@aurochs/xml";
import { createElement } from "@aurochs-builder/core";
import { createEmptyZipPackage } from "@aurochs/zip";
import {
  serializeWithDeclaration,
  serializeRelationships as serializeOpcRelationships,
  serializeContentTypes,
  STANDARD_CONTENT_TYPE_DEFAULTS,
  createRelationshipIdGenerator,
  type OpcRelationship,
  type ContentTypeEntry,
} from "@aurochs-office/opc";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { serializeWorkbook, serializeStyleSheet, serializeWorksheet, type SharedStringTable } from "./index";

// =============================================================================
// Constants
// =============================================================================

/**
 * SpreadsheetML-specific content types.
 */
const XLSX_CONTENT_TYPES = {
  workbook: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
  worksheet: "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
  styles: "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
  sharedStrings: "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml",
} as const;

/**
 * SpreadsheetML-specific relationship type URIs.
 */
const XLSX_RELATIONSHIP_TYPES = {
  officeDocument: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
  worksheet: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
  styles: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
  sharedStrings: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings",
  hyperlink: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
} as const;

/**
 * SpreadsheetML namespace URI
 */
const SPREADSHEETML_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

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
export function collectSharedStrings(workbook: XlsxWorkbook): SharedStringTable & { getStrings(): readonly string[] } {
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
  const entries: ContentTypeEntry[] = [
    // Standard defaults (rels, xml)
    ...STANDARD_CONTENT_TYPE_DEFAULTS,
    // Workbook
    { kind: "override", partName: "/xl/workbook.xml", contentType: XLSX_CONTENT_TYPES.workbook },
    // Worksheets
    ...workbook.sheets.map(
      (_, index): ContentTypeEntry => ({
        kind: "override",
        partName: `/xl/worksheets/sheet${index + 1}.xml`,
        contentType: XLSX_CONTENT_TYPES.worksheet,
      }),
    ),
    // Styles
    { kind: "override", partName: "/xl/styles.xml", contentType: XLSX_CONTENT_TYPES.styles },
    // Shared strings
    { kind: "override", partName: "/xl/sharedStrings.xml", contentType: XLSX_CONTENT_TYPES.sharedStrings },
  ];

  return serializeContentTypes(entries);
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
  const relationships: OpcRelationship[] = [
    {
      id: "rId1",
      type: XLSX_RELATIONSHIP_TYPES.officeDocument,
      target: "xl/workbook.xml",
    },
  ];

  return serializeOpcRelationships(relationships);
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
  const relationships: OpcRelationship[] = [];
  const nextId = createRelationshipIdGenerator();

  // Relationships for each worksheet
  for (let i = 0; i < workbook.sheets.length; i++) {
    relationships.push({
      id: nextId(),
      type: XLSX_RELATIONSHIP_TYPES.worksheet,
      target: `worksheets/sheet${i + 1}.xml`,
    });
  }

  // Relationship for styles
  relationships.push({
    id: nextId(),
    type: XLSX_RELATIONSHIP_TYPES.styles,
    target: "styles.xml",
  });

  // Relationship for sharedStrings
  relationships.push({
    id: nextId(),
    type: XLSX_RELATIONSHIP_TYPES.sharedStrings,
    target: "sharedStrings.xml",
  });

  return serializeOpcRelationships(relationships);
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
    createElement("si", {}, [createElement("t", {}, [{ type: "text", value: str }])]),
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

  // 4. Generate each xl/worksheets/sheet*.xml (and per-sheet rels for hyperlinks)
  for (let i = 0; i < workbook.sheets.length; i++) {
    const sheet = workbook.sheets[i];
    const worksheetXml = serializeWorksheet(sheet, sharedStringsBuilder);
    pkg.writeText(`xl/worksheets/sheet${i + 1}.xml`, serializeWithDeclaration(worksheetXml));

    // Generate per-sheet relationships for external hyperlinks
    const externalHyperlinks = sheet.hyperlinks?.filter((h) => h.relationshipId && h.target);
    if (externalHyperlinks && externalHyperlinks.length > 0) {
      const sheetRels: OpcRelationship[] = externalHyperlinks.map((h) => ({
        id: h.relationshipId!,
        type: XLSX_RELATIONSHIP_TYPES.hyperlink,
        target: h.target!,
        targetMode: "External" as const,
      }));
      const sheetRelsXml = serializeOpcRelationships(sheetRels);
      pkg.writeText(`xl/worksheets/_rels/sheet${i + 1}.xml.rels`, serializeWithDeclaration(sheetRelsXml));
    }
  }

  // 5. Generate xl/workbook.xml
  const sheetRelationships = buildSheetRelationships(workbook);
  const workbookXml = serializeWorkbook(workbook, sheetRelationships);
  pkg.writeText("xl/workbook.xml", serializeWithDeclaration(workbookXml));

  // 6. Generate xl/_rels/workbook.xml.rels
  const workbookRelsXml = generateWorkbookRels(workbook);
  pkg.writeText("xl/_rels/workbook.xml.rels", serializeWithDeclaration(workbookRelsXml));

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
