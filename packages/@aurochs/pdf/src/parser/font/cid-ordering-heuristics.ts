/**
 * @file Heuristics for inferring CID ordering from embedded CID sets.
 */

import { decodeCIDFallback, detectCIDOrdering, type CIDOrdering } from "../../domain/font";

type NonIdentityOrdering = Exclude<CIDOrdering, "Identity">;

export type CidCoverageOrderingResolution = Readonly<{
  ordering: NonIdentityOrdering;
  coverageScores: ReadonlyMap<NonIdentityOrdering, number>;
}>;

const CANDIDATES: readonly NonIdentityOrdering[] = ["Japan1", "GB1", "CNS1", "Korea1"];

function collectPositiveDistinctCids(gidToCid: ReadonlyMap<number, number>): readonly number[] {
  const cidSet = new Set<number>();
  for (const cid of gidToCid.values()) {
    if (Number.isInteger(cid) && cid > 0) {
      cidSet.add(cid);
    }
  }
  return [...cidSet];
}

/**
 * Dense low-range identity maps are commonly subset-local CID spaces (e.g. 1..N).
 * They should not be interpreted as Adobe-{Japan1,GB1,...} code spaces.
 */
export function isDenseLowRangeIdentityCidMap(gidToCid: ReadonlyMap<number, number>): boolean {
  const stats = [...gidToCid.entries()].reduce(
    (acc, [gid, cid]) => {
      if (!Number.isInteger(gid) || !Number.isInteger(cid) || gid < 0 || cid <= 0) {
        return acc;
      }
      return {
        sampleCount: acc.sampleCount + 1,
        identityCount: acc.identityCount + (gid === cid ? 1 : 0),
        minCid: Math.min(acc.minCid, cid),
        maxCid: Math.max(acc.maxCid, cid),
      };
    },
    {
      sampleCount: 0,
      identityCount: 0,
      minCid: Number.POSITIVE_INFINITY,
      maxCid: Number.NEGATIVE_INFINITY,
    },
  );

  if (stats.sampleCount === 0 || !Number.isFinite(stats.minCid) || !Number.isFinite(stats.maxCid)) {
    return false;
  }

  const identityRatio = stats.identityCount / stats.sampleCount;
  const span = stats.maxCid - stats.minCid + 1;
  const density = stats.sampleCount / span;

  return identityRatio >= 0.98 && stats.minCid <= 1 && stats.maxCid <= 0x1000 && density >= 0.9;
}

function isLowCidRange(cids: readonly number[]): boolean {
  if (cids.length === 0) {
    return true;
  }
  const minCid = Math.min(...cids);
  const maxCid = Math.max(...cids);
  return minCid <= 0x10 && maxCid <= 0x1000;
}

/**
 * Infer Adobe CID ordering from coverage against built-in CID->Unicode tables.
 * Returns undefined when evidence is weak or likely subset-local CID space.
 */
export function inferOrderingFromCidCoverage(gidToCid: ReadonlyMap<number, number>): CidCoverageOrderingResolution | undefined {
  const cids = collectPositiveDistinctCids(gidToCid);
  if (cids.length < 32) {
    return undefined;
  }
  if (isLowCidRange(cids)) {
    return undefined;
  }

  const coverageScores = new Map<NonIdentityOrdering, number>();
  const scored = CANDIDATES
    .map((candidate) => {
      const resolved = cids.reduce((count, cid) => count + (decodeCIDFallback(cid, candidate) ? 1 : 0), 0);
      const coverage = resolved / cids.length;
      coverageScores.set(candidate, coverage);
      return { ordering: candidate, resolved, coverage };
    })
    .sort((a, b) => b.coverage - a.coverage || b.resolved - a.resolved);

  const best = scored[0];
  const second = scored[1];
  if (!best) {
    return undefined;
  }

  const coverageGap = second ? best.coverage - second.coverage : best.coverage;
  if (best.coverage < 0.6 || best.resolved < 32 || coverageGap < 0.2) {
    return undefined;
  }

  return {
    ordering: best.ordering,
    coverageScores,
  };
}

/** Returns true when CFF ROS explicitly declares `Ordering=Identity`. */
export function hasExplicitIdentityRos(cffRosOrdering: string | undefined): boolean {
  if (!cffRosOrdering) {
    return false;
  }
  return detectCIDOrdering(cffRosOrdering) === "Identity";
}
