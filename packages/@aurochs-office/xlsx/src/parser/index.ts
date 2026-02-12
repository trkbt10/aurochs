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
import { parseSharedStrings, parseSharedStringsRich } from "./shared-strings";
import { parseStyleSheet } from "./styles/index";
import { parseComments } from "./comments";
import { parseTable } from "./table";
import { parseWorksheet } from "./worksheet";
import { parseBooleanAttr, parseIntAttr } from "./primitive";
import { parseWorkbookProtection } from "./protection";
import { parseDrawing } from "./drawing";
import { collectChartRelIds, resolveCharts, updateDrawingWithChartPaths } from "./chart-resolver";
import { parsePivotTable } from "./pivot/pivot-table";
import { parsePivotCacheDefinition } from "./pivot/pivot-cache";
import { parseTheme } from "./theme";
import type { XlsxWorkbookChart } from "../domain/workbook";
import type { XlsxPivotTable } from "../domain/pivot/types";
import type { XlsxPivotCacheDefinition } from "../domain/pivot/cache-types";
import type { XlsxTheme } from "../domain/theme";
import type { XmlElement, XmlDocument } from "@aurochs/xml";
import { parseXml, getAttr, getChild, getChildren, getTextContent, isXmlElement } from "@aurochs/xml";
import {
  basenamePosixPath,
  dirnamePosixPath,
  joinPosixPath,
  normalizePosixPath,
  listRelationships,
  type RelationshipInfo,
} from "@aurochs-office/opc";

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
// Relationship Parsing (using OPC primitives)
// =============================================================================

/**
 * Parse relationships from a rels element.
 *
 * Returns a simple id → target map for quick lookups.
 * For full relationship information (including type and targetMode),
 * use OPC's `listRelationships` directly.
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
  // Create a minimal XmlDocument wrapper to use OPC's listRelationships
  const fakeDoc: XmlDocument = { children: [relsElement] };
  const infos = listRelationships(fakeDoc);
  return new Map(infos.map((rel) => [rel.id, rel.target]));
}

/**
 * Parse full relationship information from a rels XML document.
 *
 * @internal
 */
function parseRelationshipInfosFromDocument(relsXml: XmlDocument): readonly RelationshipInfo[] {
  return listRelationships(relsXml);
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
 * Parse shared strings XML with rich text or return empty array.
 */
function parseSharedStringsRichOrEmpty(xml: string | undefined) {
  if (!xml) {
    return [];
  }
  return parseSharedStringsRich(getDocumentRoot(parseXml(xml)));
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

type DrawingWithCharts = {
  readonly drawing: ReturnType<typeof parseDrawing> | undefined;
  readonly charts: readonly XlsxWorkbookChart[];
  readonly drawingPath?: string;
};

async function loadWorksheetDrawingFromRelationships(params: {
  readonly getFileContent: (path: string) => Promise<string | undefined>;
  readonly worksheetXmlPath: string;
  readonly relationships: readonly RelationshipInfo[];
  readonly sheetIndex: number;
}): Promise<DrawingWithCharts> {
  const { getFileContent, worksheetXmlPath, relationships, sheetIndex } = params;
  const drawingRel = relationships.find((rel) => rel.type.endsWith("/drawing"));
  if (!drawingRel) {
    return { drawing: undefined, charts: [] };
  }
  const drawingPath = resolveTargetPath(worksheetXmlPath, drawingRel.target);
  const drawingXml = await getFileContent(drawingPath);
  if (!drawingXml) {
    return { drawing: undefined, charts: [] };
  }
  const parsedDrawing = parseDrawing(getDocumentRoot(parseXml(drawingXml)));
  if (parsedDrawing.anchors.length === 0) {
    return { drawing: undefined, charts: [] };
  }

  // Collect chart relationship IDs from drawing
  const chartRelIds = collectChartRelIds(parsedDrawing);
  if (chartRelIds.length === 0) {
    return { drawing: parsedDrawing, charts: [], drawingPath };
  }

  // Load drawing relationships for chart resolution
  const drawingRelsPath = resolveRelationshipsPathForPart(drawingPath);
  const drawingRelsXml = await getFileContent(drawingRelsPath);
  const drawingRels = parseRelsOrEmpty(drawingRelsXml);

  // Resolve charts
  const resolvedCharts = await resolveCharts({
    getFileContent,
    drawingPath,
    drawingRelationships: drawingRels,
    chartRelIds,
  });
  const charts: XlsxWorkbookChart[] = resolvedCharts.map((c) => ({
    sheetIndex,
    relId: c.relId,
    chartPath: c.chartPath,
    chart: c.chart,
  }));

  // Update drawing with chart paths
  const chartPathMap = new Map(resolvedCharts.map((c) => [c.relId, c.chartPath]));
  const drawing = updateDrawingWithChartPaths(parsedDrawing, chartPathMap);

  return { drawing, charts, drawingPath };
}

async function loadWorksheetPivotTables(
  getFileContent: (path: string) => Promise<string | undefined>,
  worksheetXmlPath: string,
  relationships: readonly RelationshipInfo[],
): Promise<readonly XlsxPivotTable[]> {
  const pivotTableRels = relationships.filter((rel) => rel.type.endsWith("/pivotTable"));
  if (pivotTableRels.length === 0) {
    return [];
  }

  const pivotTables: XlsxPivotTable[] = [];
  for (const rel of pivotTableRels) {
    const pivotTablePath = resolveTargetPath(worksheetXmlPath, rel.target);
    const pivotTableXml = await getFileContent(pivotTablePath);
    if (!pivotTableXml) {
      continue;
    }

    try {
      const pivotTableRoot = getDocumentRoot(parseXml(pivotTableXml));
      const pivotTable = parsePivotTable(pivotTableRoot, pivotTablePath);
      pivotTables.push(pivotTable);
    } catch (error: unknown) {
      // Skip pivot tables that fail to parse
      console.debug("Failed to parse pivot table:", error);
      continue;
    }
  }

  return pivotTables;
}

async function loadPivotCaches(
  getFileContent: (path: string) => Promise<string | undefined>,
  workbookRelationships: ReadonlyMap<string, string>,
): Promise<readonly XlsxPivotCacheDefinition[]> {
  const pivotCaches: XlsxPivotCacheDefinition[] = [];

  for (const [relId, target] of workbookRelationships) {
    if (!target.includes("pivotCache") || !target.endsWith(".xml")) {
      continue;
    }

    const cachePath = target.startsWith("xl/") ? target : `xl/${target}`;
    const cacheXml = await getFileContent(cachePath);
    if (!cacheXml) {
      continue;
    }

    try {
      const cacheRoot = getDocumentRoot(parseXml(cacheXml));
      // Extract cacheId from relId (e.g., "rId5" -> 5)
      const cacheIdMatch = relId.match(/\d+/u);
      const cacheId = cacheIdMatch ? parseInt(cacheIdMatch[0], 10) : 0;
      const pivotCache = parsePivotCacheDefinition(cacheRoot, cacheId, cachePath);
      pivotCaches.push(pivotCache);
    } catch (error: unknown) {
      // Skip caches that fail to parse
      console.debug("Failed to parse pivot cache:", error);
      continue;
    }
  }

  return pivotCaches;
}

async function loadTheme(
  getFileContent: (path: string) => Promise<string | undefined>,
): Promise<XlsxTheme | undefined> {
  // Theme is typically at xl/theme/theme1.xml
  const themePath = "xl/theme/theme1.xml";
  const themeXml = await getFileContent(themePath);
  if (!themeXml) {
    return undefined;
  }

  try {
    const themeDoc = parseXml(themeXml);
    return parseTheme(themeDoc, themePath);
  } catch (error: unknown) {
    // Theme parsing is optional, skip on error
    console.debug("Failed to parse theme:", error);
    return undefined;
  }
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
  const sharedStringsRich = options?.includeRichText ? parseSharedStringsRichOrEmpty(sharedStringsXml) : undefined;

  // 3. Parse styles
  const stylesXml = await getFileContent("xl/styles.xml");
  const styleSheet = parseStylesOrDefault(stylesXml);

  // 3.1 Parse theme (optional)
  const theme = await loadTheme(getFileContent);

  // 4. Parse workbook.xml
  const workbookXml = await getFileContent("xl/workbook.xml");
  if (!workbookXml) {
    throw new Error("workbook.xml not found");
  }
  const workbookRoot = getDocumentRoot(parseXml(workbookXml));
  const workbookInfo = parseWorkbookXml(workbookRoot);

  // 4.1 Parse workbook protection
  const workbookProtectionEl = getChild(workbookRoot, "workbookProtection");
  const workbookProtection = parseWorkbookProtection(workbookProtectionEl);

  // 5. Create context
  const context = createParseContext({ sharedStrings, styleSheet, workbookInfo, relationships });

  // 6. Parse each worksheet
  const sheets: XlsxWorksheet[] = [];
  const tables: XlsxTable[] = [];
  const allCharts: XlsxWorkbookChart[] = [];
  const allPivotTables: XlsxPivotTable[] = [];
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
      const relInfos = sheetRelsXml ? parseRelationshipInfosFromDocument(parseXml(sheetRelsXml)) : [];

      const sheetIndex = sheets.length;

      const baseWorksheet = parseWorksheet({
        worksheetElement: sheetRoot,
        context,
        options,
        sheetInfo: { ...sheetInfo, xmlPath },
      });
      const comments = await loadWorksheetCommentsFromRelationships(getFileContent, xmlPath, relInfos);
      const { drawing, charts } = await loadWorksheetDrawingFromRelationships({
        getFileContent,
        worksheetXmlPath: xmlPath,
        relationships: relInfos,
        sheetIndex,
      });
      const sheetPivotTables = await loadWorksheetPivotTables(getFileContent, xmlPath, relInfos);

      // Collect charts and pivot tables from this worksheet
      allCharts.push(...charts);
      allPivotTables.push(...sheetPivotTables);

      const worksheetWithComments = comments ? { ...baseWorksheet, comments } : baseWorksheet;
      const worksheetWithDrawing = drawing ? { ...worksheetWithComments, drawing } : worksheetWithComments;
      const worksheet = resolveWorksheetHyperlinksFromRelationships(xmlPath, worksheetWithDrawing, relInfos);
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

  // 7. Parse pivot caches
  const pivotCaches = await loadPivotCaches(getFileContent, relationships);

  return {
    dateSystem: workbookInfo.dateSystem,
    sheets,
    styles: styleSheet,
    sharedStrings,
    ...(sharedStringsRich && { sharedStringsRich }),
    definedNames: workbookInfo.definedNames,
    tables: tables.length > 0 ? tables : undefined,
    workbookProtection,
    charts: allCharts.length > 0 ? allCharts : undefined,
    pivotTables: allPivotTables.length > 0 ? allPivotTables : undefined,
    pivotCaches: pivotCaches.length > 0 ? pivotCaches : undefined,
    theme,
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
export type { SharedStringItem, RichTextRun, RichTextProperties } from "./shared-strings";
export { parseStyleSheet } from "./styles/index";
export { parseWorksheet } from "./worksheet";
export { parseCell } from "./cell";
