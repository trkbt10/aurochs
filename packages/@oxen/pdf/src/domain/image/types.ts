/**
 * @file PDF image types
 *
 * Types for PDF image elements.
 */

import type { PdfColorSpace } from "../color";
import type { PdfGraphicsState } from "../graphics-state";

// =============================================================================
// Image Element
// =============================================================================

export type PdfImage = {
  readonly type: "image";
  readonly data: Uint8Array;
  /**
   * Optional `/Decode` array (2 entries per component).
   *
   * Applied after unpacking to the 0..1 component domain (then re-quantized to 0..255),
   * typically used for inversion (e.g., `[1 0]` for grayscale).
   */
  readonly decode?: readonly number[];
  /**
   * Optional 8-bit alpha channel per pixel (soft mask).
   *
   * Length must be `width * height` when present.
   * 0 = transparent, 255 = opaque.
   */
  readonly alpha?: Uint8Array;
  /**
   * Optional `/Matte` color from an `/SMask` dictionary.
   *
   * Values are normalized component values (0..1 range) in the image's base color space.
   * When present alongside `alpha`, this can be used to "un-matte" the RGB channels
   * before applying the alpha mask, preventing halo/fringe artifacts.
   */
  readonly softMaskMatte?: readonly number[];
  /**
   * Image pixel width (sample columns).
   *
   * Note: The rendered size/placement on the page is determined by the current
   * transformation matrix (`graphicsState.ctm`) in PDF points.
   */
  readonly width: number;
  /**
   * Image pixel height (sample rows).
   *
   * Note: The rendered size/placement on the page is determined by the current
   * transformation matrix (`graphicsState.ctm`) in PDF points.
   */
  readonly height: number;
  readonly colorSpace: PdfColorSpace;
  readonly bitsPerComponent: number;
  readonly graphicsState: PdfGraphicsState;
};
