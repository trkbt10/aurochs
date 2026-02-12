/**
 * @file Drawing renderer for XLSX sheets
 *
 * Orchestrates rendering of all drawing elements in a worksheet.
 */

import type { XlsxDrawing, XlsxDrawingAnchor, XlsxDrawingContent } from "@aurochs-office/xlsx/domain/drawing/types";
import type { XlsxSvgRenderContext } from "./types";
import { calculateDrawingBounds, type DrawingBounds } from "./drawing-layout";
import { renderPicture, type ImageResolver } from "./drawing/picture-renderer";
import { renderShape } from "./drawing/shape-renderer";
import { renderChartFrame, type ChartResolver } from "./drawing/chart-renderer";
import { renderGroupShape } from "./drawing/group-renderer";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for rendering drawings.
 */
export type RenderDrawingsOptions = {
  /** Function to resolve image relationship IDs */
  readonly resolveImage?: ImageResolver;
  /** Function to resolve chart relationship IDs or paths */
  readonly resolveChart?: ChartResolver;
};

// =============================================================================
// Main Drawing Renderer
// =============================================================================

/**
 * Render all drawing elements for a worksheet.
 *
 * @param ctx - Render context
 * @param drawing - Drawing containing all anchors
 * @param options - Resolution options
 * @returns SVG string for all drawings
 */
export function renderAllDrawings(
  ctx: XlsxSvgRenderContext,
  drawing: XlsxDrawing | undefined,
  options?: RenderDrawingsOptions,
): string {
  if (!drawing || drawing.anchors.length === 0) {
    return "";
  }

  const parts: string[] = [];

  for (const anchor of drawing.anchors) {
    const svg = renderAnchor(ctx, anchor, options);
    if (svg) {
      parts.push(svg);
    }
  }

  if (parts.length === 0) {
    return "";
  }

  return `<g class="drawings">${parts.join("")}</g>`;
}

/**
 * Render a single anchor with its content.
 */
function renderAnchor(
  ctx: XlsxSvgRenderContext,
  anchor: XlsxDrawingAnchor,
  options?: RenderDrawingsOptions,
): string {
  if (!anchor.content) {
    return "";
  }

  const bounds = calculateDrawingBounds(anchor, ctx.layout, ctx.options);

  if (bounds.width <= 0 || bounds.height <= 0) {
    return "";
  }

  return renderContent({ ctx, content: anchor.content, bounds, resolverOptions: options });
}

type RenderContentOptions = {
  readonly ctx: XlsxSvgRenderContext;
  readonly content: XlsxDrawingContent;
  readonly bounds: DrawingBounds;
  readonly resolverOptions?: RenderDrawingsOptions;
};

/**
 * Render drawing content based on its type.
 */
function renderContent(options: RenderContentOptions): string {
  const { ctx, content, bounds, resolverOptions } = options;
  switch (content.type) {
    case "picture":
      return renderPicture({
        picture: content,
        bounds,
        resolveImage: resolverOptions?.resolveImage,
        warnings: ctx.warnings,
      });

    case "shape":
      return renderShape({
        shape: content,
        bounds,
        warnings: ctx.warnings,
      });

    case "chartFrame":
      return renderChartFrame({
        chartFrame: content,
        bounds,
        resolveChart: resolverOptions?.resolveChart,
        warnings: ctx.warnings,
      });

    case "groupShape":
      return renderGroupShape({
        group: content,
        bounds,
        renderContent: (childContent, childBounds) =>
          renderContent({ ctx, content: childContent, bounds: childBounds, resolverOptions }),
        warnings: ctx.warnings,
      });

    default:
      ctx.warnings.add(`Unknown drawing content type: ${(content as { type: string }).type}`);
      return "";
  }
}
