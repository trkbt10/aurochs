/**
 * @file DOCX Numbering Definitions Type Definitions
 *
 * This module defines numbering-related types for WordprocessingML.
 * Numbering is used for lists (bulleted, numbered, multi-level).
 *
 * @see ECMA-376 Part 1, Section 17.9 (Numbering)
 */

import type { NumberFormat, LevelSuffix, MultiLevelType } from "@oxen/ooxml";
import type { DocxStyleId, DocxAbstractNumId, DocxNumId, DocxIlvl, Twips } from "./types";
import type { DocxRunProperties } from "./run";
import type { DocxParagraphProperties } from "./paragraph";

// =============================================================================
// Numbering Level
// =============================================================================

/**
 * Numbering level justification.
 *
 * @see ECMA-376 Part 1, Section 17.9.7 (lvlJc)
 */
export type DocxLevelJustification = "left" | "center" | "right";

/**
 * Number text for a level.
 *
 * @see ECMA-376 Part 1, Section 17.9.12 (lvlText)
 */
export type DocxLevelText = {
  /** Level text value (e.g., "%1.", "%1.%2") */
  readonly val: string;
  /** Null placeholder when level has no text */
  readonly null?: boolean;
};

/**
 * Picture bullet reference.
 *
 * @see ECMA-376 Part 1, Section 17.9.9 (lvlPicBulletId)
 */
export type DocxLevelPicBullet = {
  /** Picture bullet ID */
  readonly numPicBulletId: number;
};

/**
 * Abstract numbering level definition.
 *
 * @see ECMA-376 Part 1, Section 17.9.6 (lvl)
 */
export type DocxLevel = {
  /** Level index (0-8) */
  readonly ilvl: DocxIlvl;
  /** Starting value */
  readonly start?: number;
  /** Number format */
  readonly numFmt?: NumberFormat;
  /** Level restart behavior */
  readonly lvlRestart?: number;
  /** Paragraph style associated with this level */
  readonly pStyle?: DocxStyleId;
  /** Legal numbering format */
  readonly isLgl?: boolean;
  /** Suffix after number */
  readonly suff?: LevelSuffix;
  /** Level text */
  readonly lvlText?: DocxLevelText;
  /** Level justification */
  readonly lvlJc?: DocxLevelJustification;
  /** Picture bullet */
  readonly lvlPicBulletId?: DocxLevelPicBullet;
  /** Legacy settings */
  readonly legacy?: DocxLegacy;
  /** Paragraph properties */
  readonly pPr?: DocxParagraphProperties;
  /** Run properties (for number formatting) */
  readonly rPr?: DocxRunProperties;
};

/**
 * Legacy numbering settings.
 *
 * @see ECMA-376 Part 1, Section 17.9.5 (legacy)
 */
export type DocxLegacy = {
  /** Use legacy numbering */
  readonly legacy?: boolean;
  /** Legacy space */
  readonly legacySpace?: Twips;
  /** Legacy indent */
  readonly legacyIndent?: Twips;
};

// =============================================================================
// Abstract Numbering
// =============================================================================

/**
 * Abstract numbering definition.
 *
 * @see ECMA-376 Part 1, Section 17.9.1 (abstractNum)
 */
export type DocxAbstractNum = {
  /** Abstract numbering ID */
  readonly abstractNumId: DocxAbstractNumId;
  /** Numbering name */
  readonly nsid?: string;
  /** Multi-level type */
  readonly multiLevelType?: MultiLevelType;
  /** Numbering template code */
  readonly tmpl?: string;
  /** Associated style link */
  readonly styleLink?: DocxStyleId;
  /** Style for this numbering */
  readonly numStyleLink?: DocxStyleId;
  /** Level definitions */
  readonly lvl: readonly DocxLevel[];
};

// =============================================================================
// Numbering Instance
// =============================================================================

/**
 * Level override for a numbering instance.
 *
 * @see ECMA-376 Part 1, Section 17.9.8 (lvlOverride)
 */
export type DocxLevelOverride = {
  /** Level index */
  readonly ilvl: DocxIlvl;
  /** Starting value override */
  readonly startOverride?: number;
  /** Complete level replacement */
  readonly lvl?: DocxLevel;
};

/**
 * Numbering instance.
 *
 * @see ECMA-376 Part 1, Section 17.9.15 (num)
 */
export type DocxNum = {
  /** Numbering instance ID */
  readonly numId: DocxNumId;
  /** Reference to abstract numbering */
  readonly abstractNumId: DocxAbstractNumId;
  /** Level overrides */
  readonly lvlOverride?: readonly DocxLevelOverride[];
};

// =============================================================================
// Picture Bullets
// =============================================================================

/**
 * Picture bullet definition.
 *
 * @see ECMA-376 Part 1, Section 17.9.19 (numPicBullet)
 */
export type DocxNumPicBullet = {
  /** Picture bullet ID */
  readonly numPicBulletId: number;
  /** Embedded picture data (base64) */
  readonly pict?: string;
  /** Drawing reference */
  readonly drawing?: unknown;
};

// =============================================================================
// Numbering Part
// =============================================================================

/**
 * Complete numbering definitions part.
 *
 * @see ECMA-376 Part 1, Section 17.9.17 (numbering)
 */
export type DocxNumbering = {
  /** Picture bullets */
  readonly numPicBullet?: readonly DocxNumPicBullet[];
  /** Abstract numbering definitions */
  readonly abstractNum: readonly DocxAbstractNum[];
  /** Numbering instances */
  readonly num: readonly DocxNum[];
};
