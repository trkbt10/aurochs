/**
 * @file Tests for ColorSwatch component
 *
 * Tests visual rendering of color swatches.
 */

// @vitest-environment jsdom

import { render } from "@testing-library/react";
import type { Color } from "@oxen-office/ooxml/domain/color";
import type { ColorContext } from "@oxen-office/ooxml/domain/color-context";
import type { SlideSize } from "@oxen-office/pptx/domain";
import { px, pct } from "@oxen-office/ooxml/domain/units";
import { RenderProvider } from "../../context";
import { ColorSwatch, ColorSwatchRow } from "./ColorSwatch";

// =============================================================================
// Test Fixtures
// =============================================================================

const testSlideSize: SlideSize = {
  width: px(960),
  height: px(540),
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

/**
 * Wrapper component that provides required context
 */
function TestWrapper({ children }: { readonly children: React.ReactNode }) {
  return (
    <RenderProvider
      slideSize={testSlideSize}
      colorContext={testColorContext}
    >
      {children}
    </RenderProvider>
  );
}

// =============================================================================
// ColorSwatch Tests
// =============================================================================

describe("ColorSwatch", () => {
  it("renders without crashing", () => {
    const color: Color = {
      spec: { type: "srgb", value: "FF0000" },
    };

    const { container } = render(
      <TestWrapper>
        <ColorSwatch color={color} />
      </TestWrapper>,
    );

    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders with correct size", () => {
    const color: Color = {
      spec: { type: "srgb", value: "FF0000" },
    };

    const { container } = render(
      <TestWrapper>
        <ColorSwatch color={color} size={32} />
      </TestWrapper>,
    );

    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("32");
    expect(svg?.getAttribute("height")).toBe("32");
  });

  it("shows color info when showInfo is true", () => {
    const color: Color = {
      spec: { type: "srgb", value: "FF0000" },
    };

    const { container } = render(
      <TestWrapper>
        <ColorSwatch color={color} showInfo />
      </TestWrapper>,
    );

    expect(container.textContent).toContain("#FF0000");
  });

  it("renders fill rect with correct color", () => {
    const color: Color = {
      spec: { type: "srgb", value: "00FF00" },
    };

    const { container } = render(
      <TestWrapper>
        <ColorSwatch color={color} />
      </TestWrapper>,
    );

    const rects = container.querySelectorAll("rect");
    // Find the color fill rect (not checkerboard)
    const colorRect = Array.from(rects).find(
      (rect) => rect.getAttribute("fill") === "#00FF00",
    );
    expect(colorRect).toBeTruthy();
  });

  it("shows X mark for undefined color", () => {
    const { container } = render(
      <TestWrapper>
        <ColorSwatch color={undefined} />
      </TestWrapper>,
    );

    // Should have line elements for X mark
    const lines = container.querySelectorAll("line");
    expect(lines.length).toBe(2);
  });

  it("shows checkerboard for transparent colors", () => {
    const color: Color = {
      spec: { type: "srgb", value: "FF0000" },
      transform: { alpha: pct(50) },
    };

    const { container } = render(
      <TestWrapper>
        <ColorSwatch color={color} showTransparency />
      </TestWrapper>,
    );

    // Should have pattern element for checkerboard
    const pattern = container.querySelector("pattern");
    expect(pattern).toBeTruthy();
  });

  it("does not show checkerboard when showTransparency is false", () => {
    const color: Color = {
      spec: { type: "srgb", value: "FF0000" },
      transform: { alpha: pct(50) },
    };

    const { container } = render(
      <TestWrapper>
        <ColorSwatch color={color} showTransparency={false} />
      </TestWrapper>,
    );

    // Should not have pattern element
    const pattern = container.querySelector("pattern");
    expect(pattern).toBeFalsy();
  });

  it("shows alpha percentage in info", () => {
    const color: Color = {
      spec: { type: "srgb", value: "FF0000" },
      transform: { alpha: pct(50) },
    };

    const { container } = render(
      <TestWrapper>
        <ColorSwatch color={color} showInfo />
      </TestWrapper>,
    );

    expect(container.textContent).toContain("50%");
  });

  it("resolves scheme colors correctly", () => {
    const color: Color = {
      spec: { type: "scheme", value: "accent1" },
    };

    const { container } = render(
      <TestWrapper>
        <ColorSwatch color={color} showInfo />
      </TestWrapper>,
    );

    // accent1 = 4F81BD in test context
    expect(container.textContent).toContain("#4F81BD");
  });
});

// =============================================================================
// ColorSwatchRow Tests
// =============================================================================

describe("ColorSwatchRow", () => {
  it("renders multiple color swatches", () => {
    const colors: Color[] = [
      { spec: { type: "srgb", value: "FF0000" } },
      { spec: { type: "srgb", value: "00FF00" } },
      { spec: { type: "srgb", value: "0000FF" } },
    ];

    const { container } = render(
      <TestWrapper>
        <ColorSwatchRow colors={colors} />
      </TestWrapper>,
    );

    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(3);
  });

  it("renders labels when provided", () => {
    const colors: Color[] = [
      { spec: { type: "srgb", value: "FF0000" } },
      { spec: { type: "srgb", value: "00FF00" } },
    ];
    const labels = ["Red", "Green"];

    const { container } = render(
      <TestWrapper>
        <ColorSwatchRow colors={colors} labels={labels} />
      </TestWrapper>,
    );

    expect(container.textContent).toContain("Red");
    expect(container.textContent).toContain("Green");
  });

  it("handles undefined colors in array", () => {
    const colors: (Color | undefined)[] = [
      { spec: { type: "srgb", value: "FF0000" } },
      undefined,
      { spec: { type: "srgb", value: "0000FF" } },
    ];

    const { container } = render(
      <TestWrapper>
        <ColorSwatchRow colors={colors} />
      </TestWrapper>,
    );

    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(3);
  });
});
