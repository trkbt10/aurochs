/**
 * @file Types for Mermaid output generation
 */

// =============================================================================
// Serializer input types
// =============================================================================

/** A single data series for chart serialization. */
export type ChartSeriesInput = {
  readonly name?: string;
  readonly values: readonly number[];
  readonly categories?: readonly string[];
};

/** Input for chart → Mermaid serialization. */
export type ChartMermaidInput = {
  readonly series: readonly ChartSeriesInput[];
  readonly chartType: "bar" | "line" | "pie" | "scatter" | "area" | "radar" | "other";
  readonly title?: string;
};

/** A single shape in a diagram. */
export type DiagramShapeInput = {
  readonly id: string;
  readonly text?: string;
  readonly bounds?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
};

/** Input for diagram → Mermaid serialization. */
export type DiagramMermaidInput = {
  readonly shapes: readonly DiagramShapeInput[];
};

// =============================================================================
// Output types
// =============================================================================

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
