/**
 * @file Tests for Fill primitives
 */

// describe, it, expect are provided by the test runner globals
import { resolvedFillToResult, resolveFillForReact } from "./Fill";
import type { ResolvedFill } from "@aurochs-office/drawing-ml/domain/resolved-fill";

describe("resolvedFillToResult", () => {
  const mockGetNextId = (prefix: string) => `${prefix}-1`;

  describe("none fill", () => {
    it("returns fill: none for type none", () => {
      const fill: ResolvedFill = { type: "none" };
      const result = resolvedFillToResult({ fill, getNextId: mockGetNextId });

      expect(result.props.fill).toBe("none");
      expect(result.defElement).toBeUndefined();
      expect(result.defId).toBeUndefined();
    });

    it("returns fill: none for type unresolved", () => {
      const fill: ResolvedFill = { type: "unresolved" };
      const result = resolvedFillToResult({ fill, getNextId: mockGetNextId });

      expect(result.props.fill).toBe("none");
    });
  });

  describe("solid fill", () => {
    it("returns hex color for opaque solid fill", () => {
      const fill: ResolvedFill = {
        type: "solid",
        color: { hex: "ff0000", alpha: 1 },
      };
      const result = resolvedFillToResult({ fill, getNextId: mockGetNextId });

      expect(result.props.fill).toBe("#ff0000");
      expect(result.props.fillOpacity).toBeUndefined();
      expect(result.defElement).toBeUndefined();
    });

    it("returns hex color with fillOpacity for semi-transparent solid fill", () => {
      const fill: ResolvedFill = {
        type: "solid",
        color: { hex: "00ff00", alpha: 0.5 },
      };
      const result = resolvedFillToResult({ fill, getNextId: mockGetNextId });

      expect(result.props.fill).toBe("#00ff00");
      expect(result.props.fillOpacity).toBe(0.5);
    });
  });

  describe("gradient fill", () => {
    it("returns url reference for linear gradient", () => {
      const fill: ResolvedFill = {
        type: "gradient",
        angle: 90,
        stops: [
          { position: 0, color: { hex: "ff0000", alpha: 1 } },
          { position: 100, color: { hex: "0000ff", alpha: 1 } },
        ],
      };
      const result = resolvedFillToResult({ fill, getNextId: mockGetNextId });

      expect(result.props.fill).toBe("url(#grad-1)");
      expect(result.defId).toBe("grad-1");
      expect(result.defElement).toBeDefined();
    });

    it("returns url reference for radial gradient", () => {
      const fill: ResolvedFill = {
        type: "gradient",
        angle: 0,
        isRadial: true,
        radialCenter: { cx: 50, cy: 50 },
        stops: [
          { position: 0, color: { hex: "ffffff", alpha: 1 } },
          { position: 100, color: { hex: "000000", alpha: 1 } },
        ],
      };
      const result = resolvedFillToResult({ fill, getNextId: mockGetNextId });

      expect(result.props.fill).toBe("url(#grad-1)");
      expect(result.defElement).toBeDefined();
    });
  });

  describe("image fill", () => {
    it("returns none when width/height not provided", () => {
      const fill: ResolvedFill = {
        type: "image",
        src: "data:image/png;base64,abc123",
        mode: "stretch",
      };
      const result = resolvedFillToResult({ fill, getNextId: mockGetNextId });

      expect(result.props.fill).toBe("none");
    });

    it("returns url reference when width/height provided", () => {
      const fill: ResolvedFill = {
        type: "image",
        src: "data:image/png;base64,abc123",
        mode: "stretch",
      };
      const result = resolvedFillToResult({ fill, getNextId: mockGetNextId, width: 100, height: 50 });

      expect(result.props.fill).toBe("url(#img-pattern-1)");
      expect(result.defId).toBe("img-pattern-1");
      expect(result.defElement).toBeDefined();
    });
  });

  describe("pattern fill", () => {
    it("returns url reference for pattern fill", () => {
      const fill: ResolvedFill = {
        type: "pattern",
        preset: "pct10",
        fgColor: "#000000",
        bgColor: "#ffffff",
      };
      const result = resolvedFillToResult({ fill, getNextId: mockGetNextId });

      expect(result.props.fill).toBe("url(#pattern-1)");
      expect(result.defId).toBe("pattern-1");
      expect(result.defElement).toBeDefined();
    });
  });
});

describe("resolveFillForReact", () => {
  const mockGetNextId = (prefix: string) => `${prefix}-test`;

  it("returns none for undefined fill", () => {
    const result = resolveFillForReact({ resolvedFill: undefined, getNextId: mockGetNextId });

    expect(result.props.fill).toBe("none");
  });

  it("resolves solid fill correctly", () => {
    const fill: ResolvedFill = {
      type: "solid",
      color: { hex: "abcdef", alpha: 1 },
    };
    const result = resolveFillForReact({ resolvedFill: fill, getNextId: mockGetNextId });

    expect(result.props.fill).toBe("#abcdef");
  });
});
