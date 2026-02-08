/**
 * @file SpreadsheetML Drawing Type Definitions
 *
 * Defines types for drawings and images in SpreadsheetML (xlsx).
 * Drawings in xlsx are anchored to cells or absolute positions.
 *
 * @see ECMA-376 Part 4, Section 20.5 (SpreadsheetML Drawings)
 */

import type { RowIndex, ColIndex } from "../types";

// =============================================================================
// Cell Anchor Types
// =============================================================================

/**
 * Position within a cell (offset from top-left corner).
 *
 * @see ECMA-376 Part 4, Section 20.5.2.15 (from/to)
 */
export type XlsxCellAnchorOffset = {
  /** Column index (0-based) */
  readonly col: ColIndex;
  /** Column offset in EMUs (English Metric Units) */
  readonly colOff: number;
  /** Row index (0-based) */
  readonly row: RowIndex;
  /** Row offset in EMUs */
  readonly rowOff: number;
};

/**
 * Absolute position in EMUs.
 *
 * @see ECMA-376 Part 4, Section 20.5.2.1 (absoluteAnchor)
 */
export type XlsxAbsolutePosition = {
  /** X position from the left edge in EMUs */
  readonly x: number;
  /** Y position from the top edge in EMUs */
  readonly y: number;
};

/**
 * Size in EMUs.
 */
export type XlsxExtent = {
  /** Width in EMUs */
  readonly cx: number;
  /** Height in EMUs */
  readonly cy: number;
};

// =============================================================================
// Drawing Content Types
// =============================================================================

/**
 * Non-visual properties for a drawing object.
 *
 * @see ECMA-376 Part 4, Section 20.5.2.6 (cNvPr)
 */
export type XlsxNonVisualProperties = {
  /** Unique identifier */
  readonly id: number;
  /** Name/description of the object */
  readonly name: string;
  /** Alternative text */
  readonly descr?: string;
  /** Whether the object is hidden */
  readonly hidden?: boolean;
};

/**
 * A picture (image) in a drawing.
 *
 * @see ECMA-376 Part 4, Section 20.5.2.25 (pic)
 */
export type XlsxPicture = {
  readonly type: "picture";
  /** Non-visual properties */
  readonly nvPicPr: XlsxNonVisualProperties;
  /** Relationship ID for the image file */
  readonly blipRelId?: string;
  /** Resolved image path (after relationship resolution) */
  readonly imagePath?: string;
  /** Image MIME type if known */
  readonly contentType?: string;
};

/**
 * A shape (drawn object) in a drawing.
 *
 * @see ECMA-376 Part 4, Section 20.5.2.29 (sp)
 */
export type XlsxShape = {
  readonly type: "shape";
  /** Non-visual properties */
  readonly nvSpPr: XlsxNonVisualProperties;
  /** Preset geometry type (rect, ellipse, etc.) */
  readonly prstGeom?: string;
  /** Text body content (if shape contains text) */
  readonly txBody?: string;
};

/**
 * A chart reference in a drawing.
 *
 * @see ECMA-376 Part 4, Section 20.5.2.19 (graphicFrame)
 */
export type XlsxChartFrame = {
  readonly type: "chartFrame";
  /** Non-visual properties */
  readonly nvGraphicFramePr: XlsxNonVisualProperties;
  /** Relationship ID for the chart part */
  readonly chartRelId?: string;
  /** Resolved chart path (after relationship resolution) */
  readonly chartPath?: string;
};

/**
 * Content that can be placed in a drawing anchor.
 */
export type XlsxDrawingContent = XlsxPicture | XlsxShape | XlsxChartFrame;

// =============================================================================
// Anchor Types
// =============================================================================

/**
 * How the object behaves when cells are resized.
 *
 * @see ECMA-376 Part 4, Section 20.5.3.1 (ST_EditAs)
 */
export type XlsxEditAs = "twoCell" | "oneCell" | "absolute";

/**
 * Two-cell anchor - positioned from one cell to another.
 *
 * The object spans from the top-left of `from` cell to the top-left of `to` cell.
 *
 * @see ECMA-376 Part 4, Section 20.5.2.33 (twoCellAnchor)
 */
export type XlsxTwoCellAnchor = {
  readonly type: "twoCellAnchor";
  /** Starting position */
  readonly from: XlsxCellAnchorOffset;
  /** Ending position */
  readonly to: XlsxCellAnchorOffset;
  /** Edit behavior when cells resize */
  readonly editAs?: XlsxEditAs;
  /** The drawing content */
  readonly content?: XlsxDrawingContent;
};

/**
 * One-cell anchor - positioned from one cell with explicit size.
 *
 * The object is positioned at the `from` cell with an explicit extent.
 *
 * @see ECMA-376 Part 4, Section 20.5.2.24 (oneCellAnchor)
 */
export type XlsxOneCellAnchor = {
  readonly type: "oneCellAnchor";
  /** Starting position */
  readonly from: XlsxCellAnchorOffset;
  /** Size of the object */
  readonly ext: XlsxExtent;
  /** The drawing content */
  readonly content?: XlsxDrawingContent;
};

/**
 * Absolute anchor - positioned at an absolute position.
 *
 * The object is positioned absolutely with explicit position and size.
 *
 * @see ECMA-376 Part 4, Section 20.5.2.1 (absoluteAnchor)
 */
export type XlsxAbsoluteAnchor = {
  readonly type: "absoluteAnchor";
  /** Absolute position */
  readonly pos: XlsxAbsolutePosition;
  /** Size of the object */
  readonly ext: XlsxExtent;
  /** The drawing content */
  readonly content?: XlsxDrawingContent;
};

/**
 * Any type of drawing anchor.
 */
export type XlsxDrawingAnchor = XlsxTwoCellAnchor | XlsxOneCellAnchor | XlsxAbsoluteAnchor;

// =============================================================================
// Drawing Part
// =============================================================================

/**
 * A drawing part containing all anchored objects for a worksheet.
 *
 * @see ECMA-376 Part 4, Section 20.5.2.35 (wsDr)
 */
export type XlsxDrawing = {
  /** All anchors in this drawing */
  readonly anchors: readonly XlsxDrawingAnchor[];
};
