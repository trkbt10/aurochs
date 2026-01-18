/**
 * @file DOCX Table to Layout Adapter
 *
 * Converts DOCX table domain types to layout input types.
 * This adapter bridges the DOCX-specific table types with the unified layout engine.
 *
 * @see ECMA-376 Part 1, Section 17.4 (Tables)
 */

import type {
  LayoutTableInput,
  LayoutTableRowInput,
  LayoutTableCellInput,
  LayoutBorderStyle,
  LayoutCellBorders,
  LayoutParagraphInput,
} from "../types";
import type {
  DocxTable,
  DocxTableRow,
  DocxTableCell,
  DocxTableProperties,
  DocxTableCellProperties,
  DocxTableBorderEdge,
  DocxCellBorders,
  DocxTableBorders,
} from "../../docx/domain/table";
import type { DocxParagraph } from "../../docx/domain/paragraph";
import type { DocxNumbering } from "../../docx/domain/numbering";
import type { DocxStyles } from "../../docx/domain/styles";
import type { TableWidth, TableCellMargins } from "../../ooxml/domain/table";
import type { Pixels } from "../../ooxml/domain/units";
import { px } from "../../ooxml/domain/units";
import { paragraphToLayoutInput, createParagraphLayoutContext } from "./docx-adapter";
import {
  TWIPS_PER_POINT,
  PT_TO_PX,
} from "../../docx/domain/ecma376-defaults";

// =============================================================================
// Constants
// =============================================================================

/** Default cell padding in pixels (5 twips = about 0.35pt) */
const DEFAULT_CELL_PADDING = px(5 * (PT_TO_PX / TWIPS_PER_POINT));

/** Default border width in pixels (1/8 point) */
const DEFAULT_BORDER_WIDTH = px(0.125 * PT_TO_PX);

/** Default border color */
const DEFAULT_BORDER_COLOR = "#000000";

// =============================================================================
// Border Conversion
// =============================================================================

/**
 * Convert DOCX border edge to layout border style.
 */
function convertBorderEdge(edge: DocxTableBorderEdge | undefined): LayoutBorderStyle | undefined {
  if (edge === undefined) {
    return undefined;
  }

  const { val, sz, color } = edge;

  // Handle "nil" and "none" as no border
  if (val === "nil" || val === "none") {
    return undefined;
  }

  // Convert border style
  const style = convertBorderStyleType(val);

  // Size is in eighths of a point
  const width = sz !== undefined ? px((sz / 8) * PT_TO_PX) : DEFAULT_BORDER_WIDTH;

  // Color: "auto" means black
  const borderColor = color === "auto" || color === undefined ? DEFAULT_BORDER_COLOR : `#${color}`;

  return {
    style,
    width,
    color: borderColor,
  };
}

/**
 * Convert DOCX border style to layout border style.
 */
function convertBorderStyleType(val: string): LayoutBorderStyle["style"] {
  switch (val) {
    case "single":
      return "single";
    case "thick":
      return "thick";
    case "double":
      return "double";
    case "dotted":
      return "dotted";
    case "dashed":
    case "dashSmallGap":
    case "dotDash":
    case "dotDotDash":
      return "dashed";
    default:
      return "single";
  }
}

/**
 * Convert DOCX cell borders to layout cell borders.
 */
function convertCellBorders(borders: DocxCellBorders | undefined): LayoutCellBorders | undefined {
  if (borders === undefined) {
    return undefined;
  }

  return {
    top: convertBorderEdge(borders.top),
    right: convertBorderEdge(borders.right),
    bottom: convertBorderEdge(borders.bottom),
    left: convertBorderEdge(borders.left),
  };
}

/**
 * Convert DOCX table borders to layout table borders.
 */
function convertTableBorders(borders: DocxTableBorders | undefined): LayoutTableInput["borders"] {
  if (borders === undefined) {
    return undefined;
  }

  return {
    top: convertBorderEdge(borders.top),
    right: convertBorderEdge(borders.right),
    bottom: convertBorderEdge(borders.bottom),
    left: convertBorderEdge(borders.left),
    insideH: convertBorderEdge(borders.insideH),
    insideV: convertBorderEdge(borders.insideV),
  };
}

// =============================================================================
// Width Conversion
// =============================================================================

/**
 * Convert DOCX table width to pixels.
 */
function convertTableWidth(
  width: TableWidth | undefined,
  containerWidth: Pixels,
): Pixels | undefined {
  if (width === undefined) {
    return undefined;
  }

  switch (width.type) {
    case "dxa":
      // Twips to pixels
      return px(width.value * (PT_TO_PX / TWIPS_PER_POINT));
    case "pct":
      // Percentage of container (stored as fiftieths of a percent)
      return px((width.value / 5000) * (containerWidth as number));
    case "auto":
    case "nil":
    default:
      return undefined;
  }
}

/**
 * Get background color from shading fill value.
 */
function getBackgroundColor(fill: string | undefined): string | undefined {
  if (fill === undefined || fill === "auto") {
    return undefined;
  }
  return `#${fill}`;
}

/**
 * Convert DOCX vertical alignment to layout vertical align.
 */
function convertVerticalAlign(
  vAlign: "top" | "center" | "bottom" | "both" | undefined,
): "top" | "center" | "bottom" {
  switch (vAlign) {
    case "center":
      return "center";
    case "bottom":
      return "bottom";
    default:
      return "top";
  }
}

/**
 * Convert cell spacing from twips to pixels.
 */
function convertCellSpacing(w: number | undefined): Pixels {
  if (w === undefined) {
    return px(0);
  }
  return px(w * (PT_TO_PX / TWIPS_PER_POINT));
}

/**
 * Convert row height from twips to pixels.
 */
function convertRowHeight(val: number | undefined): Pixels | undefined {
  if (val === undefined) {
    return undefined;
  }
  return px(val * (PT_TO_PX / TWIPS_PER_POINT));
}

/**
 * Convert height rule to layout height rule.
 */
function convertHeightRule(
  hRule: "auto" | "atLeast" | "exact" | undefined,
): "auto" | "atLeast" | "exact" {
  switch (hRule) {
    case "exact":
      return "exact";
    case "atLeast":
      return "atLeast";
    default:
      return "auto";
  }
}

/**
 * Convert DOCX cell margins to padding.
 */
function convertCellMargins(
  margins: TableCellMargins | undefined,
  defaultMargins: TableCellMargins | undefined,
): LayoutTableCellInput["padding"] {
  const resolved = margins ?? defaultMargins;

  return {
    top: resolved?.top ?? DEFAULT_CELL_PADDING,
    right: resolved?.right ?? DEFAULT_CELL_PADDING,
    bottom: resolved?.bottom ?? DEFAULT_CELL_PADDING,
    left: resolved?.left ?? DEFAULT_CELL_PADDING,
  };
}

// =============================================================================
// Cell Conversion
// =============================================================================

/**
 * Convert a DOCX table cell to layout input.
 */
function convertTableCell(
  cell: DocxTableCell,
  cellProps: DocxTableCellProperties | undefined,
  tableProps: DocxTableProperties | undefined,
  context: TableConversionContext,
): LayoutTableCellInput {
  const props = cellProps ?? {};

  // Convert paragraphs within the cell
  const paragraphs: LayoutParagraphInput[] = [];
  for (const content of cell.content) {
    if (content.type === "paragraph") {
      paragraphs.push(paragraphToLayoutInput(content, context.paragraphContext));
    }
    // Nested tables would need recursive handling - skip for now
  }

  // Get grid span (default 1)
  const gridSpan = (props.gridSpan as number) ?? 1;

  // Get vertical merge state
  const vMerge = props.vMerge;

  // Convert cell width
  const width = convertTableWidth(props.tcW, context.containerWidth);

  // Convert padding (cell margins override table defaults)
  const padding = convertCellMargins(props.tcMar, tableProps?.tblCellMar);

  // Convert borders
  const borders = convertCellBorders(props.tcBorders);

  // Get background color from shading
  const backgroundColor = getBackgroundColor(props.shd?.fill);

  // Get vertical alignment
  const verticalAlign = convertVerticalAlign(props.vAlign);

  return {
    paragraphs,
    width,
    gridSpan,
    vMerge,
    padding,
    borders,
    backgroundColor,
    verticalAlign,
  };
}

// =============================================================================
// Row Conversion
// =============================================================================

/**
 * Convert a DOCX table row to layout input.
 */
function convertTableRow(
  row: DocxTableRow,
  tableProps: DocxTableProperties | undefined,
  context: TableConversionContext,
): LayoutTableRowInput {
  const rowProps = row.properties;

  // Convert cells
  const cells: LayoutTableCellInput[] = row.cells.map((cell) =>
    convertTableCell(cell, cell.properties, tableProps, context),
  );

  // Get row height
  const trHeight = rowProps?.trHeight;
  const height = convertRowHeight(trHeight?.val);

  // Get height rule
  const heightRule = convertHeightRule(trHeight?.hRule);

  // Check if this is a header row
  const isHeader = rowProps?.tblHeader ?? false;

  return {
    cells,
    height,
    heightRule,
    isHeader,
  };
}

// =============================================================================
// Table Conversion
// =============================================================================

/**
 * Context for table conversion.
 */
type TableConversionContext = {
  /** Container width for percentage calculations */
  readonly containerWidth: Pixels;
  /** Paragraph layout context for cell content */
  readonly paragraphContext: ReturnType<typeof createParagraphLayoutContext>;
};

/**
 * Convert a DOCX table to layout input.
 *
 * @param table The DOCX table to convert
 * @param containerWidth The width of the container (for percentage calculations)
 * @param numbering Optional numbering definitions for lists in cells
 * @param styles Optional style definitions for text formatting
 */
export function tableToLayoutInput(
  table: DocxTable,
  containerWidth: Pixels,
  numbering?: DocxNumbering,
  styles?: DocxStyles,
): LayoutTableInput {
  const props = table.properties;

  // Create paragraph context for cell content
  const paragraphContext = createParagraphLayoutContext(numbering, styles);

  const context: TableConversionContext = {
    containerWidth,
    paragraphContext,
  };

  // Get grid column widths from tblGrid
  const gridColumnWidths: Pixels[] = [];
  if (table.grid?.columns !== undefined) {
    for (const col of table.grid.columns) {
      gridColumnWidths.push(col.width);
    }
  }

  // Convert rows
  const rows: LayoutTableRowInput[] = table.rows.map((row) =>
    convertTableRow(row, props, context),
  );

  // Get table width
  const width = convertTableWidth(props?.tblW, containerWidth);

  // Get table alignment
  const jc = props?.jc;
  const alignment = jc === "center" ? "center" : jc === "right" || jc === "end" ? "right" : "left";

  // Get table indentation
  const indent = convertTableWidth(props?.tblInd, containerWidth) ?? px(0);

  // Get cell spacing
  const cellSpacing = convertCellSpacing(props?.tblCellSpacing?.w);

  // Convert table borders
  const borders = convertTableBorders(props?.tblBorders);

  return {
    rows,
    gridColumnWidths,
    width,
    alignment,
    indent,
    cellSpacing,
    borders,
  };
}

/**
 * Check if content is a paragraph (type guard).
 */
export function isParagraph(content: DocxParagraph | DocxTable): content is DocxParagraph {
  return content.type === "paragraph";
}

/**
 * Check if content is a table (type guard).
 */
export function isTable(content: DocxParagraph | DocxTable): content is DocxTable {
  return content.type === "table";
}
