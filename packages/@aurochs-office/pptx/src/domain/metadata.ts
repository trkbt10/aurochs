/**
 * @file Metadata types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 19.3.3 - Programmable Tags
 */

import type { ResourceId } from "./resource";

// =============================================================================
// Customer Data Types
// =============================================================================

/**
 * Customer data reference.
 * @see ECMA-376 Part 1, Section 19.3.1.17 (custData)
 */
export type CustomerData = {
  readonly rId: ResourceId;
};

// =============================================================================
// Programmable Tag Types
// =============================================================================

/**
 * Programmable tag entry.
 * @see ECMA-376 Part 1, Section 19.3.3.1 (tag)
 */
export type ProgrammableTag = {
  readonly name: string;
  readonly value?: string;
};

/**
 * Programmable tag list.
 * @see ECMA-376 Part 1, Section 19.3.3.2 (tagLst)
 */
export type ProgrammableTagList = {
  readonly tags: readonly ProgrammableTag[];
};
