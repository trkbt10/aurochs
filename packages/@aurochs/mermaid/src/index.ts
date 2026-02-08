/**
 * @file @aurochs/mermaid — shared Mermaid & Markdown output utilities
 */

export type { MermaidBlock, MarkdownTableBlock, MermaidOutputBlock, ColumnAlignment } from "./types";
export { escapeMermaidLabel, sanitizeNodeId } from "./escape";
export { wrapInMermaidFence } from "./fence";
export type { MarkdownTableParams } from "./markdown-table";
export { renderMarkdownTable } from "./markdown-table";
