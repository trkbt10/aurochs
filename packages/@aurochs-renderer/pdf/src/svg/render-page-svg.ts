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
import { formatSvgMatrix, formatSvgNumber } from "./number-format";
import { buildSvgPathData } from "./path-data";
import { escapeXmlAttr, escapeXmlText } from "./xml-escape";
import { resolveTextAnchor, type TextAnchor } from "./text-bounds";

type ClipPathRegistry = {
  readonly idsByKey: Map<string, string>;
  readonly defs: string[];
  nextId: number;
};

function createClipPathRegistry(): ClipPathRegistry {
  return {
    idsByKey: new Map<string, string>(),
    defs: [],
    nextId: 1,
  };
}

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

function getClipPathReference(
  clipBBox: PdfBBox | undefined,
  pageHeight: number,
  registry: ClipPathRegistry,
): string {
  if (!clipBBox) {
    return "";
  }

  const key = toClipKey(clipBBox);
  const existing = registry.idsByKey.get(key);
  if (existing) {
    return ` clip-path="url(#${existing})"`;
  }

  const id = `pdf-clip-${registry.nextId}`;
  registry.nextId += 1;
  registry.idsByKey.set(key, id);

  const rect = toSvgClipRect(clipBBox, pageHeight);
  registry.defs.push(
    `<clipPath id="${id}"><rect x="${formatSvgNumber(rect.x)}" y="${formatSvgNumber(rect.y)}" width="${formatSvgNumber(rect.width)}" height="${formatSvgNumber(rect.height)}" /></clipPath>`,
  );

  return ` clip-path="url(#${id})"`;
}

function renderPath(path: PdfPath, pageHeight: number, registry: ClipPathRegistry): string {
  if (path.paintOp === "clip" || path.paintOp === "none") {
    return "";
  }

  const d = buildSvgPathData(path, pageHeight);
  if (d.length === 0) {
    return "";
  }

  const state = path.graphicsState;
  const clipPathRef = getClipPathReference(state.clipBBox, pageHeight, registry);

  const fillEnabled = path.paintOp === "fill" || path.paintOp === "fillStroke";
  const strokeEnabled = path.paintOp === "stroke" || path.paintOp === "fillStroke";

  const fillPaint = toSvgPaint(state.fillColor, state.fillAlpha * (state.softMaskAlpha ?? 1));
  const strokePaint = toSvgPaint(state.strokeColor, state.strokeAlpha * (state.softMaskAlpha ?? 1));

  const attrs: string[] = [`d="${escapeXmlAttr(d)}"`];

  if (fillEnabled) {
    attrs.push(`fill="${fillPaint.color}"`);
    if (fillPaint.opacity < 1) {
      attrs.push(`fill-opacity="${formatSvgNumber(fillPaint.opacity)}"`);
    }
  } else {
    attrs.push('fill="none"');
  }

  if (strokeEnabled) {
    attrs.push(`stroke="${strokePaint.color}"`);
    attrs.push(`stroke-width="${formatSvgNumber(state.lineWidth)}"`);
    attrs.push(`stroke-linecap="${toSvgLineCap(state.lineCap)}"`);
    attrs.push(`stroke-linejoin="${toSvgLineJoin(state.lineJoin)}"`);
    attrs.push(`stroke-miterlimit="${formatSvgNumber(state.miterLimit)}"`);
    if (strokePaint.opacity < 1) {
      attrs.push(`stroke-opacity="${formatSvgNumber(strokePaint.opacity)}"`);
    }
    if (state.dashArray.length > 0) {
      attrs.push(`stroke-dasharray="${state.dashArray.map((value) => formatSvgNumber(value)).join(" ")}"`);
      if (state.dashPhase !== 0) {
        attrs.push(`stroke-dashoffset="${formatSvgNumber(state.dashPhase)}"`);
      }
    }
  } else {
    attrs.push('stroke="none"');
  }

  return `<path ${attrs.join(" ")}${clipPathRef} />`;
}


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
    // Vertical text in SVG naturally advances along +Y.
    // Align baseline-derived run direction to that axis.
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

function renderText(text: PdfText, pageHeight: number, registry: ClipPathRegistry): string {
  if (text.text.length === 0) {
    return "";
  }

  const state = text.graphicsState;
  const clipPathRef = getClipPathReference(state.clipBBox, pageHeight, registry);

  const fillEnabled = state.textRenderingMode === 0 || state.textRenderingMode === 2 || state.textRenderingMode === 4 || state.textRenderingMode === 6;
  const strokeEnabled = state.textRenderingMode === 1 || state.textRenderingMode === 2 || state.textRenderingMode === 5 || state.textRenderingMode === 6;

  if (!fillEnabled && !strokeEnabled) {
    return "";
  }

  const fillPaint = toSvgPaint(state.fillColor, state.fillAlpha * (state.softMaskAlpha ?? 1));
  const strokePaint = toSvgPaint(state.strokeColor, state.strokeAlpha * (state.softMaskAlpha ?? 1));
  const baseAnchor = resolveTextAnchor(text, pageHeight);
  const verticalWriting = isVerticalWritingText(text);
  const anchor = verticalWriting ? normalizeTextAnchorForVerticalWriting(baseAnchor) : baseAnchor;
  const fontFamily = normalizeFontFamily(text.baseFont ?? text.fontName);
  const fontWeight = text.isBold ? "700" : "400";
  const fontStyle = text.isItalic ? "italic" : "normal";

  const attrs: string[] = [
    `x="${formatSvgNumber(anchor.x)}"`,
    `y="${formatSvgNumber(anchor.y)}"`,
    `font-size="${formatSvgNumber(text.fontSize)}"`,
    `font-family="${escapeXmlAttr(fontFamily)}"`,
    `font-weight="${fontWeight}"`,
    `font-style="${fontStyle}"`,
    `dominant-baseline="${anchor.dominantBaseline}"`,
    'xml:space="preserve"',
  ];

  if (fillEnabled) {
    attrs.push(`fill="${fillPaint.color}"`);
    if (fillPaint.opacity < 1) {
      attrs.push(`fill-opacity="${formatSvgNumber(fillPaint.opacity)}"`);
    }
  } else {
    attrs.push('fill="none"');
  }

  if (strokeEnabled) {
    attrs.push(`stroke="${strokePaint.color}"`);
    attrs.push(`stroke-width="${formatSvgNumber(state.lineWidth)}"`);
    attrs.push(`stroke-linejoin="${toSvgLineJoin(state.lineJoin)}"`);
    if (strokePaint.opacity < 1) {
      attrs.push(`stroke-opacity="${formatSvgNumber(strokePaint.opacity)}"`);
    }
  } else {
    attrs.push('stroke="none"');
  }

  if (text.charSpacing !== undefined && text.charSpacing !== 0) {
    attrs.push(`letter-spacing="${formatSvgNumber(text.charSpacing)}"`);
  }

  if (verticalWriting) {
    attrs.push('writing-mode="vertical-rl"');
    attrs.push('text-orientation="upright"');
  }

  // textLength: enforce PDF-computed text width (SoT) on SVG rendering.
  // Without this, browser font metrics determine the rendered width independently,
  // causing divergence between the rendered text and cursor/selection positions
  // (which use text.width from the PDF parser as the single source of truth).
  if (text.width > 0 && text.text.length > 1) {
    attrs.push(`textLength="${formatSvgNumber(text.width)}"`);
    attrs.push('lengthAdjust="spacing"');
  }

  const textScale = normalizeTextScale(text);
  const transform = buildTextTransform(anchor, textScale);
  if (transform) {
    attrs.push(`transform="${transform}"`);
  }

  return `<text ${attrs.join(" ")}${clipPathRef}>${escapeXmlText(text.text)}</text>`;
}

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

function renderImage(image: PdfImage, pageHeight: number, registry: ClipPathRegistry): string {
  const clipPathRef = getClipPathReference(image.graphicsState.clipBBox, pageHeight, registry);
  const dataUrl = buildPdfImageDataUrl(image);
  const escapedDataUrl = escapeXmlAttr(dataUrl);
  const matrix = buildImageTransform(image.graphicsState.ctm, pageHeight);

  const imageMarkup = (
    `<image href="${escapedDataUrl}" xlink:href="${escapedDataUrl}" ` +
    `width="1" height="1" preserveAspectRatio="none" transform="matrix(${formatSvgMatrix(matrix)})" />`
  );

  // Chromium-based engines may drop raster rendering when clip-path and transform
  // are both attached to the same <image>. Apply clipping on a wrapper group instead.
  if (clipPathRef.length > 0) {
    return `<g${clipPathRef}>${imageMarkup}</g>`;
  }

  return imageMarkup;
}

/**
 * Render a single PDF element to SVG markup.
 * Exported for use by editor overlays (e.g., text edit preview).
 */
export function renderPdfElementToSvg(element: PdfElement, pageHeight: number): string {
  const registry = createClipPathRegistry();
  const content = renderElement(element, pageHeight, registry);
  const defs = registry.defs.length > 0 ? `<defs>${registry.defs.join("")}</defs>` : "";
  return defs + content;
}

function renderElement(element: PdfElement, pageHeight: number, registry: ClipPathRegistry): string {
  if (element.type === "path") {
    return renderPath(element, pageHeight, registry);
  }

  if (element.type === "text") {
    return renderText(element, pageHeight, registry);
  }

  return renderImage(element, pageHeight, registry);
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

/** Render a single `PdfPage` into standalone SVG markup. */
export function renderPdfPageToSvg(page: PdfPage, options: PdfSvgRenderOptions = {}): string {
  if (!page) {
    throw new Error("page is required");
  }

  const registry = createClipPathRegistry();
  const bodyParts: string[] = [];

  const backgroundColor = normalizeBackgroundColor(options);
  if (backgroundColor !== "none" && backgroundColor !== "transparent") {
    bodyParts.push(
      `<rect x="0" y="0" width="${formatSvgNumber(page.width)}" height="${formatSvgNumber(page.height)}" fill="${escapeXmlAttr(backgroundColor)}" />`,
    );
  }

  const excludeSet = options.excludeElementIndices;
  for (let i = 0; i < page.elements.length; i++) {
    if (excludeSet?.has(i)) { continue; }
    const rendered = renderElement(page.elements[i], page.height, registry);
    if (rendered.length > 0) {
      bodyParts.push(rendered);
    }
  }

  const defs = registry.defs.length > 0 ? `<defs>${registry.defs.join("")}</defs>` : "";
  const width = normalizeDimension(options.width ?? page.width);
  const height = normalizeDimension(options.height ?? page.height);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"` +
    ` viewBox="0 0 ${formatSvgNumber(page.width)} ${formatSvgNumber(page.height)}"` +
    ` width="${escapeXmlAttr(width)}" height="${escapeXmlAttr(height)}" preserveAspectRatio="${escapeXmlAttr(getPreserveAspectRatio(options))}">` +
    `${defs}${bodyParts.join("")}</svg>`;

  if (options.includeXmlDeclaration) {
    return `<?xml version="1.0" encoding="UTF-8"?>${svg}`;
  }

  return svg;
}

export function renderPdfDocumentToSvgs(document: PdfDocument, options: PdfSvgRenderOptions = {}): readonly string[] {
  if (!document) {
    throw new Error("document is required");
  }

  return document.pages.map((page) => renderPdfPageToSvg(page, options));
}

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
