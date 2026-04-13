/**
 * @file PDF graphics state defaults
 *
 * Default values and factory functions for graphics state.
 */

import { IDENTITY_MATRIX } from "../coordinate";
import type { PdfColor } from "../color";
import type { PdfGraphicsState } from "./types";

// =============================================================================
// Color Resolution
// =============================================================================

function resolvePatternColor(color: PdfColor, patternColor: PdfColor | undefined): PdfColor {
  return color.colorSpace === "Pattern" && patternColor ? patternColor : color;
}

/**
 * Resolve Pattern color space references in a graphics state to device colors.
 *
 * When a fill or stroke uses a Pattern color space, the `fillColor`/`strokeColor`
 * fields contain `{ colorSpace: "Pattern", components: [] }` which carries no
 * usable color information. The actual base color (for PaintType 2 uncolored
 * tiling patterns) is stored in `fillPatternColor`/`strokePatternColor`.
 *
 * This function produces a graphics state where `fillColor`/`strokeColor` are
 * always device-space colors that renderers and converters can use directly
 * without additional dispatch.
 *
 * Pattern fills are normally rasterized to PdfImage at parse time. This
 * resolution is for the residual case where a pattern path was not rasterized
 * (e.g. rasterization failed or the source PDF uses a pattern only for color).
 */
export function resolvePatternColors(gs: PdfGraphicsState): PdfGraphicsState {
  const fillColor = resolvePatternColor(gs.fillColor, gs.fillPatternColor);
  const strokeColor = resolvePatternColor(gs.strokeColor, gs.strokePatternColor);
  if (fillColor === gs.fillColor && strokeColor === gs.strokeColor) {
    return gs;
  }
  return { ...gs, fillColor, strokeColor };
}

// =============================================================================
// Default Colors
// =============================================================================

export const DEFAULT_FILL_COLOR: PdfColor = {
  colorSpace: "DeviceGray",
  components: [0], // black
};

export const DEFAULT_STROKE_COLOR: PdfColor = {
  colorSpace: "DeviceGray",
  components: [0], // black
};

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create default graphics state with PDF Reference 9.3 defaults
 */
export function createDefaultGraphicsState(): PdfGraphicsState {
  return {
    ctm: IDENTITY_MATRIX,
    clipBBox: undefined,
    clipMask: undefined,
    blendMode: "Normal",
    softMaskAlpha: 1,
    softMask: undefined,
    fillPatternName: undefined,
    strokePatternName: undefined,
    fillPatternUnderlyingColorSpace: undefined,
    strokePatternUnderlyingColorSpace: undefined,
    fillPatternColor: undefined,
    strokePatternColor: undefined,
    fillColorSpaceName: undefined,
    strokeColorSpaceName: undefined,
    fillColor: DEFAULT_FILL_COLOR,
    strokeColor: DEFAULT_STROKE_COLOR,
    lineWidth: 1,
    lineJoin: 0,
    lineCap: 0,
    miterLimit: 10,
    dashArray: [],
    dashPhase: 0,
    fillAlpha: 1,
    strokeAlpha: 1,
    // Text state defaults (PDF Reference 9.3, Table 104)
    charSpacing: 0,
    wordSpacing: 0,
    horizontalScaling: 100,
    textLeading: 0,
    textRenderingMode: 0,
    textRise: 0,
  };
}
