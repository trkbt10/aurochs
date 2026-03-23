/**
 * @file XLSX Workbook Patcher
 *
 * Updates embedded Excel workbook (xlsx) data with cell values and drawing/media patches.
 *
 * Architecture:
 *   XML → parseWorksheet (parser SoT) → XlsxWorksheet
 *   → domain mutations (updateCell, setRowHeight, setColumnWidth, etc.)
 *   → serializeWorksheet (builder SoT) → XML
 *
 * The patcher itself holds no worksheet manipulation logic.
 * All operations are delegated to the domain mutation layer.
 *
 * @see ECMA-376 Part 4 (SpreadsheetML)
 * @see ECMA-376 Part 4, Section 20.5 (SpreadsheetML Drawing)
 */

import {
  parseXml,
  getByPath,
  type XmlElement,
  serializeDocument,
} from "@aurochs/xml";
import type { ZipPackage } from "@aurochs/zip";
import type { Workbook, WorkbookSheet } from "@aurochs-office/xlsx/workbook-parser";
import { indexToColumnLetter, parseRange } from "@aurochs-office/xlsx/domain/cell/address";
import type { CellValue } from "@aurochs-office/xlsx/domain/cell/types";
import type { XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import { colIdx, rowIdx, styleId, type RowIndex, type ColIndex } from "@aurochs-office/xlsx/domain/types";
import { createDefaultParseContext, type XlsxParseContext } from "@aurochs-office/xlsx/parser/context";
import { parseWorksheet } from "@aurochs-office/xlsx/parser/worksheet";
import { updateCell } from "@aurochs-office/xlsx/domain/mutation/cell";
import { setRowHeight, hideRows, unhideRows, setRowOutlineLevel, setRowCollapsed } from "@aurochs-office/xlsx/domain/mutation/row";
import { setColumnWidth, hideColumns, unhideColumns, setColumnOutlineLevel, setColumnCollapsed, setColumnBestFit, setColumnCustomWidth, setColumnStyleId } from "@aurochs-office/xlsx/domain/mutation/column";
import { addMergeCells } from "@aurochs-office/xlsx/domain/mutation/merge-cell";
import type { SharedStringTable } from "./cell";
import { serializeWorksheet } from "./worksheet";
import { serializeDrawing } from "./drawing";
import { createSharedStringTableBuilder, generateSharedStrings, type MediaPart } from "./exporter";
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
  listRelationships,
  buildRelativeTarget,
  getRelationshipPartPath,
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
 * Row dimension update.
 *
 * Properties mirror the domain type XlsxRow (§18.3.1.73).
 *
 * @see ECMA-376 Part 4, Section 18.3.1.73 (row)
 */
export type RowUpdate = {
  /** Row number (1-based) */
  readonly row: number;
  /** Row height in points */
  readonly height?: number;
  /** Custom height flag (ECMA-376 §18.3.1.73 customHeight) */
  readonly customHeight?: boolean;
  /** Whether the row is hidden */
  readonly hidden?: boolean;
  /** Default style for cells in this row */
  readonly styleId?: number;
  /** Outline grouping level (0-7) */
  readonly outlineLevel?: number;
  /** Whether this row group is collapsed */
  readonly collapsed?: boolean;
};

/**
 * Column dimension update.
 *
 * Properties mirror the domain type XlsxColumnDef (§18.3.1.13).
 *
 * @see ECMA-376 Part 4, Section 18.3.1.13 (col)
 */
export type ColUpdate = {
  /** Column number (1-based) */
  readonly col: number;
  /** Column width in character units */
  readonly width?: number;
  /** Whether the column is hidden */
  readonly hidden?: boolean;
  /** Whether the width is auto-fit to content */
  readonly bestFit?: boolean;
  /** Custom width flag (ECMA-376 §18.3.1.13 customWidth) */
  readonly customWidth?: boolean;
  /** Default style for cells in this column */
  readonly styleId?: number;
  /** Outline grouping level (0-7) */
  readonly outlineLevel?: number;
  /** Whether this column group is collapsed */
  readonly collapsed?: boolean;
};

/**
 * Image to place in a sheet.
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
  /** Row dimension updates */
  readonly rows?: readonly RowUpdate[];
  /** Column dimension updates */
  readonly cols?: readonly ColUpdate[];
  /** Images to place in the sheet. Domain objects are constructed internally. */
  readonly images?: readonly ImagePlacement[];
  /** Merge cell ranges to add (e.g., ["A1:B2", "D4:E5"]). Appended to existing merges. */
  readonly mergeCells?: readonly string[];
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
 */
type ResolvedDrawing = {
  readonly drawing: XlsxDrawing | undefined;
  readonly media: ReadonlyMap<string, MediaPart> | undefined;
};

function resolveDrawingRelId(
  resolved: ResolvedDrawing,
  pkg: ZipPackage,
  sheet: WorkbookSheet,
): string | undefined {
  if (!resolved.drawing) {
    return undefined;
  }
  return patchDrawing({ pkg, sheet, drawing: resolved.drawing, media: resolved.media });
}

function resolveDrawingFromUpdate(update: SheetUpdate): ResolvedDrawing {
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
 */
export async function patchWorkbook(workbook: Workbook, updates: readonly SheetUpdate[]): Promise<WorkbookPatchResult> {
  const pkg = workbook.package;
  const updatedSheets: string[] = [];

  // Build SharedStringTable (SoT) seeded with existing shared strings
  const sst = createSharedStringTableBuilder();
  for (const str of workbook.sharedStrings) {
    sst.addString(str);
  }
  const initialCount = workbook.sharedStrings.length;

  // Build parse context for domain-level roundtrip
  const parseContext: XlsxParseContext = {
    ...createDefaultParseContext(),
    sharedStrings: workbook.sharedStrings,
  };

  for (const update of updates) {
    const sheet = workbook.sheets.get(update.sheetName);
    if (!sheet) {
      throw new Error(`patchWorkbook: sheet "${update.sheetName}" not found`);
    }

    // Resolve drawing before sheet patching (needed for drawingRelId)
    const resolved = resolveDrawingFromUpdate(update);

    // Patch the sheet
    const drawingRelId = resolveDrawingRelId(resolved, pkg, sheet);

    patchSheet({ pkg, sheet, update, sst, parseContext, drawingRelId });

    updatedSheets.push(update.sheetName);
  }

  // Update shared strings XML if new strings were added
  const allStrings = sst.getStrings();
  const newSharedStrings = allStrings.slice(initialCount);
  if (newSharedStrings.length > 0) {
    const sstXml = generateSharedStrings(allStrings);
    pkg.writeText("xl/sharedStrings.xml", serializeWithDeclaration(sstXml));
  }

  const xlsxBuffer = await pkg.toArrayBuffer();

  return { xlsxBuffer, updatedSheets, newSharedStrings };
}

// =============================================================================
// Sheet Patching (Full Domain Roundtrip)
// =============================================================================

/**
 * Patch a single sheet via full domain roundtrip:
 *   parseWorksheet → domain mutations → serializeWorksheet
 */
function patchSheet(params: {
  readonly pkg: ZipPackage;
  readonly sheet: WorkbookSheet;
  readonly update: SheetUpdate;
  readonly sst: SharedStringTable;
  readonly parseContext: XlsxParseContext;
  readonly drawingRelId?: string;
}): void {
  const { pkg, sheet, update, sst, parseContext, drawingRelId } = params;
  const sheetText = pkg.readText(sheet.xmlPath);
  if (!sheetText) {
    throw new Error(`patchSheet: sheet XML not found at ${sheet.xmlPath}`);
  }

  const sheetXml = parseXml(sheetText);
  const sheetRootEl = findSheetRootElement(sheetXml);
  if (!sheetRootEl) {
    throw new Error(
      `patchSheet: sheet root element not found in ${sheet.xmlPath}. ` +
        `Expected one of: ${SHEET_ROOT_ELEMENTS.join(", ")}`,
    );
  }

  // 1. Parse existing worksheet into domain type
  const parsed = parseWorksheet({
    worksheetElement: sheetRootEl,
    context: parseContext,
    options: undefined,
    sheetInfo: {
      name: sheet.name,
      sheetId: extractSheetIndex(sheet.xmlPath),
      state: "visible",
      xmlPath: sheet.xmlPath,
    },
  });

  // 2. Apply domain mutations
  const worksheet = applySheetUpdate(parsed, update);

  // 3. Serialize through builder SoT
  const serialized = serializeWorksheet(worksheet, sst, drawingRelId);
  const doc = serializeDocument({ children: [serialized] }, { declaration: true, standalone: true });
  pkg.writeText(sheet.xmlPath, doc);
}

// =============================================================================
// Domain Mutation Application
// =============================================================================

/**
 * Apply all SheetUpdate mutations to a worksheet.
 */
function applySheetUpdate(worksheet: XlsxWorksheet, update: SheetUpdate): XlsxWorksheet {
  const withCells = applyCellUpdates(worksheet, update.cells);
  const withRows = applyRowUpdates(withCells, update.rows);
  const withCols = applyColUpdates(withRows, update.cols);
  const withMerge = applyMergeCellUpdates(withCols, update.mergeCells);
  const withDimension = applyDimension(withMerge, update.dimension);
  return applyDrawing(withDimension, update.drawing);
}

function applyDimension(ws: XlsxWorksheet, dimension: string | undefined): XlsxWorksheet {
  if (!dimension) {
    return ws;
  }
  return { ...ws, dimension: parseDimensionString(dimension) };
}

function applyDrawing(ws: XlsxWorksheet, drawing: XlsxDrawing | undefined): XlsxWorksheet {
  if (!drawing) {
    return ws;
  }
  return { ...ws, drawing };
}

/**
 * Apply CellUpdate[] to worksheet via domain updateCell().
 */
function toCellValue(raw: string | number): CellValue {
  if (typeof raw === "number") {
    return { type: "number", value: raw };
  }
  return { type: "string", value: raw };
}

function applyCellUpdates(worksheet: XlsxWorksheet, cells: readonly CellUpdate[]): XlsxWorksheet {
  return cells.reduce((ws, cell) => {
    const colIndex = columnLetterToIndex(cell.col.toUpperCase());
    return updateCell(ws, {
      col: colIdx(colIndex),
      row: rowIdx(cell.row),
      colAbsolute: false,
      rowAbsolute: false,
    }, toCellValue(cell.value));
  }, worksheet);
}

/**
 * Apply RowUpdate[] to worksheet via domain row mutations.
 */
function applyRowUpdates(worksheet: XlsxWorksheet, rows?: readonly RowUpdate[]): XlsxWorksheet {
  if (!rows || rows.length === 0) {
    return worksheet;
  }

  return rows.reduce((ws, row) => applySingleRowUpdate(ws, row), worksheet);
}

function applyRowOutlineLevel(ws: XlsxWorksheet, ri: RowIndex, outlineLevel: number | undefined): XlsxWorksheet {
  if (outlineLevel === undefined) {
    return ws;
  }
  return setRowOutlineLevel(ws, ri, outlineLevel);
}

function applyRowCollapsed(ws: XlsxWorksheet, ri: RowIndex, collapsed: boolean | undefined): XlsxWorksheet {
  if (collapsed === undefined) {
    return ws;
  }
  return setRowCollapsed(ws, ri, collapsed);
}

function applySingleRowUpdate(ws: XlsxWorksheet, row: RowUpdate): XlsxWorksheet {
  const ri = rowIdx(row.row) as RowIndex;
  const withHeight = applyRowHeight(ws, ri, row);
  const withVisibility = applyRowVisibility(withHeight, ri, row);
  const withOutline = applyRowOutlineLevel(withVisibility, ri, row.outlineLevel);
  return applyRowCollapsed(withOutline, ri, row.collapsed);
}

function applyRowHeight(ws: XlsxWorksheet, ri: RowIndex, row: RowUpdate): XlsxWorksheet {
  if (row.height === undefined) {
    return ws;
  }
  const withHeight = setRowHeight(ws, ri, row.height);
  // setRowHeight always sets customHeight=true. Override if explicitly false.
  if (row.customHeight !== false) {
    return withHeight;
  }
  const rowIndex = withHeight.rows.findIndex((r) => r.rowNumber === ri);
  if (rowIndex < 0) {
    return withHeight;
  }
  const updatedRows = [...withHeight.rows];
  updatedRows[rowIndex] = { ...updatedRows[rowIndex], customHeight: undefined };
  return { ...withHeight, rows: updatedRows };
}

function applyRowVisibility(ws: XlsxWorksheet, ri: RowIndex, row: RowUpdate): XlsxWorksheet {
  if (row.hidden === true) {
    return hideRows(ws, ri, 1);
  }
  if (row.hidden === false) {
    return unhideRows(ws, ri, 1);
  }
  return ws;
}

/**
 * Apply ColUpdate[] to worksheet via domain column mutations.
 */
function applyColUpdates(worksheet: XlsxWorksheet, cols?: readonly ColUpdate[]): XlsxWorksheet {
  if (!cols || cols.length === 0) {
    return worksheet;
  }

  return cols.reduce((ws, col) => applySingleColUpdate(ws, col), worksheet);
}

function applyColOutlineLevel(ws: XlsxWorksheet, ci: ColIndex, outlineLevel: number | undefined): XlsxWorksheet {
  if (outlineLevel === undefined) {
    return ws;
  }
  return setColumnOutlineLevel(ws, ci, outlineLevel);
}

function applyColCollapsed(ws: XlsxWorksheet, ci: ColIndex, collapsed: boolean | undefined): XlsxWorksheet {
  if (collapsed === undefined) {
    return ws;
  }
  return setColumnCollapsed(ws, ci, collapsed);
}

function applyColBestFit(ws: XlsxWorksheet, ci: ColIndex, bestFit: boolean | undefined): XlsxWorksheet {
  if (bestFit === undefined) {
    return ws;
  }
  return setColumnBestFit(ws, ci, bestFit);
}

function applyColStyleId(ws: XlsxWorksheet, ci: ColIndex, sid: number | undefined): XlsxWorksheet {
  if (sid === undefined) {
    return ws;
  }
  return setColumnStyleId(ws, ci, styleId(sid));
}

function applySingleColUpdate(ws: XlsxWorksheet, col: ColUpdate): XlsxWorksheet {
  const ci = colIdx(col.col) as ColIndex;
  const withWidth = applyColWidth(ws, ci, col);
  const withVisibility = applyColVisibility(withWidth, ci, col);
  const withOutline = applyColOutlineLevel(withVisibility, ci, col.outlineLevel);
  const withCollapsed = applyColCollapsed(withOutline, ci, col.collapsed);
  const withBestFit = applyColBestFit(withCollapsed, ci, col.bestFit);
  return applyColStyleId(withBestFit, ci, col.styleId);
}

function applyColWidth(ws: XlsxWorksheet, ci: ColIndex, col: ColUpdate): XlsxWorksheet {
  if (col.width === undefined) {
    return ws;
  }
  const withWidth = setColumnWidth(ws, ci, col.width);
  // setColumnWidth always sets customWidth=true. Override if explicitly false.
  if (col.customWidth === false) {
    return setColumnCustomWidth(withWidth, ci, false);
  }
  return withWidth;
}

function applyColVisibility(ws: XlsxWorksheet, ci: ColIndex, col: ColUpdate): XlsxWorksheet {
  if (col.hidden === true) {
    return hideColumns(ws, ci, 1);
  }
  if (col.hidden === false) {
    return unhideColumns(ws, ci, 1);
  }
  return ws;
}

/**
 * Apply mergeCells updates to worksheet via domain addMergeCells().
 */
function applyMergeCellUpdates(worksheet: XlsxWorksheet, mergeCells?: readonly string[]): XlsxWorksheet {
  if (!mergeCells || mergeCells.length === 0) {
    return worksheet;
  }

  const ranges = mergeCells.map(parseRange);
  return addMergeCells(worksheet, ranges);
}

// =============================================================================
// Dimension Parsing
// =============================================================================

/**
 * Parse a dimension string (e.g., "A1:B10") into a CellRange.
 */
function parseDimensionString(dimension: string): XlsxWorksheet["dimension"] {
  return parseRange(dimension);
}

// =============================================================================
// Drawing / Media Patching
// =============================================================================

/**
 * Patch a sheet with drawing and media content.
 * Returns the drawing relationship ID for use in serializeWorksheet.
 */
function parseExistingRelationships(xml: string | null | undefined): OpcRelationship[] {
  if (!xml) {
    return [];
  }
  return listRelationships(parseXml(xml));
}

function patchDrawing(params: {
  readonly pkg: ZipPackage;
  readonly sheet: WorkbookSheet;
  readonly drawing: XlsxDrawing;
  readonly media?: ReadonlyMap<string, MediaPart>;
}): string {
  const { pkg, sheet, drawing, media } = params;

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

    pkg.writeBinary(mediaPartPath, mediaPart.data);

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
    pkg.writeText(getRelationshipPartPath(drawingPartPath), serializeWithDeclaration(drawingRelsXml));
  }

  // 4. Create sheet → drawing relationship
  const drawingRelId = `rId_drawing${sheetIndex}`;
  const sheetDrawingRel: OpcRelationship = {
    id: drawingRelId,
    type: OFFICE_RELATIONSHIP_TYPES.drawing,
    target: buildRelativeTarget(sheetPartPath, drawingPartPath),
  };

  const sheetRelsPath = getRelationshipPartPath(sheetPartPath);
  const existingSheetRelsText = pkg.readText(sheetRelsPath);
  const sheetRels: OpcRelationship[] = parseExistingRelationships(existingSheetRelsText);
  sheetRels.push(sheetDrawingRel);

  const sheetRelsXml = serializeRelationships(sheetRels);
  pkg.writeText(sheetRelsPath, serializeWithDeclaration(sheetRelsXml));

  // 5. Update [Content_Types].xml
  updateContentTypesForDrawing(pkg, drawingPartPath, mediaDefaultExtensions);

  return drawingRelId;
}

// =============================================================================
// Sheet Root Element Detection
// =============================================================================

const SHEET_ROOT_ELEMENTS = ["worksheet", "macrosheet"] as const;

function findSheetRootElement(sheetXml: ReturnType<typeof parseXml>): XmlElement | null {
  for (const rootName of SHEET_ROOT_ELEMENTS) {
    const element = getByPath(sheetXml, [rootName]);
    if (element) {
      return element;
    }
  }
  return null;
}

function extractSheetIndex(xmlPath: string): number {
  const match = xmlPath.match(/sheet(\d+)\.xml$/);
  if (!match) {
    throw new Error(`extractSheetIndex: cannot parse sheet index from "${xmlPath}"`);
  }
  return parseInt(match[1], 10);
}

// =============================================================================
// Drawing Helpers
// =============================================================================

function collectBlipRelIds(drawing: XlsxDrawing): string[] {
  const relIds: string[] = [];
  for (const anchor of drawing.anchors) {
    if (anchor.content) {
      collectContentRelIds(anchor.content, relIds);
    }
  }
  return relIds;
}

function collectContentRelIds(content: XlsxDrawingContent, relIds: string[]): void {
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

const inferExtensionFromContentType = inferExtensionFromMediaContentType;

// =============================================================================
// Content Types
// =============================================================================

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

  for (const [extension, contentType] of mediaDefaultExtensions) {
    const hasDefault = entries.some(
      (e) => e.kind === "default" && e.extension === extension,
    );
    if (!hasDefault) {
      entries.push({ kind: "default", extension, contentType });
    }
  }

  const contentTypesXml = serializeContentTypes(entries);
  pkg.writeText("[Content_Types].xml", serializeWithDeclaration(contentTypesXml));
}

// =============================================================================
// Helper Functions
// =============================================================================

function columnLetterToIndex(col: string): number {
  const upper = col.toUpperCase();
  return [...upper].reduce((acc, char) => acc * 26 + (char.charCodeAt(0) - 64), 0);
}

// =============================================================================
// High-Level API
// =============================================================================

/**
 * Update chart data in a workbook.
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

  if (seriesNames) {
    for (let i = 0; i < seriesNames.length; i++) {
      cells.push({
        col: indexToColumnLetter(colIdx(i + 2)),
        row: headerRow,
        value: seriesNames[i],
      });
    }
  }

  for (let i = 0; i < categories.length; i++) {
    cells.push({ col: "A", row: startRow + i, value: categories[i] });
  }

  for (let seriesIdx = 0; seriesIdx < seriesData.length; seriesIdx++) {
    const values = seriesData[seriesIdx];
    const col = indexToColumnLetter(colIdx(seriesIdx + 2));
    for (let i = 0; i < values.length; i++) {
      cells.push({ col, row: startRow + i, value: values[i] });
    }
  }

  const lastRow = startRow + categories.length - 1;
  const lastCol = indexToColumnLetter(colIdx(seriesData.length + 1));
  const dimension = `A${headerRow}:${lastCol}${lastRow}`;

  const result = await patchWorkbook(workbook, [{ sheetName, cells, dimension }]);
  return result.xlsxBuffer;
}
