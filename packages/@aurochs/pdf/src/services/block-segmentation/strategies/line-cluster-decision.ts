/**
 * @file Proposal-based line cluster membership decision.
 */

export type LineClusterDecisionOptions = {
  readonly lineToleranceRatio: number;
  readonly minVerticalOverlapRatio: number;
};

export type LineClusterStrategyId = "baseline-proximity" | "vertical-overlap";

export type LineClusterProposalAction = "accept" | "reject";

export type LineClusterProposal = {
  readonly strategyId: LineClusterStrategyId;
  readonly action: LineClusterProposalAction;
  readonly score: number;
  readonly hard: boolean;
  readonly reason: string;
};

export type LineClusterDecisionInput = {
  readonly candidateBaseline: number;
  readonly clusterBaseline: number;
  readonly candidateFontSize: number;
  readonly clusterFontSize: number;
  readonly candidateBottom: number;
  readonly candidateTop: number;
  readonly clusterBottom: number;
  readonly clusterTop: number;
  readonly options: LineClusterDecisionOptions;
};

export type LineClusterDecision = {
  readonly accept: boolean;
  readonly acceptScore: number;
  readonly rejectScore: number;
  readonly baselineTolerance: number;
  readonly baselineDistance: number;
  readonly overlapRatio: number;
  readonly proposals: readonly LineClusterProposal[];
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

function clamp(args: { readonly value: number; readonly min: number; readonly max: number }): number {
  const { value, min, max } = args;
  return Math.min(max, Math.max(min, value));
}

function evaluateBaseline(input: LineClusterDecisionInput): {
  readonly proposals: readonly LineClusterProposal[];
  readonly tolerance: number;
  readonly distance: number;
} {
  const refSize = Math.max(input.clusterFontSize, input.candidateFontSize);
  const tolerance = Math.max(0.5, refSize * input.options.lineToleranceRatio);
  const distance = Math.abs(input.candidateBaseline - input.clusterBaseline);
  if (distance > tolerance) {
    return {
      tolerance,
      distance,
      proposals: [
        {
          strategyId: "baseline-proximity",
          action: "reject",
          score: 1,
          hard: true,
          reason: "baseline-distance-exceeded",
        },
      ],
    };
  }

  const closeness = clamp({
    value: 1 - distance / Math.max(1e-6, tolerance),
    min: 0,
    max: 1,
  });
  return {
    tolerance,
    distance,
    proposals: [
      {
        strategyId: "baseline-proximity",
        action: "accept",
        score: 0.55 + closeness * 0.35,
        hard: false,
        reason: "baseline-within-tolerance",
      },
    ],
  };
}

function evaluateVerticalOverlap(input: LineClusterDecisionInput): {
  readonly proposals: readonly LineClusterProposal[];
  readonly overlapRatio: number;
} {
  const overlap = overlap1D({
    a0: input.candidateBottom,
    a1: input.candidateTop,
    b0: input.clusterBottom,
    b1: input.clusterTop,
  });
  const candidateHeight = Math.max(1e-6, input.candidateTop - input.candidateBottom);
  const clusterHeight = Math.max(1e-6, input.clusterTop - input.clusterBottom);
  const overlapRatio = overlap / Math.min(candidateHeight, clusterHeight);
  if (overlapRatio < input.options.minVerticalOverlapRatio) {
    return {
      overlapRatio,
      proposals: [
        {
          strategyId: "vertical-overlap",
          action: "reject",
          score: 1,
          hard: true,
          reason: "vertical-overlap-too-low",
        },
      ],
    };
  }

  return {
    overlapRatio,
    proposals: [
      {
        strategyId: "vertical-overlap",
        action: "accept",
        score: 0.35 + Math.min(overlapRatio, 1) * 0.45,
        hard: false,
        reason: "vertical-overlap-sufficient",
      },
    ],
  };
}

/**
 * Decide whether a candidate run belongs to the current line cluster.
 */
export function decideLineClusterMembership(input: LineClusterDecisionInput): LineClusterDecision {
  const baseline = evaluateBaseline(input);
  const verticalOverlap = evaluateVerticalOverlap(input);
  const proposals = [...baseline.proposals, ...verticalOverlap.proposals];

  const hardReject = proposals.find((proposal) => proposal.hard && proposal.action === "reject");
  if (hardReject) {
    return {
      accept: false,
      acceptScore: 0,
      rejectScore: 1,
      baselineTolerance: baseline.tolerance,
      baselineDistance: baseline.distance,
      overlapRatio: verticalOverlap.overlapRatio,
      proposals,
    };
  }

  const acceptScore = proposals
    .filter((proposal) => proposal.action === "accept")
    .reduce((sum, proposal) => sum + proposal.score, 0);
  const rejectScore = proposals
    .filter((proposal) => proposal.action === "reject")
    .reduce((sum, proposal) => sum + proposal.score, 0);
  return {
    accept: acceptScore >= rejectScore,
    acceptScore,
    rejectScore,
    baselineTolerance: baseline.tolerance,
    baselineDistance: baseline.distance,
    overlapRatio: verticalOverlap.overlapRatio,
    proposals,
  };
}

