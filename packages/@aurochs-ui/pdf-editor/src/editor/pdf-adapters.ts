/**
 * @file PDF element adapters
 *
 * Shared adapters for converting between PDF element properties and
 * editor UI data types. Used by PdfPropertyPanel, PdfMultiSelectPanel,
 * and PdfEditor. SoT for PDF color conversion and text formatting.
 */

import type { PdfElement } from "@aurochs/pdf";
import type { TextFormatting, TextFormattingFeatures } from "@aurochs-ui/editor-controls/text";
import type { PositionData, SizeData } from "@aurochs-ui/editor-core/adapter-types";

// =============================================================================
// Color conversion (SoT — used by pdf-surface-adapters.ts and panels)
// =============================================================================

/** Convert 0-1 float to 2-digit hex. */
export function floatToHex(v: number): string {
  return Math.round(v * 255).toString(16).padStart(2, "0");
}

/** Parse hex color (#RRGGBB) to RGB components in 0-1 range. */
export function hexToRgbComponents(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

/** Convert PDF color spec to hex string. */
export function pdfColorToHex(color: { readonly colorSpace: string; readonly components: readonly number[] }): string {
  if (color.colorSpace === "DeviceRGB" && color.components.length >= 3) {
    return `#${floatToHex(color.components[0])}${floatToHex(color.components[1])}${floatToHex(color.components[2])}`;
  }
  if (color.colorSpace === "DeviceGray" && color.components.length >= 1) {
    const v = floatToHex(color.components[0]);
    return `#${v}${v}${v}`;
  }
  return "#000000";
}

// =============================================================================
// Fill/stroke color adapters
// =============================================================================

/** Convert PDF element fill to hex. */
export function pdfFillToHex(element: PdfElement): string {
  return pdfColorToHex(element.graphicsState.fillColor);
}

/** Convert PDF element stroke to hex. */
export function pdfStrokeToHex(element: PdfElement): string {
  return pdfColorToHex(element.graphicsState.strokeColor);
}

// =============================================================================
// Text formatting adapter (SoT for PDF text → TextFormatting conversion)
// =============================================================================

/** PDF text formatting features (what's editable for PDF text). */
export const PDF_TEXT_FEATURES: TextFormattingFeatures = {
  showFontFamily: true,
  showFontSize: true,
  showBold: true,
  showItalic: true,
  showUnderline: false,
  showStrikethrough: false,
  showTextColor: true,
  showHighlight: false,
  showSuperSubscript: false,
};

/** Convert PDF element to TextFormatting (for TextFormattingEditor). */
export function pdfTextToFormatting(element: PdfElement): TextFormatting {
  if (element.type !== "text") { return {}; }
  return {
    fontFamily: element.baseFont ?? element.fontName ?? "",
    fontSize: element.fontSize,
    bold: element.isBold ?? false,
    italic: element.isItalic ?? false,
    textColor: pdfFillToHex(element),
  };
}

/** Apply TextFormatting update to a PDF element. */
export function applyTextFormattingToPdfElement(element: PdfElement, update: Partial<TextFormatting>): PdfElement {
  if (element.type !== "text") { return element; }
  // eslint-disable-next-line no-restricted-syntax -- accumulator updated per property
  let updated = element;
  if (update.bold !== undefined) { updated = { ...updated, isBold: update.bold || undefined }; }
  if (update.italic !== undefined) { updated = { ...updated, isItalic: update.italic || undefined }; }
  if (update.fontSize !== undefined && update.fontSize > 0) { updated = { ...updated, fontSize: update.fontSize }; }
  if (update.fontFamily !== undefined) { updated = { ...updated, baseFont: update.fontFamily, fontName: update.fontFamily }; }
  if (update.textColor !== undefined) {
    const [r, g, b] = hexToRgbComponents(update.textColor);
    updated = { ...updated, graphicsState: { ...updated.graphicsState, fillColor: { colorSpace: "DeviceRGB" as const, components: [r, g, b] } } };
  }
  return updated;
}

// =============================================================================
// Position/Size adapter
// =============================================================================

/** Combined position and size data. */
export type PositionSizeData = PositionData & SizeData;

/** Convert PDF element to position/size data. */
export function pdfElementToPositionSize(element: PdfElement, pageHeight: number): PositionSizeData {
  if (element.type === "text") {
    return {
      x: `${element.x.toFixed(1)} pt`,
      y: `${(pageHeight - element.y - element.height).toFixed(1)} pt`,
      width: `${element.width.toFixed(1)} pt`,
      height: `${element.height.toFixed(1)} pt`,
    };
  }
  return { x: "0 pt", y: "0 pt", width: "0 pt", height: "0 pt" };
}
