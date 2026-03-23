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

import { createElement, parseXml, type XmlElement, type XmlNode } from "@aurochs/xml";
import { createEmptyZipPackage, isBinaryFile, type ZipPackage } from "@aurochs/zip";
import type { XlsxDrawingAnchor, XlsxDrawingContent } from "@aurochs-office/xlsx/domain/drawing/types";
import {
  serializeWithDeclaration,
  serializeRelationships as serializeOpcRelationships,
  serializeContentTypes,
  STANDARD_CONTENT_TYPE_DEFAULTS,
  createRelationshipIdGenerator,
  parseContentTypes,
  listRelationships,
  VBA_PROJECT_RELATIONSHIP_TYPE,
  XL_MACROSHEET_RELATIONSHIP_TYPE,
  SPREADSHEETML_CONTENT_TYPES,
  SPREADSHEETML_RELATIONSHIP_TYPES,
  SPREADSHEETML_NAMESPACES,
  OFFICE_RELATIONSHIP_TYPES,
  DRAWINGML_CONTENT_TYPES,
  inferExtensionFromMediaContentType,
  type OpcRelationship,
  type ContentTypeEntry,
  type ParsedContentTypes,
} from "@aurochs-office/opc";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { serializeWorkbook, serializeStyleSheet, serializeWorksheet, type SharedStringTable } from "./index";
import { serializeDrawing } from "./drawing";

// =============================================================================
// Constants
// =============================================================================

/**
 * Alias for SpreadsheetML content types (from OPC).
 */
const XLSX_CONTENT_TYPES = SPREADSHEETML_CONTENT_TYPES;

/**
 * Determine workbook content type based on macro-enabled flag.
 */
function resolveWorkbookContentType(isMacroEnabled: boolean): string {
  if (isMacroEnabled) {
    return XLSX_CONTENT_TYPES.workbookMacroEnabled;
  }
  return XLSX_CONTENT_TYPES.workbook;
}

// =============================================================================
// Export Options
// =============================================================================

/**
 * OPC media part. Referenced via relationships in drawings.
 *
 * @see ECMA-376 Part 2 (OPC - Open Packaging Conventions)
 */
export type MediaPart = {
  /** Media binary data */
  readonly data: Uint8Array;
  /** MIME content type (e.g., "image/png", "image/jpeg") */
  readonly contentType: string;
};

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

  /**
   * Per-sheet media parts for drawings.
   * Key: sheet index (0-based)
   * Value: Map of drawing relationship ID (XlsxPicture.blipRelId) to MediaPart
   *
   * The exporter generates OPC-compliant media file paths,
   * drawing relationships, and content type registrations.
   */
  readonly sheetMedia?: ReadonlyMap<number, ReadonlyMap<string, MediaPart>>;
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
  /**
   * Additional content type entries (e.g., from drawings, media).
   */
  readonly additionalEntries?: readonly ContentTypeEntry[];
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
  const { sourceContentTypes, additionalEntries } = options;

  // Determine main workbook content type
  // Preserve macroEnabled if source had it (including macro-enabled templates)
  // Template content types (xltx/xltm) are normalized to sheet content types (xlsx/xlsm)
  // because the output is always a workbook, not a template
  const sourceWorkbookContentType = sourceContentTypes?.overrides.get("/xl/workbook.xml");
  const isMacroEnabled =
    sourceWorkbookContentType === XLSX_CONTENT_TYPES.workbookMacroEnabled ||
    sourceWorkbookContentType === XLSX_CONTENT_TYPES.workbookMacroEnabledTemplate;
  const workbookContentType = resolveWorkbookContentType(isMacroEnabled);

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

  // Append additional entries (drawings, media, etc.)
  if (additionalEntries) {
    for (const entry of additionalEntries) {
      // Avoid duplicates
      if (entry.kind === "default") {
        const hasDefault = entries.some(
          (e) => e.kind === "default" && e.extension === entry.extension,
        );
        if (!hasDefault) {
          entries.push(entry);
        }
      } else {
        const hasOverride = entries.some(
          (e) => e.kind === "override" && (e as { partName: string }).partName === entry.partName,
        );
        if (!hasOverride) {
          entries.push(entry);
        }
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
      if (path === pattern) {return true;}
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
// Drawing Export Plan
// =============================================================================

/**
 * A media entry to be written to the package.
 */
type MediaEntry = {
  readonly relId: string;
  readonly partPath: string;
  readonly data: Uint8Array;
  readonly contentType: string;
};

/**
 * Drawing export information for a single sheet.
 */
type DrawingPartPlan = {
  readonly sheetIndex: number;
  readonly drawingPartPath: string;
  readonly drawingXml: XmlElement;
  readonly mediaEntries: readonly MediaEntry[];
  readonly drawingRelationships: readonly OpcRelationship[];
  readonly sheetDrawingRelationship: OpcRelationship;
  readonly drawingRelId: string;
};

/**
 * Complete drawing export plan.
 */
type DrawingExportPlan = {
  readonly drawingParts: readonly DrawingPartPlan[];
  readonly additionalContentTypes: readonly ContentTypeEntry[];
};

/** Infer file extension from MIME content type (delegates to OPC SoT) */
const inferExtensionFromContentType = inferExtensionFromMediaContentType;

/**
 * Compute OPC relationship file path for a given part.
 *
 * @see ECMA-376 Part 2, Section 9.2 (Relationship Part Naming)
 */
function relsPathFor(partPath: string): string {
  const lastSlash = partPath.lastIndexOf("/");
  const dir = partPath.substring(0, lastSlash);
  const filename = partPath.substring(lastSlash + 1);
  return `${dir}/_rels/${filename}.rels`;
}

/**
 * Build a relative target path from source to target within the package.
 */
function buildRelativeTarget(sourcePart: string, targetPart: string): string {
  const sourceDir = sourcePart.substring(0, sourcePart.lastIndexOf("/"));
  const targetDir = targetPart.substring(0, targetPart.lastIndexOf("/"));
  const targetFile = targetPart.substring(targetPart.lastIndexOf("/") + 1);

  if (sourceDir === targetDir) {
    return targetFile;
  }

  // Count common prefix depth
  const sourceParts = sourceDir.split("/");
  const targetParts = targetDir.split("/");
  const common = { value: 0 };
  while (common.value < sourceParts.length && common.value < targetParts.length && sourceParts[common.value] === targetParts[common.value]) {
    common.value++;
  }

  const ups = sourceParts.length - common.value;
  const downs = targetParts.slice(common.value);
  return [...Array(ups).fill(".."), ...downs, targetFile].join("/");
}

/**
 * Collect all blipRelIds from a drawing's anchors (recursively for groups).
 */
function collectBlipRelIds(anchors: readonly XlsxDrawingAnchor[]): string[] {
  const relIds: string[] = [];
  for (const anchor of anchors) {
    if (anchor.content) {
      collectContentRelIds(anchor.content, relIds);
    }
  }
  return relIds;
}

function collectContentRelIds(
  content: XlsxDrawingContent,
  relIds: string[],
): void {
  switch (content.type) {
    case "picture":
      if (content.blipRelId) {
        relIds.push(content.blipRelId);
      }
      break;
    case "groupShape":
      for (const child of content.children) {
        collectContentRelIds(child, relIds);
      }
      break;
  }
}

/**
 * Build the complete drawing export plan from workbook domain objects.
 *
 * This function constructs all OPC objects (relationships, content types, paths)
 * without writing anything. The exporter then writes the plan to the package.
 */
function buildDrawingExportPlan(
  workbook: XlsxWorkbook,
  sheetMedia?: ReadonlyMap<number, ReadonlyMap<string, MediaPart>>,
): DrawingExportPlan {
  const drawingParts: DrawingPartPlan[] = [];
  const mediaDefaultExtensions = new Map<string, string>(); // extension → contentType

  for (let i = 0; i < workbook.sheets.length; i++) {
    const sheet = workbook.sheets[i];
    if (!sheet.drawing || sheet.drawing.anchors.length === 0) {
      continue;
    }

    const sheetIndex = i + 1; // 1-based
    const drawingPartPath = `xl/drawings/drawing${sheetIndex}.xml`;
    const sheetPartPath = `xl/worksheets/sheet${sheetIndex}.xml`;

    // Serialize drawing XML
    const drawingXml = serializeDrawing(sheet.drawing);

    // Collect media entries
    const mediaEntries: MediaEntry[] = [];
    const drawingRelationships: OpcRelationship[] = [];
    const sheetMediaMap = sheetMedia?.get(i);

    const blipRelIds = collectBlipRelIds(sheet.drawing.anchors);
    const mediaCounter = { value: 0 };

    for (const relId of blipRelIds) {
      const mediaPart = sheetMediaMap?.get(relId);
      if (!mediaPart) {
        continue;
      }

      mediaCounter.value++;
      const ext = inferExtensionFromContentType(mediaPart.contentType);
      const mediaPartPath = `xl/media/image_s${sheetIndex}_${mediaCounter.value}.${ext}`;

      mediaEntries.push({
        relId,
        partPath: mediaPartPath,
        data: mediaPart.data,
        contentType: mediaPart.contentType,
      });

      drawingRelationships.push({
        id: relId,
        type: OFFICE_RELATIONSHIP_TYPES.image,
        target: buildRelativeTarget(drawingPartPath, mediaPartPath),
      });

      mediaDefaultExtensions.set(ext, mediaPart.contentType);
    }

    // Drawing relationship from worksheet
    const drawingRelId = `rId_drawing${sheetIndex}`;
    const sheetDrawingRelationship: OpcRelationship = {
      id: drawingRelId,
      type: OFFICE_RELATIONSHIP_TYPES.drawing,
      target: buildRelativeTarget(sheetPartPath, drawingPartPath),
    };

    drawingParts.push({
      sheetIndex,
      drawingPartPath,
      drawingXml,
      mediaEntries,
      drawingRelationships,
      sheetDrawingRelationship,
      drawingRelId,
    });
  }

  // Build additional content types
  const additionalContentTypes: ContentTypeEntry[] = [];

  // Drawing part overrides
  for (const part of drawingParts) {
    additionalContentTypes.push({
      kind: "override",
      partName: `/${part.drawingPartPath}`,
      contentType: DRAWINGML_CONTENT_TYPES.drawing,
    });
  }

  // Media extension defaults
  for (const [extension, contentType] of mediaDefaultExtensions) {
    additionalContentTypes.push({
      kind: "default",
      extension,
      contentType,
    });
  }

  return { drawingParts, additionalContentTypes };
}

/**
 * Parse source content types if available from a source package.
 */
function parseSourceContentTypes(sourcePackage: ZipPackage | undefined): ParsedContentTypes | undefined {
  if (!sourcePackage) {
    return undefined;
  }
  const contentTypesXml = sourcePackage.readText("[Content_Types].xml");
  if (!contentTypesXml) {
    return undefined;
  }
  const contentTypesDoc = parseXml(contentTypesXml);
  return parseContentTypes(contentTypesDoc);
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
  const sourceContentTypes = parseSourceContentTypes(sourcePackage);

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

  // 5. Build drawing export plan
  const drawingPlan = buildDrawingExportPlan(workbook, options.sheetMedia);
  const drawingRelIdBySheet = new Map<number, string>();
  for (const part of drawingPlan.drawingParts) {
    drawingRelIdBySheet.set(part.sheetIndex, part.drawingRelId);
  }

  // 5.1. Generate each xl/worksheets/sheet*.xml (and per-sheet rels)
  for (let i = 0; i < workbook.sheets.length; i++) {
    const sheet = workbook.sheets[i];
    const sheetIndex = i + 1;
    const drawingRelId = drawingRelIdBySheet.get(sheetIndex);
    const worksheetXml = serializeWorksheet(sheet, sharedStringsBuilder, drawingRelId);
    pkg.writeText(`xl/worksheets/sheet${sheetIndex}.xml`, serializeWithDeclaration(worksheetXml));

    // Collect per-sheet relationships (hyperlinks + drawing)
    const sheetRels: OpcRelationship[] = [];

    // External hyperlinks
    const externalHyperlinks = sheet.hyperlinks?.filter((h) => h.relationshipId && h.target);
    if (externalHyperlinks && externalHyperlinks.length > 0) {
      for (const h of externalHyperlinks) {
        sheetRels.push({
          id: h.relationshipId!,
          type: XLSX_RELATIONSHIP_TYPES.hyperlink,
          target: h.target!,
          targetMode: "External" as const,
        });
      }
    }

    // Drawing relationship
    const drawingPart = drawingPlan.drawingParts.find((p) => p.sheetIndex === sheetIndex);
    if (drawingPart) {
      sheetRels.push(drawingPart.sheetDrawingRelationship);
    }

    if (sheetRels.length > 0) {
      const sheetRelsXml = serializeOpcRelationships(sheetRels);
      pkg.writeText(`xl/worksheets/_rels/sheet${sheetIndex}.xml.rels`, serializeWithDeclaration(sheetRelsXml));
    }
  }

  // 5.2. Write drawing parts and media files
  for (const part of drawingPlan.drawingParts) {
    // Drawing XML
    pkg.writeText(part.drawingPartPath, serializeWithDeclaration(part.drawingXml));

    // Media files
    for (const media of part.mediaEntries) {
      pkg.writeBinary(media.partPath, media.data);
    }

    // Drawing relationships
    if (part.drawingRelationships.length > 0) {
      const drawingRelsXml = serializeOpcRelationships(part.drawingRelationships);
      pkg.writeText(relsPathFor(part.drawingPartPath), serializeWithDeclaration(drawingRelsXml));
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
  const contentTypesXml = generateContentTypes(workbook, {
    sourceContentTypes,
    additionalEntries: drawingPlan.additionalContentTypes,
  });
  pkg.writeText("[Content_Types].xml", serializeWithDeclaration(contentTypesXml));

  // 10. Write ZIP package
  const buffer = await pkg.toArrayBuffer({ compressionLevel: 6 });
  return new Uint8Array(buffer);
}
