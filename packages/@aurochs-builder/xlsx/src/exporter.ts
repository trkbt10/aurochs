/**
 * @file XLSX Exporter
 *
 * Generates XLSX (Office Open XML SpreadsheetML) packages from XlsxWorkbook.
 * Creates OPC-compliant ZIP packages with proper content types and relationships.
 * Supports macro-enabled formats (xlsm) via pass-through preservation.
 *
 * @see ECMA-376 Part 2 (OPC - Open Packaging Conventions)
 * @see ECMA-376 Part 2, Section 10.1.2.1 (Content Types)
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 * @see ECMA-376 Part 4 (SpreadsheetML)
 * @see MS-OFFMACRO2 (Office Macro-Enabled File Format)
 */

import type { XmlElement, XmlNode } from "@aurochs/xml";
import { parseXml } from "@aurochs/xml";
import { createElement } from "@aurochs-builder/core";
import { createEmptyZipPackage, isBinaryFile, type ZipPackage } from "@aurochs/zip";
import {
  serializeWithDeclaration,
  serializeRelationships as serializeOpcRelationships,
  serializeContentTypes,
  STANDARD_CONTENT_TYPE_DEFAULTS,
  createRelationshipIdGenerator,
  parseContentTypes,
  contentTypesToEntries,
  listRelationships,
  VBA_PROJECT_RELATIONSHIP_TYPE,
  XL_MACROSHEET_RELATIONSHIP_TYPE,
  SPREADSHEETML_CONTENT_TYPES,
  SPREADSHEETML_RELATIONSHIP_TYPES,
  SPREADSHEETML_NAMESPACES,
  OFFICE_RELATIONSHIP_TYPES,
  type OpcRelationship,
  type ContentTypeEntry,
  type ParsedContentTypes,
} from "@aurochs-office/opc";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { serializeWorkbook, serializeStyleSheet, serializeWorksheet, type SharedStringTable } from "./index";

// =============================================================================
// Constants
// =============================================================================

/**
 * Alias for SpreadsheetML content types (from OPC).
 */
const XLSX_CONTENT_TYPES = SPREADSHEETML_CONTENT_TYPES;

// =============================================================================
// Export Options
// =============================================================================

/**
 * Options for XLSX export.
 */
export type ExportXlsxOptions = {
  /**
   * Source package to preserve macro-related parts from.
   * When provided, all files from the source are copied first,
   * then the edited files are overwritten.
   *
   * This enables macro preservation for xlsm files.
   */
  readonly sourcePackage?: ZipPackage;
};

/**
 * SpreadsheetML-specific relationship type URIs (alias from OPC).
 */
const XLSX_RELATIONSHIP_TYPES = {
  officeDocument: OFFICE_RELATIONSHIP_TYPES.officeDocument,
  worksheet: SPREADSHEETML_RELATIONSHIP_TYPES.worksheet,
  styles: OFFICE_RELATIONSHIP_TYPES.styles,
  sharedStrings: SPREADSHEETML_RELATIONSHIP_TYPES.sharedStrings,
  hyperlink: OFFICE_RELATIONSHIP_TYPES.hyperlink,
} as const;

/**
 * SpreadsheetML namespace URI (alias from OPC)
 */
const SPREADSHEETML_NS = SPREADSHEETML_NAMESPACES.main;

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
 * Options for content types generation.
 */
type GenerateContentTypesOptions = {
  /**
   * Parsed content types from source package.
   * Used to preserve macro-related content types.
   */
  readonly sourceContentTypes?: ParsedContentTypes;
};

/**
 * Generate [Content_Types].xml element.
 *
 * When sourceContentTypes is provided, preserves entries for macro-related parts
 * (vbaProject.bin, macrosheets, etc.) and the macroEnabled main content type.
 *
 * @param workbook - The workbook to generate content types for
 * @param options - Generation options
 * @returns XmlElement for [Content_Types].xml
 *
 * @see ECMA-376 Part 2, Section 10.1.2.1 (Content Types)
 * @see MS-OFFMACRO2 Section 2.2.1.3 (macroEnabled content types)
 */
export function generateContentTypes(
  workbook: XlsxWorkbook,
  options: GenerateContentTypesOptions = {},
): XmlElement {
  const { sourceContentTypes } = options;

  // Determine main workbook content type
  // Preserve macroEnabled if source had it
  const sourceWorkbookContentType = sourceContentTypes?.overrides.get("/xl/workbook.xml");
  const isMacroEnabled = sourceWorkbookContentType === XLSX_CONTENT_TYPES.workbookMacroEnabled;
  const workbookContentType = isMacroEnabled
    ? XLSX_CONTENT_TYPES.workbookMacroEnabled
    : XLSX_CONTENT_TYPES.workbook;

  const entries: ContentTypeEntry[] = [
    // Standard defaults (rels, xml)
    ...STANDARD_CONTENT_TYPE_DEFAULTS,
    // Workbook (macroEnabled or standard)
    { kind: "override", partName: "/xl/workbook.xml", contentType: workbookContentType },
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

  // If we have source content types, preserve macro-related entries
  if (sourceContentTypes) {
    // Preserve defaults we don't generate (like .bin for vbaProject)
    for (const [extension, contentType] of sourceContentTypes.defaults) {
      const hasDefault = entries.some(
        (e) => e.kind === "default" && e.extension === extension,
      );
      if (!hasDefault) {
        entries.push({ kind: "default", extension, contentType });
      }
    }

    // Preserve overrides we don't generate (vbaProject.bin, macrosheets, etc.)
    const generatedPartNames = new Set(
      entries.filter((e) => e.kind === "override").map((e) => (e as { partName: string }).partName),
    );
    for (const [partName, contentType] of sourceContentTypes.overrides) {
      if (!generatedPartNames.has(partName)) {
        entries.push({ kind: "override", partName, contentType });
      }
    }
  }

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
 * Options for workbook relationships generation.
 */
type GenerateWorkbookRelsOptions = {
  /**
   * Source package to read existing relationships from.
   * Used to preserve macro-related relationships (vbaProject, xlMacrosheet).
   */
  readonly sourcePackage?: ZipPackage;
};

/**
 * Relationship types that should be preserved from source (macro-related).
 */
const PRESERVE_RELATIONSHIP_TYPES = new Set([
  VBA_PROJECT_RELATIONSHIP_TYPE,
  XL_MACROSHEET_RELATIONSHIP_TYPE,
]);

/**
 * Generate xl/_rels/workbook.xml.rels element.
 *
 * When sourcePackage is provided, preserves macro-related relationships
 * (vbaProject, xlMacrosheet) from the source.
 *
 * @param workbook - The workbook to generate relationships for
 * @param options - Generation options
 * @returns XmlElement for xl/_rels/workbook.xml.rels
 *
 * @see ECMA-376 Part 2, Section 9.2 (Relationships)
 * @see MS-OFFMACRO2 Section 2.2.1.4 (vbaProject relationship)
 * @see MS-OFFMACRO2 Section 2.2.1.5 (xlMacrosheet relationship)
 */
export function generateWorkbookRels(
  workbook: XlsxWorkbook,
  options: GenerateWorkbookRelsOptions = {},
): XmlElement {
  const { sourcePackage } = options;

  const relationships: OpcRelationship[] = [];
  const usedIds = new Set<string>();
  const nextId = createRelationshipIdGenerator();

  // Helper to get next available ID
  const getNextId = (): string => {
    // eslint-disable-next-line no-constant-condition -- generator loop
    while (true) {
      const id = nextId();
      if (!usedIds.has(id)) {
        usedIds.add(id);
        return id;
      }
    }
  };

  // First, preserve macro-related relationships from source
  if (sourcePackage) {
    const relsXml = sourcePackage.readText("xl/_rels/workbook.xml.rels");
    if (relsXml) {
      const relsDoc = parseXml(relsXml);
      const sourceRels = listRelationships(relsDoc);
      for (const rel of sourceRels) {
        if (PRESERVE_RELATIONSHIP_TYPES.has(rel.type)) {
          relationships.push({
            id: rel.id,
            type: rel.type,
            target: rel.target,
            targetMode: rel.targetMode,
          });
          usedIds.add(rel.id);
        }
      }
    }
  }

  // Relationships for each worksheet
  for (let i = 0; i < workbook.sheets.length; i++) {
    relationships.push({
      id: getNextId(),
      type: XLSX_RELATIONSHIP_TYPES.worksheet,
      target: `worksheets/sheet${i + 1}.xml`,
    });
  }

  // Relationship for styles
  relationships.push({
    id: getNextId(),
    type: XLSX_RELATIONSHIP_TYPES.styles,
    target: "styles.xml",
  });

  // Relationship for sharedStrings
  relationships.push({
    id: getNextId(),
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
// Pass-through Helpers
// =============================================================================

/**
 * Files that are always regenerated (not copied from source).
 * These are the core workbook structure files.
 */
const REGENERATED_FILE_PATTERNS = [
  "[Content_Types].xml",
  "_rels/.rels",
  "xl/workbook.xml",
  "xl/_rels/workbook.xml.rels",
  "xl/styles.xml",
  "xl/sharedStrings.xml",
  /^xl\/worksheets\/sheet\d+\.xml$/,
  /^xl\/worksheets\/_rels\/sheet\d+\.xml\.rels$/,
];

/**
 * Check if a file should be regenerated (not copied from source).
 */
function isRegeneratedFile(path: string): boolean {
  for (const pattern of REGENERATED_FILE_PATTERNS) {
    if (typeof pattern === "string") {
      if (path === pattern) return true;
    } else if (pattern.test(path)) {
      return true;
    }
  }
  return false;
}

/**
 * Copy all files from source package to destination, except regenerated files.
 *
 * This enables pass-through preservation of macro-related parts
 * (vbaProject.bin, macrosheets, etc.) and other unknown parts.
 */
function copySourcePackageFiles(source: ZipPackage, dest: ZipPackage): void {
  const files = source.listFiles();
  for (const path of files) {
    if (isRegeneratedFile(path)) {
      continue;
    }
    if (isBinaryFile(path)) {
      const content = source.readBinary(path);
      if (content) {
        dest.writeBinary(path, content);
      }
    } else {
      const content = source.readText(path);
      if (content) {
        dest.writeText(path, content);
      }
    }
  }
}

// =============================================================================
// Main Export Function
// =============================================================================

/**
 * Export an XlsxWorkbook to a XLSX package (ZIP archive).
 *
 * This is the main entry point for XLSX export.
 *
 * When options.sourcePackage is provided (pass-through mode):
 * - All files from source are copied first (preserving macros, etc.)
 * - Only the core workbook files are regenerated
 * - Macro-related content types and relationships are preserved
 *
 * Export order:
 * 1. Copy source files (if pass-through mode)
 * 2. Build SharedStrings table from all sheet string cells
 * 3. Generate xl/sharedStrings.xml
 * 4. Generate xl/styles.xml
 * 5. Generate each xl/worksheets/sheet*.xml
 * 6. Generate xl/workbook.xml
 * 7. Generate xl/_rels/workbook.xml.rels
 * 8. Generate _rels/.rels
 * 9. Generate [Content_Types].xml
 * 10. Write all files to ZIP package
 *
 * @param workbook - The workbook to export
 * @param options - Export options (optional)
 * @returns Uint8Array containing the XLSX file data
 *
 * @see ECMA-376 Part 2 (OPC)
 * @see ECMA-376 Part 4 (SpreadsheetML)
 * @see MS-OFFMACRO2 (macro-enabled format preservation)
 *
 * @example
 * ```typescript
 * // Standard export (new file)
 * const xlsxData = await exportXlsx(workbook);
 *
 * // Pass-through export (preserve macros from source)
 * const xlsmData = await exportXlsx(workbook, { sourcePackage });
 * ```
 */
export async function exportXlsx(
  workbook: XlsxWorkbook,
  options: ExportXlsxOptions = {},
): Promise<Uint8Array> {
  const { sourcePackage } = options;
  const pkg = createEmptyZipPackage();

  // 0. Parse source content types for preservation (if pass-through mode)
  let sourceContentTypes: ParsedContentTypes | undefined;
  if (sourcePackage) {
    const contentTypesXml = sourcePackage.readText("[Content_Types].xml");
    if (contentTypesXml) {
      const contentTypesDoc = parseXml(contentTypesXml);
      sourceContentTypes = parseContentTypes(contentTypesDoc);
    }
  }

  // 1. Copy source files (if pass-through mode)
  if (sourcePackage) {
    copySourcePackageFiles(sourcePackage, pkg);
  }

  // 2. Build SharedStrings table from all sheet string cells
  const sharedStringsBuilder = collectSharedStrings(workbook);
  const sharedStrings = sharedStringsBuilder.getStrings();

  // 3. Generate xl/sharedStrings.xml
  const sharedStringsXml = generateSharedStrings(sharedStrings);
  pkg.writeText("xl/sharedStrings.xml", serializeWithDeclaration(sharedStringsXml));

  // 4. Generate xl/styles.xml
  const stylesXml = serializeStyleSheet(workbook.styles);
  pkg.writeText("xl/styles.xml", serializeWithDeclaration(stylesXml));

  // 5. Generate each xl/worksheets/sheet*.xml (and per-sheet rels for hyperlinks)
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

  // 6. Generate xl/workbook.xml
  const sheetRelationships = buildSheetRelationships(workbook);
  const workbookXml = serializeWorkbook(workbook, sheetRelationships);
  pkg.writeText("xl/workbook.xml", serializeWithDeclaration(workbookXml));

  // 7. Generate xl/_rels/workbook.xml.rels (preserve macro relationships)
  const workbookRelsXml = generateWorkbookRels(workbook, { sourcePackage });
  pkg.writeText("xl/_rels/workbook.xml.rels", serializeWithDeclaration(workbookRelsXml));

  // 8. Generate _rels/.rels
  const rootRelsXml = generateRootRels();
  pkg.writeText("_rels/.rels", serializeWithDeclaration(rootRelsXml));

  // 9. Generate [Content_Types].xml (preserve macro content types)
  const contentTypesXml = generateContentTypes(workbook, { sourceContentTypes });
  pkg.writeText("[Content_Types].xml", serializeWithDeclaration(contentTypesXml));

  // 10. Write ZIP package
  const buffer = await pkg.toArrayBuffer({ compressionLevel: 6 });
  return new Uint8Array(buffer);
}
