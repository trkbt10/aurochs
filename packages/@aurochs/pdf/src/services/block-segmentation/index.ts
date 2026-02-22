/**
 * @file Block segmentation exports
 *
 * Provides pluggable functions for segmenting PDF text into logical blocks
 * for downstream converters.
 */

// Types
export type {
  TextGroupingFn,
  GroupedText,
  GroupedParagraph,
  TextBounds,
  GroupingContext,
  BlockingZone,
  LineSpacingInfo,
} from "./types";

// Grouping functions
export { noGrouping } from "./no-grouping";
export { createSpatialGrouping, spatialGrouping } from "./spatial-grouping";
export type { SpatialGroupingOptions, ColorMatchingMode, WritingMode, VerticalColumnOrder } from "./spatial-grouping";
