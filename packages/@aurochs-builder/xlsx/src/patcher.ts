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
import { colIdx, rowIdx, type RowIndex, type ColIndex } from "@aurochs-office/xlsx/domain/types";
import { createDefaultParseContext, type XlsxParseContext } from "@aurochs-office/xlsx/parser/context";
import { parseWorksheet } from "@aurochs-office/xlsx/parser/worksheet";
import { updateCell } from "@aurochs-office/xlsx/domain/mutation/cell";
import { setRowHeight, hideRows, unhideRows, setRowOutlineLevel, setRowCollapsed } from "@aurochs-office/xlsx/domain/mutation/row";
import { setColumnWidth, hideColumns, unhideColumns, setColumnOutlineLevel, setColumnCollapsed } from "@aurochs-office/xlsx/domain/mutation/column";
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
    const drawingRelId = resolved.drawing
      ? patchDrawing({ pkg, sheet, drawing: resolved.drawing, media: resolved.media })
      : undefined;

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
  let worksheet = parseWorksheet({
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
  worksheet = applyCellUpdates(worksheet, update.cells);
  worksheet = applyRowUpdates(worksheet, update.rows);
  worksheet = applyColUpdates(worksheet, update.cols);

  if (update.dimension) {
    worksheet = { ...worksheet, dimension: parseDimensionString(update.dimension) };
  }

  if (update.drawing) {
    worksheet = { ...worksheet, drawing: update.drawing };
  }

  // 3. Serialize through builder SoT
  const serialized = serializeWorksheet(worksheet, sst, drawingRelId);
  const doc = serializeDocument({ children: [serialized] }, { declaration: true, standalone: true });
  pkg.writeText(sheet.xmlPath, doc);
}

// =============================================================================
// Domain Mutation Application
// =============================================================================

/**
 * Apply CellUpdate[] to worksheet via domain updateCell().
 */
function applyCellUpdates(worksheet: XlsxWorksheet, cells: readonly CellUpdate[]): XlsxWorksheet {
  let ws = worksheet;
  for (const cell of cells) {
    const col = cell.col.toUpperCase();
    const colIndex = columnLetterToIndex(col);
    const value: CellValue = typeof cell.value === "number"
      ? { type: "number", value: cell.value }
      : { type: "string", value: cell.value };

    ws = updateCell(ws, {
      col: colIdx(colIndex),
      row: rowIdx(cell.row),
      colAbsolute: false,
      rowAbsolute: false,
    }, value);
  }
  return ws;
}

/**
 * Apply RowUpdate[] to worksheet via domain row mutations.
 */
function applyRowUpdates(worksheet: XlsxWorksheet, rows?: readonly RowUpdate[]): XlsxWorksheet {
  if (!rows || rows.length === 0) {
    return worksheet;
  }

  let ws = worksheet;
  for (const row of rows) {
    const ri = rowIdx(row.row) as RowIndex;
    if (row.height !== undefined) {
      ws = setRowHeight(ws, ri, row.height);
      // setRowHeight always sets customHeight=true. Override if explicitly false.
      if (row.customHeight === false) {
        const rowIndex = ws.rows.findIndex((r) => r.rowNumber === ri);
        if (rowIndex >= 0) {
          const updatedRows = [...ws.rows];
          updatedRows[rowIndex] = { ...updatedRows[rowIndex], customHeight: undefined };
          ws = { ...ws, rows: updatedRows };
        }
      }
    }
    if (row.hidden === true) {
      ws = hideRows(ws, ri, 1);
    } else if (row.hidden === false) {
      ws = unhideRows(ws, ri, 1);
    }
    if (row.outlineLevel !== undefined) {
      ws = setRowOutlineLevel(ws, ri, row.outlineLevel);
    }
    if (row.collapsed !== undefined) {
      ws = setRowCollapsed(ws, ri, row.collapsed);
    }
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

  let ws = worksheet;
  for (const col of cols) {
    const ci = colIdx(col.col) as ColIndex;
    if (col.width !== undefined) {
      ws = setColumnWidth(ws, ci, col.width);
    }
    if (col.hidden === true) {
      ws = hideColumns(ws, ci, 1);
    } else if (col.hidden === false) {
      ws = unhideColumns(ws, ci, 1);
    }
    if (col.outlineLevel !== undefined) {
      ws = setColumnOutlineLevel(ws, ci, col.outlineLevel);
    }
    if (col.collapsed !== undefined) {
      ws = setColumnCollapsed(ws, ci, col.collapsed);
    }
  }
  return ws;
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
  const sheetRels: OpcRelationship[] = existingSheetRelsText
    ? listRelationships(parseXml(existingSheetRelsText))
    : [];
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
