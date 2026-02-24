/**
 * @file Proposal-based line merge decision for block segmentation.
 */

import type { GroupedParagraph } from "../contracts/types";

export type LineMergeDecisionOptions = {
  readonly enableColumnSeparation: boolean;
  readonly verticalGapRatio: number;
};

export type LineMergeStrategyId =
  | "column-relation"
  | "vertical-gap"
  | "style-consistency"
  | "layout-continuity";

export type LineMergeProposalAction = "merge" | "split";

export type LineMergeProposal = {
  readonly strategyId: LineMergeStrategyId;
  readonly action: LineMergeProposalAction;
  readonly score: number;
  readonly hard: boolean;
  readonly reason: string;
};

export type LineMergeDecisionInput = {
  readonly line1: GroupedParagraph;
  readonly line2: GroupedParagraph;
  readonly options: LineMergeDecisionOptions;
  readonly styleMatched: boolean;
  readonly referenceFontSize: number;
};

export type LineMergeDecision = {
  readonly merge: boolean;
  readonly mergeScore: number;
  readonly splitScore: number;
  readonly proposals: readonly LineMergeProposal[];
};

type LineGeometry = {
  readonly minX: number;
  readonly maxX: number;
  readonly width: number;
  readonly height: number;
  readonly centerX: number;
  readonly charCount: number;
};

type DecisionContext = {
  readonly line1: GroupedParagraph;
  readonly line2: GroupedParagraph;
  readonly line1Geometry: LineGeometry;
  readonly line2Geometry: LineGeometry;
  readonly baselineDelta: number;
  readonly lineHeight: number;
  readonly verticalGap: number;
  readonly maxGap: number;
  readonly options: LineMergeDecisionOptions;
  readonly styleMatched: boolean;
  readonly referenceFontSize: number;
};

function overlap1D(args: {
  readonly a0: number;
  readonly a1: number;
  readonly b0: number;
  readonly b1: number;
}): number {
  const { a0, a1, b0, b1 } = args;
  const lo = Math.max(Math.min(a0, a1), Math.min(b0, b1));
  const hi = Math.min(Math.max(a0, a1), Math.max(b0, b1));
  return Math.max(0, hi - lo);
}

function getLineGeometry(line: GroupedParagraph): LineGeometry | null {
  if (line.runs.length === 0) {
    return null;
  }

  const minX = Math.min(...line.runs.map((run) => run.x));
  const maxX = Math.max(...line.runs.map((run) => run.x + run.width));
  const minY = Math.min(...line.runs.map((run) => run.y));
  const maxY = Math.max(...line.runs.map((run) => run.y + run.height));
  const compactText = line.runs.map((run) => run.text).join("").replace(/\s+/g, "");

  return {
    minX,
    maxX,
    width: Math.max(1e-6, maxX - minX),
    height: Math.max(1e-6, maxY - minY),
    centerX: (minX + maxX) / 2,
    charCount: Array.from(compactText).length,
  };
}

function horizontalOverlapRatio(line1: LineGeometry, line2: LineGeometry): number {
  const overlap = overlap1D({ a0: line1.minX, a1: line1.maxX, b0: line2.minX, b1: line2.maxX });
  const denom = Math.min(line1.width, line2.width);
  return overlap / Math.max(1e-6, denom);
}

function hasAlignedAnchors(line1: LineGeometry, line2: LineGeometry, referenceSize: number): boolean {
  const anchorTolerance = Math.max(0.8, referenceSize * 0.85);
  const leftDelta = Math.abs(line1.minX - line2.minX);
  const rightDelta = Math.abs(line1.maxX - line2.maxX);
  const centerDelta = Math.abs(line1.centerX - line2.centerX);
  if (leftDelta <= anchorTolerance) {
    return true;
  }
  if (rightDelta <= anchorTolerance) {
    return true;
  }
  return centerDelta <= anchorTolerance * 0.75;
}

function isBodyLikeLine(line: LineGeometry, referenceSize: number): boolean {
  const minimumInlineExtent = referenceSize * 6.5;
  if (line.width >= minimumInlineExtent) {
    return true;
  }
  return line.charCount >= 10;
}

function canMergeAcrossStyleShift(args: {
  readonly line1: LineGeometry;
  readonly line2: LineGeometry;
  readonly referenceSize: number;
  readonly verticalGap: number;
  readonly lineHeight: number;
}): boolean {
  const { line1, line2, referenceSize, verticalGap, lineHeight } = args;
  const widthRatio = Math.min(line1.width, line2.width) / Math.max(line1.width, line2.width);
  if (widthRatio < 0.55) {
    return false;
  }

  const anchorAligned = hasAlignedAnchors(line1, line2, referenceSize);
  const overlapRatio = horizontalOverlapRatio(line1, line2);
  if (!anchorAligned && overlapRatio < 0.18) {
    return false;
  }

  if (!isBodyLikeLine(line1, referenceSize) || !isBodyLikeLine(line2, referenceSize)) {
    return false;
  }

  const tightGapLimit = lineHeight * 0.55;
  return verticalGap <= tightGapLimit;
}

function evaluateColumnRelation(context: DecisionContext): readonly LineMergeProposal[] {
  if (!context.options.enableColumnSeparation) {
    return [];
  }

  const overlapRatio = horizontalOverlapRatio(context.line1Geometry, context.line2Geometry);
  const alignedAnchors = hasAlignedAnchors(context.line1Geometry, context.line2Geometry, context.referenceFontSize);
  if (overlapRatio < 0.05 && !alignedAnchors) {
    return [
      {
        strategyId: "column-relation",
        action: "split",
        score: 1,
        hard: true,
        reason: "no-overlap-and-no-anchor-alignment",
      },
    ];
  }

  return [];
}

function evaluateVerticalGap(context: DecisionContext): readonly LineMergeProposal[] {
  if (context.baselineDelta <= 0) {
    return [
      {
        strategyId: "vertical-gap",
        action: "split",
        score: 1,
        hard: true,
        reason: "invalid-line-order",
      },
    ];
  }

  if (context.verticalGap > context.maxGap) {
    return [
      {
        strategyId: "vertical-gap",
        action: "split",
        score: 1,
        hard: true,
        reason: "vertical-gap-exceeded",
      },
    ];
  }

  return [];
}

function evaluateStyleConsistency(context: DecisionContext): readonly LineMergeProposal[] {
  if (context.styleMatched) {
    return [
      {
        strategyId: "style-consistency",
        action: "merge",
        score: 1,
        hard: true,
        reason: "style-matched",
      },
    ];
  }

  return [
    {
      strategyId: "style-consistency",
      action: "split",
      score: 0.3,
      hard: false,
      reason: "style-mismatched",
    },
  ];
}

function evaluateLayoutContinuity(context: DecisionContext): readonly LineMergeProposal[] {
  if (context.styleMatched) {
    return [];
  }

  const canContinue = canMergeAcrossStyleShift({
    line1: context.line1Geometry,
    line2: context.line2Geometry,
    referenceSize: context.referenceFontSize,
    verticalGap: context.verticalGap,
    lineHeight: context.lineHeight,
  });
  if (canContinue) {
    return [
      {
        strategyId: "layout-continuity",
        action: "merge",
        score: 0.8,
        hard: false,
        reason: "body-like-continuity",
      },
    ];
  }

  return [
    {
      strategyId: "layout-continuity",
      action: "split",
      score: 0.7,
      hard: false,
      reason: "discontinuous-layout",
    },
  ];
}

function aggregateProposals(proposals: readonly LineMergeProposal[]): LineMergeDecision {
  const hardSplit = proposals.find((proposal) => proposal.hard && proposal.action === "split");
  if (hardSplit) {
    return { merge: false, mergeScore: 0, splitScore: 1, proposals };
  }

  const hardMerge = proposals.find((proposal) => proposal.hard && proposal.action === "merge");
  if (hardMerge) {
    return { merge: true, mergeScore: 1, splitScore: 0, proposals };
  }

  const mergeScore = proposals
    .filter((proposal) => proposal.action === "merge")
    .reduce((sum, proposal) => sum + proposal.score, 0);
  const splitScore = proposals
    .filter((proposal) => proposal.action === "split")
    .reduce((sum, proposal) => sum + proposal.score, 0);

  return {
    merge: mergeScore >= splitScore,
    mergeScore,
    splitScore,
    proposals,
  };
}

/**
 * Decide whether two lines should be merged, using proposal-based strategy voting.
 */
export function decideLineMerge(input: LineMergeDecisionInput): LineMergeDecision {
  const line1Geometry = getLineGeometry(input.line1);
  const line2Geometry = getLineGeometry(input.line2);
  if (!line1Geometry || !line2Geometry) {
    return {
      merge: false,
      mergeScore: 0,
      splitScore: 1,
      proposals: [
        {
          strategyId: "vertical-gap",
          action: "split",
          score: 1,
          hard: true,
          reason: "empty-line",
        },
      ],
    };
  }

  const baselineDelta = input.line1.baselineY - input.line2.baselineY;
  const lineHeight = Math.max(line1Geometry.height, line2Geometry.height);
  const verticalGap = baselineDelta - lineHeight;
  const maxGap = lineHeight * input.options.verticalGapRatio;
  const context: DecisionContext = {
    line1: input.line1,
    line2: input.line2,
    line1Geometry,
    line2Geometry,
    baselineDelta,
    lineHeight,
    verticalGap,
    maxGap,
    options: input.options,
    styleMatched: input.styleMatched,
    referenceFontSize: input.referenceFontSize,
  };

  const proposals = [
    ...evaluateColumnRelation(context),
    ...evaluateVerticalGap(context),
    ...evaluateStyleConsistency(context),
    ...evaluateLayoutContinuity(context),
  ];
  return aggregateProposals(proposals);
}
