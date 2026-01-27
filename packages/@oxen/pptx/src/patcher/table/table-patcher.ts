/**
 * @file Table patcher (Phase 10)
 *
 * Updates DrawingML tables (a:tbl) embedded in p:graphicFrame.
 */

import { createElement, getChild, getChildren, isXmlElement, type XmlElement, type XmlNode } from "@oxen/xml";
import type { TextBody } from "../../domain/text";
import type { TableCell, TableCellProperties, TableColumn, TableRow } from "../../domain/table/types";
import { ooxmlEmu } from "@oxen/ooxml/serializer/units";
import { removeAttribute, replaceChildByName, setAttribute, setChildren } from "../core/xml-mutator";
import { patchTextBodyElement, serializeDrawingTextBody } from "../serializer/text";

export type TableChange =
  | { readonly type: "cell"; readonly row: number; readonly col: number; readonly content: TextBody }
  | { readonly type: "addRow"; readonly row: TableRow; readonly position?: number }
  | { readonly type: "removeRow"; readonly rowIndex: number }
  | { readonly type: "addColumn"; readonly column: TableColumn; readonly position?: number }
  | { readonly type: "removeColumn"; readonly colIndex: number }
  | { readonly type: "merge"; readonly startRow: number; readonly startCol: number; readonly rowSpan: number; readonly colSpan: number }
  | { readonly type: "split"; readonly startRow: number; readonly startCol: number; readonly rowSpan: number; readonly colSpan: number };

function requireChild(parent: XmlElement, name: string, context: string): XmlElement {
  const child = getChild(parent, name);
  if (!child) {
    throw new Error(`${context}: missing required child: ${name}`);
  }
  return child;
}

function requireTable(tableElement: XmlElement): void {
  if (tableElement.name !== "a:tbl") {
    throw new Error(`patchTable: expected a:tbl, got ${tableElement.name}`);
  }
}

function createEmptyTxBody(): XmlElement {
  return createElement("a:txBody", {}, [
    createElement("a:bodyPr"),
    createElement("a:lstStyle"),
    createElement("a:p"),
  ]);
}

function serializeCellProperties(props: TableCellProperties): XmlElement {
  const attrs: Record<string, string> = {};
  if (props.rowSpan !== undefined) {
    attrs.rowSpan = String(props.rowSpan);
  }
  if (props.colSpan !== undefined) {
    attrs.gridSpan = String(props.colSpan);
  }
  if (props.horizontalMerge) {
    attrs.hMerge = "1";
  }
  if (props.verticalMerge) {
    attrs.vMerge = "1";
  }
  return createElement("a:tcPr", attrs);
}

function serializeTableCell(cell: TableCell): XmlElement {
  const attrs: Record<string, string> = {};
  if (cell.id) {
    attrs.id = cell.id;
  }

  const txBody = cell.textBody ? serializeDrawingTextBody(cell.textBody) : createEmptyTxBody();
  const tcPr = serializeCellProperties(cell.properties);

  return createElement("a:tc", attrs, [txBody, tcPr]);
}

function serializeTableRow(row: TableRow): XmlElement {
  return createElement(
    "a:tr",
    { h: ooxmlEmu(row.height) },
    row.cells.map(serializeTableCell),
  );
}

/**
 * Update a single cell's txBody content.
 */
export function patchTableCell(cell: XmlElement, content: TextBody): XmlElement {
  if (cell.name !== "a:tc") {
    throw new Error(`patchTableCell: expected a:tc, got ${cell.name}`);
  }

  const txBody = getChild(cell, "a:txBody");
  if (txBody) {
    return replaceChildByName(cell, "a:txBody", patchTextBodyElement(txBody, content));
  }

  // Insert a:txBody before a:tcPr when possible (matches typical OOXML ordering)
  const tcPr = getChild(cell, "a:tcPr");
  const newTxBody = serializeDrawingTextBody(content);
  if (!tcPr) {
    return setChildren(cell, [newTxBody, ...cell.children]);
  }

  const tcPrIndex = cell.children.findIndex((c) => isXmlElement(c) && c.name === "a:tcPr");
  if (tcPrIndex < 0) {
    return setChildren(cell, [newTxBody, ...cell.children]);
  }

  const nextChildren: XmlNode[] = [...cell.children];
  nextChildren.splice(tcPrIndex, 0, newTxBody);
  return setChildren(cell, nextChildren);
}

function getTableRows(table: XmlElement): readonly XmlElement[] {
  return getChildren(table, "a:tr");
}

function getTableGrid(table: XmlElement): XmlElement {
  return requireChild(table, "a:tblGrid", "patchTable");
}

function getTableGridCols(tblGrid: XmlElement): readonly XmlElement[] {
  return getChildren(tblGrid, "a:gridCol");
}

function getRowCells(row: XmlElement): readonly XmlElement[] {
  return getChildren(row, "a:tc");
}

function replaceCellAt(row: XmlElement, colIndex: number, newCell: XmlElement): XmlElement {
  if (colIndex < 0) {
    throw new Error(`replaceCellAt: colIndex out of range: ${colIndex}`);
  }

  let current = -1;
  let replaced = false;
  const nextChildren = row.children.map((child) => {
    if (!isXmlElement(child) || child.name !== "a:tc") {
      return child;
    }
    current += 1;
    if (current !== colIndex) {
      return child;
    }
    replaced = true;
    return newCell;
  });

  if (!replaced) {
    throw new Error(`replaceCellAt: colIndex out of range: ${colIndex}`);
  }
  return setChildren(row, nextChildren);
}

function insertCellAt(row: XmlElement, position: number, newCell: XmlElement): XmlElement {
  if (position < 0) {
    throw new Error(`insertCellAt: position out of range: ${position}`);
  }

  const nextChildren: XmlNode[] = [];
  let cellIdx = 0;
  let inserted = false;
  for (const child of row.children) {
    if (isXmlElement(child) && child.name === "a:tc" && cellIdx === position) {
      nextChildren.push(newCell);
      inserted = true;
    }
    nextChildren.push(child);
    if (isXmlElement(child) && child.name === "a:tc") {
      cellIdx += 1;
    }
  }
  if (!inserted) {
    if (position !== cellIdx) {
      throw new Error(`insertCellAt: position out of range: ${position}`);
    }
    nextChildren.push(newCell);
  }
  return setChildren(row, nextChildren);
}

function removeCellAt(row: XmlElement, colIndex: number): XmlElement {
  if (colIndex < 0) {
    throw new Error(`removeCellAt: colIndex out of range: ${colIndex}`);
  }

  let current = -1;
  let removed = false;
  const nextChildren = row.children.filter((child) => {
    if (!isXmlElement(child) || child.name !== "a:tc") {
      return true;
    }
    current += 1;
    if (current !== colIndex) {
      return true;
    }
    removed = true;
    return false;
  });

  if (!removed) {
    throw new Error(`removeCellAt: colIndex out of range: ${colIndex}`);
  }
  return setChildren(row, nextChildren);
}

function replaceRowAt(table: XmlElement, rowIndex: number, newRow: XmlElement): XmlElement {
  const rows = getTableRows(table);
  if (rowIndex < 0 || rowIndex >= rows.length) {
    throw new Error(`patchTable: rowIndex out of range: ${rowIndex}`);
  }

  let currentRowIndex = -1;
  const nextChildren = table.children.map((child) => {
    if (!isXmlElement(child) || child.name !== "a:tr") {
      return child;
    }
    currentRowIndex += 1;
    return currentRowIndex === rowIndex ? newRow : child;
  });
  return setChildren(table, nextChildren);
}

function insertRowAt(table: XmlElement, newRow: XmlElement, position: number): XmlElement {
  const rows = getTableRows(table);
  if (position < 0 || position > rows.length) {
    throw new Error(`patchTable: addRow position out of range: ${position}`);
  }

  const children: XmlNode[] = [...table.children];
  // Insert among existing a:tr nodes, but keep tblPr/tblGrid before rows.
  let firstRowIndex = children.findIndex((c) => isXmlElement(c) && c.name === "a:tr");
  if (firstRowIndex < 0) {
    firstRowIndex = children.length;
  }
  children.splice(firstRowIndex + position, 0, newRow);
  return setChildren(table, children);
}

export function addTableRow(table: XmlElement, row: TableRow, position?: number): XmlElement {
  requireTable(table);

  const gridCols = getTableGridCols(getTableGrid(table));
  if (row.cells.length !== gridCols.length) {
    throw new Error(
      `addTableRow: row.cells length (${row.cells.length}) must match column count (${gridCols.length})`,
    );
  }

  const newRow = serializeTableRow(row);
  const insertAt = position ?? getTableRows(table).length;
  return insertRowAt(table, newRow, insertAt);
}

export function addTableColumn(table: XmlElement, column: TableColumn, position?: number): XmlElement {
  requireTable(table);

  const tblGrid = getTableGrid(table);
  const gridCols = getTableGridCols(tblGrid);
  const insertAt = position ?? gridCols.length;
  if (insertAt < 0 || insertAt > gridCols.length) {
    throw new Error(`addTableColumn: position out of range: ${insertAt}`);
  }

  const newGridCol = createElement("a:gridCol", { w: ooxmlEmu(column.width) });
  const nextGridChildren: XmlNode[] = [...tblGrid.children];
  nextGridChildren.splice(insertAt, 0, newGridCol);
  const nextTblGrid = setChildren(tblGrid, nextGridChildren);

  const newCell = createElement("a:tc", {}, [createEmptyTxBody(), createElement("a:tcPr")]);
  const nextChildren = table.children.map((child) => {
    if (!isXmlElement(child)) {
      return child;
    }
    if (child.name === "a:tblGrid") {
      return nextTblGrid;
    }
    if (child.name === "a:tr") {
      return insertCellAt(child, insertAt, newCell);
    }
    return child;
  });

  return setChildren(table, nextChildren);
}

function removeRow(table: XmlElement, rowIndex: number): XmlElement {
  requireTable(table);
  const rows = getTableRows(table);
  if (rowIndex < 0 || rowIndex >= rows.length) {
    throw new Error(`removeRow: rowIndex out of range: ${rowIndex}`);
  }

  let currentRowIndex = -1;
  const nextChildren = table.children.filter((child) => {
    if (!isXmlElement(child) || child.name !== "a:tr") {
      return true;
    }
    currentRowIndex += 1;
    return currentRowIndex !== rowIndex;
  });
  return setChildren(table, nextChildren);
}

function removeColumn(table: XmlElement, colIndex: number): XmlElement {
  requireTable(table);

  const tblGrid = getTableGrid(table);
  const gridCols = getTableGridCols(tblGrid);
  if (colIndex < 0 || colIndex >= gridCols.length) {
    throw new Error(`removeColumn: colIndex out of range: ${colIndex}`);
  }

  const nextGrid = setChildren(tblGrid, tblGrid.children.filter((_, idx) => idx !== colIndex));

  const nextChildren = table.children.map((child) => {
    if (!isXmlElement(child)) {
      return child;
    }
    if (child.name === "a:tblGrid") {
      return nextGrid;
    }
    if (child.name === "a:tr") {
      return removeCellAt(child, colIndex);
    }
    return child;
  });

  return setChildren(table, nextChildren);
}

function ensureTcPr(cell: XmlElement): XmlElement {
  const tcPr = getChild(cell, "a:tcPr");
  if (tcPr) {
    return cell;
  }
  return setChildren(cell, [...cell.children, createElement("a:tcPr")]);
}

function patchMergeCell(
  cell: XmlElement,
  attrs: Readonly<Record<string, string | undefined>>,
): XmlElement {
  const withTcPr = ensureTcPr(cell);
  const tcPr = requireChild(withTcPr, "a:tcPr", "patchMergeCell");

  let next = tcPr;
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined) {
      next = removeAttribute(next, k);
    } else {
      next = setAttribute(next, k, v);
    }
  }
  return replaceChildByName(withTcPr, "a:tcPr", next);
}

function applyMergeRange(
  table: XmlElement,
  startRow: number,
  startCol: number,
  rowSpan: number,
  colSpan: number,
): XmlElement {
  const rows = getTableRows(table);
  if (rowSpan < 1 || colSpan < 1) {
    throw new Error("merge: rowSpan and colSpan must be >= 1");
  }
  if (startRow < 0 || startCol < 0) {
    throw new Error("merge: startRow/startCol must be >= 0");
  }
  if (startRow + rowSpan > rows.length) {
    throw new Error("merge: row range out of bounds");
  }

  const firstRowCells = getRowCells(rows[startRow] as XmlElement);
  if (startCol + colSpan > firstRowCells.length) {
    throw new Error("merge: column range out of bounds");
  }

  let nextTable = table;

  for (let r = 0; r < rowSpan; r += 1) {
    const rowIndex = startRow + r;
    const rowEl = rows[rowIndex] as XmlElement;
    const rowChildren: XmlNode[] = [];
    let cellIdx = 0;
    for (const child of rowEl.children) {
      if (isXmlElement(child) && child.name === "a:tc") {
        const rr = rowIndex - startRow;
        const cc = cellIdx - startCol;
        const inRange = rr >= 0 && rr < rowSpan && cc >= 0 && cc < colSpan;
        if (!inRange) {
          rowChildren.push(child);
          cellIdx += 1;
          continue;
        }

        const isTopLeft = rr === 0 && cc === 0;
        const isContinuationCol = cc > 0 && colSpan > 1;
        const isContinuationRow = rr > 0 && rowSpan > 1;
        rowChildren.push(
          patchMergeCell(child, {
            gridSpan: isTopLeft && colSpan > 1 ? String(colSpan) : undefined,
            rowSpan: isTopLeft && rowSpan > 1 ? String(rowSpan) : undefined,
            hMerge: !isTopLeft && isContinuationCol ? "1" : undefined,
            vMerge: !isTopLeft && isContinuationRow ? "1" : undefined,
          }),
        );
        cellIdx += 1;
        continue;
      }
      rowChildren.push(child);
    }

    nextTable = replaceRowAt(nextTable, rowIndex, setChildren(rowEl, rowChildren));
  }

  return nextTable;
}

function applySplitRange(
  table: XmlElement,
  startRow: number,
  startCol: number,
  rowSpan: number,
  colSpan: number,
): XmlElement {
  const rows = getTableRows(table);
  if (rowSpan < 1 || colSpan < 1) {
    throw new Error("split: rowSpan and colSpan must be >= 1");
  }
  if (startRow < 0 || startCol < 0) {
    throw new Error("split: startRow/startCol must be >= 0");
  }
  if (startRow + rowSpan > rows.length) {
    throw new Error("split: row range out of bounds");
  }
  const firstRowCells = getRowCells(rows[startRow] as XmlElement);
  if (startCol + colSpan > firstRowCells.length) {
    throw new Error("split: column range out of bounds");
  }

  let nextTable = table;

  for (let r = 0; r < rowSpan; r += 1) {
    const rowIndex = startRow + r;
    const rowEl = rows[rowIndex] as XmlElement;
    const cells = getRowCells(rowEl);

    const rowChildren: XmlNode[] = [];
    let cellIdx = 0;
    for (const child of rowEl.children) {
      if (isXmlElement(child) && child.name === "a:tc") {
        const originalCell = cells[cellIdx] as XmlElement;
        const rr = rowIndex - startRow;
        const cc = cellIdx - startCol;
        const inRange = rr >= 0 && rr < rowSpan && cc >= 0 && cc < colSpan;
        if (inRange) {
          rowChildren.push(
            patchMergeCell(originalCell, {
              gridSpan: undefined,
              rowSpan: undefined,
              hMerge: undefined,
              vMerge: undefined,
            }),
          );
        } else {
          rowChildren.push(originalCell);
        }
        cellIdx += 1;
        continue;
      }
      rowChildren.push(child);
    }

    nextTable = replaceRowAt(nextTable, rowIndex, setChildren(rowEl, rowChildren));
  }

  return nextTable;
}

/**
 * Patch a:tbl with a set of changes.
 */
export function patchTable(tableElement: XmlElement, changes: readonly TableChange[]): XmlElement {
  requireTable(tableElement);

  let next = tableElement;
  for (const change of changes) {
    switch (change.type) {
      case "cell": {
        const rows = getTableRows(next);
        const rowEl = rows[change.row];
        if (!rowEl) {
          throw new Error(`patchTable: row out of range: ${change.row}`);
        }
        const cells = getRowCells(rowEl);
        const cellEl = cells[change.col];
        if (!cellEl) {
          throw new Error(`patchTable: col out of range: ${change.col}`);
        }
        const patchedCell = patchTableCell(cellEl, change.content);
        next = replaceRowAt(next, change.row, replaceCellAt(rowEl, change.col, patchedCell));
        break;
      }
      case "addRow":
        next = addTableRow(next, change.row, change.position);
        break;
      case "removeRow":
        next = removeRow(next, change.rowIndex);
        break;
      case "addColumn":
        next = addTableColumn(next, change.column, change.position);
        break;
      case "removeColumn":
        next = removeColumn(next, change.colIndex);
        break;
      case "merge":
        next = applyMergeRange(next, change.startRow, change.startCol, change.rowSpan, change.colSpan);
        break;
      case "split":
        next = applySplitRange(next, change.startRow, change.startCol, change.rowSpan, change.colSpan);
        break;
      default:
        ((_: never) => _)(change);
    }
  }

  return next;
}
