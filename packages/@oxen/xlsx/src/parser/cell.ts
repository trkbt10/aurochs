/**
 * @file Cell Parser
 *
 * Parses cell elements from worksheet XML in XLSX files.
 * Handles cell values, formulas, and style references.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.4 (Cell Element)
 * @see ECMA-376 Part 4, Section 18.18.11 (Cell Types)
 * @see ECMA-376 Part 4, Section 18.3.1.40 (Formula Element)
 * @see ECMA-376 Part 4, Section 18.18.18 (Error Values)
 */

import type { Cell, CellValue, ErrorValue } from "../domain/cell/types";
import { parseCellRef, parseRange } from "../domain/cell/address";
import type { CellAddress } from "../domain/cell/address";
import type { Formula, FormulaType } from "../domain/cell/formula";
import { styleId } from "../domain/types";
import type { XlsxParseContext } from "./context";
import { parseBooleanAttr } from "./primitive";
import type { XmlElement } from "@oxen/xml";
import { getAttr, getChild, getTextContent } from "@oxen/xml";

// =============================================================================
// Formula Parsing
// =============================================================================

/**
 * Parse a formula element into a Formula object.
 *
 * @param formulaElement - The <f> element from a cell
 * @returns The parsed Formula
 *
 * @see ECMA-376 Part 4, Section 18.3.1.40 (f - Formula)
 */
export function parseFormula(formulaElement: XmlElement): Formula {
  const expression = getTextContent(formulaElement);
  const type = (getAttr(formulaElement, "t") ?? "normal") as FormulaType;
  const refAttr = getAttr(formulaElement, "ref");
  const siAttr = getAttr(formulaElement, "si");
  const caAttr = getAttr(formulaElement, "ca");

  return {
    expression,
    type,
    ref: refAttr ? parseRange(refAttr) : undefined,
    sharedIndex: siAttr ? parseInt(siAttr, 10) : undefined,
    calculateAlways: parseBooleanAttr(caAttr),
  };
}

// =============================================================================
// Cell Value Parsing
// =============================================================================

/**
 * Parse the value of a cell based on its type.
 *
 * @param cellElement - The <c> cell element
 * @param cellType - The cell type attribute (t)
 * @param context - The parse context containing shared strings
 * @returns The parsed CellValue
 *
 * @see ECMA-376 Part 4, Section 18.18.11 (ST_CellType)
 */
export function parseCellValue(
  cellElement: XmlElement,
  cellType: string | undefined,
  context: XlsxParseContext,
): CellValue {
  const v = getChild(cellElement, "v");
  const vText = v ? getTextContent(v) : "";

  // Default is "n" (number)
  const t = cellType ?? "n";

  switch (t) {
    case "s": {
      // Shared string
      const idx = parseInt(vText, 10);
      const str = context.sharedStrings[idx] ?? "";
      return { type: "string", value: str };
    }
    case "n": {
      // Number
      if (vText === "") {
        return { type: "empty" };
      }
      return { type: "number", value: parseFloat(vText) };
    }
    case "b": {
      // Boolean
      return { type: "boolean", value: vText === "1" };
    }
    case "e": {
      // Error
      return { type: "error", value: vText as ErrorValue };
    }
    case "str": {
      // Formula string result
      return { type: "string", value: vText };
    }
    case "inlineStr": {
      // Inline string
      const is = getChild(cellElement, "is");
      const t = is ? getChild(is, "t") : undefined;
      return { type: "string", value: t ? getTextContent(t) : "" };
    }
    case "d": {
      // Date (ISO 8601)
      return { type: "date", value: new Date(vText) };
    }
    default:
      return { type: "string", value: vText };
  }
}

// =============================================================================
// Cell Parsing
// =============================================================================

/**
 * Parse a cell element into a Cell object using a pre-resolved address.
 *
 * @param cellElement - The <c> cell element
 * @param context - The parse context containing shared strings
 * @param address - The resolved cell address
 * @returns The parsed Cell
 *
 * @see ECMA-376 Part 4, Section 18.3.1.4 (c - Cell)
 */
export function parseCellWithAddress(
  cellElement: XmlElement,
  context: XlsxParseContext,
  address: CellAddress,
): Cell {
  const s = getAttr(cellElement, "s");
  const t = getAttr(cellElement, "t");

  const value = parseCellValue(cellElement, t, context);

  const f = getChild(cellElement, "f");
  const formula = f ? parseFormula(f) : undefined;

  return {
    address,
    value,
    formula,
    styleId: s ? styleId(parseInt(s, 10)) : undefined,
  };
}

/**
 * Parse a cell element into a Cell object.
 *
 * @param cellElement - The <c> cell element
 * @param context - The parse context containing shared strings
 * @returns The parsed Cell
 * @throws Error if the cell element is missing the 'r' attribute
 *
 * @see ECMA-376 Part 4, Section 18.3.1.4 (c - Cell)
 */
export function parseCell(
  cellElement: XmlElement,
  context: XlsxParseContext,
): Cell {
  const r = getAttr(cellElement, "r");
  if (!r) {
    throw new Error("Cell element missing 'r' attribute");
  }
  return parseCellWithAddress(cellElement, context, parseCellRef(r));
}
