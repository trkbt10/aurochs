/**
 * @file Presentation structure types
 *
 * Raw presentation structure values used during parsing.
 *
 * @see ECMA-376 Part 1, Section 19.2 - Presentation
 */

import type { SlideSizeType } from "./types";

// =============================================================================
// Size Types (EMU)
// =============================================================================

/**
 * Slide size in EMU units.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.36
 */
export type SlideSizeEmu = {
  readonly widthEmu: number;
  readonly heightEmu: number;
  readonly type?: SlideSizeType;
};

/**
 * Notes size in EMU units.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.23
 */
export type NotesSizeEmu = {
  readonly widthEmu: number;
  readonly heightEmu: number;
};

// =============================================================================
// Relationship ID Entries
// =============================================================================

/**
 * Slide ID entry.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.32
 */
export type SlideIdEntry = {
  readonly id: number;
  readonly rId: string;
};

/**
 * Slide master ID entry.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.33
 */
export type SlideMasterIdEntry = {
  readonly id: number;
  readonly rId: string;
};

/**
 * Notes master ID entry.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.21
 */
export type NotesMasterIdEntry = {
  readonly rId: string;
};

/**
 * Handout master ID entry.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.11
 */
export type HandoutMasterIdEntry = {
  readonly rId: string;
};
