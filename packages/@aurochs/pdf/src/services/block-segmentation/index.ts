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
  InlineDirection,
  ParagraphAlignment,
  TextLayoutInference,
  GroupingContext,
  BlockingZone,
  LineSpacingInfo,
} from "./contracts/types";

// Grouping functions
export { noGrouping } from "./strategies/no-grouping";
export { createSpatialGrouping, spatialGrouping } from "./strategies/spatial-grouping";
export { visualizeBlockSegmentation } from "./visualization/block-segmentation-visualizer";
export {
  segmentTextUnitsByContext,
  segmentGroupedTextByContext,
} from "./strategies/contextual-ncd-segmentation";
export type {
  SegmentationVisualizationSummary,
  VisualizeSegmentationArgs,
} from "./visualization/block-segmentation-visualizer";
export type {
  ContextualSegmentationUnit,
  ContextualBoundaryDecisionReason,
  ContextualBoundaryScore,
  ContextualSegment,
  ContextualSegmentationResult,
  ContextualBoundaryDecisionInput,
  ContextualNcdSegmentationOptions,
  GroupedContextSegment,
  GroupedContextBoundaryScore,
  GroupedContextSegmentationResult,
  GroupedContextSegmentationOptions,
} from "./strategies/contextual-ncd-segmentation";
export type {
  SpatialGroupingOptions,
  ColorMatchingMode,
  WritingMode,
  VerticalColumnOrder,
  InlineDirectionMode,
} from "./strategies/spatial-grouping";
