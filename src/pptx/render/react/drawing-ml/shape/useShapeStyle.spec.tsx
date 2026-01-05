/**
 * @file Tests for useShapeStyle hook
 *
 * Tests combined shape style resolution.
 */

// @vitest-environment jsdom

import { render } from "@testing-library/react";
import type { Fill, Line, SlideSize } from "../../../../domain";
import type { Effects, ShadowEffect } from "../../../../domain/effects";
import type { ColorContext } from "../../../../domain/resolution";
import type { Pixels } from "../../../../domain/types";
import { px, deg, pct } from "../../../../domain/types";
import { RenderProvider } from "../../context";
import { SvgDefsProvider } from "../../hooks/useSvgDefs";
import { useShapeStyle, type ShapeStyleResult } from "./useShapeStyle.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const testSlideSize: SlideSize = {
  width: px(960) as Pixels,
  height: px(540) as Pixels,
};

const testColorContext: ColorContext = {
  colorScheme: {
    dk1: "000000",
    lt1: "FFFFFF",
    accent1: "4F81BD",
    accent2: "C0504D",
  },
  colorMap: {
    tx1: "dk1",
    bg1: "lt1",
  },
};

const solidFill: Fill = {
  type: "solidFill",
  color: { spec: { type: "srgb", value: "FF0000" } },
};

const strokeLine: Line = {
  fill: {
    type: "solidFill",
    color: { spec: { type: "srgb", value: "0000FF" } },
  },
  width: px(2),
  compound: "sng",
  alignment: "ctr",
  cap: "flat",
  dash: "solid",
  join: "round",
};

const shadowEffect: ShadowEffect = {
  type: "outer",
  color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(50) } },
  blurRadius: px(4),
  distance: px(3),
  direction: deg(45),
};

/**
 * Test component that captures hook result
 */
function TestComponent({
  fill,
  line,
  effects,
  onResult,
}: {
  fill?: Fill;
  line?: Line;
  effects?: Effects;
  onResult: (result: ShapeStyleResult) => void;
}) {
  const result = useShapeStyle({ fill, line, effects, width: 100, height: 50 });
  onResult(result);
  return null;
}

/**
 * Wrapper component that provides required context
 */
function TestWrapper({ children }: { readonly children: React.ReactNode }) {
  return (
    <RenderProvider
      slideSize={testSlideSize}
      colorContext={testColorContext}
    >
      <SvgDefsProvider>
        <svg>{children}</svg>
      </SvgDefsProvider>
    </RenderProvider>
  );
}

// =============================================================================
// Tests
// =============================================================================

describe("useShapeStyle", () => {
  describe("fill resolution", () => {
    it("resolves solid fill", () => {
      const capturedResult: ShapeStyleResult[] = [];

      render(
        <TestWrapper>
          <TestComponent
            fill={solidFill}
            onResult={(r) => capturedResult.push(r)}
          />
        </TestWrapper>,
      );

      expect(capturedResult.length).toBeGreaterThan(0);
      const result = capturedResult[capturedResult.length - 1];
      expect(result.fill.props.fill).toBe("#FF0000");
    });

    it("returns none for undefined fill", () => {
      const capturedResult: ShapeStyleResult[] = [];

      render(
        <TestWrapper>
          <TestComponent
            onResult={(r) => capturedResult.push(r)}
          />
        </TestWrapper>,
      );

      const result = capturedResult[capturedResult.length - 1];
      expect(result.fill.props.fill).toBe("none");
    });
  });

  describe("stroke resolution", () => {
    it("resolves stroke", () => {
      const capturedResult: ShapeStyleResult[] = [];

      render(
        <TestWrapper>
          <TestComponent
            line={strokeLine}
            onResult={(r) => capturedResult.push(r)}
          />
        </TestWrapper>,
      );

      const result = capturedResult[capturedResult.length - 1];
      expect(result.stroke).toBeDefined();
      expect(result.stroke?.stroke).toBe("#0000FF");
      expect(result.stroke?.strokeWidth).toBe(2);
    });

    it("returns undefined for undefined line", () => {
      const capturedResult: ShapeStyleResult[] = [];

      render(
        <TestWrapper>
          <TestComponent
            onResult={(r) => capturedResult.push(r)}
          />
        </TestWrapper>,
      );

      const result = capturedResult[capturedResult.length - 1];
      expect(result.stroke).toBeUndefined();
    });
  });

  describe("effects resolution", () => {
    it("resolves shadow effect", () => {
      const capturedResult: ShapeStyleResult[] = [];

      render(
        <TestWrapper>
          <TestComponent
            effects={{ shadow: shadowEffect }}
            onResult={(r) => capturedResult.push(r)}
          />
        </TestWrapper>,
      );

      const result = capturedResult[capturedResult.length - 1];
      expect(result.effects.hasEffects).toBe(true);
      expect(result.effects.filterUrl).toContain("url(#");
    });

    it("returns no effects for undefined", () => {
      const capturedResult: ShapeStyleResult[] = [];

      render(
        <TestWrapper>
          <TestComponent
            onResult={(r) => capturedResult.push(r)}
          />
        </TestWrapper>,
      );

      const result = capturedResult[capturedResult.length - 1];
      expect(result.effects.hasEffects).toBe(false);
    });
  });

  describe("combined props", () => {
    it("combines fill, stroke, and effects into svgProps", () => {
      const capturedResult: ShapeStyleResult[] = [];

      render(
        <TestWrapper>
          <TestComponent
            fill={solidFill}
            line={strokeLine}
            effects={{ shadow: shadowEffect }}
            onResult={(r) => capturedResult.push(r)}
          />
        </TestWrapper>,
      );

      const result = capturedResult[capturedResult.length - 1];

      expect(result.svgProps.fill).toBe("#FF0000");
      expect(result.svgProps.stroke).toBe("#0000FF");
      expect(result.svgProps.strokeWidth).toBe(2);
      expect(result.svgProps.filter).toContain("url(#");
    });
  });

  describe("defs generation", () => {
    it("returns null defs when no gradients or effects", () => {
      const capturedResult: ShapeStyleResult[] = [];

      render(
        <TestWrapper>
          <TestComponent
            fill={solidFill}
            onResult={(r) => capturedResult.push(r)}
          />
        </TestWrapper>,
      );

      const result = capturedResult[capturedResult.length - 1];
      expect(result.defs).toBeNull();
    });

    it("includes effect filter in defs", () => {
      const capturedResult: ShapeStyleResult[] = [];

      render(
        <TestWrapper>
          <TestComponent
            effects={{ shadow: shadowEffect }}
            onResult={(r) => capturedResult.push(r)}
          />
        </TestWrapper>,
      );

      const result = capturedResult[capturedResult.length - 1];
      expect(result.defs).not.toBeNull();
    });
  });
});
