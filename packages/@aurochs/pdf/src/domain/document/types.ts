/**
 * @file PDF document types
 *
 * Types for PDF document structure and import options.
 */

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

/**
 * Represents a parsed PDF page.
 *
 * ## Coordinate System
 *
 * PDF uses a coordinate system where:
 * - Origin is at the bottom-left corner
 * - X increases to the right
 * - Y increases upward
 * - Default unit is the "point" (1 point = 1/72 inch)
 *
 * @see PDF Reference 1.7, Section 4.2 (Coordinate Systems)
 */
export type PdfPage = {
  /**
   * 1-indexed page number.
   */
  readonly pageNumber: number;

  /**
   * Page width in PDF points (1 point = 1/72 inch).
   *
   * Common values:
   * - A4 portrait: 595.28 points (210mm)
   * - A4 landscape: 841.89 points (297mm)
   * - US Letter portrait: 612 points (8.5 inches)
   * - US Letter landscape: 792 points (11 inches)
   */
  readonly width: number;

  /**
   * Page height in PDF points (1 point = 1/72 inch).
   *
   * Common values:
   * - A4 portrait: 841.89 points (297mm)
   * - A4 landscape: 595.28 points (210mm)
   * - US Letter portrait: 792 points (11 inches)
   * - US Letter landscape: 612 points (8.5 inches)
   */
  readonly height: number;

  /**
   * Visual elements on this page (text, paths, images).
   */
  readonly elements: readonly PdfElement[];
};

/**
 * Embedded font data extracted from PDF.
 *
 * @see ISO 32000-1:2008 Section 9.9 (Embedded Font Programs)
 */
export type PdfEmbeddedFont = {
  /** Font family name (e.g., "Hiragino Sans") */
  readonly fontFamily: string;
  /** Font format */
  readonly format: "opentype" | "truetype" | "type1" | "cff";
  /** Raw font data */
  readonly data: Uint8Array;
  /** MIME type */
  readonly mimeType: string;
};

export type PdfDocument = {
  readonly pages: readonly PdfPage[];
  readonly metadata?: {
    readonly title?: string;
    readonly author?: string;
    readonly subject?: string;
  };
  /**
   * Embedded fonts extracted from PDF.
   * Only present if PDF contains embedded font programs.
   */
  readonly embeddedFonts?: readonly PdfEmbeddedFont[];
};

/**
 * PDF coordinate system unit conversions.
 *
 * PDF "user space" default unit is the point: 1 point = 1/72 inch.
 */
export const PDF_UNITS = {
  /**
   * Points per inch (PDF default unit).
   * 1 inch = 72 points.
   */
  POINTS_PER_INCH: 72,

  /**
   * Points per millimeter.
   * 1mm ≈ 2.8346 points.
   */
  POINTS_PER_MM: 72 / 25.4,

  /**
   * Convert PDF points to inches.
   */
  pointsToInches: (points: number): number => {
    if (!Number.isFinite(points)) {
      throw new Error("points must be a finite number");
    }
    return points / 72;
  },

  /**
   * Convert PDF points to millimeters.
   */
  pointsToMm: (points: number): number => {
    if (!Number.isFinite(points)) {
      throw new Error("points must be a finite number");
    }
    return points / (72 / 25.4);
  },

  /**
   * Convert inches to PDF points.
   */
  inchesToPoints: (inches: number): number => {
    if (!Number.isFinite(inches)) {
      throw new Error("inches must be a finite number");
    }
    return inches * 72;
  },

  /**
   * Convert millimeters to PDF points.
   */
  mmToPoints: (mm: number): number => {
    if (!Number.isFinite(mm)) {
      throw new Error("mm must be a finite number");
    }
    return mm * (72 / 25.4);
  },
} as const;

// =============================================================================
// Type Guards
// =============================================================================











/** Type guard for `PdfPath` elements. */
export function isPdfPath(element: PdfElement): element is PdfPath {
  return element.type === "path";
}











/** Type guard for `PdfText` elements. */
export function isPdfText(element: PdfElement): element is PdfText {
  return element.type === "text";
}











/** Type guard for `PdfImage` elements. */
export function isPdfImage(element: PdfElement): element is PdfImage {
  return element.type === "image";
}
