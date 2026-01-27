/**
 * @file Workbook Parser Integration
 *
 * Parses complete XLSX workbooks by integrating all component parsers.
 * This is the main entry point for parsing XLSX files.
 *
 * Parsing order:
 * 1. xl/_rels/workbook.xml.rels -> relationships
 * 2. xl/sharedStrings.xml -> sharedStrings
 * 3. xl/styles.xml -> styleSheet
 * 4. xl/workbook.xml -> workbookInfo (sheets, definedNames)
 * 5. xl/worksheets/sheet*.xml -> worksheets
 *
 * @see ECMA-376 Part 2 (OPC) - Package Structure
 * @see ECMA-376 Part 2, Section 9 - Relationships
 * @see ECMA-376 Part 4, Section 18.2.28 (workbook)
 */

import type { XlsxWorkbook, XlsxDefinedName, XlsxWorksheet } from "../domain/workbook";
import { createDefaultStyleSheet } from "../domain/style/types";
import type { XlsxTable } from "../domain/table/types";
import type { XlsxSheetInfo, XlsxWorkbookInfo } from "./context";
import { createParseContext } from "./context";
import type { XlsxParseOptions } from "./options";
import { resolveXlsxDateSystem } from "../domain/date-system";
import { parseSharedStrings } from "./shared-strings";
import { parseStyleSheet } from "./styles/index";
import { parseComments } from "./comments";
import { parseTable } from "./table";
import { parseWorksheet } from "./worksheet";
import { parseBooleanAttr, parseIntAttr } from "./primitive";
import type { XmlElement, XmlDocument } from "@oxen/xml";
import { parseXml, getAttr, getChild, getChildren, getTextContent, isXmlElement } from "@oxen/xml";
import { basenamePosixPath, dirnamePosixPath, joinPosixPath, normalizePosixPath } from "@oxen/files";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the root element from an XmlDocument.
 *
 * @param doc - Parsed XML document
 * @returns The root element
 * @throws Error if no root element is found
 */
function getDocumentRoot(doc: XmlDocument): XmlElement {
  const root = doc.children.find((c): c is XmlElement => isXmlElement(c));
  if (!root) {
    throw new Error("No root element found in document");
  }
  return root;
}

// =============================================================================
// Relationship Parsing
// =============================================================================

/**
 * Parse relationships from a rels element.
 *
 * @param relsElement - The root element from workbook.xml.rels
 * @returns Map from relationship ID to target path
 *
 * @see ECMA-376 Part 2, Section 9 (Relationships)
 *
 * @example
 * ```xml
 * <Relationships xmlns="...">
 *   <Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="..."/>
 * </Relationships>
 * ```
 */
export function parseRelationships(relsElement: XmlElement): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  const relationships = getChildren(relsElement, "Relationship");
  for (const rel of relationships) {
    const id = getAttr(rel, "Id");
    const target = getAttr(rel, "Target");
    if (id && target) {
      map.set(id, target);
    }
  }
  return map;
}

type RelationshipInfo = {
  readonly id: string;
  readonly type: string;
  readonly target: string;
  readonly targetMode?: "External" | "Internal";
};

function parseRelationshipInfos(relsElement: XmlElement): readonly RelationshipInfo[] {
  return getChildren(relsElement, "Relationship").flatMap((rel): readonly RelationshipInfo[] => {
    const id = getAttr(rel, "Id");
    const target = getAttr(rel, "Target");
    const type = getAttr(rel, "Type");
    if (!id || !target || !type) {
      return [];
    }
    const targetMode = getAttr(rel, "TargetMode") as RelationshipInfo["targetMode"];
    return [{ id, target, type, targetMode }];
  });
}

// =============================================================================
// Sheet Element Parsing
// =============================================================================

/**
 * Parse a single sheet element into XlsxSheetInfo.
 *
 * @param sheetElement - The <sheet> element from workbook.xml
 * @returns Parsed sheet information
 *
 * @see ECMA-376 Part 4, Section 18.2.19 (sheet)
 *
 * @example
 * ```xml
 * <sheet name="Sheet1" sheetId="1" r:id="rId1" state="visible"/>
 * ```
 */
export function parseSheetElement(sheetElement: XmlElement): XlsxSheetInfo {
  const name = getAttr(sheetElement, "name") ?? "Sheet";
  const sheetId = parseInt(getAttr(sheetElement, "sheetId") ?? "1", 10);
  const rId = getAttr(sheetElement, "r:id") ?? getAttr(sheetElement, "rId") ?? "";
  const state = (getAttr(sheetElement, "state") ?? "visible") as "visible" | "hidden" | "veryHidden";

  return { name, sheetId, rId, state };
}

/**
 * Parse all sheet elements from a sheets container.
 *
 * @param sheetsElement - The <sheets> element from workbook.xml, or undefined
 * @returns Array of parsed sheet information
 *
 * @see ECMA-376 Part 4, Section 18.2.20 (sheets)
 */
export function parseSheets(sheetsElement: XmlElement | undefined): readonly XlsxSheetInfo[] {
  if (!sheetsElement) {
    return [];
  }
  return getChildren(sheetsElement, "sheet").map(parseSheetElement);
}

// =============================================================================
// Defined Name Parsing
// =============================================================================

/**
 * Parse a single definedName element into XlsxDefinedName.
 *
 * @param dnElement - The <definedName> element from workbook.xml
 * @returns Parsed defined name
 *
 * @see ECMA-376 Part 4, Section 18.2.5 (definedName)
 *
 * @example
 * ```xml
 * <definedName name="MyRange" localSheetId="0" hidden="0">Sheet1!$A$1:$B$10</definedName>
 * ```
 */
export function parseDefinedName(dnElement: XmlElement): XlsxDefinedName {
  return {
    name: getAttr(dnElement, "name") ?? "",
    formula: getTextContent(dnElement),
    localSheetId: parseIntAttr(getAttr(dnElement, "localSheetId")),
    hidden: parseBooleanAttr(getAttr(dnElement, "hidden")),
  };
}

/**
 * Parse all definedName elements from a definedNames container.
 *
 * @param definedNamesElement - The <definedNames> element from workbook.xml, or undefined
 * @returns Array of parsed defined names
 *
 * @see ECMA-376 Part 4, Section 18.2.6 (definedNames)
 */
export function parseDefinedNames(definedNamesElement: XmlElement | undefined): readonly XlsxDefinedName[] {
  if (!definedNamesElement) {
    return [];
  }
  return getChildren(definedNamesElement, "definedName").map(parseDefinedName);
}

// =============================================================================
// Workbook XML Parsing
// =============================================================================

/**
 * Parse the workbook.xml root element into workbook information.
 *
 * @param workbookElement - The root <workbook> element from workbook.xml
 * @returns Parsed workbook information (sheets and defined names)
 *
 * @see ECMA-376 Part 4, Section 18.2.28 (workbook)
 */
export function parseWorkbookXml(workbookElement: XmlElement): XlsxWorkbookInfo {
  const workbookPrEl = getChild(workbookElement, "workbookPr");
  const sheetsEl = getChild(workbookElement, "sheets");
  const definedNamesEl = getChild(workbookElement, "definedNames");

  return {
    sheets: parseSheets(sheetsEl),
    definedNames: parseDefinedNames(definedNamesEl),
    dateSystem: resolveXlsxDateSystem(workbookPrEl ? parseBooleanAttr(getAttr(workbookPrEl, "date1904")) : undefined),
  };
}

// =============================================================================
// Path Resolution
// =============================================================================

/**
 * Resolve a sheet relationship ID to its XML file path.
 *
 * @param rId - The relationship ID (e.g., "rId1")
 * @param relationships - Map from relationship ID to target path
 * @returns The full path to the worksheet XML file (e.g., "xl/worksheets/sheet1.xml")
 * @throws Error if the relationship ID is not found
 *
 * @example
 * ```typescript
 * const path = resolveSheetPath("rId1", relationships);
 * // => "xl/worksheets/sheet1.xml"
 * ```
 */
export function resolveSheetPath(rId: string, relationships: ReadonlyMap<string, string>): string {
  const target = relationships.get(rId);
  if (!target) {
    throw new Error(`Relationship ${rId} not found`);
  }
  const normalizedTarget = target.startsWith("/") ? target.slice(1) : target;
  // xl/worksheets/sheet1.xml or worksheets/sheet1.xml
  if (normalizedTarget.startsWith("xl/")) {
    return normalizedTarget;
  }
  return `xl/${normalizedTarget}`;
}

// =============================================================================
// Main Workbook Parser Helper Functions
// =============================================================================

/**
 * Parse relationships XML or return empty map.
 */
function parseRelsOrEmpty(relsXml: string | undefined): ReadonlyMap<string, string> {
  if (!relsXml) {
    return new Map<string, string>();
  }
  return parseRelationships(getDocumentRoot(parseXml(relsXml)));
}

/**
 * Parse shared strings XML or return empty array.
 */
function parseSharedStringsOrEmpty(xml: string | undefined): readonly string[] {
  if (!xml) {
    return [];
  }
  return parseSharedStrings(getDocumentRoot(parseXml(xml)));
}

/**
 * Parse styles XML or return default stylesheet.
 */
function parseStylesOrDefault(xml: string | undefined) {
  if (!xml) {
    return createDefaultStyleSheet();
  }
  return parseStyleSheet(getDocumentRoot(parseXml(xml)));
}

function resolveRelationshipsPathForPart(partPath: string): string {
  const dir = dirnamePosixPath(partPath);
  const base = basenamePosixPath(partPath);
  return joinPosixPath(dir, "_rels", `${base}.rels`);
}

function resolveTargetPath(partPath: string, target: string): string {
  const baseDir = dirnamePosixPath(partPath);
  const resolved = normalizePosixPath(joinPosixPath(baseDir, target));
  return resolved.startsWith("/") ? resolved.slice(1) : resolved;
}

async function loadWorksheetComments(
  getFileContent: (path: string) => Promise<string | undefined>,
  worksheetXmlPath: string,
  commentsTarget: string,
): Promise<ReturnType<typeof parseComments>> {
  const commentsPath = resolveTargetPath(worksheetXmlPath, commentsTarget);
  const commentsXml = await getFileContent(commentsPath);
  if (!commentsXml) {
    throw new Error(`Comments part not found: ${commentsPath}`);
  }
  return parseComments(getDocumentRoot(parseXml(commentsXml)));
}

async function loadWorksheetCommentsFromRelationships(
  getFileContent: (path: string) => Promise<string | undefined>,
  worksheetXmlPath: string,
  relationships: readonly RelationshipInfo[],
): Promise<ReturnType<typeof parseComments> | undefined> {
  const commentsTarget = relationships.find((rel) => rel.type.endsWith("/comments"))?.target;
  if (!commentsTarget) {
    return undefined;
  }
  const comments = await loadWorksheetComments(getFileContent, worksheetXmlPath, commentsTarget);
  return comments.length > 0 ? comments : undefined;
}

function resolveHyperlinkTarget(
  worksheetXmlPath: string,
  rel: RelationshipInfo,
): { readonly target: string; readonly targetMode?: RelationshipInfo["targetMode"] } {
  const raw = rel.target;
  if (rel.targetMode === "External") {
    return { target: raw, targetMode: rel.targetMode };
  }
  return { target: resolveTargetPath(worksheetXmlPath, raw), targetMode: rel.targetMode };
}

function resolveWorksheetHyperlinksFromRelationships(
  worksheetXmlPath: string,
  baseWorksheet: XlsxWorksheet,
  relationships: readonly RelationshipInfo[],
): XlsxWorksheet {
  const baseHyperlinks = baseWorksheet.hyperlinks;
  if (!baseHyperlinks || baseHyperlinks.length === 0) {
    return baseWorksheet;
  }

  const byId = new Map<string, RelationshipInfo>();
  for (const rel of relationships) {
    if (rel.type.endsWith("/hyperlink")) {
      byId.set(rel.id, rel);
    }
  }

  const resolved = baseHyperlinks.map((link) => {
    const rId = link.relationshipId;
    if (!rId) {
      return link;
    }
    const rel = byId.get(rId);
    if (!rel) {
      return link;
    }
    const { target, targetMode } = resolveHyperlinkTarget(worksheetXmlPath, rel);
    return { ...link, target, targetMode };
  });

  return { ...baseWorksheet, hyperlinks: resolved };
}

function collectTableRelationshipIds(worksheetRoot: XmlElement): readonly string[] {
  const tablePartsEl = getChild(worksheetRoot, "tableParts");
  if (!tablePartsEl) {
    return [];
  }
  const ids: string[] = [];
  for (const tablePartEl of getChildren(tablePartsEl, "tablePart")) {
    const relId = getAttr(tablePartEl, "r:id") ?? getAttr(tablePartEl, "rId");
    if (relId) {
      ids.push(relId);
    }
  }
  return ids;
}

// =============================================================================
// Main Workbook Parser
// =============================================================================

/**
 * Parse a complete XLSX workbook from file content.
 *
 * This is the main entry point for parsing XLSX files.
 * It orchestrates parsing of all component files and returns
 * a complete XlsxWorkbook object.
 *
 * @param getFileContent - Function to retrieve file content by path within the XLSX package
 * @param options - Parser options (non-standard behaviors must be enabled explicitly)
 * @returns Parsed workbook with all sheets, styles, shared strings, and defined names
 * @throws Error if workbook.xml is not found
 *
 * @see ECMA-376 Part 2 (OPC) - Package Structure
 * @see ECMA-376 Part 4, Section 18.2.28 (workbook)
 *
 * @example
 * ```typescript
 * const workbook = await parseXlsxWorkbook(async (path) => {
 *   const entry = zipFile.file(path);
 *   return entry ? await entry.async("text") : undefined;
 * });
 *
 * console.log(workbook.sheets.length); // Number of worksheets
 * console.log(workbook.sharedStrings); // Shared string table
 * ```
 */
export async function parseXlsxWorkbook(
  getFileContent: (path: string) => Promise<string | undefined>,
  options?: XlsxParseOptions,
): Promise<XlsxWorkbook> {
  // 1. Parse relationships
  const relsXml = await getFileContent("xl/_rels/workbook.xml.rels");
  const relationships = parseRelsOrEmpty(relsXml);

  // 2. Parse shared strings (optional)
  const sharedStringsXml = await getFileContent("xl/sharedStrings.xml");
  const sharedStrings = parseSharedStringsOrEmpty(sharedStringsXml);

  // 3. Parse styles
  const stylesXml = await getFileContent("xl/styles.xml");
  const styleSheet = parseStylesOrDefault(stylesXml);

  // 4. Parse workbook.xml
  const workbookXml = await getFileContent("xl/workbook.xml");
  if (!workbookXml) {
    throw new Error("workbook.xml not found");
  }
  const workbookInfo = parseWorkbookXml(getDocumentRoot(parseXml(workbookXml)));

  // 5. Create context
  const context = createParseContext(sharedStrings, styleSheet, workbookInfo, relationships);

  // 6. Parse each worksheet
  const sheets: XlsxWorksheet[] = [];
  const tables: XlsxTable[] = [];
  for (const sheetInfo of workbookInfo.sheets) {
    const xmlPath = resolveSheetPath(sheetInfo.rId, relationships);
    const sheetXml = await getFileContent(xmlPath);
    if (sheetXml) {
      const sheetDoc = parseXml(sheetXml);
      const sheetRoot = getDocumentRoot(sheetDoc);
      const tableRelIds = collectTableRelationshipIds(sheetRoot);

      const relsPath = resolveRelationshipsPathForPart(xmlPath);
      const sheetRelsXml = await getFileContent(relsPath);
      const rels = parseRelsOrEmpty(sheetRelsXml);
      const relInfos = sheetRelsXml ? parseRelationshipInfos(getDocumentRoot(parseXml(sheetRelsXml))) : [];

      const baseWorksheet = parseWorksheet(
        sheetRoot,
        context,
        options,
        { ...sheetInfo, xmlPath },
      );
      const comments = await loadWorksheetCommentsFromRelationships(getFileContent, xmlPath, relInfos);

      const worksheetWithComments = comments ? { ...baseWorksheet, comments } : baseWorksheet;
      const worksheet = resolveWorksheetHyperlinksFromRelationships(xmlPath, worksheetWithComments, relInfos);
      const sheetIndex = sheets.length;
      sheets.push(worksheet);

      if (tableRelIds.length > 0) {
        for (const relId of tableRelIds) {
          const target = rels.get(relId);
          if (!target) {
            throw new Error(`Missing relationship target for table rId "${relId}"`);
          }
          const tablePath = resolveTargetPath(xmlPath, target);
          const tableXml = await getFileContent(tablePath);
          if (!tableXml) {
            throw new Error(`Table part not found: ${tablePath}`);
          }
          const tableRoot = getDocumentRoot(parseXml(tableXml));
          tables.push(parseTable(tableRoot, sheetIndex));
        }
      }
    }
  }

  return {
    dateSystem: workbookInfo.dateSystem,
    sheets,
    styles: styleSheet,
    sharedStrings,
    definedNames: workbookInfo.definedNames,
    tables: tables.length > 0 ? tables : undefined,
  };
}

// =============================================================================
// Re-exports
// =============================================================================

// Re-export context types and functions for external use
export type { XlsxParseContext, XlsxSheetInfo, XlsxWorkbookInfo } from "./context";
export { createParseContext, createDefaultParseContext } from "./context";
export type { XlsxParseOptions } from "./options";

// Re-export component parsers for granular usage
export { parseSharedStrings, parseSharedStringsRich } from "./shared-strings";
export { parseStyleSheet } from "./styles/index";
export { parseWorksheet } from "./worksheet";
export { parseCell } from "./cell";
