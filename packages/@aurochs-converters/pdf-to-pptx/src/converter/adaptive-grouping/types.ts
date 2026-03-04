/**
 * @file Types for adaptive (auto) grouping selection.
 */

import type { Shape } from "@aurochs-office/pptx/domain/shape";

export type AutoGroupingCandidateId = "full" | "text";

export type AutoGroupingQualitySignals = {
  readonly tableRegionCount: number;
  readonly fullTableCount: number;
  readonly textTableCount: number;
  readonly fullTableCellCount: number;
  readonly textTableCellCount: number;
  readonly fullTextShapeCount: number;
  readonly textTextShapeCount: number;
  readonly fullShapeCount: number;
  readonly textShapeCount: number;
  readonly overheadRatio: number;
  readonly regionCoverageScore: number;
  readonly regionOverlapScore: number;
  readonly structureScore: number;
  readonly visualScore: number;
  readonly qualityScore: number;
};

export type AutoGroupingDecision = {
  readonly selected: AutoGroupingCandidateId;
  readonly signals: AutoGroupingQualitySignals;
  readonly reason:
    | "no-full-table"
    | "overhead-too-high"
    | "quality-below-threshold"
    | "no-region-low-confidence"
    | "full-accepted";
};

export type AutoGroupingCandidateShapes = {
  readonly full: readonly Shape[];
  readonly text: readonly Shape[];
};
