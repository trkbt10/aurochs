/**
 * @file PDF document types
 *
 * Types for PDF document structure and import options.
 */

import type { PdfImage } from "../image";
import type { PdfPath } from "../path";
import type { PdfText } from "../text";
import type { CIDOrdering } from "../font";
import type { PdfGraphicsState } from "../graphics-state/types";

// =============================================================================
// Element Types
// =============================================================================

export type PdfElement = PdfPath | PdfText | PdfImage | PdfTable;

// =============================================================================
// Table Types (synthetic — not native to PDF format)
// =============================================================================

/** Table cell in a PDF table. */
export type PdfTableCell = {
  readonly text: string;
  readonly colSpan?: number;
  readonly rowSpan?: number;
  readonly backgroundColor?: string;
  readonly verticalAlignment?: "top" | "center" | "bottom";
};

/** Table row in a PDF table. */
export type PdfTableRow = {
  readonly height: number;
  readonly cells: readonly PdfTableCell[];
};

/**
 * Synthetic table element for the PDF editor.
 *
 * Unlike PdfText/PdfPath/PdfImage, tables are not parsed from PDF content streams.
 * They are created in the editor and rendered as SVG.
 */
export type PdfTable = {
  readonly type: "table";
  readonly x: number;
  readonly y: number;
  readonly columns: readonly { readonly width: number }[];
  readonly rows: readonly PdfTableRow[];
  readonly borderWidth?: number;
  readonly borderColor?: string;
  readonly graphicsState: PdfGraphicsState;
};

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
 * ToUnicode mapping data for round-trip preservation.
 * Used to reconstruct ToUnicode CMap when writing PDF.
 */
export type PdfFontToUnicode = {
  /** Source bytes (hex) → Unicode string mapping. Key is uppercase hex (e.g., "8140" → "ア"). */
  readonly byteMapping: ReadonlyMap<string, string>;
  /** Source code byte lengths from codespace ranges (descending order). */
  readonly sourceCodeByteLengths: readonly number[];
};

/**
 * Font metrics for PDF writing.
 */
export type PdfFontMetrics = {
  /** Ascender height in 1/1000 em units */
  readonly ascender: number;
  /** Descender depth in 1/1000 em units (negative) */
  readonly descender: number;
  /** Glyph widths: character code → width in 1/1000 em units */
  readonly widths: ReadonlyMap<number, number>;
  /** Default glyph width when not found in widths */
  readonly defaultWidth: number;
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
  /** Original BaseFont name from PDF (e.g., "/ZRDQJE+Hiragino-Sans"). Includes subset prefix. */
  readonly baseFontName?: string;
  /** ToUnicode CMap information for round-trip preservation. */
  readonly toUnicode?: PdfFontToUnicode;
  /** Font metrics for accurate text layout. */
  readonly metrics?: PdfFontMetrics;
  /** CID ordering (Japan1, GB1, CNS1, Korea1, Identity). */
  readonly ordering?: CIDOrdering;
  /** Number of bytes per character code (1 for single-byte, 2 for CID fonts). */
  readonly codeByteWidth?: 1 | 2;
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
/**
 * Standard PDF page sizes in points.
 */
export const PDF_PAGE_SIZES = {
  /** US Letter portrait: 8.5 × 11 inches */
  US_LETTER: { width: 612, height: 792 },
  /** A4 portrait: 210 × 297 mm */
  A4: { width: 595.28, height: 841.89 },
} as const;

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

/** Type guard for `PdfTable` elements. */
export function isPdfTable(element: PdfElement): element is PdfTable {
  return element.type === "table";
}
