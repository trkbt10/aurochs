/**
 * @file Types for XLSX Mermaid rendering
 *
 * Structurally compatible with SheetAsciiParams from the ascii renderer.
 */

export type MermaidCell = {
  readonly value: string | number | boolean | null;
  readonly type: "string" | "number" | "boolean" | "date" | "error" | "empty";
};

export type MermaidSheetRow = {
  readonly rowNumber: number;
  readonly cells: readonly MermaidCell[];
};

export type SheetMermaidParams = {
  readonly name: string;
  readonly rows: readonly MermaidSheetRow[];
  readonly columnCount: number;
  readonly showRowNumbers?: boolean;
  readonly showColumnHeaders?: boolean;
};
