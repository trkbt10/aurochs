/**
 * @file Track changes and revision domain types
 *
 * Defines types for revision tracking in WordprocessingML documents,
 * including insertions, deletions, and move operations.
 *
 * @see ECMA-376 Part 1, Section 17.13.5 (Revision Tracking)
 */

import type { DocxRun } from "./run";

// =============================================================================
// Revision Info
// =============================================================================

/**
 * Common revision tracking information.
 *
 * @see ECMA-376 Part 1, Section 17.13.5 (Revision Tracking)
 */
export type DocxRevisionInfo = {
  /** Unique identifier for this revision */
  readonly id: string;
  /** Author who made the change */
  readonly author?: string;
  /** Date/time of the change (ISO 8601 format) */
  readonly date?: string;
};

// =============================================================================
// Inserted Content
// =============================================================================

/**
 * Inserted content (tracked as an addition).
 *
 * Wraps runs that were added during revision tracking.
 *
 * @see ECMA-376 Part 1, Section 17.13.5.18 (ins)
 */
export type DocxInsertedContent = {
  readonly type: "ins";
  /** Revision tracking information */
  readonly revision: DocxRevisionInfo;
  /** The inserted runs */
  readonly content: readonly DocxRun[];
};

// =============================================================================
// Deleted Content
// =============================================================================

/**
 * Deleted content (tracked as a deletion).
 *
 * Wraps runs that were deleted during revision tracking.
 *
 * @see ECMA-376 Part 1, Section 17.13.5.14 (del)
 */
export type DocxDeletedContent = {
  readonly type: "del";
  /** Revision tracking information */
  readonly revision: DocxRevisionInfo;
  /** The deleted runs */
  readonly content: readonly DocxRun[];
};

// =============================================================================
// Move Content
// =============================================================================

/**
 * Move source content (tracked as move-from).
 *
 * Marks the original location of content that was moved.
 *
 * @see ECMA-376 Part 1, Section 17.13.5.22 (moveFrom)
 */
export type DocxMoveFromContent = {
  readonly type: "moveFrom";
  /** Revision tracking information */
  readonly revision: DocxRevisionInfo;
  /** The content at the original location */
  readonly content: readonly DocxRun[];
};

/**
 * Move destination content (tracked as move-to).
 *
 * Marks the new location of content that was moved.
 *
 * @see ECMA-376 Part 1, Section 17.13.5.28 (moveTo)
 */
export type DocxMoveToContent = {
  readonly type: "moveTo";
  /** Revision tracking information */
  readonly revision: DocxRevisionInfo;
  /** The content at the new location */
  readonly content: readonly DocxRun[];
};

// =============================================================================
// Move Range Markers
// =============================================================================

/**
 * Move-from range start marker.
 *
 * @see ECMA-376 Part 1, Section 17.13.5.23 (moveFromRangeStart)
 */
export type DocxMoveFromRangeStart = {
  readonly type: "moveFromRangeStart";
  /** Range ID */
  readonly id: number;
  /** Range name */
  readonly name?: string;
  /** Associated displacedByCustomXml value */
  readonly displacedByCustomXml?: "next" | "prev";
};

/**
 * Move-from range end marker.
 *
 * @see ECMA-376 Part 1, Section 17.13.5.21 (moveFromRangeEnd)
 */
export type DocxMoveFromRangeEnd = {
  readonly type: "moveFromRangeEnd";
  /** Range ID */
  readonly id: number;
};

/**
 * Move-to range start marker.
 *
 * @see ECMA-376 Part 1, Section 17.13.5.27 (moveToRangeStart)
 */
export type DocxMoveToRangeStart = {
  readonly type: "moveToRangeStart";
  /** Range ID */
  readonly id: number;
  /** Range name */
  readonly name?: string;
  /** Associated displacedByCustomXml value */
  readonly displacedByCustomXml?: "next" | "prev";
};

/**
 * Move-to range end marker.
 *
 * @see ECMA-376 Part 1, Section 17.13.5.26 (moveToRangeEnd)
 */
export type DocxMoveToRangeEnd = {
  readonly type: "moveToRangeEnd";
  /** Range ID */
  readonly id: number;
};

// =============================================================================
// Union Types
// =============================================================================

/**
 * All revision content types.
 */
export type DocxRevisionContent =
  | DocxInsertedContent
  | DocxDeletedContent
  | DocxMoveFromContent
  | DocxMoveToContent;

/**
 * All revision range markers.
 */
export type DocxRevisionRangeMarker =
  | DocxMoveFromRangeStart
  | DocxMoveFromRangeEnd
  | DocxMoveToRangeStart
  | DocxMoveToRangeEnd;
