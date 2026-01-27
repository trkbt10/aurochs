/**
 * @file PDF text types
 *
 * Types for PDF text elements.
 *
 * ## Coordinate System (ISO 32000-1:2008, Section 8.3)
 *
 * PDF uses a bottom-left origin coordinate system:
 * - X-axis: increases to the right
 * - Y-axis: increases upward
 *
 * Text positioning in PDF involves:
 * 1. Text matrix (Tm operator) - positions text in user space
 * 2. CTM - transforms user space to page space
 * 3. Rendering matrix Trm = Tm × CTM determines final position
 *
 * ## Text Bounding Box Calculation
 *
 * The text bounding box is calculated from:
 * - Baseline position (from text matrix + CTM)
 * - Font metrics (ascender/descender in 1/1000 em units)
 * - Effective font size (fontSize × CTM scaling)
 *
 * ```
 * height = (ascender - descender) × fontSize / 1000
 * bottomEdge (y) = baseline + descender × fontSize / 1000
 * topEdge = baseline + ascender × fontSize / 1000 = y + height
 * ```
 *
 * @see ISO 32000-1:2008 Section 9.4 - Text Space Details
 */

import type { PdfGraphicsState } from "../graphics-state";
import type { CIDOrdering } from "../font";

// =============================================================================
// Text Element
// =============================================================================

export type PdfText = {
  readonly type: "text";
  readonly text: string;

  /**
   * X coordinate of the text's left edge in PDF points.
   *
   * @see ISO 32000-1:2008 Section 9.4.4 - Text Rendering
   */
  readonly x: number;

  /**
   * Y coordinate of the text's **bottom edge** in PDF points.
   *
   * This is NOT the baseline position. The relationship is:
   * ```
   * y = baseline + descender × fontSize / 1000
   * ```
   *
   * Where descender is negative (typically -200), so:
   * ```
   * y = baseline - 0.2 × fontSize  (for default descender)
   * ```
   *
   * To recover the baseline position:
   * ```
   * baseline = y - descender × fontSize / 1000
   *          = y + |descender| × fontSize / 1000
   * ```
   *
   * @see ISO 32000-1:2008 Section 9.4.4 - Text Rendering
   */
  readonly y: number;

  /**
   * Width of the text bounding box in PDF points.
   *
   * Calculated from glyph widths using:
   * ```
   * width = endX - startX
   * ```
   *
   * Where displacement per glyph is:
   * ```
   * tx = ((w0 - Tj/1000) × Tfs + Tc + Tw) × Th
   * ```
   *
   * - w0: glyph width in 1/1000 em units
   * - Tfs: font size
   * - Tc: character spacing
   * - Tw: word spacing (only for space char)
   * - Th: horizontal scaling / 100
   *
   * @see ISO 32000-1:2008 Section 9.4.4 - Text Positioning
   */
  readonly width: number;

  /**
   * Height of the text bounding box in PDF points.
   *
   * Calculated from font metrics:
   * ```
   * height = (ascender - descender) × fontSize / 1000
   * ```
   *
   * With default metrics (ascender=800, descender=-200):
   * ```
   * height = (800 - (-200)) × fontSize / 1000 = fontSize
   * ```
   *
   * @see ISO 32000-1:2008 Section 9.8 - Font Descriptors
   */
  readonly height: number;
  /**
   * Font resource identifier (e.g., "F1", "F2").
   * This is the PDF internal name used in content stream operators.
   */
  readonly fontName: string;
  /**
   * Actual font name from BaseFont entry (e.g., "CIDFont+F1", "Helvetica").
   * This is the real font name for rendering, not the resource identifier.
   * Used for @font-face matching when embedded fonts are present.
   *
   * @see ISO 32000-1:2008 Section 9.6 - Simple Fonts
   */
  readonly baseFont?: string;
  /**
   * Font size in PDF points (1 point = 1/72 inch).
   */
  readonly fontSize: number;
  readonly graphicsState: PdfGraphicsState;

  // =============================================================================
  // Spacing Properties (from PDF text state operators)
  // =============================================================================

  /**
   * Character spacing in PDF points (Tc operator).
   * Added to each character's displacement after glyph width.
   * @see PDF Reference 9.3.2
   */
  readonly charSpacing?: number;

  /**
   * Word spacing in PDF points (Tw operator).
   * Added to space character (0x20) displacement only.
   * @see PDF Reference 9.3.3
   */
  readonly wordSpacing?: number;

  /**
   * Horizontal scaling as percentage (Tz operator).
   * Default: 100 (no scaling).
   * @see PDF Reference 9.3.4
   */
  readonly horizontalScaling?: number;

  // =============================================================================
  // Font Metrics (for precise positioning)
  // =============================================================================

  /**
   * Font metrics for precise baseline/positioning calculations.
   * If undefined, default values (ascender: 800, descender: -200) are used.
   */
  readonly fontMetrics?: PdfTextFontMetrics;

  // =============================================================================
  // Font Style (from FontDescriptor or font name)
  // =============================================================================

  /**
   * Whether font is bold.
   * Detected from FontDescriptor Flags (ForceBold) or font name.
   */
  readonly isBold?: boolean;

  /**
   * Whether font is italic/oblique.
   * Detected from FontDescriptor Flags (Italic) or font name.
   */
  readonly isItalic?: boolean;

  // =============================================================================
  // CID Font Information (ISO 32000-1:2008 Section 9.7)
  // =============================================================================

  /**
   * CID ordering from CIDSystemInfo dictionary.
   * Identifies the character collection for CID fonts.
   *
   * Values:
   * - Japan1: Adobe-Japan1 (Japanese)
   * - GB1: Adobe-GB1 (Simplified Chinese)
   * - CNS1: Adobe-CNS1 (Traditional Chinese)
   * - Korea1: Adobe-Korea1 (Korean)
   *
   * Used for accurate script type detection in PPTX conversion.
   *
   * @see ISO 32000-1:2008 Section 9.7.3 - CIDSystemInfo Dictionaries
   */
  readonly cidOrdering?: CIDOrdering;
};

/**
 * Font metrics for precise text positioning.
 */
export type PdfTextFontMetrics = {
  /**
   * Font ascender in 1/1000 em units.
   * Height above the baseline (positive value).
   * Typical range: 700-900
   */
  readonly ascender: number;

  /**
   * Font descender in 1/1000 em units.
   * Depth below the baseline (negative value).
   * Typical range: -200 to -300
   */
  readonly descender: number;
};
