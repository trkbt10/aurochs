/**
 * @file Input types for Mermaid serializers
 */

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
