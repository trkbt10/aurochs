/**
 * @file Diagram (SmartArt) HTML container renderer
 *
 * Renders diagram content by delegating shape rendering to the injected renderer.
 */

import type { DiagramContent, DiagramRenderContext } from "./types";

export type RenderDiagramOptions<TShape> = {
  readonly diagram: DiagramContent<TShape>;
  readonly width: number;
  readonly height: number;
  readonly ctx: DiagramRenderContext<TShape, string>;
};

/** Renders diagram content to an HTML string. */
export function renderDiagram<TShape>(options: RenderDiagramOptions<TShape>): string {
  const { diagram, width, height, ctx } = options;

  if (diagram.shapes.length === 0) {
    ctx.warnings.add({
      type: "fallback",
      message: "No diagram shapes found",
      element: "diagram",
    });
    return "";
  }

  const shapesHtml = diagram.shapes.map((shape) => ctx.renderShape(shape)).join("");

  return `<div class="diagram-content" style="position: relative; width: ${width}px; height: ${height}px;">${shapesHtml}</div>`;
}

export type RenderDiagramPlaceholderOptions = {
  readonly width: number;
  readonly height: number;
  readonly message?: string;
};

/** Renders a placeholder for diagrams that could not be rendered. */
export function renderDiagramPlaceholder(options: RenderDiagramPlaceholderOptions): string {
  const { width, height, message } = options;
  const label = message ?? "SmartArt Diagram";
  return `<div class="diagram-placeholder" style="width: ${width}px; height: ${height}px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border: 1px solid #ddd; color: #999; font-size: 14px;"><span>${label}</span></div>`;
}
