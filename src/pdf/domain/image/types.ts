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
  readonly width: number;
  readonly height: number;
  readonly colorSpace: PdfColorSpace;
  readonly bitsPerComponent: number;
  readonly graphicsState: PdfGraphicsState;
};
