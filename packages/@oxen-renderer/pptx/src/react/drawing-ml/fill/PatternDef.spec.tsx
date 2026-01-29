/**
 * @file PatternDef component tests
 *
 * Tests for SVG pattern definition rendering.
 */

// @vitest-environment jsdom

import { render } from "@testing-library/react";
import type { PatternType } from "@oxen-office/ooxml/domain/fill";
import {
  PatternDef,
  getPatternGeometry,
  isPatternSupported,
  getSupportedPatterns,
} from "./PatternDef";

describe("PatternDef", () => {
  describe("component rendering", () => {
    it("renders smGrid pattern", () => {
      const { container } = render(
        <svg>
          <defs>
            <PatternDef id="test-pattern" preset="smGrid" fgColor="000000" bgColor="FFFFFF" />
          </defs>
        </svg>,
      );

      const pattern = container.querySelector("pattern");
      expect(pattern).not.toBeNull();
      expect(pattern?.getAttribute("id")).toBe("test-pattern");
      expect(pattern?.getAttribute("patternUnits")).toBe("userSpaceOnUse");
    });

    it("renders ltUpDiag pattern with diagonal line", () => {
      const { container } = render(
        <svg>
          <defs>
            <PatternDef id="diag-pattern" preset="ltUpDiag" fgColor="FF0000" bgColor="FFFFFF" />
          </defs>
        </svg>,
      );

      const pattern = container.querySelector("pattern");
      expect(pattern).not.toBeNull();

      const line = pattern?.querySelector("line");
      expect(line).not.toBeNull();
      expect(line?.getAttribute("stroke")).toBe("#FF0000");
    });

    it("renders smCheck pattern with checkerboard", () => {
      const { container } = render(
        <svg>
          <defs>
            <PatternDef id="check-pattern" preset="smCheck" fgColor="000000" bgColor="FFFFFF" />
          </defs>
        </svg>,
      );

      const pattern = container.querySelector("pattern");
      expect(pattern).not.toBeNull();

      const rects = pattern?.querySelectorAll("rect");
      // Background rect + 4 checkerboard cells
      expect(rects?.length).toBeGreaterThanOrEqual(4);
    });

    it("renders pct25 pattern with dot", () => {
      const { container } = render(
        <svg>
          <defs>
            <PatternDef id="dot-pattern" preset="pct25" fgColor="0000FF" bgColor="FFFFFF" />
          </defs>
        </svg>,
      );

      const pattern = container.querySelector("pattern");
      expect(pattern).not.toBeNull();

      const circle = pattern?.querySelector("circle");
      expect(circle).not.toBeNull();
      expect(circle?.getAttribute("fill")).toBe("#0000FF");
    });

    it("renders cross pattern with two lines", () => {
      const { container } = render(
        <svg>
          <defs>
            <PatternDef id="cross-pattern" preset="cross" fgColor="333333" bgColor="EEEEEE" />
          </defs>
        </svg>,
      );

      const pattern = container.querySelector("pattern");
      expect(pattern).not.toBeNull();

      const lines = pattern?.querySelectorAll("line");
      expect(lines?.length).toBe(2);
    });

    it("renders fallback for unsupported pattern", () => {
      // Use a pattern type that is not in PATTERN_GEOMETRIES
      const { container } = render(
        <svg>
          <defs>
            <PatternDef
              id="unsupported-pattern"
              preset={"trellis" as PatternType}
              fgColor="000000"
              bgColor="FFFFFF"
            />
          </defs>
        </svg>,
      );

      const pattern = container.querySelector("pattern");
      expect(pattern).not.toBeNull();
      // Fallback uses objectBoundingBox
      expect(pattern?.getAttribute("patternUnits")).toBe("objectBoundingBox");
    });

    it("applies colors correctly", () => {
      const { container } = render(
        <svg>
          <defs>
            <PatternDef id="color-test" preset="horz" fgColor="4F81BD" bgColor="EEECE1" />
          </defs>
        </svg>,
      );

      const pattern = container.querySelector("pattern");
      expect(pattern).not.toBeNull();

      // Check background rect has bg color
      const bgRect = pattern?.querySelector("rect");
      expect(bgRect?.getAttribute("fill")).toBe("#EEECE1");

      // Check line has fg color
      const line = pattern?.querySelector("line");
      expect(line?.getAttribute("stroke")).toBe("#4F81BD");
    });
  });

  describe("getPatternGeometry", () => {
    it("returns geometry for supported patterns", () => {
      expect(getPatternGeometry("smGrid")).toBeDefined();
      expect(getPatternGeometry("lgGrid")).toBeDefined();
      expect(getPatternGeometry("horz")).toBeDefined();
      expect(getPatternGeometry("vert")).toBeDefined();
      expect(getPatternGeometry("upDiag")).toBeDefined();
      expect(getPatternGeometry("dnDiag")).toBeDefined();
      expect(getPatternGeometry("cross")).toBeDefined();
      expect(getPatternGeometry("diagCross")).toBeDefined();
      expect(getPatternGeometry("smCheck")).toBeDefined();
      expect(getPatternGeometry("lgCheck")).toBeDefined();
      expect(getPatternGeometry("pct25")).toBeDefined();
    });

    it("returns undefined for unsupported patterns", () => {
      expect(getPatternGeometry("trellis" as PatternType)).toBeUndefined();
      expect(getPatternGeometry("sphere" as PatternType)).toBeUndefined();
    });

    it("geometry has required properties", () => {
      const geo = getPatternGeometry("smGrid");
      expect(geo).toHaveProperty("width");
      expect(geo).toHaveProperty("height");
      expect(geo).toHaveProperty("render");
      expect(typeof geo?.width).toBe("number");
      expect(typeof geo?.height).toBe("number");
      expect(typeof geo?.render).toBe("function");
    });
  });

  describe("isPatternSupported", () => {
    it("returns true for supported patterns", () => {
      expect(isPatternSupported("smGrid")).toBe(true);
      expect(isPatternSupported("ltUpDiag")).toBe(true);
      expect(isPatternSupported("pct50")).toBe(true);
    });

    it("returns false for unsupported patterns", () => {
      expect(isPatternSupported("trellis" as PatternType)).toBe(false);
      expect(isPatternSupported("sphere" as PatternType)).toBe(false);
    });
  });

  describe("getSupportedPatterns", () => {
    it("returns array of pattern types", () => {
      const patterns = getSupportedPatterns();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it("includes common patterns", () => {
      const patterns = getSupportedPatterns();
      expect(patterns).toContain("smGrid");
      expect(patterns).toContain("horz");
      expect(patterns).toContain("vert");
      expect(patterns).toContain("upDiag");
      expect(patterns).toContain("pct25");
    });

    it("all returned patterns are supported", () => {
      const patterns = getSupportedPatterns();
      for (const p of patterns) {
        expect(isPatternSupported(p)).toBe(true);
      }
    });
  });

  describe("pattern categories", () => {
    it("has grid patterns", () => {
      expect(isPatternSupported("smGrid")).toBe(true);
      expect(isPatternSupported("lgGrid")).toBe(true);
      expect(isPatternSupported("dotGrid")).toBe(true);
    });

    it("has horizontal patterns", () => {
      expect(isPatternSupported("horz")).toBe(true);
      expect(isPatternSupported("ltHorz")).toBe(true);
      expect(isPatternSupported("dkHorz")).toBe(true);
      expect(isPatternSupported("narHorz")).toBe(true);
    });

    it("has vertical patterns", () => {
      expect(isPatternSupported("vert")).toBe(true);
      expect(isPatternSupported("ltVert")).toBe(true);
      expect(isPatternSupported("dkVert")).toBe(true);
      expect(isPatternSupported("narVert")).toBe(true);
    });

    it("has diagonal patterns", () => {
      expect(isPatternSupported("upDiag")).toBe(true);
      expect(isPatternSupported("ltUpDiag")).toBe(true);
      expect(isPatternSupported("dkUpDiag")).toBe(true);
      expect(isPatternSupported("dnDiag")).toBe(true);
      expect(isPatternSupported("ltDnDiag")).toBe(true);
      expect(isPatternSupported("dkDnDiag")).toBe(true);
    });

    it("has percentage patterns", () => {
      expect(isPatternSupported("pct5")).toBe(true);
      expect(isPatternSupported("pct10")).toBe(true);
      expect(isPatternSupported("pct20")).toBe(true);
      expect(isPatternSupported("pct25")).toBe(true);
      expect(isPatternSupported("pct30")).toBe(true);
      expect(isPatternSupported("pct40")).toBe(true);
      expect(isPatternSupported("pct50")).toBe(true);
      expect(isPatternSupported("pct60")).toBe(true);
      expect(isPatternSupported("pct70")).toBe(true);
      expect(isPatternSupported("pct75")).toBe(true);
      expect(isPatternSupported("pct80")).toBe(true);
      expect(isPatternSupported("pct90")).toBe(true);
    });
  });
});
