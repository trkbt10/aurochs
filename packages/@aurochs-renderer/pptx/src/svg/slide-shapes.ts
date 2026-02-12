/**
 * @file SVG shape rendering for slides
 *
 * Renders various shape types to SVG:
 * - SpShape (p:sp) - Basic shapes with geometry and text
 * - PicShape (p:pic) - Pictures/images
 * - GrpShape (p:grpSp) - Group shapes containing children
 * - CxnShape (p:cxnSp) - Connector shapes with arrows
 * - GraphicFrame - Charts, tables, diagrams, OLE objects
 *
 * @see ECMA-376 Part 1, Section 19.3 (PresentationML)
 * @see ECMA-376 Part 1, Section 20.1 (DrawingML)
 */

import type {
  Shape,
  SpShape,
  PicShape,
  GrpShape,
  CxnShape,
  GraphicFrame,
  Fill,
  Line,
  Geometry,
  OleReference,
  ChartReference,
  DiagramReference,
} from "@aurochs-office/pptx/domain";
import type { CoreRenderContext } from "../render-context";
import type { SvgDefsCollector } from "./slide-utils";
import type { Shape as DomainShape } from "@aurochs-office/pptx/domain";
import type { Chart as DomainChart } from "@aurochs-office/chart/domain";
import {
  createDefsCollector,
  getShapeTransform,
  isShapeHidden,
  buildTransformAttr,
  buildGroupTransformAttr,
} from "./slide-utils";
import { renderFillToSvgDef, renderFillToSvgStyle, getResolvedImageFill, renderImageFillToSvgDef } from "./fill";
import { getBlipFillImageSrc } from "../utils/image-conversion";
import { renderGeometryData } from "@aurochs-renderer/drawing-ml/svg";
import { generateLineMarkers } from "./marker";
import { resolveFill, formatRgba } from "@aurochs-office/pptx/domain/color/fill";
import { renderTextSvg, getDashArray } from "./slide-text";
import { renderChart } from "../chart";
import { renderTableSvg } from "./table";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { extractSvgContent } from "./svg-utils";

// =============================================================================
// Main Shape Rendering
// =============================================================================

/**
 * Get data-ooxml-id attribute for animation targeting.
 * This attribute allows the animation player to find elements.
 *
 * @see packages/@aurochs-renderer/pptx/src/react/hooks/useSlideAnimation.ts
 */
function getOoxmlIdAttr(shape: Shape): string {
  // ContentPartShape doesn't have nonVisual
  if (shape.type === "contentPart") {
    return "";
  }
  const id = shape.nonVisual?.id;
  if (id !== undefined) {
    return ` data-ooxml-id="${id}"`;
  }
  return "";
}

/**
 * Render a single shape to SVG
 */
export function renderShapeSvg(shape: Shape, ctx: CoreRenderContext, defsCollector: SvgDefsCollector): string {
  if (isShapeHidden(shape)) {
    return "";
  }

  const transform = getShapeTransform(shape);
  const w = transform !== undefined ? (transform.width as number) : 0;
  const h = transform !== undefined ? (transform.height as number) : 0;
  const transformAttr = buildTransformAttr(transform, w, h);
  const ooxmlIdAttr = getOoxmlIdAttr(shape);

  switch (shape.type) {
    case "sp":
      return renderSpShapeSvg({ shape, ctx, defsCollector, transformAttr, ooxmlIdAttr, w, h });

    case "pic":
      return renderPictureSvg({ shape, ctx, transformAttr, ooxmlIdAttr, w, h });

    case "grpSp":
      return renderGroupSvg({ shape, ctx, defsCollector, ooxmlIdAttr });

    case "cxnSp":
      return renderConnectorSvg({ shape, ctx, defsCollector, transformAttr, ooxmlIdAttr, w, h });

    case "graphicFrame":
      return renderGraphicFrameSvg({ shape, ctx, defsCollector, transformAttr, ooxmlIdAttr, w, h });

    default:
      return "";
  }
}

/**
 * Render all shapes to SVG
 */
export function renderShapesSvg(
  shapes: readonly Shape[],
  ctx: CoreRenderContext,
  defsCollector: SvgDefsCollector,
): string {
  return shapes
    .map((shape) => renderShapeSvg(shape, ctx, defsCollector))
    .filter((svg) => svg !== "")
    .join("\n");
}

// =============================================================================
// Fill and Stroke Rendering
// =============================================================================

/**
 * Render fill attributes for SVG
 *
 * @param fill - Fill to render
 * @param ctx - Render context
 * @param defsCollector - Defs collector for gradient/pattern definitions
 * @param w - Shape width (needed for image pattern sizing)
 * @param h - Shape height (needed for image pattern sizing)
 */
function renderFillAttrs({
  fill,
  ctx,
  defsCollector,
  w,
  h,
}: {
  fill: Fill | undefined;
  ctx: CoreRenderContext;
  defsCollector: SvgDefsCollector;
  w?: number;
  h?: number;
}): string {
  if (fill === undefined || fill.type === "noFill") {
    return 'fill="none"';
  }

  if (fill.type === "gradientFill") {
    const gradId = defsCollector.getNextId("shape-grad");
    const gradDef = renderFillToSvgDef(fill, gradId, ctx.colorContext);
    if (gradDef !== undefined) {
      defsCollector.addDef(gradDef);
      return `fill="url(#${gradId})"`;
    }
  }

  // Handle image fill (blipFill) using resource resolver
  if (fill.type === "blipFill") {
    const imageFill = getResolvedImageFill(fill, ctx.colorContext, ctx.resources.resolve);
    if (imageFill !== undefined && w !== undefined && h !== undefined) {
      const patternId = defsCollector.getNextId("img-pattern");
      const patternDef = renderImageFillToSvgDef({ imageFill, patternId, width: w, height: h });
      defsCollector.addDef(patternDef);
      return `fill="url(#${patternId})"`;
    }
  }

  const fillStyle = renderFillToSvgStyle(fill, ctx.colorContext);
  return `fill="${fillStyle}"`;
}

/**
 * Render stroke attributes for SVG
 */
function renderStrokeAttrs(line: Line | undefined, ctx: CoreRenderContext): string {
  if (line === undefined || line.fill.type === "noFill") {
    return "";
  }

  const lineWidth = line.width as number;
  const strokeStyle = renderFillToSvgStyle(line.fill, ctx.colorContext);
  const strokeAttrs = [`stroke="${strokeStyle}"`, `stroke-width="${lineWidth}"`];

  // Handle dash style
  if (line.dash !== "solid" && typeof line.dash === "string") {
    const dashArray = getDashArray(line.dash, lineWidth);
    if (dashArray !== undefined) {
      strokeAttrs.push(`stroke-dasharray="${dashArray}"`);
    }
  }

  // Handle line cap
  if (line.cap !== "flat") {
    const capValue = line.cap === "round" ? "round" : "square";
    strokeAttrs.push(`stroke-linecap="${capValue}"`);
  }

  // Handle line join
  if (line.join !== "miter") {
    strokeAttrs.push(`stroke-linejoin="${line.join}"`);
  }

  return ` ${strokeAttrs.join(" ")}`;
}

// =============================================================================
// SpShape Rendering
// =============================================================================

/**
 * Render a basic shape (p:sp) to SVG
 */
function renderSpShapeSvg({
  shape,
  ctx,
  defsCollector,
  transformAttr,
  ooxmlIdAttr,
  w,
  h,
}: {
  shape: SpShape;
  ctx: CoreRenderContext;
  defsCollector: SvgDefsCollector;
  transformAttr: string;
  ooxmlIdAttr: string;
  w: number;
  h: number;
}): string {
  const { properties } = shape;

  // Get fill and stroke attributes
  const fillAttr = renderFillAttrs({ fill: properties.fill, ctx, defsCollector, w, h });
  const strokeAttr = renderStrokeAttrs(properties.line, ctx);

  // Render shape geometry
  const shapePath = renderGeometry({ geometry: properties.geometry, w, h, fillAttr, strokeAttr });

  // Render text if present
  const textSvg = renderShapeTextSvg({ shape, ctx, w, h, defsCollector });

  return `<g${transformAttr}${ooxmlIdAttr}>${shapePath}${textSvg}</g>`;
}

function renderShapeTextSvg({
  shape,
  ctx,
  w,
  h,
  defsCollector,
}: {
  shape: SpShape;
  ctx: CoreRenderContext;
  w: number;
  h: number;
  defsCollector: SvgDefsCollector;
}): string {
  if (shape.textBody !== undefined) {
    return renderTextSvg({ textBody: shape.textBody, ctx, boxWidth: w, boxHeight: h, defsCollector });
  }
  return "";
}

/**
 * Render geometry to SVG path element
 */
function renderGeometry({
  geometry,
  w,
  h,
  fillAttr,
  strokeAttr,
}: {
  geometry: Geometry | undefined;
  w: number;
  h: number;
  fillAttr: string;
  strokeAttr: string;
}): string {
  if (geometry === undefined) {
    // No geometry - render as rectangle (default shape)
    return `<rect x="0" y="0" width="${w}" height="${h}" ${fillAttr}${strokeAttr}/>`;
  }

  // Get path data from geometry
  const pathData = renderGeometryData(geometry, w, h);

  return `<path d="${pathData}" ${fillAttr}${strokeAttr}/>`;
}

// =============================================================================
// PicShape Rendering
// =============================================================================

/**
 * Calculate image position and size for a:srcRect cropping
 *
 * Per ECMA-376 Part 1, Section 20.1.8.55 (a:srcRect):
 * - l, t, r, b specify percentages of the image to crop from each side
 * - Values are in 1/1000ths of a percent (0-100000)
 * - Negative values expand beyond the source image (padding)
 *
 * The visible portion of the image (after cropping) must fill the shape exactly.
 *
 * @param w - Shape width in pixels
 * @param h - Shape height in pixels
 * @param srcRect - Source rectangle percentages (0-100)
 * @returns Image position and dimensions to achieve the crop effect
 */
function calculateCroppedImageLayout(
  w: number,
  h: number,
  srcRect: { left: number; top: number; right: number; bottom: number },
): { x: number; y: number; width: number; height: number } {
  // Calculate visible percentage (what remains after cropping)
  // visiblePct = 100 - left - right (for width)
  // visiblePct = 100 - top - bottom (for height)
  const visibleWidthPct = 100 - srcRect.left - srcRect.right;
  const visibleHeightPct = 100 - srcRect.top - srcRect.bottom;

  // Avoid division by zero
  const safeVisibleWidthPct = Math.max(visibleWidthPct, 0.001);
  const safeVisibleHeightPct = Math.max(visibleHeightPct, 0.001);

  // The visible portion must fill the shape, so scale the full image proportionally
  // imageWidth = shapeWidth / (visiblePct / 100)
  const imageWidth = w * (100 / safeVisibleWidthPct);
  const imageHeight = h * (100 / safeVisibleHeightPct);

  // Position the image so the cropped portion aligns with the shape
  // x = -imageWidth * (leftCropPct / 100)
  const x = -imageWidth * (srcRect.left / 100);
  const y = -imageHeight * (srcRect.top / 100);

  return { x, y, width: imageWidth, height: imageHeight };
}

/**
 * Render a picture (p:pic) to SVG
 *
 * Handles:
 * - a:srcRect: Source rectangle for image cropping (ECMA-376 20.1.8.55)
 * - a:stretch: Stretch fill mode (ECMA-376 20.1.8.56)
 *
 * @see ECMA-376 Part 1, Section 19.3.1.37 (p:pic)
 */
function renderPictureSvg({
  shape,
  ctx,
  transformAttr,
  ooxmlIdAttr,
  w,
  h,
}: {
  shape: PicShape;
  ctx: CoreRenderContext;
  transformAttr: string;
  ooxmlIdAttr: string;
  w: number;
  h: number;
}): string {
  // Use resolvedResource (resolved at parse time) if available, otherwise fall back to runtime resolution
  const imagePath = getBlipFillImageSrc(shape.blipFill, (rId) => ctx.resources.resolve(rId));
  if (imagePath === undefined) {
    return "";
  }

  const srcRect = shape.blipFill.sourceRect;

  // Check if we have a source rectangle (cropping)
  if (srcRect && (srcRect.left !== 0 || srcRect.top !== 0 || srcRect.right !== 0 || srcRect.bottom !== 0)) {
    // Calculate image layout with cropping
    const layout = calculateCroppedImageLayout(w, h, {
      left: srcRect.left,
      top: srcRect.top,
      right: srcRect.right,
      bottom: srcRect.bottom,
    });

    // Use a clipPath to constrain the visible area to the shape bounds
    // The image is positioned and sized so the visible portion fills the shape
    const clipId = `clip-${Math.random().toString(36).slice(2, 9)}`;

    // ECMA-376 Part 1, Section 20.1.8.56 (a:stretch):
    // When stretch is specified, use preserveAspectRatio="none"
    const aspectRatio = shape.blipFill.stretch ? "none" : "xMidYMid meet";

    return (
      `<g${transformAttr}${ooxmlIdAttr}>` +
      `<defs><clipPath id="${clipId}"><rect x="0" y="0" width="${w}" height="${h}"/></clipPath></defs>` +
      `<g clip-path="url(#${clipId})">` +
      `<image href="${imagePath}" x="${layout.x}" y="${layout.y}" ` +
      `width="${layout.width}" height="${layout.height}" preserveAspectRatio="${aspectRatio}"/>` +
      `</g></g>`
    );
  }

  // No cropping - simple image rendering
  // ECMA-376 Part 1, Section 20.1.8.56 (a:stretch):
  // When stretch is specified, use preserveAspectRatio="none" to fill container
  const aspectRatio = shape.blipFill.stretch ? "none" : "xMidYMid meet";
  return `<g${transformAttr}${ooxmlIdAttr}><image href="${imagePath}" width="${w}" height="${h}" preserveAspectRatio="${aspectRatio}"/></g>`;
}

// =============================================================================
// GrpShape Rendering
// =============================================================================

/**
 * Render a group shape (p:grpSp) to SVG
 *
 * Per ECMA-376 Part 1, Section 20.1.7.5 (grpSpPr):
 * Group shapes have a special transform that includes child coordinate space mapping.
 * - ext (width/height): The visual size of the group
 * - chExt (childExtentWidth/Height): The coordinate space for children
 * - chOff (childOffsetX/Y): The origin of child coordinate space
 *
 * Children are positioned in chExt coordinate space and must be scaled to fit within ext.
 * Scale factors: scaleX = width / childExtentWidth, scaleY = height / childExtentHeight
 *
 * @see ECMA-376 Part 1, Section 20.1.7.5 (grpSpPr)
 * @see ECMA-376 Part 1, Section 20.1.7.2 (chExt)
 * @see ECMA-376 Part 1, Section 20.1.7.3 (chOff)
 */
function renderGroupSvg({
  shape,
  ctx,
  defsCollector,
  ooxmlIdAttr,
}: {
  shape: GrpShape;
  ctx: CoreRenderContext;
  defsCollector: SvgDefsCollector;
  ooxmlIdAttr: string;
}): string {
  // Use group-specific transform that handles childOffset/childExtent scaling
  const transformAttr = buildGroupTransformAttr(shape.properties.transform);

  const childrenSvg = shape.children
    .map((child) => renderShapeSvg(child, ctx, defsCollector))
    .filter((svg) => svg !== "")
    .join("\n");

  return `<g${transformAttr}${ooxmlIdAttr}>${childrenSvg}</g>`;
}

// =============================================================================
// CxnShape Rendering
// =============================================================================

/**
 * Resolve stroke color from line fill.
 *
 * Per ECMA-376 Part 1, Section 20.1.2.2.24 (a:ln):
 * Line color is specified via fill child element (solidFill, gradFill, etc.)
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2.24
 */
function resolveConnectorStrokeColor(line: Line | undefined, ctx: CoreRenderContext): string {
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
 * Render a connector (p:cxnSp) to SVG
 *
 * Per ECMA-376 Part 1, Section 19.3.1.13:
 * Connector shapes can have line end decorations (arrows).
 *
 * Per ECMA-376 Part 1, Section 20.1.8.37/57 (headEnd/tailEnd):
 * Line ends are rendered as SVG markers.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.13 (p:cxnSp)
 * @see ECMA-376 Part 1, Section 20.1.8.37 (a:headEnd)
 * @see ECMA-376 Part 1, Section 20.1.8.57 (a:tailEnd)
 */
function renderConnectorSvg({
  shape,
  ctx,
  defsCollector,
  transformAttr,
  ooxmlIdAttr,
  w,
  h,
}: {
  shape: CxnShape;
  ctx: CoreRenderContext;
  defsCollector: SvgDefsCollector;
  transformAttr: string;
  ooxmlIdAttr: string;
  w: number;
  h: number;
}): string {
  const { properties } = shape;
  const line = properties.line;

  // Get stroke color
  const strokeColor = resolveConnectorStrokeColor(line, ctx);
  const strokeWidth = line !== undefined ? (line.width as number) : 1;

  // Build basic stroke attributes
  const strokeAttrs = [`stroke="${strokeColor}"`, `stroke-width="${strokeWidth}"`];

  // Handle dash style
  if (line?.dash !== undefined && line.dash !== "solid" && typeof line.dash === "string") {
    const dashArray = getDashArray(line.dash, strokeWidth);
    if (dashArray !== undefined) {
      strokeAttrs.push(`stroke-dasharray="${dashArray}"`);
    }
  }

  // Handle line cap
  if (line?.cap !== undefined && line.cap !== "flat") {
    const capValue = line.cap === "round" ? "round" : "square";
    strokeAttrs.push(`stroke-linecap="${capValue}"`);
  }

  // Handle line join
  if (line?.join !== undefined && line.join !== "miter") {
    strokeAttrs.push(`stroke-linejoin="${line.join}"`);
  }

  // Generate markers for line ends (arrows)
  // Per ECMA-376 Part 1, Section 20.1.8.37/57
  const markerAttrs: string[] = [];
  if (line?.headEnd !== undefined || line?.tailEnd !== undefined) {
    const markers = generateLineMarkers({
      headEnd: line?.headEnd,
      tailEnd: line?.tailEnd,
      strokeWidth,
      colorHex: strokeColor,
    });

    // Add marker definitions to collector
    for (const def of markers.defs) {
      defsCollector.addDef(def as string);
    }

    // Add marker references to path
    if (markers.markerStart) {
      markerAttrs.push(`marker-start="${markers.markerStart}"`);
    }
    if (markers.markerEnd) {
      markerAttrs.push(`marker-end="${markers.markerEnd}"`);
    }
  }

  const strokeAttr = strokeAttrs.join(" ");
  const markerAttr = markerAttrs.length > 0 ? ` ${markerAttrs.join(" ")}` : "";

  // Render connector geometry
  // Per ECMA-376 Part 1, Section 20.1.9.18:
  // For connector shapes, "line" preset should render as diagonal line
  // from (0,0) to (w,h), not as horizontal/vertical line through center.
  const pathData = getConnectorPathData(properties.geometry, w, h);

  return `<g${transformAttr}${ooxmlIdAttr}><path d="${pathData}" fill="none" ${strokeAttr}${markerAttr}/></g>`;
}

// =============================================================================
// GraphicFrame Rendering
// =============================================================================

/**
 * Render a graphic frame (chart, table, diagram) to SVG
 */
function renderGraphicFrameSvg({
  shape,
  ctx,
  defsCollector,
  transformAttr,
  ooxmlIdAttr,
  w,
  h,
}: {
  shape: GraphicFrame;
  ctx: CoreRenderContext;
  defsCollector: SvgDefsCollector;
  transformAttr: string;
  ooxmlIdAttr: string;
  w: number;
  h: number;
}): string {
  const { content } = shape;

  switch (content.type) {
    case "chart": {
      // Try to render the chart using pre-parsed data if available
      const chartSvg = renderChartFromRef({ chartRef: content.data, w, h, ctx });
      if (chartSvg !== undefined) {
        return `<g${transformAttr}${ooxmlIdAttr}>${chartSvg}</g>`;
      }
      return renderPlaceholder({ transformAttr, ooxmlIdAttr, w, h, label: "Chart" });
    }

    case "table": {
      // Table has embedded data from parser
      // Render at origin, transformAttr handles positioning (like chart)
      // Pass frame dimensions for scaling options (width/height only, not full Transform)
      const { table } = content.data;
      return `<g${transformAttr}${ooxmlIdAttr}>${renderTableSvg({ table, frameWidth: px(w), frameHeight: px(h), ctx, defsCollector, options: ctx.options })}</g>`;
    }

    case "diagram": {
      // Try to render diagram shapes from pre-parsed data
      const diagramSvg = renderDiagramShapesSvg({ diagramRef: content.data, w, h, ctx });
      if (diagramSvg !== undefined) {
        return `<g${transformAttr}${ooxmlIdAttr}>${diagramSvg}</g>`;
      }
      // Fallback to placeholder if diagram content not available
      ctx.warnings.add({
        type: "fallback",
        message: "Diagram drawing content not available",
      });
      return renderPlaceholder({ transformAttr, ooxmlIdAttr, w, h, label: "Diagram" });
    }

    case "oleObject": {
      const oleImage = renderOleObjectImage({ data: content.data, w, h, ctx });
      if (oleImage !== undefined) {
        return `<g${transformAttr}${ooxmlIdAttr}>${oleImage}</g>`;
      }
      // Fallback to placeholder if no preview image available
      ctx.warnings.add({
        type: "fallback",
        message: `OLE object preview not available: ${content.data.progId ?? "unknown"}`,
      });
      return renderPlaceholder({ transformAttr, ooxmlIdAttr, w, h, label: "OLE Object" });
    }

    case "unknown":
    default: {
      return renderPlaceholder({ transformAttr, ooxmlIdAttr, w, h, label: "Unknown" });
    }
  }
}

/**
 * Render a placeholder for unsupported content
 */
function renderPlaceholder({
  transformAttr,
  ooxmlIdAttr,
  w,
  h,
  label,
}: {
  transformAttr: string;
  ooxmlIdAttr: string;
  w: number;
  h: number;
  label: string;
}): string {
  return `<g${transformAttr}${ooxmlIdAttr}>
  <rect x="0" y="0" width="${w}" height="${h}" fill="#f0f0f0" stroke="#cccccc"/>
  <text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="middle" fill="#999999">[${label}]</text>
</g>`;
}

// =============================================================================
// Diagram Rendering
// =============================================================================

/**
 * Render diagram shapes to SVG
 *
 * Uses pre-parsed diagram content if available (populated by integration layer).
 * This allows render to render diagrams without directly calling parser.
 *
 * @param diagramRef - Diagram reference with optional pre-parsed content
 * @param w - Diagram frame width
 * @param h - Diagram frame height
 * @param ctx - Render context
 * @returns SVG string or undefined if diagram content not available
 *
 * @see MS-ODRAWXML Section 2.4 - Diagram Drawing Elements
 */
export function renderDiagramShapesSvg({
  diagramRef,
  w: _w,
  h: _h,
  ctx,
}: {
  diagramRef: DiagramReference;
  w: number;
  h: number;
  ctx: CoreRenderContext;
}): string | undefined {
  // Get diagram content from ResourceStore
  if (diagramRef.dataResourceId === undefined) {
    ctx.warnings.add({
      type: "fallback",
      message: "Diagram has no dataResourceId",
    });
    return undefined;
  }

  const entry = ctx.resourceStore?.get<{ readonly shapes: readonly DomainShape[] }>(
    diagramRef.dataResourceId,
  );
  const diagramContent = entry?.parsed;

  if (diagramContent === undefined) {
    ctx.warnings.add({
      type: "fallback",
      message: "Diagram not in ResourceStore",
      details: "Diagram content should be registered in ResourceStore by integration layer",
    });
    return undefined;
  }

  if (diagramContent.shapes.length === 0) {
    ctx.warnings.add({
      type: "fallback",
      message: "Diagram drawing contains no shapes",
    });
    return undefined;
  }

  // Create a defs collector for the diagram shapes
  const diagramDefs = createDefsCollector();

  // Render each shape
  const shapeSvgs: string[] = [];
  for (const shape of diagramContent.shapes) {
    const shapeSvg = renderShapeSvg(shape, ctx, diagramDefs);
    shapeSvgs.push(shapeSvg);
  }

  // If there are defs, wrap them
  const defsElement = diagramDefs.toDefsElement();
  if (defsElement !== "") {
    return `${defsElement}\n${shapeSvgs.join("\n")}`;
  }

  return shapeSvgs.join("\n");
}

// =============================================================================
// OLE Object Rendering
// =============================================================================

/**
 * Render OLE object preview image
 *
 * OLE objects can have preview images from three sources:
 * 1. previewImageUrl (pre-resolved by integration layer from VML)
 * 2. p:pic child element (ECMA-376-1:2016 format)
 * 3. VML drawing part (legacy format) - should be pre-resolved by integration layer
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36a (oleObj)
 * @see MS-OE376 Part 4 Section 4.4.2.4
 */
function renderOleObjectImage({
  data,
  w,
  h,
  ctx,
}: {
  data: OleReference;
  w: number;
  h: number;
  ctx: CoreRenderContext;
}): string | undefined {
  // 1. Check ResourceStore for preview URL
  if (data.resourceId !== undefined) {
    const entry = ctx.resourceStore?.get(data.resourceId);
    if (entry?.previewUrl !== undefined) {
      return `<image href="${entry.previewUrl}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
    }
  }

  // 2. Modern format: p:pic child element (ECMA-376-1:2016)
  if (data.pic?.resourceId !== undefined) {
    const dataUrl = ctx.resourceStore?.toDataUrl(data.pic.resourceId) ?? ctx.resources.resolve(data.pic.resourceId);
    if (dataUrl !== undefined) {
      return `<image href="${dataUrl}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
    }
  }

  return undefined;
}

function getConnectorPathData(geometry: Geometry | undefined, w: number, h: number): string {
  if (geometry !== undefined) {
    // Special handling for "line" preset in connectors
    if (geometry.type === "preset" && geometry.preset === "line") {
      // Connector "line" is a diagonal line from corner to corner
      // Transform (flipH/flipV) handles the actual direction
      return `M 0 0 L ${w} ${h}`;
    }
    return renderGeometryData(geometry, w, h);
  }
  // Default: simple diagonal line
  return `M 0 0 L ${w} ${h}`;
}

// =============================================================================
// Chart Rendering
// =============================================================================

/**
 * Render chart from ChartReference
 *
 * Uses chart data from ResourceStore if available (populated by integration layer).
 * This allows render to render charts without directly calling parser.
 */
function renderChartFromRef({
  chartRef,
  w,
  h,
  ctx,
}: {
  chartRef: ChartReference;
  w: number;
  h: number;
  ctx: CoreRenderContext;
}): string | undefined {
  // Get chart data from ResourceStore
  const entry = ctx.resourceStore?.get<DomainChart>(chartRef.resourceId);
  const parsedChart = entry?.parsed;

  if (parsedChart !== undefined) {
    const chartHtml = renderChart({ chart: parsedChart, width: w, height: h, ctx });
    return extractSvgContent(chartHtml as string);
  }

  // Chart not in ResourceStore - this means the integration layer
  // didn't register it (e.g., direct render without integration layer)
  ctx.warnings.add({
    type: "fallback",
    message: `Chart not in ResourceStore: ${chartRef.resourceId}`,
    details: "Chart content should be registered in ResourceStore by integration layer",
  });
  return undefined;
}
