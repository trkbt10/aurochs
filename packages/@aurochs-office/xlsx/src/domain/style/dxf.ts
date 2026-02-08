/**
 * @file Differential formatting (DXF) types
 *
 * Defines SpreadsheetML differential formatting definitions used by conditional formatting rules.
 *
 * A DXF (differential format) is a partial style override (e.g. fill, font, number format) that
 * is applied when a conditional formatting rule matches a cell.
 *
 * @see ECMA-376 Part 4, Section 18.8.14 (dxf)
 * @see ECMA-376 Part 4, Section 18.8.18 (dxfs)
 */

import type { XlsxFill } from "./fill";
import type { XlsxBorder } from "./border";
import type { XlsxNumberFormat } from "./number-format";
import type { XlsxColor, UnderlineStyle } from "./font";

export type XlsxDxfFont = {
  readonly name?: string;
  readonly size?: number;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: UnderlineStyle;
  readonly strikethrough?: boolean;
  readonly color?: XlsxColor;
};

/**
 * Differential format (DXF) applied by conditional formatting.
 *
 * Each property is optional and acts as an override on the underlying cell style.
 */
export type XlsxDifferentialFormat = {
  readonly font?: XlsxDxfFont;
  readonly fill?: XlsxFill;
  readonly border?: XlsxBorder;
  readonly numFmt?: XlsxNumberFormat;
};
