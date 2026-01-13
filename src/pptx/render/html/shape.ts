/**
 * @file Shape renderer
 *
 * Converts Shape domain objects to HTML/SVG output.
 */

import type { CxnShape, GraphicFrame, GrpShape, PicShape, Shape, SpShape, Transform } from "../../domain/index";
import type { CoreRenderContext } from "../render-context";
import { div, EMPTY_HTML, type HtmlString, img, joinHtml, unsafeHtml, buildStyle } from "./index";
import { renderGeometryData } from "../svg/geometry";
import { path, svg, defs } from "../svg/primitives";
import { generateLineMarkers } from "../svg/marker";
import {
  resolveFill,
  formatRgba,
  getDashArrayPattern,
} from "../../domain/color/fill";
import { extractTransformData, buildCssPositionStyles } from "../transform";
import type { ResolvedImageFill } from "../../domain/color/fill";
import { renderTextBody } from "./text";
import { renderChart } from "../chart/index";
import { renderDiagram, renderDiagramPlaceholder } from "./diagram";
import { renderTable } from "./table";
import type { ChartReference, DiagramReference, Fill } from "../../domain/index";
import { createDefsCollector, isShapeHidden } from "../svg/slide-utils";
import {
  renderFillToSvgDef,
  renderFillToSvgStyle,
  renderImageFillToSvgDef,
  getResolvedImageFill,
  renderLineToStyle,
} from "../svg/fill";
import { renderMedia, hasMedia } from "./media";

// =============================================================================
// SpShape Rendering
// =============================================================================

/**
 * Build position/size styles from Transform using core transform utilities
 */
function buildPositionStyles(transform: Transform): Record<string, string> {
  return buildCssPositionStyles(extractTransformData(transform));
}

// =============================================================================

type SvgPaintStyle = {
  readonly fill: string;
  readonly fillOpacity?: number;
};

function buildShapeFill(
  fill: Fill | undefined,
  width: number,
  height: number,
  ctx: CoreRenderContext,
  defsCollector: ReturnType<typeof createDefsCollector>,
): SvgPaintStyle {
  if (!fill || fill.type === "noFill") {
    return { fill: "none" };
  }

  const resolved = resolveFill(fill, ctx.colorContext, ctx.resources.resolve);
  if (resolved.type === "solid") {
    return {
      fill: `#${resolved.color.hex}`,
      fillOpacity: resolved.color.alpha < 1 ? resolved.color.alpha : undefined,
    };
  }

  const gradientId = defsCollector.getNextId("shape-grad");
  const gradientDef = renderFillToSvgDef(fill, gradientId, ctx.colorContext);
  if (gradientDef) {
    defsCollector.addDef(gradientDef);
    return { fill: `url(#${gradientId})` };
  }

  // Use resolveBlipFill for image fills with resource resolver
  const resolvedImageFill = getResolvedImageFill(fill, ctx.colorContext, ctx.resources.resolve);
  if (resolvedImageFill) {
    const patternId = defsCollector.getNextId("shape-img");
    defsCollector.addDef(renderImageFillToSvgDef(resolvedImageFill, patternId, width, height));
    return { fill: `url(#${patternId})` };
  }

  const fillStyle = renderFillToSvgStyle(fill, ctx.colorContext);
  return { fill: fillStyle };
}

function buildFillStyleAttr(fillOpacity?: number, strokeOpacity?: number): string | undefined {
  const parts: string[] = [];
  if (fillOpacity !== undefined) {
    parts.push(`fill-opacity: ${fillOpacity}`);
  }
  if (strokeOpacity !== undefined) {
    parts.push(`stroke-opacity: ${strokeOpacity}`);
  }
  return parts.length > 0 ? parts.join("; ") : undefined;
}

/**
 * Render standard shape (sp)
 */
export function renderSpShape(shape: SpShape, ctx: CoreRenderContext): HtmlString {
  const transform = shape.properties.transform;
  if (!transform) {
    return EMPTY_HTML;
  }

  const shapeId = ctx.getNextShapeId();
  const positionStyles = buildPositionStyles(transform);
  const shapeSvg = renderSpShapeSvg(shape, transform, ctx);
  const textHtml = renderShapeText(shape, transform, ctx);
  const dataName = shape.nonVisual.name ? shape.nonVisual.name : undefined;

  return div(
    {
      class: "shape sp",
      "data-shape-id": shapeId,
      "data-ooxml-id": shape.nonVisual.id,
      "data-name": dataName,
      style: buildStyle(positionStyles),
    },
    shapeSvg,
    textHtml,
  );
}

function renderSpShapeSvg(shape: SpShape, transform: Transform, ctx: CoreRenderContext): HtmlString {
  if (!shape.properties.geometry && !shape.properties.fill && !shape.properties.line) {
    return EMPTY_HTML;
  }

  const defsCollector = createDefsCollector();
  const fillStyle = buildShapeFill(shape.properties.fill, transform.width, transform.height, ctx, defsCollector);
  const lineStyle = resolveLineStyle(shape, ctx);
  const styleAttr = buildFillStyleAttr(fillStyle.fillOpacity, lineStyle?.strokeOpacity);
  const geometry = shape.properties.geometry ?? { type: "preset", preset: "rect", adjustValues: [] };
  const pathData = renderGeometryData(geometry, transform.width, transform.height);
  const shapePath = path({
    d: pathData,
    fill: fillStyle.fill,
    stroke: lineStyle?.stroke ?? "none",
    "stroke-width": lineStyle?.strokeWidth ?? 0,
    "stroke-linecap": lineStyle?.strokeLinecap,
    "stroke-linejoin": lineStyle?.strokeLinejoin,
    "stroke-dasharray": lineStyle?.strokeDasharray,
    style: styleAttr,
  });

  const defsElement = buildDefsElement(defsCollector);
  const svgChildren: HtmlString[] = [];
  if (defsElement) {
    svgChildren.push(defsElement);
  }
  svgChildren.push(shapePath);

  return svg(
    {
      width: transform.width,
      height: transform.height,
      viewBox: `0 0 ${transform.width} ${transform.height}`,
      style: "position: absolute; top: 0; left: 0;",
    },
    ...svgChildren,
  );
}

function resolveLineStyle(shape: SpShape, ctx: CoreRenderContext) {
  if (!shape.properties.line) {
    return undefined;
  }
  return renderLineToStyle(shape.properties.line, ctx.colorContext);
}

function buildDefsElement(defsCollector: ReturnType<typeof createDefsCollector>): HtmlString | undefined {
  if (defsCollector.defs.length === 0) {
    return undefined;
  }
  return defs(...defsCollector.defs.map((def) => unsafeHtml(def)));
}

function renderShapeText(shape: SpShape, transform: Transform, ctx: CoreRenderContext): HtmlString {
  if (!shape.textBody) {
    return EMPTY_HTML;
  }
  const textTransform = shape.textTransform ?? transform;
  return renderTextBody(shape.textBody, textTransform, ctx);
}

// =============================================================================
// PicShape Rendering
// =============================================================================

/**
 * Render picture shape (pic)
 */
export function renderPicShape(shape: PicShape, ctx: CoreRenderContext): HtmlString {
  const transform = shape.properties.transform;
  if (!transform) {
    return EMPTY_HTML;
  }

  const shapeId = ctx.getNextShapeId();
  const positionStyles = buildPositionStyles(transform);

  if (hasMedia(shape)) {
    return renderMedia(shape, ctx);
  }

  // Resolve image source
  const imageSrc = ctx.resources.resolve(shape.blipFill.resourceId);

  if (!imageSrc) {
    ctx.warnings.add({
      type: "fallback",
      message: `Image resource not found: ${shape.blipFill.resourceId}`,
      element: "pic",
    });
    return div(
      {
        class: "shape pic placeholder",
        style: buildStyle({
          ...positionStyles,
          background: "#f0f0f0",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
        }),
      },
      unsafeHtml("<span>Image</span>"),
    );
  }

  const croppedHtml = renderCroppedPicture(shape, transform, positionStyles, shapeId, imageSrc);
  if (croppedHtml) {
    return croppedHtml;
  }

  return div(
    {
      class: "shape pic",
      "data-shape-id": shapeId,
      "data-ooxml-id": shape.nonVisual.id,
      style: buildStyle(positionStyles),
    },
    img({
      src: imageSrc,
      alt: shape.nonVisual.description ?? shape.nonVisual.name ?? "",
      width: "100%",
      height: "100%",
      style: buildPictureObjectFitStyle(shape),
    }),
  );
}

function renderCroppedPicture(
  shape: PicShape,
  transform: Transform,
  positionStyles: Record<string, string>,
  shapeId: string,
  imageSrc: string,
): HtmlString | undefined {
  const srcRect = shape.blipFill.sourceRect;
  if (!srcRect) {
    return undefined;
  }
  const isCropped = srcRect.left !== 0 || srcRect.top !== 0 || srcRect.right !== 0 || srcRect.bottom !== 0;
  if (!isCropped) {
    return undefined;
  }

  const visibleWidthPct = 100 - srcRect.left - srcRect.right;
  const visibleHeightPct = 100 - srcRect.top - srcRect.bottom;
  const safeVisibleWidthPct = Math.max(visibleWidthPct, 0.001);
  const safeVisibleHeightPct = Math.max(visibleHeightPct, 0.001);
  const imageWidth = (transform.width as number) * (100 / safeVisibleWidthPct);
  const imageHeight = (transform.height as number) * (100 / safeVisibleHeightPct);
  const offsetX = -imageWidth * (srcRect.left / 100);
  const offsetY = -imageHeight * (srcRect.top / 100);

  return div(
    {
      class: "shape pic",
      "data-shape-id": shapeId,
      "data-ooxml-id": shape.nonVisual.id,
      style: buildStyle({ ...positionStyles, overflow: "hidden" }),
    },
    img({
      src: imageSrc,
      alt: shape.nonVisual.description ?? shape.nonVisual.name ?? "",
      width: imageWidth,
      height: imageHeight,
      style: buildStyle({
        position: "absolute",
        left: `${offsetX}px`,
        top: `${offsetY}px`,
        "object-fit": resolvePictureObjectFit(shape),
      }),
    }),
  );
}

function resolvePictureObjectFit(shape: PicShape): "fill" | "contain" {
  if (shape.blipFill.stretch) {
    return "fill";
  }
  return "contain";
}

function buildPictureObjectFitStyle(shape: PicShape): string {
  return `object-fit: ${resolvePictureObjectFit(shape)};`;
}

// =============================================================================
// GrpShape Rendering
// =============================================================================

/**
 * Render group shape (grpSp)
 *
 * Per ECMA-376 Part 1, Section 19.3.1.22 (p:grpSp) and 20.1.7.6 (a:xfrm for group):
 * - Group has off/ext for its position/size on the slide
 * - Group has chOff/chExt for the child coordinate space
 * - Child shapes are defined in child coordinates (chOff/chExt)
 * - They must be transformed to fit the group's actual bounds (off/ext)
 *
 * Transformation: translate(-chOffX, -chOffY) then scale(ext/chExt)
 *
 * @see ECMA-376 Part 1, 19.3.1.22, 20.1.7.6
 */
export function renderGrpShape(shape: GrpShape, ctx: CoreRenderContext): HtmlString {
  const transform = shape.properties.transform;
  if (!transform) {
    return EMPTY_HTML;
  }

  const shapeId = ctx.getNextShapeId();
  const positionStyles = buildPositionStyles(transform);

  // Calculate child coordinate transformation
  // Children are defined in chOff/chExt space, need to map to actual group bounds
  const scaleX = computeGroupScale(transform.childExtentWidth, transform.width);
  const scaleY = computeGroupScale(transform.childExtentHeight, transform.height);

  // Build inner transform for child coordinate space
  // First translate to remove child offset, then scale to fit group bounds
  const childTransformParts: string[] = [];
  if (scaleX !== 1 || scaleY !== 1) {
    childTransformParts.push(`scale(${scaleX}, ${scaleY})`);
  }
  if (transform.childOffsetX !== 0 || transform.childOffsetY !== 0) {
    childTransformParts.push(`translate(${-transform.childOffsetX}px, ${-transform.childOffsetY}px)`);
  }

  // Render children
  const childrenHtml = shape.children.map((child) => renderShape(child, ctx));

  // If we need to transform children, wrap them in an inner container
  const innerContent = renderGroupInnerContent(childTransformParts, childrenHtml);

  return div(
    {
      class: "shape grpSp",
      "data-shape-id": shapeId,
      "data-ooxml-id": shape.nonVisual.id,
      style: buildStyle({
        ...positionStyles,
        overflow: "hidden", // Clip children to group bounds
      }),
    },
    ...normalizeHtmlChildren(innerContent),
  );
}

function computeGroupScale(childExtent: number, extent: number): number {
  if (childExtent > 0) {
    return extent / childExtent;
  }
  return 1;
}

function renderGroupInnerContent(
  childTransformParts: string[],
  childrenHtml: readonly HtmlString[],
): HtmlString | readonly HtmlString[] {
  if (childTransformParts.length === 0) {
    return childrenHtml;
  }
  return div(
    {
      class: "grpSp-inner",
      style: buildStyle({
        position: "absolute",
        top: "0",
        left: "0",
        "transform-origin": "0 0",
        transform: childTransformParts.join(" "),
      }),
    },
    ...childrenHtml,
  );
}

function normalizeHtmlChildren(content: HtmlString | readonly HtmlString[]): HtmlString[] {
  if (Array.isArray(content)) {
    return [...content];
  }
  return [content as HtmlString];
}

// =============================================================================
// CxnShape Rendering
// =============================================================================

/**
 * Resolve stroke color from Line fill.
 *
 * Per ECMA-376 Part 1, Section 20.1.2.2.24 (a:ln):
 * Line color is specified via fill child element (solidFill, gradFill, etc.)
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2.24
 */
function resolveStrokeColor(line: CxnShape["properties"]["line"], ctx: CoreRenderContext): string {
  if (!line || !line.fill || line.fill.type !== "solidFill") {
    return "#000000";
  }
  const resolved = resolveFill(line.fill, ctx.colorContext);
  if (resolved.type !== "solid") {
    return "#000000";
  }
  return formatRgba(resolved.color.hex, resolved.color.alpha);
}

/**
 * Render connector shape (cxnSp)
 *
 * Per ECMA-376 Part 1, Section 19.3.1.13:
 * Connector shapes use geometry presets (typically "line", "straightConnector1", etc.)
 * to define their path. The geometry should be used just like regular shapes.
 *
 * Per ECMA-376 Part 1, Section 20.1.8.37/57 (headEnd/tailEnd):
 * Line ends can have decorations (arrows, diamonds, etc.) that must be rendered
 * as SVG markers.
 *
 * @see ECMA-376 Part 1, 19.3.1.13 (p:cxnSp)
 * @see ECMA-376 Part 1, 20.1.8.37 (a:headEnd)
 * @see ECMA-376 Part 1, 20.1.8.57 (a:tailEnd)
 */
export function renderCxnShape(shape: CxnShape, ctx: CoreRenderContext): HtmlString {
  const transform = shape.properties.transform;
  if (!transform) {
    return EMPTY_HTML;
  }

  const shapeId = ctx.getNextShapeId();
  const positionStyles = buildPositionStyles(transform);

  // Get line style
  const line = shape.properties.line;
  const strokeColor = resolveStrokeColor(line, ctx);
  const strokeWidth = Number(line?.width ?? 1);

  // Use geometry if available, otherwise fall back to diagonal line
  // Per ECMA-376 Part 1, Section 20.1.9.18:
  // For connector shapes, "line" preset should render as diagonal line
  // from (0,0) to (w,h), not as horizontal/vertical line through center.
  const pathData = buildConnectorPathData(shape, transform);

  // Generate markers for line ends (arrows)
  // Per ECMA-376 Part 1, Section 20.1.8.37/57
  const markers = generateLineMarkers(line?.headEnd, line?.tailEnd, strokeWidth, strokeColor);

  // Build path attributes with marker references
  const pathAttrs: Record<string, string | number | undefined> = {
    d: pathData,
    fill: "none",
    stroke: strokeColor,
    "stroke-width": strokeWidth,
    "stroke-linecap": line?.cap ?? "flat",
    "stroke-linejoin": line?.join ?? "round",
  };

  // Add marker references if applicable
  if (markers.markerStart) {
    pathAttrs["marker-start"] = markers.markerStart;
  }
  if (markers.markerEnd) {
    pathAttrs["marker-end"] = markers.markerEnd;
  }

  // Add dash pattern if specified
  if (line?.dash && (typeof line.dash !== "string" || line.dash !== "solid")) {
    const dashStyle = typeof line.dash === "string" ? line.dash : "custom";
    const customDash = typeof line.dash === "string" ? undefined : line.dash.dashes;
    const dashPattern = getDashArrayPattern(dashStyle, strokeWidth, customDash);
    if (dashPattern && dashPattern.length > 0) {
      pathAttrs["stroke-dasharray"] = dashPattern.join(" ");
    }
  }

  // Build SVG content
  const svgContent = renderConnectorSvg(transform, markers, pathAttrs);

  return div(
    {
      class: "shape cxnSp",
      "data-shape-id": shapeId,
      "data-ooxml-id": shape.nonVisual.id,
      style: buildStyle(positionStyles),
    },
    svgContent,
  );
}

function buildConnectorPathData(shape: CxnShape, transform: Transform): string {
  if (shape.properties.geometry) {
    if (shape.properties.geometry.type === "preset" && shape.properties.geometry.preset === "line") {
      return `M 0 0 L ${transform.width} ${transform.height}`;
    }
    return renderGeometryData(shape.properties.geometry, transform.width, transform.height);
  }
  return `M 0 0 L ${transform.width} ${transform.height}`;
}

function renderConnectorSvg(
  transform: Transform,
  markers: ReturnType<typeof generateLineMarkers>,
  pathAttrs: Record<string, string | number | undefined>,
): HtmlString {
  const svgAttrs = {
    width: transform.width,
    height: transform.height,
    viewBox: `0 0 ${transform.width} ${transform.height}`,
    overflow: "visible" as const,
  };

  if (markers.defs.length > 0) {
    return svg(svgAttrs, defs(...markers.defs), path(pathAttrs as Parameters<typeof path>[0]));
  }
  return svg(svgAttrs, path(pathAttrs as Parameters<typeof path>[0]));
}

// =============================================================================
// GraphicFrame Rendering
// =============================================================================

/**
 * Render chart content
 *
 * Uses chart data from ResourceStore if available (populated by integration layer).
 * This allows render to render charts without directly calling parser.
 */
function renderChartContent(chartRef: ChartReference, width: number, height: number, ctx: CoreRenderContext): HtmlString {
  // Get chart data from ResourceStore
  const entry = ctx.resourceStore?.get<import("../../domain/chart").Chart>(chartRef.resourceId);
  const parsedChart = entry?.parsed;
  if (parsedChart !== undefined) {
    return renderChart(parsedChart, width, height, ctx);
  }

  // Chart not in ResourceStore
  ctx.warnings.add({
    type: "fallback",
    message: `Chart not in ResourceStore: ${chartRef.resourceId}`,
    element: "chart",
  });
  return unsafeHtml(
    `<svg width="${width}" height="${height}"><text x="50%" y="50%" text-anchor="middle">Chart</text></svg>`,
  );
}

/**
 * Render diagram content
 *
 * Uses diagram data from ResourceStore if available (populated by integration layer).
 * This allows render to render diagrams without directly calling parser.
 */
function renderDiagramContent(
  diagramRef: DiagramReference,
  width: number,
  height: number,
  ctx: CoreRenderContext,
): HtmlString {
  // Get diagram content from ResourceStore
  if (diagramRef.dataResourceId !== undefined) {
    const entry = ctx.resourceStore?.get<{ readonly shapes: readonly import("../../domain").Shape[] }>(diagramRef.dataResourceId);
    const parsedContent = entry?.parsed;
    if (parsedContent !== undefined && parsedContent.shapes.length > 0) {
      return renderDiagram(parsedContent, width, height, ctx);
    }
  }

  // Return placeholder if diagram content not available
  return renderDiagramPlaceholder(width, height);
}

/**
 * Render graphic frame (graphicFrame)
 */
export function renderGraphicFrame(frame: GraphicFrame, ctx: CoreRenderContext): HtmlString {
  const transform = frame.transform;
  const shapeId = ctx.getNextShapeId();
  const positionStyles = buildPositionStyles(transform);

  // Render based on content type
  switch (frame.content.type) {
    case "table":
      return renderTable(frame.content.data.table, frame.transform, ctx);

    case "chart": {
      const chartHtml = renderChartContent(frame.content.data, transform.width, transform.height, ctx);
      return div(
        {
          class: "shape graphicFrame chart-frame",
          "data-shape-id": shapeId,
          "data-ooxml-id": frame.nonVisual.id,
          style: buildStyle(positionStyles),
        },
        chartHtml,
      );
    }

    case "diagram": {
      const diagramHtml = renderDiagramContent(frame.content.data, transform.width, transform.height, ctx);
      return div(
        {
          class: "shape graphicFrame diagram-frame",
          "data-shape-id": shapeId,
          "data-ooxml-id": frame.nonVisual.id,
          style: buildStyle(positionStyles),
        },
        diagramHtml,
      );
    }

    case "oleObject":
      return div(
        {
          class: "shape graphicFrame ole-frame",
          "data-shape-id": shapeId,
          "data-ooxml-id": frame.nonVisual.id,
          style: buildStyle({ ...positionStyles, background: "#e0e0e0" }),
        },
        unsafeHtml("<span>OLE Object</span>"),
      );

    default:
      return div(
        {
          class: "shape graphicFrame unknown-frame",
          "data-shape-id": shapeId,
          "data-ooxml-id": frame.nonVisual.id,
          style: buildStyle(positionStyles),
        },
        EMPTY_HTML,
      );
  }
}

// =============================================================================
// Main Shape Rendering
// =============================================================================

/**
 * Render a shape to HTML
 */
export function renderShape(shape: Shape, ctx: CoreRenderContext): HtmlString {
  if (isShapeHidden(shape)) {
    return EMPTY_HTML;
  }
  switch (shape.type) {
    case "sp":
      return renderSpShape(shape, ctx);
    case "pic":
      return renderPicShape(shape, ctx);
    case "grpSp":
      return renderGrpShape(shape, ctx);
    case "cxnSp":
      return renderCxnShape(shape, ctx);
    case "graphicFrame":
      return renderGraphicFrame(shape, ctx);
    default:
      return EMPTY_HTML;
  }
}

/**
 * Render multiple shapes
 */
export function renderShapes(shapes: readonly Shape[], ctx: CoreRenderContext): HtmlString {
  const htmlParts = shapes.map((shape) => renderShape(shape, ctx));
  return joinHtml(htmlParts);
}
