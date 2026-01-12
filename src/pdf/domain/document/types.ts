/**
 * @file PDF document types
 *
 * Types for PDF document structure and import options.
 */

import type { Pixels } from "../../../ooxml/domain/units";
import type { PdfImage } from "../image";
import type { PdfPath } from "../path";
import type { PdfText } from "../text";

// =============================================================================
// Element Types
// =============================================================================

export type PdfElement = PdfPath | PdfText | PdfImage;

// =============================================================================
// Document Structure
// =============================================================================

export type PdfPage = {
  readonly pageNumber: number;
  readonly width: number;
  readonly height: number;
  readonly elements: readonly PdfElement[];
};

export type PdfDocument = {
  readonly pages: readonly PdfPage[];
  readonly metadata?: {
    readonly title?: string;
    readonly author?: string;
    readonly subject?: string;
  };
};

// =============================================================================
// Import Options
// =============================================================================

export type PdfImportOptions = {
  /** Pages to import (1-based). Default: all pages */
  readonly pages?: readonly number[];
  /** Scale factor for coordinate conversion. Default: 1 */
  readonly scale?: number;
  /** Target slide width in pixels */
  readonly slideWidth: Pixels;
  /** Target slide height in pixels */
  readonly slideHeight: Pixels;
  /** Extract text as editable text boxes. Default: true */
  readonly extractEditableText?: boolean;
  /** Minimum path complexity to import (filter noise). Default: 0 */
  readonly minPathComplexity?: number;
};

// =============================================================================
// Type Guards
// =============================================================================

export function isPdfPath(element: PdfElement): element is PdfPath {
  return element.type === "path";
}

export function isPdfText(element: PdfElement): element is PdfText {
  return element.type === "text";
}

export function isPdfImage(element: PdfElement): element is PdfImage {
  return element.type === "image";
}
