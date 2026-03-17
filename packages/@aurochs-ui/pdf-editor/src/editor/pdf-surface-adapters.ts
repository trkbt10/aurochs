/**
 * @file PDF surface adapters for editor-controls FillFormattingEditor / OutlineFormattingEditor
 *
 * Converts between PDF graphics state and generic FillFormatting / OutlineFormatting types.
 * Color conversions use the shared SoT functions from pdf-adapters.ts.
 */

import type { PdfElement } from "@aurochs/pdf";
import type { FormattingAdapter } from "@aurochs-ui/editor-controls/formatting-adapter";
import type { FillFormatting, OutlineFormatting } from "@aurochs-ui/editor-controls/surface";
import { pdfColorToHex, hexToRgbComponents } from "./pdf-adapters";

type GraphicsState = PdfElement["graphicsState"];

// =============================================================================
// Fill Adapter
// =============================================================================

/** Convert PDF graphics state fill to generic FillFormatting. */
export function pdfFillToFormatting(gs: GraphicsState): FillFormatting {
  return { type: "solid", color: pdfColorToHex(gs.fillColor) };
}

/** Apply FillFormatting change back to graphics state. */
export function applyFillToGraphicsState(gs: GraphicsState, fill: Partial<FillFormatting>): GraphicsState {
  if (fill.type === "none") {
    return { ...gs, fillAlpha: 0 };
  }
  if (fill.type === "solid" && "color" in fill && fill.color) {
    const [r, g, b] = hexToRgbComponents(fill.color);
    return {
      ...gs,
      fillColor: { colorSpace: "DeviceRGB" as const, components: [r, g, b] },
      fillAlpha: 1,
    };
  }
  return gs;
}

/** FormattingAdapter for PDF fill. */
export const pdfFillAdapter: FormattingAdapter<GraphicsState, FillFormatting> = {
  toGeneric: pdfFillToFormatting,
  applyUpdate: applyFillToGraphicsState,
};

// =============================================================================
// Outline/Stroke Adapter
// =============================================================================

/** Convert PDF graphics state stroke to generic OutlineFormatting. */
export function pdfStrokeToFormatting(gs: GraphicsState): OutlineFormatting {
  return {
    width: gs.lineWidth ?? 1,
    color: pdfColorToHex(gs.strokeColor),
    style: "solid",
  };
}

/** Apply OutlineFormatting change back to graphics state. */
export function applyStrokeToGraphicsState(gs: GraphicsState, outline: Partial<OutlineFormatting>): GraphicsState {
  const result = { ...gs };
  if ("color" in outline && outline.color) {
    const [r, g, b] = hexToRgbComponents(outline.color);
    result.strokeColor = { colorSpace: "DeviceRGB" as const, components: [r, g, b] };
  }
  if ("width" in outline && outline.width !== undefined) {
    result.lineWidth = outline.width;
  }
  if ("style" in outline && outline.style === "none") {
    result.strokeAlpha = 0;
  }
  return result;
}

/** FormattingAdapter for PDF stroke. */
export const pdfOutlineAdapter: FormattingAdapter<GraphicsState, OutlineFormatting> = {
  toGeneric: pdfStrokeToFormatting,
  applyUpdate: applyStrokeToGraphicsState,
};
