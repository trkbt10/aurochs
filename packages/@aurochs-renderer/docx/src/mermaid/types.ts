/**
 * @file Types for DOCX Mermaid rendering
 *
 * Structurally compatible with AsciiDocBlock from the ascii renderer.
 */

export type MermaidParagraph = {
  readonly type: "paragraph";
  readonly headingLevel?: number;
  readonly numbering?: { readonly numId: number; readonly level: number };
  readonly text: string;
};

export type MermaidTableCell = { readonly text: string };
export type MermaidTableRow = { readonly cells: readonly MermaidTableCell[] };
export type MermaidTable = {
  readonly type: "table";
  readonly rows: readonly MermaidTableRow[];
};

export type MermaidDocBlock = MermaidParagraph | MermaidTable;

export type DocxMermaidParams = {
  readonly blocks: readonly MermaidDocBlock[];
};
