/**
 * @file Strategy selector for adaptive grouping.
 */

import type { ConversionContext } from "../transform-converter";
import type { TableRegion } from "../table-detection";
import { measureAutoGroupingQuality } from "./quality-metrics";
import type { AutoGroupingCandidateShapes, AutoGroupingDecision, AutoGroupingQualitySignals } from "./types";

function decide(args: {
  readonly signals: AutoGroupingQualitySignals;
  readonly qualityThreshold: number;
  readonly maxOverheadRatio: number;
}): AutoGroupingDecision {
  const { signals, qualityThreshold, maxOverheadRatio } = args;

  if (signals.fullTableCount === 0) {
    return { selected: "text", signals, reason: "no-full-table" };
  }

  if (signals.overheadRatio > maxOverheadRatio * 1.35) {
    return { selected: "text", signals, reason: "overhead-too-high" };
  }

  // Guard against over-aggressive table collapsing on dense pages where
  // full mode removes too many non-table details.
  const compressedTooMuch = signals.textShapeCount >= 120 &&
    signals.fullShapeCount <= Math.max(2, Math.floor(signals.textShapeCount * 0.2)) &&
    signals.fullTableCount <= 2;
  if (compressedTooMuch) {
    return { selected: "text", signals, reason: "quality-below-threshold" };
  }

  // Guard: some mixed-layout pages are over-collapsed into table frames.
  // If full mode emits only tables (no standalone text boxes) while text mode
  // has many text boxes, keep text mode to preserve relative placement.
  const collapsedIntoTables = signals.fullTableCount >= 2 &&
    signals.tableRegionCount >= 3 &&
    signals.fullTextShapeCount === 0 &&
    signals.textTextShapeCount >= 100;
  if (collapsedIntoTables) {
    return { selected: "text", signals, reason: "quality-below-threshold" };
  }

  // Guard: when many table-like regions are detected but full mode only materializes
  // one table and keeps almost all text boxes, table conversion gain is weak while it
  // can still perturb absolute placement. Prefer text mode in this low-confidence case.
  const fullTextRetentionRatio = signals.fullTextShapeCount / Math.max(1, signals.textTextShapeCount);
  const weakTableRealization = signals.tableRegionCount >= 5 &&
    signals.fullTableCount <= 1 &&
    fullTextRetentionRatio >= 0.82 &&
    signals.qualityScore < Math.max(0.75, qualityThreshold + 0.08);
  if (weakTableRealization) {
    return { selected: "text", signals, reason: "quality-below-threshold" };
  }

  const noRegionLowConfidence = signals.tableRegionCount === 0 && signals.qualityScore < Math.max(0.65, qualityThreshold + 0.08);
  if (noRegionLowConfidence) {
    return { selected: "text", signals, reason: "no-region-low-confidence" };
  }

  if (signals.qualityScore < qualityThreshold) {
    return { selected: "text", signals, reason: "quality-below-threshold" };
  }

  return { selected: "full", signals, reason: "full-accepted" };
}

/**
 * Select the best grouping candidate (`full` or `text`) for a single page.
 */
export function selectAutoGroupingCandidate(args: {
  readonly candidates: AutoGroupingCandidateShapes;
  readonly tableRegions: readonly TableRegion[];
  readonly context: ConversionContext;
  readonly qualityThreshold: number;
  readonly maxOverheadRatio: number;
}): AutoGroupingDecision {
  const signals = measureAutoGroupingQuality({
    candidates: args.candidates,
    tableRegions: args.tableRegions,
    context: args.context,
  });

  return decide({
    signals,
    qualityThreshold: args.qualityThreshold,
    maxOverheadRatio: args.maxOverheadRatio,
  });
}
