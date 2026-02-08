/**
 * @file Types for DOCX ASCII rendering
 */

export type AsciiParagraph = {
  readonly type: "paragraph";
  readonly style?: string;
  readonly alignment?: string;
  readonly headingLevel?: number;
  readonly numbering?: { readonly numId: number; readonly level: number };
  readonly text: string;
};

export type AsciiTableCell = { readonly text: string };
export type AsciiTableRow = { readonly cells: readonly AsciiTableCell[] };
export type AsciiTable = {
  readonly type: "table";
  readonly rows: readonly AsciiTableRow[];
};

export type AsciiDocBlock = AsciiParagraph | AsciiTable;

export type DocxAsciiParams = {
  readonly blocks: readonly AsciiDocBlock[];
  readonly width: number;
};
