/**
 * @file Tests for useBackground hook
 *
 * Tests background resolution and SVG element generation.
 */

import type { ResolvedBackgroundFill } from "../../../background-fill";
import { resolveBackgroundForReact } from "./useBackground.js";

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockGetNextId(): (prefix: string) => string {
  const counter = { value: 0 };
  return (prefix: string): string => `${prefix}-${counter.value++}`;
}

const solidBackground: ResolvedBackgroundFill = {
  type: "solid",
  color: "#4F81BD",
};

const gradientBackground: ResolvedBackgroundFill = {
  type: "gradient",
  angle: 90,
  stops: [
    { position: 0, color: "#FF0000" },
    { position: 100, color: "#0000FF" },
  ],
};

const radialGradientBackground: ResolvedBackgroundFill = {
  type: "gradient",
  angle: 0,
  isRadial: true,
  radialCenter: { cx: 50, cy: 50 },
  stops: [
    { position: 0, color: "#FFFFFF" },
    { position: 100, color: "#000000" },
  ],
};

const imageBackground: ResolvedBackgroundFill = {
  type: "image",
  dataUrl: "data:image/png;base64,iVBORw0KGgo=",
  mode: "stretch",
};

// =============================================================================
// Tests
// =============================================================================

describe("resolveBackgroundForReact", () => {
  describe("undefined background", () => {
    it("returns no background result for undefined", () => {
      const mockGetNextId = createMockGetNextId();
      const result = resolveBackgroundForReact(undefined, mockGetNextId);

      expect(result.hasBackground).toBe(false);
      expect(result.type).toBe("none");
      expect(result.fill).toBe("none");
      expect(result.defElement).toBeUndefined();
      expect(result.data).toBeUndefined();
    });
  });

  describe("solid background", () => {
    it("resolves solid color background", () => {
      const mockGetNextId = createMockGetNextId();
      const result = resolveBackgroundForReact(solidBackground, mockGetNextId);

      expect(result.hasBackground).toBe(true);
      expect(result.type).toBe("solid");
      expect(result.fill).toBe("#4F81BD");
      expect(result.solidColor).toBe("#4F81BD");
      expect(result.defElement).toBeUndefined();
    });
  });

  describe("gradient background", () => {
    it("resolves linear gradient background", () => {
      const mockGetNextId = createMockGetNextId();
      const result = resolveBackgroundForReact(gradientBackground, mockGetNextId);

      expect(result.hasBackground).toBe(true);
      expect(result.type).toBe("gradient");
      expect(result.fill).toBe("url(#bg-grad-0)");
      expect(result.defElement).toBeDefined();
      expect(result.gradientStops).toHaveLength(2);
    });

    it("resolves radial gradient background", () => {
      const mockGetNextId = createMockGetNextId();
      const result = resolveBackgroundForReact(radialGradientBackground, mockGetNextId);

      expect(result.hasBackground).toBe(true);
      expect(result.type).toBe("gradient");
      expect(result.fill).toContain("url(#bg-grad-");
      expect(result.defElement).toBeDefined();
    });

    it("includes gradient stops in result", () => {
      const mockGetNextId = createMockGetNextId();
      const result = resolveBackgroundForReact(gradientBackground, mockGetNextId);

      expect(result.gradientStops).toBeDefined();
      expect(result.gradientStops?.[0]).toEqual({ position: 0, color: "#FF0000" });
      expect(result.gradientStops?.[1]).toEqual({ position: 100, color: "#0000FF" });
    });
  });

  describe("image background", () => {
    it("resolves image background", () => {
      const mockGetNextId = createMockGetNextId();
      const result = resolveBackgroundForReact(imageBackground, mockGetNextId);

      expect(result.hasBackground).toBe(true);
      expect(result.type).toBe("image");
      expect(result.fill).toBe("none");
      expect(result.imageUrl).toBe("data:image/png;base64,iVBORw0KGgo=");
      expect(result.imageMode).toBe("stretch");
      expect(result.defElement).toBeUndefined();
    });

    it("handles tile mode", () => {
      const mockGetNextId = createMockGetNextId();
      const tileBackground: ResolvedBackgroundFill = {
        type: "image",
        dataUrl: "data:image/png;base64,xxx",
        mode: "tile",
      };
      const result = resolveBackgroundForReact(tileBackground, mockGetNextId);

      expect(result.imageMode).toBe("tile");
    });
  });

  describe("data preservation", () => {
    it("preserves original resolved background data", () => {
      const mockGetNextId = createMockGetNextId();
      const result = resolveBackgroundForReact(solidBackground, mockGetNextId);

      expect(result.data).toBe(solidBackground);
    });
  });
});
