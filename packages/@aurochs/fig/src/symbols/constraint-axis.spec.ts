import { describe, it, expect } from "vitest";
import { resolveConstraintAxis } from "./constraint-axis";
import { CONSTRAINT_TYPE_VALUES } from "../constants/layout";

describe("resolveConstraintAxis", () => {
  // Parent SYMBOL: 200, INSTANCE resized to: 300 (delta = +100)
  const origParent = 200;
  const newParent = 300;

  describe("MIN", () => {
    it("keeps position and size unchanged", () => {
      const result = resolveConstraintAxis(20, 60, origParent, newParent, CONSTRAINT_TYPE_VALUES.MIN);
      expect(result).toEqual({ pos: 20, dim: 60 });
    });
  });

  describe("CENTER", () => {
    it("shifts position by half delta", () => {
      const result = resolveConstraintAxis(20, 60, origParent, newParent, CONSTRAINT_TYPE_VALUES.CENTER);
      expect(result).toEqual({ pos: 70, dim: 60 }); // 20 + 100/2 = 70
    });
  });

  describe("MAX", () => {
    it("shifts position by full delta", () => {
      const result = resolveConstraintAxis(20, 60, origParent, newParent, CONSTRAINT_TYPE_VALUES.MAX);
      expect(result).toEqual({ pos: 120, dim: 60 }); // 20 + 100 = 120
    });
  });

  describe("STRETCH", () => {
    it("preserves margins and adjusts size", () => {
      // leftMargin = 20, rightMargin = 200 - (20 + 60) = 120
      // newDim = 300 - 20 - 120 = 160
      const result = resolveConstraintAxis(20, 60, origParent, newParent, CONSTRAINT_TYPE_VALUES.STRETCH);
      expect(result).toEqual({ pos: 20, dim: 160 });
    });

    it("clamps to zero when margins exceed new parent", () => {
      // leftMargin = 80, rightMargin = 200 - (80 + 100) = 20
      // newDim = 50 - 80 - 20 = -50 → clamped to 0
      const result = resolveConstraintAxis(80, 100, 200, 50, CONSTRAINT_TYPE_VALUES.STRETCH);
      expect(result).toEqual({ pos: 80, dim: 0 });
    });

    it("full-fit (inset:0) — child fills parent", () => {
      // Child at (0, 0) with size = parent → margins = 0, 0
      const result = resolveConstraintAxis(0, 200, 200, 300, CONSTRAINT_TYPE_VALUES.STRETCH);
      expect(result).toEqual({ pos: 0, dim: 300 });
    });
  });

  describe("SCALE", () => {
    it("scales position and size proportionally", () => {
      // ratio = 300/200 = 1.5
      const result = resolveConstraintAxis(20, 60, origParent, newParent, CONSTRAINT_TYPE_VALUES.SCALE);
      expect(result).toEqual({ pos: 30, dim: 90 }); // 20*1.5=30, 60*1.5=90
    });

    it("handles zero parent size", () => {
      const result = resolveConstraintAxis(20, 60, 0, 300, CONSTRAINT_TYPE_VALUES.SCALE);
      expect(result).toEqual({ pos: 20, dim: 60 });
    });
  });

  describe("unknown value", () => {
    it("defaults to MIN behavior", () => {
      const result = resolveConstraintAxis(20, 60, origParent, newParent, 999);
      expect(result).toEqual({ pos: 20, dim: 60 });
    });
  });

  describe("no resize (same parent size)", () => {
    it("all constraints return unchanged values", () => {
      for (const val of [
        CONSTRAINT_TYPE_VALUES.MIN,
        CONSTRAINT_TYPE_VALUES.CENTER,
        CONSTRAINT_TYPE_VALUES.MAX,
        CONSTRAINT_TYPE_VALUES.STRETCH,
        CONSTRAINT_TYPE_VALUES.SCALE,
      ]) {
        const result = resolveConstraintAxis(20, 60, 200, 200, val);
        expect(result).toEqual({ pos: 20, dim: 60 });
      }
    });
  });
});
