/**
 * @file Diagram (SmartArt) renderer (PPTX wrapper)
 *
 * Delegates container rendering to `@oxen-renderer/diagram` and injects
 * PPTX-specific shape rendering.
 */

import type { DiagramContent } from "@oxen-office/pptx/domain/index";
import type { Shape } from "@oxen-office/pptx/domain";
import type { CoreRenderContext } from "../render-context";
import { renderShape } from "./shape";
import type { HtmlString } from "./index";
import { unsafeHtml } from "./index";
import { renderDiagram as renderDiagramBase, renderDiagramPlaceholder as renderDiagramPlaceholderBase } from "@oxen-renderer/diagram";
import { createDiagramRenderContext } from "../diagram/context-adapter";

/**
 * Render diagram content to HTML
 *
 * @returns HTML string containing the rendered diagram
 */
export function renderDiagram(options: {
  readonly diagram: DiagramContent;
  readonly width: number;
  readonly height: number;
  readonly ctx: CoreRenderContext;
}): HtmlString {
  const { diagram, width, height, ctx } = options;

  const diagramCtx = createDiagramRenderContext<Shape>({
    ctx,
    renderShape: (shape) => renderShape(shape, ctx),
  });

  return unsafeHtml(renderDiagramBase({ diagram, width, height, ctx: diagramCtx }));
}

/**
 * Render diagram placeholder when content cannot be loaded
 *
 * @returns HTML string with placeholder content
 */
export function renderDiagramPlaceholder(
  options: { readonly width: number; readonly height: number; readonly message?: string }
): HtmlString {
  return unsafeHtml(renderDiagramPlaceholderBase(options));
}
