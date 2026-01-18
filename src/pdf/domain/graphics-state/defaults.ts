/**
 * @file PDF graphics state defaults
 *
 * Default values and factory functions for graphics state.
 */

import { IDENTITY_MATRIX } from "../coordinate";
import type { PdfColor } from "../color";
import type { PdfGraphicsState } from "./types";

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
