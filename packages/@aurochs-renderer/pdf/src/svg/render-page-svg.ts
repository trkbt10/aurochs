/**
 * @file Render PDF pages and elements to structured SVG node trees.
 *
 * All render functions produce XmlNode trees (from @aurochs/xml AST).
 * String output is produced only by the public API functions, which
 * delegate to serializeElement/serializeSvgFragment — ensuring all
 * escaping flows through @aurochs/xml as the single source of truth.
 */
import type {
  PdfBBox,
  PdfDocument,
  PdfElement,
  PdfImage,
  PdfLineCap,
  PdfLineJoin,
  PdfMatrix,
  PdfPage,
  PdfPath,
  PdfText,
} from "@aurochs/pdf/domain";
import { normalizeFontFamily } from "@aurochs/pdf/domain/font";
import type { PdfSvgRenderOptions } from "../types";
import { toSvgPaint } from "./color-to-svg";
import { buildPdfImageDataUrl } from "./image-data-url";
import { formatSvgNumber } from "./number-format";
import { buildSvgPathData } from "./path-data";
import { resolveTextAnchor, type TextAnchor } from "./text-bounds";
import { renderPdfTableNode } from "./table";
import type { SvgFragment } from "./svg-node";
import type { XmlElement, XmlNode } from "@aurochs/xml";
import {
  svgAttrs,
  svgClipPath,
  svgDefs,
  svgGroup,
  svgImage,
  svgPath,
  svgRect,
  svgRoot,
  svgText,
  svgMatrixTransform,
} from "./svg-node";
import { serializeSvgFragment } from "./svg-serializer";
import { serializeDocument, serializeElement, type XmlDocument } from "@aurochs/xml";

// =============================================================================
// ClipPath registry — collects <clipPath> defs as XmlElement nodes
// =============================================================================

type ClipPathRegistry = {
  readonly idsByKey: Map<string, string>;
  readonly defs: XmlElement[];
  nextId: number;
};

function createClipPathRegistry(): ClipPathRegistry {
  return {
    idsByKey: new Map<string, string>(),
    defs: [],
    nextId: 1,
  };
}

// =============================================================================
// Enum converters
// =============================================================================

function toSvgLineCap(cap: PdfLineCap): "butt" | "round" | "square" {
  if (cap === 1) {
    return "round";
  }
  if (cap === 2) {
    return "square";
  }
  return "butt";
}

function toSvgLineJoin(join: PdfLineJoin): "miter" | "round" | "bevel" {
  if (join === 1) {
    return "round";
  }
  if (join === 2) {
    return "bevel";
  }
  return "miter";
}

// =============================================================================
// ClipPath helpers
// =============================================================================

function toClipKey(bbox: PdfBBox): string {
  return bbox.map((value) => formatSvgNumber(value)).join(":");
}

function toSvgClipRect(bbox: PdfBBox, pageHeight: number): Readonly<{
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}> {
  const [x1, y1, x2, y2] = bbox;
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  return {
    x: minX,
    y: pageHeight - maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Register a clip bbox and return the clip-path attribute value (or undefined).
 *
 * Unlike the old string-based approach that returned ` clip-path="url(#...)"`,
 * this returns just the attribute value `"url(#...)"` or undefined.
 */
function registerClipPath(
  clipBBox: PdfBBox | undefined,
  pageHeight: number,
  registry: ClipPathRegistry,
): string | undefined {
  if (!clipBBox) {
    return undefined;
  }

  const key = toClipKey(clipBBox);
  const existing = registry.idsByKey.get(key);
  if (existing) {
    return `url(#${existing})`;
  }

  const id = `pdf-clip-${registry.nextId}`;
  registry.nextId += 1;
  registry.idsByKey.set(key, id);

  const rect = toSvgClipRect(clipBBox, pageHeight);
  registry.defs.push(
    svgClipPath(id, [
      svgRect({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }),
    ]),
  );

  return `url(#${id})`;
}

// =============================================================================
// Stroke dash helpers
// =============================================================================

function formatDashArray(strokeEnabled: boolean, dashArray: readonly number[]): string | undefined {
  if (!strokeEnabled || dashArray.length === 0) {
    return undefined;
  }
  return dashArray.map((value) => formatSvgNumber(value)).join(" ");
}

function formatDashOffset(strokeEnabled: boolean, dashArray: readonly number[], dashPhase: number): string | undefined {
  if (!strokeEnabled || dashArray.length === 0 || dashPhase === 0) {
    return undefined;
  }
  return formatSvgNumber(dashPhase);
}

// =============================================================================
// Element renderers — produce XmlElement | null
// =============================================================================

function renderPathNode(path: PdfPath, pageHeight: number, registry: ClipPathRegistry): XmlElement | null {
  if (path.paintOp === "clip" || path.paintOp === "none") {
    return null;
  }

  const d = buildSvgPathData(path, pageHeight);
  if (d.length === 0) {
    return null;
  }

  const state = path.graphicsState;
  const clipRef = registerClipPath(state.clipBBox, pageHeight, registry);

  const fillEnabled = path.paintOp === "fill" || path.paintOp === "fillStroke";
  const strokeEnabled = path.paintOp === "stroke" || path.paintOp === "fillStroke";

  const fillPaint = toSvgPaint(state.fillColor, state.fillAlpha * (state.softMaskAlpha ?? 1));
  const strokePaint = toSvgPaint(state.strokeColor, state.strokeAlpha * (state.softMaskAlpha ?? 1));

  const attrs = svgAttrs([
    ["d", d],
    ["fill", fillEnabled ? fillPaint.color : "none"],
    ["fill-opacity", fillEnabled && fillPaint.opacity < 1 ? formatSvgNumber(fillPaint.opacity) : undefined],
    ["stroke", strokeEnabled ? strokePaint.color : "none"],
    ["stroke-width", strokeEnabled ? formatSvgNumber(state.lineWidth) : undefined],
    ["stroke-linecap", strokeEnabled ? toSvgLineCap(state.lineCap) : undefined],
    ["stroke-linejoin", strokeEnabled ? toSvgLineJoin(state.lineJoin) : undefined],
    ["stroke-miterlimit", strokeEnabled ? formatSvgNumber(state.miterLimit) : undefined],
    ["stroke-opacity", strokeEnabled && strokePaint.opacity < 1 ? formatSvgNumber(strokePaint.opacity) : undefined],
    ["stroke-dasharray", formatDashArray(strokeEnabled, state.dashArray)],
    ["stroke-dashoffset", formatDashOffset(strokeEnabled, state.dashArray, state.dashPhase)],
    ["clip-path", clipRef],
  ]);

  return svgPath(attrs);
}

// =============================================================================
// Text rendering helpers
// =============================================================================

function isVerticalWritingText(text: PdfText): boolean {
  return text.writingMode === 1;
}

function normalizeTextAnchorForVerticalWriting(anchor: TextAnchor): TextAnchor {
  if (!anchor.fromBaseline) {
    return { ...anchor, dominantBaseline: "text-before-edge" };
  }
  return {
    ...anchor,
    dominantBaseline: "text-before-edge",
    angleDeg: anchor.angleDeg - 90,
  };
}

function normalizeTextScale(text: PdfText): number {
  const scaling = text.horizontalScaling;
  if (scaling === undefined) {
    return 1;
  }

  if (!Number.isFinite(scaling) || scaling <= 0) {
    return 1;
  }

  return scaling / 100;
}

function buildTextTransform(anchor: TextAnchor, textScale: number): string | null {
  const hasRotation = Math.abs(anchor.angleDeg) > 1e-6;
  const hasScale = Math.abs(textScale - 1) > 1e-6;

  if (!hasRotation && !hasScale) {
    return null;
  }

  if (!hasRotation) {
    const translateX = formatSvgNumber(anchor.x);
    const reverseTranslateX = formatSvgNumber(-anchor.x);
    return `translate(${translateX} 0) scale(${formatSvgNumber(textScale)} 1) translate(${reverseTranslateX} 0)`;
  }

  if (!hasScale) {
    return `rotate(${formatSvgNumber(anchor.angleDeg)} ${formatSvgNumber(anchor.x)} ${formatSvgNumber(anchor.y)})`;
  }

  const anchorX = formatSvgNumber(anchor.x);
  const anchorY = formatSvgNumber(anchor.y);
  const inverseAnchorX = formatSvgNumber(-anchor.x);
  const inverseAnchorY = formatSvgNumber(-anchor.y);
  return (
    `translate(${anchorX} ${anchorY}) rotate(${formatSvgNumber(anchor.angleDeg)}) ` +
    `scale(${formatSvgNumber(textScale)} 1) translate(${inverseAnchorX} ${inverseAnchorY})`
  );
}

function renderTextNode(text: PdfText, pageHeight: number, registry: ClipPathRegistry): XmlElement | null {
  if (text.text.length === 0) {
    return null;
  }

  const state = text.graphicsState;
  const clipRef = registerClipPath(state.clipBBox, pageHeight, registry);

  const fillEnabled = state.textRenderingMode === 0 || state.textRenderingMode === 2 || state.textRenderingMode === 4 || state.textRenderingMode === 6;
  const strokeEnabled = state.textRenderingMode === 1 || state.textRenderingMode === 2 || state.textRenderingMode === 5 || state.textRenderingMode === 6;

  if (!fillEnabled && !strokeEnabled) {
    return null;
  }

  const fillPaint = toSvgPaint(state.fillColor, state.fillAlpha * (state.softMaskAlpha ?? 1));
  const strokePaint = toSvgPaint(state.strokeColor, state.strokeAlpha * (state.softMaskAlpha ?? 1));
  const baseAnchor = resolveTextAnchor(text, pageHeight);
  const verticalWriting = isVerticalWritingText(text);
  const anchor = verticalWriting ? normalizeTextAnchorForVerticalWriting(baseAnchor) : baseAnchor;
  const fontFamily = normalizeFontFamily(text.baseFont ?? text.fontName);
  const fontWeight = text.isBold ? "700" : "400";
  const fontStyle = text.isItalic ? "italic" : "normal";

  const textScale = normalizeTextScale(text);
  const transform = buildTextTransform(anchor, textScale);

  const attrs = svgAttrs([
    ["x", formatSvgNumber(anchor.x)],
    ["y", formatSvgNumber(anchor.y)],
    ["font-size", formatSvgNumber(text.fontSize)],
    ["font-family", fontFamily],
    ["font-weight", fontWeight],
    ["font-style", fontStyle],
    ["dominant-baseline", anchor.dominantBaseline],
    ["xml:space", "preserve"],
    ["fill", fillEnabled ? fillPaint.color : "none"],
    ["fill-opacity", fillEnabled && fillPaint.opacity < 1 ? formatSvgNumber(fillPaint.opacity) : undefined],
    ["stroke", strokeEnabled ? strokePaint.color : "none"],
    ["stroke-width", strokeEnabled ? formatSvgNumber(state.lineWidth) : undefined],
    ["stroke-linejoin", strokeEnabled ? toSvgLineJoin(state.lineJoin) : undefined],
    ["stroke-opacity", strokeEnabled && strokePaint.opacity < 1 ? formatSvgNumber(strokePaint.opacity) : undefined],
    ["letter-spacing", text.charSpacing !== undefined && text.charSpacing !== 0 ? formatSvgNumber(text.charSpacing) : undefined],
    ["writing-mode", verticalWriting ? "vertical-rl" : undefined],
    ["text-orientation", verticalWriting ? "upright" : undefined],
    // textLength: enforce PDF-computed text width (SoT) on SVG rendering.
    // Without this, browser font metrics determine the rendered width independently,
    // causing divergence between the rendered text and cursor/selection positions
    // (which use text.width from the PDF parser as the single source of truth).
    ["textLength", text.width > 0 && text.text.length > 1 ? formatSvgNumber(text.width) : undefined],
    ["lengthAdjust", text.width > 0 && text.text.length > 1 ? "spacing" : undefined],
    ["transform", transform ?? undefined],
    ["clip-path", clipRef],
  ]);

  return svgText(attrs, text.text);
}

// =============================================================================
// Image rendering
// =============================================================================

function buildImageTransform(ctm: PdfMatrix, pageHeight: number): readonly number[] {
  const [a, b, c, d, e, f] = ctm;

  const topLeft = {
    x: c + e,
    y: pageHeight - (d + f),
  };

  const topRight = {
    x: a + c + e,
    y: pageHeight - (b + d + f),
  };

  const bottomLeft = {
    x: e,
    y: pageHeight - f,
  };

  const xAxis = {
    x: topRight.x - topLeft.x,
    y: topRight.y - topLeft.y,
  };

  const yAxis = {
    x: bottomLeft.x - topLeft.x,
    y: bottomLeft.y - topLeft.y,
  };

  return [xAxis.x, xAxis.y, yAxis.x, yAxis.y, topLeft.x, topLeft.y] as const;
}

function renderImageNode(image: PdfImage, pageHeight: number, registry: ClipPathRegistry): XmlElement {
  const clipRef = registerClipPath(image.graphicsState.clipBBox, pageHeight, registry);
  const dataUrl = buildPdfImageDataUrl(image);
  const matrix = buildImageTransform(image.graphicsState.ctm, pageHeight);

  const imageEl = svgImage(svgAttrs([
    ["href", dataUrl],
    ["xlink:href", dataUrl],
    ["width", "1"],
    ["height", "1"],
    ["preserveAspectRatio", "none"],
    ["transform", svgMatrixTransform(matrix)],
  ]));

  // Chromium-based engines may drop raster rendering when clip-path and transform
  // are both attached to the same <image>. Apply clipping on a wrapper group instead.
  if (clipRef) {
    return svgGroup({ "clip-path": clipRef }, [imageEl]);
  }

  return imageEl;
}

// =============================================================================
// Element dispatch
// =============================================================================

function renderElementNode(element: PdfElement, pageHeight: number, registry: ClipPathRegistry): XmlNode | SvgFragment | null {
  if (element.type === "path") {
    return renderPathNode(element, pageHeight, registry);
  }

  if (element.type === "text") {
    return renderTextNode(element, pageHeight, registry);
  }

  if (element.type === "table") {
    return renderPdfTableNode(element, pageHeight);
  }

  return renderImageNode(element, pageHeight, registry);
}

// =============================================================================
// XmlNode-based public API (structured output)
// =============================================================================

/**
 * Render a single PDF element to an SvgFragment (defs + content nodes).
 *
 * Returns a fragment because the element may require clip-path definitions
 * that must be placed in a `<defs>` block alongside the element markup.
 */
export function renderPdfElementToSvgNodes(element: PdfElement, pageHeight: number): SvgFragment {
  const registry = createClipPathRegistry();
  const content = renderElementNode(element, pageHeight, registry);

  const nodes: XmlNode[] = [];

  if (registry.defs.length > 0) {
    nodes.push(svgDefs(registry.defs));
  }

  if (content !== null) {
    if (Array.isArray(content)) {
      nodes.push(...content);
    } else {
      nodes.push(content as XmlNode);
    }
  }

  return nodes;
}

function normalizeDimension(value: number | string): string {
  if (typeof value === "number") {
    return formatSvgNumber(value);
  }
  return value;
}

function normalizeBackgroundColor(options: PdfSvgRenderOptions): string {
  if (options.backgroundColor === undefined) {
    return "#FFFFFF";
  }
  return options.backgroundColor;
}

function getPreserveAspectRatio(options: PdfSvgRenderOptions): string {
  if (options.preserveAspectRatio === undefined) {
    return "xMidYMid meet";
  }
  return options.preserveAspectRatio;
}

/** Render a single PdfPage into a structured XmlElement tree. */
export function renderPdfPageToSvgNode(page: PdfPage, options: PdfSvgRenderOptions = {}): XmlElement {
  if (!page) {
    throw new Error("page is required");
  }

  const registry = createClipPathRegistry();
  const bodyNodes: XmlNode[] = [];

  const backgroundColor = normalizeBackgroundColor(options);
  if (backgroundColor !== "none" && backgroundColor !== "transparent") {
    bodyNodes.push(
      svgRect({ x: 0, y: 0, width: page.width, height: page.height, fill: backgroundColor }),
    );
  }

  const excludeSet = options.excludeElementIndices;
  for (let i = 0; i < page.elements.length; i++) {
    if (excludeSet?.has(i)) { continue; }
    const rendered = renderElementNode(page.elements[i], page.height, registry);
    if (rendered !== null) {
      if (Array.isArray(rendered)) {
        bodyNodes.push(...rendered);
      } else {
        bodyNodes.push(rendered as XmlNode);
      }
    }
  }

  const children: XmlNode[] = [];
  if (registry.defs.length > 0) {
    children.push(svgDefs(registry.defs));
  }
  children.push(...bodyNodes);

  const width = normalizeDimension(options.width ?? page.width);
  const height = normalizeDimension(options.height ?? page.height);

  return svgRoot(
    {
      viewBox: `0 0 ${formatSvgNumber(page.width)} ${formatSvgNumber(page.height)}`,
      width,
      height,
      preserveAspectRatio: getPreserveAspectRatio(options),
    },
    children,
  );
}

// =============================================================================
// String-based public API (backward compatible)
//
// These are thin wrappers that produce XmlNode trees and serialize them.
// All escaping is handled by the serializer (via @aurochs/xml).
// =============================================================================

/**
 * Render a single PDF element to SVG markup string.
 * Exported for use by editor overlays (e.g., text edit preview).
 */
export function renderPdfElementToSvg(element: PdfElement, pageHeight: number): string {
  const fragment = renderPdfElementToSvgNodes(element, pageHeight);
  return serializeSvgFragment(fragment);
}

/** Render a single `PdfPage` into standalone SVG markup. */
export function renderPdfPageToSvg(page: PdfPage, options: PdfSvgRenderOptions = {}): string {
  const node = renderPdfPageToSvgNode(page, options);

  if (options.includeXmlDeclaration) {
    const doc: XmlDocument = { children: [node] };
    return serializeDocument(doc, { declaration: true });
  }

  return serializeElement(node);
}

/** Render all pages of a PDF document to SVG strings. */
export function renderPdfDocumentToSvgs(document: PdfDocument, options: PdfSvgRenderOptions = {}): readonly string[] {
  if (!document) {
    throw new Error("document is required");
  }

  return document.pages.map((page) => renderPdfPageToSvg(page, options));
}

/** Render a single page of a PDF document to SVG by page index. */
export function renderPdfDocumentPageToSvg(
  document: PdfDocument,
  pageNumber: number,
  options: PdfSvgRenderOptions = {},
): string {
  if (!document) {
    throw new Error("document is required");
  }
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new Error(`pageNumber must be a positive integer: ${pageNumber}`);
  }

  const page = document.pages[pageNumber - 1];
  if (!page) {
    throw new Error(`pageNumber ${pageNumber} is out of range`);
  }

  return renderPdfPageToSvg(page, options);
}
