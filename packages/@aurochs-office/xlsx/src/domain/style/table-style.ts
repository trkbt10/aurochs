/**
 * @file SpreadsheetML table style domain types
 *
 * Represents `styles.xml` `<tableStyles>` / `<tableStyle>` definitions.
 *
 * These definitions are referenced by tables (`tableStyleInfo/@name`) and map table style
 * elements (headerRow, totalRow, banded rows/columns, etc.) to DXF definitions (`dxfId`).
 *
 * @see ECMA-376 Part 4, Section 18.8.57 (tableStyles)
 * @see ECMA-376 Part 4, Section 18.8.56 (tableStyle)
 * @see ECMA-376 Part 4, Section 18.8.55 (tableStyleElement)
 */

export type XlsxTableStyleElementType =
  | "wholeTable"
  | "headerRow"
  | "totalRow"
  | "firstColumn"
  | "lastColumn"
  | "firstRowStripe"
  | "secondRowStripe"
  | "firstColumnStripe"
  | "secondColumnStripe"
  | "firstHeaderCell"
  | "lastHeaderCell"
  | "firstTotalCell"
  | "lastTotalCell";

export type XlsxTableStyleElement = {
  readonly type: XlsxTableStyleElementType;
  readonly dxfId: number;
};

export type XlsxTableStyle = {
  readonly name: string;
  readonly pivot?: boolean;
  readonly count?: number;
  readonly elements: readonly XlsxTableStyleElement[];
};

