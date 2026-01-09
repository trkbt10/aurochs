/**
 * @file Table domain types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 21.1.3 - DrawingML Tables
 */

import type { Fill, Line } from "../color/types";
import type { TextBody } from "../text";
import type { BevelPresetType } from "../three-d";
import type {
  Effects,
  FontCollectionIndex,
  LightRigDirection,
  LightRigType,
  Pixels,
  PresetMaterialType,
  StyleMatrixColumnIndex,
} from "../types";

// =============================================================================
// Table Structure Types
// =============================================================================

/**
 * Table definition
 * @see ECMA-376 Part 1, Section 21.1.3.13 (tbl)
 */
export type Table = {
  readonly properties: TableProperties;
  readonly grid: TableGrid;
  readonly rows: readonly TableRow[];
};

/**
 * Table properties
 * @see ECMA-376 Part 1, Section 21.1.3.15 (tblPr)
 */
export type TableProperties = {
  readonly rtl?: boolean;
  readonly firstRow?: boolean;
  readonly firstCol?: boolean;
  readonly lastRow?: boolean;
  readonly lastCol?: boolean;
  readonly bandRow?: boolean;
  readonly bandCol?: boolean;
  readonly fill?: Fill;
  readonly effects?: Effects;
  readonly tableStyleId?: string;
};

/**
 * Table grid defining column widths
 * @see ECMA-376 Part 1, Section 21.1.3.14 (tblGrid)
 */
export type TableGrid = {
  readonly columns: readonly TableColumn[];
};

/**
 * Table column definition
 * @see ECMA-376 Part 1, Section 21.1.3.5 (gridCol)
 */
export type TableColumn = {
  readonly width: Pixels;
};

/**
 * Table row
 * @see ECMA-376 Part 1, Section 21.1.3.16 (tr)
 */
export type TableRow = {
  readonly height: Pixels;
  readonly cells: readonly TableCell[];
};

/**
 * Table cell
 * @see ECMA-376 Part 1, Section 21.1.3.16 (tc)
 */
export type TableCell = {
  readonly id?: string;
  readonly properties: TableCellProperties;
  readonly textBody?: TextBody;
};

// =============================================================================
// Table Cell Properties
// =============================================================================

/**
 * Cell margin (inset)
 */
export type CellMargin = {
  readonly left: Pixels;
  readonly right: Pixels;
  readonly top: Pixels;
  readonly bottom: Pixels;
};

/**
 * Cell anchor (vertical alignment)
 * @see ECMA-376 Part 1, Section 21.1.3.18 (ST_TextAnchoringType)
 */
export type CellAnchor = "top" | "center" | "bottom";

/**
 * Cell horizontal overflow behavior
 * @see ECMA-376 Part 1, Section 21.1.3.9 (ST_TextHorzOverflowType)
 */
export type CellHorzOverflow = "clip" | "overflow";

/**
 * Cell vertical text type
 */
export type CellVerticalType = "horz" | "vert" | "vert270" | "wordArtVert" | "eaVert" | "mongolianVert";

/**
 * Table cell properties
 * @see ECMA-376 Part 1, Section 21.1.3.17 (tcPr)
 */
export type TableCellProperties = {
  readonly margins?: CellMargin;
  readonly anchor?: CellAnchor;
  readonly anchorCenter?: boolean;
  readonly horzOverflow?: CellHorzOverflow;
  readonly verticalType?: CellVerticalType;
  readonly fill?: Fill;
  readonly borders?: CellBorders;
  readonly cell3d?: Cell3d;
  readonly headers?: readonly string[];
  readonly rowSpan?: number;
  readonly colSpan?: number;
  readonly horizontalMerge?: boolean;
  readonly verticalMerge?: boolean;
};

/**
 * Cell borders
 * @see ECMA-376 Part 1, Section 21.1.3.4-8 (lnL/lnR/lnT/lnB/lnTlToBr/lnBlToTr)
 */
export type CellBorders = {
  readonly left?: Line;
  readonly right?: Line;
  readonly top?: Line;
  readonly bottom?: Line;
  readonly insideH?: Line;
  readonly insideV?: Line;
  readonly tlToBr?: Line; // Top-left to bottom-right diagonal
  readonly blToTr?: Line; // Bottom-left to top-right diagonal
};

// =============================================================================
// Table Style Types
// =============================================================================

/**
 * Table style definition
 * @see ECMA-376 Part 1, Section 21.1.3.11 (tblStyle)
 */
export type TableStyle = {
  readonly id: string;
  readonly name?: string;
  readonly tblBg?: Fill;
  readonly wholeTbl?: TablePartStyle;
  readonly band1H?: TablePartStyle;
  readonly band2H?: TablePartStyle;
  readonly band1V?: TablePartStyle;
  readonly band2V?: TablePartStyle;
  readonly firstCol?: TablePartStyle;
  readonly lastCol?: TablePartStyle;
  readonly firstRow?: TablePartStyle;
  readonly lastRow?: TablePartStyle;
  readonly seCell?: TablePartStyle; // South-east cell
  readonly swCell?: TablePartStyle; // South-west cell
  readonly neCell?: TablePartStyle; // North-east cell
  readonly nwCell?: TablePartStyle; // North-west cell
};

/**
 * Table part style (for specific regions)
 * @see ECMA-376 Part 1, Section 21.1.3.12 (tableStylePart)
 */
export type TablePartStyle = {
  readonly fill?: Fill;
  readonly fillReference?: {
    readonly index: StyleMatrixColumnIndex;
    readonly color?: Fill;
  };
  readonly cell3d?: Cell3d;
  readonly borders?: CellBorders;
  readonly textProperties?: TableTextProperties;
};

/**
 * 3D cell effects
 * @see ECMA-376 Part 1, Section 20.1.4.2.7 (cell3D)
 */
export type Cell3d = {
  readonly preset?: PresetMaterialType;
  readonly bevel?: {
    readonly width: Pixels;
    readonly height: Pixels;
    /** @see ECMA-376 Part 1, Section 20.1.10.9 (ST_BevelPresetType) */
    readonly preset: BevelPresetType;
  };
  readonly lightRig?: {
    readonly rig: LightRigType;
    readonly direction: LightRigDirection;
  };
};

/**
 * Text properties for table parts
 */
export type TableTextProperties = {
  readonly fontReference?: {
    readonly index: FontCollectionIndex;
    readonly color?: Fill;
  };
};
