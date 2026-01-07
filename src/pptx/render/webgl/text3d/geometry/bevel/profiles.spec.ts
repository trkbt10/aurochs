/**
 * @file Tests for bevel profiles (Three.js independent)
 */

import { describe, it, expect } from "vitest";
import {
  ANGLE_PROFILE,
  CIRCLE_PROFILE,
  SOFT_ROUND_PROFILE,
  CONVEX_PROFILE,
  RELAXED_INSET_PROFILE,
  SLOPE_PROFILE,
  HARD_EDGE_PROFILE,
  CROSS_PROFILE,
  ART_DECO_PROFILE,
  DIVOT_PROFILE,
  RIBLET_PROFILE,
  COOL_SLANT_PROFILE,
  BEVEL_PROFILES,
  getBevelProfile,
} from "./profiles";
import type { BevelProfile } from "./types";

describe("Bevel Profiles", () => {
  describe("profile structure", () => {
    const allProfiles: BevelProfile[] = [
      ANGLE_PROFILE,
      CIRCLE_PROFILE,
      SOFT_ROUND_PROFILE,
      CONVEX_PROFILE,
      RELAXED_INSET_PROFILE,
      SLOPE_PROFILE,
      HARD_EDGE_PROFILE,
      CROSS_PROFILE,
      ART_DECO_PROFILE,
      DIVOT_PROFILE,
      RIBLET_PROFILE,
      COOL_SLANT_PROFILE,
    ];

    for (const profile of allProfiles) {
      describe(`${profile.name} profile`, () => {
        it("has valid name", () => {
          expect(profile.name).toBeTruthy();
          expect(typeof profile.name).toBe("string");
        });

        it("has at least 2 points", () => {
          expect(profile.points.length).toBeGreaterThanOrEqual(2);
        });

        it("starts at t=0, inset=0, depth=0", () => {
          const first = profile.points[0];
          expect(first.t).toBe(0);
          expect(first.inset).toBe(0);
          expect(first.depth).toBe(0);
        });

        it("ends at t=1, inset=1, depth=1", () => {
          const last = profile.points[profile.points.length - 1];
          expect(last.t).toBe(1);
          expect(last.inset).toBe(1);
          expect(last.depth).toBe(1);
        });

        it("has monotonically increasing t values", () => {
          for (let i = 1; i < profile.points.length; i++) {
            expect(profile.points[i].t).toBeGreaterThanOrEqual(
              profile.points[i - 1].t,
            );
          }
        });

        it("has all values in valid range [0, 1]", () => {
          for (const point of profile.points) {
            expect(point.t).toBeGreaterThanOrEqual(0);
            expect(point.t).toBeLessThanOrEqual(1);
            expect(point.inset).toBeGreaterThanOrEqual(0);
            expect(point.inset).toBeLessThanOrEqual(1);
            expect(point.depth).toBeGreaterThanOrEqual(0);
            expect(point.depth).toBeLessThanOrEqual(1);
          }
        });
      });
    }
  });

  describe("BEVEL_PROFILES registry", () => {
    it("contains all 12 ECMA-376 presets", () => {
      expect(BEVEL_PROFILES.size).toBe(12);
    });

    it("maps preset names correctly", () => {
      expect(BEVEL_PROFILES.get("angle")).toBe(ANGLE_PROFILE);
      expect(BEVEL_PROFILES.get("circle")).toBe(CIRCLE_PROFILE);
      expect(BEVEL_PROFILES.get("softRound")).toBe(SOFT_ROUND_PROFILE);
      expect(BEVEL_PROFILES.get("convex")).toBe(CONVEX_PROFILE);
      expect(BEVEL_PROFILES.get("relaxedInset")).toBe(RELAXED_INSET_PROFILE);
      expect(BEVEL_PROFILES.get("slope")).toBe(SLOPE_PROFILE);
      expect(BEVEL_PROFILES.get("hardEdge")).toBe(HARD_EDGE_PROFILE);
      expect(BEVEL_PROFILES.get("cross")).toBe(CROSS_PROFILE);
      expect(BEVEL_PROFILES.get("artDeco")).toBe(ART_DECO_PROFILE);
      expect(BEVEL_PROFILES.get("divot")).toBe(DIVOT_PROFILE);
      expect(BEVEL_PROFILES.get("riblet")).toBe(RIBLET_PROFILE);
      expect(BEVEL_PROFILES.get("coolSlant")).toBe(COOL_SLANT_PROFILE);
    });
  });

  describe("getBevelProfile", () => {
    it("returns correct profile for known presets", () => {
      expect(getBevelProfile("angle")).toBe(ANGLE_PROFILE);
      expect(getBevelProfile("circle")).toBe(CIRCLE_PROFILE);
    });

    it("returns ANGLE_PROFILE for unknown presets", () => {
      expect(getBevelProfile("unknown")).toBe(ANGLE_PROFILE);
      expect(getBevelProfile("")).toBe(ANGLE_PROFILE);
    });
  });

  describe("specific profile characteristics", () => {
    it("ANGLE_PROFILE has exactly 2 points (linear)", () => {
      expect(ANGLE_PROFILE.points.length).toBe(2);
    });

    it("CIRCLE_PROFILE has 9 points (8 segments)", () => {
      expect(CIRCLE_PROFILE.points.length).toBe(9);
    });

    it("CIRCLE_PROFILE follows quarter-circle curve", () => {
      // Middle point should be approximately (0.5, 0.29) for quarter circle
      const midIndex = Math.floor(CIRCLE_PROFILE.points.length / 2);
      const mid = CIRCLE_PROFILE.points[midIndex];
      expect(mid.t).toBeCloseTo(0.5, 1);
      // For a true quarter circle: at t=0.5, inset ≈ sin(45°) ≈ 0.707
      expect(mid.inset).toBeGreaterThan(0.5);
      expect(mid.inset).toBeLessThan(0.8);
    });
  });
});
