/**
 * @file GraphicFrame Renderer
 *
 * Renders p:graphicFrame elements (charts, tables, diagrams, OLE objects)
 * as React SVG components.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.21 (p:graphicFrame)
 */

import { memo, useMemo, type ReactNode } from "react";
import type { GraphicFrame as GraphicFrameType, DiagramReference } from "../../../domain";
import type { ShapeId } from "../../../domain/types";
import { px } from "../../../domain/types";
import { useRenderContext } from "../context";
import { buildTransformAttr } from "./transform";
import { renderChart } from "../../components/chart";
import { renderTableSvg } from "../../components/table";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for GraphicFrameRenderer
 */
export type GraphicFrameRendererProps = {
  /** Shape to render */
  readonly shape: GraphicFrameType;
  /** Width in pixels */
  readonly width: number;
  /** Height in pixels */
  readonly height: number;
  /** Shape ID for data attribute */
  readonly shapeId?: ShapeId;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a graphic frame as React SVG elements.
 */
export const GraphicFrameRenderer = memo(function GraphicFrameRenderer({
  shape,
  width,
  height,
  shapeId,
}: GraphicFrameRendererProps) {
  const ctx = useRenderContext();
  const { content, transform } = shape;

  const transformValue = buildTransformAttr(transform, width, height);

  const renderCtx = useMemo(
    () => ({
      slideSize: ctx.slideSize,
      options: ctx.options,
      colorContext: ctx.colorContext,
      resources: ctx.resources,
      warnings: ctx.warnings,
      getNextShapeId: ctx.getNextShapeId,
      resolvedBackground: ctx.resolvedBackground,
      fontScheme: ctx.fontScheme,
      layoutShapes: ctx.layoutShapes,
    }),
    [
      ctx.slideSize,
      ctx.options,
      ctx.colorContext,
      ctx.resources,
      ctx.warnings,
      ctx.getNextShapeId,
      ctx.resolvedBackground,
      ctx.fontScheme,
      ctx.layoutShapes,
    ],
  );

  const chartData = content.type === "chart" ? content.data : undefined;
  const tableData = content.type === "table" ? content.data : undefined;

  const chartSvgContent = useMemo(() => {
    if (chartData === undefined) {
      return null;
    }
    if (chartData.parsedChart === undefined) {
      renderCtx.warnings.add({
        type: "fallback",
        message: `Chart not pre-parsed: ${chartData.resourceId}`,
      });
      return null;
    }
    const chartHtml = renderChart(chartData.parsedChart as never, width, height, renderCtx as never);
    return extractSvgContent(chartHtml as string);
  }, [chartData, width, height, renderCtx]);

  const tableSvgContent = useMemo(() => {
    if (tableData === undefined) {
      return null;
    }
    return renderTableSvg(tableData.table as never, px(width), px(height), renderCtx as never);
  }, [tableData, width, height, renderCtx]);

  const frameContent = renderFrameContent(
    content,
    width,
    height,
    ctx,
    chartSvgContent,
    tableSvgContent,
  );

  return (
    <g
      transform={transformValue || undefined}
      data-shape-id={shapeId}
      data-shape-type="graphicFrame"
    >
      {frameContent}
    </g>
  );
});

// =============================================================================
// Content Rendering
// =============================================================================

type FrameContent = GraphicFrameType["content"];
type RenderContext = ReturnType<typeof useRenderContext>;

/**
 * Render the frame content based on type
 */
function renderFrameContent(
  content: FrameContent,
  width: number,
  height: number,
  ctx: RenderContext,
  chartSvgContent: string | null,
  tableSvgContent: string | null,
): ReactNode {
  switch (content.type) {
    case "chart":
      return renderChartContent(width, height, chartSvgContent);

    case "table":
      return renderTableContent(width, height, tableSvgContent);

    case "diagram":
      return renderDiagramContent(content.data, width, height, ctx);

    case "oleObject":
      return renderOleObjectContent(content.data, width, height, ctx);

    case "unknown":
    default:
      return renderPlaceholder(width, height, "Unknown");
  }
}

/**
 * Render chart content
 */
function renderChartContent(
  width: number,
  height: number,
  svgContent: string | null,
): ReactNode {
  if (svgContent !== null) {
    return <SvgInnerHtml html={svgContent} />;
  }
  return renderPlaceholder(width, height, "Chart");
}

/**
 * Render table content
 */
function renderTableContent(
  width: number,
  height: number,
  svgContent: string | null,
): ReactNode {
  if (svgContent === null) {
    return renderPlaceholder(width, height, "Table");
  }
  return <SvgInnerHtml html={svgContent} />;
}

/**
 * Render diagram content
 */
function renderDiagramContent(
  data: DiagramReference,
  width: number,
  height: number,
  ctx: RenderContext,
): ReactNode {
  if (data.parsedContent !== undefined && data.parsedContent.shapes.length > 0) {
    // For diagrams, we need to render shapes
    // This is a placeholder - ideally we'd recursively render shapes
    // For now, use the string-based renderer and inject
    ctx.warnings.add({
      type: "fallback",
      message: "Diagram React rendering not fully implemented",
    });
    return renderPlaceholder(width, height, "Diagram");
  }

  ctx.warnings.add({
    type: "fallback",
    message: "Diagram content not available",
  });
  return renderPlaceholder(width, height, "Diagram");
}

/**
 * Render OLE object content
 */
function renderOleObjectContent(
  data: {
    previewImageUrl?: string;
    pic?: { resourceId: string };
    progId?: string;
  },
  width: number,
  height: number,
  ctx: RenderContext,
): ReactNode {
  // Try pre-resolved preview image
  if (data.previewImageUrl !== undefined) {
    return (
      <image
        href={data.previewImageUrl}
        x={0}
        y={0}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
      />
    );
  }

  // Try p:pic child element
  if (data.pic?.resourceId !== undefined) {
    const dataUrl = ctx.resources.resolve(data.pic.resourceId);
    if (dataUrl !== undefined) {
      return (
        <image
          href={dataUrl}
          x={0}
          y={0}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
        />
      );
    }
  }

  ctx.warnings.add({
    type: "fallback",
    message: `OLE object preview not available: ${data.progId ?? "unknown"}`,
  });
  return renderPlaceholder(width, height, "OLE Object");
}

/**
 * Render a placeholder for unsupported content
 */
function renderPlaceholder(width: number, height: number, label: string): ReactNode {
  return (
    <>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#f0f0f0"
        stroke="#cccccc"
      />
      <text
        x={width / 2}
        y={height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#999999"
      >
        [{label}]
      </text>
    </>
  );
}

/**
 * Extract SVG content from a complete SVG string
 */
function extractSvgContent(svg: string): string {
  const match = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (match !== null) {
    return match[1];
  }
  return svg;
}

// =============================================================================
// Components
// =============================================================================

type SvgInnerHtmlProps = {
  readonly html: string;
};

const SvgInnerHtml = memo(function SvgInnerHtml({ html }: SvgInnerHtmlProps) {
  return <g dangerouslySetInnerHTML={{ __html: html }} />;
});
