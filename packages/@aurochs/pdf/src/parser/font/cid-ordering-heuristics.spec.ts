/**
 * @file Tests for CID ordering coverage heuristics.
 */

import { decodeCIDFallback } from "../../domain/font";
import {
  hasExplicitIdentityRos,
  inferOrderingFromCidCoverage,
  isDenseLowRangeIdentityCidMap,
} from "./cid-ordering-heuristics";

describe("cid-ordering-heuristics", () => {
  it("treats dense low-range identity CID maps as subset-local", () => {
    const gidToCid = new Map<number, number>();
    for (let i = 0; i <= 336; i += 1) {
      gidToCid.set(i, i);
    }

    expect(isDenseLowRangeIdentityCidMap(gidToCid)).toBe(true);
    expect(inferOrderingFromCidCoverage(gidToCid)).toBeUndefined();
  });

  it("does not infer ordering when sample count is too small", () => {
    const gidToCid = new Map<number, number>();
    for (let i = 0; i < 10; i += 1) {
      gidToCid.set(i + 1, 5000 + i * 7);
    }
    expect(inferOrderingFromCidCoverage(gidToCid)).toBeUndefined();
  });

  it("can infer Japan1 from high-range Japan1-only CID samples", () => {
    const picks: number[] = [];
    for (let cid = 0x1000; cid <= 0xffff && picks.length < 40; cid += 1) {
      const jp = decodeCIDFallback(cid, "Japan1");
      const gb = decodeCIDFallback(cid, "GB1");
      const cns = decodeCIDFallback(cid, "CNS1");
      const kr = decodeCIDFallback(cid, "Korea1");
      if (jp && !gb && !cns && !kr) {
        picks.push(cid);
      }
    }

    expect(picks.length).toBeGreaterThanOrEqual(32);
    const gidToCid = new Map<number, number>(picks.map((cid, index) => [index + 1, cid]));
    const resolved = inferOrderingFromCidCoverage(gidToCid);
    expect(resolved?.ordering).toBe("Japan1");
    expect(resolved?.coverageScores.get("Japan1")).toBeGreaterThan(0.9);
  });

  it("detects explicit Identity ROS", () => {
    expect(hasExplicitIdentityRos("Identity")).toBe(true);
    expect(hasExplicitIdentityRos("Japan1")).toBe(false);
    expect(hasExplicitIdentityRos(undefined)).toBe(false);
  });
});

