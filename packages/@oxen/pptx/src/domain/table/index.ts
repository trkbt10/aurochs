/**
 * @file Table domain module
 *
 * Table types and resolution utilities.
 *
 * @see ECMA-376 Part 1, Section 21.1.3 - DrawingML Tables
 */

// Types
export type {
  Table,
  TableProperties,
  TableGrid,
  TableColumn,
  TableRow,
  TableCell,
  CellMargin,
  CellAnchor,
  CellHorzOverflow,
  CellVerticalType,
  TableCellProperties,
  CellBorders,
  TableStyle,
  TablePartStyle,
  Cell3d,
  TableTextProperties,
} from "./types";

// Resolution utilities
export {
  resolveRowHeight,
  resolveSvgRowHeight,
  resolveTableScale,
  resolveSpanCount,
  resolveSpanWidth,
  resolveSpanHeight,
  isFlagEnabled,
} from "./resolver";

export type { TableScaleResult } from "./resolver";
