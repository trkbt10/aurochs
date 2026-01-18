/**
 * @file Common text layout type definitions
 *
 * Shared types for text measurement and layout results.
 * Used by both PPTX and DOCX editors for unified text layout.
 *
 * This abstraction layer normalizes:
 * - PPTX DrawingML (DML) text structure
 * - DOCX WordprocessingML (WML) paragraph/run structure
 *
 * @see ECMA-376 Part 1, DrawingML Text (for PPTX)
 * @see ECMA-376 Part 1, WordprocessingML (for DOCX)
 */

import type { Pixels, Points, Percent } from "../ooxml/domain/units";
import type { WritingMode as WritingModeType } from "./writing-mode";

// Re-export writing mode types for convenience
export type {
  WritingMode,
  DirectionalCoords,
  DirectionalSize,
  DirectionalBounds,
  PhysicalCoords,
  PhysicalSize,
  PhysicalBounds,
} from "./writing-mode";

// Local alias for internal use
type WritingMode = WritingModeType;

export {
  textDirectionToWritingMode,
  toDirectional,
  fromDirectional,
  toDirectionalSize,
  fromDirectionalSize,
  toDirectionalBounds,
  fromDirectionalBounds,
  isHorizontal,
  isVertical,
  getCssWritingMode,
} from "./writing-mode";

// =============================================================================
// Text Alignment Types
// =============================================================================

/**
 * Horizontal text alignment.
 * Unified alignment type for both PPTX and DOCX.
 */
export type TextAlign =
  | "left"
  | "center"
  | "right"
  | "justify"
  | "justifyLow"
  | "distributed"
  | "thaiDistributed";

/**
 * Vertical text anchor.
 */
export type TextAnchor = "top" | "center" | "bottom";

// =============================================================================
// Line Spacing Configuration
// =============================================================================

/**
 * Line spacing configuration.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.5 (a:lnSpc)
 * @see ECMA-376-1:2016 Section 17.3.1.33 (spacing - lineRule)
 */
export type LineSpacing =
  | { readonly type: "percent"; readonly value: Percent }
  | { readonly type: "points"; readonly value: Points }
  | { readonly type: "atLeast"; readonly value: Points };

// =============================================================================
// Text Span Types
// =============================================================================

/**
 * Text fill configuration.
 */
export type TextFillConfig =
  | { readonly type: "solid"; readonly color: string }
  | { readonly type: "gradient"; readonly stops: readonly { position: number; color: string }[] };

/**
 * Text outline (stroke) configuration.
 */
export type TextOutlineConfig = {
  readonly width: Pixels;
  readonly color: string;
  readonly cap: "butt" | "round" | "square";
  readonly join: "miter" | "round" | "bevel";
};

/**
 * Resolved text span for layout.
 * All values are resolved from source run properties + defaults.
 */
export type LayoutSpan = {
  /** Text content */
  readonly text: string;
  /** Font size in points */
  readonly fontSize: Points;
  /** Font family name (Latin font) */
  readonly fontFamily: string;
  /** East Asian font family for CJK characters */
  readonly fontFamilyEastAsian: string | undefined;
  /** Complex Script font family for RTL/complex script characters */
  readonly fontFamilyComplexScript: string | undefined;
  /** Font weight (bold: 700, normal: 400) */
  readonly fontWeight: number;
  /** Font style (normal/italic) */
  readonly fontStyle: "normal" | "italic";
  /** Text decoration (underline, line-through) */
  readonly textDecoration: string | undefined;
  /** Text color as hex (with #) */
  readonly color: string;
  /** Vertical alignment (baseline/superscript/subscript) */
  readonly verticalAlign: "baseline" | "superscript" | "subscript";
  /** Letter spacing in pixels */
  readonly letterSpacing: Pixels;
  /**
   * Break type for this span.
   * - "none": No break
   * - "page": Page break (w:br type="page")
   * - "column": Column break (w:br type="column")
   * - "line": Line break (w:br without type, or type="textWrapping")
   *
   * @see ECMA-376-1:2016 Section 17.3.3.1 (br)
   */
  readonly breakType: "none" | "page" | "column" | "line";
  /** Text direction */
  readonly direction: "ltr" | "rtl";
  /** Highlight/background color as hex (with #) */
  readonly highlightColor: string | undefined;
  /** Text transform (uppercase, etc.) */
  readonly textTransform: "none" | "uppercase" | "lowercase" | undefined;
  /** Hyperlink URL or ID */
  readonly linkId: string | undefined;
  /** Hyperlink tooltip */
  readonly linkTooltip: string | undefined;
  /** Text outline (stroke) configuration */
  readonly textOutline: TextOutlineConfig | undefined;
  /** Text fill configuration */
  readonly textFill: TextFillConfig | undefined;
  /** Kerning threshold in points */
  readonly kerning: Points | undefined;
  /**
   * Inline image configuration.
   * When set, this span represents an inline image rather than text.
   * The text property should be empty or a placeholder for accessibility.
   *
   * @see ECMA-376 Part 1, Section 20.4.2.8 (inline)
   */
  readonly inlineImage?: InlineImageConfig;
};

/**
 * Inline image configuration.
 *
 * @see ECMA-376 Part 1, Section 20.4.2.8 (inline)
 * @see ECMA-376 Part 1, Section 20.2 (DrawingML - Picture)
 */
export type InlineImageConfig = {
  /** Image source URL (data URL or resource URL) */
  readonly src: string;
  /** Image width in pixels */
  readonly width: Pixels;
  /** Image height in pixels */
  readonly height: Pixels;
  /** Alt text for accessibility */
  readonly alt: string | undefined;
  /** Title for tooltip */
  readonly title: string | undefined;
  /** Relationship ID for resource resolution */
  readonly relationshipId: string | undefined;
};

/**
 * Measured span with computed width.
 */
export type MeasuredSpan = LayoutSpan & {
  /** Computed width in pixels */
  readonly width: Pixels;
};

/**
 * A positioned span within a line.
 */
export type PositionedSpan = MeasuredSpan & {
  /** X offset within the line (for kerning adjustments) */
  readonly dx: Pixels;
};

// =============================================================================
// Bullet Configuration
// =============================================================================

/**
 * Bullet configuration for a paragraph.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.4 (Bullet properties)
 */
export type BulletConfig = {
  /** Bullet character (for character/auto-number bullets) */
  readonly char: string;
  /** Bullet font size in points */
  readonly fontSize: Points;
  /** Bullet color as hex (with #) */
  readonly color: string;
  /** Bullet font family */
  readonly fontFamily: string;
  /** Picture bullet image URL (data URL) */
  readonly imageUrl?: string;
};

// =============================================================================
// Tab Stop Configuration
// =============================================================================

/**
 * Tab stop configuration for layout.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.14 (a:tab)
 */
export type LayoutTabStop = {
  /** Position from left edge in pixels */
  readonly position: Pixels;
  /** Tab alignment type */
  readonly alignment: "left" | "center" | "right" | "decimal";
};

// =============================================================================
// Font Alignment
// =============================================================================

/**
 * Font alignment for vertical positioning of different font sizes.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.12 (ST_TextFontAlignType)
 */
export type FontAlignment = "auto" | "top" | "center" | "base" | "bottom";

// =============================================================================
// Paragraph Input Types
// =============================================================================

/**
 * Paragraph input for layout.
 */
export type LayoutParagraphInput = {
  /** Text spans in the paragraph */
  readonly spans: readonly LayoutSpan[];
  /** Horizontal alignment */
  readonly alignment: TextAlign;
  /** Left margin in pixels */
  readonly marginLeft: Pixels;
  /** First-line indent in pixels (can be negative for hanging) */
  readonly indent: Pixels;
  /** Right margin in pixels */
  readonly marginRight: Pixels;
  /** Space before paragraph in points */
  readonly spaceBefore: Points;
  /** Space after paragraph in points */
  readonly spaceAfter: Points;
  /** Line spacing configuration */
  readonly lineSpacing: LineSpacing | undefined;
  /** Bullet configuration if any */
  readonly bullet: BulletConfig | undefined;
  /** Font alignment for vertical positioning */
  readonly fontAlignment: FontAlignment;
  /** Default tab size in pixels */
  readonly defaultTabSize: Pixels;
  /** Custom tab stops */
  readonly tabStops: readonly LayoutTabStop[];
  /** East Asian line break rules */
  readonly eaLineBreak: boolean;
  /** Latin line break rules */
  readonly latinLineBreak: boolean;
  /** Hanging punctuation */
  readonly hangingPunctuation: boolean;
  /** Font size for empty paragraphs */
  readonly endParaFontSize?: Points;
};

// =============================================================================
// Layout Result Types
// =============================================================================

/**
 * A single laid out line.
 */
export type LayoutLine = {
  /** Positioned spans in this line */
  readonly spans: readonly PositionedSpan[];
  /** X position of the line start in pixels */
  readonly x: Pixels;
  /** Y position (baseline) of the line in pixels */
  readonly y: Pixels;
  /** Total width of the line in pixels */
  readonly width: Pixels;
  /** Height of the line in pixels */
  readonly height: Pixels;
  /**
   * Page break after this line.
   * Set when the line ends with w:br type="page".
   *
   * @see ECMA-376-1:2016 Section 17.3.3.1 (br)
   */
  readonly pageBreakAfter?: boolean;
};

/**
 * A laid out paragraph.
 */
export type LayoutParagraphResult = {
  /** Lines in this paragraph */
  readonly lines: readonly LayoutLine[];
  /** Horizontal alignment */
  readonly alignment: TextAlign;
  /** Bullet character if any */
  readonly bullet: BulletConfig | undefined;
  /** Bullet width in pixels (for positioning) */
  readonly bulletWidth: Pixels;
  /** Font alignment for vertical positioning */
  readonly fontAlignment: FontAlignment;
};

/**
 * Complete layout result.
 */
export type LayoutResult = {
  /** Laid out paragraphs */
  readonly paragraphs: readonly LayoutParagraphResult[];
  /** Total height of all content in pixels */
  readonly totalHeight: Pixels;
  /** Y offset applied for vertical anchoring in pixels */
  readonly yOffset: Pixels;
  /**
   * Writing mode used for this layout.
   * Informs the renderer how to interpret coordinates and render text.
   *
   * @see ECMA-376-1:2016 Section 17.18.93 (ST_TextDirection)
   */
  readonly writingMode: WritingMode;
};

// =============================================================================
// Table Layout Types
// =============================================================================

/**
 * Border style for table cell edges.
 *
 * @see ECMA-376 Part 1, Section 17.4.78 (tcBorders)
 */
export type LayoutBorderStyle = {
  /** Border style name */
  readonly style: "none" | "single" | "double" | "dotted" | "dashed" | "thick";
  /** Border width in pixels */
  readonly width: Pixels;
  /** Border color as hex (with #) */
  readonly color: string;
};

/**
 * Table cell borders.
 */
export type LayoutCellBorders = {
  readonly top?: LayoutBorderStyle;
  readonly right?: LayoutBorderStyle;
  readonly bottom?: LayoutBorderStyle;
  readonly left?: LayoutBorderStyle;
};

/**
 * Table cell input for layout.
 *
 * @see ECMA-376 Part 1, Section 17.4.65 (tc)
 */
export type LayoutTableCellInput = {
  /** Paragraphs (and nested tables) in the cell */
  readonly paragraphs: readonly LayoutParagraphInput[];
  /** Cell width in pixels (if specified) */
  readonly width?: Pixels;
  /** Number of grid columns spanned */
  readonly gridSpan: number;
  /** Vertical merge state */
  readonly vMerge?: "restart" | "continue";
  /** Cell padding */
  readonly padding: {
    readonly top: Pixels;
    readonly right: Pixels;
    readonly bottom: Pixels;
    readonly left: Pixels;
  };
  /** Cell borders */
  readonly borders?: LayoutCellBorders;
  /** Background color as hex (with #) */
  readonly backgroundColor?: string;
  /** Vertical alignment */
  readonly verticalAlign: "top" | "center" | "bottom";
};

/**
 * Table row input for layout.
 *
 * @see ECMA-376 Part 1, Section 17.4.79 (tr)
 */
export type LayoutTableRowInput = {
  /** Cells in the row */
  readonly cells: readonly LayoutTableCellInput[];
  /** Row height in pixels (if specified) */
  readonly height?: Pixels;
  /** Height rule */
  readonly heightRule: "auto" | "atLeast" | "exact";
  /** Is this row a header row? */
  readonly isHeader: boolean;
};

/**
 * Table input for layout.
 *
 * @see ECMA-376 Part 1, Section 17.4.38 (tbl)
 */
export type LayoutTableInput = {
  /** Table rows */
  readonly rows: readonly LayoutTableRowInput[];
  /** Grid column widths in pixels */
  readonly gridColumnWidths: readonly Pixels[];
  /** Table width in pixels (if specified) */
  readonly width?: Pixels;
  /** Table alignment */
  readonly alignment: "left" | "center" | "right";
  /** Left indent in pixels */
  readonly indent: Pixels;
  /** Cell spacing in pixels */
  readonly cellSpacing: Pixels;
  /** Table borders */
  readonly borders?: {
    readonly top?: LayoutBorderStyle;
    readonly right?: LayoutBorderStyle;
    readonly bottom?: LayoutBorderStyle;
    readonly left?: LayoutBorderStyle;
    readonly insideH?: LayoutBorderStyle;
    readonly insideV?: LayoutBorderStyle;
  };
};

/**
 * Laid out table cell.
 */
export type LayoutTableCellResult = {
  /** X position of cell in pixels */
  readonly x: Pixels;
  /** Y position of cell in pixels */
  readonly y: Pixels;
  /** Cell width in pixels */
  readonly width: Pixels;
  /** Cell height in pixels */
  readonly height: Pixels;
  /** Laid out paragraphs within the cell */
  readonly paragraphs: readonly LayoutParagraphResult[];
  /** Cell padding */
  readonly padding: {
    readonly top: Pixels;
    readonly right: Pixels;
    readonly bottom: Pixels;
    readonly left: Pixels;
  };
  /** Cell borders */
  readonly borders?: LayoutCellBorders;
  /** Background color as hex (with #) */
  readonly backgroundColor?: string;
  /** Vertical alignment */
  readonly verticalAlign: "top" | "center" | "bottom";
  /** Column span */
  readonly colSpan: number;
  /** Row span (computed from vMerge) */
  readonly rowSpan: number;
};

/**
 * Laid out table row.
 */
export type LayoutTableRowResult = {
  /** Y position of row in pixels */
  readonly y: Pixels;
  /** Row height in pixels */
  readonly height: Pixels;
  /** Laid out cells in the row */
  readonly cells: readonly LayoutTableCellResult[];
  /** Is this row a header row? */
  readonly isHeader: boolean;
};

/**
 * Laid out table.
 */
export type LayoutTableResult = {
  /** X position of table in pixels */
  readonly x: Pixels;
  /** Y position of table in pixels */
  readonly y: Pixels;
  /** Total table width in pixels */
  readonly width: Pixels;
  /** Total table height in pixels */
  readonly height: Pixels;
  /** Laid out rows */
  readonly rows: readonly LayoutTableRowResult[];
  /** Table alignment */
  readonly alignment: "left" | "center" | "right";
};

// =============================================================================
// Text Box Configuration
// =============================================================================

/**
 * Text wrapping mode.
 */
export type TextWrapping = "none" | "square" | "wrap";

/**
 * Text overflow behavior.
 */
export type TextOverflow = "overflow" | "clip";

/**
 * Vertical overflow behavior.
 */
export type TextVerticalOverflow = "overflow" | "ellipsis" | "clip";

/**
 * Auto-fit configuration for text scaling.
 */
export type AutoFitConfig =
  | { readonly type: "none" }
  | { readonly type: "shape" }
  | {
      readonly type: "normal";
      readonly fontScale: Percent;
      readonly lineSpaceReduction: Percent;
    };

/**
 * Text box configuration for layout.
 */
export type TextBoxConfig = {
  /** Total width of the text box in pixels */
  readonly width: Pixels;
  /** Total height of the text box in pixels */
  readonly height: Pixels;
  /** Left inset in pixels */
  readonly insetLeft: Pixels;
  /** Right inset in pixels */
  readonly insetRight: Pixels;
  /** Top inset in pixels */
  readonly insetTop: Pixels;
  /** Bottom inset in pixels */
  readonly insetBottom: Pixels;
  /** Vertical anchor: top, center, or bottom */
  readonly anchor: TextAnchor;
  /** Center text horizontally within the text body */
  readonly anchorCenter: boolean;
  /** Word wrap mode */
  readonly wrapMode: TextWrapping | "wrap";
  /** Auto-fit configuration */
  readonly autoFit: AutoFitConfig;
  /** Horizontal overflow behavior */
  readonly horzOverflow: TextOverflow;
  /** Vertical overflow behavior */
  readonly vertOverflow: TextVerticalOverflow;
  /** Apply paragraph spacing to first and last paragraphs */
  readonly spcFirstLastPara: boolean;
  /**
   * Writing mode for text direction.
   * Determines the inline and block flow directions.
   *
   * - horizontal-tb: Horizontal text, top to bottom block flow (default)
   * - vertical-rl: Vertical text, right to left block flow (Japanese/Chinese)
   * - vertical-lr: Vertical text, left to right block flow (Mongolian)
   *
   * @see ECMA-376-1:2016 Section 17.18.93 (ST_TextDirection)
   */
  readonly writingMode?: WritingMode;
};

// =============================================================================
// Layout Input
// =============================================================================

/**
 * Measured paragraph output for custom measurement.
 */
export type MeasuredParagraph = {
  /** Measured spans for the paragraph */
  readonly spans: readonly MeasuredSpan[];
  /** Optional bullet width override */
  readonly bulletWidth?: Pixels;
};

/**
 * Complete layout engine input.
 */
export type LayoutInput = {
  /** Text box configuration */
  readonly textBox: TextBoxConfig;
  /** Paragraphs to lay out */
  readonly paragraphs: readonly LayoutParagraphInput[];
  /** Override paragraph measurement */
  readonly measureParagraph?: (paragraph: LayoutParagraphInput) => MeasuredParagraph;
};

// =============================================================================
// Floating Image Types (for DOCX anchor drawings)
// =============================================================================

/**
 * Horizontal position reference for floating images.
 *
 * @see ECMA-376 Part 1, Section 20.4.3.4 (positionH)
 */
export type FloatingImageHorizontalRef =
  | "character"
  | "column"
  | "insideMargin"
  | "leftMargin"
  | "margin"
  | "outsideMargin"
  | "page"
  | "rightMargin";

/**
 * Vertical position reference for floating images.
 *
 * @see ECMA-376 Part 1, Section 20.4.3.5 (positionV)
 */
export type FloatingImageVerticalRef =
  | "bottomMargin"
  | "insideMargin"
  | "line"
  | "margin"
  | "outsideMargin"
  | "page"
  | "paragraph"
  | "topMargin";

/**
 * Text wrapping mode for floating images.
 *
 * @see ECMA-376 Part 1, Section 20.4.3 (Wrapping)
 */
export type FloatingImageWrap =
  | { readonly type: "none" }
  | { readonly type: "topAndBottom" }
  | { readonly type: "square"; readonly side?: "bothSides" | "left" | "right" | "largest" }
  | { readonly type: "tight"; readonly side?: "bothSides" | "left" | "right" | "largest" }
  | { readonly type: "through"; readonly side?: "bothSides" | "left" | "right" | "largest" };

/**
 * Floating image configuration for anchor drawings.
 *
 * @see ECMA-376 Part 1, Section 20.4.2.3 (anchor)
 */
export type FloatingImageConfig = {
  /** Image source URL (data URL or resource URL) */
  readonly src: string;
  /** Image width in pixels */
  readonly width: Pixels;
  /** Image height in pixels */
  readonly height: Pixels;
  /** Alt text for accessibility */
  readonly alt: string | undefined;
  /** Title for tooltip */
  readonly title: string | undefined;
  /** Relationship ID for resource resolution */
  readonly relationshipId: string | undefined;

  // Positioning
  /** Horizontal position reference */
  readonly horizontalRef: FloatingImageHorizontalRef;
  /** Horizontal offset in pixels (from reference) */
  readonly horizontalOffset: Pixels;
  /** Horizontal alignment (alternative to offset) */
  readonly horizontalAlign?: "left" | "right" | "center" | "inside" | "outside";
  /** Vertical position reference */
  readonly verticalRef: FloatingImageVerticalRef;
  /** Vertical offset in pixels (from reference) */
  readonly verticalOffset: Pixels;
  /** Vertical alignment (alternative to offset) */
  readonly verticalAlign?: "top" | "bottom" | "center" | "inside" | "outside";

  // Text wrapping
  /** Text wrapping mode */
  readonly wrap: FloatingImageWrap;
  /** Distance from text - top (in pixels) */
  readonly distanceTop: Pixels;
  /** Distance from text - bottom (in pixels) */
  readonly distanceBottom: Pixels;
  /** Distance from text - left (in pixels) */
  readonly distanceLeft: Pixels;
  /** Distance from text - right (in pixels) */
  readonly distanceRight: Pixels;

  // Z-ordering
  /** Whether image is behind document text */
  readonly behindDoc: boolean;
  /** Relative z-index for overlapping images */
  readonly relativeHeight: number;

  // Paragraph context (for paragraph-relative positioning)
  /** Index of the paragraph this image is anchored to */
  readonly anchorParagraphIndex?: number;
};

/**
 * Positioned floating image on a page.
 */
export type PositionedFloatingImage = FloatingImageConfig & {
  /** Computed X position on page (in pixels) */
  readonly x: Pixels;
  /** Computed Y position on page (in pixels) */
  readonly y: Pixels;
};

// =============================================================================
// Continuous Document Types (for DOCX)
// =============================================================================

/**
 * Header or footer layout result.
 */
export type HeaderFooterLayout = {
  /** Paragraphs in the header/footer */
  readonly paragraphs: readonly LayoutParagraphResult[];
  /** Y position from top of page in pixels */
  readonly y: Pixels;
  /** Height of the header/footer area in pixels */
  readonly height: Pixels;
};

/**
 * Page layout result for continuous documents.
 */
export type PageLayout = {
  /** Page index (0-based) */
  readonly pageIndex: number;
  /** Y offset of the page from document start in pixels */
  readonly y: Pixels;
  /** Page height in pixels */
  readonly height: Pixels;
  /** Page width in pixels */
  readonly width: Pixels;
  /** Paragraphs on this page */
  readonly paragraphs: readonly LayoutParagraphResult[];
  /** Header layout (if any) */
  readonly header?: HeaderFooterLayout;
  /** Footer layout (if any) */
  readonly footer?: HeaderFooterLayout;
  /** Floating images behind text */
  readonly floatingImagesBehind?: readonly PositionedFloatingImage[];
  /** Floating images in front of text */
  readonly floatingImagesFront?: readonly PositionedFloatingImage[];
};

/**
 * Paged layout result for continuous documents.
 */
export type PagedLayoutResult = {
  /** Pages in the document */
  readonly pages: readonly PageLayout[];
  /** Total document height in pixels */
  readonly totalHeight: Pixels;
  /**
   * Writing mode used for this layout.
   * Informs cursor utilities and renderers how to interpret coordinates.
   *
   * @see ECMA-376-1:2016 Section 17.18.93 (ST_TextDirection)
   */
  readonly writingMode?: WritingMode;
};

/**
 * Cursor position in a continuous document.
 */
export type ContinuousCursorPosition = {
  /** Paragraph index (document-level) */
  readonly paragraphIndex: number;
  /** Character offset within the paragraph */
  readonly charOffset: number;
  /** Page index (optional, computed from layout) */
  readonly pageIndex?: number;
  /** Line index within the paragraph (optional) */
  readonly lineIndex?: number;
};

/**
 * Selection in a continuous document.
 */
export type ContinuousSelection = {
  /** Anchor position (where selection started) */
  readonly anchor: ContinuousCursorPosition;
  /** Focus position (where selection ends) */
  readonly focus: ContinuousCursorPosition;
};

/**
 * Visual cursor coordinates.
 */
export type CursorCoordinates = {
  /** X position in pixels */
  readonly x: Pixels;
  /** Y position in pixels (top of cursor) */
  readonly y: Pixels;
  /** Cursor height in pixels */
  readonly height: Pixels;
  /** Page index for multi-page documents */
  readonly pageIndex?: number;
};

/**
 * Selection highlight rectangle.
 */
export type SelectionRect = {
  /** X position */
  readonly x: Pixels;
  /** Y position */
  readonly y: Pixels;
  /** Width */
  readonly width: Pixels;
  /** Height */
  readonly height: Pixels;
  /** Page index for multi-page documents */
  readonly pageIndex?: number;
};
