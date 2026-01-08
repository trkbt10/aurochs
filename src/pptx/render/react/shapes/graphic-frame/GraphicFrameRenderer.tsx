/**
 * @file GraphicFrame Renderer
 *
 * Renders p:graphicFrame elements (charts, tables, diagrams, OLE objects)
 * as React SVG components.
 *
 * This is a dispatcher component that delegates to content-specific
 * renderers based on the content type. Each content type has its own
 * module with hooks that encapsulate context extraction to prevent
 * parameter passing bugs.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.21 (p:graphicFrame)
 */

import { memo, type ReactNode } from "react";
import type { GraphicFrame, GraphicContent } from "../../../../domain";
import { buildTransformAttr } from "../transform";
import { ChartContent } from "./chart";
import { TableContent } from "./table";
import { DiagramContent } from "./diagram";
import { OleObjectContent } from "./ole-object";
import { Placeholder } from "./shared";
import type { GraphicFrameRendererProps } from "./types";

/**
 * Renders a graphic frame as React SVG elements.
 *
 * Dispatches to content-specific renderers:
 * - ChartContent for charts
 * - TableContent for tables
 * - DiagramContent for diagrams
 * - OleObjectContent for OLE objects
 * - Placeholder for unknown content
 */
export const GraphicFrameRenderer = memo(function GraphicFrameRenderer({
  shape,
  width,
  height,
  shapeId,
}: GraphicFrameRendererProps) {
  const { content, transform } = shape;
  const transformValue = buildTransformAttr(transform, width, height);

  return (
    <g
      transform={transformValue || undefined}
      data-shape-id={shapeId}
      data-shape-type="graphicFrame"
    >
      <FrameContent content={content} width={width} height={height} />
    </g>
  );
});

// =============================================================================
// Content Dispatcher
// =============================================================================

type FrameContentProps = {
  readonly content: GraphicContent;
  readonly width: number;
  readonly height: number;
};

/**
 * Dispatches to the appropriate content renderer based on type.
 */
function FrameContent({ content, width, height }: FrameContentProps): ReactNode {
  switch (content.type) {
    case "chart":
      return <ChartContent data={content.data} width={width} height={height} />;

    case "table":
      return <TableContent data={content.data} width={width} height={height} />;

    case "diagram":
      return <DiagramContent data={content.data} width={width} height={height} />;

    case "oleObject":
      return <OleObjectContent data={content.data} width={width} height={height} />;

    case "unknown":
    default:
      return <Placeholder width={width} height={height} label="Unknown" />;
  }
}
