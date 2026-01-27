/**
 * @file Text grouping exports
 *
 * Provides pluggable functions for grouping PDF text elements
 * into logical blocks during PDF to PPTX conversion.
 */

// Types
export type {
  TextGroupingFn,
  GroupedText,
  GroupedParagraph,
  TextBounds,
  GroupingContext,
  BlockingZone,
} from "./types";

// Grouping functions
export { noGrouping } from "./no-grouping";
export { createSpatialGrouping, spatialGrouping } from "./spatial-grouping";
export type { SpatialGroupingOptions, ColorMatchingMode } from "./spatial-grouping";
