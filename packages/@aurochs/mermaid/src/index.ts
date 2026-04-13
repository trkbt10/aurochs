/**
 * @file @aurochs/mermaid — shared Mermaid & Markdown output utilities
 */

export type { MermaidBlock, MarkdownTableBlock, MermaidOutputBlock, ColumnAlignment, ChartSeriesInput, ChartMermaidInput, DiagramShapeInput, DiagramMermaidInput } from "./types";
export { escapeMermaidLabel, sanitizeNodeId } from "./escape";
export { wrapInMermaidFence } from "./fence";
export type { MarkdownTableParams } from "./markdown-table";
export { renderMarkdownTable } from "./markdown-table";
export { serializeChartToMermaid } from "./chart-serializer";
export { serializeDiagramToMermaid } from "./diagram-serializer";
