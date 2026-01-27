/**
 * @file Shared numbering types for OOXML processing
 *
 * These types represent list numbering concepts used primarily in
 * WordprocessingML but with some overlap in PresentationML.
 *
 * @see ECMA-376 Part 1, Section 17.9 (Numbering - WordprocessingML)
 * @see ECMA-376 Part 1, Section 21.1.2.4 (Bullet and Numbering - DrawingML)
 */

import type { Brand } from "./units";

// =============================================================================
// Numbering Format Types
// =============================================================================

/**
 * Numbering format enumeration.
 *
 * Defines the format of numbers/letters used for list items.
 *
 * @see ECMA-376 Part 1, Section 17.18.59 (ST_NumberFormat)
 */
export type NumberFormat =
  | "decimal"
  | "upperRoman"
  | "lowerRoman"
  | "upperLetter"
  | "lowerLetter"
  | "ordinal"
  | "cardinalText"
  | "ordinalText"
  | "hex"
  | "chicago"
  | "ideographDigital"
  | "japaneseCounting"
  | "aiueo"
  | "iroha"
  | "decimalFullWidth"
  | "decimalHalfWidth"
  | "japaneseLegal"
  | "japaneseDigitalTenThousand"
  | "decimalEnclosedCircle"
  | "decimalFullWidth2"
  | "aiueoFullWidth"
  | "irohaFullWidth"
  | "decimalZero"
  | "bullet"
  | "ganada"
  | "chosung"
  | "decimalEnclosedFullstop"
  | "decimalEnclosedParen"
  | "decimalEnclosedCircleChinese"
  | "ideographEnclosedCircle"
  | "ideographTraditional"
  | "ideographZodiac"
  | "ideographZodiacTraditional"
  | "taiwaneseCounting"
  | "ideographLegalTraditional"
  | "taiwaneseCountingThousand"
  | "taiwaneseDigital"
  | "chineseCounting"
  | "chineseLegalSimplified"
  | "chineseCountingThousand"
  | "koreanDigital"
  | "koreanCounting"
  | "koreanLegal"
  | "koreanDigital2"
  | "vietnameseCounting"
  | "russianLower"
  | "russianUpper"
  | "none"
  | "numberInDash"
  | "hebrew1"
  | "hebrew2"
  | "arabicAlpha"
  | "arabicAbjad"
  | "hindiVowels"
  | "hindiConsonants"
  | "hindiNumbers"
  | "hindiCounting"
  | "thaiLetters"
  | "thaiNumbers"
  | "thaiCounting"
  | "bahtText"
  | "dollarText"
  | "custom";

// =============================================================================
// List Level Types
// =============================================================================

/**
 * Numbering level index (0-8).
 *
 * Lists can have up to 9 levels (0-8) of nesting.
 *
 * @see ECMA-376 Part 1, Section 17.9.6 (lvl - Numbering Level)
 */
export type NumberingLevelIndex = Brand<number, "NumberingLevelIndex">;

/**
 * Create a NumberingLevelIndex value from a number.
 */
export const numberingLevelIdx = (value: number): NumberingLevelIndex => value as NumberingLevelIndex;

/**
 * Suffix after the numbering.
 *
 * @see ECMA-376 Part 1, Section 17.18.68 (ST_LevelSuffix)
 */
export type LevelSuffix = "tab" | "space" | "nothing";

/**
 * Multi-level list type.
 *
 * @see ECMA-376 Part 1, Section 17.18.55 (ST_MultiLevelType)
 */
export type MultiLevelType = "singleLevel" | "multilevel" | "hybridMultilevel";

// =============================================================================
// Abstract Numbering ID Types
// =============================================================================

/**
 * Abstract numbering definition ID.
 *
 * @see ECMA-376 Part 1, Section 17.9.1 (abstractNum)
 */
export type AbstractNumId = Brand<number, "AbstractNumId">;

/**
 * Create an AbstractNumId value from a number.
 */
export const abstractNumId = (value: number): AbstractNumId => value as AbstractNumId;

/**
 * Numbering instance ID.
 *
 * @see ECMA-376 Part 1, Section 17.9.15 (num - Numbering Instance)
 */
export type NumId = Brand<number, "NumId">;

/**
 * Create a NumId value from a number.
 */
export const numId = (value: number): NumId => value as NumId;

// =============================================================================
// Level Override Types
// =============================================================================

/**
 * Start value override for a numbering level.
 *
 * @see ECMA-376 Part 1, Section 17.9.21 (startOverride)
 */
export type LevelStartOverride = {
  /** Level index */
  readonly level: NumberingLevelIndex;
  /** Starting value */
  readonly start: number;
};

/**
 * Level restart behavior.
 *
 * @see ECMA-376 Part 1, Section 17.9.11 (lvlRestart)
 */
export type LevelRestart = Brand<number, "LevelRestart">;

/**
 * Create a LevelRestart value from a number.
 */
export const levelRestart = (value: number): LevelRestart => value as LevelRestart;
