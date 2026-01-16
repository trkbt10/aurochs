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
   * Optional 8-bit alpha channel per pixel (soft mask).
   *
   * Length must be `width * height` when present.
   * 0 = transparent, 255 = opaque.
   */
  readonly alpha?: Uint8Array;
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
