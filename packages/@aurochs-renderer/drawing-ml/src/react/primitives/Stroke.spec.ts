/**
 * @file Tests for Stroke primitives
 */

// describe, it, expect are provided by the test runner globals
import { resolvedLineToProps, resolveStrokeForReact, combineShapeProps } from "./Stroke";
import type { ResolvedLine, ResolvedFill } from "@aurochs-office/drawing-ml/domain/resolved-fill";

describe("resolvedLineToProps", () => {
  describe("fill type handling", () => {
    it("returns undefined for none fill", () => {
      const line: ResolvedLine = {
        fill: { type: "none" },
        width: 2,
      };
      const result = resolvedLineToProps(line);

      expect(result).toBeUndefined();
    });

    it("returns undefined for unresolved fill", () => {
      const line: ResolvedLine = {
        fill: { type: "unresolved" },
        width: 2,
      };
      const result = resolvedLineToProps(line);

      expect(result).toBeUndefined();
    });
  });

  describe("solid fill", () => {
    it("returns stroke props for solid fill", () => {
      const line: ResolvedLine = {
        fill: { type: "solid", color: { hex: "ff0000", alpha: 1 } },
        width: 3,
      };
      const result = resolvedLineToProps(line);

      expect(result?.stroke).toBe("#ff0000");
      expect(result?.strokeWidth).toBe(3);
      expect(result?.strokeOpacity).toBeUndefined();
    });

    it("includes strokeOpacity for semi-transparent solid fill", () => {
      const line: ResolvedLine = {
        fill: { type: "solid", color: { hex: "00ff00", alpha: 0.7 } },
        width: 2,
      };
      const result = resolvedLineToProps(line);

      expect(result?.stroke).toBe("#00ff00");
      expect(result?.strokeOpacity).toBe(0.7);
    });
  });

  describe("gradient fill", () => {
    it("uses first stop color for gradient fill", () => {
      const fill: ResolvedFill = {
        type: "gradient",
        angle: 90,
        stops: [
          { position: 0, color: { hex: "aabbcc", alpha: 1 } },
          { position: 100, color: { hex: "112233", alpha: 1 } },
        ],
      };
      const line: ResolvedLine = { fill, width: 1 };
      const result = resolvedLineToProps(line);

      expect(result?.stroke).toBe("#aabbcc");
    });

    it("returns undefined for gradient with no stops", () => {
      const fill: ResolvedFill = {
        type: "gradient",
        angle: 90,
        stops: [],
      };
      const line: ResolvedLine = { fill, width: 1 };
      const result = resolvedLineToProps(line);

      expect(result).toBeUndefined();
    });
  });

  describe("line cap", () => {
    it("converts flat to butt", () => {
      const line: ResolvedLine = {
        fill: { type: "solid", color: { hex: "000000", alpha: 1 } },
        width: 1,
        cap: "flat",
      };
      const result = resolvedLineToProps(line);

      expect(result?.strokeLinecap).toBe("butt");
    });

    it("preserves round cap", () => {
      const line: ResolvedLine = {
        fill: { type: "solid", color: { hex: "000000", alpha: 1 } },
        width: 1,
        cap: "round",
      };
      const result = resolvedLineToProps(line);

      expect(result?.strokeLinecap).toBe("round");
    });

    it("preserves square cap", () => {
      const line: ResolvedLine = {
        fill: { type: "solid", color: { hex: "000000", alpha: 1 } },
        width: 1,
        cap: "square",
      };
      const result = resolvedLineToProps(line);

      expect(result?.strokeLinecap).toBe("square");
    });
  });

  describe("line join", () => {
    it("preserves line join value", () => {
      const line: ResolvedLine = {
        fill: { type: "solid", color: { hex: "000000", alpha: 1 } },
        width: 1,
        join: "bevel",
      };
      const result = resolvedLineToProps(line);

      expect(result?.strokeLinejoin).toBe("bevel");
    });
  });

  describe("dash pattern", () => {
    it("converts customDash to strokeDasharray", () => {
      const line: ResolvedLine = {
        fill: { type: "solid", color: { hex: "000000", alpha: 1 } },
        width: 1,
        customDash: [5, 3, 2, 3],
      };
      const result = resolvedLineToProps(line);

      expect(result?.strokeDasharray).toBe("5 3 2 3");
    });

    it("returns undefined strokeDasharray when no customDash", () => {
      const line: ResolvedLine = {
        fill: { type: "solid", color: { hex: "000000", alpha: 1 } },
        width: 1,
      };
      const result = resolvedLineToProps(line);

      expect(result?.strokeDasharray).toBeUndefined();
    });
  });
});

describe("resolveStrokeForReact", () => {
  it("returns undefined for undefined line", () => {
    const result = resolveStrokeForReact(undefined);

    expect(result).toBeUndefined();
  });

  it("resolves valid line correctly", () => {
    const line: ResolvedLine = {
      fill: { type: "solid", color: { hex: "123456", alpha: 1 } },
      width: 4,
    };
    const result = resolveStrokeForReact(line);

    expect(result?.stroke).toBe("#123456");
    expect(result?.strokeWidth).toBe(4);
  });
});

describe("combineShapeProps", () => {
  it("combines fill and stroke props", () => {
    const fillProps = { fill: "#ff0000", fillOpacity: 0.8 };
    const strokeProps = {
      stroke: "#0000ff",
      strokeWidth: 2,
      strokeLinecap: "round" as const,
    };
    const result = combineShapeProps(fillProps, strokeProps);

    expect(result.fill).toBe("#ff0000");
    expect(result.fillOpacity).toBe(0.8);
    expect(result.stroke).toBe("#0000ff");
    expect(result.strokeWidth).toBe(2);
    expect(result.strokeLinecap).toBe("round");
  });

  it("handles undefined stroke props", () => {
    const fillProps = { fill: "#ff0000" };
    const result = combineShapeProps(fillProps, undefined);

    expect(result.fill).toBe("#ff0000");
    expect(result.stroke).toBeUndefined();
  });
});
