/**
 * @file PDF text types
 *
 * Types for PDF text elements.
 */

import type { PdfGraphicsState } from "../graphics-state";

// =============================================================================
// Text Element
// =============================================================================

export type PdfText = {
  readonly type: "text";
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fontName: string;
  readonly fontSize: number;
  readonly graphicsState: PdfGraphicsState;
};
