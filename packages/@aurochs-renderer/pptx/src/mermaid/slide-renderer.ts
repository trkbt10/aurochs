/**
 * @file Render PPTX slide shapes as Mermaid / Markdown output
 */

import { renderChartMermaid } from "@aurochs-renderer/chart/mermaid";
import { renderDiagramMermaid } from "@aurochs-renderer/diagram/mermaid";
import { renderMarkdownTable } from "@aurochs/mermaid";
import { extractChartData } from "@aurochs-renderer/chart/ascii";
import type { MermaidRenderableShape, SlideMermaidParams } from "./types";

/** Render table content as a Markdown table. */
function renderTable(content: Extract<MermaidRenderableShape["content"], { type: "table" }>): string {
  const table = content.table;
  if (!table || table.data.length === 0) {
    return "";
  }

  const headers = table.data[0]?.cells.map((c) => c.text) ?? [];
  const rows = table.data.slice(1).map((r) => r.cells.map((c) => c.text));

  return renderMarkdownTable({ headers, rows });
}

/** Render chart content as a fenced Mermaid block. */
function renderChart(content: Extract<MermaidRenderableShape["content"], { type: "chart" }>): string {
  const chart = content.chart;
  if (!chart?.series || chart.series.length === 0) {
    return "";
  }

  const extracted = extractChartData({
    title: chart.title,
    chartType: chart.chartType,
    series: chart.series.map((s) => ({
      name: s.name,
      values: s.values?.map((v) => v ?? 0),
      categories: s.categories,
    })),
  });

  return renderChartMermaid({
    series: extracted.series,
    chartType: extracted.chartType,
    title: extracted.title,
  });
}

/** Render diagram content as a fenced Mermaid flowchart. */
function renderDiagram(content: Extract<MermaidRenderableShape["content"], { type: "diagram" }>): string {
  const diagram = content.diagram;
  if (!diagram?.shapes || diagram.shapes.length === 0) {
    return "";
  }

  return renderDiagramMermaid({
    shapes: diagram.shapes.map((s, i) => ({
      id: `shape_${i}`,
      text: s.text,
      bounds: s.bounds,
    })),
  });
}

/** Render a single shape to Mermaid/Markdown output. */
function renderShape(shape: MermaidRenderableShape): string | undefined {
  if (shape.content) {
    switch (shape.content.type) {
      case "table":
        return renderTable(shape.content);
      case "chart":
        return renderChart(shape.content);
      case "diagram":
        return renderDiagram(shape.content);
      default:
        return undefined;
    }
  }

  if (shape.text) {
    return shape.text;
  }

  if (shape.placeholder?.type) {
    return `*[${shape.placeholder.type}]*`;
  }

  return undefined;
}

/**
 * Render all slide shapes as a combined Mermaid / Markdown string.
 * Each shape with renderable content gets a section header.
 */
export function renderSlideMermaid(params: SlideMermaidParams): string {
  const blocks: string[] = [];

  for (const shape of params.shapes) {
    const rendered = renderShape(shape);
    if (rendered) {
      blocks.push(rendered);
    }
  }

  return blocks.join("\n\n");
}
