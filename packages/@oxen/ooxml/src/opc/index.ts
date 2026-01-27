/**
 * @file OPC (Open Packaging Conventions) utilities
 *
 * Common OPC utilities shared across all OOXML formats.
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 */

// Part name utilities (Section 6.2.2)
export {
  arePartNamesEquivalent,
  isValidPartName,
  assertValidPartName,
} from "./part-name";

// Pack URI utilities (Sections 6.3 and 6.4.2)
export {
  parsePackIri,
  composePackIri,
  createPartBaseIri,
  arePackIrisEquivalent,
  getPackScheme,
} from "./pack-uri";
export type { PackResource } from "./pack-uri";

// Relationship utilities (Section 9.3)
export {
  createEmptyResourceMap,
  createResourceMap,
} from "./relationships";
export type { ResourceEntry } from "./relationships";
