/**
 * @file Cell Serializer for worksheet sheet.xml
 *
 * Serializes Cell types to XML elements.
 * Produces ECMA-376 compliant SpreadsheetML cell elements.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.4 (c - Cell)
 * @see ECMA-376 Part 4, Section 18.18.11 (ST_CellType)
 * @see ECMA-376 Part 4, Section 18.3.1.40 (f - Formula)
 */

import type { Cell, CellValue } from "../domain/cell/types";
import type { Formula, DataTableFormula } from "../domain/cell/formula";
import type { XmlElement, XmlNode } from "../../xml";
import { serializeCellRef, serializeRef, serializeBoolean } from "./units";

// =============================================================================
// SharedStringTable Interface
// =============================================================================

/**
 * Shared string table operations.
 *
 * The shared string table is used to deduplicate string values in Excel files.
 */
export type SharedStringTable = {
  /** Get the index of an existing string, or undefined if not found */
  getIndex(value: string): number | undefined;
  /** Add a string to the table and return its index */
  addString(value: string): number;
};

// =============================================================================
// Cell Value Serialization Result
// =============================================================================

/**
 * Result of serializing a cell value.
 *
 * Contains the type attribute, value string, and optional formula element.
 */
export type CellValueSerializeResult = {
  /** Cell type attribute (t). Omit for number type. */
  t?: string;
  /** Value element content (v). */
  v?: string;
  /** Formula element (f). */
  f?: XmlElement;
  /** Inline string element (is). */
  is?: XmlElement;
};

// =============================================================================
// Date Serialization
// =============================================================================

/**
 * Convert a Date to Excel serial date number.
 *
 * Excel's epoch is January 1, 1900. Due to the Lotus 1-2-3 bug,
 * Excel incorrectly treats 1900 as a leap year.
 *
 * @param date - The Date to convert
 * @returns Excel serial date number
 */
function dateToSerial(date: Date): number {
  // Excel epoch: January 1, 1900 (with the 1900 leap year bug)
  // JavaScript epoch: January 1, 1970
  const EXCEL_EPOCH = new Date(1899, 11, 30); // December 30, 1899 (accounts for leap year bug)
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const diffMs = date.getTime() - EXCEL_EPOCH.getTime();
  return diffMs / MS_PER_DAY;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build formula children array from expression.
 */
function buildFormulaChildren(expression: string): XmlNode[] {
  if (!expression) {
    return [];
  }
  return [{ type: "text" as const, value: expression }];
}

/**
 * Get existing shared string index or add a new one.
 */
function getOrAddSharedString(table: SharedStringTable, value: string): number {
  const existingIndex = table.getIndex(value);
  if (existingIndex !== undefined) {
    return existingIndex;
  }
  return table.addString(value);
}

// =============================================================================
// Formula Serialization
// =============================================================================

/**
 * Serialize a Formula to XML element.
 *
 * @param formula - The formula to serialize
 * @returns XmlElement for the formula
 *
 * @see ECMA-376 Part 4, Section 18.3.1.40 (f - Formula)
 *
 * @example
 * // Normal formula: <f>SUM(A1:A10)</f>
 * // Shared formula: <f t="shared" ref="B2:B10" si="0">A2*2</f>
 * // Array formula: <f t="array" ref="A1:A10">{SUM(B1:B10)}</f>
 */
export function serializeFormula(formula: Formula): XmlElement {
  const attrs: Record<string, string> = {};

  // Add type attribute (omit for "normal" type)
  if (formula.type !== "normal") {
    attrs.t = formula.type;
  }

  // Add ref attribute for array/shared/dataTable formulas
  if (formula.ref) {
    attrs.ref = serializeRef(formula.ref);
  }

  // Add shared index for shared formulas
  if (formula.sharedIndex !== undefined) {
    attrs.si = String(formula.sharedIndex);
  }

  // Add calculate always flag
  if (formula.calculateAlways) {
    attrs.ca = serializeBoolean(formula.calculateAlways);
  }

  // Add data table specific attributes
  if (formula.type === "dataTable") {
    const dtFormula = formula as DataTableFormula;
    if (dtFormula.dt2D !== undefined) {
      attrs.dt2D = serializeBoolean(dtFormula.dt2D);
    }
    if (dtFormula.dtr !== undefined) {
      attrs.dtr = serializeBoolean(dtFormula.dtr);
    }
    if (dtFormula.r1 !== undefined) {
      attrs.r1 = dtFormula.r1;
    }
    if (dtFormula.r2 !== undefined) {
      attrs.r2 = dtFormula.r2;
    }
  }

  // Formula expression as text content
  const children: XmlNode[] = buildFormulaChildren(formula.expression);

  return {
    type: "element",
    name: "f",
    attrs,
    children,
  };
}

// =============================================================================
// Cell Value Serialization
// =============================================================================

/**
 * Serialize a CellValue to its XML representation components.
 *
 * @param value - The cell value to serialize
 * @param sharedStrings - The shared string table for string values
 * @returns Object containing t (type), v (value), and optionally is (inline string) elements
 *
 * @see ECMA-376 Part 4, Section 18.18.11 (ST_CellType)
 *
 * Cell Type Mapping:
 * | CellValue Type | t attribute | v element                    |
 * |----------------|-------------|------------------------------|
 * | number         | (omitted)   | numeric string               |
 * | string         | "s"         | shared strings index         |
 * | boolean        | "b"         | "0" or "1"                   |
 * | error          | "e"         | error code                   |
 * | date           | (omitted)   | serial date number           |
 * | empty          | -           | -                            |
 */
export function serializeCellValue(
  value: CellValue,
  sharedStrings: SharedStringTable,
): CellValueSerializeResult {
  switch (value.type) {
    case "number":
      if (!Number.isFinite(value.value)) {
        return { t: "e", v: "#NUM!" };
      }
      // Number type: t attribute is omitted (default is "n")
      return { v: String(value.value) };

    case "string": {
      // String type: use shared strings table
      const index = getOrAddSharedString(sharedStrings, value.value);
      return { t: "s", v: String(index) };
    }

    case "boolean":
      // Boolean type: t="b", v="0" or "1"
      return { t: "b", v: serializeBoolean(value.value) };

    case "error":
      // Error type: t="e", v is the error code
      return { t: "e", v: value.value };

    case "date":
      // Date type: stored as number, relies on format to display as date
      return { v: String(dateToSerial(value.value)) };

    case "empty":
      // Empty cell: no value
      return {};
  }
}

// =============================================================================
// Cell Serialization
// =============================================================================

/**
 * Serialize a Cell to XML element.
 *
 * @param cell - The cell to serialize
 * @param sharedStrings - The shared string table for string values
 * @returns XmlElement for the cell
 *
 * @see ECMA-376 Part 4, Section 18.3.1.4 (c - Cell)
 *
 * @example
 * // Number cell: <c r="A1"><v>42</v></c>
 * // String cell: <c r="B1" t="s"><v>0</v></c>
 * // Boolean cell: <c r="C1" t="b"><v>1</v></c>
 * // Error cell: <c r="D1" t="e"><v>#DIV/0!</v></c>
 * // Cell with style: <c r="E1" s="1"><v>100</v></c>
 * // Cell with formula: <c r="F1"><f>SUM(A1:A10)</f><v>55</v></c>
 */
export function serializeCell(
  cell: Cell,
  sharedStrings: SharedStringTable,
): XmlElement {
  const attrs: Record<string, string> = {};

  // Cell reference (required)
  attrs.r = serializeCellRef(cell.address);

  // Style index (omit if 0)
  if (cell.styleId !== undefined && (cell.styleId as number) !== 0) {
    attrs.s = String(cell.styleId);
  }

  // Serialize cell value
  const valueResult = serializeCellValue(cell.value, sharedStrings);

  // Type attribute
  if (valueResult.t !== undefined) {
    attrs.t = valueResult.t;
  }

  // Build children
  const children: XmlNode[] = [];

  // Formula element (if present)
  if (cell.formula) {
    children.push(serializeFormula(cell.formula));
  }

  // Value element (if present)
  if (valueResult.v !== undefined) {
    children.push({
      type: "element",
      name: "v",
      attrs: {},
      children: [{ type: "text", value: valueResult.v }],
    });
  }

  // Inline string element (if present)
  if (valueResult.is !== undefined) {
    children.push(valueResult.is);
  }

  return {
    type: "element",
    name: "c",
    attrs,
    children,
  };
}
