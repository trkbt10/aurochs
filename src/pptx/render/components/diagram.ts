/**
 * @file Diagram (SmartArt) renderer
 *
 * Renders diagram shapes to HTML output.
 * Diagrams are essentially collections of shapes, so this module
 * delegates to the shape renderer.
 *
 * @see ECMA-376 Part 1, Section 21.4 - DrawingML - Diagrams
 */

import type { DiagramContent } from "../../domain/index";
import type { RenderContext } from "../context";
import { type HtmlString, EMPTY_HTML, div, buildStyle, unsafeHtml } from "../html/index";
import { renderShape } from "../html/shape";

/**
 * Render diagram content to HTML
 *
 * @param diagram - Parsed diagram content with shapes
 * @param width - Container width in pixels
 * @param height - Container height in pixels
 * @param ctx - Render context
 * @returns HTML string containing the rendered diagram
 */
export function renderDiagram(
  diagram: DiagramContent,
  width: number,
  height: number,
  ctx: RenderContext
): HtmlString {
  if (diagram.shapes.length === 0) {
    ctx.warnings.add({
      type: "fallback",
      message: "No diagram shapes found",
      element: "diagram",
    });
    return EMPTY_HTML;
  }

  // Render each shape in the diagram
  const shapeHtmlParts = diagram.shapes.map((shape) => renderShape(shape, ctx));

  // Wrap in a container div with the diagram dimensions
  return div(
    {
      class: "diagram-content",
      style: buildStyle({
        position: "relative",
        width: `${width}px`,
        height: `${height}px`,
      }),
    },
    ...shapeHtmlParts
  );
}

/**
 * Render diagram placeholder when content cannot be loaded
 *
 * @param width - Container width in pixels
 * @param height - Container height in pixels
 * @param message - Optional message to display
 * @returns HTML string with placeholder content
 */
export function renderDiagramPlaceholder(
  width: number,
  height: number,
  message?: string
): HtmlString {
  const content = unsafeHtml(`<span>${message ?? "SmartArt Diagram"}</span>`);
  return div(
    {
      class: "diagram-placeholder",
      style: buildStyle({
        width: `${width}px`,
        height: `${height}px`,
        display: "flex",
        "align-items": "center",
        "justify-content": "center",
        background: "#f5f5f5",
        border: "1px solid #ddd",
        color: "#999",
        "font-size": "14px",
      }),
    },
    content
  );
}
