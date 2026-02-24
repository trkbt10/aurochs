/**
 * @file Tests for proposal-based line cluster membership decision.
 */

import { decideLineClusterMembership } from "../strategies/line-cluster-decision";

describe("decideLineClusterMembership", () => {
  const options = {
    lineToleranceRatio: 0.1,
    minVerticalOverlapRatio: 0.15,
  };

  it("accepts candidate when baseline and overlap are sufficient", () => {
    const decision = decideLineClusterMembership({
      candidateBaseline: 100.4,
      clusterBaseline: 100.1,
      candidateFontSize: 12,
      clusterFontSize: 12,
      candidateBottom: 90,
      candidateTop: 102,
      clusterBottom: 89.5,
      clusterTop: 101.5,
      options,
    });

    expect(decision.accept).toBe(true);
    expect(decision.acceptScore > decision.rejectScore).toBe(true);
  });

  it("hard-rejects candidate when baseline distance exceeds tolerance", () => {
    const decision = decideLineClusterMembership({
      candidateBaseline: 108,
      clusterBaseline: 100,
      candidateFontSize: 12,
      clusterFontSize: 12,
      candidateBottom: 90,
      candidateTop: 102,
      clusterBottom: 89,
      clusterTop: 101,
      options,
    });

    expect(decision.accept).toBe(false);
    expect(decision.proposals.some((proposal) => proposal.hard && proposal.reason === "baseline-distance-exceeded")).toBe(
      true,
    );
  });

  it("hard-rejects candidate when vertical overlap is too low", () => {
    const decision = decideLineClusterMembership({
      candidateBaseline: 100.2,
      clusterBaseline: 100.1,
      candidateFontSize: 12,
      clusterFontSize: 12,
      candidateBottom: 60,
      candidateTop: 72,
      clusterBottom: 90,
      clusterTop: 102,
      options,
    });

    expect(decision.accept).toBe(false);
    expect(decision.proposals.some((proposal) => proposal.hard && proposal.reason === "vertical-overlap-too-low")).toBe(
      true,
    );
  });
});

