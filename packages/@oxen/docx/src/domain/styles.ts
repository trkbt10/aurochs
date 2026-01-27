/**
 * @file DOCX Style Definitions Type Definitions
 *
 * This module defines style-related types for WordprocessingML.
 * Styles provide a way to define reusable formatting for paragraphs, runs, tables, etc.
 *
 * @see ECMA-376 Part 1, Section 17.7 (Styles)
 */

import type { DocxStyleId } from "./types";
import type { DocxRunProperties } from "./run";
import type { DocxParagraphProperties } from "./paragraph";
import type { DocxTableProperties, DocxTableRowProperties, DocxTableCellProperties } from "./table";

// =============================================================================
// Style Types
// =============================================================================

/**
 * Style type enumeration.
 *
 * @see ECMA-376 Part 1, Section 17.18.83 (ST_StyleType)
 */
export type DocxStyleType = "paragraph" | "character" | "table" | "numbering";

// =============================================================================
// Style Definition
// =============================================================================

/**
 * Style name localization.
 *
 * @see ECMA-376 Part 1, Section 17.7.4.9 (name)
 */
export type DocxStyleName = {
  /** Style name */
  readonly val: string;
};

/**
 * Style alias names.
 *
 * @see ECMA-376 Part 1, Section 17.7.4.1 (aliases)
 */
export type DocxStyleAliases = {
  /** Comma-separated alias names */
  readonly val: string;
};

/**
 * Base style from which this style inherits.
 *
 * @see ECMA-376 Part 1, Section 17.7.4.3 (basedOn)
 */
export type DocxStyleBasedOn = {
  /** Parent style ID */
  readonly val: DocxStyleId;
};

/**
 * Next paragraph style.
 *
 * @see ECMA-376 Part 1, Section 17.7.4.10 (next)
 */
export type DocxStyleNext = {
  /** Next style ID */
  readonly val: DocxStyleId;
};

/**
 * Linked style (paragraph/character pair).
 *
 * @see ECMA-376 Part 1, Section 17.7.4.6 (link)
 */
export type DocxStyleLink = {
  /** Linked style ID */
  readonly val: DocxStyleId;
};

/**
 * UI priority for style ordering.
 *
 * @see ECMA-376 Part 1, Section 17.7.4.19 (uiPriority)
 */
export type DocxStyleUiPriority = {
  /** Priority value (lower = higher priority) */
  readonly val: number;
};

/**
 * Style definition.
 *
 * @see ECMA-376 Part 1, Section 17.7.4.17 (style)
 */
export type DocxStyle = {
  /** Style type */
  readonly type: DocxStyleType;
  /** Style ID */
  readonly styleId: DocxStyleId;
  /** Style name */
  readonly name?: DocxStyleName;
  /** Alias names */
  readonly aliases?: DocxStyleAliases;
  /** Base style */
  readonly basedOn?: DocxStyleBasedOn;
  /** Next paragraph style */
  readonly next?: DocxStyleNext;
  /** Linked style */
  readonly link?: DocxStyleLink;
  /** UI priority */
  readonly uiPriority?: DocxStyleUiPriority;
  /** Default style flag */
  readonly default?: boolean;
  /** Custom style flag */
  readonly customStyle?: boolean;
  /** Semi-hidden in UI */
  readonly semiHidden?: boolean;
  /** Unhide when used */
  readonly unhideWhenUsed?: boolean;
  /** Quick format style */
  readonly qFormat?: boolean;
  /** Lock the style */
  readonly locked?: boolean;
  /** Personal compose style */
  readonly personal?: boolean;
  /** Personal reply style */
  readonly personalReply?: boolean;
  /** Personal compose/reply style */
  readonly personalCompose?: boolean;
  /** Run properties */
  readonly rPr?: DocxRunProperties;
  /** Paragraph properties */
  readonly pPr?: DocxParagraphProperties;
  /** Table properties */
  readonly tblPr?: DocxTableProperties;
  /** Table row properties */
  readonly trPr?: DocxTableRowProperties;
  /** Table cell properties */
  readonly tcPr?: DocxTableCellProperties;
  /** Table style conditional formats */
  readonly tblStylePr?: readonly DocxTableStylePr[];
};

/**
 * Table style conditional formatting.
 *
 * @see ECMA-376 Part 1, Section 17.7.6.6 (tblStylePr)
 */
export type DocxTableStylePr = {
  /** Conditional type */
  readonly type: DocxTableStyleType;
  /** Run properties */
  readonly rPr?: DocxRunProperties;
  /** Paragraph properties */
  readonly pPr?: DocxParagraphProperties;
  /** Table cell properties */
  readonly tcPr?: DocxTableCellProperties;
};

/**
 * Table style conditional types.
 *
 * @see ECMA-376 Part 1, Section 17.18.89 (ST_TblStyleOverrideType)
 */
export type DocxTableStyleType =
  | "wholeTable"
  | "firstRow"
  | "lastRow"
  | "firstCol"
  | "lastCol"
  | "band1Vert"
  | "band2Vert"
  | "band1Horz"
  | "band2Horz"
  | "neCell"
  | "nwCell"
  | "seCell"
  | "swCell";

// =============================================================================
// Document Defaults
// =============================================================================

/**
 * Default run properties.
 *
 * @see ECMA-376 Part 1, Section 17.7.5.5 (rPrDefault)
 */
export type DocxRunPropertiesDefault = {
  /** Default run properties */
  readonly rPr?: DocxRunProperties;
};

/**
 * Default paragraph properties.
 *
 * @see ECMA-376 Part 1, Section 17.7.5.4 (pPrDefault)
 */
export type DocxParagraphPropertiesDefault = {
  /** Default paragraph properties */
  readonly pPr?: DocxParagraphProperties;
};

/**
 * Document-wide default properties.
 *
 * @see ECMA-376 Part 1, Section 17.7.5.1 (docDefaults)
 */
export type DocxDocDefaults = {
  /** Default run properties */
  readonly rPrDefault?: DocxRunPropertiesDefault;
  /** Default paragraph properties */
  readonly pPrDefault?: DocxParagraphPropertiesDefault;
};

// =============================================================================
// Latent Styles
// =============================================================================

/**
 * Latent style exception.
 *
 * @see ECMA-376 Part 1, Section 17.7.4.8 (lsdException)
 */
export type DocxLatentStyleException = {
  /** Style name */
  readonly name: string;
  /** Locked */
  readonly locked?: boolean;
  /** UI priority */
  readonly uiPriority?: number;
  /** Semi-hidden */
  readonly semiHidden?: boolean;
  /** Unhide when used */
  readonly unhideWhenUsed?: boolean;
  /** Quick format */
  readonly qFormat?: boolean;
};

/**
 * Latent style defaults.
 *
 * @see ECMA-376 Part 1, Section 17.7.4.7 (latentStyles)
 */
export type DocxLatentStyles = {
  /** Default locked */
  readonly defLockedState?: boolean;
  /** Default UI priority */
  readonly defUIPriority?: number;
  /** Default semi-hidden */
  readonly defSemiHidden?: boolean;
  /** Default unhide when used */
  readonly defUnhideWhenUsed?: boolean;
  /** Default quick format */
  readonly defQFormat?: boolean;
  /** Number of latent styles */
  readonly count?: number;
  /** Style exceptions */
  readonly lsdException?: readonly DocxLatentStyleException[];
};

// =============================================================================
// Styles Part
// =============================================================================

/**
 * Complete styles part.
 *
 * @see ECMA-376 Part 1, Section 17.7.4.18 (styles)
 */
export type DocxStyles = {
  /** Document defaults */
  readonly docDefaults?: DocxDocDefaults;
  /** Latent styles */
  readonly latentStyles?: DocxLatentStyles;
  /** Style definitions */
  readonly style: readonly DocxStyle[];
};
