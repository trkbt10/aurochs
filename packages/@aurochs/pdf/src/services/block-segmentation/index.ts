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
export { buildBlockingZonesFromPageElements } from "./strategies/blocking-zones";
export {
  createSpatialGrouping,
  spatialGrouping,
  spatialGroupingWithDiagnostics,
} from "./strategies/spatial-grouping";
export { decideLineMerge } from "./strategies/line-merge-decision";
export { decideLineClusterMembership } from "./strategies/line-cluster-decision";
// visualizeBlockSegmentation is Node.js-only, import directly from:
// ./visualization/block-segmentation-visualizer
export {
  segmentTextUnitsByContext,
  segmentGroupedTextByContext,
} from "./strategies/contextual-ncd-segmentation";
export type {
  LineMergeDecisionOptions,
  LineMergeStrategyId,
  LineMergeProposalAction,
  LineMergeProposal,
  LineMergeDecisionInput,
  LineMergeDecision,
} from "./strategies/line-merge-decision";
export type {
  LineClusterDecisionOptions,
  LineClusterStrategyId,
  LineClusterProposalAction,
  LineClusterProposal,
  LineClusterDecisionInput,
  LineClusterDecision,
} from "./strategies/line-cluster-decision";
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
  SpatialGroupingLineClusterTrace,
  SpatialGroupingLineMergeTrace,
  SpatialGroupingDiagnostics,
} from "./strategies/spatial-grouping";
