/**
 * @file DOCX Document Domain Type Definitions
 *
 * This module defines the top-level document structure for WordprocessingML.
 * A document consists of body content (paragraphs, tables) and document-level settings.
 *
 * @see ECMA-376 Part 1, Section 17.2 (Document Body)
 */

import type { DocxParagraph } from "./paragraph";
import type { DocxTable } from "./table";
import type { DocxSectionProperties } from "./section";
import type { DocxStyles } from "./styles";
import type { DocxNumbering } from "./numbering";
import type { DocxRelId } from "./types";

// =============================================================================
// Block-Level Content
// =============================================================================

/**
 * Section break marker.
 */
export type DocxSectionBreak = {
  readonly type: "sectionBreak";
  /** Section properties */
  readonly sectPr: DocxSectionProperties;
};

/**
 * Union of all block-level content types.
 *
 * @see ECMA-376 Part 1, Section 17.2.2 (body)
 */
export type DocxBlockContent =
  | DocxParagraph
  | DocxTable
  | DocxSectionBreak;

// =============================================================================
// Document Body
// =============================================================================

/**
 * Document body element.
 *
 * @see ECMA-376 Part 1, Section 17.2.2 (body)
 */
export type DocxBody = {
  /** Block-level content */
  readonly content: readonly DocxBlockContent[];
  /** Final section properties (for last section) */
  readonly sectPr?: DocxSectionProperties;
};

// =============================================================================
// Document Settings
// =============================================================================

/**
 * Document compatibility settings.
 *
 * @see ECMA-376 Part 1, Section 17.15.1.21 (compat)
 */
export type DocxCompatSettings = {
  /** Space for underline */
  readonly spaceForUL?: boolean;
  /** Balance single-byte/double-byte widths */
  readonly balanceSingleByteDoubleByteWidth?: boolean;
  /** Do not expand shift-return */
  readonly doNotExpandShiftReturn?: boolean;
  /** Do not use HTML paragraph auto-spacing */
  readonly doNotUseHTMLParagraphAutoSpacing?: boolean;
  /** Use ANSI kerning pairs */
  readonly useAnsiKerningPairs?: boolean;
  /** Use FE layout */
  readonly useFELayout?: boolean;
};

/**
 * Document zoom settings.
 *
 * @see ECMA-376 Part 1, Section 17.15.1.94 (zoom)
 */
export type DocxZoom = {
  /** Zoom percentage */
  readonly percent?: number;
  /** Zoom preset */
  readonly val?: "none" | "fullPage" | "bestFit" | "textFit";
};

/**
 * Document settings.
 *
 * @see ECMA-376 Part 1, Section 17.15.1.78 (settings)
 */
export type DocxSettings = {
  /** Zoom settings */
  readonly zoom?: DocxZoom;
  /** Remove personal information on save */
  readonly removePersonalInformation?: boolean;
  /** Remove date/time on save */
  readonly removeDateAndTime?: boolean;
  /** Do not track moves */
  readonly doNotTrackMoves?: boolean;
  /** Do not track formatting */
  readonly doNotTrackFormatting?: boolean;
  /** Document protection */
  readonly documentProtection?: DocxDocumentProtection;
  /** Default tab stop */
  readonly defaultTabStop?: number;
  /** Hyphenation zone */
  readonly hyphenationZone?: number;
  /** Track revisions */
  readonly trackRevisions?: boolean;
  /** Do not use margins for drawing grid */
  readonly doNotUseMarginsForDrawingGridOrigin?: boolean;
  /** Compatibility settings */
  readonly compat?: DocxCompatSettings;
  /** Theme font languages */
  readonly themeFontLang?: DocxThemeFontLang;
};

/**
 * Document protection settings.
 *
 * @see ECMA-376 Part 1, Section 17.15.1.28 (documentProtection)
 */
export type DocxDocumentProtection = {
  /** Edit restriction type */
  readonly edit?: "none" | "readOnly" | "comments" | "trackedChanges" | "forms";
  /** Password hash (legacy) */
  readonly password?: string;
  /** Algorithm name for password hashing */
  readonly cryptAlgorithmType?: string;
  /** Algorithm class */
  readonly cryptAlgorithmClass?: string;
  /** Spin count */
  readonly cryptSpinCount?: number;
  /** Hash value */
  readonly hash?: string;
  /** Salt value */
  readonly salt?: string;
  /** Enforcement */
  readonly enforcement?: boolean;
};

/**
 * Theme font language settings.
 *
 * @see ECMA-376 Part 1, Section 17.15.1.86 (themeFontLang)
 */
export type DocxThemeFontLang = {
  /** Latin language */
  readonly val?: string;
  /** East Asian language */
  readonly eastAsia?: string;
  /** Bi-directional language */
  readonly bidi?: string;
};

// =============================================================================
// Header/Footer Content
// =============================================================================

/**
 * Header definition.
 *
 * @see ECMA-376 Part 1, Section 17.10.3 (hdr)
 */
export type DocxHeader = {
  /** Header content */
  readonly content: readonly DocxBlockContent[];
};

/**
 * Footer definition.
 *
 * @see ECMA-376 Part 1, Section 17.10.2 (ftr)
 */
export type DocxFooter = {
  /** Footer content */
  readonly content: readonly DocxBlockContent[];
};

// =============================================================================
// Comments
// =============================================================================

/**
 * Comment definition.
 *
 * @see ECMA-376 Part 1, Section 17.13.4.2 (comment)
 */
export type DocxComment = {
  /** Comment ID */
  readonly id: number;
  /** Author name */
  readonly author: string;
  /** Author initials */
  readonly initials?: string;
  /** Comment date */
  readonly date?: string;
  /** Comment content */
  readonly content: readonly DocxBlockContent[];
};

/**
 * Comments collection.
 *
 * @see ECMA-376 Part 1, Section 17.13.4.1 (comments)
 */
export type DocxComments = {
  /** Comment definitions */
  readonly comment: readonly DocxComment[];
};

// =============================================================================
// Footnotes/Endnotes
// =============================================================================

/**
 * Footnote/Endnote type.
 *
 * @see ECMA-376 Part 1, Section 17.18.31 (ST_FtnEdn)
 */
export type DocxNoteType = "normal" | "separator" | "continuationSeparator" | "continuationNotice";

/**
 * Footnote definition.
 *
 * @see ECMA-376 Part 1, Section 17.11.10 (footnote)
 */
export type DocxFootnote = {
  /** Footnote ID */
  readonly id: number;
  /** Footnote type */
  readonly type?: DocxNoteType;
  /** Footnote content */
  readonly content: readonly DocxBlockContent[];
};

/**
 * Endnote definition.
 *
 * @see ECMA-376 Part 1, Section 17.11.2 (endnote)
 */
export type DocxEndnote = {
  /** Endnote ID */
  readonly id: number;
  /** Endnote type */
  readonly type?: DocxNoteType;
  /** Endnote content */
  readonly content: readonly DocxBlockContent[];
};

/**
 * Footnotes collection.
 *
 * @see ECMA-376 Part 1, Section 17.11.15 (footnotes)
 */
export type DocxFootnotes = {
  /** Footnote definitions */
  readonly footnote: readonly DocxFootnote[];
};

/**
 * Endnotes collection.
 *
 * @see ECMA-376 Part 1, Section 17.11.8 (endnotes)
 */
export type DocxEndnotes = {
  /** Endnote definitions */
  readonly endnote: readonly DocxEndnote[];
};

// =============================================================================
// Relationships
// =============================================================================

/**
 * Document relationship entry.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export type DocxRelationship = {
  /** Relationship ID */
  readonly id: DocxRelId;
  /** Relationship type URI */
  readonly type: string;
  /** Target path */
  readonly target: string;
  /** Target mode (Internal or External) */
  readonly targetMode?: "Internal" | "External";
};

/**
 * Relationships collection.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export type DocxRelationships = {
  /** Relationship entries */
  readonly relationship: readonly DocxRelationship[];
};

// =============================================================================
// Complete Document
// =============================================================================

/**
 * Complete DOCX document representation.
 *
 * This is the top-level type that represents a fully parsed DOCX file.
 * It contains all the parts of the document: body, styles, numbering, etc.
 */
export type DocxDocument = {
  /** Document body */
  readonly body: DocxBody;
  /** Style definitions */
  readonly styles?: DocxStyles;
  /** Numbering definitions */
  readonly numbering?: DocxNumbering;
  /** Document settings */
  readonly settings?: DocxSettings;
  /** Headers (keyed by relationship ID) */
  readonly headers?: ReadonlyMap<DocxRelId, DocxHeader>;
  /** Footers (keyed by relationship ID) */
  readonly footers?: ReadonlyMap<DocxRelId, DocxFooter>;
  /** Comments */
  readonly comments?: DocxComments;
  /** Footnotes */
  readonly footnotes?: DocxFootnotes;
  /** Endnotes */
  readonly endnotes?: DocxEndnotes;
  /** Document relationships */
  readonly relationships?: DocxRelationships;
  /** Theme (reference to theme part) */
  readonly theme?: unknown;
};
