/**
 * @file XLSX Workbook Patcher
 *
 * Updates embedded Excel workbook (xlsx) data with cell values and drawing/media patches.
 * Used for synchronizing chart data changes to embedded workbooks and injecting
 * drawing content (images) into existing workbook templates.
 *
 * @see ECMA-376 Part 4 (SpreadsheetML)
 * @see ECMA-376 Part 4, Section 20.5 (SpreadsheetML Drawing)
 */

import {
  parseXml,
  getByPath,
  getChildren,
  getChild,
  isXmlElement,
  createElement,
  createText,
  type XmlElement,
  type XmlNode,
} from "@aurochs/xml";
import { serializeDocument } from "@aurochs/xml";
import { appendChild, replaceChildByName } from "@aurochs/xml";
import type { ZipPackage } from "@aurochs/zip";
import type { Workbook, WorkbookSheet } from "@aurochs-office/xlsx/workbook-parser";
import { indexToColumnLetter } from "@aurochs-office/xlsx/domain/cell/address";
import { colIdx, rowIdx } from "@aurochs-office/xlsx/domain/types";
import { serializeDrawing } from "./drawing";
import type { MediaPart } from "./exporter";
import type { XlsxDrawing, XlsxDrawingAnchor, XlsxDrawingContent } from "@aurochs-office/xlsx/domain/drawing/types";
import {
  OFFICE_RELATIONSHIP_TYPES,
  DRAWINGML_CONTENT_TYPES,
  serializeRelationships,
  serializeContentTypes,
  serializeWithDeclaration,
  parseContentTypes,
  contentTypesToEntries,
  inferExtensionFromMediaContentType,
  type OpcRelationship,
} from "@aurochs-office/opc";

// =============================================================================
// Types
// =============================================================================

/**
 * Cell value to write
 */
export type CellUpdate = {
  /** Column letter (e.g., "A") */
  readonly col: string;
  /** Row number (1-based) */
  readonly row: number;
  /** Value to write */
  readonly value: string | number;
};

/**
 * Image to place in a sheet.
 *
 * The patcher handles all domain object construction internally:
 * relId generation, XlsxDrawingAnchor building, MediaPart wiring.
 *
 * @see ECMA-376 Part 4, Section 20.5.2.33 (twoCellAnchor)
 */
export type ImagePlacement = {
  /** Image binary data */
  readonly data: Uint8Array;
  /** MIME content type (e.g., "image/png") */
  readonly contentType: string;
  /** Anchor start column (0-based) */
  readonly fromCol: number;
  /** Anchor start row (0-based) */
  readonly fromRow: number;
  /** Anchor end column (0-based) */
  readonly toCol: number;
  /** Anchor end row (0-based) */
  readonly toRow: number;
  /** Display name (optional). @see ECMA-376 Part 4, Section 20.5.2.17 */
  readonly name?: string;
};

/**
 * Sheet update specification
 */
export type SheetUpdate = {
  /** Sheet name */
  readonly sheetName: string;
  /** Cell updates */
  readonly cells: readonly CellUpdate[];
  /** If provided, update the sheet dimension (e.g., "A1:B10") */
  readonly dimension?: string;
  /** Images to place in the sheet. Domain objects are constructed internally. */
  readonly images?: readonly ImagePlacement[];
  /** Low-level drawing injection (advanced). Prefer `images` for typical use. */
  readonly drawing?: XlsxDrawing;
  /** Media parts for low-level drawing (advanced). Keyed by drawing relationship ID. */
  readonly media?: ReadonlyMap<string, MediaPart>;
};

/**
 * Result of patching a workbook
 */
export type WorkbookPatchResult = {
  /** Updated xlsx as ArrayBuffer */
  readonly xlsxBuffer: ArrayBuffer;
  /** List of sheets that were updated */
  readonly updatedSheets: readonly string[];
  /** New shared strings added */
  readonly newSharedStrings: readonly string[];
};

// =============================================================================
// Patching
// =============================================================================

/**
 * Resolve SheetUpdate.images into drawing + media domain objects.
 *
 * If `images` is provided, constructs XlsxDrawing anchors and MediaPart entries.
 * If `drawing` is already provided (low-level API), uses it directly.
 */
function resolveDrawingFromUpdate(update: SheetUpdate): {
  readonly drawing: XlsxDrawing | undefined;
  readonly media: ReadonlyMap<string, MediaPart> | undefined;
} {
  if (update.drawing) {
    return { drawing: update.drawing, media: update.media };
  }
  if (!update.images || update.images.length === 0) {
    return { drawing: undefined, media: undefined };
  }

  const anchors: XlsxDrawingAnchor[] = [];
  const mediaMap = new Map<string, MediaPart>();

  for (const [idx, img] of update.images.entries()) {
    const relId = `rId_img_${idx + 1}`;

    anchors.push({
      type: "twoCellAnchor",
      editAs: "oneCell",
      from: { col: colIdx(img.fromCol), colOff: 0, row: rowIdx(img.fromRow), rowOff: 0 },
      to: { col: colIdx(img.toCol), colOff: 0, row: rowIdx(img.toRow), rowOff: 0 },
      content: {
        type: "picture",
        nvPicPr: { id: idx + 1, name: img.name ?? `Image${idx + 1}` },
        blipRelId: relId,
      },
    });

    mediaMap.set(relId, { data: img.data, contentType: img.contentType });
  }

  return { drawing: { anchors }, media: mediaMap };
}

/**
 * Patch a workbook with cell updates and optional drawing/media patches.
 *
 * @param workbook - Parsed workbook
 * @param updates - Sheet updates to apply
 * @returns Patch result with updated xlsx buffer
 */
export async function patchWorkbook(workbook: Workbook, updates: readonly SheetUpdate[]): Promise<WorkbookPatchResult> {
  const pkg = workbook.package;
  const updatedSheets: string[] = [];
  const newSharedStrings: string[] = [];

  // Build mutable shared strings list
  const sharedStrings = [...workbook.sharedStrings];

  for (const update of updates) {
    const sheet = workbook.sheets.get(update.sheetName);
    if (!sheet) {
      throw new Error(`patchWorkbook: sheet "${update.sheetName}" not found`);
    }

    // Collect string values that need to be in shared strings
    const stringValues = update.cells.filter((c) => typeof c.value === "string").map((c) => c.value as string);

    // Add new strings to shared strings if not already present
    for (const str of stringValues) {
      if (!sharedStrings.includes(str)) {
        sharedStrings.push(str);
        newSharedStrings.push(str);
      }
    }

    // Patch the sheet XML
    patchSheetXml({ pkg, sheet, cells: update.cells, sharedStrings, dimension: update.dimension });

    // Resolve images → drawing + media (high-level API)
    const resolved = resolveDrawingFromUpdate(update);

    // Patch drawing/media if present
    if (resolved.drawing) {
      patchDrawing({ pkg, sheet, drawing: resolved.drawing, media: resolved.media });
    }

    updatedSheets.push(update.sheetName);
  }

  // Update shared strings XML if we added new ones
  if (newSharedStrings.length > 0) {
    patchSharedStringsXml(pkg, sharedStrings);
  }

  // Generate updated xlsx
  const xlsxBuffer = await pkg.toArrayBuffer();

  return {
    xlsxBuffer,
    updatedSheets,
    newSharedStrings,
  };
}

// =============================================================================
// Sheet Root Element Detection
// =============================================================================

/**
 * Supported sheet root element names.
 *
 * - "worksheet" for regular worksheets (xl/worksheets/sheetN.xml)
 * - "macrosheet" for Excel macro sheets (xl/macrosheets/sheetN.xml)
 *
 * @see ECMA-376 Part 4, Section 18.3.1.99 (worksheet)
 * @see MS-OFFMACRO2 Section 2.2.1.5 (Macro Sheet)
 */
const SHEET_ROOT_ELEMENTS = ["worksheet", "macrosheet"] as const;

/**
 * Find the sheet root element (worksheet or macrosheet).
 *
 * @param sheetXml - Parsed sheet XML document
 * @returns The root element or null if not found
 */
function findSheetRootElement(sheetXml: ReturnType<typeof parseXml>): XmlElement | null {
  for (const rootName of SHEET_ROOT_ELEMENTS) {
    const element = getByPath(sheetXml, [rootName]);
    if (element) {
      return element;
    }
  }
  return null;
}

// =============================================================================
// Sheet XML Patching
// =============================================================================

/**
 * Patch a single sheet's XML with cell updates.
 *
 * Supports both regular worksheets and Excel macro sheets (xlMacrosheet).
 *
 * @see MS-OFFMACRO2 Section 2.2.1.5 (Macro Sheet)
 */
function patchSheetXml(params: {
  readonly pkg: ZipPackage;
  readonly sheet: WorkbookSheet;
  readonly cells: readonly CellUpdate[];
  readonly sharedStrings: readonly string[];
  readonly dimension?: string;
}): void {
  const { pkg, sheet, cells, sharedStrings, dimension } = params;
  const sheetText = pkg.readText(sheet.xmlPath);
  if (!sheetText) {
    throw new Error(`patchSheetXml: sheet XML not found at ${sheet.xmlPath}`);
  }

  const sheetXml = parseXml(sheetText);
  const sheetRootEl = findSheetRootElement(sheetXml);
  if (!sheetRootEl) {
    throw new Error(
      `patchSheetXml: sheet root element not found in ${sheet.xmlPath}. ` +
        `Expected one of: ${SHEET_ROOT_ELEMENTS.join(", ")}`,
    );
  }

  const sheetWithDimension = dimension ? updateDimension(sheetRootEl, dimension) : sheetRootEl;
  const { worksheet: updatedSheet, sheetData: sheetDataEl } = ensureSheetDataElement(sheetWithDimension);

  // Apply cell updates
  const updatedSheetData = applyCellUpdates(sheetDataEl, cells, sharedStrings);

  // Replace sheetData in sheet using replaceChildByName
  const finalSheet = replaceChildByName(updatedSheet, "sheetData", updatedSheetData);

  // Serialize and write back
  const serialized = serializeDocument({ children: [finalSheet] }, { declaration: true, standalone: true });
  pkg.writeText(sheet.xmlPath, serialized);
}

// =============================================================================
// Drawing / Media Patching
// =============================================================================

/**
 * Patch a sheet with drawing and media content.
 *
 * Follows the same OPC pattern as the exporter:
 * 1. Serialize drawing XML to xl/drawings/drawingN.xml
 * 2. Write media binaries to xl/media/
 * 3. Create drawing relationships (drawing → media)
 * 4. Create sheet relationships (sheet → drawing)
 * 5. Ensure sheet XML has <drawing r:id="..."/> element
 * 6. Update [Content_Types].xml for drawing override and media defaults
 *
 * @see ECMA-376 Part 4, Section 20.5 (SpreadsheetML Drawing)
 */
function patchDrawing(params: {
  readonly pkg: ZipPackage;
  readonly sheet: WorkbookSheet;
  readonly drawing: XlsxDrawing;
  readonly media?: ReadonlyMap<string, MediaPart>;
}): void {
  const { pkg, sheet, drawing, media } = params;

  // Determine sheet index from xmlPath (e.g., "xl/worksheets/sheet1.xml" → 1)
  const sheetIndex = extractSheetIndex(sheet.xmlPath);
  const drawingPartPath = `xl/drawings/drawing${sheetIndex}.xml`;
  const sheetPartPath = sheet.xmlPath;

  // 1. Serialize drawing XML
  const drawingXml = serializeDrawing(drawing);
  pkg.writeText(drawingPartPath, serializeWithDeclaration(drawingXml));

  // 2. Collect blipRelIds and write media, build drawing relationships
  const drawingRelationships: OpcRelationship[] = [];
  const mediaDefaultExtensions = new Map<string, string>();

  const blipRelIds = collectBlipRelIds(drawing);
  const mediaCounter = { value: 0 };

  for (const relId of blipRelIds) {
    const mediaPart = media?.get(relId);
    if (!mediaPart) {
      continue;
    }

    mediaCounter.value++;
    const ext = inferExtensionFromContentType(mediaPart.contentType);
    const mediaPartPath = `xl/media/image_s${sheetIndex}_${mediaCounter.value}.${ext}`;

    // Write media binary
    pkg.writeBinary(mediaPartPath, mediaPart.data);

    // Build drawing → media relationship
    drawingRelationships.push({
      id: relId,
      type: OFFICE_RELATIONSHIP_TYPES.image,
      target: buildRelativeTarget(drawingPartPath, mediaPartPath),
    });

    mediaDefaultExtensions.set(ext, mediaPart.contentType);
  }

  // 3. Write drawing relationships
  if (drawingRelationships.length > 0) {
    const drawingRelsXml = serializeRelationships(drawingRelationships);
    pkg.writeText(relsPathFor(drawingPartPath), serializeWithDeclaration(drawingRelsXml));
  }

  // 4. Create sheet → drawing relationship
  const drawingRelId = `rId_drawing${sheetIndex}`;
  const sheetDrawingRel: OpcRelationship = {
    id: drawingRelId,
    type: OFFICE_RELATIONSHIP_TYPES.drawing,
    target: buildRelativeTarget(sheetPartPath, drawingPartPath),
  };

  // Read existing sheet rels or create new
  const sheetRelsPath = relsPathFor(sheetPartPath);
  const existingSheetRelsText = pkg.readText(sheetRelsPath);
  const sheetRels: OpcRelationship[] = existingSheetRelsText ? parseExistingRelationships(existingSheetRelsText) : [];
  sheetRels.push(sheetDrawingRel);

  const sheetRelsXml = serializeRelationships(sheetRels);
  pkg.writeText(sheetRelsPath, serializeWithDeclaration(sheetRelsXml));

  // 5. Ensure sheet XML has <drawing r:id="..."/> element
  ensureDrawingElement(pkg, sheetPartPath, drawingRelId);

  // 6. Update [Content_Types].xml
  updateContentTypesForDrawing(pkg, drawingPartPath, mediaDefaultExtensions);
}

/**
 * Extract sheet index from xmlPath (e.g., "xl/worksheets/sheet1.xml" → 1).
 */
function extractSheetIndex(xmlPath: string): number {
  const match = xmlPath.match(/sheet(\d+)\.xml$/);
  if (!match) {
    throw new Error(`extractSheetIndex: cannot parse sheet index from "${xmlPath}"`);
  }
  return parseInt(match[1], 10);
}

/**
 * Collect all blipRelIds from a drawing's anchors (recursively for groups).
 */
function collectBlipRelIds(drawing: XlsxDrawing): string[] {
  const relIds: string[] = [];
  for (const anchor of drawing.anchors) {
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
 * Parse existing OPC relationships from XML text.
 */
function parseExistingRelationships(xmlText: string): OpcRelationship[] {
  const doc = parseXml(xmlText);
  const rootEl = getByPath(doc, ["Relationships"]);
  if (!rootEl) {
    return [];
  }
  const rels: OpcRelationship[] = [];
  for (const child of rootEl.children) {
    if (isXmlElement(child) && child.name === "Relationship") {
      const id = child.attrs["Id"];
      const type = child.attrs["Type"];
      const target = child.attrs["Target"];
      if (id && type && target) {
        const rel: OpcRelationship = { id, type, target };
        const targetMode = child.attrs["TargetMode"];
        if (targetMode === "External") {
          rels.push({ ...rel, targetMode: "External" as const });
        } else {
          rels.push(rel);
        }
      }
    }
  }
  return rels;
}

/**
 * Ensure the sheet XML has a <drawing r:id="..."/> element.
 *
 * If the sheet already has a <drawing> element, replace it.
 * Otherwise, append it after the last known child element.
 */
/**
 * Replace existing drawing element or append a new one.
 */
function replaceOrAppendDrawing(root: XmlElement, drawingEl: XmlElement, existing: XmlElement | undefined): XmlElement {
  if (existing) {
    return replaceChildByName(root, "drawing", drawingEl);
  }
  return appendChild(root, drawingEl);
}

function ensureDrawingElement(pkg: ZipPackage, sheetPath: string, drawingRelId: string): void {
  const sheetText = pkg.readText(sheetPath);
  if (!sheetText) {
    return;
  }

  const sheetXml = parseXml(sheetText);
  const sheetRootEl = findSheetRootElement(sheetXml);
  if (!sheetRootEl) {
    return;
  }

  const RELATIONSHIPS_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const drawingEl = createElement("drawing", { "r:id": drawingRelId, "xmlns:r": RELATIONSHIPS_NS });

  const existingDrawing = getChild(sheetRootEl, "drawing");
  const updatedRoot = replaceOrAppendDrawing(sheetRootEl, drawingEl, existingDrawing);

  const serialized = serializeDocument({ children: [updatedRoot] }, { declaration: true, standalone: true });
  pkg.writeText(sheetPath, serialized);
}

/**
 * Update [Content_Types].xml with drawing override and media extension defaults.
 */
function updateContentTypesForDrawing(
  pkg: ZipPackage,
  drawingPartPath: string,
  mediaDefaultExtensions: ReadonlyMap<string, string>,
): void {
  const contentTypesText = pkg.readText("[Content_Types].xml");
  if (!contentTypesText) {
    return;
  }

  const contentTypesDoc = parseXml(contentTypesText);
  const parsed = parseContentTypes(contentTypesDoc);
  const entries = contentTypesToEntries(parsed);

  // Add drawing override if not already present
  const drawingOverridePartName = `/${drawingPartPath}`;
  const hasDrawingOverride = entries.some(
    (e) => e.kind === "override" && e.partName === drawingOverridePartName,
  );
  if (!hasDrawingOverride) {
    entries.push({
      kind: "override",
      partName: drawingOverridePartName,
      contentType: DRAWINGML_CONTENT_TYPES.drawing,
    });
  }

  // Add media extension defaults if not already present
  for (const [extension, contentType] of mediaDefaultExtensions) {
    const hasDefault = entries.some(
      (e) => e.kind === "default" && e.extension === extension,
    );
    if (!hasDefault) {
      entries.push({
        kind: "default",
        extension,
        contentType,
      });
    }
  }

  const contentTypesXml = serializeContentTypes(entries);
  pkg.writeText("[Content_Types].xml", serializeWithDeclaration(contentTypesXml));
}

// =============================================================================
// Dimension and SheetData Helpers
// =============================================================================

/**
 * Update the dimension element in worksheet.
 */
function updateDimension(worksheet: XmlElement, dimension: string): XmlElement {
  const dimEl = getChild(worksheet, "dimension");
  if (dimEl) {
    // Update existing using replaceChildByName
    return replaceChildByName(worksheet, "dimension", createElement("dimension", { ref: dimension }));
  }
  // Add dimension after sheetViews or at start
  return insertChildAfter(worksheet, "sheetViews", createElement("dimension", { ref: dimension }));
}

function ensureSheetDataElement(worksheet: XmlElement): {
  readonly worksheet: XmlElement;
  readonly sheetData: XmlElement;
} {
  const existing = getChild(worksheet, "sheetData");
  if (existing) {
    return { worksheet, sheetData: existing };
  }
  const sheetData = createElement("sheetData", {}, []);
  const updatedWorksheet = appendChild(worksheet, sheetData);
  return { worksheet: updatedWorksheet, sheetData };
}

/**
 * Apply cell updates to sheetData element.
 */
function applyCellUpdates(
  sheetData: XmlElement,
  cells: readonly CellUpdate[],
  sharedStrings: readonly string[],
): XmlElement {
  // Group updates by row
  const byRow = new Map<number, CellUpdate[]>();
  for (const cell of cells) {
    const existing = byRow.get(cell.row) ?? [];
    existing.push(cell);
    byRow.set(cell.row, existing);
  }

  // Get existing rows
  const existingRows = getChildren(sheetData, "row");
  const rowMap = new Map<number, XmlElement>();
  for (const row of existingRows) {
    const rStr = row.attrs["r"];
    if (rStr) {
      rowMap.set(parseInt(rStr, 10), row);
    }
  }

  // Update or create rows
  for (const [rowNum, updates] of byRow) {
    const existingRow = rowMap.get(rowNum);
    const newRow = applyRowUpdates({ existingRow, rowNum, updates, sharedStrings });
    rowMap.set(rowNum, newRow);
  }

  // Sort rows by row number and create new sheetData
  const sortedRows = Array.from(rowMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, row]) => row);

  // Preserve non-row children and append rows
  const nonRowChildren = sheetData.children.filter((child) => !isXmlElement(child) || child.name !== "row");

  return createElement("sheetData", sheetData.attrs, [...nonRowChildren, ...sortedRows]);
}

/**
 * Apply updates to a single row.
 */
function applyRowUpdates(params: {
  readonly existingRow: XmlElement | undefined;
  readonly rowNum: number;
  readonly updates: readonly CellUpdate[];
  readonly sharedStrings: readonly string[];
}): XmlElement {
  const { existingRow, rowNum, updates, sharedStrings } = params;
  // Get existing cells
  const cellMap = new Map<string, XmlElement>();
  if (existingRow) {
    const existingCells = getChildren(existingRow, "c");
    for (const cell of existingCells) {
      const ref = cell.attrs["r"];
      if (ref) {
        const colMatch = ref.match(/^([A-Z]+)/);
        if (colMatch) {
          cellMap.set(colMatch[1], cell);
        }
      }
    }
  }

  // Apply updates
  for (const update of updates) {
    const col = update.col.toUpperCase();
    const ref = `${col}${rowNum}`;
    const newCell = createCellElement(ref, update.value, sharedStrings);
    cellMap.set(col, newCell);
  }

  // Sort cells by column and create row
  const sortedCells = Array.from(cellMap.entries())
    .sort(([a], [b]) => columnLetterToIndex(a) - columnLetterToIndex(b))
    .map(([, cell]) => cell);

  const rowAttrs: Record<string, string> = { r: String(rowNum) };
  if (existingRow?.attrs["spans"]) {
    rowAttrs["spans"] = existingRow.attrs["spans"];
  }

  return createElement("row", rowAttrs, sortedCells);
}

/**
 * Create a cell element for a value.
 */
function createCellElement(ref: string, value: string | number, sharedStrings: readonly string[]): XmlElement {
  if (typeof value === "number") {
    // Numeric cell
    return createElement("c", { r: ref }, [createElement("v", {}, [createText(String(value))])]);
  }

  // String cell - use shared string
  const ssIndex = sharedStrings.indexOf(value);
  if (ssIndex !== -1) {
    return createElement("c", { r: ref, t: "s" }, [createElement("v", {}, [createText(String(ssIndex))])]);
  }

  // Inline string fallback (shouldn't happen if we added to shared strings)
  return createElement("c", { r: ref, t: "inlineStr" }, [
    createElement("is", {}, [createElement("t", {}, [createText(value)])]),
  ]);
}

/**
 * Patch shared strings XML.
 */
function patchSharedStringsXml(pkg: ZipPackage, sharedStrings: readonly string[]): void {
  const siElements = sharedStrings.map((str) => createElement("si", {}, [createElement("t", {}, [createText(str)])]));

  const sstElement = createElement(
    "sst",
    {
      xmlns: "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      count: String(sharedStrings.length),
      uniqueCount: String(sharedStrings.length),
    },
    siElements,
  );

  const serialized = serializeDocument({ children: [sstElement] }, { declaration: true, standalone: true });
  pkg.writeText("xl/sharedStrings.xml", serialized);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Insert a child element after a named sibling.
 * If the named sibling is not found, prepend the child.
 *
 * Note: No exact equivalent exists in @aurochs/xml/mutate, so this is kept as-is.
 */
function insertChildAfter(parent: XmlElement, afterName: string, child: XmlElement): XmlElement {
  const reduced = parent.children.reduce(
    (acc, existing): { readonly children: readonly XmlNode[]; readonly inserted: boolean } => {
      const nextChildren = [...acc.children, existing];
      if (!acc.inserted && isXmlElement(existing) && existing.name === afterName) {
        return { children: [...nextChildren, child], inserted: true };
      }
      return { children: nextChildren, inserted: acc.inserted };
    },
    { children: [] as readonly XmlNode[], inserted: false },
  );

  if (reduced.inserted) {
    return createElement(parent.name, parent.attrs, [...reduced.children]);
  }
  return createElement(parent.name, parent.attrs, [child, ...reduced.children]);
}

function columnLetterToIndex(col: string): number {
  const upper = col.toUpperCase();
  return [...upper].reduce((acc, char) => acc * 26 + (char.charCodeAt(0) - 64), 0);
}

// =============================================================================
// High-Level API
// =============================================================================

/**
 * Update chart data in a workbook.
 *
 * This is a convenience function for the common case of updating
 * categories in column A and values in subsequent columns.
 *
 * @param workbook - Parsed workbook
 * @param sheetName - Sheet to update
 * @param categories - Category values (written to column A starting at row 2)
 * @param seriesData - Array of series values (each written to columns B, C, D, etc.)
 * @param headerRow - Row for series names (default: 1)
 * @param seriesNames - Names for each series (written to header row)
 * @returns Updated xlsx buffer
 */
export async function updateChartDataInWorkbook(params: {
  readonly workbook: Workbook;
  readonly sheetName: string;
  readonly categories: readonly string[];
  readonly seriesData: readonly (readonly number[])[];
  readonly headerRow?: number;
  readonly seriesNames?: readonly string[];
}): Promise<ArrayBuffer> {
  const { workbook, sheetName, categories, seriesData, headerRow = 1, seriesNames } = params;
  const cells: CellUpdate[] = [];
  const startRow = headerRow + 1;

  // Write series names to header row
  if (seriesNames) {
    for (let i = 0; i < seriesNames.length; i++) {
      cells.push({
        col: indexToColumnLetter(colIdx(i + 2)), // B, C, D, ...
        row: headerRow,
        value: seriesNames[i],
      });
    }
  }

  // Write categories to column A
  for (let i = 0; i < categories.length; i++) {
    cells.push({
      col: "A",
      row: startRow + i,
      value: categories[i],
    });
  }

  // Write series values to columns B, C, D, ...
  for (let seriesIdx = 0; seriesIdx < seriesData.length; seriesIdx++) {
    const values = seriesData[seriesIdx];
    const col = indexToColumnLetter(colIdx(seriesIdx + 2)); // B, C, D, ...

    for (let i = 0; i < values.length; i++) {
      cells.push({
        col,
        row: startRow + i,
        value: values[i],
      });
    }
  }

  // Calculate dimension
  const lastRow = startRow + categories.length - 1;
  const lastCol = indexToColumnLetter(colIdx(seriesData.length + 1));
  const dimension = `A${headerRow}:${lastCol}${lastRow}`;

  const result = await patchWorkbook(workbook, [{ sheetName, cells, dimension }]);

  return result.xlsxBuffer;
}
