/**
 * @file Table parser (SpreadsheetML ListObject)
 *
 * Parses `xl/tables/table*.xml` definitions used for structured references.
 *
 * @see ECMA-376 Part 4, Section 18.5.1.2 (table)
 * @see ECMA-376 Part 4, Section 18.5.1.4 (tableColumn)
 */

import { parseRange } from "../domain/cell/address";
import type { XlsxTable, XlsxTableColumn, XlsxTableStyleInfo } from "../domain/table/types";
import { parseBooleanAttr, parseIntAttr } from "./primitive";
import type { XmlElement } from "@oxen/xml";
import { getAttr, getChild, getChildren } from "@oxen/xml";

function requireAttr(element: XmlElement, name: string): string {
  const value = getAttr(element, name);
  if (!value) {
    throw new Error(`Missing required attribute "${name}"`);
  }
  return value;
}

function parseTableColumns(tableElement: XmlElement): readonly XlsxTableColumn[] {
  const columnsEl = getChildren(tableElement, "tableColumns")[0];
  if (!columnsEl) {
    return [];
  }
  return getChildren(columnsEl, "tableColumn").map((col): XlsxTableColumn => {
    const id = parseIntAttr(getAttr(col, "id"));
    if (id === undefined) {
      throw new Error('tableColumn missing required attribute "id"');
    }
    const name = requireAttr(col, "name");
    return { id, name };
  });
}

function parseTableStyleInfo(tableElement: XmlElement): XlsxTableStyleInfo | undefined {
  const styleInfoEl = getChild(tableElement, "tableStyleInfo");
  if (!styleInfoEl) {
    return undefined;
  }
  const name = getAttr(styleInfoEl, "name");
  if (!name) {
    return undefined;
  }
  return {
    name,
    showFirstColumn: parseBooleanAttr(getAttr(styleInfoEl, "showFirstColumn")),
    showLastColumn: parseBooleanAttr(getAttr(styleInfoEl, "showLastColumn")),
    showRowStripes: parseBooleanAttr(getAttr(styleInfoEl, "showRowStripes")),
    showColumnStripes: parseBooleanAttr(getAttr(styleInfoEl, "showColumnStripes")),
  };
}

/**
 * Parse a SpreadsheetML table definition.
 *
 * @param tableElement - Root `<table>` element from `xl/tables/table*.xml`
 * @param sheetIndex - Index of the owning sheet in workbook order
 */
export function parseTable(tableElement: XmlElement, sheetIndex: number): XlsxTable {
  const id = parseIntAttr(getAttr(tableElement, "id")) ?? 0;
  const name = requireAttr(tableElement, "name");
  const displayName = getAttr(tableElement, "displayName") ?? undefined;
  const ref = parseRange(requireAttr(tableElement, "ref"));

  const headerRowCount = parseIntAttr(getAttr(tableElement, "headerRowCount")) ?? 1;
  const totalsRowCountAttr = parseIntAttr(getAttr(tableElement, "totalsRowCount"));
  const totalsRowShown = parseBooleanAttr(getAttr(tableElement, "totalsRowShown")) === true;
  const totalsRowCount = totalsRowCountAttr ?? (totalsRowShown ? 1 : 0);

  const columns = parseTableColumns(tableElement);
  const styleInfo = parseTableStyleInfo(tableElement);

  return {
    id,
    name,
    displayName,
    ref,
    headerRowCount,
    totalsRowCount,
    sheetIndex,
    columns,
    styleInfo,
  };
}
