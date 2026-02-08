/**
 * @file Types for XLSX ASCII rendering
 */

export type AsciiCell = {
  readonly value: string | number | boolean | null;
  readonly type: "string" | "number" | "boolean" | "date" | "error" | "empty";
};

export type AsciiSheetRow = {
  readonly rowNumber: number;
  readonly cells: readonly AsciiCell[];
};

export type SheetAsciiParams = {
  readonly name: string;
  readonly rows: readonly AsciiSheetRow[];
  readonly columnCount: number;
  readonly width: number;
  readonly showRowNumbers?: boolean;
  readonly showColumnHeaders?: boolean;
};
