/**
 * @file GraphicFrame module exports
 *
 * This module provides the GraphicFrameRenderer component and related types.
 * Content-specific modules (chart, table, diagram, ole-object) are internal
 * and not directly exported.
 */

export { GraphicFrameRenderer } from "./GraphicFrameRenderer";
export type { GraphicFrameRendererProps, ContentProps, SvgResult } from "./types";

// Re-export content modules for advanced usage
export { ChartContent, useChartSvg } from "./chart";
export { TableContent, useTableSvg } from "./table";
export { DiagramContent, useDiagramSvg } from "./diagram";
export { OleObjectContent, useOlePreview } from "./ole-object";

// Re-export shared components
export { Placeholder, SvgInnerHtml } from "./shared";
