/**
 * @file Cell serialization utilities for JSON output
 */

import type { Cell, CellValue } from "@aurochs-office/xlsx/domain/cell/types";
import { formatCellRef } from "@aurochs-office/xlsx/domain/cell/address";

// =============================================================================
// JSON Types
// =============================================================================

export type CellJson = {
  readonly ref: string;
  readonly type: "string" | "number" | "boolean" | "date" | "error" | "empty";
  readonly value: string | number | boolean | null;
  readonly formula?: string;
  readonly styleId?: number;
};

// =============================================================================
// Serialization Functions
// =============================================================================

function cellValueToJson(value: CellValue): { type: CellJson["type"]; value: CellJson["value"] } {
  switch (value.type) {
    case "string":
      return { type: "string", value: value.value };
    case "number":
      return { type: "number", value: value.value };
    case "boolean":
      return { type: "boolean", value: value.value };
    case "date":
      return { type: "date", value: value.value.toISOString() };
    case "error":
      return { type: "error", value: value.value };
    case "empty":
      return { type: "empty", value: null };
  }
}

/**
 * Serialize an XLSX cell to JSON format.
 */
export function serializeCell(cell: Cell): CellJson {
  const { type, value } = cellValueToJson(cell.value);

  return {
    ref: formatCellRef(cell.address),
    type,
    value,
    ...(cell.formula && { formula: cell.formula.expression }),
    ...(cell.styleId !== undefined && { styleId: cell.styleId }),
  };
}

/**
 * Format cell value as string for display.
 */
export function formatCellValue(value: CellValue): string {
  switch (value.type) {
    case "string":
      return value.value;
    case "number":
      return String(value.value);
    case "boolean":
      return value.value ? "TRUE" : "FALSE";
    case "date":
      return value.value.toISOString();
    case "error":
      return value.value;
    case "empty":
      return "";
  }
}
