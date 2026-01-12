/**
 * @file OOXML common utilities
 *
 * Shared types and utilities for all OOXML formats (PPTX, XLSX, DOCX).
 *
 * @see ECMA-376 (Office Open XML File Formats)
 */

// Domain types
export type { Brand, Pixels, Degrees, Percent, Points, EMU } from "./domain/units";
export { px, deg, pct, pt, emu } from "./domain/units";
export type { ResourceMap } from "./domain/opc";

// OPC utilities (Part 2)
export {
  // Part name utilities
  arePartNamesEquivalent,
  isValidPartName,
  assertValidPartName,
  // Pack URI utilities
  parsePackIri,
  composePackIri,
  createPartBaseIri,
  arePackIrisEquivalent,
  getPackScheme,
  // Relationship utilities
  createEmptyResourceMap,
  createResourceMap,
} from "./opc";
export type { PackResource, ResourceEntry } from "./opc";

// Serializer utilities
export {
  ooxmlBool,
  ooxmlAngleUnits,
  ooxmlPercent100k,
  ooxmlPercent1000,
  ooxmlEmu,
  EMU_PER_PIXEL,
} from "./serializer";
