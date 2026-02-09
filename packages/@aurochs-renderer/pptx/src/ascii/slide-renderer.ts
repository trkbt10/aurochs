/**
 * @file Renders AsciiRenderableShape[] onto an AsciiCanvas for terminal preview
 */

import type { AsciiRenderableShape } from "./types";
import { createCanvas, drawBox, drawText, renderCanvas } from "@aurochs-renderer/drawing-ml/ascii";
import { createMapperConfig, mapBoundsToGrid } from "@aurochs-renderer/drawing-ml/ascii";
import { renderAsciiTable } from "@aurochs-renderer/drawing-ml/ascii";
import { renderChartAscii, extractChartData } from "@aurochs-renderer/chart/ascii";

export type SlideRenderParams = {
  readonly shapes: readonly AsciiRenderableShape[];
  readonly slideWidth: number;
  readonly slideHeight: number;
  readonly terminalWidth: number;
  readonly showBorder?: boolean;
};

/** Render table content as lines that fit inside a shape box. */
function renderTableLines(
  content: Extract<AsciiRenderableShape["content"], { type: "table" }>,
  interiorWidth: number,
): readonly string[] {
  const table = "table" in content ? content.table : undefined;
  if (!table || table.data.length === 0) {
    return ["{table}"];
  }

  const headers = table.data[0]?.cells.map((c) => c.text);
  const rows = table.data.slice(1).map((r) => r.cells.map((c) => c.text));
  const rendered = renderAsciiTable({
    headers,
    rows,
    maxWidth: interiorWidth,
  });
  return rendered.split("\n");
}

/** Render chart content as lines that fit inside a shape box. */
function renderChartLines(
  content: Extract<AsciiRenderableShape["content"], { type: "chart" }>,
  interiorWidth: number,
): readonly string[] {
  const chart = "chart" in content ? content.chart : undefined;
  if (!chart?.series || chart.series.length === 0) {
    return ["{chart}"];
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
  const rendered = renderChartAscii({
    ...extracted,
    width: interiorWidth,
  });
  return rendered.split("\n");
}

/** Render diagram content as lines. Uses shapes data if available. */
function renderDiagramLines(content: Extract<AsciiRenderableShape["content"], { type: "diagram" }>): readonly string[] {
  const diagram = "diagram" in content ? content.diagram : undefined;
  if (!diagram?.shapes || diagram.shapes.length === 0) {
    return ["{diagram}"];
  }

  // Show diagram nodes as a simple list
  const lines: string[] = ["[diagram]"];
  for (const shape of diagram.shapes) {
    if (shape.text) {
      lines.push(`  ${shape.text}`);
    }
  }
  return lines;
}

/** Get the lines to render inside a shape box. */
function getShapeLines(shape: AsciiRenderableShape, interiorWidth: number): readonly string[] {
  if (shape.text) {
    const lines = shape.text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length > 0) {
      return lines;
    }
  }
  if (shape.placeholder?.type) {
    return [`[${shape.placeholder.type}]`];
  }
  if (shape.content) {
    switch (shape.content.type) {
      case "table":
        return renderTableLines(shape.content, interiorWidth);
      case "chart":
        return renderChartLines(shape.content, interiorWidth);
      case "diagram":
        return renderDiagramLines(shape.content);
      default:
        return [`{${shape.content.type}}`];
    }
  }
  if (shape.type === "pic") {
    return ["[image]"];
  }
  if (shape.type === "cxnSp") {
    return ["[connector]"];
  }
  if (shape.type === "grpSp") {
    return ["[group]"];
  }
  return [shape.name];
}

/** Flatten group shapes preserving document (z) order. */
function flattenShapes(shapes: readonly AsciiRenderableShape[]): readonly AsciiRenderableShape[] {
  const result: AsciiRenderableShape[] = [];
  for (const shape of shapes) {
    if (shape.type === "grpSp" && shape.children) {
      result.push(shape);
      result.push(...flattenShapes(shape.children));
    } else {
      result.push(shape);
    }
  }
  return result;
}

/** Render shapes onto an ASCII canvas and return the result string. */
export function renderSlideAscii(params: SlideRenderParams): string {
  const { shapes, slideWidth, slideHeight, terminalWidth, showBorder } = params;
  const config = createMapperConfig(slideWidth, slideHeight, terminalWidth);
  const canvas = createCanvas(config.gridWidth, config.gridHeight);

  if (showBorder) {
    drawBox({ canvas, col: 0, row: 0, w: config.gridWidth, h: config.gridHeight, z: 0 });
  }

  const flatShapes = flattenShapes(shapes);

  for (let i = 0; i < flatShapes.length; i++) {
    const shape = flatShapes[i]!;
    if (!shape.bounds) {
      continue;
    }

    const gridRect = mapBoundsToGrid(config, shape.bounds);
    if (!gridRect) {
      continue;
    }

    const z = i + 1;

    // For table/chart content, skip drawing the outer box to give more space
    const isInlineContent = shape.content?.type === "table" || shape.content?.type === "chart";

    if (!isInlineContent) {
      drawBox({ canvas, col: gridRect.col, row: gridRect.row, w: gridRect.width, h: gridRect.height, z });
    }

    if (gridRect.width > 2 && gridRect.height > 2) {
      const interiorWidth = isInlineContent ? gridRect.width : gridRect.width - 2;
      const interiorHeight = isInlineContent ? gridRect.height : gridRect.height - 2;
      const interiorCol = isInlineContent ? gridRect.col : gridRect.col + 1;
      const interiorRow = isInlineContent ? gridRect.row : gridRect.row + 1;
      const lines = getShapeLines(shape, interiorWidth);

      for (let lineIdx = 0; lineIdx < Math.min(lines.length, interiorHeight); lineIdx++) {
        drawText({
          canvas,
          col: interiorCol,
          row: interiorRow + lineIdx,
          text: lines[lineIdx]!,
          maxLen: interiorWidth,
          z,
        });
      }
    }
  }

  return renderCanvas(canvas);
}
