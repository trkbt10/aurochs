/**
 * @file Types for Mermaid output generation
 */

/** A fenced Mermaid code block (```mermaid ... ```). */
export type MermaidBlock = {
  readonly type: "mermaid";
  readonly content: string;
};

/** A Markdown pipe-delimited table. */
export type MarkdownTableBlock = {
  readonly type: "markdown-table";
  readonly content: string;
};

/** A rendered output block — either a Mermaid diagram or a Markdown table. */
export type MermaidOutputBlock = MermaidBlock | MarkdownTableBlock;

/** Column alignment for Markdown tables. */
export type ColumnAlignment = "left" | "right" | "center";
