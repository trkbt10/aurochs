/**
 * @file DOCX Paragraph Properties Type Definitions
 *
 * This module defines paragraph-level formatting properties for WordprocessingML.
 * A paragraph is a block-level element containing runs and other inline content.
 *
 * @see ECMA-376 Part 1, Section 17.3.1 (Paragraph Properties)
 */

import type { ParagraphAlignment, TabStopAlignment, TabStopLeader } from "../../ooxml/domain/text";
import type { WordBorderStyle, EighthPoints } from "../../ooxml/domain/border";
import type { DocxStyleId, DocxNumId, DocxIlvl, Twips, DocxRelId } from "./types";
import type { DocxRunProperties, DocxRun, DocxShading, DocxThemeColor } from "./run";
import type { DocxSectionProperties } from "./section";

// =============================================================================
// Paragraph Spacing
// =============================================================================

/**
 * Paragraph spacing properties.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.33 (spacing)
 */
export type DocxParagraphSpacing = {
  /** Space before paragraph in twips */
  readonly before?: Twips;
  /** Space before paragraph auto-spacing */
  readonly beforeAutospacing?: boolean;
  /** Space after paragraph in twips */
  readonly after?: Twips;
  /** Space after paragraph auto-spacing */
  readonly afterAutospacing?: boolean;
  /** Line spacing value */
  readonly line?: number;
  /** Line spacing rule */
  readonly lineRule?: "auto" | "exact" | "atLeast";
  /** Space before paragraph in lines (for beforeLines) */
  readonly beforeLines?: number;
  /** Space after paragraph in lines (for afterLines) */
  readonly afterLines?: number;
};

// =============================================================================
// Paragraph Indentation
// =============================================================================

/**
 * Paragraph indentation properties.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.12 (ind)
 */
export type DocxParagraphIndent = {
  /** Left indentation in twips */
  readonly left?: Twips;
  /** Left indentation in characters */
  readonly leftChars?: number;
  /** Right indentation in twips */
  readonly right?: Twips;
  /** Right indentation in characters */
  readonly rightChars?: number;
  /** First line indentation in twips (positive = indent, negative = hanging) */
  readonly firstLine?: Twips;
  /** First line indentation in characters */
  readonly firstLineChars?: number;
  /** Hanging indentation in twips (opposite of firstLine) */
  readonly hanging?: Twips;
  /** Hanging indentation in characters */
  readonly hangingChars?: number;
  /** Start indentation (for RTL support) */
  readonly start?: Twips;
  /** Start indentation in characters */
  readonly startChars?: number;
  /** End indentation (for RTL support) */
  readonly end?: Twips;
  /** End indentation in characters */
  readonly endChars?: number;
};

// =============================================================================
// Paragraph Border
// =============================================================================

/**
 * Single paragraph border edge.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.7 (pBdr children)
 */
export type DocxParagraphBorderEdge = {
  /** Border style */
  readonly val: WordBorderStyle;
  /** Border width in eighths of a point */
  readonly sz?: EighthPoints;
  /** Border spacing in points */
  readonly space?: number;
  /** Border color (RGB hex or "auto") */
  readonly color?: string;
  /** Theme color for border */
  readonly themeColor?: DocxThemeColor;
  /** Shadow effect */
  readonly shadow?: boolean;
  /** Frame border */
  readonly frame?: boolean;
};

/**
 * Paragraph borders.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.7 (pBdr)
 */
export type DocxParagraphBorders = {
  /** Top border */
  readonly top?: DocxParagraphBorderEdge;
  /** Left border */
  readonly left?: DocxParagraphBorderEdge;
  /** Bottom border */
  readonly bottom?: DocxParagraphBorderEdge;
  /** Right border */
  readonly right?: DocxParagraphBorderEdge;
  /** Border between paragraphs */
  readonly between?: DocxParagraphBorderEdge;
  /** Bar border (vertical line) */
  readonly bar?: DocxParagraphBorderEdge;
};

// =============================================================================
// Tab Stops
// =============================================================================

/**
 * Custom tab stop definition.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.37 (tab)
 */
export type DocxTabStop = {
  /** Tab alignment type */
  readonly val: TabStopAlignment;
  /** Tab stop position in twips */
  readonly pos: Twips;
  /** Leader character */
  readonly leader?: TabStopLeader;
};

/**
 * Tab stops collection.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.38 (tabs)
 */
export type DocxTabStops = {
  /** Array of tab stop definitions */
  readonly tabs: readonly DocxTabStop[];
};

// =============================================================================
// Numbering Properties
// =============================================================================

/**
 * Paragraph numbering properties.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.19 (numPr)
 */
export type DocxNumberingProperties = {
  /** Numbering definition ID */
  readonly numId?: DocxNumId;
  /** Numbering level (0-8) */
  readonly ilvl?: DocxIlvl;
};

// =============================================================================
// Frame Properties
// =============================================================================

/**
 * Frame positioning properties (for text frames).
 *
 * @see ECMA-376 Part 1, Section 17.3.1.11 (framePr)
 */
export type DocxFrameProperties = {
  /** Frame width in twips */
  readonly w?: Twips;
  /** Frame height in twips */
  readonly h?: Twips;
  /** Height rule */
  readonly hRule?: "auto" | "atLeast" | "exact";
  /** Horizontal anchor (page, margin, text) */
  readonly hAnchor?: "page" | "margin" | "text";
  /** Vertical anchor (page, margin, text) */
  readonly vAnchor?: "page" | "margin" | "text";
  /** Horizontal position relative to anchor */
  readonly x?: Twips;
  /** Horizontal alignment relative to anchor */
  readonly xAlign?: "left" | "center" | "right" | "inside" | "outside";
  /** Vertical position relative to anchor */
  readonly y?: Twips;
  /** Vertical alignment relative to anchor */
  readonly yAlign?: "top" | "center" | "bottom" | "inside" | "outside" | "inline";
  /** Horizontal space from surrounding text */
  readonly hSpace?: Twips;
  /** Vertical space from surrounding text */
  readonly vSpace?: Twips;
  /** Text wrapping type */
  readonly wrap?: "around" | "auto" | "none" | "notBeside" | "through" | "tight";
  /** Drop cap position */
  readonly dropCap?: "none" | "drop" | "margin";
  /** Number of lines for drop cap */
  readonly lines?: number;
  /** Lock frame anchor */
  readonly anchorLock?: boolean;
};

// =============================================================================
// Outline Level
// =============================================================================

/**
 * Outline level for paragraph (0-9).
 *
 * @see ECMA-376 Part 1, Section 17.3.1.20 (outlineLvl)
 */
export type DocxOutlineLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// =============================================================================
// Paragraph Properties Type
// =============================================================================

/**
 * Paragraph properties (pPr).
 *
 * Defines all formatting that can be applied to a paragraph.
 *
 * @see ECMA-376 Part 1, Section 17.3.1 (Paragraph Properties)
 */
export type DocxParagraphProperties = {
  // --- Style Reference ---
  /** Paragraph style ID */
  readonly pStyle?: DocxStyleId;

  // --- Alignment ---
  /** Horizontal alignment */
  readonly jc?: ParagraphAlignment;
  /** Text direction */
  readonly textDirection?: "lrTb" | "tbRl" | "btLr" | "lrTbV" | "tbRlV" | "tbLrV";

  // --- Spacing and Indentation ---
  /** Paragraph spacing */
  readonly spacing?: DocxParagraphSpacing;
  /** Paragraph indentation */
  readonly ind?: DocxParagraphIndent;

  // --- Borders and Shading ---
  /** Paragraph borders */
  readonly pBdr?: DocxParagraphBorders;
  /** Paragraph shading */
  readonly shd?: DocxShading;

  // --- Tab Stops ---
  /** Custom tab stops */
  readonly tabs?: DocxTabStops;

  // --- Numbering ---
  /** Numbering properties */
  readonly numPr?: DocxNumberingProperties;

  // --- Page/Column Break Control ---
  /** Keep paragraph on same page as next */
  readonly keepNext?: boolean;
  /** Keep all lines of paragraph on same page */
  readonly keepLines?: boolean;
  /** Page break before paragraph */
  readonly pageBreakBefore?: boolean;
  /** Widow/orphan control */
  readonly widowControl?: boolean;
  /** Suppress line numbers */
  readonly suppressLineNumbers?: boolean;
  /** Suppress auto hyphens */
  readonly suppressAutoHyphens?: boolean;

  // --- Frame Properties ---
  /** Frame properties for text frames */
  readonly framePr?: DocxFrameProperties;

  // --- Outline Level ---
  /** Outline level (for TOC/navigation) */
  readonly outlineLvl?: DocxOutlineLevel;

  // --- Kinsoku and Word Wrap ---
  /** Allow overflow punctuation */
  readonly kinsoku?: boolean;
  /** Allow word breaking */
  readonly wordWrap?: boolean;
  /** Allow overflow whitespace */
  readonly overflowPunct?: boolean;
  /** Top line punctuation */
  readonly topLinePunct?: boolean;
  /** Auto-adjust right indent for East Asian text */
  readonly autoSpaceDE?: boolean;
  /** Auto-adjust spacing for East Asian and numeric text */
  readonly autoSpaceDN?: boolean;

  // --- Bidirectional ---
  /** Right-to-left paragraph */
  readonly bidi?: boolean;

  // --- Text Alignment for East Asian ---
  /** Text alignment in line */
  readonly textAlignment?: "auto" | "baseline" | "bottom" | "center" | "top";

  // --- Contextual Spacing ---
  /** Ignore space before/after if same style */
  readonly contextualSpacing?: boolean;

  // --- Mirror Indents ---
  /** Mirror indentation for odd/even pages */
  readonly mirrorIndents?: boolean;

  // --- Run Properties Default ---
  /** Default run properties for the paragraph */
  readonly rPr?: DocxRunProperties;

  // --- Section Properties (last paragraph in section) ---
  /**
   * Section properties (only for last paragraph in section).
   * When present, indicates this paragraph ends a section.
   *
   * @see ECMA-376 Part 1, Section 17.6.17 (sectPr)
   */
  readonly sectPr?: DocxSectionProperties;

  // --- Revision Tracking ---
  /** Change tracking for paragraph properties */
  readonly pPrChange?: DocxParagraphPropertiesChange;
};

/**
 * Paragraph properties change tracking.
 *
 * @see ECMA-376 Part 1, Section 17.13.5.29 (pPrChange)
 */
export type DocxParagraphPropertiesChange = {
  /** Change author */
  readonly author: string;
  /** Change date */
  readonly date?: string;
  /** Original properties */
  readonly pPr?: Omit<DocxParagraphProperties, "pPrChange">;
};

// =============================================================================
// Paragraph Content Types
// =============================================================================

/**
 * Hyperlink in a paragraph.
 *
 * @see ECMA-376 Part 1, Section 17.16.22 (hyperlink)
 */
export type DocxHyperlink = {
  readonly type: "hyperlink";
  /** Relationship ID for external target */
  readonly rId?: DocxRelId;
  /** Internal anchor name */
  readonly anchor?: string;
  /** Tooltip text */
  readonly tooltip?: string;
  /** Target frame */
  readonly tgtFrame?: string;
  /** History (add to history stack) */
  readonly history?: boolean;
  /** Hyperlink content (runs) */
  readonly content: readonly DocxRun[];
};

/**
 * Bookmark start marker.
 *
 * @see ECMA-376 Part 1, Section 17.13.6.2 (bookmarkStart)
 */
export type DocxBookmarkStart = {
  readonly type: "bookmarkStart";
  /** Bookmark ID */
  readonly id: number;
  /** Bookmark name */
  readonly name: string;
};

/**
 * Bookmark end marker.
 *
 * @see ECMA-376 Part 1, Section 17.13.6.1 (bookmarkEnd)
 */
export type DocxBookmarkEnd = {
  readonly type: "bookmarkEnd";
  /** Bookmark ID */
  readonly id: number;
};

/**
 * Comment range start marker.
 *
 * @see ECMA-376 Part 1, Section 17.13.4.3 (commentRangeStart)
 */
export type DocxCommentRangeStart = {
  readonly type: "commentRangeStart";
  /** Comment ID */
  readonly id: number;
};

/**
 * Comment range end marker.
 *
 * @see ECMA-376 Part 1, Section 17.13.4.2 (commentRangeEnd)
 */
export type DocxCommentRangeEnd = {
  readonly type: "commentRangeEnd";
  /** Comment ID */
  readonly id: number;
};

/**
 * Union of all paragraph content types.
 */
export type DocxParagraphContent =
  | DocxRun
  | DocxHyperlink
  | DocxBookmarkStart
  | DocxBookmarkEnd
  | DocxCommentRangeStart
  | DocxCommentRangeEnd;

// =============================================================================
// Paragraph Type
// =============================================================================

/**
 * A paragraph element.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.22 (p)
 */
export type DocxParagraph = {
  readonly type: "paragraph";
  /** Paragraph properties */
  readonly properties?: DocxParagraphProperties;
  /** Paragraph content (runs, hyperlinks, bookmarks, etc.) */
  readonly content: readonly DocxParagraphContent[];
};
