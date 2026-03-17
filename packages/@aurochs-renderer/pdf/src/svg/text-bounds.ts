/**
 * @file Text element SVG bounds computation
 *
 * SoT for computing the SVG-space bounding box of a PdfText element.
 * Used by BOTH:
 * - The SVG renderer (render-page-svg.ts) for text positioning
 * - The PDF editor (elementToSvgBounds) for selection rectangles
 *
 * This ensures selection rectangles ALWAYS align with rendered text,
 * because both paths use the same computation.
 */

import type { PdfText, PdfTextFontMetrics } from "@aurochs/pdf/domain";
import { DEFAULT_FONT_METRICS } from "@aurochs/pdf/domain/font";

// =============================================================================
// Font Metrics Resolution (SoT)
// =============================================================================

/**
 * Resolve effective ascender/descender for a PdfText element.
 * Uses element's fontMetrics if available, falls back to DEFAULT_FONT_METRICS.
 *
 * SoT for "given a PdfText, what ascender/descender to use".
 * Used by:
 * - text-bounds.ts (bounds computation)
 * - TextEditInputFrame (cursor/selection positioning)
 * - pdf-document-builder.ts (text run bounds)
 */
export function resolveTextFontMetrics(text: PdfText): { ascender: number; descender: number } {
  return {
    ascender: text.fontMetrics?.ascender ?? DEFAULT_FONT_METRICS.ascender,
    descender: text.fontMetrics?.descender ?? DEFAULT_FONT_METRICS.descender,
  };
}

// =============================================================================
// Types
// =============================================================================

/** SVG-space bounding box for a text element, including rotation. */
export type TextSvgBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Rotation in degrees (from baseline direction, 0 = horizontal LTR). */
  readonly rotation: number;
};

/** Text anchor resolved for SVG rendering. */
export type TextAnchor = {
  readonly x: number;
  readonly y: number;
  readonly dominantBaseline: "alphabetic" | "text-before-edge";
  readonly angleDeg: number;
  readonly fromBaseline: boolean;
};

// =============================================================================
// Text Anchor Resolution (SoT — used by both renderer and editor)
// =============================================================================

/**
 * Resolve the SVG anchor point and rotation for a PdfText element.
 *
 * Two paths:
 * 1. Baseline data available → anchor at baseline start, alphabetic baseline, with rotation
 * 2. Fallback → anchor at bounding box top-left, text-before-edge, no rotation
 *
 * This is the SoT for text positioning in SVG space. Both the SVG renderer
 * and the editor's selection bounds must use this function.
 */
export function resolveTextAnchor(text: PdfText, pageHeight: number): TextAnchor {
  const baselineAnchor = resolveBaselineAnchor(text, pageHeight);
  if (baselineAnchor) {
    return {
      x: baselineAnchor.x,
      y: baselineAnchor.y,
      dominantBaseline: "alphabetic",
      angleDeg: baselineAnchor.angleDeg,
      fromBaseline: true,
    };
  }

  return {
    x: text.x,
    y: pageHeight - (text.y + text.height),
    dominantBaseline: "text-before-edge",
    angleDeg: 0,
    fromBaseline: false,
  };
}

/**
 * Compute the SVG-space bounding box of a PdfText element.
 *
 * Uses baseline data + font metrics when available for precise bounds.
 * Falls back to the stored x/y/width/height with coordinate flip.
 */
export function computeTextSvgBounds(text: PdfText, pageHeight: number): TextSvgBounds {
  const startX = text.baselineStartX;
  const startY = text.baselineStartY;
  const endX = text.baselineEndX;
  const endY = text.baselineEndY;

  const hasBaseline =
    startX !== undefined && startY !== undefined &&
    endX !== undefined && endY !== undefined &&
    Number.isFinite(startX) && Number.isFinite(startY) &&
    Number.isFinite(endX) && Number.isFinite(endY);

  if (hasBaseline) {
    const { ascender, descender } = resolveTextFontMetrics(text);
    const ascPx = (ascender * text.fontSize) / 1000;
    const descPx = (descender * text.fontSize) / 1000; // negative

    const dx = endX! - startX!;
    const dy = endY! - startY!;
    const baselineLen = Math.hypot(dx, dy);

    if (baselineLen > 1e-6) {
      // Unit vectors: u = baseline direction, n = perpendicular (upward in PDF space)
      const ux = dx / baselineLen;
      const uy = dy / baselineLen;
      const nx = -uy;
      const ny = ux;

      // Four corners in PDF space (bottom-left origin)
      const c0x = startX! + nx * descPx;
      const c0y = startY! + ny * descPx;
      const c1x = endX! + nx * descPx;
      const c1y = endY! + ny * descPx;
      const c2x = startX! + nx * ascPx;
      const c2y = startY! + ny * ascPx;
      const c3x = endX! + nx * ascPx;
      const c3y = endY! + ny * ascPx;

      const minX = Math.min(c0x, c1x, c2x, c3x);
      const maxX = Math.max(c0x, c1x, c2x, c3x);
      const minY = Math.min(c0y, c1y, c2y, c3y);
      const maxY = Math.max(c0y, c1y, c2y, c3y);

      // Rotation: angle of baseline direction (PDF → SVG: negate Y)
      const angleDeg = (Math.atan2(-dy, dx) * 180) / Math.PI;
      const rotation = Math.abs(angleDeg) < 0.01 || Math.abs(angleDeg - 360) < 0.01 ? 0 : angleDeg;

      return {
        x: minX,
        y: pageHeight - maxY,
        width: maxX - minX,
        height: maxY - minY,
        rotation,
      };
    }
  }

  // Fallback: use stored bounds (matches text-before-edge path)
  return {
    x: text.x,
    y: pageHeight - text.y - text.height,
    width: text.width,
    height: text.height,
    rotation: 0,
  };
}

// =============================================================================
// Internal
// =============================================================================

function resolveBaselineAnchor(
  text: PdfText,
  pageHeight: number,
): { x: number; y: number; angleDeg: number } | null {
  const startX = text.baselineStartX;
  const startY = text.baselineStartY;
  const endX = text.baselineEndX;
  const endY = text.baselineEndY;

  if (
    startX === undefined || startY === undefined ||
    endX === undefined || endY === undefined ||
    !Number.isFinite(startX) || !Number.isFinite(startY) ||
    !Number.isFinite(endX) || !Number.isFinite(endY)
  ) {
    return null;
  }

  const dx = endX - startX;
  const dy = endY - startY;
  const baselineLength = Math.hypot(dx, dy);
  if (!Number.isFinite(baselineLength) || baselineLength <= 1e-6) {
    return null;
  }

  const angleDeg = (Math.atan2(-dy, dx) * 180) / Math.PI;
  return { x: startX, y: pageHeight - startY, angleDeg };
}
